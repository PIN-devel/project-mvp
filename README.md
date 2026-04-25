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

## 📘 Architecture Decision Records (ADRs) - Project-MVP-COP

본 문서는 Project-MVP-COP(Agile MVP) 프로젝트의 주요 아키텍처 결정 사항을 기록합니다. 각 ADR은 **맥락(Context)**, **결정(Decision)**, **결과(Consequences)**, **재검토 시점(When to Revisit)**을 포함하며, 신규 팀원 온보딩 및 향후 기술 부채 상환 시점의 지표로 활용됩니다.

### 🌐 1. 공통 (Common) 아키텍처 결정 사항

#### ADR-C01: 리소스 수정 규약 – PUT(전체 교체) 우선 전략
- **Context**: REST API에서 리소스 업데이트는 PUT(전체)과 PATCH(부분)로 나뉩니다. 프론트엔드(React)의 도메인 모델은 불변성(Immutability)을 띠고 있어 폼 제출 시 항상 전체 데이터를 쥐고 있습니다. PATCH를 위해 변경된 필드만 추려내거나 백엔드에서 암묵적 기본값을 주입하는 것은 상태 동기화의 복잡도를 높입니다.
- **Decision**: 리소스 수정 시 FE는 항상 전체 DTO를 전송하고, BE는 이를 받아 PUT(전체 교체) 방식으로 덮어쓰는 것을 기본(Default) 컨벤션으로 합의합니다. PATCH는 상태 토글(status) 등 극히 제한적인 단일 필드 변경에만 예외적으로 허용합니다.
- **Consequences**: FE/BE 간 데이터 정합성 충돌을 예방하고 FE 상태 관리 복잡성을 대폭 낮춥니다. 단, 페이로드 크기가 미세하게 증가합니다.
- **When to Revisit**: 여러 사용자의 동시 편집 충돌 병합(CRDT)이 필요해지거나 트래픽 병목이 발생할 때.

#### ADR-C02: 유효성 검증(Validation)의 단일 진실 공급원 (SSOT)
- **Context**: FE와 BE 양쪽에서 동일한 비즈니스 룰을 이중으로 검증하면 스펙 변경 시 유지보수 피로도가 급증합니다.
- **Decision**: 프론트엔드(Zod)는 '데이터 파싱 및 런타임 타입 보장(Parse, don't validate)'에만 집중합니다. 복잡한 비즈니스 유효성 검증은 **백엔드(@Valid 및 비즈니스 로직)**에 전적으로 위임하며, 검증 실패 시 RFC 9457(application/problem+json) 표준 규격으로 상세 필드 에러를 반환합니다.
- **Consequences**: 검증 룰이 BE에 중앙화되어 유지보수가 용이해지며, FE는 BE가 주는 에러 메시지를 렌더링하기만 하면 됩니다.

#### ADR-C03: Feature Toggle 기반 무중단 통합 (애자일 병합 전략)
- **Context**: 8인 체제에서 긴 브랜치 작업은 심각한 병합 충돌을 낳습니다. 미완성 기능이라도 Main 브랜치에 자주 병합해야 합니다.
- **Decision**: 백엔드는 @FeatureToggle 어노테이션을 통해 환경 변수로 API 접근을 제어하며 비활성 시 404 Not Found를 반환합니다. 프론트엔드는 이 404 응답을 ErrorBoundary에서 캐치하여 우아하게 Fallback UI("준비 중인 기능입니다")를 렌더링합니다.
- **Consequences**: 인프라 없이 코드 레벨에서 미완성 기능을 숨길 수 있어 앱 크래시를 방지하고 빠른 통합이 가능합니다.

---

### 🖥️ 2. 백엔드 (BE) 아키텍처 결정 사항

