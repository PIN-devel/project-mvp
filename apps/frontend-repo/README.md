# Agile MVP Frontend Project

본 프로젝트는 React 19 기반의 프론트엔드 애플리케이션으로, **Feature-Driven Architecture**를 기반으로 하되, 폴더 내부 분류는 **FSD(Feature-Sliced Design)의 세그먼트 명칭**을 차용하여 순수성(Purity)과 부수 효과(Side Effect)를 엄격히 격리한 레퍼런스 프로젝트입니다. 백엔드 서비스와 완벽하게 조화를 이루며, 순수 DTO 파이프라인과 RFC 9457 표준 에러 처리 체계를 갖추고 있습니다.

## 🛠️ 기술 스택

- **언어**: TypeScript
- **프레임워크**: React 19
- **라우팅**: React Router v7 (Data Mode)
- **상태 관리 및 데이터 패칭**: TanStack React Query v5
- **클라이언트 상태 관리**: Zustand
- **데이터 파싱 및 타입 검증**: Zod
- **API 통신**: Axios
- **API 모킹**: MSW(Mock Service Worker) v2
- **빌드 툴**: Vite 6

## 📦 주요 프로젝트 의존성 (Dependencies)

`package.json`에 명시된 주요 라이브러리 및 의존성은 다음과 같습니다.

- **React & React DOM**: UI 렌더링 프레임워크
- **React Router** (`react-router`): 데이터 라우팅 및 Data Mode (loader, action) 활용
- **TanStack React Query** (`@tanstack/react-query`): 서버 상태 관리, 캐싱 및 자동화된 동기화 체계 처리
- **Zod** (`zod`): "Parse, don't validate" 철학을 실현하는 스키마 기반 데이터 파이서 및 타입 가드
- **Axios** (`axios`): HTTP 통신 및 전역 에러 핸들링을 위한 인터셉터 제공
- **Zustand** (`zustand`): 가벼운 클라이언트 전역 UI 상태 관리 라이브러리
- **MSW** (`msw`): 네트워크 레벨의 요청을 탈취하여 백엔드 없이 테스트 및 개발(Mocking) 수행가능하도록 지원

## 🚀 실행 및 빌드 방법

### 1. 의존성 설치

프로젝트 루트에서 Pnpm을 사용하여 의존성 패키지를 설치합니다.

```bash
pnpm install
```

### 2. 애플리케이션 실행 (개발 모드)

다음 명령어를 통해 개발 서버를 시작합니다.

```bash
pnpm dev
```

### 3. 운영 배포용 빌드

최적화된 정적 자산으로 프로젝트를 컴파일합니다.

```bash
pnpm build
```

### 2. 테스트 실행 및 리포트 확인

본 프로젝트는 **Vitest**를 사용하여 단위 테스트 및 컴포넌트 테스트를 수행합니다.

```bash
# 전체 테스트 실행
pnpm test

# 테스트 감시 모드 (개발 시 유용)
pnpm test:watch
```

---

## 📂 프로젝트 구조 (Project Structure)

본 프로젝트는 단순 FSD가 아닌 **Feature-Driven Architecture**를 채택하였으며, 피쳐 내부 구성에만 FSD 세그먼트(`model`, `api`, `ui`, `routes`) 개념을 차용하여 순수 영역과 부수 효과 영역을 엄격히 분리합니다.

```text
agile-mvp-frontend/
├── public/                       # 정적 리소스 및 MSW 워커 파일
├── src/
│   ├── app/                      # ⚙️ [전역 설정] 앱 진입점, Router, QueryClient, 글로벌 Store
│   │
│   ├── shared/                   # 🌐 [공유 커널] 도메인에 얽매이지 않는 공통 요소
│   │   ├── api/                  # Axios 인스턴스 (인터셉터 등 인프라 설정)
│   │   ├── model/                # 전역 에러 문제 스키마 (ProblemDetail), 페이징 타입 등
│   │   ├── ui/                   # 디자인 시스템 (Button, Modal, Input 등 순수 뷰 컴포넌트)
│   │   └── lib/                  # 순수 유틸리티 (DateTimeUtil 대응 등)
│   │
│   └── features/                 # 📦 [도메인 모듈] 철저히 캡슐화된 기능 단위
│       │
│       └── sample/               # 🎯 [예시: 백엔드와 매핑되는 Sample 도메인]
│           ├── model/            # 🟢 [순수 영역] 타입 명세, Zod 검증 파서, 순수 비즈니스 로직
│           ├── api/              # 🔴 [부수 효과 영역] Axios Fetcher, Mutation, Query Factory
│           ├── ui/               # 🔴 [UI 영역] 시스템 특화 뷰 컴포넌트
│           ├── routes/           # 🔴 [제어 영역] 라우터 진입점 및 loader/action
│           └── SampleIntegration.test.tsx # ✅ [핵심 통합 테스트 예시]
```

