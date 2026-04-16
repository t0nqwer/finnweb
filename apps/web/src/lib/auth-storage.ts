import type { SafeUser } from "@finnweb/shared";

export const STORAGE_KEYS = {
  apiBaseUrl: "finnweb.pageCrud.apiBaseUrl",
  accessToken: "finnweb.pageCrud.token",
  refreshToken: "finnweb.auth.refreshToken",
  user: "finnweb.auth.user",
  siteId: "finnweb.pageCrud.siteId",
  workspaceId: "finnweb.auth.workspaceId",
} as const;

const ACCESS_COOKIE_NAME = "finnweb_access_token";
const REFRESH_COOKIE_NAME = "finnweb_refresh_token";

export type StoredAuthState = {
  apiBaseUrl?: string;
  accessToken?: string;
  refreshToken?: string;
  user?: SafeUser | null;
  siteId?: string;
  workspaceId?: string;
};

export function normalizeApiBaseUrl(value: string): string {
  return value.trim().replace(/\/$/, "");
}

function setCookie(name: string, value: string, maxAgeSeconds: number) {
  if (typeof document === "undefined") {
    return;
  }

  const isSecure =
    typeof window !== "undefined" && window.location.protocol === "https:";

  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAgeSeconds}; SameSite=Lax${isSecure ? "; Secure" : ""}`;
}

export function persistAuthState(state: StoredAuthState) {
  if (typeof window === "undefined") {
    return;
  }

  if (state.apiBaseUrl !== undefined) {
    window.localStorage.setItem(STORAGE_KEYS.apiBaseUrl, state.apiBaseUrl);
  }

  if (state.accessToken) {
    window.localStorage.setItem(STORAGE_KEYS.accessToken, state.accessToken);
    setCookie(ACCESS_COOKIE_NAME, state.accessToken, 60 * 60 * 24 * 30);
  }

  if (state.refreshToken) {
    window.localStorage.setItem(STORAGE_KEYS.refreshToken, state.refreshToken);
    setCookie(REFRESH_COOKIE_NAME, state.refreshToken, 60 * 60 * 24 * 30);
  }

  if (state.user) {
    window.localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(state.user));
  }

  if (state.siteId) {
    window.localStorage.setItem(STORAGE_KEYS.siteId, state.siteId);
  }

  if (state.workspaceId) {
    window.localStorage.setItem(STORAGE_KEYS.workspaceId, state.workspaceId);
  }
}

export function clearAuthState() {
  if (typeof window === "undefined") {
    return;
  }

  Object.values(STORAGE_KEYS).forEach((key) => {
    window.localStorage.removeItem(key);
  });

  setCookie(ACCESS_COOKIE_NAME, "", 0);
  setCookie(REFRESH_COOKIE_NAME, "", 0);
}

export function readStoredAuthState(): StoredAuthState {
  if (typeof window === "undefined") {
    return {};
  }

  const rawUser = window.localStorage.getItem(STORAGE_KEYS.user);
  let parsedUser: SafeUser | null | undefined;

  if (rawUser) {
    try {
      parsedUser = JSON.parse(rawUser) as SafeUser;
    } catch {
      parsedUser = null;
    }
  }

  return {
    apiBaseUrl:
      window.localStorage.getItem(STORAGE_KEYS.apiBaseUrl) ?? undefined,
    accessToken:
      window.localStorage.getItem(STORAGE_KEYS.accessToken) ?? undefined,
    refreshToken:
      window.localStorage.getItem(STORAGE_KEYS.refreshToken) ?? undefined,
    user: parsedUser,
    siteId: window.localStorage.getItem(STORAGE_KEYS.siteId) ?? undefined,
    workspaceId:
      window.localStorage.getItem(STORAGE_KEYS.workspaceId) ?? undefined,
  };
}
