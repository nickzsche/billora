# Billora

**Invoices that get you paid.** Billora is a self-hostable invoicing & finance workspace for
freelancers and micro-studios: polished invoices with print-ready **A4 PDF** export, a client CRM,
expense tracking, recurring invoices, and cash-flow analytics — all in one premium dark app that
runs entirely on your own machine.

No external services at runtime. No data leaves your server.

---

## Features

### Invoicing
- Line items (description, quantity, unit price) with **tax %** and **discount %**.
- Correct money math: discount is applied to the subtotal first, tax on the discounted base;
  amounts round half-up to 2 decimals and rates are clamped to a sane 0–100 range.
- **Auto numbering** — `INV-2026-0001` (configurable prefix + year + zero-padded sequence).
- Lifecycle **draft → sent → paid**, with **overdue** derived from the due date (never stored).
- Recording a payment on *mark-paid* writes a `payments` row and flips the status to paid.
- Four currencies (USD, EUR, GBP, TRY) per client / per invoice.

### Clients (CRM)
- Full CRUD: name, email, company, address, default currency, notes.
- Free plan is capped at 3 clients; the demo workspace is exempt.

### Expenses
- Categorized ledger (Software, Hardware, Office, Marketing, Travel, Contractors, Education, Other).
- Month-grouped totals that feed the dashboard chart.

### Dashboard & analytics
- KPIs: revenue this month, outstanding, overdue, expenses this month.
- 6-month revenue-vs-expenses area chart (recharts) and a recent-invoices feed.

### Print / PDF
- `/app/invoices/[id]/print` renders a real A4 sheet (`@page` CSS, 96 dpi sizing).
- “Download PDF” = `window.print()` → pixel-perfect browser save-as-PDF. No PDF library inflated
  into the client bundle.

### Recurring invoices
- Flag any invoice as **monthly recurring** with a next-run date.
- A lazy generator materialises the next draft the first time the invoices list is opened on or
  after the next-run date — **no external scheduler or cron required**. Catch-up is bounded and
  idempotent, and month ends are clamped (Jan 31 → Feb 28/29, Apr 30, …).

### Settings
- Business profile (name, logo monogram, address), default tax %, invoice prefix, default currency.

### Polish
- One cohesive dark theme (Tailwind v4 `@theme` tokens), framer-motion transitions, toasts,
  skeleton loaders, inline-SVG empty states, responsive down to 390 px.

---

## Quickstart

```bash
npm install
cp .env.example .env.local     # optional — sane defaults are baked in
npm run build                  # production build
npm start                      # serves on http://localhost:3420
```

Development: `npm run dev`. Type-check: `npm run typecheck`. Tests: `npm test`.

### Demo login

The database auto-seeds on first request — 5 clients, 9 invoices across every status (including
one overdue and one recurring), payments spread over six months, and ~14 expenses. Sign in with:

```
email:    demo@billora.app
password: demo1234
```

(The hint is also shown on the login page and landing hero.)

### Environment

| Variable | Default | Purpose |
|----------|---------|---------|
| `PORT` | `3420` | HTTP port |
| `AUTH_SECRET` | dev fallback | Signing key for session JWTs — **change in production** |
| `DATABASE_URL` | `./data/billora.db` | SQLite file path |
| `DEMO_EMAIL` / `DEMO_PASSWORD` | `demo@billora.app` / `demo1234` | Seeded demo account |

---

## Tech stack

| Layer     | Choice |
|-----------|--------|
| Framework | Next.js 14 (App Router) + TypeScript (`strict`) |
| Styling   | Tailwind CSS v4 (`@theme` tokens), single dark theme, Sora + Inter via `next/font` |
| Database  | SQLite via better-sqlite3 + Drizzle ORM — lazy connect, `CREATE TABLE IF NOT EXISTS`, auto-seed |
| Auth      | email + password, bcryptjs hashes, jose HS256 JWT in an HttpOnly cookie |
| Charts    | recharts · Motion: framer-motion · Icons: lucide-react |
| Tests     | Node's built-in `node:test` runner (no extra dependencies) |

---

## Data model

