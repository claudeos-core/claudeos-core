# 수동 설치

`npx`를 쓸 수 없을 때 (사내 방화벽, air-gapped 환경, locked-down CI), ClaudeOS-Core를 수동으로 설치하고 실행하는 방법.

대부분의 사용자에겐 `npx claudeos-core init`이면 충분합니다 — 이 페이지를 읽을 필요 없습니다.

> 영문 원본: [docs/manual-installation.md](../manual-installation.md).

---

## 사전 요건 (설치 방법 무관)

- **Node.js 18+** — `node --version`으로 확인. 더 오래됐으면 [nvm](https://github.com/nvm-sh/nvm), [fnm](https://github.com/Schniz/fnm), 또는 OS 패키지 매니저로 업그레이드.
- **Claude Code** — 설치 및 인증 완료. `claude --version`으로 확인. [Anthropic 공식 설치 가이드](https://docs.anthropic.com/en/docs/claude-code) 참고.
- **Git repo (권장)** — `init`이 `.git/`과 프로젝트 루트에 `package.json`, `build.gradle`, `pom.xml`, `pyproject.toml` 중 하나가 있는지 검사.

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

**장점:** 표준, 대부분 환경에서 작동.
**단점:** npm + 전역 `node_modules`에의 쓰기 권한 필요.

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

**장점:** 프로젝트별 버전 pin; CI 친화적; 전역 오염 없음.
**단점:** `node_modules`가 부풀음 — 단, dependency는 최소 (`glob`과 `gray-matter`만).

한 프로젝트에서 제거:

```bash
npm uninstall claudeos-core
```

---

## Option 3 — Clone & link (기여자용)

개발 또는 기여를 원할 때:

```bash
git clone https://github.com/claudeos-core/claudeos-core.git
cd claudeos-core
npm install
npm link
```

이제 `claudeos-core`가 clone된 repo를 가리키며 PATH에 전역으로 등록.

다른 프로젝트에서 로컬 clone 사용:

```bash
cd /path/to/your/other/project
npm link claudeos-core
```

**장점:** 도구 소스를 편집하고 즉시 변경 사항 테스트 가능.
**단점:** 기여자에게만 유용. clone된 repo를 옮기면 link 깨짐.

---

## Option 4 — Vendored / air-gapped

인터넷 액세스가 없는 환경:

**연결된 머신에서:**

```bash
npm pack claudeos-core
# claudeos-core-2.4.0.tgz 생성
```

**`.tgz`를 air-gapped 환경으로 전송.**

**로컬 파일에서 설치:**

```bash
npm install -g ./claudeos-core-2.4.0.tgz
```

추가로 필요:
- air-gapped 환경에 이미 설치된 Node.js 18+.
- 이미 설치 및 인증된 Claude Code.
- offline npm cache에 번들된 `glob`과 `gray-matter` npm 패키지 (또는 별도로 `npm pack`해서 vendor).

모든 transitive dependency를 번들로 가져오려면, 전송 전에 unpacked tarball 사본 안에서 `npm install --omit=dev`를 실행 가능.

---

## 설치 확인

설치 방법과 무관하게 4개 사전 요건 모두 확인:

```bash
# 버전 출력 (예: 2.4.0)
claudeos-core --version

# Claude Code 버전 출력
claude --version

# Node 버전 출력 (18+이어야 함)
node --version

# Help 텍스트 출력
claudeos-core --help
```

4개 모두 동작하면 프로젝트에서 `claudeos-core init` 실행 준비 완료.

---

## 제거

```bash
# 전역 설치라면
npm uninstall -g claudeos-core

# 프로젝트별 설치라면
npm uninstall claudeos-core
```

프로젝트에서 생성된 콘텐츠도 제거하려면:

```bash
rm -rf claudeos-core/ .claude/rules/ CLAUDE.md
```

ClaudeOS-Core는 `claudeos-core/`, `.claude/rules/`, `CLAUDE.md`에만 씁니다. 이 셋 제거가 프로젝트에서 생성 콘텐츠를 완전히 제거하는 충분 조건.

---

## CI 통합

GitHub Actions의 경우 공식 workflow는 `npx`를 사용:

```yaml
- uses: actions/setup-node@v5
  with:
    node-version: '20'

- run: npx claudeos-core health
```

대부분 CI 사용 사례에 충분 — `npx`가 on-demand로 패키지를 다운로드하고 캐시합니다.

CI가 air-gapped이거나 pin된 버전을 원한다면, Option 2 (프로젝트별 devDependency)와 결합:

```yaml
- uses: actions/setup-node@v5
  with:
    node-version: '20'
    cache: 'npm'

- run: npm ci
- run: npm run claudeos:health
```

다른 CI 시스템 (GitLab, CircleCI, Jenkins 등)에서도 패턴은 동일: Node 설치, Claude Code 설치, 인증, `npx claudeos-core <command>` 실행.

**`health`가 권장 CI 검사** — 빠르고 (LLM 호출 없음) 4개 런타임 validator를 cover. 구조 검증을 위해 `claudeos-core lint`도 실행.

---

## 설치 트러블슈팅

### "Command not found: claudeos-core"

전역 설치가 안 됐거나 PATH에 npm의 전역 bin이 포함되지 않음.

```bash
npm config get prefix
# 이 경로의 bin/ 디렉토리가 PATH에 있는지 확인
```

또는 `npx` 사용:

```bash
npx claudeos-core <command>
```

### "Cannot find module 'glob'"

프로젝트 루트가 아닌 디렉토리에서 ClaudeOS-Core를 실행 중. 프로젝트로 `cd`하거나, 어디서든 작동하는 `npx` 사용.

### "Node.js version not supported"

Node 16 이하. Node 18+로 업그레이드:

```bash
# nvm
nvm install 20 && nvm use 20

# fnm
fnm install 20 && fnm use 20

# OS 패키지 매니저 — 다양함
```

### "Claude Code not found"

ClaudeOS-Core는 로컬 Claude Code 설치를 사용. Claude Code 먼저 설치 ([공식 가이드](https://docs.anthropic.com/en/docs/claude-code)), `claude --version`으로 확인.

`claude`가 설치됐지만 PATH에 없으면 PATH 수정 — override env 변수 없음.

---

## See also

- [commands.md](commands.md) — 설치 후 무엇을 실행할지
- [troubleshooting.md](troubleshooting.md) — `init` 도중 런타임 에러
