# Manual Installation

यदि आप `npx` का उपयोग नहीं कर सकते (corporate firewall, air-gapped environment, locked-down CI), तो यहाँ बताया गया है कि ClaudeOS-Core को मैन्युअल रूप से कैसे install करें और चलाएँ।

> अंग्रेज़ी मूल: [docs/manual-installation.md](../manual-installation.md)। हिन्दी अनुवाद अंग्रेज़ी के साथ समकालिक रखा गया है।

अधिकांश users के लिए, `npx claudeos-core init` पर्याप्त है — आपको यह पृष्ठ पढ़ने की आवश्यकता नहीं है।

---

## पूर्वापेक्षाएँ (install method की परवाह किए बिना)

- **Node.js 18+** — `node --version` से सत्यापित करें। यदि पुराना है, तो [nvm](https://github.com/nvm-sh/nvm), [fnm](https://github.com/Schniz/fnm), या अपने OS package manager के माध्यम से upgrade करें।
- **Claude Code** — installed और authenticated। `claude --version` से सत्यापित करें। [Anthropic की आधिकारिक install guide](https://docs.anthropic.com/en/docs/claude-code) देखें।
- **Git repo (preferred)** — `init` `.git/` और project root पर `package.json`, `build.gradle`, `pom.xml`, `pyproject.toml` में से कम से कम एक की जाँच करता है।

---

## Option 1 — Global npm install

```bash
npm install -g claudeos-core
```

सत्यापित करें:

```bash
claudeos-core --version
```

फिर बिना `npx` के उपयोग करें:

```bash
claudeos-core init
```

**Pros:** Standard, अधिकांश setups पर काम करता है।
**Cons:** Global `node_modules` के लिए npm + write access चाहिए।

बाद में upgrade करने के लिए:

```bash
npm install -g claudeos-core@latest
```

Uninstall करने के लिए:

```bash
npm uninstall -g claudeos-core
```

---

## Option 2 — Per-project devDependency

अपने project की `package.json` में जोड़ें:

```json
{
  "devDependencies": {
    "claudeos-core": "^2.4.3"
  }
}
```

Install करें:

```bash
npm install
```

npm scripts के माध्यम से उपयोग करें:

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

**Pros:** प्रति project pinned version; CI-friendly; कोई global pollution नहीं।
**Cons:** `node_modules` को bloat करता है — हालाँकि dependencies न्यूनतम हैं (बस `glob` और `gray-matter`)।

एक project से uninstall करने के लिए:

```bash
npm uninstall claudeos-core
```

---

## Option 3 — Clone & link (योगदानकर्ताओं के लिए)

विकास के लिए या जब आप योगदान करना चाहते हैं:

```bash
git clone https://github.com/claudeos-core/claudeos-core.git
cd claudeos-core
npm install
npm link
```

अब `claudeos-core` आपके PATH पर globally है, cloned repo की ओर इशारा कर रहा है।

किसी अन्य project में local clone का उपयोग करने के लिए:

```bash
cd /path/to/your/other/project
npm link claudeos-core
```

**Pros:** टूल के source को संपादित करें और तुरंत changes test करें।
**Cons:** केवल योगदानकर्ताओं के लिए उपयोगी। यदि आप cloned repo को move करते हैं तो link टूट जाता है।

---

## Option 4 — Vendored / air-gapped

बिना internet access वाले environments के लिए:

**एक connected machine पर:**

```bash
npm pack claudeos-core
# claudeos-core-2.4.3.tgz उत्पन्न करता है
```

**`.tgz` को अपने air-gapped environment में transfer करें।**

**Local file से install करें:**

```bash
npm install -g ./claudeos-core-2.4.3.tgz
```

आपको यह भी चाहिए:
- Node.js 18+ पहले से air-gapped environment में installed।
- Claude Code पहले से installed और authenticated।
- `glob` और `gray-matter` npm packages offline npm cache में bundle किए गए (या उन्हें अलग से `npm pack`-ing करके vendored)।

सभी transitive dependencies bundle करने के लिए, transfer करने से पहले tarball की unpacked copy के अंदर `npm install --omit=dev` चला सकते हैं।

---

## Installation सत्यापित करना

किसी भी install method के बाद, सभी चार पूर्वापेक्षाओं को सत्यापित करें:

```bash
# Version प्रिंट करना चाहिए (उदा., 2.4.3)
claudeos-core --version

# Claude Code version प्रिंट करना चाहिए
claude --version

# Node version प्रिंट करना चाहिए (18+ होना चाहिए)
node --version

# Help text प्रिंट करना चाहिए
claudeos-core --help
```

यदि सभी चार काम करते हैं, आप एक project में `claudeos-core init` चलाने के लिए तैयार हैं।

---

## Uninstalling

```bash
# यदि globally installed
npm uninstall -g claudeos-core

# यदि per-project installed
npm uninstall claudeos-core
```

एक project से उत्पन्न content को भी हटाने के लिए:

```bash
rm -rf claudeos-core/ .claude/rules/ CLAUDE.md
```

ClaudeOS-Core केवल `claudeos-core/`, `.claude/rules/`, और `CLAUDE.md` पर लिखता है। उन तीनों को हटाना एक project से उत्पन्न content को पूरी तरह से हटाने के लिए पर्याप्त है।

---

## CI integration

GitHub Actions के लिए, आधिकारिक workflow `npx` का उपयोग करता है:

```yaml
- uses: actions/setup-node@v5
  with:
    node-version: '20'

- run: npx claudeos-core health
```

यह अधिकांश CI use cases के लिए पर्याप्त है — `npx` package को on demand download करता है और cache करता है।

यदि आपका CI air-gapped है या आप एक pinned version चाहते हैं, तो Option 2 (per-project devDependency) का उपयोग करें और:

```yaml
- uses: actions/setup-node@v5
  with:
    node-version: '20'
    cache: 'npm'

- run: npm ci
- run: npm run claudeos:health
```

अन्य CI systems (GitLab, CircleCI, Jenkins आदि) के लिए, pattern समान है: Node install करें, Claude Code install करें, authenticate करें, `npx claudeos-core <command>` चलाएँ।

**`health` अनुशंसित CI check है** — यह तेज़ है (कोई LLM calls नहीं) और चार runtime validators को कवर करता है। संरचनात्मक validation के लिए, `claudeos-core lint` भी चलाएँ।

---

## Installation troubleshooting

### "Command not found: claudeos-core"

या तो यह globally installed नहीं है, या आपका PATH npm के global bin को include नहीं करता।

```bash
npm config get prefix
# सुनिश्चित करें कि इस path का bin/ directory आपके PATH में है
```

या इसके बजाय `npx` का उपयोग करें:

```bash
npx claudeos-core <command>
```

### "Cannot find module 'glob'"

आप ClaudeOS-Core को एक ऐसी directory से चला रहे हैं जो project root नहीं है। या तो अपने project में `cd` करें, या `npx` का उपयोग करें (जो कहीं से भी काम करता है)।

### "Node.js version not supported"

आपके पास Node 16 या पुराना है। Node 18+ पर upgrade करें:

```bash
# nvm
nvm install 20 && nvm use 20

# fnm
fnm install 20 && fnm use 20

# OS package manager — अलग-अलग होता है
```

### "Claude Code not found"

ClaudeOS-Core आपके local Claude Code installation का उपयोग करता है। पहले Claude Code install करें ([आधिकारिक guide](https://docs.anthropic.com/en/docs/claude-code)), फिर `claude --version` से सत्यापित करें।

यदि `claude` installed है लेकिन आपके PATH पर नहीं है, अपना PATH ठीक करें — कोई override env variable नहीं है।

---

## यह भी देखें

- [commands.md](commands.md) — एक बार installed होने पर, क्या चलाना है
- [troubleshooting.md](troubleshooting.md) — `init` के दौरान runtime errors
