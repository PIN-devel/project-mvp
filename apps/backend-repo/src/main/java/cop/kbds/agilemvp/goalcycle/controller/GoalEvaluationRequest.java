package cop.kbds.agilemvp.goalcycle.controller;

import jakarta.validation.constraints.*;

public record GoalEvaluationRequest(@NotBlank(message = "현재 내역을 확인해주세요.") String expectedDataRevision,
        boolean sourceConfirmed,
        @NotBlank(message = "결과 확인 요청을 확인해주세요.") @Size(max = 36, message = "요청 ID는 최대 36자입니다.") String idempotencyKey) {}
