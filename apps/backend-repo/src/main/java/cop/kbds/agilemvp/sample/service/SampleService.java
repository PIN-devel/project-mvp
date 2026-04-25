package cop.kbds.agilemvp.sample.service;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import cop.kbds.agilemvp.common.exception.BusinessException;
import cop.kbds.agilemvp.common.exception.CommonErrorCode;
import lombok.RequiredArgsConstructor;

import cop.kbds.agilemvp.sample.controller.SampleResponse;
import cop.kbds.agilemvp.sample.repository.SampleRepository;

@Service
@RequiredArgsConstructor
public class SampleService {

    private final SampleRepository sampleRepository;

    /**
     * 전체 샘플 목록을 조회합니다.
     */
    public List<SampleResponse> getAllSamples() {
        return sampleRepository.findAll().stream()
                .map(SampleResponse::from)
                .collect(Collectors.toList());
    }

    /**
     * ID로 단건 샘플을 조회합니다.
     */
    public SampleResponse getSampleById(Long id) {
        return Optional.ofNullable(sampleRepository.findById(id))
                .map(SampleResponse::from)
                .orElseThrow(() -> new BusinessException(CommonErrorCode.ENTITY_NOT_FOUND));
    }

    public void createSample(String message) {
        Sample sample = Sample.create(message);
        sampleRepository.save(sample);
    }

    public Sample updateSample(Long id, String message) {
        Optional.ofNullable(sampleRepository.findById(id))
                .orElseThrow(() -> new BusinessException(CommonErrorCode.ENTITY_NOT_FOUND));
        Sample updated = new Sample(id, message);
        sampleRepository.update(updated);
        return updated;
    }

    public Sample patchSample(Long id, String message, String status) {
        Sample existing = Optional.ofNullable(sampleRepository.findById(id))
                .orElseThrow(() -> new BusinessException(CommonErrorCode.ENTITY_NOT_FOUND));
        Sample patched = existing.applyPatch(message, status);
        sampleRepository.patch(patched);
        return patched;
    }

    public void deleteSample(Long id) {
        Optional.ofNullable(sampleRepository.findById(id))
                .orElseThrow(() -> new BusinessException(CommonErrorCode.ENTITY_NOT_FOUND));
        sampleRepository.deleteById(id);
    }
}
