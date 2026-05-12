import type { SectionType } from "../types/template-factory.types";
import type {
  CapturedWebsitePage,
  CapturedWebsiteSource,
  TemplateDraftSection,
  WebsitePageAnalysis,
  WebsiteProfile,
  WebsiteSectionAnalysis,
  WebsiteTemplateDraft,
  WebsiteToTemplateAgentOptions,
  WebsiteToTemplateDraftResult,
} from "./website-to-template-agent.types";

const DEFAULT_MENU_ITEMS = [
  { label: "หน้าแรก", href: "/" },
  { label: "บริการ", href: "#services" },
  { label: "ติดต่อ", href: "#contact" },
];

const SECTION_TYPE_BY_KIND: Record<WebsiteSectionAnalysis["kind"], SectionType> = {
  navbar: "NAVBAR",
  hero: "HERO",
  stats: "CONTENT",
  courses: "CONTENT",
  logos: "CONTENT",
  categories: "CONTENT",
  articles: "CONTENT",
  features: "FEATURE",
  about: "ABOUT",
  gallery: "GALLERY",
  testimonials: "TESTIMONIAL",
  pricing: "PRICING",
  faq: "FAQ",
  contact: "CONTACT",
  form: "FORM",
  cta: "CTA",
  footer: "FOOTER",
  content: "CONTENT",
  unknown: "CONTENT",
};

export function createWebsiteProfileFromCapture(
  capture: CapturedWebsiteSource,
): WebsiteProfile {
  const pages = capture.pages.length
    ? capture.pages.map((page, index) => normalizeCapturedPage(page, index))
    : [
        {
          title: capture.name ?? hostnameFromUrl(capture.sourceUrl),
          path: "/",
          sections: [],
        },
      ];
  const allImages = capture.pages.flatMap((page) => page.images ?? []);
  const styleKeywords = uniqueNonEmpty([
    ...(capture.styleKeywords ?? []),
    inferStyleKeyword(capture.pages),
  ]);

  return {
    sourceUrl: capture.sourceUrl,
    name: capture.name ?? inferNameFromCapture(capture),
    description:
      capture.pages.find((page) => page.metaDescription?.trim())?.metaDescription,
    language: capture.language,
    industry: capture.industry,
    goals: capture.goals?.length ? capture.goals : inferGoals(capture.pages),
    styleKeywords,
    assets: allImages.slice(0, 12).map((image, index) => ({
      url: image.url,
      alt: image.alt,
      role: inferImageRole(image, index),
    })),
    designTokens: inferDesignTokens(capture.pages),
    pages,
  };
}

export function createTemplateDraftFromWebsiteProfile(
  profile: WebsiteProfile,
  options: WebsiteToTemplateAgentOptions = {},
): WebsiteToTemplateDraftResult {
  const warnings: string[] = [];
  const pages = normalizePages(profile, warnings);
  const extractedSectionCount = profile.pages.reduce(
    (total, page) => total + page.sections.length,
    0,
  );
  const firstHeroImage = findFirstAsset(profile, "hero")?.url;
  const templateName =
    options.templateName ?? profile.name ?? hostnameFromUrl(profile.sourceUrl);
  const slug = makeSlug(templateName) || "imported-website-template";
  const template: WebsiteTemplateDraft = {
    name: templateName,
    slug,
    code: `AI-${slug.toUpperCase().replace(/-/g, "_").slice(0, 48)}`,
    description:
      profile.description ??
      `AI-generated editable FinnWeb template converted from ${profile.sourceUrl}.`,
    thumbnailUrl: firstHeroImage ?? findFirstAsset(profile)?.url,
    category: options.category ?? profile.industry ?? "imported",
    businessTypes: uniqueNonEmpty([
      profile.industry,
      options.fallbackBusinessType ?? "service",
    ]),
    goals: uniqueNonEmpty([...(profile.goals ?? []), options.fallbackGoal ?? "leads"]),
    styles: uniqueNonEmpty([
      ...(profile.styleKeywords ?? []),
      options.fallbackStyle ?? "imported",
    ]),
    languages: uniqueNonEmpty([
      profile.language,
      options.defaultLanguage ?? "thai",
    ]),
    keywords: uniqueNonEmpty([
      "ai-import",
      "website-to-template",
      hostnameFromUrl(profile.sourceUrl),
      profile.industry,
      ...(profile.styleKeywords ?? []),
    ]),
    pages,
  };

  if (template.pages.length === 0) {
    warnings.push("No pages were extracted. The draft contains no usable template.");
  }

  if (!template.pages.some((page) => page.isHomePage)) {
    warnings.push("No home page was detected. The first page was marked as home.");
    if (template.pages[0]) {
      template.pages[0].isHomePage = true;
      template.pages[0].path = "/";
    }
  }

  return {
    template,
    confidence: calculateConfidence(profile, warnings),
    warnings,
    source: {
      url: profile.sourceUrl,
      extractedPageCount: profile.pages.length,
      extractedSectionCount,
    },
  };
}

