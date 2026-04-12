# Agile MVP Project

본 프로젝트는 Spring Boot 기반의 백엔드 애플리케이션으로, 개발시 참고할 수 있는 레퍼런스 예시로 `sample` 패키지를 포함하고 있습니다.

## 🛠️ 기술 스택
- **언어**: Java 25
- **프레임워크**: Spring Boot 4
- **ORM / 데이터베이스 접근**: MyBatis
- **데이터베이스**: H2 데이터베이스 (로컬/테스트 환경), 추후 PostgreSQL 적용 예정
- **빌드 툴**: Gradle

## 📂 Sample 패키지 구조 및 데이터 처리 흐름

`cop.kbds.agilemvp.sample` 패키지는 의존성 역전 원칙(DIP)을 적용하여 도메인/비즈니스 계층을 인프라 기술로부터 격리한 클린 아키텍처 형태의 레퍼런스 코드입니다.

### 1. 웹 계층 (Presentation Layer)
#### `SampleController.java`
- **역할**: 클라이언트의 HTTP 요청을 매핑하고 응답을 반환합니다. (`GET /api/sample/hello`)
- **흐름**: 클라이언트로 부터 `name` 파라미터가 포함된 `SampleRequestDTO`를 받아 애플리케이션 계층인 `SampleService`로 전달하고, 가공된 결과인 `List<SampleResponseDTO>`를 반환합니다.

#### `SampleRequestDTO.java` & `SampleResponseDTO.java`
- **역할**: 외부 환경(클라이언트)의 요청 파라미터를 받거나(Request), 응답을 반환(Response)하기 위한 전용 객체들입니다.
- **특징**: 무분별한 데이터 변경을 막기 위해 두 클래스 모두 **Java `record`**로 설계된 완전한 불변 객체입니다. 응답 객체는 내부의 정적 팩토리 메서드 `from(vo, name)`을 통해 요청받은 이름(name)과 도메인 객체(`SampleVO`)의 DB 조회 결과를 조합하여 안전하게 가공 후 반환합니다.

### 2. 애플리케이션 / 도메인 계층 (Application & Domain Layer)
#### `SampleService.java`
- **역할**: 애플리케이션의 핵심 비즈니스 로직을 조율합니다.
- **흐름**: MyBatis 인프라(Mapper)에 직접 의존하지 않고, 순수 Java 인터페이스인 `SampleRepository`에만 의존합니다(DIP 적용). 조회된 데이터를 비즈니스 로직(`isValid()`)으로 필터링하고 DTO로 변환하여 반환합니다.

#### `SampleRepository.java` (비즈니스 포트)
- **역할**: 도메인/애플리케이션 계층이 외부 인프라와 소통하기 위해 정의한 **순수 Java 인터페이스**입니다. 데이터베이스 접근 기술(MyBatis, JPA 등)에 종속되지 않습니다.

#### `SampleVO.java`
- **역할**: 비즈니스 맥락에서 데이터를 담고 있는 값 객체(Value Object)입니다.
- **특징**: 완전한 불변성과 값 기반 비교를 위해 **Java `record`**를 활용했습니다. 스스로 자신의 데이터가 올바른지 판단하는(`isValid()`) 행위(메서드)를 가지고 있어, 빈약한 도메인 모델(Anemic Domain Model)을 탈피하고 있습니다.

### 3. 인프라 계층 (Infrastructure Layer)
#### `SampleRepositoryImpl.java` (인프라 어댑터)
- **역할**: `SampleRepository` 인터페이스의 실제 구현체로, MyBatis를 사용하는 `SampleMapper`에 의존하여 실제 데이터를 가져옵니다. 추후 데이터베이스 접근 기술(JPA 등)이 변경되더라도 이 어댑터 클래스만 교체하면 서비스 로직(Service)에는 전혀 영향을 주지 않습니다.

#### `SampleMapper.java` & `SampleMapper.xml`
- **역할**: MyBatis를 활용해 실제 데이터베이스에 쿼리를 수행합니다.
- **XML 위치**: `src/main/resources/mapper/sample/SampleMapper.xml`
- **특징 및 쿼리 내용**:
  `SampleVO`가 기본 생성자가 없는 Java `record`로 구현되었기 때문에, 일반적인 `resultType` 매핑 대신 `<resultMap>`의 `<constructor>`를 활용하여 데이터베이스 조회 결과를 직접 객체 생성자로 주입하고 있습니다.
  ```xml
  <mapper namespace="cop.kbds.agilemvp.sample.SampleMapper">
      <resultMap id="SampleVOResultMap" type="cop.kbds.agilemvp.sample.SampleVO">
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
3. 정상적으로 동작할 경우 `temp` 테이블에 저장된 `message` 데이터에 요청 파라미터 정보가 결합되어 JSON 형태로 응답됩니다. (예: `[{"message":"사용자님, DB메세지"}]`)
