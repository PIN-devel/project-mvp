package cop.kbds.agilemvp.sample.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import cop.kbds.agilemvp.common.exception.GlobalExceptionHandler;
import cop.kbds.agilemvp.common.config.FeatureToggleConfig;
import cop.kbds.agilemvp.sample.service.Sample;
import cop.kbds.agilemvp.sample.service.SampleService;

@WebMvcTest(controllers = SampleController.class)
@Import({GlobalExceptionHandler.class, FeatureToggleConfig.class})
class SampleControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private SampleService sampleService;

    @Test
    @DisplayName("전체 목록 조회 성공 시 200 OK와 목록 반환")
    void getAll_Success() throws Exception {
        SampleResponse r1 = new SampleResponse(1L, "Hello World", "ACTIVE", false, "2026-04-18 12:00:00");
        SampleResponse r2 = new SampleResponse(2L, "ASAP!", "ACTIVE", true, "2026-04-18 12:05:00");
        given(sampleService.getAllSamples()).willReturn(List.of(r1, r2));

        mockMvc.perform(get("/api/sample"))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(result -> assertThat(result.getResponse().getContentAsString()).contains("ASAP!"))
                .andExpect(result -> assertThat(result.getResponse().getContentAsString()).contains("\"urgent\":true"));
    }

    @Test
    @DisplayName("단건 조회 성공 시 200 OK와 데이터 반환")
    void getById_Success() throws Exception {
        SampleResponse response = new SampleResponse(1L, "Hello World", "ACTIVE", false, "2026-04-18 12:00:00");
        given(sampleService.getSampleById(1L)).willReturn(response);

        mockMvc.perform(get("/api/sample/1"))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(result -> assertThat(result.getResponse().getContentAsString()).contains("Hello World"))
                .andExpect(result -> assertThat(result.getResponse().getContentAsString()).contains("\"urgent\":false"));
    }

    @Test
    @DisplayName("샘플 생성 성공 시 201 Created 확인")
    void create_Success() throws Exception {
        String content = "{\"message\": \"test message\"}";

        mockMvc.perform(post("/api/sample")
                .contentType(MediaType.APPLICATION_JSON)
                .content(content))
                .andExpect(status().isCreated());
    }

    @Test
    @DisplayName("샘플 수정 성공 시 200 OK 확인")
    void update_Success() throws Exception {
        String content = "{\"message\": \"updated message\"}";
        Sample updated = new Sample(1L, "updated message");
        given(sampleService.updateSample(any(Long.class), any(String.class))).willReturn(updated);

        mockMvc.perform(put("/api/sample/1")
                .contentType(MediaType.APPLICATION_JSON)
                .content(content))
                .andExpect(status().isOk())
                .andExpect(result -> assertThat(result.getResponse().getContentAsString()).contains("updated message"));
    }

    @Test
    @DisplayName("샘플 부분 수정 성공 시 200 OK 확인")
    void patch_Success() throws Exception {
        String content = "{\"status\": \"INACTIVE\"}";
        Sample patched = new Sample(1L, "Hello World", "INACTIVE", null);
        given(sampleService.patchSample(any(Long.class), any(), any())).willReturn(patched);

        mockMvc.perform(patch("/api/sample/1")
                .contentType(MediaType.APPLICATION_JSON)
                .content(content))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("샘플 삭제 성공 시 204 No Content 확인")
    void delete_Success() throws Exception {
        mockMvc.perform(delete("/api/sample/1"))
                .andExpect(status().isNoContent());
    }

    @Test
    @DisplayName("비활성화된 기능 호출 시 404 Not Found 확인")
    void experimentalEndpoint_NotFound() throws Exception {
        mockMvc.perform(get("/api/sample/hidden-endpoint"))
                .andDo(org.springframework.test.web.servlet.result.MockMvcResultHandlers.print())
                .andExpect(status().isNotFound());
    }
}