function normalizeCapturedPage(
  page: CapturedWebsitePage,
  pageIndex: number,
): WebsitePageAnalysis {
  const title = page.title?.trim() || `Imported page ${pageIndex + 1}`;
  const path = page.path ?? pathFromUrl(page.url) ?? (pageIndex === 0 ? "/" : undefined);
  const headings = uniqueNonEmpty(page.headings ?? []);
  const links = normalizeLinks(page.links);
  const sections: WebsiteSectionAnalysis[] = [];
  const isEducation = isEducationCapture(page);

  if (pageIndex === 0 || links.length > 0) {
    sections.push({
      id: `nav-${pageIndex + 1}`,
      kind: "navbar",
      links,
      variant: isEducation ? "stickyAnimated" : undefined,
    });
  }

  sections.push({
    id: `hero-${pageIndex + 1}`,
    kind: "hero",
    heading: headings[0] ?? title,
    body: page.metaDescription ?? firstTextBlock(page),
    ctaLabel: inferCta(links)?.label,
    ctaHref: inferCta(links)?.href,
    imageUrl: inferHeroImage(page)?.url,
    variant: isEducation ? "educationEditorial" : undefined,
    items: toStatItems(page.stats),
  });

  if (page.stats?.length) {
    sections.push({
      id: `stats-${pageIndex + 1}`,
      kind: "stats",
      heading: "Key metrics",
      items: toStatItems(page.stats),
      variant: "metricStrip",
    });
  }

  const courseCards = inferCourseCards(page);
  if (courseCards.length > 0) {
    sections.push({
      id: `courses-${pageIndex + 1}`,
      kind: "courses",
      heading: findHeadingMatching(headings, /คอร์ส|course/i) ?? "คอร์สแนะนำ",
      ctaLabel: "ดูคอร์สทั้งหมด",
      ctaHref: inferCourseHref(links),
      items: courseCards,
      variant: "featuredGrid",
    });
  }

  const featureItems = buildFeatureItems(page);
  if (featureItems.length > 0) {
    sections.push({
      id: `features-${pageIndex + 1}`,
      kind: "features",
      heading: headings[1] ?? "Highlights",
      items: featureItems,
      variant: isEducation ? "bentoLearning" : undefined,
    });
  }

  const testimonials = inferTestimonials(page);
  if (testimonials.length > 0) {
    sections.push({
      id: `testimonials-${pageIndex + 1}`,
      kind: "testimonials",
      heading: findHeadingMatching(headings, /รีวิว|เสียง|testimonial/i) ?? "เสียงจากผู้เรียนของเรา",
      items: testimonials,
      variant: "bentoProof",
    });
  }

  const logos = page.logos?.length ? page.logos : inferLogos(page);
  if (logos.length > 0) {
    sections.push({
      id: `logos-${pageIndex + 1}`,
      kind: "logos",
      heading: "ได้รับความไว้วางใจจากทีมชั้นนำ",
      items: logos.map((title) => ({ title })),
      variant: "logoStrip",
    });
  }

  const categoryCards = inferCategoryCards(page);
  if (categoryCards.length > 0) {
    sections.push({
      id: `categories-${pageIndex + 1}`,
      kind: "categories",
      heading: findHeadingMatching(headings, /หมวดหมู่|category/i) ?? "หมวดหมู่คอร์สเรียน",
      body: page.textBlocks?.find((block) => /เลือกคอร์ส|ยกระดับทักษะ|career/i.test(block)),
      items: categoryCards,
      variant: "categoryGrid",
    });
  }

  const articleCards = inferArticleCards(page);
  if (articleCards.length > 0) {
    sections.push({
      id: `articles-${pageIndex + 1}`,
      kind: "articles",
      heading: findHeadingMatching(headings, /บทความ|ideas|article/i) ?? "บทความและไอเดีย",
      items: articleCards,
      variant: "insightsGrid",
    });
  }

  const faqs = page.faqs?.length ? page.faqs : inferFaqs(page);
  if (faqs.length > 0) {
    sections.push({
      id: `faq-${pageIndex + 1}`,
      kind: "faq",
      heading: findHeadingMatching(headings, /คำถาม|faq/i) ?? "คำถามที่พบบ่อย",
      items: faqs,
      variant: "splitAccordion",
    });
  }

  if (page.forms?.length) {
    const form = page.forms[0];
    sections.push({
      id: form?.id ?? `form-${pageIndex + 1}`,
      kind: "form",
      heading: form?.title ?? "Contact us",
      ctaLabel: "Submit",
      ctaHref: form?.action ?? "#contact",
    });
  }

  const contactLink = links.find((link) => isContactHref(link.href));
  if (contactLink && !page.forms?.length) {
    sections.push({
      id: `contact-${pageIndex + 1}`,
      kind: "contact",
      heading: "Contact",
      ctaLabel: contactLink.label,
      ctaHref: contactLink.href,
    });
  }

  sections.push({
    id: `footer-${pageIndex + 1}`,
    kind: "footer",
    links: links.slice(0, 6),
    variant: isEducation ? "largeDark" : undefined,
  });

  return {
    title,
    path,
    description: page.metaDescription,
    keywords: headings.slice(0, 6),
    sections,
  };
}

