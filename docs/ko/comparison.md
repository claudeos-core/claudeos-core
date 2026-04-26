# 비슷한 도구와의 비교

이 페이지는 ClaudeOS-Core를 같은 일반 영역 (project-aware Claude Code 설정)에서 작동하는 다른 Claude Code 도구와 비교합니다.

**이는 scope 비교이지 품질 판단이 아닙니다.** 아래의 도구들은 대부분 자기 일을 훌륭히 합니다. 여기서의 요점은 ClaudeOS-Core가 여러분의 문제에 맞는지, 아니면 그중 하나가 더 적합한지 판단을 돕는 것.

> 영문 원본: [docs/comparison.md](../comparison.md).

---

## TL;DR

**코드에 실제로 있는 것을 기반으로 `.claude/rules/`를 자동 생성**하고 싶다면, 그게 ClaudeOS-Core의 특기입니다.

다른 것을 원하면 (광범위 preset bundle, planning 워크플로, agent orchestration, multi-tool config 동기화) Claude Code 생태계의 다른 도구가 더 적합할 가능성이 큽니다.

---

## ClaudeOS-Core가 다른 도구와 어떻게 다른가

ClaudeOS-Core의 정의적 특성:

- **실제 소스 코드를 읽음** (deterministic Node.js scanner — LLM이 스택을 추측 안 함).
- **사실 주입 prompt가 있는 4-pass Claude 파이프라인** (경로/컨벤션이 한 번 추출되어 재사용).
- **5개 post-generation validator** (`claude-md-validator` 구조용, `content-validator` 경로 주장 및 콘텐츠용, `pass-json-validator` 중간 JSON용, `plan-validator` legacy plan 파일용, `sync-checker` disk ↔ sync-map 일관성용).
- **10개 출력 언어** + language-invariant 검증.
- **프로젝트별 출력**: CLAUDE.md, `.claude/rules/`, standards, skills, guides, memory layer — 모두 코드에서 파생, preset bundle이 아님.

이 일반 영역의 다른 Claude Code 도구 (필요에 따라 layer로 쌓거나 다른 것을 선택):

- **Claude `/init`** — Claude Code 빌트인; 단일 LLM 호출로 single `CLAUDE.md` 작성. 작은 프로젝트의 빠른 one-file 설정에 최적.
- **Preset/bundle 도구** — "대부분 프로젝트"에서 작동하는 큐레이션된 agents, skills, rules 배포. 컨벤션이 bundle 기본값과 매치될 때 최적.
- **Planning/workflow 도구** — feature 개발용 구조화된 방법론 (specs, phases 등) 제공. Claude Code 위에 process layer를 원할 때 최적.
- **Hook/DX 도구** — Claude Code 세션에 auto-save, code-quality hook, DX 개선 추가.
- **Cross-agent rule converter** — Claude Code, Cursor 등에서 rules 동기화 유지.

이 도구들은 대부분 **상호 보완적이지 경쟁적이 아닙니다**. ClaudeOS-Core는 "코드에서 프로젝트별 rules 생성" 일을 처리; 나머지는 다른 일을 처리. 대부분 함께 사용 가능.

---

## ClaudeOS-Core가 적합한 경우

✅ Claude Code가 일반 컨벤션이 아닌 _내 프로젝트_의 컨벤션을 따르길 원함.
✅ 새 프로젝트를 시작 (또는 팀 onboarding)하면서 빠른 설정 원함.
✅ 코드베이스가 발전하며 `.claude/rules/`를 수동 유지하는 데 지침.
✅ [12개 지원 스택](stacks.md) 중 하나에서 작업.
✅ deterministic, 재현 가능한 출력 원함 (같은 코드 → 매번 같은 rules).
✅ 비영어 출력 필요 (10개 언어 빌트인).

## ClaudeOS-Core가 적합하지 않은 경우

❌ scan 단계 없이 day-one에 작동하는 큐레이션된 agents/skills/rules preset bundle 원함.
❌ 자기 스택이 지원되지 않으며 추가 기여에 관심 없음.
❌ agent orchestration, planning workflow, coding 방법론 원함 — 그것들에 특화된 도구 사용.
❌ 단일 `CLAUDE.md`만 필요하고 standards/rules/skills 전체 set 불필요 — `claude /init`로 충분.

---

## Scope에서 좁고 넓음

ClaudeOS-Core는 광범위 bundle보다 **좁음** (preset agents, hooks, methodology를 ship하지 않고 _내 프로젝트의_ rules만). 단일 artifact에 집중하는 도구보다 **넓음** (CLAUDE.md 외에도 standards, skills, guides, memory의 multi-디렉토리 트리를 생성). 어떤 축이 자기 프로젝트에 중요한지로 선택.

---

## "왜 그냥 Claude /init을 안 쓰나?"

