package cop.kbds.agilemvp.analysis.controller;

import java.util.List;
import cop.kbds.agilemvp.analysis.service.AnalyticsSnapshot;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import io.swagger.v3.oas.annotations.media.Schema;

public record AnalysisRequest(
        @Schema(allowableValues = {"ALL", "LAST_1_MONTH", "LAST_3_MONTHS"}) String period,
        String start, String endExclusive,
        List<@Positive(message = "카테고리 ID는 양수여야 합니다.") Long> categoryIds,
        List<String> cardNames,
        @Size(max = 64, message = "revision은 최대 64자입니다.") String expectedDataRevision) {
    public AnalyticsSnapshot.Query toQuery() { return new AnalyticsSnapshot.Query(period, start, endExclusive, categoryIds, cardNames); }
}
