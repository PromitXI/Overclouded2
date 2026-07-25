// ============================================================
// Azure CLI Backend Authentication Service
// Communicates with the Python backend (backend_server.py) that
// wraps `az login --use-device-code` and `az account get-access-token`.
// No client IDs, no app registrations, no tenant config needed.
// ============================================================

export interface DeviceCodeResponse {
  session_id: string;
  user_code: string;
  verification_uri: string;
  message: string;
}

let authSessionId = '';

const sessionHeaders = (): HeadersInit => authSessionId ? { 'X-Auth-Session': authSessionId } : {};

export const endAuthSession = async (): Promise<void> => {
  if (!authSessionId) return;
  const sessionId = authSessionId;
  authSessionId = '';
  await fetch('/api/end-session', { method: 'POST', headers: { 'X-Auth-Session': sessionId } }).catch(() => undefined);
};

export interface TokenResponse {
  access_token: string;
  expires_on: string;
  tenant: string;
}

export interface AzureSubscription {
  subscriptionId: string;
  displayName: string;
  state: string;
}

/**
 * Step 1: Start `az login --use-device-code` on the backend.
 * Returns the device code and verification URL.
 */
export const startDeviceCodeLogin = async (): Promise<DeviceCodeResponse> => {
  let response: Response;
  try {
    response = await fetch("/api/start-login", { method: "POST" });
  } catch {
    // The proxy could not reach the Python backend at all.
    throw new Error(
      "Cannot reach the authentication backend. Start it with `python3 start_server.py`, " +
      "which runs the Azure CLI helper alongside the frontend."
    );
  }

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    if (!data.error && (response.status === 404 || response.status === 502 || response.status === 403)) {
      throw new Error(
        `The authentication backend is not responding (HTTP ${response.status}). ` +
        "Start it with `python3 start_server.py`, and check nothing else is using its port."
      );
    }
    throw new Error(data.error || "Failed to start device code login.");
  }

  const result: DeviceCodeResponse = await response.json();
  authSessionId = result.session_id;
  return result;
};

/**
 * Step 2: Poll the backend to check if the user completed sign-in.
 * Returns true when authentication is complete.
 */
export const pollLoginStatus = async (): Promise<{ completed: boolean; error: string | null }> => {
  const response = await fetch("/api/poll-login", { headers: sessionHeaders() });
  if (!response.ok) {
    throw new Error("Failed to check login status.");
  }
  return response.json();
};

/**
 * Step 3: Get the access token after successful login.
 */
export const getAccessToken = async (): Promise<TokenResponse> => {
  const response = await fetch("/api/get-token", { headers: sessionHeaders() });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || "Failed to get access token.");
  }

  return response.json();
};

/**
 * Fetch the list of Azure subscriptions via `az account list`.
 */
export const fetchSubscriptions = async (): Promise<AzureSubscription[]> => {
  const response = await fetch("/api/subscriptions", { headers: sessionHeaders() });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || "Failed to fetch subscriptions.");
  }

  return response.json();
};

/**
 * Complete login flow: poll until auth completes, then get token + subscriptions.
 */
export const waitForLoginAndGetData = async (
  onStatusUpdate?: (status: string) => void,
  abortSignal?: AbortSignal
): Promise<{ token: TokenResponse; subscriptions: AzureSubscription[] }> => {
  const pollInterval = 3000; // 3 seconds
  const maxDuration = 15 * 60 * 1000; // 15 minutes
  const startTime = Date.now();

  while (Date.now() - startTime < maxDuration) {
    if (abortSignal?.aborted) {
      throw new Error("Authentication cancelled.");
    }

    // Wait for interval
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(resolve, pollInterval);
      if (abortSignal) {
        abortSignal.addEventListener("abort", () => {
          clearTimeout(timer);
          reject(new Error("Authentication cancelled."));
        }, { once: true });
      }
    });

    onStatusUpdate?.("Waiting for you to complete sign-in...");

    const status = await pollLoginStatus();

    if (status.completed) {
      if (status.error) {
        throw new Error(status.error);
      }

      onStatusUpdate?.("Login successful! Fetching access token...");
      const token = await getAccessToken();

      onStatusUpdate?.("Loading subscriptions...");
      const subscriptions = await fetchSubscriptions();

      return { token, subscriptions };
    }
  }

  throw new Error("Authentication timed out. Please try again.");
};
