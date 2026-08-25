import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb, ensureSeeded } from "@/db";
import { settings, users } from "@/db/schema";
import { createSessionToken, setSessionCookie, verifyPassword } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST /api/auth/login */
export async function POST(req: Request) {
  ensureSeeded();
  let body: { email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const email = (body.email || "").trim().toLowerCase();
  const password = body.password || "";
  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
  }

  const db = getDb();
  const user = db.select().from(users).where(eq(users.email, email)).get();
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return NextResponse.json({ error: "Wrong email or password" }, { status: 401 });
  }

  await setSessionCookie(await createSessionToken(user.id, user.email));
  return NextResponse.json({ ok: true });
}
