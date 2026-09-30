import { z } from "zod";
import { ANALYSIS_CACHE_PREFIX, getActiveAnalysisNamespace } from "@/shared/model/analysisCacheStorage";
import { InsightPeriodSchema, InsightResponseSchema } from "./schemas";
import type { InsightFilters, TransactionDto } from "./types";

export const AnalysisCacheSchema = z.object({
  version: z.literal(1),
  userScope: z.string().min(1).max(128),
  succeededAt: z.iso.datetime(),
  scope: z.object({
    signature: z.string().regex(/^[0-9a-f]{16}$/),
    filters: z.object({ period: InsightPeriodSchema, categoryId: z.number().int().nullable() }).strict(),
    transactionCount: z.number().int().min(10),
    categoryLabel: z.string(),
  }).strict(),
  result: InsightResponseSchema,
}).strict();

export type AnalysisCache = z.infer<typeof AnalysisCacheSchema>;
export type ResultScope = AnalysisCache["scope"];

// A change detector, not an authentication hash. Only its compact digest is persisted.
// Sorting makes equivalent API responses independent of row order.
export function buildAnalysisSignature(transactions: TransactionDto[], filters: InsightFilters) {
  const rows = transactions.map((t) => JSON.stringify([
    t.id, t.userId, t.transactionDate, t.merchant, t.amount,
    t.categoryId ?? null, t.categoryName ?? null, t.tag ?? null,
    t.status, t.isClassified ?? null,
  ])).sort();
  const value = JSON.stringify([filters.period, filters.categoryId, rows]);
  let first = 0x811c9dc5, second = 0x9e3779b9;
  for (let i = 0; i < value.length; i++) {
    first = Math.imul(first ^ value.charCodeAt(i), 0x01000193);
    second = Math.imul(second ^ value.charCodeAt(i), 0x85ebca6b);
  }
  return [first, second].map((n) => (n >>> 0).toString(16).padStart(8, "0")).join("");
}

export function parseAnalysisCache(value: string, userScope: string): AnalysisCache | null {
  try {
    const parsed = AnalysisCacheSchema.safeParse(JSON.parse(value));
    return parsed.success && parsed.data.userScope === userScope ? parsed.data : null;
  } catch { return null; }
}

export function readAnalysisCache(userScope: string | null): AnalysisCache | null {
  if (!userScope || getActiveAnalysisNamespace() !== userScope) return null;
  try {
    const value = localStorage.getItem(`${ANALYSIS_CACHE_PREFIX}${userScope}`);
    return value ? parseAnalysisCache(value, userScope) : null;
  } catch { return null; }
}

export function writeAnalysisCache(cache: AnalysisCache): boolean {
  // A late response from a logged-out/replaced session must never recreate its cache.
  if (getActiveAnalysisNamespace() !== cache.userScope) return false;
  try {
    localStorage.setItem(`${ANALYSIS_CACHE_PREFIX}${cache.userScope}`, JSON.stringify(AnalysisCacheSchema.parse(cache)));
    return true;
  } catch { return false; }
}

export function isCurrentAnalysis(scope: ResultScope | null, signature: string, count: number) {
  return scope != null && scope.signature === signature && scope.transactionCount === count && count >= 10;
}
