package cop.kbds.agilemvp.sample.controller;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import cop.kbds.agilemvp.common.api.GlobalResponseAdvice;
import cop.kbds.agilemvp.sample.service.SampleService;

@WebMvcTest(controllers = SampleController.class)
@Import(GlobalResponseAdvice.class)
class SampleControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private SampleService sampleService;

    @Test
    @DisplayName("샘플 조회 시 200 OK와 ApiResponse 래핑 확인")
    void getSamples_Success() throws Exception {
        mockMvc.perform(get("/api/sample/hello"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("요청이 성공적으로 처리되었습니다."));
    }

    @Test
    @DisplayName("샘플 생성 시 201 Created와 ApiResponse 래핑 확인 (글로벌 설정)")
    void createSample_Created() throws Exception {
        String content = "{\"message\": \"test message\"}";

        mockMvc.perform(post("/api/sample")
                .contentType(MediaType.APPLICATION_JSON)
                .content(content))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("요청이 성공적으로 처리되었습니다."));
    }

    @Test
    @DisplayName("샘플 수정 시 200 OK와 ApiResponse 래핑 확인")
    void updateSample_Ok() throws Exception {
        String content = "{\"message\": \"updated message\"}";

        mockMvc.perform(put("/api/sample/1")
                .contentType(MediaType.APPLICATION_JSON)
                .content(content))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("샘플 삭제 시 200 OK와 ApiResponse 래핑 확인")
    void deleteSample_Ok() throws Exception {
        mockMvc.perform(delete("/api/sample/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("요청이 성공적으로 처리되었습니다."));
    }
}
