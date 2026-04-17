package cop.kbds.agilemvp.common.util;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.text.NumberFormat;
import java.util.Locale;

/**
 * 모던 자바(Java 25) 기능을 활용한 숫자 유틸리티
 */
public final class NumberUtil {

    private static final int DEFAULT_SCALE = 2;
    private static final RoundingMode DEFAULT_ROUNDING_MODE = RoundingMode.HALF_UP;

    private NumberUtil() {
        throw new UnsupportedOperationException("Utility class");
    }

    /**
     * 안전한 나눗셈 (BigDecimal)
     */
    public static BigDecimal divide(BigDecimal dividend, BigDecimal divisor) {
        return divide(dividend, divisor, DEFAULT_SCALE, DEFAULT_ROUNDING_MODE);
    }

    public static BigDecimal divide(BigDecimal dividend, BigDecimal divisor, int scale, RoundingMode roundingMode) {
        if (dividend == null || divisor == null) {
            throw new IllegalArgumentException("피연산자는 null일 수 없습니다.");
        }
        if (divisor.compareTo(BigDecimal.ZERO) == 0) {
            throw new IllegalArgumentException("0으로 나눌 수 없습니다.");
        }
        return dividend.divide(divisor, scale, roundingMode);
    }

    /**
     * 다양한 타입의 입력을 BigDecimal로 안전하게 변환 (Pattern Matching for switch 활용)
     */
    public static BigDecimal toBigDecimal(Object input) {
        return switch (input) {
            case null -> throw new IllegalArgumentException("입력값이 null입니다.");
            case BigDecimal bd -> bd;
            case Integer i -> BigDecimal.valueOf(i);
            case Long l -> BigDecimal.valueOf(l);
            case Double d -> BigDecimal.valueOf(d);
            case String s -> new BigDecimal(s);
            default -> throw new IllegalArgumentException("지원하지 않는 숫자 타입입니다: " + input.getClass().getName());
        };
    }

    /**
     * 통화 형식 포맷팅 (KRW 기본)
     */
    public static String formatCurrency(Number number) {
        return formatCurrency(number, Locale.KOREA);
    }

    public static String formatCurrency(Number number, Locale locale) {
        if (number == null) {
            throw new IllegalArgumentException("숫자 값은 필수입니다.");
        }
        return NumberFormat.getCurrencyInstance(locale).format(number);
    }

    /**
     * 퍼센트 형식 포맷팅
     */
    public static String formatPercent(Number number) {
        if (number == null) {
            throw new IllegalArgumentException("숫자 값은 필수입니다.");
        }
        NumberFormat percentInstance = NumberFormat.getPercentInstance();
        percentInstance.setMinimumFractionDigits(1);
        return percentInstance.format(number);
    }
}
