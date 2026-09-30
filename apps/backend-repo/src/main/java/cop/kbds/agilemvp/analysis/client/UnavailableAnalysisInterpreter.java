package cop.kbds.agilemvp.analysis.client;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import cop.kbds.agilemvp.analysis.service.AnalyticsSnapshot;
import cop.kbds.agilemvp.common.exception.BusinessException;
import cop.kbds.agilemvp.insight.exception.InsightErrorCode;

@Component
@ConditionalOnProperty(prefix = "bedrock", name = "enabled", havingValue = "false", matchIfMissing = true)
public class UnavailableAnalysisInterpreter implements AnalysisInterpreter {
    @Override public Draft interpret(AnalyticsSnapshot snapshot) {
        throw new BusinessException(InsightErrorCode.SERVICE_UNAVAILABLE);
    }
    @Override public String modelVersion() { return "unavailable"; }
}
