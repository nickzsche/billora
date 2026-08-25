import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull().default(""),
  createdAt: text("created_at").notNull(),
});

export const settings = sqliteTable("settings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" })
    .unique(),
  businessName: text("business_name").notNull().default("My Studio"),
  logoText: text("logo_text").notNull().default("B"),
  address: text("address").notNull().default(""),
  defaultTaxRate: real("default_tax_rate").notNull().default(20),
  invoicePrefix: text("invoice_prefix").notNull().default("INV"),
  currency: text("currency").notNull().default("USD"),
});

export const clients = sqliteTable("clients", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  email: text("email").notNull().default(""),
  company: text("company").notNull().default(""),
  address: text("address").notNull().default(""),
  currency: text("currency").notNull().default("USD"),
  notes: text("notes").notNull().default(""),
  createdAt: text("created_at").notNull(),
});

export const invoices = sqliteTable("invoices", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  clientId: integer("client_id")
    .notNull()
    .references(() => clients.id, { onDelete: "cascade" }),
  number: text("number").notNull(),
  /** draft | sent | paid — overdue is computed from dueDate */
  status: text("status").notNull().default("draft"),
  issueDate: text("issue_date").notNull(),
  dueDate: text("due_date").notNull(),
  currency: text("currency").notNull().default("USD"),
  taxRate: real("tax_rate").notNull().default(0),
  discountRate: real("discount_rate").notNull().default(0),
  notes: text("notes").notNull().default(""),
  /** monthly recurrence flag */
  recurring: integer("recurring").notNull().default(0),
  nextRun: text("next_run"),
  subtotal: real("subtotal").notNull().default(0),
  discountAmount: real("discount_amount").notNull().default(0),
  taxAmount: real("tax_amount").notNull().default(0),
  total: real("total").notNull().default(0),
  createdAt: text("created_at").notNull(),
});

export const invoiceItems = sqliteTable("invoice_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  invoiceId: integer("invoice_id")
    .notNull()
    .references(() => invoices.id, { onDelete: "cascade" }),
  description: text("description").notNull(),
  quantity: real("quantity").notNull().default(1),
  unitPrice: real("unit_price").notNull().default(0),
  position: integer("position").notNull().default(0),
});

export const payments = sqliteTable("payments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  invoiceId: integer("invoice_id")
    .notNull()
    .references(() => invoices.id, { onDelete: "cascade" }),
  amount: real("amount").notNull().default(0),
  currency: text("currency").notNull().default("USD"),
  paidAt: text("paid_at").notNull(),
  note: text("note").notNull().default(""),
});

export const expenses = sqliteTable("expenses", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  category: text("category").notNull().default("Other"),
  amount: real("amount").notNull().default(0),
  date: text("date").notNull(),
  note: text("note").notNull().default(""),
});

export type User = typeof users.$inferSelect;
export type Settings = typeof settings.$inferSelect;
export type Client = typeof clients.$inferSelect;
export type Invoice = typeof invoices.$inferSelect;
export type InvoiceItem = typeof invoiceItems.$inferSelect;
export type Payment = typeof payments.$inferSelect;
export type Expense = typeof expenses.$inferSelect;
