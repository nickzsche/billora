import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb, ensureSeeded } from "@/db";
import { clients } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import { isSupportedCurrency, todayISO } from "@/lib/money";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FREE_CLIENT_LIMIT = 3;

async function guard() {
  const user = await getSessionUser();
  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  return { user };
}

/** GET /api/clients */
export async function GET() {
  const g = await guard();
  if (g.error) return g.error;
  const rows = getDb().select().from(clients).where(eq(clients.userId, g.user.id)).all();
  return NextResponse.json({ clients: rows });
}

/** POST /api/clients */
export async function POST(req: Request) {
  const g = await guard();
  if (g.error) return g.error;
  ensureSeeded();

  const body = await readBody(req);
  if (!body.name) {
    return NextResponse.json({ error: "Client name is required" }, { status: 400 });
  }

  const db = getDb();
  const count = db
    .select({ id: clients.id })
    .from(clients)
    .where(eq(clients.userId, g.user.id))
    .all().length;

  // Free-plan gate. The demo workspace is treated as Pro so every seeded client stays visible.
  const isDemo = g.user.email === "demo@billora.app";
  if (!isDemo && count >= FREE_CLIENT_LIMIT) {
    return NextResponse.json(
      { error: "Free plan allows up to 3 clients. Upgrade to Pro for unlimited clients.", upgrade: true },
      { status: 402 },
    );
  }

  const client = db
    .insert(clients)
    .values({
      userId: g.user.id,
      name: body.name,
      email: body.email ?? "",
      company: body.company ?? "",
      address: body.address ?? "",
      currency: isSupportedCurrency(body.currency) ? body.currency : "USD",
      notes: body.notes ?? "",
      createdAt: todayISO(),
    })
    .returning().get();

  return NextResponse.json({ client });
}

async function readBody(req: Request): Promise<Record<string, string>> {
  try {
    const raw = (await req.json()) as Record<string, unknown>;
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(raw)) out[k] = typeof v === "string" ? v.trim() : String(v ?? "");
    return out;
  } catch {
    return {};
  }
}
