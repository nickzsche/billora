# BILLORA — Build Brief

You are an elite full-stack engineer working autonomously until DONE. No questions; decide and ship.
LOCATION: `/home/agartha/billora/` (exists with partial files from an aborted attempt — overwrite freely, start clean where needed).

## Product identity
- Name: **Billora**. Tagline: "Invoices that get you paid."
- Audience: freelancers & micro-studios.
- Money story: Free plan (3 clients) vs Pro $9/mo (unlimited clients, recurring invoices, expenses, analytics). Pricing table on landing page; upgrade buttons = stubs, no real payments.
- Brand: fintech-clean, trustworthy. ONE cohesive premium dark theme — deep charcoal surfaces, emerald accent, gold highlights for money numbers. Tokens in globals.css. No default Next.js look.

## Environment facts (verified)
- Ubuntu Linux home server. Node v22.23.2, npm 10.9.8, bun/pnpm available.
- Work ONLY inside `/home/agartha/billora/`. No other dirs, no system changes.
- Network: npm registry only. No external APIs at runtime. Nothing leaves the machine.
- Do NOT push any remote. `git init` + single local commit (global git identity).
- No hardcoded secrets; `.env.example`; `.gitignore`: node_modules, .next, .env*.local, *.db.
- Assigned PORT: **3420**.

## Stack mandate
- Next.js App Router + TypeScript + Tailwind.
- DB: SQLite via Drizzle ORM (+ better-sqlite3). Lazy auto-seed on first request if tables empty — demo data MUST appear instantly (demo client set, ~8 invoices in mixed statuses incl overdue, expenses, payments spread over past months).
- Auth: email+password register/login, bcryptjs hashes, jose JWT in HttpOnly cookie. Landing public; /app behind session. Seeded demo login: demo@billora.app / demo1234 (hint shown on login page).
- Charts: recharts (or clean hand-rolled SVG if dependency fights React version).

## Features (all required)
1. Marketing landing: hero, feature grid, pricing table (Free/Pro), CTA buttons, footer. Public.
2. Auth pages: /login, /register.
3. Dashboard: KPI cards (revenue this month, outstanding, overdue, expenses this month) + revenue-vs-expenses chart + recent invoices list.
4. Clients CRUD (name, email, company, address, default currency, notes).
5. Invoices: create/edit with line items (desc, qty, unit price), tax %, discount %, notes, currency selector, auto numbering (INV-2026-0001), statuses draft/sent/paid/overdue (overdue computed from due date), mark-paid records payment.
6. Recurring flag (monthly) with next-run display; generation stub documented in README (no cron v1).
7. Expenses: amount, category, date, note; monthly totals feed dashboard.
8. Invoice detail with professional print-ready layout (/invoices/[id]/print, A4 print CSS, "Download PDF" = window.print()). Do NOT add @react-pdf/renderer.
9. Settings: business profile (name/logo text/address), default tax %, invoice prefix, currency.
10. Polish: inline-SVG empty states, toasts, skeleton loaders, framer-motion transitions, lucide icons, distinctive font pairing via next/font.

## Acceptance gate (ALL mandatory)
1. `npm run build` exits 0 — paste last ~15 lines as proof.
2. Prod boot on 3420, `curl -s localhost:3420 | head -30` shows landing HTML, then KILL server.
3. Seeded demo login works end-to-end (credentials documented in README).
4. Premium responsive on 390px mobile and desktop; one dark theme everywhere.
5. README.md (English): pitch, features, quickstart, tech stack, pricing rationale, roadmap (Stripe checkout, recurring engine, teams, e-invoice/KVKK format).
6. LICENSE MIT (Sahan Hasret). git init + initial commit.

## Time discipline
Build-green core (auth + invoices + dashboard + print) first; extras after. Cut gracefully into README roadmap if context tightens.

## Report back
Features shipped vs cut, build proof tail, demo credentials, exact run commands.
