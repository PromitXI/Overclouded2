// ============================================================
// Azure CLI Backend Authentication Service
// Communicates with the Python backend (backend_server.py) that
// wraps `az login --use-device-code` and `az account get-access-token`.
// No client IDs, no app registrations, no tenant config needed.
// ============================================================

export interface DeviceCodeResponse {
  user_code: string;
  verification_uri: string;
  message: string;
}

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
  const response = await fetch("/api/start-login", { method: "POST" });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || "Failed to start device code login.");
  }

  return response.json();
};

/**
 * Step 2: Poll the backend to check if the user completed sign-in.
 * Returns true when authentication is complete.
 */
export const pollLoginStatus = async (): Promise<{ completed: boolean; error: string | null }> => {
  const response = await fetch("/api/poll-login");
  if (!response.ok) {
    throw new Error("Failed to check login status.");
  }
  return response.json();
};

/**
 * Step 3: Get the access token after successful login.
 */
export const getAccessToken = async (): Promise<TokenResponse> => {
  const response = await fetch("/api/get-token");

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
  const response = await fetch("/api/subscriptions");

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
