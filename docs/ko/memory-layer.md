# Memory Layer (L4)

v2.0 이후 ClaudeOS-Core는 일반 documentation과 함께 영구 memory layer를 작성합니다. 이는 Claude Code가 다음을 하길 원하는 장기 프로젝트를 위한 것입니다:

1. 아키텍처 결정과 그 근거를 기억.
2. 반복되는 실패에서 학습.
3. 빈번한 failure pattern을 영구 rules로 자동 승격.

ClaudeOS-Core를 일회성 생성에만 쓴다면 이 layer는 완전히 무시 가능. memory 파일은 작성되지만 업데이트하지 않으면 자라지 않습니다.

> 영문 원본: [docs/memory-layer.md](../memory-layer.md).

---

## 무엇이 작성되나

Pass 4가 완료되면 memory layer는 다음으로 구성:

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

`60.memory/` rule 파일은 memory가 로드돼야 하는 프로젝트 파일과 매치되는 `paths:` glob을 가집니다. Claude Code가 glob과 매치되는 파일을 편집할 때 해당 memory 파일이 context로 로드됩니다.

이는 **on-demand loading** — memory가 항상 context에 있지 않고 관련될 때만. Claude의 작업 context를 가볍게 유지합니다.

---

## 4개 memory 파일

### `decision-log.md` — append-only 아키텍처 결정

비-자명한 기술 결정을 내리면 (또는 사용자의 prompt를 받은 Claude가) 블록을 append:

```markdown
## 2026-04-15 — 모든 저장 timestamp에 UTC 사용

**왜:** Frontend 사용자가 12+ 시간대에 걸쳐 있음. 로컬 시간 저장은 사용자가 이동할 때마다 스케줄링 버그를 야기. DB 레벨 UTC + 표시 layer의 per-user TZ가 관심사를 깔끔하게 분리.

**고려된 대안:**
- Per-row timezone column — 거부: 쿼리 복잡성.
- Browser-local time — 거부: 서버 측 스케줄링은 절대 시간 필요.
```

이 파일은 **시간이 지나며 자랍니다**. 자동 삭제되지 않음. 옛 결정도 가치 있는 context로 남음.

자동 로드 rule (`60.memory/01.decision-log.md`)이 Claude Code에게 "왜 X를 이런 식으로 구조화했나?" 같은 질문에 답하기 전에 이 파일을 참고하라고 알려줍니다.

### `failure-patterns.md` — 반복 실수

Claude Code가 반복 실수를 하면 (예: "Claude가 우리 프로젝트는 MyBatis인데 계속 JPA를 생성"), 항목이 여기 들어감:

```markdown
### MyBatis 매퍼 대신 JPA repository를 생성

- frequency: 7
- importance: 4
- last seen: 2026-04-22
- context: Order/Product/Customer CRUD 모듈 생성 시 패턴 반복.

**Fix:** repository 생성 전에 항상 `build.gradle`에서 `mybatis-spring-boot-starter`를 확인. `<Domain>Repository.java extends JpaRepository`가 아니라 `<Domain>Mapper.java` + `<Domain>.xml` 사용.
```

`frequency` / `importance` / `last seen` 필드는 자동 결정을 구동:

- **Compaction:** `lastSeen > 60 days` AND `importance < 3`인 항목은 삭제.
- **Rule promotion:** `frequency >= 3` 항목은 `memory propose-rules`를 통해 새 `.claude/rules/` 항목 후보로 surface. (Importance는 필터가 아님 — 각 제안의 confidence 점수에만 영향.)

메타데이터 필드는 `memory` subcommand가 anchored regex (`^[\s*-]+\*{0,2}\s*key\s*\*{0,2}\s*[:=]`)로 파싱하므로 필드 line은 위 예시와 대략 비슷해야 합니다. 들여쓰기나 italic variation은 허용.

### `compaction.md` — Compaction log

이 파일은 compaction 히스토리를 추적:

