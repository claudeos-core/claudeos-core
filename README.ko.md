# ClaudeOS-Core

**소스코드를 먼저 읽고, 스택과 패턴을 코드로 확정한 뒤, 프로젝트에 정확히 맞는 Claude Code 규칙을 생성하는 유일한 도구.**

```bash
npx claudeos-core init
```

ClaudeOS-Core는 코드베이스를 읽고, 발견한 모든 패턴을 추출하여, _여러분의_ 프로젝트에 최적화된 Standards, Rules, Skills, Guides를 완전히 생성합니다. 이후 Claude Code에 "주문 CRUD 만들어줘"라고 말하면, 기존 패턴과 정확히 일치하는 코드를 생성합니다.

[🇺🇸 English](./README.md) · [🇨🇳 中文](./README.zh-CN.md) · [🇯🇵 日本語](./README.ja.md) · [🇪🇸 Español](./README.es.md) · [🇻🇳 Tiếng Việt](./README.vi.md) · [🇮🇳 हिन्दी](./README.hi.md) · [🇷🇺 Русский](./README.ru.md) · [🇫🇷 Français](./README.fr.md) · [🇩🇪 Deutsch](./README.de.md)


---

## 왜 ClaudeOS-Core인가?

다른 모든 Claude Code 도구는 이렇게 작동합니다:

> **사람이 프로젝트를 설명 → LLM이 문서 생성**

ClaudeOS-Core는 이렇게 작동합니다:

> **코드가 소스를 분석 → 코드가 맞춤 프롬프트 조합 → LLM이 문서 생성 → 코드가 결과 검증**

이건 작은 차이가 아닙니다.

### 핵심 문제: LLM은 추측한다. 코드는 확정한다.

Claude에게 "이 프로젝트 분석해줘"라고 하면, 스택, ORM, 도메인 구조를 **추측**합니다.
`build.gradle`에서 `spring-boot`를 보고도 MyBatis가 아닌 JPA로 오인할 수 있습니다.
`user/` 디렉토리를 보고도 layer-first(Pattern A)인지 domain-first(Pattern B)인지 착각할 수 있습니다.

**ClaudeOS-Core는 추측하지 않습니다.** Claude가 프로젝트를 보기 전에, Node.js 코드가 이미:

- `build.gradle` / `package.json` / `pyproject.toml`을 파싱하여 스택, ORM, DB, 패키지 매니저를 **확정**
- 디렉토리 구조를 스캔하여 도메인 목록과 파일 수를 **확정**
- 프로젝트 구조를 Java 5패턴, Kotlin CQRS/BFF, Next.js App Router/FSD 중 하나로 **분류**
- Claude의 컨텍스트 윈도우에 맞게 도메인을 최적 그룹으로 **분할**
- 확정된 사실이 주입된 스택별 맞춤 프롬프트를 **조합**

Claude가 프롬프트를 받는 시점에는 추측할 것이 없습니다. 스택 확정. 도메인 확정. 구조 패턴 확정. Claude는 이 **확정된 사실**에 맞는 문서를 생성하기만 하면 됩니다.

### 결과

다른 도구는 "일반적으로 좋은" 문서를 생성합니다.
ClaudeOS-Core는 프로젝트가 `ApiResponse.ok()`를 쓴다는 것, MyBatis XML 매퍼가 `src/main/resources/mybatis/mappers/`에 있다는 것, 패키지 구조가 `com.company.module.{domain}.controller`라는 것을 아는 문서를 생성합니다 — 실제 코드를 읽었으니까요.

### Before & After

**ClaudeOS-Core 없이** — Claude Code에게 주문 CRUD 생성을 요청하면:
```
❌ JPA 스타일 repository 사용 (프로젝트는 MyBatis 사용)
❌ ResponseEntity.success() 생성 (프로젝트 래퍼는 ApiResponse.ok())
❌ order/controller/에 파일 배치 (프로젝트는 controller/order/ 구조)
❌ 영어 주석 생성 (팀은 한국어 주석 사용)
→ 생성된 파일마다 20분씩 수정
```

**ClaudeOS-Core 적용 후** — `.claude/rules/`에 확정된 패턴이 이미 존재:
```
✅ MyBatis 매퍼 + XML 생성 (build.gradle에서 감지)
✅ ApiResponse.ok() 사용 (실제 소스에서 추출)
✅ controller/order/에 파일 배치 (구조 스캔으로 Pattern A 확정)
✅ 한국어 주석 (--lang ko 적용)
→ 생성 코드가 프로젝트 컨벤션과 즉시 일치
```

이 차이는 누적됩니다. 하루 10개 작업 × 20분 절약 = **하루 3시간 이상**.

---

## 지원 스택

