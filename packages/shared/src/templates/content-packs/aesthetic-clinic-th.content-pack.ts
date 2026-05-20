import type { ContentPack } from "../types/template-factory.types";

export const aestheticClinicThContentPack: ContentPack = {
  id: "aesthetic-clinic-th",
  name: "คลินิกความงามพรีเมียม (ไทย)",
  locale: "th",
  industry: "clinic",
  placeholders: {
    businessName: "Lunara Aesthetic Clinic",
    brandName: "Lunara Aesthetic Clinic",
    businessType: "คลินิกความงาม",
    phone: "092-456-8899",
    lineId: "@lunara.clinic",
    lineUrl: "https://line.me/R/ti/p/@lunara.clinic",
    logoUrl: "",
  },
  pages: [
    {
      key: "home",
      title: "Lunara Aesthetic Clinic",
      seoTitle: "Lunara Aesthetic Clinic | คลินิกความงามพรีเมียม",
      seoDescription:
        "ปรึกษาผิวและรูปหน้ากับทีมแพทย์ วางแผนเฉพาะบุคคล นัดคิวผ่าน LINE ได้ทันที",
      seoKeywords:
        "คลินิกความงาม,ปรับรูปหน้า,ดูแลผิว,เลเซอร์หน้าใส,ฟิลเลอร์,โบท็อกซ์",
      sections: {
        navbar: {
          brandName: "Lunara Clinic",
          buttonText: "จองคิวผ่าน LINE",
        },
        hero: {
          eyebrow: "Aesthetic Clinic Bangkok",
          title: "ผิวละเอียดขึ้น รูปหน้าดูละมุน โดยไม่เสียความเป็นตัวเอง",
          subtitle:
            "Lunara ดูแลแบบ private consultation ประเมินจากโครงหน้า ผิว และไลฟ์สไตล์จริง ก่อนแนะนำหัตถการที่เหมาะกับคุณ",
          buttonText: "ปรึกษาแพทย์ทาง LINE",
          imageUrl:
            "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=1600&q=85",
        },
        services: {
          title: "โปรแกรมยอดนิยมสำหรับลูกค้าที่ต้องการผลลัพธ์พรีเมียม",
          items: [
            {
              title: "Skin Reset Program",
              body: "ฟื้นผิวหมองคล้ำ รอยแดง และผิวไม่เรียบ ด้วยแผนดูแล 4-6 สัปดาห์",
            },
            {
              title: "Natural Lift & Contour",
              body: "ปรับกรอบหน้าให้คมขึ้นแบบไม่แข็ง เน้นความละมุนและสมดุลของใบหน้า",
            },
            {
              title: "Bright Laser Signature",
              body: "เลเซอร์หน้าใส ลดจุดด่างดำ พร้อมคำแนะนำการดูแลหลังทำแบบละเอียด",
            },
          ],
        },
        story: {
          title: "ทุกเคสเริ่มจากการประเมิน ไม่เริ่มจากการขาย",
          subtitle:
            "คุณจะได้รับแผนดูแลที่รู้ว่าควรทำอะไร ก่อน หลัง และคาดหวังผลลัพธ์ได้แค่ไหน",
          items: [
            {
              eyebrow: "01",
              title: "วิเคราะห์ผิวและรูปหน้า",
              description: "ถ่ายภาพ ประเมินปัญหาหลัก และฟังเป้าหมายของลูกค้า",
              imageUrl:
                "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=1200&q=85",
            },
            {
              eyebrow: "02",
              title: "วางแผนเฉพาะบุคคล",
              description: "จัดลำดับหัตถการที่จำเป็น พร้อมช่วงเวลาและงบประมาณชัดเจน",
              imageUrl:
                "https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?auto=format&fit=crop&w=1200&q=85",
            },
            {
              eyebrow: "03",
              title: "ติดตามผลหลังทำ",
              description: "ดูแลหลังบริการผ่าน LINE พร้อมนัดติดตามเมื่อถึงช่วงสำคัญ",
              imageUrl:
                "https://images.unsplash.com/photo-1600334129128-685c5582fd35?auto=format&fit=crop&w=1200&q=85",
            },
          ],
        },
        gallery: {
          title: "พื้นที่ดูแลที่สงบ สะอาด และเป็นส่วนตัว",
          subtitle:
            "ทุกภาพช่วยให้ลูกค้าเห็นบรรยากาศจริงก่อนตัดสินใจจองคิว",
          items: [
            {
              title: "Private consultation room",
              imageUrl:
                "https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&w=1200&q=85",
            },
            {
              title: "Skin treatment detail",
              imageUrl:
                "https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?auto=format&fit=crop&w=1200&q=85",
            },
            {
              title: "Calm recovery corner",
              imageUrl:
                "https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&w=1200&q=85",
            },
          ],
        },
        testimonials: {
          title: "ลูกค้าเลือกกลับมาดูแลต่อ เพราะผลลัพธ์ดูเป็นธรรมชาติ",
          score: "4.9",
          highlight: "คะแนนความพึงพอใจจากลูกค้าที่นัดติดตามผลต่อเนื่อง",
          items: [
            {
              author: "คุณมายด์",
              role: "Skin Reset Program",
              quote:
                "ทีมแพทย์อธิบายละเอียดมาก ไม่เร่งขายคอร์ส ผิวค่อย ๆ ดีขึ้นและแต่งหน้าน้อยลงจริงค่ะ",
            },
            {
              author: "คุณแพรว",
              role: "Natural Lift",
              quote:
                "ชอบที่หน้าไม่เปลี่ยนจนคนทักแปลก ๆ แต่ดูสดขึ้น กรอบหน้าชัดขึ้นแบบพอดี",
            },
            {
              author: "คุณออม",
              role: "Bright Laser",
              quote:
                "หลังทำมีวิธีดูแลส่งให้ทาง LINE ครบ รู้สึกปลอดภัยและติดตามผลง่ายมาก",
            },
          ],
        },
        faq: {
          title: "คำถามก่อนจองคิว",
          sideTitle: "ยังไม่แน่ใจว่าควรเริ่มจากอะไร",
          sideText: "ส่งรูปหรือเล่าปัญหาผิวมาทาง LINE ทีมงานช่วยคัดกรองเบื้องต้นได้",
          buttonText: "ถามทาง LINE",
          items: [
            {
              question: "ต้องจองคิวล่วงหน้ากี่วัน",
              answer:
                "แนะนำจองล่วงหน้า 2-3 วัน โดยเฉพาะช่วงเย็นและวันเสาร์ ทีมงานจะแจ้งช่วงเวลาว่างทาง LINE",
            },
            {
              question: "ปรึกษาก่อนทำมีค่าใช้จ่ายไหม",
              answer:
                "การประเมินเบื้องต้นผ่าน LINE ไม่มีค่าใช้จ่าย หากต้องตรวจละเอียดที่คลินิกจะแจ้งเงื่อนไขก่อนนัดเสมอ",
            },
            {
              question: "หลังทำมีคนติดตามผลไหม",
              answer:
                "มีค่ะ ทีมงานส่งคำแนะนำหลังทำและติดตามอาการในช่วงเวลาที่เหมาะสมกับบริการนั้น ๆ",
            },
          ],
        },
        contact: {
          title: "เริ่มด้วยการส่งรูปหรือทักมาถามช่วงคิว",
          subtitle:
            "ทีมงานตอบเป็นภาษาไทย เข้าใจง่าย พร้อมแนะนำขั้นตอนก่อนเข้ารับบริการ",
          buttonText: "จองคิวผ่าน LINE",
        },
        footer: {
          brandName: "Lunara Aesthetic Clinic",
          tagline:
            "ดูแลผิวและรูปหน้าอย่างตรงไปตรงมา พร้อมติดตามผลหลังบริการทุกเคส",
        },
      },
    },
  ],
};
