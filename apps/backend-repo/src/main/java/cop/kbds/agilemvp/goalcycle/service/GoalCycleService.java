package cop.kbds.agilemvp.goalcycle.service;

import static cop.kbds.agilemvp.goalcycle.service.GoalCycle.*;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.YearMonth;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import cop.kbds.agilemvp.analysis.service.AnalysisRun;
import cop.kbds.agilemvp.analysis.service.AnalysisService;
import cop.kbds.agilemvp.analysis.service.AnalyticsQueryService;
import cop.kbds.agilemvp.analysis.service.AnalyticsSnapshot;
import cop.kbds.agilemvp.category.repository.CategoryRepository;
import cop.kbds.agilemvp.common.exception.BusinessException;
import cop.kbds.agilemvp.common.exception.CommonErrorCode;
import cop.kbds.agilemvp.goalcycle.repository.GoalCycleRepository;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class GoalCycleService {
    private static final ZoneId ZONE = ZoneId.of("Asia/Seoul");
    private final AnalyticsQueryService analytics;
    private final AnalysisService analyses;
    private final GoalCycleRepository repository;
    private final CategoryRepository categories;

    public List<GoalCycle> list(Long owner) { return repository.list(owner); }
    public GoalCycle find(Long owner, String id) {
        var goal = repository.find(owner, id);
        if (goal == null) throw new BusinessException(CommonErrorCode.ENTITY_NOT_FOUND);
        return goal;
    }

    public Preparation prepare(Long owner, String runId, String opportunityId, String previousId, String baselineMonth) {
        GoalCycle previous = previousId == null ? null : find(owner, previousId);
        if (previous != null) {
            if (previous.lifecycle().equals("OPEN")) throw new BusinessException(GoalErrorCode.INVALID_LIFECYCLE);
            runId = previous.analysisRunId(); opportunityId = previous.opportunityId();
        }
        AnalysisRun run = analyses.find(owner, runId);
        final String opportunityKey = opportunityId;
        var opportunity = run.opportunities().stream().filter(o -> o.id().equals(opportunityKey)).findFirst()
                .orElseThrow(() -> new BusinessException(CommonErrorCode.ENTITY_NOT_FOUND));
        var cardNames = previous == null ? run.snapshot().sourceScope().cardNames() : previous.baseline().snapshot().sourceScope().cardNames();
        if (cardNames.isEmpty()) throw new BusinessException(GoalErrorCode.BASELINE_NOT_READY);
        var source = analytics.query(owner, new AnalyticsSnapshot.Query("ALL", null, null, List.of(opportunity.categoryId()), cardNames));
        var closedMonths = source.records().stream().map(r -> YearMonth.from(LocalDate.parse(r.foundation().occurredOn())))
                .filter(m -> m.isBefore(YearMonth.from(today()))).distinct().sorted(java.util.Comparator.reverseOrder()).map(YearMonth::toString).toList();
        YearMonth month = baselineMonth == null
                ? closedMonths.isEmpty() ? YearMonth.from(today()).minusMonths(1) : month(closedMonths.getFirst())
                : month(baselineMonth);
        if (!month.isBefore(YearMonth.from(today()))) invalid();
        var baseline = analytics.query(owner, monthQuery(month, opportunity.categoryId(), cardNames));
        List<String> reasons = new ArrayList<>();
        if (cardNames.stream().anyMatch(String::isBlank)) reasons.add("SOURCE_SCOPE_UNAVAILABLE");
        String revision = run.snapshot().dataRevision();
        if (previous == null && !analyses.currentRevision(owner, run).equals(revision)) reasons.add("STALE_OPPORTUNITY");
        if (categories.findByIdAvailable(opportunity.categoryId(), owner) == null) reasons.add("CATEGORY_UNAVAILABLE");
        if (baseline.totalAmount() <= 0) reasons.add("NO_BASELINE_SPENDING");
        if (risk(baseline)) reasons.add("UNRESOLVED_RECORDS");
        if (repository.hasOpen(owner)) reasons.add("OPEN_GOAL_EXISTS");
        if (previous != null && repository.next(owner, previous.id()) != null) reasons.add("NEXT_CYCLE_EXISTS");
        return new Preparation(runId, opportunityId, previousId, opportunity.categoryId(), opportunity.categoryLabelSnapshot(),
                rationale(opportunity.rationale(), run.snapshot()), opportunity.evidenceIds(), revision, month.toString(), closedMonths,
                earliestMonth().toString(), baseline, reasons.isEmpty(), List.copyOf(reasons));
    }

    public record Create(String analysisRunId, String opportunityId, String previousCycleId, String baselineMonth,
                         String executionMonth, long targetAmount, boolean sourceConfirmed, String expectedSourceRevision,
                         String expectedBaselineRevision, String idempotencyKey) {}

    @Transactional
    public GoalCycle create(Long owner, Create command) {
        repository.lockOwner(owner);
        var duplicate = repository.byRequest(owner, command.idempotencyKey());
        if (duplicate != null) {
            if (duplicate.targetAmount() != command.targetAmount() || !Objects.equals(duplicate.previousCycleId(), command.previousCycleId())
                    || !duplicate.start().startsWith(command.executionMonth() + "-")
                    || !duplicate.baseline().snapshot().period().start().startsWith(command.baselineMonth() + "-")) invalid();
            return duplicate;
        }
        if (repository.hasOpen(owner)) throw new BusinessException(GoalErrorCode.OPEN_GOAL_EXISTS);
        var preparation = prepare(owner, command.analysisRunId(), command.opportunityId(), command.previousCycleId(), command.baselineMonth());
        if (preparation.reasons().contains("STALE_OPPORTUNITY")) throw new BusinessException(GoalErrorCode.STALE_DATA);
        if (!Objects.equals(preparation.sourceDataRevision(), command.expectedSourceRevision())
                || !preparation.baselineSnapshot().dataRevision().equals(command.expectedBaselineRevision())) throw new BusinessException(GoalErrorCode.STALE_DATA);
        if (!preparation.canCreate() || !command.sourceConfirmed()) throw new BusinessException(GoalErrorCode.BASELINE_NOT_READY);
        var execution = month(command.executionMonth());
        if (execution.isBefore(earliestMonth()) || command.targetAmount() < 0 || command.targetAmount() >= preparation.baselineSnapshot().totalAmount()) invalid();
        String now = OffsetDateTime.now(ZONE).toString();
        var goal = new GoalCycle(UUID.randomUUID().toString(), preparation.analysisRunId(), preparation.opportunityId(), preparation.categoryId(),
                preparation.categoryLabel(), preparation.rationale(), preparation.evidenceIds(),
                new Baseline(preparation.baselineSnapshot(), now, "USER_CONFIRMED"), command.targetAmount(), execution.atDay(1).toString(),
                execution.plusMonths(1).atDay(1).toString(), "OPEN", command.previousCycleId(), now);
        repository.insert(owner, goal, command.idempotencyKey());
        return goal;
    }

    @Transactional(readOnly = true)
    public View view(Long owner, String id) {
        var goal = find(owner, id);
        var start = LocalDate.parse(goal.start()); var end = LocalDate.parse(goal.endExclusive());
        var today = today(); boolean started = !today.isBefore(start); boolean ended = !today.isBefore(end);
        // Tracking looks only through today; finished periods use their full, fixed calendar month.
        var queryEnd = !started || ended ? end : today.plusDays(1);
        var snapshot = analytics.query(owner, new AnalyticsSnapshot.Query("ALL", start.toString(), queryEnd.toString(),
                List.of(goal.categoryId()), goal.baseline().snapshot().sourceScope().cardNames()));
        boolean baselineChanged = !analytics.query(owner, goal.baseline().snapshot().query()).dataRevision().equals(goal.baseline().snapshot().dataRevision());
        boolean sourceRisk = risk(snapshot) || categories.findByIdAvailable(goal.categoryId(), owner) == null
                || goal.baseline().snapshot().sourceScope().cardNames().stream().anyMatch(String::isBlank);
        Long actual = started && snapshot.quality().sourceTransactionCount() > 0 ? snapshot.totalAmount() : null;
        var evaluations = repository.evaluations(owner, id);
        boolean changed = !evaluations.isEmpty() && (!evaluations.getFirst().snapshot().dataRevision().equals(snapshot.dataRevision())
                || evaluations.getFirst().baselineChanged() != baselineChanged);
        String phase = goal.lifecycle().equals("OPEN") ? ended ? "READY_TO_REVIEW" : "ACTIVE" : "RESULT";
        return new View(goal, new Tracking(snapshot, actual, actual == null ? null : goal.baseline().snapshot().totalAmount() - actual,
                baselineChanged, sourceRisk, changed, phase), evaluations, repository.next(owner, id));
    }

    @Transactional
    public GoalEvaluation evaluate(Long owner, String id, String expectedRevision, boolean confirmed, String key) {
        repository.lockOwner(owner);
        var duplicate = repository.evaluationByRequest(owner, key);
        if (duplicate != null) { if (!duplicate.goalId().equals(id)) invalid(); return duplicate; }
        var current = view(owner, id); var goal = current.cycle();
        if (goal.lifecycle().equals("STOPPED") || today().isBefore(LocalDate.parse(goal.endExclusive()))) throw new BusinessException(GoalErrorCode.INVALID_LIFECYCLE);
        var snapshot = current.tracking().snapshot();
        if (!snapshot.dataRevision().equals(expectedRevision)) throw new BusinessException(GoalErrorCode.STALE_DATA);
        if (!current.evaluations().isEmpty() && !current.tracking().resultChanged()
                && current.evaluations().getFirst().sourceConfirmed() == confirmed) return current.evaluations().getFirst();
        boolean determined = confirmed && !current.tracking().sourceRisk() && !current.tracking().baselineChanged();
        Long actual = confirmed ? Long.valueOf(snapshot.totalAmount()) : current.tracking().actualAmount();
        String outcome = determined ? snapshot.totalAmount() <= goal.targetAmount() ? "MET" : "NOT_MET" : "UNDETERMINED";
        String now = OffsetDateTime.now(ZONE).toString();
        var evaluation = new GoalEvaluation(UUID.randomUUID().toString(), id, snapshot, actual,
                actual == null ? null : goal.baseline().snapshot().totalAmount() - actual, outcome, confirmed, confirmed ? now : null,
                current.tracking().baselineChanged(), now);
        repository.insertEvaluation(owner, evaluation, key);
        repository.close(owner, goal.close("REVIEWED"));
        return evaluation;
    }

    @Transactional
    public GoalCycle stop(Long owner, String id) {
        repository.lockOwner(owner); var goal = find(owner, id);
        if (goal.lifecycle().equals("STOPPED")) return goal;
        if (!goal.lifecycle().equals("OPEN")) throw new BusinessException(GoalErrorCode.INVALID_LIFECYCLE);
        var stopped = goal.close("STOPPED"); repository.close(owner, stopped); return stopped;
    }
    private boolean risk(AnalyticsSnapshot snapshot) {
        var q = snapshot.quality();
        return q.sourceUnclassifiedCount() > 0 || q.sourceInconsistentCount() > 0 || q.unresolvedSourceCount() > 0;
    }
    private AnalyticsSnapshot.Query monthQuery(YearMonth month, Long categoryId, List<String> cards) {
        return new AnalyticsSnapshot.Query("ALL", month.atDay(1).toString(), month.plusMonths(1).atDay(1).toString(), List.of(categoryId), cards);
    }
    private LocalDate today() { return LocalDate.now(ZONE); }
    private YearMonth earliestMonth() { return YearMonth.from(today()).plusMonths(today().getDayOfMonth() == 1 ? 0 : 1); }
    private YearMonth month(String value) {
        try { return YearMonth.parse(value); } catch (java.time.DateTimeException | NullPointerException e) { throw new BusinessException(CommonErrorCode.INVALID_INPUT); }
    }
    private void invalid() { throw new BusinessException(CommonErrorCode.INVALID_INPUT); }
    private String rationale(String text, AnalyticsSnapshot snapshot) {
        for (var e : snapshot.evidence()) text = text.replace("{{" + e.id() + "}}", e.value().stripTrailingZeros().toPlainString()
                + (e.unit().equals("KRW") ? "원" : e.unit().equals("COUNT") ? "건" : "%"));
        return text;
    }
}