```markdown
## Last Compaction
- timestamp: 2026-04-26T03:14:00Z
- entries-summarized: 3
- entries-merged: 1
- entries-dropped: 2
- file-trimmed: false
```

각 `memory compact` 실행 시 `## Last Compaction` section만 덮어씀. 파일의 다른 곳에 추가한 것은 보존.

### `auto-rule-update.md` — 제안 rule 큐

`memory propose-rules`를 실행하면 Claude가 `failure-patterns.md`를 읽고 제안 rule 콘텐츠를 여기 append:

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

제안을 검토하고 원하는 것을 실제 rule 파일에 복사. **propose-rules 명령은 자동 적용 안 함** — 의도적입니다, LLM-draft rule은 사람 검토가 필요하기 때문.

---

## Compaction 알고리즘

memory는 자라지만 부풀지 않습니다. 다음을 호출하면 4-stage compaction 실행:

```bash
npx claudeos-core memory compact
```

| Stage | Trigger | Action |
|---|---|---|
| 1 | `lastSeen > 30 days` AND not preserved | 본문이 1줄짜리 "fix" + meta로 축소 |
| 2 | 중복 heading | 병합 (frequency 합산, 본문 = 가장 최근) |
| 3 | `importance < 3` AND `lastSeen > 60 days` | 삭제 |
| 4 | 파일 > 400 라인 | 가장 오래된 non-preserved 항목 trim |

**"보존" 항목**은 모든 stage를 살아남음. 다음 중 하나면 보존:

- `importance >= 7`
- `lastSeen < 30 days`
- 본문이 구체적 (non-glob) 활성 rule 경로 참조 (예: `.claude/rules/10.backend/orm-rules.md`)

"활성 rule 경로" 검사는 흥미롭습니다: memory 항목이 실제, 현재 존재하는 rule 파일을 참조하면, 그 항목은 그 rule의 라이프사이클에 anchor됩니다. rule이 존재하는 한 memory도 유지.

compaction 알고리즘은 사람의 망각 곡선을 의도적으로 모방 — 빈번하고 최근의 중요한 것은 유지, 드물고 오래되고 덜 중요한 것은 fade.

compaction 코드는 `bin/commands/memory.js` (`compactFile()` 함수) 참고.

---

## Importance 점수

실행:

```bash
npx claudeos-core memory score
```

`failure-patterns.md` 항목의 importance 재계산:

```
importance = round(frequency × 1.5 + recency × 5), 10에서 cap
```

여기서 `recency = max(0, 1 - daysSince(lastSeen) / 90)` (90일에 걸친 선형 감쇠).

효과:
- `frequency = 3`이고 `lastSeen = 오늘`인 항목 → `round(3 × 1.5 + 1.0 × 5) = round(9.5) = 10`
- `frequency = 3`이고 `lastSeen = 90+일 전`인 항목 → `round(3 × 1.5 + 0 × 5) = 5`

**score 명령은 삽입 전 기존 importance line을 모두 제거합니다.** 이는 score를 여러 번 재실행했을 때 line 중복 regression을 방지.

---

## Rule 승격: `propose-rules`

실행:

```bash
npx claudeos-core memory propose-rules
```

이는:

1. `failure-patterns.md` 읽음.
2. `frequency >= 3` 항목 필터.
3. 각 후보에 대해 Claude에게 제안 rule 콘텐츠 draft 요청.
4. confidence 계산:
   ```
   evidence    = 1.5 × frequency + 0.5 × importance   (importance 기본 0; importance 누락 시 6에서 cap)
   confidence  = sigmoid_{k=0.35, x0=8}(evidence) × (anchored ? 1.0 : 0.6)
   ```
   여기서 `anchored`는 항목이 disk의 실제 파일 경로를 참조한다는 뜻.
5. 제안을 사람 검토를 위해 `auto-rule-update.md`에 작성.

