# Agile MVP Project

본 프로젝트는 Spring Boot 기반의 백엔드 애플리케이션으로, 개발시 참고할 수 있는 레퍼런스 예시로 `sample` 패키지를 포함하고 있습니다.

## 🛠️ 기술 스택

- **언어**: Java 25
- **프레임워크**: Spring Boot 4
- **ORM / 데이터베이스 접근**: MyBatis
- **데이터베이스**: H2 (로컬/테스트), PostgreSQL (운영 - prod 프로파일)
- **보안 / 인증**: Spring Security, JWT (JJWT)
- **빌드 툴**: Gradle

## 📦 주요 프로젝트 의존성 (Dependencies)

`build.gradle`에 명시된 주요 라이브러리 및 의존성은 다음과 같습니다.

- **Spring Boot Starter WebMVC** (`spring-boot-starter-webmvc`): 웹 애플리케이션(REST API 등) 개발을 위한 핵심 모듈
- **Spring Boot Starter Validation** (`spring-boot-starter-validation`): 객체 검증(Validation)을 위한 기능 제공
- **MyBatis Spring Boot Starter** (`mybatis-spring-boot-starter:4.0.1`): MyBatis와 Spring Boot 연동을 위한 스타터 모듈
- **H2 Database** (`com.h2database:h2`): 로컬 및 테스트 환경을 위한 인메모리 데이터베이스
  - `spring-boot-h2console`: H2 DB 접근을 위한 웹 콘솔 제공
- **PostgreSQL** (`org.postgresql:postgresql`): 운영(prod) 환경을 위한 RDBMS 드라이버
- **Lombok** (`org.projectlombok:lombok`): 어노테이션 기반 보일러플레이트 코드 자동 생성
- **Spring Boot DevTools** (`spring-boot-devtools`): 개발 편의성(자동 재시작 등) 제공 기능
- **Test 라이브러리**: Validation, WebMVC, MyBatis 전용 테스트 모듈 및 JUnit Platform 지원
- **SpringDoc OpenAPI** (`springdoc-openapi-starter-webmvc-ui:3.0.3`): Swagger UI를 통한 API 문서화 및 테스트 도구 제공
- **Spring Boot Starter Security** (`spring-boot-starter-security`): 인증/인가 처리를 위한 보안 프레임워크 핵심 모듈
- **JJWT (Java JWT)** (`io.jsonwebtoken:jjwt-api:0.13.0`): 비밀키 서명을 활용한 무만료 퓨어 JWT 생성 및 검증 라이브러리

---

## ☕ Java 25 설치

본 프로젝트는 **Java 25 (LTS)**를 기반으로 합니다. 개발 환경 구성을 위해 아래 가이드에 따라 JDK를 설치해 주세요.

> [!NOTE]
> 본 가이드는 가장 범용적인 **Eclipse Temurin (Adoptium)** 배포판을 기준으로 작성되었습니다. Oracle JDK, Amazon Corretto, Microsoft OpenJDK 등 타 배포판을 사용해도 무방합니다.

### ⚙️ OS별 설정

#### 🍎 macOS

1. **Homebrew를 이용한 설치 (권장)**
   ```bash
   brew install openjdk@25
   ```
2. **시스템 JDK 경로 등록** (Homebrew 설치 시 필수)
   터미널에서 아래 명령어를 실행하여 macOS가 JDK를 인식하도록 심볼릭 링크를 생성합니다.
   ```bash
   sudo ln -sfn /opt/homebrew/opt/openjdk@25/libexec/openjdk.jdk /Library/Java/JavaVirtualMachines/openjdk-25.jdk
   ```
3. **SDKMAN! 사용 시**
   ```bash
   sdk install java 25.0.0-tem
   ```

#### 🪟 Windows

