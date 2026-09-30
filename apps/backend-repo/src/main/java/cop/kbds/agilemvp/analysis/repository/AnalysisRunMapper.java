package cop.kbds.agilemvp.analysis.repository;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface AnalysisRunMapper {
    int insert(@Param("userId") Long userId, @Param("id") String id, @Param("revision") String revision,
               @Param("basis") String basis, @Param("status") String status, @Param("json") String json);
    int update(@Param("userId") Long userId, @Param("id") String id, @Param("status") String status, @Param("json") String json);
    String find(@Param("userId") Long userId, @Param("id") String id);
    String latest(@Param("userId") Long userId);
}
