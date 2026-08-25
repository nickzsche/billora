import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { requireUser, getSettings } from "@/lib/data";
import { getDb } from "@/db";
import { clients, invoiceItems, invoices } from "@/db/schema";
import { displayStatus, formatDate, formatMoney } from "@/lib/money";
import { PrintToolbar } from "./print-toolbar";

export const metadata: Metadata = { title: "Print invoice" };

/**
 * A4 print-ready invoice.
 * - Screen: rendered inside a white A4 "sheet" on the dark backdrop.
 * - Print: @page A4 + .print-sheet rules in globals.css produce a clean PDF.
 * - "Download PDF" simply calls window.print() (browser save-as-PDF).
 */
export default async function InvoicePrintPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await requireUser();
  const s = await getSettings(user.id);
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

  const status = displayStatus(inv);

  return (
    <div className="min-h-screen bg-ink-900">
      <PrintToolbar backHref={`/app/invoices/${inv.id}`} />

      <div className="flex justify-center px-3 py-6 sm:px-6 sm:py-10">
        {/* ------------------------------ A4 SHEET ------------------------------ */}
        <article
          className="print-sheet flex w-full max-w-[820px] flex-col rounded-xl bg-white p-7 text-[#111827] shadow-[0_24px_80px_-24px_rgba(0,0,0,0.65)] sm:p-12"
          style={{ minHeight: "1123px" }} /* 297mm at 96dpi */
        >
          {/* letterhead */}
          <header className="flex items-start justify-between gap-6">
            <div className="flex items-center gap-3">
              <div
                className="flex h-11 w-11 items-center justify-center rounded-xl text-lg font-extrabold text-white"
                style={{ background: "linear-gradient(135deg,#0ea86e,#10b981)" }}
              >
                {(s.logoText || s.businessName.charAt(0) || "B").slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="text-lg font-bold tracking-tight">{s.businessName}</div>
                {s.address && (
                  <div className="mt-0.5 whitespace-pre-line text-[11px] leading-snug text-gray-500">
                    {s.address}
                  </div>
                )}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[26px] font-extrabold uppercase tracking-tight" style={{ color: "#0ea86e" }}>
                Invoice
              </div>
              <div className="mt-1 font-mono text-xs text-gray-500">{inv.number}</div>
              <StatusPill status={status} />
            </div>
          </header>

          {/* meta */}
          <section className="mt-10 grid grid-cols-2 gap-8 text-[13px] sm:grid-cols-3">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Billed to</div>
              <div className="mt-1.5 font-semibold">{client?.name ?? "—"}</div>
              {client?.company && <div className="text-gray-600">{client.company}</div>}
              {client?.address && (
                <div className="mt-1 whitespace-pre-line text-[11px] leading-snug text-gray-500">
                  {client.address}
                </div>
              )}
              {client?.email && <div className="mt-1 text-[11px] text-gray-500">{client.email}</div>}
            </div>
            <div className="space-y-3">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Issue date</div>
                <div className="mt-1 font-medium">{formatDate(inv.issueDate)}</div>
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Due date</div>
                <div className="mt-1 font-medium">{formatDate(inv.dueDate)}</div>
              </div>
            </div>
            <div className="hidden sm:block">
              <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Amount due</div>
              <div className="money mt-1 text-xl font-extrabold" style={{ color: "#b8860b" }}>
                {inv.status === "paid" ? formatMoney(0, inv.currency) : formatMoney(inv.total, inv.currency)}
              </div>
              {inv.recurring === 1 && (
                <div className="mt-2 inline-block rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700">
                  ↻ Recurring monthly
                </div>
              )}
            </div>
          </section>

          {/* line items */}
          <table className="mt-9 w-full text-[13px]">
            <thead>
              <tr style={{ background: "#f3faf7" }}>
                <th className="rounded-l-lg py-2.5 pl-4 text-left text-[10px] font-bold uppercase tracking-widest text-emerald-700">
                  Description
                </th>
                <th className="px-2 py-2.5 text-right text-[10px] font-bold uppercase tracking-widest text-emerald-700">
                  Qty
                </th>
                <th className="px-2 py-2.5 text-right text-[10px] font-bold uppercase tracking-widest text-emerald-700">
                  Unit price
                </th>
                <th className="rounded-r-lg py-2.5 pr-4 text-right text-[10px] font-bold uppercase tracking-widest text-emerald-700">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((it) => (
                <tr key={it.id}>
                  <td className="py-3 pl-4 pr-3">{it.description}</td>
                  <td className="px-2 py-3 text-right text-gray-600">{it.quantity}</td>
                  <td className="px-2 py-3 text-right tabular-nums">{formatMoney(it.unitPrice, inv.currency)}</td>
                  <td className="py-3 pl-2 pr-4 text-right font-semibold tabular-nums">
                    {formatMoney(it.quantity * it.unitPrice, inv.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* totals */}
          <section className="mt-6 flex justify-end">
            <div className="w-full max-w-[280px] text-[13px]">
              <PTotal label="Subtotal" value={formatMoney(inv.subtotal, inv.currency)} />
              {inv.discountAmount > 0 && (
                <PTotal label={`Discount (${inv.discountRate}%)`} value={`−${formatMoney(inv.discountAmount, inv.currency)}`} />
              )}
              {inv.taxAmount > 0 && (
                <PTotal label={`Tax (${inv.taxRate}%)`} value={formatMoney(inv.taxAmount, inv.currency)} />
              )}
              <div
                className="mt-2 flex items-center justify-between rounded-lg px-4 py-3"
                style={{ background: "#0e1216", color: "#E8C15A" }}
              >
                <span className="font-semibold text-white">Total</span>
                <span className="text-lg font-extrabold tabular-nums">{formatMoney(inv.total, inv.currency)}</span>
              </div>
            </div>
          </section>

          {/* notes + footer pinned near bottom of sheet */}
          <div className="mt-auto pt-10">
            {inv.notes && (
              <div className="rounded-lg bg-gray-50 p-4 text-[11px] leading-relaxed text-gray-600">
                {inv.notes}
              </div>
            )}
            <footer className="mt-6 flex items-center justify-between border-t border-gray-200 pt-4 text-[10px] text-gray-400">
              <span>
                {s.businessName} · Invoice {inv.number}
              </span>
              <span className="flex items-center gap-1.5">
                Generated by
                <Link href="/" style={{ color: "#0ea86e", fontWeight: 700 }} className="no-underline">
                  Billora
                </Link>
                — invoices that get you paid
              </span>
            </footer>
          </div>
        </article>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { bg: string; fg: string; label: string }> = {
    draft: { bg: "#eef1f4", fg: "#5b6472", label: "Draft" },
    sent: { bg: "#e8f1fd", fg: "#2563eb", label: "Sent" },
    paid: { bg: "#e5f8ef", fg: "#0c8a5b", label: "Paid" },
    overdue: { bg: "#fdeaea", fg: "#dc2626", label: "Overdue" },
  };
  const m = map[status] ?? map.draft;
  return (
    <div
      className="mt-2.5 inline-block rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider"
      style={{ background: m.bg, color: m.fg }}
    >
      {m.label}
    </div>
  );
}

function PTotal({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1 text-gray-500">
      <span>{label}</span>
      <span className="font-medium tabular-nums text-gray-800">{value}</span>
    </div>
  );
}
