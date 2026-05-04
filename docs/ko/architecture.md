# Architecture — 4-Pass 파이프라인

이 문서는 `claudeos-core init`이 처음부터 끝까지 어떻게 동작하는지 설명합니다. 도구를 그냥 쓰는 게 목적이라면 [메인 README](../../README.ko.md)만으로 충분합니다. 이 문서는 _왜_ 이런 설계로 갔는지를 이해하고 싶을 때 보는 글입니다.

아직 한 번도 안 돌려 봤다면 [먼저 실행](../../README.ko.md#quick-start)해 보길 권합니다. 출력을 한 번 본 뒤에 읽으면 아래 개념이 훨씬 빠르게 잡힙니다.

> 영문 원본: [docs/architecture.md](../architecture.md).

---

## 핵심 아이디어 — "코드가 확정하고, Claude가 만든다"

Claude Code용 문서 생성 도구는 대부분 한 단계로 동작합니다.

```
사람이 작성한 설명  →  Claude  →  CLAUDE.md / rules / standards
```

이 방식에서 Claude는 스택, 컨벤션, 도메인 구조를 추측해야 합니다. 추측을 꽤 잘하긴 하지만, 추측은 결국 추측입니다. ClaudeOS-Core는 이 흐름을 뒤집습니다.

```
소스 코드
       ↓
[Step A: 코드가 읽음]      ← Node.js scanner, 늘 같은 결과, AI 없음
       ↓
project-analysis.json      ← 확정된 사실: 스택, 도메인, 경로
       ↓
[Step B: Claude가 작성]    ← 4-pass LLM 파이프라인, 사실 안에서만 동작
       ↓
[Step C: 코드가 검증]      ← 5개 validator, 자동 실행
       ↓
.claude/rules/  +  claudeos-core/{standard,skills,guide,...}
```

**코드는 정확해야 하는 부분을 담당합니다** (스택, 파일 경로, 도메인 구조).
**Claude는 표현이 필요한 부분을 담당합니다** (설명, 컨벤션, 자연스러운 산문).
서로 영역이 겹치지 않고, 서로를 의심할 필요도 없습니다.

이 분업이 중요한 이유는 단순합니다. LLM은 코드에 실제로 없는 경로나 프레임워크를 지어낼 수 없기 때문이죠. Pass 3 프롬프트가 scanner의 경로 allowlist를 명시적으로 Claude에게 넘기고, Claude가 그 안에 없는 경로를 인용하려 들면 뒤따르는 `content-validator`가 잡아냅니다.

---

## Step A — Scanner (늘 같은 결과)

Claude를 호출하기 전에, Node.js 프로세스가 프로젝트를 순회하면서 `claudeos-core/generated/project-analysis.json`을 만듭니다. 이 파일이 이후 모든 단계의 단일 source of truth입니다.

### Scanner가 읽는 파일

scanner는 프로젝트 루트의 다음 파일들에서 신호를 모읍니다.

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

하나도 매치되지 않으면 `init`은 추측으로 넘어가지 않고 명확한 에러를 내며 멈춥니다.

### Scanner가 `project-analysis.json`에 쓰는 내용

- **Stack metadata** — language, framework, ORM, DB, package manager, build tool, logger.
- **Architecture pattern** — Java는 5개 패턴 중 하나(layer-first / domain-first / layer-then-domain / domain-then-layer / hexagonal). Kotlin은 CQRS / BFF / multi-module 감지. Frontend는 App Router / Pages Router / FSD layout과 `components/*/` 패턴을 multi-stage fallback으로 추적합니다.
- **Domain list** — 디렉토리 트리를 훑으며 도메인을 찾고 도메인별 파일 수까지 기록합니다. Pass 1이 읽을 대표 파일도 도메인당 1~2개씩 골라 둡니다.
- **Source path allowlist** — 프로젝트에 실제로 존재하는 모든 소스 파일 경로. Pass 3 프롬프트가 이 목록을 통째로 포함하기 때문에 Claude가 추측할 여지가 없습니다.
- **Monorepo 구조** — Turborepo(`turbo.json`), pnpm workspaces(`pnpm-workspace.yaml`), Lerna(`lerna.json`), npm/yarn workspaces(`package.json#workspaces`)가 있을 때 인식합니다. NX는 명시적 자동 감지 대상이 아니지만, 일반적인 `apps/*/`와 `packages/*/` 레이아웃이라면 스택별 scanner가 그대로 잡아냅니다.
- **`.env` snapshot** — port, host, API target을 추출하고 민감한 변수는 마스킹합니다. 탐색 순서는 [stacks.md](stacks.md) 참고.

scanner에는 **LLM 호출이 한 번도 없습니다**. 그래서 같은 프로젝트에 같은 코드를 넣으면 매번 같은 `project-analysis.json`이 나옵니다.

스택별로 scanner가 무엇을 뽑아내는지는 [stacks.md](stacks.md)에서 자세히 볼 수 있습니다.

---

## Step B — 4-pass Claude 파이프라인

각 pass는 역할이 분명히 나뉘어 있습니다. 순차적으로 실행되고, Pass N은 Pass (N-1)의 출력을 작고 구조화된 파일 형태로 읽습니다. 이전 모든 pass의 결과를 통째로 읽지 않습니다.

### Pass 1 — 도메인별 deep analysis

**Input:** `project-analysis.json` + 각 도메인의 대표 파일.

**역할:** 대표 파일을 읽고 스택별 분석 카테고리 수십 개에 걸쳐 패턴을 뽑아냅니다. 보통 도메인당 50~100개가 넘는 bullet이 나오고, 스택에 따라 양이 다릅니다. Kotlin/Spring의 CQRS-aware 템플릿이 가장 풍부하고, Node.js 경량 템플릿이 가장 간결합니다. 예를 들면 "이 controller는 `@RestController`인가 `@Controller`인가? response wrapper로 무엇을 쓰는가? logging library는?" 같은 질문에 답합니다.

**Output:** `pass1-<group-N>.json`. 도메인 그룹당 한 파일.

큰 프로젝트에서는 Pass 1이 여러 번 실행됩니다. 도메인 그룹당 한 번씩이죠. 그룹화 규칙은 **그룹당 최대 4 도메인 + 40 파일**이고, `plan-installer/domain-grouper.js`가 자동으로 적용합니다. 12 도메인 프로젝트라면 Pass 1을 3번 돌립니다.

이렇게 나누는 이유는 Claude의 context window가 유한하기 때문입니다. 12 도메인 분량의 소스 파일을 한 프롬프트에 욱여넣으면 context가 터지거나 LLM이 대충 훑고 끝냅니다. split을 거치면 각 pass가 한 곳에 집중할 수 있습니다.

### Pass 2 — Cross-domain merge

**Input:** 모든 `pass1-*.json` 파일.

**역할:** 도메인별 결과를 프로젝트 전체 그림으로 합칩니다. 두 도메인 의견이 갈리면(예: 한쪽은 response wrapper가 `success()`, 다른 쪽은 `ok()`) Pass 2가 더 많이 쓰이는 컨벤션을 고르고 불일치 사실은 따로 기록합니다.

**Output:** `pass2-merged.json`. 보통 100~400 KB 정도입니다.

### Pass 3 — Documentation 생성 (split mode)

**Input:** `pass2-merged.json`.

**역할:** 실제 문서를 작성합니다. 파이프라인에서 가장 무거운 단계로, CLAUDE.md, `.claude/rules/`, `claudeos-core/standard/`, `claudeos-core/skills/`, `claudeos-core/guide/`, `claudeos-core/database/`, `claudeos-core/mcp-guide/`에 걸쳐 40~50개의 markdown 파일을 만들어 냅니다.

**Output:** 사용자가 실제로 보게 되는 모든 파일. [메인 README](../../README.ko.md#quick-start)에 나온 디렉토리 구조 그대로입니다.

각 stage의 출력이 Claude의 context window를 넘지 않게 하려고(Pass 2의 merged input이 크고, 만들어 내는 출력은 그보다 더 큽니다), Pass 3는 **항상 stage로 나뉘어 실행됩니다**. 작은 프로젝트도 예외가 아닙니다. split은 무조건 적용되고, 다만 작은 프로젝트일수록 도메인별 batch 수가 적을 뿐입니다.

| Stage | 작성 내용 |
|---|---|
| **3a** | `pass2-merged.json`에서 뽑아낸 작은 "facts table"(`pass3a-facts.md`). 이후 stage가 큰 merged 파일을 다시 읽지 않도록 압축해 둔 input입니다. |
| **3b-core** | `CLAUDE.md`(Claude Code가 가장 먼저 읽는 인덱스)와 `claudeos-core/standard/`의 핵심부. |
| **3b-N** | 도메인별 rule과 standard 파일(15 도메인 이하 그룹당 stage 1개). |
| **3c-core** | `claudeos-core/skills/` orchestrator 파일과 `claudeos-core/guide/`. |
| **3c-N** | 도메인별 skill 파일. |
| **3d-aux** | `claudeos-core/database/`와 `claudeos-core/mcp-guide/` 보조 콘텐츠. |

도메인이 16개 이상으로 매우 많은 프로젝트에서는 3b와 3c를 batch로 한 번 더 쪼갭니다. 그래야 batch마다 새 context window를 받을 수 있습니다.

모든 stage가 성공하면 marker로 `pass3-complete.json`이 생깁니다. `init`이 중간에 멈추더라도 다음 실행이 marker를 읽고 미완 stage부터 이어서 진행합니다. 이미 끝난 stage는 다시 돌리지 않습니다.

### Pass 4 — Memory layer scaffolding

**Input:** `project-analysis.json`, `pass2-merged.json`, `pass3a-facts.md`.

**역할:** L4 memory layer와 범용 scaffold rules를 만듭니다. 모든 scaffold 작성은 **이미 있으면 건너뜀** 방식이라, Pass 4를 다시 돌려도 어떤 파일도 덮어쓰지 않습니다.

- `claudeos-core/memory/` — markdown 파일 4개(`decision-log.md`, `failure-patterns.md`, `compaction.md`, `auto-rule-update.md`).
- `.claude/rules/60.memory/` — rule 파일 4개(`01.decision-log.md`, `02.failure-patterns.md`, `03.compaction.md`, `04.auto-rule-update.md`). Claude Code가 관련 영역을 편집할 때 memory 파일을 자동으로 로드합니다.
- `.claude/rules/00.core/51.doc-writing-rules.md`와 `52.ai-work-rules.md` — 프로젝트와 무관한 범용 룰입니다. Pass 3는 `00.standard-reference.md` 같은 프로젝트별 `00.core` 룰을 작성하고, Pass 4는 위 두 파일이 없을 때만 추가합니다.
- `claudeos-core/standard/00.core/<NN>.doc-writing-guide.md` — 추가 룰 작성에 관한 메타 가이드. 숫자 prefix는 `Math.max(existing-numbers) + 1`로 자동 할당하므로 Pass 3가 이미 쓴 내용에 따라 보통 `04` 또는 `05`가 됩니다.

**Output:** Memory 파일과 `pass4-memory.json` marker.

중요한 점이 하나 있습니다. **Pass 4는 `CLAUDE.md`를 절대 건드리지 않습니다.** Section 8(memory 파일 참조 포함)은 이미 Pass 3가 다 써 놓았기 때문에, Pass 4가 또 손대면 Section 8이 중복 선언되어 validator가 에러를 냅니다. 이 제약은 prompt에서 강제하고, `tests/pass4-claude-md-untouched.test.js`가 보장합니다.

각 memory 파일의 역할과 라이프사이클은 [memory-layer.md](memory-layer.md)를 참고하세요.

---

## Step C — Verification (Claude 작업 후, 늘 같은 결과)

Claude가 끝나면 Node.js 코드가 5개 validator로 출력을 검증합니다. **이 중 어느 것도 LLM을 호출하지 않습니다.** 모든 검사가 늘 같은 입력에 같은 결과를 냅니다.

| Validator | 검사 내용 |
|---|---|
| `claude-md-validator` | `CLAUDE.md`의 구조 검사(top-level section 개수, section별 H3/H4 개수, memory 파일 table-row 유일성과 scope, T1 canonical heading token). 언어와 무관해서 10개 출력 언어 모두에서 같은 검사가 똑같이 통과합니다. |
| `content-validator` | 콘텐츠 레벨 검사 10개. 필수 파일 존재 여부, standards/skills가 인용한 경로의 실재성, MANIFEST 일관성. |
| `pass-json-validator` | Pass 1/2/3/4의 JSON 출력이 well-formed인지, 그리고 예상 키를 모두 포함하는지. |
| `plan-validator` | (Legacy) 저장된 plan 파일과 disk를 비교합니다. v2.1.0에서 master plan 생성이 빠지면서 대부분 no-op이지만, 하위 호환을 위해 남겨 두었습니다. |
| `sync-checker` | 추적 디렉토리의 disk 파일이 `sync-map.json` 등록 항목과 일치하는지 확인합니다(orphaned vs. unregistered). |

severity는 **3단계**로 나뉘어 있습니다.

- **fail** — 완료를 막고 CI에서 non-zero로 종료합니다. 구조가 깨졌다는 신호입니다.
- **warn** — 출력에는 보이지만 진행을 막지 않습니다. 한 번 들여다볼 만한 항목입니다.
- **advisory** — 시간 날 때 검토. 비표준 프로젝트 레이아웃에서 false positive로 잡히는 경우가 많습니다(예: gitignore된 파일이 "missing"으로 표시).

각 validator의 전체 검사 목록은 [verification.md](verification.md)에 있습니다.

validator는 두 가지 방식으로 오케스트레이션됩니다.

1. **`claudeos-core lint`** — `claude-md-validator`만 실행합니다. 빠르고 구조 검사만 수행합니다. CLAUDE.md를 수동으로 편집한 뒤에 사용하세요.
2. **`claudeos-core health`** — 나머지 4개 validator를 실행합니다. claude-md-validator를 일부러 분리한 이유는, CLAUDE.md의 구조 drift는 가벼운 경고가 아니라 re-init이 필요하다는 신호이기 때문입니다. CI에서 돌리기에 적합합니다.

---

## 왜 이 아키텍처가 중요한가

### 사실 주입 프롬프트가 hallucination을 막는다

Pass 3가 실행될 때 prompt는 대략 이런 모양입니다(단순화한 형태).

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

Claude는 경로를 지어낼 틈이 없습니다. 제약을 **positive(whitelist)**로 거는 게 핵심입니다. negative("만들지 마")가 아닙니다. 이 차이가 결정적입니다. LLM은 추상적인 부정 제약보다 구체적인 긍정 제약을 훨씬 잘 따릅니다.

이런 장치가 있어도 Claude가 가짜 경로를 인용하는 일이 생기면, 마지막에 돌아가는 `content-validator [10/10]` 검사가 `STALE_PATH`로 잡아냅니다. 문서가 나가기 전에 사용자가 경고를 보게 됩니다.

### Marker 기반 resume이 안전한 이유

각 pass는 성공적으로 끝나면 marker 파일(`pass1-<N>.json`, `pass2-merged.json`, `pass3-complete.json`, `pass4-memory.json`)을 남깁니다. `init`이 네트워크 끊김, 타임아웃, Ctrl-C 등으로 중단되면, 다음 실행이 marker를 읽고 멈춘 지점부터 이어 갑니다. 작업이 사라지지 않습니다.

Pass 3의 marker는 어느 sub-stage까지 완료됐는지까지 추적합니다. 그래서 Pass 3가 부분적으로 진행된 상태(예: 3b는 끝났는데 3c 중간에 충돌)에서도 3a부터 다시 돌리지 않고 다음 stage부터 이어 갑니다.

### 멱등(Idempotent) 재실행

룰이 이미 있는 프로젝트에서 `init`을 다시 돌려도, 수동 편집한 내용을 **조용히 덮어쓰지 않습니다**.

원리는 이렇습니다. Claude Code의 권한 시스템은 `--dangerously-skip-permissions`을 줘도 subprocess의 `.claude/` 쓰기를 막습니다. 그래서 Pass 3/4는 rule 파일을 대신 `claudeos-core/generated/.staged-rules/`에 쓰도록 지시받습니다. 그리고 각 pass가 끝나면, 권한 정책의 영향을 받지 않는 Node.js orchestrator가 staging 파일을 sub-path를 그대로 유지하면서 `.claude/rules/`로 옮깁니다.

실제 동작을 정리하면 이렇습니다. **새 프로젝트에서 다시 돌리면 모두 새로 만듭니다. 룰을 수동 편집한 프로젝트에서 `--force`로 다시 돌리면 처음부터 새로 생성하고, 편집한 내용은 사라집니다(이게 바로 `--force`의 뜻입니다). `--force` 없이 다시 돌리면 resume 메커니즘이 작동해서 끝나지 않은 pass만 실행합니다.**

전체 보존 정책은 [safety.md](safety.md)를 참고하세요.

### 언어와 무관한 검증

validator는 번역된 heading 텍스트를 매칭하지 않습니다. **구조적인 모양**(heading level, 개수, 순서)으로 검사합니다. 그래서 같은 `claude-md-validator`가 10개 언어 어디에서 만든 CLAUDE.md에도 byte 단위로 동일한 판정을 내립니다. 언어별 dictionary가 없으니, 새 언어를 추가해도 유지 비용이 들지 않습니다.

---

## 성능 — 어느 정도 걸릴까

구체적인 시간은 다음 요인에 크게 좌우됩니다.
- 프로젝트 크기(소스 파일 수, 도메인 수)
- Anthropic API와의 네트워크 지연
- Claude Code 설정에서 고른 Claude model

대략적인 가늠은 이 정도입니다.

| 단계 | 작은 프로젝트 (<200 files) | 중간 프로젝트 (~1000 files) |
|---|---|---|
| Step A (scanner) | 5초 미만 | 10~30초 |
| Step B (4 Claude pass) | 몇 분 | 10~30분 |
| Step C (validators) | 5초 미만 | 10~20초 |

큰 프로젝트에서 전체 시간을 좌우하는 건 Pass 1입니다. 도메인 그룹마다 한 번씩 실행되기 때문이죠. 24 도메인 프로젝트라면 Pass 1만 6번 호출됩니다(24 ÷ 그룹당 4 도메인).

정확한 숫자가 필요하면 직접 본인 프로젝트에서 한 번 돌려 보는 게 가장 정직한 답입니다.

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

- [stacks.md](stacks.md) — 스택별로 scanner가 무엇을 뽑아내는지
- [memory-layer.md](memory-layer.md) — Pass 4 상세
- [verification.md](verification.md) — 5개 validator 전체
- [diagrams.md](diagrams.md) — 같은 아키텍처를 Mermaid 다이어그램으로
- [comparison.md](comparison.md) — 다른 Claude Code 도구와의 비교