1. **직접 설치 (권장)**
   - [Adoptium (Eclipse Temurin)](https://adoptium.net/temurin/releases/?version=25) 사이트에서 Java 25 **.msi** 파일을 다운로드합니다.
2. **설치 시 주의사항**
   - 설치 마법사 단계에서 **`Add to PATH`** 및 **`Set JAVA_HOME variable`** 옵션이 활성화(Will be installed on local hard drive)되어 있는지 반드시 확인하세요.
3. **Winget 사용 시**
   ```powershell
   winget install EclipseAdoptium.Temurin.25.JDK
   ```

---

### 🖥️ IDE 구성 (VS Code)

본 가이드는 **Visual Studio Code**를 기본 환경으로 설명합니다. (IntelliJ IDEA 또는 Eclipse 사용자는 각 IDE의 SDK 설정 메뉴에서 설치된 Java 25를 선택하여 사용할 수 있습니다.)

1. **확장 프로그램 설치**
   - VS Code 마켓플레이스에서 **[Extension Pack for Java](https://marketplace.visualstudio.com/items?itemName=vscjava.vscode-java-pack)**를 설치합니다.
2. **런타임 설정 확인**
   - `Ctrl + Shift + P` (macOS: `Cmd + Shift + P`) 입력 -> `Java: Configure Java Runtime` 검색 및 실행
   - `Java Tooling Runtime` 탭에서 **Java 25**가 정상적으로 인식되었는지 확인합니다.

---

### ✅ 검증 및 트러블슈팅

1. **버전 확인**
   새로운 터미널 창을 열고 아래 명령어를 입력합니다.
   ```bash
   java -version
   ```
   `openjdk version "25.x.x"`와 같이 출력되면 정상입니다.

2. **우선순위 확인 (멀티 JDK 환경)**
   기존에 다른 버전의 Java가 설치되어 있다면, Java 25가 우선순위를 갖는지 확인하세요.
   - **macOS**: `which java` 결과가 `/usr/bin/java`이고, `java -version`이 25여야 합니다.
   - **Windows**: `where java` 명령으로 Java 25 경로가 가장 상단에 있는지 확인합니다.

3. **환경 변수 반영 안 됨**
   - 설치 후 터미널을 완전히 종료하고 **새 창**을 열어 다시 시도하세요.
   - Windows의 경우 시스템 환경 변수 설정에서 `JAVA_HOME`이 올바른 경로(예: `C:\Program Files\Eclipse Foundation\jdk-25.x.x-hotspot\`)를 가리키는지 확인합니다.

---


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
- **Auth (회원가입)**: `POST http://localhost:8080/api/auth/register` (Body: `{ "loginId": "testuser", "nickname": "테스터", "password": "password123!" }`)
- **Auth (로그인)**: `POST http://localhost:8080/api/auth/login` (Body: `{ "loginId": "testuser", "password": "password123!" }`)
- **User (본인 상세 조회)**: `GET http://localhost:8080/api/user/me` (Header: `Authorization: Bearer <token>`)
- **User (회원 탈퇴)**: `DELETE http://localhost:8080/api/user` (Header: `Authorization: Bearer <token>`)

---

## 📂 프로젝트 구조 (Project Structure)

```text
.
├── src
│   ├── main
│   │   ├── java
│   │   │   └── cop.kbds.agilemvp
│   │   │       ├── common (공통 아키텍처 및 유효성 검증)
│   │   │       ├── sample (3계층 구조의 레퍼런스 패키지)
│   │   │       ├── user (회원 관리 도메인 - 독립 패키지)
│   │   │       └── auth (JWT/Security 기반 인증 도메인 - User에 의존)
│   │   ├── resources
│   │   │   ├── db
│   │   │   │   ├── migration (Flyway 공통 스키마 및 마이그레이션 SQL)
│   │   │   │   └── migration_dev (Flyway 로컬 개발용 시드 데이터 SQL)
│   │   │   ├── mapper
│   │   │   │   ├── sample (MyBatis 쿼리 XML)
│   │   │   │   └── user (회원 MyBatis 쿼리 XML)
│   │   │   ├── application.yml (기본 설정 - H2 + Flyway)
│   │   │   └── application-prod.yml (운영 설정 - PostgreSQL + Flyway)
│   └── test
│       └── java (단위 및 통합 테스트 코드)
├── build.gradle (빌드 설정 및 의존성)
└── README.md (프로젝트 문서)
```

### 🗄️ 데이터베이스 마이그레이션 (Flyway)
기존의 `schema.sql`과 `data.sql`을 이용한 단일 파일 초기화 방식은 **폐기**되었습니다. 운영 DB의 안정성과 버전 관리를 위해 **Flyway**를 전면 도입했습니다.

- **공통/운영 스키마 및 데이터** (`src/main/resources/db/migration`):
  - `V1__initial_schema.sql`: 초기 테이블 구조 정의 (운영 환경 데이터 보존을 위해 `DROP TABLE`은 사용하지 않음)
  - `V2__default_categories.sql`: 시스템 기본 참조 카테고리 데이터 삽입 (동작 충돌 방지를 위한 `WHERE NOT EXISTS` 사용)
- **로컬 개발용 더미 데이터** (`src/main/resources/db/migration_dev`):
  - `V999__dev_seeds.sql`: 로컬 개발/테스트에서만 가동되는 더미 `temp` 레코드 및 `testuser` 정보
- **로컬 구동**: 애플리케이션 시작 시 H2 인메모리 DB에 공통 스키마 및 개발용 데이터가 자동으로 마이그레이션되므로, 이전과 동일하게 `./gradlew bootRun` 또는 테스트를 즉시 수행할 수 있습니다.
- **운영(prod) 배포**: 프로파일별 분리로 인해 로컬용 더미 데이터(`V999`)는 절대 운영 DB에 반영되지 않으며, `baseline-on-migrate: true` 설정을 통해 기존 운영 DB의 상태를 유지하면서 안전하게 신규 마이그레이션을 누적할 수 있습니다.

---

## 📘 API 문서 (Swagger UI)

본 프로젝트는 Swagger(SpringDoc)를 사용하여 API를 문서화하고 있습니다. 애플리케이션 실행 후 아래 URL을 통해 API 명세를 확인하고 직접 테스트해 볼 수 있습니다.

- **Swagger UI**: [http://localhost:8080/swagger-ui.html](http://localhost:8080/swagger-ui.html)
- **OpenAPI Spec (JSON)**: [http://localhost:8080/api-docs](http://localhost:8080/api-docs)

### 🔄 프론트엔드 타입 동기화 (Type Automation)

본 프로젝트는 백엔드의 DTO를 **단일 진실 공급원(SSOT)**으로 삼아 프론트엔드 타입을 자동으로 생성합니다.

1. **원칙**: 프론트엔드 개발자는 직접 타입을 작성하지 않고, 백엔드 OpenAPI 명세를 파싱하여 생성된 타입을 사용합니다.
2. **Swagger 어노테이션 활용**:
   - Enum 값을 프론트엔드에 전달하려면 `@Schema(allowableValues = {...})`를 명시해야 합니다.
   - 필수값 여부는 `@NotBlank`, `@NotNull` 등을 통해 명세에 반영됩니다.
3. **동기화 시점**: 백엔드 코드 변경 후 서버를 기동한 상태에서 프론트엔드 워크스페이스의 `pnpm generate:api` 명령어를 실행합니다.

## 🏗️ 신규 도메인 확장 가이드

새로운 업무 도메인을 추가할 때의 표준 절차입니다.

### 1. 패키지 및 클래스 생성
- **패키지**: `cop.kbds.agilemvp.[domain]` 하위에 controller, service, repository를 구성합니다.
- **컨트롤러 태깅**: 프론트엔드 코드 생성을 위해 `@Tag` 어노테이션을 반드시 추가합니다.
  ```java
  @Tag(name = "user", description = "사용자 관리 API")
  @RestController
  @RequestMapping("/api/user")
  public class UserController { ... }
  ```

### 2. DTO 작성 모범 사례 (record 활용)
프론트엔드와 공유되는 계약(Contract)이므로 명확하게 작성합니다.

- **Request DTO**: Bean Validation 어노테이션(`@NotBlank` 등)을 적극 사용하여 에러 메시지를 정의합니다.
  ```java
  public record UserCreateRequest(
      @NotBlank(message = "이름은 필수입니다.")
      String name,
      @Email(message = "이메일 형식이 올바르지 않습니다.")
      String email
  ) {}
  ```
- **Response DTO**: 
  - Enum성 데이터는 `@Schema(allowableValues = {...})`를 사용하여 프론트엔드에 상수 목록을 전달합니다.
  - 날짜 데이터는 `String`으로 포맷팅하여 전달하거나 표준 포맷을 준수합니다.
  ```java
  public record UserResponse(
      Long id,
      String name,
      @Schema(allowableValues = {"ACTIVE", "BLOCK", "WITHDRAW"})
      String status,
      String createdAt
  ) {
      public static UserResponse from(UserEntity entity) {
          return new UserResponse(entity.id(), entity.name(), entity.status(), ...);
      }
  }
  ```

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

| 필드       | 설명                                                    | 값 예시                              |
| ---------- | ------------------------------------------------------- | ------------------------------------ |
| `type`     | 에러 종류 식별 URN                                      | `urn:cop:kbds:agilemvp:error:COM001` |
| `title`    | ErrorCode 이름                                          | `INVALID_INPUT_VALUE`                |
| `status`   | HTTP 상태 코드                                          | `400`                                |
| `detail`   | 에러 상세 설명 (ErrorCode 기본 메시지 또는 구체적 설명) | `잘못된 입력값입니다.`               |
| `instance` | 요청 URI                                                | `/api/sample`                        |

- **확장 필드**:
  - `traceId`: MDC에서 추출한 요청 추적 ID (모든 에러 응답에 포함)
  - `errors`: Validation 에러 시 필드별 상세 에러 목록 (`Map<String, String>`)

### 3. 성공 응답 규격

컨트롤러가 순수 DTO를 직접 반환하며, 별도의 래핑 없이 HTTP 상태 코드로 결과를 전달합니다.

| 작업           | HTTP 메서드 | 경로               | 상태 코드        | 응답 바디       |
| -------------- | ----------- | ------------------ | ---------------- | --------------- |
| 전체 목록 조회 | `GET`       | `/api/sample`      | `200 OK`         | DTO List (JSON) |
| 개별 조회      | `GET`       | `/api/sample/{id}` | `200 OK`         | DTO (JSON)      |
| 생성           | `POST`      | `/api/sample`      | `201 Created`    | 없음 (void)     |
| 전체 수정      | `PUT`       | `/api/sample/{id}` | `200 OK`         | DTO (JSON)      |
| 부분 수정      | `PATCH`     | `/api/sample/{id}` | `200 OK`         | DTO (JSON)      |
| 삭제           | `DELETE`    | `/api/sample/{id}` | `204 No Content` | 없음 (void)     |

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

| 구분            | `PUT`                                   | `PATCH`                            |
| --------------- | --------------------------------------- | ---------------------------------- |
| **의미**        | 리소스 **전체 교체**                    | 리소스 **일부 수정**               |
| **미전송 필드** | `null` 또는 기본값으로 초기화           | **기존 값 유지**                   |
| **Validation**  | `@NotBlank` 등 필수값 검증 적용         | 모든 필드 Optional (null 허용)     |
| **멱등성**      | 멱등 (동일 요청 → 동일 결과)            | 멱등                               |
| **사용 예시**   | 양식 전체 재전송 (**MVP 권장 Default**) | 특정 필드만 수정 (토글, 상태 변경) |

> [!TIP]
> **MVP 협업 전략**: 프론트엔드의 불변 도메인 모델(Readonly VO) 특성상 폼 제출 시 전체 데이터를 보내는 것이 훨씬 효율적입니다. 따라서 생산성을 위해 **PUT을 기본 수정 메서드로 합의**하고, PATCH는 성사가 매우 무거운 리소스나 단일 상태 변경 시에만 제한적으로 사용합니다.

#### 코드 구현 포인트

| 레이어          | PUT 구현                          | PATCH 구현                            |
| --------------- | --------------------------------- | ------------------------------------- |
| **Request DTO** | `@NotBlank` 등 필수 검증          | 검증 없이 모든 필드 nullable          |
| **Controller**  | `@PutMapping` + `@Valid`          | `@PatchMapping` (검증 없음)           |
| **Domain**      | 새 객체 직접 생성                 | `applyPatch()` — null 필드 건너뜀     |
| **SQL**         | `UPDATE ... SET col = ...` (전체) | `<if test="col != null">` Dynamic SQL |

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

- **`SampleController`**: HTTP 요청 매핑 및 순수 DTO 직접 반환. `@ResponseStatus`로 적절한 HTTP 상태 코드를 명시합니다.
  - `GET /api/sample` — 전체 샘플 목록을 JSON 배열로 반환.
  - `GET /api/sample/{id}` — `@PathVariable`로 단건 샘플 조회. 없으면 404 (ENTITY_NOT_FOUND).
- **`SampleCreateRequest` / `SampleUpdateRequest` / `SampleResponse`**: 데이터 전송 객체(DTO). Java **`record`**를 활용한 불변 객체입니다.
- **`SamplePatchRequest`**: PATCH 전용 요청 DTO. 모든 필드가 `Optional(nullable)`이며, `@Valid` 없이 사용합니다. **보내지 않은 필드(`null`)는 기존 값이 유지됩니다.**

### 2. 애플리케이션 / 도메인 계층 (`service`)

- **`SampleService`**: 비즈니스 로직 조율. `SampleRepository` 인터페이스에만 의존하여 기술 환경 변화에 대응(DIP)합니다.
  - **객체 생성 캡슐화**: 외부에서 임의의 필드(특히 `id`) 조작을 방지하기 위해 `@Builder`를 `PRIVATE`으로 제한하고, **정적 팩토리 메서드(`create()`)** 사용을 강제합니다.
  - **Self-Validation**: 생성 시점에 유효성을 스스로 검증합니다.
  - **Anemic Model 방지**: `isUrgent()`, `getFormattedMessage()` 등 도메인 로직을 내부에 캡슐화하고 있습니다.
  - **`applyPatch(newMessage, newStatus)`**: PATCH 부분 업데이트 전용 메서드. `null`인 인자는 기존 값을 유지하며, 변경된 결과를 새 객체로 반환합니다.

### 3. 인프라 / DB 계층 (`repository`)

- **`SampleRepository`**: 애플리케이션 계층에서 정의한 영속성 인터페이스.
- **`SampleRepositoryImpl`**: MyBatis(`SampleMapper`)를 사용하는 실제 구현체(Adapter).
- **`SampleMapper.java` & `SampleMapper.xml`**: SQL 매핑 및 실행.
  - `Sample`이 불변 속성을 유지할 수 있도록 `<constructor>` 매핑을 통해 결과를 주입합니다.

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

---

## 📘 Architecture Decision Records (ADRs)

본 문서는 백엔드 서비스의 주요 아키텍처 결정 사항을 기록합니다.

### 🌐 공통 (Common) 아키텍처 결정 사항

- **[전체 프로젝트 루트 (Root) ADRs](../../README.md#-1-공통-common-아키텍처-결정-사항)**에서 확인 가능합니다. (리소스 수정 규약, 유효성 검증 SSOT, Feature Toggle 등)

### 🖥️ 백엔드 (BE) 아키텍처 결정 사항

#### ADR-B01: 데이터 접근 기술 – 인적 리소스를 고려한 MyBatis 선택

- **Context**: JPA/Hibernate는 글로벌 표준이지만, 현재 가용된 개발팀은 레거시 금융권 SI/SM 환경(SQL 중심)에 주로 익숙합니다. 애자일 MVP의 핵심인 '초기 딜리버리 속도 확보'를 위해 러닝 커브를 낮춰야 했습니다.
- **Decision**: MyBatis를 채택합니다. 단, 도메인 불변성 유지를 위해 Setter를 금지하고 `<constructor>` 매핑으로 DB 결과를 주입합니다. (인터페이스 기반 레포지토리 패턴 적용)
- **Consequences**: 팀 역량을 100% 발휘하여 개발 속도를 극대화할 수 있으나, 단순 CRUD에도 쿼리를 작성해야 하는 보일러플레이트가 발생합니다.
- **When to Revisit**: 단순 CRUD가 대다수를 차지하게 될 때 Spring Data JDBC 또는 JPA 도입 검토.

#### ADR-B02: 패키지 구조 – 도메인 내 3계층 분리

- **Context**: 순수 DDD의 평평한 패키지 구조는 클래스 증가 시 가독성이 떨어집니다.
- **Decision**: `cop.kbds.agilemvp.{domain}` 내부에 web, service, infra 하위 패키지를 둡니다. 도메인 엔티티는 service에 위치시킵니다.
- **Consequences**: 기존 Spring의 3계층 구조에 익숙한 개발자에게 친숙함을 주며, 도메인 단위의 높은 응집도를 확보합니다.

#### ADR-B03: 도메인 모델 생성 방식 및 테스팅 전략

- **Context**: 모델 생성 시 `@Builder`가 공개되어 있으면 `id` 등 내부 필드를 외부에서 임의로 조작할 수 있어 데이터 무결성이 깨질 위험이 있습니다.
- **Decision**:
  1. **정적 팩토리 메서드(`create()`) 사용**: 엔티티 생성 시 비즈니스 규칙(검증, 기본값 설정 등)을 보장하기 위해 `create()` 메서드 사용을 강제합니다.
  2. **Lombok `@Builder` 접근 제한**: `@Builder(access = AccessLevel.PRIVATE)`를 적용하여 외부에서 빌더를 직접 호출하는 것을 금지합니다.
  3. **단위 테스트 집중**: 순수 비즈니스 로직을 담은 도메인 엔티티 내부에 집중(100% 커버리지 목표)하며, 컨트롤러/인프라는 핵심 시나리오 통합 테스트만 작성합니다.
- **Consequences**: 객체 생성의 일관성과 캡슐화가 강화되어 안전한 도메인 모델을 유지할 수 있습니다.

#### ADR-B04: 로깅 및 트레이싱 표준화 (Trace ID)

- **Context**: 장애 발생 시 요청부터 응답까지의 흐름을 추적할 수 있어야 합니다.
- **Decision**: 모든 요청에 고유한 UUID를 발급하여 SLF4J MDC(`traceId`)에 저장하고, 응답 헤더 및 RFC 9457 ProblemDetail 에러 응답 확장에 포함합니다.

#### ADR-B05: 인증 및 회원 도메인 단방향 의존성 규격

- **Context**: 회원(User) 정보와 인증(Auth) 처리는 복잡도가 높은 독립적 관심사이나, 강하게 결합되기 쉽습니다. 상호 참조가 발생하면 의존성 지옥에 빠져 도메인 격리가 훼손됩니다.
- **Decision**: `User` 도메인과 `Auth` 도메인을 완전히 격리하고, `Auth -> User` 단방향 의존성 흐름만 허용합니다. (예: `AuthService`가 `UserService`를 호출하지만, `UserService` 내에는 어떠한 JWT나 Security 라이브러리 의존성도 가지지 않음)
- **Consequences**: 결합도가 낮아져 추후 인증 수단 교체나 회원 서비스 독립 확장이 용이해지며, 도메인의 무결성이 안전하게 보호됩니다.

#### ADR-B05: 데이터베이스 프로파일 분리 전략

- **Context**: 로컬 개발에서는 별도 DB 설치 없이 빠르게 실행할 수 있어야 하고, 운영 환경에서는 PostgreSQL에 안전하게 접속해야 합니다. DB 접속 정보가 코드에 포함되면 보안 사고로 이어질 수 있습니다.
- **Decision**: Spring Profile을 활용하여 환경별 설정을 분리합니다.
  - `application.yml` (기본): H2 인메모리 DB — 로컬 개발 및 테스트용
  - `application-prod.yml` (운영): PostgreSQL — `${DB_URL}`, `${DB_USERNAME}`, `${DB_PASSWORD}` 환경변수 참조
  - 운영 배포 시 `--spring.profiles.active=prod`로 실행하며, DB 접속 정보는 GitHub Secrets → deploy.sh를 통해 JVM 시스템 프로퍼티(`-D`)로 주입됩니다.
- **Consequences**: DB 접속 정보가 코드베이스에 노출되지 않으며, 로컬 개발자는 별도 DB 설정 없이 즉시 실행할 수 있습니다.

---

## 🔐 JWT 기반 인증 및 회원가입 (MVP)

본 프로젝트는 MVP 딜리버리를 목표로 하여 **만료되지 않는 가장 단순하고 퓨어한 JWT** 및 **Spring Security**를 활용한 무상태(Stateless) 인증 체계를 구현하고 있습니다.

### 1. 주요 특징
- **패스워드 암호화**: BCrypt 해시 함수(`BCryptPasswordEncoder`)를 활용한 비밀번호 단방향 암호화 보관.
- **단방향 의존성**: `Auth` 패키지가 `User` 패키지를 참조하는 구조를 엄격히 준수하여 도메인 간 결합도를 최적화했습니다.
- **Stateless 필터 체인**: JWT 필터(`JwtAuthenticationFilter`)를 활용하여 HTTP 요청당 `Authorization: Bearer <token>` 헤더를 파싱하고 SecurityContext 인증을 조율합니다.
- **로그인 시각 자동 업데이트**: 로그인 성공 검증이 완료되는 즉시, 데이터베이스의 최종 로그인 일시(`last_login_at`) 필드가 현재 시각으로 자동 업데이트됩니다.
- **보안 강화 소프트 탈퇴**: 회원 탈퇴(`DELETE /api/user`) 시, 타인의 ID 조작을 원천적으로 막기 위해 인자로 식별 정보를 받지 않고, 오직 인증 헤더의 JWT 세션 정보에서만 본인의 `loginId`를 추출하여 계정 상태를 소프트 삭제(`status = 'deleted'`) 처리합니다. 탈퇴 처리된 사용자는 추후 로그인 조회 대상에서 자동으로 배제됩니다.

### 2. API 규격
- **회원가입**: `POST /api/auth/register` (Body: `{ "loginId": "...", "nickname": "...", "password": "..." }`) -> `201 Created`
- **로그인**: `POST /api/auth/login` (Body: `{ "loginId": "...", "password": "..." }` -> Response: `{ "accessToken": "...", "nickname": "..." }`) -> `200 OK`
- **본인 정보 조회**: `GET /api/user/me` (Header: `Authorization: Bearer <token>`) -> Response: `{ "id": 1, "loginId": "...", "nickname": "...", "status": "active", "lastLoginAt": "...", "createdAt": "..." }` -> `200 OK`
- **회원 탈퇴(본인)**: `DELETE /api/user` (Header: `Authorization: Bearer <token>`) -> `204 No Content`

---

## 🤖 AWS Bedrock 인사이트 연동

`POST /api/insights`의 URL과 응답 스키마(`summary`, `cards`, `generatedAt`)는
Bedrock 활성화 여부와 관계없이 동일합니다. 로컬 환경에서는 기본적으로 기존 Mock 응답을 사용하며,
운영 환경에서만 설정을 주입해 Bedrock Converse API를 활성화합니다.

| 환경변수 | 필수 여부 | 기본값 | 설명 |
|:--|:--|:--|:--|
| `BEDROCK_ENABLED` | 아니요 | `false` | `true`일 때 Bedrock 호출 활성화 |
| `BEDROCK_REGION` | 활성화 시 필수 | `ap-northeast-2` | Bedrock Runtime 클라이언트 리전 |
| `BEDROCK_MODEL_ID` | 활성화 시 필수 | 없음 | Foundation Model 또는 Inference Profile ID |
| `BEDROCK_MAX_TOKENS` | 아니요 | `1200` | 모델 응답 최대 토큰 수 |
| `BEDROCK_TEMPERATURE` | 아니요 | `0.2` | 모델 응답 무작위성 (`0`~`1`) |
| `BEDROCK_API_CALL_TIMEOUT` | 아니요 | `30s` | Bedrock 단일 호출 시도 제한 시간 |

현재 인프라 합의 값은 다음과 같습니다.

```text
BEDROCK_ENABLED=true
BEDROCK_REGION=ap-northeast-2
BEDROCK_MODEL_ID=apac.anthropic.claude-3-5-sonnet-20240620-v1:0
```

AWS SDK는 기본 Credential Provider Chain을 사용합니다. 운영 배포에서는
`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`를 GitHub Secrets로 주입하며 실제 값을 소스에
기록하지 않습니다. 실행 역할을 적용할 수 있는 환경으로 이전하면 별도 코드 변경 없이 역할 자격증명을
사용할 수 있습니다.

Bedrock 활성화 시 리전·모델 ID·토큰·온도·타임아웃 설정을 시작 단계에서 검증합니다. 호출 결과가
정해진 JSON 스키마와 다르거나 카드가 2~3개가 아니면 성공 응답으로 전달하지 않습니다.

| 상황 | HTTP 상태 | 오류 코드 |
|:--|:--|:--|
| 모델 또는 API 호출 타임아웃 | `504` | `INS001` |
| IAM 권한·모델 접근·네트워크 오류 | `503` | `INS002` |
| 모델 응답 형식 오류 | `502` | `INS003` |

vNext `POST /api/v2/analyses`는 발견과 후보의 근거 연결을 포함한 JSON을 생성하므로
출력 토큰 한도를 최소 `4096`으로 적용합니다. 더 큰 `BEDROCK_MAX_TOKENS` 설정은 유지합니다.
응답 종료 사유가 `end_turn`이 아니면 부분 JSON을 사용하지 않습니다. 종료 사유·출력 토큰 수,
JSON/근거 검증 거부 사유만 진단 로그에 남기며 입력 내역과 모델 응답 원문은 기록하지 않습니다.
문장에 근거 토큰 밖의 숫자가 있는 `LITERAL_NUMBER` 위반에 한해 같은 모델에 한 번 교정을 요청합니다.
교정 결과에도 기존의 모든 근거 검증을 적용하고, 다시 실패하면 `AI_FAILED`를 유지합니다.
그 외 JSON/근거 오류와 timeout·서비스 오류는 자동 재요청하지 않습니다.

실연동 완료 전 확인 항목:

1. `github-deploy-user`에 `bedrock:InvokeModel` 권한이 적용되어 있는지 확인
2. GitHub Secrets에 필수 환경변수와 AWS 자격증명이 등록되어 있는지 확인
3. 배포 환경에서 `/api/insights` 정상 요청이 실제 모델 응답을 반환하는지 확인
4. 잘못된 모델 ID 또는 권한 제거 상태에서 RFC 9457 실패 응답이 반환되는지 확인

---

## 🔗 관련 문서 바로가기

- **[전체 프로젝트 루트 (Root)](../../README.md)**
- **[프론트엔드 레파지토리 (React)](../frontend-repo/README.md)**
