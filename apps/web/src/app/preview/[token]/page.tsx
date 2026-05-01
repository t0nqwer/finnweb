import { notFound } from "next/navigation";

type PreviewPageProps = {
  params: Promise<{ token: string }>;
  searchParams?: Promise<{ path?: string }>;
};

type PreviewSection = {
  id?: string;
  type?: string;
  name?: string;
  props?: Record<string, unknown>;
};

async function getPreviewData(token: string, path?: string) {
  const apiBase =
    process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api";
  const url = new URL(`/public/sites/preview/${token}`, apiBase);
  if (path) {
    url.searchParams.set("path", path);
  }

  const response = await fetch(url.toString(), { cache: "no-store" });
  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as {
    success?: boolean;
    data?: {
      site?: Record<string, unknown>;
      page?: Record<string, unknown>;
      sections?: PreviewSection[];
      preview?: Record<string, unknown>;
    };
  };

  if (!payload.success || !payload.data) {
    return null;
  }

  return payload.data;
}

function readString(props: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = props[key];
    if (typeof value === "string" && value.trim()) {
      return value;
    }
  }

  return "";
}

function readMenuItems(props: Record<string, unknown>) {
  const raw = props.menuItems;
  if (!Array.isArray(raw)) {
    return [] as Array<{ label: string; href: string }>;
  }

  return raw
    .filter((item) => item && typeof item === "object")
    .map((item) => {
      const entry = item as Record<string, unknown>;
      return {
        label: typeof entry.label === "string" ? entry.label : "Menu",
        href: typeof entry.href === "string" ? entry.href : "#",
      };
    });
}

function renderSection(section: PreviewSection, index: number) {
  const type = String(section.type ?? "CONTENT");
  const props =
    section.props && typeof section.props === "object"
      ? section.props
      : ({} as Record<string, unknown>);

  if (type === "NAVBAR") {
    const brand = readString(props, "logoText", "brandName", "title") || "FinnWeb";
    const menuItems = readMenuItems(props);
    const cta =
      (props.cta as { label?: string; href?: string } | undefined) ?? undefined;

    return (
      <nav key={section.id ?? `nav-${index}`} className="border-b border-white/10 bg-black/40 px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <span className="text-lg font-semibold text-amber-400">{brand}</span>
          <div className="hidden items-center gap-5 text-sm text-white/90 md:flex">
            {menuItems.map((item, itemIndex) => (
              <a key={`${item.label}-${itemIndex}`} href={item.href}>
                {item.label}
              </a>
            ))}
          </div>
          {cta?.label ? (
            <a
              href={cta.href || "#"}
              className="rounded-md bg-amber-400 px-4 py-2 text-xs font-semibold text-black"
            >
              {cta.label}
            </a>
          ) : null}
        </div>
      </nav>
    );
  }

  if (type === "HERO" || type === "HEADER") {
    const title = readString(props, "title", "headline", "heading") || "Welcome";
    const subtitle = readString(props, "subtitle", "description", "body");
    const buttonText = readString(props, "buttonText", "ctaText") || "Learn More";

    return (
      <section key={section.id ?? `hero-${index}`} className="px-6 py-16 md:py-24">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="text-4xl font-semibold md:text-6xl">{title}</h1>
          {subtitle ? <p className="mt-5 text-white/75">{subtitle}</p> : null}
          <button className="mt-8 rounded-md bg-amber-400 px-6 py-3 text-sm font-semibold text-black">
            {buttonText}
          </button>
        </div>
      </section>
    );
  }

  if (type === "FOOTER") {
    const title = readString(props, "title", "brandName") || "Footer";
    const description = readString(props, "description", "body");

    return (
      <footer key={section.id ?? `footer-${index}`} className="border-t border-white/10 bg-black/40 px-6 py-10">
        <div className="mx-auto max-w-6xl text-sm text-white/70">
          <p className="font-semibold text-white">{title}</p>
          {description ? <p className="mt-2">{description}</p> : null}
        </div>
      </footer>
    );
  }

  const title =
    readString(props, "title", "headline", "heading") ||
    section.name ||
    type;
  const body = readString(props, "body", "description", "subtitle");

  return (
    <section
      key={section.id ?? `section-${index}`}
      className="mx-6 my-4 rounded-xl border border-white/10 bg-black/25 p-5"
    >
      <p className="text-[10px] tracking-[0.18em] text-white/55 uppercase">{type}</p>
      <h2 className="mt-1 text-lg font-medium">{title}</h2>
      {body ? <p className="mt-2 text-sm text-white/75">{body}</p> : null}
    </section>
  );
}

export default async function PreviewTokenPage({
  params,
  searchParams,
}: PreviewPageProps) {
  const { token } = await params;
  const query = searchParams ? await searchParams : undefined;
  const data = await getPreviewData(token, query?.path);

  if (!data) {
    notFound();
  }

  const siteName = String(data.site?.name ?? "FinnWeb Preview");
  const pageTitle = String(data.page?.title ?? "Preview Page");
  const sections = Array.isArray(data.sections) ? data.sections : [];

  return (
    <main className="min-h-screen bg-[#0d1017] text-[#f5f5f5]">
      <div className="mx-auto min-h-screen max-w-6xl border-x border-white/10 bg-[#111523]">
        <header className="border-b border-white/10 px-6 py-4">
          <p className="text-xs tracking-[0.2em] text-white/60 uppercase">Preview Token</p>
          <h1 className="mt-1 text-xl font-semibold">{siteName}</h1>
          <p className="text-sm text-white/70">{pageTitle}</p>
        </header>

        {sections.length === 0 ? (
          <div className="m-6 rounded-xl border border-dashed border-white/20 bg-black/20 p-6 text-sm text-white/70">
            No visible section in preview snapshot.
          </div>
        ) : (
          sections.map((section, index) => renderSection(section, index))
        )}
      </div>
    </main>
  );
}
