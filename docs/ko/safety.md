# 안전성: re-init 시 보존되는 것

자주 듣는 걱정: *"`.claude/rules/`를 customize했어요. `npx claudeos-core init`을 다시 실행하면 편집한 내용이 사라지나요?"*

**짧은 답:** `--force`를 쓰는지에 따라 다릅니다.

이 문서는 재실행할 때 정확히 무슨 일이 일어나는지, 무엇이 건드려지고 무엇이 그대로 남는지 설명합니다.

> 영문 원본: [docs/safety.md](../safety.md).

---

## Re-init의 두 가지 경로

이미 출력이 있는 프로젝트에서 `init`을 재실행하면 두 가지 중 하나가 일어납니다:

### Path 1 — Resume (기본값, `--force` 없음)

`init`이 `claudeos-core/generated/`에 있는 기존 pass marker (`pass1-*.json`, `pass2-merged.json`, `pass3-complete.json`, `pass4-memory.json`)를 읽습니다.

각 pass의 marker가 존재하고 구조적으로 유효하면 해당 pass는 **건너뜁니다**. 4개 marker가 모두 유효하면 `init`은 곧바로 종료됩니다. 할 일이 없기 때문입니다.

**편집에 미치는 영향:** 수동으로 편집한 내용은 모두 그대로 남습니다. pass가 실행되지 않으므로 파일이 작성되지 않습니다.

대부분의 "그냥 한 번 더 확인하고 싶은" 워크플로에 권장되는 경로입니다.

### Path 2 — Fresh start (`--force`)

```bash
npx claudeos-core init --force
```

`--force`는 pass marker와 rules를 삭제한 뒤 4-pass 파이프라인을 처음부터 다시 실행합니다. **Rules에 수동으로 편집한 내용은 사라집니다.** 의도된 동작입니다. `--force`는 "처음부터 깨끗하게 다시 만들고 싶다"는 의도를 위한 escape hatch이기 때문입니다.

`--force`가 삭제하는 것:
- `claudeos-core/generated/` 아래의 모든 `.json` 및 `.md` 파일 (4개 pass marker와 scanner 출력)
- 이전 실행이 move 도중에 충돌하면서 남긴 `claudeos-core/generated/.staged-rules/` 디렉토리
- `.claude/rules/` 아래의 모든 파일

`--force`가 **삭제하지 않는** 것:
- `claudeos-core/memory/` 파일 (decision log와 failure pattern 보존)
- `claudeos-core/standard/`, `claudeos-core/skills/`, `claudeos-core/guide/` 등은 Pass 3가 덮어쓰긴 하지만 미리 삭제하지는 않습니다. 즉, Pass 3가 다시 만들지 않는 파일은 그대로 유지됩니다.
- `claudeos-core/`와 `.claude/` 바깥의 파일
- CLAUDE.md (Pass 3가 일반적인 생성 과정의 일부로 덮어씁니다)

**`--force`가 다른 디렉토리는 그대로 두면서 `.claude/rules/`만 비우는 이유.** Pass 3에는 `.claude/rules/`가 비어 있을 때 발화하는 "zero-rules detection" guard가 있습니다. 도메인별 rules stage를 건너뛸지 결정할 때 쓰는 장치입니다. 이전 실행의 stale rule이 남아 있으면 guard가 false-negative를 내어 새 rule이 만들어지지 않습니다.

---

## `.claude/rules/`가 staging되는 이유 (staging 메커니즘)

가장 자주 묻는 질문이라 별도 section으로 다룹니다.

Claude Code에는 **sensitive-path policy**가 있어서, `--dangerously-skip-permissions`로 실행 중인 subprocess조차 `.claude/`에 쓸 수 없도록 차단합니다. Claude Code 자체의 의도적인 안전 경계입니다.

ClaudeOS-Core의 Pass 3과 Pass 4는 `claude -p`의 subprocess invocation이라서 `.claude/rules/`에 직접 쓸 수 없습니다. 그래서 다음과 같이 우회합니다:

1. Pass prompt가 Claude에게 모든 rule 파일을 `claudeos-core/generated/.staged-rules/`에 대신 쓰도록 지시합니다.
2. Pass가 끝나면 **Node.js orchestrator**가 (Claude Code의 권한 정책 대상이 *아닙니다*) staging 트리를 순회하면서 각 파일을 sub-path 그대로 `.claude/rules/`로 옮깁니다.
3. 모두 성공하면 staging 디렉토리를 지웁니다.
4. 일부가 실패하면 (파일 잠금이나 cross-volume rename 에러) staging 디렉토리를 **그대로 보존**합니다. 어떤 파일이 옮겨지지 못했는지 확인할 수 있고, 다음 `init` 실행이 다시 시도합니다.

