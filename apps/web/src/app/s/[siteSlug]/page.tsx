import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { fetchPublicPage } from "@/features/site-renderer/public-site.api";
import { PublicSectionRenderer } from "@/features/site-renderer/PublicSectionRenderer";

type Props = {
  params: Promise<{ siteSlug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { siteSlug } = await params;
  const data = await fetchPublicPage(siteSlug);

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

export default async function PublicSiteHomePage({ params }: Props) {
  const { siteSlug } = await params;
  const data = await fetchPublicPage(siteSlug);

  if (!data) {
    notFound();
  }

  const { sections, page } = data;
  const siteId = typeof data.site.id === "string" ? data.site.id : "";

  return (
    <PublicSectionRenderer sections={sections} siteId={siteId} pageId={page.id} />
  );
}
