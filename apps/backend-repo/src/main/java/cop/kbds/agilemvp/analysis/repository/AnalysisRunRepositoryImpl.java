package cop.kbds.agilemvp.analysis.repository;

import org.springframework.stereotype.Repository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import cop.kbds.agilemvp.analysis.service.AnalysisRun;
import cop.kbds.agilemvp.common.exception.BusinessException;
import cop.kbds.agilemvp.common.exception.CommonErrorCode;
import lombok.RequiredArgsConstructor;

@Repository
@RequiredArgsConstructor
public class AnalysisRunRepositoryImpl implements AnalysisRunRepository {
    private final AnalysisRunMapper mapper;
    private final ObjectMapper json = new ObjectMapper();
    @Override public void insert(Long userId, AnalysisRun run) {
        mapper.insert(userId, run.id(), run.snapshot().dataRevision(), run.snapshot().basisVersion(), run.status(), encode(run));
    }
    @Override public void update(Long userId, AnalysisRun run) {
        if (mapper.update(userId, run.id(), run.status(), encode(run)) != 1) throw new BusinessException(CommonErrorCode.ENTITY_NOT_FOUND);
    }
    @Override public AnalysisRun find(Long userId, String id) { return decode(mapper.find(userId, id)); }
    @Override public AnalysisRun latest(Long userId) { return decode(mapper.latest(userId)); }
    private String encode(AnalysisRun run) {
        try { return json.writeValueAsString(run); }
        catch (JsonProcessingException e) { throw new IllegalStateException("Cannot persist analysis run", e); }
    }
    private AnalysisRun decode(String data) {
        if (data == null) return null;
        try { return json.readValue(data, AnalysisRun.class); }
        catch (JsonProcessingException e) { throw new IllegalStateException("Cannot restore analysis run", e); }
    }
}