mover 코드는 `lib/staged-rules.js`에 있습니다. 먼저 `fs.renameSync`를 시도하고, Windows의 cross-volume이나 antivirus 파일 잠금 에러가 나면 `fs.copyFileSync + fs.unlinkSync`로 fallback합니다.

**실제 동작.** 정상 흐름에서는 `.staged-rules/`가 한 번의 `init` 실행 안에서 만들어졌다가 곧바로 비워집니다. 거의 알아채지 못합니다. 실행이 stage 도중 충돌하면 다음 `init`에서 그 안에 파일이 남아 있는 게 보이고, `--force`가 그것을 정리합니다.

---

## 언제 무엇이 보존되나

| 파일 카테고리 | `--force` 없음 | `--force` 사용 |
|---|---|---|
| `.claude/rules/` 수동 편집 | ✅ 보존 (pass 재실행 안 함) | ❌ 손실 (디렉토리 wipe) |
| `claudeos-core/standard/` 수동 편집 | ✅ 보존 (pass 재실행 안 함) | ❌ Pass 3가 같은 파일을 다시 만들면 덮어씁니다 |
| `claudeos-core/skills/` 수동 편집 | ✅ 보존 | ❌ Pass 3가 덮어씁니다 |
| `claudeos-core/guide/` 수동 편집 | ✅ 보존 | ❌ Pass 3가 덮어씁니다 |
| `CLAUDE.md` 수동 편집 | ✅ 보존 | ❌ Pass 3가 덮어씁니다 |
| `claudeos-core/memory/` 파일 | ✅ 보존 | ✅ 보존 (`--force`는 memory를 지우지 않습니다) |
| `claudeos-core/`와 `.claude/` 바깥의 파일 | ✅ 절대 건드리지 않음 | ✅ 절대 건드리지 않음 |
| Pass marker (`generated/*.json`) | ✅ 보존 (resume에 사용) | ❌ 삭제 (전체를 처음부터 다시 실행) |

**솔직한 요약.** ClaudeOS-Core에는 diff-and-merge layer가 없습니다. "변경 사항을 검토한 뒤 적용"하는 prompt도 없습니다. 보존 정책은 binary입니다. 누락된 것만 다시 실행하거나 (기본값), 전부 지우고 다시 만들거나 (`--force`) 둘 중 하나입니다.

수동 편집이 많이 쌓였는데 새로 생성된 콘텐츠를 합쳐야 한다면 다음 워크플로를 권장합니다:

1. 편집한 내용을 먼저 git에 commit합니다.
2. 별도 branch에서 `npx claudeos-core init --force`를 실행합니다.
3. `git diff`로 무엇이 바뀌었는지 확인합니다.
4. 양쪽에서 원하는 부분을 직접 병합합니다.

일부러 손이 많이 가는 워크플로로 만들었습니다. 도구가 자동 병합을 시도하지 않는 이유는, 잘못하면 미묘한 방식으로 rule을 조용히 망가뜨릴 수 있기 때문입니다.

---

## Pre-v2.2.0 업그레이드 감지

이전 버전(pre-v2.2.0, 8-section scaffold가 강제되기 전)으로 만들어진 CLAUDE.md가 있는 프로젝트에서 `init`을 실행하면, 도구가 heading 개수로 그것을 감지합니다 (`^## ` heading count ≠ 8. 언어와 무관한 heuristic). 그리고 warning을 표시합니다:

```
⚠️  v2.2.0 upgrade detected
─────────────────────────
Your existing CLAUDE.md was generated with an older claudeos-core version.
v2.2.0 introduces structural changes that the default 'resume' mode
CANNOT apply because existing files are preserved under Rule B (idempotency).

To fully adopt v2.2.0, choose one of:
  1. Rerun with --force:   npx claudeos-core init --force
     (overwrites generated files; your memory/ content is preserved)
  2. Choose 'fresh' below  (equivalent to --force)
```

warning은 informational일 뿐입니다. 도구는 그대로 진행하므로, 예전 형식을 유지하고 싶다면 무시해도 됩니다. 다만 구조 업그레이드는 `--force`로 다시 실행해야 적용되고, 그래야 `claude-md-validator`가 통과합니다.

**Memory 파일은 `--force` 업그레이드에서도 보존됩니다.** 생성된 파일만 덮어씁니다.

---

## Pass 4 immutability (v2.3.0+)

알아 둘 만한 미묘한 부분이 하나 있습니다. **Pass 4는 `CLAUDE.md`를 건드리지 않습니다.** Pass 3의 Section 8이 이미 모든 필수 L4 memory 파일 참조를 작성하기 때문입니다. Pass 4가 CLAUDE.md를 또 한 번 작성하면 Section 8 콘텐츠가 중복 선언되면서 `[S1]`/`[M-*]`/`[F2-*]` validator 에러가 발생합니다.

