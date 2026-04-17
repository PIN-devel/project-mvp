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
    @DisplayName("BusinessException 발생 시 커스텀 응답 반환 확인")
    void handleBusinessException() throws Exception {
        mockMvc.perform(get("/test/business-exception"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.errorCode").value("COM003"))
                .andExpect(jsonPath("$.message").value("요청한 데이터를 찾을 수 없습니다."))
                .andExpect(jsonPath("$.data.traceId").exists());
    }

    @Test
    @DisplayName("MissingServletRequestParameterException 발생 시 400 응답 확인")
    void handleMissingParameter() throws Exception {
        mockMvc.perform(get("/test/missing-param"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.errorCode").value("COM001"))
                .andExpect(jsonPath("$.data.traceId").exists());
    }

    @Test
    @DisplayName("MethodArgumentTypeMismatchException 발생 시 400 응답 확인")
    void handleTypeMismatch() throws Exception {
        mockMvc.perform(get("/test/type-mismatch").param("id", "abc"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.errorCode").value("COM005"))
                .andExpect(jsonPath("$.data.traceId").exists());
    }

    @Test
    @DisplayName("기타 예외 발생 시 500 응답 확인")
    void handleGeneralException() throws Exception {
        mockMvc.perform(get("/test/runtime-exception"))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.errorCode").value("COM004"))
                .andExpect(jsonPath("$.data.traceId").exists());
    }
}
