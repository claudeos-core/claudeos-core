# ClaudeOS-Core

**एकमात्र टूल जो पहले आपका सोर्स कोड पढ़ता है, deterministic एनालिसिस से स्टैक और पैटर्न कन्फर्म करता है, फिर आपके प्रोजेक्ट के लिए सटीक Claude Code रूल्स जेनरेट करता है।**

```bash
npx claudeos-core init
```

ClaudeOS-Core आपका कोडबेस पढ़ता है, हर पैटर्न को एक्सट्रैक्ट करता है, और _आपके_ प्रोजेक्ट के लिए कस्टमाइज़्ड Standards, Rules, Skills और Guides का पूरा सेट जेनरेट करता है। इसके बाद, जब आप Claude Code को "ऑर्डर के लिए CRUD बनाओ" कहते हैं, तो यह आपके मौजूदा पैटर्न से बिल्कुल मेल खाने वाला कोड जेनरेट करता है।

[🇺🇸 English](./README.md) · [🇰🇷 한국어](./README.ko.md) · [🇨🇳 中文](./README.zh-CN.md) · [🇯🇵 日本語](./README.ja.md) · [🇪🇸 Español](./README.es.md) · [🇻🇳 Tiếng Việt](./README.vi.md) · [🇷🇺 Русский](./README.ru.md) · [🇫🇷 Français](./README.fr.md) · [🇩🇪 Deutsch](./README.de.md)

---

## ClaudeOS-Core क्यों?

> इंसान प्रोजेक्ट का वर्णन करता है → LLM डॉक्यूमेंटेशन जेनरेट करता है

ClaudeOS-Core:

> कोड सोर्स का विश्लेषण करता है → कोड कस्टम प्रॉम्प्ट बनाता है → LLM डॉक्यूमेंटेशन जेनरेट करता है → कोड आउटपुट को वेरिफाई करता है

### मूल समस्या: LLM अनुमान लगाता है। कोड कन्फर्म करता है।

जब आप Claude से "इस प्रोजेक्ट का विश्लेषण करो" कहते हैं, तो यह स्टैक, ORM, डोमेन स्ट्रक्चर का **अनुमान** लगाता है।

**ClaudeOS-Core अनुमान नहीं लगाता।** Claude Node.js:

- `build.gradle` / `package.json` / `pyproject.toml` → **confirmed**
- directory scan → **confirmed**
- Java 5 patterns, Kotlin CQRS/BFF, Next.js App Router/FSD → **classified**
- domain groups → **split**
- stack-specific prompt → **assembled**

### परिणाम

अन्य टूल "सामान्य रूप से अच्छा" डॉक्यूमेंटेशन बनाते हैं।
ClaudeOS-Core ऐसा डॉक्यूमेंटेशन बनाता है जो जानता है कि प्रोजेक्ट `ApiResponse.ok()` इस्तेमाल करता है — क्योंकि इसने वास्तविक कोड पढ़ा है।

### Before & After

**ClaudeOS-Core के बिना**:
```
❌ JPA repository (MyBatis)
❌ ResponseEntity.success() (ApiResponse.ok())
❌ order/controller/ (controller/order/)
→ 20 min fix per file
```

**ClaudeOS-Core के साथ**:
```
✅ MyBatis mapper + XML (build.gradle)
✅ ApiResponse.ok() (source code)
✅ controller/order/ (Pattern A)
→ immediate match
```

यह अंतर संचयी है। प्रतिदिन 10 कार्य × 20 मिनट बचत = **प्रतिदिन 3+ घंटे**।

---

## सपोर्टेड स्टैक्स

| स्टैक | डिटेक्शन | विश्लेषण गहराई |
|---|---|---|
| **Java / Spring Boot** | `build.gradle`, `pom.xml`, 5 पैकेज पैटर्न | 10 कैटेगरी, 59 सब-आइटम |
| **Kotlin / Spring Boot** | `build.gradle.kts`, kotlin plugin, `settings.gradle.kts`, CQRS/BFF auto-detect | 12 कैटेगरी, 95 सब-आइटम |
| **Node.js / Express** | `package.json` | 9 कैटेगरी, 57 सब-आइटम |
| **Node.js / NestJS** | `package.json` (`@nestjs/core`) | 10 श्रेणियाँ, 68 उप-आइटम |
| **Next.js / React** | `package.json`, `next.config.*`, FSD सपोर्ट | 9 कैटेगरी, 55 सब-आइटम |
| **Vue / Nuxt** | `package.json`, `nuxt.config.*`, Composition API | 9 श्रेणियाँ, 58 उप-आइटम |
| **Python / Django** | `requirements.txt`, `pyproject.toml` | 10 कैटेगरी, 55 सब-आइटम |
| **Python / FastAPI** | `requirements.txt`, `pyproject.toml` | 10 कैटेगरी, 58 सब-आइटम |
| **Node.js / Fastify** | `package.json` | 10 कैटेगरी, 62 सब-आइटम |
| **Vite / React SPA** | `package.json`, `vite.config.*` | 9 कैटेगरी, 55 सब-आइटम |
| **Angular** | `package.json`, `angular.json` | 12 कैटेगरी, 78 सब-आइटम |

ऑटो-डिटेक्ट: भाषा और वर्शन, फ्रेमवर्क और वर्शन (Vite को SPA फ्रेमवर्क के रूप में शामिल), ORM (MyBatis, JPA, Exposed, Prisma, TypeORM, SQLAlchemy, आदि), डेटाबेस (PostgreSQL, MySQL, Oracle, MongoDB, SQLite), पैकेज मैनेजर (Gradle, Maven, npm, yarn, pnpm, pip, poetry), आर्किटेक्चर (CQRS, BFF — मॉड्यूल नामों से पता लगाया), मल्टी-मॉड्यूल संरचना (settings.gradle से पता लगाया), मोनोरेपो (Turborepo, pnpm-workspace, Lerna, npm/yarn workspaces)।

