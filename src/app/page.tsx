"use client";

import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import { toast } from "@/components/toaster";
import {
  ArrowRight,
  Check,
  Zap,
  Repeat2,
  Wallet,
  BarChart3,
  Printer,
  ShieldCheck,
} from "lucide-react";
import { LogoMark } from "@/components/app-shell";

export default function LandingPage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-ink-950">
      <LandingNav />
      <main>
        {/* HERO */}
        <section className="relative mx-auto max-w-6xl px-5 pb-20 pt-16 md:pt-24">
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-[-220px] h-[480px] w-[720px] -translate-x-1/2 rounded-full bg-emerald-accent/12 blur-[130px]"
          />
          <motion.div
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: "easeOut" }}
            className="relative flex flex-col items-center text-center"
          >
            <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-accent/30 bg-emerald-accent/10 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-emerald-soft">
              <Zap size={13} /> Invoicing for freelancers & micro-studios
            </span>
            <h1 className="font-display max-w-3xl text-4xl font-extrabold leading-[1.08] tracking-tight text-white sm:text-5xl md:text-6xl">
              Invoices that{" "}
              <span className="bg-gradient-to-r from-emerald-soft via-emerald-accent to-gold bg-clip-text text-transparent">
                get you paid
              </span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-ink-300 sm:text-lg">
              Billora turns your billable hours into polished, print-ready invoices — then
              keeps watch on due dates, expenses and cash flow so you always know where your
              money stands.
            </p>
            <div className="mt-8 flex w-full flex-col items-center justify-center gap-3 sm:w-auto sm:flex-row">
              <Link href="/register" className="btn btn-primary px-7 py-3 text-base">
                Start free — no card required <ArrowRight size={17} />
              </Link>
              <Link href="/login" className="btn btn-ghost px-7 py-3 text-base">
                Try the demo workspace
              </Link>
            </div>
            <div className="mt-4 text-xs text-ink-500">
              Demo login: <span className="font-semibold text-ink-300">demo@billora.app / demo1234</span>
            </div>

            {/* Hero preview card */}
            <motion.div
              initial={{ opacity: 0, y: 34 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.6, ease: "easeOut" }}
              className="surface mt-14 w-full max-w-3xl p-4 text-left sm:p-6"
            >
              <div className="flex items-center justify-between border-b border-ink-700 pb-4">
                <div className="flex items-center gap-3">
                  <LogoMark size={34} />
                  <div>
                    <div className="text-sm font-semibold text-white">Invoice INV-2026-0014</div>
                    <div className="text-xs text-ink-400">Northwind Commerce · Net 14</div>
                  </div>
                </div>
                <span className="badge badge-paid">Paid</span>
              </div>
              <div className="grid grid-cols-3 gap-3 py-5">
                {[
                  ["Subtotal", "$4,800"],
                  ["VAT 20%", "$960"],
                  ["Total", "$5,760"],
                ].map(([k, v]) => (
                  <div key={k}>
                    <div className="text-[10px] font-semibold uppercase tracking-widest text-ink-400">
                      {k}
                    </div>
                    <div
                      className={`money font-display mt-1 text-sm sm:text-xl ${
                        k === "Total" ? "font-bold" : ""
                      }`}
                    >
                      {v}
                    </div>
                  </div>
                ))}
              </div>
              <div className="h-14 w-full">
                <svg viewBox="0 0 400 56" preserveAspectRatio="none" className="h-full w-full" aria-hidden>
                  <defs>
                    <linearGradient id="heroSpark" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0" stopColor="#10b981" stopOpacity="0.5" />
                      <stop offset="1" stopColor="#10b981" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M0,44 C40,40 60,28 100,30 C140,32 160,18 200,20 C240,22 260,10 300,12 C340,14 370,6 400,4 L400,56 L0,56 Z"
                    fill="url(#heroSpark)"
                  />
                  <path
                    d="M0,44 C40,40 60,28 100,30 C140,32 160,18 200,20 C240,22 260,10 300,12 C340,14 370,6 400,4"
                    stroke="#10b981"
                    strokeWidth="2.5"
                    fill="none"
                    strokeLinecap="round"
                  />
                  <circle cx="400" cy="4" r="3.5" fill="#E8C15A" />
                </svg>
              </div>
            </motion.div>
          </motion.div>
        </section>

        {/* FEATURES */}
        <Features />

        {/* PRICING */}
        <Pricing />

        {/* CTA */}
        <section className="mx-auto max-w-6xl px-5 pb-24 pt-8">
          <div className="surface relative overflow-hidden p-8 text-center md:p-14">
            <div aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/60 to-transparent" />
            <h2 className="font-display text-2xl font-bold text-white md:text-4xl">
              Your next invoice could be out the door in two minutes.
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm text-ink-300 md:text-base">
              Set up your business profile once — Billora handles numbering, taxes and
              print-ready PDFs from there.
            </p>
            <Link href="/register" className="btn btn-primary mt-7 px-8 py-3 text-base">
              Create your free account <ArrowRight size={17} />
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

function LandingNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-ink-800/70 bg-ink-950/80 backdrop-blur-md no-print">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <Link href="/" className="flex items-center gap-2.5">
          <LogoMark />
          <span className="font-display text-lg font-bold tracking-tight text-white">Billora</span>
        </Link>
        <nav className="hidden items-center gap-7 text-sm font-medium text-ink-300 md:flex">
          <a href="#features" className="transition-colors hover:text-white">Features</a>
          <a href="#pricing" className="transition-colors hover:text-white">Pricing</a>
        </nav>
        <div className="flex items-center gap-2.5">
          <Link href="/login" className="btn btn-ghost hidden py-2 sm:inline-flex">Sign in</Link>
          <Link href="/register" className="btn btn-primary py-2">Get started</Link>
        </div>
      </div>
    </header>
  );
}

