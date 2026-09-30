import type { TransactionDto, TransactionFoundation } from "@/shared/model/transaction";

/** MSW response fixture only. Production status/eligibility decisions come from the server. */
export function transactionResponse(transaction: Omit<TransactionDto, "foundation">, persisted = true): TransactionDto {
  const raw = transaction.status.trim().toLowerCase();
  const canonicalStatus = ["승인", "approved"].includes(raw) ? "APPROVED" : ["취소", "cancelled", "canceled"].includes(raw) ? "CANCELLED" : "UNKNOWN";
  const categoryAvailable = transaction.categoryId != null && transaction.categoryName != null;
  const flag = transaction.isClassified ?? (transaction.categoryId != null);
  const classification = categoryAvailable && flag ? "CLASSIFIED" : transaction.categoryId == null && !flag ? "UNCLASSIFIED" : "INCONSISTENT";
  const reasons: TransactionFoundation["spendingExclusionReasons"] = [];
  if (!persisted) reasons.push("PREVIEW_NOT_SAVED");
  const date = new Date(`${transaction.transactionDate}T00:00:00Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== transaction.transactionDate) reasons.push("INVALID_DATE");
  if (!Number.isSafeInteger(transaction.amount)) reasons.push("INVALID_AMOUNT");
  else if (transaction.amount <= 0) reasons.push("NON_POSITIVE_AMOUNT");
  if (canonicalStatus === "CANCELLED") reasons.push("CANCELLED");
  if (canonicalStatus === "UNKNOWN") reasons.push("UNKNOWN_STATUS");
  return {
    ...transaction,
    foundation: {
      transactionId: transaction.id, occurredOn: transaction.transactionDate, amount: transaction.amount,
      rawStatus: transaction.status, canonicalStatus,
      categoryId: categoryAvailable ? transaction.categoryId! : null,
      categoryLabel: categoryAvailable ? transaction.categoryName! : null,
      merchantRawName: transaction.merchant, classification, appliedRuleId: transaction.appliedRuleId ?? null,
      persisted, basisVersion: "spending-v1", spendingEligible: reasons.length === 0, spendingExclusionReasons: reasons,
    },
  };
}
