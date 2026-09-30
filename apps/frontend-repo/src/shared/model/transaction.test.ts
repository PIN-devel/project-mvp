import { describe, expect, it } from "vitest";
import { transactionResponse } from "@/mocks/transactionResponse";
import { isSpendingEligible, isTransactionClassified } from "./transaction";

const saved = transactionResponse({ id: 1, userId: 1, transactionDate: "2026-09-30", merchant: "가맹점 원문", amount: 100,
  categoryId: 1, categoryName: "내 카테고리", isClassified: true, cardName: "카드", installment: 1, status: "승인" });

describe("server transaction contract", () => {
  it("does not guess status or classification when foundation is missing", () => {
    expect(isTransactionClassified({})).toBe(false);
    expect(isSpendingEligible({})).toBe(false);
    expect(isTransactionClassified(saved)).toBe(true);
    expect(isTransactionClassified({ foundation: { ...saved.foundation!, classification: "INCONSISTENT" } })).toBe(false);
  });

  it("protects the stored-record and FE safe-integer boundaries", () => {
    expect(isSpendingEligible(saved)).toBe(true);
    expect(isSpendingEligible({ foundation: { ...saved.foundation!, persisted: false } })).toBe(false);
    expect(isSpendingEligible({ foundation: { ...saved.foundation!, amount: Number.MAX_SAFE_INTEGER + 1 } })).toBe(false);
  });
});
