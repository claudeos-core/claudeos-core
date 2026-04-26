# ClaudeOS-Core

[![npm version](https://img.shields.io/npm/v/claudeos-core.svg?logo=npm&label=npm)](https://www.npmjs.com/package/claudeos-core)
[![CI](https://img.shields.io/github/actions/workflow/status/claudeos-core/claudeos-core/test.yml?branch=master&logo=github&label=CI)](https://github.com/claudeos-core/claudeos-core/actions/workflows/test.yml)
[![tests](https://img.shields.io/badge/tests-736%20passing-brightgreen?logo=node.js&logoColor=white)](https://github.com/claudeos-core/claudeos-core/actions/workflows/test.yml)
[![node](https://img.shields.io/node/v/claudeos-core.svg?logo=node.js&logoColor=white&label=node)](https://nodejs.org/)
[![license](https://img.shields.io/npm/l/claudeos-core.svg?color=blue)](LICENSE)
[![downloads](https://img.shields.io/npm/dm/claudeos-core.svg?logo=npm&color=blue&label=downloads)](https://www.npmjs.com/package/claudeos-core)

**실제 소스 코드에서 `CLAUDE.md` + `.claude/rules/`를 자동 생성하는 deterministic CLI — Node.js scanner + 4-pass Claude 파이프라인 + 5개 validator. 12개 stack, 10개 언어, invented path 없음.**

```bash
npx claudeos-core init
```

[**12 stacks**](#supported-stacks)에서 작동 (monorepo 포함) — 명령 한 번, 설정 불필요, resume-safe, idempotent.

[🇺🇸 English](README.md) · [🇨🇳 中文](README.zh-CN.md) · [🇯🇵 日本語](README.ja.md) · [🇪🇸 Español](README.es.md) · [🇻🇳 Tiếng Việt](README.vi.md) · [🇮🇳 हिन्दी](README.hi.md) · [🇷🇺 Русский](README.ru.md) · [🇫🇷 Français](README.fr.md) · [🇩🇪 Deutsch](README.de.md)

---

## 이 도구가 뭔가요?

Claude Code는 매 세션 framework 기본값으로 fallback합니다. 팀은 **MyBatis**를 쓰는데, Claude는 JPA를 작성합니다. 여러분의 wrapper는 `ApiResponse.ok()`인데, Claude는 `ResponseEntity.success()`를 씁니다. 여러분의 패키지는 layer-first인데, Claude는 domain-first로 생성합니다. 매 repo마다 `.claude/rules/`를 hand로 작성하면 해결되지만 — 코드가 발전하며 룰이 drift합니다.

**ClaudeOS-Core는 실제 소스 코드에서 deterministic하게 재생성합니다.** Node.js scanner가 먼저 읽고 (stack, ORM, 패키지 layout, 파일 경로). 그 다음 4-pass Claude 파이프라인이 전체 세트를 작성합니다 — `CLAUDE.md` + 자동 로드되는 `.claude/rules/` + standards + skills — LLM이 escape할 수 없는 명시적 path allowlist에 의해 제약됩니다. 5개 validator가 ship 전에 출력을 검증합니다.

결과: 같은 입력 → byte-identical 출력, 10개 언어 중 어느 것이든, invented path 없음. (자세한 내용은 아래 [무엇이 다른가](#무엇이-다른가) 참조.)

장기 프로젝트를 위해 별도의 [Memory Layer](#memory-layer-선택-장기-프로젝트용)가 시드됩니다.

---

## 실제 프로젝트에서 보기

[`spring-boot-realworld-example-app`](https://github.com/gothinkster/spring-boot-realworld-example-app)에서 실행 — Java 11 · Spring Boot 2.6 · MyBatis · SQLite · 187 source files. 결과: **75 generated files**, 총 소요 시간 **53분**, 모든 validator ✅.

<p align="center">
  <img src="docs/assets/spring-boot-realworld-demo.gif" alt="ClaudeOS-Core init running on spring-boot-realworld-example-app — stack detection, 4-pass pipeline, validators, completion summary" width="769">
</p>

<details>
<summary><strong>터미널 출력 (텍스트 버전, 검색·복사용)</strong></summary>

```text
╔════════════════════════════════════════════════════╗
║       ClaudeOS-Core — Bootstrap (4-Pass)          ║
╚════════════════════════════════════════════════════╝
    Project root: spring-boot-realworld-example-app
    Language:     English (en)

  [Phase 1] Detecting stack...
    Language:    java 11
    Framework:   spring-boot 2.6.3
    Database:    sqlite
    ORM:         mybatis
    PackageMgr:  gradle

  [Phase 2] Scanning structure...
    Backend:     2 domains
    Total:       2 domains
    Package:     io.spring.infrastructure

  [Phase 5] Active domains...
    ✅ 00.core   ✅ 10.backend   ⏭️ 20.frontend
    ✅ 30.security-db   ✅ 40.infra
    ✅ 80.verification  ✅ 90.optional

[4] Pass 1 — Deep analysis per domain group...
    ✅ pass1-1.json created (5m 34s)
    [█████░░░░░░░░░░░░░░░] 25% (1/4)

[5] Pass 2 — Merging analysis results...
    ✅ pass2-merged.json created (4m 22s)
    [██████████░░░░░░░░░░] 50% (2/4)

[6] Pass 3 — Generating all files...
    Pass 3 split mode (3a → 3b → 3c → 3d-aux)
    ✅ 3a complete (2m 57s)            — pass3a-facts.md (187-path allowlist)
    ✅ 3b complete (18m 49s)           — CLAUDE.md + 19 standards + 20 rules
    ✅ 3c complete (12m 35s)           — 13 skills + 9 guides
    ✅ 3d-aux complete (3m 18s)        — database/ + mcp-guide/
    Pass 3 split complete: 4/4 stages successful
    [███████████████░░░░░] 75% (3/4)

[7] Pass 4 — Memory scaffolding...
    Pass 4 staged-rules: 6 rule files moved to .claude/rules/
    ✅ Pass 4 complete (5m)
       Gap-fill: all 12 expected files already present
    [████████████████████] 100% (4/4)

╔═══════════════════════════════════════╗
║  ClaudeOS-Core — Health Checker       ║
╚═══════════════════════════════════════╝
  ✅ plan-validator         pass
  ✅ sync-checker           pass
  ✅ content-validator      pass
  ✅ pass-json-validator    pass
  ✅ All systems operational

  [Lint] ✅ CLAUDE.md structure valid (25 checks)
  [Content] ✅ All content validation passed
            Total: 0 advisories, 0 notes

╔════════════════════════════════════════════════════╗
║  ✅ ClaudeOS-Core — Complete                       ║
║   Files created:     75                           ║
║   Domains analyzed:  1 group                      ║
║   L4 scaffolded:     memory + rules               ║
║   Output language:   English                      ║
║   Total time:        53m 8s                       ║
╚════════════════════════════════════════════════════╝
```

</details>

<details>
<summary><strong>여러분 <code>CLAUDE.md</code>에 들어가는 내용 (실제 발췌 — Section 1 + 2)</strong></summary>

```markdown
# CLAUDE.md — spring-boot-realworld-example-app

> Reference implementation of the RealWorld backend specification on
> Java 11 + Spring Boot 2.6, exposing both REST and GraphQL endpoints
> over a hexagonal MyBatis persistence layer.

#### 1. Role Definition

As the senior developer for this repository, you are responsible for
writing, modifying, and reviewing code. Responses must be written in English.
A Java Spring Boot REST + GraphQL API server organized around a hexagonal
(ports & adapters) architecture, with a CQRS-lite read/write split inside
an XML-driven MyBatis persistence layer and JWT-based authentication.

#### 2. Project Overview

| Item | Value |
|---|---|
| Language | Java 11 |
| Framework | Spring Boot 2.6.3 |
| Build Tool | Gradle (Groovy DSL) |
| Persistence | MyBatis 3 via `mybatis-spring-boot-starter:2.2.2` (no JPA) |
| Database | SQLite (`org.xerial:sqlite-jdbc:3.36.0.3`) — `dev.db` (default), `:memory:` (test) |
| Migration | Flyway — single baseline `V1__create_tables.sql` |
| API Style | REST (`io.spring.api.*`) + GraphQL via Netflix DGS `:4.9.21` |
| Authentication | JWT HS512 (`jjwt-api:0.11.2`) + Spring Security `PasswordEncoder` |
| Server Port | 8080 (default) |
| Test Stack | JUnit Jupiter 5, Mockito, AssertJ, rest-assured, spring-mock-mvc |
```

위의 모든 값 — 정확한 dependency 좌표, `dev.db` 파일명, `V1__create_tables.sql` 마이그레이션명, "no JPA" — 은 Claude가 파일을 작성하기 전에 scanner가 `build.gradle` / `application.properties` / 소스 트리에서 추출한 것입니다. 어떤 것도 추측되지 않았습니다.

</details>

<details>
<summary><strong>실제 자동 로드 rule (<code>.claude/rules/10.backend/01.controller-rules.md</code>)</strong></summary>

````markdown
---
paths:
  - "**/*"
---

#### Controller Rules

##### REST (`io.spring.api.*`)

- Controllers are the SOLE response wrapper for HTTP — no aggregator/facade above them.
  Return `ResponseEntity<?>` or a body Spring serializes via `JacksonCustomizations`.
- Each controller method calls exactly ONE application service method. Multi-source
  composition lives in the application service.
- Controllers MUST NOT import `io.spring.infrastructure.*`. No direct `@Mapper` access.
- Validate command-param arguments with `@Valid`. Custom JSR-303 constraints live under
  `io.spring.application.{aggregate}.*`.
- Resolve the current user via `@AuthenticationPrincipal User`.
- Let exceptions propagate to `io.spring.api.exception.CustomizeExceptionHandler`
  (`@ControllerAdvice`). Do NOT `try/catch` business exceptions inside the controller.

##### GraphQL (`io.spring.graphql.*`)

- DGS components (`@DgsComponent`) are the sole GraphQL response wrappers.
  Use `@DgsQuery` / `@DgsData` / `@DgsMutation`.
- Resolve the current user via `io.spring.graphql.SecurityUtil.getCurrentUser()`.

##### Examples

✅ Correct:
```java
@PostMapping
public ResponseEntity<?> createArticle(@AuthenticationPrincipal User user,
                                       @Valid @RequestBody NewArticleParam param) {
    Article article = articleCommandService.createArticle(param, user);
    ArticleData data = articleQueryService.findById(article.getId(), user)
        .orElseThrow(ResourceNotFoundException::new);
    return ResponseEntity.ok(Map.of("article", data));
}
```

❌ Incorrect:
```java
@PostMapping
public ResponseEntity<?> create(@RequestBody NewArticleParam p) {
    try {
        articleCommandService.createArticle(p, currentUser);
    } catch (Exception e) {                                      // NO — let CustomizeExceptionHandler handle it
        return ResponseEntity.status(500).body(e.getMessage());  // NO — leaks raw message
    }
    return ResponseEntity.ok().build();
}
```
````

`paths: ["**/*"]` glob은 프로젝트 내 어떤 파일을 편집하든 Claude Code가 이 rule을 자동 로드한다는 뜻입니다. rule 안의 모든 클래스명, 패키지 경로, exception handler는 scan된 소스에서 직접 추출 — 프로젝트의 실제 `CustomizeExceptionHandler`와 `JacksonCustomizations`까지 포함됩니다.

</details>

<details>
<summary><strong>자동 생성된 <code>decision-log.md</code> seed (실제 발췌)</strong></summary>

```markdown
#### 2026-04-26 — Hexagonal ports & adapters with MyBatis-only persistence

- **Context:** `io.spring.core.*` exposes `*Repository` ports (e.g.,
  `io.spring.core.article.ArticleRepository`) implemented by
  `io.spring.infrastructure.repository.MyBatis*Repository` adapters.
  The domain layer has zero `org.springframework.*` /
  `org.apache.ibatis.*` / `io.spring.infrastructure.*` imports.
- **Options considered:** JPA/Hibernate, Spring Data, MyBatis-Plus
  `BaseMapper`. None adopted.
- **Decision:** MyBatis 3 (`mybatis-spring-boot-starter:2.2.2`) with
  hand-written XML statements under `src/main/resources/mapper/*.xml`.
  Hexagonal port/adapter wiring keeps the domain framework-free.
- **Consequences:** Every SQL lives in XML — `@Select`/`@Insert`/`@Update`/`@Delete`
  annotations are forbidden. New aggregates require both a
  `core.{aggregate}.{Aggregate}Repository` port AND a
  `MyBatis{Aggregate}Repository` adapter; introducing a JPA repository would
  split the persistence model.
```

Pass 4는 `pass2-merged.json`에서 추출한 아키텍처 결정 사항으로 `decision-log.md`를 시드합니다 — 이후 세션이 코드베이스가 _이렇게 보인다_ 는 사실뿐 아니라 _왜_ 이런지도 기억하도록. 모든 옵션 ("JPA/Hibernate", "MyBatis-Plus")과 모든 결과는 실제 `build.gradle` dependency 블록에 기반합니다.

</details>

---

## 테스트된 프로젝트

ClaudeOS-Core는 실제 OSS 프로젝트에서 측정한 reference 벤치마크와 함께 ship됩니다. public repo에서 사용해 보셨다면 [issue를 열어주세요](https://github.com/claudeos-core/claudeos-core/issues) — 이 표에 추가하겠습니다.

| 프로젝트 | Stack | Scanned → Generated | 상태 |
|---|---|---|---|
| [`spring-boot-realworld-example-app`](https://github.com/gothinkster/spring-boot-realworld-example-app) | Java 11 · Spring Boot 2.6 · MyBatis · SQLite | 187 → 75 files | ✅ 5개 validator 모두 통과 |

---

## Quick Start

**전제 조건:** Node.js 18+, [Claude Code](https://docs.anthropic.com/en/docs/claude-code) 설치 및 인증 완료.

```bash
# 1. 프로젝트 루트로 이동
cd my-spring-boot-project

# 2. init 실행 (코드를 분석하고 Claude에게 rules 작성을 요청합니다)
npx claudeos-core init

# 3. 끝. Claude Code를 열고 코딩 시작 — rules가 이미 로드되어 있습니다.
```

`init` 완료 후 **여러분이 얻는 것**:

```
your-project/
├── .claude/
│   └── rules/                    ← Claude Code가 자동 로드
│       ├── 00.core/              (공통 rules — 네이밍, 아키텍처)
│       ├── 10.backend/           (백엔드 stack rules, 해당 시)
│       ├── 20.frontend/          (프론트엔드 stack rules, 해당 시)
│       ├── 30.security-db/       (보안 & DB 컨벤션)
│       ├── 40.infra/             (env, 로깅, CI/CD)
│       ├── 50.sync/              (문서 동기화 알림 — rules only)
│       ├── 60.memory/            (memory rules — Pass 4, rules only)
│       ├── 70.domains/{type}/    (도메인별 rules, type = backend|frontend)
│       └── 80.verification/      (테스트 전략 + 빌드 검증 알림)
├── claudeos-core/
│   ├── standard/                 ← 참고 문서 (카테고리 구조 미러링)
│   │   ├── 00.core/              (프로젝트 개요, 아키텍처, 네이밍)
│   │   ├── 10.backend/           (백엔드 reference — 백엔드 stack일 때)
│   │   ├── 20.frontend/          (프론트엔드 reference — 프론트엔드 stack일 때)
│   │   ├── 30.security-db/       (보안 & DB reference)
│   │   ├── 40.infra/             (env / 로깅 / CI-CD reference)
│   │   ├── 70.domains/{type}/    (도메인별 reference)
│   │   ├── 80.verification/      (빌드 / 시작 / 테스트 reference — standard only)
│   │   └── 90.optional/          (스택별 추가 — standard only)
│   ├── skills/                   (Claude가 적용 가능한 재사용 패턴)
│   ├── guide/                    (일반 작업용 how-to 가이드)
│   ├── database/                 (스키마 개요, 마이그레이션 가이드)
│   ├── mcp-guide/                (MCP 통합 노트)
│   └── memory/                   (decision log, failure patterns, compaction)
└── CLAUDE.md                     (Claude가 가장 먼저 읽는 인덱스)
```

`rules/`와 `standard/` 사이에서 같은 번호 prefix를 공유하는 카테고리는 동일한 개념 영역을 나타냅니다 (예: `10.backend` rules ↔ `10.backend` standards). Rules-only 카테고리: `50.sync` (문서 동기화 알림), `60.memory` (Pass 4 memory). Standard-only 카테고리: `90.optional` (강제력 없는 스택별 추가). 다른 모든 prefix (`00`, `10`, `20`, `30`, `40`, `70`, `80`)는 `rules/`와 `standard/` 모두에 존재합니다. 이제 Claude Code가 여러분 프로젝트를 압니다.

---

## 누구를 위한 도구인가?

| 여러분이... | 이 도구가 제거하는 pain |
|---|---|
| **Claude Code로 새 프로젝트를 시작하는 솔로 개발자** | "매 세션마다 Claude에게 컨벤션 가르치기" — 사라짐. `CLAUDE.md` + 8-카테고리 `.claude/rules/`를 한 번에 생성. |
| **여러 repo의 공유 표준을 유지하는 팀 리드** | 패키지 이름 변경, ORM 교체, response wrapper 변경 시 `.claude/rules/` drift. ClaudeOS-Core는 deterministic하게 재동기화 — 같은 입력, byte-identical 출력, diff noise 없음. |
| **이미 Claude Code를 사용 중이지만 생성된 코드 수정에 지친 사용자** | 잘못된 response wrapper, 잘못된 패키지 layout, MyBatis 쓰는데 JPA, 중앙 집중 middleware인데 `try/catch` 흩뿌림. scanner가 진짜 컨벤션을 추출하고 모든 Claude pass가 명시적 path allowlist에 대해 실행됩니다. |
| **새 repo에 onboarding** (기존 프로젝트, 팀 합류) | repo에서 `init` 실행하면 살아있는 architecture map: CLAUDE.md의 stack 표, 레이어별 rules with ✅/❌ 예제, 주요 결정의 "왜"가 시드된 decision log (JPA vs MyBatis, REST vs GraphQL 등). 5개 파일 읽기가 5,000개 소스 파일 읽기를 이깁니다. |
| **한국어 / 일본어 / 중국어 / 외 7개 언어로 작업** | 대부분의 Claude Code rule generator는 영어 only. ClaudeOS-Core는 **10개 언어** (`en/ko/ja/zh-CN/es/vi/hi/ru/fr/de`)로 전체 세트를 작성하며 **byte-identical 구조 검증** — 출력 언어와 무관하게 같은 `claude-md-validator` verdict. |
| **monorepo에서 작업** (Turborepo, pnpm/yarn workspaces, Lerna) | 하나의 실행에서 backend + frontend 도메인이 별도 prompt로 분석; `apps/*/`와 `packages/*/`가 자동으로 walk됨; 스택별 rules는 `70.domains/{type}/` 아래 emit. |
| **OSS 기여 또는 실험** | 출력은 gitignore-friendly — `claudeos-core/`는 로컬 작업 dir, `CLAUDE.md` + `.claude/`만 ship 필요. 중단 시 resume-safe; 재실행 idempotent (수동 rule 편집은 `--force` 없으면 보존됨). |

**적합하지 않은 경우:** scan 단계 없이 day-one에 작동하는 one-size-fits-all preset bundle을 원하면 (어떤 게 어디 맞는지는 [docs/ko/comparison.md](docs/ko/comparison.md) 참고), 프로젝트가 [지원 stack](#supported-stacks) 중 하나에 아직 맞지 않는 경우, 또는 단일 `CLAUDE.md`만 필요한 경우 (빌트인 `claude /init`로 충분 — 다른 도구 설치할 필요 없음).

---

## 어떻게 동작하나요?

ClaudeOS-Core는 일반적인 Claude Code 워크플로를 뒤집습니다:

```
일반:    사람이 프로젝트 설명 → Claude가 stack 추측 → Claude가 docs 작성
이 도구: 코드가 stack을 읽음 → 코드가 확정된 사실을 Claude에게 전달 → Claude가 사실로부터 docs 작성
```

파이프라인은 **3 단계**로 실행되며, LLM 호출의 양쪽에 코드가 있습니다:

**1. Step A — Scanner (deterministic, LLM 없음).** Node.js scanner가 프로젝트 루트를 walk하며 `package.json` / `build.gradle` / `pom.xml` / `pyproject.toml`을 읽고, `.env*` 파일을 파싱하고 (`PASSWORD/SECRET/TOKEN/JWT_SECRET/...` 같은 sensitive variable은 redaction), architecture pattern을 분류 (Java 5 패턴 A/B/C/D/E, Kotlin CQRS / multi-module, Next.js App vs Pages Router, FSD, components-pattern), 도메인을 발견하고, 존재하는 모든 소스 파일 경로의 명시적 allowlist를 만듭니다. 출력: `project-analysis.json` — 이후 모든 단계의 단일 source of truth.

**2. Step B — 4-Pass Claude 파이프라인 (Step A의 사실에 의해 제약).**
- **Pass 1**은 도메인 그룹별 대표 파일을 읽고 도메인당 ~50–100개 컨벤션 추출 — response wrapper, logging library, error handling, naming convention, test pattern. 도메인 그룹당 한 번 실행 (`max 4 domains, 40 files per group`)이라 context가 절대 overflow 안 됨.
- **Pass 2**는 모든 도메인별 분석을 프로젝트 전체 그림으로 병합하고, 도메인이 disagree할 때 dominant 컨벤션을 선택.
- **Pass 3**은 `CLAUDE.md` + `.claude/rules/` + `claudeos-core/standard/` + skills + guides를 작성 — stage로 split (`3a` facts → `3b-core/3b-N` rules+standards → `3c-core/3c-N` skills+guides → `3d-aux` database+mcp-guide)이라 `pass2-merged.json`이 클 때도 각 stage prompt가 LLM context window에 fit. ≥16 도메인 프로젝트는 3b/3c를 ≤15 도메인 batch로 sub-divide.
- **Pass 4**는 L4 memory layer (`decision-log.md`, `failure-patterns.md`, `compaction.md`, `auto-rule-update.md`)를 시드하고 universal scaffold rules를 추가. Pass 4는 **`CLAUDE.md` 수정 금지** — Pass 3의 Section 8이 authoritative.

**3. Step C — Verification (deterministic, LLM 없음).** 5개 validator가 출력을 검증:
- `claude-md-validator` — `CLAUDE.md`에 25개 구조 검사 (8 sections, H3/H4 count, memory file uniqueness, T1 canonical heading invariant). Language-invariant: `--lang`과 무관하게 같은 verdict.
- `content-validator` — 10개 content 검사, path-claim 검증 (`STALE_PATH`가 fabricated `src/...` 참조 잡아냄)과 MANIFEST drift 감지 포함.
- `pass-json-validator` — Pass 1/2/3/4 JSON well-formedness + stack-aware section count.
- `plan-validator` — plan ↔ disk 일관성 (legacy, v2.1.0부터 대부분 no-op).
- `sync-checker` — 7개 추적 디렉토리에 걸쳐 disk ↔ `sync-map.json` 등록 일관성.

3-tier severity (`fail` / `warn` / `advisory`)라 사용자가 수동으로 고칠 수 있는 LLM hallucination에 대해 warning이 CI를 deadlock하지 않습니다.

전체를 묶는 invariant: **Claude는 코드에 실제로 존재하는 경로만 인용 가능** — Step A가 finite allowlist를 건네기 때문. LLM이 그래도 만들어 내려 하면 (드물지만 특정 seed에서 발생) Step C가 docs ship 전에 잡아냅니다.

per-pass 상세, marker 기반 resume, Claude Code의 `.claude/` sensitive-path block을 위한 staged-rules 우회, stack 감지 internals는 [docs/ko/architecture.md](docs/ko/architecture.md) 참고.

---

## Supported Stacks

12개 stack, 프로젝트 파일에서 자동 감지:

**Backend:** Java/Spring Boot · Kotlin/Spring Boot · Node/Express · Node/Fastify · Node/NestJS · Python/Django · Python/FastAPI · Python/Flask

**Frontend:** Node/Next.js · Node/Vite · Angular · Vue/Nuxt

멀티스택 프로젝트 (예: Spring Boot 백엔드 + Next.js 프론트엔드)도 그대로 작동합니다.

감지 규칙과 스캐너별 추출 내용은 [docs/ko/stacks.md](docs/ko/stacks.md) 참고.

---

## 일상 워크플로

세 가지 명령으로 사용량의 ~95%를 커버합니다:

```bash
# 프로젝트 첫 실행
npx claudeos-core init

# 수동으로 standards나 rules를 편집한 뒤
npx claudeos-core lint

# 헬스 체크 (커밋 전 또는 CI에서 실행)
npx claudeos-core health
```

각 명령의 전체 옵션은 [docs/ko/commands.md](docs/ko/commands.md) 참고. memory layer 명령 (`memory compact`, `memory propose-rules`)은 아래 [Memory Layer](#memory-layer-선택-장기-프로젝트용) 섹션에서 다룹니다.

---

## 무엇이 다른가

대부분의 Claude Code 문서 도구는 설명에서 출발합니다 (사람이 도구에 알려주고, 도구가 Claude에게 알려줌). ClaudeOS-Core는 실제 소스 코드에서 출발합니다 (도구가 읽고, 확정된 사실을 Claude에게 알려주고, Claude는 확정된 것만 작성).

세 가지 구체적 결과:

1. **Deterministic stack detection.** 같은 프로젝트 + 같은 코드 = 같은 출력. "이번엔 Claude가 다르게 굴렸네"가 없음.
2. **No invented paths.** Pass 3 prompt가 허용된 모든 소스 경로를 명시적으로 나열 — Claude는 존재하지 않는 경로를 인용할 수 없음.
3. **Multi-stack aware.** 같은 실행 안에서 백엔드와 프론트엔드 도메인이 서로 다른 분석 prompt를 사용.

다른 도구와의 scope 비교는 [docs/ko/comparison.md](docs/ko/comparison.md) 참고. 비교는 **각 도구가 무엇을 하는가**에 관한 것이며, **어느 것이 더 나은가**가 아닙니다 — 대부분 상호 보완적입니다.

---

## 검증 (post-generation)

Claude가 docs를 작성한 뒤 코드가 검증합니다. 5개의 독립 validator:

| Validator | 검사 내용 | 실행 주체 |
|---|---|---|
| `claude-md-validator` | CLAUDE.md 구조 불변량 (8 sections, language-invariant) | `claudeos-core lint` |
| `content-validator` | path claim의 실제 존재; manifest 일관성 | `health` (advisory) |
| `pass-json-validator` | Pass 1 / 2 / 3 / 4 출력이 well-formed JSON인지 | `health` (warn) |
| `plan-validator` | 저장된 plan이 디스크와 일치하는지 | `health` (fail-on-error) |
| `sync-checker` | `sync-map.json` 등록 항목이 디스크 파일과 일치하는지 (orphaned/unregistered 감지) | `health` (fail-on-error) |

`health-checker`가 4개의 런타임 validator를 3-tier severity (fail / warn / advisory)로 오케스트레이션하며 CI에 적합한 exit code로 종료합니다. `claude-md-validator`는 `lint` 명령으로 별도 실행됩니다 — 구조적 drift는 soft warning이 아니라 re-init 신호이기 때문입니다. 언제든 실행 가능:

```bash
npx claudeos-core health
```

각 validator의 검사 항목은 [docs/ko/verification.md](docs/ko/verification.md) 참고.

---

## Memory Layer (선택, 장기 프로젝트용)

위의 scaffolding 파이프라인을 넘어서, ClaudeOS-Core는 context가 단일 세션을 넘어 살아남는 프로젝트를 위해 `claudeos-core/memory/` 폴더를 시드합니다. 선택 사항입니다 — `CLAUDE.md` + rules만 원하면 무시 가능.

4개 파일, 모두 Pass 4가 작성:

- `decision-log.md` — append-only 형식의 "왜 X 대신 Y를 선택했는지", `pass2-merged.json`에서 시딩
- `failure-patterns.md` — frequency/importance 점수가 붙은 반복 오류
- `compaction.md` — 시간이 흐르며 memory가 자동 컴팩션되는 방식
- `auto-rule-update.md` — 새 rules로 승격되어야 할 패턴

이 layer를 시간에 따라 유지하는 두 가지 명령:

```bash
# failure-patterns 로그 컴팩션 (주기적으로 실행)
npx claudeos-core memory compact

# 자주 발생하는 failure pattern을 제안 rule로 승격
npx claudeos-core memory propose-rules
```

memory 모델과 라이프사이클은 [docs/ko/memory-layer.md](docs/ko/memory-layer.md) 참고.

---

## FAQ

**Q: Claude API 키가 필요한가요?**
A: 아니오. ClaudeOS-Core는 기존 Claude Code 설치를 사용합니다 — 로컬 머신의 `claude -p`로 prompt를 파이프합니다. 추가 계정이 필요 없습니다.

**Q: 기존 CLAUDE.md나 `.claude/rules/`를 덮어쓰나요?**
A: 새 프로젝트에서 첫 실행: 새로 생성합니다. `--force` 없이 재실행: 편집 내용 보존 — 이전 실행의 pass marker가 감지되어 해당 pass가 스킵됩니다. `--force`로 재실행: 모든 것을 wipe하고 재생성 (편집 내용 손실 — 그게 `--force`의 의미입니다). [docs/ko/safety.md](docs/ko/safety.md) 참고.

**Q: 제 stack이 지원되지 않습니다. 추가할 수 있나요?**
A: 네. 새 stack은 ~3개 prompt 템플릿 + domain scanner가 필요합니다. 8단계 가이드는 [CONTRIBUTING.md](CONTRIBUTING.md) 참고.

**Q: 한국어로 (또는 다른 언어로) docs를 생성하려면?**
A: `npx claudeos-core init --lang ko`. 10개 언어 지원: en, ko, ja, zh-CN, es, vi, hi, ru, fr, de.

**Q: monorepo와 함께 작동하나요?**
A: 네 — Turborepo (`turbo.json`), pnpm workspaces (`pnpm-workspace.yaml`), Lerna (`lerna.json`), npm/yarn workspaces (`package.json#workspaces`)를 stack-detector가 감지합니다. 각 app이 자체 분석을 받습니다. 다른 monorepo 레이아웃 (예: NX)은 명시적으로는 감지하지 않지만, 일반 `apps/*/`와 `packages/*/` 패턴은 스택별 scanner가 그대로 인식합니다.

**Q: Claude Code가 동의하기 어려운 rules를 생성하면?**
A: 직접 편집하세요. 그 다음 `npx claudeos-core lint`로 CLAUDE.md 구조가 여전히 유효한지 확인합니다. 이후 `init` 실행에서 (`--force` 없이) 편집 내용이 보존됩니다 — resume 메커니즘이 marker가 있는 pass를 스킵합니다.

**Q: 버그는 어디에 신고하나요?**
A: [GitHub Issues](https://github.com/claudeos-core/claudeos-core/issues). 보안 이슈는 [SECURITY.md](SECURITY.md) 참고.

---

## 시간을 절약했다면

GitHub의 ⭐가 프로젝트의 가시성을 유지해 주고 다른 사람이 찾는 데 도움이 됩니다. issue, PR, stack template 기여 모두 환영 — [CONTRIBUTING.md](CONTRIBUTING.md) 참고.

---

## Documentation

| 주제 | 읽어보기 |
|---|---|
| 4-pass 파이프라인 동작 방식 (다이어그램보다 깊게) | [docs/ko/architecture.md](docs/ko/architecture.md) |
| 아키텍처의 시각 다이어그램 (Mermaid) | [docs/ko/diagrams.md](docs/ko/diagrams.md) |
| Stack 감지 — 각 scanner가 보는 것 | [docs/ko/stacks.md](docs/ko/stacks.md) |
| Memory layer — decision log와 failure pattern | [docs/ko/memory-layer.md](docs/ko/memory-layer.md) |
| 5개 validator 상세 | [docs/ko/verification.md](docs/ko/verification.md) |
| 모든 CLI 명령과 옵션 | [docs/ko/commands.md](docs/ko/commands.md) |
| 수동 설치 (`npx` 없이) | [docs/ko/manual-installation.md](docs/ko/manual-installation.md) |
| Scanner override — `.claudeos-scan.json` | [docs/ko/advanced-config.md](docs/ko/advanced-config.md) |
| 안전성: re-init 시 보존되는 것 | [docs/ko/safety.md](docs/ko/safety.md) |
| 비슷한 도구와의 비교 (scope, 품질 아님) | [docs/ko/comparison.md](docs/ko/comparison.md) |
| 에러와 복구 | [docs/ko/troubleshooting.md](docs/ko/troubleshooting.md) |

---

## 기여

기여를 환영합니다 — stack 지원 추가, prompt 개선, 버그 수정. [CONTRIBUTING.md](CONTRIBUTING.md) 참고.

행동 강령과 보안 정책은 [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)와 [SECURITY.md](SECURITY.md) 참고.

## License

[ISC License](LICENSE). 상업용 포함, 모든 용도로 자유롭게 사용 가능. © 2025–2026 ClaudeOS-Core contributors.

---

<sub>[claudeos-core](https://github.com/claudeos-core) 팀이 유지보수합니다. issue와 PR은 <https://github.com/claudeos-core/claudeos-core>에서.</sub>
