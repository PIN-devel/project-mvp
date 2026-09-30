import { delay, http, HttpResponse } from "msw";
import type { JsonBodyType } from "msw";
import { transactionResponse } from "./transactionResponse";
import { db, dbLedger, dbRuleEngine, dbUser, dbWashing } from "./db";
import { z } from "zod";
import { AnalyticsSnapshotSchema, renderEvidenceText } from "@/shared/model/analytics";
import type { AnalyticsQuery, AnalyticsSnapshot, AnalysisRun } from "@/shared/model/analytics";
import { MIN_ANALYSIS_TRANSACTION_COUNT } from "@/shared/model/analysisEligibility";
import type { GoalCreate, GoalPreparation, GoalView } from "@/features/goals/model/contract";

const IS_TEST = import.meta.env.MODE === "test";
let monthlyGoals: Array<{
  id: number;
  month: string;
  title: string;
  targetCategory: string;
  reductionRatio: number;
  baselineAmount: number;
  targetAmount: number;
  monthlySave: number;
  status: "active" | "completed" | "stopped";
  actualSaved: number | null;
  createdAt: string;
  updatedAt: string;
}> = [];
let nextMonthlyGoalId = 1;

export const resetMonthlyGoalsMock = () => {
  monthlyGoals = [];
  nextMonthlyGoalId = 1;
  analysisRuns.clear();
  goalCycles.clear();
  goalRequests.clear();
  evaluationRequests.clear();
};

