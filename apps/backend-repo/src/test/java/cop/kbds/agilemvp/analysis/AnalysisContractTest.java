package cop.kbds.agilemvp.analysis;

import static org.assertj.core.api.Assertions.*;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import cop.kbds.agilemvp.analysis.client.AnalysisInterpreter.*;
import cop.kbds.agilemvp.analysis.repository.AnalysisRunRepository;
import cop.kbds.agilemvp.analysis.service.*;
import cop.kbds.agilemvp.common.exception.BusinessException;

/** Three critical boundaries that compilation cannot establish. No model calls or mocked AI scenarios. */
@SpringBootTest(properties = {"bedrock.enabled=false", "spring.datasource.url=jdbc:h2:mem:analysis-contract;MODE=PostgreSQL;DB_CLOSE_DELAY=-1", "logging.level.cop.kbds.agilemvp=INFO"})
@Transactional
class AnalysisContractTest {
    @Autowired AnalyticsQueryService analytics;
    @Autowired AnalysisService analyses;
    @Autowired AnalysisResultValidator validator;
    @Autowired AnalysisRunRepository repository;
    @Autowired JdbcTemplate jdbc;
    @Autowired org.mybatis.spring.SqlSessionTemplate session;
    private final AnalyticsSnapshot.Query all = new AnalyticsSnapshot.Query("ALL", null, null, List.of(), List.of());

    @Test void sameCategoryNameDoesNotMergeAndUnknownGapsAreNotZero() {
        long owner = user();
        long first = category(owner);
        jdbc.update("INSERT INTO categories(name, user_scope_id) VALUES ('동일 표시명', -1)");
        long second = jdbc.queryForObject("SELECT id FROM categories WHERE name = '동일 표시명' AND user_id IS NULL", Long.class);
        transaction(owner, first, "2026-08-01", 100, "approved", true);
        transaction(owner, second, "2026-08-03", 200, "승인", true);
        transaction(owner, null, "2026-08-04", 50, "승인", false);
        transaction(owner, first, "2026-08-05", 900, "취소", true);
        transaction(owner, first, "2026-08-06", 800, "미확인", true);
        var snapshot = analytics.query(owner, all);
        assertThat(snapshot.totalAmount()).isEqualTo(350);
        assertThat(snapshot.transactionCount()).isEqualTo(3);
        assertThat(snapshot.categories()).hasSize(3);
        assertThat(snapshot.timeBuckets()).extracting(AnalyticsSnapshot.TimeBucket::date)
                .containsExactly("2026-08-01", "2026-08-03", "2026-08-04");
        assertThat(snapshot.quality().unclassifiedAmount()).isEqualTo(50);
        assertThat(snapshot.quality().exclusionReasons()).containsEntry("CANCELLED", 1).containsEntry("UNKNOWN_STATUS", 1);
        assertThat(snapshot.records()).allMatch(r -> r.foundation().persisted() && r.foundation().spendingEligible());
    }

    @Test void onlyRealEvidenceAndSameCategoryCanReachOpportunities() {
        long owner = user(); long category = category(owner);
        transaction(owner, category, "2026-08-01", 100, "승인", true);
        var snapshot = analytics.query(owner, all);
        var observation = snapshot.observations().getFirst();
        String evidenceId = observation.evidenceIds().getFirst();
        var good = draft(observation, evidenceId, category, "관측 금액 {{" + evidenceId + "}}를 확인해 보세요.");
        assertThat(validator.validate(snapshot, good).opportunities()).singleElement()
                .satisfies(o -> assertThat(o.goalEligibility().status()).isEqualTo("REQUIRES_CONFIRMATION"));
        assertThatThrownBy(() -> validator.validate(snapshot, draft(observation, "invented", category, "근거 확인"))).isInstanceOf(BusinessException.class);
        assertThatThrownBy(() -> validator.validate(snapshot, draft(observation, evidenceId, category, "금액 999원"))).isInstanceOf(BusinessException.class);
        assertThatThrownBy(() -> validator.validate(snapshot, draft(observation, evidenceId, category + 999, "근거 확인"))).isInstanceOf(BusinessException.class);
    }

    @Test void savedRunIsOwnerScopedAndRevisionGuardsHandoffWithoutMonthlyTotalInference() {
        long owner = user(); long other = user(); long category = category(owner);
        for (int day = 1; day <= 10; day++) transaction(owner, category, "2026-08-" + String.format("%02d", day), 100, "승인", true);
        var failed = analyses.create(owner, all, null);
        assertThat(failed.status()).isEqualTo("AI_FAILED"); // disabled Bedrock preserves deterministic data
        assertThat(analyses.find(owner, failed.id()).snapshot()).isEqualTo(failed.snapshot());
        assertThatThrownBy(() -> analyses.find(other, failed.id())).isInstanceOf(BusinessException.class);
        var observation = failed.snapshot().observations().getFirst();
        var verified = validator.validate(failed.snapshot(), draft(observation, observation.evidenceIds().getFirst(), category, "근거 확인"));
        var run = new AnalysisRun(UUID.randomUUID().toString(), failed.snapshot(), "SUCCEEDED", null,
                verified.findings(), verified.opportunities(), failed.generatedAt(), failed.schemaVersion(), failed.promptVersion(), failed.modelVersion());
        repository.insert(owner, run);
        var handoff = analyses.handoff(owner, run.id(), run.opportunities().getFirst().id());
        assertThat(handoff.stale()).isFalse();
        assertThat(handoff.baselineProposal().amount()).isNull();
        jdbc.update("UPDATE categories SET name = '이름 변경' WHERE id = ?", category);
        session.clearCache(); // JDBC changes bypass MyBatis cache inside this test transaction.
        assertThat(analyses.handoff(owner, run.id(), run.opportunities().getFirst().id()).stale()).isTrue();
        assertThatThrownBy(() -> analyses.create(owner, all, run.snapshot().dataRevision())).isInstanceOf(BusinessException.class);
    }

    private Draft draft(AnalyticsSnapshot.Observation obs, String ref, long category, String text) {
        return new Draft(List.of(new FindingDraft(obs.id(), List.of(ref), text, "MEDIUM", List.of("자료 완결성 미확인"))),
                List.of(new OpportunityDraft(category, List.of(ref), List.of(obs.id()), "REDUCE_SPENDING", text)));
    }
    private long user() {
        String login = UUID.randomUUID().toString();
        jdbc.update("INSERT INTO users(login_id, nickname, password_hash) VALUES (?, ?, 'unused')", login, login);
        return jdbc.queryForObject("SELECT id FROM users WHERE login_id = ?", Long.class, login);
    }
    private long category(long owner) {
        jdbc.update("INSERT INTO categories(name, user_id, user_scope_id) VALUES ('동일 표시명', ?, ?)", owner, owner);
        return jdbc.queryForObject("SELECT MAX(id) FROM categories WHERE user_id = ?", Long.class, owner);
    }
    private void transaction(long owner, Long category, String date, long amount, String status, boolean classified) {
        jdbc.update("INSERT INTO transactions(user_id, category_id, transaction_date, merchant, amount, status, card_name, is_classified) VALUES (?, ?, CAST(? AS DATE), ?, ?, ?, '카드', ?)",
                owner, category, date, "원본 이용처 " + UUID.randomUUID(), amount, status, classified);
    }
}
