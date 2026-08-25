import type { Metadata } from "next";
import Link from "next/link";
import { AuthForm } from "@/components/auth-form";
import { AuthLayout } from "@/components/auth-layout";

export const metadata: Metadata = { title: "Create account" };

export default function RegisterPage() {
  return (
    <AuthLayout
      title="Create your workspace"
      subtitle="Free for up to 3 clients. No card required."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-emerald-soft hover:text-emerald-accent">
            Sign in
          </Link>
        </>
      }
    >
      <AuthForm mode="register" />
    </AuthLayout>
  );
}