이 contract는 세 방향으로 강제됩니다:
- Pass 4 prompt가 "CLAUDE.md MUST NOT BE MODIFIED"라고 명시합니다.
- `lib/memory-scaffold.js`의 `appendClaudeMdL4Memory()` 함수는 3줄짜리 no-op입니다. 무조건 true를 반환하고 어떤 쓰기도 하지 않습니다.
- regression test `tests/pass4-claude-md-untouched.test.js`가 이 contract를 검증합니다.

**사용자가 알아 둘 점.** 예전 Pass 4가 CLAUDE.md에 Section 9를 추가했던 pre-v2.3.0 프로젝트를 재실행하면 `claude-md-validator` 에러가 보입니다. `npx claudeos-core init --force`를 실행해서 깨끗하게 다시 만드세요.

---

## `restore` 명령이 하는 일

```bash
npx claudeos-core restore
```

`restore`는 `plan-validator`를 `--execute` mode로 실행합니다. 과거에는 `claudeos-core/plan/*.md` 파일에서 콘텐츠를 명시된 위치로 복사하던 명령이었습니다.

**v2.1.0 상태.** Master plan 생성은 v2.1.0에서 제거되었습니다. `claudeos-core/plan/`은 더 이상 `init`이 자동으로 만들지 않습니다. `plan/` 파일이 없으면 `restore`는 no-op로 동작합니다. informational 메시지만 남기고 깨끗하게 종료합니다.

ad-hoc 용도로 plan 파일을 직접 관리해서 backup/restore에 쓰는 사용자를 위해 명령은 그대로 남겨 두었습니다. 진짜 백업이 필요하다면 git을 쓰세요.

---

## 복구 패턴

### "ClaudeOS 워크플로 바깥에서 일부 파일을 삭제했어요"

```bash
npx claudeos-core init --force
```

Pass 3과 Pass 4를 처음부터 다시 실행합니다. 삭제된 파일이 다시 만들어집니다. 다른 파일에 대한 수동 편집은 사라지므로 (`--force`이기 때문입니다) 안전을 위해 git과 함께 쓰세요.

### "특정 rule을 제거하고 싶어요"

그 파일만 삭제하면 됩니다. 다음 `init`은 (`--force` 없이는) 그것을 다시 만들지 않습니다. Pass 3 resume marker가 전체 pass를 건너뛰기 때문입니다.

다음 `init --force`에서 다시 만들어지길 원한다면 따로 할 일이 없습니다. 자동으로 재생성됩니다.

영구적으로 지워서 다시 만들어지지 않게 하려면, 프로젝트를 현재 상태에 고정한 채로 `--force`를 다시 실행하지 마세요. "이 파일은 재생성하지 마" 같은 빌트인 메커니즘은 없습니다.

### "생성된 파일을 영구적으로 customize하고 싶어요"

도구에는 custom region을 표시하는 HTML-style begin/end marker가 없습니다. 두 가지 선택지가 있습니다:

1. **이 프로젝트에 `--force`를 쓰지 않기.** default resume 모드에서는 편집한 내용이 계속 보존됩니다.
2. **Prompt 템플릿을 fork하기.** 도구를 직접 fork해서 `pass-prompts/templates/<stack>/pass3.md`를 수정하고, fork 버전을 설치하면 재생성된 파일에도 customize가 반영됩니다.

단순한 프로젝트별 override라면 보통 옵션 1로 충분합니다.

---

## Validator가 검사하는 것 (re-init 후)

`init`이 끝나면 (resume이든 `--force`든) validator가 자동으로 실행됩니다:

- `claude-md-validator`. `lint`로 따로 실행됩니다.
- `health-checker`. 4개의 content/path validator를 실행합니다.

뭔가 잘못되면 (파일 누락, 깨진 cross-reference, 가짜 경로) validator 출력이 표시됩니다. 검사 항목 목록은 [verification.md](verification.md)를 참고하세요.

validator는 어떤 것도 직접 고치지 않고 보고만 합니다. 보고를 읽고 `init`을 재실행할지 직접 수정할지 결정하면 됩니다.

---

## 테스트를 통한 신뢰

"사용자 편집 보존" 경로 (`--force` 없는 resume)는 `tests/init-command.test.js`와 `tests/pass3-marker.test.js`의 통합 테스트로 검증합니다.

CI는 Linux / macOS / Windows × Node 18 / 20에서 실행됩니다.

이 문서와 어긋나게 ClaudeOS-Core가 편집한 내용을 잃어버리는 경우를 발견하면 버그입니다. [재현 단계와 함께 보고해 주세요](https://github.com/claudeos-core/claudeos-core/issues).

---

## See also

- [architecture.md](architecture.md) — 전체 흐름 안에서 본 staging 메커니즘
- [commands.md](commands.md) — `--force`와 그 외 flag
- [troubleshooting.md](troubleshooting.md) — 구체적인 에러 복구 방법
