# Manual Installation

`npx` use नहीं कर सकते (corporate firewall, air-gapped environment, locked-down CI)? तो ClaudeOS-Core manually install और चलाने का तरीक़ा यहाँ है.

> अंग्रेज़ी मूल: [docs/manual-installation.md](../manual-installation.md). हिन्दी अनुवाद अंग्रेज़ी के साथ sync में रखा गया है.

ज़्यादातर users के लिए `npx claudeos-core init` काफ़ी है. यह page पढ़ने की ज़रूरत नहीं.

---

## Prerequisites (install method कोई भी हो)

- **Node.js 18+** — `node --version` से check करो. पुराना हो तो [nvm](https://github.com/nvm-sh/nvm), [fnm](https://github.com/Schniz/fnm), या OS package manager से upgrade करो.
- **Claude Code** — installed और authenticated. `claude --version` से check करो. [Anthropic की official install guide](https://docs.anthropic.com/en/docs/claude-code) देखो.
- **Git repo (preferred)** — `init` `.git/` और project root पर `package.json`, `build.gradle`, `pom.xml`, `pyproject.toml` में से कम से कम एक check करता है.

---

## Option 1 — Global npm install

```bash
npm install -g claudeos-core
```

Verify करो:

```bash
claudeos-core --version
```

फिर बिना `npx` के use करो:

```bash
claudeos-core init
```

**Pros:** Standard, ज़्यादातर setups पर काम करता है.
**Cons:** Global `node_modules` के लिए npm + write access चाहिए.

बाद में upgrade करना हो:

```bash
npm install -g claudeos-core@latest
```

Uninstall करना हो:

```bash
npm uninstall -g claudeos-core
```

---

## Option 2 — Per-project devDependency

Project की `package.json` में add करो:

```json
{
  "devDependencies": {
    "claudeos-core": "^2.4.4"
  }
}
```

Install करो:

```bash
npm install
```

npm scripts से use करो:

```json
{
  "scripts": {
    "claudeos:init": "claudeos-core init",
    "claudeos:health": "claudeos-core health",
    "claudeos:lint": "claudeos-core lint"
  }
}
```

फिर:

```bash
npm run claudeos:init
```

**Pros:** Per-project pinned version, CI-friendly, कोई global pollution नहीं.
**Cons:** `node_modules` bloat होता है. हालाँकि dependencies minimal हैं (बस `glob` और `gray-matter`).

एक project से uninstall करना हो:

```bash
npm uninstall claudeos-core
```

---

## Option 3 — Clone & link (contributors के लिए)

Development के लिए या contribute करना हो:

```bash
git clone https://github.com/claudeos-core/claudeos-core.git
cd claudeos-core
npm install
npm link
```

अब `claudeos-core` PATH पर globally है, cloned repo को point करता हुआ.

किसी और project में local clone use करना हो:

```bash
cd /path/to/your/other/project
npm link claudeos-core
```

**Pros:** Tool का source edit करो और तुरंत changes test करो.
**Cons:** सिर्फ contributors के लिए useful. Cloned repo move कर दो तो link टूट जाता है.

---

## Option 4 — Vendored / air-gapped

बिना internet access वाले environments के लिए:

**Connected machine पर:**

```bash
npm pack claudeos-core
# claudeos-core-2.4.4.tgz generate करता है
```

**`.tgz` को air-gapped environment में transfer करो.**

**Local file से install करो:**

```bash
npm install -g ./claudeos-core-2.4.4.tgz
```

ये भी चाहिए:
- Node.js 18+ पहले से air-gapped environment में installed.
- Claude Code पहले से installed और authenticated.
- `glob` और `gray-matter` npm packages offline npm cache में bundled (या उन्हें अलग से `npm pack` करके vendored).

सारी transitive dependencies bundle करनी हों, तो transfer से पहले tarball की unpacked copy के अंदर `npm install --omit=dev` चला सकते हो.

---

## Installation verify करना

कोई भी install method use करो, चारों prerequisites verify कर लो:

```bash
# Version print करना चाहिए (जैसे 2.4.4)
claudeos-core --version

# Claude Code version print करना चाहिए
claude --version

# Node version print करना चाहिए (18+ हो)
node --version

# Help text print करना चाहिए
claudeos-core --help
```

चारों काम कर रहे हैं, तो किसी project में `claudeos-core init` चलाने के लिए ready हो.

---

## Uninstalling

```bash
# Globally installed हो तो
npm uninstall -g claudeos-core

# Per-project installed हो तो
npm uninstall claudeos-core
```

Project से generated content भी हटाना हो:

```bash
rm -rf claudeos-core/ .claude/rules/ CLAUDE.md
```

ClaudeOS-Core सिर्फ `claudeos-core/`, `.claude/rules/`, और `CLAUDE.md` पर write करता है. इन तीनों को हटा देना project से generated content पूरी तरह remove करने के लिए काफ़ी है.

---

## CI integration

GitHub Actions के लिए official workflow `npx` use करता है:

```yaml
- uses: actions/setup-node@v5
  with:
    node-version: '20'

- run: npx claudeos-core health
```

ज़्यादातर CI use cases के लिए यही काफ़ी है. `npx` package on demand download करके cache कर लेता है.

CI air-gapped हो या pinned version चाहिए, तो Option 2 (per-project devDependency) use करो और:

```yaml
- uses: actions/setup-node@v5
  with:
    node-version: '20'
    cache: 'npm'

- run: npm ci
- run: npm run claudeos:health
```

बाक़ी CI systems (GitLab, CircleCI, Jenkins वगैरह) के लिए pattern same है: Node install, Claude Code install, authenticate, `npx claudeos-core <command>` चलाओ.

**CI में `health` recommended check है.** Fast है (कोई LLM calls नहीं), चारों runtime validators cover कर लेता है. Structural validation के लिए साथ में `claudeos-core lint` भी चलाओ.

---

## Installation troubleshooting

### "Command not found: claudeos-core"

या तो globally installed नहीं है, या PATH में npm का global bin नहीं है.

```bash
npm config get prefix
# Ensure करो कि इस path का bin/ directory PATH में है
```

या `npx` use करो:

```bash
npx claudeos-core <command>
```

### "Cannot find module 'glob'"

ClaudeOS-Core को project root नहीं, किसी और directory से चला रहे हो. Project में `cd` करो, या `npx` use करो (कहीं से भी चलता है).

### "Node.js version not supported"

Node 16 या पुराना है. Node 18+ पर upgrade करो:

```bash
# nvm
nvm install 20 && nvm use 20

# fnm
fnm install 20 && fnm use 20

# OS package manager. हर system पर अलग.
```

### "Claude Code not found"

ClaudeOS-Core local Claude Code installation use करता है. पहले Claude Code install करो ([official guide](https://docs.anthropic.com/en/docs/claude-code)), फिर `claude --version` से verify करो.

`claude` installed है पर PATH पर नहीं है, तो PATH ठीक करो. कोई override env variable नहीं है.

---

## यह भी देखें

- [commands.md](commands.md) — Install हो जाने के बाद क्या चलाना है
- [troubleshooting.md](troubleshooting.md) — `init` के दौरान runtime errors
