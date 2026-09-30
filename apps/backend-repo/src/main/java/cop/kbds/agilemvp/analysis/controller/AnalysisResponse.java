package cop.kbds.agilemvp.analysis.controller;

import cop.kbds.agilemvp.analysis.service.AnalysisRun;
import cop.kbds.agilemvp.analysis.service.AnalyticsSnapshot;

public record AnalysisResponse(AnalysisRun run, String currentDataRevision, boolean stale) {
    public static AnalysisResponse from(AnalysisRun run, String revision) {
        return new AnalysisResponse(run, revision, run != null && !run.snapshot().dataRevision().equals(revision));
    }
    public record SnapshotResponse(AnalyticsSnapshot snapshot) {
        public static SnapshotResponse from(AnalyticsSnapshot snapshot) { return new SnapshotResponse(snapshot); }
    }
    public record HandoffResponse(AnalysisRun.Handoff handoff) {
        public static HandoffResponse from(AnalysisRun.Handoff handoff) { return new HandoffResponse(handoff); }
    }
}
