import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { getDb } from "@/db";
import { expenses } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CATEGORIES = [
  "Software",
  "Hardware",
  "Office",
  "Marketing",
  "Travel",
  "Contractors",
  "Education",
  "Other",
];

/** GET /api/expenses */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rows = getDb()
    .select()
    .from(expenses)
    .where(eq(expenses.userId, user.id))
    .all()
    .sort((a, b) => (a.date < b.date ? 1 : -1));
  return NextResponse.json({ expenses: rows });
}

/** POST /api/expenses */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const amount = Number(body.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "Enter a valid amount" }, { status: 400 });
  }
  const date =
    typeof body.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.date)
      ? body.date
      : new Date().toISOString().slice(0, 10);
  const category =
    typeof body.category === "string" && CATEGORIES.includes(body.category)
      ? body.category
      : "Other";

  const expense = getDb()
      .insert(expenses)
    .values({
      userId: user.id,
      category,
      amount: Math.round(amount * 100) / 100,
      date,
      note: typeof body.note === "string" ? body.note.trim() : "",
    })
    .returning().get();

  return NextResponse.json({ expense });
}

/** DELETE /api/expenses?id=123 */
export async function DELETE(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = Number(new URL(req.url).searchParams.get("id"));
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "Missing expense id" }, { status: 400 });
  }
  const db = getDb();
  const existing = db
    .select()
    .from(expenses)
    .where(and(eq(expenses.id, id), eq(expenses.userId, user.id)))
    .get();
  if (!existing) return NextResponse.json({ error: "Expense not found" }, { status: 404 });

  db.delete(expenses).where(eq(expenses.id, id)).run();
  return NextResponse.json({ ok: true });
}
