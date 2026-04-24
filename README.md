# Agile MVP Project

모던 웹 기술(React/Spring Boot)을 적용한 Agile MVP 프로젝트입니다. 이 저장소(Repository)는 Monorepo 형태로 구성되어 있으며, 프론트엔드와 백엔드 서브젝트를 나누어 관리하고 있습니다.

## 📂 프로젝트 진입점

각 워크스페이스의 문서(README) 및 상세 아키텍처 설명은 아래 링크를 통해 확인하실 수 있습니다.

### 1. [Frontend Repository (React)](./apps/frontend-repo/README.md)
React 19 기반의 프론트엔드 웹 애플리케이션입니다. 
- **주요 스펙**: TypeScript, React 19, React Router v7, React Query v5, Vite, MSW
- 클라이언트 컴포넌트 관점에서의 API 통신, 로컬 CRUD Mocking, 데이터 통합(Loader/Action) 핸들링에 대한 샘플 코드가 작성되어 있습니다.

### 2. [Backend Repository (Spring Boot)](./apps/backend-repo/README.md)
Spring Boot 4 기반의 RESTful API 시스템입니다.
- **주요 스펙**: Java 25, Spring Boot 4, MyBatis, H2 Database, Gradle
- RFC 9457의 글로벌 에러 처리 표준, API 맵핑 및 Swagger 구성 등 개발 모범 사례(Boilerplate) 코드가 3계층 아키텍쳐 단위로 작성되어 있습니다.

---

## 🚀 워크스페이스 실행 가이드

각 워크스페이스 폴더로 이동하여 독립적인 실행 스크립트로 동작을 확인할 수 있습니다.

### 프론트엔드 (Frontend Repo) 구동
```bash
cd apps/frontend-repo
pnpm install
pnpm dev
```
- 기본 실행: `http://localhost:5173`
- 의존성 설치 이후 `pnpm dev` 시 MSW 모의 서버를 통한 로컬 환경으로 기동됩니다.

### 백엔드 (Backend Repo) 구동
```bash
cd apps/backend-repo
./gradlew bootRun
```
- 기본 실행: `http://localhost:8080`
- 구동 후 API 문서화 사이트인 [Swagger UI (http://localhost:8080/swagger-ui.html)](http://localhost:8080/swagger-ui.html)를 통해 상세 스펙을 확인할 수 있습니다.

---

## 🤝 협업 및 아키텍처 원칙 (Agile Principles)

프론트엔드와 백엔드의 원활한 협업과 빠른 MVP 출시를 위해 다음과 같은 공통 원칙을 준수합니다.

1.  **PUT 중심의 업데이트 전략**: FE의 불변 객체 모델과의 정합성을 위해 리소스 수정 시 **PUT(전체 교체)** 방식을 기본(Default)으로 사용합니다. PATCH는 상태 토글 등 아주 제한적인 용도로만 활용하여 개발 복잡도를 낮춥니다.
2.  **유효성 검증의 단일 진실 공급원(SSOT)**: 프론트엔드(Zod)는 '데이터 파싱 및 타입 보장'에 집중하고, 복잡한 비즈니스 유효성 검증은 **백엔드(@Valid & RFC 9457)**에 전적으로 위임합니다. 이를 통해 검증 규칙 변경 시 FE의 코드 수정 없이도 일관된 에러 메시지를 사용자에게 전달합니다.
3.  **RFC 9457 표준 에러 처리**: 모든 에러 메시지는 표준화된 `ProblemDetail` 규격으로 전달되며, FE는 이를 기반으로 폼 필드와 에러 메시지를 자동 매핑합니다.

---

## 🔗 관련 문서 바로가기
- **[프론트엔드 레파지토리 (React)](./apps/frontend-repo/README.md)**
- **[백엔드 레파지토리 (Spring Boot)](./apps/backend-repo/README.md)**