**आपको कुछ भी स्पेसिफाई करने की ज़रूरत नहीं। सब कुछ ऑटोमैटिकली डिटेक्ट होता है।**


### Java डोमेन डिटेक्शन (5 पैटर्न, फॉलबैक के साथ)

| प्राथमिकता | पैटर्न | संरचना | उदाहरण |
|---|---|---|---|
| A | लेयर-फर्स्ट | `controller/{domain}/` | `controller/user/UserController.java` |
| B | डोमेन-फर्स्ट | `{domain}/controller/` | `user/controller/UserController.java` |
| D | मॉड्यूल प्रीफ़िक्स | `{module}/{domain}/controller/` | `front/member/controller/MemberController.java` |
| E | DDD/हेक्सागोनल | `{domain}/adapter/in/web/` | `user/adapter/in/web/UserController.java` |
| C | फ्लैट | `controller/*.java` | `controller/UserController.java` → क्लास नाम से `user` एक्सट्रैक्ट |

बिना Controller वाले सर्विस-ओनली डोमेन भी `service/`, `dao/`, `aggregator/`, `facade/`, `usecase/`, `orchestrator/`, `mapper/`, `repository/` डायरेक्टरी के ज़रिए डिटेक्ट होते हैं। स्किप: `common`, `config`, `util`, `core`, `front`, `admin`, `v1`, `v2` आदि।


### Kotlin मल्टी-मॉड्यूल डोमेन डिटेक्शन

Gradle मल्टी-मॉड्यूल संरचना वाले Kotlin प्रोजेक्ट्स (जैसे: CQRS मोनोरेपो) के लिए:

| स्टेप | क्या करता है | उदाहरण |
|---|---|---|
| 1 | `settings.gradle.kts` में `include()` स्कैन करें | 14 मॉड्यूल मिले |
| 2 | नाम से मॉड्यूल टाइप डिटेक्ट करें | `reservation-command-server` → type: `command` |
| 3 | मॉड्यूल नाम से डोमेन एक्सट्रैक्ट करें | `reservation-command-server` → domain: `reservation` |
| 4 | मॉड्यूल्स में समान डोमेन ग्रुप करें | `reservation-command-server` + `common-query-server` → 1 डोमेन |
| 5 | आर्किटेक्चर डिटेक्ट करें | `command` + `query` मॉड्यूल हैं → CQRS |

सपोर्टेड मॉड्यूल टाइप: `command`, `query`, `bff`, `integration`, `standalone`, `library`। शेयर्ड लाइब्रेरी (`shared-lib`, `integration-lib`) स्पेशल डोमेन के रूप में डिटेक्ट होती हैं।

### फ्रंटएंड डोमेन डिटेक्शन

- **App Router**: `app/{domain}/page.tsx` (Next.js)
- **Pages Router**: `pages/{domain}/index.tsx`
- **FSD (Feature-Sliced Design)**: `features/*/`, `widgets/*/`, `entities/*/`
- **RSC/Client split**: `client.tsx` पैटर्न डिटेक्ट, Server/Client कम्पोनेंट सेपरेशन ट्रैक
- **नॉन-स्टैंडर्ड नेस्टेड पाथ**: `src/*/pages/`, `src/*/components/`, `src/*/features/` के तहत पेज, कंपोनेंट और FSD लेयर डिटेक्ट (उदा. `src/admin/pages/dashboard/`)
- **Config fallback**: `package.json` में न होने पर भी config फ़ाइलों से Next.js/Vite/Nuxt डिटेक्ट (monorepo सपोर्ट)
- **Deep directory fallback**: React/CRA/Vite/Vue/RN प्रोजेक्ट्स के लिए किसी भी गहराई पर `**/components/*/`, `**/views/*/`, `**/screens/*/`, `**/containers/*/`, `**/pages/*/`, `**/routes/*/`, `**/modules/*/`, `**/domains/*/` स्कैन

---

## क्विक स्टार्ट

### पूर्वापेक्षाएँ

- **Node.js** v18+
- **Claude Code CLI** (इंस्टॉल और ऑथेंटिकेट किया हुआ)

### इंस्टॉलेशन

```bash
cd /your/project/root

# विकल्प A: npx (अनुशंसित — इंस्टॉल की आवश्यकता नहीं)
npx claudeos-core init

# विकल्प B: ग्लोबल इंस्टॉल
npm install -g claudeos-core
claudeos-core init

# विकल्प C: प्रोजेक्ट devDependency
npm install --save-dev claudeos-core
npx claudeos-core init

# विकल्प D: git clone (डेवलपमेंट/कॉन्ट्रिब्यूशन के लिए)
git clone https://github.com/claudeos-core/claudeos-core.git claudeos-core-tools

# क्रॉस-प्लेटफ़ॉर्म (PowerShell, CMD, Bash, Zsh — कोई भी टर्मिनल)
node claudeos-core-tools/bin/cli.js init

# केवल Linux/macOS (केवल Bash)
bash claudeos-core-tools/bootstrap.sh
```

### आउटपुट भाषा (10 भाषाएँ)

`--lang` के बिना `init` चलाने पर, एरो कीज़ या नंबर कीज़ से भाषा चुनने का इंटरैक्टिव सेलेक्टर दिखाई देगा:

```
╔══════════════════════════════════════════════════╗
║  Select generated document language (required)   ║
╚══════════════════════════════════════════════════╝

  जनरेट की गई फ़ाइलें (CLAUDE.md, Standards, Rules,
  Skills, Guides) हिन्दी में लिखी जाएंगी।

     1. en     — English
     ...
  ❯  7. hi     — हिन्दी (Hindi)
     ...

  ↑↓ Move  1-0 Jump  Enter Select  ESC Cancel
```

