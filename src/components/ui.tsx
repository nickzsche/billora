import Link from "next/link";
import { LogoMark } from "@/components/app-shell";

export function StatusBadge({ status }: { status: string }) {
  const s = status as "draft" | "sent" | "paid" | "overdue";
  return <span className={`badge badge-${s}`}>{status}</span>;
}

/** Inline-SVG empty state with a custom illustration. */
export function EmptyState({
  title,
  body,
  action,
  kind = "docs",
}: {
  title: string;
  body: string;
  action?: { href: string; label: string };
  kind?: "docs" | "clients" | "wallet" | "chart";
}) {
  return (
    <div className="surface flex flex-col items-center gap-3 px-6 py-14 text-center">
      <EmptyIllustration kind={kind} />
      <h3 className="font-display text-lg font-semibold text-white">{title}</h3>
      <p className="max-w-sm text-sm leading-relaxed text-ink-400">{body}</p>
      {action && (
        <Link href={action.href} className="btn btn-primary mt-2">
          {action.label}
        </Link>
      )}
    </div>
  );
}

export function EmptyIllustration({ kind }: { kind: "docs" | "clients" | "wallet" | "chart" }) {
  return (
    <svg width="120" height="86" viewBox="0 0 120 86" fill="none" aria-hidden className="mb-1">
      <defs>
        <linearGradient id="eg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#10b981" stopOpacity="0.9" />
          <stop offset="1" stopColor="#10b981" stopOpacity="0.25" />
        </linearGradient>
      </defs>
      {/* backdrop card */}
      <rect x="18" y="8" width="84" height="66" rx="10" fill="#13181d" stroke="#222a33" />
      <rect x="26" y="18" width="40" height="5" rx="2.5" fill="#2e3843" />
      <rect x="26" y="30" width="68" height="4" rx="2" fill="#1d242c" />
      <rect x="26" y="39" width="60" height="4" rx="2" fill="#1d242c" />
      <rect x="26" y="48" width="64" height="4" rx="2" fill="#1d242c" />

      {kind === "docs" && (
        <>
          <path d="M78 34l16 7v12c0 8-6.5 13.5-16 15-9.5-1.5-16-7-16-15V41l16-7Z" fill="url(#eg)" opacity="0.95" />
          <path d="M71.5 52.5l4.4 4.4 9-9" stroke="#04120c" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="96" cy="22" r="7" fill="#E8C15A" />
          <path d="M93.6 22h4.8M96 19.6v4.8" stroke="#0a0d10" strokeWidth="1.8" strokeLinecap="round" />
        </>
      )}
      {kind === "clients" && (
        <>
          <circle cx="48" cy="42" r="9" fill="url(#eg)" />
          <path d="M32 62c2-7 8.4-11 16-11s14 4 16 11" fill="url(#eg)" />
          <circle cx="76" cy="38" r="7" fill="#E8C15A" opacity="0.9" />
          <path d="M64 58c1.6-5.4 6.6-8.6 12-8.6 3.4 0 6.6 1.2 8.9 3.2" stroke="#E8C15A" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.85" />
        </>
      )}
      {kind === "wallet" && (
        <>
          <rect x="58" y="36" width="36" height="26" rx="7" fill="url(#eg)" />
          <path d="M58 44h36" stroke="#0a0d10" strokeWidth="2.4" opacity="0.55" />
          <circle cx="84" cy="49" r="3.4" fill="#04120c" />
          <circle cx="46" cy="34" r="9" fill="#E8C15A" />
          <path d="M43 33.4h6M46 30.4v6" stroke="#0a0d10" strokeWidth="1.8" strokeLinecap="round" />
        </>
      )}
      {kind === "chart" && (
        <>
          <polyline
            points="30,62 44,50 56,54 70,38 84,42 94,28"
            stroke="url(#eg)"
            strokeWidth="4"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="94" cy="28" r="4.5" fill="#E8C15A" />
          {[0, 1, 2].map((i) => (
            <rect key={i} x={30 + i * 18} y={66 - i * 2} width="8" height={4 + i * 2} rx="2" fill="#1d242c" />
          ))}
        </>
      )}
    </svg>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={`skeleton ${className ?? ""}`} aria-hidden />;
}

export function CardSkeletonRows({ rows = 4 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-2.5">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-[52px] w-full rounded-xl" />
      ))}
    </div>
  );
}