function normalizePages(
  profile: WebsiteProfile,
  warnings: string[],
): WebsiteTemplateDraft["pages"] {
  return profile.pages.map((page, pageIndex) => {
    const slug = makeSlug(page.slug ?? page.title) || `page-${pageIndex + 1}`;
    const isHomePage = pageIndex === 0 || page.path === "/";
    const sections = normalizeSections(page, profile, warnings);

    if (sections.length === 0) {
      warnings.push(`Page "${page.title}" has no recognized sections.`);
    }

    return {
      title: page.title || (isHomePage ? "หน้าแรก" : `หน้า ${pageIndex + 1}`),
      slug,
      path: isHomePage ? "/" : page.path ?? `/${slug}`,
      pageType: isHomePage ? "LANDING" : "NORMAL",
      isHomePage,
      isPublished: true,
      sortOrder: pageIndex,
      seoTitle: page.title,
      seoDescription: page.description,
      seoKeywords: page.keywords?.join(", "),
      ogImageUrl: findHeroImage(page, profile),
      sections,
    };
  });
}

function normalizeSections(
  page: WebsitePageAnalysis,
  profile: WebsiteProfile,
  warnings: string[],
): TemplateDraftSection[] {
  const extracted = page.sections.map((section, sectionIndex) =>
    normalizeSection(section, profile, sectionIndex),
  );

  if (!extracted.some((section) => section.type === "NAVBAR")) {
    extracted.unshift(createNavbarFallback(profile));
  }

  if (!extracted.some((section) => section.type === "HERO")) {
    warnings.push(`Page "${page.title}" did not include a hero. A safe hero was added.`);
    extracted.splice(1, 0, createHeroFallback(page, profile));
  }

  if (!extracted.some((section) => section.type === "FOOTER")) {
    extracted.push(createFooterFallback(profile));
  }

  return extracted.map((section, index) => ({
    ...section,
    sortOrder: index,
  }));
}

