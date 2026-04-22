# CLAUDE.md — frontend-react-A

> Megazone Front Office React SPA — 데스크톱/모바일 디바이스 분리 멀티 엔트리 구조를 가진 Vite + React 기반 클라이언트.

## 1. Role Definition (역할 정의)

당신은 이 저장소의 시니어 개발자로서 코드 작성, 수정, 리뷰를 책임집니다. 응답은 반드시 한국어로 작성해야 합니다.
Vite + React로 구축된 Front Office SPA이며, 데스크톱/모바일 멀티 엔트리 빌드 구조 위에서 Axios 기반 응답 정규화, Orval 코드젠, 컴포넌트 레벨 RBAC의 3요소를 조합한 SPA 아키텍처를 따릅니다.

## 2. Project Overview (프로젝트 개요)

| 항목 | 값 |
|---|---|
| 언어 | TypeScript 5.8.3 |
| 프레임워크 | React 19.1.0 (Next.js 아님) |
| 빌드 도구 | Vite 6.3.5 (split config: shared + desktop + mobile) |
| 패키지 매니저 | npm (yarn / pnpm 금지) |
| 라우터 | react-router-dom 7.6 (`createBrowserRouter` + `RouterProvider`) |
| 스타일링 | SCSS Modules (`*.module.scss`, sass ^1.89.0) |
| HTTP 클라이언트 | axios ^1.6.8 + orval ^8.5.3 코드젠 클라이언트 병행 |
| 데스크톱 포트 | 3030 (`VITE_DESKTOP_PORT`) |
| 모바일 포트 | 3033 (`VITE_MOBILE_PORT`) |
| 스토리북 포트 | 4040 (`VITE_STORYBOOK_PORT`) |
| 개발 호스트 | `local-dev.example.internal` (`VITE_DEV_HOST`) |
| API 프록시 타겟 | `http://local-dev.example.internal:8090` (`VITE_API_TARGET`) |
| 테스트 현황 | Vitest 설정/테스트 파일 부재 (커버리지 0%) |

## 3. Build & Run Commands (빌드 & 실행 명령)

**이 프로젝트의 표준 패키지 매니저는 `npm`입니다.** `yarn` / `pnpm` 명령어는 사용 금지입니다.

```bash
# 의존성 설치
npm install

# 개발 서버 (데스크톱 + 모바일 동시 실행)
npm run dev                     # desktop 3030, mobile 3033 동시 기동
npm run dev:desktop             # 데스크톱만 (port 3030)
npm run dev:mobile              # 모바일만 (port 3033)

# 프로덕션 빌드 (tsc → desktop → mobile 순차)
npm run build                   # dist/desktop + dist/mobile 생성
npm run build:desktop
npm run build:mobile

# 스토리북
npm run sb                      # port 4040
npm run build-sb

# OpenAPI 코드젠 (백엔드 스펙 → src/generated-api-client/ 재생성)
npm run openapi:fetch           # spec/api-docs.json 갱신
npm run openapi:generate        # orval 재생성
npm run openapi:sync            # fetch + generate

# 린트 / 포맷
npm run lint
npm run format
```

`package.json` 의 `scripts`를 유일한 정답으로 취급합니다. 스크립트 이름이 바뀌면 본 문서도 함께 갱신해야 합니다.

## 4. Core Architecture (핵심 아키텍처)

### 전체 구조

```
                 Browser (desktop / mobile)
                           │
              ┌────────────┴────────────┐
              │                         │
        index.html                 m.index.html
      (vite desktop)              (vite mobile)
              │                         │
     src/desktop/main.tsx       src/mobile/main.tsx
              │                         │
     createBrowserRouter        createBrowserRouter
      (DesktopLayout)            (MobileLayout)
              │                         │
              └───────── 공유 ──────────┘
                        │
           src/components/*  (Mz* UI/Form)
           src/api/apiClient.ts (axios + interceptor)
           src/generated-api-client/* (orval 자동 생성)
```

### 데이터 흐름

1. 컴포넌트 → `apiClient.get/post/...` 또는 `get{Domain}Controller().xxx()` 호출.
2. axios 요청 인터셉터가 `/api` prefix 부여 + `Authorization: Bearer <accessToken>` 주입.
3. Vite dev server가 `/api` 요청을 `VITE_API_TARGET`(`http://local-dev.example.internal:8090`)으로 프록시.
4. 응답 인터셉터가 서버 포맷 `{ succeeded, data, message }` → 프론트 표준 `{ success, data, message }` 로 정규화.
5. 컴포넌트는 `ApiResponse<T>` 형태만 소비.

