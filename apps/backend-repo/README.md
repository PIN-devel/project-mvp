# Agile MVP Project

본 프로젝트는 Spring Boot 기반의 백엔드 애플리케이션으로, 개발시 참고할 수 있는 레퍼런스 예시로 `sample` 패키지를 포함하고 있습니다.

## 🛠️ 기술 스택
- **언어**: Java 25
- **프레임워크**: Spring Boot 4
- **ORM / 데이터베이스 접근**: MyBatis
- **데이터베이스**: H2 데이터베이스 (로컬/테스트 환경), 추후 PostgreSQL 적용 예정
- **빌드 툴**: Gradle

## 📦 주요 프로젝트 의존성 (Dependencies)
`build.gradle`에 명시된 주요 라이브러리 및 의존성은 다음과 같습니다.

- **Spring Boot Starter WebMVC** (`spring-boot-starter-webmvc`): 웹 애플리케이션(REST API 등) 개발을 위한 핵심 모듈
- **Spring Boot Starter Validation** (`spring-boot-starter-validation`): 객체 검증(Validation)을 위한 기능 제공
- **MyBatis Spring Boot Starter** (`mybatis-spring-boot-starter:4.0.1`): MyBatis와 Spring Boot 연동을 위한 스타터 모듈
- **H2 Database** (`com.h2database:h2`): 로컬 및 테스트 환경을 위한 인메모리 데이터베이스
  - `spring-boot-h2console`: H2 DB 접근을 위한 웹 콘솔 제공
- **Lombok** (`org.projectlombok:lombok`): 어노테이션 기반 보일러플레이트 코드 자동 생성
- **Spring Boot DevTools** (`spring-boot-devtools`): 개발 편의성(자동 재시작 등) 제공 기능
- **Test 라이브러리**: Validation, WebMVC, MyBatis 전용 테스트 모듈 및 JUnit Platform 지원
- **SpringDoc OpenAPI** (`springdoc-openapi-starter-webmvc-ui:3.0.3`): Swagger UI를 통한 API 문서화 및 테스트 도구 제공

## 🚀 실행 및 테스트 방법

### 1. 애플리케이션 실행
프로젝트 루트 디렉토리에서 다음 명령어를 통해 애플리케이션을 기동합니다.
```bash
./gradlew bootRun
```

### 2. 테스트 실행 및 리포트 확인
전체 단위 및 통합 테스트를 수행하고 결과 리포트를 확인할 수 있습니다.
```bash
# 전체 테스트 실행
./gradlew test

# 테스트 리포트 확인 (명령 실행 후)
# build/reports/tests/test/index.html
```

### 3. API 호출 테스트
API 테스트 도구 (Postman 등) 또는 웹 브라우저를 통해 다음 URL로 요청을 호출하여 동작을 확인할 수 있습니다.
- **Read (전체 목록 조회)**: `GET http://localhost:8080/api/sample`
- **Read (개별 조회)**: `GET http://localhost:8080/api/sample/1`
- **Create (생성)**: `POST http://localhost:8080/api/sample` (Body: `{ "message": "새로운 메세지" }`)
- **Update (전체 수정)**: `PUT http://localhost:8080/api/sample/1` (Body: `{ "message": "수정된 메세지" }`)
- **Patch (부분 수정)**: `PATCH http://localhost:8080/api/sample/1` (Body: `{ "status": "INACTIVE" }`)
- **Delete (삭제)**: `DELETE http://localhost:8080/api/sample/1`
- **전역 예외 처리 테스트**: `GET http://localhost:8080/api/sample/error`

---

## 📂 프로젝트 구조 (Project Structure)

```text
.
├── src
│   ├── main
│   │   ├── java
│   │   │   └── cop.kbds.agilemvp
│   │   │       ├── common (공통 아키텍처 및 유효성 검증)
│   │   │       └── sample (3계층 구조의 레퍼런스 패키지)
│   │       ├── mapper
│   │       │   └── sample (MyBatis 쿼리 XML)
│   │       ├── application.yml (설정 파일)
│   │       └── schema.sql / data.sql (DB 초기화 스크립트)
│   └── test
│       └── java (단위 및 통합 테스트 코드)
├── build.gradle (빌드 설정 및 의존성)
└── README.md (프로젝트 문서)
```

