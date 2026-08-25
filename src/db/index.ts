import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import bcrypt from "bcryptjs";
import {
  clients,
  expenses,
  invoiceItems,
  invoices,
  payments,
  settings,
  users,
} from "./schema";

/**
 * Lazy SQLite bootstrap:
 * - The database file is created on first access (never at import time).
 * - Tables are created with `CREATE TABLE IF NOT EXISTS`.
 * - If the users table is empty, a rich demo workspace is seeded instantly,
 *   so a fresh checkout shows real data on the very first request.
 */

const DATA_DIR = process.env.BILLORA_DATA_DIR || path.join(process.cwd(), "data");
const DB_FILE = process.env.DATABASE_URL?.startsWith("./")
  ? path.join(process.cwd(), process.env.DATABASE_URL)
  : process.env.DATABASE_URL || path.join(DATA_DIR, "billora.db");

declare global {
  // eslint-disable-next-line no-var
  var __billoraDb: BetterSQLite3Database | undefined;
  // eslint-disable-next-line no-var
  var __billoraSqlite: Database.Database | undefined;
}

function rawDb(): Database.Database {
  fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
  const db = new Database(DB_FILE);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  return db;
}

export function getDb(): BetterSQLite3Database {
  if (!global.__billoraDb) {
    const sqlite = rawDb();
    migrate(sqlite);
    global.__billoraSqlite = sqlite;
    global.__billoraDb = drizzle(sqlite);
  }
  return global.__billoraDb;
}

