package cop.kbds.agilemvp.common.util;

import cop.kbds.agilemvp.common.exception.BusinessException;
import cop.kbds.agilemvp.common.exception.ErrorCode;

/**
 * 서비스 계층에서 유연하게 사용할 수 있는 비즈니스 검증 유틸리티 (Fluent API)
 */
public final class BusinessValidator {

    private final boolean condition;

    private BusinessValidator(boolean condition) {
        this.condition = condition;
    }

    /**
     * 검증할 조건을 입력받습니다.
     */
    public static BusinessValidator validate(boolean condition) {
        return new BusinessValidator(condition);
    }

    /**
     * 조건이 false일 경우 예외를 던집니다.
     */
    public void throwIfFalse(ErrorCode errorCode) {
        if (!condition) {
            throw new BusinessException(errorCode);
        }
    }

    /**
     * 조건이 false일 경우 커스텀 메시지와 함께 예외를 던집니다.
     */
    public void throwIfFalse(ErrorCode errorCode, String customMessage) {
        if (!condition) {
            throw new BusinessException(errorCode, customMessage);
        }
    }

    /**
     * 조건이 true일 경우 예외를 던집니다.
     */
    public void throwIfTrue(ErrorCode errorCode) {
        if (condition) {
            throw new BusinessException(errorCode);
        }
    }

    /**
     * 조건이 true일 경우 커스텀 메시지와 함께 예외를 던집니다.
     */
    public void throwIfTrue(ErrorCode errorCode, String customMessage) {
        if (condition) {
            throw new BusinessException(errorCode, customMessage);
        }
    }

    /**
     * 객체가 null일 경우 예외를 던집니다.
     */
    public static void validateNonNull(Object target, ErrorCode errorCode) {
        if (target == null) {
            throw new BusinessException(errorCode);
        }
    }

    /**
     * 문자열이 비어있을 경우 예외를 던집니다.
     */
    public static void validateNotBlank(String target, ErrorCode errorCode) {
        if (StringUtil.isBlank(target)) {
            throw new BusinessException(errorCode);
        }
    }
}
