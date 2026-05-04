# ClaudeOS-Core

[![npm version](https://img.shields.io/npm/v/claudeos-core.svg?logo=npm&label=npm)](https://www.npmjs.com/package/claudeos-core)
[![CI](https://img.shields.io/github/actions/workflow/status/claudeos-core/claudeos-core/test.yml?branch=master&logo=github&label=CI)](https://github.com/claudeos-core/claudeos-core/actions/workflows/test.yml)
[![tests](https://img.shields.io/badge/tests-736%20passing-brightgreen?logo=node.js&logoColor=white)](https://github.com/claudeos-core/claudeos-core/actions/workflows/test.yml)
[![node](https://img.shields.io/node/v/claudeos-core.svg?logo=node.js&logoColor=white&label=node)](https://nodejs.org/)
[![license](https://img.shields.io/npm/l/claudeos-core.svg?color=blue)](LICENSE)
[![downloads](https://img.shields.io/npm/dm/claudeos-core.svg?logo=npm&color=blue&label=downloads)](https://www.npmjs.com/package/claudeos-core)

**프로젝트 소스 코드를 직접 분석해서 `CLAUDE.md`와 `.claude/rules/`를 자동으로 만들어 주는 CLI 도구입니다. Node.js scanner, 4-pass Claude 파이프라인, 5개 validator가 함께 돌아가며 12개 스택과 10개 언어를 지원합니다. 코드에 존재하지 않는 경로는 만들어 내지 않습니다.**

```bash
npx claudeos-core init
```

[**12개 스택**](#supported-stacks)에서 바로 쓸 수 있고 모노레포도 지원합니다. 명령어 한 줄이면 끝나고, 별도 설정이 없으며, 중간에 멈춰도 이어서 실행되고, 여러 번 돌려도 안전합니다.

[🇺🇸 English](README.md) · [🇨🇳 中文](README.zh-CN.md) · [🇯🇵 日本語](README.ja.md) · [🇪🇸 Español](README.es.md) · [🇻🇳 Tiếng Việt](README.vi.md) · [🇮🇳 हिन्दी](README.hi.md) · [🇷🇺 Русский](README.ru.md) · [🇫🇷 Français](README.fr.md) · [🇩🇪 Deutsch](README.de.md)

---

## 이 도구가 뭔가요?

Claude Code는 새 세션을 시작할 때마다 일반적인 프레임워크 기본값으로 돌아갑니다. 팀은 **MyBatis**를 쓰는데 Claude는 JPA 코드를 만들어 내고, 응답 wrapper가 `ApiResponse.ok()`인데도 `ResponseEntity.success()`로 작성합니다. 패키지는 layer-first로 짜 놨는데 domain-first 구조로 만들어 내기도 합니다. 프로젝트마다 `.claude/rules/`를 미리 작성해 두면 해결되지만, 코드가 바뀌면서 룰도 어긋나기 시작합니다.

**ClaudeOS-Core는 실제 소스 코드를 분석해서 일관된 결과로 다시 만들어 줍니다.** 먼저 Node.js scanner가 프로젝트를 읽고 스택, ORM, 패키지 구조, 파일 경로를 파악합니다. 그 다음 4-pass Claude 파이프라인이 전체 문서 세트를 작성합니다. `CLAUDE.md`, 자동 로드되는 `.claude/rules/`, standards, skills 모두 명시적인 경로 allowlist 안에서만 만들어지고, LLM은 이 범위 밖으로 나갈 수 없습니다. 마지막으로 5개 validator가 결과를 내보내기 전에 한 번 더 검증합니다.

덕분에 같은 입력에는 항상 같은 출력이 나옵니다. 10개 언어 중 무엇을 골라도 결과는 byte 단위로 동일하고, 코드에 존재하지 않는 경로는 절대 등장하지 않습니다. (자세한 내용은 아래 [무엇이 다른가](#무엇이-다른가) 참고.)

오래 운영되는 프로젝트라면 [Memory Layer](#memory-layer-선택-장기-프로젝트용)도 함께 만들어집니다.

---

## 실제 프로젝트에서 보기

[`spring-boot-realworld-example-app`](https://github.com/gothinkster/spring-boot-realworld-example-app)에서 실행해 보았습니다. Java 11 · Spring Boot 2.6 · MyBatis · SQLite · 187개 source file. 결과는 **75개 파일 생성**, 총 **53분**, 모든 validator ✅.

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
<summary><strong>실제 <code>CLAUDE.md</code>에 들어가는 내용 (실제 발췌 — Section 1 + 2)</strong></summary>

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

위 표의 모든 값(정확한 dependency 좌표, `dev.db` 파일명, `V1__create_tables.sql` 마이그레이션명, "no JPA"까지)은 Claude가 파일을 만들기 전에 scanner가 `build.gradle`, `application.properties`, 소스 트리에서 직접 읽어 온 사실입니다. 추측한 값이 하나도 없습니다.

</details>

<details>
<summary><strong>실제 자동 로드되는 룰 (<code>.claude/rules/10.backend/01.controller-rules.md</code>)</strong></summary>

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

`paths: ["**/*"]` glob은 프로젝트 안의 어떤 파일을 편집하더라도 Claude Code가 이 룰을 자동으로 로드한다는 뜻입니다. 룰에 들어 있는 클래스 이름, 패키지 경로, exception handler는 모두 스캔된 소스에서 그대로 가져왔기 때문에, 프로젝트의 실제 `CustomizeExceptionHandler`와 `JacksonCustomizations`까지 그대로 반영되어 있습니다.

</details>

<details>
<summary><strong>자동 생성된 <code>decision-log.md</code> 시드 (실제 발췌)</strong></summary>

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

Pass 4는 `pass2-merged.json`에서 뽑은 아키텍처 결정 사항을 `decision-log.md`에 미리 채워 둡니다. 그래야 다음 세션에서 코드베이스가 _이렇게 생긴 이유_까지 같이 기억할 수 있습니다. 검토된 옵션("JPA/Hibernate", "MyBatis-Plus")과 그에 따른 귀결은 모두 실제 `build.gradle` dependency 블록에서 가져온 내용입니다.

</details>

---

## 테스트된 프로젝트

ClaudeOS-Core는 실제 OSS 프로젝트에서 측정한 reference 벤치마크 결과를 함께 제공합니다. 공개 repo에서 직접 돌려 보셨다면 [issue로 알려 주세요](https://github.com/claudeos-core/claudeos-core/issues). 표에 추가하겠습니다.

| 프로젝트 | 스택 | Scanned → Generated | 상태 |
|---|---|---|---|
| [`spring-boot-realworld-example-app`](https://github.com/gothinkster/spring-boot-realworld-example-app) | Java 11 · Spring Boot 2.6 · MyBatis · SQLite | 187 → 75 files | ✅ 5개 validator 모두 통과 |

---

## Quick Start

**전제 조건:** Node.js 18+, [Claude Code](https://docs.anthropic.com/en/docs/claude-code) 설치 및 인증 완료.

```bash
# 1. 프로젝트 루트로 이동
cd my-spring-boot-project

# 2. init 실행 (코드를 분석한 다음 Claude에게 룰 작성을 시킵니다)
npx claudeos-core init

# 3. 끝. Claude Code를 열고 작업을 시작하면 룰이 이미 로드되어 있습니다.
```

`init`이 끝나면 다음과 같은 파일들이 만들어집니다:

```
your-project/
├── .claude/
│   └── rules/                    ← Claude Code가 자동으로 로드
│       ├── 00.core/              (공통 룰 — 네이밍, 아키텍처)
│       ├── 10.backend/           (백엔드 스택 룰, 해당 시)
│       ├── 20.frontend/          (프론트엔드 스택 룰, 해당 시)
│       ├── 30.security-db/       (보안 & DB 컨벤션)
│       ├── 40.infra/             (env, 로깅, CI/CD)
│       ├── 50.sync/              (문서 동기화 알림 — rules 전용)
│       ├── 60.memory/            (메모리 룰 — Pass 4, rules 전용)
│       ├── 70.domains/{type}/    (도메인별 룰, type = backend|frontend)
│       └── 80.verification/      (테스트 전략 + 빌드 검증 알림)
├── claudeos-core/
│   ├── standard/                 ← 참고 문서 (카테고리 구조 미러링)
│   │   ├── 00.core/              (프로젝트 개요, 아키텍처, 네이밍)
│   │   ├── 10.backend/           (백엔드 reference — 백엔드 스택일 때)
│   │   ├── 20.frontend/          (프론트엔드 reference — 프론트엔드 스택일 때)
│   │   ├── 30.security-db/       (보안 & DB reference)
│   │   ├── 40.infra/             (env / 로깅 / CI-CD reference)
│   │   ├── 70.domains/{type}/    (도메인별 reference)
│   │   ├── 80.verification/      (빌드 / 시작 / 테스트 reference — standard 전용)
│   │   └── 90.optional/          (스택별 추가 자료 — standard 전용)
│   ├── skills/                   (Claude가 적용할 수 있는 재사용 패턴)
│   ├── guide/                    (자주 쓰는 작업의 how-to 가이드)
│   ├── database/                 (스키마 개요, 마이그레이션 가이드)
│   ├── mcp-guide/                (MCP 통합 노트)
│   └── memory/                   (decision log, failure patterns, compaction)
└── CLAUDE.md                     (Claude가 가장 먼저 읽는 인덱스)
```

같은 번호 prefix를 쓰는 카테고리는 `rules/`와 `standard/` 양쪽에서 같은 개념 영역을 가리킵니다 (예: `10.backend` 룰 ↔ `10.backend` standard). rules에만 있는 카테고리는 `50.sync` (문서 동기화 알림)와 `60.memory` (Pass 4 메모리)이고, standard에만 있는 카테고리는 `90.optional` (강제력 없는 스택별 추가 자료)입니다. 그 외 prefix (`00`, `10`, `20`, `30`, `40`, `70`, `80`)는 양쪽에 모두 들어 있습니다. 이제 Claude Code가 프로젝트를 압니다.

---

## 누구를 위한 도구인가?

| 사용자 | 해결되는 문제 |
|---|---|
| **Claude Code로 새 프로젝트를 시작하는 1인 개발자** | 매 세션마다 Claude에게 컨벤션을 다시 가르쳐야 하는 부담이 사라집니다. `CLAUDE.md`와 8개 카테고리의 `.claude/rules/`를 한 번에 만들어 줍니다. |
| **여러 repo의 공유 표준을 유지하는 팀 리드** | 패키지 이름이 바뀌거나 ORM이 교체되거나 response wrapper가 변경될 때마다 `.claude/rules/`가 따라가지 못해 어긋나는 문제. ClaudeOS-Core가 일관된 방식으로 다시 동기화합니다. 같은 입력에는 byte 단위로 동일한 출력이 나오기 때문에 diff 노이즈가 없습니다. |
| **Claude Code를 이미 쓰지만 생성된 코드를 수정하는 데 지친 사용자** | 잘못된 response wrapper, 잘못된 패키지 구조, MyBatis 프로젝트인데 JPA 코드, 중앙 middleware가 있는데도 `try/catch`가 흩뿌려진 출력. scanner가 실제 컨벤션을 추출하고, 모든 Claude pass는 명시적인 경로 allowlist 안에서만 동작합니다. |
| **새 repo에 합류한 경우** (기존 프로젝트, 팀 합류) | repo에서 `init`만 돌리면 살아 있는 아키텍처 지도가 생깁니다. CLAUDE.md의 스택 표, 레이어별 룰과 ✅/❌ 예제, 주요 결정의 "왜"가 미리 채워진 decision log (JPA vs MyBatis, REST vs GraphQL 등). 파일 5개 훑는 쪽이 소스 파일 5,000개를 읽는 것보다 훨씬 빠릅니다. |
| **한국어, 일본어, 중국어 등 영어 외의 언어로 작업** | 대부분의 Claude Code 룰 생성기는 영어만 지원합니다. ClaudeOS-Core는 **10개 언어** (`en/ko/ja/zh-CN/es/vi/hi/ru/fr/de`)로 전체 세트를 만들고, 출력 언어와 무관하게 동일한 구조 검증을 적용합니다. `claude-md-validator`의 판정은 어느 언어든 똑같습니다. |
| **모노레포에서 작업** (Turborepo, pnpm/yarn workspaces, Lerna) | 한 번의 실행에서 백엔드와 프론트엔드 도메인을 각각 별도 prompt로 분석합니다. `apps/*/`와 `packages/*/`도 자동으로 순회하고, 스택별 룰은 `70.domains/{type}/` 아래에 만들어집니다. |
| **OSS 기여나 실험 용도** | 출력은 gitignore-friendly입니다. `claudeos-core/`는 로컬 작업 디렉토리이고, 실제로 ship해야 하는 건 `CLAUDE.md`와 `.claude/`뿐입니다. 중단되어도 이어서 실행할 수 있고, 다시 실행해도 안전합니다 (수동으로 편집한 룰은 `--force` 없이는 그대로 보존됩니다). |

**적합하지 않은 경우:** 스캔 단계 없이 첫날부터 그대로 쓸 수 있는 만능 preset 묶음을 원하는 경우 (어떤 도구가 어디에 어울리는지는 [docs/ko/comparison.md](docs/ko/comparison.md) 참고), 프로젝트가 [지원 스택](#supported-stacks) 중 어디에도 아직 맞지 않는 경우, 또는 `CLAUDE.md` 한 파일만 있으면 되는 경우. 마지막 경우는 빌트인 `claude /init`만으로 충분합니다. 굳이 별도 도구를 설치할 필요가 없습니다.

---

## 어떻게 동작하나요?

ClaudeOS-Core는 일반적인 Claude Code 워크플로를 거꾸로 뒤집습니다:

```
일반:    사용자가 프로젝트 설명 → Claude가 스택 추측 → Claude가 문서 작성
이 도구: 코드가 스택을 분석   → 확정된 사실을 Claude에게 전달 → Claude가 그 사실만으로 문서 작성
```

파이프라인은 **3단계**로 동작합니다. LLM 호출 앞뒤 모두에 코드가 자리잡고 있습니다:

**1. Step A — Scanner (일관된 동작, LLM 없음).** Node.js scanner가 프로젝트 루트를 순회하면서 `package.json`, `build.gradle`, `pom.xml`, `pyproject.toml`을 읽고, `.env*` 파일을 파싱합니다 (`PASSWORD/SECRET/TOKEN/JWT_SECRET/...` 같은 민감 변수는 자동으로 가립니다). 그런 다음 아키텍처 패턴을 분류하고 (Java 5개 패턴 A/B/C/D/E, Kotlin CQRS / 멀티모듈, Next.js App vs Pages Router, FSD, components 패턴), 도메인을 찾고, 존재하는 모든 소스 파일 경로의 명시적 allowlist를 만듭니다. 결과는 `project-analysis.json` 한 파일에 모이고, 이후 모든 단계는 이걸 단일 source of truth로 삼습니다.

**2. Step B — 4-Pass Claude 파이프라인 (Step A의 사실을 기반으로 동작).**
- **Pass 1**은 도메인 그룹별로 대표 파일을 읽고 도메인당 50–100개 정도의 컨벤션을 뽑아냅니다 (response wrapper, 로깅 라이브러리, 에러 처리, 네이밍 규칙, 테스트 패턴 등). 도메인 그룹마다 한 번씩 실행하기 때문에 (`max 4 domains, 40 files per group`) context가 절대 넘치지 않습니다.
- **Pass 2**는 도메인별 분석 결과를 프로젝트 전체 그림으로 합칩니다. 도메인 사이에 충돌이 있으면 가장 많이 쓰이는 컨벤션을 선택합니다.
- **Pass 3**은 `CLAUDE.md`, `.claude/rules/`, `claudeos-core/standard/`, skills, guides를 작성합니다. 단계로 나눠서 (`3a` facts → `3b-core/3b-N` rules+standards → `3c-core/3c-N` skills+guides → `3d-aux` database+mcp-guide) 처리하기 때문에, `pass2-merged.json`이 큰 경우에도 각 단계의 prompt가 LLM context window 안에 들어갑니다. 도메인이 16개 이상이면 3b/3c를 다시 15개 이하의 batch로 나눕니다.
- **Pass 4**는 L4 메모리 레이어 (`decision-log.md`, `failure-patterns.md`, `compaction.md`, `auto-rule-update.md`)를 시드하고 universal scaffold rules를 추가합니다. Pass 4는 **`CLAUDE.md`를 절대 건드리지 않습니다**. Pass 3의 Section 8이 단일 권한입니다.

**3. Step C — Verification (일관된 동작, LLM 없음).** 5개 validator가 결과를 검증합니다:
- `claude-md-validator` — `CLAUDE.md`에 25개의 구조 검사 (8개 section, H3/H4 개수, 메모리 파일 유일성, T1 canonical heading 불변량). language-invariant라서 `--lang`이 무엇이든 같은 판정이 나옵니다.
- `content-validator` — 10개의 콘텐츠 검사. 경로 인용 검증 (`STALE_PATH`가 가짜 `src/...` 참조를 잡아냄)과 MANIFEST drift 감지가 들어 있습니다.
- `pass-json-validator` — Pass 1/2/3/4의 JSON well-formedness와 stack-aware section 개수.
- `plan-validator` — plan ↔ disk 일관성 (legacy. v2.1.0부터는 대부분 no-op).
- `sync-checker` — 추적 대상 7개 디렉토리에서 disk ↔ `sync-map.json` 등록 일관성.

3단계 severity (`fail` / `warn` / `advisory`)로 나뉘어 있어서, 사용자가 직접 고칠 수 있는 LLM hallucination 때문에 warning이 CI를 막아 세우지 않습니다.

이 모든 것을 묶는 핵심 원칙은 **Claude는 코드에 실제로 존재하는 경로만 인용할 수 있다**는 점입니다. Step A가 유한한 allowlist를 건네 주기 때문이죠. 그래도 LLM이 뭔가를 지어내려고 시도하면(드물지만 특정 seed에서 일어납니다) Step C가 내보내기 전에 잡아냅니다.

각 pass의 상세, marker 기반 resume, Claude Code의 `.claude/` 민감 경로 차단을 우회하는 staged-rules 동작, 스택 감지 내부 로직은 [docs/ko/architecture.md](docs/ko/architecture.md) 참고.

---

## Supported Stacks

12개 스택을 프로젝트 파일에서 자동으로 감지합니다:

**Backend:** Java/Spring Boot · Kotlin/Spring Boot · Node/Express · Node/Fastify · Node/NestJS · Python/Django · Python/FastAPI · Python/Flask

**Frontend:** Node/Next.js · Node/Vite · Angular · Vue/Nuxt

멀티 스택 프로젝트 (예: Spring Boot 백엔드 + Next.js 프론트엔드)도 그대로 동작합니다.

감지 규칙과 각 scanner가 추출하는 내용은 [docs/ko/stacks.md](docs/ko/stacks.md) 참고.

---

## 일상 워크플로

이 세 가지 명령어로 거의 모든 상황을 처리할 수 있습니다:

```bash
# 프로젝트에서 처음 실행할 때
npx claudeos-core init

# standards나 룰을 직접 편집한 뒤
npx claudeos-core lint

# 헬스 체크 (커밋 전 또는 CI에서 실행)
npx claudeos-core health
```

각 명령어의 전체 옵션은 [docs/ko/commands.md](docs/ko/commands.md) 참고. 메모리 레이어 명령어 (`memory compact`, `memory propose-rules`)는 아래 [Memory Layer](#memory-layer-선택-장기-프로젝트용) 섹션에서 다룹니다.

---

## 무엇이 다른가

대부분의 Claude Code 문서 도구는 사용자의 설명에서 출발합니다. 사용자가 도구에게 알려 주면, 도구가 그 내용을 다시 Claude에게 넘기는 방식입니다. ClaudeOS-Core는 실제 소스 코드에서 출발합니다. 도구가 직접 코드를 읽고 확정된 사실을 Claude에게 넘기면, Claude는 그 사실만으로 문서를 작성합니다.

그 결과는 구체적으로 세 가지 차이로 이어집니다:

1. **결정론적 스택 감지.** 같은 프로젝트 + 같은 코드 = 같은 출력. "이번엔 Claude가 다르게 나왔네"가 없습니다.
2. **존재하지 않는 경로를 만들지 않음.** Pass 3 prompt에 허용된 모든 소스 경로가 명시적으로 들어가기 때문에, Claude는 없는 경로를 인용할 수 없습니다.
3. **멀티 스택 인지.** 같은 실행 안에서 백엔드와 프론트엔드 도메인이 서로 다른 분석 prompt를 사용합니다.

다른 도구와의 scope 비교는 [docs/ko/comparison.md](docs/ko/comparison.md) 참고. 이 비교는 **각 도구가 무엇을 하는가**에 관한 내용이지 **무엇이 더 좋다**는 평가가 아닙니다. 대부분 상호 보완적인 관계입니다.

---

## 검증 (post-generation)

Claude가 문서를 작성하고 나면, 이번에는 코드가 그 결과를 검증합니다. 5개의 독립된 validator:

| Validator | 검사 내용 | 실행 주체 |
|---|---|---|
| `claude-md-validator` | CLAUDE.md 구조 불변량 (8 sections, language-invariant) | `claudeos-core lint` |
| `content-validator` | path claim의 실제 존재; manifest 일관성 | `health` (advisory) |
| `pass-json-validator` | Pass 1 / 2 / 3 / 4 출력이 well-formed JSON인지 | `health` (warn) |
| `plan-validator` | 저장된 plan이 디스크와 일치하는지 | `health` (fail-on-error) |
| `sync-checker` | `sync-map.json` 등록 항목이 디스크 파일과 일치하는지 (orphaned/unregistered 감지) | `health` (fail-on-error) |

`health-checker`가 4개의 런타임 validator를 3단계 severity (fail / warn / advisory)로 묶어서 실행하고, CI에 적합한 종료 코드로 마무리합니다. `claude-md-validator`는 `lint` 명령어로 따로 실행하는데, 구조적인 어긋남은 단순한 경고가 아니라 re-init이 필요하다는 신호이기 때문입니다. 언제든 돌릴 수 있습니다:

```bash
npx claudeos-core health
```

각 validator의 검사 항목은 [docs/ko/verification.md](docs/ko/verification.md) 참고.

---

## Memory Layer (선택, 장기 프로젝트용)

위 scaffolding 파이프라인 외에, ClaudeOS-Core는 단일 세션을 넘어서까지 context를 이어 가야 하는 프로젝트를 위해 `claudeos-core/memory/` 폴더도 함께 만들어 둡니다. 선택 사항이라서 `CLAUDE.md`와 룰만 있으면 충분하다면 그냥 무시해도 됩니다.

파일은 4개, 모두 Pass 4가 작성합니다:

- `decision-log.md` — append-only 형식의 "X 대신 Y를 선택한 이유" 기록. `pass2-merged.json`에서 시드.
- `failure-patterns.md` — frequency / importance 점수가 매겨진 반복 오류 모음.
- `compaction.md` — 시간이 흐르면서 메모리가 자동으로 압축되는 방식.
- `auto-rule-update.md` — 새 룰로 승격되어야 할 패턴.

이 레이어를 시간이 흘러도 유지하기 위한 두 가지 명령어:

```bash
# failure-patterns 로그 압축 (주기적으로 실행)
npx claudeos-core memory compact

# 자주 발생하는 failure pattern을 제안 룰로 승격
npx claudeos-core memory propose-rules
```

메모리 모델과 라이프사이클은 [docs/ko/memory-layer.md](docs/ko/memory-layer.md) 참고.

---

## FAQ

**Q: Claude API 키가 필요한가요?**
A: 필요 없습니다. ClaudeOS-Core는 이미 설치되어 있는 Claude Code를 그대로 활용합니다. 로컬에서 동작하는 `claude -p`로 prompt를 보내는 방식이라 별도 계정이 필요하지 않습니다.

**Q: 기존 CLAUDE.md나 `.claude/rules/`를 덮어쓰나요?**
A: 새 프로젝트에서 처음 실행하면 새로 만듭니다. `--force` 없이 다시 실행하면 편집한 내용이 그대로 남는데, 이전 실행의 pass marker를 감지해서 해당 pass를 건너뛰기 때문입니다. `--force`를 붙여서 다시 실행하면 모두 지우고 새로 만듭니다 (편집 내용도 함께 사라집니다. 그게 `--force`의 의미입니다). 자세한 내용은 [docs/ko/safety.md](docs/ko/safety.md) 참고.

**Q: 제 스택이 지원되지 않습니다. 추가할 수 있나요?**
A: 가능합니다. 새 스택은 prompt 템플릿 약 3개와 도메인 scanner 하나만 있으면 됩니다. 8단계 가이드는 [CONTRIBUTING.md](CONTRIBUTING.md) 참고.

**Q: 한국어 (또는 다른 언어)로 문서를 만들려면?**
A: `npx claudeos-core init --lang ko`로 실행하면 됩니다. 10개 언어를 지원합니다: en, ko, ja, zh-CN, es, vi, hi, ru, fr, de.

**Q: 모노레포에서도 동작하나요?**
A: 네. Turborepo (`turbo.json`), pnpm workspaces (`pnpm-workspace.yaml`), Lerna (`lerna.json`), npm/yarn workspaces (`package.json#workspaces`)는 stack-detector가 알아서 잡아냅니다. 각 app은 따로따로 분석됩니다. 그 외 모노레포 레이아웃(예: NX)은 명시적으로 감지하지는 않지만, 일반적인 `apps/*/`와 `packages/*/` 패턴이라면 스택별 scanner가 그대로 인식합니다.

**Q: Claude Code가 동의하기 어려운 룰을 만들어 내면?**
A: 직접 편집하면 됩니다. 그런 다음 `npx claudeos-core lint`로 CLAUDE.md 구조가 여전히 유효한지 확인하세요. `--force` 없이 이후에 `init`을 다시 실행해도 편집한 내용은 그대로 남습니다. resume 메커니즘이 marker가 있는 pass는 건너뛰기 때문입니다.

**Q: 버그는 어디에 신고하나요?**
A: [GitHub Issues](https://github.com/claudeos-core/claudeos-core/issues). 보안 관련 이슈는 [SECURITY.md](SECURITY.md) 참고.

---

## 시간을 절약했다면

GitHub의 ⭐ 하나가 프로젝트의 가시성을 높이고 다른 사람이 발견하는 데에도 큰 도움이 됩니다. issue, PR, 스택 템플릿 기여 모두 환영합니다. 자세한 내용은 [CONTRIBUTING.md](CONTRIBUTING.md) 참고.

---

## Documentation

| 주제 | 읽어보기 |
|---|---|
| 4-pass 파이프라인의 동작 방식 (다이어그램보다 깊은 설명) | [docs/ko/architecture.md](docs/ko/architecture.md) |
| 아키텍처의 시각적 다이어그램 (Mermaid) | [docs/ko/diagrams.md](docs/ko/diagrams.md) |
| 스택 감지 — 각 scanner가 보는 것 | [docs/ko/stacks.md](docs/ko/stacks.md) |
| 메모리 레이어 — decision log와 failure pattern | [docs/ko/memory-layer.md](docs/ko/memory-layer.md) |
| 5개 validator 상세 | [docs/ko/verification.md](docs/ko/verification.md) |
| 모든 CLI 명령어와 옵션 | [docs/ko/commands.md](docs/ko/commands.md) |
| 수동 설치 (`npx` 없이) | [docs/ko/manual-installation.md](docs/ko/manual-installation.md) |
| Scanner override — `.claudeos-scan.json` | [docs/ko/advanced-config.md](docs/ko/advanced-config.md) |
| 안전성: 다시 실행할 때 보존되는 것 | [docs/ko/safety.md](docs/ko/safety.md) |
| 비슷한 도구와의 비교 (scope 기준, 품질 평가가 아님) | [docs/ko/comparison.md](docs/ko/comparison.md) |
| 에러와 복구 | [docs/ko/troubleshooting.md](docs/ko/troubleshooting.md) |

---

## 기여

기여 환영합니다. 스택 지원 추가, prompt 개선, 버그 수정 모두 좋습니다. 자세한 내용은 [CONTRIBUTING.md](CONTRIBUTING.md) 참고.

행동 강령과 보안 정책은 [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md), [SECURITY.md](SECURITY.md) 참고.

## License

[ISC License](LICENSE). 상업적 용도를 포함해 모든 용도로 자유롭게 쓸 수 있습니다. © 2025–2026 ClaudeOS-Core contributors.

---

<sub>[claudeos-core](https://github.com/claudeos-core) 팀이 유지보수합니다. issue와 PR은 <https://github.com/claudeos-core/claudeos-core>로 보내 주세요.</sub>
