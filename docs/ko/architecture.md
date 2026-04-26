# Architecture — 4-Pass 파이프라인

이 문서는 `claudeos-core init`이 처음부터 끝까지 어떻게 작동하는지 설명합니다. 도구를 그냥 쓰고 싶다면 [메인 README](../../README.ko.md)로 충분합니다 — 이 문서는 _왜_ 이런 설계가 됐는지 이해하기 위한 것입니다.

도구를 한 번도 쓰지 않았다면 [먼저 한 번 실행](../../README.ko.md#quick-start)해 보세요. 출력을 본 뒤에 아래 개념이 훨씬 빨리 잡힙니다.

> 영문 원본: [docs/architecture.md](../architecture.md).

---

## 핵심 아이디어 — "코드가 확정하고, Claude가 만든다"

Claude Code 문서 생성 도구 대부분은 한 단계로 작동합니다:

```
사람이 작성한 설명  →  Claude  →  CLAUDE.md / rules / standards
```

Claude는 스택, 컨벤션, 도메인 구조를 추측해야 합니다. 추측을 잘하지만, 추측은 추측입니다. ClaudeOS-Core는 이를 뒤집습니다:

```
여러분의 소스 코드
       ↓
[Step A: 코드가 읽음]      ← Node.js scanner, deterministic, AI 없음
       ↓
project-analysis.json      ← 확정된 사실: 스택, 도메인, 경로
       ↓
[Step B: Claude가 작성]    ← 4-pass LLM 파이프라인, 사실에 의해 제약됨
       ↓
[Step C: 코드가 검증]      ← 5개 validator, 자동 실행
       ↓
.claude/rules/  +  claudeos-core/{standard,skills,guide,...}
```

**코드는 정확해야 하는 부분을 담당합니다** (스택, 파일 경로, 도메인 구조).
**Claude는 표현이 필요한 부분을 담당합니다** (설명, 컨벤션, 산문).
서로 겹치지 않고, 서로를 의심하지 않습니다.

이게 중요한 이유: LLM은 코드에 실제로 없는 경로나 프레임워크를 만들어 낼 수 없습니다. Pass 3 프롬프트가 scanner의 경로 allowlist를 명시적으로 Claude에게 건넵니다. Claude가 list에 없는 경로를 인용하려 하면, 후속 `content-validator`가 잡아냅니다.

---

## Step A — Scanner (deterministic)

Claude가 호출되기 전에, Node.js 프로세스가 프로젝트를 순회하며 `claudeos-core/generated/project-analysis.json`을 작성합니다. 이 파일이 이후 모든 단계의 단일 source of truth입니다.

### Scanner가 읽는 파일

스캐너는 프로젝트 루트의 다음 파일에서 신호를 받습니다:

| 파일 | 알려주는 것 |
|---|---|
| `package.json` | Node.js 프로젝트; `dependencies`로 framework |
| `pom.xml` | Java/Maven 프로젝트 |
| `build.gradle` / `build.gradle.kts` | Java/Kotlin Gradle 프로젝트 |
| `pyproject.toml` / `requirements.txt` | Python 프로젝트; package로 framework |
| `angular.json` | Angular 프로젝트 |
| `nuxt.config.{ts,js}` | Nuxt 프로젝트 |
| `next.config.{ts,js}` | Next.js 프로젝트 |
| `vite.config.{ts,js}` | Vite 프로젝트 |
| `.env*` 파일 | Runtime 설정 (port, host, DB URL — 아래 참고) |

매치되는 게 없으면, `init`은 추측 대신 명확한 에러로 멈춥니다.

### Scanner가 `project-analysis.json`에 쓰는 것

- **Stack metadata** — language, framework, ORM, DB, package manager, build tool, logger.
- **Architecture pattern** — Java는 5개 패턴 중 하나 (layer-first / domain-first / layer-then-domain / domain-then-layer / hexagonal). Kotlin은 CQRS / BFF / multi-module 감지. Frontend는 App Router / Pages Router / FSD layout과 `components/*/` 패턴, multi-stage fallback.
- **Domain list** — 디렉토리 트리를 순회하며 발견, 도메인별 파일 수 포함. Pass 1이 읽을 도메인별 대표 파일을 1~2개 선택.
- **Source path allowlist** — 프로젝트에 존재하는 모든 소스 파일 경로. Pass 3 프롬프트가 이 list를 명시적으로 포함하므로 Claude가 추측할 게 없음.
- **Monorepo 구조** — Turborepo (`turbo.json`), pnpm workspaces (`pnpm-workspace.yaml`), Lerna (`lerna.json`), npm/yarn workspaces (`package.json#workspaces`)이 있을 때. NX는 명시적 자동 감지 대상이 아님; 일반 `apps/*/`와 `packages/*/` 패턴은 그래도 스택별 scanner가 인식.
- **`.env` snapshot** — port, host, API target, sensitive vars 마스킹. 검색 순서는 [stacks.md](stacks.md) 참고.

scanner에는 **LLM 호출이 없습니다**. 같은 프로젝트 + 같은 코드 = 같은 `project-analysis.json`, 매번.

스택별 자세한 내용 (각 scanner가 무엇을 추출하는지)은 [stacks.md](stacks.md) 참고.

---

## Step B — 4-pass Claude 파이프라인

각 pass는 명확한 역할을 가집니다. 순차적으로 실행되며, Pass N은 Pass (N-1)의 출력을 작은 구조화된 파일로 읽습니다 (이전 모든 pass의 전체 출력이 아님).

### Pass 1 — 도메인별 deep analysis

**Input:** `project-analysis.json` + 각 도메인의 대표 파일.

**역할:** 대표 파일을 읽고 스택별 수십 개 분석 카테고리에 걸친 패턴을 추출 (보통 도메인당 50~100+ bullet 수준 항목, 스택에 따라 다름 — Kotlin/Spring의 CQRS-aware 템플릿이 가장 풍부, Node.js 경량 템플릿이 가장 간결). 예시: "이 controller는 `@RestController`인가 `@Controller`인가? 어떤 response wrapper를 쓰나? 어떤 logging library?"

**Output:** `pass1-<group-N>.json` — 도메인 그룹당 한 파일.

대규모 프로젝트에선 Pass 1이 여러 번 실행됩니다 — 도메인 그룹당 한 번씩. grouping rule은 **그룹당 최대 4 도메인 + 40 파일**, `plan-installer/domain-grouper.js`에서 자동 적용. 12 도메인 프로젝트는 Pass 1을 3번 실행.

이 split이 존재하는 이유: Claude의 context window가 유한하기 때문. 12 도메인 분량의 소스 파일을 한 프롬프트에 넣으려 하면 context가 넘치거나 LLM이 대충 훑게 됩니다. split이 각 pass를 집중시킵니다.

### Pass 2 — Cross-domain merge

**Input:** 모든 `pass1-*.json` 파일.

**역할:** 프로젝트 전체 그림으로 병합. 두 도메인이 다른 의견 (예: 한쪽은 response wrapper가 `success()`, 다른 쪽은 `ok()`)을 내면 Pass 2가 우세한 컨벤션을 선택하고 불일치를 기록.

**Output:** `pass2-merged.json` — 보통 100–400 KB.

### Pass 3 — Documentation 생성 (split mode)

**Input:** `pass2-merged.json`.

**역할:** 실제 documentation 작성. 가장 무거운 pass — CLAUDE.md, `.claude/rules/`, `claudeos-core/standard/`, `claudeos-core/skills/`, `claudeos-core/guide/`, `claudeos-core/database/`, `claudeos-core/mcp-guide/` 전반에 걸쳐 ~40–50 markdown 파일을 만듭니다.

**Output:** 사용자가 보는 모든 파일, [메인 README](../../README.ko.md#quick-start)에 표시된 디렉토리 구조로 정리.

각 stage의 출력을 Claude의 context window 안에 유지하기 위해 (병합된 Pass 2 input이 크고, 생성되는 출력은 더 큼), Pass 3는 **항상 stage로 split됩니다** — 작은 프로젝트조차도. split은 무조건 적용되며, 작은 프로젝트는 도메인별 batch가 적을 뿐:

| Stage | 작성 내용 |
|---|---|
| **3a** | `pass2-merged.json`에서 추출한 작은 "facts table" (`pass3a-facts.md`). 후속 stage의 압축된 input — 큰 merged 파일을 다시 읽지 않아도 됨. |
| **3b-core** | `CLAUDE.md` (Claude Code가 가장 먼저 읽는 인덱스) + `claudeos-core/standard/`의 핵심부. |
| **3b-N** | 도메인별 rule 및 standard 파일 (≤15 도메인 그룹 stage 1개). |
| **3c-core** | `claudeos-core/skills/` orchestrator 파일 + `claudeos-core/guide/`. |
| **3c-N** | 도메인별 skill 파일. |
| **3d-aux** | `claudeos-core/database/`와 `claudeos-core/mcp-guide/` 보조 콘텐츠. |

매우 큰 프로젝트 (≥16 도메인)에서는 3b와 3c가 batch로 더 분할됩니다. 각 batch가 새 context window를 받습니다.

모든 stage가 성공하면 `pass3-complete.json`이 marker로 작성됩니다. `init`이 도중에 중단되면, 다음 실행이 marker를 읽고 다음 미완 stage부터 재개합니다 — 완료된 stage는 다시 실행되지 않습니다.

### Pass 4 — Memory layer scaffolding

**Input:** `project-analysis.json`, `pass2-merged.json`, `pass3a-facts.md`.

**역할:** L4 memory layer + 범용 scaffold rules 생성. 모든 scaffold 작성은 **skip-if-exists** — 따라서 Pass 4 재실행이 어떤 것도 덮어쓰지 않음.

- `claudeos-core/memory/` — 4개 markdown 파일 (`decision-log.md`, `failure-patterns.md`, `compaction.md`, `auto-rule-update.md`)
- `.claude/rules/60.memory/` — 4개 rule 파일 (`01.decision-log.md`, `02.failure-patterns.md`, `03.compaction.md`, `04.auto-rule-update.md`); Claude Code가 관련 영역을 편집할 때 memory 파일을 자동 로드.
- `.claude/rules/00.core/51.doc-writing-rules.md`와 `52.ai-work-rules.md` — 범용 generic rules (Pass 3는 `00.standard-reference.md` 같은 프로젝트별 `00.core` rules를 만들고, Pass 4는 위 두 파일이 없을 때만 추가).
- `claudeos-core/standard/00.core/<NN>.doc-writing-guide.md` — 추가 rule 작성에 관한 메타 가이드. 숫자 prefix는 `Math.max(existing-numbers) + 1`로 자동 할당, 보통 Pass 3가 이미 쓴 내용에 따라 `04` 또는 `05`.

**Output:** Memory 파일 + `pass4-memory.json` marker.

중요: **Pass 4는 `CLAUDE.md`를 수정하지 않습니다.** Pass 3가 이미 Section 8 (memory 파일 참조 포함)을 작성했습니다. 여기서 CLAUDE.md를 또 수정하면 Section 8 내용이 재선언되어 validator 에러가 납니다. 이 제약은 prompt에서 강제되며 `tests/pass4-claude-md-untouched.test.js`로 검증됩니다.

각 memory 파일의 역할과 라이프사이클은 [memory-layer.md](memory-layer.md) 참고.

---

## Step C — Verification (deterministic, post-Claude)

Claude 종료 후, Node.js 코드가 5개 validator로 출력을 검증합니다. **어느 것도 LLM을 호출하지 않습니다** — 모든 검사가 deterministic.

| Validator | 검사 내용 |
|---|---|
| `claude-md-validator` | `CLAUDE.md`의 구조 검사 (top-level section count, section별 H3/H4 count, memory 파일 table-row uniqueness/scope, T1 canonical heading token). Language-invariant — 같은 검사가 10개 출력 언어 모두에서 동일 통과. |
| `content-validator` | 10개 content-level 검사: 필수 파일 존재, standards/skills에 인용된 경로의 실재성, MANIFEST 일관성. |
| `pass-json-validator` | Pass 1 / 2 / 3 / 4 JSON 출력이 well-formed이며 예상 키를 포함하는지. |
| `plan-validator` | (Legacy) 저장된 plan 파일과 disk 비교. v2.1.0에서 master plan 생성이 제거되어 대부분 no-op — 하위 호환을 위해 유지. |
| `sync-checker` | 추적 디렉토리의 disk 파일이 `sync-map.json` 등록 항목과 일치하는지 (orphaned vs. unregistered). |

이들에는 **3개의 severity tier**가 있습니다:

- **fail** — 완료를 차단, CI에서 non-zero exit. 구조적으로 깨진 상태.
- **warn** — 출력에 노출되지만 차단하지 않음. 조사할 가치 있음.
- **advisory** — 나중에 검토. 흔히 비표준 프로젝트 layout의 false positive (예: gitignore된 파일을 "missing"으로 표시).

각 validator의 전체 검사 list는 [verification.md](verification.md) 참고.

Validator는 두 가지 방식으로 오케스트레이션됩니다:

1. **`claudeos-core lint`** — `claude-md-validator`만 실행. 빠르고 구조-only. CLAUDE.md를 수동 편집한 뒤에 사용.
2. **`claudeos-core health`** — 나머지 4개 validator 실행 (claude-md-validator는 의도적으로 분리 — CLAUDE.md 구조 drift는 soft warning이 아니라 re-init 신호이기 때문). CI에 권장.

---

## 왜 이 아키텍처가 중요한가

### 사실 주입 프롬프트가 hallucination을 막는다

Pass 3가 실행될 때 prompt는 대략 이렇게 보입니다 (단순화):

```
Stack: java-spring-boot
ORM: mybatis
Architecture pattern: layer-first

Allowed source paths (you may only cite these):
- src/main/java/com/example/order/controller/OrderController.java
- src/main/java/com/example/order/service/OrderService.java
- ... [497 more]

DO NOT cite paths outside this list.

Now, for each domain, write a "Skill" that explains the domain's
conventions...
```

Claude에겐 경로를 만들어 낼 여지가 없습니다. 제약은 **positive** (whitelist)이지 negative ("만들지 마")가 아닙니다 — 그 차이가 중요합니다. LLM은 추상적인 부정 제약보다 구체적인 긍정 제약을 더 잘 따릅니다.

이 모든 것에도 불구하고 Claude가 가짜 경로를 인용하면, 끝에 실행되는 `content-validator [10/10]` 검사가 `STALE_PATH`로 표시합니다. docs가 ship되기 전에 사용자가 경고를 봅니다.

### Marker 기반 resume-safe

각 pass는 성공적으로 완료되면 marker 파일 (`pass1-<N>.json`, `pass2-merged.json`, `pass3-complete.json`, `pass4-memory.json`)을 작성합니다. `init`이 중단되면 (네트워크 끊김, 타임아웃, Ctrl-C), 다음 실행이 marker를 읽고 마지막 위치부터 이어 갑니다. 작업이 손실되지 않습니다.

Pass 3의 marker는 어떤 sub-stage가 완료됐는지도 추적하므로, Pass 3가 부분적으로 진행된 상태 (예: 3b 완료, 3c가 stage 중간에 충돌)는 3a부터가 아니라 다음 stage부터 재개됩니다.

### Idempotent 재실행

Rules가 이미 있는 프로젝트에서 `init`을 실행해도 수동 편집을 **조용히 덮어쓰지 않습니다**.

메커니즘: Claude Code의 권한 시스템은 `--dangerously-skip-permissions`이 있어도 subprocess의 `.claude/` 쓰기를 차단합니다. 그래서 Pass 3/4는 rule 파일을 대신 `claudeos-core/generated/.staged-rules/`에 쓰도록 지시받습니다. 각 pass 후, Node.js orchestrator (Claude Code의 권한 정책 대상이 아님)가 staging 파일을 sub-path를 보존하며 `.claude/rules/`로 옮깁니다.

실제로는: **새 프로젝트에서 재실행하면 전부 새로 만듭니다. rule을 수동 편집한 프로젝트에서 `--force`로 재실행하면 처음부터 다시 생성합니다 (편집 손실 — `--force`의 의미). `--force` 없이는 resume 메커니즘이 작동하여 미완 pass만 실행됩니다.**

전체 보존 정책은 [safety.md](safety.md) 참고.

### Language-invariant 검증

Validator는 번역된 heading 텍스트를 매칭하지 않습니다. **구조적 모양** (heading level, count, 순서)을 매칭합니다. 따라서 같은 `claude-md-validator`가 지원되는 10개 언어 어디에서 생성된 CLAUDE.md에도 byte-for-byte 동일한 verdict를 냅니다. 언어별 dictionary 없음. 새 언어 추가 시 유지 비용 없음.

---

## 성능 — 무엇을 기대해야 하나

구체적 시간은 다음에 크게 좌우됩니다:
- 프로젝트 크기 (소스 파일 수, 도메인 수)
- Anthropic API와의 네트워크 지연
- Claude Code 설정에서 선택한 Claude model

대략 가이드:

| 단계 | 작은 프로젝트 (<200 files) | 중간 프로젝트 (~1000 files) |
|---|---|---|
| Step A (scanner) | < 5 초 | 10–30 초 |
| Step B (4 Claude pass) | 몇 분 | 10–30 분 |
| Step C (validators) | < 5 초 | 10–20 초 |

큰 프로젝트의 wall clock은 Pass 1이 지배합니다 — 도메인 그룹당 한 번씩 실행되기 때문. 24 도메인 프로젝트 = Pass 1을 6번 호출 (24 / 4 도메인per그룹).

정확한 숫자가 필요하면 자기 프로젝트에서 한 번 실행하세요 — 그게 정직한 답입니다.

---

## 각 단계 코드 위치

| 단계 | 파일 |
|---|---|
| Scanner orchestrator | `plan-installer/index.js` |
| Stack 감지 | `plan-installer/stack-detector.js` |
| 스택별 scanner | `plan-installer/scanners/scan-{java,kotlin,node,python,frontend}.js` |
| Domain grouping | `plan-installer/domain-grouper.js` |
| Prompt 조합 | `plan-installer/prompt-generator.js` |
| Init orchestrator | `bin/commands/init.js` |
| Pass 템플릿 | `pass-prompts/templates/<stack>/pass{1,2,3}.md` (스택별); `pass-prompts/templates/common/pass4.md` (공유) |
| Memory scaffolding | `lib/memory-scaffold.js` |
| Validators | `claude-md-validator/`, `content-validator/`, `pass-json-validator/`, `plan-validator/`, `sync-checker/` |
| Verification orchestrator | `health-checker/index.js` |

---

## 더 읽어보기

- [stacks.md](stacks.md) — 각 scanner가 스택별로 추출하는 것
- [memory-layer.md](memory-layer.md) — Pass 4 상세
- [verification.md](verification.md) — 5개 validator 전부
- [diagrams.md](diagrams.md) — 같은 아키텍처를 Mermaid 다이어그램으로
- [comparison.md](comparison.md) — 다른 Claude Code 도구와의 차이
