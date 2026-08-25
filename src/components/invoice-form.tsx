"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Plus, Trash2, X, Repeat, Send } from "lucide-react";
import { CURRENCIES, computeTotals, formatDate, todayISO, addMonthsISO } from "@/lib/money";
import { toast } from "@/components/toaster";

type ClientOption = { id: number; name: string; company: string; currency: string };
type Item = { description: string; quantity: number; unitPrice: number };

export type InvoiceFormInitial = {
  id?: number;
  clientId?: number;
  number?: string;
  status?: string;
  issueDate: string;
  dueDate: string;
  currency: string;
  taxRate: number;
  discountRate: number;
  notes: string;
  recurring: boolean;
  nextRun: string | null;
  items: Item[];
};

export function InvoiceForm({
  clients,
  initial,
  defaultTaxRate,
  suggestedNumber,
}: {
  clients: ClientOption[];
  initial: InvoiceFormInitial;
  defaultTaxRate: number;
  suggestedNumber: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [clientId, setClientId] = useState<number | "">(initial.clientId ?? "");
  const [issueDate, setIssueDate] = useState(initial.issueDate);
  const [dueDate, setDueDate] = useState(initial.dueDate);
  const [currency, setCurrency] = useState(initial.currency);
  const [taxRate, setTaxRate] = useState(String(initial.taxRate));
  const [discountRate, setDiscountRate] = useState(String(initial.discountRate));
  const [notes, setNotes] = useState(initial.notes);
  const [recurring, setRecurring] = useState(initial.recurring);
  const [nextRun, setNextRun] = useState(
    initial.nextRun ?? addMonthsISO(initial.dueDate, 1),
  );
  const [items, setItems] = useState<Item[]>(
    initial.items.length
      ? initial.items
      : [{ description: "", quantity: 1, unitPrice: 0 }],
  );

  const totals = useMemo(
    () =>
      computeTotals(
        items.filter((i) => i.description.trim()),
        Number(taxRate) || 0,
        Number(discountRate) || 0,
      ),
    [items, taxRate, discountRate],
  );

  function setItem(idx: number, patch: Partial<Item>) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }

  async function submit(status: "draft" | "sent") {
    if (!clientId) {
      toast("Pick a client for this invoice", "error");
      return;
    }
    const clean = items.filter((i) => i.description.trim());
    if (clean.length === 0) {
      toast("Add at least one line item", "error");
      return;
    }
    setBusy(true);
    try {
      const payload = {
        clientId,
        status,
        issueDate,
        dueDate,
        currency,
        taxRate: Number(taxRate) || 0,
        discountRate: Number(discountRate) || 0,
        notes,
        recurring,
        nextRun: recurring ? nextRun : null,
        items: clean,
      };
      const res = await fetch(initial.id ? `/api/invoices/${initial.id}` : "/api/invoices", {
        method: initial.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { error?: string; invoice?: { id: number } };
      if (!res.ok) {
        toast(data.error || "Could not save invoice", "error");
        setBusy(false);
        return;
      }
      toast(status === "sent" ? "Invoice sent 🚀" : "Invoice saved");
      router.push(`/app/invoices/${data.invoice?.id ?? initial.id}`);
      router.refresh();
    } catch {
      toast("Network error", "error");
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl pb-24">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit("draft");
        }}
      >
        {/* header fields */}
        <div className="surface p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-lg font-bold text-white">
              {initial.id ? `Edit ${initial.number ?? "invoice"}` : "New invoice"}
            </h2>
            <span className="rounded-lg border border-ink-600 bg-ink-900 px-2.5 py-1 font-mono text-xs text-ink-300">
              {initial.number ?? suggestedNumber}
            </span>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="label" htmlFor="client">Client *</label>
              <select
                id="client"
                className="field"
                value={clientId}
                onChange={(e) => {
                  const id = e.target.value ? Number(e.target.value) : "";
                  setClientId(id);
                  const c = clients.find((x) => x.id === id);
                  if (c && !initial.id) setCurrency(c.currency);
                }}
                required
              >
                <option value="" disabled>
                  {clients.length ? "Select a client…" : "No clients yet — add one first"}
                </option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                    {c.company ? ` · ${c.company}` : ""}
                  </option>
                ))}
              </select>
              {clients.length === 0 && (
                <p className="mt-1.5 text-xs text-danger">
                  You need at least one client.{" "}
                  <a href="/app/clients?new=1" className="underline hover:text-white">Add a client →</a>
                </p>
              )}
            </div>

            <div>
              <label className="label" htmlFor="issue">Issue date</label>
              <input
                id="issue"
                type="date"
                className="field"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
              />
            </div>
            <div>
              <label className="label" htmlFor="due">Due date</label>
              <input
                id="due"
                type="date"
                className="field"
                value={dueDate}
                onChange={(e) => {
                  setDueDate(e.target.value);
                  if (recurring) setNextRun(addMonthsISO(e.target.value || todayISO(), 1));
                }}
              />
            </div>

            <div>
              <label className="label" htmlFor="currency">Currency</label>
              <select
                id="currency"
                className="field"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
              >
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>{c.code} — {c.label}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label" htmlFor="tax">Tax %</label>
                <input
                  id="tax" type="number" min={0} max={100} step="0.01"
                  className="field" value={taxRate}
                  onChange={(e) => setTaxRate(e.target.value)}
                />
              </div>
              <div>
                <label className="label" htmlFor="disc">Discount %</label>
                <input
                  id="disc" type="number" min={0} max={100} step="0.01"
                  className="field" value={discountRate}
                  onChange={(e) => setDiscountRate(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* line items */}
        <motion.div layout className="surface mt-4 p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-base font-semibold text-white">Line items</h3>
            <button
              type="button"
              onClick={() => setItems((p) => [...p, { description: "", quantity: 1, unitPrice: 0 }])}
              className="btn btn-ghost py-1.5 text-xs"
            >
              <Plus size={14} /> Add item
            </button>
          </div>

          <div className="mt-4 flex flex-col gap-2.5">
            {items.map((it, idx) => (
              <motion.div
                key={idx}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="grid grid-cols-[1fr_58px_92px_30px] items-center gap-2 rounded-xl border border-ink-700 bg-ink-900/60 p-2.5 max-sm:grid-cols-[1fr_58px_84px_28px]"
              >
                <input
                  aria-label={`Item ${idx + 1} description`}
                  placeholder="Description of work…"
                  className="field border-transparent bg-transparent"
                  value={it.description}
                  onChange={(e) => setItem(idx, { description: e.target.value })}
                />
                <input
                  aria-label={`Item ${idx + 1} quantity`}
                  type="number" min={0} step="any" placeholder="Qty"
                  className="field border-transparent bg-transparent text-right"
                  value={it.quantity}
                  onChange={(e) => setItem(idx, { quantity: Number(e.target.value) })}
                />
                <input
                  aria-label={`Item ${idx + 1} unit price`}
                  type="number" min={0} step="0.01" placeholder="Price"
                  className="field border-transparent bg-transparent text-right"
                  value={it.unitPrice}
                  onChange={(e) => setItem(idx, { unitPrice: Number(e.target.value) })}
                />
                <button
                  type="button"
                  aria-label={`Remove item ${idx + 1}`}
                  onClick={() =>
                    setItems((p) => (p.length > 1 ? p.filter((_, i) => i !== idx) : p))
                  }
                  className="mx-auto rounded-md p-1.5 text-ink-500 transition-colors hover:text-danger"
                >
                  <Trash2 size={14} />
                </button>
              </motion.div>
            ))}
          </div>

          <div className="mt-5 flex justify-end">
            <div className="w-full max-w-[260px] text-sm">
              <Row label="Subtotal" value={fmt(totals.subtotal, currency)} />
              {totals.discountAmount > 0 && (
                <Row label={`Discount (${Number(discountRate) || 0}%)`} value={`−${fmt(totals.discountAmount, currency)}`} />
              )}
              {totals.taxAmount > 0 && (
                <Row label={`Tax (${Number(taxRate) || 0}%)`} value={fmt(totals.taxAmount, currency)} />
              )}
              <div className="mt-2 flex items-center justify-between border-t border-ink-600 pt-2.5">
                <span className="font-semibold text-ink-200">Total</span>
                <span className="money font-display text-xl font-extrabold">{fmt(totals.total, currency)}</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* notes + recurrence */}
        <div className="surface mt-4 p-5 sm:p-6">
          <label className="label" htmlFor="notes">Notes</label>
          <textarea
            id="notes"
            rows={2}
            className="field resize-none"
            placeholder="Payment terms, bank details, thank-you note…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />

          <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3">
            <label className="flex cursor-pointer select-none items-center gap-2.5 text-sm text-ink-200">
              <input
                type="checkbox"
                checked={recurring}
                onChange={(e) => setRecurring(e.target.checked)}
                className="h-4 w-4 accent-emerald-accent"
              />
              <Repeat size={15} className="text-gold" />
              Recurring monthly
            </label>
            {recurring && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-ink-400">Next run</span>
                <input
                  type="date"
                  aria-label="Next run date"
                  className="field w-auto py-1.5 text-xs"
                  value={nextRun}
                  onChange={(e) => setNextRun(e.target.value)}
                />
              </div>
            )}
          </div>
          <p className="mt-2 text-xs leading-relaxed text-ink-500">
            v1 note: recurring invoices are flagged and dated here; automatic generation lands with
            the scheduler in the roadmap.
          </p>
        </div>

        {/* sticky action bar */}
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-ink-700 bg-ink-900/90 px-4 py-3 backdrop-blur-md no-print md:left-60">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="btn btn-ghost"
            >
              <X size={15} /> Cancel
            </button>
            <div className="flex items-center gap-2">
              <button type="submit" disabled={busy} className="btn btn-ghost disabled:opacity-60">
                Save draft
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => submit("sent")}
                className="btn btn-primary disabled:opacity-60"
              >
                <Send size={14} /> {initial.id ? "Save & mark sent" : "Create & send"}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-0.5 text-ink-400">
      <span>{label}</span>
      <span className="money font-medium">{value}</span>
    </div>
  );
}

function fmt(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}
