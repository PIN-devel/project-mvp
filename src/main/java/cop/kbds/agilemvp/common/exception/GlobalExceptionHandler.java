package cop.kbds.agilemvp.common.exception;

import org.slf4j.MDC;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.BindException;
import org.springframework.validation.FieldError;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import cop.kbds.agilemvp.common.api.ApiResponse;
import lombok.extern.slf4j.Slf4j;

import java.util.HashMap;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * 전역 예외 처리 핸들러
 */
@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(BusinessException.class)
    protected ResponseEntity<ApiResponse<Object>> handleBusinessException(BusinessException e) {
        log.warn("BusinessException: {}", e.getMessage());
        ErrorCode errorCode = e.getErrorCode();
        
        if (e.getData() != null) {
            return ResponseEntity.status(errorCode.getHttpStatus())
                    .body(ApiResponse.error(errorCode, e.getMessage(), e.getData()));
        }
        
        return ResponseEntity.status(errorCode.getHttpStatus())
                .body(ApiResponse.error(errorCode, e.getMessage()));
    }

    /**
     * HTTP 요청 메시지 파싱 에러 또는 바디 누락 시 (400)
     */
    @ExceptionHandler(HttpMessageNotReadableException.class)
    protected ResponseEntity<ApiResponse<Object>> handleHttpMessageNotReadableException(
            HttpMessageNotReadableException e) {
        log.warn("HttpMessageNotReadableException: {}", e.getMessage());
        return ResponseEntity.status(CommonErrorCode.HTTP_MESSAGE_NOT_READABLE.getHttpStatus())
                .body(ApiResponse.error(CommonErrorCode.HTTP_MESSAGE_NOT_READABLE));
    }

    /**
     * @Valid 검증 실패 또는 메서드 파라미터 바인딩 실패 시 (400)
     */
    @ExceptionHandler({ MethodArgumentNotValidException.class, BindException.class })
    protected ResponseEntity<ApiResponse<Object>> handleValidationException(Exception e) {
        log.warn("Validation Exception: {}", e.getMessage());
        
        Map<String, String> errors = new HashMap<>();
        if (e instanceof MethodArgumentNotValidException ex) {
            errors = ex.getBindingResult().getFieldErrors().stream()
                    .collect(Collectors.toMap(FieldError::getField, 
                            fieldError -> fieldError.getDefaultMessage() != null ? fieldError.getDefaultMessage() : "Invalid value",
                            (existing, replacement) -> existing));
        } else if (e instanceof BindException ex) {
            errors = ex.getBindingResult().getFieldErrors().stream()
                    .collect(Collectors.toMap(FieldError::getField, 
                            fieldError -> fieldError.getDefaultMessage() != null ? fieldError.getDefaultMessage() : "Invalid value",
                            (existing, replacement) -> existing));
        }

        Map<String, Object> data = new HashMap<>();
        data.put("traceId", MDC.get("traceId"));
        data.put("details", errors);

        return ResponseEntity.status(CommonErrorCode.INVALID_INPUT_VALUE.getHttpStatus())
                .body(ApiResponse.error(CommonErrorCode.INVALID_INPUT_VALUE, data));
    }

    /**
     * 필수 쿼리 파라미터가 누락된 경우 (400)
     */
    @ExceptionHandler(MissingServletRequestParameterException.class)
    protected ResponseEntity<ApiResponse<Object>> handleMissingServletRequestParameterException(
            MissingServletRequestParameterException e) {
        log.warn("MissingServletRequestParameterException: {}", e.getMessage());
        return ResponseEntity.status(CommonErrorCode.INVALID_INPUT_VALUE.getHttpStatus())
                .body(ApiResponse.error(CommonErrorCode.INVALID_INPUT_VALUE));
    }

    /**
     * 지원하지 않는 HTTP 메서드 호출 시 (405)
     */
    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    protected ResponseEntity<ApiResponse<Object>> handleHttpRequestMethodNotSupportedException(
            HttpRequestMethodNotSupportedException e) {
        log.warn("HttpRequestMethodNotSupportedException: {}", e.getMessage());
        return ResponseEntity.status(CommonErrorCode.METHOD_NOT_ALLOWED.getHttpStatus())
                .body(ApiResponse.error(CommonErrorCode.METHOD_NOT_ALLOWED));
    }

    /**
     * 정해진 타입 이외의 값이 파라미터로 입력된 경우 (400)
     */
    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    protected ResponseEntity<ApiResponse<Object>> handleMethodArgumentTypeMismatchException(
            MethodArgumentTypeMismatchException e) {
        log.warn("MethodArgumentTypeMismatchException: {}", e.getMessage());
        return ResponseEntity.status(CommonErrorCode.INVALID_TYPE_VALUE.getHttpStatus())
                .body(ApiResponse.error(CommonErrorCode.INVALID_TYPE_VALUE));
    }

    /**
     * 존재하지 않는 리소스(URL) 호출 시 (404)
     */
    @ExceptionHandler(NoResourceFoundException.class)
    protected ResponseEntity<ApiResponse<Object>> handleNoResourceFoundException(NoResourceFoundException e) {
        log.warn("NoResourceFoundException: {}", e.getMessage());
        return ResponseEntity.status(CommonErrorCode.ENTITY_NOT_FOUND.getHttpStatus())
                .body(ApiResponse.error(CommonErrorCode.ENTITY_NOT_FOUND));
    }

    @ExceptionHandler(Exception.class)
    protected ResponseEntity<ApiResponse<Object>> handleException(Exception e) {
        log.error("Unhandled Exception: ", e);
        ErrorCode errorCode = CommonErrorCode.INTERNAL_SERVER_ERROR;
        return ResponseEntity.status(errorCode.getHttpStatus())
                .body(ApiResponse.error(errorCode));
    }
}
