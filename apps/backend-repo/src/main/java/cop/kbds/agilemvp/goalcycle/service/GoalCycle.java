package cop.kbds.agilemvp.goalcycle.service;

import java.util.List;
import cop.kbds.agilemvp.analysis.service.AnalyticsSnapshot;

/** A fixed, user-selected plan. Observations and results do not mutate its baseline or target. */
public record GoalCycle(String id, String analysisRunId, String opportunityId, Long categoryId,
                        String categoryLabelSnapshot, String rationale, List<String> evidenceIds,
                        Baseline baseline, long targetAmount, String start, String endExclusive,
                        String lifecycle, String previousCycleId, String createdAt) {
    public record Baseline(AnalyticsSnapshot snapshot, String confirmedAt, String confirmationKind) {}
    public GoalCycle close(String state) {
        return new GoalCycle(id, analysisRunId, opportunityId, categoryId, categoryLabelSnapshot, rationale, evidenceIds,
                baseline, targetAmount, start, endExclusive, state, previousCycleId, createdAt);
    }
    public record Preparation(String analysisRunId, String opportunityId, String previousCycleId, Long categoryId,
                              String categoryLabel, String rationale, List<String> evidenceIds, String sourceDataRevision,
                              String baselineMonth, List<String> availableBaselineMonths, String earliestExecutionMonth,
                              AnalyticsSnapshot baselineSnapshot, boolean canCreate, List<String> reasons) {}
    public record Tracking(AnalyticsSnapshot snapshot, Long actualAmount, Long observedChange,
                           boolean baselineChanged, boolean sourceRisk, boolean resultChanged, String phase) {}
    public record View(GoalCycle cycle, Tracking tracking, List<GoalEvaluation> evaluations, String nextCycleId) {}
}
