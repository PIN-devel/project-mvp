package cop.kbds.agilemvp.common.util;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.Objects;

/**
 * 모던 자바(Java 25) 기능을 활용한 날짜 유틸리티
 */
public final class DateTimeUtil {

    private static final String DEFAULT_DATE_TIME_FORMAT = "yyyy-MM-dd HH:mm:ss";
    private static final String DEFAULT_DATE_FORMAT = "yyyy-MM-dd";
    private static final ZoneId DEFAULT_ZONE = ZoneId.systemDefault();

    private DateTimeUtil() {
        throw new UnsupportedOperationException("Utility class");
    }

    /**
     * 날짜 범위를 표현하는 Record
     */
    public record DateRange(LocalDateTime start, LocalDateTime end) {
        public DateRange {
            Objects.requireNonNull(start, "시작일은 필수입니다.");
            Objects.requireNonNull(end, "종료일은 필수입니다.");
            if (start.isAfter(end)) {
                throw new IllegalArgumentException("시작일이 종료일보다 늦을 수 없습니다.");
            }
        }

        public boolean contains(LocalDateTime target) {
            return !target.isBefore(start) && !target.isAfter(end);
        }
    }

    /**
     * 입력을 LocalDateTime으로 변환 (Pattern Matching for switch 활용)
     *
     * @param input String, Long, Instant, LocalDate 등
     * @return LocalDateTime
     */
    public static LocalDateTime toLocalDateTime(Object input) {
        return switch (input) {
            case null -> throw new IllegalArgumentException("입력값이 null입니다.");
            case LocalDateTime ldt -> ldt;
            case LocalDate ld -> ld.atStartOfDay();
            case Instant instant -> LocalDateTime.ofInstant(instant, DEFAULT_ZONE);
            case Long timestamp -> LocalDateTime.ofInstant(Instant.ofEpochMilli(timestamp), DEFAULT_ZONE);
            case String str when str.matches("\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}:\\d{2}") -> 
                LocalDateTime.parse(str, DateTimeFormatter.ofPattern(DEFAULT_DATE_TIME_FORMAT));
            case String str when str.matches("\\d{4}-\\d{2}-\\d{2}") -> 
                LocalDate.parse(str, DateTimeFormatter.ofPattern(DEFAULT_DATE_FORMAT)).atStartOfDay();
            case String str -> {
                try {
                    yield LocalDateTime.parse(str, DateTimeFormatter.ISO_DATE_TIME);
                } catch (DateTimeParseException e) {
                    throw new IllegalArgumentException("지원하지 않는 날짜 형식입니다: " + str);
                }
            }
            default -> throw new IllegalArgumentException("지원하지 않는 타입입니다: " + input.getClass().getName());
        };
    }

    public static String format(LocalDateTime dateTime) {
        return format(dateTime, DEFAULT_DATE_TIME_FORMAT);
    }

    public static String format(LocalDateTime dateTime, String pattern) {
        Objects.requireNonNull(dateTime, "날짜 값은 필수입니다.");
        return dateTime.format(DateTimeFormatter.ofPattern(pattern));
    }

    public static boolean isBetween(LocalDateTime target, LocalDateTime start, LocalDateTime end) {
        return new DateRange(start, end).contains(target);
    }
}
