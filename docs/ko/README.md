# Documentation (한국어)

환영합니다. 이 폴더는 [메인 README](../../README.ko.md)에서 다루지 않는 깊이가 필요할 때 보는 문서 모음입니다.

처음 사용해 보는 분이라면 메인 README로 충분합니다 — 무언가가 _작동한다_ 는 사실뿐 아니라 _어떻게_ 작동하는지 알고 싶을 때 다시 돌아오세요.

> 영문 원본: [docs/README.md](../README.md). 한국어 번역본은 영문에 맞춰 동기화됩니다.

---

## 처음이라면 — 어디서부터?

순서대로 읽으세요. 각 문서는 이전 문서를 읽었다고 가정합니다.

1. **[Architecture](architecture.md)** — `init`이 내부적으로 어떻게 동작하는지. 4-pass 파이프라인, 왜 pass로 나누는지, LLM이 개입하기 전에 scanner가 무엇을 하는지. 개념 모델은 여기서 시작.

2. **[Diagrams](diagrams.md)** — 같은 아키텍처를 Mermaid 다이어그램으로 설명. architecture 문서와 함께 훑어보세요.

3. **[Stacks](stacks.md)** — 지원되는 12개 스택 (8 backend + 4 frontend), 각 스택이 어떻게 감지되는지, 스캐너가 어떤 사실을 추출하는지.

4. **[Verification](verification.md)** — Claude가 docs를 생성한 뒤 실행되는 5개 validator. 무엇을 검사하는지, 왜 존재하는지, 출력을 어떻게 읽는지.

5. **[Commands](commands.md)** — 모든 CLI 명령과 그 동작. 기본기를 익힌 뒤 reference로 사용.

5단계까지 완료하면 멘탈 모델이 잡힙니다. 이 폴더의 나머지는 특정 상황별 문서입니다.

---

## 특정 질문이 있다면

| 질문 | 읽어보기 |
|---|---|
| "`npx` 없이 어떻게 설치하나요?" | [Manual Installation](manual-installation.md) |
| "내 프로젝트 구조가 지원되나요?" | [Stacks](stacks.md), [Advanced Config](advanced-config.md) |
| "재실행하면 편집한 내용이 날아가나요?" | [Safety](safety.md) |
| "뭔가 깨졌어요 — 어떻게 복구하나요?" | [Troubleshooting](troubleshooting.md) |
| "도구 X 대신 이걸 쓰는 이유?" | [Comparison](comparison.md) |
| "memory layer는 무엇을 위한 건가요?" | [Memory Layer](memory-layer.md) |
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

각 문서는 **단독으로 읽을 수 있게** 작성되었습니다 — 위의 신규 사용자 경로를 따라가는 게 아니라면 순서를 지킬 필요가 없습니다. 한 개념이 다른 개념에 의존할 때만 cross-link가 존재합니다.

이 docs에서 사용된 컨벤션:

- **코드 블록**은 실제로 입력하거나 파일에 들어 있는 내용을 보여줍니다. 명시적으로 줄임 표시가 없는 한 축약하지 않습니다.
- **`✅` / `❌`** 는 표에서 "예" / "아니오"를 의미하며, 그 외 미묘한 의미는 없습니다.
- **`claudeos-core/standard/00.core/01.project-overview.md`** 같은 파일 경로는 프로젝트 루트로부터의 절대 경로입니다.
- **`(v2.4.0)`** 같은 버전 마커가 기능에 붙어 있으면 "이 버전에서 추가됨"을 의미합니다 — 이전 버전엔 없습니다.

문서가 사실이라고 말하는 무언가가 사실이 아닌 증거를 발견했다면, 그것은 문서 버그입니다 — [issue를 열어주세요](https://github.com/claudeos-core/claudeos-core/issues).

---

## 모호한 부분이 있다면

어떤 docs든 PR 환영입니다. docs는 다음 컨벤션을 따릅니다:

- **전문용어보다 일반 표현.** 대부분의 독자가 ClaudeOS-Core를 처음 사용합니다.
- **추상보다 예시.** 실제 코드, 파일 경로, 명령 출력을 보여주세요.
- **한계에 대해 솔직하게.** 작동하지 않거나 단서가 있으면 그렇게 말하세요.
- **소스에 대해 검증된 내용만.** 존재하지 않는 기능을 문서화하지 않습니다.

기여 흐름은 [CONTRIBUTING.md](../../CONTRIBUTING.md) 참고.
