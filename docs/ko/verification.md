# Verification

Claude가 documentation 생성을 마치면 코드가 그 출력을 **5개의 독립된 validator**로 검증합니다. 어느 validator도 LLM을 호출하지 않으므로 모든 검사 결과는 항상 일관됩니다.

이 문서에서는 각 validator가 무엇을 검사하는지, severity tier가 어떻게 동작하는지, 출력을 어떻게 읽는지 설명합니다.

> 영문 원본: [docs/verification.md](../verification.md).

---

## 왜 post-generation 검증이 필요한가

LLM의 출력은 매번 같지 않습니다. 사실 주입 prompt ([소스 경로 allowlist](architecture.md#사실-주입-프롬프트가-hallucination을-막는다))가 있어도 Claude가 다음과 같은 문제를 일으킬 수 있습니다.

- context 압박 상황에서 필수 section을 빠뜨리는 경우.
- allowlist와 거의 일치하지만 정확히는 다른 경로를 인용하는 경우 (예: 상위 디렉토리와 TypeScript 상수 이름을 조합해 만든 `src/feature/routers/featureRoutePath.ts`).
- standards와 rules 사이에서 일관성 없는 cross-reference를 만드는 경우.
- CLAUDE.md의 다른 위치에서 Section 8의 콘텐츠를 다시 선언하는 경우.

Validator는 이렇게 조용히 잘못된 출력을 문서가 배포되기 전에 잡아냅니다.

---

## 5개 validator

### 1. `claude-md-validator` — 구조 불변량

`CLAUDE.md`를 일련의 구조 검사로 검증합니다. 아래 표는 check ID family를 나열한 것이고, `checkSectionsHaveContent`와 `checkCanonicalHeadings`는 section마다 하나씩 보고하기 때문에 실제로 출력되는 ID는 그보다 다양합니다. 코드 위치는 `claude-md-validator/`.

**실행 방법:**
```bash
npx claudeos-core lint
```

(`health`로 실행되지 않음 — 아래 [왜 두 entry point가: `lint` vs `health`](#왜-두-entry-point가-lint-vs-health) 참고.)

**검사 내용:**

| Check ID | 강제 내용 |
|---|---|
| `S1` | Section 수는 정확히 8 |
| `S2-N` | 각 section은 비어있지 않은 본문 line 2개 이상 |
| `S-H3-4` | Section 4는 H3 sub-section 3개 또는 4개 |
| `S-H3-6` | Section 6은 H3 sub-section 정확히 3개 |
| `S-H3-8` | Section 8은 H3 sub-section 정확히 2개 |
| `S-H4-8` | Section 8은 H4 heading 정확히 2개 (L4 Memory Files / Memory Workflow) |
| `M-<file>` | 4개 memory 파일 (`decision-log.md`, `failure-patterns.md`, `compaction.md`, `auto-rule-update.md`)이 정확히 ONE markdown table row에 등장 |
| `F2-<file>` | Memory 파일 table row가 Section 8에 한정됨 |
| `T1-1` ~ `T1-8` | 각 `## N.` section heading이 영문 canonical token (`Role Definition`, `Project Overview`, `Build`, `Core Architecture`, `Directory Structure`, `Standard`, `DO NOT Read`, `Memory`)을 포함하는지 확인 (case-insensitive substring 매치) |

**Language-invariant인 이유:** validator는 번역된 heading 본문을 매치하지 않습니다. markdown 구조(heading level, count, 순서)와 영문 canonical token만 봅니다. 그래서 지원하는 10개 언어로 생성된 어떤 CLAUDE.md든 같은 검사가 그대로 통과합니다.

**실용적 의미:** `--lang ja`로 생성된 CLAUDE.md와 `--lang en`으로 생성된 CLAUDE.md는 사람 눈에 완전히 달라 보이지만, `claude-md-validator`는 양쪽에 byte 단위로 동일한 pass/fail 판정을 내립니다. 언어별 dictionary를 유지할 필요가 없습니다.

### 2. `content-validator` — 경로 & manifest 검사

생성된 파일의 **content**를 검증합니다 (CLAUDE.md 구조 검증이 아닙니다). 코드 위치는 `content-validator/`.

**10개 검사**가 있습니다. 처음 9개는 콘솔 출력에서 `[N/9]`로 표시되고, 10번째는 나중에 추가된 검사라서 `[10/10]`으로 표시됩니다. 이 비대칭은 기존 CI의 grep이 계속 매치되도록 일부러 코드에 그대로 두었습니다.

| Check | 강제 내용 |
|---|---|
| `[1/9]` CLAUDE.md 존재, ≥100 char, 필수 section 키워드 포함 (10-language aware) |
| `[2/9]` `.claude/rules/**/*.md` 파일은 `paths:` 키를 가진 YAML frontmatter 보유, 빈 파일 없음 |
| `[3/9]` `claudeos-core/standard/**/*.md` 파일은 ≥200 char이며 ✅/❌ 예시 + markdown table 포함 (Kotlin standards는 ` ```kotlin ` block도 검사) |
| `[4/9]` `claudeos-core/skills/**/*.md` 파일이 비어있지 않음; orchestrator + MANIFEST 존재 |
| `[5/9]` `claudeos-core/guide/`에 9개 expected 파일 모두 존재, 각각 비어있지 않음 (BOM-aware emptiness 검사) |
| `[6/9]` `claudeos-core/plan/` 파일이 비어있지 않음 (v2.1.2부터 informational — `plan/`은 더 이상 자동 생성 안 됨) |
| `[7/9]` `claudeos-core/database/` 파일 존재 (없으면 warning) |
| `[8/9]` `claudeos-core/mcp-guide/` 파일 존재 (없으면 warning) |
| `[9/9]` `claudeos-core/memory/` 4개 expected 파일 존재 + 구조 검증 (decision-log ISO date, failure-pattern 필수 필드, compaction `## Last Compaction` marker) |
| `[10/10]` 경로 주장 검증 + MANIFEST drift (3개 sub-class — 아래 참고) |

**Check `[10/10]` sub-class:**

| Class | 잡아내는 것 |
|---|---|
| `STALE_PATH` | `.claude/rules/**` 또는 `claudeos-core/standard/**`의 모든 `src/...\.(ts|tsx|js|jsx)` 참조가 실제 파일로 resolve되는지 확인. 펜스 처리된 코드 블록과 placeholder 경로 (`src/{domain}/feature.ts`)는 제외. |
| `STALE_SKILL_ENTRY` | `claudeos-core/skills/00.shared/MANIFEST.md`에 등록된 모든 skill 경로가 disk에 실제로 존재하는지 확인. |
| `MANIFEST_DRIFT` | 등록된 모든 skill이 `CLAUDE.md`에 언급되어 있는지 확인 (**orchestrator/sub-skill 예외** 포함). Pass 3b가 Section 6을 작성하는 시점에는 아직 Pass 3c가 sub-skill을 만들기 전이라서, 모든 sub-skill을 함께 나열하는 것은 구조적으로 불가능합니다. |

orchestrator/sub-skill 예외: `{category}/{parent-stem}/{NN}.{name}.md`에 등록된 sub-skill은, `{category}/*{parent-stem}*.md`의 orchestrator가 CLAUDE.md에 언급되어 있으면 cover된 것으로 간주합니다.

**Severity:** content-validator는 **advisory** tier로 동작합니다. 출력에는 표시되지만 CI를 차단하지는 않습니다. Pass 3을 다시 실행한다고 LLM hallucination이 확실히 고쳐진다는 보장이 없기 때문에, 차단하면 사용자가 `--force` 루프에 갇히게 됩니다. 따라서 감지 신호(non-zero exit + `stale-report` 항목)만으로도 CI 파이프라인과 사람의 triage에 충분합니다.

### 3. `pass-json-validator` — Pass 출력 well-formedness

각 pass가 작성한 JSON 파일이 well-formed이고 필수 키를 포함하는지 검증합니다. 코드 위치는 `pass-json-validator/`.

**검증 파일:**

| 파일 | 필수 키 |
|---|---|
| `project-analysis.json` | 5 필수 키 (stack, domains, etc.) |
| `domain-groups.json` | 4 필수 키 |
| `pass1-*.json` | 4 필수 키 + `analysisPerDomain` object |
| `pass2-merged.json` | 10 common section (always) + 2 backend section (when backend stack) + 1 kotlin base section + 2 kotlin CQRS section (해당 시). semantic alias map과의 fuzzy match; top-level 키 수 <5 = ERROR, <9 = WARNING; 빈 값 감지. |
| `pass3-complete.json` | Marker 존재 + 구조 |
| `pass4-memory.json` | Marker 구조: object, `passNum === 4`, 비어있지 않은 `memoryFiles` array |

pass2 검사는 **stack-aware**입니다. `project-analysis.json`을 읽어 backend/kotlin/cqrs 여부를 판정하고, 그에 맞춰 기대하는 section을 조정합니다.

**Severity:** **warn-only** tier로 동작합니다. 이슈를 표시하지만 CI를 차단하지는 않습니다.

### 4. `plan-validator` — Plan ↔ disk 일관성 (legacy)

`claudeos-core/plan/*.md` 파일과 disk를 비교합니다. 코드 위치는 `plan-validator/`.

**3가지 mode:**
- `--check` (기본): drift만 감지
- `--refresh`: disk 내용으로 plan 파일을 업데이트
- `--execute`: plan 콘텐츠를 disk에 적용 (`.bak` 백업 생성)

**v2.1.0 이후 상태:** Master plan 생성이 v2.1.0에서 제거되어, 이제 `init`은 `claudeos-core/plan/`을 자동으로 만들지 않습니다. `plan/`이 없으면 이 validator는 informational message만 남기고 건너뜁니다.

ad-hoc 백업 용도로 plan 파일을 직접 관리하는 사용자를 위해 validator 묶음에 그대로 남겨 두었습니다.

**보안:** path traversal을 차단합니다. `isWithinRoot(absPath)`가 `../`로 프로젝트 루트를 벗어나는 경로를 거부합니다.

**Severity:** 실제 drift가 감지되면 **fail** tier. `plan/`이 없으면 no-op.

### 5. `sync-checker` — Disk ↔ Master Plan 일관성

`sync-map.json` (manifest-generator가 작성)에 등록된 파일이 disk의 실제 파일과 일치하는지 검증합니다. 추적 대상 7개 디렉토리에 대해 양방향으로 검사합니다. 코드 위치는 `sync-checker/`.

**Two-step 검사:**

1. **Disk → Plan:** 추적 대상 7개 디렉토리 (`.claude/rules`, `standard`, `skills`, `guide`, `database`, `mcp-guide`, `memory`)와 `CLAUDE.md`를 순회합니다. disk에는 있지만 `sync-map.json`에 등록되지 않은 파일을 보고합니다.
2. **Plan → Disk:** `sync-map.json`에 등록된 경로 중 disk에 더 이상 존재하지 않는 것을 orphaned로 보고합니다.

**Exit code:** orphaned 파일만 exit 1을 발생시킵니다. unregistered 파일은 informational로만 처리합니다 (v2.1.0+ 프로젝트는 기본적으로 등록 경로가 0이라서 이게 일반적인 케이스입니다).

**Severity:** orphaned 파일이 있으면 **fail** tier. `sync-map.json`에 매핑이 없으면 깔끔하게 skip합니다.

---

## Severity tier

모든 실패가 같은 심각도를 갖는 것은 아닙니다. `health-checker`는 런타임 validator를 3단계 severity로 오케스트레이션합니다.

| Tier | 기호 | 동작 |
|---|---|---|
| **fail** | `❌` | 완료를 차단. CI에서 non-zero exit. 반드시 수정해야 함. |
| **warn** | `⚠️` | 출력에 표시되지만 차단하지 않음. 조사할 가치가 있음. |
| **advisory** | `ℹ️` | 나중에 검토. 비표준 프로젝트 layout에서는 false positive가 흔함. |

**Tier별 예시:**

- **fail:** plan-validator가 실제 drift를 감지한 경우, sync-checker가 orphaned 파일을 발견한 경우, 필수 guide 파일이 누락된 경우.
- **warn:** pass-json-validator가 critical하지 않은 schema 갭을 발견한 경우.
- **advisory:** content-validator의 `STALE_PATH`가 실제로는 존재하지만 gitignore된 경로를 표시한 경우 (일부 프로젝트에서 false positive).

3단계 시스템은 `content-validator`의 발견(비표준 layout에서는 false positive가 섞일 수 있음)이 CI 파이프라인을 deadlock시키지 않도록 도입했습니다. 이 시스템이 없으면 모든 advisory가 차단으로 이어지는데, `init`을 다시 실행한다고 해서 LLM hallucination이 확실히 고쳐지지는 않습니다.

요약 라인은 breakdown을 보여줍니다:
```
All systems operational (1 advisory, 1 warning)
```

---

## 왜 두 entry point가: `lint` vs `health`

```bash
npx claudeos-core lint     # claude-md-validator만
npx claudeos-core health   # 다른 4개 validator
```

**왜 둘로 나눴나?**

`claude-md-validator`는 **구조적** 이슈를 찾습니다. section 개수가 틀리거나, memory 파일 table이 재선언되었거나, canonical heading에 영문 token이 빠진 경우입니다. 이런 문제는 **CLAUDE.md를 재생성해야 한다는** 신호이지, 조사해 보면 되는 soft warning이 아닙니다. 해결 방법은 `init`을 다시 실행하는 것 (필요하면 `--force`).

나머지 validator는 **콘텐츠** 이슈를 찾습니다. 경로, manifest 항목, schema 갭 같은 문제이고, 모두 재생성 없이 직접 검토하고 수정할 수 있습니다.

`lint`를 분리해 두면 pre-commit hook에서(빠르고 구조 검사만 하는) 더 느린 content 검사 없이 사용할 수 있습니다.

---

## Validation 실행

```bash
# CLAUDE.md 구조 검증
npx claudeos-core lint

# 4-validator health suite
npx claudeos-core health
```

CI에는 `health`를 권장합니다. LLM 호출이 없어 여전히 빠르고, CLAUDE.md 구조 검사를 제외한 모든 항목을 커버합니다. 대부분의 CI 파이프라인은 매 commit마다 구조 검사까지 돌릴 필요는 없습니다.

Pre-commit hook에는 `lint`가 적합합니다. 매 commit마다 돌릴 만큼 빠릅니다.

---

## 출력 형식

Validator는 기본적으로 사람이 읽기 좋은 형식으로 출력합니다:

```
[content-validator]
ℹ advisory  STALE_PATH  src/legacy/oldRoutes.ts → file does not exist
            (cited in claudeos-core/standard/10.backend/03.routing.md:42)

[sync-checker]
✓ pass     0 orphaned files; 0 unregistered files
```

`manifest-generator`는 machine-readable artifact를 `claudeos-core/generated/`에 작성합니다:

- `rule-manifest.json` — 파일 목록과 gray-matter로 추출한 frontmatter, 그리고 stat
- `sync-map.json` — 등록된 경로 매핑 (v2.1.0 이후 기본적으로 빈 array)
- `stale-report.json` — 모든 validator의 발견을 통합한 결과

---

## CI 통합

최소한의 GitHub Actions 예시입니다:

```yaml
name: ClaudeOS Health
on: [push, pull_request]
jobs:
  health:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v5
        with:
          node-version: '20'
      - run: npx claudeos-core health
```

`fail` tier 발견에서만 exit code가 non-zero가 됩니다. `warn`과 `advisory`는 출력에는 나오지만 빌드를 실패시키지 않습니다.

공식 CI workflow (`.github/workflows/test.yml`)는 `ubuntu-latest`, `windows-latest`, `macos-latest` × Node 18 / 20에서 실행합니다.

---

## Validator가 받아들이기 어려운 항목을 표시할 때

False positive는 발생합니다. 특히 비표준 프로젝트 layout(예: gitignore된 생성 파일, 비표준 경로로 출력하는 custom build step)에서 자주 나옵니다.

**특정 파일에 대한 감지를 억제하려면** [advanced-config.md](advanced-config.md)에서 `.claudeos-scan.json` override 옵션을 확인하세요.

**validator가 자기 프로젝트만이 아니라 일반적으로 잘못 판정한다고 보이면** [issue를 열어 주세요](https://github.com/claudeos-core/claudeos-core/issues). 이 검사들은 실제 보고를 바탕으로 시간을 두고 튜닝됩니다.

---

## See also

- [architecture.md](architecture.md) — 파이프라인 안에서 validator가 차지하는 위치
- [commands.md](commands.md) — `lint`와 `health` 명령 reference
- [troubleshooting.md](troubleshooting.md) — 특정 validator 에러의 의미
