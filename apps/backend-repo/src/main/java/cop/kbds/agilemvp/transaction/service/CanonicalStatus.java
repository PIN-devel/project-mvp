package cop.kbds.agilemvp.transaction.service;

import java.util.Locale;

public enum CanonicalStatus {
    APPROVED, CANCELLED, UNKNOWN;

    /** Exact known values only; the caller retains the original status. */
    public static CanonicalStatus fromRaw(String rawStatus) {
        if (rawStatus == null) return UNKNOWN;
        return switch (rawStatus.trim().toLowerCase(Locale.ROOT)) {
            case "승인", "approved" -> APPROVED;
            case "취소", "cancelled", "canceled" -> CANCELLED;
            default -> UNKNOWN;
        };
    }
}
