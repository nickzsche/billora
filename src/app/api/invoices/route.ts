import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb, ensureSeeded } from "@/db";
import { clients, invoiceItems, invoices, payments, settings } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import { computeInvoiceNumber } from "@/lib/data";
import { addMonthsISO, computeTotals, isValidISODate, todayISO } from "@/lib/money";

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

  ensureSeeded();
  const body = (await req.json().catch(() => null)) as InvoicePayload | null;
  if (!body) return NextResponse.json({ error: "Invalid request body" }, { status: 400 });

  const db = getDb();

  const clientId = Number(body.clientId);
  if (!Number.isInteger(clientId) || clientId <= 0) {
    return NextResponse.json({ error: "Pick a client for this invoice" }, { status: 400 });
  }
  const client = db
    .select({ id: clients.id, currency: clients.currency, userId: clients.userId })
    .from(clients)
    .where(eq(clients.id, clientId))
    .get();
  if (!client || client.userId !== user.id) {
    return NextResponse.json({ error: "Pick a valid client for this invoice" }, { status: 400 });
  }

  const items = normalizeItems(body.items);
  if (items.length === 0) {
    return NextResponse.json({ error: "At least one line item is required" }, { status: 400 });
  }

  const issueDate = isValidISODate(body.issueDate) ? body.issueDate : todayISO();
  const dueDate = isValidISODate(body.dueDate) ? body.dueDate : issueDate;
  if (dueDate < issueDate) {
    return NextResponse.json({ error: "Due date cannot be before the issue date" }, { status: 400 });
  }

  const s = db.select().from(settings).where(eq(settings.userId, user.id)).get();
  const number = computeInvoiceNumber(user.id, s?.invoicePrefix);

  const totals = computeTotals(items, num(body.taxRate), num(body.discountRate));
  const recurring = Boolean(body.recurring);
  const nextRun = recurring
    ? isValidISODate(body.nextRun)
      ? (body.nextRun as string)
      : addMonthsISO(dueDate, 1)
    : null;

  const inv = db
    .insert(invoices)
    .values({
      userId: user.id,
      clientId,
      number,
      status: body.status === "sent" || body.status === "paid" ? body.status : "draft",
      issueDate,
      dueDate,
      currency: strOr(body.currency, client.currency || "USD"),
      taxRate: num(body.taxRate),
      discountRate: num(body.discountRate),
      notes: strOr(body.notes, ""),
      recurring: recurring ? 1 : 0,
      nextRun,
      ...totals,
      createdAt: todayISO(),
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
      paidAt: todayISO(),
      note: "Recorded via Billora",
    })
    .run();
}

function normalizeItems(items?: ItemPayload[]): ItemPayload[] {
  if (!Array.isArray(items)) return [];
  return items
    .map((it) => ({
      description: String(it?.description ?? "").trim(),
      quantity: num(it?.quantity),
      unitPrice: num(it?.unitPrice),
    }))
    .filter((it) => it.description.length > 0);
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
  return typeof v === "string" && v.trim() ? v.trim() : fallback;
}
