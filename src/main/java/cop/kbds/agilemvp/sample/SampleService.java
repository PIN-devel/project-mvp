package cop.kbds.agilemvp.sample;

import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class SampleService {

    private final SampleMapper sampleMapper;

    public List<Map<String, Object>> getHelloMessages() {
        return sampleMapper.getHelloMessages();
    }
}