function normalizeSection(
  section: WebsiteSectionAnalysis,
  profile: WebsiteProfile,
  sectionIndex: number,
): TemplateDraftSection {
  const type = SECTION_TYPE_BY_KIND[section.kind] ?? "CONTENT";
  const motion = mergeMotion(section.motion, profile.animations, section.id);
  const props = buildSectionProps(type, section, profile, motion);

  return {
    type,
    name: section.heading ?? readableSectionName(type, sectionIndex),
    sortOrder: sectionIndex,
    isVisible: true,
    props,
  };
}

function buildSectionProps(
  type: SectionType,
  section: WebsiteSectionAnalysis,
  profile: WebsiteProfile,
  motion: unknown[] | undefined,
): Record<string, unknown> {
  const base = withDesignTokens(
    {
      title: section.heading ?? fallbackTitle(type, profile),
      variant: section.variant,
      eyebrow: section.eyebrow,
      subtitle: section.body,
      body: section.body,
      imageUrl: section.imageUrl,
      items: section.items,
      sourceUrl: profile.sourceUrl,
      importedSectionId: section.id,
      motion,
    },
    profile,
  );

  switch (type) {
    case "NAVBAR":
      return withDesignTokens(
        {
          logo: findFirstAsset(profile, "logo")?.url,
          brandName: profile.name ?? hostnameFromUrl(profile.sourceUrl),
          menuItems: section.links?.length ? section.links : DEFAULT_MENU_ITEMS,
          variant: section.variant,
          cta: {
            label: section.ctaLabel ?? "ติดต่อเรา",
            href: section.ctaHref ?? "#contact",
          },
          motion,
        },
        profile,
      );
    case "HERO":
      return {
        ...base,
        title: section.heading ?? profile.name ?? "สร้างเว็บไซต์ที่พร้อมใช้งาน",
        subtitle:
          section.body ??
          profile.description ??
          "เทมเพลตนี้ถูกแปลงให้แก้ไขได้ใน FinnWeb",
        buttonText: section.ctaLabel ?? "เริ่มต้น",
        buttonHref: section.ctaHref ?? "#contact",
        backgroundImage: section.imageUrl ?? findFirstAsset(profile, "hero")?.url,
        imageUrl: section.imageUrl ?? findFirstAsset(profile, "hero")?.url,
        stats: section.items,
      };
    case "CTA":
    case "FORM":
    case "CONTACT":
      return {
        ...base,
        title: section.heading ?? "ติดต่อเรา",
        buttonText: section.ctaLabel ?? "ส่งข้อมูล",
        buttonHref: section.ctaHref ?? "#contact",
      };
    case "FOOTER":
      return {
        ...base,
        brandName: profile.name ?? hostnameFromUrl(profile.sourceUrl),
        menuItems: section.links?.length ? section.links : DEFAULT_MENU_ITEMS,
      };
    case "PRICING":
      return {
        ...base,
        title: section.heading ?? "แพ็กเกจ",
        sourceMode: "manual",
        itemLimit: Array.isArray(section.items) ? section.items.length : 3,
      };
    default:
      return {
        ...base,
        buttonText: section.ctaLabel,
        buttonHref: section.ctaHref,
      };
  }
}

function withDesignTokens(
  props: Record<string, unknown>,
  profile: WebsiteProfile,
): Record<string, unknown> {
  return {
    ...dropUndefined(props),
    designTokens: profile.designTokens ? dropUndefined(profile.designTokens as any) : undefined,
  };
}

function createNavbarFallback(profile: WebsiteProfile): TemplateDraftSection {
  return {
    type: "NAVBAR",
    name: "Imported navigation",
    isVisible: true,
    props: buildSectionProps(
      "NAVBAR",
      {
        kind: "navbar",
        links: DEFAULT_MENU_ITEMS,
      },
      profile,
      undefined,
    ),
  };
}

