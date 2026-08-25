export const CURRENCIES = [
  { code: "USD", label: "US Dollar", symbol: "$" },
  { code: "EUR", label: "Euro", symbol: "€" },
  { code: "GBP", label: "British Pound", symbol: "£" },
  { code: "TRY", label: "Turkish Lira", symbol: "₺" },
] as const;

export type CurrencyCode = (typeof CURRENCIES)[number]["code"];

export function currencySymbol(code: string): string {
  return CURRENCIES.find((c) => c.code === code)?.symbol ?? code;
}

/** Format a number as a localized currency string, e.g. $4,200.00 */
export function formatMoney(amount: number, code = "USD"): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: code,
      minimumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currencySymbol(code)}${amount.toFixed(2)}`;
  }
}

/** Compact money for KPI cards / chart axes: $12.4k */
export function formatMoneyCompact(amount: number, code = "USD"): string {
  const sym = currencySymbol(code);
  const abs = Math.abs(amount);
  if (abs >= 1_000_000) return `${sym}${(amount / 1_000_000).toFixed(1)}M`;
  if (abs >= 10_000) return `${sym}${(amount / 1_000).toFixed(1)}k`;
  return formatMoney(amount, code);
}

export const INVOICE_STATUSES = ["draft", "sent", "paid"] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export function isOverdue(invoice: { status: string; dueDate: string }): boolean {
  if (invoice.status !== "sent") return false;
  return new Date(`${invoice.dueDate}T23:59:59`) < new Date();
}

/** Display status: overdue wins over sent. */
export function displayStatus(
  invoice: { status: string; dueDate: string },
): InvoiceStatus | "overdue" {
  return isOverdue(invoice) ? "overdue" : (invoice.status as InvoiceStatus);
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function addDaysISO(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function addMonthsISO(isoDate: string, months: number): string {
  const d = new Date(`${isoDate}T12:00:00`);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

export function formatDate(isoDate: string | null | undefined): string {
  if (!isoDate) return "—";
  const d = new Date(`${isoDate.slice(0, 10)}T12:00:00`);
  return d.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
}

/* ------------------------------- totals math ------------------------------ */

export type LineItemInput = { description: string; quantity: number; unitPrice: number };

export function computeTotals(
  items: LineItemInput[],
  taxRate: number,
  discountRate: number,
): {
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
} {
  const subtotal = round2(items.reduce((sum, it) => sum + it.quantity * it.unitPrice, 0));
  const discountAmount = round2(subtotal * (discountRate / 100));
  const taxableBase = subtotal - discountAmount;
  const taxAmount = round2(taxableBase * (taxRate / 100));
  const total = round2(taxableBase + taxAmount);
  return { subtotal, discountAmount, taxAmount, total };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
