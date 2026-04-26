# Documentation (한국어)

반갑습니다. 이 폴더는 [메인 README](../../README.ko.md)에서 다루지 않는 더 깊은 내용을 모아 둔 문서 모음입니다.

처음 써 보는 분이라면 메인 README만으로 충분합니다. _작동한다_ 는 사실을 넘어 _어떻게_ 작동하는지 궁금해질 때 다시 돌아오세요.

> 영문 원본: [docs/README.md](../README.md). 한국어 번역본은 영문에 맞춰 동기화됩니다.

---

## 처음이라면 — 어디서부터?

순서대로 읽으세요. 각 문서는 앞 문서를 읽었다고 가정하고 쓰여 있습니다.

1. **[Architecture](architecture.md)** — `init`이 내부적으로 어떻게 동작하는지 다룹니다. 4-pass 파이프라인, pass를 나눈 이유, LLM이 개입하기 전에 scanner가 하는 일까지. 개념 모델은 여기서 시작하세요.

2. **[Diagrams](diagrams.md)** — 같은 아키텍처를 Mermaid 다이어그램으로 보여 줍니다. architecture 문서와 같이 훑어보세요.

3. **[Stacks](stacks.md)** — 지원하는 12개 스택(backend 8개 + frontend 4개), 각 스택을 감지하는 방식, scanner가 뽑아내는 사실들.

4. **[Verification](verification.md)** — Claude가 문서를 만든 뒤 돌아가는 5개 validator. 무엇을 검사하는지, 왜 있는지, 출력은 어떻게 읽는지.

5. **[Commands](commands.md)** — 모든 CLI 명령과 그 동작. 기본기를 익힌 다음 레퍼런스로 활용하세요.

여기까지 읽으면 전체적인 멘탈 모델이 잡힙니다. 폴더의 나머지 문서는 특정 상황에서 들춰 보는 용도입니다.

---

## 특정 질문이 있다면

| 질문 | 읽어보기 |
|---|---|
| "`npx` 없이 어떻게 설치하나요?" | [Manual Installation](manual-installation.md) |
| "내 프로젝트 구조가 지원되나요?" | [Stacks](stacks.md), [Advanced Config](advanced-config.md) |
| "재실행하면 직접 편집한 내용이 날아가나요?" | [Safety](safety.md) |
| "뭔가 깨졌어요. 어떻게 복구하죠?" | [Troubleshooting](troubleshooting.md) |
| "도구 X 대신 이걸 왜 쓰나요?" | [Comparison](comparison.md) |
| "memory layer는 어디에 쓰나요?" | [Memory Layer](memory-layer.md) |
| "scanner를 어떻게 커스터마이즈하나요?" | [Advanced Config](advanced-config.md) |

---

## 모든 문서

| 파일 | 주제 |
|---|---|
| [architecture.md](architecture.md) | 4-pass 파이프라인 + scanner + validators 전 과정 |
| [diagrams.md](diagrams.md) | 같은 흐름의 Mermaid 다이어그램 |
| [stacks.md](stacks.md) | 지원되는 12개 스택 상세 |
| [memory-layer.md](memory-layer.md) | L4 memory: decision-log, failure-patterns, compaction |
| [verification.md](verification.md) | 5개 post-generation validator |
| [commands.md](commands.md) | 모든 CLI 명령, 모든 flag, exit code |
| [manual-installation.md](manual-installation.md) | `npx` 없이 설치 (corp / air-gapped / CI) |
| [advanced-config.md](advanced-config.md) | `.claudeos-scan.json` override |
| [safety.md](safety.md) | re-init 시 보존되는 것 |
| [comparison.md](comparison.md) | 비슷한 도구와의 scope 비교 |
| [troubleshooting.md](troubleshooting.md) | 에러와 복구 |

---

## 이 폴더 읽는 법

각 문서는 **단독으로 읽을 수 있게** 쓰여 있습니다. 위의 신규 사용자 경로를 따라가는 게 아니라면 순서대로 읽지 않아도 됩니다. cross-link는 한 개념이 다른 개념에 의존할 때만 달려 있습니다.

이 문서에서 따르는 표기 규칙은 다음과 같습니다.

- **코드 블록**은 실제로 입력하거나 파일에 들어 있는 내용 그대로입니다. 명시적인 줄임 표시가 없으면 축약하지 않습니다.
- **`✅` / `❌`** 는 표에서 "예" / "아니오"만을 뜻합니다. 그 이상의 미묘한 의미는 없습니다.
- **`claudeos-core/standard/00.core/01.project-overview.md`** 같은 파일 경로는 프로젝트 루트 기준 절대 경로입니다.
- **`(v2.4.0)`** 같은 버전 마커가 어떤 기능에 붙어 있다면 "해당 버전에서 추가됨"이라는 뜻입니다. 이전 버전에는 없습니다.

문서에서 사실이라고 한 내용이 사실이 아닌 증거를 발견했다면, 그건 문서 버그입니다. [issue로 알려 주세요](https://github.com/claudeos-core/claudeos-core/issues).

---

## 모호한 부분이 있다면

어떤 문서든 PR을 환영합니다. 문서는 다음 원칙을 따릅니다.

- **전문용어보다 일상 표현.** 독자 대부분은 ClaudeOS-Core를 처음 만집니다.
- **추상 설명보다 예시.** 실제 코드, 파일 경로, 명령 출력을 보여 주세요.
- **한계는 솔직하게.** 잘 안 되거나 전제 조건이 있으면 그대로 적습니다.
- **소스로 검증한 내용만.** 존재하지 않는 기능은 문서화하지 않습니다.

기여 절차는 [CONTRIBUTING.md](../../CONTRIBUTING.md)를 참고하세요.
