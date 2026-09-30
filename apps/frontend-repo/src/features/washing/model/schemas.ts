import { TransactionFoundationSchema } from "@/shared/model/transaction";
import { TransactionDtoListSchema } from "@/shared/model/transaction";
export { TransactionDtoSchema, TransactionDtoListSchema } from "@/shared/model/transaction";
import { z } from "zod";

export const WashingTransactionSchema = z.object({
  id: z.number(),
  foundation: TransactionFoundationSchema.optional(),
  occurredAt: z.string(),
  merchantName: z.string(),
  description: z.string(),
  cardLabel: z.string(),
  amount: z.number(),
  category: z.string().nullable(),
  isClassified: z.boolean(),
  matchedRuleLabel: z.string().nullable(),
  tag: z.string(),
  source: z.enum(["CARD", "BANK", "CASH"]),
});

export const WashingOverviewSchema = z.object({
  categories: z.array(z.string()),
  transactions: z.array(WashingTransactionSchema),
  lastImportedAt: z.string(),
});

export const CategoryDtoSchema = z.object({
  id: z.number(),
  name: z.string(),
  color: z.string(),
  displayOrder: z.number(),
  isDefault: z.boolean(),
});

export const CategoryDtoListSchema = z.array(CategoryDtoSchema);

export const BulkAddResponseSchema = z.object({
  added: TransactionDtoListSchema,
  skippedCount: z.number(),
});
