#!/usr/bin/env node

/**
 * ClaudeOS-Core — Content Validator
 *
 * Role: Validate content quality of generated files
 * Validation items:
 *   - File is not empty
 *   - standard files contain ✅/❌ examples + rules table
 *   - rules files contain paths: ["all files"] frontmatter
 *   - CLAUDE.md required sections exist
 *   - All 9 guide files are generated
 *   - Skills orchestrator + sub-skills exist
 *   - database/, mcp-guide/ files are generated
 *   - memory files follow expected entry structure
 *
 * Usage: npx claudeos-core <cmd> or node claudeos-core-tools/content-validator/index.js
 */

const fs = require("fs");
const path = require("path");
const { glob } = require("glob");
const { updateStaleReport } = require("../lib/stale-report");
const { EXPECTED_GUIDE_FILES } = require("../lib/expected-guides");

const ROOT = process.env.CLAUDEOS_ROOT || path.resolve(__dirname, "../..");
const RULES_DIR = path.join(ROOT, ".claude/rules");
const STANDARD_DIR = path.join(ROOT, "claudeos-core/standard");
const SKILLS_DIR = path.join(ROOT, "claudeos-core/skills");
const GUIDE_DIR = path.join(ROOT, "claudeos-core/guide");
const PLAN_DIR = path.join(ROOT, "claudeos-core/plan");
const DB_DIR = path.join(ROOT, "claudeos-core/database");
const MCP_DIR = path.join(ROOT, "claudeos-core/mcp-guide");
const MEMORY_DIR = path.join(ROOT, "claudeos-core/memory");
const GEN_DIR = path.join(ROOT, "claudeos-core/generated");

const EXPECTED_MEMORY = ["decision-log.md", "failure-patterns.md", "compaction.md", "auto-rule-update.md"];

function rel(p) { return path.relative(ROOT, p).replace(/\\/g, "/"); }

