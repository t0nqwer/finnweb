import Link from "next/link";
import { AppPageShell } from "@/components/app-page-shell";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function HelpPage() {
  return (
    <AppPageShell
      title="Help & support"
      description="Quick guidance for onboarding, billing, and site setup."
      actions={
        <Link
          href="/settings/profile"
          className="inline-flex items-center rounded-md border border-slate-200 px-4 py-2 text-sm dark:border-slate-800"
        >
          Open profile
        </Link>
      }
    >
      <div className="grid gap-4 px-4 lg:grid-cols-3 lg:px-6">
        <Card>
          <CardHeader>
            <CardTitle>Get started</CardTitle>
            <CardDescription>Best order for new customers.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>1. Create an account</p>
            <p>2. Choose a plan</p>
            <p>3. Connect your first site and page</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Need billing help?</CardTitle>
            <CardDescription>
              Manage plans and checkout from one place.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href="/billing"
              className="text-sm font-medium text-orange-600 hover:underline"
            >
              Go to billing
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Need account help?</CardTitle>
            <CardDescription>
              Update your profile, password, or verification state.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Link
              href="/settings/profile"
              className="block text-orange-600 hover:underline"
            >
              Profile settings
            </Link>
            <Link
              href="/settings/security"
              className="block text-orange-600 hover:underline"
            >
              Security settings
            </Link>
          </CardContent>
        </Card>
      </div>
    </AppPageShell>
  );
}
