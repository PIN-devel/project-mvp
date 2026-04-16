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

## 🏷️ 공통 API 응답 규격 및 표준 에러 처리 (API Response & Error Code)

클라이언트가 예측 가능하고 일관된 포맷으로 데이터를 받을 수 있도록 `ApiResponse` 구조를 설계하여 제공합니다. 더불어, 단순 HTTP 상태 코드만으로는 알 수 없는 다양한 비즈니스 예외 상황을 세분화하여 다루기 위해 표준 에러 코드(Error Code) 시스템을 도입했습니다.

### 1. 표준 에러 코드 규격 (`ErrorCode`)
도메인별로 확장 가능한 에러 처리를 위해 `ErrorCode` 인터페이스를 제공하고 구현체(Enum)를 통해 일관된 에러 정보를 강제합니다.
- **위치**: `cop.kbds.agilemvp.common.exception.ErrorCode`
- **강제 스펙**:
  - `getHttpStatus()`: 통신 규격을 위한 `HttpStatus` 객체
  - `getCode()`: 클라이언트에게 노출될 비즈니스 에러 식별 코드 (예: `"COM001"`, `"USR001"`)
  - `getMessage()`: 에러에 대한 상세 메시지 (로깅 및 클라이언트 노출용)

### 2. API 응답 규격 (`ApiResponse`)
- **위치**: `cop.kbds.agilemvp.common.api.ApiResponse`
- **응답 구조**:
  - `success` (`boolean`): API 호출 성공 여부 (`true`/`false`)
  - `errorCode` (`String`): 비즈니스 에러 식별 코드 (성공 시 `null`, 실패 시 에러 코드 문자열)
  - `message` (`String`): 클라이언트에게 전달할 메시지 (성공 기본 메시지, 에러 상세 원인 등)
  - `data` (`T`): 실제 비즈니스 응답 데이터 (제네릭 타입 지원, 에러 시 `null`)
- **주요 특징**: 상태나 정보의 무분별한 조작을 막기 위해 완전한 불변 객체(Java `record`)로 구현되었습니다.
- **아키텍처 규칙**: 의존성 역전 원칙(DIP)을 준수하기 위해 데이터베이스 로직(Mapper)이나 도메인 영역에 종속시키지 않고, 오직 웹 계층(Controller)의 최종 응답 반환 단계에서만 데이터를 감싸는(Wrapping) 용도로 제한하여 사용합니다.

#### 📝 JSON 응답 예시 (클라이언트 전달 포맷)
프론트엔드/모바일 클라이언트는 항상 아래와 같이 예측 가능한 형태의 JSON을 전달받게 됩니다.
```json
// 정상 호출 (성공)
{
  "success": true,
  "errorCode": null,
  "message": "요청이 성공적으로 처리되었습니다.",
  "data": [ { "message": "사용자님, DB메세지" } ]
}

// 비즈니스 예외 발생 (에러)
{
  "success": false,
  "errorCode": "COM003",
  "message": "요청한 데이터를 찾을 수 없습니다.",
  "data": null
}
```

### 3. 👩‍💻 개발자 가이드 (단위 업무 개발 시)
AOP 기반 전역 처리가 적용되어 있으므로, 개발 시 핵심 비즈니스 로직에만 집중하시면 됩니다!
- **정상 응답 시**: 컨트롤러(`Controller`)에서 별도의 포장 객체(`ApiResponse`) 생성 없이 **순수한 데이터 타입(DTO, List 등)만 반환**하세요. (알아서 공통 포맷으로 변환됩니다)
- **예외 발생 시**: 로직 처리 중 통제 가능한 에러 상황에 직면하면 예외만 던지세요. (`throw new BusinessException(CommonErrorCode.COM001);`) 나머지는 전역 예외 처리기가 담당합니다.

## 📂 Sample 패키지 구조 및 데이터 처리 흐름

`cop.kbds.agilemvp.sample` 패키지는 스프링 프로젝트에서 가장 관습적이고 널리 쓰이는 3계층(웹, 애플리케이션, 인프라) 구조로 구성된 레퍼런스 코드입니다. 유지보수성과 관심사의 분리를 위해 각 계층은 다음과 같이 `controller`, `service`, `repository` 패키지로 명확히 분리 되어있습니다.

### 1. 웹 계층 (`controller` 패키지)
#### `controller/SampleController.java`
- **역할**: 클라이언트의 HTTP 요청을 매핑하고 표준화된 규격으로 응답을 반환합니다. (`GET /api/sample/hello`)
- **흐름**: 클라이언트로 부터 `name` 파라미터가 포함된 `SampleRequest`를 받아 애플리케이션 계층인 `SampleService`로 전달하고, 가공된 결과인 `List<SampleResponse>`를 순수하게 반환합니다. 이때 전역 설정된 `GlobalResponseAdvice`가 자동으로 개입하여 `ApiResponse.success()` 포맷으로 감싸주기 때문에(Wrapping), 컨트롤러는 응답 규격을 신경 쓰지 규칙된 비즈니스 데이터 반환에만 집중할 수 있습니다.

