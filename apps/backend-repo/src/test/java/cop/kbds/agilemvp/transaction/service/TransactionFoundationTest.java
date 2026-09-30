package cop.kbds.agilemvp.transaction.service;

import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.assertThat;

class TransactionFoundationTest {
    private TransactionFoundation foundation(String date, Long amount, String status, Long categoryId,
                                             String label, Boolean flag, boolean persisted) {
        return TransactionFoundation.from(1L, date, amount, status, categoryId, label, flag, "원본 이용처", 7L, persisted);
    }

    @Test
    void normalizesKnownStatusesWithoutChangingRawValues() {
        assertThat(CanonicalStatus.fromRaw(" APPROVED ")).isEqualTo(CanonicalStatus.APPROVED);
        assertThat(CanonicalStatus.fromRaw("승인")).isEqualTo(CanonicalStatus.APPROVED);
        assertThat(CanonicalStatus.fromRaw("취소")).isEqualTo(CanonicalStatus.CANCELLED);
        assertThat(CanonicalStatus.fromRaw("canceled")).isEqualTo(CanonicalStatus.CANCELLED);
        assertThat(CanonicalStatus.fromRaw("cancelled")).isEqualTo(CanonicalStatus.CANCELLED);
        TransactionFoundation unknown = foundation("2026-09-30", 100L, "미확인", null, null, false, true);
        assertThat(unknown.rawStatus()).isEqualTo("미확인");
        assertThat(unknown.canonicalStatus()).isEqualTo(CanonicalStatus.UNKNOWN);
        assertThat(unknown.spendingEligible()).isFalse();
        assertThat(CanonicalStatus.fromRaw(null)).isEqualTo(CanonicalStatus.UNKNOWN);
        assertThat(CanonicalStatus.fromRaw("")).isEqualTo(CanonicalStatus.UNKNOWN);
    }

    @Test
    void classificationRequiresAvailableCategoryIdAndConsistentFlag() {
        assertThat(Classification.from(1L, true, true)).isEqualTo(Classification.CLASSIFIED);
        assertThat(Classification.from(null, false, false)).isEqualTo(Classification.UNCLASSIFIED);
        assertThat(Classification.from(1L, true, false)).isEqualTo(Classification.INCONSISTENT);
        assertThat(Classification.from(null, false, true)).isEqualTo(Classification.INCONSISTENT);
        assertThat(Classification.from(1L, false, true)).isEqualTo(Classification.INCONSISTENT);
        assertThat(Classification.from(1L, true, null)).isEqualTo(Classification.INCONSISTENT);
    }

    @Test
    void spendingRequiresSavedValidPositiveSafeIntegerApprovedRecord() {
        TransactionFoundation unclassified = foundation("2026-09-30", 100L, "승인", null, null, false, true);
        assertThat(unclassified.spendingEligible()).isTrue();
        assertThat(unclassified.classification()).isEqualTo(Classification.UNCLASSIFIED);
        assertThat(unclassified.appliedRuleId()).isEqualTo(7L);
        assertThat(foundation("2026-09-30", 100L, "승인", null, null, false, false).spendingExclusionReasons())
                .containsExactly(TransactionFoundation.SpendingExclusionReason.PREVIEW_NOT_SAVED);
        assertThat(foundation("2026-02-30", 100L, "승인", null, null, false, true).spendingEligible()).isFalse();
        assertThat(foundation("2026-09-30", 0L, "승인", null, null, false, true).spendingEligible()).isFalse();
        assertThat(foundation("2026-09-30", -1L, "승인", null, null, false, true).spendingEligible()).isFalse();
        assertThat(foundation("2026-09-30", null, "승인", null, null, false, true).spendingEligible()).isFalse();
        assertThat(foundation("2026-09-30", 9_007_199_254_740_991L, "승인", null, null, false, true).spendingEligible()).isTrue();
        assertThat(foundation("2026-09-30", 9_007_199_254_740_992L, "승인", null, null, false, true).spendingEligible()).isFalse();
        assertThat(foundation("2026-09-30", 100L, "취소", null, null, false, true).spendingEligible()).isFalse();
    }
}
