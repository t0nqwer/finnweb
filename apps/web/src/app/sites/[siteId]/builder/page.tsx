import { BuilderShell } from "@/features/builder/components/BuilderShell";

type SiteBuilderPageProps = {
  params: Promise<{ siteId: string }>;
};

export default async function SiteBuilderPage({ params }: SiteBuilderPageProps) {
  const { siteId } = await params;

  return <BuilderShell siteId={siteId} />;
}
