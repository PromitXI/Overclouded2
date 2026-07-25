<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Overclouded

An Azure subscription analyser. Sign in with Microsoft, and it reads cost,
security, governance, identity and operational telemetry straight from Azure
Resource Manager into the browser, then exports a nine-page assessment report.

Nothing is stored. All data lives in browser memory for the session and is gone
when the tab closes.

## Run locally

**Prerequisites:** Node.js. No Azure CLI, no agent.

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create `.env.local` with your Entra app registration client ID (see below):
   ```
   VITE_AZURE_CLIENT_ID=00000000-0000-0000-0000-000000000000
   ```
3. Optionally set `GEMINI_API_KEY` in the server environment. It is used only by
   the Python backend for AI-generated demo data and is never bundled into the browser.
4. Run the frontend and the demo-data backend together:
   ```bash
   python3 start_server.py
   ```

`npm run dev` alone runs the frontend, which is enough for Live Connection —
sign-in happens entirely in the browser. The Python backend is only needed for
AI-generated demo data.

The backend listens on **5057** rather than the more usual 5000, because
macOS 12+ binds 5000 to the AirPlay Receiver, which answers every request with
403. Override it with `OVERCLOUDED_BACKEND_PORT`.

## One-time Entra app registration

Live Connection needs an app registration in your own tenant. This is the only
setup step, and it takes a couple of minutes.

1. **Entra admin center → Applications → App registrations → New registration**
2. Name it `Overclouded`.
3. Supported account types: **Accounts in any organizational directory
   (multitenant)** — required if you want to analyse clients' tenants, not just
   your own.
4. Redirect URI: platform **Single-page application (SPA)**, value
   `http://localhost:3000` for local development. Add your production origin
   later as a second SPA redirect URI.
5. Register, then copy the **Application (client) ID** into `VITE_AZURE_CLIENT_ID`.
6. **API permissions → Add a permission → Azure Service Management →
   Delegated → `user_impersonation`**, then Add.

That is all. No client secret and no certificate — this is a public client using
the authorization code flow with PKCE, so there is no credential to leak or rotate.

### Analysing someone else's tenant

Because the registration is multitenant, a customer can consent without you
touching their directory. A Global Administrator visits:

```
https://login.microsoftonline.com/common/adminconsent?client_id=<YOUR_CLIENT_ID>
```

After consent, any user in that tenant can sign in, and Overclouded sees exactly
the subscriptions their own Azure RBAC already allows — nothing more.

## Authentication design

- **Authorization code flow with PKCE** via MSAL, entirely in the browser.
- **`cacheLocation: memoryStorage`.** MSAL defaults to `sessionStorage`; that is
  deliberately overridden so no token is ever written to browser storage. The
  trade-off is that a page reload requires signing in again, which is consistent
  with the zero-retention model.
- **Popup rather than redirect**, because an in-memory cache cannot carry the
  PKCE verifier across a full-page navigation.
- **No token reaches the server.** The browser talks to Entra, then to
  `management.azure.com`, directly. `backend_server.py` never sees a credential.
