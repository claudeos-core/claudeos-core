# Troubleshooting

흔히 마주치는 에러와 그 해결 방법을 모았습니다. 여기 없는 문제라면 [issue를 열어](https://github.com/claudeos-core/claudeos-core/issues) 재현 단계와 함께 알려 주세요.

> 영문 원본: [docs/troubleshooting.md](../troubleshooting.md).

---

## 설치 이슈

### "Command not found: claudeos-core"

전역 설치를 하지 않았거나, npm의 전역 bin이 PATH에 들어 있지 않은 경우입니다.

**Option A — `npx` 사용 (권장, 설치 불필요):**
```bash
npx claudeos-core init
```

**Option B — 전역 설치:**
```bash
npm install -g claudeos-core
claudeos-core init
```

전역 설치를 했는데도 "command not found"가 나오면 PATH를 확인하세요:
```bash
npm config get prefix
# 이 prefix 아래의 bin/ 디렉토리가 PATH에 있는지 확인
```

### "Cannot find module 'glob'" 같은 에러

프로젝트 루트가 아닌 곳에서 ClaudeOS-Core를 실행하고 있는 경우입니다. 두 가지 방법이 있습니다:

1. 프로젝트 루트로 `cd`해서 실행합니다.
2. `npx claudeos-core init`을 씁니다 (어디서든 동작합니다).

### "Node.js version not supported"

ClaudeOS-Core는 Node.js 18 이상이 필요합니다. 먼저 버전을 확인하세요:

```bash
node --version
```

업그레이드는 [nvm](https://github.com/nvm-sh/nvm), [fnm](https://github.com/Schniz/fnm), 또는 OS 패키지 매니저로 진행하면 됩니다.

---

## Pre-flight 검사

### "Claude Code not found"

ClaudeOS-Core는 로컬에 설치된 Claude Code를 그대로 사용합니다. 먼저 설치하세요:

- [공식 설치 가이드](https://docs.anthropic.com/en/docs/claude-code)
- 확인: `claude --version`

`claude`가 설치되어 있는데 PATH에 안 잡힌다면 shell의 PATH를 직접 수정하세요. 별도의 override env 변수는 없습니다.

### "Could not detect stack"

scanner가 프로젝트의 framework를 식별하지 못했다는 뜻입니다. 원인은 보통 다음 중 하나입니다:

- 프로젝트 루트에 `package.json` / `pom.xml` / `build.gradle` / `pyproject.toml`이 없습니다.
- 스택이 [12개 지원 스택](stacks.md)에 들어 있지 않습니다.
- 자동 감지 규칙과 맞지 않는 custom layout입니다.

**Fix:** 프로젝트 루트에 위 파일 중 하나가 있는지 확인하세요. 지원되는 스택인데 layout이 비표준이라면 [advanced-config.md](advanced-config.md)의 `.claudeos-scan.json` override를 참고하세요.

### "Authentication test failed"

`init`은 Claude Code 인증을 확인하려고 빠른 `claude -p "echo ok"`를 실행합니다. 이게 실패하면 다음 두 명령으로 직접 점검하세요:

```bash
claude --version           # 버전이 출력돼야 합니다
claude -p "say hi"         # 응답이 출력돼야 합니다
```

`-p`가 인증 에러를 돌려주면 Claude Code의 인증 흐름에 따라 처리하세요. ClaudeOS-Core가 사용자 대신 Claude 인증을 고쳐 줄 수는 없습니다.

---

## Init 런타임 이슈

### Init이 멈춘 듯하거나 너무 오래 걸림

큰 프로젝트의 Pass 1은 시간이 좀 걸립니다. 다음을 차례로 점검하세요:

1. **Claude Code가 정상 동작하나?** 다른 터미널에서 `claude --version`을 실행해 보세요.
2. **네트워크 상태가 괜찮은가?** 각 pass는 Claude Code를 호출하고, Claude Code는 Anthropic API를 호출합니다.
3. **프로젝트가 아주 큰가?** Domain group splitting이 자동으로 적용됩니다 (그룹당 4 도메인 / 40 파일). 24개 도메인짜리 프로젝트라면 Pass 1을 6번 실행합니다.

한참 동안 출력이 없으면 (progress ticker가 멈춤) Ctrl-C로 중단하고 resume하세요:

```bash
npx claudeos-core init   # 마지막으로 완료된 pass marker부터 이어 감
```

resume 메커니즘은 완료되지 않은 pass만 다시 실행합니다.

### Claude의 "Prompt is too long" 에러

Pass 3가 context window를 넘었다는 뜻입니다. 도구는 이미 다음과 같은 완화 장치를 적용하고 있습니다:

- **Pass 3 split mode** (3a → 3b-core → 3b-N → 3c-core → 3c-N → 3d-aux). 자동으로 적용됩니다.
- **Domain group splitting.** 그룹당 도메인이 4를 넘거나 파일이 40을 넘으면 자동으로 적용됩니다.
- **Batch sub-division.** 도메인이 16개 이상이면 3b/3c가 15개 이하의 batch로 다시 나뉩니다.

이렇게 해도 context 한계에 부딪힌다면 프로젝트가 예외적으로 큰 경우입니다. 다음 선택지가 있습니다:

1. 프로젝트를 별도 디렉토리로 나눠서 각각 `init`을 실행합니다.
2. `.claudeos-scan.json`의 `frontendScan.platformKeywords`를 적극적으로 override해서 비필수 subapp을 건너뜁니다.
3. [issue를 열어](https://github.com/claudeos-core/claudeos-core/issues) 알려 주세요. 해당 케이스에 맞는 새 override가 필요할 수 있습니다.

자동으로 적용되는 것 이상으로 "더 강한 splitting을 강제"하는 flag는 없습니다.

### Init이 도중에 실패할 때

도구는 **resume-safe**합니다. 그냥 다시 실행하면 됩니다:

```bash
npx claudeos-core init
```

마지막으로 완료된 pass marker부터 이어서 진행합니다. 작업이 사라지지 않습니다.

처음부터 깨끗하게 다시 만들고 싶다면 (모든 marker를 지우고 전부 재생성) `--force`를 쓰세요:

```bash
npx claudeos-core init --force
```

주의: `--force`는 `.claude/rules/`에 직접 편집한 내용을 삭제합니다. 자세한 내용은 [safety.md](safety.md)를 참고하세요.

### Windows: "EBUSY"나 파일 잠금 에러

Windows의 파일 잠금이 Unix보다 엄격하기 때문에 발생합니다. 원인은 보통 다음 중 하나입니다:

- 안티바이러스가 쓰기 도중에 파일을 스캔합니다.
- IDE가 파일을 exclusive 잠금으로 열고 있습니다.
- 이전 `init`이 충돌하면서 stale handle을 남겼습니다.

다음 순서대로 시도해 보세요:

1. IDE를 닫고 다시 실행합니다.
2. 프로젝트 폴더에 대해 안티바이러스 real-time 스캔을 끕니다 (또는 프로젝트 경로를 화이트리스트에 추가합니다).
3. Windows를 재시작해서 stale handle을 정리합니다.
4. 그래도 계속되면 WSL2에서 실행합니다.

`lib/staged-rules.js`의 이동 로직은 `renameSync`가 실패하면 `copyFileSync + unlinkSync`로 fallback하므로 안티바이러스 간섭은 대부분 자동으로 처리됩니다. 그래도 잠금 에러가 나면 staged 파일이 `claudeos-core/generated/.staged-rules/`에 남아 있으니 직접 확인할 수 있습니다. `init`을 다시 실행하면 이동을 재시도합니다.

### Cross-volume rename 실패 (Linux/macOS)

`init`이 mount point를 가로질러 atomic rename을 해야 하는 경우가 있습니다 (예: 다른 디스크에 있는 `/tmp`에서 프로젝트로). 도구가 자동으로 copy-then-delete로 fallback하므로 따로 할 일은 없습니다.

이동 실패가 계속된다면 `claudeos-core/generated/.staged-rules/`와 `.claude/rules/` 양쪽에 쓰기 권한이 있는지 확인하세요.

---

## 검증 이슈

### "STALE_PATH: file does not exist"

standards/skills/guides에 언급된 경로가 실제 파일로 이어지지 않는 경우입니다. 원인은 보통 다음 중 하나입니다:

- Pass 3가 경로를 만들어 냈습니다 (예: parent dir + TypeScript 상수명을 합쳐서 만들어 낸 `featureRoutePath.ts`).
- 파일을 삭제했는데 docs는 여전히 그 경로를 참조하고 있습니다.
- 파일이 gitignore에 들어가 있는데 scanner의 allowlist에 포함된 적이 있습니다.

**Fix:**

```bash
npx claudeos-core init --force
```

새 allowlist로 Pass 3 / 4를 다시 만들어 줍니다.

해당 경로가 일부러 gitignore에 들어 있고 scanner가 무시하게 하고 싶다면, `.claudeos-scan.json`이 지원하는 옵션을 [advanced-config.md](advanced-config.md)에서 확인하세요 (지원 필드는 많지 않습니다).

`--force`로도 고쳐지지 않는 경우가 드물게 있습니다 (특정 LLM seed에서 같은 hallucination이 재발할 수 있습니다). 그럴 때는 문제가 되는 파일을 직접 편집해서 잘못된 경로를 지우세요. validator는 **advisory** tier로 실행되므로 CI를 막지 않습니다. 일단 ship하고 나중에 고쳐도 됩니다.

### "MANIFEST_DRIFT: registered skill not in CLAUDE.md"

`claudeos-core/skills/00.shared/MANIFEST.md`에 등록된 skills는 CLAUDE.md 어딘가에서 언급돼야 합니다. validator에는 **orchestrator/sub-skill 예외**가 있습니다. sub-skill은 orchestrator가 언급되면 함께 cover된 것으로 간주합니다.

**Fix:** sub-skill의 orchestrator가 정말 CLAUDE.md에 없는 경우라면 `init --force`로 다시 생성하세요. orchestrator가 언급돼 있는데도 validator가 표시한다면 validator 버그입니다. [issue를 열어](https://github.com/claudeos-core/claudeos-core/issues) 파일 경로와 함께 알려 주세요.

### "Section 8 has wrong number of H4 sub-sections"

`claude-md-validator`는 Section 8 아래에 정확히 2개의 `####` heading을 요구합니다 (L4 Memory Files / Memory Workflow).

원인으로 가능한 것:

- CLAUDE.md를 수동으로 편집하면서 Section 8 구조가 깨졌습니다.
- pre-v2.3.0 Pass 4가 실행되어 Section 9가 append되었습니다.
- pre-v2.2.0에서 업그레이드한 상태입니다 (8-section scaffold가 아직 강제되지 않은 시점).

**Fix:**

```bash
npx claudeos-core init --force
```

CLAUDE.md를 깨끗하게 다시 만듭니다. memory 파일은 `--force`에서도 보존됩니다 (생성된 파일만 덮어씁니다).

### "T1: section heading missing English canonical token"

각 `## N.` section heading은 영문 canonical token을 포함해야 합니다 (예: `## 1. Role Definition` 또는 `## 1. 역할 정의 (Role Definition)`). `--lang`과 무관하게 multi-repo grep이 동작하도록 하기 위한 규칙입니다.

**Fix:** heading을 직접 편집해서 영문 token을 괄호로 덧붙이거나, `init --force`로 다시 생성하세요. v2.3.0+ scaffold가 이 컨벤션을 자동으로 강제합니다.

---

## Memory layer 이슈

### "Memory file growing too large"

compaction을 실행하세요:

```bash
npx claudeos-core memory compact
```

4단계 compaction 알고리즘이 적용됩니다. 각 단계가 무엇을 하는지는 [memory-layer.md](memory-layer.md)를 참고하세요.

### "propose-rules가 동의하기 어려운 rules를 제안"

출력은 검토용 draft일 뿐 자동으로 적용되지 않습니다. 원치 않는 것은 그냥 무시하면 됩니다:

- `claudeos-core/memory/auto-rule-update.md`를 직접 편집해서 거부할 제안을 지웁니다.
- 또는 apply 단계 자체를 건너뜁니다. 제안된 콘텐츠를 rule 파일에 수동으로 복사하지 않으면 `.claude/rules/`는 그대로 유지됩니다.

### `memory <subcommand>`가 "not found"라고 나옴

memory 파일이 없는 상태입니다. 보통 `init`의 Pass 4에서 만들어집니다. 삭제되었다면:

```bash
npx claudeos-core init --force
```

전체를 재실행하지 않고 memory 파일만 다시 만들고 싶을 수도 있겠지만, 도구에는 single-pass-replay 명령이 없습니다. `--force`가 유일한 방법입니다.

---

## CI 이슈

### 로컬에선 테스트가 통과하는데 CI에서는 실패

원인이 될 만한 것:

1. **CI에 `claude`가 설치되어 있지 않음.** 번역에 의존하는 테스트는 `CLAUDEOS_SKIP_TRANSLATION=1`로 우회합니다. 공식 CI workflow에는 이 env var가 설정돼 있습니다. fork에서 빠져 있다면 추가하세요.

2. **Path 정규화 (Windows).** 코드베이스가 Windows 백슬래시를 forward slash로 여러 곳에서 정규화하지만, 미묘한 차이 때문에 테스트가 어긋날 수 있습니다. 공식 CI는 Windows + Linux + macOS에서 모두 돌리기 때문에 대부분 잡히지만, Windows 특정 실패가 보인다면 진짜 버그일 가능성이 있습니다.

3. **Node 버전.** 테스트는 Node 18과 20에서 실행됩니다. Node 16이나 22를 쓰면 호환성 문제가 생길 수 있으니, CI와 맞추기 위해 18이나 20으로 고정하세요.

### CI에서 `health`가 0으로 종료하는데 non-zero를 기대했던 경우

`health`는 **fail** tier 항목이 있을 때만 non-zero로 종료합니다. **warn**과 **advisory**는 출력만 하고 종료 코드를 막지 않습니다.

advisory에서도 실패하게 하고 싶다면 (예: `STALE_PATH`를 strict하게 다루기) 빌트인 flag는 없습니다. 출력을 grep해서 직접 종료해야 합니다:

```bash
npx claudeos-core health > health.log
if grep -q "advisory" health.log; then exit 1; fi
```

---

## 도움 받기

위 어느 항목과도 맞지 않는다면:

1. **정확한 에러 메시지를 캡처해 두세요.** ClaudeOS-Core 에러에는 파일 경로와 식별자가 포함돼 있어 재현에 도움이 됩니다.
2. **issue 트래커를 확인하세요:** [GitHub Issues](https://github.com/claudeos-core/claudeos-core/issues). 이미 보고된 이슈일 수 있습니다.
3. **새 issue를 여세요.** OS, Node 버전, Claude Code 버전 (`claude --version`), 프로젝트 스택, 에러 출력을 함께 적어 주세요. 가능하면 `claudeos-core/generated/project-analysis.json`도 첨부해 주세요 (sensitive 변수는 자동으로 마스킹됩니다).

보안 이슈는 [SECURITY.md](../../SECURITY.md)를 참고하세요. 취약점 관련해서는 public issue를 열지 마세요.

---

## See also

- [safety.md](safety.md) — `--force`가 무엇을 하고 무엇을 보존하는지
- [verification.md](verification.md) — validator가 알려 주는 결과의 의미
- [advanced-config.md](advanced-config.md) — `.claudeos-scan.json` override
