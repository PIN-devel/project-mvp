package cop.kbds.agilemvp.sample.repository;

import java.util.List;

import org.apache.ibatis.annotations.Mapper;
import cop.kbds.agilemvp.sample.service.Sample;

@Mapper
public interface SampleMapper {
    List<Sample> getHelloMessages();
    Sample findById(Long id);
    void insert(Sample sample);
    void update(Sample sample);
    void deleteById(Long id);
}