// Single-user, in-memory local demo. Reloading resets runs/goals; no real AI is called.
const analysisRuns = new Map<string, AnalysisRun>();
const goalCycles = new Map<string, GoalView>();
const goalRequests = new Map<string, { payload: string; id: string }>();
const evaluationRequests = new Map<string, { payload: string; evaluation: GoalView["evaluations"][number] }>();
const mockToday = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });
const shiftMonth = (month: string, offset: number) => {
  const [year, value] = month.split("-").map(Number);
  return new Date(Date.UTC(year, value - 1 + offset, 1)).toISOString().slice(0, 7);
};
const nextDay = (day: string) => new Date(Date.parse(`${day}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10);
const earliestExecutionMonth = () => shiftMonth(mockToday().slice(0, 7), mockToday().endsWith("-01") ? 0 : 1);
const monthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);
const daySchema = z.string().refine((day) => {
  const date = new Date(`${day}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === day;
});
const querySchema = AnalyticsSnapshotSchema.shape.query.refine((query) =>
  (query.start === null && query.endExclusive === null) ||
  (daySchema.safeParse(query.start).success && daySchema.safeParse(query.endExclusive).success && query.start! < query.endExclusive!),
);
const createGoalSchema = z.object({
  analysisRunId: z.string(), opportunityId: z.string(), previousCycleId: z.string().nullable(),
  baselineMonth: monthSchema, executionMonth: monthSchema,
  targetAmount: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER), sourceConfirmed: z.boolean(),
  expectedSourceRevision: z.string(), expectedBaselineRevision: z.string(), idempotencyKey: z.string().min(1),
});
class MockCycleError extends Error {
  status: number;
  constructor(status: number, message: string) { super(message); this.status = status; }
}
const failCycle = (status: number, detail: string): never => { throw new MockCycleError(status, detail); };
async function cycleResponse<T extends JsonBodyType>(work: () => T | Promise<T>) {
  if (!IS_TEST) await delay(150);
  try { return HttpResponse.json(await work()); }
  catch (error) {
    if (!(error instanceof MockCycleError) && !(error instanceof z.ZodError) && !(error instanceof SyntaxError)) throw error;
    const status = error instanceof MockCycleError ? error.status : 400;
    return HttpResponse.json({ type: "about:blank", title: "Local mock request failed", status,
      detail: error instanceof MockCycleError ? error.message : "요청 값을 확인해 주세요." }, { status });
  }
}
// Revisions reflect the scoped foundation, so adding execution-month rows does not change a fixed baseline.
const mockRevision = (value: unknown) => {
  const text = JSON.stringify(value);
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 16777619);
  return `msw-${(hash >>> 0).toString(16)}`;
};
function analyticsSnapshot(input: AnalyticsQuery): AnalyticsSnapshot {
  const parsed = querySchema.parse(input);
  const query = { ...parsed, categoryIds: [...new Set(parsed.categoryIds)].sort((a, b) => a - b), cardNames: [...new Set(parsed.cardNames)].sort() };
  const stored = dbLedger.getAll().map((tx) => transactionResponse(tx)).filter((tx) =>
    !query.cardNames.length || query.cardNames.includes(tx.cardName),
  ).sort((a, b) => a.id - b.id);
  const dates = stored.map((tx) => tx.transactionDate).filter((day) => daySchema.safeParse(day).success).sort();
  const lastDay = dates.at(-1);
  let start = query.start ?? dates[0] ?? null;
  const endExclusive = query.endExclusive ?? (lastDay ? nextDay(lastDay) : null);
  if (!query.start && lastDay && query.period !== "ALL") {
    const month = shiftMonth(lastDay.slice(0, 7), query.period === "LAST_1_MONTH" ? -1 : -3);
    const maxDay = Number(new Date(Date.parse(`${shiftMonth(month, 1)}-01T00:00:00Z`) - 86_400_000).toISOString().slice(8, 10));
    start = nextDay(`${month}-${String(Math.min(Number(lastDay.slice(8)), maxDay)).padStart(2, "0")}`);
  }
  const period = { start, endExclusive };
  const sourceScope: AnalyticsSnapshot["sourceScope"] = { kind: query.cardNames.length ? "SELECTED_CARDS" : "ALL_CARDS",
    cardNames: query.cardNames.length ? query.cardNames : [...new Set(stored.map((tx) => tx.cardName))].sort() };
  const scoped = stored.filter((tx) => !daySchema.safeParse(tx.transactionDate).success ||
    ((!start || tx.transactionDate >= start) && (!endExclusive || tx.transactionDate < endExclusive)));
  const selected = scoped.filter((tx) => !query.categoryIds.length || (tx.foundation!.categoryId !== null && query.categoryIds.includes(tx.foundation!.categoryId)));
  const records: AnalyticsSnapshot["records"] = selected.filter((tx) => tx.foundation!.spendingEligible).map((tx) => {
    const foundation = tx.foundation!;
    return { foundation, cardName: tx.cardName, categoryKey: foundation.classification === "CLASSIFIED" ? `id:${foundation.categoryId}` : foundation.classification.toLowerCase() };
  }).sort((a, b) => a.foundation.occurredOn!.localeCompare(b.foundation.occurredOn!) || a.foundation.transactionId! - b.foundation.transactionId!);
  type Rows = typeof records;
  const sum = (rows: Rows) => {
    const total = rows.reduce((amount, row) => amount + row.foundation.amount!, 0);
    if (!Number.isSafeInteger(total)) failCycle(400, "집계 가능한 금액 범위를 넘었어요.");
    return total;
  };
  const ids = (rows: Rows) => rows.map((row) => row.foundation.transactionId!);
  const totalAmount = sum(records);
  const share = (value: number, total: number) => total ? Math.round(value / total * 1000) / 10 : 0;
  function groupRows(key: (row: Rows[number]) => string) {
    const groups = new Map<string, Rows>();
    records.forEach((row) => { const k = key(row); groups.set(k, [...(groups.get(k) ?? []), row]); });
    return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
  }
  function aggregates(merchant: boolean): AnalyticsSnapshot["categories"] {
    return groupRows((r) => merchant ? JSON.stringify([r.categoryKey, r.foundation.merchantRawName]) : r.categoryKey).map(([key, rows]) => {
      const f = rows[0].foundation;
      const classified = f.classification === "CLASSIFIED";
      return { key, categoryId: classified ? f.categoryId : null, categoryLabel: classified ? f.categoryLabel! : f.classification === "UNCLASSIFIED" ? "미분류" : "분류 확인 필요",
        merchantRawName: merchant ? f.merchantRawName : null, amount: sum(rows), count: rows.length,
        amountShare: share(sum(rows), totalAmount), countShare: share(rows.length, records.length), transactionIds: ids(rows) };
    }).sort((a, b) => b.amount - a.amount || a.key.localeCompare(b.key));
  }
  const categories = aggregates(false), merchants = aggregates(true);
  const timeUnit = start && endExclusive && (Date.parse(endExclusive) - Date.parse(start)) / 86_400_000 > 93 ? "month" : "day";
  const timeBuckets = groupRows((r) => r.foundation.occurredOn!.slice(0, timeUnit === "month" ? 7 : 10)).map(([date, rows]) => {
    const categoryAmounts: Record<string, number> = {};
    rows.forEach((r) => { categoryAmounts[r.categoryKey] = (categoryAmounts[r.categoryKey] ?? 0) + r.foundation.amount!; });
    return { date, amount: sum(rows), count: rows.length, transactionIds: ids(rows), categoryAmounts };
  });
  const exclusionReasons: Record<string, number> = {};
  selected.forEach((tx) => tx.foundation!.spendingExclusionReasons.forEach((reason) => { exclusionReasons[reason] = (exclusionReasons[reason] ?? 0) + 1; }));
  const unclassified = records.filter((r) => r.foundation.classification === "UNCLASSIFIED");
  const inconsistent = records.filter((r) => r.foundation.classification === "INCONSISTENT");
  const quality: AnalyticsSnapshot["quality"] = {
    sourceTransactionCount: scoped.length, selectedTransactionCount: selected.length, excludedCount: selected.length - records.length,
    exclusionReasons, unclassifiedCount: unclassified.length, unclassifiedAmount: sum(unclassified), inconsistentCount: inconsistent.length, inconsistentAmount: sum(inconsistent),
    sourceUnclassifiedCount: scoped.filter((tx) => tx.foundation!.spendingEligible && tx.foundation!.classification === "UNCLASSIFIED").length,
    sourceInconsistentCount: scoped.filter((tx) => tx.foundation!.spendingEligible && tx.foundation!.classification === "INCONSISTENT").length,
    unresolvedSourceCount: scoped.filter((tx) => tx.foundation!.spendingExclusionReasons.some((reason) => ["UNKNOWN_STATUS", "INVALID_DATE", "INVALID_AMOUNT"].includes(reason))).length,
    coverage: "UNKNOWN", comparability: "NOT_CONFIRMED", limitations: ["MSW 로컬 샘플 내역입니다. 실제 AI 분석이나 절감 실적이 아닙니다.", "카드 자료의 기간 완결성은 확인되지 않았습니다.", "거래가 없는 구간은 소비 0원으로 해석하지 않습니다."],
  };
  const evidence: AnalyticsSnapshot["evidence"] = [];
  const addEvidence = (id: string, metric: string, value: number, unit: "KRW" | "COUNT" | "PERCENT", scopeKey: string, transactionIds: number[], aggregate?: AnalyticsSnapshot["categories"][number]) => {
    evidence.push({ id, metric, value, unit, denominator: unit === "PERCENT" ? totalAmount : null, period, sourceScope, scopeKey,
      categoryId: aggregate?.categoryId ?? null, categoryLabel: aggregate?.categoryLabel ?? null, merchantRawName: aggregate?.merchantRawName ?? null, transactionIds });
  };
  addEvidence("total.amount", "TOTAL_AMOUNT", totalAmount, "KRW", "ALL", ids(records));
  addEvidence("total.count", "TRANSACTION_COUNT", records.length, "COUNT", "ALL", ids(records));
  const refs = (prefix: string, key: string) => ["amount", "count", "share"].map((metric) => `${prefix}.${key}.${metric}`);
  for (const [prefix, groups] of [["category", categories], ["merchant", merchants]] as const) {
    groups.forEach((a) => {
      const [amount, count, shareId] = refs(prefix, a.key);
      addEvidence(amount, `${prefix.toUpperCase()}_AMOUNT`, a.amount, "KRW", a.key, a.transactionIds, a);
      addEvidence(count, `${prefix.toUpperCase()}_COUNT`, a.count, "COUNT", a.key, a.transactionIds, a);
      addEvidence(shareId, `${prefix.toUpperCase()}_SHARE`, a.amountShare, "PERCENT", a.key, a.transactionIds, a);
    });
  }
  timeBuckets.forEach((bucket) => addEvidence(`time.${bucket.date}`, "TIME_AMOUNT", bucket.amount, "KRW", bucket.date, bucket.transactionIds));
  const observations: AnalyticsSnapshot["observations"] = categories.slice(0, 5).map((c) => ({ id: `obs.category.${c.key}`, kind: "CATEGORY_DISTRIBUTION", scopeKey: c.key, categoryId: c.categoryId, evidenceIds: refs("category", c.key) }));
  return { query, period, sourceScope, basisVersion: "spending-v1", dataRevision: mockRevision([query, period, sourceScope, (query.start ? scoped : stored).map((tx) => [tx.foundation, tx.cardName])]),
    totalAmount, transactionCount: records.length, records, categories, merchants, timeUnit, timeBuckets, quality, evidence, observations };
}
const hasSourceRisk = (s: AnalyticsSnapshot) => s.quality.sourceUnclassifiedCount + s.quality.sourceInconsistentCount + s.quality.unresolvedSourceCount > 0;
const findRun = (id: string) => analysisRuns.get(id) ?? failCycle(404, "저장된 분석을 찾을 수 없어요. 다시 분석해 주세요.");
const findGoal = (id: string) => goalCycles.get(id) ?? failCycle(404, "목표를 찾을 수 없어요.");
const runResponse = (run: AnalysisRun | null) => {
  const currentDataRevision = run ? analyticsSnapshot(run.snapshot.query).dataRevision : null;
  return { run, currentDataRevision, stale: Boolean(run && currentDataRevision !== run.snapshot.dataRevision) };
};
function goalPreparation(runId: string, opportunityId: string, previousId: string | null, month: string | null): GoalPreparation {
  const previous = previousId ? findGoal(previousId) : null;
  if (previous?.cycle.lifecycle === "OPEN") failCycle(409, "진행 중인 목표를 먼저 확인해 주세요.");
  const run = findRun(previous?.cycle.analysisRunId ?? runId);
  const opportunity = run.opportunities.find((o) => o.id === (previous?.cycle.opportunityId ?? opportunityId)) ?? failCycle(404, "변화 후보를 찾을 수 없어요.");
  const cardNames = previous?.cycle.baseline.snapshot.sourceScope.cardNames ?? run.snapshot.sourceScope.cardNames;
  const query: AnalyticsQuery = { period: "ALL", start: null, endExclusive: null, categoryIds: [opportunity.categoryId], cardNames };
  const source = analyticsSnapshot(query);
  const availableBaselineMonths = [...new Set(source.records.map((r) => r.foundation.occurredOn!.slice(0, 7)))].filter((m) => m < mockToday().slice(0, 7)).sort().reverse();
  const baselineMonth = monthSchema.parse(month ?? availableBaselineMonths[0] ?? shiftMonth(mockToday().slice(0, 7), -1));
  if (baselineMonth >= mockToday().slice(0, 7)) failCycle(400, "완료된 달을 기준월로 선택해 주세요.");
  const baselineSnapshot = analyticsSnapshot({ ...query, start: `${baselineMonth}-01`, endExclusive: `${shiftMonth(baselineMonth, 1)}-01` });
  const reasons: string[] = [];
  if (!cardNames.length || cardNames.some((card) => !card.trim())) reasons.push("SOURCE_SCOPE_UNAVAILABLE");
  if (!previous && runResponse(run).stale) reasons.push("STALE_OPPORTUNITY");
  if (!dbLedger.getCategories().some((c) => c.id === opportunity.categoryId)) reasons.push("CATEGORY_UNAVAILABLE");
  if (!baselineSnapshot.totalAmount) reasons.push("NO_BASELINE_SPENDING");
  if (hasSourceRisk(baselineSnapshot)) reasons.push("UNRESOLVED_RECORDS");
  if ([...goalCycles.values()].some((g) => g.cycle.lifecycle === "OPEN")) reasons.push("OPEN_GOAL_EXISTS");
  if (previous?.nextCycleId) reasons.push("NEXT_CYCLE_EXISTS");
  return { analysisRunId: run.id, opportunityId: opportunity.id, previousCycleId: previousId, categoryId: opportunity.categoryId,
    categoryLabel: opportunity.categoryLabelSnapshot, rationale: renderEvidenceText(opportunity.rationale, run.snapshot), evidenceIds: opportunity.evidenceIds,
    sourceDataRevision: run.snapshot.dataRevision, baselineMonth, availableBaselineMonths, earliestExecutionMonth: earliestExecutionMonth(), baselineSnapshot, canCreate: !reasons.length, reasons };
}
function goalView(id: string): GoalView {
  const goal = findGoal(id), cycle = goal.cycle, today = mockToday();
  const started = today >= cycle.start, ended = today >= cycle.endExclusive;
  const snapshot = analyticsSnapshot({ ...cycle.baseline.snapshot.query, start: cycle.start, endExclusive: !started || ended ? cycle.endExclusive : nextDay(today) });
  const baselineChanged = analyticsSnapshot(cycle.baseline.snapshot.query).dataRevision !== cycle.baseline.snapshot.dataRevision;
  const actualAmount = started && snapshot.quality.sourceTransactionCount > 0 ? snapshot.totalAmount : null;
  const latest = goal.evaluations[0];
  return { ...goal, tracking: { snapshot, actualAmount, observedChange: actualAmount === null ? null : cycle.baseline.snapshot.totalAmount - actualAmount,
    baselineChanged, sourceRisk: hasSourceRisk(snapshot) || !dbLedger.getCategories().some((c) => c.id === cycle.categoryId),
    resultChanged: Boolean(latest && (latest.snapshot.dataRevision !== snapshot.dataRevision || latest.baselineChanged !== baselineChanged)),
    phase: cycle.lifecycle === "OPEN" ? ended ? "READY_TO_REVIEW" : "ACTIVE" : "RESULT" } };
}