### 📍 계층별 핵심 제약사항

1. **순수성 보장 (의존성 단방향)**: `model` 계층은 절대 `api`, `ui`, `routes`를 참조하지 않습니다. (외부 환경과 격리)
2. **캡슐화**: 각 feature(`features/A`, `features/B`)는 상호 간 직접 참조가 불가능합니다. 공통 로직은 `shared` 계층으로 승격하거나 파라미터로 주입받습니다.

---

## 🏷️ 공통 기능 및 에러 처리 (RFC 9457 & Data Pipeline)

### 1. Zod를 활용한 'Parse, don't validate' 파이프라인

백엔드 응답(순수 JSON DTO)을 받는 즉시 `api/fetchers.ts` 계층에서 Zod 스키마를 통해 검사 및 파싱합니다. 잘못된 값이 들어오는 것을 시스템 경계면에서 차단하여 `features` 내부 코드들이 안전한 타입 하에서 동작하게 만듭니다.

### 2. RFC 9457 기반 전역 표준 예외 핸들링

백엔드 서버의 모든 예외는 `application/problem+json` (RFC 9457) 형태로 수신됩니다.
`shared/api/axios.ts`의 통합 인터셉터가 에러를 가로챈 뒤, 도메인 독립적인 `ProblemDetail` Zod 스키마에 맞춰 검증합니다.
이를 통해 HTTP 에러가 발생해도 애플리케이션은 렌더링을 중단하지 않으며, React Router의 `errorElement`나 Toast UI 등으로 안전한 폴백 렌더링이 이루어집니다.

---

## 📘 아키텍처 결정 기록 (ADR)

- **통합 상태 관리 모델 (ADR 1)**: 컴포넌트의 빈번한 렌더링 스래싱을 방지하기 위하여 클라이언트 로컬/UI 상태는 `Zustand`로 처리하고, 서버와의 동기화 상태는 `React Query`에 전적으로 위임합니다.
- **React Router Data Mode (ADR 2)**: Waterfall 방식의 데이터 로딩을 탈피하고, `Loader`를 이용해 화면 전환 시점과 데이터 캐싱 로딩 시점을 동기화하여 지연을 줄입니다.
- **Query Factory 패턴 (ADR 4)**: 각 도메인에서 통신에 쓰이는 React Query의 캐시 Key와 Options 팩토리들을 `api/queries.ts`에 한데 모아 구조를 중앙 통제합니다.
- **수정(Update) 메소드 일원화 (ADR 5)**: React 생태계의 불변 객체 특성상 모든 필드를 지닌 상태 객체를 다루는 속성이 강합니다. 이에따라 복잡도를 낮추고 생산성을 높이기 위해 PATCH(부분 교체) 사용을 지양하고 **PUT(전체 변경)** 위주로 수정 API 통일을 규칙화하였습니다. (성능상 임계치 이상일 경우에만 PATCH 예외 허용)
- **비즈니스 에러의 Single Source Of Valid Truth (ADR 6)**: 빈번한 요구사항 변경 속도에 대응하기 위해, 프론트엔드의 Zod는 '스펙의 방어막(Parsing)' 역할만 하며 복잡한 도메인 정규식이나 비즈니스 검증은 모두 백엔드의 Validation API 오류 코드를 수신하여 화면에 뿌려주는 것으로 합의하였습니다.

---

## 🔍 테스트 아키텍처 및 핵심 통합 테스트 (Testing Architecture)

본 프로젝트는 단순한 코드 조각의 검증을 넘어, **사용자의 실제 경험(Full Flow)**을 보장하는 테스트를 지향합니다.

