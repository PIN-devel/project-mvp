package cop.kbds.agilemvp.goalcycle.controller;

import cop.kbds.agilemvp.goalcycle.service.GoalCycleService;
import jakarta.validation.constraints.*;

public record GoalCreateRequest(String analysisRunId, String opportunityId, String previousCycleId,
        @NotBlank(message = "기준월을 선택해주세요.") String baselineMonth,
        @NotBlank(message = "실행월을 선택해주세요.") String executionMonth,
        @NotNull(message = "목표 금액을 선택해주세요.") @Min(value = 0, message = "목표 금액은 0원 이상이어야 합니다.") Long targetAmount,
        boolean sourceConfirmed,
        @NotBlank(message = "분석 근거를 확인해주세요.") String expectedSourceRevision,
        @NotBlank(message = "기준 내역을 확인해주세요.") String expectedBaselineRevision,
        @NotBlank(message = "저장 요청을 확인해주세요.") @Size(max = 36, message = "요청 ID는 최대 36자입니다.") String idempotencyKey) {
    public GoalCycleService.Create toCommand() { return new GoalCycleService.Create(analysisRunId, opportunityId, previousCycleId,
            baselineMonth, executionMonth, targetAmount, sourceConfirmed, expectedSourceRevision, expectedBaselineRevision, idempotencyKey); }
}
