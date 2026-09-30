package cop.kbds.agilemvp.analysis.repository;

import cop.kbds.agilemvp.analysis.service.AnalysisRun;

public interface AnalysisRunRepository {
    void insert(Long userId, AnalysisRun run);
    void update(Long userId, AnalysisRun run);
    AnalysisRun find(Long userId, String id);
    AnalysisRun latest(Long userId);
}
