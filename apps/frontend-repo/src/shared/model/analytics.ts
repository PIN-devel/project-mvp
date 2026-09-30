import { z } from "zod";
import { TransactionFoundationSchema } from "@/shared/model/transaction";

const safeAmount = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const count = z.number().int().nonnegative();
const ids = z.array(z.number().int().positive());
const PeriodSchema = z.object({ start: z.string().nullable(), endExclusive: z.string().nullable() });
const SourceScopeSchema = z.object({ kind: z.enum(["ALL_CARDS", "SELECTED_CARDS"]), cardNames: z.array(z.string()) });
const QuerySchema = z.object({
  period: z.enum(["ALL", "LAST_1_MONTH", "LAST_3_MONTHS"]), start: z.string().nullable(), endExclusive: z.string().nullable(),
  categoryIds: ids, cardNames: z.array(z.string()),
});
const AggregateSchema = z.object({
  key: z.string(), categoryId: z.number().nullable(), categoryLabel: z.string(), merchantRawName: z.string().nullable(),
  amount: safeAmount, count, amountShare: z.number(), countShare: z.number(), transactionIds: ids,
});
const EvidenceSchema = z.object({
  id: z.string(), metric: z.string(), value: z.number(), unit: z.enum(["KRW", "COUNT", "PERCENT"]),
  denominator: z.number().nullable(), period: PeriodSchema, sourceScope: SourceScopeSchema, scopeKey: z.string(),
  categoryId: z.number().nullable(), categoryLabel: z.string().nullable(), merchantRawName: z.string().nullable(), transactionIds: ids,
});
export const AnalyticsSnapshotSchema = z.object({
  query: QuerySchema, period: PeriodSchema, sourceScope: SourceScopeSchema, basisVersion: z.literal("spending-v1"), dataRevision: z.string(),
  totalAmount: safeAmount, transactionCount: count,
  records: z.array(z.object({ foundation: TransactionFoundationSchema, cardName: z.string().nullable(), categoryKey: z.string() })),
  categories: z.array(AggregateSchema), merchants: z.array(AggregateSchema), timeUnit: z.enum(["day", "month"]),
  timeBuckets: z.array(z.object({ date: z.string(), amount: safeAmount, count, transactionIds: ids, categoryAmounts: z.record(z.string(), safeAmount) })),
  quality: z.object({
    sourceTransactionCount: count, selectedTransactionCount: count, excludedCount: count,
    exclusionReasons: z.record(z.string(), count), unclassifiedCount: count, unclassifiedAmount: safeAmount,
    inconsistentCount: count, inconsistentAmount: safeAmount, sourceUnclassifiedCount: count, sourceInconsistentCount: count, unresolvedSourceCount: count,
    coverage: z.literal("UNKNOWN"), comparability: z.literal("NOT_CONFIRMED"), limitations: z.array(z.string()),
  }),
  evidence: z.array(EvidenceSchema),
  observations: z.array(z.object({ id: z.string(), kind: z.string(), scopeKey: z.string(), categoryId: z.number().nullable(), evidenceIds: z.array(z.string()) })),
});
const GoalEligibilitySchema = z.object({ status: z.enum(["BLOCKED", "REQUIRES_CONFIRMATION"]), reasons: z.array(z.string()) });
export const AnalysisRunSchema = z.object({
  id: z.string(), snapshot: AnalyticsSnapshotSchema,
  status: z.enum(["PENDING", "SUCCEEDED", "AI_FAILED", "INSUFFICIENT_DATA"]), failureCode: z.string().nullable(),
  findings: z.array(z.object({ id: z.string(), observationId: z.string(), evidenceIds: z.array(z.string()), interpretation: z.string(), importance: z.enum(["HIGH", "MEDIUM", "LOW"]), limitations: z.array(z.string()) })),
  opportunities: z.array(z.object({ id: z.string(), categoryId: z.number(), categoryLabelSnapshot: z.string(), evidenceIds: z.array(z.string()), findingIds: z.array(z.string()), direction: z.literal("REDUCE_SPENDING"), rationale: z.string(), goalEligibility: GoalEligibilitySchema })),
  generatedAt: z.string(), schemaVersion: z.literal("analysis-v1"), promptVersion: z.string(), modelVersion: z.string(),
});
export const AnalysisResponseSchema = z.object({ run: AnalysisRunSchema.nullable(), currentDataRevision: z.string().nullable(), stale: z.boolean() });
export const SnapshotResponseSchema = z.object({ snapshot: AnalyticsSnapshotSchema });
export const HandoffResponseSchema = z.object({ handoff: z.object({
  analysisRunId: z.string(), opportunityId: z.string(), sourceDataRevision: z.string(), currentDataRevision: z.string(), stale: z.boolean(),
  scope: z.literal("CATEGORY"), categoryId: z.number(), categoryLabelSnapshot: z.string(), evidenceIds: z.array(z.string()),
  direction: z.literal("REDUCE_SPENDING"), rationale: z.string(), goalEligibility: GoalEligibilitySchema,
  baselineProposal: z.object({ period: PeriodSchema, sourceScope: SourceScopeSchema, basisVersion: z.literal("spending-v1"),
    dataRevision: z.string(), amount: safeAmount.nullable(), count: count.nullable(),
    status: z.enum(["REQUIRES_SOURCE_CONFIRMATION", "CLOSED_MONTH_SELECTION_REQUIRED"]),
  }),
}) });
export type AnalyticsSnapshot = z.infer<typeof AnalyticsSnapshotSchema>;
export type AnalyticsQuery = z.infer<typeof QuerySchema>;
export type AnalysisResponse = z.infer<typeof AnalysisResponseSchema>;
export type AnalysisRun = z.infer<typeof AnalysisRunSchema>;

export const evidenceMetricLabel = (metric: string) => metric.endsWith("SHARE") ? "소비 금액 비중"
  : metric.endsWith("COUNT") ? "거래 수" : "관측된 소비 금액";

/** Display substitution only: the model cannot supply amounts or percentages of its own. */
export function renderEvidenceText(text: string, snapshot: AnalyticsSnapshot) {
  const evidence = new Map(snapshot.evidence.map((e) => [e.id, e]));
  return text.replace(/\{\{([^{}]+)}}/g, (_token, id: string) => {
    const e = evidence.get(id);
    if (!e) return "확인할 수 없는 근거";
    const unit = e.unit === "KRW" ? "원" : e.unit === "COUNT" ? "건" : "%";
    return `${new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 1 }).format(e.value)}${unit}`;
  });
}
