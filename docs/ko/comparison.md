# 비슷한 도구와의 비교

이 페이지는 ClaudeOS-Core를 같은 영역(project-aware Claude Code 설정)에서 동작하는 다른 Claude Code 도구와 비교합니다.

**scope 비교이지 품질 평가가 아닙니다.** 아래에 등장하는 도구는 대부분 각자의 일을 잘 해냅니다. 이 페이지의 목적은 ClaudeOS-Core가 사용자의 문제에 맞는지, 아니면 다른 도구가 더 적합한지 판단할 수 있도록 돕는 것입니다.

> 영문 원본: [docs/comparison.md](../comparison.md).

---

## TL;DR

**코드에 실제로 존재하는 내용을 바탕으로 `.claude/rules/`를 자동 생성**하고 싶다면, 그것이 ClaudeOS-Core가 잘하는 일입니다.

그 외의 다른 것이 필요하다면 (광범위한 preset 묶음, planning 워크플로, agent orchestration, 여러 도구 설정 동기화 등), Claude Code 생태계의 다른 도구가 더 잘 맞을 가능성이 큽니다.

---

## ClaudeOS-Core가 다른 도구와 어떻게 다른가

ClaudeOS-Core를 정의하는 특성은 다음과 같습니다.

- **실제 소스 코드를 읽음** (Node.js scanner가 동작하므로 결과가 일관됩니다. LLM이 스택을 추측하지 않습니다).
- **사실 주입 prompt가 있는 4-pass Claude 파이프라인** (경로와 컨벤션을 한 번 추출해서 재사용).
- **5개 post-generation validator** (`claude-md-validator`는 구조 검사, `content-validator`는 경로 주장과 콘텐츠 검사, `pass-json-validator`는 중간 JSON 검사, `plan-validator`는 legacy plan 파일 검사, `sync-checker`는 disk와 sync-map 일관성 검사).
- **10개 출력 언어 지원** + language-invariant 검증.
- **프로젝트별 출력**: CLAUDE.md, `.claude/rules/`, standards, skills, guides, memory layer가 모두 코드에서 파생됩니다. preset bundle이 아닙니다.

같은 영역의 다른 Claude Code 도구는 다음과 같습니다 (필요에 따라 함께 쓰거나 대신 골라 쓰면 됩니다).

- **Claude `/init`** — Claude Code에 빌트인. LLM을 한 번 호출해서 단일 `CLAUDE.md`를 작성합니다. 작은 프로젝트에서 빠르게 한 파일만 만들고 싶을 때 적합.
- **Preset/bundle 도구** — "대부분의 프로젝트"에서 동작하도록 큐레이션된 agent, skill, rule을 배포합니다. 컨벤션이 bundle 기본값과 일치할 때 적합.
- **Planning/workflow 도구** — feature 개발을 위한 구조화된 방법론(spec, phase 등)을 제공합니다. Claude Code 위에 프로세스 layer를 두고 싶을 때 적합.
- **Hook/DX 도구** — Claude Code 세션에 auto-save, code-quality hook, DX 개선 기능을 추가합니다.
- **Cross-agent rule converter** — Claude Code, Cursor 등 여러 도구 간에 rule을 동기화합니다.

이 도구들은 대부분 **경쟁 관계가 아니라 보완 관계**입니다. ClaudeOS-Core는 "코드를 바탕으로 프로젝트별 rule을 생성"하는 일을 맡고, 나머지는 각자 다른 일을 합니다. 대부분 함께 사용할 수 있습니다.

---

## ClaudeOS-Core가 적합한 경우

✅ Claude Code가 일반적인 컨벤션 대신 _내 프로젝트_의 컨벤션을 따르길 원하는 경우.
✅ 새 프로젝트를 시작하거나 팀 onboarding을 하면서 빠르게 설정하고 싶은 경우.
✅ 코드베이스가 진화하면서 `.claude/rules/`를 수동으로 관리하기 지친 경우.
✅ [지원하는 12개 스택](stacks.md) 중 하나에서 작업하는 경우.
✅ 같은 코드에서 매번 같은 rule이 나오는, 재현 가능한 출력을 원하는 경우.
✅ 영어가 아닌 언어로 출력해야 하는 경우 (10개 언어 빌트인).

## ClaudeOS-Core가 적합하지 않은 경우

❌ scan 단계 없이 첫날부터 그대로 쓸 수 있는 큐레이션된 agent/skill/rule 묶음을 원하는 경우.
❌ 자기 스택이 지원되지 않고, 추가 기여에는 관심이 없는 경우.
❌ agent orchestration, planning workflow, coding 방법론이 필요한 경우. 그런 용도에 특화된 도구를 쓰세요.
❌ 단일 `CLAUDE.md`만 필요하고 standards/rules/skills 전체 세트는 필요 없는 경우. `claude /init`만으로 충분합니다.

---

## Scope: 좁기도 하고 넓기도 합니다

ClaudeOS-Core는 광범위한 bundle보다는 **좁습니다**. preset agent, hook, 방법론을 함께 제공하지 않고, _내 프로젝트의_ rule만 만들기 때문입니다. 반대로 단일 artifact에 집중하는 도구보다는 **넓습니다**. CLAUDE.md 외에도 standards, skills, guides, memory까지 여러 디렉토리에 걸친 트리를 생성하기 때문입니다. 자기 프로젝트에서 어떤 축이 중요한지 기준으로 고르면 됩니다.

---

## "그냥 Claude /init을 쓰면 안 되나?"