function migrate(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      business_name TEXT NOT NULL DEFAULT 'My Studio',
      logo_text TEXT NOT NULL DEFAULT 'B',
      address TEXT NOT NULL DEFAULT '',
      default_tax_rate REAL NOT NULL DEFAULT 20,
      invoice_prefix TEXT NOT NULL DEFAULT 'INV',
      currency TEXT NOT NULL DEFAULT 'USD'
    );
    CREATE TABLE IF NOT EXISTS clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      email TEXT NOT NULL DEFAULT '',
      company TEXT NOT NULL DEFAULT '',
      address TEXT NOT NULL DEFAULT '',
      currency TEXT NOT NULL DEFAULT 'USD',
      notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      number TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft',
      issue_date TEXT NOT NULL,
      due_date TEXT NOT NULL,
      currency TEXT NOT NULL DEFAULT 'USD',
      tax_rate REAL NOT NULL DEFAULT 0,
      discount_rate REAL NOT NULL DEFAULT 0,
      notes TEXT NOT NULL DEFAULT '',
      recurring INTEGER NOT NULL DEFAULT 0,
      next_run TEXT,
      subtotal REAL NOT NULL DEFAULT 0,
      discount_amount REAL NOT NULL DEFAULT 0,
      tax_amount REAL NOT NULL DEFAULT 0,
      total REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS invoice_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
      description TEXT NOT NULL,
      quantity REAL NOT NULL DEFAULT 1,
      unit_price REAL NOT NULL DEFAULT 0,
      position INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
      amount REAL NOT NULL DEFAULT 0,
      currency TEXT NOT NULL DEFAULT 'USD',
      paid_at TEXT NOT NULL,
      note TEXT NOT NULL DEFAULT ''
    );
    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      category TEXT NOT NULL DEFAULT 'Other',
      amount REAL NOT NULL DEFAULT 0,
      date TEXT NOT NULL,
      note TEXT NOT NULL DEFAULT ''
    );
    CREATE INDEX IF NOT EXISTS idx_invoices_user ON invoices(user_id);
    CREATE INDEX IF NOT EXISTS idx_clients_user ON clients(user_id);
    CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payments(invoice_id);
    CREATE INDEX IF NOT EXISTS idx_expenses_user ON expenses(user_id);
  `);
}

/* ------------------------------ date helpers ----------------------------- */

function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}
function addDays(d: Date, days: number): Date {
  const c = new Date(d.getTime());
  c.setDate(c.getDate() + days);
  return c;
}
function addMonths(d: Date, months: number): Date {
  const c = new Date(d.getTime());
  c.setMonth(c.getMonth() + months);
  return c;
}

/* --------------------------------- seeding -------------------------------- */

let seeded = false;

export function ensureSeeded(): void {
  if (seeded) return;
  try {
    const db = getDb();
    const row = db.select({ id: users.id }).from(users).limit(1).get();
    if (!row) {
      // Guard against concurrent first-runs (e.g. parallel build workers):
      // whoever inserts the demo user first wins, everyone else moves on.
      seedDemoData(getDb());
    }
    seeded = true;
  } catch {
    // If another process seeded concurrently we may see a UNIQUE violation;
    // treat the database as seeded as long as a user exists.
    const db = getDb();
    const row = db.select({ id: users.id }).from(users).limit(1).get();
    if (row) {
      seeded = true;
    } else {
      throw new Error("Billora seed failed and database is empty");
    }
  }
}

function seedDemoData(db: BetterSQLite3Database) {
  const now = new Date();
  const email = (process.env.DEMO_EMAIL || "demo@billora.app").toLowerCase();
  const password = process.env.DEMO_PASSWORD || "demo1234";

  const user = db
    .insert(users)
    .values({
      email,
      passwordHash: bcrypt.hashSync(password, 10),
      name: "Demo Studio",
      createdAt: iso(now),
    })
    .returning().get();

  db
    .insert(settings)
    .values({
    userId: user.id,
    businessName: "Demo Studio",
    logoText: "D",
    address: "Bağdat Caddesi 142\nKadıköy, Istanbul 34710\nTürkiye",
    defaultTaxRate: 20,
    invoicePrefix: "INV",
    currency: "USD",
    })
    .run();

  const clientRows = db
    .insert(clients)
    .values([
      {
        userId: user.id,
        name: "Aylin Kaya",
        email: "aylin@northwind.co",
        company: "Northwind Commerce",
        address: "12 Finsbury Square\nLondon EC2A 1AN\nUnited Kingdom",
        currency: "USD",
        notes: "Retainer client — prefers end-of-month billing.",
        createdAt: iso(addMonths(now, -8)),
      },
      {
        userId: user.id,
        name: "Marcus Webb",
        email: "marcus@lumenlabs.io",
        company: "Lumen Labs",
        address: "88 Colin P Kelly Jr St\nSan Francisco, CA 94107",
        currency: "USD",
        notes: "Design systems work.",
        createdAt: iso(addMonths(now, -6)),
      },
      {
        userId: user.id,
        name: "Elif Demir",
        email: "elif@anadoludenim.com",
        company: "Anadolu Denim",
        address: "Organize Sanayi Bölgesi\nBursa, Türkiye",
        currency: "EUR",
        notes: "Invoices in EUR.",
        createdAt: iso(addMonths(now, -5)),
      },
      {
        userId: user.id,
        name: "Sofia Marino",
        email: "sofia@terracotta.studio",
        company: "Terracotta Studio",
        address: "Via Tortona 37\nMilano 20144, Italia",
        currency: "EUR",
        notes: "",
        createdAt: iso(addMonths(now, -3)),
      },
      {
        userId: user.id,
        name: "Jonas Berg",
        email: "jonas@fjordanalytics.no",
        company: "Fjord Analytics",
        address: "Dronning Eufemias gate 16\nOslo 0191, Norge",
        currency: "USD",
        notes: "Dashboard engineering.",
        createdAt: iso(addDays(now, -40)),
      },
    ])
    .returning().all();

  const [northwind, lumen, anadolu, terracotta, fjord] = clientRows;

  type SeedInvoice = {
    client: typeof northwind;
    number: string;
    status: string;
    issue: string;
    dueInDays: number;
    recurring?: boolean;
    items: [string, number, number][];
    tax?: number;
    paidAfterDays?: number;
  };

  const specs: SeedInvoice[] = [
    // --- older, all paid (feeds the revenue chart) ---
    {
      client: northwind,
      number: "INV-2026-0001",
      status: "paid",
      issue: iso(addMonths(now, -6)),
      dueInDays: 14,
      items: [["Storefront replatform — sprint 1", 1, 4200]],
      paidAfterDays: 9,
    },
    {
      client: lumen,
      number: "INV-2026-0002",
      status: "paid",
      issue: iso(addMonths(now, -5)),
      dueInDays: 14,
      items: [
        ["Design system foundations", 1, 2800],
        ["Icon set (48 icons)", 48, 15],
      ],
      paidAfterDays: 12,
    },
    {
      client: anadolu,
      number: "INV-2026-0003",
      status: "paid",
      issue: iso(addMonths(now, -4)),
      dueInDays: 21,
      items: [["E-commerce photoshoot retouching", 120, 18]],
      tax: 20,
      paidAfterDays: 17,
    },
    {
      client: northwind,
      number: "INV-2026-0004",
      status: "paid",
      issue: iso(addMonths(now, -3)),
      dueInDays: 14,
      items: [["Storefront replatform — sprint 2", 1, 4600]],
      paidAfterDays: 6,
    },
    {
      client: terracotta,
      number: "INV-2026-0005",
      status: "paid",
      issue: iso(addMonths(now, -2)),
      dueInDays: 14,
      items: [["Brand identity exploration", 1, 3100]],
      paidAfterDays: 11,
    },
    // --- recent mix ---
    {
      client: fjord,
      number: "INV-2026-0006",
      status: "paid",
      issue: iso(addMonths(now, -1)),
      dueInDays: 14,
      items: [["Analytics dashboard build", 1, 5200]],
      paidAfterDays: 13,
    },
    {
      client: northwind,
      number: "INV-2026-0007",
      status: "sent",
      issue: iso(addDays(now, -12)),
      dueInDays: -2, // already past due → renders as OVERDUE
      items: [
        ["Storefront replatform — sprint 3", 1, 4800],
        ["Performance audit", 1, 900],
      ],
      recurring: true,
    },
    {
      client: anadolu,
      number: "INV-2026-0008",
      status: "sent",
      issue: iso(addDays(now, -5)),
      dueInDays: 16,
      items: [["Seasonal lookbook layout", 1, 2400]],
      tax: 20,
    },
    {
      client: lumen,
      number: "INV-2026-0009",
      status: "draft",
      issue: iso(addDays(now, -1)),
      dueInDays: 20,
      items: [
        ["Motion guidelines", 1, 1800],
        ["Component QA", 8, 90],
      ],
    },
  ];

  let seq = 1;
  for (const spec of specs) {
    const issueDate = new Date(spec.issue);
    const dueDate = addDays(issueDate, spec.dueInDays);
    const subtotal = spec.items.reduce((s, [, q, p]) => s + q * p, 0);
    const taxRate = spec.tax ?? 0;
    const taxAmount = Math.round(subtotal * (taxRate / 100) * 100) / 100;
    const total = Math.round((subtotal + taxAmount) * 100) / 100;

    const inv = db
      .insert(invoices)
      .values({
        userId: user.id,
        clientId: spec.client.id,
        number: spec.number || `INV-${now.getFullYear()}-${String(seq++).padStart(4, "0")}`,
        status: spec.status,
        issueDate: iso(issueDate),
        dueDate: iso(dueDate),
        currency: spec.client.currency,
        taxRate,
        discountRate: 0,
        notes: "Payment within 14 days by bank transfer. Thank you!",
        recurring: spec.recurring ? 1 : 0,
        nextRun: spec.recurring ? iso(addMonths(dueDate > now ? dueDate : now, 1)) : null,
        subtotal: Math.round(subtotal * 100) / 100,
        discountAmount: 0,
        taxAmount,
        total,
        createdAt: iso(issueDate),
      })
      .returning()
      .get();

    db
      .insert(invoiceItems)
      .values(
        spec.items.map(([description, quantity, unitPrice], i) => ({
          invoiceId: inv.id,
          description,
          quantity,
          unitPrice,
          position: i,
        })),
      )
      .run();

    if (spec.status === "paid" && spec.paidAfterDays !== undefined) {
      db
        .insert(payments)
        .values({
        userId: user.id,
        invoiceId: inv.id,
        amount: total,
        currency: inv.currency,
        paidAt: iso(addDays(issueDate, spec.paidAfterDays)),
        note: "Bank transfer",
        })
        .run();
    }
  }

  // Expenses across the last ~6 months (feeds dashboard chart & totals)
  const expenseRows: { userId: number; category: string; amount: number; date: string; note: string }[] = [];
  const categories = ["Software", "Hardware", "Office", "Marketing", "Contractors", "Other"];
  for (let m = 5; m >= 0; m--) {
    expenseRows.push({
      userId: user.id,
      category: "Software",
      amount: 89,
      date: iso(addMonths(now, -m)),
      note: "Adobe CC + Figma",
    });
    expenseRows.push({
      userId: user.id,
      category: categories[m % categories.length],
      amount: m % 2 === 0 ? 450 : 320,
      date: iso(addMonths(now, -m)),
      note: m % 2 === 0 ? "Coworking desk" : "Bookkeeping",
    });
  }
  expenseRows.push(
    {
      userId: user.id,
      category: "Hardware",
      amount: 1890,
      date: iso(addDays(now, -20)),
      note: "External display",
    },
    {
      userId: user.id,
      category: "Marketing",
      amount: 260,
      date: iso(addDays(now, -9)),
      note: "Portfolio site hosting + domain",
    },
  );
  db.insert(expenses).values(expenseRows).run();
}
