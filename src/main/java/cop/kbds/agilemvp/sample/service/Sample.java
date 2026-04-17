package cop.kbds.agilemvp.sample.service;

import cop.kbds.agilemvp.common.exception.BusinessException;
import cop.kbds.agilemvp.sample.exception.SampleErrorCode;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Sample {

    @Setter(AccessLevel.PRIVATE)
    private Long id;
    private String message;

    // 도메인 생성자 및 검증 로직
    public static Sample create(String message) {
        validate(message);
        return Sample.builder()
                .message(message)
                .build();
    }

    // 전역 검증 및 비즈니스 로직 적용을 위한 생성자
    public Sample(Long id, String message) {
        validate(message);
        this.id = id;
        this.message = message;
    }

    private static void validate(String message) {
        if (message == null || message.trim().isEmpty()) {
            throw new BusinessException(SampleErrorCode.INVALID_SAMPLE_MESSAGE);
        }
    }

    public boolean isUrgent() {
        return message != null && (message.contains("!") || message.toUpperCase().contains("ASAP"));
    }

    public String getFormattedMessage() {
        return isUrgent() ? "[URGENT] " + message : message;
    }
}
