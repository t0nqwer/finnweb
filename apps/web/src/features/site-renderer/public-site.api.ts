const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api";

export type PublicSection = {
  id: string;
  type: string;
  name?: string | null;
  sortOrder?: number;
  isVisible?: boolean;
  props: Record<string, unknown>;
};

export type PublicPage = {
  id: string;
  title: string;
  slug: string;
  path?: string | null;
  pageType?: string | null;
  isHomePage?: boolean | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  seoKeywords?: string | null;
  ogImageUrl?: string | null;
};

export type PublicPageData = {
  site: Record<string, unknown>;
  page: PublicPage;
  sections: PublicSection[];
};

export async function fetchPublicPage(
  siteSlug: string,
  pageSlug?: string,
): Promise<PublicPageData | null> {
  const url = pageSlug
    ? `${API_BASE_URL}/public/sites/by-slug/${encodeURIComponent(siteSlug)}/pages/${encodeURIComponent(pageSlug)}`
    : `${API_BASE_URL}/public/sites/by-slug/${encodeURIComponent(siteSlug)}`;

  try {
    const response = await fetch(url, {
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    const body = (await response.json()) as {
      success?: boolean;
      data?: PublicPageData;
    };

    if (!body.success || !body.data) {
      return null;
    }

    return body.data;
  } catch {
    return null;
  }
}

export type SubmitLeadInput = {
  siteId: string;
  name: string;
  phone: string;
  email?: string;
  message?: string;
  pageId?: string;
  sectionId?: string;
};

export type SubmitLeadResult =
  | { ok: true; submissionId: string }
  | { ok: false; error: string };

export async function submitPublicLead(
  input: SubmitLeadInput,
): Promise<SubmitLeadResult> {
  try {
    const { siteId, ...payload } = input;
    const response = await fetch(
      `${API_BASE_URL}/public/sites/${encodeURIComponent(siteId)}/forms/submit`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );

    const body = (await response.json()) as {
      success?: boolean;
      data?: { submissionId?: string };
      message?: string;
    };

    if (!response.ok || !body.success) {
      return {
        ok: false,
        error: body.message ?? `HTTP ${response.status}`,
      };
    }

    return {
      ok: true,
      submissionId: body.data?.submissionId ?? "",
    };
  } catch {
    return { ok: false, error: "NETWORK_ERROR" };
  }
}