| 스택 | 감지 기준 | 분석 깊이 |
|---|---|---|
| **Java / Spring Boot** | `build.gradle`, `pom.xml`, 5가지 패키지 패턴 | 10개 대분류, 59개 소분류 |
| **Kotlin / Spring Boot** | `build.gradle.kts`, kotlin 플러그인, `settings.gradle.kts`, CQRS/BFF 자동감지 | 12개 대분류, 95개 소분류 |
| **Node.js / Express** | `package.json` | 9개 대분류, 57개 소분류 |
| **Node.js / NestJS** | `package.json` (`@nestjs/core`) | 10개 대분류, 68개 소분류 |
| **Next.js / React** | `package.json`, `next.config.*`, FSD 지원 | 9개 대분류, 55개 소분류 |
| **Vue / Nuxt** | `package.json`, `nuxt.config.*`, Composition API | 9개 대분류, 58개 소분류 |
| **Python / Django** | `requirements.txt`, `pyproject.toml` | 10개 대분류, 55개 소분류 |
| **Python / FastAPI** | `requirements.txt`, `pyproject.toml` | 10개 대분류, 58개 소분류 |
| **Node.js / Fastify** | `package.json` | 10개 대분류, 62개 소분류 |
| **Vite / React SPA** | `package.json`, `vite.config.*` | 9개 대분류, 55개 소분류 |
| **Angular** | `package.json`, `angular.json` | 12개 대분류, 78개 소분류 |

자동 감지 항목: 언어 & 버전, 프레임워크 & 버전(Vite 포함), ORM (MyBatis, JPA, Exposed, Prisma, TypeORM, SQLAlchemy 등), 데이터베이스 (PostgreSQL, MySQL, Oracle, MongoDB, SQLite), 패키지 매니저 (Gradle, Maven, npm, yarn, pnpm, pip, poetry), 아키텍처 (CQRS, BFF — 모듈명에서 감지), 멀티모듈 구조 (settings.gradle에서 감지), 모노레포 (Turborepo, pnpm-workspace, Lerna, npm/yarn workspaces).

**직접 지정할 필요 없습니다. 전부 자동으로 감지합니다.**

### Java 도메인 감지 (5가지 패턴, 폴백 포함)

| 우선순위 | 패턴 | 구조 | 예시 |
|---|---|---|---|
| A | 레이어 우선 | `controller/{domain}/` | `controller/user/UserController.java` |
| B | 도메인 우선 | `{domain}/controller/` | `user/controller/UserController.java` |
| D | 모듈 접두사 | `{module}/{domain}/controller/` | `front/member/controller/MemberController.java` |
| E | DDD/헥사고날 | `{domain}/adapter/in/web/` | `user/adapter/in/web/UserController.java` |
| C | 플랫 | `controller/*.java` | `controller/UserController.java` → 클래스명에서 `user` 추출 |

Controller 없는 서비스 전용 도메인도 `service/`, `dao/`, `aggregator/`, `facade/`, `usecase/`, `orchestrator/`, `mapper/`, `repository/` 디렉토리를 통해 감지됩니다. 스킵: `common`, `config`, `util`, `core`, `front`, `admin`, `v1`, `v2` 등.


### Kotlin 멀티모듈 도메인 감지

Gradle 멀티모듈 구조의 Kotlin 프로젝트(예: CQRS 모노레포)용:

| 단계 | 동작 | 예시 |
|---|---|---|
| 1 | `settings.gradle.kts`에서 `include()` 스캔 | 14개 모듈 발견 |
| 2 | 모듈명에서 타입 감지 | `reservation-command-server` → type: `command` |
| 3 | 모듈명에서 도메인 추출 | `reservation-command-server` → domain: `reservation` |
| 4 | 같은 도메인을 모듈 간 그룹핑 | `reservation-command-server` + `common-query-server` → 1개 도메인 |
| 5 | 아키텍처 감지 | `command` + `query` 모듈 있음 → CQRS |

지원 모듈 타입: `command`, `query`, `bff`, `integration`, `standalone`, `library`. 공유 라이브러리(`shared-lib`, `integration-lib`)는 특수 도메인으로 감지됩니다.

### 프론트엔드 도메인 감지

- **App Router**: `app/{domain}/page.tsx` (Next.js)
- **Pages Router**: `pages/{domain}/index.tsx`
- **FSD (Feature-Sliced Design)**: `features/*/`, `widgets/*/`, `entities/*/`
- **RSC/Client 분리**: `client.tsx` 패턴 감지, Server/Client 컴포넌트 분리 추적
- **비표준 중첩 경로**: `src/*/pages/`, `src/*/components/`, `src/*/features/` 하위의 페이지, 컴포넌트, FSD 레이어 감지 (예: `src/admin/pages/dashboard/`)
- **설정 파일 폴백**: `package.json`에 없어도 `next.config.*`, `vite.config.*` 등에서 감지 (모노레포 지원)
- **깊은 디렉토리 폴백**: React/CRA/Vite/Vue/RN 프로젝트에서 `**/components/*/`, `**/views/*/`, `**/screens/*/`, `**/containers/*/`, `**/pages/*/`, `**/routes/*/`, `**/modules/*/`, `**/domains/*/`를 깊이 무관하게 스캔

---

## 빠른 시작

### 사전 요구사항

- **Node.js** v18+
- **Claude Code CLI** (설치 & 인증 완료)

### 설치

```bash
cd /your/project/root

# 방법 A: npx (권장 — 설치 불필요)
npx claudeos-core init

# 방법 B: 글로벌 설치
npm install -g claudeos-core
claudeos-core init

# 방법 C: 프로젝트 devDependency
npm install --save-dev claudeos-core
npx claudeos-core init

# 방법 D: git clone (개발/기여용)
git clone https://github.com/claudeos-core/claudeos-core.git claudeos-core-tools

# 크로스 플랫폼 (PowerShell, CMD, Bash, Zsh — 모든 터미널)
node claudeos-core-tools/bin/cli.js init

# Linux/macOS 전용 (Bash만)
bash claudeos-core-tools/bootstrap.sh
```

