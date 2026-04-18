package cop.kbds.agilemvp.sample.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;
import static org.mockito.Mockito.times;

import java.util.List;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import cop.kbds.agilemvp.common.exception.BusinessException;
import cop.kbds.agilemvp.common.exception.CommonErrorCode;

import cop.kbds.agilemvp.sample.controller.SampleResponse;
import cop.kbds.agilemvp.sample.repository.SampleRepository;

@ExtendWith(MockitoExtension.class)
class SampleServiceTest {

    @InjectMocks
    private SampleService sampleService;

    @Mock
    private SampleRepository sampleRepository;

    @Test
    @DisplayName("전체 목록 조회 성공")
    void getAllSamples_Success() {
        Sample sample = Sample.create("테스트 메세지");
        given(sampleRepository.findAll()).willReturn(List.of(sample));

        List<SampleResponse> result = sampleService.getAllSamples();

        assertThat(result).hasSize(1);
        assertThat(result.get(0).message()).contains("테스트 메세지");
    }

    @Test
    @DisplayName("ID로 단건 조회 성공")
    void getSampleById_Success() {
        Long id = 1L;
        Sample sample = new Sample(id, "Hello World", "ACTIVE", null);
        given(sampleRepository.findById(id)).willReturn(sample);

        SampleResponse result = sampleService.getSampleById(id);

        assertThat(result.id()).isEqualTo(id);
        assertThat(result.message()).isEqualTo("Hello World");
    }

    @Test
    @DisplayName("존재하지 않는 ID 조회 시 ENTITY_NOT_FOUND 예외 발생")
    void getSampleById_NotFound() {
        Long id = 99L;
        given(sampleRepository.findById(id)).willReturn(null);

        assertThatThrownBy(() -> sampleService.getSampleById(id))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.ENTITY_NOT_FOUND);
    }

    @Test
    @DisplayName("새로운 샘플 생성 성공")
    void createSample_Success() {
        sampleService.createSample("New Sample Message");
        then(sampleRepository).should(times(1)).save(any(Sample.class));
    }

    @Test
    @DisplayName("샘플 정보 수정 성공")
    void updateSample_Success() {
        Long id = 1L;
        Sample existing = Sample.builder().id(id).message("Old Message").build();
        given(sampleRepository.findById(id)).willReturn(existing);

        Sample result = sampleService.updateSample(id, "Updated Message");

        assertThat(result.getMessage()).isEqualTo("Updated Message");
        then(sampleRepository).should(times(1)).update(any(Sample.class));
    }

    @Test
    @DisplayName("샘플 부분 수정(PATCH) 성공")
    void patchSample_Success() {
        Long id = 1L;
        Sample existing = new Sample(id, "Hello World", "ACTIVE", null);
        given(sampleRepository.findById(id)).willReturn(existing);

        Sample result = sampleService.patchSample(id, null, "INACTIVE");

        assertThat(result.getStatus()).isEqualTo("INACTIVE");
        then(sampleRepository).should(times(1)).patch(any(Sample.class));
    }

    @Test
    @DisplayName("샘플 삭제 성공")
    void deleteSample_Success() {
        Long id = 1L;
        Sample existing = Sample.builder().id(id).message("To be deleted").build();
        given(sampleRepository.findById(id)).willReturn(existing);

        sampleService.deleteSample(id);

        then(sampleRepository).should(times(1)).deleteById(id);
    }
}
