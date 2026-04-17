"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchApiWithTokenRefresh } from "@/lib/api-client";

const DEFAULT_API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api";

const STORAGE_KEYS = {
  apiBaseUrl: "finnweb.pageCrud.apiBaseUrl",
  token: "finnweb.pageCrud.token",
  siteId: "finnweb.pageCrud.siteId",
};

const PAGE_TYPES = [
  "LANDING",
  "NORMAL",
  "BLOG",
  "NEWS",
  "PRODUCT",
  "CHECKOUT",
  "CUSTOM",
] as const;

type PageType = (typeof PAGE_TYPES)[number];

type PageRecord = {
  id: string;
  title: string;
  slug: string;
  path: string | null;
  pageType: PageType;
  isHomePage: boolean;
  isPublished: boolean;
  sortOrder: number;
  seoTitle?: string | null;
  seoDescription?: string | null;
  seoKeywords?: string | null;
  ogImageUrl?: string | null;
  _count?: {
    sections: number;
    forms: number;
  };
};

type FormState = {
  title: string;
  slug: string;
  path: string;
  pageType: PageType;
  isHomePage: boolean;
  isPublished: boolean;
  sortOrder: string;
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string;
  ogImageUrl: string;
};

type PageCrudDashboardProps = {
  apiBaseUrl?: string;
  token?: string;
  siteId?: string;
  showConnectionFields?: boolean;
};

const initialFormState: FormState = {
  title: "",
  slug: "",
  path: "",
  pageType: "NORMAL",
  isHomePage: false,
  isPublished: false,
  sortOrder: "",
  seoTitle: "",
  seoDescription: "",
  seoKeywords: "",
  ogImageUrl: "",
};

function toFormState(page?: PageRecord): FormState {
  if (!page) {
    return initialFormState;
  }

  return {
    title: page.title ?? "",
    slug: page.slug ?? "",
    path: page.path ?? "",
    pageType: page.pageType ?? "NORMAL",
    isHomePage: Boolean(page.isHomePage),
    isPublished: Boolean(page.isPublished),
    sortOrder: String(page.sortOrder ?? 0),
    seoTitle: page.seoTitle ?? "",
    seoDescription: page.seoDescription ?? "",
    seoKeywords: page.seoKeywords ?? "",
    ogImageUrl: page.ogImageUrl ?? "",
  };
}

function normalizeApiBaseUrl(value: string): string {
  return value.trim().replace(/\/$/, "");
}

