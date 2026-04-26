# Verification

Claude가 documentation 생성을 마치면, 코드가 출력을 **5개 독립 validator**로 검증합니다. 어느 것도 LLM을 호출하지 않습니다 — 모든 검사가 deterministic.

이 문서는 각 validator가 무엇을 검사하는지, severity tier가 어떻게 작동하는지, 출력을 어떻게 읽는지 다룹니다.

> 영문 원본: [docs/verification.md](../verification.md).

---

## 왜 post-generation 검증이 필요한가

LLM은 non-deterministic합니다. 사실 주입 prompt ([소스 경로 allowlist](architecture.md#사실-주입-프롬프트가-hallucination을-막는다))가 있어도 Claude는 여전히:

- context 압박 하에 필수 section을 빠뜨릴 수 있음.
- allowlist에 거의-매치되지만-정확히-아닌 경로를 인용할 수 있음 (예: parent 디렉토리 + TypeScript 상수명에서 만들어진 `src/feature/routers/featureRoutePath.ts`).
- standards와 rules 사이 일관성 없는 cross-reference를 생성할 수 있음.
- CLAUDE.md의 다른 곳에서 Section 8 콘텐츠를 재선언할 수 있음.

Validator는 이런 조용히 잘못된 출력을 docs ship 전에 잡아냅니다.

---

## 5개 validator

### 1. `claude-md-validator` — 구조 불변량

`CLAUDE.md`를 일련의 구조 검사에 대해 검증 (아래 표는 check ID family를 나열 — `checkSectionsHaveContent`와 `checkCanonicalHeadings`는 section마다 하나씩 emit하므로 개별 보고 가능 ID는 다양). `claude-md-validator/`에 위치.

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
| `T1-1` ~ `T1-8` | 각 `## N.` section heading이 영문 canonical token (`Role Definition`, `Project Overview`, `Build`, `Core Architecture`, `Directory Structure`, `Standard`, `DO NOT Read`, `Memory`)을 포함 — case-insensitive substring 매치 |

**Language-invariant인 이유:** validator는 번역된 heading 산문을 매치하지 않습니다. markdown 구조 (heading level, count, 순서)와 영문 canonical token만 매치합니다. 같은 검사가 지원되는 10개 언어에서 생성된 CLAUDE.md 모두에 통과합니다.

**실용적 중요성:** `--lang ja`로 생성된 CLAUDE.md와 `--lang en`으로 생성된 CLAUDE.md는 사람 눈에는 완전히 다르게 보이지만, `claude-md-validator`는 양쪽 모두에 byte-for-byte 동일한 pass/fail verdict를 냅니다. 언어별 dictionary 유지보수 없음.

### 2. `content-validator` — 경로 & manifest 검사

생성된 파일의 **content**를 검증 (CLAUDE.md 구조가 아닌). `content-validator/`에 위치.

**10개 검사** (처음 9개는 콘솔 출력에서 `[N/9]`로 표시; 10번째는 나중에 추가되어 `[10/10]`으로 표시 — 이 비대칭은 코드에 보존되어 기존 CI grep이 계속 매치되도록):

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
| `STALE_PATH` | `.claude/rules/**` 또는 `claudeos-core/standard/**`의 모든 `src/...\.(ts|tsx|js|jsx)` 참조는 실제 파일로 resolve돼야 함. 펜스 처리된 코드 블록과 placeholder 경로 (`src/{domain}/feature.ts`)는 제외. |
| `STALE_SKILL_ENTRY` | `claudeos-core/skills/00.shared/MANIFEST.md`에 등록된 모든 skill 경로는 disk에 존재해야 함. |
| `MANIFEST_DRIFT` | 등록된 모든 skill은 `CLAUDE.md`에 언급돼야 함 (**orchestrator/sub-skill 예외** 포함 — Pass 3b가 Section 6을 작성할 때 Pass 3c가 sub-skills를 만들기 전이므로, 모든 sub-skill을 list하는 것은 구조적으로 불가능). |

orchestrator/sub-skill 예외: `{category}/{parent-stem}/{NN}.{name}.md`에 등록된 sub-skill은 `{category}/*{parent-stem}*.md`의 orchestrator가 CLAUDE.md에 언급되면 cover된 것으로 간주.

**Severity:** content-validator는 **advisory** tier로 실행 — 출력에 노출되지만 CI를 차단하지 않음. 이유: Pass 3 재실행이 LLM hallucination을 확실히 고친다는 보장이 없으므로, 차단하면 사용자가 `--force` loop에 갇힘. 감지 신호 (non-zero exit + `stale-report` 항목)면 CI 파이프라인과 사람 triage에 충분.

### 3. `pass-json-validator` — Pass 출력 well-formedness

각 pass가 작성한 JSON 파일이 well-formed이며 expected 키를 포함하는지 검증. `pass-json-validator/`에 위치.

**검증 파일:**

| 파일 | 필수 키 |
|---|---|
| `project-analysis.json` | 5 필수 키 (stack, domains, etc.) |
| `domain-groups.json` | 4 필수 키 |
| `pass1-*.json` | 4 필수 키 + `analysisPerDomain` object |
| `pass2-merged.json` | 10 common section (always) + 2 backend section (when backend stack) + 1 kotlin base section + 2 kotlin CQRS section (해당 시). semantic alias map과의 fuzzy match; top-level 키 수 <5 = ERROR, <9 = WARNING; 빈 값 감지. |
| `pass3-complete.json` | Marker 존재 + 구조 |
| `pass4-memory.json` | Marker 구조: object, `passNum === 4`, 비어있지 않은 `memoryFiles` array |

pass2 검사는 **stack-aware**: `project-analysis.json`을 읽어 backend/kotlin/cqrs를 판정하고 어떤 section을 기대할지 조정.

**Severity:** **warn-only** tier로 실행 — 이슈를 노출하지만 CI를 차단하지 않음.

### 4. `plan-validator` — Plan ↔ disk 일관성 (legacy)

`claudeos-core/plan/*.md` 파일과 disk 비교. `plan-validator/`에 위치.

**3 mode:**
- `--check` (기본): drift만 감지
- `--refresh`: disk에서 plan 파일 업데이트
- `--execute`: plan 콘텐츠를 disk에 적용 (`.bak` 백업 생성)

**v2.1.0 상태:** Master plan 생성이 v2.1.0에서 제거됐습니다. `claudeos-core/plan/`은 `init`에 의해 더 이상 자동 생성되지 않습니다. `plan/`이 없으면 이 validator는 informational message로 skip합니다.

ad-hoc backup 목적으로 plan 파일을 hand-maintain하는 사용자를 위해 validator suite에 유지됩니다.

**보안:** path traversal 차단 — `isWithinRoot(absPath)`가 `../`로 프로젝트 루트를 escape하는 경로를 거부.

**Severity:** 실제 drift가 감지되면 **fail** tier. `plan/`이 없으면 no-op.

### 5. `sync-checker` — Disk ↔ Master Plan 일관성

`sync-map.json` (manifest-generator가 작성)에 등록된 파일이 disk의 실제 파일과 일치하는지 검증. 7개 추적 디렉토리에 대한 양방향 검사. `sync-checker/`에 위치.

**Two-step 검사:**

1. **Disk → Plan:** 7개 추적 디렉토리 (`.claude/rules`, `standard`, `skills`, `guide`, `database`, `mcp-guide`, `memory`) + `CLAUDE.md`를 순회. disk에는 있지만 `sync-map.json`에 등록되지 않은 파일을 보고.
2. **Plan → Disk:** `sync-map.json`에 등록된 경로 중 disk에 더 이상 없는 것을 보고 (orphaned).

**Exit code:** orphaned 파일만 exit 1을 야기. unregistered 파일은 informational (v2.1.0+ 프로젝트는 기본적으로 등록 경로가 0이므로, 일반적인 케이스).

**Severity:** orphaned 파일에 대해 **fail** tier. `sync-map.json`에 매핑이 없으면 깨끗하게 skip.

---

## Severity tier

모든 실패한 검사가 동일한 심각도를 갖지는 않습니다. `health-checker`가 런타임 validator를 3-tier severity로 오케스트레이션:

| Tier | 기호 | 동작 |
|---|---|---|
| **fail** | `❌` | 완료 차단. CI에서 non-zero exit. 반드시 수정. |
| **warn** | `⚠️` | 출력에 노출되지만 차단 안 함. 조사할 가치. |
| **advisory** | `ℹ️` | 나중에 검토. 비표준 프로젝트 layout의 false positive 흔함. |

**Tier별 예시:**

- **fail:** plan-validator가 실제 drift 감지; sync-checker가 orphaned 파일 발견; 필수 guide 파일 missing.
- **warn:** pass-json-validator가 non-critical schema 갭 발견.
- **advisory:** content-validator의 `STALE_PATH`가 존재하지만 gitignore된 경로를 표시 (일부 프로젝트의 false positive).

3-tier 시스템은 `content-validator` 발견 (비표준 layout의 false positive를 가질 수 있음)이 CI 파이프라인을 deadlock하지 않도록 추가됨. 없으면 모든 advisory가 차단 — 그런데 `init` 재실행이 LLM hallucination을 확실히 고치지는 않음.

요약 line이 breakdown을 보여줌:
```
All systems operational (1 advisory, 1 warning)
```

---

## 왜 두 entry point가: `lint` vs `health`

```bash
npx claudeos-core lint     # claude-md-validator만
npx claudeos-core health   # 다른 4개 validator
```

**왜 split?**

`claude-md-validator`는 **구조적** 이슈를 찾음 — section count 잘못, memory 파일 table 재선언, canonical heading의 영문 token 누락. 이는 **CLAUDE.md를 재생성해야 한다는** 신호이지 조사용 soft warning이 아님. fix는 `init` 재실행 (`--force` 필요 시).

다른 validator는 **content** 이슈를 찾음 — 경로, manifest 항목, schema 갭. 모두 재생성 없이 hand로 검토 / 수정 가능.

`lint`를 분리하면 pre-commit hook에서 (빠르고, 구조-only) 더 느린 content 검사를 끌어들이지 않고 사용 가능.

---

## Validation 실행

```bash
# CLAUDE.md 구조 검증
npx claudeos-core lint

# 4-validator health suite
npx claudeos-core health
```

CI에는 `health`가 권장됩니다. 여전히 빠르고 (LLM 호출 없음) 구조 CLAUDE.md 검사를 제외한 모든 것을 cover합니다 — 대부분 CI 파이프라인은 매 commit마다 그것까지 검증할 필요 없음.

Pre-commit hook에는 `lint`가 매 commit마다 실행할 만큼 빠릅니다.

---

## 출력 형식

Validator는 기본적으로 사람이 읽을 수 있는 형식으로 출력:

```
[content-validator]
ℹ advisory  STALE_PATH  src/legacy/oldRoutes.ts → file does not exist
            (cited in claudeos-core/standard/10.backend/03.routing.md:42)

[sync-checker]
✓ pass     0 orphaned files; 0 unregistered files
```

`manifest-generator`는 machine-readable artifact를 `claudeos-core/generated/`에 작성:

- `rule-manifest.json` — 파일 list + gray-matter의 frontmatter + stat
- `sync-map.json` — 등록된 경로 매핑 (v2.1.0+: 기본적으로 빈 array)
- `stale-report.json` — 모든 validator의 통합 발견

---

## CI 통합

최소한의 GitHub Actions 예시:

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

`fail`-tier 발견에만 exit code가 non-zero. `warn`과 `advisory`는 print되지만 빌드를 실패시키지 않음.

공식 CI workflow (`.github/workflows/test.yml`)는 `ubuntu-latest`, `windows-latest`, `macos-latest` × Node 18 / 20에서 실행.

---

## Validator가 동의할 수 없는 것을 표시할 때

False positive는 일어납니다, 특히 비표준 프로젝트 layout (예: gitignore된 생성 파일, non-standard 경로로 emit하는 custom build step)에서.

**특정 파일에 대한 감지를 억제하려면**, [advanced-config.md](advanced-config.md)에서 가능한 `.claudeos-scan.json` override 참고.

**validator가 일반적으로 (자기 프로젝트뿐 아니라) 잘못이라면**, [issue를 열어주세요](https://github.com/claudeos-core/claudeos-core/issues) — 이 검사들은 실제 보고서를 기반으로 시간을 두고 튜닝됩니다.

---

## See also

- [architecture.md](architecture.md) — 파이프라인에서 validator의 위치
- [commands.md](commands.md) — `lint`와 `health` 명령 reference
- [troubleshooting.md](troubleshooting.md) — 특정 validator 에러의 의미
