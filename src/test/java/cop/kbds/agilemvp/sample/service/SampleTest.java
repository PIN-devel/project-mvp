package cop.kbds.agilemvp.sample.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import cop.kbds.agilemvp.common.exception.BusinessException;
import cop.kbds.agilemvp.sample.exception.SampleErrorCode;

class SampleTest {

    @Test
    @DisplayName("샘플 생성 성공")
    void create_Success() {
        // given
        String message = "Hello World";

        // when
        Sample sample = Sample.create(message);

        // then
        assertThat(sample.getMessage()).isEqualTo(message);
    }

    @ParameterizedTest
    @ValueSource(strings = {"", " ", "  "})
    @DisplayName("빈 메세지로 샘플 생성 시 예외 발생")
    void create_Fail_EmptyMessage(String emptyMessage) {
        // when & then
        assertThatThrownBy(() -> Sample.create(emptyMessage))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", SampleErrorCode.INVALID_SAMPLE_MESSAGE);
    }

    @Test
    @DisplayName("null 메세지로 샘플 생성 시 예외 발생")
    void create_Fail_NullMessage() {
        // when & then
        assertThatThrownBy(() -> Sample.create(null))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", SampleErrorCode.INVALID_SAMPLE_MESSAGE);
    }

    @Test
    @DisplayName("긴급(Urgent) 메세지 판별 - ! 포함")
    void isUrgent_ExclamationMark() {
        // given
        Sample sample = Sample.create("Help me!");

        // when & then
        assertThat(sample.isUrgent()).isTrue();
    }

    @Test
    @DisplayName("긴급(Urgent) 메세지 판별 - ASAP 포함 (대소문자 무관)")
    void isUrgent_ASAP() {
        // given
        Sample sample1 = Sample.create("Do it ASAP");
        Sample sample2 = Sample.create("do it asap");

        // when & then
        assertThat(sample1.isUrgent()).isTrue();
        assertThat(sample2.isUrgent()).isTrue();
    }

    @Test
    @DisplayName("일반 메세지 판별")
    void isUrgent_False() {
        // given
        Sample sample = Sample.create("Just a normal message");

        // when & then
        assertThat(sample.isUrgent()).isFalse();
    }

    @Test
    @DisplayName("긴급 메세지 포맷팅 확인")
    void getFormattedMessage_Urgent() {
        // given
        Sample sample = Sample.create("Urgent task!");

        // when
        String formatted = sample.getFormattedMessage();

        // then
        assertThat(formatted).isEqualTo("[URGENT] Urgent task!");
    }

    @Test
    @DisplayName("일반 메세지 포맷팅 확인")
    void getFormattedMessage_Normal() {
        // given
        Sample sample = Sample.create("Normal message");

        // when
        String formatted = sample.getFormattedMessage();

        // then
        assertThat(formatted).isEqualTo("Normal message");
    }
    @Test
    @DisplayName("부분 업데이트 성공 — null 필드는 기존 값 유지")
    void applyPatch_Success() {
        // given
        Sample original = new Sample(1L, "Hello World", "ACTIVE", null);

        // when
        Sample patched = original.applyPatch(null, "INACTIVE");

        // then
        assertThat(patched.getMessage()).isEqualTo("Hello World");
        assertThat(patched.getStatus()).isEqualTo("INACTIVE");
    }

    @Test
    @DisplayName("허용되지 않는 status 전달 시 예외 발생")
    void applyPatch_Fail_InvalidStatus() {
        // given
        Sample original = new Sample(1L, "Hello", "ACTIVE", null);

        // when & then
        assertThatThrownBy(() -> original.applyPatch(null, "DELETED"))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", SampleErrorCode.INVALID_SAMPLE_STATUS);
    }
}
