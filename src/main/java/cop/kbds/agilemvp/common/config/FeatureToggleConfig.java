package cop.kbds.agilemvp.common.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.HandlerInterceptor;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import cop.kbds.agilemvp.common.annotation.FeatureToggle;
import cop.kbds.agilemvp.common.exception.BusinessException;
import cop.kbds.agilemvp.common.exception.CommonErrorCode;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Configuration
public class FeatureToggleConfig implements WebMvcConfigurer {

    private final Environment env;

    public FeatureToggleConfig(Environment env) {
        this.env = env;
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(new HandlerInterceptor() {
            @Override
            public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
                if (handler instanceof HandlerMethod hm) {
                    FeatureToggle toggle = hm.getMethodAnnotation(FeatureToggle.class);
                    if (toggle != null) {
                        String propertyKey = "feature.toggle." + toggle.value();
                        String enabled = env.getProperty(propertyKey, "false");
                        if (!"true".equalsIgnoreCase(enabled)) {
                            log.debug("Feature flag [{}] is disabled. Blocking API access to: {}", propertyKey,
                                    request.getRequestURI());
                            // 비활성화된 경우 404 예외 발생
                            throw new BusinessException(CommonErrorCode.ENTITY_NOT_FOUND, "해당 기능을 사용할 수 없습니다.");
                        }
                    }
                }
                return true;
            }
        });
    }
}