सेलेक्शन मूव करने पर विवरण उस भाषा में बदलता है। सेलेक्टर स्किप करने के लिए:

```bash
npx claudeos-core init --lang hi    # हिन्दी
npx claudeos-core init --lang en    # English
npx claudeos-core init --lang ko    # 한국어
```

> **नोट:** यह केवल जनरेट होने वाली डॉक्यूमेंट फ़ाइलों की भाषा बदलता है। कोड एनालिसिस (Pass 1–2) हमेशा अंग्रेज़ी में चलता है; केवल जनरेट रिज़ल्ट (Pass 3) चुनी गई भाषा में लिखा जाता है।

बस इतना ही। 5–18 मिनट बाद, सारा डॉक्यूमेंटेशन जेनरेट होकर उपयोग के लिए तैयार है। CLI प्रत्येक Pass के लिए प्रतिशत, बीता समय और अनुमानित शेष समय के साथ प्रोग्रेस बार दिखाता है।

### मैन्युअल स्टेप-बाय-स्टेप इंस्टॉलेशन

यदि आप प्रत्येक चरण पर पूर्ण नियंत्रण चाहते हैं — या यदि ऑटोमेटेड पाइपलाइन किसी स्टेप पर फेल हो जाती है — तो आप प्रत्येक स्टेज को मैन्युअली रन कर सकते हैं। यह ClaudeOS-Core के इंटर्नल वर्किंग को समझने के लिए भी उपयोगी है।

#### Step 1: क्लोन करें और डिपेंडेंसी इंस्टॉल करें

```bash
cd /your/project/root

git clone https://github.com/claudeos-core/claudeos-core.git claudeos-core-tools
cd claudeos-core-tools && npm install && cd ..
```

#### Step 2: डायरेक्टरी स्ट्रक्चर बनाएं

```bash
# Rules
mkdir -p .claude/rules/{00.core,10.backend,20.frontend,30.security-db,40.infra,50.sync}

# Standards
mkdir -p claudeos-core/standard/{00.core,10.backend-api,20.frontend-ui,30.security-db,40.infra,50.verification,90.optional}

# Skills
mkdir -p claudeos-core/skills/{00.shared,10.backend-crud/scaffold-crud-feature,20.frontend-page/scaffold-page-feature,50.testing,90.experimental}

# Guide, Plan, Database, MCP, Generated
mkdir -p claudeos-core/guide/{01.onboarding,02.usage,03.troubleshooting,04.architecture}
mkdir -p claudeos-core/{plan,database,mcp-guide,generated}
```

#### Step 3: plan-installer रन करें (प्रोजेक्ट एनालिसिस)

आपके प्रोजेक्ट को स्कैन करता है, स्टैक डिटेक्ट करता है, डोमेन ढूंढता है, ग्रुप में विभाजित करता है, और प्रॉम्प्ट जेनरेट करता है।

```bash
node claudeos-core-tools/plan-installer/index.js
```

**आउटपुट (`claudeos-core/generated/`):**
- `project-analysis.json` — डिटेक्टेड स्टैक, डोमेन, फ्रंटएंड इन्फो
- `domain-groups.json` — Pass 1 के लिए डोमेन ग्रुप
- `pass1-backend-prompt.md` / `pass1-frontend-prompt.md` — एनालिसिस प्रॉम्प्ट
- `pass2-prompt.md` — मर्ज प्रॉम्प्ट
- `pass3-prompt.md` — जेनरेशन प्रॉम्प्ट

आगे बढ़ने से पहले आप इन फाइलों की जांच करके डिटेक्शन सटीकता सत्यापित कर सकते हैं।

#### Step 4: Pass 1 — डोमेन ग्रुप के अनुसार डीप कोड एनालिसिस

प्रत्येक डोमेन ग्रुप के लिए Pass 1 रन करें। ग्रुप की संख्या के लिए `domain-groups.json` चेक करें।

```bash
# Check groups
cat claudeos-core/generated/domain-groups.json | node -e "
  const g = JSON.parse(require('fs').readFileSync('/dev/stdin','utf-8'));
  g.groups.forEach((g,i) => console.log('Group '+(i+1)+': ['+g.domains.join(', ')+'] ('+g.type+', ~'+g.estimatedFiles+' files)'));
"

# Run Pass 1 for group 1:
cp claudeos-core/generated/pass1-backend-prompt.md /tmp/_pass1.md
DOMAIN_LIST="user, order, product" PASS_NUM=1 \
  perl -pi -e 's/\{\{DOMAIN_GROUP\}\}/$ENV{DOMAIN_LIST}/g; s/\{\{PASS_NUM\}\}/$ENV{PASS_NUM}/g' /tmp/_pass1.md
cat /tmp/_pass1.md | claude -p --dangerously-skip-permissions

# फ्रंटएंड ग्रुप के लिए pass1-frontend-prompt.md का उपयोग करें
```

**सत्यापित करें:** `ls claudeos-core/generated/pass1-*.json` में प्रति ग्रुप एक JSON दिखना चाहिए।

#### Step 5: Pass 2 — एनालिसिस रिज़ल्ट मर्ज करें

```bash
cat claudeos-core/generated/pass2-prompt.md \
  | claude -p --dangerously-skip-permissions
```

**सत्यापित करें:** `claudeos-core/generated/pass2-merged.json` मौजूद होना चाहिए जिसमें 9+ टॉप-लेवल कीज़ हों।

#### Step 6: Pass 3 — सभी डॉक्यूमेंटेशन जेनरेट करें

```bash
cat claudeos-core/generated/pass3-prompt.md \
  | claude -p --dangerously-skip-permissions
```

**सत्यापित करें:** प्रोजेक्ट रूट में `CLAUDE.md` मौजूद होना चाहिए।

#### Step 7: वेरिफिकेशन टूल्स रन करें

