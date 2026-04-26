# CLI 명령

ClaudeOS-Core가 실제로 지원하는 모든 명령, 모든 flag, 모든 exit code.

이 페이지는 reference입니다. 처음이라면 [메인 README의 Quick Start](../../README.ko.md#quick-start)를 먼저 읽으세요.

모든 명령은 `npx claudeos-core <command>`로 실행 (전역 설치 시 `claudeos-core <command>` — [manual-installation.md](manual-installation.md) 참고).

> 영문 원본: [docs/commands.md](../commands.md).

---

## Global flags

모든 명령에 적용:

| Flag | 효과 |
|---|---|
| `--help` / `-h` | help 표시. 명령 뒤에 위치할 때 (예: `memory --help`)는 sub-command가 자체 help 처리. |
| `--version` / `-v` | 설치된 버전 출력. |
| `--lang <code>` | 출력 언어. `en`, `ko`, `ja`, `zh-CN`, `es`, `vi`, `hi`, `ru`, `fr`, `de` 중 하나. 기본값: `en`. 현재 `init`에서만 사용. |
| `--force` / `-f` | resume prompt skip; 이전 결과 삭제. 현재 `init`에서만 사용. |

이게 CLI flag의 전체 list입니다. **`--json`, `--strict`, `--quiet`, `--verbose`, `--dry-run` 등 없습니다.** 옛 docs에서 봤다면 그건 실제가 아닙니다 — `bin/cli.js`는 위 4개 flag만 파싱합니다.

---

## Quick reference

| Command | 사용 시점 |
|---|---|
| `init` | 프로젝트에 처음. 모든 것 생성. |
| `lint` | 수동으로 `CLAUDE.md` 편집한 뒤. 구조 검증 실행. |
| `health` | commit 전 또는 CI에서. 4개 content/path validator 실행. |
| `restore` | 저장된 plan → disk. (v2.1.0부터 대부분 no-op; 하위 호환용 유지.) |
| `refresh` | Disk → 저장된 plan. (v2.1.0부터 대부분 no-op; 하위 호환용 유지.) |
| `validate` | plan-validator의 `--check` mode 실행. (v2.1.0부터 대부분 no-op.) |
| `memory <sub>` | Memory layer 유지보수: `compact`, `score`, `propose-rules`. |

`restore` / `refresh` / `validate`는 legacy plan 파일을 사용하지 않는 프로젝트에서 무해하므로 유지됩니다. `plan/`이 없으면 (v2.1.0+ 기본) 모두 informational message로 skip합니다.

---

## `init` — Documentation set 생성

```bash
npx claudeos-core init [--lang <code>] [--force]
```

메인 명령. [4-pass 파이프라인](architecture.md)을 끝까지 실행:

1. Scanner가 `project-analysis.json` 생성.
2. Pass 1이 각 도메인 그룹 분석.
3. Pass 2가 도메인을 프로젝트 전체 그림으로 병합.
4. Pass 3가 CLAUDE.md, rules, standards, skills, guides 생성.
5. Pass 4가 memory layer scaffold.

**예시:**

```bash
# 처음, 영어 출력
npx claudeos-core init

# 처음, 한국어 출력
npx claudeos-core init --lang ko

# 처음부터 모두 다시 생성
npx claudeos-core init --force
```

### Resume safety

`init`은 **resume-safe**. 중단되면 (네트워크 끊김, 타임아웃, Ctrl-C), 다음 실행이 마지막으로 완료된 pass marker부터 이어 갑니다. Marker는 `claudeos-core/generated/`에 위치:

- `pass1-<group>.json` — 도메인별 Pass 1 출력
- `pass2-merged.json` — Pass 2 출력
- `pass3-complete.json` — Pass 3 marker (split mode의 어떤 sub-stage가 완료됐는지도 추적)
- `pass4-memory.json` — Pass 4 marker

Marker가 malformed이면 (예: 쓰기 도중 충돌로 `{"error":"timeout"}`이 남음), validator가 거부하고 pass가 재실행.

부분 Pass 3 (split mode가 stage 사이에서 중단)는 resume 메커니즘이 marker body를 검사 — `mode === "split"`이고 `completedAt`이 없으면 Pass 3가 다시 호출되어 다음 미완 stage부터 재개.

### `--force`가 하는 일

`--force`는 다음을 삭제:
- `claudeos-core/generated/` 아래의 모든 `.json`과 `.md` (4개 pass marker 포함)
- 이전 실행이 move 도중 충돌해서 남은 `claudeos-core/generated/.staged-rules/` 디렉토리
- `.claude/rules/` 아래의 모든 것 (Pass 3의 "zero-rules detection" guard가 stale rules에 false-negative하지 않도록)

`--force`가 **삭제하지 않는 것**:
- `claudeos-core/memory/` 파일 (decision log와 failure pattern은 보존)
- `claudeos-core/`와 `.claude/` 외부의 파일

**Rules에 대한 수동 편집은 `--force`로 손실됩니다.** 그것이 trade-off — `--force`는 "깔끔한 slate를 원한다"용. 편집을 보존하려면 `--force` 없이 재실행하세요.

### Interactive vs non-interactive

`--lang` 없이 `init`은 interactive 언어 선택기를 표시 (10개 옵션, 화살표 키 또는 숫자 입력). non-TTY 환경 (CI, piped input)에서는 selector가 readline으로 fallback, input이 없으면 non-interactive 기본값으로 fallback.

`--force` 없이 기존 pass marker가 감지되면 `init`은 Continue / Fresh prompt를 표시. `--force`를 전달하면 이 prompt를 완전히 skip.

---

## `lint` — `CLAUDE.md` 구조 검증

```bash
npx claudeos-core lint
```

프로젝트의 `CLAUDE.md`에 대해 `claude-md-validator`를 실행. 빠름 — LLM 호출 없음, 구조 검사만.

**Exit code:**
- `0` — 통과.
- `1` — 실패. 적어도 한 개의 구조 이슈.

**검사 내용** (전체 check ID list는 [verification.md](verification.md) 참고):

- Section 수는 정확히 8.
- Section 4는 H3 sub-section 3개 또는 4개.
- Section 6은 H3 sub-section 정확히 3개.
- Section 8은 H3 sub-section 정확히 2개 (Common Rules + L4 Memory) AND H4 sub-sub-section 정확히 2개 (L4 Memory Files + Memory Workflow).
- 각 canonical section heading은 영문 token (예: `Role Definition`, `Memory`)을 포함해야 함 — `--lang`과 무관하게 multi-repo grep이 작동하도록.
- 4개 memory 파일이 정확히 ONE markdown table row에, Section 8에 한정되어 등장.

validator는 **language-invariant**: `--lang ko`, `--lang ja`, 또는 다른 지원 언어로 생성된 CLAUDE.md에 같은 검사가 작동.

pre-commit hook과 CI에 적합.

---

## `health` — 검증 suite 실행

```bash
npx claudeos-core health
```

**4개 validator**를 오케스트레이션 (claude-md-validator는 `lint`로 별도 실행):

| 순서 | Validator | Tier | 실패 시 |
|---|---|---|---|
| 1 | `manifest-generator` (prerequisite) | — | 실패하면 `sync-checker` skip. |
| 2 | `plan-validator` | fail | Exit 1. |
| 3 | `sync-checker` | fail | Exit 1 (manifest 성공 시). |
| 4 | `content-validator` | advisory | 노출되지만 차단 안 함. |
| 5 | `pass-json-validator` | warn | 노출되지만 차단 안 함. |

**Exit code:**
- `0` — `fail`-tier 발견 없음. warning과 advisory는 있을 수 있음.
- `1` — 적어도 한 개의 `fail`-tier 발견.

3-tier severity (fail / warn / advisory)는 `content-validator` 발견 (비표준 layout에서 흔히 false positive)이 CI 파이프라인을 deadlock하지 않도록 추가됨.

각 validator의 검사 상세는 [verification.md](verification.md) 참고.

---

## `restore` — 저장된 plan을 disk에 적용 (legacy)

```bash
npx claudeos-core restore
```

`plan-validator`를 `--execute` mode로 실행: `claudeos-core/plan/*.md` 파일에서 명시한 위치로 콘텐츠 복사.

**v2.1.0 상태:** Master plan 생성이 제거됐습니다. `claudeos-core/plan/`은 더 이상 자동 생성되지 않습니다. `plan/`이 없으면 이 명령은 informational message를 log하고 깨끗하게 종료.

ad-hoc backup/restore 목적으로 plan 파일을 hand-maintain하는 사용자를 위해 유지. v2.1.0+ 프로젝트에서 실행해도 무해.

덮어쓰는 모든 파일에 `.bak` 백업 생성.

---

## `refresh` — Disk → 저장된 plan 동기화 (legacy)

```bash
npx claudeos-core refresh
```

`restore`의 inverse. `plan-validator`를 `--refresh` mode로 실행: 현재 disk 파일 상태를 읽고 `claudeos-core/plan/*.md`를 매치되도록 업데이트.

**v2.1.0 상태:** `restore`와 동일 — `plan/`이 없으면 no-op.

---

## `validate` — Plan ↔ disk diff (legacy)

```bash
npx claudeos-core validate
```

`plan-validator`를 `--check` mode로 실행: `claudeos-core/plan/*.md`와 disk 간 차이를 보고하지만 아무것도 수정하지 않음.

**v2.1.0 상태:** `plan/`이 없으면 no-op. 대부분 사용자는 `health`를 실행해야 함 — 그게 다른 validator와 함께 `plan-validator`도 호출.

---

## `memory <subcommand>` — Memory layer 유지보수

```bash
npx claudeos-core memory <subcommand>
```

3개 subcommand. subcommand는 `init`의 Pass 4가 작성한 `claudeos-core/memory/` 파일에 작용. 그 파일이 없으면 각 subcommand가 `not found`를 log하고 깨끗하게 skip (best-effort tool).

memory 모델 상세는 [memory-layer.md](memory-layer.md) 참고.

### `memory compact`

```bash
npx claudeos-core memory compact
```

`decision-log.md`와 `failure-patterns.md`에 4-stage compaction 적용:

| Stage | Trigger | Action |
|---|---|---|
| 1 | `lastSeen > 30 days` AND not preserved | 본문이 1줄짜리 "fix" + meta로 축소 |
| 2 | 중복 heading | 병합 (frequency 합산, 본문 = 가장 최근) |
| 3 | `importance < 3` AND `lastSeen > 60 days` | 삭제 |
| 4 | 파일 > 400 라인 | 가장 오래된 non-preserved 항목 trim |

`importance >= 7`, `lastSeen < 30 days`, 또는 본문이 구체적 (non-glob) 활성 rule 경로를 참조하는 항목은 자동 보존.

compaction 후 `compaction.md`의 `## Last Compaction` section만 교체 — 나머지 (수동 노트)는 보존.

### `memory score`

```bash
npx claudeos-core memory score
```

`failure-patterns.md` 항목의 importance 점수 재계산:

```
importance = round(frequency × 1.5 + recency × 5), 10에서 cap
```

기존 importance line을 모두 제거한 뒤 삽입 (중복-line regression 방지). 새 점수가 항목 본문에 다시 기록.

### `memory propose-rules`

```bash
npx claudeos-core memory propose-rules
```

`failure-patterns.md`를 읽고 frequency ≥ 3인 항목을 골라 Claude에게 상위 후보용 `.claude/rules/` 콘텐츠 draft를 요청.

후보당 confidence:
```
evidence    = 1.5 × frequency + 0.5 × importance   (importance 기본 0; importance 누락 시 6에서 cap)
confidence  = sigmoid_{k=0.35, x0=8}(evidence) × (anchored ? 1.0 : 0.6)
```

(`anchored` = 항목이 disk에 존재하는 구체적 파일 경로를 언급함.)

출력은 검토를 위해 **`claudeos-core/memory/auto-rule-update.md`에 append**됩니다. **자동 적용 안 함** — 어떤 제안을 실제 rule 파일에 복사할지 사용자가 결정.

---

## 환경 변수

| 변수 | 효과 |
|---|---|
| `CLAUDEOS_SKIP_TRANSLATION=1` | memory-scaffold 번역 경로를 short-circuit; `claude -p` 호출 전에 throw. CI와 번역 의존 테스트가 실제 Claude CLI 설치 없이 실행되도록 사용. 엄격한 `=== "1"` 의미 — 다른 값은 활성화 안 됨. |
| `CLAUDEOS_ROOT` | `bin/cli.js`가 사용자 프로젝트 루트로 자동 설정. Internal — override 금지. |

이게 전체 list입니다. `CLAUDE_PATH`, `DEBUG=claudeos:*`, `CLAUDEOS_NO_COLOR` 등은 존재하지 않습니다.

---

## Exit code

| Code | 의미 |
|---|---|
| `0` | 성공. |
| `1` | 검증 실패 (`fail`-tier 발견) 또는 `InitError` (예: prerequisite 누락, malformed marker, 파일 잠금). |
| 그 외 | 하위 Node 프로세스나 sub-tool에서 bubble up — 처리되지 않은 exception, 쓰기 에러 등. |

"interrupted"용 특별 exit code 없음 — Ctrl-C는 그냥 프로세스 종료. `init`을 재실행하면 resume 메커니즘이 작동.

---

## `npm test`가 실행하는 것 (기여자용)

repo를 clone해서 로컬에서 테스트 suite를 실행하려면:

```bash
npm test
```

이는 33개 test 파일에 걸쳐 `node tests/*.test.js`를 실행. test suite는 Node 빌트인 `node:test` runner를 사용 (Jest, Mocha 없음) + Node의 `node:assert/strict`.

단일 test 파일:

```bash
node tests/scan-java.test.js
```

CI는 Linux / macOS / Windows × Node 18 / 20에서 suite를 실행. CI workflow는 `CLAUDEOS_SKIP_TRANSLATION=1`을 설정 — 번역 의존 테스트가 `claude` CLI를 필요로 하지 않도록.

---

## See also

- [architecture.md](architecture.md) — `init`이 내부적으로 하는 일
- [verification.md](verification.md) — validator가 검사하는 것
- [memory-layer.md](memory-layer.md) — `memory` subcommand가 작용하는 대상
- [troubleshooting.md](troubleshooting.md) — 명령 실패 시
