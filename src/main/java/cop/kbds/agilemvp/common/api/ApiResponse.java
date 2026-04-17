package cop.kbds.agilemvp.common.api;

import cop.kbds.agilemvp.common.exception.ErrorCode;
import org.slf4j.MDC;
import java.util.Map;
import java.util.HashMap;

/**
 * API 공통 응답 규격
 */
public record ApiResponse<T>(
        boolean success,
        String errorCode,
        String message,
        T data) {
    public static <T> ApiResponse<T> success(T data) {
        return new ApiResponse<>(true, null, "요청이 성공적으로 처리되었습니다.", data);
    }

    public static <T> ApiResponse<T> success(T data, String message) {
        return new ApiResponse<>(true, null, message, data);
    }

    public static <T> ApiResponse<T> error(ErrorCode errorCode) {
        return error(errorCode, errorCode.getMessage());
    }

    @SuppressWarnings("unchecked")
    public static <T> ApiResponse<T> error(ErrorCode errorCode, String customMessage) {
        Map<String, Object> errorData = new HashMap<>();
        errorData.put("traceId", getTraceId());
        return new ApiResponse<>(false, errorCode.getCode(), customMessage, (T) errorData);
    }

    public static <T> ApiResponse<T> error(ErrorCode errorCode, T data) {
        return new ApiResponse<>(false, errorCode.getCode(), errorCode.getMessage(), data);
    }

    public static <T> ApiResponse<T> error(ErrorCode errorCode, String message, T data) {
        return new ApiResponse<>(false, errorCode.getCode(), message, data);
    }

    @SuppressWarnings("unchecked")
    public static <T> ApiResponse<T> error(String message) {
        Map<String, Object> errorData = new HashMap<>();
        errorData.put("traceId", getTraceId());
        return new ApiResponse<>(false, "UNKNOWN_ERROR", message, (T) errorData);
    }

    private static String getTraceId() {
        return MDC.get("traceId");
    }
}