```bash
# मेटाडेटा जेनरेट करें (अन्य चेक से पहले आवश्यक)
node claudeos-core-tools/manifest-generator/index.js

# सभी चेक रन करें
node claudeos-core-tools/health-checker/index.js

# या इंडिविजुअल चेक रन करें:
node claudeos-core-tools/plan-validator/index.js --check # Plan ↔ disk
node claudeos-core-tools/sync-checker/index.js          # Sync status
node claudeos-core-tools/content-validator/index.js     # Content quality
node claudeos-core-tools/pass-json-validator/index.js   # JSON format
```

#### Step 8: रिज़ल्ट सत्यापित करें

```bash
find .claude claudeos-core -type f | grep -v node_modules | grep -v '/generated/' | wc -l
head -30 CLAUDE.md
ls .claude/rules/*/
```

> **Tip:** यदि कोई स्टेप फेल हो जाता है, तो आप केवल उस स्टेप को दोबारा रन कर सकते हैं। Pass 1/2 के रिज़ल्ट कैश होते हैं — यदि `pass1-N.json` या `pass2-merged.json` पहले से मौजूद है, तो ऑटोमेटेड पाइपलाइन उन्हें स्किप करती है। पिछले रिज़ल्ट डिलीट करके नए सिरे से शुरू करने के लिए `npx claudeos-core init --force` का उपयोग करें।

### उपयोग शुरू करें

```
# Claude Code में — बस नेचुरली बोलें:
"ऑर्डर डोमेन के लिए CRUD बनाओ"
"यूज़र ऑथेंटिकेशन API जोड़ो"
"इस कोड को प्रोजेक्ट पैटर्न के अनुसार रीफैक्टर करो"

# Claude Code ऑटोमैटिकली जेनरेट किए गए Standards, Rules और Skills को रेफरेंस करता है।
```

---

## कैसे काम करता है — 3-Pass पाइपलाइन

```
npx claudeos-core init
    │
    ├── [1] npm install                    ← डिपेंडेंसी (~10s)
    ├── [2] डायरेक्टरी स्ट्रक्चर          ← फोल्डर बनाएँ (~1s)
    ├── [3] plan-installer (Node.js)       ← प्रोजेक्ट स्कैन (~5s)
    │       ├── स्टैक ऑटो-डिटेक्ट (मल्टी-स्टैक सपोर्ट)
    │       ├── डोमेन लिस्ट एक्सट्रैक्ट (टैग: backend/frontend)
    │       ├── टाइप के अनुसार डोमेन ग्रुप में विभाजन
    │       └── स्टैक-स्पेसिफिक प्रॉम्प्ट सेलेक्ट (टाइप अनुसार)
    │
    ├── [4] Pass 1 × N  (claude -p)       ← गहन कोड विश्लेषण (~2-8 मिनट)
    │       ├── ⚙️ बैकएंड ग्रुप → बैकएंड-स्पेसिफिक प्रॉम्प्ट
    │       └── 🎨 फ्रंटएंड ग्रुप → फ्रंटएंड-स्पेसिफिक प्रॉम्प्ट
    │
    ├── [5] Pass 2 × 1  (claude -p)       ← विश्लेषण मर्ज (~1 मिनट)
    │       └── सभी Pass 1 रिज़ल्ट्स को कंसोलिडेट (बैकएंड + फ्रंटएंड)
    │
    ├── [6] Pass 3 × 1  (claude -p)       ← सब कुछ जेनरेट (~3-5 मिनट)
    │       └── कंबाइंड प्रॉम्प्ट (बैकएंड + फ्रंटएंड टारगेट)
    │
    └── [7] वेरिफिकेशन                    ← हेल्थ चेकर ऑटो-रन
```

### 3 Pass क्यों?

**Pass 1** एकमात्र pass है जो सोर्स कोड पढ़ता है। यह प्रति डोमेन रिप्रेज़ेंटेटिव फाइलें सेलेक्ट करता है और 55–95 विश्लेषण कैटेगरी (प्रति स्टैक) में पैटर्न एक्सट्रैक्ट करता है। बड़े प्रोजेक्ट्स के लिए, Pass 1 कई बार रन होता है — प्रति डोमेन ग्रुप एक बार। मल्टी-स्टैक प्रोजेक्ट्स (जैसे: Java बैकएंड + React फ्रंटएंड) में, बैकएंड और फ्रंटएंड **अलग-अलग विश्लेषण प्रॉम्प्ट्स** का उपयोग करते हैं।

**Pass 2** सभी Pass 1 रिज़ल्ट्स को एकीकृत विश्लेषण में मर्ज करता है: कॉमन पैटर्न (100% शेयर्ड), मेजॉरिटी पैटर्न (50%+ शेयर्ड), डोमेन-स्पेसिफिक पैटर्न, सीवेरिटी के अनुसार एंटी-पैटर्न, और क्रॉस-कटिंग कंसर्न्स (नेमिंग, सिक्योरिटी, DB, टेस्टिंग, लॉगिंग, परफॉर्मेंस)।

**Pass 3** मर्ज किए गए विश्लेषण से पूरा फाइल इकोसिस्टम जेनरेट करता है। यह कभी सोर्स कोड नहीं पढ़ता — केवल एनालिसिस JSON। मल्टी-स्टैक मोड में, जेनरेशन प्रॉम्प्ट बैकएंड और फ्रंटएंड टारगेट्स को कंबाइन करता है ताकि एक ही pass में दोनों सेट के स्टैंडर्ड जेनरेट हों।

---

## जेनरेट की गई फाइल स्ट्रक्चर

