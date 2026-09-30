package cop.kbds.agilemvp.goalcycle.service;

import cop.kbds.agilemvp.analysis.service.AnalyticsSnapshot;

public record GoalEvaluation(String id, String goalId, AnalyticsSnapshot snapshot, Long actualAmount,
                             Long observedChange, String outcome, boolean sourceConfirmed, String confirmedAt,
                             boolean baselineChanged, String evaluatedAt) {}
