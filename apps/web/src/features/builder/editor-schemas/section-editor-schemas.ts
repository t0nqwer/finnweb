export type EditableField = {
  key: string;
  label: string;
  placeholder: string;
  multiline?: boolean;
};

export function getEditableFields(type: string): EditableField[] {
  switch (type) {
    case "NAVBAR":
      return [];

    case "FOOTER":
      return [{ key: "logo", label: "โลโก้ (URL)", placeholder: "https://..." }];

    case "BOOKING":
      return [
        { key: "title", label: "หัวข้อจองคิว", placeholder: "เช่น จองเวลานัดหมาย" },
        {
          key: "submitLabel",
          label: "ข้อความปุ่มส่ง",
          placeholder: "เช่น ส่งคำขอจอง",
        },
        {
          key: "calendarMode",
          label: "โหมดปฏิทิน",
          placeholder: "embedded | external | manual",
        },
      ];

    case "COMPARISON":
      return [{ key: "title", label: "หัวข้อเปรียบเทียบ", placeholder: "เช่น เทียบแพ็กเกจ" }];

    case "HERO":
      return [
        {
          key: "title",
          label: "หัวข้อหลัก",
          placeholder: "เช่น โตไวด้วยเว็บที่พร้อมขาย",
        },
        {
          key: "subtitle",
          label: "คำอธิบาย",
          placeholder: "เช่น สร้างหน้าเว็บสวยๆ ได้เองในไม่กี่นาที",
          multiline: true,
        },
        {
          key: "buttonText",
          label: "ข้อความบนปุ่ม",
          placeholder: "เช่น เริ่มทดลองใช้ฟรี",
        },
      ];

    case "CTA":
      return [
        {
          key: "title",
          label: "หัวข้อชวนตัดสินใจ",
          placeholder: "เช่น พร้อมเริ่มรับลูกค้าเพิ่มแล้วหรือยัง",
        },
        {
          key: "subtitle",
          label: "คำอธิบายเพิ่มเติม",
          placeholder: "เช่น สร้างหน้าเว็บแล้วเริ่มยิงแอดได้เลย",
          multiline: true,
        },
      ];

    case "IMAGE":
      return [
        { key: "imageUrl", label: "ลิงก์รูปภาพ", placeholder: "https://..." },
        {
          key: "altText",
          label: "คำอธิบายรูปภาพ",
          placeholder: "เช่น ตัวอย่างหน้าเว็บไซต์ของลูกค้า",
        },
      ];

    case "FORM":
    case "CONTACT":
      return [
        {
          key: "title",
          label: "หัวข้อฟอร์ม",
          placeholder: "เช่น สนใจบริการนี้",
        },
        {
          key: "subtitle",
          label: "คำแนะนำก่อนกรอก",
          placeholder: "เช่น ฝากข้อมูลไว้แล้วทีมงานจะติดต่อกลับ",
          multiline: true,
        },
        {
          key: "buttonText",
          label: "ข้อความปุ่มส่ง",
          placeholder: "เช่น ส่งข้อมูล",
        },
      ];

    case "RICH_TEXT":
    case "ABOUT":
    case "FEATURE":
    case "FAQ":
      return [
        {
          key: "title",
          label: "หัวข้อเนื้อหา",
          placeholder: "เช่น จุดเด่นของบริการ",
        },
        {
          key: "body",
          label: "เนื้อหา",
          placeholder: "เขียนเนื้อหาที่ต้องการแสดงในส่วนนี้",
          multiline: true,
        },
      ];

    default:
      return [
        { key: "title", label: "หัวข้อ", placeholder: "ใส่หัวข้อของ section" },
        {
          key: "description",
          label: "คำอธิบาย",
          placeholder: "ใส่คำอธิบายของ section",
          multiline: true,
        },
      ];
  }
}
