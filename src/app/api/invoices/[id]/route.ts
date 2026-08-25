import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { getDb } from "@/db";
import { invoiceItems, invoices, payments } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import { computeTotals, todayISO, addMonthsISO } from "@/lib/money";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: { id: string } };

type ItemInput = { description: string; quantity: number; unitPrice: number };

function ownedInvoice(userId: number, id: number) {
  return getDb()
    .select()
    .from(invoices)
    .where(and(eq(invoices.id, id), eq(invoices.userId, userId)))
    .get();
}

/** GET /api/invoices/:id */
export async function GET(_req: Request, { params }: Params) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const inv = ownedInvoice(user.id, Number(params.id));
  if (!inv) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  return NextResponse.json({ invoice: inv });
}

/**
 * PUT /api/invoices/:id — update fields + replace line items.
 * Also handles { action: "mark-paid" } and { action: "send" } shortcuts.
 */
export async function PUT(req: Request, { params }: Params) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = getDb();
  const inv = ownedInvoice(user.id, Number(params.id));
  if (!inv) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

  // ---- action shortcuts ----
  if (body.action === "mark-paid") {
    if (inv.status === "paid") {
      return NextResponse.json({ invoice: inv });
    }
    const updated = db
        .update(invoices)
      .set({ status: "paid" })
      .where(eq(invoices.id, inv.id))
      .returning().get();
    db.insert(payments)
      .values({
        userId: user.id,
        invoiceId: inv.id,
        amount: inv.total,
        currency: inv.currency,
        paidAt: todayISO(),
        note: typeof body.note === "string" && body.note.trim() ? body.note.trim() : "Marked as paid",
      })
      .run();
    return NextResponse.json({ invoice: updated });
  }

  if (body.action === "send") {
    if (inv.status !== "draft") {
      return NextResponse.json({ error: "Only draft invoices can be marked sent" }, { status: 400 });
    }
    const updated = db
        .update(invoices)
      .set({ status: "sent" })
      .where(eq(invoices.id, inv.id))
      .returning().get();
    return NextResponse.json({ invoice: updated });
  }

  if (body.action === "revert-draft") {
    // undo a mistaken send; payments are never deleted here
    const updated = db
        .update(invoices)
      .set({ status: inv.status === "sent" ? "draft" : inv.status })
      .where(eq(invoices.id, inv.id))
      .returning().get();
    return NextResponse.json({ invoice: updated });
  }

  // ---- full edit ----
  const rawItems = Array.isArray(body.items) ? body.items : [];
  const items: ItemInput[] = rawItems
    .map((it) => {
      const o = it as Record<string, unknown>;
      return {
        description: String(o.description ?? "").trim(),
        quantity: Number(o.quantity) || 0,
        unitPrice: Number(o.unitPrice) || 0,
      };
    })
    .filter((it) => it.description.length > 0);

  if (items.length === 0) {
    return NextResponse.json({ error: "At least one line item with a description is required" }, { status: 400 });
  }

  const taxRate = Number(body.taxRate ?? inv.taxRate) || 0;
  const discountRate = Number(body.discountRate ?? inv.discountRate) || 0;
  const totals = computeTotals(items, taxRate, discountRate);
  const recurring = Boolean(body.recurring);

  const updated = db
    .update(invoices)
    .set({
      clientId: Number(body.clientId ?? inv.clientId),
      issueDate: str(body.issueDate, inv.issueDate),
      dueDate: str(body.dueDate, inv.dueDate),
      currency: str(body.currency, inv.currency),
      taxRate,
      discountRate,
      notes: str(body.notes, inv.notes),
      recurring: recurring ? 1 : 0,
      nextRun: recurring ? str(body.nextRun, inv.nextRun ?? addMonthsISO(str(body.dueDate, inv.dueDate), 1)) : null,
      ...totals,
    })
    .where(eq(invoices.id, inv.id))
    .returning().get();

  db.delete(invoiceItems).where(eq(invoiceItems.invoiceId, inv.id)).run();
  db.insert(invoiceItems)
    .values(items.map((it, i) => ({ invoiceId: inv.id, ...it, position: i })))
    .run();

  return NextResponse.json({ invoice: updated });
}

/** DELETE /api/invoices/:id */
export async function DELETE(_req: Request, { params }: Params) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const inv = ownedInvoice(user.id, Number(params.id));
  if (!inv) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

  getDb().delete(invoices).where(eq(invoices.id, inv.id)).run();
  return NextResponse.json({ ok: true });
}

function str(v: unknown, fallback: string): string {
  return typeof v === "string" && v.trim() ? v.trim() : fallback;
}
