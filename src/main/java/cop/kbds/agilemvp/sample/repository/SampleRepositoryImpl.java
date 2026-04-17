package cop.kbds.agilemvp.sample.repository;

import java.util.List;

import org.springframework.stereotype.Repository;

import lombok.RequiredArgsConstructor;

import cop.kbds.agilemvp.sample.service.Sample;

@Repository
@RequiredArgsConstructor
public class SampleRepositoryImpl implements SampleRepository {

    private final SampleMapper sampleMapper;

    @Override
    public List<Sample> getHelloMessages() {
        return sampleMapper.getHelloMessages();
    }

    @Override
    public Sample findById(Long id) {
        return sampleMapper.findById(id);
    }

    @Override
    public void save(Sample sample) {
        sampleMapper.insert(sample);
    }

    @Override
    public void update(Sample sample) {
        sampleMapper.update(sample);
    }

    @Override
    public void deleteById(Long id) {
        sampleMapper.deleteById(id);
    }
}