function createHeroFallback(
  page: WebsitePageAnalysis,
  profile: WebsiteProfile,
): TemplateDraftSection {
  return {
    type: "HERO",
    name: "Imported hero",
    isVisible: true,
    props: buildSectionProps(
      "HERO",
      {
        kind: "hero",
        heading: page.title,
        body: page.description ?? profile.description,
        imageUrl: findHeroImage(page, profile),
      },
      profile,
      undefined,
    ),
  };
}

function createFooterFallback(profile: WebsiteProfile): TemplateDraftSection {
  return {
    type: "FOOTER",
    name: "Imported footer",
    isVisible: true,
    props: buildSectionProps("FOOTER", { kind: "footer" }, profile, undefined),
  };
}

function mergeMotion(
  sectionMotion: WebsiteSectionAnalysis["motion"],
  pageMotion: WebsiteProfile["animations"],
  sectionId?: string,
) {
  const scoped = pageMotion?.filter((motion) =>
    sectionId && motion.target ? motion.target === sectionId : false,
  );
  const motion = [...(sectionMotion ?? []), ...(scoped ?? [])];
  return motion.length > 0 ? motion : undefined;
}

function calculateConfidence(profile: WebsiteProfile, warnings: string[]) {
  const pageCount = profile.pages.length;
  const sectionCount = profile.pages.reduce(
    (total, page) => total + page.sections.length,
    0,
  );
  let score = 0.4;
  if (pageCount > 0) score += 0.15;
  if (sectionCount >= 4) score += 0.2;
  if (profile.designTokens) score += 0.1;
  if ((profile.assets ?? []).length > 0) score += 0.05;
  if ((profile.animations ?? []).length > 0) score += 0.05;
  score -= Math.min(warnings.length * 0.05, 0.2);
  return Math.max(0, Math.min(1, Number(score.toFixed(2))));
}

function fallbackTitle(type: SectionType, profile: WebsiteProfile): string {
  if (type === "HERO") return profile.name ?? "หน้าแรก";
  if (type === "FOOTER") return profile.name ?? "ข้อมูลเว็บไซต์";
  return "รายละเอียด";
}

function readableSectionName(type: SectionType, index: number): string {
  return `${type.toLowerCase().replace(/_/g, " ")} ${index + 1}`;
}

function findHeroImage(page: WebsitePageAnalysis, profile: WebsiteProfile) {
  return (
    page.sections.find((section) => section.imageUrl)?.imageUrl ??
    findFirstAsset(profile, "hero")?.url ??
    findFirstAsset(profile, "background")?.url
  );
}

function findFirstAsset(profile: WebsiteProfile, role?: string) {
  return role
    ? profile.assets?.find((asset) => asset.role === role)
    : profile.assets?.[0];
}

function inferNameFromCapture(capture: CapturedWebsiteSource) {
  return (
    capture.pages.find((page) => page.title?.trim())?.title?.trim() ??
    hostnameFromUrl(capture.sourceUrl)
  );
}

function pathFromUrl(url: string) {
  try {
    return new URL(url).pathname || "/";
  } catch {
    return undefined;
  }
}

function normalizeLinks(links: CapturedWebsitePage["links"]) {
  return uniqueBy(
    (links ?? [])
      .map((link) => ({
        label: link.label.trim(),
        href: link.href.trim(),
      }))
      .filter((link) => link.label && link.href),
    (link) => `${link.label}:${link.href}`,
  ).slice(0, 8);
}

function inferCta(links: Array<{ label: string; href: string }>) {
  return (
    links.find((link) => isContactHref(link.href)) ??
    links.find((link) => /contact|book|start|quote|demo|buy|order/i.test(link.label))
  );
}

function isContactHref(href: string) {
  return /contact|line|tel:|mailto:|booking|book/i.test(href);
}

