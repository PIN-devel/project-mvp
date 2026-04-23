package cop.kbds.agilemvp.sample.controller;

import jakarta.validation.constraints.NotBlank;

public record SampleUpdateRequest(
        @NotBlank(message = "메세지는 필수 입력값입니다.")
        String message
) {
}
