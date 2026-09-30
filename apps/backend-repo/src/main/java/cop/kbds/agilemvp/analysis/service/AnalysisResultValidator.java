package cop.kbds.agilemvp.analysis.service;

import static cop.kbds.agilemvp.analysis.service.AnalysisRun.*;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

import org.springframework.stereotype.Component;
import cop.kbds.agilemvp.analysis.client.AnalysisInterpreter.Draft;
import cop.kbds.agilemvp.common.exception.BusinessException;
import cop.kbds.agilemvp.insight.exception.InsightErrorCode;

/** Boundary checks for real evidence references; no general data validation framework. */
@Component
public class AnalysisResultValidator {
    private static final Pattern TOKEN = Pattern.compile("\\{\\{([^{}]+)}}");
    public record Result(List<Finding> findings, List<Opportunity> opportunities) {}

    public Result validate(AnalyticsSnapshot snapshot, Draft draft) {
        require(draft != null && draft.findings() != null && draft.opportunities() != null);
        var observations = snapshot.observations().stream().collect(Collectors.toMap(AnalyticsSnapshot.Observation::id, o -> o));
        var evidence = snapshot.evidence().stream().collect(Collectors.toMap(AnalyticsSnapshot.Evidence::id, e -> e));
        List<Finding> findings = new ArrayList<>();
        for (var f : draft.findings()) {
            require(f != null && observations.containsKey(f.observationId()));
            var observation = observations.get(f.observationId());
            require(f.evidenceIds() != null && !f.evidenceIds().isEmpty() && observation.evidenceIds().containsAll(f.evidenceIds()));
            require(f.importance() != null && List.of("HIGH", "MEDIUM", "LOW").contains(f.importance()));
            require(findings.stream().noneMatch(saved -> saved.observationId().equals(f.observationId())));
            text(f.interpretation(), f.evidenceIds(), evidence);
            require(f.limitations() != null);
            for (var limitation : f.limitations()) text(limitation, f.evidenceIds(), evidence);
            findings.add(new Finding(UUID.randomUUID().toString(), f.observationId(), List.copyOf(f.evidenceIds()),
                    f.interpretation(), f.importance(), List.copyOf(f.limitations())));
        }
        List<Opportunity> opportunities = new ArrayList<>();
        for (var o : draft.opportunities()) {
            require(o != null && o.categoryId() != null && "REDUCE_SPENDING".equals(o.direction()));
            var category = snapshot.categories().stream().filter(c -> Objects.equals(c.categoryId(), o.categoryId())).findFirst().orElseThrow(this::invalid);
            require(o.evidenceIds() != null && !o.evidenceIds().isEmpty());
            require(o.evidenceIds().stream().allMatch(id -> evidence.containsKey(id) && Objects.equals(evidence.get(id).categoryId(), o.categoryId())));
            require(o.observationIds() != null && !o.observationIds().isEmpty());
            var linked = findings.stream().filter(f -> o.observationIds().contains(f.observationId())).toList();
            require(linked.size() == o.observationIds().stream().distinct().count());
            require(linked.stream().allMatch(f -> Objects.equals(observations.get(f.observationId()).categoryId(), o.categoryId())));
            require(o.evidenceIds().stream().allMatch(id -> linked.stream().anyMatch(f -> f.evidenceIds().contains(id))));
            text(o.rationale(), o.evidenceIds(), evidence);
            var quality = snapshot.quality();
            List<String> reasons = new ArrayList<>(List.of("BASELINE_PERIOD_AND_SOURCE_CONFIRMATION_REQUIRED", "TARGET_MUST_BE_USER_SELECTED"));
            boolean scopeRisk = quality.sourceUnclassifiedCount() > 0 || quality.sourceInconsistentCount() > 0 || quality.unresolvedSourceCount() > 0;
            if (scopeRisk) reasons.add("UNRESOLVED_SOURCE_RECORDS");
            opportunities.add(new Opportunity(UUID.randomUUID().toString(), category.categoryId(), category.categoryLabel(),
                    List.copyOf(o.evidenceIds()), linked.stream().map(Finding::id).toList(), o.direction(), o.rationale(),
                    new GoalEligibility(scopeRisk ? "BLOCKED" : "REQUIRES_CONFIRMATION", List.copyOf(reasons))));
        }
        return new Result(List.copyOf(findings), List.copyOf(opportunities));
    }

    private void text(String value, List<String> allowed, Map<String, AnalyticsSnapshot.Evidence> evidence) {
        require(value != null && !value.isBlank());
        var matcher = TOKEN.matcher(value);
        while (matcher.find()) require(allowed.contains(matcher.group(1)) && evidence.containsKey(matcher.group(1)));
        String prose = TOKEN.matcher(value).replaceAll("");
        require(!prose.contains("{{") && !prose.contains("}}"));
        // Literal digits are allowed only inside trusted display labels (e.g. a raw merchant name).
        for (var id : allowed) {
            var e = evidence.get(id);
            if (e.categoryLabel() != null && !e.categoryLabel().isEmpty()) prose = prose.replace(e.categoryLabel(), "");
            if (e.merchantRawName() != null && !e.merchantRawName().isEmpty()) prose = prose.replace(e.merchantRawName(), "");
        }
        require(!prose.matches("(?s).*\\p{N}.*"));
    }
    private void require(boolean condition) { if (!condition) throw invalid(); }
    private BusinessException invalid() { return new BusinessException(InsightErrorCode.INVALID_MODEL_RESPONSE); }
}
