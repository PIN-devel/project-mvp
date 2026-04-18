package cop.kbds.agilemvp.common.exception;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(controllers = GlobalExceptionHandlerTestController.class)
@Import(GlobalExceptionHandler.class)
class GlobalExceptionHandlerTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    @DisplayName("BusinessException 발생 시 ProblemDetail 형식으로 반환 확인")
    void handleBusinessException() throws Exception {
        mockMvc.perform(get("/test/business-exception"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.type").value("urn:cop:kbds:agilemvp:error:COM003"))
                .andExpect(jsonPath("$.title").value("ENTITY_NOT_FOUND"))
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.detail").value("요청한 데이터를 찾을 수 없습니다."))
                .andExpect(jsonPath("$.instance").value("/test/business-exception"));
    }

    @Test
    @DisplayName("MissingServletRequestParameterException 발생 시 ProblemDetail 400 응답 확인")
    void handleMissingParameter() throws Exception {
        mockMvc.perform(get("/test/missing-param"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.type").value("urn:cop:kbds:agilemvp:error:COM001"))
                .andExpect(jsonPath("$.title").value("INVALID_INPUT_VALUE"))
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.instance").value("/test/missing-param"));
    }

    @Test
    @DisplayName("MethodArgumentTypeMismatchException 발생 시 ProblemDetail 400 응답 확인")
    void handleTypeMismatch() throws Exception {
        mockMvc.perform(get("/test/type-mismatch").param("id", "abc"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.type").value("urn:cop:kbds:agilemvp:error:COM005"))
                .andExpect(jsonPath("$.title").value("INVALID_TYPE_VALUE"))
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.instance").value("/test/type-mismatch"));
    }

    @Test
    @DisplayName("기타 예외 발생 시 ProblemDetail 500 응답 확인")
    void handleGeneralException() throws Exception {
        mockMvc.perform(get("/test/runtime-exception"))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.type").value("urn:cop:kbds:agilemvp:error:COM004"))
                .andExpect(jsonPath("$.title").value("INTERNAL_SERVER_ERROR"))
                .andExpect(jsonPath("$.status").value(500))
                .andExpect(jsonPath("$.instance").value("/test/runtime-exception"));
    }
}
