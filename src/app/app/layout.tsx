import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { requireUser, getSettings } from "@/lib/data";

export const metadata: Metadata = { title: "Workspace" };

// All workspace pages read the session cookie & SQLite — never prerender at build time.
export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const s = await getSettings(user.id);
  return (
    <AppShell userName={user.name} businessName={s.businessName}>
      {children}
    </AppShell>
  );
}
