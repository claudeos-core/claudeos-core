# Memory Layer (L4)

v2.0부터 ClaudeOS-Core는 일반 documentation과 함께 영구 memory layer도 함께 만듭니다. Claude Code가 다음과 같이 동작하기를 원하는 장기 프로젝트를 위한 기능입니다:

1. 아키텍처 결정과 그 근거를 기억합니다.
2. 반복되는 실패에서 학습합니다.
3. 자주 발생하는 failure pattern을 영구 rule로 자동 승격합니다.

ClaudeOS-Core를 일회성 생성에만 쓴다면 이 layer는 그냥 무시해도 됩니다. memory 파일은 일단 만들어지지만, 직접 업데이트하지 않는 이상 늘어나지 않습니다.

> 영문 원본: [docs/memory-layer.md](../memory-layer.md).

---

## 무엇이 작성되나

Pass 4가 끝나면 memory layer는 다음과 같이 구성됩니다:

```
claudeos-core/
└── memory/
    ├── decision-log.md          (append-only "왜 X 대신 Y를 선택했나")
    ├── failure-patterns.md      (반복 에러 + frequency + importance)
    ├── compaction.md            (시간이 흐르며 memory가 어떻게 컴팩션되는지)
    └── auto-rule-update.md      (새 rules로 승격되어야 할 패턴)

.claude/
└── rules/
    └── 60.memory/
        ├── 01.decision-log.md       (decision-log.md를 자동 로드하는 rule)
        ├── 02.failure-patterns.md   (failure-patterns.md를 자동 로드하는 rule)
        ├── 03.compaction.md         (compaction.md를 자동 로드하는 rule)
        └── 04.auto-rule-update.md   (auto-rule-update.md를 자동 로드하는 rule)
```

`60.memory/` 아래의 rule 파일에는 memory가 로드돼야 하는 프로젝트 파일과 매치되는 `paths:` glob이 들어 있습니다. Claude Code가 이 glob에 맞는 파일을 편집할 때 해당 memory 파일이 context로 로드됩니다.

이렇게 동작하기 때문에 **on-demand loading**이 됩니다. memory가 항상 context에 들어 있는 게 아니라 관련될 때만 로드되므로, Claude의 작업 context를 가볍게 유지할 수 있습니다.

---

## 4개 memory 파일

### `decision-log.md` — append-only 아키텍처 결정

자명하지 않은 기술 결정을 내릴 때마다 (또는 사용자의 요청을 받은 Claude가) 다음과 같은 블록을 추가합니다:

```markdown
## 2026-04-15 — 모든 저장 timestamp에 UTC 사용

**왜:** Frontend 사용자가 12개 이상의 시간대에 걸쳐 있습니다. 로컬 시간으로 저장하면 사용자가 이동할 때마다 스케줄링 버그가 생깁니다. DB 레벨에서는 UTC를 쓰고 표시 layer에서 사용자별 TZ를 적용하는 방식이 관심사를 깔끔하게 분리합니다.

**고려된 대안:**
- Per-row timezone column. 쿼리가 복잡해져서 거부.
- Browser-local time. 서버 측 스케줄링은 절대 시간이 필요하므로 거부.
```

이 파일은 **시간이 흐를수록 늘어납니다**. 자동으로 삭제되지 않습니다. 오래된 결정이라도 가치 있는 context로 남습니다.

자동 로드되는 rule (`60.memory/01.decision-log.md`)이 Claude Code에게 "왜 X를 이런 식으로 구조화했나?" 같은 질문에 답하기 전에 이 파일을 먼저 참고하라고 알려 줍니다.

### `failure-patterns.md` — 반복되는 실수

Claude Code가 같은 실수를 반복하면 (예: "Claude가 우리 프로젝트는 MyBatis인데 계속 JPA로 만들어 냄") 다음과 같이 항목으로 기록합니다:

```markdown
### MyBatis 매퍼 대신 JPA repository를 생성

- frequency: 7
- importance: 4
- last seen: 2026-04-22
- context: Order/Product/Customer CRUD 모듈 생성 시 패턴 반복.

**Fix:** repository 생성 전에 항상 `build.gradle`에서 `mybatis-spring-boot-starter`를 확인. `<Domain>Repository.java extends JpaRepository`가 아니라 `<Domain>Mapper.java` + `<Domain>.xml` 사용.
```

`frequency` / `importance` / `last seen` 필드가 자동화된 판정을 결정합니다:

- **Compaction:** `lastSeen > 60 days`이고 `importance < 3`인 항목은 삭제됩니다.
- **Rule promotion:** `frequency >= 3`인 항목은 `memory propose-rules`를 통해 새 `.claude/rules/` 항목 후보로 떠오릅니다 (Importance는 필터로 쓰이지 않고 각 제안의 confidence 점수에만 영향을 줍니다).

