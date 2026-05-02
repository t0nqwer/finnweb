import type { ContentPack } from "../types/template-factory.types";

/**
 * Mala Restaurant — Thai hot-pot / mala spicy noodle restaurant
 * Locale: Thai (th)
 */
export const malaRestaurantThContentPack: ContentPack = {
  id: "mala-restaurant-th",
  name: "มาล่าร้านอาหาร (ไทย)",
  locale: "th",
  industry: "restaurant",
  placeholders: {
    businessName: "มาล่า เฮ้าส์",
    brandName: "มาล่า เฮ้าส์",
    businessType: "ร้านมาล่า ชาบู",
    phone: "081-234-5678",
    lineId: "@malahouse",
    lineUrl: "https://line.me/R/ti/p/@malahouse",
    logoUrl: "",
  },
  pages: [
    {
      key: "home",
      title: "มาล่า เฮ้าส์ — รสเผ็ดระดับ All-in",
      seoTitle: "มาล่า เฮ้าส์ | ชาบูมาล่าสุดเผ็ด",
      seoDescription:
        "มาล่า เฮ้าส์ ร้านชาบูมาล่าต้นตำรับ วัตถุดิบสด เลือกระดับความเผ็ดได้ตามใจ",
      seoKeywords: "มาล่า,ชาบู,ร้านอาหาร,เผ็ด,มาล่าเฮ้าส์",
      sections: {
        navbar: {
          brandName: "มาล่า เฮ้าส์",
          menuItems: [
            { label: "หน้าหลัก", href: "/" },
            { label: "เมนูมาล่า", href: "#menu" },
            { label: "สาขาและที่อยู่", href: "#contact" },
          ],
        },
        hero: {
          eyebrow: "ร้านชาบูมาล่า",
          title: "เผ็ดได้ใจ บรรยากาศดีมาก",
          subtitle: "วัตถุดิบสดใหม่ทุกวัน เลือกระดับความเผ็ด 1–10 ได้ตามใจชอบ",
          buttonText: "ดูเมนู & ราคา",
          buttonHref: "#menu",
          imageUrl: "",
        },
        features: {
          title: "ทำไมต้องมาที่ มาล่า เฮ้าส์",
          items: [
            {
              icon: "flame",
              title: "เผ็ดเต็มระดับ 10 ขั้น",
              body: "ปรับความเผ็ดได้ตั้งแต่ไม่เผ็ดจนถึงเผ็ดสุดฤทธิ์",
            },
            {
              icon: "leaf",
              title: "วัตถุดิบสดทุกวัน",
              body: "เนื้อ หมู ผัก เห็ด คัดสรรมาใหม่ทุกเช้า",
            },
            {
              icon: "users",
              title: "เหมาะกับมาเป็นกลุ่ม",
              body: "โซนกว้าง รองรับกลุ่มใหญ่ สังสรรค์สนุก",
            },
          ],
        },
        gallery: {
          title: "บรรยากาศร้านและอาหาร",
          items: [],
        },
        testimonials: {
          title: "ลูกค้าบอกว่าอย่างนี้เอง",
          items: [
            {
              name: "คุณนภา",
              rating: 5,
              text: "เผ็ดจัดมาก แต่กินแล้วติดใจ มาซ้ำทุกเดือนเลย!",
            },
            {
              name: "คุณมิน",
              rating: 5,
              text: "วัตถุดิบสดมาก ซุปมาล่าเข้มข้น ชอบมากค่ะ",
            },
          ],
        },
        contact: {
          title: "มาหาเราได้เลย",
          subtitle: "โทรสำรองโต๊ะล่วงหน้าหรือสอบถามผ่าน LINE",
          phone: "{{phone}}",
          lineId: "{{lineId}}",
          address: "123 ถนนสุขุมวิท กรุงเทพมหานคร 10110",
          mapUrl: "",
        },
        footer: {
          brandName: "{{businessName}}",
          tagline: "เผ็ด จัด สด ทุกวัน",
          phone: "{{phone}}",
        },
      },
    },
  ],
};
