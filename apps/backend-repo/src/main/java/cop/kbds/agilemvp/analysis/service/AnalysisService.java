package cop.kbds.agilemvp.analysis.service;

import static cop.kbds.agilemvp.analysis.service.AnalysisRun.*;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

import org.springframework.stereotype.Service;
import cop.kbds.agilemvp.analysis.client.AnalysisInterpreter;
import cop.kbds.agilemvp.analysis.client.BedrockAnalysisInterpreter;
import cop.kbds.agilemvp.analysis.repository.AnalysisRunRepository;
import cop.kbds.agilemvp.common.exception.BusinessException;
import cop.kbds.agilemvp.common.exception.CommonErrorCode;
import cop.kbds.agilemvp.insight.exception.InsightErrorCode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class AnalysisService {
    private final AnalyticsQueryService analytics;
    private final AnalysisRunRepository repository;
    private final AnalysisInterpreter interpreter;
    private final AnalysisResultValidator validator;

    public AnalysisRun create(Long userId, AnalyticsSnapshot.Query query, String expectedRevision) {
        var snapshot = analytics.query(userId, query);
        if (expectedRevision != null && !expectedRevision.equals(snapshot.dataRevision())) throw new BusinessException(AnalysisErrorCode.STALE_SOURCE);
        boolean enough = snapshot.transactionCount() >= 10;
        var pending = new AnalysisRun(UUID.randomUUID().toString(), snapshot, enough ? "PENDING" : "INSUFFICIENT_DATA", null,
                List.of(), List.of(), OffsetDateTime.now().toString(), "analysis-v1", BedrockAnalysisInterpreter.PROMPT_VERSION, interpreter.modelVersion());
        // Commit deterministic data BEFORE the external call; no database transaction spans model latency.
        repository.insert(userId, pending);
        if (!enough) return pending;
        AnalysisRun completed;
        try {
            var result = validator.validate(snapshot, interpreter.interpret(snapshot));
            completed = finish(pending, "SUCCEEDED", null, result.findings(), result.opportunities());
        } catch (BusinessException e) {
            // Model timeout, availability or invalid evidence leave the Snapshot fully restorable.
            if (!(e.getErrorCode() instanceof InsightErrorCode)) throw e;
            log.warn("Analysis interpretation failed: runId={}, code={}", pending.id(), e.getErrorCode().getCode());
            completed = finish(pending, "AI_FAILED", e.getErrorCode().getCode(), List.of(), List.of());
        }
        repository.update(userId, completed);
        return completed;
    }
    private AnalysisRun finish(AnalysisRun run, String status, String failure, List<Finding> findings, List<Opportunity> opportunities) {
        return new AnalysisRun(run.id(), run.snapshot(), status, failure, findings, opportunities,
                OffsetDateTime.now().toString(), run.schemaVersion(), run.promptVersion(), run.modelVersion());
    }
    public AnalysisRun find(Long userId, String id) {
        var run = repository.find(userId, id);
        if (run == null) throw new BusinessException(CommonErrorCode.ENTITY_NOT_FOUND);
        return run;
    }
    public AnalysisRun latest(Long userId) { return repository.latest(userId); }
    public String currentRevision(Long userId, AnalysisRun run) { return analytics.query(userId, run.snapshot().query()).dataRevision(); }

    public Handoff handoff(Long userId, String runId, String opportunityId) {
        var run = find(userId, runId);
        var opportunity = run.opportunities().stream().filter(o -> o.id().equals(opportunityId)).findFirst()
                .orElseThrow(() -> new BusinessException(CommonErrorCode.ENTITY_NOT_FOUND));
        String revision = currentRevision(userId, run);
        boolean stale = !revision.equals(run.snapshot().dataRevision());
        var period = run.snapshot().period();
        boolean closedMonth = run.snapshot().query().start() != null && run.snapshot().query().endExclusive() != null
                && period.start() != null && period.endExclusive() != null
                && LocalDate.parse(period.start()).getDayOfMonth() == 1
                && LocalDate.parse(period.start()).plusMonths(1).toString().equals(period.endExclusive())
                && !LocalDate.parse(period.endExclusive()).isAfter(LocalDate.now(java.time.ZoneId.of("Asia/Seoul")));
        var category = run.snapshot().categories().stream().filter(c -> Objects.equals(c.categoryId(), opportunity.categoryId())).findFirst()
                .orElseThrow(() -> new BusinessException(CommonErrorCode.ENTITY_NOT_FOUND));
        // ALL/rolling/three-month totals are never silently promoted to a monthly baseline.
        var baseline = new BaselineProposal(period, run.snapshot().sourceScope(), run.snapshot().basisVersion(), run.snapshot().dataRevision(),
                closedMonth ? category.amount() : null, closedMonth ? category.count() : null,
                closedMonth ? "REQUIRES_SOURCE_CONFIRMATION" : "CLOSED_MONTH_SELECTION_REQUIRED");
        var eligibility = stale ? new GoalEligibility("BLOCKED", List.of("STALE_SOURCE")) : opportunity.goalEligibility();
        return new Handoff(run.id(), opportunity.id(), run.snapshot().dataRevision(), revision, stale, "CATEGORY",
                opportunity.categoryId(), opportunity.categoryLabelSnapshot(), opportunity.evidenceIds(), opportunity.direction(),
                opportunity.rationale(), baseline, eligibility);
    }
}
