import Link from "next/link";

export default function BillingSuccessPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 px-4 py-10 md:px-6">
      <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 shadow-sm dark:border-emerald-900/60 dark:bg-emerald-950/30">
        <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
          Success
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-emerald-900 dark:text-emerald-100">
          Subscription checkout completed
        </h1>
        <p className="mt-2 text-sm text-emerald-800 dark:text-emerald-200">
          Your plan is being activated. You can now go back to the dashboard and
          continue building your site.
        </p>

        <div className="mt-6 flex gap-3">
          <Link
            href="/dashboard"
            className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white"
          >
            Go to dashboard
          </Link>
          <Link
            href="/subscription"
            className="rounded-md border border-emerald-300 px-4 py-2 text-sm dark:border-emerald-800"
          >
            View plans again
          </Link>
        </div>
      </section>
    </main>
  );
}