#### ADR-B01: 데이터 접근 기술 – 인적 리소스를 고려한 MyBatis 선택
- **Context**: JPA/Hibernate는 글로벌 표준이지만, 현재 가용된 8인의 개발팀은 레거시 금융권 SI/SM 환경(SQL 중심)에 주로 익숙합니다. 애자일 MVP의 핵심인 '초기 딜리버리 속도 확보'를 위해 러닝 커브를 낮춰야 했습니다.
- **Decision**: MyBatis를 채택합니다. 단, 도메인 불변성 유지를 위해 Setter를 금지하고 `<constructor>` 매핑으로 DB 결과를 주입합니다. (인터페이스 기반 레포지토리 패턴 적용)
- **Consequences**: 팀 역량을 100% 발휘하여 개발 속도를 극대화할 수 있으나, 단순 CRUD에도 쿼리를 작성해야 하는 보일러플레이트가 발생합니다.
- **When to Revisit**: 단순 CRUD가 대다수를 차지하게 될 때 Spring Data JDBC 또는 JPA 도입 검토.

#### ADR-B02: 패키지 구조 – 도메인 내 3계층 분리
- **Context**: 순수 DDD의 평평한 패키지 구조는 클래스 증가 시 가독성이 떨어집니다.
- **Decision**: `cop.kbds.agilemvp.{domain}` 내부에 web, service, infra 하위 패키지를 둡니다. 도메인 엔티티는 service에 위치시킵니다.
- **Consequences**: 기존 Spring의 3계층 구조에 익숙한 개발자에게 친숙함을 주며, 도메인 단위의 높은 응집도를 확보합니다.

#### ADR-B03: 도메인 모델 생성 방식 혼용 및 테스팅 전략
- **Context**: 모델 생성 시 Builder와 정적 팩토리가 혼용되고 있으며, 빠른 배포를 위해 인프라 계층까지 100% 테스트를 강제하기 어렵습니다.
- **Decision**: 1. 현재는 `@Builder`(ID 제외)와 정적 팩토리를 혼용하되 향후 컨벤션을 통일합니다. 2. 단위 테스트는 순수 비즈니스 로직을 담은 **도메인 엔티티 내부에 집중(100% 커버리지 목표)**하며, 컨트롤러/인프라는 핵심 시나리오 통합 테스트만 작성합니다.
- **Consequences**: 핵심 비즈니스 룰을 저비용으로 보호하지만, 인프라 버그가 늦게 발견될 수 있습니다.

#### ADR-B04: 로깅 및 트레이싱 표준화 (Trace ID)
- **Context**: 장애 발생 시 요청부터 응답까지의 흐름을 추적할 수 있어야 합니다.
- **Decision**: 모든 요청에 고유한 UUID를 발급하여 SLF4J MDC(`traceId`)에 저장하고, 응답 헤더 및 RFC 9457 ProblemDetail 에러 응답 확장에 포함합니다.

---

### ⚛️ 3. 프론트엔드 (FE) 아키텍처 결정 사항

#### ADR-F01: FSD의 실용적 단순화 및 시스템적 경계 통제
- **Context**: 원본 FSD(Feature-Sliced Design)의 복잡한 계층(entities, widgets 등)은 8인 MVP 팀에 오버엔지니어링이며 'Shared 비대화'를 유발합니다.
- **Decision**: FSD를 app, shared, features 3계층으로 대폭 축소합니다. 이 구조를 강제하기 위해 **ESLint(eslint-plugin-boundaries, import-x)**를 도입하여 피처 간 참조 금지, model 세그먼트의 부수 효과 참조 금지, Axios 직접 호출 금지를 로컬/CI 단계에서 시스템적으로 차단합니다.
- **Consequences**: 진입 장벽이 대폭 낮아지며 아키텍트의 수동 개입 없이 시스템이 구조를 지켜줍니다.

