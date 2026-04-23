package cop.kbds.agilemvp.common.util;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import cop.kbds.agilemvp.common.exception.BusinessException;
import cop.kbds.agilemvp.common.exception.CommonErrorCode;

class BusinessValidatorTest {

    @Test
    @DisplayName("조건이 false일 때 예외를 던진다")
    void throwIfFalseTest() {
        assertThatThrownBy(() -> BusinessValidator.validate(false)
                .throwIfFalse(CommonErrorCode.INVALID_INPUT_VALUE))
                .isInstanceOf(BusinessException.class);
    }

    @Test
    @DisplayName("조건이 true일 때 예외를 던지지 않는다")
    void throwIfFalseSuccessTest() {
        BusinessValidator.validate(true)
                .throwIfFalse(CommonErrorCode.INVALID_INPUT_VALUE);
    }

    @Test
    @DisplayName("조건이 true일 때 예외를 던진다")
    void throwIfTrueTest() {
        assertThatThrownBy(() -> BusinessValidator.validate(true)
                .throwIfTrue(CommonErrorCode.INVALID_INPUT_VALUE))
                .isInstanceOf(BusinessException.class);
    }

    @Test
    @DisplayName("null 체크 검증을 수행한다")
    void validateNonNullTest() {
        assertThatThrownBy(() -> BusinessValidator.validateNonNull(null, CommonErrorCode.INVALID_INPUT_VALUE))
                .isInstanceOf(BusinessException.class);
    }

    @Test
    @DisplayName("공백 체크 검증을 수행한다")
    void validateNotBlankTest() {
        assertThatThrownBy(() -> BusinessValidator.validateNotBlank("  ", CommonErrorCode.INVALID_INPUT_VALUE))
                .isInstanceOf(BusinessException.class);
    }
}
