import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { fetchPublicPage } from "@/features/site-renderer/public-site.api";
import {
  getPublicSiteClassName,
  getPublicSiteThemeStyle,
  PublicSectionRenderer,
} from "@/features/site-renderer/PublicSectionRenderer";

type Props = {
  params: Promise<{ siteSlug: string; pageSlug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { siteSlug, pageSlug } = await params;
  const data = await fetchPublicPage(siteSlug, pageSlug);

  if (!data) {
    return { title: "Page Not Found" };
  }

  const { page, site } = data;
  const siteName = typeof site.name === "string" ? site.name : undefined;

  return {
    title: page.seoTitle ?? page.title ?? siteName,
    description: page.seoDescription ?? undefined,
    keywords: page.seoKeywords ?? undefined,
    openGraph: page.ogImageUrl
      ? { images: [{ url: page.ogImageUrl }] }
      : undefined,
  };
}

export default async function PublicSiteSubPage({ params }: Props) {
  const { siteSlug, pageSlug } = await params;
  const data = await fetchPublicPage(siteSlug, pageSlug);

  if (!data) {
    notFound();
  }

  const { sections, page, site } = data;
  const siteId = typeof data.site.id === "string" ? data.site.id : "";
  const version =
    typeof site.version === "number" || typeof site.version === "string"
      ? site.version
      : 0;

  return (
    <div
      className={getPublicSiteClassName(siteId, version)}
      style={getPublicSiteThemeStyle(site)}
    >
      <PublicSectionRenderer sections={sections} siteId={siteId} pageId={page.id} />
    </div>
  );
}
