import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { requireUser, getSettings } from "@/lib/data";
import { getDb } from "@/db";
import { clients } from "@/db/schema";
import { InvoiceForm } from "@/components/invoice-form";
import { nextInvoiceNumber } from "@/lib/data";
import { todayISO, addDaysISO } from "@/lib/money";

export const metadata: Metadata = { title: "New invoice" };

export default async function NewInvoicePage() {
  const user = await requireUser();
  const s = await getSettings(user.id);
  const clientRows = getDb()
    .select({ id: clients.id, name: clients.name, company: clients.company, currency: clients.currency })
    .from(clients)
    .where(eq(clients.userId, user.id))
    .all()
    .sort((a, b) => a.name.localeCompare(b.name));

  const number = await nextInvoiceNumber(user.id);

  return (
    <InvoiceForm
      clients={clientRows}
      defaultTaxRate={s.defaultTaxRate}
      suggestedNumber={number}
      initial={{
        issueDate: todayISO(),
        dueDate: addDaysISO(todayISO(), 14),
        currency: s.currency,
        taxRate: s.defaultTaxRate,
        discountRate: 0,
        notes: "Payment within 14 days by bank transfer. Thank you!",
        recurring: false,
        nextRun: null,
        items: [{ description: "", quantity: 1, unitPrice: 0 }],
      }}
    />
  );
}
