import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { settings } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import { getSettings } from "@/lib/data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/settings */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const s = await getSettings(user.id);
  return NextResponse.json({ settings: s });
}

/** PUT /api/settings */
export async function PUT(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await getSettings(user.id); // ensure row exists

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const db = getDb();

  const str = (k: string, max = 200): string | undefined => {
    const v = body[k];
    return typeof v === "string" ? v.trim().slice(0, max) : undefined;
  };

  let tax: number | undefined;
  if (body.defaultTaxRate !== undefined) {
    const n = Number(body.defaultTaxRate);
    if (!Number.isFinite(n) || n < 0 || n > 100) {
      return NextResponse.json({ error: "Tax rate must be between 0 and 100" }, { status: 400 });
    }
    tax = n;
  }

  const currency =
    typeof body.currency === "string" && ["USD", "EUR", "GBP", "TRY"].includes(body.currency)
      ? body.currency
      : undefined;

  const prefixRaw = str("invoicePrefix", 6)?.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const prefix = prefixRaw && prefixRaw.length > 0 ? prefixRaw : undefined;

  db.update(settings)
    .set({
      ...(str("businessName") !== undefined ? { businessName: str("businessName")! } : {}),
      ...(str("logoText", 2) !== undefined ? { logoText: str("logoText", 2)!.toUpperCase() } : {}),
      ...(str("address", 500) !== undefined ? { address: str("address", 500)! } : {}),
      ...(tax !== undefined ? { defaultTaxRate: tax } : {}),
      ...(prefix !== undefined ? { invoicePrefix: prefix } : {}),
      ...(currency !== undefined ? { currency } : {}),
    })
    .where(eq(settings.userId, user.id))
    .run();

  const updated = await getSettings(user.id);
  return NextResponse.json({ settings: updated });
}
