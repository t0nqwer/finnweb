import Link from "next/link";

export default function BillingPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 px-4 py-10 md:px-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <p className="text-sm font-medium text-sky-600 dark:text-sky-300">
          Billing
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Subscription checkout was canceled or is still pending
        </h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          You can return to the subscription page and try again whenever you are
          ready.
        </p>

        <div className="mt-6 flex gap-3">
          <Link
            href="/subscription"
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white dark:bg-slate-50 dark:text-slate-900"
          >
            Back to subscription
          </Link>
          <Link
            href="/dashboard"
            className="rounded-md border border-slate-200 px-4 py-2 text-sm dark:border-slate-800"
          >
            Open dashboard
          </Link>
        </div>
      </section>
    </main>
  );
}
