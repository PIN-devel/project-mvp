package cop.kbds.agilemvp.analysis.service;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

import cop.kbds.agilemvp.transaction.service.TransactionFoundation;

/** Server-calculated, immutable input for Scenes, interpretation and future Goal verification. */
public record AnalyticsSnapshot(
        Query query, Period period, SourceScope sourceScope, String basisVersion, String dataRevision,
        long totalAmount, int transactionCount, List<Record> records,
        List<Aggregate> categories, List<TimeBucket> timeBuckets, List<Aggregate> merchants,
        String timeUnit, Quality quality, List<Evidence> evidence, List<Observation> observations) {

    public record Query(String period, String start, String endExclusive,
                        List<Long> categoryIds, List<String> cardNames) {}
    public record Period(String start, String endExclusive) {}
    public record SourceScope(String kind, List<String> cardNames) {}
    public record Record(TransactionFoundation foundation, String cardName, String categoryKey) {}
    public record Aggregate(String key, Long categoryId, String categoryLabel, String merchantRawName,
                            long amount, int count, BigDecimal amountShare, BigDecimal countShare,
                            List<Long> transactionIds) {}
    public record TimeBucket(String date, long amount, int count, List<Long> transactionIds,
                             Map<String, Long> categoryAmounts) {}
    public record Quality(int sourceTransactionCount, int selectedTransactionCount, int excludedCount,
                          Map<String, Integer> exclusionReasons, int unclassifiedCount, long unclassifiedAmount,
                          int inconsistentCount, long inconsistentAmount, int sourceUnclassifiedCount,
                          int sourceInconsistentCount, int unresolvedSourceCount, String coverage, String comparability,
                          List<String> limitations) {}
    public record Evidence(String id, String metric, BigDecimal value, String unit, BigDecimal denominator,
                           Period period, SourceScope sourceScope, String scopeKey, Long categoryId,
                           String categoryLabel, String merchantRawName, List<Long> transactionIds) {}
    public record Observation(String id, String kind, String scopeKey, Long categoryId, List<String> evidenceIds) {}
}
