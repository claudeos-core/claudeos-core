# Verification

Claude द्वारा documentation उत्पन्न करने के बाद, कोड **5 अलग-अलग validators** में आउटपुट को सत्यापित करता है। उनमें से कोई भी LLM को call नहीं करता — सभी checks deterministic हैं।

> अंग्रेज़ी मूल: [docs/verification.md](../verification.md)। हिन्दी अनुवाद अंग्रेज़ी के साथ समकालिक रखा गया है।

यह पृष्ठ बताता है कि प्रत्येक validator क्या जाँचता है, severity tiers कैसे काम करते हैं, और आउटपुट को कैसे पढ़ें।

---

## Post-generation verification क्यों

LLMs non-deterministic हैं। fact-injected prompts ([source paths की allowlist](architecture.md#fact-injected-prompts-hallucination-को-रोकते-हैं)) के साथ भी, Claude अभी भी कर सकता है:

- context दबाव में एक आवश्यक section छोड़ देना।
- ऐसा path उद्धृत करना जो allowlist से लगभग-लेकिन-पूरी तरह मेल नहीं खाता (उदाहरण: parent directory + एक TypeScript constant नाम से आविष्कार किया गया `src/feature/routers/featureRoutePath.ts`)।
- standards और rules के बीच असंगत cross-references उत्पन्न करना।
- CLAUDE.md में कहीं और Section 8 की सामग्री पुनः घोषित करना।

Validators इन चुपचाप-खराब आउटपुट को docs ship होने से पहले पकड़ लेते हैं।

---

## 5 validators

### 1. `claude-md-validator` — संरचनात्मक अपरिवर्तनीयताएँ

`CLAUDE.md` को संरचनात्मक checks के एक सेट के विरुद्ध सत्यापित करता है (नीचे की table check ID families सूचीबद्ध करती है — कुल अलग-अलग reportable IDs भिन्न होती हैं क्योंकि `checkSectionsHaveContent` और `checkCanonicalHeadings` प्रति section एक emit करते हैं, आदि)। `claude-md-validator/` में रहता है।

**इसके माध्यम से चलाएँ:**
```bash
npx claudeos-core lint
```

(`health` द्वारा नहीं चलता — नीचे [दो entry points क्यों](#दो-entry-points-क्यों-lint-vs-health) देखें।)

**यह क्या जाँचता है:**

| Check ID | यह क्या enforce करता है |
|---|---|
| `S1` | Section count ठीक 8 है |
| `S2-N` | प्रत्येक section में कम से कम 2 non-empty body lines हैं |
| `S-H3-4` | Section 4 में 3 या 4 H3 sub-sections हैं |
| `S-H3-6` | Section 6 में ठीक 3 H3 sub-sections हैं |
| `S-H3-8` | Section 8 में ठीक 2 H3 sub-sections हैं |
| `S-H4-8` | Section 8 में ठीक 2 H4 headings (L4 Memory Files / Memory Workflow) हैं |
| `M-<file>` | 4 memory files (`decision-log.md`, `failure-patterns.md`, `compaction.md`, `auto-rule-update.md`) में से प्रत्येक ठीक एक markdown table row में दिखाई देता है |
| `F2-<file>` | Memory file table rows Section 8 तक सीमित हैं |
| `T1-1` to `T1-8` | प्रत्येक `## N.` section heading अपना English canonical token (`Role Definition`, `Project Overview`, `Build`, `Core Architecture`, `Directory Structure`, `Standard`, `DO NOT Read`, `Memory`) रखता है — case-insensitive substring match |

**यह language-invariant क्यों है:** validator कभी अनुवादित heading prose का मिलान नहीं करता। यह केवल markdown structure (heading levels, counts, ordering) और English canonical tokens का मिलान करता है। 10 समर्थित भाषाओं में से किसी में भी उत्पन्न CLAUDE.md पर वही checks पास होते हैं।

**यह व्यवहार में क्यों मायने रखता है:** `--lang ja` के साथ उत्पन्न CLAUDE.md और `--lang en` के साथ उत्पन्न एक मनुष्य के लिए पूरी तरह से अलग दिखते हैं, लेकिन `claude-md-validator` दोनों पर byte-for-byte समान pass/fail verdicts उत्पन्न करता है। कोई प्रति-भाषा dictionary maintenance नहीं।

### 2. `content-validator` — path & manifest checks

उत्पन्न फ़ाइलों की **content** को सत्यापित करता है (CLAUDE.md की संरचना नहीं)। `content-validator/` में रहता है।

**10 checks** (पहले 9 console आउटपुट में `[N/9]` के रूप में लेबल किए जाते हैं; 10वाँ बाद में जोड़ा गया और `[10/10]` के रूप में लेबल — यह असमानता code में संरक्षित है ताकि मौजूदा CI greps अभी भी match हों):

| Check | यह क्या enforce करता है |
|---|---|
| `[1/9]` CLAUDE.md मौजूद है, ≥100 chars, आवश्यक section keywords (10-language aware) रखता है |
| `[2/9]` `.claude/rules/**/*.md` फ़ाइलों में `paths:` key के साथ YAML frontmatter है, कोई empty फ़ाइलें नहीं |
| `[3/9]` `claudeos-core/standard/**/*.md` फ़ाइलें ≥200 chars हैं और ✅/❌ examples + एक markdown table रखती हैं (Kotlin standards ` ```kotlin ` blocks के लिए भी जाँचते हैं) |
| `[4/9]` `claudeos-core/skills/**/*.md` फ़ाइलें non-empty हैं; orchestrator + MANIFEST मौजूद |
| `[5/9]` `claudeos-core/guide/` में सभी 9 expected फ़ाइलें हैं, प्रत्येक non-empty (BOM-aware emptiness check) |
| `[6/9]` `claudeos-core/plan/` फ़ाइलें non-empty (v2.1.2 के बाद informational — `plan/` अब auto-create नहीं होता) |
| `[7/9]` `claudeos-core/database/` फ़ाइलें मौजूद (missing पर warning) |
| `[8/9]` `claudeos-core/mcp-guide/` फ़ाइलें मौजूद (missing पर warning) |
| `[9/9]` `claudeos-core/memory/` 4 फ़ाइलें मौजूद + संरचनात्मक validation (decision-log ISO date, failure-pattern आवश्यक fields, compaction `## Last Compaction` marker) |
| `[10/10]` Path-claim verification + MANIFEST drift (3 sub-classes — नीचे देखें) |

**Check `[10/10]` sub-classes:**

| Class | यह क्या पकड़ता है |
|---|---|
| `STALE_PATH` | `.claude/rules/**` या `claudeos-core/standard/**` में किसी भी `src/...\.(ts|tsx|js|jsx)` संदर्भ का एक वास्तविक फ़ाइल पर resolve होना चाहिए। Fenced code blocks और placeholder paths (`src/{domain}/feature.ts`) को बाहर रखा गया है। |
| `STALE_SKILL_ENTRY` | `claudeos-core/skills/00.shared/MANIFEST.md` में registered प्रत्येक skill path disk पर मौजूद होना चाहिए। |
| `MANIFEST_DRIFT` | प्रत्येक registered skill का `CLAUDE.md` में उल्लेख होना चाहिए (**orchestrator/sub-skill exception** के साथ — Pass 3b Section 6 लिखता है इससे पहले कि Pass 3c sub-skills बनाए, इसलिए हर sub-skill सूचीबद्ध करना संरचनात्मक रूप से असंभव है)। |

orchestrator/sub-skill exception: `{category}/{parent-stem}/{NN}.{name}.md` पर एक registered sub-skill को covered माना जाता है जब `{category}/*{parent-stem}*.md` पर एक orchestrator का CLAUDE.md में उल्लेख हो।

**Severity:** content-validator **advisory** tier पर चलता है — आउटपुट में दिखाई देता है लेकिन CI को block नहीं करता। तर्क: Pass 3 को फिर से चलाने से LLM hallucinations के ठीक होने की गारंटी नहीं है, इसलिए blocking उपयोगकर्ताओं को `--force` loops में फँसा देगा। Detection signal (non-zero exit + `stale-report` entry) CI pipelines और मानव triage के लिए पर्याप्त है।

### 3. `pass-json-validator` — Pass output well-formedness

सत्यापित करता है कि प्रत्येक pass द्वारा लिखी गई JSON फ़ाइलें well-formed हैं और expected keys रखती हैं। `pass-json-validator/` में रहता है।

**सत्यापित फ़ाइलें:**

| फ़ाइल | आवश्यक keys |
|---|---|
| `project-analysis.json` | 5 आवश्यक keys (stack, domains, आदि) |
| `domain-groups.json` | 4 आवश्यक keys |
| `pass1-*.json` | 4 आवश्यक keys + `analysisPerDomain` object |
| `pass2-merged.json` | 10 common sections (हमेशा) + 2 backend sections (backend stack पर) + 1 kotlin base section + 2 kotlin CQRS sections (लागू होने पर)। semantic alias map के साथ Fuzzy match; top-level key count <5 = ERROR, <9 = WARNING; empty value detection। |
| `pass3-complete.json` | Marker presence + structure |
| `pass4-memory.json` | Marker structure: object, `passNum === 4`, non-empty `memoryFiles` array |

pass2 check **stack-aware** है: यह backend/kotlin/cqrs निर्धारित करने के लिए `project-analysis.json` पढ़ता है और adjustable करता है कि कौन से sections की अपेक्षा करता है।

**Severity:** **warn-only** tier पर चलता है — issues दिखाता है लेकिन CI को block नहीं करता।

### 4. `plan-validator` — Plan ↔ disk consistency (legacy)

`claudeos-core/plan/*.md` फ़ाइलों की disk से तुलना करता है। `plan-validator/` में रहता है।

**3 modes:**
- `--check` (default): केवल drift detect करें
- `--refresh`: disk से plan फ़ाइलें update करें
- `--execute`: plan content disk पर apply करें (`.bak` backups बनाता है)

**v2.1.0 स्थिति:** Master plan generation v2.1.0 में हटा दिया गया था। `claudeos-core/plan/` अब `init` द्वारा auto-create नहीं होता। जब `plan/` अनुपस्थित होता है, यह validator informational संदेशों के साथ skip करता है।

यह उन users के लिए validator suite में रखा गया है जो ad-hoc backup उद्देश्यों के लिए plan फ़ाइलों को hand-maintain करते हैं।

**Security:** path traversal block की जाती है — `isWithinRoot(absPath)` `../` के माध्यम से project root से escape करने वाले paths को reject करता है।

**Severity:** वास्तविक drift detect होने पर **fail** tier पर चलता है। `plan/` अनुपस्थित होने पर no-ops।

### 5. `sync-checker` — Disk ↔ Master Plan consistency

सत्यापित करता है कि `sync-map.json` (manifest-generator द्वारा लिखा गया) में registered फ़ाइलें वास्तव में disk पर मौजूद फ़ाइलों से मेल खाती हैं। 7 tracked directories में bidirectional check। `sync-checker/` में रहता है।

**Two-step check:**

1. **Disk → Plan:** 7 tracked directories (`.claude/rules`, `standard`, `skills`, `guide`, `database`, `mcp-guide`, `memory`) + `CLAUDE.md` पर चलता है। उन फ़ाइलों की रिपोर्ट करता है जो disk पर मौजूद हैं लेकिन `sync-map.json` में registered नहीं हैं।
2. **Plan → Disk:** `sync-map.json` में registered ऐसे paths की रिपोर्ट करता है जो अब disk पर मौजूद नहीं हैं (orphaned)।

**Exit code:** केवल orphaned फ़ाइलें exit 1 का कारण बनती हैं। Unregistered फ़ाइलें informational हैं (एक v2.1.0+ project में default रूप से शून्य registered paths होते हैं, इसलिए यह सामान्य मामला है)।

**Severity:** orphaned फ़ाइलों के लिए **fail** tier पर चलता है। `sync-map.json` में कोई mappings न होने पर साफ़ skip।

---

## Severity tiers

हर failed check समान रूप से गंभीर नहीं है। `health-checker` runtime validators को three-tier severity के साथ orchestrate करता है:

| Tier | प्रतीक | व्यवहार |
|---|---|---|
| **fail** | `❌` | पूरा होने को block करता है। CI में non-zero exit। ठीक करना चाहिए। |
| **warn** | `⚠️` | आउटपुट में दिखाई देता है लेकिन block नहीं करता। जाँचने योग्य। |
| **advisory** | `ℹ️` | बाद में समीक्षा करें। असामान्य project layouts में अक्सर false positives। |

**Tier द्वारा उदाहरण:**

- **fail:** plan-validator वास्तविक drift detect करता है; sync-checker को orphaned फ़ाइलें मिलती हैं; आवश्यक guide फ़ाइल missing।
- **warn:** pass-json-validator एक non-critical schema gap पाता है।
- **advisory:** content-validator का `STALE_PATH` एक ऐसे path को flag करता है जो मौजूद है लेकिन gitignored है (कुछ projects में false positive)।

3-tier system इसलिए जोड़ा गया था ताकि `content-validator` findings (जिनके असामान्य layouts में false positives हो सकते हैं) CI pipelines को deadlock न करें। इसके बिना, हर advisory block करता — और `init` को फिर से चलाना LLM hallucinations को मज़बूती से ठीक नहीं करता।

Summary line breakdown दिखाती है:
```
All systems operational (1 advisory, 1 warning)
```

---

## दो entry points क्यों: `lint` vs `health`

```bash
npx claudeos-core lint     # claude-md-validator only
npx claudeos-core health   # 4 other validators
```

**Split क्यों?**

`claude-md-validator` **संरचनात्मक** issues पाता है — section count गलत, memory file table पुनः घोषित, canonical heading में English token missing। ये संकेत हैं कि **CLAUDE.md को फिर से उत्पन्न करना चाहिए**, soft warnings जाँचने के लिए नहीं। `init` को (आवश्यकता पड़ने पर `--force` के साथ) फिर से चलाना समाधान है।

अन्य validators **content** issues पाते हैं — paths, manifest entries, schema gaps। इन्हें सब कुछ फिर से उत्पन्न किए बिना हाथ से समीक्षा और ठीक किया जा सकता है।

`lint` को अलग रखने का अर्थ है कि इसे pre-commit hooks में उपयोग किया जा सकता है (तेज़, संरचनात्मक-only) धीमे content checks को साथ खींचे बिना।

---

## Validation चलाना

```bash
# CLAUDE.md पर संरचनात्मक validation चलाएँ
npx claudeos-core lint

# 4-validator health suite चलाएँ
npx claudeos-core health
```

CI के लिए, `health` अनुशंसित check है। यह अभी भी तेज़ है (कोई LLM calls नहीं) और संरचनात्मक CLAUDE.md checks को छोड़कर सब कुछ कवर करता है, जिन्हें अधिकांश CI pipelines को हर commit पर सत्यापित करने की आवश्यकता नहीं होती।

Pre-commit hooks के लिए, `lint` हर commit पर चलाने के लिए पर्याप्त तेज़ है।

---

## आउटपुट format

Validators default रूप से human-readable आउटपुट उत्पन्न करते हैं:

```
[content-validator]
ℹ advisory  STALE_PATH  src/legacy/oldRoutes.ts → file does not exist
            (cited in claudeos-core/standard/10.backend/03.routing.md:42)

[sync-checker]
✓ pass     0 orphaned files; 0 unregistered files
```

`manifest-generator` machine-readable artifacts को `claudeos-core/generated/` पर लिखता है:

- `rule-manifest.json` — gray-matter से frontmatter + stat के साथ फ़ाइल सूची
- `sync-map.json` — registered path mappings (v2.1.0+: default रूप से empty array)
- `stale-report.json` — सभी validators से consolidated findings

---

## CI integration

एक minimal GitHub Actions उदाहरण:

```yaml
name: ClaudeOS Health
on: [push, pull_request]
jobs:
  health:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v5
        with:
          node-version: '20'
      - run: npx claudeos-core health
```

Exit code केवल `fail`-tier findings के लिए non-zero है। `warn` और `advisory` print होते हैं लेकिन build fail नहीं करते।

आधिकारिक CI workflow (`.github/workflows/test.yml` में) `ubuntu-latest`, `windows-latest`, `macos-latest` × Node 18 / 20 पर चलता है।

---

## जब validators ऐसा कुछ flag करते हैं जिससे आप असहमत हों

False positives होते हैं, खासकर असामान्य project layouts में (उदाहरण: gitignored उत्पन्न फ़ाइलें, custom build steps जो non-standard paths में emit करते हैं)।

**किसी विशिष्ट फ़ाइल पर detection को suppress करने के लिए**, उपलब्ध `.claudeos-scan.json` overrides के लिए [advanced-config.md](advanced-config.md) देखें।

**यदि एक validator सामान्य स्तर पर गलत है** (केवल आपके project पर नहीं), तो [issue खोलें](https://github.com/claudeos-core/claudeos-core/issues) — ये checks वास्तविक रिपोर्टों के आधार पर समय के साथ tune किए जाते हैं।

---

## यह भी देखें

- [architecture.md](architecture.md) — pipeline में validators कहाँ बैठते हैं
- [commands.md](commands.md) — `lint` और `health` command reference
- [troubleshooting.md](troubleshooting.md) — विशिष्ट validator errors का अर्थ
