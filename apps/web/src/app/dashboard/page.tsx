import { AppPageShell } from "@/components/app-page-shell";
import { DashboardHomeContent } from "@/components/dashboard-home-content";

export default function Page() {
  return (
    <AppPageShell
      title="ภาพรวม Dashboard"
      description="ติดตามสถานะเว็บไซต์, ลูกค้า และการสมัครสมาชิกจากหน้าหลักเดียว"
    >
      <DashboardHomeContent />
    </AppPageShell>
  );
}
