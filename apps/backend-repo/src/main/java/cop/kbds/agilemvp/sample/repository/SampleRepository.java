package cop.kbds.agilemvp.sample.repository;

import java.util.List;
import cop.kbds.agilemvp.sample.service.Sample;

public interface SampleRepository {
    List<Sample> findAll();
    Sample findById(Long id);
    void save(Sample sample);
    void update(Sample sample);
    void patch(Sample sample);
    void deleteById(Long id);
}
