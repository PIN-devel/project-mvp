import { isTransactionClassified } from "./core";
import type { CategoryDto, TransactionDto } from "./types";

// A single, explicit basis for all three views. This is spending, not net cash flow.
export const spendingPalette = ["#31e6b8", "#7ca9da", "#b3a0d3", "#d4b88c", "#7fb9b6", "#9daec1"];

export function categoryKey(transaction: TransactionDto) {
  if (!isTransactionClassified(transaction)) return "unclassified";
  return transaction.categoryId != null ? `id:${transaction.categoryId}` : `name:${transaction.categoryName || "미분류"}`;
}

function validDate(value: string) {
  const date = value.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(Date.parse(`${date}T00:00:00Z`)) && new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) === date;
}

export function buildSpendingModel(transactions: TransactionDto[], categories: CategoryDto[]) {
  let cancelled = 0, nonPositive = 0, invalid = 0;
  const records = transactions.filter((t) => {
    if (["취소", "canceled", "cancelled"].includes(t.status.trim().toLowerCase())) { cancelled++; return false; }
    if (!Number.isFinite(t.amount) || !validDate(t.transactionDate)) { invalid++; return false; }
    if (t.amount <= 0) { nonPositive++; return false; }
    return true;
  }).sort((a, b) => a.transactionDate.localeCompare(b.transactionDate) || a.id - b.id);
  const total = records.reduce((sum, t) => sum + t.amount, 0);
  const categoryMap = new Map<string, { key: string; name: string; amount: number; count: number; color: string }>();
  const orderedCategories = [...categories].sort((a, b) => a.displayOrder - b.displayOrder || a.id - b.id);
  for (const t of records) {
    const key = categoryKey(t);
    const categoryIndex = orderedCategories.findIndex((c) => c.id === t.categoryId);
    const value = categoryMap.get(key) ?? { key, name: key === "unclassified" ? "미분류" : categories.find((c) => c.id === t.categoryId)?.name || t.categoryName || "미분류", amount: 0, count: 0, color: key === "unclassified" ? "#9daec1" : spendingPalette[(categoryIndex >= 0 ? categoryIndex : categoryMap.size) % spendingPalette.length] };
    value.amount += t.amount;
    value.count++;
    categoryMap.set(key, value);
  }
  const structure = [...categoryMap.values()].sort((a, b) => b.amount - a.amount || a.key.localeCompare(b.key));
  const start = records[0]?.transactionDate.slice(0, 10) ?? null;
  const end = records.at(-1)?.transactionDate.slice(0, 10) ?? null;
  const span = start && end ? (Date.parse(end) - Date.parse(start)) / 86400000 + 1 : 0;
  const unit = span > 93 ? "month" : "day";
  const timeMap = new Map<string, { date: string; amount: number; count: number; records: TransactionDto[] }>();
  // Include zero-spend intervals between observed endpoints, never extrapolate beyond them.
  if (start && end) {
    const cursor = new Date(`${unit === "month" ? `${start.slice(0, 7)}-01` : start}T00:00:00Z`);
    while (cursor.toISOString().slice(0, 10) <= end) {
      const date = cursor.toISOString().slice(0, unit === "month" ? 7 : 10);
      timeMap.set(date, { date, amount: 0, count: 0, records: [] });
      if (unit === "month") cursor.setUTCMonth(cursor.getUTCMonth() + 1);
      else cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
  }
  for (const t of records) {
    const date = t.transactionDate.slice(0, unit === "month" ? 7 : 10);
    const bucket = timeMap.get(date)!;
    bucket.amount += t.amount; bucket.count++; bucket.records.push(t);
  }
  const pulse = [...timeMap.values()];
  const peak = pulse.reduce<(typeof pulse)[number] | null>((best, p) => !best || p.amount > best.amount ? p : best, null);
  const merchantMap = new Map<string, { key: string; name: string; categoryKey: string; amount: number; records: TransactionDto[]; color: string }>();
  for (const t of records) {
    const cat = categoryMap.get(categoryKey(t))!;
    const name = t.merchant.trim() || "가맹점명 없음";
    const key = JSON.stringify([cat.key, name]);
    const value = merchantMap.get(key) ?? { key, name, categoryKey: cat.key, amount: 0, records: [], color: cat.color };
    value.amount += t.amount; value.records.push(t); merchantMap.set(key, value);
  }
  const merchants = [...merchantMap.values()].sort((a, b) => b.amount - a.amount || a.key.localeCompare(b.key));
  return { total, records, structure, pulse, peak, unit, start, end, merchants, excluded: { cancelled, nonPositive, invalid } };
}

export type SpendingModel = ReturnType<typeof buildSpendingModel>;
export type SpendingMerchant = SpendingModel["merchants"][number];

// Exact area encoding (r² ∝ amount), deterministic collision-free placement.
// A remainder cluster keeps every won represented while bounding SVG and layout cost.
export function packMerchants(merchants: SpendingMerchant[]) {
  const visible = merchants.slice(0, 35);
  const remaining = merchants.slice(35);
  if (remaining.length) visible.push({ key: "remainder", name: `그 외 ${remaining.length}개 가맹점 그룹`, categoryKey: "remainder", color: "#9daec1", amount: remaining.reduce((s, m) => s + m.amount, 0), records: remaining.flatMap((m) => m.records) });
  const total = visible.reduce((s, m) => s + m.amount, 0);
  const placed: Array<SpendingMerchant & { x: number; y: number; r: number }> = [];
  for (const merchant of visible.sort((a, b) => b.amount - a.amount)) {
    const r = Math.sqrt(merchant.amount / total) * 150;
    let x = 0, y = 0;
    for (let i = 0; i < 20000; i++) {
      const angle = i * 2.399963229728653;
      const distance = Math.sqrt(i) * 3;
      x = Math.cos(angle) * distance; y = Math.sin(angle) * distance;
      if (placed.every((p) => Math.hypot(p.x - x, p.y - y) >= p.r + r + 5)) break;
    }
    placed.push({ ...merchant, x, y, r });
  }
  if (!placed.length) return [];
  const left = Math.min(...placed.map((p) => p.x - p.r)), right = Math.max(...placed.map((p) => p.x + p.r));
  const top = Math.min(...placed.map((p) => p.y - p.r)), bottom = Math.max(...placed.map((p) => p.y + p.r));
  const scale = Math.min(620 / (right - left), 354 / (bottom - top));
  return placed.map((p) => ({ ...p, x: 350 + (p.x - (left + right) / 2) * scale, y: 205 + (p.y - (top + bottom) / 2) * scale, r: p.r * scale }));
}
