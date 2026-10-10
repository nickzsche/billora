export const CURRENCIES = [
  { code: "USD", label: "US Dollar", symbol: "$" },
  { code: "EUR", label: "Euro", symbol: "€" },
  { code: "GBP", label: "British Pound", symbol: "£" },
  { code: "TRY", label: "Turkish Lira", symbol: "₺" },
] as const;

export type CurrencyCode = (typeof CURRENCIES)[number]["code"];

const VALID_CURRENCY_CODES = new Set<string>(CURRENCIES.map((c) => c.code));

/** True if `code` is one of the supported ISO currency codes. */
export function isSupportedCurrency(code: unknown): code is CurrencyCode {
  return typeof code === "string" && VALID_CURRENCY_CODES.has(code);
}

export function currencySymbol(code: string): string {
  return CURRENCIES.find((c) => c.code === code)?.symbol ?? code;
}

/** Format a number as a localized currency string, e.g. $4,200.00 */
export function formatMoney(amount: number, code = "USD"): string {
  const value = Number.isFinite(amount) ? amount : 0;
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: code,
      minimumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${currencySymbol(code)}${value.toFixed(2)}`;
  }
}

/** Compact money for KPI cards / chart axes: $12.4k */
export function formatMoneyCompact(amount: number, code = "USD"): string {
  const sym = currencySymbol(code);
  const value = Number.isFinite(amount) ? amount : 0;
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${sym}${(value / 1_000_000).toFixed(1)}M`;
  if (abs >= 10_000) return `${sym}${(value / 1_000).toFixed(1)}k`;
  return formatMoney(value, code);
}

export const INVOICE_STATUSES = ["draft", "sent", "paid"] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export function isOverdue(invoice: { status: string; dueDate: string }): boolean {
  if (invoice.status !== "sent") return false;
  const due = parseISODate(invoice.dueDate);
  if (!due) return false;
  // overdue once the due date's end-of-day has passed
  return due.getTime() + 24 * 60 * 60 * 1000 - 1 < Date.now();
}

/** Display status: overdue wins over sent. */
export function displayStatus(
  invoice: { status: string; dueDate: string },
): InvoiceStatus | "overdue" {
  return isOverdue(invoice) ? "overdue" : (invoice.status as InvoiceStatus);
}

/** Parse a `YYYY-MM-DD` string to a UTC-midnight Date, or null if malformed. */
export function parseISODate(iso: string | null | undefined): Date | null {
  if (typeof iso !== "string") return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return null;
  const d = new Date(`${m[1]}-${m[2]}-${m[3]}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  // reject roll-overs like 2026-02-31
  if (d.getUTCFullYear() !== Number(m[1]) || d.getUTCMonth() + 1 !== Number(m[2]) || d.getUTCDate() !== Number(m[3])) {
    return null;
  }
  return d;
}

/** True if `value` is a well-formed `YYYY-MM-DD` date. */
export function isValidISODate(value: unknown): value is string {
  return typeof value === "string" && parseISODate(value) !== null;
}

function toISO(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(
    d.getUTCDate(),
  ).padStart(2, "0")}`;
}

export function todayISO(): string {
  const now = new Date();
  return toISO(new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())));
}

export function addDaysISO(isoDate: string, days: number): string {
  const d = parseISODate(isoDate) ?? parseISODate(todayISO())!;
  d.setUTCDate(d.getUTCDate() + days);
  return toISO(d);
}

/**
 * Add calendar months, clamping the day to the target month's length so that
 * e.g. 2026-01-31 + 1 month = 2026-02-28 (not 2026-03-03). Matters for due
 * dates and recurring next-run dates.
 */
export function addMonthsISO(isoDate: string, months: number): string {
  const d = parseISODate(isoDate) ?? parseISODate(todayISO())!;
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + months);
  const daysInTargetMonth = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, daysInTargetMonth));
  return toISO(d);
}

export function formatDate(isoDate: string | null | undefined): string {
  if (!isoDate) return "—";
  const d = parseISODate(isoDate);
  if (!d) return "—";
  return d.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

/* ------------------------------- totals math ------------------------------ */

export type LineItemInput = { description: string; quantity: number; unitPrice: number };

/** Round to 2 decimals with half-up rounding, resistant to float drift (e.g. 1.005 → 1.01). */
export function round2(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** Clamp a percentage to a sane 0–100 range; non-finite input becomes 0. */
export function clampRate(rate: number): number {
  if (!Number.isFinite(rate)) return 0;
  return Math.min(100, Math.max(0, rate));
}

export type Totals = {
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
};

/**
 * Invoice math — the single source of truth used by the API, the form and the
 * print view. Order: subtotal → discount (%) → tax (%) on the discounted base.
 * Rates are clamped to 0–100 so malformed input can never produce negative tax
 * or a discount larger than the subtotal.
 */
export function computeTotals(
  items: LineItemInput[],
  taxRate: number,
  discountRate: number,
): Totals {
  const subtotal = round2(
    items.reduce(
      (sum, it) => sum + safeNumber(it.quantity) * safeNumber(it.unitPrice),
      0,
    ),
  );
  const discountAmount = round2(subtotal * (clampRate(discountRate) / 100));
  const taxableBase = round2(subtotal - discountAmount);
  const taxAmount = round2(taxableBase * (clampRate(taxRate) / 100));
  const total = round2(taxableBase + taxAmount);
  return { subtotal, discountAmount, taxAmount, total };
}

function safeNumber(n: number): number {
  return Number.isFinite(n) ? n : 0;
}
