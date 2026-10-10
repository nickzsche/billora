import Link from "next/link";
import {
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  AlertTriangle,
  Plus,
} from "lucide-react";
import { requireUser } from "@/lib/data";
import { getDb, ensureSeeded } from "@/db";
import { clients, expenses, invoices, payments } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  displayStatus,
  formatDate,
  formatMoney,
  formatMoneyCompact,
  round2,
} from "@/lib/money";
import { DashboardChart } from "@/components/dashboard-chart";
import { EmptyState, StatusBadge } from "@/components/ui";

export default async function DashboardPage() {
  const user = await requireUser();
  ensureSeeded();
  const db = getDb();

  const invoiceRows = db
    .select()
    .from(invoices)
    .where(eq(invoices.userId, user.id))
    .all();
  const paymentRows = db
    .select()
    .from(payments)
    .where(eq(payments.userId, user.id))
    .all();
  const expenseRows = db
    .select()
    .from(expenses)
    .where(eq(expenses.userId, user.id))
    .all();
  const clientCount = db
    .select({ id: clients.id })
    .from(clients)
    .where(eq(clients.userId, user.id))
    .all().length;

  const now = new Date();
  const monthKey = (isoDate: string) => isoDate.slice(0, 7);
  const thisMonth = now.toISOString().slice(0, 7);

  // KPIs
  const revenueThisMonth = round2(
    paymentRows.filter((p) => monthKey(p.paidAt) === thisMonth).reduce((s, p) => s + p.amount, 0),
  );
  let outstanding = 0;
  let overdue = 0;
  for (const inv of invoiceRows) {
    if (inv.status === "paid" || inv.status === "draft") continue;
    const isOver = displayStatus(inv) === "overdue";
    if (isOver) overdue += inv.total;
    else outstanding += inv.total;
  }
  outstanding = round2(outstanding);
  overdue = round2(overdue);
  const expensesThisMonth = round2(
    expenseRows.filter((e) => monthKey(e.date) === thisMonth).reduce((s, e) => s + e.amount, 0),
  );

  // Chart data — last 6 complete-ish months incl current
  const months: string[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  const chartData = months.map((m) => ({
    month: new Date(`${m}-15T12:00:00`).toLocaleDateString("en-US", { month: "short" }),
    revenue: round2(paymentRows.filter((p) => monthKey(p.paidAt) === m).reduce((s, p) => s + p.amount, 0)),
    expenses: round2(expenseRows.filter((e) => monthKey(e.date) === m).reduce((s, e) => s + e.amount, 0)),
  }));

  // Recent invoices with client names
  const clientMap = new Map(
    db.select({ id: clients.id, name: clients.name }).from(clients)
      .where(eq(clients.userId, user.id)).all()
      .map((c) => [c.id, c.name]),
  );
  const recent = [...invoiceRows]
    .sort((a, b) => (a.issueDate < b.issueDate ? 1 : -1))
    .slice(0, 6);

  const base = user.email === "demo@billora.app";

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Dashboard</h1>
          <p className="mt-0.5 text-sm text-ink-400">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
        <Link href="/app/invoices/new" className="btn btn-primary">
          <Plus size={16} /> New invoice
        </Link>
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Revenue this month"
          value={formatMoney(revenueThisMonth)}
          icon={ArrowUpRight}
          accent="emerald"
          sub={`${paymentRows.length} payments all-time`}
        />
        <KpiCard
          label="Outstanding"
          value={formatMoney(outstanding)}
          icon={Clock}
          accent="info"
          sub="Sent & awaiting payment"
        />
        <KpiCard
          label="Overdue"
          value={formatMoney(overdue)}
          icon={AlertTriangle}
          accent="danger"
          sub="Past due date"
        />
        <KpiCard
          label="Expenses this month"
          value={formatMoney(expensesThisMonth)}
          icon={ArrowDownRight}
          accent="gold"
          sub={`${clientCount} active clients`}
        />
      </section>

      <DashboardChart data={chartData} />

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-white">Recent invoices</h2>
          <Link href="/app/invoices" className="text-sm font-medium text-emerald-soft hover:text-emerald-accent">
            View all →
          </Link>
        </div>

        {recent.length === 0 ? (
          <EmptyState
            kind="docs"
            title="No invoices yet"
            body="Create your first invoice and Billora will handle numbering, taxes and totals."
            action={{ href: "/app/invoices/new", label: "Create an invoice" }}
          />
        ) : (
          <div className="surface divide-y divide-ink-700/70 overflow-hidden">
            {recent.map((inv) => (
              <Link
                key={inv.id}
                href={`/app/invoices/${inv.id}`}
                className="flex items-center justify-between gap-3 px-4 py-3.5 transition-colors hover:bg-white/[0.03] sm:px-5"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-white">
                    {inv.number}
                    <span className="ml-2 font-normal text-ink-300">
                      {clientMap.get(inv.clientId) ?? "Client"}
                    </span>
                  </div>
                  <div className="text-xs text-ink-500">
                    Issued {formatDate(inv.issueDate)} · Due {formatDate(inv.dueDate)}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="money hidden text-sm font-bold sm:block">
                    {formatMoneyCompact(inv.total, inv.currency)}
                  </span>
                  <StatusBadge status={displayStatus(inv)} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {!base && (
        <p className="text-center text-xs text-ink-600">
          Tip: sign in as demo@billora.app to explore a workspace full of seeded data.
        </p>
      )}
    </div>
  );
}

function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  sub: string;
  icon: React.ComponentType<{ size?: number | string; className?: string }>;
  accent: "emerald" | "info" | "danger" | "gold";
}) {
  const accents: Record<string, string> = {
    emerald: "border-emerald-accent/25 bg-emerald-accent/10 text-emerald-soft",
    info: "border-info/25 bg-info/10 text-info",
    danger: "border-danger/25 bg-danger/10 text-danger",
    gold: "border-gold/25 bg-gold/10 text-gold",
  };
  return (
    <div className="surface surface-hover p-5">
      <div className="flex items-start justify-between">
        <span className="text-[11px] font-bold uppercase tracking-widest text-ink-400">{label}</span>
        <span className={`rounded-lg border p-1.5 ${accents[accent]}`}>
          <Icon size={14} />
        </span>
      </div>
      <div className={`font-display mt-3 text-2xl font-extrabold ${accent === "gold" ? "money" : "text-white"}`}>
        {value}
      </div>
      <div className="mt-1 text-xs text-ink-500">{sub}</div>
    </div>
  );
}