function inferHeroImage(page: CapturedWebsitePage) {
  const images = page.images ?? [];
  return (
    images.find((image) => image.width && image.height && image.width >= image.height) ??
    images[0]
  );
}

function inferImageRole(
  image: NonNullable<CapturedWebsitePage["images"]>[number],
  index: number,
) {
  const text = `${image.url} ${image.alt ?? ""}`.toLowerCase();
  if (/logo|brand/.test(text)) return "logo";
  if (index === 0 || /hero|cover|banner/.test(text)) return "hero";
  if (/background|bg/.test(text)) return "background";
  return "gallery";
}

function firstTextBlock(page: CapturedWebsitePage) {
  return (page.textBlocks ?? []).find((block) => block.trim().length > 20)?.trim();
}

function buildFeatureItems(page: CapturedWebsitePage) {
  const candidates = uniqueNonEmpty([
    ...(page.headings ?? []).slice(1),
    ...(page.textBlocks ?? []).filter((block) => block.length <= 140).slice(0, 6),
  ]);

  return candidates.slice(0, 6).map((text) => ({
    title: text.length > 54 ? `${text.slice(0, 51).trim()}...` : text,
    body: text,
    description: text,
  }));
}

function toStatItems(stats: CapturedWebsitePage["stats"]) {
  return stats?.map((stat) => ({
    title: stat.value,
    description: stat.label,
    value: stat.value,
    label: stat.label,
  }));
}

function isEducationCapture(page: CapturedWebsitePage) {
  const text = [
    page.title,
    page.metaDescription,
    ...(page.headings ?? []),
    ...(page.textBlocks ?? []),
    ...(page.links?.map((link) => link.label) ?? []),
  ]
    .join(" ")
    .toLowerCase();

  return /academy|course|คอร์ส|เรียน|ผู้เรียน|บทเรียน/.test(text);
}

function findHeadingMatching(headings: string[], pattern: RegExp) {
  return headings.find((heading) => pattern.test(heading));
}

function inferCourseHref(links: Array<{ label: string; href: string }>) {
  return links.find((link) => /คอร์ส|course/i.test(link.label))?.href ?? "#courses";
}

function inferCourseCards(page: CapturedWebsitePage) {
  const explicit = (page.cards ?? []).filter((card) =>
    /คอร์ส|course|บทเรียน|ชั่วโมง|บาท/i.test(
      `${card.eyebrow ?? ""} ${card.meta ?? ""} ${card.price ?? ""} ${card.title}`,
    ),
  );
  if (explicit.length > 0) {
    return explicit.slice(0, 6);
  }

  const blocks = page.textBlocks ?? [];
  const titles = blocks.filter((block) =>
    /ออกแบบ|AI|Machine|Design Systems|การตลาด|เทคโนโลยี|พื้นฐาน/i.test(block),
  );
  const images = page.images ?? [];

  return titles.slice(0, 3).map((title, index) => ({
    title,
    description:
      blocks.find(
        (block) =>
          block !== title &&
          block.length > 48 &&
          !/บาท|บทเรียน|ชั่วโมง/.test(block),
      ) ?? title,
    imageUrl: images[index + 1]?.url ?? images[index]?.url,
    eyebrow: "คอร์สเรียน",
    meta: blocks.find((block) => /บทเรียน|ชั่วโมง/.test(block)),
    price: blocks.find((block) => /บาท|THB|฿/.test(block)) ?? "640 บาท",
  }));
}

function inferTestimonials(page: CapturedWebsitePage) {
  const blocks = page.textBlocks ?? [];
  const quotes = blocks.filter((block) => /"|"|“|”/.test(block) || block.length > 70);
  const images = (page.images ?? []).filter((image) =>
    /avatar|person|ผู้เรียน|emma|daniel|maria|sarah|ปรียา/i.test(
      `${image.url} ${image.alt ?? ""}`,
    ),
  );

  return quotes.slice(0, 5).map((quote, index) => ({
    quote: quote.replace(/^["“]|["”]$/g, ""),
    author: blocks.find((block) => block.length < 36 && index > 0) ?? undefined,
    role: blocks.find((block) => /manager|analyst|engineer|designer|specialist/i.test(block)),
    imageUrl: images[index]?.url,
  }));
}

