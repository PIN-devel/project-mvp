package cop.kbds.agilemvp.goalcycle.controller;

import java.util.List;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import cop.kbds.agilemvp.goalcycle.service.GoalCycleService;
import cop.kbds.agilemvp.user.service.User;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/v2/goal-cycles")
@RequiredArgsConstructor
@Tag(name = "goal-cycle", description = "목표와 변화 Cycle")
public class GoalCycleController {
    private final GoalCycleService service;
    @GetMapping public List<GoalResponse.Summary> list(@AuthenticationPrincipal User user) {
        return service.list(user.getId()).stream().map(GoalResponse.Summary::from).toList();
    }
    @GetMapping("/prepare") public GoalResponse.PreparationResponse prepare(@RequestParam String analysisRunId,
            @RequestParam String opportunityId, @RequestParam(required = false) String baselineMonth, @AuthenticationPrincipal User user) {
        return GoalResponse.PreparationResponse.from(service.prepare(user.getId(), analysisRunId, opportunityId, null, baselineMonth));
    }
    @GetMapping("/{id}/prepare-next") public GoalResponse.PreparationResponse next(@PathVariable String id,
            @RequestParam(required = false) String baselineMonth, @AuthenticationPrincipal User user) {
        return GoalResponse.PreparationResponse.from(service.prepare(user.getId(), null, null, id, baselineMonth));
    }
    @PostMapping @ResponseStatus(org.springframework.http.HttpStatus.CREATED)
    public GoalResponse create(@RequestBody @Valid GoalCreateRequest request, @AuthenticationPrincipal User user) {
        var goal = service.create(user.getId(), request.toCommand()); return GoalResponse.from(service.view(user.getId(), goal.id()));
    }
    @GetMapping("/{id}") public GoalResponse find(@PathVariable String id, @AuthenticationPrincipal User user) {
        return GoalResponse.from(service.view(user.getId(), id));
    }
    @PostMapping("/{id}/evaluations") @ResponseStatus(org.springframework.http.HttpStatus.CREATED)
    public GoalResponse.EvaluationResponse evaluate(@PathVariable String id, @RequestBody @Valid GoalEvaluationRequest request, @AuthenticationPrincipal User user) {
        return GoalResponse.EvaluationResponse.from(service.evaluate(user.getId(), id, request.expectedDataRevision(), request.sourceConfirmed(), request.idempotencyKey()));
    }
    @PostMapping("/{id}/stop") public GoalResponse stop(@PathVariable String id, @AuthenticationPrincipal User user) {
        service.stop(user.getId(), id); return GoalResponse.from(service.view(user.getId(), id));
    }
}
