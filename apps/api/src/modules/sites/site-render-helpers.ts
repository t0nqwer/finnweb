import { NotFoundException } from "@nestjs/common";

export type SnapshotRecord = Record<string, unknown>;

export function isPlainObject(value: unknown): value is SnapshotRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function normalizePath(value: string): string {
  const trimmed = value.trim();

  if (!trimmed || trimmed === "/") {
    return "/";
  }

  const withLeadingSlash = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;

  return withLeadingSlash.replace(/\/+/g, "/").replace(/\/$/, "");
}

export function extractPublishedPagesFromSnapshot(snapshot: unknown) {
  if (!isPlainObject(snapshot)) {
    return [] as SnapshotRecord[];
  }

  const pagesRaw = Array.isArray(snapshot.pages) ? snapshot.pages : [];
  return pagesRaw.filter((page) => isPlainObject(page)) as SnapshotRecord[];
}

export function selectPageFromSnapshot(
  pages: SnapshotRecord[],
  pathOrSlug?: string,
  options?: {
    requirePublished?: boolean;
  },
) {
  const requirePublished = options?.requirePublished ?? true;

  if (pages.length === 0) {
    return null;
  }

  if (!pathOrSlug || !pathOrSlug.trim()) {
    return (
      pages.find(
        (page) =>
          page.isHomePage === true &&
          (!requirePublished || page.isPublished !== false),
      ) ??
      pages.find((page) =>
        requirePublished ? page.isPublished !== false : true,
      ) ??
      null
    );
  }

  const normalizedInput = pathOrSlug.trim();
  const normalizedPath = normalizePath(normalizedInput).toLowerCase();
  const normalizedSlug = normalizedInput
    .replace(/^\//, "")
    .replace(/\/+$/, "")
    .toLowerCase();

  return (
    pages.find((page) => {
      const path = typeof page.path === "string" ? page.path.toLowerCase() : "";
      const slug = typeof page.slug === "string" ? page.slug.toLowerCase() : "";
      const isPublished = page.isPublished !== false;
      return (
        (!requirePublished || isPublished) &&
        (path === normalizedPath || slug === normalizedSlug)
      );
    }) ?? null
  );
}

export function mapVisibleSections(page: SnapshotRecord) {
  const sectionsRaw = Array.isArray(page.sections) ? page.sections : [];
  return sectionsRaw
    .filter((section) => isPlainObject(section))
    .filter((section) => section.isVisible !== false)
    .sort(
      (a, b) =>
        Number((a as SnapshotRecord).sortOrder ?? 0) -
        Number((b as SnapshotRecord).sortOrder ?? 0),
    );
}

export function mapPublicPage(page: SnapshotRecord) {
  return {
    id: page.id,
    title: page.title,
    slug: page.slug,
    path: page.path,
    pageType: page.pageType,
    isHomePage: page.isHomePage,
    seoTitle: page.seoTitle,
    seoDescription: page.seoDescription,
    seoKeywords: page.seoKeywords,
    ogImageUrl: page.ogImageUrl,
  };
}

export function requireSnapshotObject(snapshot: unknown) {
  if (!isPlainObject(snapshot)) {
    throw new NotFoundException("PUBLIC_PAGE_NOT_FOUND");
  }

  return snapshot;
}
