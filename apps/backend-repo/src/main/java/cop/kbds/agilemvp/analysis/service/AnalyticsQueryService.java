package cop.kbds.agilemvp.analysis.service;

import static cop.kbds.agilemvp.analysis.service.AnalyticsSnapshot.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.TreeMap;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import cop.kbds.agilemvp.common.exception.BusinessException;
import cop.kbds.agilemvp.common.exception.CommonErrorCode;
import cop.kbds.agilemvp.transaction.service.Classification;
import cop.kbds.agilemvp.transaction.service.TransactionFoundation;
import cop.kbds.agilemvp.transaction.service.TransactionService;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class AnalyticsQueryService {
    private static final long MAX_SAFE_INTEGER = 9_007_199_254_740_991L;
    private final TransactionService transactions;
    private final ObjectMapper json = new ObjectMapper();

    @Transactional(readOnly = true)
    public AnalyticsSnapshot query(Long userId, Query input) {
        Query query = normalize(input);
        var stored = transactions.findAll(userId).stream()
                .filter(t -> t.getFoundation().persisted())
                .filter(t -> query.cardNames().isEmpty() || query.cardNames().contains(Objects.toString(t.getCardName(), "")))
                .sorted(Comparator.comparing(t -> t.getId())).toList();
        var validDates = stored.stream().map(t -> t.getFoundation())
                .filter(f -> !f.spendingExclusionReasons().contains(TransactionFoundation.SpendingExclusionReason.INVALID_DATE))
                .map(f -> LocalDate.parse(f.occurredOn())).sorted().toList();
        LocalDate end = query.endExclusive() == null
                ? validDates.isEmpty() ? null : validDates.getLast().plusDays(1)
                : date(query.endExclusive());
        LocalDate start = query.start() == null
                ? validDates.isEmpty() ? null : switch (query.period()) {
                    case "LAST_1_MONTH" -> validDates.getLast().minusMonths(1).plusDays(1);
                    case "LAST_3_MONTHS" -> validDates.getLast().minusMonths(3).plusDays(1);
                    default -> validDates.getFirst();
                } : date(query.start());
        if (start != null && end != null && !start.isBefore(end)) invalid();
        Period period = new Period(start == null ? null : start.toString(), end == null ? null : end.toString());
        SourceScope source = new SourceScope(query.cardNames().isEmpty() ? "ALL_CARDS" : "SELECTED_CARDS",
                query.cardNames().isEmpty() ? stored.stream().map(t -> Objects.toString(t.getCardName(), "")).distinct().sorted().toList() : query.cardNames());
        // An invalid date cannot be assigned to a period: keep it visible as a scope-quality risk.
        var scoped = stored.stream().filter(t -> {
            var f = t.getFoundation();
            if (f.spendingExclusionReasons().contains(TransactionFoundation.SpendingExclusionReason.INVALID_DATE)) return true;
            LocalDate day = LocalDate.parse(f.occurredOn());
            return (start == null || !day.isBefore(start)) && (end == null || day.isBefore(end));
        }).toList();
        var selected = scoped.stream().filter(t -> query.categoryIds().isEmpty()
                || query.categoryIds().contains(t.getFoundation().categoryId())).toList();
        var records = selected.stream().map(t -> new AnalyticsSnapshot.Record(t.getFoundation(), t.getCardName(), key(t.getFoundation())))
                .filter(t -> t.foundation().spendingEligible())
                .sorted(Comparator.comparing((AnalyticsSnapshot.Record r) -> r.foundation().occurredOn())
                        .thenComparing(r -> r.foundation().transactionId())).toList();
        long total = sum(records);
        Map<String, List<AnalyticsSnapshot.Record>> categoryGroups = new TreeMap<>();
        Map<String, List<AnalyticsSnapshot.Record>> merchantGroups = new TreeMap<>();
        for (var r : records) {
            categoryGroups.computeIfAbsent(r.categoryKey(), k -> new ArrayList<>()).add(r);
            // Exact raw string plus category; no inferred merchant identity or alias merging.
            String merchantKey = hash(encode(List.of(r.categoryKey(), Objects.toString(r.foundation().merchantRawName(), ""))));
            merchantGroups.computeIfAbsent(merchantKey, k -> new ArrayList<>()).add(r);
        }
        List<Aggregate> categories = aggregates(categoryGroups, total, records.size(), false);
        List<Aggregate> merchants = aggregates(merchantGroups, total, records.size(), true);
        String unit = start != null && end != null && ChronoUnit.DAYS.between(start, end) > 93 ? "month" : "day";
        Map<String, List<AnalyticsSnapshot.Record>> timeGroups = new TreeMap<>();
        for (var r : records) timeGroups.computeIfAbsent(r.foundation().occurredOn().substring(0, unit.equals("month") ? 7 : 10),
                k -> new ArrayList<>()).add(r);
        // Unknown gaps have no fabricated zero bucket. Coverage confirmation belongs to Stage 3.
        List<TimeBucket> time = timeGroups.entrySet().stream().map(e -> {
            Map<String, Long> amounts = new TreeMap<>();
            for (var r : e.getValue()) amounts.merge(r.categoryKey(), r.foundation().amount(), this::safeAdd);
            return new TimeBucket(e.getKey(), sum(e.getValue()), e.getValue().size(), ids(e.getValue()), amounts);
        }).toList();
        Map<String, Integer> reasons = new TreeMap<>();
        for (var t : selected) for (var reason : t.getFoundation().spendingExclusionReasons()) reasons.merge(reason.name(), 1, Integer::sum);
        var unclassified = records.stream().filter(r -> r.foundation().classification() == Classification.UNCLASSIFIED).toList();
        var inconsistent = records.stream().filter(r -> r.foundation().classification() == Classification.INCONSISTENT).toList();
        Quality quality = new Quality(scoped.size(), selected.size(), selected.size() - records.size(), reasons,
                unclassified.size(), sum(unclassified), inconsistent.size(), sum(inconsistent),
                (int) scoped.stream().filter(t -> t.getFoundation().spendingEligible() && t.getFoundation().classification() == Classification.UNCLASSIFIED).count(),
                (int) scoped.stream().filter(t -> t.getFoundation().spendingEligible() && t.getFoundation().classification() == Classification.INCONSISTENT).count(),
                (int) scoped.stream().filter(t -> t.getFoundation().spendingExclusionReasons().stream().anyMatch(r ->
                        List.of(TransactionFoundation.SpendingExclusionReason.UNKNOWN_STATUS, TransactionFoundation.SpendingExclusionReason.INVALID_DATE,
                                TransactionFoundation.SpendingExclusionReason.INVALID_AMOUNT).contains(r))).count(),
                "UNKNOWN", "NOT_CONFIRMED", List.of("카드 자료의 기간 완결성은 확인되지 않았습니다.",
                "거래가 없는 구간은 소비 0원으로 해석하지 않습니다.", "취소 표시를 제외한 승인 내역 합계이며 순현금 흐름이 아닙니다."));
        // Explicit periods keep a stable reference when later months receive new records.
        // Rolling/ALL queries still include the source rows that determine their period anchor.
        String revision = hash(encode(List.of("spending-v1", query, period, source,
                (query.start() == null ? stored : scoped).stream()
                        .map(t -> List.of(t.getFoundation(), Objects.toString(t.getCardName(), ""))).toList())));
        List<Evidence> evidence = new ArrayList<>();
        List<Observation> observations = new ArrayList<>();
        evidence.add(evidence("total.amount", "TOTAL_AMOUNT", BigDecimal.valueOf(total), "KRW", null, period, source, "ALL", null, null, null, ids(records)));
        evidence.add(evidence("total.count", "TRANSACTION_COUNT", BigDecimal.valueOf(records.size()), "COUNT", null, period, source, "ALL", null, null, null, ids(records)));
        for (var c : categories) addAggregateEvidence(c, "category", period, source, total, evidence);
        for (var m : merchants) addAggregateEvidence(m, "merchant", period, source, total, evidence);
        for (var t : time) {
            evidence.add(evidence("time." + t.date(), "TIME_AMOUNT", BigDecimal.valueOf(t.amount()), "KRW", null, period, source, t.date(), null, null, null, t.transactionIds()));
        }
        categories.stream().limit(5).forEach(c -> observations.add(new Observation("obs.category." + c.key(), "CATEGORY_DISTRIBUTION", c.key(), c.categoryId(), refs("category", c.key()))));
        time.stream().max(Comparator.comparingLong(TimeBucket::amount)).ifPresent(t -> observations.add(
                new Observation("obs.peak", "OBSERVED_TIME_PEAK", t.date(), null, List.of("time." + t.date(), "total.amount"))));
        merchants.stream().filter(m -> m.count() >= 2).limit(5).forEach(m -> observations.add(
                new Observation("obs.merchant." + m.key(), "REPEATED_RAW_MERCHANT", m.key(), m.categoryId(), refs("merchant", m.key()))));
        return new AnalyticsSnapshot(query, period, source, "spending-v1", revision, total, records.size(), records,
                categories, time, merchants, unit, quality, List.copyOf(evidence), List.copyOf(observations));
    }

    private Query normalize(Query q) {
        if (q == null) invalid();
        String p = q.period() == null ? "ALL" : q.period();
        if (!List.of("ALL", "LAST_1_MONTH", "LAST_3_MONTHS").contains(p)) invalid();
        if ((q.start() == null) != (q.endExclusive() == null)) invalid();
        if (q.start() != null) { date(q.start()); date(q.endExclusive()); }
        List<Long> categories = q.categoryIds() == null ? List.of() : q.categoryIds();
        List<String> cards = q.cardNames() == null ? List.of() : q.cardNames();
        if (categories.stream().anyMatch(id -> id == null || id <= 0) || cards.stream().anyMatch(Objects::isNull)) invalid();
        return new Query(p, q.start(), q.endExclusive(), categories.stream().distinct().sorted().toList(), cards.stream().distinct().sorted().toList());
    }
    private LocalDate date(String s) {
        try {
            LocalDate d = LocalDate.parse(s);
            if (!d.toString().equals(s)) invalid();
            return d;
        } catch (java.time.DateTimeException e) { throw new BusinessException(CommonErrorCode.INVALID_INPUT); }
    }
    private void invalid() { throw new BusinessException(CommonErrorCode.INVALID_INPUT); }
    private String key(TransactionFoundation f) {
        return switch (f.classification()) {
            case CLASSIFIED -> "id:" + f.categoryId();
            case UNCLASSIFIED -> "unclassified";
            case INCONSISTENT -> "inconsistent";
        };
    }
    private List<Long> ids(List<AnalyticsSnapshot.Record> rows) { return rows.stream().map(r -> r.foundation().transactionId()).toList(); }
    private long sum(List<AnalyticsSnapshot.Record> rows) { return rows.stream().mapToLong(r -> r.foundation().amount()).reduce(0, this::safeAdd); }
    private long safeAdd(long a, long b) {
        if (a > MAX_SAFE_INTEGER - b) throw new BusinessException(AnalysisErrorCode.UNSAFE_TOTAL);
        return a + b;
    }
    private BigDecimal share(long value, long total) {
        return total == 0 ? BigDecimal.ZERO : BigDecimal.valueOf(value).multiply(BigDecimal.valueOf(100)).divide(BigDecimal.valueOf(total), 1, RoundingMode.HALF_UP);
    }
    private List<Aggregate> aggregates(Map<String, List<AnalyticsSnapshot.Record>> groups, long total, int count, boolean merchant) {
        return groups.entrySet().stream().map(e -> {
            var first = e.getValue().getFirst(); var f = first.foundation(); long amount = sum(e.getValue());
            boolean classified = f.classification() == Classification.CLASSIFIED;
            String label = classified ? f.categoryLabel() : f.classification() == Classification.UNCLASSIFIED ? "미분류" : "분류 확인 필요";
            return new Aggregate(e.getKey(), classified ? f.categoryId() : null, label, merchant ? f.merchantRawName() : null,
                    amount, e.getValue().size(), share(amount, total), share(e.getValue().size(), count), ids(e.getValue()));
        }).sorted(Comparator.comparingLong(Aggregate::amount).reversed().thenComparing(Aggregate::key)).toList();
    }
    private List<String> refs(String type, String key) { return List.of(type + "." + key + ".amount", type + "." + key + ".count", type + "." + key + ".share"); }
    private void addAggregateEvidence(Aggregate a, String type, Period period, SourceScope source, long total, List<Evidence> out) {
        var ids = refs(type, a.key());
        out.add(evidence(ids.get(0), type.toUpperCase() + "_AMOUNT", BigDecimal.valueOf(a.amount()), "KRW", null, period, source, a.key(), a.categoryId(), a.categoryLabel(), a.merchantRawName(), a.transactionIds()));
        out.add(evidence(ids.get(1), type.toUpperCase() + "_COUNT", BigDecimal.valueOf(a.count()), "COUNT", null, period, source, a.key(), a.categoryId(), a.categoryLabel(), a.merchantRawName(), a.transactionIds()));
        out.add(evidence(ids.get(2), type.toUpperCase() + "_SHARE", a.amountShare(), "PERCENT", BigDecimal.valueOf(total), period, source, a.key(), a.categoryId(), a.categoryLabel(), a.merchantRawName(), a.transactionIds()));
    }
    private Evidence evidence(String id, String metric, BigDecimal value, String unit, BigDecimal denominator, Period period, SourceScope source, String scope, Long categoryId, String label, String merchant, List<Long> ids) {
        return new Evidence(id, metric, value, unit, denominator, period, source, scope, categoryId, label, merchant, ids);
    }
    private String encode(Object o) {
        try { return json.writeValueAsString(o); } catch (JsonProcessingException e) { throw new IllegalStateException("Cannot encode analytics basis", e); }
    }
    private String hash(String value) {
        try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8))); }
        catch (NoSuchAlgorithmException e) { throw new IllegalStateException(e); }
    }
}