**evidence 값은 importance 누락 시 6에서 cap** — importance 점수 없이는 frequency만으로 sigmoid를 high confidence로 밀면 안 됨. (이는 sigmoid의 input을 cap하는 것이지 제안 수를 cap하는 게 아님.)

---

## 일반 워크플로

장기 프로젝트의 리듬은 다음과 같습니다:

1. **`init`을 한 번 실행**하여 다른 모든 것과 함께 memory 파일 설정.

2. **몇 주 동안 Claude Code 일반 사용.** 반복 실수 인지 (예: Claude가 잘못된 response wrapper를 계속 사용). `failure-patterns.md`에 항목 append — 수동으로 또는 Claude에게 요청 (`60.memory/02.failure-patterns.md`의 rule이 Claude에게 언제 append할지 지시).

3. **주기적으로 `memory score` 실행**하여 importance 값 갱신. 빠르고 idempotent.

4. **고-점수 패턴이 ~5개 이상일 때**, `memory propose-rules`를 실행하여 draft된 rule 받음.

5. **`auto-rule-update.md`에서 제안 검토**. 원하는 것마다 `.claude/rules/`의 영구 rule 파일에 콘텐츠 복사.

6. **`memory compact` 주기 실행** (한 달에 한 번 또는 스케줄 CI에서) — `failure-patterns.md`를 bound 유지.

이 리듬이 4개 파일의 설계 의도. 어떤 단계든 skip해도 괜찮음 — memory layer는 opt-in이며, 미사용 파일은 방해가 되지 않음.

---

## 세션 연속성

CLAUDE.md는 매 세션마다 Claude Code가 자동 로드. memory 파일은 **기본적으로 자동 로드 안 됨** — Claude가 현재 편집 중인 파일과 매치되는 `paths:` glob에 의해 `60.memory/` rules가 on-demand로 로드.

즉: 새로 시작한 Claude Code 세션에서, memory는 관련 파일에 작업할 때까지 보이지 않음.

Claude Code의 auto-compaction (context의 ~85%)이 실행된 뒤, Claude는 이전에 로드된 memory 파일에 대한 인식을 잃음. CLAUDE.md Section 8은 **Session Resume Protocol** 산문 블록을 포함하여 Claude에게 다음을 상기시킴:

- 관련 항목을 위해 `failure-patterns.md` 재스캔.
- `decision-log.md`의 가장 최근 항목 다시 읽기.
- 현재 열린 파일에 대해 `60.memory/` rules 다시 매칭.

이는 **산문이지 강제 아님** — 그러나 산문이 구조화되어 Claude가 따르는 경향. Session Resume Protocol은 v2.3.2+ canonical scaffold의 일부이며 모든 10개 출력 언어에 보존됨.

---

## Memory layer를 skip할 시기

memory layer는 다음에 가치 있음:

- **장기 프로젝트** (수개월 이상).
- **팀** — `decision-log.md`가 공유 institutional memory와 onboarding 도구가 됨.
- **Claude Code가 하루 ≥10번 호출되는 프로젝트** — failure pattern이 유용해질 만큼 빠르게 누적.

다음에는 과한 도구:

- 1주 후 폐기할 일회성 스크립트.
- spike 또는 prototype 프로젝트.
- 튜토리얼 또는 데모.

memory 파일은 여전히 Pass 4가 작성하지만, 업데이트하지 않으면 자라지 않습니다. 사용하지 않는다면 유지보수 부담 없음.

memory rule이 어떤 것도 자동 로드하지 않게 하고 싶다면 (context 비용 이유로):

- `60.memory/` rules 삭제 — Pass 4는 resume에서 재생성하지 않음, `--force`에서만.
- 또는 각 rule의 `paths:` glob을 어떤 것과도 매치되지 않게 좁힘.

---

## See also

- [architecture.md](architecture.md) — 파이프라인 context의 Pass 4
- [commands.md](commands.md) — `memory compact` / `memory score` / `memory propose-rules` reference
- [verification.md](verification.md) — content-validator의 `[9/9]` memory 검사