export const handlers = [
  http.get("/api/v2/analytics", ({ request }) => cycleResponse(() => {
    const p = new URL(request.url).searchParams;
    return { snapshot: analyticsSnapshot({ period: (p.get("period") ?? "ALL") as AnalyticsQuery["period"], start: p.get("start"), endExclusive: p.get("endExclusive"), categoryIds: p.getAll("categoryIds").map(Number), cardNames: p.getAll("cardNames") }) };
  })),
  http.get("/api/v2/analyses", () => cycleResponse(() => runResponse([...analysisRuns.values()].at(-1) ?? null))),
  http.get("/api/v2/analyses/:id", ({ params }) => cycleResponse(() => runResponse(findRun(String(params.id))))),
  http.post("/api/v2/analyses", ({ request }) => cycleResponse(async () => {
    const body = z.object({ ...AnalyticsSnapshotSchema.shape.query.shape, expectedDataRevision: z.string() }).parse(await request.json());
    const snapshot = analyticsSnapshot(body);
    if (snapshot.dataRevision !== body.expectedDataRevision) failCycle(409, "이용내역이 바뀌었어요. 다시 분석해 주세요.");
    const eligible = snapshot.transactionCount >= MIN_ANALYSIS_TRANSACTION_COUNT;
    const findings: AnalysisRun["findings"] = eligible ? snapshot.observations.slice(0, 3).map((o, i) => ({
      id: `finding-${i}`, observationId: o.id, evidenceIds: o.evidenceIds,
      interpretation: `[MSW 샘플 해석] ${snapshot.categories.find((c) => c.key === o.scopeKey)!.categoryLabel} 소비는 {{${o.evidenceIds[0]}}}, 전체 소비의 {{${o.evidenceIds[2]}}}입니다.`,
      importance: i === 0 ? "HIGH" : "MEDIUM", limitations: ["로컬 흐름 확인용 규칙 기반 해석이며 실제 AI 결과가 아닙니다."],
    })) : [];
    const opportunities: AnalysisRun["opportunities"] = findings.flatMap((f) => {
      const observation = snapshot.observations.find((o) => o.id === f.observationId)!;
      if (observation.categoryId === null) return [];
      const category = snapshot.categories.find((c) => c.categoryId === observation.categoryId)!;
      return [{ id: `opportunity-${category.categoryId}`, categoryId: category.categoryId!, categoryLabelSnapshot: category.categoryLabel,
        evidenceIds: f.evidenceIds, findingIds: [f.id], direction: "REDUCE_SPENDING" as const,
        rationale: `[MSW 샘플 제안] ${category.categoryLabel}의 관측 소비 {{${f.evidenceIds[0]}}}를 확인하고 소비 상한을 직접 정해 보세요.`,
        goalEligibility: { status: hasSourceRisk(snapshot) ? "BLOCKED" as const : "REQUIRES_CONFIRMATION" as const, reasons: hasSourceRisk(snapshot) ? ["UNRESOLVED_RECORDS"] : [] } }];
    });
    const run: AnalysisRun = { id: crypto.randomUUID(), snapshot, status: eligible ? "SUCCEEDED" : "INSUFFICIENT_DATA", failureCode: null,
      findings, opportunities, generatedAt: new Date().toISOString(), schemaVersion: "analysis-v1", promptVersion: "msw-demo-v1", modelVersion: "msw-rule-based" };
    analysisRuns.set(run.id, run);
    return runResponse(run);
  })),
  http.get("/api/v2/analyses/:id/opportunities/:opportunityId", ({ params }) => cycleResponse(() => {
    const run = findRun(String(params.id));
    const o = run.opportunities.find((o) => o.id === params.opportunityId) ?? failCycle(404, "변화 후보를 찾을 수 없어요.");
    const current = runResponse(run), s = run.snapshot, category = s.categories.find((c) => c.categoryId === o.categoryId)!;
    return { handoff: { analysisRunId: run.id, opportunityId: o.id, sourceDataRevision: s.dataRevision, currentDataRevision: current.currentDataRevision!, stale: current.stale,
      scope: "CATEGORY", categoryId: o.categoryId, categoryLabelSnapshot: o.categoryLabelSnapshot, evidenceIds: o.evidenceIds, direction: o.direction, rationale: o.rationale, goalEligibility: o.goalEligibility,
      baselineProposal: { period: s.period, sourceScope: s.sourceScope, basisVersion: s.basisVersion, dataRevision: s.dataRevision, amount: category.amount, count: category.count, status: "CLOSED_MONTH_SELECTION_REQUIRED" } } };
  })),
  http.get("/api/v2/goal-cycles/prepare", ({ request }) => cycleResponse(() => {
    const p = new URL(request.url).searchParams;
    return { preparation: goalPreparation(p.get("analysisRunId") ?? "", p.get("opportunityId") ?? "", null, p.get("baselineMonth")) };
  })),
  http.get("/api/v2/goal-cycles/:id/prepare-next", ({ params, request }) => cycleResponse(() => ({ preparation: goalPreparation("", "", String(params.id), new URL(request.url).searchParams.get("baselineMonth")) }))),
  http.get("/api/v2/goal-cycles", () => cycleResponse(() => [...goalCycles.values()].reverse().map(({ cycle: c }) => ({ id: c.id, categoryLabel: c.categoryLabelSnapshot, lifecycle: c.lifecycle, start: c.start, endExclusive: c.endExclusive, baselineAmount: c.baseline.snapshot.totalAmount, targetAmount: c.targetAmount, previousCycleId: c.previousCycleId })))),
  http.get("/api/v2/goal-cycles/:id", ({ params }) => cycleResponse(() => ({ goal: goalView(String(params.id)) }))),
  http.post("/api/v2/goal-cycles", ({ request }) => cycleResponse(async () => {
    const body: GoalCreate = createGoalSchema.parse(await request.json());
    const duplicate = goalRequests.get(body.idempotencyKey);
    if (duplicate) {
      if (duplicate.payload !== JSON.stringify(body)) failCycle(409, "같은 요청 키의 목표 값이 달라요.");
      return { goal: goalView(duplicate.id) };
    }
    const p = goalPreparation(body.analysisRunId, body.opportunityId, body.previousCycleId, body.baselineMonth);
    if (p.sourceDataRevision !== body.expectedSourceRevision || p.baselineSnapshot.dataRevision !== body.expectedBaselineRevision || p.reasons.includes("STALE_OPPORTUNITY")) failCycle(409, "기준 내역이 바뀌었어요. 다시 확인해 주세요.");
    if (!p.canCreate || !body.sourceConfirmed) failCycle(409, "기준월의 대상 내역과 진행 중인 목표를 확인해 주세요.");
    if (body.targetAmount >= p.baselineSnapshot.totalAmount || body.executionMonth < p.earliestExecutionMonth) failCycle(400, "소비 상한과 실행월을 확인해 주세요.");
    const now = new Date().toISOString(), id = crypto.randomUUID();
    const cycle: GoalView["cycle"] = { id, analysisRunId: p.analysisRunId, opportunityId: p.opportunityId, categoryId: p.categoryId, categoryLabelSnapshot: p.categoryLabel, rationale: p.rationale, evidenceIds: p.evidenceIds,
      baseline: { snapshot: p.baselineSnapshot, confirmedAt: now, confirmationKind: "USER_CONFIRMED" }, targetAmount: body.targetAmount,
      start: `${body.executionMonth}-01`, endExclusive: `${shiftMonth(body.executionMonth, 1)}-01`, lifecycle: "OPEN", previousCycleId: body.previousCycleId, createdAt: now };
    goalCycles.set(id, { cycle, evaluations: [], nextCycleId: null, tracking: { snapshot: p.baselineSnapshot, actualAmount: null, observedChange: null, baselineChanged: false, sourceRisk: false, resultChanged: false, phase: "ACTIVE" } });
    if (body.previousCycleId) findGoal(body.previousCycleId).nextCycleId = id;
    goalRequests.set(body.idempotencyKey, { payload: JSON.stringify(body), id });
    return { goal: goalView(id) };
  })),
  http.post("/api/v2/goal-cycles/:id/evaluations", ({ params, request }) => cycleResponse(async () => {
    const id = String(params.id);
    const body = z.object({ expectedDataRevision: z.string(), sourceConfirmed: z.boolean(), idempotencyKey: z.string().min(1) }).parse(await request.json());
    const payload = JSON.stringify([id, body]), duplicate = evaluationRequests.get(body.idempotencyKey);
    if (duplicate) {
      if (duplicate.payload !== payload) failCycle(409, "같은 요청 키의 확인 값이 달라요.");
      return { evaluation: duplicate.evaluation };
    }
    const view = goalView(id), t = view.tracking, c = view.cycle;
    if (c.lifecycle === "STOPPED" || mockToday() < c.endExclusive) failCycle(409, "실행월이 끝난 후 결과를 확인할 수 있어요.");
    if (t.snapshot.dataRevision !== body.expectedDataRevision) failCycle(409, "새 이용내역을 다시 확인해 주세요.");
    const actualAmount = body.sourceConfirmed ? t.snapshot.totalAmount : t.actualAmount;
    const determined = body.sourceConfirmed && !t.sourceRisk && !t.baselineChanged;
    const now = new Date().toISOString();
    const evaluation: GoalView["evaluations"][number] = { id: crypto.randomUUID(), goalId: id, snapshot: t.snapshot, actualAmount,
      observedChange: actualAmount === null ? null : c.baseline.snapshot.totalAmount - actualAmount, outcome: determined ? t.snapshot.totalAmount <= c.targetAmount ? "MET" : "NOT_MET" : "UNDETERMINED",
      sourceConfirmed: body.sourceConfirmed, confirmedAt: body.sourceConfirmed ? now : null, baselineChanged: t.baselineChanged, evaluatedAt: now };
    findGoal(id).evaluations.unshift(evaluation);
    findGoal(id).cycle = { ...c, lifecycle: "REVIEWED" };
    evaluationRequests.set(body.idempotencyKey, { payload, evaluation });
    return { evaluation };
  })),
  http.post("/api/v2/goal-cycles/:id/stop", ({ params }) => cycleResponse(() => {
    const goal = findGoal(String(params.id));
    if (goal.cycle.lifecycle === "REVIEWED") failCycle(409, "이미 결과를 확인한 목표예요.");
    goal.cycle = { ...goal.cycle, lifecycle: "STOPPED" };
    return { goal: goalView(goal.cycle.id) };
  })),
  http.get("/api/sample", async () => {
    if (!IS_TEST) await delay();
    return HttpResponse.json(db.getAll());
  }),

  http.get("/api/sample/error", async () => {
    if (!IS_TEST) await delay();
    return HttpResponse.json(
      {
        type: "about:blank",
        title: "Bad Request",
        status: 400,
        detail: "강제로 발생시키는 비즈니스 예외 테스트입니다.",
        instance: "/api/sample/error",
        errorCode: "SAMPLE_LIMIT_EXCEEDED",
      },
      { status: 400 },
    );
  }),

  http.get("/api/sample/:id", async ({ params }) => {
    if (!IS_TEST) await delay();
    const id = Number(params.id);
    const sample = db.getById(id);
    if (!sample) {
      return new HttpResponse(null, { status: 404 });
    }
    return HttpResponse.json(sample);
  }),

  http.post("/api/sample", async ({ request }) => {
    if (!IS_TEST) await delay();
    const data = (await request.json()) as Record<string, unknown>;
    const newSample = db.create({ message: data.message as string });
    return HttpResponse.json(newSample, { status: 201 });
  }),

  http.put("/api/sample/:id", async ({ params, request }) => {
    if (!IS_TEST) await delay();
    const id = Number(params.id);
    const data = (await request.json()) as Record<string, unknown>;
    const updated = db.update(id, { message: data.message as string });

    if (!updated) {
      return new HttpResponse(null, { status: 404 });
    }

    return HttpResponse.json(updated);
  }),

  http.patch("/api/sample/:id", async ({ params, request }) => {
    if (!IS_TEST) await delay();
    const id = Number(params.id);
    const data = (await request.json()) as Record<string, unknown>;
    const updated = db.patch(id, data);

    if (!updated) {
      return new HttpResponse(null, { status: 404 });
    }

    return HttpResponse.json(updated);
  }),

  http.delete("/api/sample/:id", async ({ params }) => {
    if (!IS_TEST) await delay();
    const id = Number(params.id);
    const success = db.delete(id);

    if (!success) {
      return new HttpResponse(null, { status: 404 });
    }

    return new HttpResponse(null, { status: 204 });
  }),

  http.get("/api/transactions/overview", async () => {
    if (!IS_TEST) await delay();
    return HttpResponse.json(dbWashing.getOverview());
  }),

  http.post("/api/transactions/bulk-classify", async ({ request }) => {
    if (!IS_TEST) await delay();
    const body = (await request.json()) as {
      ids?: number[];
      category?: string;
    };

    if (!body.category || !Array.isArray(body.ids) || body.ids.length === 0) {
      return HttpResponse.json(
        {
          type: "about:blank",
          title: "Bad Request",
          status: 400,
          detail: "분류할 내역과 카테고리를 선택해 주세요.",
          instance: "/api/transactions/bulk-classify",
          errorCode: "WASH001",
        },
        { status: 400 },
      );
    }

    const overview = dbWashing.bulkClassify(body.ids, body.category);

    const matchedLedgerCategory = dbLedger.getCategories().find(
      (c) => c.name === body.category,
    );
    overview.transactions
      .filter((tx) => body.ids!.includes(tx.id) && tx.ledgerId != null)
      .forEach((tx) => {
        dbLedger.update(tx.ledgerId!, {
          categoryId: matchedLedgerCategory?.id ?? null,
          categoryName: body.category,
        });
      });

    return HttpResponse.json(overview);
  }),

  http.patch(
    "/api/transactions/:id/category",
    async ({ params, request }) => {
      if (!IS_TEST) await delay();
      const id = Number(params.id);
      const body = (await request.json()) as {
        category?: string | null;
        categoryId?: number | null;
      };
      const matchedCategory =
        body.categoryId == null
          ? null
          : dbLedger.getCategories().find((category) => category.id === body.categoryId) ?? null;
      const nextCategory = body.category ?? matchedCategory?.name ?? null;
      const updated = dbLedger.update(id, {
        categoryId: body.categoryId ?? null,
        categoryName: nextCategory,
        isClassified: body.categoryId != null,
        appliedRuleId: null,
      });

      if (!updated) {
        return new HttpResponse(null, { status: 404 });
      }

      return HttpResponse.json(transactionResponse(updated));
    },
  ),

  http.patch("/api/transactions/:id/tag", async ({ params, request }) => {
    if (!IS_TEST) await delay();
    const id = Number(params.id);
    const body = (await request.json()) as { tag?: string | null };
    const normalizedTag =
      body.tag && body.tag.trim()
        ? body.tag.trim().startsWith("#")
          ? body.tag.trim()
          : `#${body.tag.trim()}`
        : null;
    const updated = dbLedger.update(id, { tag: normalizedTag });

    if (!updated) {
      return new HttpResponse(null, { status: 404 });
    }

    return HttpResponse.json(transactionResponse(updated));
  }),

  http.post("/api/transactions/import-mock", async () => {
    if (!IS_TEST) await delay();
    const today = new Date().toISOString().slice(0, 10);
    const mockItems: Omit<import("./db").LedgerTransaction, "id">[] = [
      {
        userId: 1, transactionDate: today,
        merchant: "메가MGC커피", categoryId: null, categoryName: null,
        amount: 3900, cardName: "현대 Zero", installment: 1, status: "승인",
        memo: "출근길 커피",
      },
      {
        userId: 1, transactionDate: today,
        merchant: "오늘의집", categoryId: null, categoryName: null,
        amount: 78200, cardName: "토스뱅크", installment: 1, status: "승인",
        memo: "소형 가구 결제",
      },
    ];
    const added = dbLedger.bulkAdd(mockItems);
    added.forEach((tx) => dbWashing.addFromLedger(tx));
    return HttpResponse.json(dbWashing.getOverview(), { status: 201 });
  }),

  http.get("/api/transactions", async () => {
    if (!IS_TEST) await delay();
    return HttpResponse.json(dbLedger.getAll().map((tx) => transactionResponse(tx)));
  }),

  http.post("/api/transactions/reset", async () => {
    if (!IS_TEST) await delay();
    return HttpResponse.json(dbLedger.reset().map((tx) => transactionResponse(tx)));
  }),

  http.get("/api/transactions/:id", async ({ params }) => {
    if (!IS_TEST) await delay();
    const id = Number(params.id);
    const tx = dbLedger.getById(id);
    if (!tx) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json(transactionResponse(tx));
  }),

  http.delete("/api/transactions/:id", async ({ params }) => {
    if (!IS_TEST) await delay();
    const id = Number(params.id);
    const success = dbLedger.delete(id);
    if (!success) return new HttpResponse(null, { status: 404 });
    return new HttpResponse(null, { status: 204 });
  }),

  http.put("/api/transactions/:id", async ({ params, request }) => {
    if (!IS_TEST) await delay();
    const id = Number(params.id);
    const body = (await request.json()) as Record<string, unknown>;
    const updated = dbLedger.update(id, body as Parameters<typeof dbLedger.update>[1]);
    if (!updated) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json(transactionResponse(updated));
  }),

  http.get("/api/categories", async () => {
    if (!IS_TEST) await delay();
    return HttpResponse.json(dbLedger.getCategories());
  }),

  http.get("/api/monthly-goals", async () => {
    if (!IS_TEST) await delay();
    return HttpResponse.json(monthlyGoals);
  }),

  http.put("/api/monthly-goals/:month", async ({ params, request }) => {
    if (!IS_TEST) await delay();
    const body = (await request.json()) as {
      title: string;
      targetCategory: string;
      reductionRatio: number;
      baselineAmount: number;
      monthlySave: number;
    };
    const month = String(params.month);
    const now = new Date().toISOString();
    const goal = {
      id: monthlyGoals.find((item) => item.month === month)?.id ?? nextMonthlyGoalId++,
      month,
      ...body,
      targetAmount: body.baselineAmount - body.monthlySave,
      status: "active" as const,
      actualSaved: null,
      createdAt: now,
      updatedAt: now,
    };
    monthlyGoals = [...monthlyGoals.filter((item) => item.month !== month), goal];
    return HttpResponse.json(goal);
  }),

  http.patch("/api/monthly-goals/:id/status", async ({ params, request }) => {
    if (!IS_TEST) await delay();
    const body = (await request.json()) as {
      status: "active" | "completed" | "stopped";
      actualSaved?: number;
    };
    const id = Number(params.id);
    const current = monthlyGoals.find((goal) => goal.id === id);
    if (!current) return new HttpResponse(null, { status: 404 });
    const updated = {
      ...current,
      status: body.status,
      actualSaved: body.status === "completed" ? body.actualSaved ?? current.monthlySave : null,
      updatedAt: new Date().toISOString(),
    };
    monthlyGoals = monthlyGoals.map((goal) => (goal.id === id ? updated : goal));
    return HttpResponse.json(updated);
  }),

  http.post("/api/insights", async ({ request }) => {
    if (!IS_TEST) await delay();
    const body = (await request.json()) as {
      period?: string;
      categoryId?: number | null;
      transactions?: Array<{
        merchant?: string;
        categoryName?: string | null;
        amount?: number;
        isClassified?: boolean;
      }>;
    };

    if (!body.period || !Array.isArray(body.transactions)) {
      return HttpResponse.json(
        {
          type: "about:blank",
          title: "Bad Request",
          status: 400,
          detail: "잘못된 입력값입니다.",
          errors: {
            period: body.period ? undefined : "분석 기간을 선택해주세요.",
            transactions: Array.isArray(body.transactions)
              ? undefined
              : "분석할 거래 내역을 한 건 이상 입력해주세요.",
          },
        },
        { status: 400 },
      );
    }

    if (body.transactions.length === 0) {
      return HttpResponse.json(
        {
          type: "about:blank",
          title: "Bad Request",
          status: 400,
          detail: "잘못된 입력값입니다.",
          errors: {
            transactions: "분석할 거래 내역을 한 건 이상 입력해주세요.",
          },
        },
        { status: 400 },
      );
    }

    const totalAmount = body.transactions.reduce(
      (sum, transaction) => sum + (transaction.amount ?? 0),
      0,
    );
    const unclassifiedCount = body.transactions.filter(
      (transaction) => transaction.isClassified === false,
    ).length;
    const categoryAmounts = new Map<string, number>();
    body.transactions.forEach((transaction) => {
      const categoryName = transaction.categoryName || "미분류";
      categoryAmounts.set(
        categoryName,
        (categoryAmounts.get(categoryName) ?? 0) + (transaction.amount ?? 0),
      );
    });
    const topCategory =
      [...categoryAmounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ??
      "미분류";

    return HttpResponse.json({
      summary: `선택한 조건의 ${body.transactions.length}건 거래를 분석했습니다. 총 ${totalAmount.toLocaleString()}원 중 ${topCategory} 영역의 비중이 가장 높고, 미분류 ${unclassifiedCount}건은 추가 정리 후 다시 분석하면 더 정확합니다.`,
      cards: [
        {
          title: "가장 큰 지출 영역",
          description: `${topCategory} 지출이 가장 크게 나타났습니다. 이번 달 절감 목표 후보로 우선 검토할 수 있습니다.`,
        },
        {
          title: "반복 소비 패턴",
          description:
            "같은 가맹점 또는 같은 카테고리의 반복 결제가 있어 정기 지출 여부를 확인해 볼 수 있습니다.",
        },
        {
          title: "소비 점검 포인트",
          description:
            "미분류 거래를 먼저 정리한 뒤 다시 요청하면 목표 추천과 절감 추이의 신뢰도가 올라갑니다.",
        },
      ],
      generatedAt: new Date().toISOString(),
    });
  }),

  http.post("/api/categories", async ({ request }) => {
    if (!IS_TEST) await delay();
    const body = (await request.json()) as { name?: string; color?: string };

    if (!body.name || !body.color) {
      return HttpResponse.json(
        {
          type: "about:blank",
          title: "Bad Request",
          status: 400,
          detail: "카테고리명과 색상은 필수입니다.",
          instance: "/api/categories",
          errorCode: "CAT001",
        },
        { status: 400 },
      );
    }

    const exists = dbLedger
      .getCategories()
      .some((category) => category.name === body.name);
    if (exists) {
      return HttpResponse.json(
        {
          type: "about:blank",
          title: "Bad Request",
          status: 400,
          detail: "이미 존재하는 카테고리명입니다.",
          instance: "/api/categories",
          errorCode: "CAT002",
        },
        { status: 400 },
      );
    }

    const created = dbLedger.createCategory({
      name: body.name,
      color: body.color,
    });
    return HttpResponse.json(created, { status: 201 });
  }),

  http.delete("/api/categories/:id", async ({ params }) => {
    if (!IS_TEST) await delay();
    const success = dbLedger.deleteCategory(Number(params.id));
    if (!success) return new HttpResponse(null, { status: 404 });
    return new HttpResponse(null, { status: 204 });
  }),

  http.get("/api/rules", async () => {
    if (!IS_TEST) await delay();
    return HttpResponse.json(dbRuleEngine.getAll());
  }),

  http.get("/api/rules/patterns", async () => {
    if (!IS_TEST) await delay();
    return HttpResponse.json(dbRuleEngine.getPatterns());
  }),

  http.post("/api/rules/dry-run", async ({ request }) => {
    if (!IS_TEST) await delay();
    const body = (await request.json()) as {
      keyword?: string;
      categoryId?: number;
    };
    return HttpResponse.json(
      dbRuleEngine.dryRun({
        keyword: body.keyword ?? "",
        categoryId: body.categoryId ?? 0,
      }),
    );
  }),

  http.post("/api/rules", async ({ request }) => {
    if (!IS_TEST) await delay();
    const body = (await request.json()) as {
      keyword?: string;
      categoryId?: number;
      tag?: string;
    };

    if (!body.keyword || body.categoryId == null) {
      return HttpResponse.json(
        {
          type: "about:blank",
          title: "Bad Request",
          status: 400,
          detail: "규칙 키워드와 카테고리 ID가 필요합니다.",
          instance: "/api/rules",
          errorCode: "RUL003",
        },
        { status: 400 },
      );
    }

    const success = dbRuleEngine.create({
      keyword: body.keyword,
      categoryId: body.categoryId,
      tag: body.tag,
    });
    if (!success) {
      return HttpResponse.json(
        {
          type: "urn:cop:kbds:agilemvp:error:RUL004",
          title: "INVALID_CATEGORY",
          status: 400,
          detail: "카테고리가 유효하지 않습니다.",
          instance: "/api/rules",
        },
        { status: 400 },
      );
    }

    return new HttpResponse(null, { status: 201 });
  }),

  http.delete("/api/rules/:id", async ({ params }) => {
    if (!IS_TEST) await delay();
    const success = dbRuleEngine.delete(Number(params.id));
    if (!success) return new HttpResponse(null, { status: 404 });
    return new HttpResponse(null, { status: 204 });
  }),

  http.post("/api/excel/upload", async () => {
    if (!IS_TEST) await delay();
    const parsed: Omit<import("./db").LedgerTransaction, "id">[] = [
      {
        userId: 1, transactionDate: "2026-06-10",
        merchant: "GS25 강남점", categoryId: null, categoryName: null,
        amount: 4200, cardName: "신한 Deep", installment: 1, status: "승인",
        memo: "편의점",
      },
      {
        userId: 1, transactionDate: "2026-06-10",
        merchant: "CGV 강남", categoryId: null, categoryName: null,
        amount: 15000, cardName: "현대 Zero", installment: 1, status: "승인",
        memo: "영화 관람",
      },
      {
        userId: 1, transactionDate: "2026-06-11",
        merchant: "이마트 역삼점", categoryId: null, categoryName: null,
        amount: 67800, cardName: "삼성 taptap", installment: 1, status: "승인",
        memo: "주간 장보기",
      },
      {
        userId: 1, transactionDate: "2026-06-11",
        merchant: "KT 통신요금", categoryId: null, categoryName: null,
        amount: 55000, cardName: "토스뱅크", installment: 1, status: "승인",
        memo: "6월 통신비",
      },
      {
        userId: 1, transactionDate: "2026-06-12",
        merchant: "스타벅스 역삼점", categoryId: null, categoryName: null,
        amount: 6500, cardName: "신한 Deep", installment: 1, status: "승인",
        memo: null,
      },
    ];
    const withTempId = parsed.map((item, idx) => ({ ...item, id: 9000 + idx + 1 }));
    return HttpResponse.json(withTempId.map((tx) => transactionResponse(tx, false)));
  }),

  http.post("/api/transactions/bulk", async ({ request }) => {
    if (!IS_TEST) await delay();
    const body = (await request.json()) as Omit<import("./db").LedgerTransaction, "id">[];
    const added = dbLedger.bulkAdd(body);
    added
      .filter((tx) => tx.categoryId == null)
      .forEach((tx) => dbWashing.addFromLedger(tx));
    return HttpResponse.json({ added: added.map((tx) => transactionResponse(tx)), skippedCount: body.length - added.length }, { status: 200 });
  }),

  http.post("/api/auth/register", async ({ request }) => {
    if (!IS_TEST) await delay();
    const body = (await request.json()) as {
      loginId: string;
      nickname: string;
      password?: string;
    };

    const existing = dbUser.findByLoginId(body.loginId);
    if (existing) {
      return HttpResponse.json(
        {
          type: "about:blank",
          title: "Bad Request",
          status: 400,
          detail: "이미 존재하거나 등록된 아이디입니다.",
          instance: "/api/auth/register",
          errorCode: "ATH004",
        },
        { status: 400 },
      );
    }

    const created = dbUser.create({
      loginId: body.loginId,
      nickname: body.nickname,
      password: body.password,
    });

    return HttpResponse.json(created, { status: 201 });
  }),

  http.post("/api/auth/login", async ({ request }) => {
    if (!IS_TEST) await delay();
    const body = (await request.json()) as {
      loginId: string;
      password?: string;
    };

    const user = dbUser.findByLoginId(body.loginId);
    if (!user || user.password !== body.password || user.status === "deleted") {
      return HttpResponse.json(
        {
          type: "about:blank",
          title: "Unauthorized",
          status: 401,
          detail: "잘못된 아이디 또는 비밀번호입니다.",
          instance: "/api/auth/login",
          errorCode: "ATH001",
        },
        { status: 401 },
      );
    }

    return HttpResponse.json(
      {
        accessToken: `mock-jwt-token-for-${user.loginId}`,
        nickname: user.nickname,
      },
      { status: 200 },
    );
  }),

  http.get("/api/user/me", async ({ request }) => {
    if (!IS_TEST) await delay();
    const authHeader = request.headers.get("Authorization");

    if (!authHeader || !authHeader.startsWith("Bearer mock-jwt-token-for-")) {
      return HttpResponse.json(
        {
          type: "about:blank",
          title: "Unauthorized",
          status: 401,
          detail: "인증 토큰이 없거나 유효하지 않습니다.",
          instance: "/api/user/me",
          errorCode: "ATH003",
        },
        { status: 401 },
      );
    }

    const loginId = authHeader.replace("Bearer mock-jwt-token-for-", "");
    const user = dbUser.findByLoginId(loginId);

    if (!user || user.status === "deleted") {
      return HttpResponse.json(
        {
          type: "about:blank",
          title: "Unauthorized",
          status: 401,
          detail: "사용자를 찾을 수 없거나 탈퇴했습니다.",
          instance: "/api/user/me",
          errorCode: "ATH002",
        },
        { status: 401 },
      );
    }

    return HttpResponse.json(
      {
        id: user.id,
        loginId: user.loginId,
        nickname: user.nickname,
        status: user.status,
        lastLoginAt: user.lastLoginAt,
        createdAt: user.createdAt,
      },
      { status: 200 },
    );
  }),

  http.delete("/api/user", async ({ request }) => {
    if (!IS_TEST) await delay();
    const authHeader = request.headers.get("Authorization");

    if (!authHeader || !authHeader.startsWith("Bearer mock-jwt-token-for-")) {
      return HttpResponse.json(
        {
          type: "about:blank",
          title: "Unauthorized",
          status: 401,
          detail: "인증 토큰이 유효하지 않습니다.",
          instance: "/api/user",
          errorCode: "ATH003",
        },
        { status: 401 },
      );
    }

    const loginId = authHeader.replace("Bearer mock-jwt-token-for-", "");
    const success = dbUser.delete(loginId);

    if (!success) {
      return HttpResponse.json(
        {
          type: "about:blank",
          title: "Not Found",
          status: 404,
          detail: "존재하지 않는 회원 정보입니다.",
          instance: "/api/user",
          errorCode: "USR001",
        },
        { status: 404 },
      );
    }

    return new HttpResponse(null, { status: 204 });
  }),
];
