import { beforeEach, describe, expect, it, vi } from "vitest";
import { ANALYSIS_CACHE_PREFIX, clearAnalysisExperienceCaches } from "@/shared/model/analysisCacheStorage";
import { buildAnalysisSignature, isCurrentAnalysis, parseAnalysisCache, readAnalysisCache, writeAnalysisCache } from "./analysisCache";
import type { AnalysisCache } from "./analysisCache";
import type { TransactionDto } from "./types";

const filters = { period: "ALL" as const, categoryId: null };
const records: TransactionDto[] = Array.from({ length: 10 }, (_, i) => ({ id: i, userId: 1, transactionDate: "2026-09-01", merchant: `가맹점${i}`, amount: i + 1000, cardName: "민감한 카드 정보", installment: 0, status: "승인", categoryId: 1, categoryName: "식비", isClassified: true }));
const cache: AnalysisCache = { version: 1, userScope: "session-A", succeededAt: "2026-09-30T08:00:00.000Z", scope: { filters, signature: buildAnalysisSignature(records, filters), transactionCount: 10, categoryLabel: "전체 카테고리" }, result: { summary: "소비 해석", cards: [{ title: "발견", description: "AI 해석" }], generatedAt: "2026-09-30T08:00:00Z" } };
const activate = (scope = "session-A") => localStorage.setItem("app-storage", JSON.stringify({ state: { isAuthenticated: true, analysisNamespace: scope } }));

beforeEach(() => { localStorage.clear(); activate(); });
describe("analysis experience cache", () => {
  it("round trips a scoped success without persisting source transactions", () => {
    expect(writeAnalysisCache(cache)).toBe(true);
    expect(readAnalysisCache("session-A")).toEqual(cache);
    const value = localStorage.getItem(`${ANALYSIS_CACHE_PREFIX}session-A`)!;
    expect(value).not.toMatch(/merchant|cardName|민감한|가맹점|transactions/);
    expect(parseAnalysisCache(value, "session-B")).toBeNull();
  });
  it("rejects corrupt, unsupported and malformed cached results", () => {
    for (const value of ["{", "null", JSON.stringify({ ...cache, version: 2 }), JSON.stringify({ ...cache, succeededAt: "bad" }), JSON.stringify({ ...cache, result: { summary: "missing cards" } }), JSON.stringify({ ...cache, transactions: records }), JSON.stringify({ ...cache, scope: { ...cache.scope, transactionCount: 9 } })]) {
      expect(parseAnalysisCache(value, "session-A")).toBeNull();
    }
  });
  it("does not recreate a cache after logout or cross-user transition", () => {
    writeAnalysisCache(cache);
    activate("session-B");
    expect(readAnalysisCache("session-A")).toBeNull();
    expect(writeAnalysisCache(cache)).toBe(false);
    clearAnalysisExperienceCaches();
    localStorage.removeItem("app-storage");
    expect(writeAnalysisCache(cache)).toBe(false);
    expect(localStorage.length).toBe(0);
  });
  it("falls back safely when storage is corrupt or full", () => {
    localStorage.setItem(`${ANALYSIS_CACHE_PREFIX}session-A`, "{");
    expect(readAnalysisCache("session-A")).toBeNull();
    vi.stubGlobal("localStorage", { getItem: localStorage.getItem.bind(localStorage), setItem: () => { throw new Error("quota"); } });
    expect(writeAnalysisCache(cache)).toBe(false);
    vi.unstubAllGlobals();
  });
});
describe("transaction and scope signature", () => {
  it("is stable across server ordering", () => {
    expect(buildAnalysisSignature([...records].reverse(), filters)).toBe(cache.scope.signature);
    expect(isCurrentAnalysis(cache.scope, cache.scope.signature, 10)).toBe(true);
  });
  it.each([
    { amount: 1001 }, { id: 99 }, { transactionDate: "2026-09-02" }, { merchant: "다른 가맹점" }, { categoryId: 2 }, { categoryName: "교통" }, { isClassified: false }, { status: "취소" }, { tag: "반복" },
  ])("detects a source-data change: %j", (change) => {
    const signature = buildAnalysisSignature([{ ...records[0], ...change }, ...records.slice(1)], filters);
    expect(signature).not.toBe(cache.scope.signature);
    expect(isCurrentAnalysis(cache.scope, signature, 10)).toBe(false);
  });
  it("invalidates changed filters, deleted transactions and fewer than ten records", () => {
    expect(buildAnalysisSignature(records, { ...filters, period: "LAST_1_MONTH" })).not.toBe(cache.scope.signature);
    expect(buildAnalysisSignature(records, { ...filters, categoryId: 1 })).not.toBe(cache.scope.signature);
    expect(buildAnalysisSignature(records.slice(1), filters)).not.toBe(cache.scope.signature);
    expect(isCurrentAnalysis(cache.scope, cache.scope.signature, 9)).toBe(false);
  });
});
