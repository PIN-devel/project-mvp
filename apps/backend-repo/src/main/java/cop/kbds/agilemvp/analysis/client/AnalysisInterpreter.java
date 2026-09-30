package cop.kbds.agilemvp.analysis.client;

import java.util.List;
import cop.kbds.agilemvp.analysis.service.AnalyticsSnapshot;
import cop.kbds.agilemvp.common.exception.BusinessException;
import cop.kbds.agilemvp.insight.exception.InsightErrorCode;

/** Model output contains references and prose only. IDs, amounts and eligibility remain server-owned. */
public interface AnalysisInterpreter {
    record Draft(List<FindingDraft> findings, List<OpportunityDraft> opportunities) {}
    record FindingDraft(String observationId, List<String> evidenceIds, String interpretation,
                        String importance, List<String> limitations) {}
    record OpportunityDraft(Long categoryId, List<String> evidenceIds, List<String> observationIds,
                            String direction, String rationale) {}
    Draft interpret(AnalyticsSnapshot snapshot);
    /** Optional single correction; unsupported interpreters preserve the invalid-response failure. */
    default Draft correctNumericProse(AnalyticsSnapshot snapshot, Draft rejected) {
        throw new BusinessException(InsightErrorCode.INVALID_MODEL_RESPONSE);
    }
    String modelVersion();
}