좋은 질문입니다. `claude /init`은 Claude Code에 빌트인되어 있고, LLM을 한 번 호출해서 단일 `CLAUDE.md`를 작성합니다. 빠르고 별도 설정도 필요 없습니다.

**잘 동작하는 경우:**

- 프로젝트가 작은 경우 (파일 30개 이하).
- Claude가 빠르게 file tree를 훑어 스택을 추측해도 괜찮은 경우.
- `CLAUDE.md` 하나면 충분하고 `.claude/rules/` 세트가 필요 없는 경우.

**어려움을 겪는 경우:**

- 프로젝트에 Claude가 빠른 훑어보기로는 잡아내지 못하는 custom 컨벤션이 있는 경우 (예: JPA 대신 MyBatis, custom response wrapper, 비표준 패키지 layout).
- 팀원들 사이에서 재현 가능한 출력을 원하는 경우.
- 분석이 끝나기 전에 Claude 호출 한 번이 context window 한계에 부딪힐 만큼 프로젝트가 큰 경우.

ClaudeOS-Core는 `/init`이 어려움을 겪는 상황을 위해 만들어졌습니다. `/init`이 잘 동작한다면 ClaudeOS-Core는 굳이 필요하지 않을 것입니다.

---

## "그냥 rule을 직접 작성하면 안 되나?"

이것도 충분히 합당한 질문입니다. `.claude/rules/`를 직접 작성하는 것이 가장 정확한 방법입니다. 자기 프로젝트는 자기가 가장 잘 알기 때문입니다.

**잘 동작하는 경우:**

- 프로젝트가 하나이고 1인 개발이며, 처음부터 rule을 작성하는 데 시간을 충분히 들일 수 있는 경우.
- 컨벤션이 안정적이고 이미 잘 문서화되어 있는 경우.

**어려움을 겪는 경우:**

- 새 프로젝트를 자주 시작하는 경우 (그때마다 rule 작성에 시간을 또 써야 합니다).
- 팀이 커지면서 어떤 rule이 있는지 사람들이 잊어버리는 경우.
- 컨벤션이 계속 변하면서 rule이 뒤따라가지 못해 drift가 생기는 경우.

ClaudeOS-Core는 쓸 만한 rule 세트의 대부분을 한 번 실행으로 만들어 줍니다. 나머지는 직접 손보면 됩니다. 빈 파일부터 시작하는 것보다 시간을 더 효율적으로 쓰는 방법이라고 보는 사용자가 많습니다.

---

## "preset bundle을 그냥 쓰는 것과 어떤 차이가 있나?"

Everything Claude Code 같은 bundle은 "대부분의 프로젝트"에서 동작하는 큐레이션된 rule/skill/agent 세트를 제공합니다. 프로젝트가 bundle의 가정과 맞으면 빠르게 채택할 수 있어 좋습니다.

**Bundle이 잘 동작하는 경우:**

- 프로젝트의 컨벤션이 bundle 기본값과 일치하는 경우 (예: 표준 Spring Boot, 표준 Next.js).
- 비표준 스택 선택이 없는 경우 (예: JPA 대신 MyBatis).
- 시작점을 받아서 거기서부터 customize하는 방식이 만족스러운 경우.

**Bundle이 어려움을 겪는 경우:**

- 스택이 기본이 아닌 도구를 쓰는 경우 (bundle의 "Spring Boot" rule은 보통 JPA를 가정합니다).
- bundle이 모르는 강한 프로젝트별 컨벤션이 있는 경우.
- 코드가 진화함에 따라 rule도 함께 업데이트되길 원하는 경우.

ClaudeOS-Core는 bundle을 보완할 수 있습니다. 프로젝트별 rule은 ClaudeOS-Core로, 일반 워크플로 rule은 bundle을 layer로 얹어서 사용하는 식입니다.

---

## 비슷한 도구들 사이에서 선택하기

ClaudeOS-Core와 다른 project-aware Claude Code 도구 사이에서 고민이라면 다음 질문을 해 보세요.

1. **도구가 코드를 직접 읽길 원하나, 아니면 프로젝트를 설명해 주는 쪽인가?**
   코드 읽기 → ClaudeOS-Core. 설명 → 대부분의 다른 도구.

2. **매번 같은 출력이 필요한가?**
   네 → ClaudeOS-Core. 아니오 → 어떤 도구든 무방.

3. **standards/rules/skills/guides 전체 세트가 필요한가, 아니면 단일 CLAUDE.md만 필요한가?**
   전체 세트 → ClaudeOS-Core. CLAUDE.md만 → Claude `/init`.

4. **출력 언어가 영어인가, 다른 언어인가?**
   영어만 → 많은 도구가 적합. 다른 언어 → ClaudeOS-Core (10개 언어 빌트인).

5. **agent orchestration, planning workflow, hook이 필요한가?**
   네 → 그쪽에 특화된 도구를 쓰세요. ClaudeOS-Core는 그런 기능을 다루지 않습니다.

ClaudeOS-Core와 다른 도구를 함께 써 본 경험이 있다면 [issue를 열어](https://github.com/claudeos-core/claudeos-core/issues) 공유해 주세요. 이 비교를 더 정확하게 다듬는 데 큰 도움이 됩니다.

---

## See also

- [architecture.md](architecture.md) — ClaudeOS-Core가 같은 출력을 내는 이유
- [stacks.md](stacks.md) — ClaudeOS-Core가 지원하는 12개 스택
- [verification.md](verification.md) — 다른 도구에는 없는 post-generation safety net
