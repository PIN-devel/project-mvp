export { TransactionDtoSchema, TransactionDtoListSchema } from "@/shared/model/transaction";
import { z } from "zod";

export const InsightPeriodSchema = z.enum([
  "ALL",
  "LAST_1_MONTH",
  "LAST_3_MONTHS",
]);

export const InsightTransactionSchema = z.object({
  transactionDate: z.string(),
  merchant: z.string(),
  categoryId: z.number().nullable().optional(),
  categoryName: z.string().nullable().optional(),
  amount: z.number(),
  tag: z.string().nullable().optional(),
  status: z.string().nullable().optional(),
  isClassified: z.boolean().optional(),
});

export const InsightRequestSchema = z.object({
  period: InsightPeriodSchema,
  categoryId: z.number().nullable(),
  transactions: z.array(InsightTransactionSchema).min(1),
});

export const InsightCardSchema = z.object({
  title: z.string(),
  description: z.string(),
});

export const InsightResponseSchema = z.object({
  summary: z.string(),
  cards: z.array(InsightCardSchema),
  generatedAt: z.string(),
});

export const MonthlyGoalSchema = z.object({
  id: z.number(),
  month: z.string(),
  title: z.string(),
  targetCategory: z.string(),
  reductionRatio: z.number(),
  baselineAmount: z.number(),
  targetAmount: z.number(),
  monthlySave: z.number(),
  status: z.enum(["active", "completed", "stopped"]),
  actualSaved: z.number().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const MonthlyGoalListSchema = z.array(MonthlyGoalSchema);

export const CategoryDtoSchema = z.object({
  id: z.number(),
  name: z.string(),
  color: z.string(),
  displayOrder: z.number(),
  isDefault: z.boolean(),
});

export const CategoryDtoListSchema = z.array(CategoryDtoSchema);
