// app/page.tsx
import Link from "next/link";

export default function Home() {
  return (
    <main className="bg-[#0B0B0F] text-white min-h-screen font-sans selection:bg-orange-500 selection:text-white">
      {/* 1. HERO SECTION */}
      <section className="relative pt-24 pb-20 px-6 max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-12 overflow-hidden">
        <div className="absolute right-6 top-6 z-20 flex gap-3">
          <Link
            href="/login"
            className="rounded-xl border border-gray-700 px-4 py-2 text-sm font-semibold text-gray-200 transition-colors hover:border-white hover:text-white"
          >
            เข้าสู่ระบบ
          </Link>
          <Link
            href="/register"
            className="rounded-xl bg-[#FF5A1F] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#e04a15]"
          >
            สมัครใช้งาน
          </Link>
        </div>
        {/* Background Glow */}
        <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-orange-500/20 blur-[120px] rounded-full -z-10 pointer-events-none"></div>

        {/* Text Content */}
        <div className="flex-1 text-center md:text-left z-10">
          <h1 className="text-5xl md:text-6xl font-bold leading-tight mb-4">
            สร้างเว็บไซต์ <br />
            <span className="text-[#FF5A1F]">ปิดการขายใน 5 นาที!</span>
          </h1>
          <p className="text-gray-400 text-lg mb-8 max-w-lg mx-auto md:mx-0">
            แพลตฟอร์มทำเว็บสำเร็จรูปสำหรับร้านค้าและ SME (FinnWeb is a
            subscription-based SaaS platform that helps you build landing pages
            and websites without coding.)
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center md:justify-start gap-4">
            <Link
              href="/register?plan=BASIC"
              className="w-full rounded-xl bg-gradient-to-r from-[#FF5A1F] to-[#ff7b4b] px-8 py-4 text-center text-lg font-bold shadow-[0_0_20px_rgba(255,90,31,0.4)] transition-all hover:from-[#e04a15] hover:to-[#ff5a1f] sm:w-auto"
            >
              เริ่มต้นเพียง 250 บาท/เดือน
            </Link>
            <div className="flex w-full gap-4 sm:w-auto">
              <Link
                href="/register"
                className="flex-1 rounded-xl border border-gray-600 px-6 py-4 text-center font-semibold transition-colors hover:border-white sm:flex-none"
              >
                เริ่มใช้งานฟรี
              </Link>
              <Link
                href="/dashboard"
                className="flex-1 rounded-xl border border-gray-600 px-6 py-4 text-center font-semibold transition-colors hover:border-white sm:flex-none"
              >
                ดูตัวอย่างเว็บไซต์
              </Link>
            </div>
          </div>
        </div>

        {/* Hero Image Placeholder */}
        <div className="flex-1 w-full relative z-10">
          <div className="aspect-video bg-gradient-to-br from-gray-800 to-[#141419] rounded-2xl border border-gray-700 shadow-2xl flex items-center justify-center relative overflow-hidden">
            {/* Replace with your actual dashboard/laptop image */}
            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=2426&auto=format&fit=crop')] bg-cover bg-center opacity-40 mix-blend-overlay"></div>
            <p className="text-gray-400 font-semibold z-10">
              Hero Image / Dashboard Mockup
            </p>
          </div>
        </div>
      </section>

      {/* 2. FEATURES SECTION (Light Mode) */}
      <section
        id="features"
        className="bg-white text-[#0B0B0F] py-24 px-6 relative"
      >
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">
            ทำเว็บสวย ขายดี <span className="text-[#FF5A1F]">ในไม่กี่คลิก</span>
          </h2>

          <div className="grid md:grid-cols-3 gap-12 text-center">
            {/* Feature 1 */}
            <div className="flex flex-col items-center">
              <div className="w-20 h-20 rounded-full bg-orange-100 flex items-center justify-center mb-6 text-[#FF5A1F]">
                <svg
                  className="w-10 h-10"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3">สร้างง่ายใน 5 นาที</h3>
              <p className="text-gray-600">
                เทมเพลตพร้อมใช้ ปรับแต่งได้ตามใจคุณ
              </p>
            </div>

            {/* Feature 2 */}
            <div className="flex flex-col items-center">
              <div className="w-20 h-20 rounded-full bg-orange-100 flex items-center justify-center mb-6 text-[#FF5A1F]">
                <svg
                  className="w-10 h-10"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3">
                พร้อมเชื่อมต่อการชำระเงิน
              </h3>
              <p className="text-gray-600">
                รองรับการรูดบัตร ตัดบัตรเครดิตทุกธนาคาร
              </p>
            </div>

            {/* Feature 3 */}
            <div className="flex flex-col items-center">
              <div className="w-20 h-20 rounded-full bg-orange-100 flex items-center justify-center mb-6 text-[#FF5A1F]">
                <svg
                  className="w-10 h-10"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3">รองรับทุกอุปกรณ์</h3>
              <p className="text-gray-600">
                แสดงผลสวยงามทุกหน้าจอ มือถือ แท็บเล็ต
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. PRICING SECTION (Dark Mode with Glow) */}
      <section
        id="pricing"
        className="py-24 px-6 text-center relative overflow-hidden"
      >
        {/* Background glowing lines */}
        <div className="absolute inset-0 flex items-center justify-center opacity-30 pointer-events-none">
          <div className="w-[800px] h-[300px] bg-[#FF5A1F] blur-[150px] rounded-[100%]"></div>
        </div>

        <div className="max-w-6xl mx-auto relative z-10">
          <h2 className="text-3xl md:text-4xl font-bold mb-2">
            ฟีเจอร์เด็ด <span className="text-[#FF5A1F]">เพื่อการขาย</span>
          </h2>
          <p className="text-gray-400 mb-16">
            เลือกแพ็กเกจที่ใช่ สำหรับธุรกิจคุณ
          </p>

          <div className="grid md:grid-cols-3 gap-8 items-end max-w-5xl mx-auto">
            {/* Basic Plan */}
            <div className="bg-[#141419] rounded-2xl border border-gray-800 text-left overflow-hidden">
              <div className="p-8 pb-6 border-b border-gray-800">
                <h3 className="text-2xl font-bold mb-2">⚡ Basic</h3>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold">250</span>
                  <span className="text-gray-400">บาท/เดือน</span>
                </div>
              </div>
              <div className="p-8 bg-[#1A1A24] space-y-4">
                <p className="flex items-center gap-3">
                  <span className="text-[#FF5A1F]">✔</span> 1 เว็บไซต์
                </p>
                <p className="flex items-center gap-3">
                  <span className="text-[#FF5A1F]">✔</span> รองรับทุกอุปกรณ์
                </p>
                <p className="flex items-center gap-3">
                  <span className="text-[#FF5A1F]">✔</span>{" "}
                  เชื่อมต่อเครื่องมือการตลาด
                </p>
                <Link
                  href="/register?plan=BASIC"
                  className="mt-6 block w-full rounded-xl border border-[#FF5A1F] py-3 text-center font-bold text-white transition-colors hover:bg-[#FF5A1F]"
                >
                  เลือก Basic
                </Link>
              </div>
            </div>

            {/* Pro Plan (Highlighted) */}
            <div className="bg-[#141419] rounded-2xl border-2 border-[#FF5A1F] text-left relative transform md:-translate-y-4 shadow-[0_0_30px_rgba(255,90,31,0.2)] overflow-hidden">
              <div className="bg-gradient-to-r from-[#FF5A1F] to-[#ff7b4b] p-8 pb-6 text-center">
                <h3 className="text-2xl font-bold mb-2 text-white">
                  Pro{" "}
                  <span className="text-sm font-normal bg-white/20 px-2 py-1 rounded ml-2">
                    แนะนำ
                  </span>
                </h3>
                <div className="flex items-baseline justify-center gap-2 text-white">
                  <span className="text-5xl font-bold">490</span>
                  <span className="text-white/80">บาท/เดือน</span>
                </div>
              </div>
              <div className="p-8 bg-[#1A1A24] space-y-4">
                <p className="flex items-center gap-3">
                  <span className="text-[#FF5A1F]">✔</span> 3 เว็บไซต์
                </p>
                <p className="flex items-center gap-3">
                  <span className="text-[#FF5A1F]">✔</span> รองรับทุกอุปกรณ์
                </p>
                <p className="flex items-center gap-3">
                  <span className="text-[#FF5A1F]">✔</span>{" "}
                  เชื่อมต่อเครื่องมือการตลาดครบชุด
                </p>
                <Link
                  href="/register?plan=BUSINESS"
                  className="mt-6 block w-full rounded-xl bg-[#FF5A1F] py-3 text-center font-bold text-white transition-colors hover:bg-[#e04a15]"
                >
                  เริ่มใช้งานทันที
                </Link>
              </div>
            </div>

            {/* Ultimate Plan */}
            <div className="bg-[#141419] rounded-2xl border border-gray-800 text-left overflow-hidden">
              <div className="p-8 pb-6 border-b border-gray-800">
                <h3 className="text-2xl font-bold mb-2">Ultimate</h3>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold">990</span>
                  <span className="text-gray-400">บาท/เดือน</span>
                </div>
              </div>
              <div className="p-8 bg-[#1A1A24] space-y-4">
                <p className="flex items-center gap-3">
                  <span className="text-[#FF5A1F]">✔</span> ไม่จำกัดเว็บไซต์
                </p>
                <p className="flex items-center gap-3">
                  <span className="text-[#FF5A1F]">✔</span> รองรับทุกอุปกรณ์
                </p>
                <p className="flex items-center gap-3">
                  <span className="text-[#FF5A1F]">✔</span> ผู้ดูแลระบบส่วนตัว
                  (VIP Support)
                </p>
                <Link
                  href="/register?plan=PRO"
                  className="mt-6 block w-full rounded-xl border border-[#FF5A1F] py-3 text-center font-bold text-white transition-colors hover:bg-[#FF5A1F]"
                >
                  เลือก Ultimate
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. TESTIMONIALS SECTION (Light Mode) */}
      <section className="bg-white text-[#0B0B0F] py-24 px-6 relative">
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-16">
            เสียงจากลูกค้าของเรา
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Testimonial 1 */}
            <div className="bg-gray-50 p-8 rounded-2xl shadow-sm border border-gray-100 text-left relative pt-12">
              <div className="absolute -top-8 left-8 w-16 h-16 rounded-full bg-gray-300 border-4 border-white overflow-hidden">
                <img
                  src="https://i.pravatar.cc/150?img=11"
                  alt="User"
                  className="w-full h-full object-cover"
                />
              </div>
              <p className="text-orange-500 font-serif text-4xl leading-none absolute top-10 left-4">
                “
              </p>
              <p className="text-gray-700 italic mb-6 relative z-10 pl-4">
                สุดยอดแอปทำเว็บเลย! ทำง่ายมาก ตั้งแต่เริ่มใช้
                ยอดสั่งซื้อเพิ่มขึ้นเยอะมากครับ
              </p>
              <p className="font-bold">- คุณภัทรภูมิ</p>
              <p className="text-sm text-gray-500">เจ้าของร้านเสื้อผ้า</p>
            </div>

            {/* Testimonial 2 */}
            <div className="bg-gray-50 p-8 rounded-2xl shadow-sm border border-gray-100 text-left relative pt-12">
              <div className="absolute -top-8 left-8 w-16 h-16 rounded-full bg-gray-300 border-4 border-white overflow-hidden">
                <img
                  src="https://i.pravatar.cc/150?img=5"
                  alt="User"
                  className="w-full h-full object-cover"
                />
              </div>
              <p className="text-orange-500 font-serif text-4xl leading-none absolute top-10 left-4">
                “
              </p>
              <p className="text-gray-700 italic mb-6 relative z-10 pl-4">
                เว็บไวมากจ้า ระบบเสถียรสุดๆ เสียเงิน Ads ไปก็ไม่เสียเปล่า
                คุ้มสุดๆ
              </p>
              <p className="font-bold">- คุณเจนนิสา</p>
              <p className="text-sm text-gray-500">แม่ค้าออนไลน์</p>
            </div>

            {/* Testimonial 3 */}
            <div className="bg-gray-50 p-8 rounded-2xl shadow-sm border border-gray-100 text-left relative pt-12">
              <div className="absolute -top-8 left-8 w-16 h-16 rounded-full bg-gray-300 border-4 border-white overflow-hidden">
                <img
                  src="https://i.pravatar.cc/150?img=32"
                  alt="User"
                  className="w-full h-full object-cover"
                />
              </div>
              <p className="text-orange-500 font-serif text-4xl leading-none absolute top-10 left-4">
                “
              </p>
              <p className="text-gray-700 italic mb-6 relative z-10 pl-4">
                ทำเองง่ายๆ ไม่ต้องจ้างโปรแกรมเมอร์ ประหยัดงบ แนะนำเลยค่ะ
              </p>
              <p className="font-bold">- คุณดวงกมล</p>
              <p className="text-sm text-gray-500">ธุรกิจความงาม</p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. BOTTOM CTA SECTION */}
      <section className="py-24 px-6 text-center relative overflow-hidden bg-gradient-to-b from-[#0B0B0F] to-[#1a100c]">
        {/* Glow Effects */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[1000px] h-[300px] bg-orange-500/20 blur-[150px] rounded-[100%] pointer-events-none"></div>

        <div className="relative z-10 max-w-3xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            พร้อมสร้าง <span className="text-[#FF5A1F]">เว็บไซต์ขายดี</span>{" "}
            หรือยัง?
          </h2>
          <p className="text-gray-400 text-lg mb-10">
            เริ่มต้นทดลองใช้ฟรี ไม่มีค่าใช้จ่ายแอบแฝง
          </p>
          <Link
            href="/register"
            className="inline-block rounded-xl bg-[#FF5A1F] px-12 py-5 text-xl font-bold text-white shadow-[0_0_20px_rgba(255,90,31,0.5)] transition-colors hover:bg-[#e04a15]"
          >
            เริ่มใช้งานฟรี
          </Link>

          <div className="mt-12 flex justify-center items-center gap-6 text-gray-400 text-sm">
            <span className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15h-2v-6h2v6zm-1-7c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm5 7h-2v-3c0-.55-.45-1-1-1s-1 .45-1 1v3h-2v-6h2v1.1c.36-.67 1.2-1.1 2-1.1 1.66 0 3 1.34 3 3v4z" />
              </svg>
              LINE
            </span>
            <span className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm3 10h-2v6h-2v-6H9v-2h2V8.5c0-1.5 1-2.5 2.5-2.5H15v2h-1c-.55 0-1 .45-1 1v1h2l-.5 2z" />
              </svg>
              Facebook Ads
            </span>
          </div>
        </div>
      </section>

      {/* 6. FOOTER */}
      <footer className="border-t border-gray-800 bg-[#0B0B0F] py-8 px-6 text-center text-sm text-gray-500 relative z-10">
        <div className="flex flex-wrap justify-center gap-6 mb-4">
          <Link href="/landing" className="hover:text-white transition-colors">
            หน้าแรก
          </Link>
          <Link
            href="/landing#features"
            className="hover:text-white transition-colors"
          >
            ฟีเจอร์
          </Link>
          <Link
            href="/landing#pricing"
            className="hover:text-white transition-colors"
          >
            แพ็กเกจราคา
          </Link>
          <Link href="/register" className="hover:text-white transition-colors">
            สมัครใช้งาน
          </Link>
          <Link
            href="/subscription"
            className="hover:text-white transition-colors"
          >
            Subscription
          </Link>
        </div>
        <p>© {new Date().getFullYear()} FinnWeb. All rights reserved.</p>
      </footer>
    </main>
  );
}
