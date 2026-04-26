# 안전성: re-init 시 보존되는 것

자주 묻는 걱정: *"`.claude/rules/`를 customize했어요. `npx claudeos-core init`을 다시 실행하면 편집이 사라지나요?"*

**짧은 답:** `--force`를 쓰는지 여부에 따라 다릅니다.

이 문서는 재실행할 때 정확히 무슨 일이 일어나는지, 무엇이 건드려지고 무엇이 안 건드려지는지 설명합니다.

> 영문 원본: [docs/safety.md](../safety.md).

---

## Re-init의 두 가지 경로

이미 출력이 있는 프로젝트에서 `init`을 재실행하면 둘 중 하나의 일이 일어납니다:

### Path 1 — Resume (기본, `--force` 없음)

`init`이 `claudeos-core/generated/`의 기존 pass marker (`pass1-*.json`, `pass2-merged.json`, `pass3-complete.json`, `pass4-memory.json`)를 읽음.

각 pass에 대해 marker가 존재하고 구조적으로 유효하면 pass는 **skip**. 4개 marker가 모두 유효하면 `init`은 일찍 종료 — 할 일이 없음.

**편집에의 영향:** 수동 편집한 모든 것은 그대로 둡니다. pass가 실행되지 않고 파일이 작성되지 않음.

이는 대부분의 "그냥 다시 확인" 워크플로에 권장되는 경로입니다.

### Path 2 — Fresh start (`--force`)

```bash
npx claudeos-core init --force
```

`--force`는 pass marker와 rules를 삭제한 뒤 4-pass 파이프라인을 처음부터 실행. **Rules의 수동 편집은 손실됩니다.** 의도적입니다 — `--force`는 "깨끗한 재생성을 원한다"의 escape hatch.

`--force`가 삭제하는 것:
- `claudeos-core/generated/` 아래의 모든 `.json`과 `.md` 파일 (4개 pass marker + scanner 출력)
- 이전 실행이 move 도중 충돌해서 남은 `claudeos-core/generated/.staged-rules/` 디렉토리
- `.claude/rules/` 아래의 모든 것

`--force`가 **삭제하지 않는** 것:
- `claudeos-core/memory/` 파일 (decision log와 failure pattern 보존)
- `claudeos-core/standard/`, `claudeos-core/skills/`, `claudeos-core/guide/` 등 (이는 Pass 3가 덮어쓰지만 미리 삭제하지 않음 — Pass 3가 재생성하지 않는 것은 그대로 유지)
- `claudeos-core/`와 `.claude/` 외부의 파일
- CLAUDE.md (Pass 3가 일반 생성의 일부로 덮어씀)

**`.claude/rules/`가 `--force`로 wipe되지만 다른 디렉토리는 아닌 이유:** Pass 3에는 `.claude/rules/`가 비어 있을 때 발화하는 "zero-rules detection" guard가 있습니다 — 도메인별 rules stage를 skip할지 결정하는 데 사용됩니다. 이전 실행의 stale rule이 있으면 guard가 false-negative하여 새 rule이 생성되지 않습니다.

---

## `.claude/rules/`가 존재하는 이유 (staging 메커니즘)

가장 자주 묻는 질문이라 별도 section.

Claude Code에는 `--dangerously-skip-permissions`로 실행 중인 subprocess조차도 `.claude/`에의 쓰기를 차단하는 **sensitive-path policy**가 있습니다. 이는 Claude Code 자체의 의도적인 안전 경계.

ClaudeOS-Core의 Pass 3과 Pass 4는 `claude -p`의 subprocess invocation이므로 `.claude/rules/`에 직접 쓸 수 없습니다. 우회:

1. Pass prompt가 Claude에게 모든 rule 파일을 대신 `claudeos-core/generated/.staged-rules/`에 쓰도록 지시.
2. Pass 종료 후 **Node.js orchestrator** (Claude Code의 권한 정책 대상이 *아님*)가 staging 트리를 순회하여 각 파일을 sub-path를 보존하며 `.claude/rules/`로 이동.
3. 완전 성공 시 staging 디렉토리 제거.
4. 부분 실패 시 (파일 잠금 또는 cross-volume rename 에러) staging 디렉토리는 **보존**되어 무엇이 건너지 못했는지 확인 가능, 다음 `init` 실행이 retry.