```
your-project/
│
├── CLAUDE.md                          ← Claude Code एंट्री पॉइंट
│
├── .claude/
│   └── rules/                         ← Glob-ट्रिगर्ड rules
│       ├── 00.core/
│       ├── 10.backend/
│       ├── 20.frontend/
│       ├── 30.security-db/
│       ├── 40.infra/
│       └── 50.sync/                   ← सिंक रिमाइंडर rules
│
├── claudeos-core/                     ← मुख्य आउटपुट डायरेक्टरी
│   ├── generated/                     ← एनालिसिस JSON + डायनामिक प्रॉम्प्ट्स
│   ├── standard/                      ← कोडिंग स्टैंडर्ड्स (15-19 फाइलें)
│   ├── skills/                        ← CRUD स्कैफोल्डिंग skills
│   ├── guide/                         ← ऑनबोर्डिंग, FAQ, ट्रबलशूटिंग (9 फाइलें)
│   ├── plan/                          ← Master Plans (बैकअप/रीस्टोर)
│   ├── database/                      ← DB स्कीमा, माइग्रेशन गाइड
│   └── mcp-guide/                     ← MCP सर्वर इंटीग्रेशन गाइड
│
└── claudeos-core-tools/               ← यह टूलकिट (मॉडिफाई न करें)
```

हर स्टैंडर्ड फाइल में ✅ सही उदाहरण, ❌ गलत उदाहरण, और rules समरी टेबल शामिल है — सब कुछ आपके वास्तविक कोड पैटर्न से, जेनेरिक टेम्पलेट से नहीं।

---

## प्रोजेक्ट साइज़ के अनुसार ऑटो-स्केलिंग

| साइज़ | डोमेन | Pass 1 रन | कुल `claude -p` | अनुमानित समय |
|---|---|---|---|---|
| छोटा | 1–4 | 1 | 3 | ~5 मिनट |
| मध्यम | 5–8 | 2 | 4 | ~8 मिनट |
| बड़ा | 9–16 | 3–4 | 5–6 | ~12 मिनट |
| बहुत बड़ा | 17+ | 5+ | 7+ | ~18 मिनट+ |

मल्टी-स्टैक प्रोजेक्ट्स (जैसे: Java + React) के लिए, बैकएंड और फ्रंटएंड डोमेन साथ में काउंट होते हैं। 6 बैकएंड + 4 फ्रंटएंड = कुल 10 डोमेन, "बड़ा" के रूप में स्केल होता है।

---

## वेरिफिकेशन टूल्स

ClaudeOS-Core में 5 बिल्ट-इन वेरिफिकेशन टूल्स हैं जो जेनरेशन के बाद ऑटोमैटिकली रन होते हैं:

```bash
# सभी चेक एक साथ रन करें (अनुशंसित)
npx claudeos-core health

# अलग-अलग कमांड
npx claudeos-core validate     # Plan ↔ डिस्क तुलना
npx claudeos-core refresh      # डिस्क → Plan सिंक
npx claudeos-core restore      # Plan → डिस्क रीस्टोर
```

| टूल | क्या करता है |
|---|---|
| **manifest-generator** | मेटाडेटा JSON बनाता है (rule-manifest, sync-map, plan-manifest) |
| **plan-validator** | Master Plan `<file>` ब्लॉक्स की डिस्क से तुलना — 3 मोड: check, refresh, restore |
| **sync-checker** | अनरजिस्टर्ड फाइलें (डिस्क पर हैं लेकिन plan में नहीं) और ऑर्फन एंट्रीज़ डिटेक्ट |
| **content-validator** | फाइल क्वालिटी वैलिडेट — खाली फाइलें, मिसिंग ✅/❌ उदाहरण, आवश्यक सेक्शन |
| **pass-json-validator** | Pass 1–3 JSON स्ट्रक्चर, आवश्यक keys और सेक्शन कम्प्लीटनेस वैलिडेट |

---

## Claude Code आपके डॉक्यूमेंटेशन को कैसे उपयोग करता है

ClaudeOS-Core द्वारा जेनरेट किए गए डॉक्यूमेंटेशन को Claude Code वास्तव में कैसे पढ़ता है:

### ऑटोमैटिकली पढ़ी जाने वाली फाइलें

| फाइल | कब | गारंटी |
|---|---|---|
| `CLAUDE.md` | हर कन्वर्सेशन शुरू होने पर | हमेशा |
| `.claude/rules/00.core/*` | फाइल एडिट करते समय (`paths: ["**/*"]`) | हमेशा |
| `.claude/rules/10.backend/*` | फाइल एडिट करते समय (`paths: ["**/*"]`) | हमेशा |
| `.claude/rules/30.security-db/*` | फाइल एडिट करते समय (`paths: ["**/*"]`) | हमेशा |
| `.claude/rules/40.infra/*` | केवल config/infra फाइल एडिट करते समय (स्कोप्ड paths) | सशर्त |
| `.claude/rules/50.sync/*` | केवल claudeos-core फाइल एडिट करते समय (स्कोप्ड paths) | सशर्त |

### रूल रेफरेंस के ज़रिए ऑन-डिमांड पढ़ी जाने वाली फाइलें

हर रूल फाइल `## Reference` सेक्शन में संबंधित standard को लिंक करती है। Claude केवल वर्तमान कार्य से संबंधित standard पढ़ता है:

- `claudeos-core/standard/**` — कोडिंग पैटर्न, ✅/❌ उदाहरण, नेमिंग कन्वेंशन
- `claudeos-core/database/**` — DB स्कीमा (क्वेरी, मैपर, माइग्रेशन के लिए)

`00.standard-reference.md` बिना संबंधित रूल वाले standard की खोज के लिए एक डायरेक्टरी के रूप में कार्य करता है।

### न पढ़ी जाने वाली फाइलें (कॉन्टेक्स्ट बचत)

standard-reference रूल के `DO NOT Read` सेक्शन द्वारा स्पष्ट रूप से बाहर:

