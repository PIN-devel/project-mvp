import { transactionResponse } from "@/mocks/transactionResponse";
import { describe, expect, it } from "vitest";
import { filterTransactionsForInsight } from "./core";
import { buildSpendingModel, packMerchants } from "./spending";
import type { TransactionDto } from "./types";

const transaction = (id: number, overrides: Partial<TransactionDto> = {}): TransactionDto => transactionResponse({ id, userId: 1, transactionDate: "2026-09-10", merchant: `가맹점 ${id}`, categoryId: 1, categoryName: "식비", amount: 10000, cardName: "카드", installment: 0, status: "승인", isClassified: true, ...overrides });

describe("spending data integrity", () => {
  it("does not invent data for empty or excluded-only input", () => {
    const empty = buildSpendingModel([], []);
    expect(empty.total).toBe(0);
    expect(empty.pulse).toEqual([]);
    expect(empty.peak).toBeNull();
    expect(packMerchants(empty.merchants)).toEqual([]);
    const excluded = buildSpendingModel([
      transaction(1, { status: " 취소 " }), transaction(2, { status: "CANCELLED" }),
      transaction(3, { amount: -3000 }), transaction(4, { amount: 0 }),
      transaction(5, { transactionDate: "2026-02-30" }), transaction(6, { amount: Infinity }),
    ], []);
    expect(excluded.excluded).toEqual({ cancelled: 2, nonPositive: 2, invalid: 2, unknown: 0 });
    expect(excluded.total).toBe(0);
    expect(excluded.pulse).toEqual([]);
  });

  it("reconciles category, time and merchant totals to actual positive noncancelled transactions", () => {
    const data = [
      transaction(1, { amount: 1_000_000 }), transaction(2, { amount: 500, transactionDate: "2026-09-12" }),
      transaction(3, { amount: 1500, categoryId: 2, categoryName: "교통" }),
      transaction(4, { amount: 700, isClassified: false, categoryId: null, categoryName: null }),
      transaction(5, { status: "취소", amount: 900000 }),
    ];
    const model = buildSpendingModel(data, []);
    expect(model.total).toBe(1_002_700);
    for (const groups of [model.structure, model.pulse, model.merchants]) expect(groups.reduce((s, g) => s + g.amount, 0)).toBe(model.total);
    expect(model.structure.reduce((s, c) => s + c.count, 0)).toBe(4);
    expect(model.structure.find((c) => c.key === "unclassified")?.amount).toBe(700);
    expect(model.pulse.map((p) => p.date)).toEqual(["2026-09-10", "2026-09-11", "2026-09-12"]);
    expect(model.pulse[1].amount).toBe(0);
    expect(model.start).toBe("2026-09-10");
    expect(model.end).toBe("2026-09-12");
  });

  it("preserves one-category and 9/10-record boundary amounts without requiring AI eligibility", () => {
    for (const count of [1, 9, 10]) {
      const model = buildSpendingModel(Array.from({ length: count }, (_, i) => transaction(i)), []);
      expect(model.total).toBe(count * 10000);
      expect(model.structure).toHaveLength(1);
      expect(model.structure[0].count).toBe(count);
      expect(model.pulse).toHaveLength(1);
    }
  });

  it("uses observed month sums including partial endpoints and no future interval", () => {
    const model = buildSpendingModel([transaction(1, { transactionDate: "2026-01-25" }), transaction(2, { transactionDate: "2026-09-02" })], []);
    expect(model.unit).toBe("month");
    expect(model.pulse).toHaveLength(9);
    expect(model.pulse[0].date).toBe("2026-01");
    expect(model.pulse.at(-1)?.date).toBe("2026-09");
    expect(model.pulse.reduce((s, p) => s + p.amount, 0)).toBe(20000);
  });

  it("recalculates from the exact existing category and period filters", () => {
    const data = [transaction(1, { transactionDate: "2026-01-01" }), transaction(2, { categoryId: 2, categoryName: "교통", amount: 7000 }), transaction(3)];
    const filtered = filterTransactionsForInsight(data, { period: "LAST_1_MONTH", categoryId: 2 });
    const model = buildSpendingModel(filtered, []);
    expect(model.records.map((t) => t.id)).toEqual([2]);
    expect(model.total).toBe(7000);
  });

  it("represents every won in bounded packing, with exact area ratios and no collisions", () => {
    const model = buildSpendingModel(Array.from({ length: 80 }, (_, i) => transaction(i, { amount: i === 0 ? 1000000 : i + 1 })), []);
    const nodes = packMerchants(model.merchants);
    expect(nodes).toHaveLength(36);
    expect(nodes.reduce((s, n) => s + n.amount, 0)).toBe(model.total);
    expect(nodes.flatMap((n) => n.records)).toHaveLength(80);
    expect(packMerchants(model.merchants)).toEqual(nodes);
    for (const [i, n] of nodes.entries()) {
      expect(n.r * n.r / n.amount).toBeCloseTo(nodes[0].r * nodes[0].r / nodes[0].amount, 8);
      expect(n.x - n.r).toBeGreaterThanOrEqual(39.99);
      expect(n.x + n.r).toBeLessThanOrEqual(660.01);
      expect(n.y - n.r).toBeGreaterThanOrEqual(27.99);
      expect(n.y + n.r).toBeLessThanOrEqual(382.01);
      for (const other of nodes.slice(i + 1)) expect(Math.hypot(n.x - other.x, n.y - other.y)).toBeGreaterThanOrEqual(n.r + other.r);
    }
  });
});
