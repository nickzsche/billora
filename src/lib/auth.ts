import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { users } from "@/db/schema";

/**
 * Session auth:
 * - passwords hashed with bcryptjs
 * - session token = jose HS256 JWT stored in an HttpOnly cookie
 */

const COOKIE_NAME = "billora_session";
const SESSION_DAYS = 30;

function secret(): Uint8Array {
  const raw =
    process.env.AUTH_SECRET ||
    process.env.AUTH_SECRET_FILE_CONTENTS ||
    "billora-dev-secret-do-not-use-in-production";
  return new TextEncoder().encode(raw);
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hashSync(plain, 10);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compareSync(plain, hash);
}

export async function createSessionToken(userId: number, email: string): Promise<string> {
  return new SignJWT({ sub: String(userId), email })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setIssuer("billora")
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(secret());
}

export async function setSessionCookie(token: string): Promise<void> {
  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export type SessionUser = {
  id: number;
  email: string;
  name: string;
};

/** Returns the logged-in user or null. Safe to call from server components. */
export async function getSessionUser(): Promise<SessionUser | null> {
  let token: string | undefined;
  try {
    const store = await cookies();
    token = store.get(COOKIE_NAME)?.value;
  } catch {
    return null;
  }
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret(), { issuer: "billora" });
    const userId = Number(payload.sub);
    if (!Number.isFinite(userId)) return null;
    const db = getDb();
    const user = db.select().from(users).where(eq(users.id, userId)).get();
    if (!user) return null;
    return { id: user.id, email: user.email, name: user.name };
  } catch {
    return null;
  }
}
