"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Inter, Kanit } from "next/font/google";
import {
  ArrowRight,
  BellRing,
  Crosshair,
  Flame,
  Gauge,
  Globe,
  ShieldCheck,
  ShoppingBag,
  Smartphone,
  Stethoscope,
  Timer,
  Zap,
} from "lucide-react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import "./landing-theme.css";

const kanit = Kanit({
  subsets: ["latin", "thai"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-kanit",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-inter",
});

type NavTarget =
  | "features"
  | "use-cases"
  | "service-supplement"
  | "pricing"
  | "faq";

export default function LandingPage() {
  const rootRef = useRef<HTMLElement | null>(null);
  const [showLoader, setShowLoader] = useState(true);

  useEffect(() => {
    const timeout = window.setTimeout(() => setShowLoader(false), 1200);
    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const mm = gsap.matchMedia();

    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".beam",
        { opacity: 0.75, scale: 0.96 },
        {
          opacity: 1,
          scale: 1.04,
          duration: 2.2,
          repeat: -1,
          yoyo: true,
          ease: "power1.inOut",
        },
      );

      mm.add("(min-width: 768px)", () => {
        gsap.to(".landing-mesh", {
          yPercent: -7,
          ease: "none",
          scrollTrigger: {
            trigger: "main",
            start: "top top",
            end: "bottom top",
            scrub: 0.9,
          },
        });

        gsap.to(".landing-orb-left", {
          yPercent: -16,
          xPercent: 5,
          ease: "none",
          scrollTrigger: {
            trigger: "main",
            start: "top top",
            end: "bottom top",
            scrub: 1,
          },
        });

        gsap.to(".landing-orb-right", {
          yPercent: -10,
          xPercent: -5,
          ease: "none",
          scrollTrigger: {
            trigger: "main",
            start: "top top",
            end: "bottom top",
            scrub: 1,
          },
        });

        gsap.to(".hero-canvas", {
          yPercent: -4,
          ease: "none",
          scrollTrigger: {
            trigger: ".hero-canvas",
            start: "top bottom",
            end: "bottom top",
            scrub: 0.8,
          },
        });
      });

      mm.add("(max-width: 767px)", () => {
        gsap.to(".landing-mesh", {
          yPercent: -3,
          ease: "none",
          scrollTrigger: {
            trigger: "main",
            start: "top top",
            end: "bottom top",
            scrub: 0.6,
          },
        });
      });

      const revealItems = gsap.utils
        .toArray<HTMLElement>("[data-reveal]")
        .filter(
          (item) =>
            !item.closest(".bento-grid") &&
            !item.closest("#use-cases .grid") &&
            !item.closest("#pricing .grid"),
        );

      revealItems.forEach((item) => {
        gsap.fromTo(
          item,
          { autoAlpha: 0, y: 26 },
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.64,
            ease: "power3.out",
            scrollTrigger: {
              trigger: item,
              start: "top 84%",
              toggleActions: "play none none none",
            },
          },
        );
      });

      gsap.fromTo(
        ".bento-grid > article",
        { autoAlpha: 0, y: 28, scale: 0.985 },
        {
          autoAlpha: 1,
          y: 0,
          scale: 1,
          duration: 0.58,
          ease: "power3.out",
          stagger: 0.1,
          scrollTrigger: {
            trigger: "#features",
            start: "top 72%",
            toggleActions: "play none none none",
          },
        },
      );

      gsap.fromTo(
        "#use-cases .grid > article",
        { autoAlpha: 0, y: 24 },
        {
          autoAlpha: 1,
          y: 0,
          duration: 0.54,
          ease: "power2.out",
          stagger: 0.1,
          scrollTrigger: {
            trigger: "#use-cases",
            start: "top 74%",
            toggleActions: "play none none none",
          },
        },
      );

      gsap.fromTo(
        "#pricing .pricing-card",
        { autoAlpha: 0, y: 24, scale: 0.98 },
        {
          autoAlpha: 1,
          y: 0,
          scale: 1,
          duration: 0.56,
          stagger: 0.11,
          ease: "power3.out",
          scrollTrigger: {
            trigger: "#pricing",
            start: "top 72%",
            toggleActions: "play none none none",
          },
        },
      );
    }, rootRef);

    return () => {
      mm.revert();
      ctx.revert();
    };
  }, []);

  const scrollToId = (id: NavTarget) => {
    const node = document.getElementById(id);
    if (node) {
      node.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <main
      ref={rootRef}
      className={`landing-theme ${kanit.variable} ${inter.variable} min-h-screen selection:bg-[#FF8C00] selection:text-white`}
    >
      <div
        className={`loader-overlay ${showLoader ? "loader-visible" : "loader-hidden"}`}
      >
        <div className="loader-wrap">
          <div className="loader-ring" />
          <div className="loader-brand">
            <Flame className="size-5 text-[#FF8C00]" />
            <span>FinnWeb</span>
          </div>
        </div>
      </div>

      <div className="landing-mesh" aria-hidden="true" />
      <div className="landing-orb landing-orb-left" aria-hidden="true" />
      <div className="landing-orb landing-orb-right" aria-hidden="true" />

      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0f172a]/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <p className="text-xl font-bold leading-[1.7] tracking-tight text-white">
            <span className="italic text-[#FF8C00]">Finn</span>
            <span className="text-white">Web</span>
          </p>
          <nav className="hidden items-center gap-6 text-sm text-slate-300 md:flex">
            <button
              onClick={() => scrollToId("features")}
              className="nav-link"
              type="button"
            >
              ฟีเจอร์
            </button>
            <button
              onClick={() => scrollToId("use-cases")}
              className="nav-link"
              type="button"
            >
              รูปแบบการใช้งาน
            </button>
            <button
              onClick={() => scrollToId("service-supplement")}
              className="nav-link"
              type="button"
            >
              บริการเสริม
            </button>
            <button
              onClick={() => scrollToId("pricing")}
              className="nav-link"
              type="button"
            >
              ราคา
            </button>
            <button
              onClick={() => scrollToId("faq")}
              className="nav-link"
              type="button"
            >
              คำถามที่พบบ่อย
            </button>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login" className="btn-ghost text-sm">
              เข้าสู่ระบบ
            </Link>
            <Link href="/register" className="btn-primary text-sm">
              เริ่มใช้ฟรี 7 วัน
            </Link>
          </div>
        </div>
      </header>

      <section className="relative mx-auto grid max-w-7xl gap-10 px-6 pb-20 pt-20 md:grid-cols-2 md:pt-24">
        <div data-reveal className="space-y-7">
          <p className="kicker">
            เว็บไซต์ที่ง่ายที่สุด สำหรับ SME และเจ้าของธุรกิจไทย
          </p>
          <h1 className="text-4xl font-bold leading-[1.2] text-white md:text-6xl">
            ใครๆ ก็มีเว็บไซต์สวยระดับโปรฯ ได้
            <span className="block text-[#FF8C00]">
              สร้างเสร็จใน 10 นาที ไม่ต้องเขียนโค้ด
            </span>
          </h1>
          <p className="body-th text-lg text-slate-200">
            เปลี่ยนเรื่องยากให้เป็นเรื่อง "ฟิน" ไม่ว่าคุณจะเป็นใคร ทำอาชีพอะไร
            ก็เริ่มต้นธุรกิจออนไลน์ได้ทันที พร้อมระบบแจ้งเตือนลูกค้าเข้า LINE
            และเครื่องมือวิเคราะห์การตลาดครบวงจร
          </p>
          <div className="flex flex-col gap-4 sm:flex-row">
            <Link
              href="/register"
              className="btn-primary flex items-center justify-center gap-2 text-base"
            >
              เริ่มต้นสร้างเว็บไซต์ฟรี (ลองเลย 7 วัน)
              <ArrowRight className="size-4" />
            </Link>
          </div>
          <p className="body-th text-sm text-slate-300">
            ไม่ต้องใช้บัตรเครดิต • ทำเองได้ในไม่กี่คลิก
            หรือให้เราช่วยทำให้เริ่มต้นเพียง 500.-
          </p>
        </div>

        <div data-reveal className="hero-canvas">
          <div className="beam" aria-hidden="true" />
          <div className="mockup-window">
            <div className="mockup-toolbar">
              <div className="mockup-dots">
                <span />
                <span />
                <span />
              </div>
              <div className="mockup-url" />
            </div>
            <div className="mockup-grid">
              <div className="mockup-sidebar">
                <div className="mockup-block h-16" />
                <div className="mockup-block h-10" />
                <div className="mockup-block h-10" />
              </div>
              <div className="mockup-main">
                <div className="hero-stat-grid">
                  <div className="hero-mini-card">
                    <Gauge className="size-4 text-[#FFD700]" />
                    <p>Launch in 10 min</p>
                  </div>
                  <div className="hero-mini-card">
                    <BellRing className="size-4 text-[#FFD700]" />
                    <p>LINE Alert Instant</p>
                  </div>
                </div>
                <div className="hero-graph" />
              </div>
            </div>
          </div>

          <div className="hero-panel hero-panel-side">
            <p className="text-sm text-slate-200">Lead Capture Form</p>
            <div className="hero-input" />
            <div className="hero-input" />
            <div className="hero-input" />
            <div className="hero-submit" />
          </div>

          <div className="mockup-notify">
            <div className="notify-icon">
              <BellRing className="size-4 text-emerald-400" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-400">
                LINE OA
              </p>
              <p className="body-th text-sm text-white">
                คุณสมชาย ลงทะเบียนจากหน้าเว็บ
              </p>
              <p className="text-[10px] text-slate-500">1 นาทีที่แล้ว</p>
            </div>
          </div>
        </div>
      </section>

      <section data-reveal className="social-proof">
        <p className="body-th text-center text-slate-300">
          Trusted by 5,000+ modern Thai teams.
        </p>
        <div className="marquee">
          <div className="marquee-track">
            <span>Stripe</span>
            <span>LINE OA</span>
            <span>Meta Ads</span>
            <span>PromptPay Ready</span>
            <span>Thai SEO</span>
            <span>Cloud CDN</span>
            <span>Stripe</span>
            <span>LINE OA</span>
            <span>Meta Ads</span>
            <span>PromptPay Ready</span>
          </div>
        </div>
      </section>

      <section id="features" className="mx-auto max-w-7xl px-6 py-28">
        <div data-reveal className="mb-10 space-y-3 text-center">
          <p className="kicker">Bento Feature Grid</p>
          <h2 className="text-3xl font-bold text-white md:text-5xl">
            ฟีเจอร์สำคัญที่ช่วยเปลี่ยนผู้เข้าชมเป็นลูกค้า
          </h2>
        </div>
        <div className="bento-grid">
          <article data-reveal className="glass-card bento-speed">
            <div className="feature-icon">
              <Timer className="size-5" />
            </div>
            <h3 className="text-2xl font-semibold text-white">Easy Builder</h3>
            <p className="body-th text-slate-300">
              ใช้โครงสร้างสำเร็จรูปที่ออกแบบมาเพื่อยอดขาย แค่ลาก วาง เปลี่ยนรูป
              จบ!
            </p>
          </article>

          <article data-reveal className="glass-card bento-line">
            <div className="feature-icon">
              <BellRing className="size-5" />
            </div>
            <h3 className="text-2xl font-semibold text-white">LINE OA</h3>
            <p className="body-th text-slate-300">
              ลูกค้าทักปุ๊บ แจ้งเตือนเข้า LINE ทันที ปิดการขายไว ไม่ตกหล่น
            </p>
          </article>

          <article data-reveal className="glass-card bento-trust">
            <div className="feature-icon">
              <ShieldCheck className="size-5" />
            </div>
            <h3 className="text-2xl font-semibold text-white">
              Tracking & Pixel
            </h3>
            <p className="body-th text-slate-300">
              เชื่อมต่อ Facebook Pixel และ Google Tag ได้เองในคลิกเดียว
              ยิงโฆษณาได้แม่นยำ
            </p>
          </article>

          <article data-reveal className="glass-card bento-cloud">
            <div className="feature-icon">
              <Globe className="size-5" />
            </div>
            <h3 className="text-2xl font-semibold text-white">SEO Friendly</h3>
            <p className="body-th text-slate-300">
              วางโครงสร้างมาให้ Google หาเจอง่าย ปรับแต่ง Meta Title/Description
              ได้เอง
            </p>
          </article>

          <article data-reveal className="glass-card bento-mobile">
            <div className="feature-icon">
              <Smartphone className="size-5" />
            </div>
            <h3 className="text-2xl font-semibold text-white">Mobile-First</h3>
            <p className="body-th text-slate-300">
              เว็บโหลดไวและแสดงผลสวยงามบนมือถือ 100% พร้อมปุ่ม CTA ที่เด่นชัด
            </p>
          </article>

          <article data-reveal className="glass-card bento-ai">
            <div className="feature-icon">
              <Gauge className="size-5" />
            </div>
            <h3 className="text-2xl font-semibold text-white">
              Real-time Analytics
            </h3>
            <p className="body-th text-slate-300">
              มีรายงานยอดผู้เข้าชมและจำนวนคนคลิกบนหน้าเว็บ
              รู้ทันทีว่าสินค้าไหนปัง
            </p>
          </article>
        </div>
      </section>

      <section id="use-cases" className="mx-auto max-w-7xl px-6 py-28">
        <div data-reveal className="mb-10 text-center">
          <p className="kicker">Use Cases</p>
          <h2 className="mt-2 text-3xl font-bold text-white md:text-5xl">
            ทำไมต้องใช้ FinnWeb?
          </h2>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          <article data-reveal className="glass-card p-6">
            <div className="feature-icon">
              <ShoppingBag className="size-5" />
            </div>
            <p className="text-sm font-semibold text-[#FFD700]">
              แม่ค้าออนไลน์
            </p>
            <h3 className="mt-2 text-xl font-semibold text-white">
              Sales Page หน้าเดียว ปิดการขายง่าย
            </h3>
            <p className="body-th mt-2 text-slate-300">
              ทำ Sales Page หน้าเดียวเพื่อปิดการขาย
              พร้อมระบบรับชำระเงินที่ง่ายที่สุด
            </p>
          </article>
          <article data-reveal className="glass-card p-6">
            <div className="feature-icon">
              <Stethoscope className="size-5" />
            </div>
            <p className="text-sm font-semibold text-[#FFD700]">
              คลินิกและงานบริการ
            </p>
            <h3 className="mt-2 text-xl font-semibold text-white">
              โปรไฟล์ร้านน่าเชื่อถือ นัดหมายได้ทันที
            </h3>
            <p className="body-th mt-2 text-slate-300">
              ทำหน้าโปรไฟล์ร้านที่ดูน่าเชื่อถือ พร้อมปุ่มนัดหมายที่เชื่อมต่อเข้า
              LINE
            </p>
          </article>
          <article data-reveal className="glass-card pricing-card p-6">
            <div className="feature-icon">
              <Crosshair className="size-5" />
            </div>
            <p className="text-sm font-semibold text-[#FFD700]">
              สายยิงโฆษณา (Agencies)
            </p>
            <h3 className="mt-2 text-xl font-semibold text-white">
              ขึ้นโปรเจกต์ไว ติดแทร็กกิ้งครบ
            </h3>
            <p className="body-th mt-2 text-slate-300">
              ขึ้นโปรเจกต์ใหม่ได้ไว ติดแทร็กกิ้งครบ เก็บ Data ลูกค้าไปทำ
              Re-targeting ได้ทันที
            </p>
          </article>
        </div>
        <div data-reveal className="mt-8 flex justify-center">
          <Link
            href="/register"
            className="btn-primary inline-flex items-center justify-center gap-2"
          >
            ดูตัวอย่างเทมเพลตตามประเภทธุรกิจ
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>

      <section id="service-supplement" className="mx-auto max-w-7xl px-6 py-28">
        <div data-reveal className="mb-10 text-center">
          <p className="kicker">Service Supplement</p>
          <h2 className="mt-2 text-3xl font-bold text-white md:text-5xl">
            ถ้ายังยากไป... ให้เราจัดการให้!
          </h2>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          <article data-reveal className="glass-card p-6">
            <p className="text-sm font-semibold text-[#FFD700]">บริการเสริม</p>
            <h3 className="mt-2 text-xl font-semibold text-white">
              FinnWeb Concierge
            </h3>
            <p className="body-th mt-2 text-slate-300">
              บริการช่วย Setup เว็บไซต์สำหรับคนยุ่งหรือทำไม่เป็น
            </p>
          </article>
          <article data-reveal className="glass-card p-6">
            <p className="text-sm font-semibold text-[#FFD700]">คุ้มค่า</p>
            <h3 className="mt-2 text-xl font-semibold text-white">
              เริ่มต้นเพียง 500 บาท
            </h3>
            <p className="body-th mt-2 text-slate-300">
              เจ้าหน้าที่ช่วยจัด Layout, ลงข้อมูล และติด Tracking ให้พร้อมใช้งาน
            </p>
          </article>
          <article data-reveal className="glass-card pricing-card p-6">
            <p className="text-sm font-semibold text-[#FFD700]">รวดเร็ว</p>
            <h3 className="mt-2 text-xl font-semibold text-white">
              พร้อมใช้งานภายใน 24 ชั่วโมง
            </h3>
            <p className="body-th mt-2 text-slate-300">
              ส่งข้อมูลให้เรา แล้วรอรับเว็บไซต์ที่พร้อมเริ่มขายได้ทันที
            </p>
            <Link
              href="/help"
              className="btn-primary mt-6 inline-flex w-full justify-center"
            >
              ทักแชทคุยกับเจ้าหน้าที่
            </Link>
          </article>
        </div>
      </section>

      <section id="pricing" className="mx-auto max-w-7xl px-6 py-28">
        <div data-reveal className="mb-10 text-center">
          <p className="kicker">Pricing</p>
          <h2 className="mt-2 text-3xl font-bold text-white md:text-5xl">
            เลือกแพ็กเกจที่โตไปพร้อมธุรกิจของคุณ
          </h2>
          <p className="body-th mt-3 text-slate-300">
            ทุกแพ็กเกจทดลองใช้ฟรี 7 วัน เพื่อเริ่มต้นได้แบบไม่มีความเสี่ยง
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <article data-reveal className="glass-card pricing-card p-6">
            <p className="text-sm font-semibold text-slate-300">FREE Trial</p>
            <p className="mt-2 text-4xl font-bold text-white">฿0</p>
            <p className="body-th text-sm text-slate-300">ทดลองใช้ฟรี 7 วัน</p>
            <ul className="mt-5 space-y-2 text-sm text-slate-200">
              <li className="body-th">• ลองใช้ทุกฟีเจอร์พื้นฐาน</li>
              <li className="body-th">• เริ่มได้ทันทีแบบไม่ต้องใช้บัตร</li>
              <li className="body-th">• เหมาะสำหรับทดลองก่อนตัดสินใจ</li>
            </ul>
            <Link
              href="/register?plan=FREE"
              className="btn-ghost mt-6 inline-flex w-full justify-center"
            >
              เริ่มทดลองใช้ฟรี
            </Link>
          </article>

          <article data-reveal className="glass-card p-6">
            <p className="text-sm font-semibold text-slate-300">BASIC</p>
            <p className="mt-2 text-4xl font-bold text-white">฿250</p>
            <p className="body-th text-sm text-slate-300">ต่อเดือน</p>
            <ul className="mt-5 space-y-2 text-sm text-slate-200">
              <li className="body-th">• 1 เว็บไซต์ สำหรับเริ่มต้นธุรกิจ</li>
              <li className="body-th">• ทำให้แบรนด์ดูน่าเชื่อถือมากขึ้น</li>
              <li className="body-th">• เริ่มขายออนไลน์ได้ทันที</li>
            </ul>
            <Link
              href="/register?plan=BASIC"
              className="btn-ghost mt-6 inline-flex w-full justify-center"
            >
              เลือก Basic
            </Link>
          </article>

          <article
            data-reveal
            className="glass-card pricing-card relative overflow-hidden border-[#ff8c00]/60 p-6 shadow-[0_0_28px_rgba(255,140,0,0.28)]"
          >
            <span className="absolute right-4 top-4 rounded-full border border-[#ffd700]/40 bg-[#ff8c00]/20 px-2 py-1 text-xs font-semibold text-[#ffd700]">
              แนะนำ
            </span>
            <p className="text-sm font-semibold text-[#ffd700]">BUSINESS</p>
            <p className="mt-2 text-4xl font-bold text-white">฿490</p>
            <p className="body-th text-sm text-slate-300">ต่อเดือน</p>
            <ul className="mt-5 space-y-2 text-sm text-slate-100">
              <li className="body-th">• 3 เว็บไซต์ + LINE OA</li>
              <li className="body-th">• ติดตั้ง Pixel และ Tracking</li>
              <li className="body-th">• รายงานสถิติการตลาดครบ</li>
            </ul>
            <Link
              href="/register?plan=BUSINESS"
              className="btn-primary mt-6 inline-flex w-full justify-center"
            >
              เริ่มแผน Business
            </Link>
          </article>

          <article data-reveal className="glass-card pricing-card p-6">
            <p className="text-sm font-semibold text-slate-300">PRO</p>
            <p className="mt-2 text-4xl font-bold text-white">฿990</p>
            <p className="body-th text-sm text-slate-300">ต่อเดือน</p>
            <ul className="mt-5 space-y-2 text-sm text-slate-200">
              <li className="body-th">• เว็บไซต์ไม่จำกัด</li>
              <li className="body-th">• เครื่องมือวิเคราะห์ขั้นสูง</li>
              <li className="body-th">• เหมาะสำหรับเอเจนซี่และทีมใหญ่</li>
            </ul>
            <Link
              href="/register?plan=PRO"
              className="btn-ghost mt-6 inline-flex w-full justify-center"
            >
              เลือก Pro
            </Link>
          </article>
        </div>
      </section>

      <section id="faq" className="mx-auto max-w-5xl px-6 py-28">
        <div data-reveal className="glass-card p-8">
          <p className="kicker">FAQ</p>
          <h2 className="mt-2 text-3xl font-bold text-white">
            ตอบคำถามก่อนเริ่มใช้งาน
          </h2>
          <div className="mt-8 space-y-4">
            <details className="faq-item" open>
              <summary>ไม่มีความรู้เรื่องคอมพิวเตอร์เลย จะทำได้ไหม?</summary>
              <p className="body-th text-slate-300">
                ทำได้แน่นอนครับ!
                ระบบเราออกแบบมาให้เหมือนการจัดวางรูปภาพในโซเชียลมีเดีย
                ถ้าทำไม่ได้ เรายังมีบริการช่วย Setup ให้ในราคาประหยัดด้วยครับ
              </p>
            </details>
            <details className="faq-item">
              <summary>รองรับการยิงโฆษณา Facebook และ Google ไหม?</summary>
              <p className="body-th text-slate-300">
                รองรับเต็มรูปแบบครับ เรามีช่องให้ใส่รหัส Pixel และ Tracking
                ต่างๆ ได้เอง พร้อมระบบรายงานผลหลังบ้าน
              </p>
            </details>
            <details className="faq-item">
              <summary>มีค่าใช้จ่ายแอบแฝงไหม?</summary>
              <p className="body-th text-slate-300">
                ไม่มีครับ คุณสามารถเริ่มลองใช้ฟรีได้ 7
                วันโดยไม่ต้องกรอกข้อมูลบัตรเครดิต
              </p>
            </details>
          </div>
          <div className="mt-10 rounded-2xl border border-white/10 bg-white/5 p-6 text-center">
            <p className="body-th text-sm text-slate-200">
              พร้อมเริ่มต้นหรือยัง? ทดลองใช้ฟรี 7 วัน แล้วค่อยตัดสินใจ
            </p>
            <Link
              href="/register"
              className="btn-primary mt-4 inline-flex items-center gap-2"
            >
              เริ่มใช้ฟรี
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10 px-6 py-10">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 text-sm text-slate-400 md:flex-row md:items-center md:justify-between">
          <p className="body-th">
            FinnWeb - เว็บไซต์ที่ง่ายและโตไปพร้อมกับธุรกิจคุณ
          </p>
          <div className="flex items-center gap-5">
            <Link href="/pricing" className="nav-link">
              ราคา
            </Link>
            <Link href="/help" className="nav-link">
              ช่วยเหลือ
            </Link>
            <Link href="/register" className="nav-link">
              เริ่มใช้ฟรี
            </Link>
          </div>
        </div>
        <p className="mx-auto mt-4 max-w-7xl text-xs text-slate-500">
          © 2026 FinnWeb. Velocity + Conversion for Thai SMEs.
        </p>
      </footer>
    </main>
  );
}
