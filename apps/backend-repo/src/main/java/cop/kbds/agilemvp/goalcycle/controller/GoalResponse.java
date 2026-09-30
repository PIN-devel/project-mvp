package cop.kbds.agilemvp.goalcycle.controller;

import cop.kbds.agilemvp.goalcycle.service.GoalCycle;
import cop.kbds.agilemvp.goalcycle.service.GoalEvaluation;

public record GoalResponse(GoalCycle.View goal) {
    public static GoalResponse from(GoalCycle.View goal) { return new GoalResponse(goal); }
    public record PreparationResponse(GoalCycle.Preparation preparation) {
        public static PreparationResponse from(GoalCycle.Preparation preparation) { return new PreparationResponse(preparation); }
    }
    public record EvaluationResponse(GoalEvaluation evaluation) {
        public static EvaluationResponse from(GoalEvaluation evaluation) { return new EvaluationResponse(evaluation); }
    }
    public record Summary(String id, String categoryLabel, String lifecycle, String start, String endExclusive,
                          long baselineAmount, long targetAmount, String previousCycleId) {
        public static Summary from(GoalCycle goal) { return new Summary(goal.id(), goal.categoryLabelSnapshot(), goal.lifecycle(), goal.start(),
                goal.endExclusive(), goal.baseline().snapshot().totalAmount(), goal.targetAmount(), goal.previousCycleId()); }
    }
}
