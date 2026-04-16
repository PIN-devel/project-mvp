package cop.kbds.agilemvp.common.exception;

import org.springframework.http.HttpStatus;

/**
 * 에러 코드 표준 인터페이스
 */
public interface ErrorCode {
    HttpStatus getHttpStatus();
    String getCode();
    String getMessage();
}
