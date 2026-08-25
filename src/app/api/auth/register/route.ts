import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb, ensureSeeded } from "@/db";
import { settings, users } from "@/db/schema";
import { createSessionToken, hashPassword, setSessionCookie } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Free plan client cap; enforced in /api/clients. */
const FREE_CLIENT_LIMIT = 3;

/** POST /api/auth/register */
export async function POST(req: Request) {
  ensureSeeded();
  let body: { email?: string; password?: string; name?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const email = (body.email || "").trim().toLowerCase();
  const password = body.password || "";
  const name = (body.name || "").trim();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  const db = getDb();
  const existing = db.select({ id: users.id }).from(users).where(eq(users.email, email)).get();
  if (existing) {
    return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
  }

  const user = db
    .insert(users)
    .values({
      email,
      passwordHash: await hashPassword(password),
      name: name || email.split("@")[0],
      createdAt: new Date().toISOString().slice(0, 10),
    })
    .returning().get();

  db.insert(settings)
    .values({
      userId: user.id,
      businessName: name ? `${name.split(" ")[0]}'s Studio` : "My Studio",
      logoText: (name || "B").charAt(0).toUpperCase(),
      defaultTaxRate: 20,
      invoicePrefix: "INV",
      currency: "USD",
    })
    .run();

  await setSessionCookie(await createSessionToken(user.id, user.email));
  return NextResponse.json({ ok: true });
}
