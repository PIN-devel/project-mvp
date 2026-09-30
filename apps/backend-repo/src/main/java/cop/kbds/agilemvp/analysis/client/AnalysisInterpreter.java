package cop.kbds.agilemvp.analysis.client;

import java.util.List;
import cop.kbds.agilemvp.analysis.service.AnalyticsSnapshot;

/** Model output contains references and prose only. IDs, amounts and eligibility remain server-owned. */
public interface AnalysisInterpreter {
    record Draft(List<FindingDraft> findings, List<OpportunityDraft> opportunities) {}
    record FindingDraft(String observationId, List<String> evidenceIds, String interpretation,
                        String importance, List<String> limitations) {}
    record OpportunityDraft(Long categoryId, List<String> evidenceIds, List<String> observationIds,
                            String direction, String rationale) {}
    Draft interpret(AnalyticsSnapshot snapshot);
    String modelVersion();
}
