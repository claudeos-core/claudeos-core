# Verification

Claude documentation generate कर लेता है, उसके बाद code **5 अलग-अलग validators** में output verify करता है. इनमें से कोई भी LLM को call नहीं करता. सारे checks deterministic हैं.

> अंग्रेज़ी मूल: [docs/verification.md](../verification.md). हिन्दी अनुवाद अंग्रेज़ी के साथ sync में रखा गया है.

यह page बताता है कि हर validator क्या check करता है, severity tiers कैसे काम करते हैं, और output कैसे पढ़ें.

---

## Post-generation verification क्यों

LLMs non-deterministic हैं. Fact-injected prompts ([source paths की allowlist](architecture.md#fact-injected-prompts-hallucination-रोकते-हैं)) के बावजूद Claude ये गलतियाँ कर सकता है:

- Context pressure में कोई required section छोड़ देना.
- ऐसा path quote करना जो allowlist से almost-but-not-quite match होता हो (जैसे parent directory + किसी TypeScript constant के नाम से बना `src/feature/routers/featureRoutePath.ts`).
- Standards और rules के बीच inconsistent cross-references generate करना.
- Section 8 का content CLAUDE.md में कहीं और दोबारा declare कर देना.

Validators इन silently-broken outputs को docs ship होने से पहले पकड़ लेते हैं.

---

## 5 validators

### 1. `claude-md-validator` — Structural invariants

`CLAUDE.md` को structural checks के एक set से verify करता है (नीचे की table check ID families list करती है. कुल distinct reportable IDs अलग होती हैं क्योंकि `checkSectionsHaveContent` और `checkCanonicalHeadings` per section एक emit करते हैं वगैरह.) `claude-md-validator/` में रहता है.

**इससे चलाओ:**
```bash
npx claudeos-core lint
```

(`health` से नहीं चलता. नीचे [दो entry points क्यों](#दो-entry-points-क्यों-lint-vs-health) देखो.)

**क्या check करता है:**

| Check ID | क्या enforce करता है |
|---|---|
| `S1` | Section count exactly 8 है |
| `S2-N` | हर section में कम से कम 2 non-empty body lines हैं |
| `S-H3-4` | Section 4 में 3 या 4 H3 sub-sections हैं |
| `S-H3-6` | Section 6 में exactly 3 H3 sub-sections हैं |
| `S-H3-8` | Section 8 में exactly 2 H3 sub-sections हैं |
| `S-H4-8` | Section 8 में exactly 2 H4 headings (L4 Memory Files / Memory Workflow) हैं |
| `M-<file>` | चारों memory files (`decision-log.md`, `failure-patterns.md`, `compaction.md`, `auto-rule-update.md`) में से हर एक exactly एक markdown table row में दिखे |
| `F2-<file>` | Memory file table rows Section 8 तक limited हैं |
| `T1-1` to `T1-8` | हर `## N.` section heading अपना English canonical token (`Role Definition`, `Project Overview`, `Build`, `Core Architecture`, `Directory Structure`, `Standard`, `DO NOT Read`, `Memory`) रखे. Case-insensitive substring match |

**Language-invariant क्यों:** Validator translated heading prose कभी match नहीं करता. सिर्फ markdown structure (heading levels, counts, ordering) और English canonical tokens match करता है. 10 supported languages में से किसी भी language में generate हुई CLAUDE.md पर वही checks pass होते हैं.

**Practice में यह क्यों matter करता है:** `--lang ja` और `--lang en` से generate हुई CLAUDE.md इंसान को बिल्कुल अलग दिखती हैं, लेकिन `claude-md-validator` दोनों पर byte-for-byte same pass/fail verdicts देता है. कोई per-language dictionary maintenance नहीं.

### 2. `content-validator` — path & manifest checks

Generated files का **content** verify करता है (CLAUDE.md का structure नहीं). `content-validator/` में रहता है.

**10 checks** (पहले 9 console output में `[N/9]` label होते हैं, 10वाँ बाद में add हुआ और `[10/10]` label है. यह असमानता code में preserved है ताकि existing CI greps match होते रहें):

| Check | क्या enforce करता है |
|---|---|
| `[1/9]` CLAUDE.md मौजूद है, ≥100 chars है, required section keywords (10-language aware) रखती है |
| `[2/9]` `.claude/rules/**/*.md` files में `paths:` key के साथ YAML frontmatter है, कोई empty file नहीं |
| `[3/9]` `claudeos-core/standard/**/*.md` files ≥200 chars हैं और ✅/❌ examples + एक markdown table रखती हैं (Kotlin standards ` ```kotlin ` blocks के लिए भी check होते हैं) |
| `[4/9]` `claudeos-core/skills/**/*.md` files non-empty हैं, orchestrator + MANIFEST मौजूद हैं |
| `[5/9]` `claudeos-core/guide/` में सारी 9 expected files हैं, हर एक non-empty (BOM-aware emptiness check) |
| `[6/9]` `claudeos-core/plan/` files non-empty हैं (v2.1.2 के बाद informational, `plan/` अब auto-create नहीं होता) |
| `[7/9]` `claudeos-core/database/` files मौजूद हैं (missing हो तो warning) |
| `[8/9]` `claudeos-core/mcp-guide/` files मौजूद हैं (missing हो तो warning) |
| `[9/9]` `claudeos-core/memory/` की 4 files मौजूद + structural validation (decision-log ISO date, failure-pattern required fields, compaction `## Last Compaction` marker) |
| `[10/10]` Path-claim verification + MANIFEST drift (3 sub-classes, नीचे देखो) |

**Check `[10/10]` sub-classes:**

| Class | क्या पकड़ता है |
|---|---|
| `STALE_PATH` | `.claude/rules/**` या `claudeos-core/standard/**` में कोई भी `src/...\.(ts|tsx|js|jsx)` reference एक real file पर resolve होना चाहिए. Fenced code blocks और placeholder paths (`src/{domain}/feature.ts`) exclude हैं. |
| `STALE_SKILL_ENTRY` | `claudeos-core/skills/00.shared/MANIFEST.md` में registered हर skill path disk पर मौजूद हो. |
| `MANIFEST_DRIFT` | हर registered skill का `CLAUDE.md` में mention हो (**orchestrator/sub-skill exception** के साथ. Pass 3b Section 6 तब लिखता है जब Pass 3c sub-skills बनाता है उससे पहले, तो हर sub-skill list करना structurally impossible है). |

Orchestrator/sub-skill exception: `{category}/{parent-stem}/{NN}.{name}.md` पर registered sub-skill तब covered मान ली जाती है जब `{category}/*{parent-stem}*.md` पर एक orchestrator का CLAUDE.md में mention हो.

**Severity:** content-validator **advisory** tier पर चलता है. Output में दिखता है पर CI को block नहीं करता. Logic: Pass 3 दोबारा चलाने से LLM hallucinations fix होने की guarantee नहीं, तो blocking users को `--force` loops में फँसा देगी. Detection signal (non-zero exit + `stale-report` entry) CI pipelines और human triage के लिए काफ़ी है.

### 3. `pass-json-validator` — Pass output well-formedness

Verify करता है कि हर pass की लिखी JSON files well-formed हैं और expected keys रखती हैं. `pass-json-validator/` में रहता है.

**Verified files:**

| File | Required keys |
|---|---|
| `project-analysis.json` | 5 required keys (stack, domains, वगैरह) |
| `domain-groups.json` | 4 required keys |
| `pass1-*.json` | 4 required keys + `analysisPerDomain` object |
| `pass2-merged.json` | 10 common sections (हमेशा) + 2 backend sections (backend stack पर) + 1 kotlin base section + 2 kotlin CQRS sections (applicable हो तो). Semantic alias map के साथ fuzzy match. Top-level key count <5 = ERROR, <9 = WARNING. Empty value detection. |
| `pass3-complete.json` | Marker presence + structure |
| `pass4-memory.json` | Marker structure: object, `passNum === 4`, non-empty `memoryFiles` array |

pass2 check **stack-aware** है: backend/kotlin/cqrs determine करने के लिए `project-analysis.json` पढ़ता है और कौन-से sections expect करने हैं वो adjust कर लेता है.

**Severity:** **warn-only** tier पर चलता है. Issues दिखाता है पर CI को block नहीं करता.

### 4. `plan-validator` — Plan ↔ disk consistency (legacy)

`claudeos-core/plan/*.md` files की disk से तुलना करता है. `plan-validator/` में रहता है.

**3 modes:**
- `--check` (default): सिर्फ drift detect करो
- `--refresh`: disk से plan files update करो
- `--execute`: plan content disk पर apply करो (`.bak` backups बनाता है)

**v2.1.0 status:** Master plan generation v2.1.0 में हटाया गया. `claudeos-core/plan/` अब `init` से auto-create नहीं होता. `plan/` न हो, तो यह validator informational messages के साथ skip कर देता है.

यह उन users के लिए validator suite में रखा है जो ad-hoc backup के लिए plan files हाथ से maintain करते हैं.

**Security:** Path traversal block होता है. `isWithinRoot(absPath)` `../` से project root के बाहर escape करने वाले paths reject करता है.

**Severity:** Actual drift detect हो तो **fail** tier पर चलता है. `plan/` न हो तो no-op.

### 5. `sync-checker` — Disk ↔ Master Plan consistency

Verify करता है कि `sync-map.json` (manifest-generator ने लिखा) में registered files actually disk की files से match होती हैं. 7 tracked directories में bidirectional check. `sync-checker/` में रहता है.

**Two-step check:**

1. **Disk → Plan:** 7 tracked directories (`.claude/rules`, `standard`, `skills`, `guide`, `database`, `mcp-guide`, `memory`) + `CLAUDE.md` पर चलता है. Disk पर मौजूद पर `sync-map.json` में register न होने वाली files report करता है.
2. **Plan → Disk:** `sync-map.json` में registered ऐसे paths report करता है जो अब disk पर मौजूद नहीं (orphaned).

**Exit code:** सिर्फ orphaned files exit 1 cause करती हैं. Unregistered files informational हैं (v2.1.0+ project में default में zero registered paths होते हैं, तो यह normal case है).

**Severity:** Orphaned files के लिए **fail** tier पर चलता है. `sync-map.json` में कोई mappings न हों तो cleanly skip.

---

## Severity tiers

हर failed check equally serious नहीं होती. `health-checker` runtime validators को three-tier severity के साथ orchestrate करता है:

| Tier | Symbol | Behavior |
|---|---|---|
| **fail** | `❌` | Completion block करता है. CI में non-zero exit. Fix करना ज़रूरी. |
| **warn** | `⚠️` | Output में दिखता है पर block नहीं करता. Investigate करने लायक. |
| **advisory** | `ℹ️` | बाद में review करो. Unusual project layouts में अक्सर false positives. |

**Examples by tier:**

- **fail:** plan-validator actual drift detect करता है, sync-checker को orphaned files मिलती हैं, required guide file missing.
- **warn:** pass-json-validator non-critical schema gap पाता है.
- **advisory:** content-validator का `STALE_PATH` ऐसे path को flag करता है जो मौजूद है पर gitignored है (कुछ projects में false positive).

3-tier system इसलिए जोड़ा था ताकि `content-validator` findings (जिनमें unusual layouts पर false positives हो सकते हैं) CI pipelines को deadlock न करें. इसके बिना हर advisory block करती. और `init` दोबारा चलाना LLM hallucinations को reliably fix नहीं करता.

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

`claude-md-validator` **structural** issues पकड़ता है: section count गलत, memory file table redeclared, canonical heading में English token missing. ये signal हैं कि **CLAUDE.md regenerate होनी चाहिए**, soft warnings के लिए नहीं. Solution है `init` दोबारा चलाना (ज़रूरत पड़े तो `--force` के साथ).

बाक़ी validators **content** issues पकड़ते हैं: paths, manifest entries, schema gaps. इन्हें सब कुछ regenerate किए बिना हाथ से review और fix किया जा सकता है.

`lint` अलग रखने का मतलब यह pre-commit hooks में use हो सकता है (fast, structural-only), slow content checks साथ में खींचे बिना.

---

## Validation चलाना

```bash
# CLAUDE.md पर structural validation
npx claudeos-core lint

# 4-validator health suite
npx claudeos-core health
```

CI के लिए `health` recommended check है. अभी भी fast है (कोई LLM calls नहीं) और structural CLAUDE.md checks छोड़कर सब cover करता है, जिन्हें ज़्यादातर CI pipelines को हर commit पर verify करने की ज़रूरत नहीं.

Pre-commit hooks के लिए `lint` हर commit पर चलाने जितना fast है.

---

## Output format

Validators default में human-readable output produce करते हैं:

```
[content-validator]
ℹ advisory  STALE_PATH  src/legacy/oldRoutes.ts → file does not exist
            (cited in claudeos-core/standard/10.backend/03.routing.md:42)

[sync-checker]
✓ pass     0 orphaned files; 0 unregistered files
```

`manifest-generator` machine-readable artifacts `claudeos-core/generated/` पर लिखता है:

- `rule-manifest.json` — gray-matter से frontmatter + stat के साथ file list
- `sync-map.json` — registered path mappings (v2.1.0+: default में empty array)
- `stale-report.json` — सारे validators से consolidated findings

---

## CI integration

Minimal GitHub Actions example:

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

Exit code सिर्फ `fail`-tier findings के लिए non-zero होता है. `warn` और `advisory` print होते हैं पर build fail नहीं करते.

Official CI workflow (`.github/workflows/test.yml` में) `ubuntu-latest`, `windows-latest`, `macos-latest` × Node 18 / 20 पर चलता है.

---

## Validators कुछ ऐसा flag करें जिससे आप सहमत न हों

False positives होते हैं, ख़ासकर unusual project layouts में (जैसे gitignored generated files, custom build steps जो non-standard paths में emit करते हैं).

**किसी specific file पर detection suppress करना हो**, तो available `.claudeos-scan.json` overrides के लिए [advanced-config.md](advanced-config.md) देखो.

**Validator generally गलत है** (सिर्फ आपके project पर नहीं), तो [issue खोलो](https://github.com/claudeos-core/claudeos-core/issues). ये checks real reports के आधार पर समय के साथ tune होते हैं.

---

## यह भी देखें

- [architecture.md](architecture.md) — pipeline में validators कहाँ बैठते हैं
- [commands.md](commands.md) — `lint` और `health` command reference
- [troubleshooting.md](troubleshooting.md) — specific validator errors का meaning