mover는 `lib/staged-rules.js`에 있습니다. `fs.renameSync`를 먼저 사용하고, Windows cross-volume / antivirus 파일 잠금 에러에서 `fs.copyFileSync + fs.unlinkSync`로 fallback.

**실제로 보이는 것:** 일반 흐름에서 `.staged-rules/`는 단일 `init` 실행 안에서 생성되고 비워집니다 — 알아채지 못할 수도 있음. 실행이 stage 도중 충돌하면 다음 `init`에서 거기에 파일이 보이고, `--force`가 정리합니다.

---

## 언제 무엇이 보존되나

| 파일 카테고리 | `--force` 없음 | `--force` 사용 |
|---|---|---|
| `.claude/rules/` 수동 편집 | ✅ 보존 (pass 재실행 안 함) | ❌ 손실 (디렉토리 wipe) |
| `claudeos-core/standard/` 수동 편집 | ✅ 보존 (pass 재실행 안 함) | ❌ Pass 3가 같은 파일 재생성 시 덮어씀 |
| `claudeos-core/skills/` 수동 편집 | ✅ 보존 | ❌ Pass 3가 덮어씀 |
| `claudeos-core/guide/` 수동 편집 | ✅ 보존 | ❌ Pass 3가 덮어씀 |
| `CLAUDE.md` 수동 편집 | ✅ 보존 | ❌ Pass 3가 덮어씀 |
| `claudeos-core/memory/` 파일 | ✅ 보존 | ✅ 보존 (`--force`는 memory 삭제 안 함) |
| `claudeos-core/`와 `.claude/` 외부의 파일 | ✅ 절대 안 건드림 | ✅ 절대 안 건드림 |
| Pass marker (`generated/*.json`) | ✅ 보존 (resume에 사용) | ❌ 삭제 (전체 재실행 강제) |

**솔직한 요약:** ClaudeOS-Core에는 diff-and-merge layer가 없습니다. "변경 검토 후 적용" prompt가 없습니다. 보존 정책은 binary: 누락된 것만 재실행 (기본) 또는 wipe하고 재생성 (`--force`).

상당한 수동 편집을 했고 새 도구 생성 콘텐츠를 통합해야 한다면 권장 워크플로:

1. 편집을 git에 먼저 commit.
2. 별도 branch에서 `npx claudeos-core init --force` 실행.
3. `git diff`로 무엇이 바뀌었는지 확인.
4. 양쪽에서 원하는 것을 수동으로 병합.

이는 의도적으로 chunky한 워크플로. 도구가 자동 병합을 시도하지 않습니다 — 잘못하면 미묘한 방식으로 rule을 조용히 손상시키기 때문.

---

## Pre-v2.2.0 업그레이드 감지

이전 버전 (pre-v2.2.0, 8-section scaffold가 강제되기 전)으로 생성된 CLAUDE.md가 있는 프로젝트에서 `init`을 실행하면, 도구가 heading count (`^## ` heading count ≠ 8 — language-independent heuristic)로 감지하고 warning을 emit:

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

warning은 informational. 도구는 정상 진행 — 옛 형식을 유지하고 싶다면 무시 가능. 단, `--force`에서 구조 업그레이드가 적용되고 `claude-md-validator`가 통과합니다.

**Memory 파일은 `--force` 업그레이드에서 보존됩니다.** 생성된 파일만 덮어씌워집니다.

---

## Pass 4 immutability (v2.3.0+)

특정 미묘함: **Pass 4는 `CLAUDE.md`를 건드리지 않습니다.** Pass 3의 Section 8이 이미 모든 필수 L4 memory 파일 참조를 작성. Pass 4가 또 CLAUDE.md를 작성하면 Section 8 콘텐츠가 재선언되어 `[S1]`/`[M-*]`/`[F2-*]` validator 에러를 만들어 냅니다.

