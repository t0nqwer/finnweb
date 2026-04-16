import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const plans = [
  {
    name: "Basic",
    price: "250 บาท/เดือน",
    href: "/register?plan=BASIC",
    features: ["1 website", "3 pages", "Lead capture form"],
  },
  {
    name: "Business",
    price: "490 บาท/เดือน",
    href: "/register?plan=BUSINESS",
    features: ["3 websites", "10 pages", "Blog + analytics"],
  },
  {
    name: "Pro",
    price: "990 บาท/เดือน",
    href: "/register?plan=PRO",
    features: ["10 websites", "50 pages", "Priority support"],
  },
];

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-slate-50">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="space-y-3 text-center">
          <p className="text-sm font-medium text-orange-300">FinnWeb pricing</p>
          <h1 className="text-4xl font-bold tracking-tight">
            Choose the plan that fits your growth stage
          </h1>
          <p className="text-sm text-slate-300">
            Start with onboarding, then complete checkout when your workspace is
            ready.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {plans.map((plan) => (
            <Card
              key={plan.name}
              className="border-slate-800 bg-slate-950 text-slate-50"
            >
              <CardHeader>
                <CardTitle>{plan.name}</CardTitle>
                <CardDescription className="text-slate-300">
                  {plan.price}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2 text-sm text-slate-300">
                  {plan.features.map((feature) => (
                    <li key={feature}>• {feature}</li>
                  ))}
                </ul>
                <Link
                  href={plan.href}
                  className="inline-flex w-full items-center justify-center rounded-md bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600"
                >
                  Choose {plan.name}
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </main>
  );
}
