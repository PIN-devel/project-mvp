package cop.kbds.agilemvp.sample.exception;

import cop.kbds.agilemvp.common.exception.ErrorCode;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

/**
 * 샘플 도메인 전용 에러 코드
 */
@Getter
@RequiredArgsConstructor
public enum SampleErrorCode implements ErrorCode {

    SAMPLE_ACCESS_DENIED(HttpStatus.FORBIDDEN, "SAM001", "해당 샘플 데이터에 대한 접근 권한이 없습니다."),
    ALREADY_PROCESSED_SAMPLE(HttpStatus.CONFLICT, "SAM002", "이미 처리가 완료된 샘플입니다."),
    SAMPLE_LIMIT_EXCEEDED(HttpStatus.BAD_REQUEST, "SAM003", "일일 샘플 생성 가능한 횟수를 초과했습니다."),
    INVALID_SAMPLE_MESSAGE(HttpStatus.BAD_REQUEST, "SAM004", "유효하지 않은 샘플 메세지입니다."),
    INVALID_SAMPLE_STATUS(HttpStatus.BAD_REQUEST, "SAM005", "유효하지 않은 상태값입니다. 허용 값: ACTIVE, INACTIVE");

    private final HttpStatus httpStatus;
    private final String code;
    private final String message;
}
