package cop.kbds.agilemvp.transaction.service;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;

/** Observed transaction basis shared by Organize, Understand and Improve. No tag or inferred meaning. */
public record TransactionFoundation(
        Long transactionId,
        String occurredOn,
        Long amount,
        String rawStatus,
        @Schema(allowableValues = {"APPROVED", "CANCELLED", "UNKNOWN"}) CanonicalStatus canonicalStatus,
        Long categoryId,
        String categoryLabel,
        String merchantRawName,
        @Schema(allowableValues = {"CLASSIFIED", "UNCLASSIFIED", "INCONSISTENT"}) Classification classification,
        Long appliedRuleId,
        boolean persisted,
        String basisVersion,
        boolean spendingEligible,
        List<SpendingExclusionReason> spendingExclusionReasons
) {
    public enum SpendingExclusionReason { PREVIEW_NOT_SAVED, INVALID_DATE, INVALID_AMOUNT, NON_POSITIVE_AMOUNT, CANCELLED, UNKNOWN_STATUS }

    public static TransactionFoundation from(Long id, String date, Long amount, String status,
                                            Long categoryId, String categoryLabel, Boolean classified,
                                            String merchant, Long appliedRuleId, boolean persisted) {
        CanonicalStatus canonicalStatus = CanonicalStatus.fromRaw(status);
        boolean available = categoryId != null && categoryLabel != null;
        Classification classification = Classification.from(categoryId, available, classified);
        List<SpendingExclusionReason> reasons = new ArrayList<>();
        if (!persisted) reasons.add(SpendingExclusionReason.PREVIEW_NOT_SAVED);
        if (!validDate(date)) reasons.add(SpendingExclusionReason.INVALID_DATE);
        if (amount == null || amount > 9_007_199_254_740_991L || amount < -9_007_199_254_740_991L) reasons.add(SpendingExclusionReason.INVALID_AMOUNT);
        else if (amount <= 0) reasons.add(SpendingExclusionReason.NON_POSITIVE_AMOUNT);
        if (canonicalStatus == CanonicalStatus.CANCELLED) reasons.add(SpendingExclusionReason.CANCELLED);
        if (canonicalStatus == CanonicalStatus.UNKNOWN) reasons.add(SpendingExclusionReason.UNKNOWN_STATUS);
        // Classification is separate: unclassified spending stays visible in an explicit bucket.
        return new TransactionFoundation(id, date, amount, status, canonicalStatus,
                available ? categoryId : null, available ? categoryLabel : null, merchant,
                classification, appliedRuleId, persisted, "spending-v1", reasons.isEmpty(), List.copyOf(reasons));
    }

    private static boolean validDate(String value) {
        if (value == null || !value.matches("\\d{4}-\\d{2}-\\d{2}")) return false;
        try {
            return LocalDate.parse(value).toString().equals(value);
        } catch (DateTimeParseException e) {
            return false;
        }
    }
}
