package cop.kbds.agilemvp.sample;

import java.util.List;


import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/sample")
@RequiredArgsConstructor
public class SampleController {

    private final SampleService sampleService;

    @GetMapping("/hello")
    public List<SampleResponseDTO> getHelloMessages(SampleRequestDTO requestDTO) {
        return sampleService.getHelloMessages(requestDTO);
    }
}
