package cop.kbds.agilemvp.analysis.controller;

import java.util.List;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import cop.kbds.agilemvp.analysis.service.AnalysisService;
import cop.kbds.agilemvp.analysis.service.AnalyticsQueryService;
import cop.kbds.agilemvp.analysis.service.AnalyticsSnapshot;
import cop.kbds.agilemvp.user.service.User;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/v2")
@RequiredArgsConstructor
@Tag(name = "analysis", description = "서버 소비 Snapshot, Evidence 해석 및 Opportunity")
public class AnalysisController {
    private final AnalyticsQueryService analytics;
    private final AnalysisService analyses;

    @GetMapping("/analytics")
    public AnalysisResponse.SnapshotResponse analytics(
            @RequestParam(defaultValue = "ALL") String period,
            @RequestParam(required = false) String start, @RequestParam(required = false) String endExclusive,
            @RequestParam(required = false) List<Long> categoryIds, @RequestParam(required = false) List<String> cardNames,
            @AuthenticationPrincipal User user) {
        return AnalysisResponse.SnapshotResponse.from(analytics.query(user.getId(), new AnalyticsSnapshot.Query(period, start, endExclusive, categoryIds, cardNames)));
    }
    @PostMapping("/analyses")
    @ResponseStatus(org.springframework.http.HttpStatus.CREATED)
    public AnalysisResponse create(@RequestBody @Valid AnalysisRequest request, @AuthenticationPrincipal User user) {
        var run = analyses.create(user.getId(), request.toQuery(), request.expectedDataRevision());
        return AnalysisResponse.from(run, analyses.currentRevision(user.getId(), run));
    }
    @GetMapping("/analyses")
    public AnalysisResponse latest(@AuthenticationPrincipal User user) {
        var run = analyses.latest(user.getId());
        return AnalysisResponse.from(run, run == null ? null : analyses.currentRevision(user.getId(), run));
    }
    @GetMapping("/analyses/{id}")
    public AnalysisResponse find(@PathVariable String id, @AuthenticationPrincipal User user) {
        var run = analyses.find(user.getId(), id);
        return AnalysisResponse.from(run, analyses.currentRevision(user.getId(), run));
    }
    @GetMapping("/analyses/{id}/opportunities/{opportunityId}")
    public AnalysisResponse.HandoffResponse handoff(@PathVariable String id, @PathVariable String opportunityId, @AuthenticationPrincipal User user) {
        return AnalysisResponse.HandoffResponse.from(analyses.handoff(user.getId(), id, opportunityId));
    }
}
