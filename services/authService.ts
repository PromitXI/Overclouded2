// ============================================================
// Microsoft Entra ID authentication (OAuth 2.0 authorization
// code flow with PKCE, via MSAL).
//
// Two deliberate choices here:
//
//   1. Tokens are cached in memory only. MSAL defaults to
//      sessionStorage, which would make the "no localStorage, no
//      sessionStorage" claim on the Security page false. The cost is
//      that a page reload requires signing in again — which matches
//      the session model this product already promises.
//
//   2. Popup rather than redirect. A redirect leaves the page, and an
//      in-memory cache cannot carry the PKCE verifier across that
//      navigation. Popup keeps the whole exchange in one document.
//
// No token ever reaches the Overclouded backend. The browser talks to
// Entra, then to Azure Resource Manager, directly.
// ============================================================

import {
  PublicClientApplication,
  BrowserCacheLocation,
  InteractionRequiredAuthError,
  BrowserAuthError,
  AccountInfo,
  Configuration,
} from '@azure/msal-browser';

const ARM_BASE = 'https://management.azure.com';

/** Delegated permission that lets us read ARM as the signed-in user. */
export const ARM_SCOPE = `${ARM_BASE}/user_impersonation`;

const clientId = import.meta.env.VITE_AZURE_CLIENT_ID ?? '';

/**
 * "organizations" allows any work or school tenant to sign in without the
 * app being pre-registered there, and excludes personal Microsoft accounts,
 * which cannot hold Azure subscriptions.
 */
const authority =
  import.meta.env.VITE_AZURE_AUTHORITY ?? 'https://login.microsoftonline.com/organizations';

export const isAuthConfigured = (): boolean => clientId.trim().length > 0;

const msalConfig: Configuration = {
  auth: {
    clientId,
    authority,
    redirectUri: typeof window !== 'undefined' ? window.location.origin : '/',
  },
  cache: {
    cacheLocation: BrowserCacheLocation.MemoryStorage,
  },
};

let msalInstance: PublicClientApplication | null = null;
let initPromise: Promise<PublicClientApplication> | null = null;

const getMsal = async (): Promise<PublicClientApplication> => {
  if (!isAuthConfigured()) {
    throw new Error(
      'Microsoft sign-in is not configured. Set VITE_AZURE_CLIENT_ID to your Entra app registration ' +
      'client ID and restart the dev server. See the README for the one-time setup.'
    );
  }
  if (msalInstance) return msalInstance;
  if (!initPromise) {
    const instance = new PublicClientApplication(msalConfig);
    initPromise = instance.initialize().then(() => {
      msalInstance = instance;
      return instance;
    });
  }
  return initPromise;
};

export interface AzureSubscription {
  subscriptionId: string;
  displayName: string;
  state: string;
  tenantId?: string;
}

export interface SignedInUser {
  username: string;
  name: string;
  tenantId: string;
}

const toUser = (account: AccountInfo): SignedInUser => ({
  username: account.username,
  name: account.name || account.username,
  tenantId: account.tenantId,
});

/** Translate MSAL's error codes into something a user can act on. */
const describeAuthError = (err: unknown): Error => {
  if (err instanceof BrowserAuthError) {
    switch (err.errorCode) {
      case 'popup_window_error':
      case 'empty_window_error':
        return new Error(
          'The sign-in popup could not open. Allow popups for this site and try again.'
        );
      case 'user_cancelled':
        return new Error('Sign-in was cancelled.');
      default:
        break;
    }
  }

  const message = err instanceof Error ? err.message : String(err);

  // Entra returns these as AADSTS codes inside the error description.
  if (message.includes('AADSTS65001') || message.includes('consent_required')) {
    return new Error(
      'This tenant requires administrator consent before Overclouded can read the subscription. ' +
      'Ask a Global Administrator to grant consent, then sign in again.'
    );
  }
  if (message.includes('AADSTS50105')) {
    return new Error(
      'Your account is not assigned to this application in the tenant. ' +
      'An administrator needs to assign you under Enterprise applications.'
    );
  }
  if (message.includes('AADSTS53003') || message.includes('AADSTS50076')) {
    return new Error(
      'A Conditional Access policy blocked this sign-in. Your administrator can tell you which policy applies.'
    );
  }
  if (message.includes('AADSTS700016') || message.includes('unauthorized_client')) {
    return new Error(
      'The configured application was not found in this tenant. Check VITE_AZURE_CLIENT_ID, and that the ' +
      'app registration is multi-tenant.'
    );
  }
  return new Error(message || 'Sign-in failed.');
};

/**
 * Sign in interactively and return the account. Must be called from a user
 * gesture or the browser will block the popup.
 */
export const signIn = async (): Promise<SignedInUser> => {
  try {
    const msal = await getMsal();
    const result = await msal.loginPopup({
      scopes: [ARM_SCOPE],
      prompt: 'select_account',
    });
    msal.setActiveAccount(result.account);
    return toUser(result.account);
  } catch (err) {
    throw describeAuthError(err);
  }
};

/** Get an ARM access token, falling back to an interactive prompt if needed. */
export const getArmToken = async (): Promise<string> => {
  const msal = await getMsal();
  const account = msal.getActiveAccount() ?? msal.getAllAccounts()[0];
  if (!account) throw new Error('Not signed in.');

  try {
    const result = await msal.acquireTokenSilent({ scopes: [ARM_SCOPE], account });
    return result.accessToken;
  } catch (err) {
    if (err instanceof InteractionRequiredAuthError) {
      try {
        const result = await msal.acquireTokenPopup({ scopes: [ARM_SCOPE], account });
        return result.accessToken;
      } catch (popupErr) {
        throw describeAuthError(popupErr);
      }
    }
    throw describeAuthError(err);
  }
};

/**
 * List subscriptions the signed-in user can see, straight from ARM.
 * Follows nextLink so tenants with many subscriptions are not truncated.
 */
export const fetchSubscriptions = async (token: string): Promise<AzureSubscription[]> => {
  const subscriptions: AzureSubscription[] = [];
  let url = `${ARM_BASE}/subscriptions?api-version=2022-12-01`;

  while (url) {
    const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new Error(
          'Azure rejected the request. The account signed in may not have access to any subscription.'
        );
      }
      throw new Error(`Could not list subscriptions (HTTP ${response.status}).`);
    }

    const page = await response.json();
    for (const item of page.value ?? []) {
      subscriptions.push({
        subscriptionId: item.subscriptionId,
        displayName: item.displayName,
        state: item.state,
        tenantId: item.tenantId,
      });
    }
    url = page.nextLink ?? '';
  }

  return subscriptions.filter((s) => s.state === 'Enabled');
};

/**
 * Drop the in-memory cache. Tokens are not persisted anywhere, so this is
 * belt and braces — closing the tab has the same effect.
 */
export const signOut = async (): Promise<void> => {
  if (!msalInstance) return;
  const account = msalInstance.getActiveAccount();
  msalInstance.setActiveAccount(null);
  try {
    await msalInstance.clearCache(account ? { account } : undefined);
  } catch {
    // Nothing persisted, so a failure here has no security consequence.
  }
};