const FEATURES = [
  {
    icon: Zap,
    title: "Invoices in minutes",
    body: "Line items, tax & discount percentages, auto numbering like INV-2026-0001, five currencies.",
  },
  {
    icon: Printer,
    view: true,
    title: "Print-ready PDFs",
    body: "Clean A4 layout with a real print stylesheet. One click to a pixel-perfect PDF via your browser.",
  },
  {
    icon: Repeat2,
    title: "Recurring ready",
    body: "Flag any invoice as monthly recurring and see its next run date at a glance.",
  },
  {
    icon: Wallet,
    title: "Expenses tracked",
    body: "Log costs by category and month — revenue vs. expenses is always one glance away.",
  },
  {
    icon: BarChart3,
    title: "Cash-flow analytics",
    body: "KPIs for revenue, outstanding and overdue amounts, plus monthly trends on your dashboard.",
  },
  {
    icon: ShieldCheck,
    title: "Yours, not ours",
    body: "Runs on your own machine with a local SQLite database. No data leaves your server.",
  },
];

function Features() {
  return (
    <section id="features" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-16">
      <h2 className="font-display text-center text-2xl font-bold text-white md:text-4xl">
        Everything a solo business needs. Nothing it doesn&apos;t.
      </h2>
      <p className="mx-auto mt-3 max-w-xl text-center text-sm text-ink-400 md:text-base">
        Built for freelancers who would rather send invoices than manage software.
      </p>
      <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map(({ icon: Icon, title, body }) => (
          <div key={title} className="surface surface-hover p-6">
            <div className="inline-flex rounded-xl border border-emerald-accent/25 bg-emerald-accent/10 p-2.5 text-emerald-soft">
              <Icon size={20} />
            </div>
            <h3 className="font-display mt-4 text-base font-semibold text-white">{title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-400">{body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Pricing() {
  const free = [
    "Up to 3 clients",
    "Unlimited invoices & expenses",
    "Auto numbering + tax & discounts",
    "A4 print-ready PDF export",
  ];
  const pro = [
    "Unlimited clients",
    "Recurring monthly invoices",
    "Expense categories & analytics",
    "Priority support (roadmap)",
  ];

  return (
    <section id="pricing" className="mx-auto max-w-5xl scroll-mt-20 px-5 py-16">
      <h2 className="font-display text-center text-2xl font-bold text-white md:text-4xl">
        Simple pricing that scales with you
      </h2>
      <p className="mx-auto mt-3 max-w-md text-center text-sm text-ink-400">
        Start free while you find your footing. Upgrade when the clients start rolling in.
      </p>

      <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-2">
        {/* Free */}
        <div className="surface p-8">
          <div className="text-xs font-bold uppercase tracking-widest text-ink-400">Free</div>
          <div className="mt-3 flex items-baseline gap-1.5">
            <span className="money font-display text-4xl font-extrabold">$0</span>
            <span className="text-sm text-ink-400">forever</span>
          </div>
          <ul className="mt-6 flex flex-col gap-3">
            {free.map((f) => (
              <li key={f} className="flex items-start gap-2.5 text-sm text-ink-200">
                <Check size={17} className="mt-0.5 shrink-0 text-emerald-accent" /> {f}
              </li>
            ))}
          </ul>
          <Link href="/register" className="btn btn-ghost mt-8 w-full">
            Start for free
          </Link>
        </div>

        {/* Pro */}
        <div className="surface relative overflow-hidden border-emerald-accent/40 p-8 shadow-[0_0_60px_-24px_rgba(16,185,129,0.45)]">
          <div aria-hidden className="absolute right-5 top-5 rounded-full bg-gradient-to-r from-emerald-accent to-emerald-soft px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-widest text-[#04120c]">
            Most popular
          </div>
          <div className="text-xs font-bold uppercase tracking-widest text-emerald-soft">Pro</div>
          <div className="mt-3 flex items-baseline gap-1.5">
            <span className="money font-display text-4xl font-extrabold">$9</span>
            <span className="text-sm text-ink-400">/ month</span>
          </div>
          <ul className="mt-6 flex flex-col gap-3">
            {pro.map((f) => (
              <li key={f} className="flex items-start gap-2.5 text-sm text-ink-200">
                <Check size={17} className="mt-0.5 shrink-0 text-gold" /> {f}
              </li>
            ))}
          </ul>
          <UpgradeButton />
          <p className="mt-3 text-center text-[11px] leading-relaxed text-ink-500">
            Payments are stubbed in this build — upgrading is simulated.
          </p>
        </div>
      </div>
    </section>
  );
}

function UpgradeButton() {
  const [nag] = useState(0);
  return (
    <button
      type="button"
      onClick={() => toast("Checkout coming soon — Pro is a stub in this demo ✨", "info")}
      className="btn btn-primary mt-8 w-full"
    >
      Upgrade to Pro{nag > 1 ? ` (${nag})` : ""}
    </button>
  );
}

function Footer() {
  return (
    <footer className="border-t border-ink-800 py-10 no-print">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 text-sm text-ink-400 sm:flex-row">
        <div className="flex items-center gap-2.5">
          <LogoMark size={24} />
          <span>
            <span className="font-semibold text-ink-200">Billora</span> — Invoices that get you paid.
          </span>
        </div>
        <div className="flex items-center gap-5">
          <Link href="/login" className="transition-colors hover:text-white">Sign in</Link>
          <Link href="/register" className="transition-colors hover:text-white">Create account</Link>
          <span className="text-ink-600">© {new Date().getFullYear()} Billora · Crafted for freelancers</span>
        </div>
      </div>
    </footer>
  );
}
