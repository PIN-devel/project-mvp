package cop.kbds.agilemvp.sample;

import java.util.List;

import org.springframework.stereotype.Repository;

import lombok.RequiredArgsConstructor;

@Repository
@RequiredArgsConstructor
public class SampleRepositoryImpl implements SampleRepository {

    private final SampleMapper sampleMapper;

    @Override
    public List<SampleVO> getHelloMessages() {
        return sampleMapper.getHelloMessages();
    }
}
