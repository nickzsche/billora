import type { Metadata } from "next";
import { requireUser } from "@/lib/data";
import { getDb, ensureSeeded } from "@/db";
import { clients } from "@/db/schema";
import { eq } from "drizzle-orm";
import { ClientsView } from "./clients-view";
import { EmptyState } from "@/components/ui";

export const metadata: Metadata = { title: "Clients" };

export default async function ClientsPage() {
  const user = await requireUser();
  ensureSeeded();
  const rows = getDb()
    .select()
    .from(clients)
    .where(eq(clients.userId, user.id))
    .all()
    .sort((a, b) => a.name.localeCompare(b.name));

  if (rows.length === 0) {
    return (
      <div className="mx-auto max-w-4xl pt-6">
        <h1 className="font-display mb-6 text-2xl font-bold text-white">Clients</h1>
        <EmptyState
          kind="clients"
          title="No clients yet"
          body="Add your first client and you can start invoicing them right away."
          action={{ href: "/app/clients?new=1", label: "Add a client" }}
        />
        <ClientsView initial={rows} />
      </div>
    );
  }

  return <ClientsView initial={rows} />;
}