### 핵심 패턴

- **디바이스 분리 멀티 엔트리**: `src/desktop/*` 와 `src/mobile/*` 가 독립된 `app.tsx`, `main.tsx`, `router/index.tsx`, `layouts/*` 를 보유. 공유는 `src/components/*`, `src/api/*`, `src/hooks/*`, `src/utils/*` 에 한함.
- **이중 API 클라이언트**: 수동 작성 axios 싱글톤(`src/api/apiClient.ts`) + orval 생성 컨트롤러(`src/generated-api-client/api/*`). 양쪽 모두 동일한 axiosInstance + 응답 정규화 인터셉터를 공유.
- **컴포넌트 레벨 RBAC**: `MzButton` 의 `buttonAuthorities` prop 과 `SYS_CODE_CONSTANTS.USE_BTN_AUTH` 조합으로 버튼 단위 권한 제어. 라우트 가드 방식이 아닌 "감춤" 방식.
- **메모리 전용 토큰**: `accessToken` 은 `src/api/apiClient.ts` 내부 module-scope 변수로만 보관 (XSS 대비 localStorage 미사용 / 새로고침 시 소실).
- **응답 정규화 계층**: 응답 래핑은 axios interceptor에서 단 한 번 수행. 컴포넌트는 `{ success, data, message }` 만 믿고 사용.

### 적용하지 않는 것 (의도적 비채택)

- 서버 상태 캐시 라이브러리 (TanStack Query / SWR 미사용 — 컴포넌트가 직접 axios 호출)
- 전역 상태 라이브러리 (Redux / Zustand / Jotai 미채택 — 로컬 `useState` + URL 상태 위주)
- 라우트 레벨 `React.lazy` / `Suspense` 코드 스플리팅 (현재 미적용)
- MSW / 서버 모킹 (인라인 `MOCK_*` 상수만 사용)
- 전역 에러 바운더리 / 라우터 `errorElement` / 404 라우트

## 5. Directory Structure (디렉터리 구조)

```
frontend-react-A/
├─ index.html                         # 데스크톱 엔트리
├─ m.index.html                       # 모바일 엔트리
├─ vite.config.shared.ts              # 공통 설정 팩토리
├─ vite.config.desktop.ts             # 데스크톱 빌드 (dist/desktop)
├─ vite.config.mobile.ts              # 모바일 빌드 (dist/mobile)
├─ orval.config.ts                    # OpenAPI → src/generated-api-client 생성 설정
├─ spec/
│  └─ api-docs.json                   # 백엔드 OpenAPI 스펙 캐시
├─ scripts/
│  └─ create-orval-mutator.js         # orval 생성 전 mutator 템플릿 설치
└─ src/
   ├─ api/
   │  └─ apiClient.ts                 # axios 싱글톤 + 요청/응답 인터셉터
   ├─ generated-api-client/                  # ⚠️ orval 자동 생성 — 수동 수정 금지
   │  ├─ apiClient.ts                 # 생성 코드용 mutator
   │  └─ api/
   │     └─ {tag}-controller.ts       # OpenAPI tag 단위 생성 파일
   ├─ components/                     # 공유 UI (디바이스 비의존)
   │  ├─ form/                        # mzInputText, mzCheckBox, mzFileUpload …
   │  └─ ui/                          # mzButton, mzModal, mzTabs …
   ├─ hooks/                          # 공유 훅 (useModalHistory 등)
   ├─ utils/
   │  └─ constants.ts                 # SYS_CODE_CONSTANTS 등
   ├─ desktop/
   │  ├─ main.tsx                     # 데스크톱 엔트리 부트스트랩
   │  ├─ app.tsx
   │  ├─ router/index.tsx             # createBrowserRouter 정의
   │  ├─ layouts/                     # DesktopLayout / Header / Footer / useBreadcrumb
   │  ├─ components/common/           # mzPagination, mzSearch (데스크톱 전용)
   │  └─ pages/                       # home/, product/, support/notice/ …
   ├─ mobile/
   │  ├─ main.tsx
   │  ├─ app.tsx
   │  ├─ router/index.tsx
   │  ├─ layouts/                     # MobileLayout
   │  └─ pages/
   └─ storybook/
      └─ stories/                     # Storybook 스토리
```

