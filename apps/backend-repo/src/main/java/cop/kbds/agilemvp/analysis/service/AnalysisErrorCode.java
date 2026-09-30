package cop.kbds.agilemvp.analysis.service;

import org.springframework.http.HttpStatus;
import cop.kbds.agilemvp.common.exception.ErrorCode;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum AnalysisErrorCode implements ErrorCode {
    STALE_SOURCE(HttpStatus.CONFLICT, "ANA001", "이용내역이 변경되었습니다. 다시 조회한 후 분석해주세요."),
    UNSAFE_TOTAL(HttpStatus.UNPROCESSABLE_ENTITY, "ANA002", "분석 금액이 안전한 정수 범위를 벗어났습니다.");
    private final HttpStatus httpStatus;
    private final String code;
    private final String message;
    @Override public String getName() { return name(); }
}
