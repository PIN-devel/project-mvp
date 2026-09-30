package cop.kbds.agilemvp.analysis.service;

import java.util.List;

public record AnalysisRun(String id, AnalyticsSnapshot snapshot, String status, String failureCode,
                          List<Finding> findings, List<Opportunity> opportunities, String generatedAt,
                          String schemaVersion, String promptVersion, String modelVersion) {
    public record Finding(String id, String observationId, List<String> evidenceIds, String interpretation,
                          String importance, List<String> limitations) {}
    public record GoalEligibility(String status, List<String> reasons) {}
    public record Opportunity(String id, Long categoryId, String categoryLabelSnapshot,
                              List<String> evidenceIds, List<String> findingIds, String direction,
                              String rationale, GoalEligibility goalEligibility) {}
    public record BaselineProposal(AnalyticsSnapshot.Period period, AnalyticsSnapshot.SourceScope sourceScope,
                                   String basisVersion, String dataRevision, Long amount, Integer count,
                                   String status) {}
    public record Handoff(String analysisRunId, String opportunityId, String sourceDataRevision,
                          String currentDataRevision, boolean stale, String scope, Long categoryId,
                          String categoryLabelSnapshot, List<String> evidenceIds, String direction,
                          String rationale, BaselineProposal baselineProposal, GoalEligibility goalEligibility) {}
}
