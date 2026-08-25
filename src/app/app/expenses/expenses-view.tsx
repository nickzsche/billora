"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Plus, Trash2, X } from "lucide-react";
import { formatMoney, todayISO } from "@/lib/money";
import { toast } from "@/components/toaster";
import type { Expense } from "@/db/schema";

const CATEGORIES = [
  "Software",
  "Hardware",
  "Office",
  "Marketing",
  "Travel",
  "Contractors",
  "Education",
  "Other",
];

const CAT_COLORS: Record<string, string> = {
  Software: "#34d399",
  Hardware: "#60a5fa",
  Office: "#fbbf24",
  Marketing: "#f472b6",
  Travel: "#a78bfa",
  Contractors: "#fb923c",
  Education: "#22d3ee",
  Other: "#94a3b8",
};

export function ExpensesView({ initial }: { initial: Expense[] }) {
  const router = useRouter();
  const [rows, setRows] = useState(initial);
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [monthFilter, setMonthFilter] = useState<string>("all");

  // group by month key "YYYY-MM"
  const months = useMemo(() => {
    const map = new Map<string, Expense[]>();
    for (const r of rows) {
      const key = r.date.slice(0, 7);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    }
    return [...map.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [rows]);

  const thisMonthKey = new Date().toISOString().slice(0, 7);
  const totalThisMonth = rows
    .filter((r) => r.date.startsWith(thisMonthKey))
    .reduce((s, r) => s + r.amount, 0);

  const visibleMonths =
    monthFilter === "all" ? months : months.filter(([k]) => k === monthFilter);

  async function addExpense(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true);
    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Number(form.get("amount")),
          category: String(form.get("category")),
          date: String(form.get("date")),
          note: String(form.get("note") || ""),
        }),
      });
      const data = (await res.json()) as { error?: string; expense?: Expense };
      if (!res.ok || !data.expense) {
        toast(data.error || "Could not save expense", "error");
        return;
      }
      toast("Expense logged");
      setShowForm(false);
      setRows((prev) => [data.expense as Expense, ...prev].sort((a, b) => (a.date < b.date ? 1 : -1)));
      router.refresh();
    } catch {
      toast("Network error", "error");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: number) {
    if (!window.confirm("Delete this expense?")) return;
    try {
      const res = await fetch(`/api/expenses?id=${id}`, { method: "DELETE" });
      if (!res.ok) {
        toast("Could not delete expense", "error");
        return;
      }
      toast("Expense deleted", "info");
      setRows((prev) => prev.filter((r) => r.id !== id));
      router.refresh();
    } catch {
      toast("Network error", "error");
    }
  }

  return (
    <>
      <header className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Expenses</h1>
          <p className="mt-0.5 text-sm text-ink-400">
            This month: <span className="money font-semibold">{formatMoney(totalThisMonth)}</span>{" "}
            across {rows.length} entries
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            aria-label="Filter by month"
            className="field w-auto py-2 text-xs"
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
          >
            <option value="all">All months</option>
            {months.map(([key]) => (
              <option key={key} value={key}>
                {new Date(`${key}-15T12:00:00`).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
              </option>
            ))}
          </select>
          <button onClick={() => setShowForm(true)} className="btn btn-primary">
            <Plus size={16} /> Add expense
          </button>
        </div>
      </header>

      {months.length === 0 ? (
        <div className="mt-6">
          <EmptyWallet onAdd={() => setShowForm(true)} />
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-6">
          {visibleMonths.map(([key, items]) => {
            const total = items.reduce((s, r) => s + r.amount, 0);
            return (
              <section key={key}>
                <div className="mb-2 flex items-center justify-between px-1">
                  <h2 className="font-display text-sm font-bold uppercase tracking-widest text-ink-400">
                    {new Date(`${key}-15T12:00:00`).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                  </h2>
                  <span className="money text-sm font-bold">{formatMoney(total)}</span>
                </div>
                <div className="surface divide-y divide-ink-700/70 overflow-hidden">
                  {items.map((r, i) => (
                    <motion.div
                      key={r.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(i * 0.03, 0.25), duration: 0.25 }}
                      className="group flex items-center justify-between gap-3 px-4 py-3 sm:px-5"
                    >
                      <div className="flex min-w-0 items-center gap-3.5">
                        <span
                          aria-hidden
                          className="h-8 w-8 shrink-0 rounded-lg border border-ink-600"
                          style={{ background: `${CAT_COLORS[r.category] ?? CAT_COLORS.Other}22`, borderColor: `${CAT_COLORS[r.category] ?? CAT_COLORS.Other}55` }}
                        >
                          <svg width="100%" height="100%" viewBox="0 0 32 32" fill="none">
                            <circle cx="16" cy="16" r="5.5" fill={CAT_COLORS[r.category] ?? CAT_COLORS.Other} opacity="0.9" />
                          </svg>
                        </span>
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium text-white">{r.category}</div>
                          <div className="text-xs text-ink-500">
                            {formatDateClient(r.date)}
                            {r.note ? ` · ${r.note}` : ""}
                          </div>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        <span className="money text-sm font-bold">{formatMoney(r.amount)}</span>
                        <button
                          aria-label={`Delete ${r.category} expense`}
                          onClick={() => remove(r.id)}
                          className="rounded-md p-1.5 text-ink-600 transition-colors hover:text-danger group-hover:text-ink-400"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {/* add modal */}
      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-6 no-print"
          onClick={() => setShowForm(false)}
        >
          <div
            className="surface w-full max-w-md rounded-b-none p-6 sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-white">Log an expense</h2>
              <button onClick={() => setShowForm(false)} aria-label="Close" className="rounded-lg border border-ink-600 p-1.5 text-ink-300 hover:text-white">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={addExpense} className="flex flex-col gap-3.5">
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="label" htmlFor="eamount">Amount *</label>
                  <input id="eamount" name="amount" type="number" min="0.01" step="0.01" required className="field" placeholder="89.00" autoFocus />
                </div>
                <div>
                  <label className="label" htmlFor="edate">Date</label>
                  <input id="edate" name="date" type="date" defaultValue={todayISO()} className="field" />
                </div>
              </div>
              <div>
                <label className="label" htmlFor="ecat">Category</label>
                <select id="ecat" name="category" className="field" defaultValue="Software">
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="enote">Note</label>
                <input id="enote" name="note" className="field" placeholder="What was it for?" />
              </div>
              <div className="mt-1 flex justify-end gap-2">
                <button type="button" onClick={() => setShowForm(false)} className="btn btn-ghost">Cancel</button>
                <button type="submit" disabled={busy} className="btn btn-primary disabled:opacity-60">
                  {busy ? "Saving…" : "Save expense"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

function EmptyWallet({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="surface flex flex-col items-center gap-3 px-6 py-14 text-center">
      <svg width="120" height="86" viewBox="0 0 120 86" fill="none" aria-hidden className="mb-1">
        <rect x="18" y="8" width="84" height="66" rx="10" fill="#13181d" stroke="#222a33" />
        <rect x="26" y="18" width="40" height="5" rx="2.5" fill="#2e3843" />
        <rect x="58" y="36" width="36" height="26" rx="7" fill="#10b981" opacity="0.9" />
        <circle cx="84" cy="49" r="3.4" fill="#04120c" />
        <circle cx="46" cy="34" r="9" fill="#E8C15A" />
        <path d="M43 33.4h6M46 30.4v6" stroke="#0a0d10" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
      <h3 className="font-display text-lg font-semibold text-white">No expenses tracked yet</h3>
      <p className="max-w-sm text-sm leading-relaxed text-ink-400">
        Log software subscriptions, hardware and other costs — your dashboard chart uses them to show real profit.
      </p>
      <button onClick={onAdd} className="btn btn-primary mt-2">
        <Plus size={15} /> Log your first expense
      </button>
    </div>
  );
}

function formatDateClient(iso: string): string {
  return new Date(`${iso.slice(0, 10)}T12:00:00`).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
  });
}
