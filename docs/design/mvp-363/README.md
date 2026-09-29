# MVP-363 · Stage A — Signal to Pattern

**디자인 제안 완료 / PO Design Freeze 대기 / Stage B 미착수**

2026-09-29 · PO 추가 피드백 / MVP-378 반영 · MOTIFIN B · Signal Mint · 기준 구현 `a65ba8264902c3396d8902400edc3d0769d66b60`

## 먼저 보기

- [인터랙티브 고충실도 시안](./prototype.html) — 다운로드 후 브라우저로 열기. 폰트·공식 로고 내장, 네트워크 및 API 호출 없음.
- [Desktop / In Progress](./desktop-progress.png)
- [Empty](./desktop-empty.png) / [Ready](./desktop-ready.png)
- [Loading](./desktop-loading.png) / [Error](./desktop-error.png) / [분류 후 전환 시연](./interaction-classify.png)
- [Stage B 상세 명세 및 Design Integrity Notes](./design-spec.md)

GitHub는 HTML을 실행하지 않는다. `prototype.html`을 다운로드해 직접 열거나 이 디렉터리를 정적 파일로 제공한다. 빌드·패키지 설치 불필요. PNG는 GitHub에서 바로 볼 수 있다.

**모든 거래·금액·건수·카테고리 분포는 디자인 목업용 예시다.** 실제 계정 데이터나 AI 결과를 사용하지 않았다. 시안 상단의 검토 툴바와 하단 예시 표시는 제품에 구현하지 않는다. 디자인 산출물은 Desktop 화면만 포함한다. 공통 Header는 기존 높이와 탐색 구조를 유지하며 MVP-378에 따라 메뉴 문구만 개선했다.

## 확정 후보의 핵심

**Signal to Pattern — 정리될수록 선명해지는 나의 기록.**

네이비의 넓은 장면 안에서 왼쪽의 메시지·행동과 오른쪽의 민트 분류 필드를 연결한다. 위에서는 ‘어디까지 왔는지’를, 바로 아래 작업실에서는 ‘지금 무엇을 할지’를 이해한다. 분류 필드는 금융 성과나 AI 신뢰도 차트가 아닌 **등록 거래의 분류 비율**이다.

처음부터 모든 기능을 소개하지 않는다. Empty는 가치와 직접 업로드, In Progress는 남은 분류, Ready는 패턴 탐색이 주도한다. **미분류가 있어도 분석 화면에 진입할 수 있으므로 In Progress에는 `지금 소비 분석 보기` 보조 링크를 제공한다.** 실제 운영 도구는 `내역 작업실`에 연결하고, ‘미세척’이라는 경고 중심 언어를 ‘정리할 내역’이라는 행동 중심 언어로 바꾼다.

## 간략한 탐색과 수렴

| 접근 | 시각·경험의 장점 | 판단 |
| --- | --- | --- |
| Editorial Welcome | 큰 브랜드 타이포와 여백으로 인상 형성 | 반복 방문에서 내 데이터 상태를 빨리 파악하기 어려움 |
| Pattern Atlas | 카테고리별 모자이크가 소비 구성에 대한 호기심 유발 | 미분류가 많은 사용자·Empty에서 핵심 표현이 약해짐. 상세 분석 화면과 역할 중복 |
| Signal to Pattern | 하나의 중심 장면이 등록→분류→탐색에 따라 진화. 브랜드 표현과 상태 이해 결합 | **선택.** 3개 상태 모두 의미를 유지하고 첫 행동이 명확함 |

선택 근거는 사용자 이해, 첫인상, 브랜드 적합성, 상태 간 일관성이다. Mantine 구현 난이도나 공수로 선택하지 않았다.

## 시안에서 확인할 동작

1. 상단 상태 선택: Empty / In Progress / Ready / Loading / Error.
2. Desktop Light 시안에서 상태별 정보 위계와 행동 전환을 확인.
3. Empty의 `Excel 내역 업로드`: 기존 업로드 모달 연결과 저장 후 전환을 설명하는 **시연 전용** 다이얼로그.
4. In Progress의 `남은 32건 정리하기`: 작업실로 스크롤하고 포커스 이동.
5. 예시 내역 선택 → `선택 내역 분류` → 시연 설명 → `분류 완료 장면 보기`: Ready의 전체 완료 장면을 보여준다. 선택한 1~3건만으로 32건 모두 분류된다는 실제 동작을 의미하지 않는다.
6. Ready의 `소비 패턴 살펴보기`: 기존 `/insights`로 연결할 지점을 설명한다. 실제 라우트 이동이나 AI 요청 없음.
7. Error 재시도: 로딩 후 예시 정리 중 상태로 복귀. 실제 네트워크 성공 검증 아님.

작업실의 검색·필터·편집은 기능 구현이 아닌 배치 시연이다. 기존 전체 검색, 필터, 정렬, 일괄 분류, 단건 편집, 태그, 삭제 확인, 페이지네이션의 보존 조건은 상세 명세를 따른다.

## 범위 및 검증

- 변경 경로: `docs/design/mvp-363/`만. 실제 프론트엔드·비즈니스 로직·API·라우팅 변경 없음.
- 시안 자체의 정적 렌더링과 시연 인터랙션만 확인. 제품 Build / Test / Lint / E2E / 운영 브라우저 QA 미수행.
- 목업 렌더링: Desktop 1440px에서 Pretendard 로드 확인. 예시 분류→Ready 전환 및 목업 JavaScript 오류 없음 확인.
- 상태별 캡처는 독립 디자인 HTML의 화면이며, 실제 애플리케이션 구현·배포 결과가 아니다.
- MVP-363은 진행 중 유지. Design Freeze 이후 별도 Stage B 프롬프트로 구현 착수.
- 브랜치 `integration/motifin-preview-2026-10-01`, 기존 Draft PR #47. 별도 브랜치·PR·main 병합 없음.

## 자산 출처

공식 로고는 `docs/brand/motifin-wordmark-on-light.svg` 원본을 그대로 내장했다. 서체는 기존 `apps/frontend-repo/public/font/PretendardVariable.woff2`에서 시안에 필요한 글리프만 서브셋하여 내장했다. 로고와 공통 Shell을 새로 설계하지 않았다. Stage B는 임베디드 사본 대신 기존 `BrandLogo`와 Pretendard를 그대로 사용한다.
