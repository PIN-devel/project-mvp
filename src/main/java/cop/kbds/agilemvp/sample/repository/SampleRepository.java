package cop.kbds.agilemvp.sample.repository;

import java.util.List;
import cop.kbds.agilemvp.sample.service.Sample;

public interface SampleRepository {
    List<Sample> getHelloMessages();
    Sample findById(Long id);
    void save(Sample sample);
    void update(Sample sample);
    void deleteById(Long id);
}
