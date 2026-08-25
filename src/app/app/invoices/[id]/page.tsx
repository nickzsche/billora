import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import {
  ArrowLeft,
  CheckCircle2,
} from "lucide-react";
import { requireUser } from "@/lib/data";
import { getDb } from "@/db";
import { clients, invoiceItems, invoices, payments } from "@/db/schema";
import { displayStatus, formatDate, formatMoney } from "@/lib/money";
import { StatusBadge } from "@/components/ui";
import { InvoiceActions } from "./actions";

export const metadata: Metadata = { title: "Invoice" };

export default async function InvoiceDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await requireUser();
  const db = getDb();

  const inv = db
    .select()
    .from(invoices)
    .where(and(eq(invoices.id, Number(params.id)), eq(invoices.userId, user.id)))
    .get();
  if (!inv) notFound();

  const client = db.select().from(clients).where(eq(clients.id, inv.clientId)).get();
  const items = db
    .select()
    .from(invoiceItems)
    .where(eq(invoiceItems.invoiceId, inv.id))
    .all()
    .sort((a, b) => a.position - b.position);
  const invoicePayments = db
    .select()
    .from(payments)
    .where(eq(payments.invoiceId, inv.id))
    .all()
    .sort((a, b) => (a.paidAt < b.paidAt ? -1 : 1));

  return (
    <div className="mx-auto max-w-3xl">
      <header className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <div className="min-w-0">
          <Link
            href="/app/invoices"
            className="mb-1 inline-flex items-center gap-1.5 text-xs font-medium text-ink-400 transition-colors hover:text-white"
          >
            <ArrowLeft size={13} /> All invoices
          </Link>
          <h1 className="font-display flex flex-wrap items-center gap-3 text-2xl font-bold text-white">
            {inv.number} <StatusBadge status={displayStatus(inv)} />
            {inv.recurring === 1 && (
              <span className="rounded border border-gold/40 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gold">
                ↻ monthly · next run {formatDate(inv.nextRun)}
              </span>
            )}
          </h1>
        </div>
        <InvoiceActions id={inv.id} status={inv.status} number={inv.number} />
      </header>

      {/* summary card */}
      <section className="surface mt-5 p-5 sm:p-6">
        <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
          <Meta label="Client" value={client?.name ?? "—"} strong />
          <Meta label="Issued" value={formatDate(inv.issueDate)} />
          <Meta label="Due" value={formatDate(inv.dueDate)} />
          <Meta label="Currency" value={inv.currency} />
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[420px] text-sm">
            <thead>
              <tr className="border-b border-ink-600 text-left text-xs uppercase tracking-wider text-ink-500">
                <th className="pb-2 pr-3 font-semibold">Description</th>
                <th className="pb-2 px-2 text-right font-semibold">Qty</th>
                <th className="pb-2 px-2 text-right font-semibold">Unit price</th>
                <th className="pb-2 pl-2 text-right font-semibold">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-700/60">
              {items.map((it) => (
                <tr key={it.id}>
                  <td className="py-2.5 pr-3 text-ink-100">{it.description}</td>
                  <td className="px-2 py-2.5 text-right text-ink-300">{it.quantity}</td>
                  <td className="money px-2 py-2.5 text-right">{formatMoney(it.unitPrice, inv.currency)}</td>
                  <td className="money py-2.5 pl-2 text-right font-semibold">
                    {formatMoney(it.quantity * it.unitPrice, inv.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-5 flex justify-end">
          <div className="w-full max-w-[280px] text-sm">
            <TotalRow label="Subtotal" value={formatMoney(inv.subtotal, inv.currency)} />
            {inv.discountAmount > 0 && (
              <TotalRow label={`Discount (${inv.discountRate}%)`} value={`−${formatMoney(inv.discountAmount, inv.currency)}`} />
            )}
            {inv.taxAmount > 0 && (
              <TotalRow label={`Tax (${inv.taxRate}%)`} value={formatMoney(inv.taxAmount, inv.currency)} />
            )}
            <div className="mt-2 flex items-center justify-between border-t border-ink-600 pt-3">
              <span className="font-semibold text-ink-200">Total</span>
              <span className="money font-display text-2xl font-extrabold">
                {formatMoney(inv.total, inv.currency)}
              </span>
            </div>
          </div>
        </div>

        {inv.notes && (
          <p className="mt-5 rounded-xl border border-ink-700 bg-ink-900/60 p-3.5 text-xs leading-relaxed text-ink-300">
            {inv.notes}
          </p>
        )}

        {invoicePayments.length > 0 && (
          <div className="mt-5 border-t border-ink-700 pt-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-ink-400">Payment history</h3>
            <ul className="mt-2 flex flex-col gap-1.5 text-sm">
              {invoicePayments.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 text-ink-300">
                  <span className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-emerald-accent" />
                    {formatDate(p.paidAt)} — {p.note}
                  </span>
                  <span className="money font-semibold">{formatMoney(p.amount, p.currency)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}

function Meta({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-widest text-ink-500">{label}</div>
      <div className={`mt-1 ${strong ? "font-semibold text-white" : "text-ink-200"}`}>{value}</div>
    </div>
  );
}

function TotalRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-0.5 text-ink-400">
      <span>{label}</span>
      <span className="money font-medium">{value}</span>
    </div>
  );
}