이는 양방향으로 강제됨:
- Pass 4 prompt가 명시적으로 "CLAUDE.md MUST NOT BE MODIFIED"라 말함.
- `lib/memory-scaffold.js`의 `appendClaudeMdL4Memory()` 함수는 3-line no-op (무조건 true 반환, 어떤 쓰기도 안 함).
- regression test `tests/pass4-claude-md-untouched.test.js`가 이 contract를 강제.

**사용자로서 알아야 할 것:** 옛 Pass 4가 CLAUDE.md에 Section 9를 append한 pre-v2.3.0 프로젝트를 재실행하면 `claude-md-validator` 에러가 보입니다. `npx claudeos-core init --force`를 실행하여 깨끗하게 재생성하세요.

---

## `restore` 명령이 하는 일

```bash
npx claudeos-core restore
```

`restore`는 `plan-validator`를 `--execute` mode로 실행. 역사적으로 `claudeos-core/plan/*.md` 파일에서 콘텐츠를 명시한 위치로 복사했음.

**v2.1.0 상태:** Master plan 생성이 v2.1.0에서 제거됨. `claudeos-core/plan/`은 `init`에 의해 더 이상 자동 생성되지 않음. `plan/` 파일이 없으면 `restore`는 no-op — informational message를 log하고 깨끗하게 종료.

ad-hoc backup/restore 목적으로 plan 파일을 hand-maintain하는 사용자를 위해 유지. 실제 백업이 필요하면 git 사용.

---

## 복구 패턴

### "ClaudeOS 워크플로 외부에서 일부 파일을 삭제했어요"

```bash
npx claudeos-core init --force
```

Pass 3 / Pass 4를 처음부터 재실행. 삭제된 파일이 재생성. 다른 파일에 대한 수동 편집은 손실 (`--force`이기 때문) — 안전을 위해 git와 결합.

### "특정 rule을 제거하고 싶어요"

그냥 파일 삭제. 다음 `init`은 (`--force` 없이) 재생성하지 않습니다 — Pass 3 resume marker가 전체 pass를 skip하기 때문.

다음 `init --force`에서 재생성되길 원하면 아무것도 할 필요 없음 — 재생성이 자동.

영구 삭제하길 원하면 (다시 재생성되지 않게) 프로젝트를 현재 상태에 pin해서 `--force`를 다시 실행하지 마세요. 빌트인 "이 파일을 재생성하지 마" 메커니즘은 없음.

### "생성된 파일을 영구적으로 customize하고 싶어요"

도구에는 custom region용 HTML-style begin/end marker가 없습니다. 두 가지 옵션:

1. **이 프로젝트에 `--force` 실행하지 않기** — default-resume 하에 편집이 무기한 보존.
2. **Prompt 템플릿 fork** — 자체 도구 사본에서 `pass-prompts/templates/<stack>/pass3.md` 수정, fork 설치, 재생성된 파일이 customize 반영.

단순한 프로젝트별 override에는 옵션 1로 보통 충분.

---

## Validator가 검사하는 것 (re-init 후)

`init` 종료 후 (resume이든 `--force`든) validator가 자동 실행:

- `claude-md-validator` — `lint`로 별도 실행
- `health-checker` — 4개 content/path validator 실행

뭔가 잘못되면 (파일 누락, 깨진 cross-reference, 가짜 경로) validator 출력이 보입니다. 검사 list는 [verification.md](verification.md) 참고.

validator는 어떤 것도 고치지 않음 — 보고합니다. 보고를 읽고 `init` 재실행할지 수동 수정할지 결정.

---

## 테스트를 통한 신뢰

"사용자 편집 보존" 경로 (`--force` 없는 resume)는 `tests/init-command.test.js`와 `tests/pass3-marker.test.js`의 통합 테스트로 exercise됩니다.

CI는 Linux / macOS / Windows × Node 18 / 20에서 실행.

이 문서와 모순되는 방식으로 ClaudeOS-Core가 편집을 잃은 사례를 발견하면 그것은 버그입니다. [reproduce 단계와 함께 보고해주세요](https://github.com/claudeos-core/claudeos-core/issues).

---

## See also

- [architecture.md](architecture.md) — 컨텍스트 안의 staging 메커니즘
- [commands.md](commands.md) — `--force`와 다른 flag
- [troubleshooting.md](troubleshooting.md) — 특정 에러 복구
