package cop.kbds.agilemvp.common.api;

import org.springframework.core.MethodParameter;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageConverter;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.mvc.method.annotation.ResponseBodyAdvice;

/**
 * 공통 응답 포맷(ApiResponse) 자동 래핑 어드바이스
 */
@RestControllerAdvice(basePackages = "cop.kbds.agilemvp")
public class GlobalResponseAdvice implements ResponseBodyAdvice<Object> {

    @Override
    public boolean supports(MethodParameter returnType, Class<? extends HttpMessageConverter<?>> converterType) {
        Class<?> type = returnType.getParameterType();

        if (ResponseEntity.class.isAssignableFrom(type)) {
            return false;
        }

        if (ApiResponse.class.isAssignableFrom(type)) {
            return false;
        }

        return true;
    }

    @Override
    public Object beforeBodyWrite(Object body, MethodParameter returnType, MediaType selectedContentType,
            Class<? extends HttpMessageConverter<?>> selectedConverterType,
            ServerHttpRequest request, ServerHttpResponse response) {

        // POST 요청이고 별도의 @ResponseStatus 설정이 없는 경우 201 Created로 응답
        if (HttpMethod.POST.equals(request.getMethod()) && !hasResponseStatusAnnotation(returnType)) {
            response.setStatusCode(HttpStatus.CREATED);
        }

        return ApiResponse.success(body);
    }

    private boolean hasResponseStatusAnnotation(MethodParameter returnType) {
        return returnType.hasMethodAnnotation(ResponseStatus.class) ||
               returnType.getDeclaringClass().isAnnotationPresent(ResponseStatus.class);
    }
}
