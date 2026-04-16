import Link from "next/link";
import { Badge } from "@/components/ui/badge";

type AuthShellProps = {
  badge?: string;
  title: string;
  description: string;
  children: React.ReactNode;
  highlights?: string[];
  footer?: React.ReactNode;
};

const defaultHighlights = [
  "Secure account access and protected customer pages",
  "Smooth onboarding into billing and site management",
  "Premium workspace UX built on the FinnWeb design system",
];

export function AuthShell({
  badge = "FinnWeb account",
  title,
  description,
  children,
  highlights = defaultHighlights,
  footer,
}: AuthShellProps) {
  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-slate-50">
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="rounded-3xl border border-slate-800 bg-linear-to-br from-slate-950 to-slate-900 p-8 shadow-2xl">
          <Badge className="mb-4 w-fit bg-orange-500 text-white hover:bg-orange-500">
            {badge}
          </Badge>
          <h1 className="text-4xl font-bold tracking-tight">{title}</h1>
          <p className="mt-4 max-w-xl text-sm text-slate-300">{description}</p>

          <div className="mt-8 grid gap-3 text-sm text-slate-300">
            {highlights.map((highlight) => (
              <div
                key={highlight}
                className="rounded-xl border border-slate-800 bg-slate-900/70 p-4"
              >
                {highlight}
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap gap-3 text-sm">
            <Link
              href="/landing"
              className="text-orange-300 hover:text-orange-200"
            >
              ← Back to landing
            </Link>
            <Link href="/pricing" className="text-slate-300 hover:text-white">
              View pricing
            </Link>
          </div>
        </section>

        <div className="space-y-4">
          {children}
          {footer ? (
            <div className="text-sm text-slate-300">{footer}</div>
          ) : null}
        </div>
      </div>
    </main>
  );
}