### 출력 언어 (10개 언어 지원)

`--lang` 없이 `init`을 실행하면 화살표 키 또는 숫자 키로 언어를 선택하는 인터랙티브 화면이 나타납니다:

```
╔══════════════════════════════════════════════════╗
║  Select generated document language (required)   ║
╚══════════════════════════════════════════════════╝

  생성되는 파일(CLAUDE.md, Standards, Rules,
  Skills, Guides)이 한국어로 작성됩니다.

     1. en     — English
  ❯  2. ko     — 한국어 (Korean)
     3. zh-CN  — 简体中文 (Chinese Simplified)
     ...

  ↑↓ Move  1-0 Jump  Enter Select  ESC Cancel
```

이동 시 설명이 해당 언어로 바뀝니다. 선택 화면을 건너뛰려면 `--lang`을 직접 지정하세요:

```bash
npx claudeos-core init --lang ko    # 한국어
npx claudeos-core init --lang en    # English
npx claudeos-core init --lang ja    # 日本語
```

> **참고:** 이 설정은 생성되는 문서 파일의 언어만 변경합니다. 코드 분석(Pass 1–2)은 항상 영어로 실행되며, 생성 결과(Pass 3)만 선택한 언어로 작성됩니다. 코드 예시는 원래 프로그래밍 언어 구문 그대로 유지됩니다.

이게 전부입니다. 5–18분 후 모든 문서가 생성되어 바로 사용 가능합니다. CLI가 각 Pass 실행 시 퍼센트, 경과시간, 예상 남은시간이 포함된 프로그레스 바를 표시합니다.

### 수동 단계별 설치

각 단계를 직접 제어하거나, 자동 파이프라인이 특정 단계에서 실패한 경우 수동으로 실행할 수 있습니다. ClaudeOS-Core의 내부 동작을 이해하는 데에도 유용합니다.

#### Step 1: 클론 및 의존성 설치

```bash
cd /your/project/root

git clone https://github.com/claudeos-core/claudeos-core.git claudeos-core-tools
cd claudeos-core-tools && npm install && cd ..
```

#### Step 2: 디렉토리 구조 생성

```bash
# Rules
mkdir -p .claude/rules/{00.core,10.backend,20.frontend,30.security-db,40.infra,50.sync}

# Standards
mkdir -p claudeos-core/standard/{00.core,10.backend-api,20.frontend-ui,30.security-db,40.infra,50.verification,90.optional}

# Skills
mkdir -p claudeos-core/skills/{00.shared,10.backend-crud/scaffold-crud-feature,20.frontend-page/scaffold-page-feature,50.testing,90.experimental}

# Guide, Plan, Database, MCP, Generated
mkdir -p claudeos-core/guide/{01.onboarding,02.usage,03.troubleshooting,04.architecture}
mkdir -p claudeos-core/{plan,database,mcp-guide,generated}
```

#### Step 3: plan-installer 실행 (프로젝트 분석)

프로젝트를 스캔하여 스택을 감지하고, 도메인을 찾고, 그룹으로 분할하고, 프롬프트를 생성합니다.

```bash
node claudeos-core-tools/plan-installer/index.js
```

**출력 (`claudeos-core/generated/`):**
- `project-analysis.json` — 감지된 스택, 도메인, 프론트엔드 정보
- `domain-groups.json` — Pass 1용 도메인 그룹
- `pass1-backend-prompt.md` / `pass1-frontend-prompt.md` — 분석 프롬프트
- `pass2-prompt.md` — 통합 프롬프트
- `pass3-prompt.md` — 생성 프롬프트

진행하기 전에 이 파일들을 검토하여 감지 정확도를 확인할 수 있습니다.

#### Step 4: Pass 1 — 도메인 그룹별 심층 코드 분석

각 도메인 그룹에 대해 Pass 1을 실행합니다. `domain-groups.json`에서 그룹 수를 확인하세요.

```bash
# Check groups
cat claudeos-core/generated/domain-groups.json | node -e "
  const g = JSON.parse(require('fs').readFileSync('/dev/stdin','utf-8'));
  g.groups.forEach((g,i) => console.log('Group '+(i+1)+': ['+g.domains.join(', ')+'] ('+g.type+', ~'+g.estimatedFiles+' files)'));
"

# Run Pass 1 for group 1:
cp claudeos-core/generated/pass1-backend-prompt.md /tmp/_pass1.md
DOMAIN_LIST="user, order, product" PASS_NUM=1 \
  perl -pi -e 's/\{\{DOMAIN_GROUP\}\}/$ENV{DOMAIN_LIST}/g; s/\{\{PASS_NUM\}\}/$ENV{PASS_NUM}/g' /tmp/_pass1.md
cat /tmp/_pass1.md | claude -p --dangerously-skip-permissions

# 프론트엔드 그룹은 pass1-frontend-prompt.md를 사용하세요
```

**확인:** `ls claudeos-core/generated/pass1-*.json`으로 그룹당 하나의 JSON이 있는지 확인합니다.

#### Step 5: Pass 2 — 분석 결과 통합

```bash
cat claudeos-core/generated/pass2-prompt.md \
  | claude -p --dangerously-skip-permissions
```

