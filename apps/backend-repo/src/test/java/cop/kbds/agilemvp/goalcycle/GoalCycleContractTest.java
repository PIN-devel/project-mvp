package cop.kbds.agilemvp.goalcycle;

import static org.assertj.core.api.Assertions.*;
import java.time.OffsetDateTime;
import java.time.YearMonth;
import java.time.ZoneId;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import cop.kbds.agilemvp.analysis.repository.AnalysisRunRepository;
import cop.kbds.agilemvp.analysis.service.*;
import cop.kbds.agilemvp.common.exception.BusinessException;
import cop.kbds.agilemvp.goalcycle.repository.GoalCycleRepository;
import cop.kbds.agilemvp.goalcycle.service.*;

/** Only persisted ownership/open-cycle and append-only evaluation boundaries; no model calls. */
@SpringBootTest(properties = {"bedrock.enabled=false", "spring.datasource.url=jdbc:h2:mem:goal-contract;MODE=PostgreSQL;DB_CLOSE_DELAY=-1", "logging.level.cop.kbds.agilemvp=INFO"})
@Transactional
class GoalCycleContractTest {
    @Autowired GoalCycleService goals;
    @Autowired GoalCycleRepository repository;
    @Autowired AnalyticsQueryService analytics;
    @Autowired AnalysisRunRepository runs;
    @Autowired JdbcTemplate jdbc;
    @Autowired org.mybatis.spring.SqlSessionTemplate session;
    private final YearMonth current = YearMonth.now(ZoneId.of("Asia/Seoul"));

    @Test void creationIsOwnerScopedIdempotentAndKeepsOneOpenFixedBaseline() {
        long owner = user(); long other = user(); long category = category(owner);
        transaction(owner, category, current.minusMonths(1), 1000);
        var run = run(owner, category);
        var p = goals.prepare(owner, run.id(), run.opportunities().getFirst().id(), null, null);
        String key = UUID.randomUUID().toString();
        var command = command(p, 500, key);
        var goal = goals.create(owner, command);
        assertThat(repository.hasOpen(owner)).isTrue();
        assertThat(goals.create(owner, command).id()).isEqualTo(goal.id());
        assertThatThrownBy(() -> goals.create(owner, command(p, 500, UUID.randomUUID().toString()))).isInstanceOf(BusinessException.class);
        assertThatThrownBy(() -> goals.view(other, goal.id())).isInstanceOf(BusinessException.class);
        assertThatThrownBy(() -> goals.evaluate(owner, goal.id(), goals.view(owner, goal.id()).tracking().snapshot().dataRevision(), true, UUID.randomUUID().toString()))
                .isInstanceOf(BusinessException.class);
        transaction(owner, category, current.plusMonths(1), 100);
        var tracked = goals.view(owner, goal.id());
        assertThat(tracked.tracking().baselineChanged()).isFalse(); // later uploads must not invalidate a closed baseline
        assertThat(tracked.cycle().baseline().snapshot().totalAmount()).isEqualTo(1000);
        assertThat(goals.stop(owner, goal.id()).lifecycle()).isEqualTo("STOPPED");
        assertThat(goals.view(owner, goal.id()).evaluations()).isEmpty();
    }