**자동 생성 / 수동 수정 금지**: `src/generated-api-client/`. `npm run openapi:generate` 실행 시 삭제 후 재생성됩니다. 직접 편집 금지. 변경이 필요하면 `orval.config.ts` 또는 백엔드 OpenAPI 스펙을 수정하세요.
**디바이스 분리**: `src/desktop/*` 코드에서 `src/mobile/*` 를 import 금지 (반대도 금지). 공유가 필요한 요소는 반드시 `src/components/*` / `src/hooks/*` / `src/utils/*` 로 승격.
**빌드 출력**: `dist/desktop/` 와 `dist/mobile/` 가 분리 생성되며 각각 별도 정적 호스팅 대상으로 배포됩니다.

## 6. Standard / Rules / Skills Reference (Standard / Rules / Skills 참조)

### Standard (Single Source of Truth)

| 경로 | 설명 |
|---|---|
| `claudeos-core/standard/00.core/01.project-overview.md` | 스택 / 라우팅 전략 / 배포 환경 개요 |
| `claudeos-core/standard/00.core/02.architecture.md` | SPA 구조 / 컴포넌트 계층 / 데이터 흐름 상세 |
| `claudeos-core/standard/00.core/03.naming-conventions.md` | 파일 / 컴포넌트 / 훅 / 타입 네이밍 규칙 |
| `claudeos-core/standard/00.core/04.doc-writing-guide.md` | 문서 작성 가이드 (Pass 4에서 생성) |
| `claudeos-core/standard/20.frontend-ui/01.component-patterns.md` | 컴포넌트 작성 패턴 / Props / 재사용 원칙 |
| `claudeos-core/standard/20.frontend-ui/02.page-routing-patterns.md` | `createBrowserRouter` 구성 / 레이아웃 / 라우트 가드 |
| `claudeos-core/standard/20.frontend-ui/03.data-fetching.md` | axios 클라이언트 / orval 사용법 / 에러 처리 |
| `claudeos-core/standard/20.frontend-ui/04.state-management.md` | 로컬 / URL / 폼 상태 관리 전략 |
| `claudeos-core/standard/20.frontend-ui/05.styling-patterns.md` | SCSS Modules / 테마 / 반응형 / 접근성 |
| `claudeos-core/standard/30.security-db/01.security-auth.md` | JWT Bearer / 토큰 보관 / 버튼 RBAC / CORS |
| `claudeos-core/standard/40.infra/01.environment-config.md` | VITE_ 환경변수 / vite.config 분리 / 빌드 최적화 |
| `claudeos-core/standard/40.infra/02.logging-monitoring.md` | 로깅 / 분석 / 성능 모니터링 정책 |
| `claudeos-core/standard/40.infra/03.cicd-deployment.md` | CI/CD / 정적 호스팅 배포 |
| `claudeos-core/standard/50.verification/01.development-verification.md` | 빌드 / 개발 서버 / 타입체크 검증 |
| `claudeos-core/standard/50.verification/02.testing-strategy.md` | Vitest / Storybook / Playwright 전략 |

### Rules (자동 로드 가드레일)

| 경로 | 설명 |
|---|---|
| `.claude/rules/00.core/00.standard-reference.md` | 스탠다드 디렉터리 인덱스 (모든 편집 시 로드) |
| `.claude/rules/00.core/*` | 프로젝트 / 아키텍처 / 네이밍 / 문서작성 / AI 작업 규칙 (51·52 의 상세 행은 §8 공통 규칙 표 참고) |
| `.claude/rules/20.frontend/*` | 컴포넌트 / 라우팅 / 데이터 페칭 / 상태 / 스타일링 가드레일 |
| `.claude/rules/30.security-db/*` | 인증 토큰 / XSS / 권한 처리 규칙 |
| `.claude/rules/40.infra/*` | 환경변수 / 로깅 / CI·CD 규칙 (파일 유형별 paths 지정) |
| `.claude/rules/50.sync/*` | Standard ↔ Rules / Skills ↔ MANIFEST 동기화 리마인더 |
| `.claude/rules/60.memory/*` | L4 메모리 파일 편집 시 자동 로드 (decision-log · failure-patterns · compaction · auto-rule-update — Pass 4에서 생성) |

### Skills (반복 작업 자동화 절차)

- `claudeos-core/skills/00.shared/MANIFEST.md` — 스킬 레지스트리
- `claudeos-core/skills/20.frontend-page/01.scaffold-page-feature.md` — 신규 페이지 피처 생성 오케스트레이터