**확인:** `claudeos-core/generated/pass2-merged.json`이 존재하고 9개 이상의 최상위 키가 있어야 합니다.

#### Step 6: Pass 3 — 전체 문서 생성

```bash
cat claudeos-core/generated/pass3-prompt.md \
  | claude -p --dangerously-skip-permissions
```

**확인:** 프로젝트 루트에 `CLAUDE.md`가 존재해야 합니다.

#### Step 7: 검증 도구 실행

```bash
# 메타데이터 생성 (다른 검사 전 필수)
node claudeos-core-tools/manifest-generator/index.js

# 전체 검사 실행
node claudeos-core-tools/health-checker/index.js

# 또는 개별 검사 실행:
node claudeos-core-tools/plan-validator/index.js --check # Plan ↔ disk
node claudeos-core-tools/sync-checker/index.js          # Sync status
node claudeos-core-tools/content-validator/index.js     # Content quality
node claudeos-core-tools/pass-json-validator/index.js   # JSON format
```

#### Step 8: 결과 확인

```bash
find .claude claudeos-core -type f | grep -v node_modules | grep -v '/generated/' | wc -l
head -30 CLAUDE.md
ls .claude/rules/*/
```

> **Tip:** 특정 단계에서 실패하면 해당 단계만 다시 실행할 수 있습니다. Pass 1/2 결과는 캐시됩니다 — `pass1-N.json` 또는 `pass2-merged.json`이 이미 존재하면 자동 파이프라인이 건너뜁니다. `npx claudeos-core init --force`를 사용하면 이전 결과를 삭제하고 새로 시작합니다.

### 사용 시작

```
# Claude Code에서 자연스럽게 요청하면 됩니다:
"주문 도메인 CRUD 만들어줘"
"사용자 인증 API 추가해줘"
"이 코드를 프로젝트 패턴에 맞게 리팩토링해줘"

# Claude Code가 생성된 Standards, Rules, Skills를 자동으로 참조합니다.
```

---

## 작동 원리 — 3-Pass 파이프라인

```
npx claudeos-core init
    │
    ├── [1] npm install                    ← 의존성 설치 (~10초)
    ├── [2] 디렉토리 구조 생성              ← 폴더 생성 (~1초)
    ├── [3] plan-installer (Node.js)       ← 프로젝트 스캔 (~5초)
    │       ├── 스택 자동 감지 (멀티스택 지원)
    │       ├── 도메인 목록 추출 (backend/frontend 태깅)
    │       ├── 도메인 그룹 자동 분할 (타입별)
    │       └── 스택별 프롬프트 선택 (타입별)
    │
    ├── [4] Pass 1 × N  (claude -p)       ← 코드 심층 분석 (~2-8분)
    │       ├── ⚙️ 백엔드 그룹 → 백엔드 분석 프롬프트
    │       └── 🎨 프론트엔드 그룹 → 프론트엔드 분석 프롬프트
    │
    ├── [5] Pass 2 × 1  (claude -p)       ← 분석 결과 통합 (~1분)
    │       └── 전체 Pass 1 결과 통합 (백엔드 + 프론트엔드)
    │
    ├── [6] Pass 3 × 1  (claude -p)       ← 전체 생성 (~3-5분)
    │       └── 결합 프롬프트 (백엔드 + 프론트엔드 대상)
    │
    └── [7] 검증                           ← health checker 자동 실행
```

### 왜 3 Pass인가?

**Pass 1**은 소스코드를 직접 읽는 유일한 Pass입니다. 도메인 그룹별 대표 파일을 선정하고 55–95개 분석 카테고리(스택별)에서 패턴을 추출합니다. 대규모 프로젝트에서는 도메인 그룹당 한 번씩 여러 번 실행됩니다. 멀티스택 프로젝트(예: Java 백엔드 + React 프론트엔드)에서는 백엔드와 프론트엔드 도메인이 각 스택에 맞는 **별도의 분석 프롬프트**를 사용합니다.

**Pass 2**는 모든 Pass 1 결과를 통합 분석으로 병합합니다: 공통 패턴 (100% 공유), 다수 패턴 (50%+ 공유), 도메인 특화 패턴, 심각도별 안티패턴, 횡단 관심사 (명명, 보안, DB, 테스트, 로깅, 성능). 백엔드와 프론트엔드 결과가 함께 병합됩니다.

**Pass 3**는 병합된 분석을 기반으로 전체 파일 생성을 수행합니다. 소스코드를 읽지 않고 분석 JSON만 참조합니다. 멀티스택 모드에서는 생성 프롬프트가 백엔드와 프론트엔드 대상을 결합하여 두 세트의 표준을 한 번에 생성합니다.

---

## 생성되는 파일 구조

