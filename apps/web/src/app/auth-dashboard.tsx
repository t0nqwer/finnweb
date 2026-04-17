"use client";

import { type AuthResponse, type SafeUser } from "@finnweb/shared";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import PageCrudDashboard from "./page-crud-dashboard";
import {
  DEFAULT_API_BASE_URL,
  fetchApiWithTokenRefresh,
  readApiResponse,
} from "../lib/api-client";
import {
  STORAGE_KEYS,
  clearAuthState,
  normalizeApiBaseUrl,
  persistAuthState,
} from "../lib/auth-storage";

type SiteRecord = {
  id: string;
  name: string;
  slug: string;
  workspace?: {
    id: string;
    name: string;
    slug: string;
  };
  _count?: {
    pages: number;
  };
};

type LoginResponse = AuthResponse & {
  site?: {
    id: string;
    name: string;
    slug: string;
  } | null;
};

export default function AuthDashboard() {
  const [apiBaseUrl, setApiBaseUrl] = useState(DEFAULT_API_BASE_URL);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [user, setUser] = useState<SafeUser | null>(null);
  const [accessToken, setAccessToken] = useState("");
  const [refreshToken, setRefreshToken] = useState("");
  const [sites, setSites] = useState<SiteRecord[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState("");
  const [isBooting, setIsBooting] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingSites, setIsLoadingSites] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const normalizedApiBaseUrl = useMemo(
    () => normalizeApiBaseUrl(apiBaseUrl),
    [apiBaseUrl],
  );

  useEffect(() => {
    const savedApiBaseUrl = window.localStorage.getItem(
      STORAGE_KEYS.apiBaseUrl,
    );
    const savedAccessToken = window.localStorage.getItem(
      STORAGE_KEYS.accessToken,
    );
    const savedRefreshToken = window.localStorage.getItem(
      STORAGE_KEYS.refreshToken,
    );
    const savedUser = window.localStorage.getItem(STORAGE_KEYS.user);
    const savedSiteId = window.localStorage.getItem(STORAGE_KEYS.siteId);

    if (savedApiBaseUrl) {
      setApiBaseUrl(savedApiBaseUrl);
    }

    if (savedAccessToken) {
      setAccessToken(savedAccessToken);
    }

    if (savedRefreshToken) {
      setRefreshToken(savedRefreshToken);
    }

    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser) as SafeUser);
      } catch {
        window.localStorage.removeItem(STORAGE_KEYS.user);
      }
    }

    if (savedSiteId) {
      setSelectedSiteId(savedSiteId);
    }

    setIsBooting(false);
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEYS.apiBaseUrl, apiBaseUrl);
  }, [apiBaseUrl]);

  useEffect(() => {
    if (accessToken) {
      window.localStorage.setItem(STORAGE_KEYS.accessToken, accessToken);
    } else {
      window.localStorage.removeItem(STORAGE_KEYS.accessToken);
    }
  }, [accessToken]);

  useEffect(() => {
    if (refreshToken) {
      window.localStorage.setItem(STORAGE_KEYS.refreshToken, refreshToken);
    } else {
      window.localStorage.removeItem(STORAGE_KEYS.refreshToken);
    }
  }, [refreshToken]);

  useEffect(() => {
    if (user) {
      window.localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(user));
    } else {
      window.localStorage.removeItem(STORAGE_KEYS.user);
    }
  }, [user]);

  useEffect(() => {
    if (selectedSiteId) {
      window.localStorage.setItem(STORAGE_KEYS.siteId, selectedSiteId);
    } else {
      window.localStorage.removeItem(STORAGE_KEYS.siteId);
    }
  }, [selectedSiteId]);

  async function loadSites() {
    if (!accessToken || !normalizedApiBaseUrl) {
      return;
    }

    setIsLoadingSites(true);

    try {
      const {
        response,
        payload,
        authState: refreshedAuthState,
      } = await fetchApiWithTokenRefresh({
        apiBaseUrl: normalizedApiBaseUrl,
        path: "/sites",
        init: {
          cache: "no-store",
        },
      });

      if (
        refreshedAuthState.accessToken &&
        refreshedAuthState.accessToken !== accessToken
      ) {
        setAccessToken(refreshedAuthState.accessToken);
      }

      if (
        refreshedAuthState.refreshToken &&
        refreshedAuthState.refreshToken !== refreshToken
      ) {
        setRefreshToken(refreshedAuthState.refreshToken);
      }

      if (!response.ok) {
        throw new Error(
          typeof payload === "object" && payload && "message" in payload
            ? String(payload.message)
            : `Request failed with status ${response.status}`,
        );
      }

      const nextSites =
        typeof payload === "object" &&
        payload &&
        "data" in payload &&
        Array.isArray(payload.data)
          ? (payload.data as SiteRecord[])
          : [];

      setSites(nextSites);

      if (!selectedSiteId && nextSites[0]) {
        setSelectedSiteId(nextSites[0].id);
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to load sites.",
      );
    } finally {
      setIsLoadingSites(false);
    }
  }

  async function hydrateSession() {
    if (!accessToken || !normalizedApiBaseUrl) {
      return;
    }

    try {
      const {
        response,
        payload,
        authState: refreshedAuthState,
      } = await fetchApiWithTokenRefresh({
        apiBaseUrl: normalizedApiBaseUrl,
        path: "/auth/me",
        init: {
          cache: "no-store",
        },
      });

      if (
        refreshedAuthState.accessToken &&
        refreshedAuthState.accessToken !== accessToken
      ) {
        setAccessToken(refreshedAuthState.accessToken);
      }

      if (
        refreshedAuthState.refreshToken &&
        refreshedAuthState.refreshToken !== refreshToken
      ) {
        setRefreshToken(refreshedAuthState.refreshToken);
      }

      if (!response.ok) {
        throw new Error(
          typeof payload === "object" && payload && "message" in payload
            ? String(payload.message)
            : `Request failed with status ${response.status}`,
        );
      }

      setUser(payload as SafeUser);
      await loadSites();
      setStatusMessage("Signed in successfully.");
    } catch (error) {
      clearAuthState();
      setAccessToken("");
      setRefreshToken("");
      setUser(null);
      setSites([]);
      setSelectedSiteId("");
      setErrorMessage(
        error instanceof Error ? error.message : "Your session has expired.",
      );
    }
  }

  useEffect(() => {
    if (isBooting || !accessToken) {
      return;
    }

    void hydrateSession();
  }, [accessToken, isBooting]);

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!normalizedApiBaseUrl) {
      setErrorMessage("API base URL is required.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      const response = await fetch(`${normalizedApiBaseUrl}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      });

      const payload = await readApiResponse(response);

      if (!response.ok) {
        throw new Error(
          typeof payload === "object" && payload && "message" in payload
            ? String(payload.message)
            : `Request failed with status ${response.status}`,
        );
      }

      const auth = payload as LoginResponse;
      setAccessToken(auth.accessToken);
      setRefreshToken(auth.refreshToken);
      setUser(auth.user);
      setPassword("");
      setStatusMessage(`Welcome back, ${auth.user.name || auth.user.email}.`);

      persistAuthState({
        apiBaseUrl: normalizedApiBaseUrl,
        accessToken: auth.accessToken,
        refreshToken: auth.refreshToken,
        user: auth.user,
        siteId: auth.site?.id,
      });

      if (auth.site?.id) {
        setSelectedSiteId(auth.site.id);
      }

      await loadSites();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to sign in.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleLogout() {
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      if (refreshToken && normalizedApiBaseUrl) {
        await fetch(`${normalizedApiBaseUrl}/auth/logout`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ refreshToken }),
        });
      }
    } finally {
      clearAuthState();
      setAccessToken("");
      setRefreshToken("");
      setUser(null);
      setSites([]);
      setSelectedSiteId("");
      setStatusMessage("Logged out.");
    }
  }

  const selectedSite = sites.find((site) => site.id === selectedSiteId) ?? null;

  if (isBooting) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading dashboard</CardTitle>
          <CardDescription>Checking for an existing session.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!user || !accessToken) {
    return (
      <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
        <Card>
          <CardHeader>
            <Badge variant="secondary" className="w-fit">
              Login first
            </Badge>
            <CardTitle className="mt-2">
              Sign in to your FinnWeb dashboard
            </CardTitle>
            <CardDescription>
              Use your API credentials to unlock the site dashboard and page
              manager.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleLogin}>
              <div className="space-y-2">
                <Label htmlFor="apiBaseUrl">API base URL</Label>
                <Input
                  id="apiBaseUrl"
                  value={apiBaseUrl}
                  onChange={(event) => setApiBaseUrl(event.target.value)}
                  placeholder="http://localhost:4000/api"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                />
              </div>

              {(statusMessage || errorMessage) && (
                <div
                  className={`rounded-md border px-3 py-2 text-sm ${
                    errorMessage
                      ? "border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200"
                      : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200"
                  }`}
                >
                  {errorMessage ?? statusMessage}
                </div>
              )}

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "Signing in..." : "Sign in"}
              </Button>

              <p className="text-center text-sm text-slate-500 dark:text-slate-400">
                Need an account?{" "}
                <Link
                  href="/register"
                  className="text-sky-600 hover:underline dark:text-sky-300"
                >
                  Create one here
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Dashboard preview</CardTitle>
            <CardDescription>
              A shadcn-style admin shell is ready for site operations.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
            <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
              ✅ Secure sign-in with `POST /auth/login`
            </div>
            <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
              ✅ Session check with `GET /auth/me`
            </div>
            <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
              ✅ Site selector + page CRUD workspace
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <Badge className="w-fit">Authenticated</Badge>
                <CardTitle className="mt-2">
                  Welcome, {user.name || user.email}
                </CardTitle>
                <CardDescription>{user.email}</CardDescription>
              </div>
              <div className="flex gap-2">
                <Link
                  href="/subscription"
                  className="inline-flex items-center rounded-md border border-slate-200 px-4 py-2 text-sm dark:border-slate-800"
                >
                  Subscription
                </Link>
                <Button variant="outline" onClick={handleLogout}>
                  Logout
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="dashboardApiBaseUrl">API base URL</Label>
              <Input
                id="dashboardApiBaseUrl"
                value={apiBaseUrl}
                onChange={(event) => setApiBaseUrl(event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="selectedSiteId">Site</Label>
              <select
                id="selectedSiteId"
                value={selectedSiteId}
                onChange={(event) => setSelectedSiteId(event.target.value)}
                className="flex h-10 w-full rounded-md border border-slate-200 bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 dark:border-slate-800"
              >
                <option value="">Select a site</option>
                {sites.map((site) => (
                  <option key={site.id} value={site.id}>
                    {site.name} ({site.slug})
                  </option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Available sites</CardDescription>
              <CardTitle className="text-3xl">{sites.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Selected site</CardDescription>
              <CardTitle className="text-base">
                {selectedSite?.name ?? "Choose a site"}
              </CardTitle>
              <CardDescription>
                {isLoadingSites
                  ? "Refreshing sites..."
                  : selectedSite?._count?.pages !== undefined
                    ? `${selectedSite._count.pages} page(s)`
                    : "Ready for page management"}
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>

      {(statusMessage || errorMessage) && (
        <div
          className={`rounded-md border px-3 py-2 text-sm ${
            errorMessage
              ? "border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200"
              : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200"
          }`}
        >
          {errorMessage ?? statusMessage}
        </div>
      )}

      <PageCrudDashboard
        apiBaseUrl={apiBaseUrl}
        token={accessToken}
        siteId={selectedSiteId}
        showConnectionFields={false}
      />
    </div>
  );
}
