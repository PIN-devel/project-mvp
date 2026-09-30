package cop.kbds.agilemvp.goalcycle.repository;

import java.util.List;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface GoalCycleMapper {
    Long lockOwner(Long userId);
    List<String> list(Long userId);
    String find(@Param("userId") Long userId, @Param("id") String id);
    String byRequest(@Param("userId") Long userId, @Param("key") String key);
    int countOpen(Long userId);
    String next(@Param("userId") Long userId, @Param("previousId") String previousId);
    int insert(@Param("userId") Long userId, @Param("id") String id, @Param("runId") String runId,
               @Param("opportunityId") String opportunityId, @Param("categoryId") Long categoryId,
               @Param("previousId") String previousId, @Param("key") String key, @Param("json") String json);
    int close(@Param("userId") Long userId, @Param("id") String id, @Param("lifecycle") String lifecycle, @Param("json") String json);
    List<String> evaluations(@Param("userId") Long userId, @Param("goalId") String goalId);
    String evaluationByRequest(@Param("userId") Long userId, @Param("key") String key);
    int insertEvaluation(@Param("userId") Long userId, @Param("id") String id, @Param("goalId") String goalId,
                         @Param("revision") String revision, @Param("key") String key, @Param("json") String json,
                         @Param("evaluatedAt") String evaluatedAt);
}
