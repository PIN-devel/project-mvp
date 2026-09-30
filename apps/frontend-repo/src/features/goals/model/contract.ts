import { z } from "zod";
import { AnalyticsSnapshotSchema } from "@/shared/model/analytics";

const amount = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const Lifecycle = z.enum(["OPEN", "REVIEWED", "STOPPED"]);
export const GoalCycleSchema = z.object({
  id: z.string(), analysisRunId: z.string(), opportunityId: z.string(), categoryId: z.number(),
  categoryLabelSnapshot: z.string(), rationale: z.string(), evidenceIds: z.array(z.string()),
  baseline: z.object({ snapshot: AnalyticsSnapshotSchema, confirmedAt: z.string(), confirmationKind: z.literal("USER_CONFIRMED") }),
  targetAmount: amount, start: z.string(), endExclusive: z.string(), lifecycle: Lifecycle,
  previousCycleId: z.string().nullable(), createdAt: z.string(),
});
const EvaluationSchema = z.object({
  id: z.string(), goalId: z.string(), snapshot: AnalyticsSnapshotSchema, actualAmount: amount.nullable(),
  observedChange: z.number().int().nullable(), outcome: z.enum(["MET", "NOT_MET", "UNDETERMINED"]),
  sourceConfirmed: z.boolean(), confirmedAt: z.string().nullable(), baselineChanged: z.boolean(), evaluatedAt: z.string(),
});
export const GoalResponseSchema = z.object({ goal: z.object({
  cycle: GoalCycleSchema, tracking: z.object({ snapshot: AnalyticsSnapshotSchema, actualAmount: amount.nullable(),
    observedChange: z.number().int().nullable(), baselineChanged: z.boolean(), sourceRisk: z.boolean(), resultChanged: z.boolean(),
    phase: z.enum(["ACTIVE", "READY_TO_REVIEW", "RESULT"]),
  }), evaluations: z.array(EvaluationSchema), nextCycleId: z.string().nullable(),
}) });
export const PreparationResponseSchema = z.object({ preparation: z.object({
  analysisRunId: z.string(), opportunityId: z.string(), previousCycleId: z.string().nullable(), categoryId: z.number(),
  categoryLabel: z.string(), rationale: z.string(), evidenceIds: z.array(z.string()), sourceDataRevision: z.string(),
  baselineMonth: z.string(), availableBaselineMonths: z.array(z.string()), earliestExecutionMonth: z.string(),
  baselineSnapshot: AnalyticsSnapshotSchema, canCreate: z.boolean(), reasons: z.array(z.string()),
}) });
export const GoalSummarySchema = z.object({ id: z.string(), categoryLabel: z.string(), lifecycle: Lifecycle,
  start: z.string(), endExclusive: z.string(), baselineAmount: amount, targetAmount: amount, previousCycleId: z.string().nullable(),
});
export type GoalView = z.infer<typeof GoalResponseSchema>["goal"];
export type GoalPreparation = z.infer<typeof PreparationResponseSchema>["preparation"];
export type GoalSummary = z.infer<typeof GoalSummarySchema>;
export interface GoalCreate {
  analysisRunId: string; opportunityId: string; previousCycleId: string | null; baselineMonth: string; executionMonth: string;
  targetAmount: number; sourceConfirmed: boolean; expectedSourceRevision: string; expectedBaselineRevision: string; idempotencyKey: string;
}
export const won = (value: number) => `${value.toLocaleString("ko-KR")}원`;
export const endDate = (endExclusive: string) => new Date(Date.parse(endExclusive) - 86_400_000).toISOString().slice(0, 10);
export const changeText = (value: number | null) => value === null ? "아직 비교할 내역이 없어요"
  : value > 0 ? `기준 기간보다 소비가 ${won(value)} 감소했어요`
  : value < 0 ? `기준 기간보다 소비가 ${won(-value)} 증가했어요` : "기준 기간과 관측 소비가 같아요";
export const reasonText = (reason: string) => ({
  STALE_OPPORTUNITY: "이용내역이 바뀌었어요. 현재 내역으로 다시 분석해 주세요.",
  CATEGORY_UNAVAILABLE: "이 소비 영역은 현재 사용할 수 없어요. 새로운 분석에서 영역을 골라주세요.",
  NO_BASELINE_SPENDING: "이 기준월에는 목표의 기준이 될 소비가 없어요. 다른 기준월을 선택해 주세요.",
  UNRESOLVED_RECORDS: "이 기준월의 미분류 내역이나 상태를 먼저 정리해 주세요.",
  OPEN_GOAL_EXISTS: "이미 진행 중인 변화가 있어요. 현재 목표를 먼저 확인해 주세요.",
  NEXT_CYCLE_EXISTS: "이미 이어가는 Cycle이 있어요. 다음 목표에서 계속 확인할 수 있어요.",
  SOURCE_SCOPE_UNAVAILABLE: "대상 카드 정보를 확인할 수 있는 이용내역으로 기준 소비를 준비해 주세요.",
}[reason] ?? "기준 소비의 내역을 다시 확인해 주세요.");
