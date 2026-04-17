package cop.kbds.agilemvp.common.filter;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import cop.kbds.agilemvp.common.api.GlobalResponseAdvice;
import cop.kbds.agilemvp.sample.controller.SampleController;
import cop.kbds.agilemvp.sample.service.SampleService;

@WebMvcTest(controllers = SampleController.class)
@Import({LoggingFilter.class, GlobalResponseAdvice.class})
class LoggingFilterTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private SampleService sampleService;

    @Test
    @DisplayName("모든 요청에 대해 X-Trace-Id 헤더가 존재해야 함")
    void traceIdHeaderExists() throws Exception {
        mockMvc.perform(get("/api/sample/hello"))
                .andExpect(status().isOk())
                .andExpect(header().exists("X-Trace-Id"));
    }
}