```
users ─┬─ settings         (1:1)  business profile & defaults
       ├─ clients          (1:N)  CRM records, each with a default currency
       ├─ invoices         (1:N)  ─┬─ invoice_items  (1:N)  line items, ordered by `position`
       │                           └─ payments       (1:N)  payments recorded against the invoice
       └─ expenses         (1:N)  categorized ledger rows (date, category, amount, note)
```

- **Money** is stored as `REAL` amounts already rounded to 2 decimals; tax/discount are stored as
  percentages. `subtotal`, `discountAmount`, `taxAmount` and `total` are persisted per invoice so
  historical invoices never re-compute differently.
- **Status** is `draft | sent | paid`; **overdue** is *derived* from `dueDate` at read time, never
  stored, so it can't drift out of sync.
- **Dates** are ISO `YYYY-MM-DD` strings. All arithmetic goes through `src/lib/money.ts` to avoid
  timezone and month-end bugs.
- Foreign keys cascade on delete, so removing a client removes its invoices (and their items and
  payments); removing an invoice removes its items and payments.

Schema is defined once in `src/db/schema.ts` (Drizzle) and mirrored by the raw `CREATE TABLE`
statements in `src/db/index.ts` for zero-config bootstrapping.

---

## Correctness notes (money & dates)

This is a finance app, so the money/date path is deliberate:

- **Single source of truth** — `computeTotals()` in `src/lib/money.ts` is used by the invoices API,
  the client-side form preview, and the print view. There is one rounding path, not three.
- **Rounding** — `round2()` rounds half-up to 2 decimals and mitigates float drift
  (`1.005 → 1.01`, `0.1 * 3 → 0.30`).
- **Order of operations** — subtotal → discount (%) → tax (%) on the discounted base.
- **Clamping** — tax/discount rates are clamped to 0–100 so malformed input can't produce negative
  tax or a discount larger than the subtotal.
- **Month-end safety** — `addMonthsISO()` clamps day-of-month to the target month's length
  (2026-01-31 + 1 month = 2026-02-28, not 2026-03-03). Used for due dates and recurring next-run.
- **Validation** — dates are validated as real calendar dates (`2026-02-31` is rejected) and due
  dates cannot precede issue dates.

---

## Testing

```bash
npm test          # node --experimental-strip-types --test test/*.test.mts
```

`test/money.test.mts` covers the critical path: invoice subtotal / discount / tax / total math,
float rounding, rate clamping, month-end and year-boundary date arithmetic, overdue/display-status
logic, and ISO date validation.

---

## Project layout

```
src/
  app/            landing, auth pages, /app workspace, REST API routes
    api/          invoices, clients, expenses, settings, auth
  components/     app shell, invoice form, charts, toasts, UI atoms
  db/             drizzle schema + lazy sqlite bootstrap & demo seeding
  lib/            auth helpers, money & date utilities, data access
test/             node:test suites for the money/date critical path
```

### API surface

| Method | Route | Purpose |
|--------|-------|---------|
| `POST` / `PUT` / `DELETE` | `/api/invoices`, `/api/invoices/:id` | create / update (incl. `mark-paid`, `send`) / delete |
| `GET` / `POST` / `PUT` / `DELETE` | `/api/clients`, `/api/clients/:id` | client CRUD (free-plan gated) |
| `GET` / `POST` / `DELETE` | `/api/expenses` | expense ledger |
| `GET` / `PUT` | `/api/settings` | business profile & defaults |
| `POST` | `/api/auth/login`, `/api/auth/register`, `/api/auth/logout` | session auth |

---

## Roadmap

- [ ] **Stripe checkout** — real Pro subscriptions with webhook-driven plan limits.
- [ ] **Recurring: delivery** — email the generated invoice and support weekly/quarterly cadences.
- [ ] **Teams** — multi-member workspaces with roles and per-client assignment.
- [ ] **e-Invoice / KVKK** — Turkish e-Arşiv / UBL-TR compliant exports and KVKK-aligned handling.
- [ ] Payment links & automated email reminders.
- [ ] Multi-currency dashboard with FX conversion (the dashboard currently sums totals as-is).
