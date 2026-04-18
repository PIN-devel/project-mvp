package cop.kbds.agilemvp.common.exception;

import java.net.URI;
import java.util.Map;
import java.util.stream.Collectors;

import org.slf4j.MDC;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ProblemDetail;
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

import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;

/**
 * 전역 예외 처리 핸들러 (RFC 9457 ProblemDetail 기반)
 *
 * <p>모든 예외를 {@code application/problem+json} 표준 형식으로 변환하여 반환합니다.
 * {@code type} 필드는 프로젝트 에러 코드와 결합된 URN 방식을 사용합니다.</p>
 *
 * <p>URN 형식: {@code urn:cop:kbds:agilemvp:error:{errorCode}}</p>
 */
@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final String URN_PREFIX = "urn:cop:kbds:agilemvp:error:";

    /**
     * 비즈니스 예외 처리
     */
    @ExceptionHandler(BusinessException.class)
    protected ResponseEntity<ProblemDetail> handleBusinessException(BusinessException e, HttpServletRequest request) {
        log.warn("BusinessException: {}", e.getMessage());
        ErrorCode errorCode = e.getErrorCode();
        ProblemDetail problemDetail = createProblemDetail(errorCode, e.getMessage(), request);
        return ResponseEntity.status(errorCode.getHttpStatus()).body(problemDetail);
    }

    /**
     * HTTP 요청 메시지 파싱 에러 또는 바디 누락 시 (400)
     */
    @ExceptionHandler(HttpMessageNotReadableException.class)
    protected ResponseEntity<ProblemDetail> handleHttpMessageNotReadableException(
            HttpMessageNotReadableException e, HttpServletRequest request) {
        log.warn("HttpMessageNotReadableException: {}", e.getMessage());
        ErrorCode errorCode = CommonErrorCode.HTTP_MESSAGE_NOT_READABLE;
        ProblemDetail problemDetail = createProblemDetail(errorCode, errorCode.getMessage(), request);
        return ResponseEntity.status(errorCode.getHttpStatus()).body(problemDetail);
    }

    /**
     * @Valid 검증 실패 또는 메서드 파라미터 바인딩 실패 시 (400)
     */
    @ExceptionHandler({ MethodArgumentNotValidException.class, BindException.class })
    protected ResponseEntity<ProblemDetail> handleValidationException(Exception e, HttpServletRequest request) {
        log.warn("Validation Exception: {}", e.getMessage());

        Map<String, String> fieldErrors = extractFieldErrors(e);

        ErrorCode errorCode = CommonErrorCode.INVALID_INPUT_VALUE;
        ProblemDetail problemDetail = createProblemDetail(errorCode, "요청 데이터 검증에 실패했습니다.", request);
        problemDetail.setProperty("errors", fieldErrors);
        return ResponseEntity.status(errorCode.getHttpStatus()).body(problemDetail);
    }

    /**
     * 필수 쿼리 파라미터가 누락된 경우 (400)
     */
    @ExceptionHandler(MissingServletRequestParameterException.class)
    protected ResponseEntity<ProblemDetail> handleMissingServletRequestParameterException(
            MissingServletRequestParameterException e, HttpServletRequest request) {
        log.warn("MissingServletRequestParameterException: {}", e.getMessage());
        ErrorCode errorCode = CommonErrorCode.INVALID_INPUT_VALUE;
        ProblemDetail problemDetail = createProblemDetail(errorCode, e.getMessage(), request);
        return ResponseEntity.status(errorCode.getHttpStatus()).body(problemDetail);
    }

    /**
     * 지원하지 않는 HTTP 메서드 호출 시 (405)
     */
    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    protected ResponseEntity<ProblemDetail> handleHttpRequestMethodNotSupportedException(
            HttpRequestMethodNotSupportedException e, HttpServletRequest request) {
        log.warn("HttpRequestMethodNotSupportedException: {}", e.getMessage());
        ErrorCode errorCode = CommonErrorCode.METHOD_NOT_ALLOWED;
        ProblemDetail problemDetail = createProblemDetail(errorCode, e.getMessage(), request);
        return ResponseEntity.status(errorCode.getHttpStatus()).body(problemDetail);
    }

    /**
     * 정해진 타입 이외의 값이 파라미터로 입력된 경우 (400)
     */
    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    protected ResponseEntity<ProblemDetail> handleMethodArgumentTypeMismatchException(
            MethodArgumentTypeMismatchException e, HttpServletRequest request) {
        log.warn("MethodArgumentTypeMismatchException: {}", e.getMessage());
        ErrorCode errorCode = CommonErrorCode.INVALID_TYPE_VALUE;
        ProblemDetail problemDetail = createProblemDetail(errorCode, e.getMessage(), request);
        return ResponseEntity.status(errorCode.getHttpStatus()).body(problemDetail);
    }

    /**
     * 존재하지 않는 리소스(URL) 호출 시 (404)
     */
    @ExceptionHandler(NoResourceFoundException.class)
    protected ResponseEntity<ProblemDetail> handleNoResourceFoundException(
            NoResourceFoundException e, HttpServletRequest request) {
        log.warn("NoResourceFoundException: {}", e.getMessage());
        ErrorCode errorCode = CommonErrorCode.ENTITY_NOT_FOUND;
        ProblemDetail problemDetail = createProblemDetail(errorCode, e.getMessage(), request);
        return ResponseEntity.status(errorCode.getHttpStatus()).body(problemDetail);
    }

    /**
     * 기타 모든 미처리 예외 (500)
     */
    @ExceptionHandler(Exception.class)
    protected ResponseEntity<ProblemDetail> handleException(Exception e, HttpServletRequest request) {
        log.error("Unhandled Exception: ", e);
        ErrorCode errorCode = CommonErrorCode.INTERNAL_SERVER_ERROR;
        ProblemDetail problemDetail = createProblemDetail(errorCode, errorCode.getMessage(), request);
        return ResponseEntity.status(errorCode.getHttpStatus()).body(problemDetail);
    }

    /**
     * RFC 9457 ProblemDetail 생성 헬퍼 메서드
     *
     * @param errorCode 에러 코드 (type, title, status 결정)
     * @param detail    발생 상황의 구체적 설명
     * @param request   현재 HTTP 요청 (instance 결정)
     * @return 표준 필드가 채워진 ProblemDetail
     */
    private ProblemDetail createProblemDetail(ErrorCode errorCode, String detail, HttpServletRequest request) {
        ProblemDetail problemDetail = ProblemDetail.forStatusAndDetail(
                HttpStatusCode.valueOf(errorCode.getHttpStatus().value()), detail);
        problemDetail.setType(URI.create(URN_PREFIX + errorCode.getCode()));
        problemDetail.setTitle(errorCode.getMessage());
        problemDetail.setInstance(URI.create(request.getRequestURI()));
        problemDetail.setProperty("traceId", MDC.get("traceId"));
        return problemDetail;
    }

    /**
     * Validation 예외에서 필드별 에러 메시지를 추출
     */
    private Map<String, String> extractFieldErrors(Exception e) {
        if (e instanceof MethodArgumentNotValidException ex) {
            return ex.getBindingResult().getFieldErrors().stream()
                    .collect(Collectors.toMap(FieldError::getField,
                            fieldError -> fieldError.getDefaultMessage() != null ? fieldError.getDefaultMessage() : "Invalid value",
                            (existing, replacement) -> existing));
        } else if (e instanceof BindException ex) {
            return ex.getBindingResult().getFieldErrors().stream()
                    .collect(Collectors.toMap(FieldError::getField,
                            fieldError -> fieldError.getDefaultMessage() != null ? fieldError.getDefaultMessage() : "Invalid value",
                            (existing, replacement) -> existing));
        }
        return Map.of();
    }
}
