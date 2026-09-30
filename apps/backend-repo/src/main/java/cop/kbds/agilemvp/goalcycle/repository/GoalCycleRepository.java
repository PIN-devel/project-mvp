package cop.kbds.agilemvp.goalcycle.repository;

import java.util.List;
import cop.kbds.agilemvp.goalcycle.service.GoalCycle;
import cop.kbds.agilemvp.goalcycle.service.GoalEvaluation;

public interface GoalCycleRepository {
    void lockOwner(Long userId);
    List<GoalCycle> list(Long userId);
    GoalCycle find(Long userId, String id);
    GoalCycle byRequest(Long userId, String key);
    boolean hasOpen(Long userId);
    String next(Long userId, String previousId);
    void insert(Long userId, GoalCycle cycle, String key);
    void close(Long userId, GoalCycle cycle);
    List<GoalEvaluation> evaluations(Long userId, String goalId);
    GoalEvaluation evaluationByRequest(Long userId, String key);
    void insertEvaluation(Long userId, GoalEvaluation evaluation, String key);
}
