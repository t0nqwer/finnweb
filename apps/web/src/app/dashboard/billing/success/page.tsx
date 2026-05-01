import Link from "next/link";
import { AppPageShell } from "@/components/app-page-shell";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default function BillingSuccessPage() {
  return (
    <AppPageShell
      title="Billing Success"
      description="สถานะการชำระเงินสำเร็จและระบบกำลังอัปเดตแผนของคุณ"
    >
      <div className="mx-auto w-full max-w-4xl px-4 lg:px-6">
        <Card className="border-emerald-500/40 bg-emerald-500/10">
          <CardHeader>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">
              Success
            </p>
            <CardTitle className="text-2xl text-emerald-100 md:text-3xl">
              การชำระเงินสำหรับแพ็กเกจเสร็จสมบูรณ์แล้ว
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-sm text-emerald-100/90">
              แผนของคุณกำลังถูกเปิดใช้งาน คุณสามารถกลับไปที่ Dashboard
              เพื่อจัดการเว็บไซต์และติดตามผลลัพธ์ได้ทันที
            </p>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/dashboard"
                className={cn(
                  buttonVariants({ variant: "default" }),
                  "bg-emerald-500 text-white hover:bg-emerald-500/90",
                )}
              >
                ไปที่ Dashboard
              </Link>
              <Link
                href="/subscription"
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "border-emerald-400/50 text-emerald-100 hover:bg-emerald-500/20",
                )}
              >
                ดูแพ็กเกจอีกครั้ง
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppPageShell>
  );
}