## 7. DO NOT Read (DO NOT Read)

| 경로 | 이유 |
|---|---|
| `claudeos-core/guide/` | 사람 대상 문서. 핵심 내용은 rules에 이미 반영됨 |
| `claudeos-core/generated/` | 자동 생성 메타데이터. 내부용 |
| `claudeos-core/mcp-guide/` | 핵심 내용이 rules에 이미 반영됨. 내부용 |
| `dist/`, `dist/desktop/`, `dist/mobile/` | Vite 빌드 산출물 |
| `storybook-static/` | Storybook 빌드 산출물 |
| `src/generated-api-client/` | orval 자동 생성 — 수동 수정 금지, 읽을 필요 없음 (API는 standard/20.frontend-ui/03 참고) |
| `node_modules/` | 의존성 |
| `playwright-report/`, `test-results/` | 과거 테스트 결과물 (현재 테스트 파이프라인 미구성) |

## 8. Common Rules & Memory (L4) (공통 규칙 & 메모리 (L4))

### 공통 규칙 (모든 편집 시 자동 로드)

`paths: ["**/*"]` 로 선언된 전역 가드레일. 모든 문서 및 코드 편집에 자동 적용됩니다.

| 규칙 파일 | 역할 | 핵심 강제 사항 |
|---|---|---|
| `.claude/rules/00.core/51.doc-writing-rules.md` | 문서 작성 규칙 | paths 프론트매터 필수 / 도메인·절대경로 하드코딩 금지 / `## 참고` 섹션 필수 / 주제 반복은 의도된 강화로 인정 |
| `.claude/rules/00.core/52.ai-work-rules.md` | AI 작업 규칙 | 분석 결과 외 기술 추론 금지 / 사실 기반 답변 / 파일 수정 전 Read 필수 / 검증 가능한 결과 우선 |

세부 지침은 `claudeos-core/standard/00.core/04.doc-writing-guide.md` 를 참고하세요 (Pass 4에서 생성).

### L4 메모리 (온디맨드 참조)

장기 컨텍스트(결정 기록·실패 패턴·압축·자동 제안)는 `claudeos-core/memory/` 에 저장됩니다.
`paths` 글로브로 자동 로드되는 rules 와 달리, 이 레이어는 **필요할 때만 참조**합니다.

#### L4 메모리 파일

| 파일 | 목적 | 동작 |
|---|---|---|
| `claudeos-core/memory/decision-log.md` | 설계 선택의 "이유"에 대한 영구 기록 | Append-only. 세션 시작 시 훑어봄; 아키텍처 변경 전 Read. 결정이 내려질 때마다 새 항목 추가 |
| `claudeos-core/memory/failure-patterns.md` | 반복되는 오류와 해결책 | 세션 시작 시 및 오류 발생 시 검색. 2회 이상 반복 + 원인 비자명 + 해결책 미문서화 시에만 기록 |
| `claudeos-core/memory/compaction.md` | 4단계 압축 정책 선언 | 정책 자체가 바뀔 때만 수정. 압축은 오직 `npx claudeos-core memory compact` 로 실행 |
| `claudeos-core/memory/auto-rule-update.md` | 기계 생성 rule 변경 제안 | 검토 → 수락 → rule 파일 편집 → `decision-log.md` 에 기록. 직접 편집 금지. `npx claudeos-core memory propose-rules` 로 재생성 |

#### 메모리 워크플로우

1. **세션 시작**: `failure-patterns.md` 를 스캔하여 빈번한 오류를 인지한다.
2. **최근 결정 훑어보기**: `decision-log.md` 최근 항목을 훑어 이미 합의된 아키텍처 결정을 덮어쓰지 않도록 한다.
3. **새 결정 기록**: 중요한 설계 결정(경쟁 패턴 중 선택, 라이브러리 채택/거부, 컨벤션 확정 등)을 내리면 `decision-log.md` 에 append.
4. **반복 오류 기록**: 같은 오류가 2회 이상 발생하고 원인이 비자명하면 새 pattern-id 로 `failure-patterns.md` 에 등록.
5. **주기적 압축**: 메모리 파일이 400 라인에 근접하거나 한 달 이상 정리되지 않았으면 `npx claudeos-core memory compact` 실행.
6. **rule-update 제안 검토**: `auto-rule-update.md` 에서 confidence ≥ 0.70 제안을 검토. 수락 시 해당 rule 파일 편집 후 `decision-log.md` 에 기록.