### 1. 핵심 통합 테스트 (Core Integration Test)
가장 권장되는 테스트 방식으로, `createMemoryRouter`를 사용하여 다음의 전체 파이프라인을 한 번에 검증합니다.
- **흐름**: `Component (UI)` → `Action (Router)` → `API (MSW)` → `Component (Result)`
- **장점**: UI 조작이 실제 로직과 API 모킹 계층을 거쳐 다시 화면에 반영되는 전체 과정을 보장하므로, 리팩토링 시에도 테스트 안전성이 매우 높습니다.
- **예시**: `src/features/sample/SampleIntegration.test.tsx`

### 2. 테스트 작성 원칙
- **해피 패스(Happy Path) 우선**: 복잡한 엣지 케이스보다는 사용자가 가장 빈번하게 사용하는 핵심 시나리오를 통합 테스트로 먼저 구축합니다.
- **MSW 기반 API 모킹**: 실제 서버 통신 없이도 네트워크 레벨에서 요청을 가로채어 결정론적(Deterministic) 결과로 테스트를 수행합니다.
- **상태 초기화**: 각 테스트는 `resetSamples()` 등을 통해 가상 DB 상태를 초기화하여 테스트 간 간섭을 방지합니다.

---

## 🚩 API 모킹 및 MSW 가이드 (API Mocking with MSW)

본 프로젝트는 백엔드 개발 현황과 무관하게 프론트엔드 개발 및 테스트를 진행할 수 있도록 **MSW(Mock Service Worker)**를 활용한 강력한 API 모킹 체계를 갖추고 있습니다.

### 1. 모킹 계층 구조 (Mocks Structure)
구조적 명확성을 위해 모킹 로직을 데이터와 핸들러로 분리하여 관리합니다.
- **`src/mocks/db.ts`**: 가상 인메모리 데이터베이스입니다. 데이터 상태와 CRUD 로직(db.get, db.create 등) 및 데이터 초기화(`resetSamples`)를 담당합니다.
- **`src/mocks/handlers.ts`**: MSW 인터셉터 설정 파일입니다. HTTP 요청을 가로채어 `db.ts`의 로직을 호출하고 응답을 반환합니다.
- **`src/mocks/browser.ts` / `server.ts`**: 각각 개발 환경(Browser)과 테스트 환경(Node.js)에서의 MSW 구동 설정을 담당합니다.

### 2. 신규 API 모킹 방법
1. **데이터 정의**: `db.ts`에 해당 도메인의 초기 데이터와 조작 메서드를 추가합니다.
2. **핸들러 등록**: `handlers.ts`에 `http.get`, `http.post` 등을 사용하여 엔드포인트를 정의하고 `db` 메서드와 연결합니다.
3. **테스트 연동**: 통합 테스트(`*.test.tsx`)의 `beforeEach`에서 `resetSamples()`를 호출하여 매 테스트마다 깨끗한 데이터 상태를 보장합니다.

### 3. 모킹 활성화 제어
- **개발 환경**: `src/main.tsx`에서 조건부로 MSW 워커를 기동하여 백엔드 없이도 퍼블리싱 및 기능 개발이 가능합니다.
- **테스트 환경**: `src/tests/setup.ts`에서 서버가 자동으로 실행되도록 설정되어 있어 별도의 설정 없이 통합 테스트를 수행할 수 있습니다.

---

## 👩‍💻 개발자 가이드 (단위 업무 개발 시)

1. **신규 기능 추가 주의사항**: `features/신규도메인` 폴더 단위로 아키텍처를 설계합니다. 순수 비즈니스 로직 및 타입 정의는 `model/`에, `useQuery`/Axios 호출은 `api/`에 명확히 격리해주세요.
2. **단순화 기능 폴더 규칙**: 도메인 객체가 없는 단순 정적 View, 공지사항 랜딩과 같은 경우 무리하게 4단계 세그먼트 구조를 강제할 필요가 없으며, 단일 폴더나 `shared/ui` 단에서 가볍게 처리하셔도 좋습니다.
3. **API 스펙의 변경 대처**: 만약 백엔드의 응답/요청 스펙이 변경되었다면 오직 각 도메인의 `model/schemas.ts` 만을 수정하여 시스템 전체로 안전하게 전파시키세요.
4. **결함 방지 및 Feature Flag**: 개발 중인 백엔드 API가 닫혀있어(404 Return)도 FE 앱이 크래시되지 않도록 ErrorBoundary와 Fallback 설정을 꼼꼼히 구성하세요. 환영받는 애자일 병합 주기 환경을 만들 수 있습니다.
