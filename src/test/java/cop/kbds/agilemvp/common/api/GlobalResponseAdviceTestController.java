package cop.kbds.agilemvp.common.api;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
class GlobalResponseAdviceTestController {

    @GetMapping("/test/normal")
    public TestData normal() {
        return new TestData("test");
    }

    @GetMapping("/test/api-response")
    public ApiResponse<String> apiResponse() {
        return ApiResponse.success("already-wrapped", "custom-message");
    }

    @GetMapping("/test/response-entity")
    public ResponseEntity<TestData> responseEntity() {
        return ResponseEntity.ok(new TestData("no-wrap"));
    }

    @PostMapping("/test/post")
    public TestData post() {
        return new TestData("post-data");
    }

    @PostMapping("/test/post-override")
    @ResponseStatus(HttpStatus.OK)
    public TestData postOverride() {
        return new TestData("post-data-override");
    }

    @DeleteMapping("/test/delete")
    public void delete() {
        // DELETE should still return 200 OK (default) to keep the ApiResponse body
    }

    static record TestData(String name) {}
}
