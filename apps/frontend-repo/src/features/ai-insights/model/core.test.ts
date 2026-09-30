import { transactionResponse } from "@/mocks/transactionResponse";
import { describe, expect, it } from "vitest";
import type { TransactionDto } from "@/features/ai-insights/model/types";
import { buildRecommendedGoals } from "@/features/ai-insights/model/core";

const transaction = (
  id: number,
  transactionDate: string,
  amount: number,
  status = "승인",
  categoryName: string | null = "식음료",
): TransactionDto => transactionResponse({
  id,
  userId: 1,
  transactionDate,
  merchant: `가맹점 ${id}`,
  categoryId: categoryName ? 1 : null,
  categoryName,
  amount,
  cardName: "테스트 카드",
  installment: 1,
  status,
  isClassified: categoryName !== null,
});

describe("buildRecommendedGoals", () => {
  it("does not invent goal candidates without a matching classified month", () => {
    expect(buildRecommendedGoals([], "2026-06")).toEqual([]);
    expect(
      buildRecommendedGoals([transaction(1, "2026-05-10", 120_000)], "2026-06"),
    ).toEqual([]);
    expect(
      buildRecommendedGoals([transaction(2, "2026-06-10", 120_000, "승인", null)], "2026-06"),
    ).toEqual([]);
    expect(
      buildRecommendedGoals([transaction(3, "2026-06-10", 120_000)], null),
    ).toEqual([]);
  });

  it("uses only the selected transaction month and excludes cancelled amounts", () => {
    const goals = buildRecommendedGoals(
      [
        transaction(1, "2026-05-10", 90_000),
        transaction(2, "2026-06-10", 80_000),
        transaction(3, "2026-06-11", 40_000, "취소"),
      ],
      "2026-06",
    );

    expect(goals[0]).toMatchObject({
      month: "2026-06",
      baselineAmount: 80_000,
      targetAmount: 56_000,
      monthlySave: 24_000,
    });
  });
});
