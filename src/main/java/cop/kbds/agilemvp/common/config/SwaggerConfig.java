package cop.kbds.agilemvp.common.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;

@Configuration
public class SwaggerConfig {

    @Bean
    public OpenAPI openAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("AgileMVP API")
                        .description("AgileMVP 프로젝트 API 문서입니다.")
                        .version("0.0.1"));
    }
}
