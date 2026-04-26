# Troubleshooting

흔한 에러와 fix 방법. 여기 없는 문제는 [issue를 열어](https://github.com/claudeos-core/claudeos-core/issues) 재현 단계와 함께 보고하세요.

> 영문 원본: [docs/troubleshooting.md](../troubleshooting.md).

---

## 설치 이슈

### "Command not found: claudeos-core"

전역 설치를 안 했거나, npm의 전역 bin이 PATH에 없음.

**Option A — `npx` 사용 (권장, 설치 불필요):**
```bash
npx claudeos-core init
```

**Option B — 전역 설치:**
```bash
npm install -g claudeos-core
claudeos-core init
```

npm-installed인데 여전히 "command not found"이면 PATH 확인:
```bash
npm config get prefix
# 이 prefix 아래의 bin/ 디렉토리가 PATH에 있는지 확인
```

### "Cannot find module 'glob'" 또는 비슷한 에러

프로젝트 루트가 아닌 곳에서 ClaudeOS-Core를 실행 중. 둘 중 하나:

1. 프로젝트로 `cd`.
2. `npx claudeos-core init` 사용 (어디서든 작동).

### "Node.js version not supported"

ClaudeOS-Core는 Node.js 18+ 필요. 버전 확인:

```bash
node --version
```

[nvm](https://github.com/nvm-sh/nvm), [fnm](https://github.com/Schniz/fnm), 또는 OS 패키지 매니저로 업그레이드.

---

## Pre-flight 검사

### "Claude Code not found"

ClaudeOS-Core는 로컬 Claude Code 설치를 사용. 먼저 설치:

- [공식 설치 가이드](https://docs.anthropic.com/en/docs/claude-code)
- 확인: `claude --version`

`claude`가 설치됐지만 PATH에 없으면 shell의 PATH 수정 — override env 변수 없음.

### "Could not detect stack"

scanner가 프로젝트 framework를 식별 못 함. 원인:

- 프로젝트 루트에 `package.json` / `pom.xml` / `build.gradle` / `pyproject.toml` 없음.
- 스택이 [12개 지원 스택](stacks.md)에 없음.
- 자동 감지 규칙과 매치되지 않는 custom layout.

**Fix:** 프로젝트 루트에 인식되는 파일 중 하나가 있는지 확인. 스택은 지원되지만 layout이 비표준이라면 [advanced-config.md](advanced-config.md)에서 `.claudeos-scan.json` override 참고.

### "Authentication test failed"

`init`은 Claude Code 인증을 확인하기 위해 빠른 `claude -p "echo ok"`를 실행. 실패하면:

```bash
claude --version           # 버전 출력해야 함
claude -p "say hi"         # 응답 출력해야 함
```

`-p`가 인증 에러를 반환하면 Claude Code의 인증 흐름을 따르세요. ClaudeOS-Core가 사용자 대신 Claude 인증을 고칠 수 없습니다.

---

## Init 런타임 이슈

### Init이 hang하거나 오래 걸림

큰 프로젝트의 Pass 1은 시간이 좀 걸립니다. 진단:

1. **Claude Code가 작동하나?** 다른 터미널에서 `claude --version` 실행.
2. **네트워크가 OK인가?** 각 pass가 Claude Code를 호출, Claude Code가 Anthropic API 호출.
3. **프로젝트가 매우 큰가?** Domain group splitting이 자동 적용 (그룹당 4 도메인 / 40 파일), 24-도메인 프로젝트는 Pass 1을 6번 실행.

오랜 시간 동안 출력이 없으면 (progress ticker 진행 없음), kill (Ctrl-C) 후 resume:

```bash
npx claudeos-core init   # 마지막으로 완료된 pass marker부터 resume
```

resume 메커니즘은 완료되지 않은 pass만 재실행.

### Claude의 "Prompt is too long" 에러

Pass 3가 context window를 넘쳤다는 뜻. 도구가 이미 적용하는 mitigation:

- **Pass 3 split mode** (3a → 3b-core → 3b-N → 3c-core → 3c-N → 3d-aux) — 자동.
- **Domain group splitting** — 그룹당 도메인 > 4 또는 파일 > 40일 때 자동 적용.
- **Batch sub-division** — ≥16 도메인일 때 3b/3c가 ≤15 도메인 batch로 sub-divide.

이래도 context 한계에 부딪히면 프로젝트가 예외적으로 큰 것입니다. 현재 옵션:

1. 프로젝트를 별도 디렉토리로 split하고 각각에서 `init` 실행.
2. `.claudeos-scan.json`을 통한 공격적 `frontendScan.platformKeywords` override로 비필수 subapp skip.
3. [issue 열기](https://github.com/claudeos-core/claudeos-core/issues) — 사용자의 케이스에 새 override가 필요할 수 있음.

자동 적용된 것 이상으로 "더 공격적 splitting을 강제"하는 flag는 없음.

### Init이 도중에 실패

도구는 **resume-safe**. 그냥 재실행:

```bash
npx claudeos-core init
```

마지막으로 완료된 pass marker부터 이어 감. 작업 손실 없음.

깨끗한 slate를 원하면 (모든 marker 삭제 후 모두 재생성) `--force` 사용:

```bash
npx claudeos-core init --force
```

주의: `--force`는 `.claude/rules/`에의 수동 편집을 삭제. [safety.md](safety.md) 참고.

### Windows: "EBUSY" 또는 파일 잠금 에러

Windows 파일 잠금이 Unix보다 엄격. 원인:

- 안티바이러스가 쓰기 도중 파일 스캔.
- IDE가 파일을 exclusive 잠금으로 열고 있음.
- 이전 `init`이 충돌하여 stale handle 남김.

Fix (순서대로 시도):

1. IDE 닫기, retry.
2. 프로젝트 폴더에 안티바이러스 real-time scan 끄기 (또는 프로젝트 경로 화이트리스트).
3. Windows 재시작 (stale handle 정리).
4. 지속되면 WSL2에서 실행.

`lib/staged-rules.js` 이동 로직은 `renameSync`에서 `copyFileSync + unlinkSync`로 fallback하여 대부분의 안티바이러스 간섭을 자동 처리. 여전히 잠금 에러가 나면 staged 파일이 inspection을 위해 `claudeos-core/generated/.staged-rules/`에 남음 — `init` 재실행하여 이동 retry.

### Cross-volume rename 실패 (Linux/macOS)

`init`이 mount point를 가로질러 atomically rename해야 할 수 있음 (예: 다른 디스크의 `/tmp`에서 프로젝트로). 도구가 자동으로 copy-then-delete로 fallback — 액션 불필요.

지속되는 이동 실패가 보이면 `claudeos-core/generated/.staged-rules/`와 `.claude/rules/` 모두에 쓰기 권한이 있는지 확인.

---

## 검증 이슈

### "STALE_PATH: file does not exist"

standards/skills/guides에 언급된 경로가 실제 파일로 resolve 안 됨. 원인:

- Pass 3가 경로 hallucination (예: parent dir + TypeScript 상수명에서 만들어진 `featureRoutePath.ts`).
- 파일을 삭제했지만 docs가 여전히 참조.
- 파일이 gitignore됐지만 scanner의 allowlist에 있었음.

**Fix:**

```bash
npx claudeos-core init --force
```

이는 새 allowlist로 Pass 3 / 4를 재생성.

경로가 의도적으로 gitignore이고 scanner가 무시하길 원하면 [advanced-config.md](advanced-config.md)에서 `.claudeos-scan.json`이 실제 지원하는 것 (지원 필드 set은 작음) 참고.

`--force`가 고치지 않으면 (재실행이 드문 LLM seed에서 같은 hallucination을 재트리거할 수 있음) 문제가 되는 파일을 hand로 편집해서 잘못된 경로 제거. validator가 **advisory** tier로 실행하므로 CI를 차단하지 않음 — ship하고 나중에 fix 가능.

### "MANIFEST_DRIFT: registered skill not in CLAUDE.md"

`claudeos-core/skills/00.shared/MANIFEST.md`에 등록된 skills는 CLAUDE.md 어딘가에 언급돼야 함. validator는 **orchestrator/sub-skill 예외**를 가짐 — sub-skill은 orchestrator가 언급되면 cover된 것으로 간주.

**Fix:** sub-skill의 orchestrator가 정말 CLAUDE.md에 언급되지 않았다면 `init --force`로 재생성. orchestrator가 언급됐는데 validator가 여전히 표시한다면 validator 버그 — [issue를 열어](https://github.com/claudeos-core/claudeos-core/issues) 파일 경로와 함께 알려주세요.

### "Section 8 has wrong number of H4 sub-sections"

`claude-md-validator`는 Section 8 아래 정확히 2개 `####` heading 요구 (L4 Memory Files / Memory Workflow).

가능한 원인:

- CLAUDE.md를 수동 편집해서 Section 8 구조를 깸.
- pre-v2.3.0 Pass 4가 실행되어 Section 9를 append.
- pre-v2.2.0에서 업그레이드 (8-section scaffold가 아직 강제 안 됨).

**Fix:**

```bash
npx claudeos-core init --force
```

이는 CLAUDE.md를 깨끗하게 재생성. memory 파일은 `--force`에서 보존됨 (생성된 파일만 덮어씀).

### "T1: section heading missing English canonical token"

각 `## N.` section heading은 영문 canonical token을 포함해야 함 (예: `## 1. Role Definition` 또는 `## 1. 역할 정의 (Role Definition)`). 이는 `--lang`과 무관하게 multi-repo grep을 작동시키기 위해.

**Fix:** heading을 편집하여 영문 token을 괄호로 추가하거나, `init --force`로 재생성 (v2.3.0+ scaffold가 이 컨벤션을 자동 강제).

---

## Memory layer 이슈

### "Memory file growing too large"

compaction 실행:

```bash
npx claudeos-core memory compact
```

이는 4-stage compaction 알고리즘 적용. 각 stage가 무엇을 하는지는 [memory-layer.md](memory-layer.md) 참고.

### "propose-rules가 동의할 수 없는 rules를 제안"

출력은 검토용 draft이지 자동 적용 아님. 원치 않는 것은 그냥 거부:

- `claudeos-core/memory/auto-rule-update.md`를 직접 편집하여 거부 제안 제거.
- 또는 apply step을 완전히 skip — 제안된 콘텐츠를 rule 파일에 수동 복사하지 않으면 `.claude/rules/`는 변경되지 않음.

### `memory <subcommand>`가 "not found"라 함

memory 파일이 없음. `init`의 Pass 4가 만듦. 삭제됐다면:

```bash
npx claudeos-core init --force
```

또는 모든 것을 재실행하지 않고 memory 파일만 재생성하고 싶다면, 도구에 single-pass-replay 명령이 없습니다. `--force`가 답.

---

## CI 이슈

### 로컬에선 테스트가 통과하는데 CI에선 실패

가능한 이유:

1. **CI에 `claude`가 설치되지 않음.** 번역 의존 테스트는 `CLAUDEOS_SKIP_TRANSLATION=1`로 bail out. 공식 CI workflow가 이 env var를 설정; fork에서 안 한다면 설정.

2. **Path 정규화 (Windows).** 코드베이스가 Windows 백슬래시를 forward slash로 여러 곳에서 정규화하지만 미묘한 차이로 테스트가 trip할 수 있음. 공식 CI는 Windows + Linux + macOS에서 실행하므로 대부분 이슈를 잡음 — Windows 특정 실패가 보이면 진짜 버그일 수 있음.

3. **Node 버전.** 테스트는 Node 18 + 20에서 실행. Node 16 또는 22라면 호환성 문제 가능 — CI 일치를 위해 18 또는 20에 pin.

### CI에서 `health`가 0으로 종료하지만 non-zero를 기대했을 때

`health`는 **fail**-tier 발견에만 non-zero로 종료. **warn**과 **advisory**는 print되지만 차단 안 함.

advisory에서 실패하길 원하면 (예: `STALE_PATH`에 대해 strict하게) 빌트인 flag 없음 — 출력을 grep해서 종료해야 함:

```bash
npx claudeos-core health > health.log
if grep -q "advisory" health.log; then exit 1; fi
```

---

## 도움 받기

위 어느 것도 맞지 않으면:

1. **정확한 에러 메시지 캡처.** ClaudeOS-Core 에러는 파일 경로와 식별자 포함 — 이는 재현에 도움.
2. **issue 트래커 확인:** [GitHub Issues](https://github.com/claudeos-core/claudeos-core/issues) — 이슈가 이미 보고됐을 수 있음.
3. **새 issue 열기**, 다음과 함께: OS, Node 버전, Claude Code 버전 (`claude --version`), 프로젝트 스택, 에러 출력. 가능하면 `claudeos-core/generated/project-analysis.json` 포함 (sensitive vars는 자동 마스킹).

보안 이슈는 [SECURITY.md](../../SECURITY.md) 참고 — 취약점 관련 public issue를 열지 마세요.

---

## See also

- [safety.md](safety.md) — `--force`가 무엇을 하고 무엇을 보존하는지
- [verification.md](verification.md) — validator 발견의 의미
- [advanced-config.md](advanced-config.md) — `.claudeos-scan.json` override
