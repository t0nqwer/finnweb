"use client";

import { Suspense } from "react";
import { AuthFormCard } from "@/components/auth-form-card";

function LoginPageContent() {
  return <AuthFormCard mode="login" />;
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-50">
          Loading authentication...
        </main>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}
