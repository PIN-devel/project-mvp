package cop.kbds.agilemvp.common.util;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.math.BigDecimal;
import java.util.Locale;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class NumberUtilTest {

    @Test
    @DisplayName("안전한 나눗셈을 수행한다")
    void divideTest() {
        BigDecimal a = new BigDecimal("10");
        BigDecimal b = new BigDecimal("3");
        
        BigDecimal result = NumberUtil.divide(a, b);
        assertThat(result).isEqualTo(new BigDecimal("3.33"));
    }

    @Test
    @DisplayName("0으로 나눌 경우 예외를 던진다")
    void divideByZeroTest() {
        assertThatThrownBy(() -> NumberUtil.divide(BigDecimal.TEN, BigDecimal.ZERO))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("다양한 타입을 BigDecimal로 변환한다")
    void toBigDecimalTest() {
        assertThat(NumberUtil.toBigDecimal(10)).isEqualTo(new BigDecimal("10"));
        assertThat(NumberUtil.toBigDecimal(10L)).isEqualTo(new BigDecimal("10"));
        assertThat(NumberUtil.toBigDecimal("10.5")).isEqualTo(new BigDecimal("10.5"));
        assertThat(NumberUtil.toBigDecimal(10.5)).isEqualTo(new BigDecimal("10.5"));
    }

    @Test
    @DisplayName("통화 형식을 포맷팅한다")
    void formatCurrencyTest() {
        String formatted = NumberUtil.formatCurrency(1000, Locale.KOREA);
        assertThat(formatted).contains("1,000");
    }

    @Test
    @DisplayName("퍼센트 형식을 포맷팅한다")
    void formatPercentTest() {
        String formatted = NumberUtil.formatPercent(0.125);
        assertThat(formatted).contains("12.5");
    }
}
