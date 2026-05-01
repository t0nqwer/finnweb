import Link from "next/link";
import { AppPageShell } from "@/components/app-page-shell";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default function BillingPage() {
  return (
    <AppPageShell
      title="Billing"
      description="ติดตามสถานะการชำระเงินและดำเนินการสมัครสมาชิกต่อ"
    >
      <div className="mx-auto w-full max-w-4xl px-4 lg:px-6">
        <Card className="border-border/70 bg-card/90">
          <CardHeader>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              Billing
            </p>
            <CardTitle className="text-2xl md:text-3xl">
              การชำระเงินถูกยกเลิกหรือยังรอดำเนินการ
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-sm text-muted-foreground">
              คุณสามารถกลับไปเลือกแพ็กเกจและเริ่มการชำระเงินใหม่ได้ทุกเมื่อ
            </p>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/subscription"
                className={cn(
                  buttonVariants({ variant: "default" }),
                  "bg-linear-to-r from-primary to-[#ff4500]",
                )}
              >
                กลับไปหน้าแพ็กเกจ
              </Link>
              <Link
                href="/dashboard"
                className={buttonVariants({ variant: "outline" })}
              >
                เปิดหน้า Dashboard
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppPageShell>
  );
}
