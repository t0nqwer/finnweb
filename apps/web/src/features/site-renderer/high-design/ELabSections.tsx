"use client";

import {
  ArrowRight,
  BookOpen,
  ChevronDown,
  Layers3,
  Menu,
  Play,
  ShoppingCart,
  Sparkles,
  Star,
} from "lucide-react";
import type { CSSProperties } from "react";
import { Reveal, Stagger, StaggerItem } from "./HighDesignMotion";

type SectionProps = {
  props: Record<string, unknown>;
};

type LinkItem = {
  label: string;
  href?: string;
  badge?: string;
};

type CardItem = {
  title: string;
  description?: string;
  imageUrl?: string;
  eyebrow?: string;
  price?: string;
  meta?: string;
  icon?: string;
};

type QuoteItem = {
  quote?: string;
  text?: string;
  author?: string;
  role?: string;
  imageUrl?: string;
};

function text(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function numberText(value: unknown, fallback = "") {
  if (typeof value === "number") return String(value);
  return text(value, fallback);
}

function arrayOfObjects<T>(value: unknown, fallback: T[]): T[] {
  return Array.isArray(value) ? (value as T[]) : fallback;
}

function itemTitle(value: unknown) {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "title" in value) {
    return text((value as { title?: unknown }).title);
  }
  if (value && typeof value === "object" && "label" in value) {
    return text((value as { label?: unknown }).label);
  }
  return "";
}

function linksFromProps(value: unknown): LinkItem[] {
  if (Array.isArray(value)) {
    return value.map((item) =>
      typeof item === "string"
        ? { label: item, href: "#" }
        : (item as LinkItem),
    );
  }

  if (typeof value === "string") {
    return value
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean)
      .map((label) => ({ label, href: "#" }));
  }

  return [
    { label: "Home", href: "#" },
    { label: "Courses", href: "#courses", badge: "4" },
    { label: "Reviews", href: "#reviews" },
    { label: "Contact", href: "#contact" },
  ];
}

const fallbackCourses: CardItem[] = [
  {
    title: "UX Design Foundation",
    description: "Learn product thinking, research, and interface structure.",
    imageUrl: "https://picsum.photos/seed/elab-course-1/800/600",
    eyebrow: "Design",
    price: "THB 1,290",
  },
  {
    title: "AI for Work",
    description: "Use AI tools to improve daily operations and content.",
    imageUrl: "https://picsum.photos/seed/elab-course-2/800/600",
    eyebrow: "Technology",
    price: "THB 990",
  },
  {
    title: "Digital Marketing Sprint",
    description: "Build campaigns, landing pages, and better offers.",
    imageUrl: "https://picsum.photos/seed/elab-course-3/800/600",
    eyebrow: "Marketing",
    price: "THB 1,490",
  },
];

const fallbackFeatures: CardItem[] = [
  {
    title: "เรียนได้ทุกเวลา",
    description: "คอร์สยืดหยุ่น เหมาะกับคนทำงานและเจ้าของธุรกิจ",
  },
  {
    title: "สอนโดยผู้เชี่ยวชาญ",
    description: "เนื้อหากระชับ ใช้ได้จริงกับงานและธุรกิจ",
  },
  {
    title: "ต่อยอดอาชีพ",
    description: "เพิ่มทักษะที่ตลาดต้องการและสร้างความมั่นใจ",
  },
];

const fallbackQuotes: QuoteItem[] = [
  {
    quote: "เนื้อหาเข้าใจง่าย ใช้กับงานจริงได้ทันที",
    author: "Narin",
    role: "Marketing Lead",
    imageUrl: "https://picsum.photos/seed/elab-review-1/200/200",
  },
  {
    quote: "หน้าเว็บดูน่าเชื่อถือและทำให้คอร์สน่าสมัครมากขึ้น",
    author: "Pim",
    role: "Course Creator",
    imageUrl: "https://picsum.photos/seed/elab-review-2/200/200",
  },
  {
    quote: "ดีไซน์สวย โหลดไว และดูดีบนมือถือ",
    author: "Krit",
    role: "Founder",
    imageUrl: "https://picsum.photos/seed/elab-review-3/200/200",
  },
];