```
your-project/
│
├── CLAUDE.md                          ← Claude Code 진입점
│
├── .claude/
│   └── rules/                         ← Glob 트리거 규칙
│       ├── 00.core/
│       ├── 10.backend/
│       ├── 20.frontend/
│       ├── 30.security-db/
│       ├── 40.infra/
│       └── 50.sync/                   ← 동기화 리마인더 규칙
│
├── claudeos-core/                     ← 메인 출력 디렉토리
│   ├── generated/                     ← 분석 JSON + 동적 프롬프트
│   │   ├── project-analysis.json      ← 스택 정보 (멀티스택 포함)
│   │   ├── domain-groups.json         ← type: backend/frontend 태깅된 그룹
│   │   ├── pass1-backend-prompt.md    ← 백엔드 분석 프롬프트
│   │   ├── pass1-frontend-prompt.md   ← 프론트엔드 분석 프롬프트 (감지 시)
│   │   ├── pass2-prompt.md            ← 통합 프롬프트
│   │   └── pass3-prompt.md            ← 생성 프롬프트 (결합)
│   ├── standard/                      ← 코딩 표준 (15-19개 파일)
│   │   ├── 00.core/                   ← 개요, 아키텍처, 명명 규칙
│   │   ├── 10.backend-api/            ← API 패턴 (스택별)
│   │   ├── 20.frontend-ui/            ← 프론트엔드 패턴 (감지 시)
│   │   ├── 30.security-db/            ← 보안, DB 스키마, 유틸리티
│   │   ├── 40.infra/                  ← 설정, 로깅, CI/CD
│   │   └── 50.verification/           ← 빌드 검증, 테스트
│   ├── skills/                        ← CRUD 스캐폴딩 스킬
│   ├── guide/                         ← 온보딩, FAQ, 트러블슈팅 (9개 파일)
│   ├── plan/                          ← 마스터 플랜 (백업/복원)
│   ├── database/                      ← DB 스키마, 마이그레이션 가이드
│   └── mcp-guide/                     ← MCP 서버 연동 가이드
│
└── claudeos-core-tools/               ← 이 도구 (수정 불필요)
```

모든 standard 파일은 ✅ 올바른 예시, ❌ 잘못된 예시, 규칙 요약 테이블을 포함합니다 — 제네릭 템플릿이 아닌 실제 코드 패턴에서 추출됩니다.

---

## 규모별 자동 조절

| 규모 | 도메인 수 | Pass 1 횟수 | 총 `claude -p` | 예상 시간 |
|---|---|---|---|---|
| 소규모 | 1–4 | 1 | 3 | ~5분 |
| 중규모 | 5–8 | 2 | 4 | ~8분 |
| 대규모 | 9–16 | 3–4 | 5–6 | ~12분 |
| 초대규모 | 17+ | 5+ | 7+ | ~18분+ |

멀티스택 프로젝트(예: Java + React)에서는 백엔드와 프론트엔드 도메인이 합산됩니다. 백엔드 6개 + 프론트엔드 4개 = 총 10개로 "대규모"로 스케일링됩니다.

---

## 검증 도구

ClaudeOS-Core에는 생성 후 자동으로 실행되는 5개의 내장 검증 도구가 포함되어 있습니다:

```bash
# 한 번에 전체 확인 (권장)
npx claudeos-core health

# 개별 명령어
npx claudeos-core validate     # Plan ↔ 디스크 비교
npx claudeos-core refresh      # 디스크 → Plan 동기화
npx claudeos-core restore      # Plan → 디스크 복원

# node 직접 실행 (git clone 사용자)
node claudeos-core-tools/health-checker/index.js
node claudeos-core-tools/manifest-generator/index.js
node claudeos-core-tools/plan-validator/index.js --check
node claudeos-core-tools/sync-checker/index.js
```

| 도구 | 역할 |
|---|---|
| **manifest-generator** | 메타데이터 JSON 생성 (rule-manifest, sync-map, plan-manifest) |
| **plan-validator** | Master Plan `<file>` 블록과 디스크 비교 — check, refresh, restore 3가지 모드 |
| **sync-checker** | 미등록 파일 (디스크에 있지만 Plan에 없는) 및 고아 항목 탐지 |
| **content-validator** | 파일 품질 검증 — 빈 파일, ✅/❌ 예시 누락, 필수 섹션 확인 |
| **pass-json-validator** | Pass 1–3 JSON 구조, 필수 키, 섹션 완성도 검증 |

---

## Claude Code가 문서를 사용하는 방식

ClaudeOS-Core가 생성한 문서를 Claude Code가 실제로 읽는 방식입니다:

### 자동으로 읽는 파일

| 파일 | 시점 | 보장 |
|---|---|---|
| `CLAUDE.md` | 매 대화 시작 시 | 항상 |
| `.claude/rules/00.core/*` | 파일 편집 시 (`paths: ["**/*"]`) | 항상 |
| `.claude/rules/10.backend/*` | 파일 편집 시 (`paths: ["**/*"]`) | 항상 |
| `.claude/rules/30.security-db/*` | 파일 편집 시 (`paths: ["**/*"]`) | 항상 |
| `.claude/rules/40.infra/*` | config/infra 파일 편집 시만 (스코핑된 paths) | 조건부 |
| `.claude/rules/50.sync/*` | claudeos-core 파일 편집 시만 (스코핑된 paths) | 조건부 |

### rule 참조를 통해 온디맨드로 읽는 파일

각 rule 파일 하단의 `## Reference` 섹션이 대응하는 standard를 링크합니다. Claude는 현재 작업과 관련된 standard만 읽습니다:

- `claudeos-core/standard/**` — 코딩 패턴, ✅/❌ 예시, 네이밍 규칙
- `claudeos-core/database/**` — DB 스키마 (쿼리, 매퍼, 마이그레이션용)

`00.standard-reference.md`는 대응 rule이 없는 standard를 발견하기 위한 디렉토리 역할입니다.

### 읽지 않는 파일 (컨텍스트 절약)