export default function PageCrudDashboard({
  apiBaseUrl: externalApiBaseUrl,
  token: externalToken,
  siteId: externalSiteId,
  showConnectionFields = true,
}: PageCrudDashboardProps) {
  const [apiBaseUrl, setApiBaseUrl] = useState(
    externalApiBaseUrl ?? DEFAULT_API_BASE_URL,
  );
  const [token, setToken] = useState(externalToken ?? "");
  const [siteId, setSiteId] = useState(externalSiteId ?? "");
  const [pages, setPages] = useState<PageRecord[]>([]);
  const [form, setForm] = useState<FormState>(initialFormState);
  const [editingPageId, setEditingPageId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const savedApiBaseUrl = window.localStorage.getItem(
      STORAGE_KEYS.apiBaseUrl,
    );
    const savedToken = window.localStorage.getItem(STORAGE_KEYS.token);
    const savedSiteId = window.localStorage.getItem(STORAGE_KEYS.siteId);

    if (!externalApiBaseUrl && savedApiBaseUrl) {
      setApiBaseUrl(savedApiBaseUrl);
    }

    if (!externalToken && savedToken) {
      setToken(savedToken);
    }

    if (!externalSiteId && savedSiteId) {
      setSiteId(savedSiteId);
    }
  }, [externalApiBaseUrl, externalSiteId, externalToken]);

  useEffect(() => {
    if (externalApiBaseUrl !== undefined) {
      setApiBaseUrl(externalApiBaseUrl);
    }
  }, [externalApiBaseUrl]);

  useEffect(() => {
    if (externalToken !== undefined) {
      setToken(externalToken);
    }
  }, [externalToken]);

  useEffect(() => {
    if (externalSiteId !== undefined) {
      setSiteId(externalSiteId);
    }
  }, [externalSiteId]);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEYS.apiBaseUrl, apiBaseUrl);
  }, [apiBaseUrl]);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEYS.token, token);
  }, [token]);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEYS.siteId, siteId);
  }, [siteId]);

  const canQueryApi = useMemo(() => {
    return Boolean(normalizeApiBaseUrl(apiBaseUrl) && siteId.trim());
  }, [apiBaseUrl, siteId]);

  async function fetchWithRefresh(path: string, init?: RequestInit) {
    const { response, payload, authState } = await fetchApiWithTokenRefresh({
      apiBaseUrl,
      path,
      init,
    });

    if (authState.accessToken && authState.accessToken !== token) {
      setToken(authState.accessToken);
    }

    return { response, payload };
  }

  async function loadPages() {
    if (!canQueryApi) {
      setErrorMessage("Enter an API base URL and site ID first.");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      const { response, payload } = await fetchWithRefresh(
        `/sites/${siteId.trim()}/pages`,
        {
          cache: "no-store",
        },
      );

      if (!response.ok) {
        throw new Error(
          typeof payload === "object" && payload && "message" in payload
            ? String(payload.message)
            : `Request failed with status ${response.status}`,
        );
      }

      const nextPages =
        typeof payload === "object" &&
        payload &&
        "data" in payload &&
        Array.isArray(payload.data)
          ? (payload.data as PageRecord[])
          : [];

      setPages(nextPages);
      setStatusMessage(`Loaded ${nextPages.length} page(s).`);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to load pages.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function loadPageDetail(pageId: string) {
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      const { response, payload } = await fetchWithRefresh(
        `/sites/${siteId.trim()}/pages/${pageId}`,
        {
          cache: "no-store",
        },
      );

      if (!response.ok) {
        throw new Error(
          typeof payload === "object" && payload && "message" in payload
            ? String(payload.message)
            : `Request failed with status ${response.status}`,
        );
      }

      if (typeof payload === "object" && payload && "data" in payload) {
        const page = payload.data as PageRecord;
        setEditingPageId(page.id);
        setForm(toFormState(page));
        setStatusMessage(`Editing \"${page.title}\".`);
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to load page details.",
      );
    }
  }

  function resetForm() {
    setEditingPageId(null);
    setForm(initialFormState);
    setErrorMessage(null);
    setStatusMessage("Form reset.");
  }

  function buildPayload() {
    const payload: Record<string, unknown> = {
      title: form.title.trim(),
      pageType: form.pageType,
      isHomePage: form.isHomePage,
      isPublished: form.isPublished,
      seoTitle: form.seoTitle,
      seoDescription: form.seoDescription,
      seoKeywords: form.seoKeywords,
      ogImageUrl: form.ogImageUrl,
    };

    if (form.slug.trim()) {
      payload.slug = form.slug.trim();
    }

    if (form.path.trim()) {
      payload.path = form.path.trim();
    }

    if (form.sortOrder.trim()) {
      payload.sortOrder = Number(form.sortOrder);
    }

    return payload;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.title.trim()) {
      setErrorMessage("Page title is required.");
      return;
    }

    if (!canQueryApi) {
      setErrorMessage("Enter an API base URL and site ID first.");
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      const { response, payload } = await fetchWithRefresh(
        editingPageId
          ? `/sites/${siteId.trim()}/pages/${editingPageId}`
          : `/sites/${siteId.trim()}/pages`,
        {
          method: editingPageId ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(buildPayload()),
        },
      );

      if (!response.ok) {
        throw new Error(
          typeof payload === "object" && payload && "message" in payload
            ? String(payload.message)
            : `Request failed with status ${response.status}`,
        );
      }

      const savedPage =
        typeof payload === "object" && payload && "data" in payload
          ? (payload.data as PageRecord)
          : null;

      setStatusMessage(
        editingPageId
          ? `Updated \"${savedPage?.title ?? form.title}\".`
          : `Created \"${savedPage?.title ?? form.title}\".`,
      );

      if (savedPage) {
        setEditingPageId(savedPage.id);
        setForm(toFormState(savedPage));
      }

      await loadPages();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to save page.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(page: PageRecord) {
    const confirmed = window.confirm(`Delete page \"${page.title}\"?`);

    if (!confirmed) {
      return;
    }

    setErrorMessage(null);
    setStatusMessage(null);

    try {
      const { response, payload } = await fetchWithRefresh(
        `/sites/${siteId.trim()}/pages/${page.id}`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) {
        throw new Error(
          typeof payload === "object" && payload && "message" in payload
            ? String(payload.message)
            : `Request failed with status ${response.status}`,
        );
      }

      if (editingPageId === page.id) {
        setEditingPageId(null);
        setForm(initialFormState);
      }

      setStatusMessage(`Deleted \"${page.title}\".`);
      await loadPages();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to delete page.",
      );
    }
  }

  useEffect(() => {
    if (!showConnectionFields && canQueryApi) {
      void loadPages();
    }
  }, [apiBaseUrl, canQueryApi, showConnectionFields, siteId, token]);

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <section className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-black/20">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">Page manager</h2>
            <p className="text-sm text-black/60 dark:text-white/70">
              Use your API URL, JWT, and `siteId` to create, edit, and delete
              pages.
            </p>
          </div>
          <button
            type="button"
            onClick={loadPages}
            disabled={isLoading}
            className="rounded-lg bg-black px-3 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-white dark:text-black"
          >
            {isLoading ? "Loading..." : "Refresh"}
          </button>
        </div>

        {showConnectionFields && (
          <>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="grid gap-1 text-sm">
                <span className="font-medium">API base URL</span>
                <input
                  value={apiBaseUrl}
                  onChange={(event) => setApiBaseUrl(event.target.value)}
                  className="rounded-lg border border-black/10 px-3 py-2 dark:border-white/10 dark:bg-transparent"
                  placeholder="http://localhost:4000/api"
                />
              </label>

              <label className="grid gap-1 text-sm">
                <span className="font-medium">Site ID</span>
                <input
                  value={siteId}
                  onChange={(event) => setSiteId(event.target.value)}
                  className="rounded-lg border border-black/10 px-3 py-2 dark:border-white/10 dark:bg-transparent"
                  placeholder="cxxxxxxxxxxxx"
                />
              </label>
            </div>

            <label className="mt-3 grid gap-1 text-sm">
              <span className="font-medium">Bearer token</span>
              <textarea
                value={token}
                onChange={(event) => setToken(event.target.value)}
                className="min-h-24 rounded-lg border border-black/10 px-3 py-2 font-mono text-xs dark:border-white/10 dark:bg-transparent"
                placeholder="Paste JWT access token here"
              />
            </label>

            <div className="mt-4 flex flex-wrap gap-2 text-xs text-black/60 dark:text-white/70">
              <span className="rounded-full bg-black/5 px-2 py-1 dark:bg-white/10">
                CRUD ready
              </span>
              <span className="rounded-full bg-black/5 px-2 py-1 dark:bg-white/10">
                Reads list + detail endpoints
              </span>
              <span className="rounded-full bg-black/5 px-2 py-1 dark:bg-white/10">
                Saves config in localStorage
              </span>
            </div>
          </>
        )}

        {(statusMessage || errorMessage) && (
          <div
            className={`mt-4 rounded-lg border px-3 py-2 text-sm ${
              errorMessage
                ? "border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200"
                : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200"
            }`}
          >
            {errorMessage ?? statusMessage}
          </div>
        )}

        <div className="mt-5 space-y-3">
          {pages.length === 0 ? (
            <div className="rounded-xl border border-dashed border-black/15 p-4 text-sm text-black/60 dark:border-white/15 dark:text-white/70">
              No pages loaded yet. Click <strong>Refresh</strong> after entering
              a site.
            </div>
          ) : (
            pages.map((page) => (
              <article
                key={page.id}
                className="rounded-xl border border-black/10 p-4 dark:border-white/10"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold">{page.title}</h3>
                      {page.isHomePage && (
                        <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs text-sky-700 dark:bg-sky-950/50 dark:text-sky-200">
                          Home
                        </span>
                      )}
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs ${
                          page.isPublished
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-200"
                            : "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-200"
                        }`}
                      >
                        {page.isPublished ? "Published" : "Draft"}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-black/60 dark:text-white/70">
                      {page.path || "/"} • {page.pageType} • slug: {page.slug}
                    </p>
                    <p className="mt-1 text-xs text-black/50 dark:text-white/60">
                      Sections: {page._count?.sections ?? 0} • Forms:{" "}
                      {page._count?.forms ?? 0} • Sort: {page.sortOrder}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => loadPageDetail(page.id)}
                      className="rounded-lg border border-black/10 px-3 py-2 text-sm dark:border-white/10"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(page)}
                      className="rounded-lg border border-red-200 px-3 py-2 text-sm text-red-700 dark:border-red-900/60 dark:text-red-200"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-black/20">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">
              {editingPageId ? "Edit page" : "Create page"}
            </h2>
            <p className="text-sm text-black/60 dark:text-white/70">
              Manage title, slug, path, publish state, and SEO fields.
            </p>
          </div>
          <button
            type="button"
            onClick={resetForm}
            className="rounded-lg border border-black/10 px-3 py-2 text-sm dark:border-white/10"
          >
            Reset
          </button>
        </div>

        <form className="space-y-3" onSubmit={handleSubmit}>
          <label className="grid gap-1 text-sm">
            <span className="font-medium">Title</span>
            <input
              required
              value={form.title}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  title: event.target.value,
                }))
              }
              className="rounded-lg border border-black/10 px-3 py-2 dark:border-white/10 dark:bg-transparent"
              placeholder="About us"
            />
          </label>

          <div className="grid gap-3 md:grid-cols-2">
            <label className="grid gap-1 text-sm">
              <span className="font-medium">Slug</span>
              <input
                value={form.slug}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    slug: event.target.value,
                  }))
                }
                className="rounded-lg border border-black/10 px-3 py-2 dark:border-white/10 dark:bg-transparent"
                placeholder="about-us"
              />
            </label>

            <label className="grid gap-1 text-sm">
              <span className="font-medium">Path</span>
              <input
                value={form.path}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    path: event.target.value,
                  }))
                }
                className="rounded-lg border border-black/10 px-3 py-2 dark:border-white/10 dark:bg-transparent"
                placeholder="/about-us"
              />
            </label>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <label className="grid gap-1 text-sm">
              <span className="font-medium">Page type</span>
              <select
                value={form.pageType}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    pageType: event.target.value as PageType,
                  }))
                }
                className="rounded-lg border border-black/10 px-3 py-2 dark:border-white/10 dark:bg-transparent"
              >
                {PAGE_TYPES.map((pageType) => (
                  <option key={pageType} value={pageType}>
                    {pageType}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-1 text-sm">
              <span className="font-medium">Sort order</span>
              <input
                type="number"
                min="0"
                value={form.sortOrder}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    sortOrder: event.target.value,
                  }))
                }
                className="rounded-lg border border-black/10 px-3 py-2 dark:border-white/10 dark:bg-transparent"
                placeholder="0"
              />
            </label>
          </div>

          <div className="grid gap-2 md:grid-cols-2">
            <label className="flex items-center gap-2 rounded-lg border border-black/10 px-3 py-2 text-sm dark:border-white/10">
              <input
                type="checkbox"
                checked={form.isHomePage}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    isHomePage: event.target.checked,
                  }))
                }
              />
              Home page
            </label>

            <label className="flex items-center gap-2 rounded-lg border border-black/10 px-3 py-2 text-sm dark:border-white/10">
              <input
                type="checkbox"
                checked={form.isPublished}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    isPublished: event.target.checked,
                  }))
                }
              />
              Published
            </label>
          </div>

          <label className="grid gap-1 text-sm">
            <span className="font-medium">SEO title</span>
            <input
              value={form.seoTitle}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  seoTitle: event.target.value,
                }))
              }
              className="rounded-lg border border-black/10 px-3 py-2 dark:border-white/10 dark:bg-transparent"
              placeholder="About FinnWeb"
            />
          </label>

          <label className="grid gap-1 text-sm">
            <span className="font-medium">SEO description</span>
            <textarea
              value={form.seoDescription}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  seoDescription: event.target.value,
                }))
              }
              className="min-h-20 rounded-lg border border-black/10 px-3 py-2 dark:border-white/10 dark:bg-transparent"
              placeholder="Short description for search engines"
            />
          </label>

          <label className="grid gap-1 text-sm">
            <span className="font-medium">SEO keywords</span>
            <input
              value={form.seoKeywords}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  seoKeywords: event.target.value,
                }))
              }
              className="rounded-lg border border-black/10 px-3 py-2 dark:border-white/10 dark:bg-transparent"
              placeholder="landing page, finnweb"
            />
          </label>

          <label className="grid gap-1 text-sm">
            <span className="font-medium">OG image URL</span>
            <input
              value={form.ogImageUrl}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  ogImageUrl: event.target.value,
                }))
              }
              className="rounded-lg border border-black/10 px-3 py-2 dark:border-white/10 dark:bg-transparent"
              placeholder="https://example.com/og.jpg"
            />
          </label>

          <button
            type="submit"
            disabled={isSaving}
            className="w-full rounded-lg bg-black px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60 dark:bg-white dark:text-black"
          >
            {isSaving
              ? editingPageId
                ? "Saving changes..."
                : "Creating page..."
              : editingPageId
                ? "Save changes"
                : "Create page"}
          </button>
        </form>
      </section>
    </div>
  );
}
