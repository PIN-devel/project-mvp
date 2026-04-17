package cop.kbds.agilemvp.sample.controller;

import java.util.List;

import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.Valid;
import cop.kbds.agilemvp.common.exception.BusinessException;
import cop.kbds.agilemvp.sample.exception.SampleErrorCode;
import cop.kbds.agilemvp.sample.service.SampleService;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/sample")
@RequiredArgsConstructor
public class SampleController {

    private final SampleService sampleService;

    @GetMapping("/hello")
    public List<SampleResponse> getHelloMessages(SampleRequest request) {
        return sampleService.getHelloMessages(request);
    }

    @PostMapping
    public void create(@RequestBody @Valid SampleCreateRequest request) {
        sampleService.createSample(request.message());
    }

    @PutMapping("/{id}")
    public void update(@PathVariable("id") Long id, @RequestBody @Valid SampleUpdateRequest request) {
        sampleService.updateSample(id, request.message());
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable("id") Long id) {
        sampleService.deleteSample(id);
    }

    @GetMapping("/error")
    public void throwErrorExample() {
        throw new BusinessException(SampleErrorCode.SAMPLE_LIMIT_EXCEEDED, "강제로 발생시킨 비즈니스 예외 테스트입니다.");
    }
}
