import { and, eq } from "drizzle-orm";
import { getDb, ensureSeeded } from "@/db";
import {
  clients,
  invoiceItems,
  invoices,
  settings,
  type Invoice,
} from "@/db/schema";
import { getSessionUser, type SessionUser } from "@/lib/auth";
import { addDaysISO, addMonthsISO, todayISO } from "@/lib/money";
import { redirect } from "next/navigation";

/** Require a logged-in user in a server component; redirects to /login otherwise. */
export async function requireUser(): Promise<SessionUser> {
  ensureSeeded();
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

export type AppSettings = typeof settings.$inferSelect;

/** Fetch the user's business settings, creating sensible defaults on first use. */
export async function getSettings(userId: number): Promise<AppSettings> {
  const db = getDb();
  const existing = db.select().from(settings).where(eq(settings.userId, userId)).get();
  if (existing) return existing;
  db.insert(settings)
    .values({ userId, defaultTaxRate: 20, invoicePrefix: "INV", currency: "USD" })
    .run();
  return db.select().from(settings).where(eq(settings.userId, userId)).get() as AppSettings;
}

/**
 * Next invoice number like INV-2026-0007 (prefix + current year + max sequence + 1).
 * Single source of truth for numbering — used by the invoices API and the
 * recurring generator so they can never diverge.
 */
export function computeInvoiceNumber(userId: number, prefix?: string): string {
  const p = (prefix || "INV").trim().toUpperCase().replace(/[^A-Z0-9]/g, "") || "INV";
  const year = new Date().getFullYear();
  const rows = getDb()
    .select({ number: invoices.number })
    .from(invoices)
    .where(eq(invoices.userId, userId))
    .all();
  let max = 0;
  for (const row of rows) {
    const m = /^([A-Z0-9]+)-(\d{4})-(\d+)$/.exec(row.number);
    if (m && m[1] === p && Number(m[2]) === year) {
      max = Math.max(max, Number(m[3]));
    }
  }
  return `${p}-${year}-${String(max + 1).padStart(4, "0")}`;
}

/** Async convenience wrapper that resolves the prefix from the user's settings. */
export async function nextInvoiceNumber(userId: number, prefix?: string): Promise<string> {
  const s = await getSettings(userId);
  return computeInvoiceNumber(userId, prefix || s.invoicePrefix);
}

/** All invoices for a user, newest first (by issue date). */
export function listInvoices(userId: number): Invoice[] {
  return getDb()
    .select()
    .from(invoices)
    .where(eq(invoices.userId, userId))
    .all()
    .sort((a, b) =>
      a.issueDate < b.issueDate ? 1 : a.issueDate > b.issueDate ? -1 : b.id - a.id,
    );
}

/**
 * Generate follow-up invoices for recurring templates whose next run date has
 * arrived. Runs lazily on the invoices page (no cron needed for a self-hosted
 * single-user app); each generated invoice is a draft and the template's
 * `nextRun` is advanced one month at a time so nothing is skipped.
 * Cancelled/paused templates (never flagged recurring) are ignored. `MAX_CATCHUP`
 * bounds a single call so a long-dormant template can't generate hundreds at once.
 *
 * @returns how many invoices were created.
 */
export function generateDueRecurringInvoices(userId: number): number {
  const MAX_CATCHUP = 36;
  const db = getDb();
  const today = todayISO();

  const templates = db
    .select()
    .from(invoices)
    .where(and(eq(invoices.userId, userId), eq(invoices.recurring, 1)))
    .all()
    .filter(
      (inv) =>
        inv.nextRun !== null &&
        inv.nextRun <= today &&
        (inv.status === "sent" || inv.status === "paid"),
    );

  let created = 0;
  for (const tpl of templates) {
    const items = db
      .select()
      .from(invoiceItems)
      .where(eq(invoiceItems.invoiceId, tpl.id))
      .all()
      .sort((a, b) => a.position - b.position);
    if (items.length === 0) {
      // nothing to bill — advance past due so we don't retry forever
      db.update(invoices)
        .set({ nextRun: addMonthsISO(tpl.nextRun as string, 1) })
        .where(eq(invoices.id, tpl.id))
        .run();
      continue;
    }

    const gapDays = daysBetween(tpl.issueDate, tpl.dueDate);
    const s = db.select().from(settings).where(eq(settings.userId, userId)).get();
    const prefix = (s?.invoicePrefix || "INV").toUpperCase();

    let nextRun = tpl.nextRun as string;
    let guard = 0;
    while (nextRun <= today && guard < MAX_CATCHUP) {
      guard++;
      const issueDate = nextRun;
      const dueDate = addDaysISO(issueDate, gapDays);
      const inv = db
        .insert(invoices)
        .values({
          userId,
          clientId: tpl.clientId,
          number: computeInvoiceNumber(userId, prefix),
          status: "draft",
          issueDate,
          dueDate,
          currency: tpl.currency,
          taxRate: tpl.taxRate,
          discountRate: tpl.discountRate,
          notes: tpl.notes,
          recurring: 0,
          nextRun: null,
          subtotal: tpl.subtotal,
          discountAmount: tpl.discountAmount,
          taxAmount: tpl.taxAmount,
          total: tpl.total,
          createdAt: today,
        })
        .returning()
        .get();
      db.insert(invoiceItems)
        .values(
          items.map((it, i) => ({
            invoiceId: inv.id,
            description: it.description,
            quantity: it.quantity,
            unitPrice: it.unitPrice,
            position: i,
          })),
        )
        .run();
      created++;
      nextRun = addMonthsISO(nextRun, 1);
    }

    db.update(invoices)
      .set({ nextRun })
      .where(eq(invoices.id, tpl.id))
      .run();
  }

  return created;
}

/** Whole days from `from` to `to` (UTC); 0 if either date is invalid or negative. */
function daysBetween(from: string, to: string): number {
  const a = Date.parse(`${from}T00:00:00Z`);
  const b = Date.parse(`${to}T00:00:00Z`);
  if (Number.isNaN(a) || Number.isNaN(b)) return 0;
  const days = Math.round((b - a) / (24 * 60 * 60 * 1000));
  return days > 0 ? days : 0;
}
