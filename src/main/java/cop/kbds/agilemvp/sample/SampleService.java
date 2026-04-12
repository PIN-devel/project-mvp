package cop.kbds.agilemvp.sample;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class SampleService {

    private final SampleRepository sampleRepository;

    public List<SampleResponseDTO> getHelloMessages(SampleRequestDTO requestDTO) {
        String name = (requestDTO != null) ? requestDTO.name() : null;
        return sampleRepository.getHelloMessages().stream()
                .filter(SampleVO::isValid)
                .map(vo -> SampleResponseDTO.from(vo, name))
                .collect(Collectors.toList());
    }
}
