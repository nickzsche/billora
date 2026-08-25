"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  Users,
  FileText,
  Wallet,
  Settings,
  LogOut,
  Menu,
  X,
} from "lucide-react";

const NAV = [
  { href: "/app", label: "Dashboard", icon: LayoutDashboard },
  { href: "/app/clients", label: "Clients", icon: Users },
  { href: "/app/invoices", label: "Invoices", icon: FileText },
  { href: "/app/expenses", label: "Expenses", icon: Wallet },
  { href: "/app/settings", label: "Settings", icon: Settings },
];

export function AppShell({
  children,
  userName,
  businessName,
}: {
  children: React.ReactNode;
  userName: string;
  businessName: string;
}) {
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <Sidebar userName={userName} businessName={businessName} />
      <main className="flex-1 px-4 pb-16 pt-4 md:px-8 md:pt-8">{children}</main>
    </div>
  );
}

function Sidebar({ userName, businessName }: { userName: string; businessName: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const links = NAV.map(({ href, label, icon: Icon }) => {
    const active =
      href === "/app" ? pathname === "/app" : pathname.startsWith(href);
    return (
      <Link
        key={href}
        href={href}
        onClick={() => setOpen(false)}
        className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
          active
            ? "bg-emerald-accent/12 text-emerald-soft shadow-[inset_2px_0_0_0_var(--color-emerald-accent)]"
            : "text-ink-300 hover:bg-white/5 hover:text-white"
        }`}
      >
        <Icon size={17} strokeWidth={active ? 2.4 : 2} />
        {label}
      </Link>
    );
  });

  const brand = (
    <Link href="/" className="flex items-center gap-2.5">
      <LogoMark />
      <div>
        <div className="font-display text-[15px] font-bold tracking-tight text-white">
          Billora
        </div>
        <div className="text-[11px] leading-tight text-ink-400">{businessName || userName}</div>
      </div>
    </Link>
  );

  return (
    <>
      {/* Mobile top bar */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-ink-700 bg-ink-900/85 px-4 py-3 backdrop-blur-md md:hidden no-print">
        {brand}
        <button
          aria-label="Toggle menu"
          onClick={() => setOpen((v) => !v)}
          className="rounded-lg border border-ink-600 p-2 text-ink-200"
        >
          {open ? <X size={18} /> : <Menu size={18} />}
        </button>
      </header>

      {open && (
        <nav
          className="fixed inset-x-0 top-[57px] z-40 flex flex-col gap-1 border-b border-ink-700 bg-ink-900/95 p-3 backdrop-blur-md md:hidden no-print"
          onClick={() => setOpen(false)}
        >
          {links}
          <LogoutButton />
        </nav>
      )}

      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col justify-between border-r border-ink-700 bg-ink-900/60 p-4 backdrop-blur-sm md:flex no-print">
        <div>
          <div className="mb-8 mt-2 px-1">{brand}</div>
          <nav className="flex flex-col gap-1">{links}</nav>
        </div>
        <LogoutButton />
      </aside>
    </>
  );
}

function LogoutButton() {
  return (
    <form action="/api/auth/logout" method="post">
      <button
        type="submit"
        className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-ink-400 transition-colors hover:bg-white/5 hover:text-white"
      >
        <LogOut size={17} />
        Sign out
      </button>
    </form>
  );
}

export function LogoMark({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden>
      <rect x="1" y="1" width="30" height="30" rx="9" fill="#0e1216" stroke="#10b981" strokeOpacity="0.55" />
      <path d="M9 22V10h6.1c2.3 0 3.7 1.1 3.7 2.9 0 1.3-.8 2.2-2 2.5 1.6.3 2.6 1.4 2.6 3 0 2-1.5 3.6-4.2 3.6H9Z" fill="#10b981" />
      <circle cx="24" cy="21" r="2.6" fill="#E8C15A" />
    </svg>
  );
}
