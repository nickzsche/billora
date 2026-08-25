import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { getDb } from "@/db";
import { clients } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: { id: string } };

async function ownedClient(userId: number, id: number) {
  return getDb()
    .select()
    .from(clients)
    .where(and(eq(clients.id, id), eq(clients.userId, userId)))
    .get();
}

/** GET /api/clients/:id */
export async function GET(_req: Request, { params }: Params) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const client = await ownedClient(user.id, Number(params.id));
  if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });
  return NextResponse.json({ client });
}

/** PUT /api/clients/:id */
export async function PUT(req: Request, { params }: Params) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const db = getDb();
  const existing = await ownedClient(user.id, Number(params.id));
  if (!existing) return NextResponse.json({ error: "Client not found" }, { status: 404 });

  const str = (k: string, fallback: string) =>
    typeof body[k] === "string" ? (body[k] as string).trim() : fallback;

  const currency =
    typeof body.currency === "string" && ["USD", "EUR", "GBP", "TRY"].includes(body.currency)
      ? body.currency
      : existing.currency;

  const client = db
    .update(clients)
    .set({
      name: str("name", existing.name) || existing.name,
      email: str("email", existing.email),
      company: str("company", existing.company),
      address: str("address", existing.address),
      notes: str("notes", existing.notes),
      currency,
    })
    .where(eq(clients.id, existing.id))
    .returning().get();

  return NextResponse.json({ client });
}

/** DELETE /api/clients/:id */
export async function DELETE(_req: Request, { params }: Params) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getDb();
  const existing = await ownedClient(user.id, Number(params.id));
  if (!existing) return NextResponse.json({ error: "Client not found" }, { status: 404 });

  db.delete(clients).where(eq(clients.id, existing.id)).run();
  return NextResponse.json({ ok: true });
}