#### `controller/SampleRequest.java` & `controller/SampleResponse.java`
- **역할**: 외부 환경(클라이언트)의 요청 파라미터를 받거나(Request), 응답을 반환(Response)하기 위한 전용 객체들입니다.
- **특징**: 무분별한 데이터 변경을 막기 위해 두 클래스 모두 **Java `record`**로 설계된 완전한 불변 객체입니다. 응답 객체는 내부의 정적 팩토리 메서드 `from(vo, name)`을 통해 요청받은 이름(name)과 도메인 객체(`SampleVO`)의 DB 조회 결과를 조합하여 안전하게 가공 후 반환합니다.

### 2. 애플리케이션 / 도메인 계층 (`service` 패키지)
#### `service/SampleService.java`
- **역할**: 애플리케이션의 핵심 비즈니스 로직을 조율합니다.
- **흐름**: MyBatis 인프라(Mapper)에 직접 의존하지 않고, 순수 Java 인터페이스인 `SampleRepository`에만 의존합니다(DIP 적용). 조회된 데이터를 비즈니스 로직(`isValid()`)으로 필터링하고 응답 객체로 변환하여 반환합니다.

#### `service/SampleVO.java`
- **역할**: 비즈니스 맥락에서 데이터를 담고 있는 값 객체(Value Object)입니다.
- **특징**: 완전한 불변성과 값 기반 비교를 위해 **Java `record`**를 활용했습니다. 스스로 자신의 데이터가 올바른지 판단하는(`isValid()`) 행위(메서드)를 가지고 있어, 빈약한 도메인 모델(Anemic Domain Model)을 탈피하고 있습니다.

### 3. 인프라/DB 계층 (`repository` 패키지)
#### `repository/SampleRepository.java` (리포지토리 인터페이스)
- **역할**: 도메인/애플리케이션 계층이 외부 인프라와 소통하기 위해 정의한 인터페이스입니다. 전통적인 스프링 계층 구조에 따라 인프라/리포지토리 패키지에 위치합니다.

#### `repository/SampleRepositoryImpl.java` (인프라 어댑터)
- **역할**: `SampleRepository` 인터페이스의 실제 구현체로, MyBatis를 사용하는 `SampleMapper`에 의존하여 실제 데이터를 가져옵니다. 추후 데이터베이스 접근 기술(JPA 등)이 변경되더라도 이 어댑터 클래스만 교체하면 서비스 로직(Service)에는 전혀 영향을 주지 않습니다.

#### `repository/SampleMapper.java` & `SampleMapper.xml`
- **역할**: MyBatis를 활용해 실제 데이터베이스에 쿼리를 수행합니다.
- **XML 위치**: `src/main/resources/mapper/sample/SampleMapper.xml`
- **특징 및 쿼리 내용**:
  `SampleVO`가 기본 생성자가 없는 Java `record`로 구현되었기 때문에, 일반적인 `resultType` 매핑 대신 `<resultMap>`의 `<constructor>`를 활용하여 데이터베이스 조회 결과를 직접 객체 생성자로 주입하고 있습니다.
  ```xml
  <mapper namespace="cop.kbds.agilemvp.sample.repository.SampleMapper">
      <resultMap id="SampleVOResultMap" type="cop.kbds.agilemvp.sample.service.SampleVO">
          <constructor>
              <arg column="message" javaType="string"/>
          </constructor>
      </resultMap>

      <select id="getHelloMessages" resultMap="SampleVOResultMap">
          SELECT message FROM temp
      </select>
  </mapper>
  ```

## 🚀 실행 및 테스트 방법
1. 프로젝트 루트 디렉토리에서 애플리케이션을 기동합니다.
   ```bash
   ./gradlew bootRun
   ```
2. API 테스트 도구 (Postman 등) 또는 웹 브라우저를 통해 다음 URL로 `GET` 요청을 호출합니다.
   - **파라미터 없이 호출**:
     ```text
     http://localhost:8080/api/sample/hello
     ```
   - **파라미터와 함께 호출 (예: `name=사용자`)**:
     ```text
     http://localhost:8080/api/sample/hello?name=사용자
     ```
   - **전역 예외 처리 테스트 (BusinessException)**:
     ```text
     http://localhost:8080/api/sample/error
     ```
3. 정상적으로 동작할 경우 `temp` 테이블에 저장된 `message` 데이터에 요청 파라미터 정보가 결합되며, **공통 API 규격(`ApiResponse`)으로 자동 포장되어 JSON 형태**로 응답됩니다.
   - **정상 응답 예시 (`/hello`)**:
     ```json
     {
       "success": true,
       "errorCode": null,
       "message": "요청이 성공적으로 처리되었습니다.",
       "data": [
         {
           "message": "사용자님, DB메세지"
         }
       ]
     }
     ```
   - **에러 응답 예시 (`/error`)**:
     ```json
     {
       "success": false,
       "errorCode": "SAM003",
       "message": "강제로 발생시킨 비즈니스 예외 테스트입니다.",
       "data": null
     }
     ```
