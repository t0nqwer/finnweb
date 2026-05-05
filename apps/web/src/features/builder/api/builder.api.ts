import {
  DEFAULT_API_BASE_URL,
  fetchApiWithTokenRefresh,
} from "@/lib/api-client";

type ApiResponse<T> = {
  success?: boolean;
  data?: T;
  message?: string;
  error?: string;
};

export type SitePage = {
  id: string;
  title: string;
  slug: string;
  path?: string | null;
  pageType?: string | null;
  isHomePage?: boolean;
  isPublished?: boolean;
  sortOrder?: number;
};

export type SiteSection = {
  id: string;
  type: string;
  name?: string | null;
  sortOrder: number;
  isVisible: boolean;
  props?: Record<string, unknown> | null;
  customData?: Record<string, unknown> | null;
  sectionTemplate?: {
    id: string;
    code: string;
    name: string;
    sectionType: string;
  } | null;
};

export type UpdateSectionInput = {
  name?: string;
  sortOrder?: number;
  isVisible?: boolean;
  props?: Record<string, unknown>;
};

export type CreateSectionInput = {
  sectionTemplateId?: string;
  type?: string;
  name?: string;
  sortOrder?: number;
  props?: Record<string, unknown>;
};

export type PublishSiteResult = {
  siteId: string;
  version: number;
  status: string;
  publicUrl?: string | null;
  publishedAt: string;
};

type BuilderApiArgs = {
  apiBaseUrl?: string;
};

type SectionPathArgs = BuilderApiArgs & {
  siteId: string;
  pageId: string;
};

type UpdateSectionArgs = SectionPathArgs & {
  sectionId: string;
  input: UpdateSectionInput;
};

type CreateSectionArgs = SectionPathArgs & {
  input: CreateSectionInput;
};

type DeleteSectionArgs = SectionPathArgs & {
  sectionId: string;
};

type ReorderSectionsArgs = SectionPathArgs & {
  sectionIds: string[];
};

export async function getSitePages({
  apiBaseUrl = DEFAULT_API_BASE_URL,
  siteId,
}: BuilderApiArgs & { siteId: string }) {
  return requestBuilderApi<SitePage[]>({
    apiBaseUrl,
    path: `/sites/${siteId}/pages`,
    init: { cache: "no-store" },
  });
}

export async function getSiteSections({
  apiBaseUrl = DEFAULT_API_BASE_URL,
  siteId,
  pageId,
}: SectionPathArgs) {
  return requestBuilderApi<SiteSection[]>({
    apiBaseUrl,
    path: `/sites/${siteId}/pages/${pageId}/sections`,
    init: { cache: "no-store" },
  });
}

export async function updateSiteSection({
  apiBaseUrl = DEFAULT_API_BASE_URL,
  siteId,
  pageId,
  sectionId,
  input,
}: UpdateSectionArgs) {
  return requestBuilderApi<SiteSection>({
    apiBaseUrl,
    path: `/sites/${siteId}/pages/${pageId}/sections/${sectionId}`,
    init: {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    },
  });
}

export async function createSiteSection({
  apiBaseUrl = DEFAULT_API_BASE_URL,
  siteId,
  pageId,
  input,
}: CreateSectionArgs) {
  return requestBuilderApi<SiteSection>({
    apiBaseUrl,
    path: `/sites/${siteId}/pages/${pageId}/sections`,
    init: {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    },
  });
}

export async function deleteSiteSection({
  apiBaseUrl = DEFAULT_API_BASE_URL,
  siteId,
  pageId,
  sectionId,
}: DeleteSectionArgs) {
  return requestBuilderApi<{ id: string; deleted: boolean }>({
    apiBaseUrl,
    path: `/sites/${siteId}/pages/${pageId}/sections/${sectionId}`,
    init: {
      method: "DELETE",
    },
  });
}

export async function reorderSiteSections({
  apiBaseUrl = DEFAULT_API_BASE_URL,
  siteId,
  pageId,
  sectionIds,
}: ReorderSectionsArgs) {
  return requestBuilderApi<SiteSection[]>({
    apiBaseUrl,
    path: `/sites/${siteId}/pages/${pageId}/sections/reorder`,
    init: {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ sectionIds }),
    },
  });
}

export async function publishSite({
  apiBaseUrl = DEFAULT_API_BASE_URL,
  siteId,
}: BuilderApiArgs & { siteId: string }) {
  return requestBuilderApi<PublishSiteResult>({
    apiBaseUrl,
    path: `/sites/${siteId}/publish`,
    init: {
      method: "POST",
    },
  });
}

async function requestBuilderApi<T>({
  apiBaseUrl,
  path,
  init,
}: {
  apiBaseUrl: string;
  path: string;
  init?: RequestInit;
}) {
  const { response, payload, authState } =
    await fetchApiWithTokenRefresh<ApiResponse<T>>({
      apiBaseUrl,
      path,
      init,
    });

  if (!response.ok) {
    throw new Error(resolveApiError(payload, "Builder API request failed"));
  }

  if (!payload || !("data" in payload)) {
    throw new Error("Builder API response did not include data.");
  }

  return {
    data: payload.data as T,
    authState,
  };
}

function resolveApiError(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== "object") {
    return fallback;
  }

  if ("message" in payload && typeof payload.message === "string") {
    return payload.message;
  }

  if ("error" in payload && typeof payload.error === "string") {
    return payload.error;
  }

  return fallback;
}
