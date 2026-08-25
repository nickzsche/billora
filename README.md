# Billora

**Invoices that get you paid.** Billora is a self-hostable invoicing & finance workspace for
freelancers and micro-studios: polished invoices with print-ready A4 PDF export, client CRM,
expense tracking, recurring-invoice flags, and cash-flow analytics — all in one premium dark
app that runs entirely on your own machine.

- 🧾 **Invoices** — line items, tax & discount %, five currencies, auto numbering (`INV-2026-0001`), draft → sent → paid lifecycle with computed **overdue** status, payment recording on mark-paid.
- 👥 **Clients** — full CRUD with default currency and notes; free plan capped at 3 clients (demo workspace exempt).
- 💸 **Expenses** — categorized, month-grouped ledger feeding the dashboard chart.
- 📊 **Dashboard** — revenue / outstanding / overdue / expenses KPIs + 6-month revenue-vs-expenses area chart (recharts).
- 🖨️ **Print** — `/invoices/[id]/print` renders an A4 sheet with real `@page` CSS; “Download PDF” = `window.print()`.
- 🔁 **Recurring flag** — mark any invoice monthly-recurring with a next-run date (generation engine on the roadmap).
- ⚙️ **Settings** — business profile, logo monogram, address, default tax, invoice prefix, currency.

## Quickstart

```bash
npm install
cp .env.example .env.local   # optional — sane defaults are baked in
npm run build                # production build
npm start                    # serves on http://localhost:3420
```

Development mode: `npm run dev` (also on port 3420 via `PORT`).

### Demo login

The database auto-seeds on first request (5 clients, 9 invoices across all statuses including
overdue, payments spread over six months, ~14 expenses). Sign in instantly with:

```
email:    demo@billora.app
password: demo1234
```

(The hint is also shown on the login page.)

## Tech stack

| Layer     | Choice |
|-----------|--------|
| Framework | Next.js 14 (App Router) + TypeScript |
| Styling   | Tailwind CSS v4 (`@theme` tokens), single premium dark theme |
| DB        | SQLite via better-sqlite3 + Drizzle ORM (lazy connect, `CREATE TABLE IF NOT EXISTS`, auto-seed when empty) |
| Auth      | email+password, bcryptjs hashes, jose HS256 JWT in an HttpOnly cookie |
| Charts    | recharts |
| Motion    | framer-motion · icons: lucide-react · fonts: Sora + Inter via `next/font` |

No external services at runtime; nothing leaves the machine.

## Pricing rationale

- **Free — $0**: up to 3 clients. Enough for a side hustle to send real invoices and feel the product’s value before paying anything.
- **Pro — $9/mo**: unlimited clients, recurring invoices, expense analytics. Priced below the psychological $10 ceiling and under one hour of the average freelancer’s rate — the invoice it helps collect pays for a year of it.

Upgrade buttons are honest stubs in this build (no payment processor wired in).

## Roadmap

- [ ] **Stripe checkout** — real Pro subscriptions with webhook-driven plan limits.
- [ ] **Recurring engine** — scheduled job generating the next invoice from each recurring flag (v1 ships flags + next-run dates only).
- [ ] **Teams** — multi-member workspaces with roles and per-client assignment.
- [ ] **e-Invoice / KVKK format** — Turkish e-Arşiv/Ubl-tr compliant exports and KVKK-aligned data handling.
- [ ] Payment links & reminders via email.

## Project layout

```
src/
  app/            landing, auth pages, /app workspace, REST API routes
  components/     shell, forms, charts, toasts, UI atoms
  db/             drizzle schema + lazy sqlite bootstrap & seeding
  lib/            auth helpers, money/format utilities, data access
```

## License

MIT © Sahan Hasret — see [LICENSE](./LICENSE).
