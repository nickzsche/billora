import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST /api/auth/logout */
export async function POST() {
  await clearSessionCookie();
  return NextResponse.redirect(new URL("/", process.env.APP_ORIGIN || "http://localhost:3420"), 303);
}
