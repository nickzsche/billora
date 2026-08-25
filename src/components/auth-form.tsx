"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "@/components/toaster";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.currentTarget);
    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: String(form.get("email") || "").trim(),
          password: String(form.get("password") || ""),
          name: String(form.get("name") || "").trim(),
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        toast(data.error || "Something went wrong", "error");
        setLoading(false);
        return;
      }
      toast(mode === "login" ? "Welcome back!" : "Workspace created 🎉");
      router.push("/app");
      router.refresh();
    } catch {
      toast("Network error — please try again", "error");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      {mode === "register" && (
        <div>
          <label className="label" htmlFor="name">Your name</label>
          <input id="name" name="name" className="field" placeholder="Sahan Hasret" autoComplete="name" required />
        </div>
      )}
      <div>
        <label className="label" htmlFor="email">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          className="field"
          placeholder={mode === "login" ? "demo@billora.app" : "you@studio.com"}
          autoComplete="email"
          required
        />
      </div>
      <div>
        <label className="label" htmlFor="password">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          className="field"
          placeholder="••••••••"
          minLength={8}
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          required
        />
        {mode === "register" && (
          <p className="mt-1.5 text-xs text-ink-500">At least 8 characters.</p>
        )}
      </div>
      <button type="submit" disabled={loading} className="btn btn-primary mt-1 w-full py-2.5 disabled:opacity-60">
        {loading ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
      </button>
    </form>
  );
}
