import Link from "next/link";
import { LogoMark } from "@/components/app-shell";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-ink-950 px-6 text-center">
      <LogoMark size={44} />
      <h1 className="font-display text-3xl font-bold text-white">404</h1>
      <p className="max-w-sm text-sm leading-relaxed text-ink-400">
        This page drifted off the ledger. It may have been deleted, or the link is wrong.
      </p>
      <div className="mt-2 flex gap-3">
        <Link href="/" className="btn btn-primary">Back home</Link>
        <Link href="/app" className="btn btn-ghost">Open workspace</Link>
      </div>
    </div>
  );
}
