package cop.kbds.agilemvp.common.api;

import cop.kbds.agilemvp.common.exception.ErrorCode;

/**
 * API 공통 응답 규격
 */
public record ApiResponse<T>(
        boolean success,
        String errorCode,
        String message,
        T data
) {
    public static <T> ApiResponse<T> success(T data) {
        return new ApiResponse<>(true, null, "요청이 성공적으로 처리되었습니다.", data);
    }

    public static <T> ApiResponse<T> success(T data, String message) {
        return new ApiResponse<>(true, null, message, data);
    }

    public static <T> ApiResponse<T> error(ErrorCode errorCode) {
        return new ApiResponse<>(false, errorCode.getCode(), errorCode.getMessage(), null);
    }

    public static <T> ApiResponse<T> error(ErrorCode errorCode, String customMessage) {
        return new ApiResponse<>(false, errorCode.getCode(), customMessage, null);
    }

    public static <T> ApiResponse<T> error(String message) {
        return new ApiResponse<>(false, "UNKNOWN_ERROR", message, null);
    }
}
