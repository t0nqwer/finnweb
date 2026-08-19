import type { ContentPack } from "../types/template-factory.types";

/**
 * Cafe — specialty coffee shop / dessert café
 * Locale: Thai (th)
 */
export const cafeThContentPack: ContentPack = {
  id: "cafe-th",
  name: "คาเฟ่ (ไทย)",
  locale: "th",
  industry: "restaurant",
  placeholders: {
    businessName: "Bloom Café",
    brandName: "Bloom Café",
    businessType: "คาเฟ่และร้านกาแฟ",
    phone: "091-876-5432",
    lineId: "@bloomcafe",
    lineUrl: "https://line.me/R/ti/p/@bloomcafe",
    logoUrl: "",
  },
  pages: [
    {
      key: "home",
      title: "Bloom Café — กาแฟดี บรรยากาศดี",
      seoTitle: "Bloom Café | คาเฟ่อบอุ่น บรรยากาศดี",
      seoDescription:
        "Bloom Café คาเฟ่เปิดใหม่ กาแฟสด เบเกอรี่โฮมเมด บรรยากาศอบอุ่น ถ่ายรูปสวย",
      seoKeywords: "คาเฟ่,กาแฟ,เบเกอรี่,bloom café,ร้านกาแฟ",
      sections: {
        navbar: {
          brandName: "Bloom Café",
          menuItems: [
            { label: "หน้าหลัก", href: "/" },
            { label: "เมนู", href: "#menu" },
            { label: "ติดต่อ", href: "#contact" },
          ],
        },
        hero: {
          eyebrow: "คาเฟ่และร้านกาแฟ",
          title: "รสกาแฟดี บรรยากาศแสนอบอุ่น",
          subtitle:
            "เมล็ดกาแฟคุณภาพ บาริสต้ามือโปร เบเกอรี่อบสดทุกเช้า ยินดีต้อนรับทุกเวลา",
          buttonText: "ดูเมนูเครื่องดื่ม",
          buttonHref: "#menu",
        },
        features: {
          title: "เหตุผลที่ Bloom Café ไม่เหมือนที่อื่น",
          items: [
            {
              icon: "coffee",
              title: "กาแฟสดคุณภาพพรีเมียม",
              body: "คัดเมล็ดกาแฟจากไร่ชั้นนำทั่วไทยและต่างประเทศ",
            },
            {
              icon: "cake",
              title: "เบเกอรี่โฮมเมด",
              body: "อบสดใหม่ทุกวัน ไม่มีแป้งสำเร็จรูป",
            },
            {
              icon: "camera",
              title: "บรรยากาศถ่ายรูปสวย",
              body: "ตกแต่งคัดสรร เหมาะเช็คอิน & ถ่ายภาพ",
            },
          ],
        },
        gallery: {
          title: "มุมสวยๆ ใน Bloom Café",
          items: [],
        },
        testimonials: {
          title: "รีวิวจากลูกค้าประจำ",
          items: [
            {
              name: "คุณแนน",
              rating: 5,
              text: "บรรยากาศดีมาก กาแฟหอมสุดๆ แวะมาทุกสัปดาห์",
            },
            {
              name: "คุณเจน",
              rating: 5,
              text: "Croissant อร่อยมาก เนยหอม กรอบนอกนุ่มใน ชอบมากเลย",
            },
          ],
        },
        contact: {
          title: "หาเราเจอนะ",
          subtitle: "เปิดทุกวัน 08:00–20:00 สอบถามผ่าน LINE ได้เลย",
          phone: "{{phone}}",
          lineId: "{{lineId}}",
          address: "45 ซอยอารีย์ 1 กรุงเทพมหานคร 10400",
          mapUrl: "",
        },
        footer: {
          brandName: "{{businessName}}",
          tagline: "กาแฟดี วันดี ทุกวัน",
          phone: "{{phone}}",
        },
      },
    },
  ],
};
