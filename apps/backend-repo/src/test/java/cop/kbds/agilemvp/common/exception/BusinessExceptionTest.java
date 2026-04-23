package cop.kbds.agilemvp.common.exception;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class BusinessExceptionTest {

    @Test
    @DisplayName("비즈니스 예외 생성 확인 - ErrorCode 사용")
    void constructorWithErrorCode() {
        ErrorCode errorCode = CommonErrorCode.ENTITY_NOT_FOUND;
        BusinessException exception = new BusinessException(errorCode);

        assertThat(exception.getErrorCode()).isEqualTo(errorCode);
        assertThat(exception.getMessage()).isEqualTo(errorCode.getMessage());
    }

    @Test
    @DisplayName("비즈니스 예외 생성 확인 - ErrorCode와 커스텀 메시지 사용")
    void constructorWithErrorCodeAndCustomMessage() {
        ErrorCode errorCode = CommonErrorCode.INVALID_INPUT_VALUE;
        String customMessage = "아이디는 5자 이상이어야 합니다.";
        BusinessException exception = new BusinessException(errorCode, customMessage);

        assertThat(exception.getErrorCode()).isEqualTo(errorCode);
        assertThat(exception.getMessage()).isEqualTo(customMessage);
    }

    @Test
    @DisplayName("비즈니스 예외 생성 확인 - 데이터 포함")
    void constructorWithData() {
        ErrorCode errorCode = CommonErrorCode.INVALID_INPUT_VALUE;
        String data = "extra info";
        BusinessException exception = new BusinessException(errorCode, (Object) data);

        assertThat(exception.getErrorCode()).isEqualTo(errorCode);
        assertThat(exception.getData()).isEqualTo(data);
    }
}
