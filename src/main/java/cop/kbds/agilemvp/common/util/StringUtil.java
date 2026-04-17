package cop.kbds.agilemvp.common.util;

/**
 * 모던 자바(Java 25) 기능을 활용한 문자열 유틸리티
 */
public final class StringUtil {

    private StringUtil() {
        throw new UnsupportedOperationException("Utility class");
    }

    /**
     * 문자열이 비어있거나 공백인지 확인
     */
    public static boolean isBlank(String str) {
        return str == null || str.isBlank();
    }

    /**
     * 문자열이 비어있지 않고 공백도 아님을 확인
     */
    public static boolean isNotBlank(String str) {
        return !isBlank(str);
    }

    /**
     * 문자열 마스킹 (개인정보 보호 등)
     *
     * @param str   원본 문자열
     * @param start 마스킹 시작 인덱스 (포함)
     * @param end   마스킹 종료 인덱스 (미포함)
     * @return 마스킹된 문자열
     */
    public static String mask(String str, int start, int end) {
        if (str == null) {
            throw new IllegalArgumentException("문자열이 null입니다.");
        }
        if (start < 0 || end > str.length() || start > end) {
            throw new IllegalArgumentException("유효하지 않은 인덱스 범위입니다.");
        }

        String target = str.substring(start, end);
        String masked = "*".repeat(target.length());

        return str.substring(0, start) + masked + str.substring(end);
    }

    /**
     * 문자열 길이를 제한하고 생략 부호(...) 추가
     */
    public static String truncate(String str, int maxLength) {
        if (str == null)
            return null;
        if (maxLength < 0)
            throw new IllegalArgumentException("maxLength는 0 이상이어야 합니다.");

        return str.length() <= maxLength ? str : str.substring(0, maxLength) + "...";
    }

    /**
     * 텍스트 블록의 들여쓰기 최적화 (Java 15+ 기능을 명시적으로 활용)
     */
    public static String stripIndent(String str) {
        return str == null ? null : str.stripIndent();
    }
}