export function ELabAnimatedNavbar({ props }: SectionProps) {
  const brandName = text(props.brandName, "E-Lab");
  const menuItems = linksFromProps(props.menuItems);
  const primaryColor = text(props.primaryColor, "#0047FF");

  return (
    <header className="sticky top-0 z-50 w-full px-4 py-5 md:px-8">
      <Reveal
        direction="down"
        className="mx-auto flex max-w-7xl items-center justify-between rounded-[2rem] border border-slate-200/70 bg-white/90 px-5 py-4 text-slate-950 shadow-[0_18px_60px_rgba(15,23,42,0.08)] backdrop-blur-md md:rounded-full md:px-7"
      >
        <a href="#" className="text-2xl font-black tracking-normal md:text-3xl">
          {brandName}
        </a>
        <nav className="hidden items-center gap-7 rounded-full border border-slate-200/70 bg-white px-7 py-3 text-sm font-bold lg:flex">
          {menuItems.slice(0, 5).map((item) => (
            <a
              key={item.label}
              href={item.href ?? "#"}
              className="group flex items-center gap-1 transition-colors hover:text-[var(--elab-primary)]"
              style={{ "--elab-primary": primaryColor } as CSSProperties}
            >
              {item.label}
              {item.badge ? (
                <span
                  className="rounded-full px-2 py-0.5 text-[10px] text-white transition-transform group-hover:scale-110"
                  style={{ backgroundColor: primaryColor }}
                >
                  {item.badge}
                </span>
              ) : item.label.toLowerCase().includes("home") ? (
                <ChevronDown className="h-3 w-3 text-slate-400 transition-transform group-hover:rotate-180" />
              ) : null}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <a
            href={text(props.ctaHref, "#contact")}
            className="hidden rounded-full bg-slate-950 px-6 py-2.5 text-sm font-bold text-white shadow-md transition-transform hover:scale-[1.03] lg:inline-flex"
          >
            {text(props.buttonText, "สมัครเรียน")}
          </a>
          <button className="hidden rounded-full border border-slate-200 bg-slate-100 px-3 py-2 text-sm font-bold lg:flex">
            <ShoppingCart className="mr-2 h-4 w-4" />
            <span
              className="grid h-6 w-6 place-items-center rounded-full text-xs text-white"
              style={{ backgroundColor: primaryColor }}
            >
              {numberText(props.cartCount, "2")}
            </span>
          </button>
          <button className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2.5 text-sm font-bold lg:hidden">
            <Menu className="h-5 w-5" />
            Menu
          </button>
        </div>
      </Reveal>
    </header>
  );
}

export function ELabEducationHero({ props }: SectionProps) {
  const primaryColor = text(props.primaryColor, "#0047FF");
  const stats = arrayOfObjects<CardItem>(props.stats, [
    { title: "56", description: "คอร์สออนไลน์" },
    { title: "8,000+", description: "ผู้เรียนที่ไว้วางใจ" },
    { title: "24/7", description: "เข้าเรียนได้ทุกเวลา" },
    { title: "98%", description: "ความพึงพอใจ" },
  ]);

  return (
    <section className="bg-[#FAFAFA] px-4 pb-20 pt-8 text-slate-950 md:px-8">
      <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-2 lg:gap-24">
        <Stagger className="relative z-10 space-y-8">
          <StaggerItem>
            <p
              className="inline-flex rounded-full px-4 py-2 text-sm font-black text-white shadow-lg"
              style={{ backgroundColor: primaryColor }}
            >
              {text(props.eyebrow, "Online Learning")}
            </p>
          </StaggerItem>
          <StaggerItem>
            <h1 className="max-w-2xl text-5xl font-black leading-[0.98] tracking-normal md:text-7xl lg:text-[6.5rem]">
              {text(props.title, text(props.headline, "เรียนให้ไว โตให้จริง สำเร็จให้ชัด"))}
            </h1>
          </StaggerItem>
          <StaggerItem>
            <p className="max-w-xl text-lg font-medium leading-8 text-slate-700 md:text-xl">
              {text(
                props.subtitle,
                text(
                  props.subheadline,
                  "เรียนออนไลน์กับผู้เชี่ยวชาญ พัฒนาทักษะที่ตลาดต้องการ และต่อยอดอาชีพได้อย่างมั่นใจ",
                ),
              )}
            </p>
          </StaggerItem>
          <StaggerItem>
            <div className="flex flex-wrap gap-3">
              <a
                href={text(props.primaryButtonHref, "#courses")}
                className="inline-flex items-center rounded-full px-8 py-4 text-lg font-black text-white shadow-lg transition-transform hover:scale-[1.03]"
                style={{
                  backgroundColor: primaryColor,
                  boxShadow: `0 22px 48px ${primaryColor}33`,
                }}
              >
                {text(props.primaryButtonText, "ดูคอร์สเรียน")}
                <ArrowRight className="ml-2 h-5 w-5" />
              </a>
              <a
                href={text(props.secondaryButtonHref, "#preview")}
                className="inline-flex items-center rounded-full border border-slate-200 bg-white px-7 py-4 text-lg font-black text-slate-950 shadow-sm transition-transform hover:scale-[1.03]"
              >
                <Play className="mr-2 h-5 w-5" />
                {text(props.secondaryButtonText, "ดูตัวอย่าง")}
              </a>
            </div>
          </StaggerItem>
        </Stagger>
        <Reveal direction="left" delay={180} className="relative">
          <div className="absolute inset-x-0 bottom-0 top-[20%] -z-10 scale-[1.05] rounded-t-[1000px] bg-[#EDEDED] translate-y-12" />
          <div className="relative mt-10 h-[450px] w-full overflow-hidden rounded-b-[3rem] rounded-t-[1000px] bg-slate-200 shadow-2xl shadow-slate-300/60 lg:mt-0 md:h-[650px]">
            <img
              src={text(
                props.imageUrl,
                "https://picsum.photos/seed/elabhero2/900/1100",
              )}
              alt={text(props.imageAlt, "Online learning hero")}
              className="h-full w-full object-cover object-center transition-transform duration-700 hover:scale-105"
              referrerPolicy="no-referrer"
            />
          </div>
        </Reveal>
      </div>

      <Reveal delay={300}>
        <Stagger className="mx-auto mt-24 grid max-w-7xl grid-cols-2 items-center gap-6 rounded-[2rem] border border-slate-200/70 bg-white p-6 shadow-xl shadow-slate-200/50 lg:grid-cols-4">
          {stats.slice(0, 4).map((stat, index) => (
            <StaggerItem
              key={`${stat.title}-${index}`}
              className={`space-y-1 rounded-2xl p-4 ${index === 3 ? "text-white lg:-translate-y-4 lg:scale-110 lg:p-8 lg:shadow-2xl" : "lg:border-l lg:border-slate-200"}`}
              style={
                index === 3
                  ? ({
                      backgroundColor: primaryColor,
                      boxShadow: `0 24px 48px ${primaryColor}33`,
                    } as CSSProperties)
                  : undefined
              }
            >
              <p className="text-4xl font-black tracking-normal lg:text-5xl">
                {stat.title}
              </p>
              <p
                className={`text-xs font-black uppercase tracking-[0.16em] ${index === 3 ? "text-white/80" : "text-slate-500"}`}
              >
                {stat.description}
              </p>
            </StaggerItem>
          ))}
        </Stagger>
      </Reveal>
    </section>
  );
}

export function ELabBentoFeatures({ props }: SectionProps) {
  const primaryColor = text(props.primaryColor, "#0047FF");
  const items = arrayOfObjects<CardItem>(props.items, fallbackFeatures);

  return (
    <section className="bg-[#FAFAFA] px-4 py-24 text-slate-950 md:px-8">
      <div className="mx-auto max-w-7xl">
        <Reveal className="mb-16 max-w-3xl">
          <h2 className="text-4xl font-black tracking-normal md:text-6xl">
            {text(props.title, "เรียนง่ายขึ้น เห็นผลเร็วขึ้น")}
          </h2>
          <p className="mt-5 text-lg font-medium leading-8 text-slate-600">
            {text(
              props.subtitle,
              "ประสบการณ์เรียนรู้ที่ออกแบบให้ดูดี ใช้ง่าย และน่าเชื่อถือบนมือถือ",
            )}
          </p>
        </Reveal>
        <Stagger className="grid gap-6 md:grid-cols-3">
          {items.slice(0, 6).map((item, index) => (
            <StaggerItem
              key={`${item.title}-${index}`}
              className={`group rounded-[2rem] border border-slate-200/70 bg-white p-8 shadow-sm transition-transform duration-300 hover:-translate-y-1 hover:shadow-xl ${index === 0 ? "md:col-span-2" : ""}`}
            >
              <div
                className="mb-8 grid h-16 w-16 place-items-center rounded-2xl text-white transition-transform duration-300 group-hover:scale-110"
                style={{ backgroundColor: index === 1 ? "#111827" : primaryColor }}
              >
                {index % 3 === 0 ? (
                  <Sparkles className="h-7 w-7" />
                ) : index % 3 === 1 ? (
                  <BookOpen className="h-7 w-7" />
                ) : (
                  <Star className="h-7 w-7" />
                )}
              </div>
              <h3 className="text-2xl font-black tracking-normal">
                {item.title}
              </h3>
              <p className="mt-4 text-base font-medium leading-7 text-slate-600">
                {item.description}
              </p>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}

export function ELabFeaturedCourses({ props }: SectionProps) {
  const primaryColor = text(props.primaryColor, "#0047FF");
  const courses = arrayOfObjects<CardItem>(props.items, fallbackCourses);

  return (
    <section
      id="courses"
      className="bg-[#FAFAFA] px-4 py-24 text-slate-950 md:px-8"
    >
      <div className="mx-auto max-w-7xl">
        <Reveal className="mb-16 flex flex-col justify-between gap-8 md:flex-row md:items-end">
          <h2 className="max-w-md text-4xl font-black tracking-normal md:text-6xl lg:text-7xl">
            {text(props.title, "คอร์สแนะนำ")}
          </h2>
          <a
            href={text(props.buttonHref, "#contact")}
            className="inline-flex w-fit items-center rounded-full px-6 py-3 text-sm font-black text-white shadow-lg transition-transform hover:scale-[1.03]"
            style={{ backgroundColor: primaryColor }}
          >
            {text(props.buttonText, "ดูทั้งหมด")}
            <ArrowRight className="ml-2 h-4 w-4" />
          </a>
        </Reveal>
        <Stagger className="grid gap-8 md:grid-cols-3">
          {courses.slice(0, 6).map((course, index) => (
            <StaggerItem
              key={`${course.title}-${index}`}
              className="group overflow-hidden rounded-[2rem] border border-slate-200/70 bg-white shadow-sm transition-shadow hover:shadow-xl"
            >
              <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
                <img
                  src={text(
                    course.imageUrl,
                    `https://picsum.photos/seed/elab-course-${index}/900/700`,
                  )}
                  alt={course.title}
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  referrerPolicy="no-referrer"
                />
                <span
                  className="absolute left-5 top-5 rounded-full px-4 py-2 text-xs font-black text-white"
                  style={{ backgroundColor: primaryColor }}
                >
                  {course.eyebrow ?? "Course"}
                </span>
              </div>
              <div className="p-7">
                <h3 className="text-2xl font-black tracking-normal">
                  {course.title}
                </h3>
                <p className="mt-3 min-h-14 text-sm font-medium leading-6 text-slate-600">
                  {course.description}
                </p>
                <div className="mt-7 flex items-center justify-between">
                  <span className="text-lg font-black">
                    {course.price ?? "THB 990"}
                  </span>
                  <span className="rounded-full bg-slate-100 px-4 py-2 text-xs font-black text-slate-600">
                    {course.meta ?? "Online"}
                  </span>
                </div>
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}

export function ELabMetricStrip({ props }: SectionProps) {
  const primaryColor = text(props.primaryColor, "#0047FF");
  const stats = arrayOfObjects<CardItem>(props.items, [
    { title: "56", description: "à¸„à¸­à¸£à¹Œà¸ªà¸­à¸­à¸™à¹„à¸¥à¸™à¹Œ" },
    { title: "8,000+", description: "à¸œà¸¹à¹‰à¹€à¸£à¸µà¸¢à¸™à¸—à¸µà¹ˆà¹„à¸§à¹‰à¸§à¸²à¸‡à¹ƒà¸ˆ" },
    { title: "24/7", description: "à¹€à¸£à¸µà¸¢à¸™à¹„à¸”à¹‰à¸—à¸¸à¸à¹€à¸§à¸¥à¸²" },
    { title: "98%", description: "à¸„à¸§à¸²à¸¡à¸žà¸¶à¸‡à¸žà¸­à¹ƒà¸ˆ" },
  ]);

  return (
    <section className="bg-[#FAFAFA] px-4 py-16 text-slate-950 md:px-8">
      <Stagger className="mx-auto grid max-w-7xl gap-4 rounded-[2rem] border border-slate-200/70 bg-white p-4 shadow-xl shadow-slate-200/50 sm:grid-cols-2 lg:grid-cols-4 lg:p-6">
        {stats.slice(0, 4).map((stat, index) => (
          <StaggerItem
            key={`${stat.title}-${index}`}
            className="rounded-3xl border border-slate-100 bg-slate-50 p-6"
          >
            <p
              className="text-4xl font-black tracking-normal md:text-5xl"
              style={{ color: index === 0 ? primaryColor : undefined }}
            >
              {stat.title}
            </p>
            <p className="mt-3 text-sm font-black uppercase tracking-[0.14em] text-slate-500">
              {stat.description}
            </p>
          </StaggerItem>
        ))}
      </Stagger>
    </section>
  );
}

export function ELabCategoryGrid({ props }: SectionProps) {
  const primaryColor = text(props.primaryColor, "#0047FF");
  const categories = arrayOfObjects<CardItem>(props.items, [
    {
      title: "Design",
      description: "Interface, systems, and creative workflow courses.",
      eyebrow: "24 courses",
    },
    {
      title: "Business",
      description: "Planning, operations, and growth skills for teams.",
      eyebrow: "18 courses",
    },
    {
      title: "Technology",
      description: "AI, automation, and modern digital tools.",
      eyebrow: "32 courses",
    },
    {
      title: "Marketing",
      description: "Campaigns, content, and conversion strategy.",
      eyebrow: "21 courses",
    },
  ]);

  return (
    <section className="bg-[#FAFAFA] px-4 py-24 text-slate-950 md:px-8">
      <div className="mx-auto max-w-7xl">
        <Reveal className="mb-14 max-w-2xl">
          <h2 className="text-4xl font-black tracking-normal md:text-6xl">
            {text(props.title, "à¹€à¸¥à¸·à¸­à¸à¸«à¸¡à¸§à¸”à¸—à¸µà¹ˆà¹ƒà¸Šà¹ˆ")}
          </h2>
          <p className="mt-5 text-lg font-medium leading-8 text-slate-600">
            {text(props.subtitle, "à¸ˆà¸±à¸”à¸à¸¥à¸¸à¹ˆà¸¡à¸„à¸­à¸£à¹Œà¸ªà¹ƒà¸«à¹‰à¸ªà¹à¸à¸™à¸‡à¹ˆà¸²à¸¢à¹à¸¥à¸°à¸”à¸¹à¸™à¹ˆà¸²à¹€à¸Šà¸·à¹ˆà¸­à¸–à¸·à¸­")}
          </p>
        </Reveal>
        <Stagger className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {categories.slice(0, 8).map((category, index) => (
            <StaggerItem
              key={`${category.title}-${index}`}
              className="group min-h-64 rounded-[2rem] border border-slate-200/70 bg-white p-7 shadow-sm transition-transform duration-300 hover:-translate-y-1 hover:shadow-xl"
            >
              <div
                className="mb-8 grid h-14 w-14 place-items-center rounded-2xl text-white"
                style={{ backgroundColor: index % 2 === 0 ? primaryColor : "#111827" }}
              >
                <Layers3 className="h-6 w-6" />
              </div>
              <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                {category.eyebrow ?? category.meta ?? "Category"}
              </p>
              <h3 className="mt-3 text-2xl font-black tracking-normal">
                {category.title}
              </h3>
              <p className="mt-4 text-sm font-medium leading-7 text-slate-600">
                {category.description}
              </p>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}

export function ELabInsightsGrid({ props }: SectionProps) {
  const primaryColor = text(props.primaryColor, "#0047FF");
  const articles = arrayOfObjects<CardItem>(props.items, [
    {
      title: "How to choose the right course",
      description: "A practical guide for matching skills to career goals.",
      meta: "8 Jan 2025",
    },
    {
      title: "Build a weekly learning rhythm",
      description: "Simple routines that keep online learning moving.",
      meta: "12 Jan 2025",
    },
    {
      title: "AI skills for modern teams",
      description: "Where automation helps and where judgment still matters.",
      meta: "18 Jan 2025",
    },
  ]);

  return (
    <section className="bg-white px-4 py-24 text-slate-950 md:px-8">
      <div className="mx-auto max-w-7xl">
        <Reveal className="mb-14 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <h2 className="max-w-2xl text-4xl font-black tracking-normal md:text-6xl">
            {text(props.title, "à¸šà¸—à¸„à¸§à¸²à¸¡à¹à¸¥à¸°à¹„à¸­à¹€à¸”à¸µà¸¢")}
          </h2>
          <a
            href={text(props.buttonHref, "#")}
            className="inline-flex w-fit items-center rounded-full border border-slate-200 bg-slate-950 px-6 py-3 text-sm font-black text-white transition-transform hover:scale-[1.03]"
          >
            {text(props.buttonText, "à¸­à¹ˆà¸²à¸™à¸—à¸±à¹‰à¸‡à¸«à¸¡à¸”")}
            <ArrowRight className="ml-2 h-4 w-4" />
          </a>
        </Reveal>
        <Stagger className="grid gap-6 lg:grid-cols-3">
          {articles.slice(0, 3).map((article, index) => (
            <StaggerItem
              key={`${article.title}-${index}`}
              className="rounded-[2rem] border border-slate-200/70 bg-[#FAFAFA] p-8 shadow-sm"
            >
              <p
                className="mb-8 inline-flex rounded-full px-4 py-2 text-xs font-black text-white"
                style={{ backgroundColor: primaryColor }}
              >
                {article.meta ?? "Insight"}
              </p>
              <h3 className="text-2xl font-black tracking-normal">
                {article.title}
              </h3>
              <p className="mt-4 text-sm font-medium leading-7 text-slate-600">
                {article.description}
              </p>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}

export function ELabTestimonials({ props }: SectionProps) {
  const primaryColor = text(props.primaryColor, "#0047FF");
  const quotes = arrayOfObjects<QuoteItem>(props.items, fallbackQuotes);

  return (
    <section
      id="reviews"
      className="bg-[#FAFAFA] px-4 py-24 text-slate-950 md:px-8"
    >
      <div className="mx-auto max-w-7xl">
        <Reveal className="mb-16">
          <h2 className="max-w-xl text-4xl font-black tracking-normal md:text-6xl">
            {text(props.title, "เสียงจากผู้เรียนของเรา")}
          </h2>
        </Reveal>
        <Stagger className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <StaggerItem
            className="relative overflow-hidden rounded-[2rem] p-10 text-white shadow-xl md:p-12 lg:row-span-2"
            style={{ backgroundColor: primaryColor }}
          >
            <div className="absolute left-8 top-6 font-serif text-[12rem] leading-none text-white/20">
              &quot;
            </div>
            <h3 className="relative z-10 mb-6 text-7xl font-black tracking-normal md:text-8xl">
              {text(props.score, "4.9")}
            </h3>
            <p className="relative z-10 text-xl font-bold leading-8 text-white/90">
              {text(props.highlight, "ผู้เรียนให้คะแนนความพึงพอใจหลังเรียนจบ")}
            </p>
          </StaggerItem>
          {quotes.slice(0, 4).map((quote, index) => (
            <StaggerItem
              key={`${quote.author}-${index}`}
              className="rounded-[2rem] border border-slate-100 bg-white p-8 shadow-sm transition-shadow hover:shadow-md md:p-10"
            >
              <p className="mb-10 text-lg font-medium leading-8 text-slate-600">
                &quot;{quote.quote ?? quote.text}&quot;
              </p>
              <div className="flex items-center gap-4">
                <div className="relative h-14 w-14 overflow-hidden rounded-full bg-slate-100">
                  <img
                    src={text(
                      quote.imageUrl,
                      `https://picsum.photos/seed/elab-person-${index}/200/200`,
                    )}
                    alt={quote.author ?? "Customer"}
                    className="h-full w-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div>
                  <div className="font-black text-slate-950">
                    {quote.author ?? "Customer"}
                  </div>
                  <div className="text-sm font-medium text-slate-500">
                    {quote.role ?? "Learner"}
                  </div>
                </div>
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}

export function ELabLogoStrip({ props }: SectionProps) {
  const logos = Array.isArray(props.items)
    ? (props.items as unknown[]).map(itemTitle).filter(Boolean)
    : ["LINE", "Google", "Meta", "Canva", "Notion"];

  return (
    <section className="border-y border-slate-100 bg-slate-50/70 px-4 py-16 text-slate-950 md:px-8">
      <div className="mx-auto max-w-7xl">
        <Reveal>
          <h2 className="mb-12 text-center text-sm font-black uppercase tracking-[0.18em] text-slate-500">
            {text(props.title, "ได้รับความไว้วางใจจากทีมชั้นนำ")}
          </h2>
        </Reveal>
        <Stagger className="flex flex-wrap justify-center gap-8 opacity-60 grayscale transition-all duration-500 hover:opacity-90 hover:grayscale-0 md:gap-16 lg:gap-24">
          {logos.map((logo) => (
            <StaggerItem
              key={logo}
              className="flex items-center gap-2 text-2xl font-black tracking-normal"
            >
              <div className="h-6 w-6 rounded bg-slate-950 [clip-path:polygon(50%_0%,100%_25%,100%_75%,50%_100%,0%_75%,0%_25%)]" />
              {logo}
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}

export function ELabFloatingCta({ props }: SectionProps) {
  const primaryColor = text(props.primaryColor, "#0047FF");
  const avatars = arrayOfObjects<CardItem>(props.avatars, [
    { imageUrl: "https://picsum.photos/seed/ctap1/200/200", title: "Learner" },
    { imageUrl: "https://picsum.photos/seed/ctap2/200/200", title: "Learner" },
    { imageUrl: "https://picsum.photos/seed/ctap3/200/200", title: "Learner" },
    { imageUrl: "https://picsum.photos/seed/ctap4/200/200", title: "Learner" },
  ]);

  return (
    <section className="relative mx-auto max-w-7xl overflow-hidden bg-[#FAFAFA] px-4 py-28 text-center text-slate-950 md:px-8">
      <Stagger className="pointer-events-none absolute inset-0 z-10 mx-auto hidden h-full w-full max-w-4xl md:block">
        {avatars.slice(0, 4).map((avatar, index) => (
          <StaggerItem
            key={`${avatar.imageUrl}-${index}`}
            className={`pointer-events-auto absolute overflow-hidden border-4 border-white shadow-2xl ${
              index === 0
                ? "left-[10%] top-10 h-24 w-24 rotate-6 rounded-full"
                : index === 1
                  ? "right-[15%] top-[20%] h-20 w-20 -rotate-6 rounded-full"
                  : index === 2
                    ? "bottom-10 left-[20%] h-20 w-20 rotate-12 rounded-full"
                    : "bottom-10 right-[25%] h-28 w-28 -rotate-12 rounded-[2rem]"
            }`}
          >
            <img
              src={text(avatar.imageUrl, "https://picsum.photos/seed/ctap/200/200")}
              alt={avatar.title}
              className="h-full w-full object-cover"
              referrerPolicy="no-referrer"
            />
          </StaggerItem>
        ))}
      </Stagger>
      <Reveal className="relative z-20">
        <h2 className="mx-auto mb-8 max-w-3xl text-5xl font-black tracking-normal md:text-6xl lg:text-7xl">
          {text(props.title, "พร้อมเริ่มเรียนแล้วหรือยัง")}
        </h2>
        <p className="mx-auto mb-10 max-w-lg text-lg font-bold leading-8 text-slate-600">
          {text(props.subtitle, "เริ่มเส้นทางการเรียนรู้และอัปสกิลของคุณได้ทันที")}
        </p>
        <a
          href={text(props.buttonHref, "#contact")}
          className="relative z-30 inline-flex rounded-full px-8 py-4 text-lg font-black text-white shadow-lg transition-transform hover:scale-[1.03]"
          style={{
            backgroundColor: primaryColor,
            boxShadow: `0 22px 48px ${primaryColor}33`,
          }}
        >
          {text(props.buttonText, "เริ่มต้นตอนนี้")}
        </a>
      </Reveal>
    </section>
  );
}

export function ELabSplitFaq({ props }: SectionProps) {
  const questions = arrayOfObjects<{ question: string; answer?: string }>(
    props.items,
    [
      {
        question: "เรียนจบแล้วดูย้อนหลังได้ไหม",
        answer: "ได้ ผู้เรียนสามารถกลับมาทบทวนเนื้อหาได้ตามระยะเวลาของคอร์ส",
      },
      {
        question: "เหมาะกับผู้เริ่มต้นหรือไม่",
        answer: "เหมาะ เพราะเนื้อหาเริ่มจากพื้นฐานและมีตัวอย่างใช้งานจริง",
      },
      {
        question: "ติดต่อทีมงานได้ทางไหน",
        answer: "ติดต่อได้ผ่านแบบฟอร์ม เว็บไซต์ หรือ LINE OA ของธุรกิจ",
      },
    ],
  );

  return (
    <section className="bg-[#FAFAFA] px-4 py-24 text-slate-950 md:px-8">
      <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[1fr_300px] lg:gap-24">
        <div>
          <Reveal>
            <h2 className="mb-16 text-4xl font-black tracking-normal md:text-5xl">
              {text(props.title, "คำถามที่พบบ่อย")}
            </h2>
          </Reveal>
          <Stagger className="space-y-4">
            {questions.map((item, index) => (
              <StaggerItem
                key={`${item.question}-${index}`}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="flex items-center justify-between gap-4">
                  <h3 className="text-lg font-black">{item.question}</h3>
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-blue-100 text-blue-600">
                    +
                  </span>
                </div>
                <p className="mt-4 text-sm font-medium leading-7 text-slate-600">
                  {item.answer}
                </p>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
        <Reveal
          direction="left"
          className="h-fit rounded-3xl bg-slate-50 p-8 text-center shadow-sm lg:sticky lg:top-24"
        >
          <h3 className="mb-4 text-xl font-black">
            {text(props.sideTitle, "ถามเราได้ทุกเรื่อง")}
          </h3>
          <p className="mb-8 text-sm font-medium leading-7 text-slate-500">
            {text(props.sideText, "หากมีคำถามเพิ่มเติม สามารถติดต่อทีมงานได้ทันที")}
          </p>
          <a
            href={text(props.buttonHref, "#contact")}
            className="inline-flex w-full justify-center rounded-full bg-slate-950 px-6 py-3 text-sm font-bold text-white"
          >
            {text(props.buttonText, "ติดต่อเรา")}
          </a>
        </Reveal>
      </div>
    </section>
  );
}

export function ELabLargeFooter({ props }: SectionProps) {
  const brandName = text(props.brandName, "E-Lab");
  const links = linksFromProps(props.menuItems);

  return (
    <footer className="bg-slate-950 px-4 py-16 text-white md:px-8">
      <div className="mx-auto grid max-w-7xl gap-12 md:grid-cols-[1.5fr_1fr_1fr]">
        <Reveal>
          <h2 className="text-5xl font-black tracking-normal">{brandName}</h2>
          <p className="mt-6 max-w-md text-base font-medium leading-8 text-white/60">
            {text(
              props.tagline,
              "แพลตฟอร์มเรียนออนไลน์ที่ช่วยให้ผู้เรียนอัปสกิลและเติบโตในอาชีพ",
            )}
          </p>
        </Reveal>
        <div>
          <h3 className="mb-5 font-black">{text(props.navTitle, "Navigation")}</h3>
          <div className="grid gap-3 text-sm font-semibold text-white/60">
            {links.slice(0, 6).map((link) => (
              <a key={link.label} href={link.href ?? "#"} className="hover:text-white">
                {link.label}
              </a>
            ))}
          </div>
        </div>
        <div>
          <h3 className="mb-5 font-black">{text(props.contactTitle, "Contact")}</h3>
          <div className="grid gap-3 text-sm font-semibold text-white/60">
            <span>{text(props.phone, "02-000-0000")}</span>
            <span>{text(props.email, "hello@example.com")}</span>
            <span>{text(props.lineId, "@lineoa")}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
