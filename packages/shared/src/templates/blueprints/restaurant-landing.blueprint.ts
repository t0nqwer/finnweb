import type { TemplateBlueprint } from "../types/template-factory.types";

/**
 * Restaurant Landing Page blueprint.
 *
 * Structure (single page):
 *   1. NAVBAR       — brand + nav links
 *   2. HERO         — hero headline + CTA
 *   3. FEATURE      — key highlights / selling points
 *   4. GALLERY      — food / atmosphere photos
 *   5. TESTIMONIAL  — customer reviews
 *   6. CONTACT      — location + contact info
 *   7. FOOTER       — brand + social links
 *
 * All `defaultProps` use {{placeholder}} tokens so the content-pack or
 * placeholder resolver can substitute real values.
 */
export const restaurantLandingBlueprint: TemplateBlueprint = {
  id: "restaurant-landing-v1",
  name: "Restaurant Landing Page",
  industry: "restaurant",
  pages: [
    {
      key: "home",
      title: "{{businessName}}",
      slug: "home",
      path: "/",
      pageType: "LANDING",
      isHomePage: true,
      isPublished: false,
      sortOrder: 0,
      sections: [
        {
          key: "navbar",
          type: "NAVBAR",
          name: "Navbar",
          sortOrder: 0,
          isVisible: true,
          defaultProps: {
            brandName: "{{businessName}}",
            logoUrl: "{{logoUrl}}",
            menuItems: [
              { label: "หน้าหลัก", href: "/" },
              { label: "เมนู", href: "#menu" },
              { label: "ติดต่อ", href: "#contact" },
            ],
          },
        },
        {
          key: "hero",
          type: "HERO",
          name: "Hero",
          sortOrder: 1,
          isVisible: true,
          defaultProps: {
            eyebrow: "{{businessType}}",
            title: "ยินดีต้อนรับสู่ {{businessName}}",
            subtitle: "สัมผัสประสบการณ์การรับประทานอาหารที่ไม่เหมือนใคร",
            buttonText: "ดูเมนูของเรา",
            buttonHref: "#menu",
            imageUrl: "",
          },
        },
        {
          key: "features",
          type: "FEATURE",
          name: "Highlights",
          sortOrder: 2,
          isVisible: true,
          defaultProps: {
            title: "ทำไมถึงต้องมาที่ {{businessName}}",
            items: [
              {
                icon: "utensils",
                title: "วัตถุดิบสด",
                body: "คัดสรรวัตถุดิบสดใหม่ทุกวัน",
              },
              {
                icon: "star",
                title: "รสชาติต้นตำรับ",
                body: "สูตรลับที่สืบทอดมาหลายชั่วอายุ",
              },
              {
                icon: "clock",
                title: "บริการรวดเร็ว",
                body: "รอไม่นาน อาหารร้อนเสิร์ฟถึงโต๊ะ",
              },
            ],
          },
        },
        {
          key: "gallery",
          type: "GALLERY",
          name: "Gallery",
          sortOrder: 3,
          isVisible: true,
          defaultProps: {
            title: "แกลเลอรี",
            items: [],
          },
        },
        {
          key: "testimonials",
          type: "TESTIMONIAL",
          name: "Reviews",
          sortOrder: 4,
          isVisible: true,
          defaultProps: {
            title: "เสียงจากลูกค้าของเรา",
            items: [],
          },
        },
        {
          key: "contact",
          type: "CONTACT",
          name: "Contact",
          sortOrder: 5,
          isVisible: true,
          defaultProps: {
            title: "ติดต่อเรา",
            subtitle: "โทรสำรองโต๊ะหรือสอบถามข้อมูลเพิ่มเติม",
            phone: "{{phone}}",
            lineId: "{{lineId}}",
            address: "",
            mapUrl: "",
          },
        },
        {
          key: "footer",
          type: "FOOTER",
          name: "Footer",
          sortOrder: 6,
          isVisible: true,
          defaultProps: {
            brandName: "{{businessName}}",
            tagline: "ยินดีต้อนรับทุกวัน",
            phone: "{{phone}}",
          },
        },
      ],
    },
  ],
};

export const allBlueprints = [restaurantLandingBlueprint];
