package cop.kbds.agilemvp.common.api;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import cop.kbds.agilemvp.common.exception.CommonErrorCode;

class ApiResponseTest {

    @Test
    @DisplayName("성공 응답 생성 확인 - 데이터만 있는 경우")
    void successWithData() {
        String data = "test data";
        ApiResponse<String> response = ApiResponse.success(data);

        assertThat(response.success()).isTrue();
        assertThat(response.errorCode()).isNull();
        assertThat(response.message()).isEqualTo("요청이 성공적으로 처리되었습니다.");
        assertThat(response.data()).isEqualTo(data);
    }

    @Test
    @DisplayName("성공 응답 생성 확인 - 데이터와 메시지가 있는 경우")
    void successWithDataAndMessage() {
        String data = "test data";
        String message = "커스텀 메시지";
        ApiResponse<String> response = ApiResponse.success(data, message);

        assertThat(response.success()).isTrue();
        assertThat(response.errorCode()).isNull();
        assertThat(response.message()).isEqualTo(message);
        assertThat(response.data()).isEqualTo(data);
    }

    @Test
    @DisplayName("에러 응답 생성 확인 - ErrorCode 사용")
    void errorWithErrorCode() {
        ApiResponse<Object> response = ApiResponse.error(CommonErrorCode.INVALID_INPUT_VALUE);

        assertThat(response.success()).isFalse();
        assertThat(response.errorCode()).isEqualTo(CommonErrorCode.INVALID_INPUT_VALUE.getCode());
        assertThat(response.message()).isEqualTo(CommonErrorCode.INVALID_INPUT_VALUE.getMessage());
        assertThat(response.data()).isInstanceOf(java.util.Map.class);
    }

    @Test
    @DisplayName("에러 응답 생성 확인 - ErrorCode와 커스텀 메시지 사용")
    void errorWithErrorCodeAndCustomMessage() {
        String customMessage = "상세 에러 내용";
        ApiResponse<Object> response = ApiResponse.error(CommonErrorCode.INVALID_INPUT_VALUE, customMessage);

        assertThat(response.success()).isFalse();
        assertThat(response.errorCode()).isEqualTo(CommonErrorCode.INVALID_INPUT_VALUE.getCode());
        assertThat(response.message()).isEqualTo(customMessage);
        assertThat(response.data()).isInstanceOf(java.util.Map.class);
    }

    @Test
    @DisplayName("에러 응답 생성 확인 - 메시지만 사용")
    void errorWithMessage() {
        String message = "알 수 없는 에러";
        ApiResponse<Object> response = ApiResponse.error(message);

        assertThat(response.success()).isFalse();
        assertThat(response.errorCode()).isEqualTo("UNKNOWN_ERROR");
        assertThat(response.message()).isEqualTo(message);
        assertThat(response.data()).isInstanceOf(java.util.Map.class);
    }
}
