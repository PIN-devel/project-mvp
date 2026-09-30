import type { AnalyticsSnapshot } from "./analytics";
import { spendingPalette } from "./spending";

/** Projection for existing MVP-381 geometry. All measured values come from the server snapshot. */
export function toSpendingSceneModel(snapshot: AnalyticsSnapshot) {
  const records = snapshot.records.map(({ foundation: f, categoryKey }) => ({
    id: f.transactionId!, transactionDate: f.occurredOn!, merchant: f.merchantRawName ?? "가맹점명 없음",
    amount: f.amount!, categoryKey,
  }));
  const byId = new Map(records.map((r) => [r.id, r]));
  const lookup = (ids: number[]) => ids.map((id) => byId.get(id)!).filter(Boolean);
  const structure = snapshot.categories.map((c, i) => ({
    key: c.key, name: c.categoryLabel, amount: c.amount, count: c.count, amountShare: c.amountShare, countShare: c.countShare,
    color: c.categoryId === null ? "#9daec1" : spendingPalette[i % spendingPalette.length],
  }));
  const pulse = snapshot.timeBuckets.map((p) => ({ ...p, records: lookup(p.transactionIds) }));
  const merchants = snapshot.merchants.map((m) => {
    const rows = lookup(m.transactionIds);
    const categoryKey = rows[0]?.categoryKey ?? "inconsistent";
    return { key: m.key, name: m.merchantRawName ?? "가맹점명 없음", categoryKey, amount: m.amount,
      amountShare: m.amountShare, records: rows, color: structure.find((c) => c.key === categoryKey)?.color ?? "#9daec1" };
  });
  const end = snapshot.period.endExclusive
    ? new Date(Date.parse(snapshot.period.endExclusive) - 86_400_000).toISOString().slice(0, 10) : null;
  return { total: snapshot.totalAmount, records, structure, pulse, merchants, unit: snapshot.timeUnit,
    start: snapshot.period.start, end,
    peak: pulse.reduce<(typeof pulse)[number] | null>((best, p) => !best || p.amount > best.amount ? p : best, null),
  };
}
