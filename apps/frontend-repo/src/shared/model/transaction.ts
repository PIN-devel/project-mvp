import { z } from "zod";

/** Server-owned semantics. Preview is never an analysis input; labels carry no inferred meaning. */
export const TransactionFoundationSchema = z.object({
  transactionId: z.number().nullable(),
  occurredOn: z.string().nullable(),
  amount: z.number().nullable(),
  rawStatus: z.string().nullable(),
  canonicalStatus: z.enum(["APPROVED", "CANCELLED", "UNKNOWN"]),
  categoryId: z.number().nullable(),
  categoryLabel: z.string().nullable(),
  merchantRawName: z.string().nullable(),
  classification: z.enum(["CLASSIFIED", "UNCLASSIFIED", "INCONSISTENT"]),
  appliedRuleId: z.number().nullable(),
  persisted: z.boolean(),
  basisVersion: z.literal("spending-v1"),
  spendingEligible: z.boolean(),
  spendingExclusionReasons: z.array(z.enum([
    "PREVIEW_NOT_SAVED", "INVALID_DATE", "INVALID_AMOUNT", "NON_POSITIVE_AMOUNT", "CANCELLED", "UNKNOWN_STATUS",
  ])),
});
export type TransactionFoundation = z.infer<typeof TransactionFoundationSchema>;

// Legacy fields remain available for existing API adapters, including hidden tag values.
export const TransactionDtoSchema = z.object({
  id: z.number(),
  userId: z.number(),
  transactionDate: z.string(),
  merchant: z.string(),
  categoryId: z.number().nullable().optional(),
  categoryName: z.string().nullable().optional(),
  amount: z.number(),
  cardName: z.string(),
  installment: z.number(),
  status: z.string(),
  memo: z.string().nullable().optional(),
  tag: z.string().nullable().optional(),
  isClassified: z.boolean().optional(),
  appliedRuleId: z.number().nullable().optional(),
  foundation: TransactionFoundationSchema.optional(),
});
export const TransactionDtoListSchema = z.array(TransactionDtoSchema);
export type TransactionDto = z.infer<typeof TransactionDtoSchema>;

// Missing foundation from an older server is unresolved, never silently approved/classified.
export const isTransactionClassified = (transaction: { foundation?: TransactionFoundation }) =>
  transaction.foundation?.classification === "CLASSIFIED";
export const isSpendingEligible = (transaction: { foundation?: TransactionFoundation }) =>
  transaction.foundation?.persisted === true && transaction.foundation.spendingEligible &&
  Number.isSafeInteger(transaction.foundation.amount) && (transaction.foundation.amount ?? 0) > 0;
