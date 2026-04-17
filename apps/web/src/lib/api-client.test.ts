import { afterEach, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { fetchApiWithTokenRefresh } from "./api-client";
import { STORAGE_KEYS } from "./auth-storage";

type StorageMap = Map<string, string>;

function createStorage(): Storage {
  const map: StorageMap = new Map();

  return {
    get length() {
      return map.size;
    },
    clear() {
      map.clear();
    },
    getItem(key: string) {
      return map.has(key) ? (map.get(key) ?? null) : null;
    },
    key(index: number) {
      return Array.from(map.keys())[index] ?? null;
    },
    removeItem(key: string) {
      map.delete(key);
    },
    setItem(key: string, value: string) {
      map.set(key, String(value));
    },
  };
}

function setupBrowserMocks() {
  const localStorage = createStorage();
  const windowMock = {
    localStorage,
    location: {
      protocol: "http:",
    },
  };

  let cookieJar = "";

  Object.defineProperty(globalThis, "window", {
    value: windowMock,
    configurable: true,
    writable: true,
  });

  Object.defineProperty(globalThis, "document", {
    value: {
      get cookie() {
        return cookieJar;
      },
      set cookie(value: string) {
        cookieJar = value;
      },
    },
    configurable: true,
    writable: true,
  });

  return {
    localStorage,
    restore() {
      Reflect.deleteProperty(globalThis, "window");
      Reflect.deleteProperty(globalThis, "document");
    },
  };
}

describe("fetchApiWithTokenRefresh", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    Reflect.deleteProperty(globalThis, "window");
    Reflect.deleteProperty(globalThis, "document");
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("retries once after refreshing token on 401", async () => {
    const browser = setupBrowserMocks();

    browser.localStorage.setItem(
      STORAGE_KEYS.apiBaseUrl,
      "http://localhost:4000/api",
    );
    browser.localStorage.setItem(
      STORAGE_KEYS.accessToken,
      "expired-access-token",
    );
    browser.localStorage.setItem(
      STORAGE_KEYS.refreshToken,
      "valid-refresh-token",
    );

    const calls: Array<{ url: string; init?: RequestInit }> = [];

    globalThis.fetch = (async (
      input: URL | RequestInfo,
      init?: RequestInit,
    ): Promise<Response> => {
      const url = String(input);
      calls.push({ url, init });

      if (url.endsWith("/sites") && calls.length === 1) {
        return new Response(JSON.stringify({ message: "Unauthorized" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (url.endsWith("/auth/refresh")) {
        assert.equal(init?.method, "POST");
        assert.equal(
          init?.body,
          JSON.stringify({ refreshToken: "valid-refresh-token" }),
        );

        return new Response(
          JSON.stringify({
            accessToken: "new-access-token",
            refreshToken: "new-refresh-token",
          }),
          {
            status: 201,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      if (url.endsWith("/sites") && calls.length === 3) {
        const headers = new Headers(init?.headers);
        assert.equal(headers.get("Authorization"), "Bearer new-access-token");

        return new Response(JSON.stringify({ data: [{ id: "site_1" }] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      throw new Error(`Unexpected fetch call to ${url}`);
    }) as typeof fetch;

    const result = await fetchApiWithTokenRefresh<{
      data: Array<{ id: string }>;
    }>({
      apiBaseUrl: "http://localhost:4000/api",
      path: "/sites",
      init: {
        cache: "no-store",
      },
    });

    assert.equal(result.response.status, 200);
    assert.equal(result.payload.data.length, 1);
    assert.equal(
      browser.localStorage.getItem(STORAGE_KEYS.accessToken),
      "new-access-token",
    );
    assert.equal(
      browser.localStorage.getItem(STORAGE_KEYS.refreshToken),
      "new-refresh-token",
    );
    assert.equal(calls.length, 3);

    browser.restore();
  });
});
