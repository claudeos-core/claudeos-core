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
 *
 * Usage: npx claudeos-core <cmd> or node claudeos-core-tools/content-validator/index.js
 */

const fs = require("fs");
const path = require("path");
const { glob } = require("glob");
const { updateStaleReport } = require("../lib/stale-report");

const ROOT = process.env.CLAUDEOS_ROOT || path.resolve(__dirname, "../..");
const RULES_DIR = path.join(ROOT, ".claude/rules");
const STANDARD_DIR = path.join(ROOT, "claudeos-core/standard");
const SKILLS_DIR = path.join(ROOT, "claudeos-core/skills");
const GUIDE_DIR = path.join(ROOT, "claudeos-core/guide");
const PLAN_DIR = path.join(ROOT, "claudeos-core/plan");
const DB_DIR = path.join(ROOT, "claudeos-core/database");
const MCP_DIR = path.join(ROOT, "claudeos-core/mcp-guide");
const GEN_DIR = path.join(ROOT, "claudeos-core/generated");

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
  console.log("  [1/8] CLAUDE.md...");
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
        const re = new RegExp(`(^|#|\\s)${kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "im");
        return re.test(content);
      });
      if (!found) {
        warnings.push({ file: "CLAUDE.md", type: "MISSING_SECTION", msg: `'${enKeywords[i]}' / '${langKeywords[i]}' section is missing` });
      }
    }
  }

  // ─── 2. .claude/rules/** ───────────────────────────────
  console.log("  [2/8] .claude/rules/...");
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
      const hasFrontmatter = c.startsWith("---");
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
  console.log("  [3/8] claudeos-core/standard/...");
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
  console.log("  [4/8] claudeos-core/skills/...");
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
  console.log("  [5/8] claudeos-core/guide/...");
  const expectedGuides = [
    "01.onboarding/01.overview.md",
    "01.onboarding/02.quickstart.md",
    "01.onboarding/03.glossary.md",
    "02.usage/01.faq.md",
    "02.usage/02.real-world-examples.md",
    "02.usage/03.do-and-dont.md",
    "03.troubleshooting/01.troubleshooting.md",
    "04.architecture/01.file-map.md",
    "04.architecture/02.pros-and-cons.md",
  ];
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
  console.log("  [6/8] claudeos-core/plan/...");
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
    errors.push({ file: "claudeos-core/plan/", type: "MISSING", msg: "plan directory not found" });
  }

  // ─── 7. claudeos-core/database/** ──────────────────────
  console.log("  [7/8] claudeos-core/database/...");
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
  console.log("  [8/8] claudeos-core/mcp-guide/...");
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

  // ─── Output results ─────────────────────────────────────────
  console.log(`\n  Checked ${checked} files\n`);
  if (errors.length) {
    console.log(`  ❌ ERRORS (${errors.length}):`);
    errors.forEach(e => console.log(`     [${e.type}] ${e.file}: ${e.msg}`));
    console.log();
  }
  if (warnings.length) {
    console.log(`  ⚠️  WARNINGS (${warnings.length}):`);
    warnings.forEach(w => console.log(`     [${w.type}] ${w.file}: ${w.msg}`));
    console.log();
  }
  if (!errors.length && !warnings.length) {
    console.log("  ✅ All content validation passed\n");
  }

  // Record in stale-report
  updateStaleReport(GEN_DIR, "contentValidation",
    { checkedAt: new Date().toISOString(), checked, errors: errors.length, warnings: warnings.length, details: { errors, warnings } },
    { contentErrors: errors.length, contentWarnings: warnings.length }
  );

  console.log(`  Total: ${errors.length} errors, ${warnings.length} warnings\n`);
  process.exit(errors.length > 0 ? 1 : 0);
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main };
