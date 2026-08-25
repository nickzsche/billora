import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AuthForm } from "@/components/auth-form";
import { AuthLayout } from "@/components/auth-layout";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to your Billora workspace."
      footer={
        <>
          New to Billora?{" "}
          <Link href="/register" className="font-semibold text-emerald-soft hover:text-emerald-accent">
            Create an account
          </Link>
        </>
      }
      hint={
        <div className="rounded-xl border border-gold/25 bg-gold/5 px-4 py-3 text-xs leading-relaxed text-ink-300">
          <span className="font-bold text-gold">Demo workspace</span> — explore with
          seeded data:{" "}
          <span className="font-mono font-semibold text-ink-100">demo@billora.app / demo1234</span>
        </div>
      }
    >
      <Suspense fallback={<FormSkeleton />}>
        <AuthForm mode="login" />
      </Suspense>
    </AuthLayout>
  );
}

function FormSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <div className="skeleton h-11 w-full" />
      <div className="skeleton h-11 w-full" />
      <div className="skeleton h-11 w-full" />
    </div>
  );
}
