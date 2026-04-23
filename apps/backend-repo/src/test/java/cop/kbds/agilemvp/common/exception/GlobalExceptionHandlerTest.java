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
    @DisplayName("BusinessException (Fallback) 발생 시 ErrorCode 기본 메시지 반환 확인")
    void handleBusinessException_Fallback() throws Exception {
        mockMvc.perform(get("/test/business-exception"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.type").value("urn:cop:kbds:agilemvp:error:COM003"))
                .andExpect(jsonPath("$.detail").value("요청한 데이터를 찾을 수 없습니다."));
    }

    @Test
    @DisplayName("BusinessException (Custom) 발생 시 제공된 커스텀 메시지 반환 확인")
    void handleBusinessException_Custom() throws Exception {
        mockMvc.perform(get("/test/business-exception-custom"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.type").value("urn:cop:kbds:agilemvp:error:COM003"))
                .andExpect(jsonPath("$.detail").value("커스텀 에러 메시지입니다."));
    }

    @Test
    @DisplayName("MissingServletRequestParameterException 발생 시 detail이 마스킹되는지 확인")
    void handleMissingParameter() throws Exception {
        mockMvc.perform(get("/test/missing-param"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.type").value("urn:cop:kbds:agilemvp:error:COM001"))
                .andExpect(jsonPath("$.detail").value("잘못된 입력값입니다.")); // CommonErrorCode message
    }

    @Test
    @DisplayName("MethodArgumentTypeMismatchException 발생 시 detail이 마스킹되는지 확인")
    void handleTypeMismatch() throws Exception {
        mockMvc.perform(get("/test/type-mismatch").param("id", "abc"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.type").value("urn:cop:kbds:agilemvp:error:COM005"))
                .andExpect(jsonPath("$.detail").value("잘못된 타입의 값이 입력되었습니다.")); // CommonErrorCode message
    }

    @Test
    @DisplayName("기타 예외 발생 시 detail이 마스킹되는지 확인")
    void handleGeneralException() throws Exception {
        mockMvc.perform(get("/test/runtime-exception"))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.type").value("urn:cop:kbds:agilemvp:error:COM004"))
                .andExpect(jsonPath("$.detail").value("서버 내부 오류가 발생했습니다.")); // Forbidden to expose "Sensitive system information"
    }

    @Test
    @DisplayName("Validation 에러 발생 시 errors 필드 포함 확인")
    void handleValidationException() throws Exception {
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post("/test/validation")
                .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
                .content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.type").value("urn:cop:kbds:agilemvp:error:COM001"))
                .andExpect(jsonPath("$.detail").value("잘못된 입력값입니다."))
                .andExpect(jsonPath("$.errors.name").value("이름은 필수입니다."));
    }
}
