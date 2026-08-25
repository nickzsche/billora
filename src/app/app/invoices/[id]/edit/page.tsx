import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { requireUser } from "@/lib/data";
import { getDb } from "@/db";
import { clients, invoiceItems, invoices } from "@/db/schema";
import { InvoiceForm } from "@/components/invoice-form";

export const metadata: Metadata = { title: "Edit invoice" };

export default async function EditInvoicePage({
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

  if (inv.status === "paid") {
    // paid invoices are financial records — view them instead of editing
    redirect(`/app/invoices/${inv.id}`);
  }

  const clientRows = db
    .select({ id: clients.id, name: clients.name, company: clients.company, currency: clients.currency })
    .from(clients)
    .where(eq(clients.userId, user.id))
    .all()
    .sort((a, b) => a.name.localeCompare(b.name));

  const items = db
    .select()
    .from(invoiceItems)
    .where(eq(invoiceItems.invoiceId, inv.id))
    .all()
    .sort((a, b) => a.position - b.position)
    .map((it) => ({ description: it.description, quantity: it.quantity, unitPrice: it.unitPrice }));

  return (
    <InvoiceForm
      clients={clientRows}
      suggestedNumber={inv.number}
      defaultTaxRate={inv.taxRate}
      initial={{
        id: inv.id,
        clientId: inv.clientId,
        number: inv.number,
        status: inv.status,
        issueDate: inv.issueDate,
        dueDate: inv.dueDate,
        currency: inv.currency,
        taxRate: inv.taxRate,
        discountRate: inv.discountRate,
        notes: inv.notes,
        recurring: inv.recurring === 1,
        nextRun: inv.nextRun,
        items: items.length ? items : [{ description: "", quantity: 1, unitPrice: 0 }],
      }}
    />
  );
}