    @Test void periodEndRequiresConfirmationAndCorrectionsAppendBeforeCreatingNextCycle() {
        long owner = user(); long category = category(owner);
        transaction(owner, category, current.minusMonths(2), 1000);
        transaction(owner, category, current.minusMonths(1), 300);
        var run = run(owner, category);
        var p = goals.prepare(owner, run.id(), run.opportunities().getFirst().id(), null, current.minusMonths(2).toString());
        // A cycle begun in the preceding month, persisted in the same format as normal creation.
        String now = OffsetDateTime.now(ZoneId.of("Asia/Seoul")).toString();
        var goal = new GoalCycle(UUID.randomUUID().toString(), p.analysisRunId(), p.opportunityId(), category, p.categoryLabel(), p.rationale(), p.evidenceIds(),
                new GoalCycle.Baseline(p.baselineSnapshot(), now, "USER_CONFIRMED"), 500, current.minusMonths(1).atDay(1).toString(),
                current.atDay(1).toString(), "OPEN", null, now);
        repository.insert(owner, goal, UUID.randomUUID().toString());
        var ready = goals.view(owner, goal.id());
        assertThat(ready.tracking().phase()).isEqualTo("READY_TO_REVIEW");
        assertThat(ready.evaluations()).isEmpty();
        var unconfirmed = goals.evaluate(owner, goal.id(), ready.tracking().snapshot().dataRevision(), false, UUID.randomUUID().toString());
        assertThat(unconfirmed.outcome()).isEqualTo("UNDETERMINED");
        String key = UUID.randomUUID().toString();
        var confirmed = goals.evaluate(owner, goal.id(), ready.tracking().snapshot().dataRevision(), true, key);
        assertThat(confirmed.outcome()).isEqualTo("MET");
        assertThat(goals.evaluate(owner, goal.id(), ready.tracking().snapshot().dataRevision(), true, key)).isEqualTo(confirmed);
        transaction(owner, category, current.minusMonths(1), 400);
        var changed = goals.view(owner, goal.id());
        assertThat(changed.tracking().resultChanged()).isTrue();
        var revised = goals.evaluate(owner, goal.id(), changed.tracking().snapshot().dataRevision(), true, UUID.randomUUID().toString());
        assertThat(revised.outcome()).isEqualTo("NOT_MET");
        assertThat(revised.actualAmount()).isEqualTo(700);
        var history = goals.view(owner, goal.id());
        assertThat(history.evaluations()).extracting(GoalEvaluation::outcome).containsExactly("NOT_MET", "MET", "UNDETERMINED");
        assertThat(history.evaluations()).contains(confirmed, unconfirmed);
        var nextP = goals.prepare(owner, null, null, goal.id(), null);
        var next = goals.create(owner, command(nextP, 300, UUID.randomUUID().toString()));
        assertThat(next.previousCycleId()).isEqualTo(goal.id());
        assertThat(next.baseline().snapshot().totalAmount()).isEqualTo(700);
        assertThat(goals.view(owner, goal.id()).nextCycleId()).isEqualTo(next.id());
        assertThat(goals.find(owner, goal.id())).isEqualTo(goal.close("REVIEWED"));
    }

    private GoalCycleService.Create command(GoalCycle.Preparation p, long target, String key) {
        return new GoalCycleService.Create(p.analysisRunId(), p.opportunityId(), p.previousCycleId(), p.baselineMonth(), p.earliestExecutionMonth(),
                target, true, p.sourceDataRevision(), p.baselineSnapshot().dataRevision(), key);
    }
    private AnalysisRun run(long owner, long category) {
        var snapshot = analytics.query(owner, new AnalyticsSnapshot.Query("ALL", null, null, List.of(), List.of()));
        var observation = snapshot.observations().stream().filter(o -> Long.valueOf(category).equals(o.categoryId())).findFirst().orElseThrow();
        var opportunity = new AnalysisRun.Opportunity(UUID.randomUUID().toString(), category, "선택한 영역", observation.evidenceIds(), List.of(),
                "REDUCE_SPENDING", "관측 소비를 확인하고 변화를 선택해 보세요.", new AnalysisRun.GoalEligibility("REQUIRES_CONFIRMATION", List.of()));
        var run = new AnalysisRun(UUID.randomUUID().toString(), snapshot, "SUCCEEDED", null, List.of(), List.of(opportunity),
                OffsetDateTime.now().toString(), "analysis-v1", "test", "not-called");
        runs.insert(owner, run); return run;
    }
    private long user() {
        String login = UUID.randomUUID().toString();
        jdbc.update("INSERT INTO users(login_id, nickname, password_hash) VALUES (?, ?, 'unused')", login, login);
        return jdbc.queryForObject("SELECT id FROM users WHERE login_id = ?", Long.class, login);
    }
    private long category(long owner) {
        jdbc.update("INSERT INTO categories(name, user_id, user_scope_id) VALUES ('선택한 영역', ?, ?)", owner, owner);
        return jdbc.queryForObject("SELECT MAX(id) FROM categories WHERE user_id = ?", Long.class, owner);
    }
    private void transaction(long owner, long category, YearMonth month, long amount) {
        jdbc.update("INSERT INTO transactions(user_id, category_id, transaction_date, merchant, amount, status, card_name, is_classified) VALUES (?, ?, CAST(? AS DATE), ?, ?, '승인', '카드', TRUE)",
                owner, category, month.atDay(1).toString(), "원본 " + UUID.randomUUID(), amount);
        session.clearCache(); // Direct JDBC fixture inserts bypass MyBatis transaction cache.
    }
}
