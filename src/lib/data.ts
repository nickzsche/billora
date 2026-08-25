import { eq } from "drizzle-orm";
import { getDb, ensureSeeded } from "@/db";
import { invoices, settings, type Invoice } from "@/db/schema";
import { getSessionUser, type SessionUser } from "@/lib/auth";
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

/** Next invoice number like INV-2026-0007 (prefix + current year + max sequence + 1). */
export async function nextInvoiceNumber(userId: number, prefix?: string): Promise<string> {
  const s = await getSettings(userId);
  const p = (prefix || s.invoicePrefix || "INV").trim().toUpperCase() || "INV";
  const year = new Date().getFullYear();
  const rows = db()
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

/** All invoices for a user, newest first. */
export function listInvoices(userId: number): Invoice[] {
  return db()
    .select()
    .from(invoices)
    .where(eq(invoices.userId, userId))
    .all()
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : b.id - a.id));
}

function db() {
  ensureSeeded();
  return getDb();
}
