import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL!,
  }),
});

async function main() {
  console.log("🌱 Seeding plans...");

  // FREE
  await prisma.plan.upsert({
    where: { code: "FREE" },
    update: {},
    create: {
      code: "FREE",
      name: "Free",
      description: "สำหรับทดลองเล่นและทำเว็บไซต์นามบัตร",
      priceMonthly: 0,
      priceYearly: 0,

      maxSites: 1,
      maxPagesPerSite: 1,
      maxSectionsPerPage: 10,
      maxProducts: 0,
      maxPosts: 0,

      allowCustomDomain: false,
      allowForms: false,
      allowAnalytics: false,
      allowCustomCode: false,
      allowEcommerce: false,
      allowBlog: false,
      allowNews: false,
      allowTemplates: true,
      lineOaMonthlyQuota: 5,
      supportTier: "HELP_CENTER",
      trackingLevel: "NONE",
      analyticsLevel: "NONE",

      trialDays: 0,
      isActive: true,
      sortOrder: 0,
    },
  });

  // BASIC (250 บาท)
  await prisma.plan.upsert({
    where: { code: "BASIC" },
    update: {},
    create: {
      code: "BASIC",
      name: "Basic",
      description: "สำหรับเริ่มต้นมีหน้าร้านออนไลน์",
      priceMonthly: 250,
      priceYearly: 2500,

      maxSites: 1,
      maxPagesPerSite: 3,
      maxSectionsPerPage: 20,
      maxProducts: 3,
      maxPosts: 0,

      allowCustomDomain: true,
      allowForms: true,
      allowAnalytics: false,
      allowCustomCode: false,
      allowEcommerce: true,
      allowBlog: false,
      allowNews: false,
      allowTemplates: true,
      lineOaMonthlyQuota: 50,
      supportTier: "STANDARD",
      trackingLevel: "NONE",
      analyticsLevel: "NONE",

      trialDays: 7,
      isActive: true,
      sortOrder: 1,
    },
  });

  // BUSINESS (490 บาท)
  await prisma.plan.upsert({
    where: { code: "BUSINESS" },
    update: {},
    create: {
      code: "BUSINESS",
      name: "Business",
      description: "สำหรับทีมขายและการยิงโฆษณา",
      priceMonthly: 490,
      priceYearly: 4900,

      maxSites: 3,
      maxPagesPerSite: 10,
      maxSectionsPerPage: 50,
      maxProducts: 50,
      maxPosts: 50,

      allowCustomDomain: true,
      allowForms: true,
      allowAnalytics: true,
      allowCustomCode: false,
      allowEcommerce: true,
      allowBlog: true,
      allowNews: true,
      allowTemplates: true,
      lineOaMonthlyQuota: null,
      supportTier: "PRIORITY",
      trackingLevel: "FULL_INTEGRATION",
      analyticsLevel: "DETAILED",

      trialDays: 7,
      isActive: true,
      sortOrder: 2,
    },
  });

  // PRO (990 บาท)
  await prisma.plan.upsert({
    where: { code: "PRO" },
    update: {},
    create: {
      code: "PRO",
      name: "Pro",
      description: "สำหรับเอเจนซี่และธุรกิจขนาดใหญ่",
      priceMonthly: 990,
      priceYearly: 9900,

      maxSites: 10,
      maxPagesPerSite: 50,
      maxSectionsPerPage: 100,
      maxProducts: 1000,
      maxPosts: 1000,

      allowCustomDomain: true,
      allowForms: true,
      allowAnalytics: true,
      allowCustomCode: true,
      allowEcommerce: true,
      allowBlog: true,
      allowNews: true,
      allowTemplates: true,
      lineOaMonthlyQuota: null,
      supportTier: "EXCLUSIVE_ADVISOR",
      trackingLevel: "FULL_WITH_CUSTOM_CODE",
      analyticsLevel: "ADVANCED_REPORTS",

      trialDays: 0,
      isActive: true,
      sortOrder: 3,
    },
  });

  console.log("✅ Plans seeded successfully");

  console.log("🎨 Seeding official templates...");

  const categoryMap = {
    leadgen: {
      name: "Lead Generation",
      slug: "lead-generation",
      description: "เทมเพลตสายเก็บลีดและปิดการขาย",
    },
    clinic: {
      name: "Clinic & Wellness",
      slug: "clinic-wellness",
      description: "เทมเพลตคลินิกและธุรกิจสุขภาพ",
    },
    restaurant: {
      name: "Restaurant & Cafe",
      slug: "restaurant-cafe",
      description: "เทมเพลตร้านอาหาร คาเฟ่ และจองโต๊ะ",
    },
    realestate: {
      name: "Real Estate",
      slug: "real-estate",
      description: "เทมเพลตอสังหา โครงการ และเปรียบเทียบแพ็กเกจ",
    },
    agency: {
      name: "Agency & Portfolio",
      slug: "agency-portfolio",
      description: "เทมเพลตเอเจนซี่และผลงาน",
    },
  } as const;

  for (const category of Object.values(categoryMap)) {
    await prisma.templateCategory.upsert({
      where: { slug: category.slug },
      update: {
        name: category.name,
        description: category.description,
        isActive: true,
      },
      create: {
        name: category.name,
        slug: category.slug,
        description: category.description,
        isActive: true,
      },
    });
  }

  const officialTemplates = [
    {
      code: "FW-SME-LEADGEN",
      slug: "official-sme-leadgen",
      name: "SME Lead Gen",
      categorySlug: categoryMap.leadgen.slug,
      description: "เทมเพลตเก็บลีดสายยิงแอดสำหรับ SME ไทย",
      thumbnailUrl:
        "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800&q=80",
      tags: {
        businessTypes: ["service", "product"],
        goals: ["leads", "sales"],
        styles: ["modern"],
        languages: ["thai", "thai-english"],
        keywords: ["sme", "lead generation", "ads", "line oa", "landing page"],
      },
      pages: [
        {
          title: "หน้าแรก",
          slug: "home",
          pageType: "LANDING",
          path: "/",
          isHomePage: true,
          sections: [
            { type: "NAVBAR", name: "เมนูหลัก", props: { logo: "/logo.svg", menuItems: [{ label: "บริการ", href: "/services" }, { label: "ผลงาน", href: "/about" }], cta: { label: "ปรึกษาฟรี", href: "/contact" } } },
            { type: "HERO", name: "Hero", props: { title: "เพิ่มยอดขายด้วยเว็บที่พร้อมปิดลีด", subtitle: "โครงสร้างเว็บครบ Funnel พร้อมต่อ LINE OA และฟอร์ม", buttonText: "เริ่มรับลูกค้า" } },
            { type: "FEATURE", name: "จุดเด่น", props: { title: "3 เหตุผลที่ลูกค้าเลือกเรา", body: "วัดผลได้, ทำไว, รองรับมือถือ 100%" } },
            { type: "COMPARISON", name: "ตารางเปรียบเทียบ", props: { plans: [{ title: "Starter", body: "เหมาะเริ่มต้น" }, { title: "Growth", body: "เหมาะทีมขาย" }], items: [{ title: "จำนวนหน้า", body: "3 vs 10" }, { title: "LINE OA", body: "50 vs Unlimited" }] } },
            { type: "CTA", name: "ปิดการขาย", props: { title: "พร้อมเริ่มวันนี้ไหม", subtitle: "กดปุ่มเพื่อรับแผนเว็บ 1:1 ฟรี", buttonText: "รับแผนทันที" } },
            { type: "FOOTER", name: "ท้ายเว็บ", props: { menuItems: [{ label: "นโยบายความเป็นส่วนตัว", href: "/privacy" }] } },
          ],
        },
        {
          title: "บริการ",
          slug: "services",
          pageType: "NORMAL",
          path: "/services",
          sections: [
            { type: "HEADER", name: "หัวข้อบริการ", props: { title: "บริการของเรา", subtitle: "ออกแบบเพื่อธุรกิจไทยที่ต้องการผลลัพธ์ไว" } },
            { type: "CONTENT", name: "เนื้อหาบริการ", props: { title: "แพ็กเกจหลัก", body: "Landing Page, Tracking Setup, Conversion Copywriting" } },
            { type: "PRICING", name: "ราคา", props: { sourceMode: "manual", itemLimit: 3 } },
          ],
        },
        {
          title: "ติดต่อ",
          slug: "contact",
          pageType: "NORMAL",
          path: "/contact",
          sections: [
            { type: "BOOKING", name: "จองคุยงาน", props: { title: "จองเวลาปรึกษา", submitLabel: "ส่งคำขอจอง", calendarMode: "manual", fields: [{ label: "ชื่อ", name: "name", type: "text" }, { label: "เบอร์โทร", name: "phone", type: "phone" }] } },
            { type: "FORM", name: "ฟอร์มติดต่อ", props: { title: "ฝากข้อมูลให้ทีมงาน", subtitle: "เราจะติดต่อกลับภายใน 24 ชั่วโมง", buttonText: "ส่งข้อมูล" } },
          ],
        },
      ],
    },
    {
      code: "FW-CLINIC-BOOKING",
      slug: "official-clinic-booking",
      name: "Clinic Booking",
      categorySlug: categoryMap.clinic.slug,
      description: "เทมเพลตคลินิกพร้อมจองคิวและรีวิว",
      thumbnailUrl:
        "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=800&q=80",
      tags: {
        businessTypes: ["clinic", "service"],
        goals: ["booking", "leads"],
        styles: ["modern", "minimal"],
        languages: ["thai", "thai-english"],
        keywords: ["clinic", "wellness", "booking", "appointment", "review"],
      },
      pages: [
        {
          title: "หน้าแรก",
          slug: "home",
          pageType: "LANDING",
          path: "/",
          isHomePage: true,
          sections: [
            { type: "NAVBAR", name: "เมนูหลัก", props: { menuItems: [{ label: "แพทย์", href: "/doctors" }, { label: "แพ็กเกจ", href: "/packages" }] } },
            { type: "HERO", name: "Hero", props: { title: "ดูแลสุขภาพอย่างมืออาชีพ", subtitle: "จองคิวออนไลน์ง่ายใน 1 นาที", buttonText: "จองคิวตอนนี้" } },
            { type: "TESTIMONIAL", name: "รีวิว", props: { title: "เสียงจากผู้รับบริการ", body: "รีวิวจริงจากลูกค้าคลินิก" } },
            { type: "BOOKING", name: "จองคิว", props: { title: "เลือกวันเวลาที่สะดวก", submitLabel: "ยืนยันจองคิว", calendarMode: "embedded", fields: [{ label: "ชื่อ", name: "name", type: "text" }, { label: "อาการเบื้องต้น", name: "symptom", type: "text" }] } },
            { type: "FOOTER", name: "ท้ายเว็บ", props: { menuItems: [{ label: "ติดต่อคลินิก", href: "/contact" }] } },
          ],
        },
        {
          title: "แพทย์",
          slug: "doctors",
          pageType: "NORMAL",
          path: "/doctors",
          sections: [
            { type: "HEADER", name: "ทีมแพทย์", props: { title: "ทีมแพทย์ผู้เชี่ยวชาญ", subtitle: "ประสบการณ์ดูแลผู้ป่วยจริง" } },
            { type: "CONTENT", name: "ประวัติแพทย์", props: { title: "หมอแนะนำ", body: "ข้อมูลคุณหมอ พร้อมความเชี่ยวชาญแต่ละสาขา" } },
          ],
        },
      ],
    },
    {
      code: "FW-RESTAURANT-RESERVE",
      slug: "official-restaurant-reservation",
      name: "Fine Dining Gold Experience",
      categorySlug: categoryMap.restaurant.slug,
      description:
        "เทมเพลตร้านอาหารโทนหรู Dark + Gold พร้อมเมนู ข่าวสาร จองโต๊ะ และ SEO เริ่มต้น",
      thumbnailUrl:
        "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80",
      sortOrder: 10,
      tags: {
        businessTypes: ["restaurant"],
        goals: ["booking", "store", "sales"],
        styles: ["luxury"],
        languages: ["thai", "english", "thai-english"],
        keywords: ["restaurant", "fine dining", "reservation", "menu", "gold"],
        themePreset: "deep-space-gold",
        editable: ["text", "image", "seo", "theme", "cta"],
        theme: {
          primary: "#D4AF37",
          background: "#0A0A0A",
          surface: "#151515",
          text: "#E5E5E5",
          accent: "#FF8C00",
        },
      },
      pages: [
        {
          title: "Home",
          slug: "home",
          pageType: "LANDING",
          path: "/",
          isHomePage: true,
          seoTitle: "L'Éclat du Goût | Fine Dining Excellence",
          seoDescription:
            "สัมผัสประสบการณ์ Fine Dining โทนหรู จองโต๊ะออนไลน์ได้ทันที พร้อมเมนูซิกเนเจอร์",
          seoKeywords: "fine dining, restaurant, reservation, menu, bangkok",
          ogImageUrl:
            "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&q=80&w=2070",
          sections: [
            {
              type: "NAVBAR",
              name: "Main Navigation",
              props: {
                logo:
                  "https://images.unsplash.com/photo-1541544741938-0af808871cc0?auto=format&fit=crop&q=80&w=200",
                menuItems: [
                  { label: "Home", href: "/" },
                  { label: "About", href: "/about" },
                  { label: "Menu", href: "/menu" },
                  { label: "Reservations", href: "/reservations" },
                  { label: "News", href: "/news" },
                ],
                cta: { label: "Reserve Table", href: "/reservations" },
                theme: "deep-space-gold",
              },
            },
            {
              type: "HEADER",
              name: "Luxury Intro Strip",
              props: {
                title: "Curated Selection",
                subtitle: "An elevated fine dining experience in the city",
              },
            },
            {
              type: "HERO",
              name: "Hero Banner",
              props: {
                title: "L'Éclat du Goût",
                subtitle: "Fine dining excellence, redefined",
                buttonText: "Explore Signature Menu",
                backgroundImage:
                  "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&q=80&w=2070",
                secondaryCta: {
                  label: "Make Reservation",
                  href: "/reservations",
                },
              },
            },
            {
              type: "CONTENT",
              name: "About Story",
              props: {
                title: "A Culinary Journey",
                body: "From ingredient sourcing to final plating, every detail is designed to deliver an unforgettable evening. This default text can be replaced from editor.",
                imageUrl:
                  "https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&q=80&w=1974",
              },
            },
            {
              type: "PRODUCT_GRID",
              name: "Signature Dishes",
              props: {
                sourceMode: "manual",
                itemLimit: 6,
                heading: "Signature Dishes",
              },
            },
            {
              type: "COMPARISON",
              name: "Tasting Menu Comparison",
              props: {
                plans: [
                  { title: "Classic Journey", body: "5-course experience" },
                  { title: "Grand Experience", body: "8-course experience" },
                ],
                items: [
                  { title: "Wine Pairing", body: "Optional / Included" },
                  { title: "Chef Table", body: "No / Yes" },
                  { title: "Duration", body: "2 hrs / 3 hrs" },
                ],
              },
            },
            {
              type: "BOOKING",
              name: "Reservation Form",
              props: {
                title: "Make a Reservation",
                submitLabel: "Submit Request",
                calendarMode: "manual",
                fields: [
                  { label: "Full Name", name: "fullName", type: "text" },
                  { label: "Email Address", name: "email", type: "email" },
                  { label: "Guests", name: "guests", type: "number" },
                  { label: "Date", name: "date", type: "date" },
                  { label: "Time", name: "time", type: "text" },
                ],
              },
            },
            {
              type: "FOOTER",
              name: "Footer",
              props: {
                menuItems: [
                  { label: "Contact", href: "/contact" },
                  { label: "Hours", href: "/about" },
                  { label: "Privacy", href: "/privacy" },
                ],
                cta: { label: "Instagram", href: "#" },
              },
            },
          ],
        },
        {
          title: "Menu",
          slug: "menu",
          pageType: "NORMAL",
          path: "/menu",
          seoTitle: "Menu | L'Éclat du Goût",
          seoDescription:
            "สำรวจเมนูซิกเนเจอร์ เมนูตามฤดูกาล และไวน์แพริ่งของร้าน",
          sections: [
            {
              type: "SIDEBAR",
              name: "Menu Categories Sidebar",
              props: {
                title: "Menu Categories",
                links: [
                  { label: "Starters", href: "#starters" },
                  { label: "Main Courses", href: "#mains" },
                  { label: "Desserts", href: "#desserts" },
                ],
                promos: [{ title: "Chef Special", body: "Seasonal tasting set" }],
              },
            },
            {
              type: "PRODUCT_GRID",
              name: "Dish List",
              props: { sourceMode: "manual", itemLimit: 12 },
            },
          ],
        },
        {
          title: "News",
          slug: "news",
          pageType: "NEWS",
          path: "/news",
          seoTitle: "News & Events | L'Éclat du Goût",
          seoDescription:
            "ข่าวสารอีเวนต์พิเศษ เทศกาลอาหาร และเมนูใหม่ประจำเดือน",
          sections: [
            {
              type: "NEWS_LIST",
              name: "News List",
              props: { sourceMode: "manual", itemLimit: 6 },
            },
          ],
        },
        {
          title: "Reservations",
          slug: "reservations",
          pageType: "NORMAL",
          path: "/reservations",
          seoTitle: "Reservations | L'Éclat du Goût",
          seoDescription:
            "จองโต๊ะออนไลน์ เลือกวันเวลาและจำนวนที่นั่งได้ทันที",
          sections: [
            {
              type: "BOOKING",
              name: "Reservation",
              props: {
                title: "Reserve Your Table",
                submitLabel: "Confirm Reservation",
                calendarMode: "manual",
                fields: [
                  { label: "Full Name", name: "name", type: "text" },
                  { label: "Phone", name: "phone", type: "phone" },
                  { label: "Guests", name: "guests", type: "number" },
                ],
              },
            },
            {
              type: "FORM",
              name: "Special Request",
              props: {
                title: "Special Request",
                subtitle:
                  "แจ้งความต้องการพิเศษ เช่น allergy, anniversary หรือ private room",
                buttonText: "Send Request",
              },
            },
          ],
        },
      ],
    },
    {
      code: "FW-REALESTATE-LISTING",
      slug: "official-real-estate-listing",
      name: "Real Estate Listing + Compare",
      categorySlug: categoryMap.realestate.slug,
      description: "เทมเพลตอสังหาพร้อม Listing และเปรียบเทียบโครงการ",
      thumbnailUrl:
        "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=800&q=80",
      tags: {
        businessTypes: ["product", "service"],
        goals: ["sales", "leads"],
        styles: ["modern", "luxury"],
        languages: ["thai", "thai-english"],
        keywords: ["real estate", "listing", "compare", "property", "project"],
      },
      pages: [
        {
          title: "หน้าแรก",
          slug: "home",
          pageType: "LANDING",
          path: "/",
          isHomePage: true,
          sections: [
            { type: "NAVBAR", name: "เมนูหลัก", props: { menuItems: [{ label: "โครงการ", href: "/projects" }, { label: "เปรียบเทียบ", href: "/compare" }] } },
            { type: "HERO", name: "Hero", props: { title: "ค้นหาโครงการที่ใช่สำหรับคุณ", subtitle: "บ้าน คอนโด และที่ดินพร้อมข้อมูลครบ", buttonText: "ดูโครงการ" } },
            { type: "PRODUCT_GRID", name: "รายการโครงการ", props: { sourceMode: "manual", itemLimit: 9 } },
            { type: "CTA", name: "นัดชมโครงการ", props: { title: "นัดชมโครงการฟรี", subtitle: "ทีมงานพร้อมให้คำแนะนำแบบ 1:1", buttonText: "จองนัดหมาย" } },
          ],
        },
        {
          title: "เปรียบเทียบ",
          slug: "compare",
          pageType: "NORMAL",
          path: "/compare",
          sections: [
            { type: "COMPARISON", name: "ตารางเปรียบเทียบโครงการ", props: { plans: [{ title: "โครงการ A", body: "เริ่ม 2.9 ลบ." }, { title: "โครงการ B", body: "เริ่ม 3.4 ลบ." }], items: [{ title: "ระยะทาง BTS", body: "800ม vs 1.2กม" }, { title: "ส่วนกลาง", body: "ครบ vs พรีเมียม" }] } },
            { type: "FORM", name: "ฟอร์มรับคำปรึกษา", props: { title: "สนใจโครงการไหนเป็นพิเศษ", subtitle: "ฝากข้อมูลเพื่อให้ทีมงานช่วยเทียบให้", buttonText: "ส่งคำถาม" } },
          ],
        },
      ],
    },
    {
      code: "FW-AGENCY-PORTFOLIO",
      slug: "official-agency-portfolio",
      name: "Agency Portfolio + Case Study",
      categorySlug: categoryMap.agency.slug,
      description: "เทมเพลตเอเจนซี่โชว์บริการและเคสจริง",
      thumbnailUrl:
        "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=800&q=80",
      tags: {
        businessTypes: ["service", "product"],
        goals: ["leads", "store"],
        styles: ["modern", "minimal"],
        languages: ["thai", "english", "thai-english"],
        keywords: ["agency", "portfolio", "case study", "service", "blog"],
      },
      pages: [
        {
          title: "หน้าแรก",
          slug: "home",
          pageType: "LANDING",
          path: "/",
          isHomePage: true,
          sections: [
            { type: "NAVBAR", name: "เมนูหลัก", props: { menuItems: [{ label: "บริการ", href: "/services" }, { label: "ผลงาน", href: "/case-studies" }, { label: "บทความ", href: "/blog" }], cta: { label: "คุยโปรเจกต์", href: "/contact" } } },
            { type: "HERO", name: "Hero", props: { title: "Creative Agency ที่ขับเคลื่อนด้วยผลลัพธ์", subtitle: "เราออกแบบประสบการณ์ที่สวยและขายได้จริง", buttonText: "ดูผลงาน" } },
            { type: "FEATURE", name: "บริการหลัก", props: { title: "บริการครบวงจร", description: "Branding, Web, Performance Marketing" } },
            { type: "FOOTER", name: "ท้ายเว็บ", props: { menuItems: [{ label: "นโยบายข้อมูล", href: "/privacy" }] } },
          ],
        },
        {
          title: "ผลงาน",
          slug: "case-studies",
          pageType: "NORMAL",
          path: "/case-studies",
          sections: [
            { type: "CONTENT", name: "Case Study Intro", props: { title: "Case Studies", body: "รวมเคสที่ช่วยให้ลูกค้าโตแบบวัดผลได้" } },
            { type: "BLOG_LIST", name: "รายการเคส", props: { sourceMode: "manual", itemLimit: 6 } },
          ],
        },
        {
          title: "บทความ",
          slug: "blog",
          pageType: "BLOG",
          path: "/blog",
          sections: [
            { type: "NEWS_LIST", name: "บทความล่าสุด", props: { sourceMode: "manual", itemLimit: 8 } },
          ],
        },
      ],
    },
  ] as const;

  for (const template of officialTemplates) {
    const category = await prisma.templateCategory.findUniqueOrThrow({
      where: {
        slug: template.categorySlug,
      },
      select: {
        id: true,
      },
    });

    const savedTemplate = await prisma.template.upsert({
      where: { slug: template.slug },
      update: {
        code: template.code,
        name: template.name,
        description: template.description,
        thumbnailUrl: template.thumbnailUrl,
        tags: template.tags ?? undefined,
        sortOrder: template.sortOrder ?? 0,
        categoryId: category.id,
        status: "PUBLISHED",
        visibility: "OFFICIAL",
        isFree: true,
      },
      create: {
        code: template.code,
        name: template.name,
        slug: template.slug,
        description: template.description,
        thumbnailUrl: template.thumbnailUrl,
        tags: template.tags ?? undefined,
        sortOrder: template.sortOrder ?? 0,
        categoryId: category.id,
        status: "PUBLISHED",
        visibility: "OFFICIAL",
        isFree: true,
      },
    });

    await prisma.templateSection.deleteMany({
      where: {
        templatePage: {
          templateId: savedTemplate.id,
        },
      },
    });

    await prisma.templatePage.deleteMany({
      where: {
        templateId: savedTemplate.id,
      },
    });

    for (const [pageIndex, page] of template.pages.entries()) {
      const createdPage = await prisma.templatePage.create({
        data: {
          templateId: savedTemplate.id,
          title: page.title,
          slug: page.slug,
          pageType: page.pageType,
          path: page.path,
          isHomePage: page.isHomePage ?? pageIndex === 0,
          isPublished: false,
          sortOrder: pageIndex,
          seoTitle: page.seoTitle ?? null,
          seoDescription: page.seoDescription ?? null,
          seoKeywords: page.seoKeywords ?? null,
          ogImageUrl: page.ogImageUrl ?? null,
        },
      });

      for (const [sectionIndex, section] of page.sections.entries()) {
        await prisma.templateSection.create({
          data: {
            templatePageId: createdPage.id,
            type: section.type,
            name: section.name,
            sortOrder: sectionIndex,
            isVisible: true,
            props: section.props,
          },
        });
      }
    }

    const snapshot = {
      pages: template.pages.map((page, pageIndex) => ({
        ...page,
        sortOrder: pageIndex,
        isPublished: false,
        sections: page.sections.map((section, sectionIndex) => ({
          ...section,
          sortOrder: sectionIndex,
          isVisible: true,
        })),
      })),
    };

    const latestVersion = await prisma.templateVersion.findFirst({
      where: {
        templateId: savedTemplate.id,
      },
      orderBy: {
        version: "desc",
      },
      select: {
        version: true,
      },
    });

    await prisma.templateVersion.updateMany({
      where: {
        templateId: savedTemplate.id,
        isActive: true,
      },
      data: {
        isActive: false,
      },
    });

    await prisma.templateVersion.create({
      data: {
        templateId: savedTemplate.id,
        version: (latestVersion?.version ?? 0) + 1,
        name: `v${(latestVersion?.version ?? 0) + 1}`,
        snapshot,
        isActive: true,
      },
    });
  }

  console.log("✅ Official templates seeded successfully");

  console.log("🧩 Seeding section templates...");

  function navbarHtmlTemplate(layout: number) {
    switch (layout) {
      case 1:
        return `<div class="fw-nav fw-nav-01"><div class="fw-nav-inner"><div class="fw-logo">{{logoHtml}}</div><nav class="fw-menu">{{menuItemsHtml}}</nav><div class="fw-cta">{{ctaHtml}}</div><button class="fw-mobile-btn">Menu</button></div><div class="fw-mobile">{{mobileMenuItemsHtml}}{{mobileCtaHtml}}</div></div>`;
      case 2:
        return `<div class="fw-nav fw-nav-02"><div class="fw-nav-inner"><div class="fw-logo">{{logoHtml}}</div><nav class="fw-menu centered">{{menuItemsHtml}}</nav><div class="fw-cta outline">{{ctaHtmlOutline}}</div><button class="fw-mobile-btn">Menu</button></div><div class="fw-mobile">{{mobileMenuItemsHtml}}{{mobileCtaHtml}}</div></div>`;
      case 3:
        return `<div class="fw-nav fw-nav-03 glass"><div class="fw-nav-inner"><div class="fw-logo">{{logoHtml}}</div><nav class="fw-menu">{{menuItemsHtml}}</nav><div class="fw-cta">{{ctaHtml}}</div><button class="fw-mobile-btn">Menu</button></div><div class="fw-mobile">{{mobileMenuItemsHtml}}{{mobileCtaHtml}}</div></div>`;
      case 4:
        return `<div class="fw-nav fw-nav-04"><div class="fw-topline">Today Offer: Complimentary Dessert for Booking</div><div class="fw-nav-inner"><div class="fw-logo">{{logoHtml}}</div><nav class="fw-menu">{{menuItemsHtml}}</nav><div class="fw-cta">{{ctaHtml}}</div><button class="fw-mobile-btn">Menu</button></div><div class="fw-mobile">{{mobileMenuItemsHtml}}{{mobileCtaHtml}}</div></div>`;
      case 5:
        return `<div class="fw-nav fw-nav-05"><div class="fw-nav-inner"><div class="fw-logo with-badge"><span class="badge">FW</span>{{logoHtml}}</div><nav class="fw-menu chips">{{menuItemsHtmlChips}}</nav><div class="fw-cta">{{ctaHtml}}</div><button class="fw-mobile-btn">Menu</button></div><div class="fw-mobile">{{mobileMenuItemsHtml}}{{mobileCtaHtml}}</div></div>`;
      case 6:
        return `<div class="fw-nav fw-nav-06"><div class="fw-nav-inner"><div class="fw-logo">{{logoHtml}}</div><nav class="fw-menu pill">{{menuItemsHtmlPill}}</nav><div class="fw-cta">{{ctaHtml}}</div><button class="fw-mobile-btn">Menu</button></div><div class="fw-mobile">{{mobileMenuItemsHtml}}{{mobileCtaHtml}}</div></div>`;
      case 7:
        return `<div class="fw-nav fw-nav-07"><div class="fw-nav-inner"><div class="fw-logo">{{logoHtml}}</div><nav class="fw-menu underline">{{menuItemsHtml}}</nav><div class="fw-cta outline">{{ctaHtmlOutline}}</div><button class="fw-mobile-btn">Menu</button></div><div class="fw-mobile">{{mobileMenuItemsHtml}}{{mobileCtaHtml}}</div></div>`;
      case 8:
        return `<div class="fw-nav fw-nav-08"><div class="fw-card"><div class="fw-nav-inner"><div class="fw-logo">{{logoHtml}}</div><nav class="fw-menu">{{menuItemsHtml}}</nav><div class="fw-cta">{{ctaHtml}}</div><button class="fw-mobile-btn">Menu</button></div><div class="fw-mobile">{{mobileMenuItemsHtml}}{{mobileCtaHtml}}</div></div></div>`;
      case 9:
        return `<div class="fw-nav fw-nav-09"><div class="fw-nav-inner center-logo"><div class="fw-cta-left">{{ctaHtmlOutline}}</div><div class="fw-logo centered">{{logoHtml}}</div><nav class="fw-menu right">{{menuItemsHtml}}</nav><button class="fw-mobile-btn">Menu</button></div><div class="fw-mobile">{{mobileMenuItemsHtml}}{{mobileCtaHtml}}</div></div>`;
      default:
        return `<div class="fw-nav fw-nav-10 gradient"><div class="fw-nav-inner"><div class="fw-logo">{{logoHtml}}</div><nav class="fw-menu">{{menuItemsHtml}}</nav><div class="fw-cta">{{ctaHtml}}</div><button class="fw-mobile-btn">Menu</button></div><div class="fw-mobile">{{mobileMenuItemsHtml}}{{mobileCtaHtml}}</div></div>`;
    }
  }

  function navbarCssTemplate(layout: number) {
    const variant = layout === 10
      ? "background: linear-gradient(90deg,#0b0f1a,#121212,#1a1208);"
      : layout === 3
        ? "background: rgba(6,6,6,.75); backdrop-filter: blur(14px);"
        : "background: #070708;";

    return `.__SCOPE__ .fw-nav{${variant} border-bottom:1px solid rgba(255,255,255,.12); color: {{textColor}}; font-family: {{fontFamily}};}
.__SCOPE__ .fw-topline{padding:.5rem 1rem; font-size:.72rem; color:rgba(255,255,255,.65);}
.__SCOPE__ .fw-card{margin:.75rem; border:1px solid rgba(255,255,255,.12); border-radius:12px; background:rgba(0,0,0,.25);}
.__SCOPE__ .fw-nav-inner{max-width:1120px; margin:0 auto; padding:1rem 1.25rem; display:flex; align-items:center; justify-content:space-between; gap:1rem;}
.__SCOPE__ .fw-logo{font-weight:700; letter-spacing:.1em; color:{{accentColor}};}
.__SCOPE__ .fw-logo.with-badge{display:flex; align-items:center; gap:.6rem;}
.__SCOPE__ .fw-logo .badge{border:1px solid rgba(255,255,255,.25); padding:.15rem .4rem; border-radius:6px; font-size:.65rem;}
.__SCOPE__ .fw-menu{display:flex; align-items:center; gap:1.1rem;}
.__SCOPE__ .fw-menu.centered{justify-content:center; flex:1;}
.__SCOPE__ .fw-menu.right{justify-content:flex-end; flex:1;}
.__SCOPE__ .fw-menu a{font-size:.72rem; text-transform:uppercase; letter-spacing:.14em; color:rgba(255,255,255,.88); text-decoration:none;}
.__SCOPE__ .fw-menu.chips a{border:1px solid rgba(255,255,255,.15); border-radius:999px; padding:.38rem .7rem;}
.__SCOPE__ .fw-menu.pill{background:rgba(255,255,255,.06); border-radius:999px; padding:.2rem;}
.__SCOPE__ .fw-menu.pill a{padding:.35rem .65rem; border-radius:999px;}
.__SCOPE__ .fw-menu.underline a{border-bottom:1px solid transparent; padding-bottom:.28rem;}
.__SCOPE__ .fw-menu.underline a:hover{border-bottom-color:rgba(255,255,255,.65);}
.__SCOPE__ .fw-cta a{display:inline-flex; align-items:center; justify-content:center; padding:.52rem .95rem; border-radius:8px; font-size:.72rem; font-weight:700; text-transform:uppercase; letter-spacing:.12em; text-decoration:none; background:{{accentColor}}; color:#111;}
.__SCOPE__ .fw-cta.outline a, .__SCOPE__ .fw-cta-left a{background:transparent; border:1px solid rgba(255,255,255,.25); color:{{accentColor}};}
.__SCOPE__ .fw-mobile-btn{display:none; border:1px solid rgba(255,255,255,.25); background:transparent; color:#fff; border-radius:8px; padding:.38rem .6rem; font-size:.68rem; text-transform:uppercase; letter-spacing:.12em;}
.__SCOPE__ .fw-mobile{display:none; padding:0 1.25rem 1rem; max-width:1120px; margin:0 auto;}
.__SCOPE__ .fw-mobile a{display:block; margin:.3rem 0; border:1px solid rgba(255,255,255,.14); border-radius:8px; padding:.55rem .75rem; text-decoration:none; color:rgba(255,255,255,.88); font-size:.78rem;}
.__SCOPE__ .fw-mobile .fw-cta-mobile a{background:{{accentColor}}; color:#111; font-weight:700; text-align:center;}
.__SCOPE__ .fw-nav-09 .center-logo{display:grid; grid-template-columns:1fr auto 1fr; align-items:center;}
.__SCOPE__ .fw-nav-09 .fw-mobile-btn{justify-self:end;}
@media (max-width: 900px){.__SCOPE__ .fw-menu,.__SCOPE__ .fw-cta,.__SCOPE__ .fw-cta-left{display:none;}.__SCOPE__ .fw-mobile-btn{display:inline-flex;}.__SCOPE__ .fw-mobile{display:block;}.__SCOPE__ .fw-nav-09 .center-logo{display:flex;}}`;
  }

  const sectionTemplateBlueprints = [
    {
      code: "ST-NAVBAR-LUXE-01",
      name: "Navbar Layout 01 - Luxe Gold",
      sectionType: "NAVBAR",
      sortOrder: 1,
      layoutJson: {
        rendererKey: "ST-NAVBAR-01",
        defaultProps: {
          brandName: "L'ÉCLAT",
          logo: { mode: "theme", themeKey: "brand" },
          menuItems: [
            { label: "Home", linkType: "page", pagePath: "/" },
            { label: "About", linkType: "page", pagePath: "/about" },
            { label: "Menu", linkType: "page", pagePath: "/menu" },
          ],
          cta: { label: "Book Now", linkType: "section", sectionId: "booking" },
          styleMode: "theme",
        },
      },
      schemaJson: {
        slots: ["brandName", "logo", "menuItems", "cta"],
      },
    },
    {
      code: "ST-NAVBAR-MIN-01",
      name: "Navbar Layout 02 - Minimal Split",
      sectionType: "NAVBAR",
      sortOrder: 2,
      layoutJson: {
        rendererKey: "ST-NAVBAR-02",
        defaultProps: {
          brandName: "FinnWeb",
          logo: { mode: "theme", themeKey: "brand" },
          menuItems: [
            { label: "Services", linkType: "page", pagePath: "/services" },
            { label: "Pricing", linkType: "page", pagePath: "/pricing" },
          ],
          cta: { label: "Get Started", linkType: "page", pagePath: "/contact" },
          styleMode: "theme",
        },
      },
      schemaJson: { slots: ["brandName", "logo", "menuItems", "cta"] },
    },
    {
      code: "ST-NAVBAR-03",
      name: "Navbar Layout 03 - Glass Blur",
      sectionType: "NAVBAR",
      sortOrder: 3,
      layoutJson: {
        rendererKey: "ST-NAVBAR-03",
        defaultProps: {
          brandName: "Glass House",
          logo: { mode: "theme", themeKey: "brand" },
          menuItems: [
            { label: "Home", linkType: "page", pagePath: "/" },
            { label: "Work", linkType: "page", pagePath: "/work" },
            { label: "Contact", linkType: "page", pagePath: "/contact" },
          ],
          cta: { label: "Start", linkType: "page", pagePath: "/contact" },
          styleMode: "theme",
        },
      },
      schemaJson: { slots: ["brandName", "logo", "menuItems", "cta"] },
    },
    {
      code: "ST-NAVBAR-04",
      name: "Navbar Layout 04 - Promo Topbar",
      sectionType: "NAVBAR",
      sortOrder: 4,
      layoutJson: {
        rendererKey: "ST-NAVBAR-04",
        defaultProps: {
          brandName: "Maison",
          logo: { mode: "theme", themeKey: "brand" },
          menuItems: [
            { label: "About", linkType: "page", pagePath: "/about" },
            { label: "Menu", linkType: "page", pagePath: "/menu" },
            { label: "Events", linkType: "page", pagePath: "/events" },
          ],
          cta: { label: "Reserve", linkType: "section", sectionId: "booking" },
          styleMode: "theme",
        },
      },
      schemaJson: { slots: ["brandName", "logo", "menuItems", "cta"] },
    },
    {
      code: "ST-NAVBAR-05",
      name: "Navbar Layout 05 - Badge + Chips",
      sectionType: "NAVBAR",
      sortOrder: 5,
      layoutJson: {
        rendererKey: "ST-NAVBAR-05",
        defaultProps: {
          brandName: "Craft Co.",
          logo: { mode: "theme", themeKey: "brand" },
          menuItems: [
            { label: "Shop", linkType: "page", pagePath: "/shop" },
            { label: "Journal", linkType: "page", pagePath: "/journal" },
            { label: "FAQ", linkType: "page", pagePath: "/faq" },
          ],
          cta: { label: "Order Now", linkType: "page", pagePath: "/checkout" },
          styleMode: "theme",
        },
      },
      schemaJson: { slots: ["brandName", "logo", "menuItems", "cta"] },
    },
    {
      code: "ST-NAVBAR-06",
      name: "Navbar Layout 06 - Pill Segment",
      sectionType: "NAVBAR",
      sortOrder: 6,
      layoutJson: {
        rendererKey: "ST-NAVBAR-06",
        defaultProps: {
          brandName: "Nova",
          logo: { mode: "theme", themeKey: "brand" },
          menuItems: [
            { label: "Overview", linkType: "page", pagePath: "/overview" },
            { label: "Pricing", linkType: "page", pagePath: "/pricing" },
            { label: "Docs", linkType: "page", pagePath: "/docs" },
          ],
          cta: { label: "Try Free", linkType: "page", pagePath: "/signup" },
          styleMode: "theme",
        },
      },
      schemaJson: { slots: ["brandName", "logo", "menuItems", "cta"] },
    },
    {
      code: "ST-NAVBAR-07",
      name: "Navbar Layout 07 - Underline Classic",
      sectionType: "NAVBAR",
      sortOrder: 7,
      layoutJson: {
        rendererKey: "ST-NAVBAR-07",
        defaultProps: {
          brandName: "Atelier",
          logo: { mode: "theme", themeKey: "brand" },
          menuItems: [
            { label: "Home", linkType: "page", pagePath: "/" },
            { label: "Portfolio", linkType: "page", pagePath: "/portfolio" },
            { label: "Contact", linkType: "page", pagePath: "/contact" },
          ],
          cta: { label: "Let’s Talk", linkType: "page", pagePath: "/contact" },
          styleMode: "theme",
        },
      },
      schemaJson: { slots: ["brandName", "logo", "menuItems", "cta"] },
    },
    {
      code: "ST-NAVBAR-08",
      name: "Navbar Layout 08 - Boxed Card",
      sectionType: "NAVBAR",
      sortOrder: 8,
      layoutJson: {
        rendererKey: "ST-NAVBAR-08",
        defaultProps: {
          brandName: "Studio Nine",
          logo: { mode: "theme", themeKey: "brand" },
          menuItems: [
            { label: "Services", linkType: "page", pagePath: "/services" },
            { label: "Case Study", linkType: "page", pagePath: "/case-study" },
            { label: "Blog", linkType: "page", pagePath: "/blog" },
          ],
          cta: { label: "Book Call", linkType: "page", pagePath: "/contact" },
          styleMode: "theme",
        },
      },
      schemaJson: { slots: ["brandName", "logo", "menuItems", "cta"] },
    },
    {
      code: "ST-NAVBAR-09",
      name: "Navbar Layout 09 - Center Logo",
      sectionType: "NAVBAR",
      sortOrder: 9,
      layoutJson: {
        rendererKey: "ST-NAVBAR-09",
        defaultProps: {
          brandName: "Le Grand",
          logo: { mode: "theme", themeKey: "brand" },
          menuItems: [
            { label: "Story", linkType: "page", pagePath: "/story" },
            { label: "Menu", linkType: "page", pagePath: "/menu" },
            { label: "Reserve", linkType: "section", sectionId: "booking" },
          ],
          cta: { label: "Discover", linkType: "page", pagePath: "/about" },
          styleMode: "theme",
        },
      },
      schemaJson: { slots: ["brandName", "logo", "menuItems", "cta"] },
    },
    {
      code: "ST-NAVBAR-10",
      name: "Navbar Layout 10 - Gradient Bold",
      sectionType: "NAVBAR",
      sortOrder: 10,
      layoutJson: {
        rendererKey: "ST-NAVBAR-10",
        defaultProps: {
          brandName: "Hyper Launch",
          logo: { mode: "theme", themeKey: "brand" },
          menuItems: [
            { label: "Features", linkType: "page", pagePath: "/features" },
            { label: "Pricing", linkType: "page", pagePath: "/pricing" },
            { label: "Contact", linkType: "page", pagePath: "/contact" },
          ],
          cta: { label: "Launch Now", linkType: "page", pagePath: "/signup" },
          styleMode: "theme",
        },
      },
      schemaJson: { slots: ["brandName", "logo", "menuItems", "cta"] },
    },
    {
      code: "ST-HERO-LUXE-01",
      name: "Hero Artistic Redefined",
      sectionType: "HERO",
      sortOrder: 1,
      layoutJson: {
        rendererKey: "hero-artistic-redefined",
        defaultProps: {
          title: "Artistic Gastronomy",
          subtitle: "WELCOME TO EXCELLENCE",
          buttonText: "View Our Menu",
          secondaryCta: { label: "Reserve Table", href: "#booking" },
          styleMode: "theme",
        },
      },
      schemaJson: { slots: ["title", "subtitle", "buttonText", "secondaryCta"] },
    },
    {
      code: "ST-CTA-SINGLE-01",
      name: "CTA Single Action",
      sectionType: "CTA",
      sortOrder: 1,
      layoutJson: {
        rendererKey: "cta-single",
        defaultProps: {
          title: "พร้อมเริ่มต้นหรือยัง?",
          subtitle: "เริ่มสร้างเว็บที่พร้อมขายในไม่กี่นาที",
          ctaTemplate: "single",
          primaryCta: { label: "Get Started", href: "/contact" },
          buttonText: "Get Started",
          styleMode: "theme",
        },
      },
      schemaJson: { slots: ["title", "subtitle", "ctaTemplate", "primaryCta"] },
    },
    {
      code: "ST-CTA-DOUBLE-01",
      name: "CTA Double Compare",
      sectionType: "CTA",
      sortOrder: 2,
      layoutJson: {
        rendererKey: "cta-double",
        defaultProps: {
          title: "พร้อมเริ่มต้นหรือยัง?",
          subtitle: "เปรียบเทียบแพ็กเกจหรือคุยทีมงานได้ทันที",
          ctaTemplate: "double",
          primaryCta: { label: "เริ่มใช้งาน", href: "/contact" },
          secondaryCta: { label: "ดูแพ็กเกจ", href: "/pricing" },
          buttonText: "เริ่มใช้งาน",
          styleMode: "theme",
        },
      },
      schemaJson: {
        slots: ["title", "subtitle", "ctaTemplate", "primaryCta", "secondaryCta"],
      },
    },
    {
      code: "ST-FOOTER-LUXE-01",
      name: "Footer Contact Columns",
      sectionType: "FOOTER",
      sortOrder: 1,
      layoutJson: {
        rendererKey: "footer-contact-columns",
        defaultProps: {
          brandName: "L'ÉCLAT",
          description: "Fine dining destination.",
          menuItems: [{ label: "Privacy", href: "/privacy" }],
          cta: { label: "Instagram", href: "#" },
          styleMode: "theme",
        },
      },
      schemaJson: { slots: ["brandName", "description", "menuItems", "cta"] },
    },
    {
      code: "ST-SIDEBAR-LIST-01",
      name: "Sidebar List + Content",
      sectionType: "SIDEBAR",
      sortOrder: 1,
      layoutJson: {
        rendererKey: "sidebar-list-content",
        defaultProps: {
          title: "Categories",
          subtitle: "Main content area",
          links: [{ label: "Category 1", href: "#" }],
          promos: [{ title: "Promo", body: "รายละเอียดโปรโมชัน" }],
          styleMode: "theme",
        },
      },
      schemaJson: { slots: ["title", "subtitle", "links", "promos"] },
    },
    {
      code: "ST-BOOKING-CLASSIC-01",
      name: "Booking Classic Form",
      sectionType: "BOOKING",
      sortOrder: 1,
      layoutJson: {
        rendererKey: "booking-classic-form",
        defaultProps: {
          title: "Make a Reservation",
          subtitle: "Book your table in advance",
          submitLabel: "Submit Request",
          calendarMode: "manual",
          fields: [
            { label: "Full Name", name: "name", type: "text" },
            { label: "Email Address", name: "email", type: "email" },
          ],
          styleMode: "theme",
        },
      },
      schemaJson: { slots: ["title", "subtitle", "submitLabel", "calendarMode", "fields"] },
    },
    {
      code: "ST-COMPARISON-TABLE-01",
      name: "Comparison Table",
      sectionType: "COMPARISON",
      sortOrder: 1,
      layoutJson: {
        rendererKey: "comparison-table",
        defaultProps: {
          title: "Comparison",
          plans: [{ title: "Basic", body: "Entry tier" }, { title: "Pro", body: "Growth tier" }],
          items: [{ title: "Pages", body: "3 vs 10" }],
          styleMode: "theme",
        },
      },
      schemaJson: { slots: ["title", "plans", "items"] },
    },
    {
      code: "ST-CONTENT-SPLIT-01",
      name: "Content Split Image",
      sectionType: "CONTENT",
      sortOrder: 1,
      layoutJson: {
        rendererKey: "content-split-image",
        defaultProps: {
          title: "About Us",
          body: "เล่าเรื่องแบรนด์พร้อมภาพประกอบ",
          imageUrl:
            "https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&q=80&w=1974",
          styleMode: "theme",
        },
      },
      schemaJson: { slots: ["title", "body", "imageUrl"] },
    },
    { code: "ST-HEADER-01", name: "Header Intro", sectionType: "HEADER", sortOrder: 1, layoutJson: { rendererKey: "header-intro", defaultProps: { title: "Curated Selection", subtitle: "Intro text", styleMode: "theme" } }, schemaJson: { slots: ["title", "subtitle"] } },
    { code: "ST-FEATURE-01", name: "Feature Block", sectionType: "FEATURE", sortOrder: 1, layoutJson: { rendererKey: "feature-block", defaultProps: { title: "Feature", body: "Feature details", styleMode: "theme" } }, schemaJson: { slots: ["title", "body"] } },
    { code: "ST-ABOUT-01", name: "About Block", sectionType: "ABOUT", sortOrder: 1, layoutJson: { rendererKey: "about-block", defaultProps: { title: "About", body: "About details", styleMode: "theme" } }, schemaJson: { slots: ["title", "body"] } },
    { code: "ST-GALLERY-01", name: "Gallery Grid", sectionType: "GALLERY", sortOrder: 1, layoutJson: { rendererKey: "gallery-grid", defaultProps: { title: "Gallery", styleMode: "theme" } }, schemaJson: { slots: ["title", "items"] } },
    { code: "ST-TESTIMONIAL-01", name: "Testimonial Cards", sectionType: "TESTIMONIAL", sortOrder: 1, layoutJson: { rendererKey: "testimonial-cards", defaultProps: { title: "Testimonials", body: "Customer reviews", styleMode: "theme" } }, schemaJson: { slots: ["title", "body"] } },
    { code: "ST-PRICING-01", name: "Pricing Cards", sectionType: "PRICING", sortOrder: 1, layoutJson: { rendererKey: "pricing-cards", defaultProps: { title: "Pricing", sourceMode: "manual", itemLimit: 3, styleMode: "theme" } }, schemaJson: { slots: ["title", "sourceMode", "itemLimit"] } },
    { code: "ST-FAQ-01", name: "FAQ Accordion", sectionType: "FAQ", sortOrder: 1, layoutJson: { rendererKey: "faq-accordion", defaultProps: { title: "FAQ", body: "คำถามที่พบบ่อย", styleMode: "theme" } }, schemaJson: { slots: ["title", "body"] } },
    { code: "ST-CONTACT-01", name: "Contact Form", sectionType: "CONTACT", sortOrder: 1, layoutJson: { rendererKey: "contact-form", defaultProps: { title: "Contact Us", subtitle: "Leave your details", buttonText: "Submit", styleMode: "theme" } }, schemaJson: { slots: ["title", "subtitle", "buttonText"] } },
    { code: "ST-RICH-TEXT-01", name: "Rich Text", sectionType: "RICH_TEXT", sortOrder: 1, layoutJson: { rendererKey: "rich-text", defaultProps: { title: "Text Section", body: "Rich text content", styleMode: "theme" } }, schemaJson: { slots: ["title", "body"] } },
    { code: "ST-IMAGE-01", name: "Image Showcase", sectionType: "IMAGE", sortOrder: 1, layoutJson: { rendererKey: "image-showcase", defaultProps: { imageUrl: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80", altText: "Showcase image", styleMode: "theme" } }, schemaJson: { slots: ["imageUrl", "altText"] } },
    { code: "ST-VIDEO-01", name: "Video Embed", sectionType: "VIDEO", sortOrder: 1, layoutJson: { rendererKey: "video-embed", defaultProps: { title: "Video", body: "Paste your video link", styleMode: "theme" } }, schemaJson: { slots: ["title", "body", "url"] } },
    { code: "ST-FORM-01", name: "Lead Form", sectionType: "FORM", sortOrder: 1, layoutJson: { rendererKey: "lead-form", defaultProps: { title: "Get in touch", subtitle: "We'll contact you soon", buttonText: "Send", styleMode: "theme" } }, schemaJson: { slots: ["title", "subtitle", "buttonText"] } },
    { code: "ST-PRODUCT-GRID-01", name: "Product Grid", sectionType: "PRODUCT_GRID", sortOrder: 1, layoutJson: { rendererKey: "product-grid", defaultProps: { title: "Products", sourceMode: "manual", itemLimit: 6, styleMode: "theme" } }, schemaJson: { slots: ["title", "items", "sourceMode", "itemLimit"] } },
    { code: "ST-BLOG-LIST-01", name: "Blog List", sectionType: "BLOG_LIST", sortOrder: 1, layoutJson: { rendererKey: "blog-list", defaultProps: { title: "Blog", sourceMode: "manual", itemLimit: 6, styleMode: "theme" } }, schemaJson: { slots: ["title", "sourceMode", "itemLimit"] } },
    { code: "ST-NEWS-LIST-01", name: "News List", sectionType: "NEWS_LIST", sortOrder: 1, layoutJson: { rendererKey: "news-list", defaultProps: { title: "News", sourceMode: "manual", itemLimit: 6, styleMode: "theme" } }, schemaJson: { slots: ["title", "sourceMode", "itemLimit"] } },
    { code: "ST-CUSTOM-01", name: "Custom Block", sectionType: "CUSTOM", sortOrder: 1, layoutJson: { rendererKey: "custom-block", defaultProps: { title: "Custom Section", description: "Custom content", styleMode: "theme" } }, schemaJson: { slots: ["title", "description"] } },
  ] as const;

  for (const blueprint of sectionTemplateBlueprints) {
    const saved = await prisma.sectionTemplate.upsert({
      where: { code: blueprint.code },
      update: {
        name: blueprint.name,
        sectionType: blueprint.sectionType as any,
        isOfficial: true,
        isPublished: true,
        sortOrder: blueprint.sortOrder,
        schemaJson: blueprint.schemaJson as any,
        layoutJson: blueprint.layoutJson as any,
      },
      create: {
        code: blueprint.code,
        name: blueprint.name,
        sectionType: blueprint.sectionType as any,
        isOfficial: true,
        isPublished: true,
        sortOrder: blueprint.sortOrder,
        schemaJson: blueprint.schemaJson as any,
        layoutJson: blueprint.layoutJson as any,
      },
    });

    const rendererKey =
      (blueprint.layoutJson as Record<string, any>).rendererKey ?? blueprint.code;
    const navbarLayoutMatch = /^ST-NAVBAR-(?:LUXE-01|MIN-01|0?[1-9]|10)$/.test(
      String(rendererKey),
    )
      ? String(rendererKey).match(/(\d+)$/)
      : null;
    const navbarLayout = navbarLayoutMatch ? Number(navbarLayoutMatch[1]) : null;
    const htmlTemplate =
      blueprint.sectionType === "NAVBAR" && navbarLayout
        ? navbarHtmlTemplate(navbarLayout)
        : null;
    const cssTemplate =
      blueprint.sectionType === "NAVBAR" && navbarLayout
        ? navbarCssTemplate(navbarLayout)
        : null;
    const renderMode = htmlTemplate ? "SAFE_HTML" : "STRUCTURED";

    const snapshot = {
      props:
        (blueprint.layoutJson as Record<string, any>).defaultProps ??
        {},
      schema: blueprint.schemaJson,
      rendererKey,
    };

    const latest = await prisma.sectionTemplateVersion.findFirst({
      where: {
        sectionTemplateId: saved.id,
        isActive: true,
      },
      orderBy: {
        version: "desc",
      },
    });

    const nextVersionPayload = JSON.stringify({
      snapshot,
      renderMode,
      htmlTemplate,
      cssTemplate,
    });
    const latestVersionPayload = latest
      ? JSON.stringify({
          snapshot: latest.snapshot,
          renderMode: latest.renderMode,
          htmlTemplate: latest.htmlTemplate,
          cssTemplate: latest.cssTemplate,
        })
      : null;

    if (latest && latestVersionPayload === nextVersionPayload) {
      continue;
    }

    await prisma.sectionTemplateVersion.updateMany({
      where: {
        sectionTemplateId: saved.id,
        isActive: true,
      },
      data: {
        isActive: false,
      },
    });

    await prisma.sectionTemplateVersion.create({
      data: {
        sectionTemplateId: saved.id,
        version: (latest?.version ?? 0) + 1,
        name: `v${(latest?.version ?? 0) + 1}`,
        renderMode: renderMode as any,
        htmlTemplate,
        cssTemplate,
        snapshot: snapshot as any,
        isActive: true,
      },
    });
  }

  console.log("✅ Section templates seeded successfully");

  const adminEmails = (process.env.ADMIN_EMAILS ?? process.env.ADMIN_EMAIL ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

  if (adminEmails.length > 0) {
    const result = await prisma.user.updateMany({
      where: {
        email: {
          in: adminEmails,
        },
      },
      data: {
        role: "ADMIN",
      },
    });

    console.log(`✅ Promoted ${result.count} admin user(s)`);
  }
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