`memory` subcommand가 메타데이터 필드를 anchored regex (`^[\s*-]+\*{0,2}\s*key\s*\*{0,2}\s*[:=]`)로 파싱하기 때문에, 필드 line은 위 예시와 비슷한 형태여야 합니다. 들여쓰기나 italic 변형은 허용됩니다.

### `compaction.md` — Compaction 로그

이 파일은 compaction 히스토리를 기록합니다:

```markdown
## Last Compaction
- timestamp: 2026-04-26T03:14:00Z
- entries-summarized: 3
- entries-merged: 1
- entries-dropped: 2
- file-trimmed: false
```

`memory compact`를 실행하면 `## Last Compaction` section만 덮어씁니다. 파일의 다른 위치에 추가한 내용은 그대로 보존됩니다.

### `auto-rule-update.md` — 제안 rule 큐

`memory propose-rules`를 실행하면 Claude가 `failure-patterns.md`를 읽고 제안 rule 콘텐츠를 여기에 추가합니다:

```markdown
## Proposed: JPA repository가 아닌 MyBatis 매퍼 사용
- confidence: 0.83
- evidence:
  - failure-patterns.md: "MyBatis 매퍼 대신 JPA repository를 생성" (frequency 7, importance 4)
- proposed-rule-path: .claude/rules/00.core/orm-mybatis.md
- proposed-rule-content: |
    데이터 액세스에는 항상 `<Domain>Mapper.java` + `<Domain>.xml` 사용.
    프로젝트는 `mybatis-spring-boot-starter` 사용 (build.gradle 참고).
    JpaRepository 서브클래스를 생성하지 마세요.
```

제안을 검토하고 원하는 것만 실제 rule 파일에 복사하면 됩니다. **propose-rules 명령은 자동으로 적용하지 않습니다.** 의도된 동작입니다. LLM이 draft한 rule은 사람의 검토를 거쳐야 하기 때문입니다.

---

## Compaction 알고리즘

memory는 늘어나지만 무한정 부풀지는 않습니다. 다음 명령을 실행하면 4단계 compaction이 진행됩니다:

```bash
npx claudeos-core memory compact
```

| Stage | Trigger | Action |
|---|---|---|
| 1 | `lastSeen > 30 days` AND 보존 대상 아님 | 본문을 1줄짜리 "fix" + meta로 축소 |
| 2 | 중복 heading | 병합 (frequency 합산, 본문은 가장 최근 것 사용) |
| 3 | `importance < 3` AND `lastSeen > 60 days` | 삭제 |
| 4 | 파일이 400 라인 초과 | 가장 오래된 비보존 항목부터 trim |

**"보존" 항목**은 모든 stage를 그대로 통과합니다. 다음 중 하나에 해당하면 보존됩니다:

- `importance >= 7`
- `lastSeen < 30 days`
- 본문이 구체적인 (glob이 아닌) 활성 rule 경로를 참조함 (예: `.claude/rules/10.backend/orm-rules.md`)

"활성 rule 경로" 검사는 흥미로운 부분입니다. memory 항목이 실제로 현재 존재하는 rule 파일을 참조하면, 그 항목은 해당 rule의 라이프사이클에 anchor됩니다. rule이 살아 있는 한 memory도 함께 유지됩니다.

compaction 알고리즘은 사람의 망각 곡선을 의도적으로 모방합니다. 자주 보고, 최근에 보고, 중요한 것은 남기고, 드물고 오래되고 덜 중요한 것은 흐려지게 둡니다.

compaction 코드는 `bin/commands/memory.js`의 `compactFile()` 함수를 참고하세요.

---

## Importance 점수

다음 명령을 실행합니다:

```bash
npx claudeos-core memory score
```

`failure-patterns.md` 항목의 importance를 다시 계산합니다:

```
importance = round(frequency × 1.5 + recency × 5), 최대 10
```

여기서 `recency = max(0, 1 - daysSince(lastSeen) / 90)` (90일에 걸쳐 선형으로 감쇠).

예시:
- `frequency = 3`, `lastSeen = 오늘`인 항목 → `round(3 × 1.5 + 1.0 × 5) = round(9.5) = 10`
- `frequency = 3`, `lastSeen = 90일 이상 전`인 항목 → `round(3 × 1.5 + 0 × 5) = 5`

**score 명령은 새로운 line을 삽입하기 전에 기존 importance line을 모두 제거합니다.** 이렇게 하면 score를 여러 번 재실행해도 같은 line이 중복으로 쌓이는 문제를 막을 수 있습니다.

---

## Rule 승격: `propose-rules`

다음 명령을 실행합니다:

```bash
npx claudeos-core memory propose-rules
```

이 명령이 하는 일:

1. `failure-patterns.md`를 읽습니다.
2. `frequency >= 3` 항목만 필터링합니다.
3. 각 후보에 대해 Claude에게 제안 rule 콘텐츠를 draft하도록 요청합니다.
4. confidence를 계산합니다:
   ```
   evidence    = 1.5 × frequency + 0.5 × importance   (importance 기본값 0; importance 누락 시 최대 6)
   confidence  = sigmoid_{k=0.35, x0=8}(evidence) × (anchored ? 1.0 : 0.6)
   ```
   여기서 `anchored`는 항목이 disk의 실제 파일 경로를 참조한다는 뜻입니다.
