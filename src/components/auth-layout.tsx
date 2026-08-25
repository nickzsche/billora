import { LogoMark } from "@/components/app-shell";
import Link from "next/link";

/** Shared split layout for /login and /register. */
export function AuthLayout({
  title,
  subtitle,
  footer,
  hint,
  children,
}: {
  title: string;
  subtitle: string;
  footer?: React.ReactNode;
  hint?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Form side */}
      <div className="flex flex-col justify-center px-5 py-12 sm:px-12 lg:px-16">
        <div className="mx-auto w-full max-w-sm">
          <Link href="/" className="mb-10 inline-flex items-center gap-2.5">
            <LogoMark />
            <span className="font-display text-lg font-bold tracking-tight text-white">Billora</span>
          </Link>
          <h1 className="font-display text-2xl font-bold text-white md:text-3xl">{title}</h1>
          <p className="mt-1.5 text-sm text-ink-400">{subtitle}</p>

          {hint && <div className="mt-6">{hint}</div>}
          <div className="mt-6">{children}</div>
          {footer && <p className="mt-6 text-center text-sm text-ink-400">{footer}</p>}
        </div>
      </div>

      {/* Brand side */}
      <div className="relative hidden overflow-hidden border-l border-ink-800 bg-ink-900/50 lg:block">
        <div aria-hidden className="absolute left-1/2 top-1/3 h-[420px] w-[520px] -translate-x-1/2 rounded-full bg-emerald-accent/10 blur-[120px]" />
        <div className="relative flex h-full flex-col justify-center px-14">
          <svg width="150" height="108" viewBox="0 0 120 86" fill="none" aria-hidden className="mb-8 opacity-90">
            <rect x="18" y="8" width="84" height="66" rx="10" fill="#13181d" stroke="#222a33" />
            <rect x="26" y="18" width="40" height="5" rx="2.5" fill="#2e3843" />
            <rect x="26" y="30" width="68" height="4" rx="2" fill="#1d242c" />
            <rect x="26" y="39" width="60" height="4" rx="2" fill="#1d242c" />
            <path d="M78 34l16 7v12c0 8-6.5 13.5-16 15-9.5-1.5-16-7-16-15V41l16-7Z" fill="#10b981" />
            <path d="M71.5 52.5l4.4 4.4 9-9" stroke="#04120c" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="96" cy="22" r="7" fill="#E8C15A" />
          </svg>
          <h2 className="font-display max-w-md text-3xl font-bold leading-snug text-white">
            “Invoices that get you paid.”
          </h2>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-ink-400">
            Auto numbering, tax-aware totals, recurring flags, expense tracking and an A4
            print layout that makes every invoice look like it came from a big firm.
          </p>
          <div className="mt-8 flex items-center gap-6 text-xs text-ink-500">
            <span>✓ Local-first SQLite</span>
            <span>✓ No data leaves your machine</span>
          </div>
        </div>
      </div>
    </div>
  );
}
