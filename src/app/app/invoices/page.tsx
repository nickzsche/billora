import type { Metadata } from "next";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { Plus } from "lucide-react";
import { requireUser } from "@/lib/data";
import { generateDueRecurringInvoices } from "@/lib/data";
import { getDb, ensureSeeded } from "@/db";
import { clients, invoices } from "@/db/schema";
import { displayStatus, formatDate, formatMoneyCompact } from "@/lib/money";
import { EmptyState, StatusBadge } from "@/components/ui";

export const metadata: Metadata = { title: "Invoices" };

const FILTERS = ["all", "draft", "sent", "overdue", "paid"] as const;

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams?: { status?: string };
}) {
  const user = await requireUser();
  ensureSeeded();
  // Lazy recurring engine: materialise any follow-up invoices whose next run
  // date has arrived before rendering the list (no external scheduler needed).
  generateDueRecurringInvoices(user.id);
  const db = getDb();

  const invoiceRows = db.select().from(invoices).where(eq(invoices.userId, user.id)).all();
  const clientMap = new Map(
    db.select({ id: clients.id, name: clients.name }).from(clients)
      .where(eq(clients.userId, user.id)).all()
      .map((c) => [c.id, c.name]),
  );


  const active = (searchParams?.status && FILTERS.includes(searchParams.status as never)
    ? searchParams.status
    : "all") as string;

  const enriched = invoiceRows.map((inv) => ({
    ...inv,
    display: displayStatus(inv),
    clientName: clientMap.get(inv.clientId) ?? "Unknown client",
  }));

  const counts = {
    all: enriched.length,
    draft: enriched.filter((i) => i.display === "draft").length,
    sent: enriched.filter((i) => i.display === "sent").length,
    overdue: enriched.filter((i) => i.display === "overdue").length,
    paid: enriched.filter((i) => i.display === "paid").length,
  };

  const filtered = active === "all" ? enriched : enriched.filter((i) => i.display === active);
  filtered.sort((a, b) => (a.issueDate < b.issueDate ? 1 : -1));

  return (
    <div className="mx-auto max-w-5xl">
      <header className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Invoices</h1>
          <p className="mt-0.5 text-sm text-ink-400">{counts.all} total · auto-numbered INV-YYYY-NNNN</p>
        </div>
        <Link href="/app/invoices/new" className="btn btn-primary">
          <Plus size={16} /> New invoice
        </Link>
      </header>

      <nav className="scrollbar-none mt-5 flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((f) => (
          <Link
            key={f}
            href={f === "all" ? "/app/invoices" : `/app/invoices?status=${f}`}
            className={`whitespace-nowrap rounded-full border px-3.5 py-1.5 text-xs font-semibold capitalize transition-colors ${
              active === f
                ? "border-emerald-accent/50 bg-emerald-accent/12 text-emerald-soft"
                : "border-ink-600 text-ink-300 hover:border-ink-500 hover:text-white"
            }`}
          >
            {f} ({counts[f]})
          </Link>
        ))}
      </nav>

      <div className="mt-4 flex flex-col gap-2.5">
        {filtered.length === 0 ? (
          counts.all === 0 ? (
            <EmptyState
              kind="docs"
              title="No invoices yet"
              body="Create your first invoice — Billora numbers it, computes taxes and renders a print-ready PDF."
              action={{ href: "/app/invoices/new", label: "Create an invoice" }}
            />
          ) : (
            <EmptyState
              kind="chart"
              title={`Nothing ${active} right now`}
              body={`No invoices match the “${active}” filter. Try another filter or clear it.`}
            />
          )
        ) : (
          filtered.map((inv) => (
            <Link
              key={inv.id}
              href={`/app/invoices/${inv.id}`}
              className="surface surface-hover flex items-center justify-between gap-3 px-4 py-3.5 sm:px-5"
            >
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-white">
                  {inv.number}
                  {inv.recurring === 1 && (
                    <span className="ml-2 rounded border border-gold/40 px-1 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gold">
                      ↻ monthly
                    </span>
                  )}
                </div>
                <div className="truncate text-xs text-ink-400">
                  {inv.clientName} · Due {formatDate(inv.dueDate)}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span className="money text-sm font-bold sm:text-base">
                  {formatMoneyCompact(inv.total, inv.currency)}
                </span>
                <StatusBadge status={inv.display} />
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