#### ADR-F02: 의도적 코드 중복 허용(AHA)과 제어 조립 (Widget 대체)
- **Context**: FSD 축소로 인해 도메인 간 공통 요소가 생길 때 이를 무작정 shared로 올리면 아키텍처가 붕괴됩니다.
- **Decision**: 1. **AHA (Avoid Hasty Abstractions)**: 피처 간 비슷한 타입/로직이 발견되어도 shared로 성급히 올리지 않고 각 features 내부에 의도적으로 복사-붙여넣기(중복)를 허용합니다. 2. **Widget 레이어 대체**: 여러 피처가 섞이는 공통 헤더/푸터 등은 shared가 아닌 최상위 **app/layouts/**에서 컴포넌트 합성(Composition)을 통해 조립합니다.
- **Consequences**: 피처 간 결합도가 완벽히 차단되어 독립적 병렬 개발이 가능해집니다.

#### ADR-F03: React Router Data Mode 도입과 로직 분리 (Fat Action 방지)
- **Context**: Waterfall 로딩을 막기 위해 Router v7 Data Mode(Loader/Action)를 도입했으나, action 파일에 검증, API 통신, 비즈니스 로직이 몰리는 '비대한 컨트롤러' 현상이 발생합니다.
- **Decision**: action은 오케스트레이터 역할만 수행합니다. 복잡한 계산이나 파싱 로직은 `features/*/model/core.ts`(순수 함수)로, 서버 통신은 `api/mutations.ts`로 추출하여 위임합니다.

#### ADR-F04: 전역 에러 처리의 의존성 역전 (IoC)
- **Context**: API 통신 모듈(`shared/api/axios.ts`)에서 전역 알림을 위해 토스트(`shared/ui/toast`)를 직접 임포트하는 것은 "데이터 계층이 UI 계층을 알아서는 안 된다"는 원칙을 위반합니다.
- **Decision**: 통신 모듈은 Zod 파싱 후 순수한 에러 객체(RFC 9457)를 `Promise.reject`로 던지기만 합니다. 실제 토스트 UI 호출은 최상위 제어 계층인 **app/queryClient.ts의 전역 onError 핸들러에서 수행(IoC)**합니다.
- **Consequences**: 향후 Mantine 같은 UI 라이브러리가 교체되어도 통신 코드는 단 한 줄도 수정할 필요가 없는 견고한 구조가 완성됩니다.

#### ADR-F05: 외부 UI 라이브러리(Mantine) 선택적 래핑 및 종속성 격리
- **Context**: Mantine을 shared/ui로 100% 래핑하는 것은 보일러플레이트를 양산합니다.
- **Decision**: 단순 배치용 원시 컴포넌트(Box, Flex 등)는 features에서 직수입하여 사용을 허용합니다. 단, 비즈니스 맥락이나 특정 로직이 결합된 요소(Toast, DataTable 등)는 반드시 shared/ui/ 하위에 래핑 및 격리합니다. 토스트 유틸리티 또한 순수 함수가 아니므로 lib이 아닌 shared/ui/toast에 둡니다.

#### ADR-F06: 정적 자산(Font)과 패스 알리아스 환경 최적화
- **Decision**: 1. 폰트 등 전역 자산은 public에 방치하지 않고 `src/app/styles/` 내에서 관리하여 브라우저 해시 캐싱과 FSD 구조 응집도를 확보합니다. 2. `vite-tsconfig-paths`를 도입하여 tsconfig를 단일 진실 공급원으로 삼아 깔끔한 `@/*` (또는 `@shared/` 등) 패스 알리아스 환경을 구축합니다.

#### ADR-F07: 데이터 패칭 및 상태 관리 체계 분리 (Query vs Zustand)
- **Decision**: 서버 데이터는 TanStack Query에 100% 위임하며, Zustand는 다크모드 등 순수 클라이언트 UI 상태 제어에만 제한적으로 사용합니다.

#### ADR-F08: MSW + Zod 기반 API 계약 수동 동기화
- **Decision**: 초기 MVP 병렬 개발을 위해 MSW 핸들러와 Zod 스키마를 수동 동기화합니다. 얼리 액세스 이전에 OpenAPI(Swagger) 기반 자동 생성 파이프라인으로 전환합니다.
