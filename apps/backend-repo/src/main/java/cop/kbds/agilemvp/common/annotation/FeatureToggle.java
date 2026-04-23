package cop.kbds.agilemvp.common.annotation;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * 어노테이션이 달린 메서드(엔드포인트)는 environment에서 해당 프로퍼티를 읽어
 * 값이 'true'일 때만 활성화됩니다.
 * 프로퍼티 조회 시 'feature.toggle.' 접두사가 자동으로 적용됩니다.
 */
@Retention(RetentionPolicy.RUNTIME)
@Target(ElementType.METHOD)
public @interface FeatureToggle {
    String value();
}
