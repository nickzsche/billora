import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { requireUser } from "@/lib/data";
import { getDb, ensureSeeded } from "@/db";
import { expenses, type Expense } from "@/db/schema";
import { ExpensesView } from "./expenses-view";

export const metadata: Metadata = { title: "Expenses" };

export default async function ExpensesPage() {
  const user = await requireUser();
  ensureSeeded();
  const rows: Expense[] = getDb()
    .select()
    .from(expenses)
    .where(eq(expenses.userId, user.id))
    .all()
    .sort((a, b) => (a.date < b.date ? 1 : -1));

  return <ExpensesView initial={rows} />;
}