standard-reference 규칙의 `DO NOT Read` 섹션으로 명시적으로 제외됩니다:

| 폴더 | 제외 이유 |
|---|---|
| `claudeos-core/plan/` | Master Plan 백업 (~340KB). `npx claudeos-core refresh`로 동기화. |
| `claudeos-core/generated/` | 빌드 메타데이터 JSON. 코딩 참조 아님. |
| `claudeos-core/guide/` | 사람을 위한 온보딩 가이드. |
| `claudeos-core/mcp-guide/` | MCP 서버 문서. 코딩 참조 아님. |

---

## 일상 워크플로우

### 설치 후

```
# Claude Code를 평소처럼 사용하면 됩니다 — 표준을 자동으로 참조합니다:
"주문 도메인 CRUD 만들어줘"
"사용자 프로필 수정 API 추가해줘"
"이 코드를 프로젝트 패턴에 맞게 리팩토링해줘"
```

### 표준을 직접 편집한 후

```bash
# standard나 rules 파일을 수정한 후:
npx claudeos-core refresh

# 전체 일관성 확인
npx claudeos-core health
```

### 문서가 깨졌을 때

```bash
# Master Plan에서 전체 복원
npx claudeos-core restore
```

### CI/CD 연동

```yaml
# GitHub Actions 예시
- run: npx claudeos-core validate
# Exit code 1이면 PR 블록
```

---

## 무엇이 다른가?

### 다른 Claude Code 도구와의 비교

| | ClaudeOS-Core | Everything Claude Code (50K+ ⭐) | Harness | specs-generator | Claude `/init` |
|---|---|---|---|---|---|
| **접근 방식** | 코드가 먼저 분석 후 LLM 생성 | 사전 제작된 설정 프리셋 | LLM이 에이전트 팀 설계 | LLM이 스펙 문서 생성 | LLM이 CLAUDE.md 작성 |
| **소스코드 직접 분석** | ✅ Deterministic 정적 분석 | ❌ | ❌ | ❌ (LLM이 읽음) | ❌ (LLM이 읽음) |
| **스택 감지** | 코드가 확정 (ORM, DB, 빌드 툴, 패키지 매니저) | N/A (스택 무관) | LLM이 추측 | LLM이 추측 | LLM이 추측 |
| **도메인 감지** | 코드가 확정 (Java 5패턴, Kotlin CQRS, Next.js FSD) | N/A | LLM이 추측 | N/A | N/A |
| **같은 프로젝트 → 같은 결과** | ✅ Deterministic 분석 | ✅ (정적 파일) | ❌ (LLM 결과 변동) | ❌ (LLM 결과 변동) | ❌ (LLM 결과 변동) |
| **대형 프로젝트 처리** | 도메인 그룹 분할 (4 도메인 / 40 파일) | N/A | 분할 없음 | 분할 없음 | 컨텍스트 윈도우 한계 |
| **출력물** | CLAUDE.md + Rules + Standards + Skills + Guides + Plans (40-50+ 파일) | Agents + Skills + Commands + Hooks | Agents + Skills | 6 스펙 문서 | CLAUDE.md (1 파일) |
| **출력 위치** | `.claude/rules/` (Claude Code 자동 로드) | `.claude/` 여러 위치 | `.claude/agents/` + `.claude/skills/` | `.claude/steering/` + `specs/` | `CLAUDE.md` |
| **생성 후 검증** | ✅ 5 자동 검증 도구 | ❌ | ❌ | ❌ | ❌ |
| **다국어 출력** | ✅ 10 언어 | ❌ | ❌ | ❌ | ❌ |
| **멀티 스택** | ✅ 백엔드 + 프론트엔드 동시 | ❌ 스택 무관 | ❌ | ❌ | 부분적 |
| **에이전트 오케스트레이션** | ❌ | ✅ 28 에이전트 | ✅ 6 패턴 | ❌ | ❌ |

### 핵심 차이 한 줄

**다른 도구는 Claude에게 "일반적으로 좋은 지침"을 줍니다. ClaudeOS-Core는 Claude에게 "실제 코드에서 추출한 지침"을 줍니다.**

그래서 Claude Code가 MyBatis 프로젝트에서 JPA 코드를 생성하는 일이 없어지고,
`success()`를 써야 할 곳에 `ok()`를 쓰는 일이 없어지고,
`controller/user/` 구조인데 `user/controller/`로 만드는 일이 없어집니다.

### 경쟁이 아닌 보완

ClaudeOS-Core는 **프로젝트별 규칙과 표준**에 집중합니다.
다른 도구들은 **에이전트 오케스트레이션과 워크플로우**에 집중합니다.

ClaudeOS-Core로 프로젝트 규칙을 생성한 뒤, ECC나 Harness를 그 위에 얹어 에이전트 팀과 워크플로우 자동화를 구성할 수 있습니다. 서로 다른 문제를 해결하는 도구입니다.

---
## FAQ

**Q: 소스코드를 수정하나요?**
아니요. `CLAUDE.md`, `.claude/rules/`, `claudeos-core/`만 생성합니다. 기존 코드는 절대 수정하지 않습니다.

**Q: 비용이 얼마나 드나요?**
`claude -p`를 3–7회 호출합니다. 일반적인 Claude Code 사용량 내에서 처리됩니다.