| फोल्डर | बाहर करने का कारण |
|---|---|
| `claudeos-core/plan/` | Master Plan बैकअप (~340KB)। `npx claudeos-core refresh` से सिंक करें। |
| `claudeos-core/generated/` | बिल्ड मेटाडेटा JSON। कोडिंग रेफरेंस नहीं। |
| `claudeos-core/guide/` | इंसानों के लिए ऑनबोर्डिंग गाइड। |
| `claudeos-core/mcp-guide/` | MCP सर्वर डॉक्स। कोडिंग रेफरेंस नहीं। |

---

## दैनिक वर्कफ़्लो

### इंस्टॉलेशन के बाद

```
# Claude Code को सामान्य रूप से उपयोग करें — यह ऑटोमैटिकली स्टैंडर्ड्स रेफरेंस करता है:
"ऑर्डर डोमेन के लिए CRUD बनाओ"
"यूज़र प्रोफाइल अपडेट API जोड़ो"
"इस कोड को प्रोजेक्ट पैटर्न के अनुसार रीफैक्टर करो"
```

### स्टैंडर्ड्स मैन्युअली एडिट करने के बाद

```bash
# standard या rules फाइल एडिट करने के बाद:
npx claudeos-core refresh

# सब कुछ कंसिस्टेंट है वेरिफाई करें
npx claudeos-core health
```

### डॉक्स करप्ट होने पर

```bash
# Master Plan से सब कुछ रीस्टोर करें
npx claudeos-core restore
```

### CI/CD इंटीग्रेशन

```yaml
# GitHub Actions उदाहरण
- run: npx claudeos-core validate
# एग्ज़िट कोड 1 PR को ब्लॉक करता है
```

---

## क्या अलग है?

| | ClaudeOS-Core | Everything Claude Code (50K+ ⭐) | Harness | specs-generator | Claude `/init` |
|---|---|---|---|---|---|
| **Approach** | Code analyzes first, then LLM generates | Pre-built config presets | LLM designs agent teams | LLM generates spec docs | LLM writes CLAUDE.md |
| **Reads your source code** | ✅ Deterministic static analysis | ❌ | ❌ | ❌ (LLM reads) | ❌ (LLM reads) |
| **Stack detection** | Code confirms (ORM, DB, build tool, pkg manager) | N/A (stack-agnostic) | LLM guesses | LLM guesses | LLM guesses |
| **Domain detection** | Code confirms (Java 5 patterns, Kotlin CQRS, Next.js FSD) | N/A | LLM guesses | N/A | N/A |
| **Same project → Same result** | ✅ Deterministic analysis | ✅ (static files) | ❌ (LLM varies) | ❌ (LLM varies) | ❌ (LLM varies) |
| **Large project handling** | Domain group splitting (4 domains / 40 files per group) | N/A | No splitting | No splitting | Context window limit |
| **Output** | CLAUDE.md + Rules + Standards + Skills + Guides + Plans (40-50+ files) | Agents + Skills + Commands + Hooks | Agents + Skills | 6 spec documents | CLAUDE.md (1 file) |
| **Output location** | `.claude/rules/` (auto-loaded by Claude Code) | `.claude/` various | `.claude/agents/` + `.claude/skills/` | `.claude/steering/` + `specs/` | `CLAUDE.md` |
| **Post-generation verification** | ✅ 5 automated validators | ❌ | ❌ | ❌ | ❌ |
| **Multi-language output** | ✅ 10 languages | ❌ | ❌ | ❌ | ❌ |
| **Multi-stack** | ✅ Backend + Frontend simultaneous | ❌ Stack-agnostic | ❌ | ❌ | Partial |
| **Agent orchestration** | ❌ | ✅ 28 agents | ✅ 6 patterns | ❌ | ❌ |

### Key difference

**Other tools give Claude "generally good instructions." ClaudeOS-Core gives Claude "instructions extracted from your actual code."**

### Complementary, not competing

ClaudeOS-Core: **project-specific rules**. Other tools: **agent orchestration**.
Use both together.

---
## FAQ

**प्र: क्या यह मेरा सोर्स कोड मॉडिफाई करता है?**
नहीं। यह केवल `CLAUDE.md`, `.claude/rules/` और `claudeos-core/` बनाता है। आपका मौजूदा कोड कभी मॉडिफाई नहीं होता।

**प्र: कितना खर्च होता है?**
`claude -p` को 3–7 बार कॉल करता है। यह Claude Code के सामान्य उपयोग के अंतर्गत है।

**प्र: क्या जेनरेट की गई फाइलें Git में कमिट करनी चाहिए?**
अनुशंसित। आपकी टीम समान Claude Code स्टैंडर्ड्स शेयर कर सकती है। `claudeos-core/generated/` को `.gitignore` में जोड़ने पर विचार करें (एनालिसिस JSON रीजेनरेट किया जा सकता है)।

**प्र: मिक्स्ड-स्टैक प्रोजेक्ट्स (जैसे: Java बैकएंड + React फ्रंटएंड) का क्या?**
पूर्ण सपोर्ट। ClaudeOS-Core दोनों स्टैक्स ऑटो-डिटेक्ट करता है, डोमेन को `backend` या `frontend` टैग करता है, और प्रत्येक के लिए स्टैक-स्पेसिफिक विश्लेषण प्रॉम्प्ट्स उपयोग करता है। Pass 2 सब कुछ मर्ज करता है, और Pass 3 एक pass में बैकएंड और फ्रंटएंड दोनों स्टैंडर्ड्स जेनरेट करता है।

**प्र: क्या यह Turborepo / pnpm workspaces / Lerna monorepo के साथ काम करता है?**
हाँ। ClaudeOS-Core `turbo.json`, `pnpm-workspace.yaml`, `lerna.json`, या `package.json#workspaces` को डिटेक्ट करता है और फ्रेमवर्क/ORM/DB डिपेंडेंसी के लिए सब-पैकेज `package.json` फाइलें ऑटोमैटिकली स्कैन करता है। डोमेन स्कैनिंग `apps/*/src/` और `packages/*/src/` पैटर्न को कवर करती है। मोनोरेपो रूट से रन करें।

