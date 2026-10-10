import { test } from "node:test";
import assert from "node:assert/strict";

import {
  addDaysISO,
  addMonthsISO,
  clampRate,
  computeTotals,
  displayStatus,
  formatMoney,
  isOverdue,
  isValidISODate,
  round2,
  todayISO,
} from "../src/lib/money.ts";

/* ------------------------------ invoice totals ---------------------------- */

test("computeTotals: discount then tax on the discounted base", () => {
  const t = computeTotals([{ description: "Work", quantity: 2, unitPrice: 100 }], 20, 10);
  assert.deepEqual(t, {
    subtotal: 200,
    discountAmount: 20,
    taxAmount: 36, // (200 - 20) * 20%
    total: 216,
  });
});

test("computeTotals: no tax, no discount", () => {
  const t = computeTotals([{ description: "Work", quantity: 1, unitPrice: 250 }], 0, 0);
  assert.deepEqual(t, { subtotal: 250, discountAmount: 0, taxAmount: 0, total: 250 });
});

test("computeTotals: sums multiple line items", () => {
  const t = computeTotals(
    [
      { description: "a", quantity: 48, unitPrice: 15 },
      { description: "b", quantity: 1, unitPrice: 2800 },
    ],
    0,
    0,
  );
  assert.equal(t.subtotal, 3520);
  assert.equal(t.total, 3520);
});

test("computeTotals: float quantities do not leak precision", () => {
  // 0.1 * 3 must be 0.30, not 0.30000000000000004
  const t = computeTotals([{ description: "meter", quantity: 3, unitPrice: 0.1 }], 0, 0);
  assert.equal(t.subtotal, 0.3);
  assert.equal(t.total, 0.3);
});

test("computeTotals: rates are clamped to 0–100", () => {
  const high = computeTotals([{ description: "x", quantity: 1, unitPrice: 100 }], 200, 0);
  assert.equal(high.taxAmount, 100); // 200% clamped to 100%
  assert.equal(high.total, 200);

  const negative = computeTotals([{ description: "x", quantity: 1, unitPrice: 100 }], -5, -5);
  assert.equal(negative.discountAmount, 0); // negative discount clamped to 0
  assert.equal(negative.taxAmount, 0);
  assert.equal(negative.total, 100);
});

test("computeTotals: discount can never exceed the subtotal", () => {
  const t = computeTotals([{ description: "x", quantity: 1, unitPrice: 100 }], 0, 100);
  assert.equal(t.discountAmount, 100);
  assert.equal(t.total, 0);
});

test("computeTotals: non-finite line item numbers are treated as 0", () => {
  const t = computeTotals(
    [{ description: "x", quantity: Number.NaN, unitPrice: 50 }],
    0,
    0,
  );
  assert.equal(t.subtotal, 0);
});

/* -------------------------------- rounding -------------------------------- */

test("round2: half-up and float-drift resistant", () => {
  assert.equal(round2(1.005), 1.01);
  assert.equal(round2(2.675), 2.68);
  assert.equal(round2(0.1 + 0.2), 0.3);
  assert.equal(round2(Number.NaN), 0);
  assert.equal(round2(10), 10);
});

test("clampRate: bounds and defaults", () => {
  assert.equal(clampRate(20), 20);
  assert.equal(clampRate(150), 100);
  assert.equal(clampRate(-3), 0);
  assert.equal(clampRate(Number.NaN), 0);
});

/* ---------------------------- date arithmetic ----------------------------- */

test("addMonthsISO: clamps to the end of the target month", () => {
  assert.equal(addMonthsISO("2026-01-31", 1), "2026-02-28");
  assert.equal(addMonthsISO("2024-01-31", 1), "2024-02-29"); // leap year
  assert.equal(addMonthsISO("2026-03-31", 1), "2026-04-30");
  assert.equal(addMonthsISO("2026-01-15", 1), "2026-02-15");
});

test("addMonthsISO: rolls the year over correctly", () => {
  assert.equal(addMonthsISO("2026-12-15", 1), "2027-01-15");
  assert.equal(addMonthsISO("2026-01-15", -1), "2025-12-15");
});

test("addDaysISO: crosses month and year boundaries", () => {
  assert.equal(addDaysISO("2026-01-30", 5), "2026-02-04");
  assert.equal(addDaysISO("2026-12-31", 1), "2027-01-01");
  assert.equal(addDaysISO("2026-03-01", -1), "2026-02-28");
});

/* ------------------------------ due / overdue ----------------------------- */

test("isOverdue: only sent invoices past their due date", () => {
  const yesterday = addDaysISO(todayISO(), -1);
  const tomorrow = addDaysISO(todayISO(), 1);

  assert.equal(isOverdue({ status: "sent", dueDate: yesterday }), true);
  assert.equal(isOverdue({ status: "sent", dueDate: tomorrow }), false);
  assert.equal(isOverdue({ status: "paid", dueDate: yesterday }), false);
  assert.equal(isOverdue({ status: "draft", dueDate: yesterday }), false);
  // due today is not yet overdue
  assert.equal(isOverdue({ status: "sent", dueDate: todayISO() }), false);
});

test("displayStatus: overdue overrides sent, otherwise passes status through", () => {
  const yesterday = addDaysISO(todayISO(), -1);
  assert.equal(displayStatus({ status: "sent", dueDate: yesterday }), "overdue");
  assert.equal(displayStatus({ status: "sent", dueDate: addDaysISO(todayISO(), 3) }), "sent");
  assert.equal(displayStatus({ status: "paid", dueDate: yesterday }), "paid");
  assert.equal(displayStatus({ status: "draft", dueDate: yesterday }), "draft");
});

/* ----------------------------- date validation ---------------------------- */

test("isValidISODate: accepts real dates, rejects roll-overs and junk", () => {
  assert.equal(isValidISODate("2026-02-28"), true);
  assert.equal(isValidISODate("2024-02-29"), true);
  assert.equal(isValidISODate("2026-02-31"), false); // no such day
  assert.equal(isValidISODate("2026-13-01"), false);
  assert.equal(isValidISODate("not-a-date"), false);
  assert.equal(isValidISODate(""), false);
  assert.equal(isValidISODate(20260101), false);
});

test("todayISO: matches YYYY-MM-DD", () => {
  assert.match(todayISO(), /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(isValidISODate(todayISO()), true);
});

/* ------------------------------- formatting ------------------------------- */

test("formatMoney: supported currency formats; unsupported never throws", () => {
  assert.match(formatMoney(4200, "USD"), /4,200\.00/);
  assert.doesNotThrow(() => formatMoney(10, "ZZZ"));
  assert.match(formatMoney(Number.NaN, "USD"), /0\.00/);
});
