import {
  clearAuthState,
  normalizeApiBaseUrl,
  persistAuthState,
  readStoredAuthState,
  type StoredAuthState,
} from "@/lib/auth-storage";

export const DEFAULT_API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api";

type RefreshPayload = {
  accessToken: string;
  refreshToken: string;
};

type AuthenticatedRequestArgs = {
  apiBaseUrl: string;
  path: string;
  init?: RequestInit;
};

type AuthenticatedRequestResult<T = unknown> = {
  response: Response;
  payload: T;
  authState: StoredAuthState;
};

let refreshInFlight: Promise<RefreshPayload | null> | null = null;

export async function readApiResponse(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return response.json();
  }

  return response.text();
}

export function buildApiUrl(apiBaseUrl: string, path: string) {
  const normalizedBaseUrl = normalizeApiBaseUrl(
    apiBaseUrl || DEFAULT_API_BASE_URL,
  );
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  return `${normalizedBaseUrl}${normalizedPath}`;
}

function withAuthorizationHeader(
  init: RequestInit | undefined,
  token?: string,
) {
  const headers = new Headers(init?.headers);

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return {
    ...init,
    headers,
  };
}

function isRefreshPayload(value: unknown): value is RefreshPayload {
  if (!value || typeof value !== "object") {
    return false;
  }

  return (
    "accessToken" in value &&
    typeof value.accessToken === "string" &&
    "refreshToken" in value &&
    typeof value.refreshToken === "string"
  );
}

async function performRequest<T = unknown>(
  apiBaseUrl: string,
  path: string,
  init?: RequestInit,
  token?: string,
): Promise<{ response: Response; payload: T }> {
  const response = await fetch(
    buildApiUrl(apiBaseUrl, path),
    withAuthorizationHeader(init, token),
  );
  const payload = (await readApiResponse(response)) as T;

  return { response, payload };
}

async function refreshAccessToken(
  apiBaseUrl: string,
  refreshToken: string,
): Promise<RefreshPayload | null> {
  const response = await fetch(buildApiUrl(apiBaseUrl, "/auth/refresh"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ refreshToken }),
  });

  const payload = await readApiResponse(response);

  if (!response.ok || !isRefreshPayload(payload)) {
    clearAuthState();
    return null;
  }

  persistAuthState({
    apiBaseUrl,
    accessToken: payload.accessToken,
    refreshToken: payload.refreshToken,
  });

  return payload;
}

export async function fetchApiWithTokenRefresh<T = unknown>({
  apiBaseUrl,
  path,
  init,
}: AuthenticatedRequestArgs): Promise<AuthenticatedRequestResult<T>> {
  const normalizedBaseUrl = normalizeApiBaseUrl(
    apiBaseUrl || DEFAULT_API_BASE_URL,
  );
  const initialAuthState = readStoredAuthState();
  const initialRequest = await performRequest<T>(
    normalizedBaseUrl,
    path,
    init,
    initialAuthState.accessToken,
  );

  if (initialRequest.response.status !== 401 || path === "/auth/refresh") {
    return {
      ...initialRequest,
      authState: readStoredAuthState(),
    };
  }

  const latestAuthState = readStoredAuthState();
  const refreshToken = latestAuthState.refreshToken;

  if (!refreshToken) {
    return {
      ...initialRequest,
      authState: latestAuthState,
    };
  }

  if (!refreshInFlight) {
    refreshInFlight = refreshAccessToken(
      normalizedBaseUrl,
      refreshToken,
    ).finally(() => {
      refreshInFlight = null;
    });
  }

  const refreshedTokens = await refreshInFlight;

  if (!refreshedTokens) {
    return {
      ...initialRequest,
      authState: readStoredAuthState(),
    };
  }

  const retriedRequest = await performRequest<T>(
    normalizedBaseUrl,
    path,
    init,
    refreshedTokens.accessToken,
  );

  return {
    ...retriedRequest,
    authState: readStoredAuthState(),
  };
}