---

## 📘 API 문서 (Swagger UI)
본 프로젝트는 Swagger(SpringDoc)를 사용하여 API를 문서화하고 있습니다. 애플리케이션 실행 후 아래 URL을 통해 API 명세를 확인하고 직접 테스트해 볼 수 있습니다.

- **Swagger UI**: [http://localhost:8080/swagger-ui.html](http://localhost:8080/swagger-ui.html)
- **OpenAPI Spec (JSON)**: [http://localhost:8080/api-docs](http://localhost:8080/api-docs)


## 🏷️ 표준 에러 처리 아키텍처 (RFC 9457 ProblemDetail)

본 프로젝트는 **RFC 9457 (`application/problem+json`)** 표준을 채택하여 에러 응답을 처리합니다. 컨트롤러는 순수 DTO를 직접 반환하고, 에러 발생 시 Spring의 `ProblemDetail` 객체에 표준 필드를 담아 반환합니다.

### 1. 표준 에러 코드 규격 (`ErrorCode`)
도메인별로 확장 가능한 에러 처리를 위해 `ErrorCode` 인터페이스를 제공하고 구현체(Enum)를 통해 일관된 에러 정보를 강제합니다.
- **위치**: `cop.kbds.agilemvp.common.exception.ErrorCode`
- **강제 스펙**:
  - `getHttpStatus()`: 통신 규격을 위한 `HttpStatus` 객체
  - `getName()`: 에러 코드의 이름 (ProblemDetail의 `title` 필드로 매핑) (예: `"INVALID_INPUT_VALUE"`)
  - `getMessage()`: 에러에 대한 기본 메시지 (ProblemDetail의 `detail` 필드 기본값으로 매핑)

### 2. RFC 9457 ProblemDetail 응답 규격
- **위치**: `cop.kbds.agilemvp.common.exception.GlobalExceptionHandler`
- **URN 형식**: `urn:cop:kbds:agilemvp:error:{errorCode}` (에러 종류를 고유하게 식별하는 URI)
- **표준 필드 매핑**:

| 필드 | 설명 | 값 예시 |
|---|---|---|
| `type` | 에러 종류 식별 URN | `urn:cop:kbds:agilemvp:error:COM001` |
| `title` | ErrorCode 이름 | `INVALID_INPUT_VALUE` |
| `status` | HTTP 상태 코드 | `400` |
| `detail` | 에러 상세 설명 (ErrorCode 기본 메시지 또는 구체적 설명) | `잘못된 입력값입니다.` |
| `instance` | 요청 URI | `/api/sample` |

- **확장 필드**:
  - `traceId`: MDC에서 추출한 요청 추적 ID (모든 에러 응답에 포함)
  - `errors`: Validation 에러 시 필드별 상세 에러 목록 (`Map<String, String>`)

### 3. 성공 응답 규격
컨트롤러가 순수 DTO를 직접 반환하며, 별도의 래핑 없이 HTTP 상태 코드로 결과를 전달합니다.

| 작업 | HTTP 메서드 | 경로 | 상태 코드 | 응답 바디 |
|---|---|---|---|---|
| 전체 목록 조회 | `GET` | `/api/sample` | `200 OK` | DTO List (JSON) |
| 개별 조회 | `GET` | `/api/sample/{id}` | `200 OK` | DTO (JSON) |
| 생성 | `POST` | `/api/sample` | `201 Created` | 없음 (void) |
| 전체 수정 | `PUT` | `/api/sample/{id}` | `200 OK` | DTO (JSON) |
| 부분 수정 | `PATCH` | `/api/sample/{id}` | `200 OK` | DTO (JSON) |
| 삭제 | `DELETE` | `/api/sample/{id}` | `204 No Content` | 없음 (void) |

```json
// 전체 목록 조회 (200 OK) - 순수 DTO 배열 직접 반환
GET /api/sample
[
  { "id": 1, "message": "Hello World", "status": "ACTIVE", "urgent": false, "updatedAt": null },
  { "id": 2, "message": "[URGENT] ASAP!", "status": "ACTIVE", "urgent": true, "updatedAt": null }
]

// 개별 조회 (200 OK)
GET /api/sample/1
{ "id": 1, "message": "Hello World", "status": "ACTIVE", "urgent": false, "updatedAt": null }

// PATCH 부분 수정 성공 (200 OK) - 변경된 필드만 전송, 나머지는 기존 값 유지
// 요청: PATCH /api/sample/2  Body: { "status": "INACTIVE" }
// → message는 기존 값 '[URGENT] ASAP!' 유지, status만 변경됨
{
  "id": 2,
  "message": "[URGENT] ASAP!",
  "status": "INACTIVE",
  "urgent": true,
  "updatedAt": "2026-04-18 12:00:00"
}

// 비즈니스 예외 발생 (400 Bad Request) - RFC 9457 ProblemDetail
{
  "type": "urn:cop:kbds:agilemvp:error:SAM003",
  "title": "SAMPLE_LIMIT_EXCEEDED",
  "status": 400,
  "detail": "일일 샘플 생성 가능한 횟수를 초과했습니다.",
  "instance": "/api/sample/error",
  "traceId": "550e8400-e29b-41d4-a716-446655440000"
}

// 유효성 검사 실패 (400 Bad Request) - 필드별 상세 에러 포함
{
  "type": "urn:cop:kbds:agilemvp:error:COM001",
  "title": "INVALID_INPUT_VALUE",
  "status": 400,
  "detail": "요청 데이터 검증에 실패했습니다.",
  "instance": "/api/sample",
  "traceId": "550e8400-e29b-41d4-a716-446655440000",
  "errors": {
    "message": "메세지는 필수 입력값입니다."
  }
}

// 서버 내부 오류 (500 Internal Server Error)
{
  "type": "urn:cop:kbds:agilemvp:error:COM004",
  "title": "INTERNAL_SERVER_ERROR",
  "status": 500,
  "detail": "서버 내부 오류가 발생했습니다.",
  "instance": "/api/sample",
  "traceId": "550e8400-e29b-41d4-a716-446655440000"
}
```

### 4. 👩‍💻 개발자 가이드 (단위 업무 개발 시)
전역 예외 처리기가 모든 예외를 RFC 9457 표준으로 변환하므로, 개발 시 핵심 비즈니스 로직에만 집중하시면 됩니다!
- **정상 응답 시**: 컨트롤러에서 **순수한 데이터 타입(DTO, List 등)만 반환**하고, `@ResponseStatus`로 적절한 HTTP 상태 코드를 명시하세요.
- **예외 발생 시**: 로직 처리 중 통제 가능한 에러 상황에 직면하면 예외만 던지세요. (`throw new BusinessException(CommonErrorCode.ENTITY_NOT_FOUND);`) 나머지는 전역 예외 처리기가 RFC 9457 형식으로 변환하여 반환합니다.
- **새 에러 코드 추가**: 도메인별 Enum에 `ErrorCode` 인터페이스를 구현하여 에러 코드를 추가합니다. URN `type`이 자동으로 생성됩니다.

### 5. 🔄 PUT vs PATCH 비교 가이드

RESTful API에서 `PUT`과 `PATCH`는 모두 수정 요청이지만 **의미와 동작 방식이 다릅니다**.

| 구분 | `PUT` | `PATCH` |
|---|---|---|
| **의미** | 리소스 **전체 교체** | 리소스 **일부 수정** |
| **미전송 필드** | `null` 또는 기본값으로 초기화 | **기존 값 유지** |
| **Validation** | `@NotBlank` 등 필수값 검증 적용 | 모든 필드 Optional (null 허용) |
| **멱등성** | 멱등 (동일 요청 → 동일 결과) | 멱등 |
| **사용 예시** | 양식 전체 재전송 (**MVP 권장 Default**) | 특정 필드만 수정 (토글, 상태 변경) |

> [!TIP]
> **MVP 협업 전략**: 프론트엔드의 불변 도메인 모델(Readonly VO) 특성상 폼 제출 시 전체 데이터를 보내는 것이 훨씬 효율적입니다. 따라서 생산성을 위해 **PUT을 기본 수정 메서드로 합의**하고, PATCH는 성사가 매우 무거운 리소스나 단일 상태 변경 시에만 제한적으로 사용합니다.

#### 코드 구현 포인트

| 레이어 | PUT 구현 | PATCH 구현 |
|---|---|---|
| **Request DTO** | `@NotBlank` 등 필수 검증 | 검증 없이 모든 필드 nullable |
| **Controller** | `@PutMapping` + `@Valid` | `@PatchMapping` (검증 없음) |
| **Domain** | 새 객체 직접 생성 | `applyPatch()` — null 필드 건너뜀 |
| **SQL** | `UPDATE ... SET col = ...` (전체) | `<if test="col != null">` Dynamic SQL |

```java
// PUT — message 필수, 전체 교체
@PutMapping("/{id}")
public SampleResponse update(@PathVariable Long id, @RequestBody @Valid SampleUpdateRequest request) { ... }

// PATCH — 모든 필드 Optional, 보낸 필드만 변경
@PatchMapping("/{id}")
public SampleResponse patch(@PathVariable Long id, @RequestBody SamplePatchRequest request) { ... }
```

```sql
-- PUT: 단순 전체 UPDATE
UPDATE temp SET message = #{message}, updated_at = CURRENT_TIMESTAMP WHERE id = #{id}

-- PATCH: MyBatis Dynamic SQL — null이 아닌 컬럼만 SET 절에 포함
UPDATE temp
<set>
    <if test="message != null">message = #{message},</if>
    <if test="status  != null">status  = #{status},</if>
    updated_at = CURRENT_TIMESTAMP
</set>
WHERE id = #{id}
```


## 🚩 Feature Flag 기반 애자일 개발 가이드

애자일 환경에서는 미완성된 기능이더라도 **짧은 주기로 자주 통합(Commit & Merge)**하는 것을 권장합니다. 이를 통해 긴 브랜치 작업으로 인한 거대한 **merge conflict(병합 충돌)를 방지**할 수 있습니다. 
본 프로젝트에서는 이를 지원하기 위해 경량화된 어노테이션 기반의 Feature Flag를 제공합니다.

### 1. 🎯 목표 및 핵심 개념
- **빠른 코드 통합**: 기능이 완성되지 않았더라도 Feature Flag로 숨겨둔 채 Main 브랜치에 코드를 병합합니다. 이를 통해 코드 충돌 문제를 원천 차단합니다.
- **런타임 제어**: 코드를 다시 배포할 필요 없이 설정(`application.yml`) 수정만으로 기능의 활성/비활성 여부를 제어합니다.
- **깔끔한 제거**: 기능이 정식 릴리즈되어 Flag가 필요 없어지면, 엔드포인트에 달린 어노테이션 한 줄만 제거하여 손쉽게 반영할 수 있습니다.

### 2. 💡 어노테이션 사용법 (`@FeatureToggle`)
새로운 엔드포인트를 개발 중이거나 아직 외부에 공개하지 않아야 할 때, 컨트롤러의 메서드 레벨에 `@FeatureToggle` 어노테이션을 부착합니다.

```java
import cop.kbds.agilemvp.common.annotation.FeatureToggle;

@RestController
public class SampleController {
    
    // 이 엔드포인트는 feature.toggle.sample.hidden-endpoint 값이 'true'일 때만 활성화됩니다.
    // 비활성화 상태인 경우 전역 404 예외 (ENTITY_NOT_FOUND) 처리됩니다.
    @FeatureToggle("sample.hidden-endpoint")
    @GetMapping("/hidden-endpoint")
    public void featureTestEndpoint() {
        // 내부 처리 로직 (배포되지만 코드는 노출되지 않음)
    }
}
```

### 3. ⚙️ 환경 설정 (`application.yml`) 활성화
어노테이션에 지정한 키에 자동으로 `feature.toggle.` 접두사가 붙어 환경 설정 파일에 등록하여 활성화 여부를 결정합니다. 값이 `true`일 때만 접근을 허용합니다.

```yaml
feature:
  toggle:
    sample:
      hidden-endpoint: false # true인 경우에만 오픈, false이거나 생략되면 404
```

## 🛠️ 공통 유틸리티 사용 가이드

모든 유틸리티는 순수 Java 25 API를 기반으로 작성되었습니다.

### 1. DateTimeUtil
다양한 날짜/시간 입력을 `LocalDateTime`으로 변환하거나 포맷팅합니다.
```java
// String to LocalDateTime
LocalDateTime ldt = DateTimeUtil.toLocalDateTime("2026-04-17 22:00:00");

// Date Range 체크 (Record 활용)
DateTimeUtil.DateRange range = new DateTimeUtil.DateRange(start, end);
boolean isInside = range.contains(target);
```

### 2. StringUtil
문자열 조작 및 마스킹 처리를 제공합니다.
```java
// 문자열 마스킹
String masked = StringUtil.mask("010-1234-5678", 4, 8); // "010-****-5678"

// 안전한 자르기
String truncated = StringUtil.truncate("Too long text here", 10); // "Too lon..."
```

### 3. NumberUtil
안전한 BigDecimal 연산 및 포맷팅을 제공합니다.
```java
// 안전한 나눗셈 (기본 소수점 2자리, 반올림)
BigDecimal result = NumberUtil.divide(new BigDecimal("10"), new BigDecimal("3"));

// 통화 포맷팅
String krw = NumberUtil.formatCurrency(1500); // "₩1,500"
```

### 4. CollectionUtil
컬렉션 조작 및 null-safe한 처리를 제공합니다.
```java
// SequencedCollection (첫 번째/마지막 요소)
String first = CollectionUtil.getFirst(list);
String last = CollectionUtil.getLast(list);

// null-safe 리스트
List<String> safeList = CollectionUtil.emptyIfNull(maybeNullList);
```

### 5. BusinessValidator
서비스 계층에서 비즈니스 로직을 가독성 있게 검증합니다.
```java
// Fluent API 스타일 검증
BusinessValidator.validate(user.isActive())
    .throwIfFalse(CommonErrorCode.INVALID_INPUT_VALUE, "활성화된 사용자만 접근 가능합니다.");

// 원샷 검증
BusinessValidator.validateNonNull(order, CommonErrorCode.ENTITY_NOT_FOUND);
```

## 🔍 로깅 및 트레이싱 (Logging & Tracing)

애플리케이션의 가시성을 높이고 문제 생성을 추적하기 위해 모든 요청에 고유한 **Trace ID**를 부여하고 요청/응답 시점을 자동 로깅합니다.

### 1. Trace ID 활용 전략
- **생성 방식**: 요청당 1개의 고유한 UUID를 생성합니다.
- **MDC (Mapped Diagnostic Context)**: 생성된 ID는 SLF4J MDC에 `traceId`라는 키로 저장되어, 해당 요청 내에서 발생하는 모든 로그에 자동으로 포함됩니다.
- **응답 헤더**: 클라이언트가 로그를 조회하거나 문의할 때 활용할 수 있도록 응답 헤더(`X-Trace-Id`)에 해당 ID를 포함시켜 반환합니다.
- **에러 응답 포함**: ProblemDetail의 확장 필드(`traceId`)로 포함되어, 에러 발생 시 클라이언트가 해당 ID로 문의할 수 있습니다.

### 2. 요청/응답 자동 로깅
`LoggingFilter`를 통해 다음과 같이 표준화된 로깅을 수행합니다.
- **[REQUEST]**: HTTP 메서드, 요청 URI, 클라이언트 IP
- **[RESPONSE]**: HTTP 메서드, 요청 URI, 상태 코드, 실행 시간(ms)

#### 📝 로그 출력 예시
실제 콘솔에는 다음과 같은 형식으로 출력됩니다.
```text
2026-04-18 13:00:00.001  INFO [22c3da25-...] --- [nio-8080-exec-1] c.k.a.common.filter.LoggingFilter : [REQUEST] GET /api/sample from 127.0.0.1
2026-04-18 13:00:00.015  DEBUG [22c3da25-...] --- [nio-8080-exec-1] c.k.a.sample.service.SampleService : Samples retrieved.
2026-04-18 13:00:00.020  INFO [22c3da25-...] --- [nio-8080-exec-1] c.k.a.common.filter.LoggingFilter : [RESPONSE] GET /api/sample status:200 (19ms)
```

## 📂 Sample 패키지 구조 및 상세 아키텍처

`cop.kbds.agilemvp.sample` 패키지는 관습적인 3계층(웹, 애플리케이션, 인프라) 구조로 구성된 레퍼런스 코드입니다.

### 1. 웹 계층 (`controller`)
*   **`SampleController`**: HTTP 요청 매핑 및 순수 DTO 직접 반환. `@ResponseStatus`로 적절한 HTTP 상태 코드를 명시합니다.
    *   `GET /api/sample` — 전체 샘플 목록을 JSON 배열로 반환.
    *   `GET /api/sample/{id}` — `@PathVariable`로 단건 샘플 조회. 없으면 404 (ENTITY_NOT_FOUND).
*   **`SampleCreateRequest` / `SampleUpdateRequest` / `SampleResponse`**: 데이터 전송 객체(DTO). Java **`record`**를 활용한 불변 객체입니다.
*   **`SamplePatchRequest`**: PATCH 전용 요청 DTO. 모든 필드가 `Optional(nullable)`이며, `@Valid` 없이 사용합니다. **보내지 않은 필드(`null`)는 기존 값이 유지됩니다.**

### 2. 애플리케이션 / 도메인 계층 (`service`)
*   **`SampleService`**: 비즈니스 로직 조율. `SampleRepository` 인터페이스에만 의존하여 기술 환경 변화에 대응(DIP)합니다.
*   **`Sample` (Domain Model)**:
    *   초기에는 `record`였으나 ID 자동 생성 및 생명주기 관리를 위해 **일반 Class**로 전환되었습니다.
    *   **Self-Validation**: 생성 시점에 유효성을 스스로 검증합니다.
    *   **Anemic Model 방지**: `isUrgent()`, `getFormattedMessage()` 등 도메인 로직을 내부에 캡슐화하고 있습니다.
    *   **`applyPatch(newMessage, newStatus)`**: PATCH 부분 업데이트 전용 메서드. `null`인 인자는 기존 값을 유지하며, 변경된 결과를 새 객체로 반환합니다.

### 3. 인프라 / DB 계층 (`repository`)
*   **`SampleRepository`**: 애플리케이션 계층에서 정의한 영속성 인터페이스.
*   **`SampleRepositoryImpl`**: MyBatis(`SampleMapper`)를 사용하는 실제 구현체(Adapter).
*   **`SampleMapper.java` & `SampleMapper.xml`**: SQL 매핑 및 실행.
    *   `Sample`이 불변 속성을 유지할 수 있도록 `<constructor>` 매핑을 통해 결과를 주입합니다.

    ```xml
    <!-- src/main/resources/mapper/sample/SampleMapper.xml -->
    <mapper namespace="cop.kbds.agilemvp.sample.repository.SampleMapper">
        <resultMap id="SampleResultMap" type="cop.kbds.agilemvp.sample.service.Sample">
            <constructor>
                <arg column="id"         javaType="long"/>
                <arg column="message"    javaType="string"/>
                <arg column="status"     javaType="string"/>
                <arg column="updated_at" javaType="java.time.LocalDateTime"/>
            </constructor>
        </resultMap>

        <select id="findAll" resultMap="SampleResultMap">
            SELECT id, message, status, updated_at FROM temp
        </select>
    </mapper>
    ```

---

## 🔗 관련 문서 바로가기
- **[전체 프로젝트 루트 (Root)](../../README.md)**
- **[프론트엔드 레파지토리 (React)](../frontend-repo/README.md)**