좋은 질문. `claude /init`은 Claude Code 빌트인이고 단일 LLM 호출로 single `CLAUDE.md`를 작성합니다. 빠르고 zero-config.

**잘 동작할 때:**

- 프로젝트가 작음 (≤30 파일).
- Claude가 빠른 file-tree 보기로 스택을 추측하는 게 OK.
- `CLAUDE.md` 하나만 필요하고 전체 `.claude/rules/` set 불필요.

**고전할 때:**

- 프로젝트에 Claude가 빠른 보기로 인식하지 못하는 custom 컨벤션이 있음 (예: JPA 대신 MyBatis, custom response wrapper, 비표준 패키지 layout).
- 팀원 간 재현 가능한 출력 원함.
- 분석을 끝내기 전에 single Claude 호출이 context window를 hit할 만큼 프로젝트가 큼.

ClaudeOS-Core는 `/init`이 고전하는 경우를 위해 만들어졌습니다. `/init`이 작동한다면 ClaudeOS-Core는 아마 필요하지 않을 것.

---

## "왜 그냥 rules를 수동으로 작성 안 하나?"

이것도 정당. `.claude/rules/`를 hand로 작성하는 게 가장 정확한 옵션 — 자기 프로젝트는 자기가 가장 잘 안다.

**잘 동작할 때:**

- 프로젝트 하나, 단일 개발자, rules를 처음부터 작성하는 데 상당한 시간 들이는 게 OK.
- 컨벤션이 안정적이고 잘 문서화됨.

**고전할 때:**

- 새 프로젝트를 자주 시작 (각각 rule-writing 시간 필요).
- 팀이 커지며 사람들이 rules에 무엇이 있는지 잊음.
- 컨벤션이 진화하고 rules가 그 뒤에 drift.

ClaudeOS-Core는 사용 가능한 rule set의 대부분을 single 실행으로 만들어 줍니다. 나머지는 hand-tuning — 많은 사용자가 빈 파일에서 시작하는 것보다 시간을 더 잘 쓰는 방법으로 봅니다.

---

## "preset bundle 그냥 쓰는 것과의 차이는?"

Everything Claude Code 같은 bundle은 "대부분 프로젝트"에 작동하는 큐레이션된 rules / skills / agents set을 제공합니다. 프로젝트가 bundle 가정에 맞으면 빠른 채택에 좋음.

**Bundle이 잘 작동할 때:**

- 프로젝트의 컨벤션이 bundle 기본값과 매치 (예: 표준 Spring Boot 또는 표준 Next.js).
- 비표준 스택 선택이 없음 (예: JPA 대신 MyBatis).
- 시작점을 원하고 거기서 customize하는 데 만족.

**Bundle이 고전할 때:**

- 스택이 비기본 도구를 사용 (bundle의 "Spring Boot" rules는 JPA를 가정).
- bundle이 모르는 강한 프로젝트별 컨벤션이 있음.
- 코드가 진화하며 rules도 업데이트되길 원함.

ClaudeOS-Core는 bundle을 보완 가능: 프로젝트별 rules에 ClaudeOS-Core 사용; 일반 워크플로 rules에 bundle을 layer로.

---

## 비슷한 도구 사이에서 선택하기

ClaudeOS-Core와 다른 project-aware Claude Code 도구 사이에서 선택한다면 자문하세요:

1. **도구가 코드를 읽길 원하나, 아니면 프로젝트를 설명하길 원하나?**
   코드 읽기 → ClaudeOS-Core. 설명 → 대부분 다른 것.

2. **매번 같은 출력이 필요한가?**
   네 → ClaudeOS-Core (deterministic). 아니오 → 어느 것이든.

3. **전체 standards/rules/skills/guides가 필요한가, 아니면 단일 CLAUDE.md만?**
   전체 set → ClaudeOS-Core. CLAUDE.md만 → Claude `/init`.

4. **출력 언어가 영어인가, 다른 것인가?**
   영어만 → 많은 도구가 적합. 다른 언어 → ClaudeOS-Core (10개 언어 빌트인).

5. **agent orchestration, planning workflow, hook이 필요한가?**
   네 → 적절한 전용 도구 사용. ClaudeOS-Core는 그것들을 안 함.

ClaudeOS-Core와 다른 도구를 나란히 사용해 보았다면 [issue를 열어](https://github.com/claudeos-core/claudeos-core/issues) 경험을 공유해주세요 — 이 비교를 더 정확하게 만드는 데 도움이 됩니다.

---

## See also

- [architecture.md](architecture.md) — ClaudeOS-Core가 deterministic인 이유
- [stacks.md](stacks.md) — ClaudeOS-Core가 지원하는 12개 스택
- [verification.md](verification.md) — 다른 도구에 없는 post-generation safety net
