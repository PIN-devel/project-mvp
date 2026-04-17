package cop.kbds.agilemvp.sample.service;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import cop.kbds.agilemvp.common.exception.BusinessException;
import lombok.RequiredArgsConstructor;

import cop.kbds.agilemvp.sample.controller.SampleRequest;
import cop.kbds.agilemvp.sample.controller.SampleResponse;
import cop.kbds.agilemvp.sample.repository.SampleRepository;

@Service
@RequiredArgsConstructor
public class SampleService {

    private final SampleRepository sampleRepository;

    public List<SampleResponse> getHelloMessages(SampleRequest request) {
        String name = (request != null) ? request.name() : null;
        return sampleRepository.getHelloMessages().stream()
                .map(vo -> SampleResponse.from(vo, name))
                .collect(Collectors.toList());
    }

    public void createSample(String message) {
        Sample sample = Sample.builder()
                .message(message)
                .build();
        sampleRepository.save(sample);
    }

    public void updateSample(Long id, String message) {
        Sample existing = sampleRepository.findById(id);
        if (existing == null) {
            throw new BusinessException(cop.kbds.agilemvp.common.exception.CommonErrorCode.ENTITY_NOT_FOUND);
        }
        Sample updated = new Sample(id, message);
        sampleRepository.update(updated);
    }

    public void deleteSample(Long id) {
        Sample existing = sampleRepository.findById(id);
        if (existing == null) {
            throw new BusinessException(cop.kbds.agilemvp.common.exception.CommonErrorCode.ENTITY_NOT_FOUND);
        }
        sampleRepository.deleteById(id);
    }
}