function inferLogos(page: CapturedWebsitePage) {
  const known = ["NOVA", "Rise", "Greenish", "Bristol", "Italic", "Phoenix"];
  const text = [...(page.headings ?? []), ...(page.textBlocks ?? [])].join(" ");
  return known.filter((logo) => text.includes(logo));
}

function inferCategoryCards(page: CapturedWebsitePage) {
  const labels = ["ดีไซน์", "การจัดการ", "เทคโนโลยี", "การตลาด"];
  const blocks = page.textBlocks ?? [];
  const found = labels.filter((label) => blocks.some((block) => block.includes(label)));
  return found.map((title) => ({
    title,
    description:
      blocks.find((block) => block.includes(title) && block.length > title.length) ??
      "เลือกคอร์สที่เหมาะกับเป้าหมายและเส้นทางอาชีพของคุณ",
    eyebrow: "24 คอร์ส",
  }));
}

function inferArticleCards(page: CapturedWebsitePage) {
  const blocks = page.textBlocks ?? [];
  return blocks
    .filter((block) => /บทความ|เทรนด์|เส้นทาง|วิธีเลือก/.test(block))
    .slice(0, 3)
    .map((title) => ({
      title,
      description: "บทความ",
      meta: "8 มกราคม 2025",
    }));
}

function inferFaqs(page: CapturedWebsitePage) {
  const blocks = page.textBlocks ?? [];
  return blocks
    .filter((block) => /\?$|ไหม|หรือเดโม|self-paced|รับประกัน/.test(block))
    .slice(0, 6)
    .map((question) => ({
      question,
      answer:
        blocks.find(
          (block) =>
            block !== question &&
            block.length > 60 &&
            !/\?$/.test(block),
        ) ?? undefined,
    }));
}

function inferGoals(pages: CapturedWebsitePage[]) {
  const text = pages
    .flatMap((page) => [
      page.title,
      page.metaDescription,
      ...(page.links?.map((link) => `${link.label} ${link.href}`) ?? []),
    ])
    .join(" ")
    .toLowerCase();

  if (/shop|cart|buy|order|product/.test(text)) return ["sales"];
  if (/book|appointment|reservation/.test(text)) return ["booking"];
  return ["leads"];
}

function inferStyleKeyword(pages: CapturedWebsitePage[]) {
  const colors = pages.flatMap((page) => page.colorSamples ?? []);
  if (colors.some((color) => /#?1a1c23|#?111|#?000/i.test(color))) return "dark";
  if (colors.length >= 5) return "colorful";
  return undefined;
}

function inferDesignTokens(pages: CapturedWebsitePage[]): WebsiteProfile["designTokens"] {
  const colors = uniqueNonEmpty(pages.flatMap((page) => page.colorSamples ?? []));
  const fonts = uniqueNonEmpty(pages.flatMap((page) => page.fontFamilies ?? []));

  if (colors.length === 0 && fonts.length === 0) {
    return undefined;
  }

  return {
    colors: {
      background: colors[0],
      surface: colors[1],
      primary: colors[2],
      accent: colors[3],
      text: colors[4],
    },
    fonts: {
      heading: fonts[0],
      body: fonts[1] ?? fonts[0],
    },
  };
}

function hostnameFromUrl(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "Imported Website";
  }
}

function makeSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function uniqueNonEmpty(values: Array<string | undefined>) {
  return [...new Set(values.map((value) => value?.trim()).filter(Boolean))] as string[];
}

function uniqueBy<T>(values: T[], getKey: (value: T) => string) {
  const seen = new Set<string>();
  return values.filter((value) => {
    const key = getKey(value);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function dropUndefined<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined),
  ) as T;
}