async function main() {
  console.log("\n╔═══════════════════════════════════════╗");
  console.log("║  ClaudeOS-Core — Content Validator    ║");
  console.log("╚═══════════════════════════════════════╝\n");

  const errors = [];
  const warnings = [];
  let checked = 0;

  // ─── Detect language and stack from project-analysis.json ────────
  let detectedLanguage = null;
  let outputLang = "en";
  const paPath = path.join(GEN_DIR, "project-analysis.json");
  if (fs.existsSync(paPath)) {
    try {
      const pa = JSON.parse(fs.readFileSync(paPath, "utf-8"));
      detectedLanguage = pa.stack?.language || null;
      outputLang = pa.lang || "en";
    } catch (_e) { /* ignore */ }
  }

  // Language-aware section keywords for CLAUDE.md validation
  const SECTION_KEYWORDS = {
    en: ["Role", "Build", "Run", "Standard", "Skills"],
    ko: ["역할", "빌드", "실행", "표준", "스킬"],
    "zh-CN": ["角色", "构建", "运行", "标准", "技能"],
    ja: ["役割", "ビルド", "実行", "標準", "スキル"],
    es: ["Rol", "Compilar", "Ejecutar", "Estándar", "Habilidades"],
    vi: ["Vai trò", "Build", "Chạy", "Tiêu chuẩn", "Kỹ năng"],
    hi: ["भूमिका", "बिल्ड", "रन", "मानक", "कौशल"],
    ru: ["Роль", "Сборка", "Запуск", "Стандарт", "Навыки"],
    fr: ["Rôle", "Build", "Exécuter", "Standard", "Compétences"],
    de: ["Rolle", "Build", "Ausführen", "Standard", "Fähigkeiten"],
  };

  // ─── 1. CLAUDE.md ──────────────────────────────────────
  console.log("  [1/9] CLAUDE.md...");
  const claudeMd = path.join(ROOT, "CLAUDE.md");
  if (!fs.existsSync(claudeMd)) {
    errors.push({ file: "CLAUDE.md", type: "MISSING", msg: "CLAUDE.md does not exist" });
  } else {
    checked++;
    const content = fs.readFileSync(claudeMd, "utf-8");
    if (content.trim().length < 100) {
      errors.push({ file: "CLAUDE.md", type: "EMPTY", msg: "CLAUDE.md content is too short (<100 chars)" });
    }
    // Check sections in both English (fallback) and output language
    const langKeywords = SECTION_KEYWORDS[outputLang] || SECTION_KEYWORDS.en;
    const enKeywords = SECTION_KEYWORDS.en;
    for (let i = 0; i < enKeywords.length; i++) {
      const candidates = [enKeywords[i], langKeywords[i]].filter(Boolean);
      const found = candidates.some(kw => {
        const re = new RegExp(`(^|#|\\s)${kw.replace(/[.*+?^${}()|\\[\]\\\\]/g, "\\$&")}`, "im");
        return re.test(content);
      });
      if (!found) {
        warnings.push({ file: "CLAUDE.md", type: "MISSING_SECTION", msg: `'${enKeywords[i]}' / '${langKeywords[i]}' section is missing` });
      }
    }
  }

  // ─── 2. .claude/rules/** ───────────────────────────────
  console.log("  [2/9] .claude/rules/...");
  if (fs.existsSync(RULES_DIR)) {
    const ruleFiles = await glob("**/*.md", { cwd: RULES_DIR, absolute: true });
    for (const f of ruleFiles) {
      checked++;
      const c = fs.readFileSync(f, "utf-8");
      const r = rel(f);
      if (c.trim().length === 0) {
        errors.push({ file: r, type: "EMPTY", msg: "Empty file" });
        continue;
      }
      // All rules must have paths: frontmatter (value varies by category — e.g. ["**/*"] for core/backend, scoped patterns for infra/sync)
      const hasFrontmatter = c.replace(/^\uFEFF/, "").startsWith("---");
      const hasPathsKey = c.includes("paths:");
      if (!hasFrontmatter) {
        warnings.push({ file: r, type: "NO_FRONTMATTER", msg: "Missing YAML frontmatter (---)" });
      } else if (!hasPathsKey) {
        warnings.push({ file: r, type: "NO_PATHS", msg: "Frontmatter exists but missing paths: key" });
      }
    }
    console.log(`    ${ruleFiles.length} files checked`);
  } else {
    errors.push({ file: ".claude/rules/", type: "MISSING", msg: "rules directory not found" });
  }

  // ─── 3. claudeos-core/standard/** ─────────────────────
  console.log("  [3/9] claudeos-core/standard/...");
  if (fs.existsSync(STANDARD_DIR)) {
    const stdFiles = await glob("**/*.md", { cwd: STANDARD_DIR, absolute: true });
    for (const f of stdFiles) {
      checked++;
      const c = fs.readFileSync(f, "utf-8");
      const r = rel(f);
      if (c.trim().length === 0) {
        errors.push({ file: r, type: "EMPTY", msg: "Empty file" });
        continue;
      }
      if (c.length < 200) {
        warnings.push({ file: r, type: "TOO_SHORT", msg: `Content is short (${c.length} chars)` });
      }
      // Language-aware ✅/❌ example detection (all 10 supported languages)
      const goodKeywords = [
        "✅", "Correct", "correct", "GOOD",
        "올바른",       // ko
        "正确",         // zh-CN
        "正しい",       // ja
        "Correcto",    // es
        "Đúng",        // vi
        "सही",          // hi
        "Правильн",    // ru
        "Correct",     // fr (same as en)
        "Richtig",     // de
      ];
      const badKeywords = [
        "❌", "Incorrect", "incorrect", "BAD",
        "잘못된",       // ko
        "错误",         // zh-CN
        "誤った",       // ja
        "Incorrecto",  // es
        "Sai",         // vi
        "गलत",         // hi
        "Неправильн",  // ru
        "Incorrect",   // fr (same as en)
        "Falsch",      // de
      ];
      if (!goodKeywords.some(kw => c.includes(kw))) {
        warnings.push({ file: r, type: "NO_GOOD_EXAMPLE", msg: "No correct example (✅) found" });
      }
      if (!badKeywords.some(kw => c.includes(kw))) {
        warnings.push({ file: r, type: "NO_BAD_EXAMPLE", msg: "No incorrect example (❌) found" });
      }
      // Check for markdown table: at least one line with | col | col | pattern
      const hasMarkdownTable = /\|.+\|.+\|/.test(c);
      if (!hasMarkdownTable) {
        warnings.push({ file: r, type: "NO_TABLE", msg: "Rules summary table appears to be missing" });
      }
      // Kotlin code block check: backend standard files should contain ```kotlin blocks
      // (core files excluded for multi-stack projects where core may cover frontend too)
      if (detectedLanguage === "kotlin") {
        const kotlinRequiredPaths = ["backend-api", "30.security-db"];
        const kotlinOptionalPaths = ["00.core/02.", "00.core/03."];
        const isRequired = kotlinRequiredPaths.some(p => r.includes(p));
        const isOptional = kotlinOptionalPaths.some(p => r.includes(p));
        if (isRequired || isOptional) {
          if (!c.includes("```kotlin") && !c.includes("```kt")) {
            if (isRequired) {
              warnings.push({ file: r, type: "NO_KOTLIN_BLOCK", msg: "No ```kotlin code block found (expected for Kotlin project)" });
            }
            // optional paths: skip warning (core files may legitimately lack kotlin blocks in multi-stack)
          }
        }
      }
    }
    console.log(`    ${stdFiles.length} files checked`);
  } else {
    errors.push({ file: "claudeos-core/standard/", type: "MISSING", msg: "standard directory not found" });
  }

  // ─── 4. claudeos-core/skills/** ────────────────────────
  console.log("  [4/9] claudeos-core/skills/...");
  if (fs.existsSync(SKILLS_DIR)) {
    const skillFiles = await glob("**/*.md", { cwd: SKILLS_DIR, absolute: true });
    checked += skillFiles.length;
    for (const f of skillFiles) {
      const c = fs.readFileSync(f, "utf-8");
      if (c.trim().length === 0) {
        errors.push({ file: rel(f), type: "EMPTY", msg: "Empty file" });
      }
    }
    // Check orchestrator existence
    const orchestrators = skillFiles.filter(f => f.includes("01.scaffold") || f.includes("MANIFEST"));
    if (orchestrators.length === 0) {
      warnings.push({ file: "claudeos-core/skills/", type: "NO_ORCHESTRATOR", msg: "No orchestrator or MANIFEST found" });
    }
    console.log(`    ${skillFiles.length} files checked (${orchestrators.length} orchestrators)`);
  } else {
    errors.push({ file: "claudeos-core/skills/", type: "MISSING", msg: "skills directory not found" });
  }

  // ─── 5. claudeos-core/guide/** ─────────────────────────
  console.log("  [5/9] claudeos-core/guide/...");
  const expectedGuides = EXPECTED_GUIDE_FILES;
  if (fs.existsSync(GUIDE_DIR)) {
    for (const g of expectedGuides) {
      const gp = path.join(GUIDE_DIR, g);
      checked++;
      if (!fs.existsSync(gp)) {
        errors.push({ file: `claudeos-core/guide/${g}`, type: "MISSING", msg: "Guide file not generated" });
      } else {
        const c = fs.readFileSync(gp, "utf-8");
        if (c.trim().length === 0) {
          errors.push({ file: `claudeos-core/guide/${g}`, type: "EMPTY", msg: "Empty file" });
        }
      }
    }
    console.log(`    ${expectedGuides.filter(g => fs.existsSync(path.join(GUIDE_DIR, g))).length} of ${expectedGuides.length} expected files exist`);
  } else {
    errors.push({ file: "claudeos-core/guide/", type: "MISSING", msg: "guide directory not found" });
  }

  // ─── 6. claudeos-core/plan/** ──────────────────────────
  // v2.1.0+ removed master plan generation; plan/ is optional and is not created
  // during fresh init. If the directory exists (legacy projects, user-authored
  // plan files), we still validate its contents. If it is absent, that is the
  // expected state post-v2.1.0 — do not push a MISSING error (parallel to
  // plan-validator / manifest-generator which were already updated in v2.1.0).
  console.log("  [6/9] claudeos-core/plan/...");
  if (fs.existsSync(PLAN_DIR)) {
    const planFiles = await glob("*.md", { cwd: PLAN_DIR, absolute: true });
    for (const f of planFiles) {
      checked++;
      const c = fs.readFileSync(f, "utf-8");
      if (c.trim().length === 0) {
        errors.push({ file: rel(f), type: "EMPTY", msg: "Empty plan file" });
        continue;
      }
      // Must contain <file> blocks (sync-rules-master uses code block format)
      const bn = path.basename(f);
      if (!bn.includes("sync")) {
        if (!c.includes("<file") && !c.includes("```")) {
          warnings.push({ file: rel(f), type: "NO_FILE_BLOCKS", msg: "No <file> blocks or code blocks found" });
        }
      }
    }
    console.log(`    ${planFiles.length} files checked`);
  } else {
    console.log("    ⏭️  plan/ not present (expected post-v2.1.0)");
  }

  // ─── 7. claudeos-core/database/** ──────────────────────
  console.log("  [7/9] claudeos-core/database/...");
  if (fs.existsSync(DB_DIR)) {
    const dbFiles = await glob("**/*.md", { cwd: DB_DIR, absolute: true });
    checked += dbFiles.length;
    if (dbFiles.length === 0) {
      warnings.push({ file: "claudeos-core/database/", type: "NO_FILES", msg: "No database files found" });
    }
    for (const f of dbFiles) {
      const c = fs.readFileSync(f, "utf-8");
      if (c.trim().length === 0) {
        errors.push({ file: rel(f), type: "EMPTY", msg: "Empty file" });
      }
    }
    console.log(`    ${dbFiles.length} files`);
  } else {
    warnings.push({ file: "claudeos-core/database/", type: "MISSING", msg: "database directory not found" });
  }

  // ─── 8. claudeos-core/mcp-guide/** ─────────────────────
  console.log("  [8/9] claudeos-core/mcp-guide/...");
  if (fs.existsSync(MCP_DIR)) {
    const mcpFiles = await glob("**/*.md", { cwd: MCP_DIR, absolute: true });
    checked += mcpFiles.length;
    if (mcpFiles.length === 0) {
      warnings.push({ file: "claudeos-core/mcp-guide/", type: "NO_FILES", msg: "No mcp-guide files found" });
    }
    for (const f of mcpFiles) {
      const c = fs.readFileSync(f, "utf-8");
      if (c.trim().length === 0) {
        errors.push({ file: rel(f), type: "EMPTY", msg: "Empty file" });
      }
    }
    console.log(`    ${mcpFiles.length} files`);
  } else {
    warnings.push({ file: "claudeos-core/mcp-guide/", type: "MISSING", msg: "mcp-guide directory not found" });
  }

  // ─── 9. claudeos-core/memory/ (L4) ─────────────────────
  console.log("  [9/9] claudeos-core/memory/...");
  if (fs.existsSync(MEMORY_DIR)) {
    for (const name of EXPECTED_MEMORY) {
      const fp = path.join(MEMORY_DIR, name);
      checked++;
      if (!fs.existsSync(fp)) {
        errors.push({ file: `claudeos-core/memory/${name}`, type: "MISSING", msg: "Memory file not scaffolded" });
        continue;
      }
      const c = fs.readFileSync(fp, "utf-8");
      if (c.trim().length === 0) {
        errors.push({ file: `claudeos-core/memory/${name}`, type: "EMPTY", msg: "Empty memory file" });
        continue;
      }
      if (c.trim().length < 50) {
        warnings.push({ file: `claudeos-core/memory/${name}`, type: "TOO_SHORT", msg: `Memory file too short (${c.trim().length} chars)` });
      }

      // ─── Structural validation (v2 — prevents silent failures in memory CLI) ───
      if (name === "decision-log.md") {
        // Entries must start with `## YYYY-MM-DD — <title>` format when present.
        // Empty (header-only) seed is allowed.
        // Fence-aware: ignore `## ...` lines inside ```...``` / ~~~...~~~ so
        // example markdown inside a decision's body text isn't flagged.
        const lines = c.split("\n");
        const entryHeadings = [];
        let inFence = false;
        const FENCE_RE = /^(```|~~~)/;
        for (const line of lines) {
          if (FENCE_RE.test(line)) { inFence = !inFence; continue; }
          if (!inFence && /^##\s+.+$/.test(line)) entryHeadings.push(line);
        }
        for (const h of entryHeadings) {
          if (!/^##\s+\d{4}-\d{2}-\d{2}/.test(h)) {
            warnings.push({
              file: `claudeos-core/memory/${name}`,
              type: "MALFORMED_ENTRY",
              msg: `Heading does not start with ISO date: ${h.slice(0, 60)}`,
            });
          }
        }
      } else if (name === "failure-patterns.md") {
        // Each entry should have frequency + last seen + fix/solution fields.
        // Parse entries and flag any that miss required fields (warning, not error).
        // Fence-aware: ignore `## ...` lines inside ```...``` or ~~~...~~~
        // so example markdown inside a Fix body is not treated as an entry.
        const lines = c.split("\n");
        let curId = null;
        let curBody = [];
        const entries = [];
        let inFence = false;
        const FENCE_RE = /^(```|~~~)/;
        for (const line of lines) {
          if (FENCE_RE.test(line)) inFence = !inFence;
          if (!inFence && /^##\s+/.test(line)) {
            if (curId !== null) entries.push({ id: curId, body: curBody.join("\n") });
            curId = line.replace(/^##\s+/, "").trim();
            curBody = [];
          } else if (curId !== null) {
            curBody.push(line);
          }
        }
        if (curId !== null) entries.push({ id: curId, body: curBody.join("\n") });
        for (const e of entries) {
          // Accept both plain (`- frequency:`) and bold (`- **frequency**:`)
          // markdown — the memory CLI's parseField matches both since v2.0.
          const hasFreq = /\b(?:frequency|count)\*{0,2}\s*[:=]/i.test(e.body);
          const hasLastSeen = /\blast\s*seen\*{0,2}\s*[:=]?/i.test(e.body) || /^\d{4}-\d{2}-\d{2}/.test(e.id);
          // Fix/solution must appear as a field line, not just any word —
          // otherwise a verbose line containing "fix" or "prefix" would
          // falsely satisfy the check.
          const hasFix = /^\s*-\s*\*{0,2}\s*(?:fix|solution)\*{0,2}\s*[:=]/im.test(e.body);
          const missing = [];
          if (!hasFreq) missing.push("frequency");
          if (!hasLastSeen) missing.push("last seen");
          if (!hasFix) missing.push("fix/solution");
          if (missing.length > 0) {
            warnings.push({
              file: `claudeos-core/memory/${name}`,
              type: "MALFORMED_ENTRY",
              msg: `Entry "${e.id.slice(0, 40)}" missing: ${missing.join(", ")} (memory CLI may skip it)`,
            });
          }
        }
      } else if (name === "compaction.md") {
        // CLI-parsed marker `## Last Compaction` must exist (memory compact looks for it).
        if (!c.includes("## Last Compaction")) {
          warnings.push({
            file: `claudeos-core/memory/${name}`,
            type: "MISSING_MARKER",
            msg: "`## Last Compaction` section missing (memory compact will append instead of update)",
          });
        }
      }
    }
    console.log(`    ${EXPECTED_MEMORY.filter(n => fs.existsSync(path.join(MEMORY_DIR, n))).length} of ${EXPECTED_MEMORY.length} expected files exist`);
  } else {
    warnings.push({ file: "claudeos-core/memory/", type: "MISSING", msg: "memory directory not found (run pass 4)" });
  }

  // ─── 10. Path-claim verification ──────────────────────────
  // Catches two failure classes:
  //   (a) Pass 3 hallucinations: rules/standard files reference
  //       src/... paths the LLM fabricated from directory context
  //       (e.g., `src/feature/routers/featureRoutePath.ts` when the actual
  //       file is `src/feature/routers/routePath.ts` — "feature" came from
  //       the parent dir, not the filename).
  //   (b) MANIFEST ↔ CLAUDE.md §6 Skills drift: a skill is registered
  //       in claudeos-core/skills/00.shared/MANIFEST.md but missing
  //       from CLAUDE.md §6 Skills list (or vice versa).
  //
  // Both manifest as a stale path reference, so a single structural
  // check covers both. No natural-language matching involved.
  console.log("  [10/10] path-claim verification (hallucination + MANIFEST drift)...");

  // Regex: matches `src/...` paths to TS/TSX/JS/JSX files, not inside
  // inline code already fenced. We still strip fenced blocks first so
  // example blocks inside ```...``` don't produce false positives.
  const SRC_PATH_RE = /\bsrc\/[\w\-./]+\.(?:ts|tsx|js|jsx)\b/g;

  // Placeholder paths are scaffold templates / teaching examples, not
  // real path claims. We skip them. Three patterns qualify:
  //   1. Curly-brace placeholder  — `src/{domain}/api/{Entity}.ts`
  //      (the original v2.3.0 form).
  //   2. Xxx-style placeholder    — `src/hooks/useXxx.ts` or
  //      `src/pages/PageXxx.tsx`  (LLMs commonly use `Xxx`/`XXX` as
  //      "insert-your-name-here"; this form has been observed in
  //      `naming-conventions-rules.md`). We match any segment
  //      containing `Xxx` or `XXX` as a distinctive token.
  //   3. Glob-star placeholder    — `src/test/*.setup.ts` or
  //      `src/*/mocks/handlers.ts` (conventional glob syntax that an
  //      LLM may use to describe a *class* of files rather than one
  //      specific file).
  // Literal paths that happen to contain `x`/`X` as part of a real
  // identifier (e.g., `src/utils/xyzParser.ts`) do NOT match these
  // patterns — the placeholder regex requires the `Xxx` pattern
  // (capital-lower-lower, a distinctive convention) OR three or more
  // consecutive uppercase X's. The uppercase-XXX rule has NO word-
  // boundary anchor because placeholder tokens commonly appear in
  // the middle of a compound identifier (`useXXX`, `useXXX_CONFIG`,
  // `nameXXXvalue`, `XXXParser`) — requiring a boundary would skip
  // those cases. Three consecutive uppercase X's in a row is a
  // distinctive signal that essentially never appears in ordinary
  // identifiers (lowercase `xxx` CAN appear in words like `taxXxxRate`,
  // but three uppercase X's do not occur outside placeholder convention).
  const hasPlaceholder = (p) =>
    /\{[^}]+\}/.test(p) ||       // {domain} style
    /X{3,}/.test(p) || /Xxx/.test(p) ||  // XXX+ anywhere, or Xxx token
    /\*/.test(p);                // glob star

  // File-level exclusion: some generated rule files are DESIGNED to cite
  // convention-trap paths as teaching examples — they tell the reader
  // "don't invent paths like these". `content-validator`'s path-claim
  // check is content-blind, so literal example paths inside such a file
  // would be flagged as STALE_PATH even though the author intentionally
  // listed them as cautionary illustrations.
  //
  // The exclusion is strictly opt-in, named by relative path, and
  // limited to files whose purpose is educational-about-paths. Adding a
  // file here is a deliberate design choice — the alternative is for
  // the LLM to rewrite those examples as placeholders (Xxx / glob /
  // prose), which the prompt now nudges toward but cannot strictly
  // enforce.
  //
  // Current exclusions:
  //   - 00.core/52.ai-work-rules.md — the canonical "AI work rules"
  //     file, which by design lists convention-trap paths as warnings
  //     to future AI sessions. This file has been observed to
  //     accumulate STALE_PATH false positives when a prompt-level
  //     denylist primed the LLM to cite those exact paths as
  //     educational examples (the denylist has since been removed;
  //     this exclusion is the validator-side defense-in-depth).
  const PATH_CLAIM_EXCLUDE_FILES = new Set([
    "00.core/52.ai-work-rules.md",
  ]);

  // Strip fenced code blocks (``` and ~~~) so examples inside code
  // blocks don't trigger the check — they're illustrations, not claims.
  function stripFences(text) {
    const lines = text.split(/\r?\n/);
    let inFence = false;
    let marker = null;
    const out = [];
    for (const line of lines) {
      const t = line.trimStart();
      const m = t.match(/^(```+|~~~+)/);
      if (m) {
        if (!inFence) { inFence = true; marker = m[1][0]; }
        else if (t.startsWith(marker)) { inFence = false; marker = null; }
        out.push(""); // preserve line count but blank the fence markers
        continue;
      }
      out.push(inFence ? "" : line);
    }
    return out.join("\n");
  }

  // Scan rules/ and standard/ for src/... path claims.
  const pathClaimTargets = [
    { label: "rules",    dir: RULES_DIR,    glob: "**/*.md" },
    { label: "standard", dir: STANDARD_DIR, glob: "**/*.md" },
  ];
  let pathClaimsChecked = 0;
  let pathClaimErrors = 0;
  let pathClaimFilesExcluded = 0;
  for (const target of pathClaimTargets) {
    if (!fs.existsSync(target.dir)) continue;
    const files = await glob(target.glob, { cwd: target.dir, absolute: true });
    for (const file of files) {
      // File-level exclusion: the path is relative to the target dir
      // (e.g., "00.core/52.ai-work-rules.md" inside .claude/rules/).
      // Normalize to forward slashes for cross-platform match.
      const relToTargetDir = path.relative(target.dir, file).split(path.sep).join("/");
      if (PATH_CLAIM_EXCLUDE_FILES.has(relToTargetDir)) {
        pathClaimFilesExcluded++;
        continue;
      }
      const raw = fs.readFileSync(file, "utf-8");
      const stripped = stripFences(raw);
      const seen = new Set(); // dedupe within a single file
      let m;
      SRC_PATH_RE.lastIndex = 0;
      while ((m = SRC_PATH_RE.exec(stripped)) !== null) {
        const claimed = m[0];
        if (seen.has(claimed)) continue;
        seen.add(claimed);
        if (hasPlaceholder(claimed)) continue;
        pathClaimsChecked++;
        const absolutePath = path.join(ROOT, claimed);
        if (!fs.existsSync(absolutePath)) {
          pathClaimErrors++;
          errors.push({
            file: rel(file),
            type: "STALE_PATH",
            msg: `References "${claimed}" which does not exist in the repository. ` +
                 `Likely Pass 3 hallucination — re-run with \`init --force\` after ` +
                 `verifying the correct path in pass2-merged.json.`,
          });
        }
      }
    }
  }
  console.log(`    ${pathClaimsChecked} path claim(s) checked, ${pathClaimErrors} stale` +
              (pathClaimFilesExcluded > 0 ? ` (${pathClaimFilesExcluded} file(s) excluded by design)` : ""));

  // MANIFEST ↔ CLAUDE.md §6 Skills drift check.
  // MANIFEST registers skills in a 4-column table; each row's second
  // cell contains a backtick-wrapped path to the skill's entry file.
  // CLAUDE.md §6 lists skills under a `### Skills` sub-section (title
  // localized, but structure is sub-section inside §6).
  //
  // We detect drift in BOTH directions:
  //   - MANIFEST entry path does not exist on disk → STALE_SKILL_ENTRY
  //   - MANIFEST entry not referenced in CLAUDE.md §6 → MANIFEST_DRIFT
  const manifestPath = path.join(SKILLS_DIR, "00.shared", "MANIFEST.md");
  let manifestErrors = 0;
  if (fs.existsSync(manifestPath)) {
    const manifest = fs.readFileSync(manifestPath, "utf-8");
    const stripped = stripFences(manifest);

    // Pull every `claudeos-core/skills/...` path that appears inside
    // a backtick span in the MANIFEST. This catches the table's
    // "entry" column regardless of the heading language ("등록된
    // 스킬" / "Registered Skills" / "登録済みスキル" — all match).
    const SKILL_PATH_RE = /`(claudeos-core\/skills\/[\w\-./]+\.md)`/g;
    const registered = new Set();
    let m;
    while ((m = SKILL_PATH_RE.exec(stripped)) !== null) {
      // Skip MANIFEST.md itself — it's always self-referenced but is
      // a meta-file, not a skill.
      if (m[1].endsWith("/MANIFEST.md")) continue;
      registered.add(m[1]);
    }

    // Stage 1: each registered skill path must exist on disk.
    for (const p of registered) {
      const abs = path.join(ROOT, p);
      if (!fs.existsSync(abs)) {
        manifestErrors++;
        errors.push({
          file: "claudeos-core/skills/00.shared/MANIFEST.md",
          type: "STALE_SKILL_ENTRY",
          msg: `Registered skill "${p}" does not exist on disk. ` +
               `Either create the skill file or remove the MANIFEST row.`,
        });
      }
    }

    // Stage 2: MANIFEST ↔ CLAUDE.md §6 cross-reference.
    const claudeMdPathForSync = path.join(ROOT, "CLAUDE.md");
    if (fs.existsSync(claudeMdPathForSync)) {
      const claudeMd = fs.readFileSync(claudeMdPathForSync, "utf-8");
      const mdStripped = stripFences(claudeMd);
      // Extract every skill path referenced in the whole CLAUDE.md
      // body. We intentionally don't try to scope to §6 alone — any
      // registered skill mentioned anywhere is considered "referenced"
      // and avoids false positives for alternate layouts.
      const referenced = new Set();
      SKILL_PATH_RE.lastIndex = 0;
      while ((m = SKILL_PATH_RE.exec(mdStripped)) !== null) {
        if (m[1].endsWith("/MANIFEST.md")) continue;
        referenced.add(m[1]);
      }

      // v2.3.0 — Sub-skill exception for the orchestrator/sub-skill
      // pattern. Rationale:
      //
      // Skills commonly ship as:
      //   skills/{category}/{NN}.{name}.md            ← orchestrator
      //   skills/{category}/{name}/{NN}.{step}.md     ← sub-skills
      //
      // (Example: 10.backend-crud/01.scaffold-crud-feature.md plus
      //  10.backend-crud/scaffold-crud-feature/01.dto.md, 02.mapper.md, …)
      //
      // Structurally, Pass 3b writes CLAUDE.md §6 before Pass 3c creates
      // the skills + MANIFEST. Pass 3b cannot list every sub-skill by
      // name because they don't exist yet, and having it predict the
      // full list produces filename hallucinations (02.entity.md when
      // Pass 3c actually emits 02.mapper.md, etc.).
      //
      // The correct design is role-separated: CLAUDE.md §6 is an entry
      // point that names categories and orchestrators; MANIFEST.md is
      // the authoritative registry for sub-skill details. So when the
      // orchestrator for a sub-skill is referenced anywhere in CLAUDE.md,
      // we treat its sub-skills as covered transitively through the
      // orchestrator row/MANIFEST indirection, and suppress
      // MANIFEST_DRIFT for them. STALE_SKILL_ENTRY (sub-skill registered
      // but file missing) still fires in Stage 1 above — that's a real
      // MANIFEST integrity issue and is not subject to this relaxation.
      //
      // A sub-skill is identified by a trailing `{parent}/{NN}.{name}.md`
      // segment whose `{parent}` directory sits one level below
      // `skills/{category}/`. The orchestrator then lives at
      // `skills/{category}/{NN-or-something}.{parent}.md`. We don't
      // require a specific numeric prefix on the orchestrator — any
      // file of the form `skills/{category}/*{parent}*.md` (excluding
      // the sub-skill itself) counts as a plausible orchestrator.
      function orchestratorFor(subSkillPath) {
        const m = subSkillPath.match(
          /^(claudeos-core\/skills\/[^/]+\/)([^/]+)\/\d+\.[^/]+\.md$/
        );
        if (!m) return null;
        return { categoryDir: m[1], stem: m[2] };
      }
      function isOrchestratorReferenced(ref, { categoryDir, stem }) {
        // CLAUDE.md mentions any file in the category directory whose
        // basename (minus leading number + dot) matches the sub-skill
        // parent stem. This accepts `01.scaffold-crud-feature.md`,
        // `scaffold-crud-feature.md`, etc.
        if (!ref.startsWith(categoryDir)) return false;
        const tail = ref.slice(categoryDir.length);
        // Must be a sibling file, not a nested path.
        if (tail.includes("/")) return false;
        // Strip leading "NN." if present, then compare stem.
        const base = tail.replace(/^\d+\./, "").replace(/\.md$/, "");
        return base === stem;
      }

      for (const p of registered) {
        if (referenced.has(p)) continue;              // direct mention → OK

        // Sub-skill exception.
        const oc = orchestratorFor(p);
        if (oc) {
          const orchestratorMentioned = Array.from(referenced).some((ref) =>
            isOrchestratorReferenced(ref, oc)
          );
          if (orchestratorMentioned) continue;        // covered via orchestrator
        }

        manifestErrors++;
        errors.push({
          file: "CLAUDE.md",
          type: "MANIFEST_DRIFT",
          msg: `Skill "${p}" is registered in MANIFEST.md but not ` +
               `mentioned in CLAUDE.md. Add it to CLAUDE.md §6 Skills ` +
               `sub-section, or remove the row from MANIFEST if no ` +
               `longer active.`,
        });
      }
    }
    console.log(`    ${registered.size} skill(s) in MANIFEST, ${manifestErrors} drift issue(s)`);
  } else {
    // MANIFEST absence is not automatically an error — small projects
    // may not use the skills system. Just note it.
    console.log("    (no MANIFEST.md found — skipping)");
  }

  // ─── Output results ─────────────────────────────────────────
  //
  // Terminology note (v2.3.3): the internal arrays stay named `errors` and
  // `warnings` because they encode *severity* for programmatic consumers
  // (health-checker's pass/fail gate, stale-report.json's schema, CI
  // pipelines). The user-visible labels, however, are "advisories" and
  // "notes" — because these are quality observations about LLM-generated
  // documents, not test failures. A STALE_PATH doesn't mean `init` crashed;
  // it means "AI guessed a filename that doesn't exist on disk — worth
  // reviewing". Calling that an "error" made users think generation had
  // actually failed. The exit code behavior is unchanged — this tool still
  // returns 1 when advisories exist so `npx claudeos-core health` remains
  // a real gate for CI.
  console.log(`\n  Checked ${checked} files\n`);
  if (errors.length) {
    console.log(`  ℹ️  ADVISORIES (${errors.length}):`);
    errors.forEach(e => console.log(`     [${e.type}] ${e.file}: ${e.msg}`));
    console.log();
  }
  if (warnings.length) {
    console.log(`  ⚠️  NOTES (${warnings.length}):`);
    warnings.forEach(w => console.log(`     [${w.type}] ${w.file}: ${w.msg}`));
    console.log();
  }
  if (!errors.length && !warnings.length) {
    console.log("  ✅ All content validation passed\n");
  }

  // Record in stale-report. Field names (`contentErrors`, `contentWarnings`)
  // stay stable because they are part of stale-report.json's public schema
  // that health-checker and external CI consumers read.
  updateStaleReport(GEN_DIR, "contentValidation",
    { checkedAt: new Date().toISOString(), checked, errors: errors.length, warnings: warnings.length, details: { errors, warnings } },
    { contentErrors: errors.length, contentWarnings: warnings.length }
  );

  console.log(`  Total: ${errors.length} advisories, ${warnings.length} notes\n`);
  // Exit code preserved (advisories → 1) so health-checker can still gate
  // on this tool. The `init` orchestrator displays the result as a soft
  // advisory regardless (see runContentValidator in bin/commands/init.js).
  process.exit(errors.length > 0 ? 1 : 0);
}

if (require.main === module) {
  main().catch(e => { console.error(`\n  ❌ Unexpected error: ${e.message || e}`); process.exit(1); });
}

module.exports = { main };