**Q: 생성된 파일을 Git에 커밋해야 하나요?**
네, 권장합니다. 팀원 전체가 동일한 Claude Code 표준을 공유할 수 있습니다. `claudeos-core/generated/`는 `.gitignore`에 추가하는 것을 권장합니다 (분석 JSON은 재생성 가능).

**Q: 멀티스택 프로젝트(예: Java 백엔드 + React 프론트엔드)는?**
완전 지원됩니다. ClaudeOS-Core가 두 스택을 자동 감지하고, 도메인을 `backend`/`frontend`로 태깅하여 각각 스택별 분석 프롬프트를 사용합니다. Pass 2에서 통합하고, Pass 3에서 백엔드와 프론트엔드 표준을 한 번에 생성합니다.

**Q: 재실행하면 어떻게 되나요?**
이전 Pass 1/2 결과가 존재하면 인터랙티브 프롬프트가 표시됩니다: **Continue** (중단된 곳에서 재개) 또는 **Fresh** (전부 삭제 후 새로 시작). `--force`를 사용하면 프롬프트 없이 항상 새로 시작합니다. Pass 3는 항상 재실행됩니다. 이전 버전은 Master Plans에서 복원할 수 있습니다.

**Q: NestJS는 전용 템플릿이 있나요, 아니면 Express 템플릿을 사용하나요?**
NestJS는 NestJS 전용 분석 카테고리가 포함된 `node-nestjs` 전용 템플릿을 사용합니다: `@Module`, `@Injectable`, `@Controller` 데코레이터, Guards, Pipes, Interceptors, DI 컨테이너, CQRS 패턴, `Test.createTestingModule`. Express 프로젝트는 별도의 `node-express` 템플릿을 사용합니다.

**Q: Vue / Nuxt 프로젝트는?**
Vue/Nuxt는 Composition API, `<script setup>`, defineProps/defineEmits, Pinia 스토어, `useFetch`/`useAsyncData`, Nitro 서버 라우트, `@nuxt/test-utils`를 커버하는 `vue-nuxt` 전용 템플릿을 사용합니다. Next.js/React 프로젝트는 `node-nextjs` 템플릿을 사용합니다.

**Q: Turborepo / pnpm workspaces / Lerna 모노레포에서도 작동하나요?**
네. ClaudeOS-Core는 `turbo.json`, `pnpm-workspace.yaml`, `lerna.json`, `package.json#workspaces`를 감지하고 서브 패키지 `package.json`에서 프레임워크/ORM/DB 의존성을 자동으로 스캔합니다. 도메인 스캔은 `apps/*/src/`와 `packages/*/src/` 패턴을 지원합니다. 모노레포 루트에서 실행하세요.

**Q: Kotlin을 지원하나요?**
네. ClaudeOS-Core는 `build.gradle.kts` 또는 `build.gradle`의 kotlin 플러그인에서 Kotlin을 자동 감지합니다. Kotlin 전용 `kotlin-spring` 템플릿을 사용하여 data class, sealed class, 코루틴, 확장 함수, MockK 등 Kotlin 고유 패턴을 분석합니다.

**Q: CQRS / BFF 아키텍처는?**
Kotlin 멀티모듈 프로젝트에서 완전 지원됩니다. `settings.gradle.kts`를 읽어 모듈명에서 타입(command, query, bff, integration)을 감지하고, 같은 도메인의 Command/Query 모듈을 그룹핑합니다. 생성되는 표준에는 command controller vs query controller 별도 규칙, BFF/Feign 패턴, 모듈 간 통신 규칙이 포함됩니다.

**Q: Gradle 멀티모듈 모노레포는?**
ClaudeOS-Core는 중첩 깊이에 관계없이 모든 서브모듈(`**/src/main/kotlin/**/*.kt`)을 스캔합니다. 모듈 타입은 이름 규칙으로 추론됩니다 (예: `reservation-command-server` → 도메인: `reservation`, 타입: `command`). 공유 라이브러리(`shared-lib`, `integration-lib`)도 감지됩니다.

---

## 템플릿 구조

```
pass-prompts/templates/
├── common/                  # Shared header/footer
├── java-spring/             # Java / Spring Boot
├── kotlin-spring/           # Kotlin / Spring Boot (CQRS, BFF, multi-module)
├── node-express/            # Node.js / Express
├── node-nestjs/             # Node.js / NestJS (Module, DI, Guard, Pipe, Interceptor)
├── node-fastify/            # Node.js / Fastify
├── node-nextjs/             # Next.js / React
├── vue-nuxt/                # Vue / Nuxt (Composition API, Pinia, Nitro)
├── angular/                 # Angular
├── python-django/           # Python / Django (DRF)
└── python-fastapi/          # Python / FastAPI
```

`plan-installer`가 스택을 자동 감지한 후 타입별 프롬프트를 조합합니다. NestJS와 Vue/Nuxt는 프레임워크별 분석 카테고리가 적용된 전용 템플릿을 사용합니다. 멀티스택 프로젝트에서는 `pass1-backend-prompt.md`와 `pass1-frontend-prompt.md`가 별도로 생성되고, `pass3-prompt.md`는 두 스택의 생성 대상을 결합합니다.

---

## 모노레포 지원

ClaudeOS-Core는 JS/TS 모노레포 구성을 자동으로 감지하고 서브 패키지의 의존성을 스캔합니다.

