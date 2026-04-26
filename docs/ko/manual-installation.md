# 수동 설치

사내 방화벽, air-gapped 환경, locked-down CI 등 `npx`를 쓸 수 없는 상황에서 ClaudeOS-Core를 수동으로 설치하고 실행하는 방법을 정리했습니다.

대부분의 경우에는 `npx claudeos-core init`이면 충분하니 이 페이지를 굳이 읽을 필요가 없습니다.

> 영문 원본: [docs/manual-installation.md](../manual-installation.md).

---

## 사전 요건 (설치 방법과 무관)

- **Node.js 18+** — `node --version`으로 확인합니다. 그보다 낮은 버전이라면 [nvm](https://github.com/nvm-sh/nvm), [fnm](https://github.com/Schniz/fnm), 또는 OS 패키지 매니저로 업그레이드하세요.
- **Claude Code** — 설치와 인증이 끝나 있어야 합니다. `claude --version`으로 확인하세요. [Anthropic 공식 설치 가이드](https://docs.anthropic.com/en/docs/claude-code) 참고.
- **Git repo (권장)** — `init`은 프로젝트 루트에 `.git/`이 있고, `package.json`, `build.gradle`, `pom.xml`, `pyproject.toml` 중 하나가 있는지 확인합니다.

---

## Option 1 — 전역 npm 설치

```bash
npm install -g claudeos-core
```

확인:

```bash
claudeos-core --version
```

`npx` 없이 사용:

```bash
claudeos-core init
```

**장점:** 표준 방식이고 대부분의 환경에서 동작합니다.
**단점:** npm과 전역 `node_modules`에 쓰기 권한이 필요합니다.

나중에 업그레이드:

```bash
npm install -g claudeos-core@latest
```

제거:

```bash
npm uninstall -g claudeos-core
```

---

## Option 2 — 프로젝트별 devDependency

프로젝트의 `package.json`에 추가:

```json
{
  "devDependencies": {
    "claudeos-core": "^2.4.0"
  }
}
```

설치:

```bash
npm install
```

npm script로 사용:

```json
{
  "scripts": {
    "claudeos:init": "claudeos-core init",
    "claudeos:health": "claudeos-core health",
    "claudeos:lint": "claudeos-core lint"
  }
}
```

그 다음:

```bash
npm run claudeos:init
```

**장점:** 프로젝트별로 버전을 pin할 수 있고, CI에 친화적이며, 전역을 더럽히지 않습니다.
**단점:** `node_modules`가 약간 커집니다. 다만 의존성은 최소(`glob`과 `gray-matter`뿐)라 부담이 크지 않습니다.

한 프로젝트에서 제거:

```bash
npm uninstall claudeos-core
```

---

## Option 3 — Clone & link (기여자용)

도구를 직접 개발하거나 기여하고 싶을 때:

```bash
git clone https://github.com/claudeos-core/claudeos-core.git
cd claudeos-core
npm install
npm link
```

이제 `claudeos-core`가 clone한 repo를 가리키면서 PATH에 전역 등록됩니다.

다른 프로젝트에서 로컬 clone을 쓰고 싶다면:

```bash
cd /path/to/your/other/project
npm link claudeos-core
```

**장점:** 도구 소스를 직접 편집하면서 변경 사항을 즉시 테스트할 수 있습니다.
**단점:** 기여자에게만 유용합니다. clone한 repo를 옮기면 link가 깨집니다.

---

## Option 4 — Vendored / air-gapped

인터넷 접속이 없는 환경에서 쓰는 방법입니다.

**인터넷이 되는 머신에서:**

```bash
npm pack claudeos-core
# claudeos-core-2.4.0.tgz 생성
```

**`.tgz` 파일을 air-gapped 환경으로 옮깁니다.**

**로컬 파일에서 설치:**

```bash
npm install -g ./claudeos-core-2.4.0.tgz
```

추가로 필요한 것:
- air-gapped 환경에 미리 설치된 Node.js 18+.
- 미리 설치 및 인증된 Claude Code.
- offline npm cache에 번들된 `glob`과 `gray-matter` npm 패키지(또는 따로 `npm pack`해서 vendor).

모든 transitive dependency를 함께 가져가고 싶다면, 옮기기 전에 unpack한 tarball 사본 안에서 `npm install --omit=dev`를 한 번 돌리면 됩니다.

---

## 설치 확인

설치 방법과 상관없이 다음 네 가지를 모두 확인합니다:

```bash
# 버전 출력 (예: 2.4.0)
claudeos-core --version

# Claude Code 버전 출력
claude --version

# Node 버전 출력 (18 이상이어야 함)
node --version

# Help 텍스트 출력
claudeos-core --help
```

네 가지 모두 정상이면 프로젝트에서 `claudeos-core init`을 실행할 준비가 끝난 것입니다.

---

## 제거

```bash
# 전역 설치라면
npm uninstall -g claudeos-core

# 프로젝트별 설치라면
npm uninstall claudeos-core
```

프로젝트에서 만들어진 콘텐츠까지 제거하려면:

```bash
rm -rf claudeos-core/ .claude/rules/ CLAUDE.md
```

ClaudeOS-Core가 쓰는 위치는 `claudeos-core/`, `.claude/rules/`, `CLAUDE.md`뿐이라, 이 세 곳만 지워도 생성된 콘텐츠를 완전히 정리할 수 있습니다.

---

## CI 통합

GitHub Actions에서는 공식 workflow가 `npx`를 사용합니다:

```yaml
- uses: actions/setup-node@v5
  with:
    node-version: '20'

- run: npx claudeos-core health
```

대부분의 CI 사용 사례에는 이 정도면 충분합니다. `npx`가 필요할 때 패키지를 받아 캐시해 줍니다.

CI가 air-gapped이거나 버전을 고정해서 쓰고 싶다면 Option 2(프로젝트별 devDependency)와 함께 씁니다:

```yaml
- uses: actions/setup-node@v5
  with:
    node-version: '20'
    cache: 'npm'

- run: npm ci
- run: npm run claudeos:health
```

GitLab, CircleCI, Jenkins 같은 다른 CI 시스템에서도 패턴은 같습니다. Node 설치, Claude Code 설치 및 인증, `npx claudeos-core <command>` 실행 순서입니다.

**CI에서는 `health`를 추천합니다.** LLM 호출이 없어 빠르고, 4개 런타임 validator를 모두 다룹니다. 구조 검증까지 하려면 `claudeos-core lint`를 함께 실행하세요.

---

## 설치 트러블슈팅

### "Command not found: claudeos-core"

전역 설치가 안 됐거나, npm의 전역 bin이 PATH에 들어 있지 않은 경우입니다.

```bash
npm config get prefix
# 이 경로 아래의 bin/ 디렉토리가 PATH에 있는지 확인
```

아니면 그냥 `npx`를 쓰세요:

```bash
npx claudeos-core <command>
```

### "Cannot find module 'glob'"

프로젝트 루트가 아닌 디렉토리에서 ClaudeOS-Core를 실행한 경우입니다. 프로젝트 디렉토리로 `cd`하거나, 어디서든 동작하는 `npx`를 사용하세요.

### "Node.js version not supported"

Node 16 이하 버전입니다. Node 18 이상으로 업그레이드하세요:

```bash
# nvm
nvm install 20 && nvm use 20

# fnm
fnm install 20 && fnm use 20

# OS 패키지 매니저 — 환경마다 다름
```

### "Claude Code not found"

ClaudeOS-Core는 로컬에 설치된 Claude Code를 사용합니다. Claude Code를 먼저 설치하고([공식 가이드](https://docs.anthropic.com/en/docs/claude-code)) `claude --version`으로 확인하세요.

`claude`가 설치되어 있는데 PATH에 없다면 PATH를 수정해야 합니다. override용 환경 변수는 없습니다.

---

## See also

- [commands.md](commands.md) — 설치 후 무엇을 실행할지
- [troubleshooting.md](troubleshooting.md) — `init` 도중 발생하는 런타임 에러