5. 사람의 검토를 위해 제안을 `auto-rule-update.md`에 작성합니다.

**importance가 누락되면 evidence 값을 최대 6으로 제한합니다.** importance 점수 없이 frequency만으로 sigmoid를 high confidence까지 밀어 올리면 안 되기 때문입니다 (sigmoid의 입력값을 제한하는 것이지 제안의 개수를 제한하는 게 아닙니다).

---

## 일반 워크플로

장기 프로젝트의 리듬은 다음과 같습니다:

1. **`init`을 한 번 실행**해서 다른 결과물과 함께 memory 파일을 만듭니다.

2. **몇 주 동안 Claude Code를 평소대로 사용**합니다. 반복되는 실수가 보이면 (예: Claude가 잘못된 response wrapper를 계속 사용) `failure-patterns.md`에 항목을 추가합니다. 직접 추가해도 되고 Claude에게 부탁해도 됩니다 (`60.memory/02.failure-patterns.md`의 rule이 Claude에게 언제 추가해야 하는지 알려 줍니다).

3. **주기적으로 `memory score`를 실행**해서 importance 값을 갱신합니다. 빠르고 idempotent한 작업입니다.

4. **고점수 패턴이 5개 이상 쌓이면** `memory propose-rules`를 실행해서 draft된 rule을 받습니다.

5. **`auto-rule-update.md`에서 제안을 검토**합니다. 마음에 드는 것만 골라 `.claude/rules/` 아래의 영구 rule 파일에 콘텐츠를 복사합니다.

6. **`memory compact`를 주기적으로 실행**합니다 (한 달에 한 번이나 스케줄 CI에서). 그래야 `failure-patterns.md`가 일정 크기 안에서 유지됩니다.

4개 파일은 이 리듬을 염두에 두고 설계되었습니다. 어떤 단계든 건너뛰어도 괜찮습니다. memory layer는 opt-in이고, 쓰지 않는 파일이 있어도 방해되지 않습니다.

---

## 세션 연속성

CLAUDE.md는 Claude Code가 매 세션마다 자동으로 로드합니다. 반면 memory 파일은 **기본적으로 자동 로드되지 않습니다.** 현재 편집 중인 파일과 매치되는 `paths:` glob에 따라 `60.memory/` rules가 on-demand로 로드되는 방식입니다.

즉, 새로 시작한 Claude Code 세션에서는 관련 파일에 작업하기 전까지 memory가 보이지 않습니다.

Claude Code의 auto-compaction (context의 약 85%)이 실행되면 Claude는 이전에 로드한 memory 파일을 잊어버립니다. CLAUDE.md Section 8에는 **Session Resume Protocol** 산문 블록이 들어 있어서 Claude에게 다음 사항을 상기시킵니다:

- 관련 항목을 찾기 위해 `failure-patterns.md`를 다시 스캔합니다.
- `decision-log.md`의 가장 최근 항목을 다시 읽습니다.
- 현재 열린 파일에 대해 `60.memory/` rules를 다시 매칭합니다.

이건 **산문일 뿐 강제는 아닙니다.** 다만 산문이 구조화돼 있어서 Claude가 따르는 경향이 있습니다. Session Resume Protocol은 v2.3.2+ canonical scaffold의 일부이고, 10개 출력 언어 모두에 보존됩니다.

---

## Memory layer를 건너뛸 시점

memory layer가 도움이 되는 경우:

- **장기 프로젝트** (수개월 이상).
- **팀 단위 작업.** `decision-log.md`가 공유 institutional memory이자 onboarding 도구가 됩니다.
- **Claude Code를 하루에 10회 이상 호출하는 프로젝트.** failure pattern이 유용한 수준까지 빠르게 쌓입니다.

memory layer가 과한 경우:

- 1주일 뒤에 버릴 일회성 스크립트.
- spike나 prototype 프로젝트.
- 튜토리얼이나 데모.

memory 파일은 여전히 Pass 4가 작성하지만 업데이트하지 않으면 늘어나지 않습니다. 사용하지 않으면 유지보수 부담도 없습니다.

memory rule이 아예 자동 로드되지 않게 하고 싶다면 (context 비용을 줄이려는 이유 등) 두 가지 방법이 있습니다:

- `60.memory/` rules를 삭제합니다. resume에서는 Pass 4가 재생성하지 않으므로 `--force`로 다시 실행하지 않는 한 그대로 유지됩니다.
- 각 rule의 `paths:` glob을 어떤 파일에도 매치되지 않도록 좁힙니다.

---

## See also

- [architecture.md](architecture.md) — 파이프라인 context의 Pass 4
- [commands.md](commands.md) — `memory compact` / `memory score` / `memory propose-rules` reference
- [verification.md](verification.md) — content-validator의 `[9/9]` memory 검사