**지원하는 모노레포 마커** (자동 감지):
- `turbo.json` (Turborepo)
- `pnpm-workspace.yaml` (pnpm workspaces)
- `lerna.json` (Lerna)
- `package.json#workspaces` (npm/yarn workspaces)

**모노레포 루트에서 실행하세요** — ClaudeOS-Core는 `apps/*/package.json`과 `packages/*/package.json`을 읽어 서브 패키지의 프레임워크/ORM/DB 의존성을 자동으로 검색합니다:

```bash
cd my-monorepo
npx claudeos-core init
```

**감지되는 항목:**
- `apps/web/package.json`의 의존성 (예: `next`, `react`) → 프론트엔드 스택
- `apps/api/package.json`의 의존성 (예: `express`, `prisma`) → 백엔드 스택
- `packages/db/package.json`의 의존성 (예: `drizzle-orm`) → ORM/DB
- `pnpm-workspace.yaml`의 커스텀 워크스페이스 경로 (예: `services/*`)

**도메인 스캔도 모노레포 레이아웃을 지원합니다:**
- 백엔드 도메인: `apps/api/src/modules/*/`, `apps/api/src/*/`
- 프론트엔드 도메인: `apps/web/app/*/`, `apps/web/src/app/*/`, `apps/web/pages/*/`
- 공유 패키지 도메인: `packages/*/src/*/`

```
my-monorepo/                    ← 여기서 실행: npx claudeos-core init
├── turbo.json                  ← Turborepo 자동 감지
├── apps/
│   ├── web/                    ← apps/web/package.json에서 Next.js 감지
│   │   ├── app/dashboard/      ← 프론트엔드 도메인 감지
│   │   └── package.json        ← { "dependencies": { "next": "^14" } }
│   └── api/                    ← apps/api/package.json에서 Express 감지
│       ├── src/modules/users/  ← 백엔드 도메인 감지
│       └── package.json        ← { "dependencies": { "express": "^4" } }
├── packages/
│   ├── db/                     ← packages/db/package.json에서 Drizzle 감지
│   └── ui/
└── package.json                ← { "workspaces": ["apps/*", "packages/*"] }
```

> **참고:** Kotlin/Java 모노레포의 경우, 멀티모듈 감지는 `settings.gradle.kts`를 사용합니다 (위의 [Kotlin 멀티모듈 도메인 감지](#kotlin-멀티모듈-도메인-감지) 참조). JS 모노레포 마커가 필요하지 않습니다.

## 트러블슈팅

**"claude: command not found"** — Claude Code CLI가 설치되지 않았거나 PATH에 없습니다. [Claude Code 공식 문서](https://code.claude.com/docs/en/overview)를 참조하세요.

**"npm install 실패"** — Node.js 버전이 낮을 수 있습니다. v18+ 필요.

**"도메인 0개 감지됨"** — 프로젝트 구조가 비표준일 수 있습니다. 스택별 감지 패턴은 위의 [지원 스택](#지원-스택) 섹션을 참조하세요.

**Kotlin 프로젝트에서 "도메인 0개 감지됨"** — 프로젝트 루트에 `build.gradle.kts` (또는 kotlin 플러그인이 있는 `build.gradle`)가 있고, 소스 파일이 `**/src/main/kotlin/` 아래에 있는지 확인하세요. 멀티모듈 프로젝트는 `settings.gradle.kts`에 `include()` 문이 포함되어 있어야 합니다. 단일 모듈 Kotlin 프로젝트(`settings.gradle` 없음)도 지원됩니다 — `src/main/kotlin/` 하위 패키지/클래스 구조에서 도메인을 추출합니다.

**"언어가 kotlin 대신 java로 감지됨"** — ClaudeOS-Core는 루트 `build.gradle(.kts)`를 먼저 확인한 후 서브모듈 빌드 파일을 확인합니다. 루트 빌드 파일이 `kotlin` 없이 `java` 플러그인만 사용하는 경우, 최대 5개 서브모듈 빌드 파일을 폴백으로 검사합니다. 그래도 감지되지 않으면 최소 하나의 `build.gradle.kts`에 `kotlin("jvm")` 또는 `org.jetbrains.kotlin`이 포함되어 있는지 확인하세요.

**"CQRS가 감지되지 않음"** — 아키텍처 감지는 모듈명에 `command`와 `query` 키워드가 포함되어야 합니다. 다른 이름을 사용하는 경우(예: `write-server`, `read-server`) CQRS가 자동 감지되지 않습니다. plan-installer 실행 후 생성된 프롬프트를 수동으로 조정할 수 있습니다.

---

## 기여

기여를 환영합니다! 도움이 가장 필요한 영역:

- **새 스택 템플릿** — Ruby/Rails, Go/Gin, PHP/Laravel, Rust/Axum
- **모노레포 심화 지원** — 서브프로젝트 루트 분리, 워크스페이스 감지
- **테스트 커버리지** — 테스트 스위트 확장 중 (현재 269개 테스트, 전체 스캐너, 스택 감지, 도메인 그룹핑, 플랜 파싱, 프롬프트 생성, CLI 셀렉터, 모노레포 감지, 검증 도구, Vite SPA 감지 커버)

---

## 만든 사람

**claudeos-core** — [GitHub](https://github.com/claudeos-core) · [Email](mailto:claudeoscore@gmail.com)

## 라이선스

ISC
