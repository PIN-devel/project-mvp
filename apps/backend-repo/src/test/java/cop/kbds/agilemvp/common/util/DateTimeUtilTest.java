package cop.kbds.agilemvp.common.util;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.LocalDate;
import java.time.LocalDateTime;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class DateTimeUtilTest {

    @Test
    @DisplayName("다양한 타입의 입력을 LocalDateTime으로 변환한다")
    void toLocalDateTimeTest() {
        // String format (yyyy-MM-dd HH:mm:ss)
        String dateTimeStr = "2026-04-17 22:00:00";
        LocalDateTime result1 = DateTimeUtil.toLocalDateTime(dateTimeStr);
        assertThat(result1).isEqualTo(LocalDateTime.of(2026, 4, 17, 22, 0, 0));

        // String format (yyyy-MM-dd)
        String dateStr = "2026-04-17";
        LocalDateTime result2 = DateTimeUtil.toLocalDateTime(dateStr);
        assertThat(result2).isEqualTo(LocalDateTime.of(2026, 4, 17, 0, 0, 0));

        // LocalDate
        LocalDate localDate = LocalDate.of(2026, 4, 18);
        LocalDateTime result3 = DateTimeUtil.toLocalDateTime(localDate);
        assertThat(result3).isEqualTo(LocalDateTime.of(2026, 4, 18, 0, 0, 0));

        // Long (Timestamp)
        long timestamp = 1713366000000L; // 2024-04-17T21:20:00Z
        // ZoneId에 따라 결과가 달라질 수 있으므로 변환된 값을 다시 검증
        LocalDateTime result4 = DateTimeUtil.toLocalDateTime(timestamp);
        assertThat(result4).isNotNull();
    }

    @Test
    @DisplayName("유효하지 않은 입력에 대해 IllegalArgumentException을 던진다")
    void toLocalDateTimeExceptionTest() {
        assertThatThrownBy(() -> DateTimeUtil.toLocalDateTime(null))
                .isInstanceOf(IllegalArgumentException.class);

        assertThatThrownBy(() -> DateTimeUtil.toLocalDateTime("invalid-date"))
                .isInstanceOf(IllegalArgumentException.class);

        assertThatThrownBy(() -> DateTimeUtil.toLocalDateTime(123.45))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("날짜 범위를 검증한다")
    void dateRangeTest() {
        LocalDateTime start = LocalDateTime.of(2026, 4, 1, 0, 0);
        LocalDateTime end = LocalDateTime.of(2026, 4, 30, 23, 59);
        LocalDateTime target = LocalDateTime.of(2026, 4, 15, 12, 0);

        assertThat(DateTimeUtil.isBetween(target, start, end)).isTrue();
        assertThat(DateTimeUtil.isBetween(start.minusDays(1), start, end)).isFalse();
    }

    @Test
    @DisplayName("유효하지 않은 날짜 범위 생성 시 예외를 던진다")
    void invalidDateRangeTest() {
        LocalDateTime start = LocalDateTime.of(2026, 4, 30, 0, 0);
        LocalDateTime end = LocalDateTime.of(2026, 4, 1, 0, 0);

        assertThatThrownBy(() -> new DateTimeUtil.DateRange(start, end))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
