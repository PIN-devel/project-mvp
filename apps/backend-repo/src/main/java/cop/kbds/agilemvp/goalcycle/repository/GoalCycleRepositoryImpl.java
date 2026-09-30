package cop.kbds.agilemvp.goalcycle.repository;

import java.util.List;
import org.springframework.stereotype.Repository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import cop.kbds.agilemvp.goalcycle.service.GoalCycle;
import cop.kbds.agilemvp.goalcycle.service.GoalEvaluation;
import lombok.RequiredArgsConstructor;

@Repository
@RequiredArgsConstructor
public class GoalCycleRepositoryImpl implements GoalCycleRepository {
    private final GoalCycleMapper mapper;
    private final ObjectMapper json = new ObjectMapper();
    @Override public void lockOwner(Long userId) { mapper.lockOwner(userId); }
    @Override public List<GoalCycle> list(Long userId) { return mapper.list(userId).stream().map(s -> decode(s, GoalCycle.class)).toList(); }
    @Override public GoalCycle find(Long userId, String id) { return decode(mapper.find(userId, id), GoalCycle.class); }
    @Override public GoalCycle byRequest(Long userId, String key) { return decode(mapper.byRequest(userId, key), GoalCycle.class); }
    @Override public boolean hasOpen(Long userId) { return mapper.countOpen(userId) > 0; }
    @Override public String next(Long userId, String previousId) { return mapper.next(userId, previousId); }
    @Override public void insert(Long userId, GoalCycle c, String key) {
        mapper.insert(userId, c.id(), c.analysisRunId(), c.opportunityId(), c.categoryId(), c.previousCycleId(), key, encode(c));
    }
    @Override public void close(Long userId, GoalCycle c) { mapper.close(userId, c.id(), c.lifecycle(), encode(c)); }
    @Override public List<GoalEvaluation> evaluations(Long userId, String id) { return mapper.evaluations(userId, id).stream().map(s -> decode(s, GoalEvaluation.class)).toList(); }
    @Override public GoalEvaluation evaluationByRequest(Long userId, String key) { return decode(mapper.evaluationByRequest(userId, key), GoalEvaluation.class); }
    @Override public void insertEvaluation(Long userId, GoalEvaluation e, String key) { mapper.insertEvaluation(userId, e.id(), e.goalId(), e.snapshot().dataRevision(), key, encode(e), e.evaluatedAt()); }
    private String encode(Object value) {
        try { return json.writeValueAsString(value); } catch (JsonProcessingException e) { throw new IllegalStateException("Cannot persist Goal Cycle", e); }
    }
    private <T> T decode(String value, Class<T> type) {
        if (value == null) return null;
        try { return json.readValue(value, type); } catch (JsonProcessingException e) { throw new IllegalStateException("Cannot restore Goal Cycle", e); }
    }
}