**प्र: NestJS को अपना टेम्पलेट मिलता है या Express वाला उपयोग होता है?**
NestJS एक समर्पित `node-nestjs` टेम्पलेट उपयोग करता है जिसमें NestJS-विशिष्ट विश्लेषण श्रेणियाँ हैं: `@Module`, `@Injectable`, `@Controller` डेकोरेटर, Guards, Pipes, Interceptors, DI container, CQRS पैटर्न, और `Test.createTestingModule`। Express प्रोजेक्ट अलग `node-express` टेम्पलेट उपयोग करते हैं।

**प्र: Vue / Nuxt प्रोजेक्ट्स के बारे में क्या?**
Vue/Nuxt एक समर्पित `vue-nuxt` टेम्पलेट उपयोग करता है जो Composition API, `<script setup>`, defineProps/defineEmits, Pinia stores, `useFetch`/`useAsyncData`, Nitro server routes, और `@nuxt/test-utils` को कवर करता है। Next.js/React प्रोजेक्ट `node-nextjs` टेम्पलेट उपयोग करते हैं।

**प्र: दोबारा रन करने पर क्या होता है?**
यदि पिछले Pass 1/2 के रिज़ल्ट मौजूद हैं, तो इंटरैक्टिव प्रॉम्प्ट आपको चुनने देता है: **Continue** (जहाँ रुका था वहाँ से जारी रखें) या **Fresh** (सब डिलीट करके नए सिरे से शुरू करें)। `--force` का उपयोग करें ताकि प्रॉम्प्ट स्किप हो और हमेशा नए सिरे से शुरू हो। Pass 3 हमेशा दोबारा रन होता है। पिछले वर्शन Master Plans से रीस्टोर किए जा सकते हैं।

**प्र: क्या यह Kotlin को सपोर्ट करता है?**
हाँ। ClaudeOS-Core `build.gradle.kts` या `build.gradle` में kotlin plugin से Kotlin को स्वचालित रूप से पहचानता है। यह Kotlin-विशिष्ट विश्लेषण (data class, sealed class, coroutines, extension functions, MockK आदि) के लिए समर्पित `kotlin-spring` टेम्पलेट का उपयोग करता है।

**प्र: CQRS / BFF आर्किटेक्चर के बारे में क्या?**
Kotlin मल्टी-मॉड्यूल प्रोजेक्ट्स के लिए पूरी तरह सपोर्टेड है। ClaudeOS-Core `settings.gradle.kts` पढ़ता है, मॉड्यूल नामों से मॉड्यूल प्रकार (command, query, bff, integration) का पता लगाता है, और एक ही डोमेन के Command/Query मॉड्यूल को ग्रुप करता है। जनरेट किए गए स्टैंडर्ड में command controller vs query controller के अलग नियम, BFF/Feign पैटर्न और इंटर-मॉड्यूल कम्युनिकेशन कन्वेंशन शामिल हैं।

**प्र: Gradle मल्टी-मॉड्यूल monorepo के बारे में क्या?**
ClaudeOS-Core नेस्टिंग गहराई की परवाह किए बिना सभी सबमॉड्यूल (`**/src/main/kotlin/**/*.kt`) को स्कैन करता है। मॉड्यूल प्रकार नामकरण परंपराओं से अनुमानित होते हैं (जैसे `reservation-command-server` → डोमेन: `reservation`, प्रकार: `command`)। शेयर्ड लाइब्रेरी (`shared-lib`, `integration-lib`) भी पहचानी जाती हैं।

---

## टेम्पलेट स्ट्रक्चर

```
pass-prompts/templates/
├── common/                  # शेयर्ड हेडर/फुटर
├── java-spring/             # Java / Spring Boot
├── kotlin-spring/           # Kotlin / Spring Boot (CQRS, BFF, multi-module)
├── node-express/            # Node.js / Express
├── node-nestjs/             # Node.js / NestJS (Module, DI, Guard, Pipe, Interceptor)
├── node-fastify/            # Node.js / Fastify
├── node-nextjs/             # Next.js / React
├── vue-nuxt/                # Vue / Nuxt (Composition API, Pinia, Nitro)
├── angular/                 # Angular
├── python-django/           # Python / Django (DRF)
└── python-fastapi/          # Python / FastAPI
```

`plan-installer` ऑटोमैटिकली आपके स्टैक(स) डिटेक्ट करता है, फिर टाइप-स्पेसिफिक प्रॉम्प्ट्स असेंबल करता है। NestJS और Vue/Nuxt फ्रेमवर्क-विशिष्ट विश्लेषण श्रेणियों के साथ समर्पित टेम्पलेट का उपयोग करते हैं। मल्टी-स्टैक प्रोजेक्ट्स के लिए, `pass1-backend-prompt.md` और `pass1-frontend-prompt.md` अलग-अलग जेनरेट होते हैं, जबकि `pass3-prompt.md` दोनों स्टैक्स के जेनरेशन टारगेट्स को कंबाइन करता है।

---

## Monorepo सपोर्ट

ClaudeOS-Core JS/TS मोनोरेपो सेटअप को ऑटोमैटिकली डिटेक्ट करता है और सब-पैकेज की डिपेंडेंसी स्कैन करता है।

**सपोर्टेड मोनोरेपो मार्कर** (ऑटो-डिटेक्टेड):
- `turbo.json` (Turborepo)
- `pnpm-workspace.yaml` (pnpm workspaces)
- `lerna.json` (Lerna)
- `package.json#workspaces` (npm/yarn workspaces)

