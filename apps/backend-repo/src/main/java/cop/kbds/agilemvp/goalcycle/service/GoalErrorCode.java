package cop.kbds.agilemvp.goalcycle.service;

import org.springframework.http.HttpStatus;
import cop.kbds.agilemvp.common.exception.ErrorCode;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum GoalErrorCode implements ErrorCode {
    OPEN_GOAL_EXISTS(HttpStatus.CONFLICT, "GOL001", "진행 중인 변화가 있습니다. 현재 목표를 먼저 확인해주세요."),
    STALE_DATA(HttpStatus.CONFLICT, "GOL002", "이용내역이 바뀌었습니다. 현재 내역을 다시 확인해주세요."),
    BASELINE_NOT_READY(HttpStatus.UNPROCESSABLE_CONTENT, "GOL003", "기준 소비의 카드 내역과 분류를 먼저 확인해주세요."),
    INVALID_LIFECYCLE(HttpStatus.CONFLICT, "GOL004", "현재 목표 상태에서는 이 작업을 진행할 수 없습니다.");
    private final HttpStatus httpStatus;
    private final String code;
    private final String message;
    @Override public String getName() { return name(); }
}
