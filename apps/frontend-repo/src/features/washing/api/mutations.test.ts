import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/mocks/server";
import { transactionResponse } from "@/mocks/transactionResponse";
import { bulkAddTransactions, updateTransaction } from "./mutations";

const preview = transactionResponse({
  id: 1, userId: 0, transactionDate: "2026-04-01", merchant: "합성 가맹점",
  amount: 1000, cardName: "신한카드", installment: 1, status: "승인",
  categoryId: null, categoryName: null, memo: null, tag: null,
  isClassified: false, appliedRuleId: null,
}, false);

const expectedInput = {
  transactionDate: "2026-04-01", merchant: "합성 가맹점", amount: 1000,
  cardName: "신한카드", installment: 1, status: "승인",
  categoryId: null, categoryName: null, memo: null, tag: null,
};

describe("transaction write requests", () => {
  it("saves all 146 preview rows without echoing server-owned response fields", async () => {
    let received: unknown;
    server.use(http.post("/api/transactions/bulk", async ({ request }) => {
      received = await request.json();
      return HttpResponse.json({ added: [], skippedCount: 146 });
    }));
    await bulkAddTransactions(Array.from({ length: 146 }, () => preview));
    expect(received).toEqual(Array.from({ length: 146 }, () => expectedInput));
  });

  it("uses the same writable contract for transaction edits", async () => {
    let received: unknown;
    server.use(http.put("/api/transactions/1", async ({ request }) => {
      received = await request.json();
      return HttpResponse.json(preview);
    }));
    await updateTransaction(1, preview);
    expect(received).toEqual(expectedInput);
  });
});
