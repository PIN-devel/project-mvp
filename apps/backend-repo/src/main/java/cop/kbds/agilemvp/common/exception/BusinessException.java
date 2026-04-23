package cop.kbds.agilemvp.common.exception;

import lombok.Getter;

/**
 * 전역 비즈니스 커스텀 예외
 */
@Getter
public class BusinessException extends RuntimeException {

    private final ErrorCode errorCode;
    private final Object data;

    public BusinessException(ErrorCode errorCode) {
        this(errorCode, errorCode.getMessage(), null);
    }

    public BusinessException(ErrorCode errorCode, String customMessage) {
        this(errorCode, customMessage, null);
    }

    public BusinessException(ErrorCode errorCode, Object data) {
        this(errorCode, errorCode.getMessage(), data);
    }

    public BusinessException(ErrorCode errorCode, String customMessage, Object data) {
        super(customMessage);
        this.errorCode = errorCode;
        this.data = data;
    }
}
