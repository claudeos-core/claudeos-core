# ClaudeOS-Core

[![npm version](https://img.shields.io/npm/v/claudeos-core.svg?logo=npm&label=npm)](https://www.npmjs.com/package/claudeos-core)
[![CI](https://img.shields.io/github/actions/workflow/status/claudeos-core/claudeos-core/test.yml?branch=master&logo=github&label=CI)](https://github.com/claudeos-core/claudeos-core/actions/workflows/test.yml)
[![tests](https://img.shields.io/badge/tests-736%20passing-brightgreen?logo=node.js&logoColor=white)](https://github.com/claudeos-core/claudeos-core/actions/workflows/test.yml)
[![node](https://img.shields.io/node/v/claudeos-core.svg?logo=node.js&logoColor=white&label=node)](https://nodejs.org/)
[![license](https://img.shields.io/npm/l/claudeos-core.svg?color=blue)](LICENSE)
[![downloads](https://img.shields.io/npm/dm/claudeos-core.svg?logo=npm&color=blue&label=downloads)](https://www.npmjs.com/package/claudeos-core)

**실제 소스 코드에서 Claude Code 문서를 자동 생성하세요.** 프로젝트를 정적 분석한 다음 4-pass Claude 파이프라인을 실행하여 `.claude/rules/`, standards, skills, guides를 생성하는 CLI 도구입니다 — 그 결과 Claude Code가 일반적인 컨벤션이 아닌 **여러분 프로젝트의** 컨벤션을 따릅니다.

```bash
npx claudeos-core init
```

[🇺🇸 English](README.md) · [🇨🇳 中文](README.zh-CN.md) · [🇯🇵 日本語](README.ja.md) · [🇪🇸 Español](README.es.md) · [🇻🇳 Tiếng Việt](README.vi.md) · [🇮🇳 हिन्दी](README.hi.md) · [🇷🇺 Русский](README.ru.md) · [🇫🇷 Français](README.fr.md) · [🇩🇪 Deutsch](README.de.md)

---

## 이 도구가 뭔가요?

여러분은 Claude Code를 사용합니다. 똑똑하지만, **여러분 프로젝트의 컨벤션은 모릅니다**:
- 팀이 MyBatis를 쓰는데, Claude는 JPA 코드를 생성합니다.
- 래퍼가 `ApiResponse.ok()`인데, Claude는 `ResponseEntity.success()`를 씁니다.
- 패키지가 `controller/order/`인데, Claude는 `order/controller/`를 만듭니다.

그래서 생성된 모든 파일을 고치는 데 상당한 시간을 씁니다.

**ClaudeOS-Core가 이 문제를 해결합니다.** 실제 소스 코드를 스캔하여 컨벤션을 파악하고, Claude Code가 자동으로 읽어 들이는 디렉토리인 `.claude/rules/`에 완전한 규칙 세트를 작성합니다. 다음에 _"주문 CRUD 만들어줘"_ 라고 하면, Claude는 첫 시도부터 여러분의 컨벤션을 따릅니다.

```
이전:  사람 → Claude Code → "일반적으로 좋은" 코드 → 수동 수정
이후:  사람 → Claude Code → 프로젝트에 맞는 코드 → 그대로 사용
```

---

## 실제 프로젝트 데모

[`spring-boot-realworld-example-app`](https://github.com/gothinkster/spring-boot-realworld-example-app)에서 실행 — Java 11 · Spring Boot 2.6 · MyBatis · SQLite · 187 source files. 결과: **75 generated files**, 총 소요 시간 **53분**, 모든 validator ✅.

<p align="center">
  <img src="docs/assets/spring-boot-realworld-demo.gif" alt="ClaudeOS-Core init running on spring-boot-realworld-example-app — stack detection, 4-pass pipeline, validators, completion summary" width="769">
</p>

<details>
<summary><strong>📺 터미널 출력 (텍스트 버전, 검색·복사용)</strong></summary>

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
    🚀 Pass 3 split mode (3a → 3b → 3c → 3d-aux)
    ✅ 3a complete (2m 57s)            — pass3a-facts.md (187-path allowlist)
    ✅ 3b complete (18m 49s)           — CLAUDE.md + 19 standards + 20 rules
    ✅ 3c complete (12m 35s)           — 13 skills + 9 guides
    ✅ 3d-aux complete (3m 18s)        — database/ + mcp-guide/
    🎉 Pass 3 split complete: 4/4 stages successful
    [███████████████░░░░░] 75% (3/4)

[7] Pass 4 — Memory scaffolding...
    📦 Pass 4 staged-rules: 6 rule files moved to .claude/rules/
    ✅ Pass 4 complete (5m)
       📋 Gap-fill: all 12 expected files already present
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
<summary><strong>📄 생성된 <code>CLAUDE.md</code> 발췌 (실제 출력)</strong></summary>

```markdown
## 4. Core Architecture

### Core Patterns

- **Hexagonal ports & adapters**: domain ports live in `io.spring.core.{aggregate}`
  and are implemented by `io.spring.infrastructure.repository.MyBatis{Aggregate}Repository`.
  The domain layer has zero MyBatis imports.
- **CQRS-lite read/write split (same DB)**: write side goes through repository ports
  + entities; read side is a separate `readservice` package whose `@Mapper`
  interfaces return `*Data` DTOs directly (no entity hydration).
- **No aggregator/orchestrator layer**: multi-source orchestration happens inside
  application services (e.g., `ArticleQueryService`); there is no `*Aggregator`
  class in the codebase.
- **Application-supplied UUIDs**: entity constructors assign their own UUID; PK is
  passed via `#{user.id}` on INSERT. The global
  `mybatis.configuration.use-generated-keys=true` flag is dead config
  (auto-increment is unused).
- **JWT HS512 authentication**: `io.spring.infrastructure.service.DefaultJwtService`
  is the sole token subject in/out; `io.spring.api.security.JwtTokenFilter`
  extracts the token at the servlet layer.
```

참고: 위의 모든 주장은 실제 소스에 기반합니다 — 클래스명, 패키지 경로, 설정 키, dead-config 플래그까지 모두 Claude가 파일을 작성하기 전에 스캐너가 추출한 것입니다.

</details>

<details>
<summary><strong>🛡️ 자동 로드되는 실제 rule 파일 (<code>.claude/rules/10.backend/03.data-access-rules.md</code>)</strong></summary>

````markdown
---
paths:
  - "**/*"
---

# Data Access Rules

## XML-only SQL
- Every SQL statement lives in `src/main/resources/mapper/*.xml`.
  NO `@Select` / `@Insert` / `@Update` / `@Delete` annotations on `@Mapper` methods.
- Each `@Mapper` interface has exactly one XML file at
  `src/main/resources/mapper/{InterfaceName}.xml`.
- `<mapper namespace="...">` MUST be the fully qualified Java interface name.
  The single existing exception is `TransferData.xml` (free-form `transfer.data`).

## Dynamic SQL
- `<if>` predicates MUST guard both null and empty:
  `<if test="X != null and X != ''">`. Empty-only is the existing HIGH-severity bug pattern.
- Prefer `LIMIT n OFFSET m` over MySQL-style `LIMIT m, n`.

## Examples

✅ Correct:
```xml
<update id="update">
  UPDATE articles
  <set>
    <if test="article.title != null and article.title != ''">title = #{article.title},</if>
    updated_at = #{article.updatedAt}
  </set>
  WHERE id = #{article.id}
</update>
```

❌ Incorrect:
```xml
<mapper namespace="article.mapper">          <!-- NO — namespace MUST be FQCN -->
```
````

`paths: ["**/*"]` glob은 프로젝트 내 어떤 파일을 편집하든 Claude Code가 이 rule을 자동으로 로드한다는 뜻입니다. ✅/❌ 예제는 이 코드베이스의 실제 컨벤션과 기존 버그 패턴에서 직접 추출됩니다.

</details>

<details>
<summary><strong>🧠 자동 생성된 <code>decision-log.md</code> 시드 (실제 출력)</strong></summary>

```markdown
## 2026-04-26 — CQRS-lite read/write split inside the persistence layer

- **Context:** Writes go through `core.*Repository` port → `MyBatis*Repository`
  adapter → `io.spring.infrastructure.mybatis.mapper.{Aggregate}Mapper`.
  Reads bypass the domain port: application service →
  `io.spring.infrastructure.mybatis.readservice.{Concept}ReadService` directly,
  returning flat `*Data` DTOs from `io.spring.application.data.*`.
- **Options considered:** Single repository surface returning hydrated entities
  for both reads and writes.
- **Decision:** Same database, two `@Mapper` packages — `mapper/` (write side,
  operates on core entities) and `readservice/` (read side, returns `*Data` DTOs).
  Read DTOs avoid entity hydration overhead.
- **Consequences:** Reads are NOT routed through the domain port — this is
  intentional, not a bug. Application services may inject both a `*Repository`
  (writes) and one or more `*ReadService` interfaces (reads) at the same time.
  Do NOT add hydrate-then-map glue in the read path.
```

Pass 4는 `pass2-merged.json`에서 추출한 아키텍처 결정 사항으로 `decision-log.md`를 시딩합니다 — 따라서 이후 세션은 코드베이스가 _이렇게 보인다_ 는 사실뿐 아니라 _왜_ 이런지도 기억합니다.

</details>

---

## Quick Start

**전제 조건:** Node.js 18+, [Claude Code](https://docs.anthropic.com/en/docs/claude-code) 설치 및 인증 완료.

```bash
# 1. 프로젝트 루트로 이동
cd my-spring-boot-project

# 2. init 실행 (코드를 분석하고 Claude에게 rules 작성을 요청합니다)
npx claudeos-core init

# 3. 끝. Claude Code를 열고 코딩을 시작하면 — rules가 이미 로드되어 있습니다.
```

`init` 완료 후 **여러분이 얻는 것**:

```
your-project/
├── .claude/
│   └── rules/                    ← Claude Code가 자동 로드
│       ├── 00.core/              (공통 rules — 네이밍, 아키텍처)
│       ├── 10.backend/           (백엔드 스택 rules, 해당 시)
│       ├── 20.frontend/          (프론트엔드 스택 rules, 해당 시)
│       ├── 30.security-db/       (보안 & DB 컨벤션)
│       ├── 40.infra/             (env, 로깅, CI/CD)
│       ├── 50.sync/              (문서 동기화 알림 — rules only)
│       ├── 60.memory/            (memory rules — Pass 4, rules only)
│       ├── 70.domains/{type}/    (도메인별 rules, type = backend|frontend)
│       └── 80.verification/      (테스트 전략 + 빌드 검증 알림)
├── claudeos-core/
│   ├── standard/                 ← 참고 문서 (카테고리 구조 미러링)
│   │   ├── 00.core/              (프로젝트 개요, 아키텍처, 네이밍)
│   │   ├── 10.backend/           (백엔드 reference — 백엔드 스택일 때)
│   │   ├── 20.frontend/          (프론트엔드 reference — 프론트엔드 스택일 때)
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

`rules/`와 `standard/` 사이에서 같은 번호 prefix를 공유하는 카테고리는 동일한 개념 영역을 나타냅니다 (예: `10.backend` rules ↔ `10.backend` standards). Rules-only 카테고리: `50.sync` (문서 동기화 알림), `60.memory` (Pass 4 memory). Standard-only 카테고리: `90.optional` (강제력 없는 스택별 추가). 다른 prefix (`00`, `10`, `20`, `30`, `40`, `70`, `80`)는 `rules/`와 `standard/` 모두에 존재합니다. 이제 Claude Code가 여러분 프로젝트를 압니다.

---

## 누구를 위한 도구인가?

| 여러분이... | 이 도구가 도와주는 것... |
|---|---|
| **Claude Code로 새 프로젝트를 시작하는 솔로 개발자** | "Claude에게 컨벤션을 가르치는" 단계를 통째로 건너뜀 |
| **공유 표준을 유지하는 팀 리드** | `.claude/rules/`를 최신 상태로 유지하는 번거로움을 자동화 |
| **Claude Code를 이미 사용 중이지만 생성된 코드 수정에 지친 사용자** | Claude가 "일반적으로 좋은" 패턴이 아닌 _여러분의_ 패턴을 따르게 함 |

**적합하지 않은 경우:** one-size-fits-all preset bundle을 원하면 (스캔 단계 없이 day-one에 작동하는 agents/skills/rules 묶음 — [docs/ko/comparison.md](docs/ko/comparison.md) 참고), 또는 프로젝트가 [지원 스택](#supported-stacks) 중 하나에 맞지 않는 경우.

---

## 어떻게 동작하나요?

ClaudeOS-Core는 일반적인 Claude Code 워크플로를 뒤집습니다:

```
일반:    사람이 프로젝트 설명 → Claude가 스택 추측 → Claude가 docs 작성
이 도구: 코드가 스택을 읽음 → 코드가 확정된 사실을 Claude에게 전달 → Claude가 사실로부터 docs 작성
```

핵심 아이디어: **Node.js 스캐너가 먼저 소스 코드를 읽고** (deterministic, AI 없음), 그다음 4-pass Claude 파이프라인이 스캐너가 발견한 사실의 제약 안에서 문서를 작성합니다. Claude는 코드에 실제로 없는 경로나 프레임워크를 만들어 낼 수 없습니다.

전체 아키텍처는 [docs/ko/architecture.md](docs/ko/architecture.md) 참고.

---

## Supported Stacks

12개 스택, 프로젝트 파일에서 자동 감지:

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

memory layer 유지보수용 두 가지 추가 명령:

```bash
# failure-patterns 로그 컴팩션 (주기적으로 실행)
npx claudeos-core memory compact

# 자주 발생하는 failure pattern을 제안 rule로 승격
npx claudeos-core memory propose-rules
```

각 명령의 전체 옵션은 [docs/ko/commands.md](docs/ko/commands.md) 참고.

---

## 무엇이 다른가

대부분의 Claude Code 문서 도구는 설명에서 출발합니다 (사람이 도구에 알려주고, 도구가 Claude에게 알려줌). ClaudeOS-Core는 실제 소스 코드에서 출발합니다 (도구가 읽고, 확정된 사실을 Claude에게 알려주고, Claude는 확정된 것만 작성).

세 가지 구체적 결과:

1. **Deterministic stack detection.** 같은 프로젝트 + 같은 코드 = 같은 출력. "이번엔 Claude가 다르게 굴렸네"가 없음.
2. **No invented paths.** Pass 3 프롬프트가 허용된 모든 소스 경로를 명시적으로 나열 — Claude는 존재하지 않는 경로를 인용할 수 없음.
3. **Multi-stack aware.** 같은 실행 안에서 백엔드와 프론트엔드 도메인이 서로 다른 분석 프롬프트를 사용.

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

v2.0 이후 ClaudeOS-Core는 4개 파일이 들어가는 `claudeos-core/memory/` 폴더를 작성합니다:

- `decision-log.md` — append-only 형식의 "왜 X 대신 Y를 선택했는지"
- `failure-patterns.md` — frequency/importance 점수가 붙은 반복 오류
- `compaction.md` — 시간이 흐르며 memory가 자동 컴팩션되는 방식
- `auto-rule-update.md` — 새 rules로 승격되어야 할 패턴

`npx claudeos-core memory propose-rules`를 실행하면 Claude에게 최근 failure pattern을 분석하여 추가할 새 rules를 제안하라고 요청할 수 있습니다.

memory 모델과 라이프사이클은 [docs/ko/memory-layer.md](docs/ko/memory-layer.md) 참고.

---

## FAQ

**Q: Claude API 키가 필요한가요?**
A: 아니오. ClaudeOS-Core는 기존 Claude Code 설치를 사용합니다 — 로컬 머신의 `claude -p`로 프롬프트를 파이프합니다. 추가 계정이 필요 없습니다.

**Q: 기존 CLAUDE.md나 `.claude/rules/`를 덮어쓰나요?**
A: 새 프로젝트에서 첫 실행: 새로 생성합니다. `--force` 없이 재실행: 편집 내용 보존 — 이전 실행의 pass marker가 감지되어 해당 pass가 스킵됩니다. `--force`로 재실행: 모든 것을 wipe하고 재생성 (편집 내용 손실 — 그게 `--force`의 의미입니다). [docs/ko/safety.md](docs/ko/safety.md) 참고.

**Q: 제 스택이 지원되지 않습니다. 추가할 수 있나요?**
A: 네. 새 스택은 ~3개 prompt 템플릿 + domain scanner가 필요합니다. 8단계 가이드는 [CONTRIBUTING.md](CONTRIBUTING.md) 참고.

**Q: 한국어로 docs를 생성하려면?**
A: `npx claudeos-core init --lang ko`. 10개 언어 지원: en, ko, ja, zh-CN, es, vi, hi, ru, fr, de.

**Q: monorepo와 함께 작동하나요?**
A: 네 — Turborepo (`turbo.json`), pnpm workspaces (`pnpm-workspace.yaml`), Lerna (`lerna.json`), npm/yarn workspaces (`package.json#workspaces`)를 stack-detector가 감지합니다. 각 app이 자체 분석을 받습니다. 다른 monorepo 레이아웃 (예: NX)은 명시적으로는 감지하지 않지만, 일반 `apps/*/`와 `packages/*/` 패턴은 스택별 scanner가 그대로 인식합니다.

**Q: Claude Code가 동의하기 어려운 rules를 생성하면?**
A: 직접 편집하세요. 그 다음 `npx claudeos-core lint`로 CLAUDE.md 구조가 여전히 유효한지 확인합니다. 이후 `init` 실행에서 (`--force` 없이) 편집 내용이 보존됩니다 — resume 메커니즘이 marker가 있는 pass를 스킵합니다.

**Q: 버그는 어디에 신고하나요?**
A: [GitHub Issues](https://github.com/claudeos-core/claudeos-core/issues). 보안 이슈는 [SECURITY.md](SECURITY.md) 참고.

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

기여를 환영합니다 — 스택 지원 추가, prompt 개선, 버그 수정. [CONTRIBUTING.md](CONTRIBUTING.md) 참고.

행동 강령과 보안 정책은 [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)와 [SECURITY.md](SECURITY.md) 참고.

## License

[ISC](LICENSE) — 상업용을 포함한 모든 용도로 자유롭게 사용 가능.

---

<sub>**claudeos-core**가 정성스럽게 만든 도구 — [GitHub](https://github.com/claudeos-core). 시간을 절약했다면 GitHub의 ⭐가 가시성을 유지해 줍니다.</sub>
