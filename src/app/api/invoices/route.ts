import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { clients, invoiceItems, invoices, payments, settings } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/invoices — create.
 * Body: { clientId, issueDate, dueDate, currency, taxRate, discountRate, notes,
 *         recurring, nextRun, status?, items: [{description, quantity, unitPrice}] }
 */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as InvoicePayload | null;
  if (!body) return NextResponse.json({ error: "Invalid request body" }, { status: 400 });

  const db = getDb();

  const client = db
    .select({ id: clients.id, currency: clients.currency })
    .from(clients)
    .where(eq(clients.id, Number(body.clientId)))
    .get();
  if (!client || (await ownsClient(user.id, Number(body.clientId))) === false) {
    return NextResponse.json({ error: "Pick a valid client for this invoice" }, { status: 400 });
  }

  const items = normalizeItems(body.items);
  if (items.length === 0) {
    return NextResponse.json({ error: "At least one line item is required" }, { status: 400 });
  }

  const s = db.select().from(settings).where(eq(settings.userId, user.id)).get();
  const prefix = (s?.invoicePrefix || "INV").toUpperCase();
  const year = new Date().getFullYear();
  const existing = db
    .select({ number: invoices.number })
    .from(invoices)
    .where(eq(invoices.userId, user.id))
    .all();
  let max = 0;
  for (const r of existing) {
    const m = /^([A-Z0-9]+)-(\d{4})-(\d+)$/.exec(r.number);
    if (m && m[1] === prefix && Number(m[2]) === year) max = Math.max(max, Number(m[3]));
  }
  const number = `${prefix}-${year}-${String(max + 1).padStart(4, "0")}`;

  const totals = computeTotalsShared(items, num(body.taxRate), num(body.discountRate));

  const inv = db
    .insert(invoices)
    .values({
      userId: user.id,
      clientId: Number(body.clientId),
      number,
      status: body.status === "sent" || body.status === "paid" ? body.status : "draft",
      issueDate: strOr(body.issueDate, today()),
      dueDate: strOr(body.dueDate, today()),
      currency: strOr(body.currency, "USD"),
      taxRate: num(body.taxRate),
      discountRate: num(body.discountRate),
      notes: strOr(body.notes, ""),
      recurring: body.recurring ? 1 : 0,
      nextRun: body.recurring ? strOr(body.nextRun, addMonth(strOr(body.dueDate, today()))) : null,
      ...totals,
      createdAt: new Date().toISOString().slice(0, 10),
    })
    .returning().get();

  db.insert(invoiceItems)
    .values(items.map((it, i) => ({ invoiceId: inv.id, ...it, position: i })))
    .run();

  if (inv.status === "paid") {
    recordPayment(db, inv.id, inv.userId, inv.total, inv.currency);
  }

  return NextResponse.json({ invoice: inv });
}

/* ------------------------------- shared bits ------------------------------ */

async function ownsClient(userId: number, clientId: number): Promise<boolean> {
  const row = getDb()
    .select({ userId: clients.userId })
    .from(clients)
    .where(eq(clients.id, clientId))
    .get();
  return !!row && row.userId === userId;
}

function recordPayment(
  db: ReturnType<typeof getDb>,
  invoiceId: number,
  userId: number,
  amount: number,
  currency: string,
) {
  db.insert(payments)
    .values({
      invoiceId,
      userId,
      amount,
      currency,
      paidAt: new Date().toISOString().slice(0, 10),
      note: "Recorded via Billora",
    })
    .run();
}

function normalizeItems(items?: ItemPayload[]): ItemPayload[] {
  if (!Array.isArray(items)) return [];
  return items
    .map((it) => ({
      description: String(it.description ?? "").trim(),
      quantity: Number(it.quantity) || 0,
      unitPrice: Number(it.unitPrice) || 0,
    }))
    .filter((it) => it.description.length > 0);
}

function computeTotalsShared(items: ItemPayload[], taxRate: number, discountRate: number) {
  const subtotal = r2(items.reduce((s, it) => s + it.quantity * it.unitPrice, 0));
  const discountAmount = r2(subtotal * (discountRate / 100));
  const base = subtotal - discountAmount;
  const taxAmount = r2(base * (taxRate / 100));
  const total = r2(base + taxAmount);
  return { subtotal, discountAmount, taxAmount, total };
}

type InvoicePayload = {
  clientId?: number | string;
  status?: string;
  issueDate?: string;
  dueDate?: string;
  currency?: string;
  taxRate?: number | string;
  discountRate?: number | string;
  notes?: string;
  recurring?: boolean;
  nextRun?: string;
  items?: ItemPayload[];
};
type ItemPayload = { description: string; quantity: number; unitPrice: number };

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
function strOr(v: string | undefined, fallback: string): string {
  return v && v.trim() ? v.trim() : fallback;
}
function today(): string {
  return new Date().toISOString().slice(0, 10);
}
function addMonth(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  d.setMonth(d.getMonth() + 1);
  return d.toISOString().slice(0, 10);
}
function r2(n: number): number {
  return Math.round(n * 100) / 100;
}
