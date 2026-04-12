# Agile MVP Project

본 프로젝트는 Spring Boot 기반의 백엔드 애플리케이션으로, 기본 아키텍처와 MyBatis 연동을 보여주는 `sample` 패키지를 포함하고 있습니다.

## 🛠️ 기술 스택
- **언어**: Java 25
- **프레임워크**: Spring Boot 4
- **ORM / 데이터베이스 접근**: MyBatis
- **데이터베이스**: H2 데이터베이스 (로컬/테스트 환경), 추후 PostgreSQL 적용 예정
- **빌드 툴**: Gradle

## 📂 Sample 패키지 구조 및 데이터 처리 흐름

`cop.kbds.agilemvp.sample` 패키지는 Spring Web MVC 아키텍처와 MyBatis를 활용한 기본적인 REST API 데이터 조회 흐름을 보여주는 레퍼런스 코드입니다.

### 1. Controller (`SampleController.java`)
- **역할**: 클라이언트의 HTTP 요청을 매핑하고 응답을 반환합니다.
- **엔드포인트**: `GET /api/sample/hello`
- **흐름**: 요청이 들어오면 의존성 주입된 `SampleService.getHelloMessages()`를 호출하여 `List<Map<String, Object>>` 형태의 응답을 반환합니다.

### 2. Service (`SampleService.java`)
- **역할**: 애플리케이션의 비즈니스 로직을 담당합니다.
- **흐름**: Controller로부터 요청을 위임받아 `SampleMapper`의 메서드를 호출하여 실질적인 데이터 조회를 수행합니다.

### 3. Mapper Interface (`SampleMapper.java`)
- **역할**: 비즈니스 로직과 데이터베이스 액세스 사이의 인터페이스 역할을 합니다.
- **흐름**: `@Mapper` 어노테이션을 통해 MyBatis가 구현체를 자동 생성하며, 정의된 `getHelloMessages()` 메서드는 이름이 같은 XML 파일 내의 SQL과 매핑됩니다.

### 4. Mapper XML (`SampleMapper.xml`)
- **위치**: `src/main/resources/mapper/sample/SampleMapper.xml`
- **역할**: 실행될 실제 SQL 쿼리를 분리하여 관리합니다.
- **쿼리 내용**:
  ```xml
  <mapper namespace="cop.kbds.agilemvp.sample.SampleMapper">
      <select id="getHelloMessages" resultType="map">
          SELECT message FROM temp
      </select>
  </mapper>
  ```
  `SampleMapper` 인터페이스의 패키지와 일치하는 `namespace`를 가지고 있으며, 데이터베이스의 `temp` 테이블에서 `message` 데이터를 조회합니다.

## 🚀 실행 및 테스트 방법
1. 프로젝트 루트 디렉토리에서 애플리케이션을 기동합니다.
   ```bash
   ./gradlew bootRun
   ```
2. API 테스트 도구 (Postman 등) 또는 웹 브라우저를 통해 다음 URL로 `GET` 요청을 호출합니다.
   ```text
   http://localhost:8080/api/sample/hello
   ```
3. 정상적으로 동작할 경우 `temp` 테이블에 저장된 `message` 데이터가 JSON 형태로 응답됩니다.
