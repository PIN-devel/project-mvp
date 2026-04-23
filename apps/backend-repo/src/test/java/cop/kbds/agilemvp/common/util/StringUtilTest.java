package cop.kbds.agilemvp.common.util;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class StringUtilTest {

    @Test
    @DisplayName("문자열 공백 여부를 확인한다")
    void blankTest() {
        assertThat(StringUtil.isBlank(null)).isTrue();
        assertThat(StringUtil.isBlank("")).isTrue();
        assertThat(StringUtil.isBlank("  ")).isTrue();
        assertThat(StringUtil.isBlank("abc")).isFalse();

        assertThat(StringUtil.isNotBlank("abc")).isTrue();
    }

    @Test
    @DisplayName("문자열을 마스킹 처리한다")
    void maskTest() {
        String original = "010-1234-5678";
        String masked = StringUtil.mask(original, 4, 8);
        assertThat(masked).isEqualTo("010-****-5678");
    }

    @Test
    @DisplayName("유효하지 않은 범위의 마스킹 요청 시 예외를 던진다")
    void maskExceptionTest() {
        assertThatThrownBy(() -> StringUtil.mask("abc", 1, 5))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("문자열 길이를 제한한다")
    void truncateTest() {
        assertThat(StringUtil.truncate("Hello World", 5)).isEqualTo("Hello...");
        assertThat(StringUtil.truncate("Hi", 5)).isEqualTo("Hi");
        assertThat(StringUtil.truncate(null, 5)).isNull();
    }

    @Test
    @DisplayName("텍스트 블록의 들여쓰기를 제거한다")
    void stripIndentTest() {
        String indented = """
                Line 1
                Line 2
                """;
        String stripped = StringUtil.stripIndent(indented);
        assertThat(stripped).startsWith("Line 1");
    }
}
