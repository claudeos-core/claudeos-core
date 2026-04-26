# CLI 명령

ClaudeOS-Core가 실제로 지원하는 모든 명령, flag, exit code를 정리한 reference입니다.

처음이라면 [메인 README의 Quick Start](../../README.ko.md#quick-start)부터 읽어 보세요.

모든 명령은 `npx claudeos-core <command>`로 실행합니다. 전역 설치한 경우에는 `claudeos-core <command>` 형태로도 쓸 수 있습니다 ([manual-installation.md](manual-installation.md) 참고).

> 영문 원본: [docs/commands.md](../commands.md).

---

## Global flags

모든 명령에 공통으로 적용됩니다:

| Flag | 효과 |
|---|---|
| `--help` / `-h` | help 표시. 명령 뒤에 오면(예: `memory --help`) sub-command가 자체 help를 처리. |
| `--version` / `-v` | 설치된 버전 출력. |
| `--lang <code>` | 출력 언어. `en`, `ko`, `ja`, `zh-CN`, `es`, `vi`, `hi`, `ru`, `fr`, `de` 중 하나. 기본값은 `en`. 현재는 `init`에서만 사용. |
| `--force` / `-f` | resume prompt를 건너뛰고 이전 결과를 삭제. 현재는 `init`에서만 사용. |

CLI flag는 이게 전부입니다. **`--json`, `--strict`, `--quiet`, `--verbose`, `--dry-run` 같은 옵션은 없습니다.** 옛 문서에서 보셨다면 실제로 있는 게 아닙니다. `bin/cli.js`가 파싱하는 건 위 4개뿐입니다.

---

## Quick reference

| Command | 언제 쓰나 |
|---|---|
| `init` | 프로젝트에서 처음 실행. 모든 것을 생성. |
| `lint` | `CLAUDE.md`를 직접 편집한 뒤 구조 검증. |
| `health` | commit 전 또는 CI에서 4개 content/path validator를 실행. |
| `restore` | 저장된 plan → disk. (v2.1.0부터는 대부분 no-op이지만 하위 호환을 위해 유지.) |
| `refresh` | disk → 저장된 plan. (v2.1.0부터는 대부분 no-op이지만 하위 호환을 위해 유지.) |
| `validate` | plan-validator를 `--check` 모드로 실행. (v2.1.0부터는 대부분 no-op.) |
| `memory <sub>` | Memory layer 유지보수: `compact`, `score`, `propose-rules`. |

`restore` / `refresh` / `validate`는 legacy plan 파일을 쓰지 않는 프로젝트에서도 무해하기 때문에 그대로 남겨 뒀습니다. `plan/`이 없으면(v2.1.0+ 기본 상태) 모두 informational 메시지를 출력하고 건너뜁니다.

---

## `init` — 문서 세트 생성

```bash
npx claudeos-core init [--lang <code>] [--force]
```

메인 명령으로, [4-pass 파이프라인](architecture.md)을 끝까지 실행합니다:

1. Scanner가 `project-analysis.json`을 만듭니다.
2. Pass 1이 도메인 그룹별로 분석합니다.
3. Pass 2가 도메인을 프로젝트 전체 그림으로 합칩니다.
4. Pass 3가 CLAUDE.md, rules, standards, skills, guides를 만듭니다.
5. Pass 4가 memory layer를 scaffold합니다.

**예시:**

```bash
# 처음 실행, 영어 출력
npx claudeos-core init

# 처음 실행, 한국어 출력
npx claudeos-core init --lang ko

# 처음부터 모두 다시 생성
npx claudeos-core init --force
```

### Resume safety

`init`은 **resume-safe**합니다. 네트워크가 끊기거나 타임아웃, Ctrl-C로 중단되어도 다음 실행이 마지막으로 완료된 pass marker부터 이어서 갑니다. Marker는 `claudeos-core/generated/`에 자리잡고 있습니다:

- `pass1-<group>.json` — 도메인별 Pass 1 출력
- `pass2-merged.json` — Pass 2 출력
- `pass3-complete.json` — Pass 3 marker (split 모드에서 어떤 sub-stage까지 끝났는지도 함께 추적)
- `pass4-memory.json` — Pass 4 marker

Marker가 깨져 있으면(예: 쓰기 도중 충돌로 `{"error":"timeout"}`만 남은 경우) validator가 거부하고 해당 pass를 다시 실행합니다.

Pass 3가 split 모드 stage 사이에서 중단된 부분 완료 상태라면 resume 메커니즘이 marker 본문을 살펴봅니다. `mode === "split"`이고 `completedAt`이 없으면 Pass 3를 다시 호출해 미완 stage부터 이어서 진행합니다.

### `--force`가 하는 일

`--force`는 다음을 삭제합니다:
- `claudeos-core/generated/` 아래의 모든 `.json`과 `.md` (pass marker 4개 포함)
- 이전 실행이 move 도중 충돌해 남은 `claudeos-core/generated/.staged-rules/` 디렉토리
- `.claude/rules/` 아래의 모든 것. Pass 3의 "zero-rules detection" guard가 오래된 rule에 속아 false-negative를 내지 않도록 하기 위해서입니다.

반대로 `--force`가 **건드리지 않는 것**은 다음과 같습니다:
- `claudeos-core/memory/` 파일 (decision log와 failure pattern은 보존)
- `claudeos-core/`와 `.claude/` 바깥의 파일

**Rule에 손으로 한 편집은 `--force`로 사라집니다.** 그게 트레이드오프입니다. `--force`는 "깔끔하게 새로 시작하고 싶다"는 용도이기 때문입니다. 편집을 유지하려면 `--force` 없이 재실행하세요.

### Interactive vs non-interactive

`--lang`을 주지 않고 `init`을 실행하면 인터랙티브 언어 선택기가 뜹니다 (10개 옵션, 화살표 키 또는 숫자 입력). non-TTY 환경(CI, piped input)에서는 selector가 readline으로 fallback하며, 입력이 아예 없으면 non-interactive 기본값으로 fallback합니다.

`--force` 없이 기존 pass marker가 감지되면 `init`은 Continue / Fresh prompt를 띄웁니다. `--force`를 주면 이 prompt를 통째로 건너뜁니다.

---

## `lint` — `CLAUDE.md` 구조 검증

```bash
npx claudeos-core lint
```

프로젝트의 `CLAUDE.md`에 `claude-md-validator`를 돌립니다. LLM 호출 없이 구조만 검사하기 때문에 빠릅니다.

**Exit code:**
- `0` — 통과.
- `1` — 실패. 구조 이슈가 한 개 이상 있을 때.

**검사 내용** (전체 check ID 목록은 [verification.md](verification.md) 참고):

- Section 수는 정확히 8개.
- Section 4의 H3 sub-section은 3개 또는 4개.
- Section 6의 H3 sub-section은 정확히 3개.
- Section 8의 H3 sub-section은 정확히 2개(Common Rules + L4 Memory)이고, H4 sub-sub-section도 정확히 2개(L4 Memory Files + Memory Workflow).
- 각 canonical section heading에 영문 토큰(예: `Role Definition`, `Memory`)이 들어 있어야 합니다. `--lang`이 무엇이든 multi-repo grep이 동작하도록 하기 위해서입니다.
- 4개의 memory 파일이 markdown table row 하나에만 등장하고, 그 위치는 Section 8 안이어야 합니다.

validator는 **language-invariant**합니다. `--lang ko`, `--lang ja`, 그 외 어떤 지원 언어로 생성한 CLAUDE.md에서도 같은 검사가 적용됩니다.

pre-commit hook이나 CI에 그대로 쓸 수 있습니다.

---

## `health` — 검증 suite 실행

```bash
npx claudeos-core health
```

**4개 validator**를 묶어서 실행합니다 (claude-md-validator는 `lint`에서 따로 실행):

| 순서 | Validator | Tier | 실패 시 |
|---|---|---|---|
| 1 | `manifest-generator` (prerequisite) | — | 실패하면 `sync-checker`를 건너뜀. |
| 2 | `plan-validator` | fail | Exit 1. |
| 3 | `sync-checker` | fail | Exit 1 (manifest가 성공한 경우). |
| 4 | `content-validator` | advisory | 표시는 하되 차단하지 않음. |
| 5 | `pass-json-validator` | warn | 표시는 하되 차단하지 않음. |

**Exit code:**
- `0` — `fail` tier 발견 없음. warning이나 advisory는 있을 수 있습니다.
- `1` — `fail` tier 발견이 한 개 이상.

3-tier severity (fail / warn / advisory)를 도입한 이유는 `content-validator`의 발견(비표준 layout에서 false positive가 자주 발생)이 CI 파이프라인을 막아 세우지 않도록 하기 위해서입니다.

각 validator의 상세 검사 항목은 [verification.md](verification.md) 참고.

---

## `restore` — 저장된 plan을 disk에 적용 (legacy)

```bash
npx claudeos-core restore
```

`plan-validator`를 `--execute` 모드로 실행해서, `claudeos-core/plan/*.md` 파일에 명시된 위치로 콘텐츠를 복사합니다.

**v2.1.0 상태:** master plan 생성이 제거됐습니다. `claudeos-core/plan/`은 더 이상 자동 생성되지 않습니다. `plan/`이 없으면 이 명령은 informational 메시지만 로그로 남기고 깔끔하게 종료합니다.

ad-hoc 백업/복구 용도로 plan 파일을 직접 관리하는 사용자를 위해 남겨 둔 명령으로, v2.1.0+ 프로젝트에서 실행해도 무해합니다.

덮어쓰는 모든 파일에는 `.bak` 백업이 생성됩니다.

---

## `refresh` — disk → 저장된 plan 동기화 (legacy)

```bash
npx claudeos-core refresh
```

`restore`의 반대 방향입니다. `plan-validator`를 `--refresh` 모드로 실행해, 현재 disk 파일 상태를 읽고 `claudeos-core/plan/*.md`를 그에 맞춰 업데이트합니다.

**v2.1.0 상태:** `restore`와 동일하게 `plan/`이 없으면 no-op.

---

## `validate` — plan ↔ disk diff (legacy)

```bash
npx claudeos-core validate
```

`plan-validator`를 `--check` 모드로 실행해서 `claudeos-core/plan/*.md`와 disk 사이의 차이를 보고만 합니다. 아무것도 수정하지 않습니다.

**v2.1.0 상태:** `plan/`이 없으면 no-op. 대부분의 경우에는 `health`를 실행하는 편이 낫습니다. `health`가 다른 validator와 함께 `plan-validator`도 같이 호출하기 때문입니다.

---

## `memory <subcommand>` — Memory layer 유지보수

```bash
npx claudeos-core memory <subcommand>
```

서브 커맨드는 3개입니다. 서브 커맨드는 `init`의 Pass 4가 작성한 `claudeos-core/memory/` 파일에 작용합니다. 해당 파일이 없으면 각 서브 커맨드가 `not found`만 로그로 남기고 깔끔하게 건너뜁니다 (best-effort 도구).

memory 모델에 대한 자세한 내용은 [memory-layer.md](memory-layer.md) 참고.

### `memory compact`

```bash
npx claudeos-core memory compact
```

`decision-log.md`와 `failure-patterns.md`에 4단계 compaction을 적용합니다:

| Stage | Trigger | Action |
|---|---|---|
| 1 | `lastSeen > 30 days`이면서 보존 대상이 아닐 때 | 본문을 1줄짜리 "fix" + 메타로 축소 |
| 2 | 중복 heading | 병합 (frequency 합산, 본문은 가장 최근 것) |
| 3 | `importance < 3`이고 `lastSeen > 60 days` | 삭제 |
| 4 | 파일이 400라인 초과 | 가장 오래된 non-preserved 항목을 trim |

`importance >= 7`, `lastSeen < 30 days`, 또는 본문이 활성 rule의 구체적인 경로(non-glob)를 참조하는 항목은 자동으로 보존합니다.

compaction이 끝나면 `compaction.md`에서 `## Last Compaction` section만 교체합니다. 그 외 영역(수동 노트)은 그대로 유지합니다.

### `memory score`

```bash
npx claudeos-core memory score
```

`failure-patterns.md` 항목의 importance 점수를 다시 계산합니다:

```
importance = round(frequency × 1.5 + recency × 5), 최대 10
```

기존 importance 라인을 모두 제거한 뒤 삽입합니다 (중복 라인 regression 방지). 새 점수가 항목 본문에 다시 기록됩니다.

### `memory propose-rules`

```bash
npx claudeos-core memory propose-rules
```

`failure-patterns.md`를 읽어서 frequency ≥ 3인 항목을 추리고, 상위 후보에 대한 `.claude/rules/` 콘텐츠 draft를 Claude에게 요청합니다.

후보별 confidence는 다음과 같이 계산합니다:
```
evidence    = 1.5 × frequency + 0.5 × importance   (importance 기본값은 0; importance가 없으면 최대 6)
confidence  = sigmoid_{k=0.35, x0=8}(evidence) × (anchored ? 1.0 : 0.6)
```

(`anchored`는 해당 항목이 디스크에 실제로 존재하는 구체적인 파일 경로를 언급한다는 뜻입니다.)

출력은 검토용으로 **`claudeos-core/memory/auto-rule-update.md`에 append**됩니다. **자동으로 적용되지 않습니다.** 어떤 제안을 실제 rule 파일에 복사할지는 사용자가 직접 결정합니다.

---

## 환경 변수

| 변수 | 효과 |
|---|---|
| `CLAUDEOS_SKIP_TRANSLATION=1` | memory-scaffold의 번역 경로를 short-circuit합니다. `claude -p` 호출 전에 throw합니다. CI나 번역 의존 테스트를 실제 Claude CLI 설치 없이 돌릴 때 씁니다. 엄밀히 `=== "1"`로 비교하므로 다른 값은 활성화되지 않습니다. |
| `CLAUDEOS_ROOT` | `bin/cli.js`가 사용자 프로젝트 루트로 자동 설정합니다. 내부용이므로 직접 override하지 마세요. |

이게 전부입니다. `CLAUDE_PATH`, `DEBUG=claudeos:*`, `CLAUDEOS_NO_COLOR` 같은 변수는 존재하지 않습니다.

---

## Exit code

| Code | 의미 |
|---|---|
| `0` | 성공. |
| `1` | 검증 실패(`fail` tier 발견) 또는 `InitError`(예: prerequisite 누락, malformed marker, 파일 잠금). |
| 그 외 | 하위 Node 프로세스나 서브 도구에서 그대로 bubble up — 처리되지 않은 exception, 쓰기 에러 등. |

"interrupted" 전용 exit code는 따로 없습니다. Ctrl-C는 그냥 프로세스 종료입니다. `init`을 다시 실행하면 resume 메커니즘이 동작합니다.

---

## `npm test`가 실제로 실행하는 것 (기여자용)

repo를 clone해서 로컬에서 테스트 스위트를 돌리려면:

```bash
npm test
```

이 명령은 33개 테스트 파일에 대해 `node tests/*.test.js`를 실행합니다. 테스트 스위트는 Node 빌트인 `node:test` runner를 사용합니다(Jest나 Mocha 없음). 어서션은 Node의 `node:assert/strict`입니다.

단일 테스트 파일만 돌리고 싶다면:

```bash
node tests/scan-java.test.js
```

CI는 Linux / macOS / Windows × Node 18 / 20 매트릭스에서 스위트를 실행합니다. CI 워크플로는 `CLAUDEOS_SKIP_TRANSLATION=1`을 설정해, 번역 의존 테스트가 `claude` CLI를 필요로 하지 않게 합니다.

---

## See also

- [architecture.md](architecture.md) — `init`이 내부적으로 하는 일
- [verification.md](verification.md) — validator가 검사하는 것
- [memory-layer.md](memory-layer.md) — `memory` 서브 커맨드의 작용 대상
- [troubleshooting.md](troubleshooting.md) — 명령이 실패했을 때
