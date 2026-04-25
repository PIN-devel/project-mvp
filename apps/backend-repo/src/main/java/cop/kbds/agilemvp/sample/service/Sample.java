package cop.kbds.agilemvp.sample.service;

import java.time.LocalDateTime;

import cop.kbds.agilemvp.common.exception.BusinessException;
import cop.kbds.agilemvp.sample.exception.SampleErrorCode;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Builder(access = AccessLevel.PRIVATE)
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Sample {

    @Setter(AccessLevel.PRIVATE)
    private Long id;
    private String message;
    private String status;
    private LocalDateTime updatedAt;

    public static Sample create(String message) {
        validate(message);
        return Sample.builder()
                .message(message)
                .status("ACTIVE")
                .build();
    }

    public Sample(Long id, String message) {
        validate(message);
        this.id = id;
        this.message = message;
    }

    public Sample(Long id, String message, String status, LocalDateTime updatedAt) {
        this.id = id;
        this.message = message;
        this.status = status;
        this.updatedAt = updatedAt;
    }

    public Sample applyPatch(String newMessage, String newStatus) {
        String patchedMessage = (newMessage != null) ? newMessage : this.message;
        String patchedStatus = (newStatus != null) ? newStatus : this.status;

        if (newMessage != null) {
            validate(patchedMessage);
        }
        if (newStatus != null) {
            validateStatus(newStatus);
        }

        return new Sample(this.id, patchedMessage, patchedStatus, LocalDateTime.now());
    }

    private static void validate(String message) {
        if (message == null || message.trim().isEmpty()) {
            throw new BusinessException(SampleErrorCode.INVALID_SAMPLE_MESSAGE);
        }
    }

    private static void validateStatus(String status) {
        if (!"ACTIVE".equals(status) && !"INACTIVE".equals(status)) {
            throw new BusinessException(SampleErrorCode.INVALID_SAMPLE_STATUS);
        }
    }

    public boolean isUrgent() {
        return message != null && (message.contains("!") || message.toUpperCase().contains("ASAP"));
    }

    public String getFormattedMessage() {
        return isUrgent() ? "[URGENT] " + message : message;
    }
}