**मोनोरेपो रूट से रन करें** — ClaudeOS-Core सब-पैकेज में फ्रेमवर्क/ORM/DB डिपेंडेंसी खोजने के लिए `apps/*/package.json` और `packages/*/package.json` पढ़ता है:

```bash
cd my-monorepo
npx claudeos-core init
```

**क्या डिटेक्ट होता है:**
- `apps/web/package.json` से डिपेंडेंसी (जैसे `next`, `react`) → frontend stack
- `apps/api/package.json` से डिपेंडेंसी (जैसे `express`, `prisma`) → backend stack
- `packages/db/package.json` से डिपेंडेंसी (जैसे `drizzle-orm`) → ORM/DB
- `pnpm-workspace.yaml` से कस्टम workspace paths (जैसे `services/*`)

**डोमेन स्कैनिंग मोनोरेपो लेआउट भी कवर करती है:**
- बैकएंड डोमेन के लिए `apps/api/src/modules/*/` और `apps/api/src/*/`
- फ्रंटएंड डोमेन के लिए `apps/web/app/*/`, `apps/web/src/app/*/`, `apps/web/pages/*/`
- शेयर्ड पैकेज डोमेन के लिए `packages/*/src/*/`

```
my-monorepo/                    ← यहाँ रन करें: npx claudeos-core init
├── turbo.json                  ← Turborepo ऑटो-डिटेक्ट
├── apps/
│   ├── web/                    ← apps/web/package.json से Next.js डिटेक्ट
│   │   ├── app/dashboard/      ← Frontend domain detected
│   │   └── package.json        ← { "dependencies": { "next": "^14" } }
│   └── api/                    ← apps/api/package.json से Express डिटेक्ट
│       ├── src/modules/users/  ← Backend domain detected
│       └── package.json        ← { "dependencies": { "express": "^4" } }
├── packages/
│   ├── db/                     ← packages/db/package.json से Drizzle डिटेक्ट
│   └── ui/
└── package.json                ← { "workspaces": ["apps/*", "packages/*"] }
```

> **नोट:** Kotlin/Java मोनोरेपो के लिए, मल्टी-मॉड्यूल डिटेक्शन `settings.gradle.kts` का उपयोग करती है (ऊपर [Kotlin मल्टी-मॉड्यूल डोमेन डिटेक्शन](#kotlin-मल्टी-मॉड्यूल-डोमेन-डिटेक्शन) देखें) और JS मोनोरेपो मार्कर की आवश्यकता नहीं है।

## ट्रबलशूटिंग

**"claude: command not found"** — Claude Code CLI इंस्टॉल नहीं है या PATH में नहीं है। [Claude Code डॉक्स](https://code.claude.com/docs/en/overview) देखें।

**"npm install failed"** — Node.js वर्शन बहुत पुराना हो सकता है। v18+ आवश्यक है।

**"0 domains detected"** — आपकी प्रोजेक्ट स्ट्रक्चर नॉन-स्टैंडर्ड हो सकती है। अपने स्टैक के डिटेक्शन पैटर्न के लिए [कोरियन डॉक्स](./README.ko.md#트러블슈팅) देखें।

**Kotlin प्रोजेक्ट में "0 डोमेन डिटेक्ट"** — सुनिश्चित करें कि प्रोजेक्ट रूट में `build.gradle.kts` (या kotlin plugin वाला `build.gradle`) मौजूद है, और सोर्स फाइलें `**/src/main/kotlin/` के अंतर्गत हैं। मल्टी-मॉड्यूल प्रोजेक्ट्स में `settings.gradle.kts` में `include()` स्टेटमेंट होने चाहिए। सिंगल-मॉड्यूल Kotlin प्रोजेक्ट (`settings.gradle` के बिना) भी सपोर्टेड हैं — डोमेन `src/main/kotlin/` के पैकेज/क्लास स्ट्रक्चर से एक्सट्रैक्ट किए जाते हैं।

**"भाषा kotlin की बजाय java के रूप में डिटेक्ट"** — ClaudeOS-Core पहले रूट `build.gradle(.kts)` चेक करता है, फिर सबमॉड्यूल बिल्ड फाइलें। सुनिश्चित करें कि कम से कम एक `build.gradle.kts` में `kotlin("jvm")` या `org.jetbrains.kotlin` शामिल है।

**"CQRS डिटेक्ट नहीं हुआ"** — आर्किटेक्चर डिटेक्शन मॉड्यूल नामों में `command` और `query` कीवर्ड पर निर्भर करता है। यदि आपके मॉड्यूल अलग नामकरण उपयोग करते हैं, तो plan-installer चलाने के बाद जनरेट किए गए प्रॉम्प्ट्स को मैन्युअली एडजस्ट किया जा सकता है।

---

## कॉन्ट्रिब्यूट करें

कॉन्ट्रिब्यूशन का स्वागत है! जहाँ सबसे ज़्यादा मदद चाहिए:

- **नए स्टैक टेम्पलेट्स** — Ruby/Rails, Go/Gin, PHP/Laravel, Rust/Axum
- **Monorepo डीप सपोर्ट** — अलग सब-प्रोजेक्ट roots, वर्कस्पेस डिटेक्शन
- **टेस्ट कवरेज** — टेस्ट सूट का विस्तार जारी (वर्तमान में 269 टेस्ट, सभी स्कैनर, स्टैक डिटेक्शन, डोमेन ग्रुपिंग, प्लान पार्सिंग, प्रॉम्प्ट जेनरेशन, CLI सेलेक्टर, मोनोरेपो डिटेक्शन, वेरिफिकेशन टूल्स और Vite SPA डिटेक्शन कवर)

---

## ऑथर

**claudeos-core** द्वारा निर्मित — [GitHub](https://github.com/claudeos-core) · [Email](mailto:claudeoscore@gmail.com)

## लाइसेंस

ISC
