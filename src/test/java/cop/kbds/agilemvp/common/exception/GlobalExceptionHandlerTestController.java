package cop.kbds.agilemvp.common.exception;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
class GlobalExceptionHandlerTestController {

    @GetMapping("/test/business-exception")
    public void businessException() {
        throw new BusinessException(CommonErrorCode.ENTITY_NOT_FOUND);
    }

    @GetMapping("/test/missing-param")
    public void missingParam(@RequestParam String name) {
    }

    @GetMapping("/test/type-mismatch")
    public void typeMismatch(@RequestParam Long id) {
    }

    @GetMapping("/test/business-exception-custom")
    public void businessExceptionCustom() {
        throw new BusinessException(CommonErrorCode.ENTITY_NOT_FOUND, "커스텀 에러 메시지입니다.");
    }

    @GetMapping("/test/runtime-exception")
    public void runtimeException() {
        throw new RuntimeException("Sensitive system information");
    }

    @jakarta.validation.Valid
    @org.springframework.web.bind.annotation.PostMapping("/test/validation")
    public void validation(@jakarta.validation.Valid @org.springframework.web.bind.annotation.RequestBody TestDto dto) {
    }

    public record TestDto(
            @jakarta.validation.constraints.NotBlank(message = "이름은 필수입니다.") String name) {
    }
}
