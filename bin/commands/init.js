/**
 * ClaudeOS-Core — Init Command
 *
 * Runs the full 4-Pass pipeline: analyze → merge → generate → memory scaffold.
 * This is the main entry point for project bootstrapping.
 *
 * Refactored internally: cmdInit's 970-line monolith decomposed into ~16 stage
 * helpers (checkPrerequisites, resolveLanguage, applyResumeMode,
 * ensureDirectories, loadDomainGroups, loadPass1Prompts, runPass1Loop,
 * runPass2, buildPass3ContextJson, handlePass3StaleMarker, dispatchPass3,
 * runPass4, runVerificationTools, runLint, runContentValidator,
 * printCompletionBanner). runPass3Split is preserved below unchanged.
 *
 * All string/regex patterns consumed by tests/*.test.js source-parity checks
 * are preserved because the runPass3Split and key stale-marker/pass-4-marker
 * logic are kept in this file verbatim.
 */

const fs = require("fs");
const path = require("path");
const {
  TOOLS_DIR, PROJECT_ROOT, GENERATED_DIR,
  SUPPORTED_LANGS, LANG_CODES, isValidLang,
  log, header, run, runClaudePrompt, runClaudePromptAsync,
  ensureDir, fileExists, readFile, injectProjectRoot,
  pad, countFiles, countPass1Files,
} = require("../lib/cli-utils");
const { selectLangInteractive } = require("../lib/lang-selector");
const { selectResumeMode } = require("../lib/resume-selector");

const { EXPECTED_GUIDE_FILES } = require("../../lib/expected-guides");
const { findMissingOutputs } = require("../../lib/expected-outputs");

class InitError extends Error {
  constructor(msg) { super(msg); this.name = "InitError"; }
}

function formatElapsed(ms) {
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  const rem = sec % 60;
  return rem > 0 ? `${min}m ${rem}s` : `${min}m`;
}

// Creates an onTick/clearLine pair for long-running claude -p passes. We can
// only observe progress externally (elapsed time, sometimes filesystem delta).
// TTYs get a single \r-rewritten line; CI/piped stdout gets periodic new lines.
// Modes via opts:
//   - elapsed-only (no baselineCount): ⏳ label running... 45s
//   - file delta (baselineCount set):  📝 label generating... 24 new files | 45s
//   - fixed target (+ totalExpected):  📝 label generating... 8/12 files (67%) | 45s
function makePassTicker(label, startTime, opts = {}) {
  const isTTY = Boolean(process.stdout.isTTY);
  const { baselineCount, totalExpected } = opts;
  const trackFiles = typeof baselineCount === "number";
  let lastLineLen = 0;
  function onTick() {
    const elapsed = formatElapsed(Date.now() - startTime);
    let line;
    if (!trackFiles) {
      line = `    ⏳ ${label} running... ${elapsed} elapsed`;
    } else {
      const current = countFiles();
      const delta = typeof current === "number" ? Math.max(0, current - baselineCount) : null;
      let progress;
      if (delta === null) progress = "? new files";
      else if (typeof totalExpected === "number" && totalExpected > 0) {
        const capped = Math.min(delta, totalExpected);
        const pct = Math.round((capped / totalExpected) * 100);
        progress = `${capped}/${totalExpected} files (${pct}%)`;
      } else {
        progress = `${delta} new files`;
      }
      line = `    📝 ${label} generating... ${progress} | ${elapsed} elapsed`;
    }
    if (isTTY) {
      const pad = " ".repeat(Math.max(0, lastLineLen - line.length));
      process.stdout.write("\r" + line + pad);
      lastLineLen = line.length;
    } else {
      log(line);
    }
  }
  function clearLine() {
    if (isTTY && lastLineLen > 0) {
      process.stdout.write("\r" + " ".repeat(lastLineLen) + "\r");
      lastLineLen = 0;
    }
  }
  return { onTick, clearLine, tickMs: isTTY ? 1000 : 15000 };
}

// ═══════════════════════════════════════════════════════════════════
// v2.1: Pass 3 Split Runner
// ═══════════════════════════════════════════════════════════════════
//
// Splits the monolithic Pass 3 into 4 sequential claude -p calls:
//
//   3a: Extract facts from pass2-merged.json into pass3a-facts.md
//       (small document, becomes the shared context for 3b/3c/3d).
//   3b: Generate CLAUDE.md + standard/ + .claude/rules/ (core files).
//   3c: Generate skills/ + guide/.
//   3d: Generate plan/ + database/ + mcp-guide/ (master plans + aux).
//
// Each call has fresh context, so the total output volume can far exceed
// the model's context window without `Prompt is too long` failures.
// pass3a-facts.md replaces pass2-merged.json as the cross-stage reference,
// so cross-file consistency (which was the main advantage of the single-call
// approach) is preserved.
//
// Marker schema (pass3-complete.json):
//   {
//     "completedAt": "<ISO timestamp of final stage>",
//     "mode": "split",
//     "groupsCompleted": ["3a", "3b", "3c", "3d"]
//   }
// Partial marker after interruption:
//   { "mode": "split", "groupsCompleted": ["3a", "3b"] }
// On re-run, stages in groupsCompleted are skipped.
//
// All helper references (injectProjectRoot, fileExists, runClaudePromptAsync,
// etc.) are passed in via the ctx param rather than being captured by closure,
// because this function lives outside cmdInit for readability.
async function runPass3Split(ctx) {
  const {
    GENERATED_DIR, PROJECT_ROOT, TOOLS_DIR,
    pass3Marker, claudeMdPath,
    injectProjectRoot, readFile, fileExists,
    runClaudePromptAsync, makePassTicker, formatElapsed,
    log, countFiles,
    EXPECTED_GUIDE_FILES, findMissingOutputs,
    lang, stepTimes,
  } = ctx;

  const { writeFileSafe, readFileSafe, existsSafe } = require("../../lib/safe-fs");
  const { moveStagedRules, countFilesRecursive } = require("../../lib/staged-rules");

  const COMMON_DIR = path.join(TOOLS_DIR, "pass-prompts/templates/common");
  const stagingDir = path.join(GENERATED_DIR, ".staged-rules");

  // ─── Batch sub-division for 3b/3c on large projects ───────────
  // Even with split mode, a single 3b call that generates standard/ + rules/
  // for 50+ domains can still hit context overflow within that stage's
  // session (output accumulation). We sub-divide 3b and 3c into batches of
  // ~DOMAINS_PER_BATCH domains each when totalDomains > DOMAINS_PER_BATCH.
  //
  // 3a is never batched (single fact sheet).
  // 3d is never batched (master plan aggregation).
  //
  // Threshold rationale: 15 domains ≈ 45-60 output files for 3b alone,
  // which stays within the empirically safe single-session output range.
  // Beyond 15 we split. ceil(N/15) batches, preserving order from
  // domain-groups.json (already balanced by plan-installer).
  const DOMAINS_PER_BATCH = 15;

  function loadDomainOrder() {
    // Returns an ordered list of domain names for batching 3b/3c.
    // Primary source: domain-groups.json (already balanced).
    // Fallback: project-analysis.json backendDomains + frontendDomains.
    // Final fallback: empty array → single batch (no sub-division).
    try {
      const dgPath = path.join(GENERATED_DIR, "domain-groups.json");
      if (fileExists(dgPath)) {
        const dg = JSON.parse(readFile(dgPath));
        const groups = Array.isArray(dg) ? dg : (dg && dg.groups);
        if (Array.isArray(groups)) {
          const flat = [];
          for (const g of groups) {
            const items = Array.isArray(g.domains) ? g.domains : (Array.isArray(g) ? g : []);
            for (const d of items) {
              const name = typeof d === "string" ? d : (d && d.name);
              if (name) flat.push(name);
            }
          }
          if (flat.length > 0) return flat;
        }
      }
    } catch (_e) { /* fall through to analysis */ }

    try {
      const paPath = path.join(GENERATED_DIR, "project-analysis.json");
      if (fileExists(paPath)) {
        const pa = JSON.parse(readFile(paPath));
        const backend = Array.isArray(pa.backendDomains) ? pa.backendDomains.map(d => d.name || d) : [];
        const frontend = Array.isArray(pa.frontendDomains) ? pa.frontendDomains.map(d => d.name || d) : [];
        return [...backend, ...frontend].filter(Boolean);
      }
    } catch (_e) { /* fall through */ }

    return [];
  }

  function computeBatches(domainOrder) {
    // Returns an array of batches, where each batch is an array of domain names.
    // If total <= DOMAINS_PER_BATCH, returns a single-batch array so the caller
    // can use the backward-compatible "3b"/"3c" marker names.
    if (!domainOrder || domainOrder.length <= DOMAINS_PER_BATCH) {
      return [domainOrder || []];
    }
    const batches = [];
    for (let i = 0; i < domainOrder.length; i += DOMAINS_PER_BATCH) {
      batches.push(domainOrder.slice(i, i + DOMAINS_PER_BATCH));
    }
    return batches;
  }

  // v2.4.0 — Stack-type classification helper.
  //
  // Returns `{ backend: Set<string>, frontend: Set<string>, isMultiStack: boolean }`
  // built from `project-analysis.json`. The maps are used by
  // `buildBatchScopeNote` to emit ALWAYS-typed per-domain paths
  // (`70.domains/{type}/{domain}.md`) regardless of single/multi-stack.
  // Uniform layout means single-stack projects pay a 1-folder depth
  // cost in exchange for zero-migration when the other stack is later
  // added, and validators recognize a single pattern. The `isMultiStack`
  // flag is retained for tools that may want to surface the distinction
  // (e.g. user-facing console output) but is no longer used to branch
  // path generation.
  function loadDomainTypeMap() {
    const result = { backend: new Set(), frontend: new Set(), isMultiStack: false };
    try {
      const paPath = path.join(GENERATED_DIR, "project-analysis.json");
      if (fileExists(paPath)) {
        const pa = JSON.parse(readFile(paPath));
        if (Array.isArray(pa.backendDomains)) {
          for (const d of pa.backendDomains) {
            const n = d && (d.name || d);
            if (n) result.backend.add(n);
          }
        }
        if (Array.isArray(pa.frontendDomains)) {
          for (const d of pa.frontendDomains) {
            const n = d && (d.name || d);
            if (n) result.frontend.add(n);
          }
        }
      }
    } catch (_e) { /* tolerate missing/corrupt analysis — fallback to flat paths */ }
    result.isMultiStack = result.backend.size > 0 && result.frontend.size > 0;
    return result;
  }

  const domainOrder = loadDomainOrder();
  const batches = computeBatches(domainOrder);
  const isBatched = batches.length > 1;
  const domainTypeMap = loadDomainTypeMap();

  if (isBatched) {
    log(`    📦 Batch sub-division enabled: ${domainOrder.length} domains → ${batches.length} batches per stage (3b, 3c)`);
    for (let i = 0; i < batches.length; i++) {
      log(`       • batch ${i + 1}: ${batches[i].slice(0, 3).join(", ")}${batches[i].length > 3 ? ", +" + (batches[i].length - 3) + " more" : ""}`);
    }
  }


  // ─── Load existing marker to support resume mid-split ─────────
  // If a prior split run completed 3a and 3b but crashed at 3c, we skip
  // 3a and 3b automatically. This is the split-mode analog of Guard 3
  // stale-marker detection in cmdInit.
  let completedGroups = [];
  if (fileExists(pass3Marker)) {
    try {
      const existing = JSON.parse(readFile(pass3Marker));
      if (existing && existing.mode === "split" && Array.isArray(existing.groupsCompleted)) {
        completedGroups = existing.groupsCompleted.slice();
        if (completedGroups.length > 0) {
          log(`    ↪️  Resuming Pass 3 split: ${completedGroups.length} stage(s) already done (${completedGroups.join(", ")})`);
        }
      } else if (existing && existing.mode !== "split") {
        // Previous run was NOT split mode but marker exists and is valid.
        // Caller (cmdInit) should have skipped us already — defensive no-op here.
        log(`    ℹ️  Pass 3 marker found (non-split mode), skipping split runner`);
        return;
      }
    } catch (_e) {
      log("    ⚠️  pass3-complete.json malformed, starting Pass 3 split from scratch");
      completedGroups = [];
    }
  }

  // Helper: write marker after each stage so partial progress survives crashes.
  function persistMarker(complete) {
    const body = {
      mode: "split",
      groupsCompleted: completedGroups.slice(),
      lastUpdatedAt: new Date().toISOString(),
    };
    if (complete) body.completedAt = body.lastUpdatedAt;
    return writeFileSafe(pass3Marker, JSON.stringify(body, null, 2));
  }

  // Helper: build a stage prompt by concatenating the common header with
  // the stack-specific body extracted from the original pass3-prompt.md.
  // For v2.1 we reuse the full stack template body for 3b/3c/3d, letting
  // the stage header restrict scope via its "Scope of this step" section.
  // A future v2.2 could split the stack templates themselves into per-stage
  // sections; for now this preserves template fidelity while bounding scope.
  const pass3PromptFile = path.join(GENERATED_DIR, "pass3-prompt.md");
  if (!fileExists(pass3PromptFile)) {
    throw new InitError("pass3-prompt.md not found. Re-run plan-installer.");
  }
  const fullPass3Body = readFile(pass3PromptFile);

  function buildStagePrompt(stageHeaderFile, includeStackBody) {
    const headerPath = path.join(COMMON_DIR, stageHeaderFile);
    if (!existsSafe(headerPath)) {
      throw new InitError(
        `Pass 3 split stage header missing: ${stageHeaderFile}\n` +
        `    Expected at: ${headerPath}\n` +
        `    Re-install claudeos-core or run plan-installer to regenerate templates.`
      );
    }
    const header = readFileSafe(headerPath);
    const stackBody = includeStackBody ? ("\n\n" + fullPass3Body) : "";
    return injectProjectRoot(header + stackBody);
  }

  // Helper: build a batch scope note injected before "## Scope of this step"
  // in 3b/3c stage prompts when the project has been sub-divided into batches.
  // Tells Claude explicitly which domains to process in this particular call,
  // and which common files to include vs skip.
  function buildBatchScopeNote(stageKind, batchIndex, totalBatches, batchDomains) {
    const isLastBatch = batchIndex === totalBatches - 1;
    const isSingleBatch = totalBatches === 1;
    const domainList = batchDomains.map(d => `\`${d}\``).join(", ");

    // v2.4.0 — Always-typed per-domain layout.
    //
    // Every per-domain file lives under a `{type}/` sub-folder
    // (`70.domains/backend/` or `70.domains/frontend/`) regardless of
    // whether the project is single-stack or multi-stack. This is a
    // deliberate uniform-convention choice:
    //
    //   - Single-stack projects pay a 1-folder depth cost; in exchange
    //     they migrate to multi-stack with ZERO file moves when frontend
    //     (or backend) is later added.
    //   - LLM never has to decide which form to use → no probabilistic
    //     drift between Pass 3 runs.
    //   - Validators (content-validator, claude-md-validator) need
    //     to recognize only ONE pattern.
    //   - Future stack types (mobile, cli, agent, ...) extend naturally
    //     by adding new `{type}/` sub-folders.
    //
    // Per-domain type lookup uses `domainTypeMap` from
    // `project-analysis.json`. Domains not in either set fall back to
    // `backend` (the dominant case in real-world projects) — this
    // happens only when the analysis JSON is malformed or absent.
    const typeOf = (name) => {
      if (domainTypeMap.frontend.has(name)) return "frontend";
      // backend is the default when the domain is unknown to both sets.
      // This happens only on malformed analysis JSON; backend is the
      // safer default since it's the dominant project type.
      return "backend";
    };
    const stdPathFor = (name) => `claudeos-core/standard/70.domains/${typeOf(name)}/${name}.md`;
    const rulePathFor = (name) => `.claude/rules/70.domains/${typeOf(name)}/${name}-rules.md`;
    const stagedRulePathFor = (name) => `claudeos-core/generated/.staged-rules/70.domains/${typeOf(name)}/${name}-rules.md`;

    let note = isSingleBatch
      ? `## Per-domain scope (${stageKind}, single-batch run)\n\n`
      : `## Batch scope (${stageKind}-batch ${batchIndex + 1}/${totalBatches})\n\n`;
    if (isSingleBatch) {
      note += `${batchDomains.length} domain(s) will be processed in this single Pass 3b stage.\n`;
      note += `Per-domain files are REQUIRED regardless of domain count — they enable domain-scoped \`paths\` glob targeting for rules.\n\n`;
    } else {
      note += `This Pass 3 stage has been sub-divided into ${totalBatches} batches to avoid context overflow.\n`;
      note += `**You are processing batch ${batchIndex + 1} of ${totalBatches}.**\n\n`;
    }

    if (stageKind === "3b") {
      note += isSingleBatch
        ? `**Domains in scope (all ${batchDomains.length})**: ${domainList}\n\n`
        : `**Domains in THIS batch**: ${domainList}\n\n`;
      // Always show per-domain target paths so the LLM follows the
      // typed sub-folder convention without inferring from domain name.
      note += `**Per-domain target paths (always under \`{type}/\` sub-folder — \`backend\` or \`frontend\`):**\n`;
      for (const d of batchDomains) {
        note += `- \`${d}\` → \`${stdPathFor(d)}\` and \`${rulePathFor(d)}\`\n`;
      }
      note += `\n`;
      note += `**Rules**:\n`;
      if (isSingleBatch) {
        // Single-batch (≤15 domains): common files AND per-domain files in same stage.
        note += `1. Generate ALL common files (CLAUDE.md + standard/00.core/* + standard/10.backend/* + standard/30.security-db/* + standard/40.infra/* + standard/80.verification/* + .claude/rules/00.core/* + .claude/rules/10.backend/* + .claude/rules/30.security-db/* + .claude/rules/40.infra/* + .claude/rules/50.sync/*) per the stack pass3 template.\n`;
        note += `2. **ALSO** create ONE NEW per-domain standard file PER domain listed above at \`claudeos-core/standard/70.domains/{type}/{domain}.md\` (use the exact \`{type}\` shown in the per-domain target paths above). **Expected output: ${batchDomains.length} new file(s) under \`70.domains/{type}/\`** — one per domain. Do NOT inline these into the common standards (00.core/, 10.backend/, etc.); per-domain files are DOMAIN-scoped while common files are TOPIC-based, and they must live at separate paths so per-domain rules can scope to them via \`paths\` glob.\n`;
        note += `3. **ALSO** create ONE NEW per-domain rule file PER domain listed above at \`.claude/rules/70.domains/{type}/{domain}-rules.md\` (via staging-override path \`claudeos-core/generated/.staged-rules/70.domains/{type}/{domain}-rules.md\`). Each rule file MUST have a \`paths\` frontmatter glob scoped to that domain's source directories so the rule auto-loads only when editing the relevant files.\n`;
        note += `4. Per-domain file generation is MANDATORY even for ${batchDomains.length}-domain projects (any size below the 15-domain batch threshold). The convention is uniform across all project sizes for consistency: same dirtree shape regardless of scale.\n`;
        note += `5. Rule B idempotent skip applies — if a per-domain file already exists with substantive content, print \`[SKIP] <path>\` and continue.\n`;
      } else {
        // Multi-batch (>15 domains): common files in 3b-core, per-domain in batch stages.
        note += `1. CLAUDE.md and all common standard/ files (00.core/, 30.security-db/, 40.infra/, etc.) are ALREADY GENERATED by the 3b-core stage. DO NOT regenerate them.\n`;
        note += `2. Create ONE NEW per-domain standard file PER domain listed above at \`claudeos-core/standard/70.domains/{type}/{domain}.md\` (use the exact \`{type}\` shown in the per-domain target paths above — \`backend\` or \`frontend\`). **Expected output: ${batchDomains.length} new files** — one per domain in this batch. Do NOT inline these into the common files generated by 3b-core; common files are TOPIC-based, per-domain files are DOMAIN-scoped and must live at separate paths so per-domain rules can scope to them via \`paths\` glob.\n`;
        note += `3. Create ONE NEW per-domain rule file PER domain listed above at \`.claude/rules/70.domains/{type}/{domain}-rules.md\` (via staging-override path \`claudeos-core/generated/.staged-rules/70.domains/{type}/{domain}-rules.md\`). Each rule file MUST have a \`paths\` frontmatter glob scoped to that domain's source directories so the rule auto-loads only when editing the relevant files. Common rules are already generated by 3b-core — do NOT regenerate.\n`;
        note += `4. DO NOT generate standard/ or rules/ files for domains NOT in the above list — those are/will be processed in other batches.\n`;
        note += `5. Rule B idempotent skip applies ONLY to files at the per-domain paths shown above for THIS batch's domains — i.e. resume after a crash. **Do NOT use Rule B as justification for skipping the entire batch** because common files at OTHER paths exist (those are out of scope for this batch). If a per-domain target file does NOT exist for a batch domain, you MUST generate it; emitting "0 new files" for the whole batch when domains were assigned to you is a critical Pass 3 failure mode.\n`;
      }
    } else if (stageKind === "3c") {
      note += isSingleBatch
        ? `**Domains in scope (all ${batchDomains.length})**: ${domainList}\n\n`
        : `**Domains in THIS batch**: ${domainList}\n\n`;
      note += `**Rules**:\n`;
      if (isSingleBatch) {
        // Single-batch (≤15 domains): ALL of 3c — guides + common skills + per-domain skill notes — in one stage.
        note += `1. Generate ALL guide/ files (01.onboarding, 02.usage, 03.troubleshooting, 04.architecture) per the stack pass3 template.\n`;
        note += `2. Generate common skills: \`claudeos-core/skills/00.shared/MANIFEST.md\` + the category orchestrator(s) at \`claudeos-core/skills/{category}/01.scaffold-*-feature.md\` + their sub-skill files under \`{category}/scaffold-*-feature/\`.\n`;
        note += `3. **ALSO** generate \`claudeos-core/skills/{category}/02.domains.md\` orchestrator (sibling to the \`domains/\` sub-folder) — REQUIRED for ALL projects regardless of domain count, mirrors the canonical \`01.scaffold-*-feature.md\` ↔ \`scaffold-*-feature/\` pattern.\n`;
        note += `4. **ALSO** generate per-domain skill notes at \`claudeos-core/skills/{category}/domains/{domain}.md\` for EACH of the ${batchDomains.length} domain(s). **Expected output: ${batchDomains.length} new file(s) under \`{category}/domains/\`** — content describes domain-specific anti-patterns, dependencies, naming quirks. Per-domain skill generation is MANDATORY even for ${batchDomains.length}-domain projects (the convention is uniform across all project sizes).\n`;
        note += `5. MUST register every newly created skill file in \`00.shared/MANIFEST.md\` (orchestrator + sub-skills + 02.domains.md + per-domain notes).\n`;
        note += `6. Rule B idempotent skip applies — if a skill file already exists, print \`[SKIP] <path>\` and move on.\n`;
      } else {
        // Multi-batch (>15 domains): guides+common skills in 3c-core, per-domain in batch stages.
        note += `1. ALL guide/ files (01.onboarding, 02.usage, 03.troubleshooting, 04.architecture) are ALREADY GENERATED by the 3c-core stage. DO NOT regenerate.\n`;
        note += `2. Common skills (00.shared/, orchestrator SKILL.md) and \`02.domains.md\` orchestrator are ALREADY GENERATED by 3c-core. DO NOT regenerate.\n`;
        note += `3. Generate per-domain skill notes ONLY for the domains listed above at \`claudeos-core/skills/{category}/domains/{domain}.md\` — typically under 10.backend-crud/ or 20.frontend-page/.\n`;
        note += `4. DO NOT generate skills for domains NOT in the above list.\n`;
        note += `5. Rule B idempotent skip applies: if a skill file already exists, print \`[SKIP] <path>\` and move on.\n`;
      }
    }

    if (!isLastBatch) {
      note += `\n**CRITICAL**: Other domains exist in the project but will be processed by LATER batches. Do not attempt to process them now — doing so will consume context that later batches need.\n`;
    }

    return note + "\n";
  }

  // Helper: build a "core common files only" prompt for 3b-core / 3c-core
  // stages. Injected between the stage header and the stack body to restrict
  // scope to project-wide files (CLAUDE.md, common standards, guides, shared
  // skills) — explicitly excluding any domain-specific output that belongs
  // to subsequent batch stages.
  function buildStageCorePrompt(stageKind, batchesList) {
    const totalBatches = batchesList.length;
    const totalDomains = batchesList.reduce((sum, b) => sum + b.length, 0);

    let coreNote = `## Core common files stage (${stageKind}-core)\n\n`;
    coreNote += `This Pass 3 run has ${totalDomains} domains divided into ${totalBatches} batches.\n`;
    coreNote += `To keep each stage's output within safe context limits, project-wide common\n`;
    coreNote += `files are generated in THIS dedicated core stage, BEFORE the per-domain batches.\n\n`;

    if (stageKind === "3b") {
      coreNote += `**Scope of ${stageKind}-core**:\n`;
      coreNote += `1. CLAUDE.md at the project root.\n`;
      coreNote += `2. ALL standard/ files that are NOT tied to a specific domain:\n`;
      coreNote += `   - claudeos-core/standard/00.core/*.md (project overview, architecture, conventions)\n`;
      coreNote += `   - claudeos-core/standard/30.security-db/*.md\n`;
      coreNote += `   - claudeos-core/standard/40.infra/*.md\n`;
      coreNote += `   - claudeos-core/standard/80.verification/*.md\n`;
      coreNote += `   - claudeos-core/standard/90.optional/*.md\n`;
      coreNote += `   - (stack-specific common sections as defined in the pass3 template)\n`;
      coreNote += `3. ALL rules files (via staging-override path .claude/rules → generated/.staged-rules):\n`;
      coreNote += `   - common rules that apply regardless of domain.\n\n`;
      coreNote += `**What NOT to generate in ${stageKind}-core**:\n`;
      coreNote += `- Per-domain standard/ files (e.g. \`claudeos-core/standard/10.backend/order-api.md\` for a specific domain "order")\n`;
      coreNote += `- Per-domain rules.\n`;
      coreNote += `- Anything under claudeos-core/skills/, claudeos-core/guide/, claudeos-core/plan/ — those belong to later stages (3c-core, 3c-N, 3d).\n\n`;
      coreNote += `**Per-domain files will be generated in subsequent 3b-1, 3b-2, ... batch stages.**\n`;
    } else if (stageKind === "3c") {
      coreNote += `**Scope of ${stageKind}-core**:\n`;
      coreNote += `1. ALL guide/ files (project-wide, domain-independent):\n`;
      coreNote += `   - claudeos-core/guide/01.onboarding/*.md\n`;
      coreNote += `   - claudeos-core/guide/02.usage/*.md\n`;
      coreNote += `   - claudeos-core/guide/03.troubleshooting/*.md\n`;
      coreNote += `   - claudeos-core/guide/04.architecture/*.md\n`;
      coreNote += `2. COMMON skills only:\n`;
      coreNote += `   - claudeos-core/skills/00.shared/*\n`;
      coreNote += `   - top-level orchestrator SKILL.md files (e.g. \`10.backend-crud/SKILL.md\` without any subfolder)\n`;
      coreNote += `3. **Per-domain orchestrator** (REQUIRED whenever batches are non-empty — i.e. ${totalDomains} domains will be processed): for EACH active skill category that will receive per-domain notes, generate the sibling orchestrator file at \`claudeos-core/skills/{category}/02.domains.md\`. The basename stem (\`domains\`) MUST match the \`domains/\` sub-folder name so \`content-validator\`'s standard orchestrator-stem matching covers all sub-skills directly. The orchestrator's content describes the per-domain notes pattern, lists the ${totalDomains} domains that will be processed, and links to \`00.shared/MANIFEST.md\`. Generate it BEFORE 3c-N batches run so it's already in place when sub-skills land. Numbered \`02.\` because \`01.scaffold-*-feature.md\` already occupies the \`01.\` slot at the category root.\n\n`;
      coreNote += `**What NOT to generate in ${stageKind}-core**:\n`;
      coreNote += `- Per-domain skill sub-directories (e.g. \`10.backend-crud/scaffold-order-feature/\`) — those belong to 3c-1, 3c-2, ... batch stages.\n`;
      coreNote += `- Per-domain note files (\`10.backend-crud/domains/{domain}.md\`) — those belong to 3c-N batch stages. ${stageKind}-core only generates the parent ORCHESTRATOR (\`02.domains.md\`).\n`;
      coreNote += `- Anything under plan/, database/, mcp-guide/ — those belong to 3d.\n\n`;
      coreNote += `**Per-domain skill notes will be generated in subsequent 3c-1, 3c-2, ... batch stages, under each category's \`domains/\` sub-folder.**\n`;
    }

    coreNote += `\nIf you find yourself about to generate a domain-specific file in this stage: STOP. Emit \`[DEFER] <path> — will be generated in 3b-N / 3c-N batch\` and move on.\n\n`;

    const headerFile = stageKind === "3b" ? "pass3b-core-header.md" : "pass3c-skills-guide-header.md";
    const baseprompt = buildStagePrompt(headerFile, true);
    return baseprompt.replace(/\n## Scope of this step/, `\n${coreNote}\n## Scope of this step`);
  }

  // Helper: build the prompt for 3d-aux (the only Pass 3d sub-stage that
  // actually runs now). Master plan aggregation (standard/rules/skills/guide)
  // was removed because master plans are an internal tool backup not consumed
  // by Claude Code at runtime, and aggregating 30+ files in a single session
  // was the primary source of "Prompt is too long" failures on mid-sized
  // projects (observed on an 18-domain production run).
  //
  // The subStage parameter is kept for forward-compat: if a future version
  // reintroduces master plans via Node-side aggregation, this helper can
  // route the extra sub-stages back in.
  function build3dSubPrompt(subStage) {
    const baseprompt = buildStagePrompt("pass3d-plan-aux-header.md", true);

    if (subStage !== "aux") {
      throw new InitError(
        `build3dSubPrompt called with unsupported subStage "${subStage}". ` +
        `Master plan sub-stages (standard/rules/skills/guide) were removed in this version. ` +
        `Only "aux" is supported.`
      );
    }

    let scopeNote = `## 3d sub-stage: aux\n\n`;
    scopeNote += `Pass 3d now produces only auxiliary documentation (database + mcp-guide). Master plan aggregation (standard/rules/skills/guide → plan/*-master.md) was removed because master plans are an internal tool backup not consumed by Claude Code at runtime, and aggregating many files in a single session was the primary cause of "Prompt is too long" failures.\n`;
    scopeNote += `**You are processing sub-stage \`3d-aux\`.**\n\n`;

    scopeNote += `### Scope of 3d-aux (exclusively)\n\n`;
    scopeNote += `Generate ONLY auxiliary documentation:\n`;
    scopeNote += `- \`claudeos-core/database/\` — schema docs and SQL reference. If pass3a-facts.md shows no database was detected, write a single \`README.md\` stub explaining this and stop.\n`;
    scopeNote += `- \`claudeos-core/mcp-guide/\` — MCP integration guide. If no relevant MCP servers apply, write \`README.md\` stub and stop.\n\n`;
    scopeNote += `**DO NOT touch \`claudeos-core/plan/\`** — master plans are no longer generated in this version. If the \`plan/\` directory exists from a previous run, leave it untouched (Rule B).\n\n`;
    scopeNote += `Rule B applies. Absence of database/ or mcp-guide/ is warning-level, so README stubs are acceptable.\n`;

    return baseprompt.replace(/\n## Scope of this step/, `\n${scopeNote}\n## Scope of this step`);
  }


  // Helper: run a single stage with progress ticker, staged-rules move,
  // and (optionally) per-stage output validation.
  async function runStage(stageId, label, promptStr, opts = {}) {
    if (completedGroups.includes(stageId)) {
      log(`    ⏭️  ${stageId} (${label}) already complete, skipping`);
      return { skipped: true };
    }

    // Clear stale staging before each stage. 3a doesn't write rules so
    // it's a no-op there; 3b/3c/3d may write staged rules.
    if (fileExists(stagingDir)) {
      fs.rmSync(stagingDir, { recursive: true, force: true });
    }

    log("");
    log(`    🚀 ${stageId} — ${label}`);
    const t0 = Date.now();
    const ticker = makePassTicker(`Pass ${stageId}`, t0, { baselineCount: countFiles() });
    const ok = await runClaudePromptAsync(promptStr, {
      onTick: ticker.onTick,
      tickMs: ticker.tickMs,
    });
    ticker.clearLine();
    const elapsed = Date.now() - t0;
    stepTimes.push(elapsed);

    if (!ok) {
      throw new InitError(
        `Pass ${stageId} (${label}) failed. Check the claude error output above.\n` +
        `    Already-completed stages are preserved; re-running will resume from ${stageId}.\n` +
        `    If this persists, try: npx claudeos-core init --force`
      );
    }

    // Move staged rules after stages that generate rule files (3b, 3c, 3d).
    // Pass 3a only writes pass3a-facts.md, so no staging to move.
    if (opts.expectsStagedRules) {
      const move = moveStagedRules(PROJECT_ROOT);
      if (move.failed > 0) {
        log(`    ⚠️  ${stageId} staged-rules: ${move.moved} moved, ${move.failed} failed`);
        for (const err of move.errors) log(`       • ${err}`);
        throw new InitError(
          `Pass ${stageId} finished but ${move.failed} rule file(s) could not be moved from staging.\n` +
          `    This is usually a transient file-lock issue. Re-run \`npx claudeos-core init\`.`
        );
      } else if (move.moved > 0) {
        log(`    📦 ${stageId} staged-rules: ${move.moved} rule files moved to .claude/rules/`);
      }
    }

    // Per-stage output validation (delegates to opts.validate callback).
    if (typeof opts.validate === "function") {
      const problems = opts.validate();
      if (problems && problems.length > 0) {
        const preview = problems.slice(0, 5).map(p => `       • ${p}`).join("\n");
        const more = problems.length > 5 ? `\n       • ... and ${problems.length - 5} more` : "";
        throw new InitError(
          `Pass ${stageId} (${label}) produced incomplete output:\n` +
          preview + more + "\n" +
          `    Already-completed stages are preserved. Re-run to retry from ${stageId}.`
        );
      }
    }

    // Mark stage complete and persist marker so a crash in a later stage
    // doesn't lose this stage's progress.
    completedGroups.push(stageId);
    const persisted = persistMarker(false);
    if (!persisted) {
      throw new InitError(
        `Pass ${stageId} succeeded but failed to persist progress to pass3-complete.json.\n` +
        `    Check disk space / permissions on ${GENERATED_DIR}/.`
      );
    }

    log(`    ✅ ${stageId} complete (${formatElapsed(elapsed)})`);
    return { skipped: false, elapsed };
  }

  // ═══ Stage 3a: Extract facts ═══════════════════════════════════
  const factsFile = path.join(GENERATED_DIR, "pass3a-facts.md");
  await runStage("3a", "fact extraction", buildStagePrompt("pass3a-facts.md", false), {
    expectsStagedRules: false,
    validate: () => {
      const problems = [];
      if (!fileExists(factsFile)) {
        problems.push("pass3a-facts.md was not created");
      } else {
        const content = readFileSafe(factsFile, "");
        const stripped = content.replace(/^\uFEFF/, "").trim();
        if (stripped.length < 500) {
          problems.push(`pass3a-facts.md too short (${stripped.length} chars, expected >= 500)`);
        }
      }
      return problems;
    },
  });

  // ═══ Stage 3b: CLAUDE.md + standard/ + .claude/rules/ ═══════════
  //
  // Single batch (domains ≤ 15): keep legacy "3b" marker (backward-compatible).
  // Multi-batch (domains > 15): run "3b-core" first, then "3b-1", "3b-2", ...
  //
  // Rationale for splitting 3b-core: if the first multi-batch stage handled
  // "CLAUDE.md + common standards + 15 domains" in a single session, that
  // single stage would hit ~70-80 files — close to 2x the observed overflow
  // threshold (~40 files). Splitting the common files into their own stage
  // keeps every stage under ~50 files.
  if (isBatched) {
    await runStage("3b-core", "core common files (CLAUDE.md + common standard + common rules)",
      buildStageCorePrompt("3b", batches),
      {
        expectsStagedRules: true,
        validate: () => {
          const problems = [];
          if (!fileExists(claudeMdPath)) {
            problems.push("CLAUDE.md was not created");
          }
          const stdSentinel = path.join(PROJECT_ROOT, "claudeos-core/standard/00.core/01.project-overview.md");
          if (!fileExists(stdSentinel)) {
            problems.push("claudeos-core/standard/00.core/01.project-overview.md missing");
          } else {
            const c = readFileSafe(stdSentinel, "");
            if (c.replace(/^\uFEFF/, "").trim().length === 0) {
              problems.push("claudeos-core/standard/00.core/01.project-overview.md is empty");
            }
          }
          // 3b-core generates only common rules — rules-count validation happens in 3b-N.
          return problems;
        },
      }
    );
  }

  // Per-domain batch loop.
  // Single batch: stageId "3b", common files included (legacy behavior).
  // Multi-batch: stageId "3b-1", "3b-2", ..., common files already handled in 3b-core.
  for (let bi = 0; bi < batches.length; bi++) {
    const batchDomains = batches[bi];
    const stageId = isBatched ? `3b-${bi + 1}` : "3b";
    const label = isBatched
      ? `domain batch ${bi + 1}/${batches.length} (${batchDomains.length} domains)`
      : "core files (CLAUDE.md + standard + rules)";

    // v2.4.0 — Per-domain scope note ALWAYS injected (single OR multi-batch).
    //
    // Previously single-batch projects (≤15 domains) skipped the scope note,
    // and the stack pass3 template alone didn't mandate per-domain file
    // generation under `70.domains/{type}/`. As a result, small projects
    // got common standards but no per-domain files — inconsistent with
    // multi-batch projects and breaking the uniform-convention contract.
    //
    // The note text itself branches on isSingleBatch internally:
    //   - Single batch: "Generate common files AND per-domain files"
    //   - Multi batch:  "Per-domain only (common files done in 3b-core)"
    const batchScopeNote = buildBatchScopeNote("3b", bi, batches.length, batchDomains);
    const baseprompt = buildStagePrompt("pass3b-core-header.md", true);
    const promptWithScope = baseprompt.replace(
      /\n## Scope of this step/,
      `\n${batchScopeNote}\n## Scope of this step`
    );

    await runStage(stageId, label, promptWithScope, {
      expectsStagedRules: true,
      validate: () => {
        const problems = [];
        // Single batch: validate common files here (no 3b-core exists).
        if (!isBatched) {
          if (!fileExists(claudeMdPath)) {
            problems.push("CLAUDE.md was not created");
          }
          const stdSentinel = path.join(PROJECT_ROOT, "claudeos-core/standard/00.core/01.project-overview.md");
          if (!fileExists(stdSentinel)) {
            problems.push("claudeos-core/standard/00.core/01.project-overview.md missing");
          } else {
            const c = readFileSafe(stdSentinel, "");
            if (c.replace(/^\uFEFF/, "").trim().length === 0) {
              problems.push("claudeos-core/standard/00.core/01.project-overview.md is empty");
            }
          }
        }
        // For every batch, confirm rules/ was generated (at least one staged-rules move must succeed).
        const rulesDir = path.join(PROJECT_ROOT, ".claude/rules");
        const rulesCount = countFilesRecursive(rulesDir);
        if (rulesCount === 0) {
          problems.push(".claude/rules/ has 0 files (staging-override may have been ignored)");
        }
        return problems;
      },
    });
  }

  // ═══ Stage 3c: skills/ + guide/ ═══════════════════════════════
  //
  // Single batch (domains ≤ 15): keep legacy "3c" marker (guide + skills together).
  // Multi-batch (domains > 15): run "3c-core" first, then "3c-1", "3c-2", ...
  //
  // Rationale for splitting 3c-core: the 9 guide files + common skills are fixed regardless of domain count.
  // Mixing them into domain batches makes the first batch heavier than the others.
  if (isBatched) {
    await runStage("3c-core", "common guides and shared skills",
      buildStageCorePrompt("3c", batches),
      {
        expectsStagedRules: true, // shared skills occasionally include rule files
        validate: () => {
          const problems = [];
          const guideDir = path.join(PROJECT_ROOT, "claudeos-core/guide");
          const missingGuides = EXPECTED_GUIDE_FILES.filter(g => {
            const fp = path.join(guideDir, g);
            if (!fileExists(fp)) return true;
            try {
              return fs.readFileSync(fp, "utf-8").replace(/^\uFEFF/, "").trim().length === 0;
            } catch (_e) { return true; }
          });
          for (const g of missingGuides) {
            problems.push(`claudeos-core/guide/${g} missing or empty`);
          }
          // Final skills/ validation is performed in the last domain batch.
          return problems;
        },
      }
    );
  }

  // Per-domain skills batch loop.
  // Single batch: guide + skills together (legacy behavior).
  // Multi-batch: skills only; guide was already handled in 3c-core.
  for (let bi = 0; bi < batches.length; bi++) {
    const batchDomains = batches[bi];
    const stageId = isBatched ? `3c-${bi + 1}` : "3c";
    const label = isBatched
      ? `domain skills batch ${bi + 1}/${batches.length} (${batchDomains.length} domains)`
      : "skills and guides";

    // v2.4.0 — Per-domain skill scope note ALWAYS injected (single OR multi-batch).
    // Same rationale as Pass 3b: small projects need per-domain skill notes
    // (`{category}/domains/{domain}.md`) and the `02.domains.md` orchestrator
    // for uniform layout across all project sizes.
    const batchScopeNote = buildBatchScopeNote("3c", bi, batches.length, batchDomains);
    const baseprompt = buildStagePrompt("pass3c-skills-guide-header.md", true);
    const promptWithScope = baseprompt.replace(
      /\n## Scope of this step/,
      `\n${batchScopeNote}\n## Scope of this step`
    );

    await runStage(stageId, label, promptWithScope, {
      expectsStagedRules: true, // skills occasionally include rule files
      validate: () => {
        const problems = [];
        // Single batch: validate guide here as well (no 3c-core).
        if (!isBatched) {
          const guideDir = path.join(PROJECT_ROOT, "claudeos-core/guide");
          const missingGuides = EXPECTED_GUIDE_FILES.filter(g => {
            const fp = path.join(guideDir, g);
            if (!fileExists(fp)) return true;
            try {
              return fs.readFileSync(fp, "utf-8").replace(/^\uFEFF/, "").trim().length === 0;
            } catch (_e) { return true; }
          });
          for (const g of missingGuides) {
            problems.push(`claudeos-core/guide/${g} missing or empty`);
          }
        }
        // Final skills validation: full check only in the single-batch case or the last multi-batch.
        if (!isBatched || bi === batches.length - 1) {
          const { hasNonEmptyMdRecursive } = require("../../lib/expected-outputs");
          const skillsDir = path.join(PROJECT_ROOT, "claudeos-core/skills");
          if (!fileExists(skillsDir) || !hasNonEmptyMdRecursive(skillsDir)) {
            problems.push("claudeos-core/skills/ has no non-empty .md files");
          }
        }
        return problems;
      },
    });
  }

  // ═══ Stage 3d: plan/ + database/ + mcp-guide/ ═════════════════
  //
  // 3d used to aggregate standard/rules/skills/guide into a master plan
  // and generate database/mcp-guide stubs. But the master plan itself was
  // an internal backup/management file never loaded by Claude Code at runtime,
  // and at high domain counts the single-session aggregation caused "Prompt is
  // too long" failures (at 18 domains, 3d-standard failed at the 32-file mark).
  // Dropping master plan generation is the correct call for stability, and
  // users can aggregate manually with their own script when needed.
  //
  // As a result, 3d only keeps the aux stage:
  //   3d-aux → database/ + mcp-guide/ (project-specific stub descriptions)

  // 3d-aux: database/ + mcp-guide/ (absence is warning-level)
  await runStage("3d-aux", "aux docs (database + mcp-guide)",
    build3dSubPrompt("aux"),
    {
      expectsStagedRules: false,
      validate: () => [],
    }
  );

  // ─── Final marker: all 4 stages done ─────────────────────────
  const finalPersist = persistMarker(true);
  if (!finalPersist) {
    throw new InitError(
      "Pass 3 split all stages complete but failed to write final marker.\n" +
      `    Check disk space / permissions on ${GENERATED_DIR}/.`
    );
  }
  // Total stage count
  // 3a (1) + 3b (1 single or core+N) + 3c (1 single or core+N) + 3d-aux (1)
  // Single batch: 1 + 1 + 1 + 1 = 4
  // Multi-batch: 1 + (1 + N) + (1 + N) + 1 = 2N + 4
  const three3dStages = 1; // aux only (master plan aggregation removed)
  const totalStages = isBatched
    ? (1 + 1 + batches.length + 1 + batches.length + three3dStages)
    : (1 + 1 + 1 + three3dStages);
  log(`    🎉 Pass 3 split complete: ${completedGroups.length}/${totalStages} stages successful`);
}

// ═══════════════════════════════════════════════════════════════════
// cmdInit stage helpers
// ═══════════════════════════════════════════════════════════════════
// The original cmdInit was 970 lines with 77 if-statements and 17 try-blocks
// in a single function. Below it is decomposed into one helper per pipeline
// phase. Each helper owns a self-contained step with clear inputs/outputs.
//
// Shared state passed across helpers:
//   - { lang, stepTimes, completedSteps (via ref), progressBar, wasFreshClean }
// Helpers that advance the outer progress bar return a `stepsDelta` value
// that cmdInit adds to `completedSteps` locally. This preserves the literal
// `completedSteps++` text at the top-level orchestrator, which several
// source-parity tests rely on for stale-check region detection.

// ─── Stage 1: Prerequisites check ──────────────────────────────────
function checkPrerequisites() {
  const hasProjectMarker = [".git", "package.json", "build.gradle", "build.gradle.kts", "pom.xml", "pyproject.toml", "requirements.txt"].some(
    m => fs.existsSync(path.join(PROJECT_ROOT, m))
  );
  if (!hasProjectMarker) {
    log(`\n  ⚠️  Warning: ${PROJECT_ROOT} does not look like a project root.`);
    log("  No .git, package.json, build.gradle, or pom.xml found.");
    log("  Run this command from your project directory.\n");
  }

  const nodeVersion = parseInt(process.versions.node.split(".")[0]);
  if (nodeVersion < 18) {
    throw new InitError(`Node.js v18+ required (current: v${process.versions.node})\n  Install: https://nodejs.org/`);
  }

  const claudeExists = run("claude --version", { silent: true, ignoreError: true });
  if (!claudeExists) {
    throw new InitError("Claude Code CLI not found.\n  Install: https://code.claude.com/docs/en/overview\n  Then run: claude (and complete authentication)");
  }

  // Verify Claude is authenticated (quick prompt test)
  const claudeAuth = run('claude -p "echo ok"', { silent: true, ignoreError: true });
  if (!claudeAuth) {
    throw new InitError("Claude Code may not be authenticated.\n  Run: claude (and complete authentication)\n  Then retry: npx claudeos-core init");
  }
}

// ─── Stage 2: Resolve output language ─────────────────────────────
async function resolveLanguage(parsedArgs) {
  let lang = parsedArgs.lang;
  if (!lang) {
    lang = await selectLangInteractive();
  }
  if (!lang) {
    throw new InitError("Cancelled.");
  }
  if (!isValidLang(lang)) {
    throw new InitError(`Unsupported language: "${lang}"\n  Supported: ${LANG_CODES.join(", ")}`);
  }

  // Early incompatibility check: CLAUDEOS_SKIP_TRANSLATION is a test-only
  // env var that short-circuits lib/memory-scaffold.js translation path.
  // If set AND the user chose a non-English language, Pass 4's static fallback
  // and gap-fill would throw mid-run with a confusing "translation skipped"
  // error. Fail fast here with a clear message so the user can unset the var
  // or pick --lang en before the pipeline starts.
  if (process.env.CLAUDEOS_SKIP_TRANSLATION === "1" && lang !== "en") {
    throw new InitError(
      `CLAUDEOS_SKIP_TRANSLATION=1 is set but --lang='${lang}' requires translation.\n` +
      `  This env var is a test-only escape hatch that blocks calls to \`claude -p\`\n` +
      `  from lib/memory-scaffold.js. Pass 4 would crash later with a hard-to-\n` +
      `  diagnose error.\n\n` +
      `  Either unset the env var:    unset CLAUDEOS_SKIP_TRANSLATION\n` +
      `  Or run with English output:  npx claudeos-core init --lang en`
    );
  }

  process.env.CLAUDEOS_LANG = lang;
  return lang;
}

// ─── Stage 3: Resume/Fresh selection ──────────────────────────────
// Returns { wasFreshClean: boolean } — the caller uses this to gate the
// v1.7.x migration backfill in dispatchPass3.
async function applyResumeMode(parsedArgs, lang) {
  let wasFreshClean = false;

  if (!fs.existsSync(GENERATED_DIR)) return { wasFreshClean };

  const existingPass1 = fs.readdirSync(GENERATED_DIR).filter(f => f.startsWith("pass1-") && f.endsWith(".json"));
  const pass2Exists = fileExists(path.join(GENERATED_DIR, "pass2-merged.json"));
  if (existingPass1.length === 0 && !pass2Exists) return { wasFreshClean };

  if (parsedArgs.force) {
    // --force: clean all generated files for truly fresh start
    const genFiles = fs.readdirSync(GENERATED_DIR).filter(f => f.endsWith(".json") || f.endsWith(".md"));
    for (const f of genFiles) fs.unlinkSync(path.join(GENERATED_DIR, f));
    // Also clean any leftover .staged-rules/ from a prior crashed run
    // (only .json/.md are unlinked above; directories aren't touched).
    const stagedDir = path.join(GENERATED_DIR, ".staged-rules");
    if (fileExists(stagedDir)) fs.rmSync(stagedDir, { recursive: true, force: true });
    // Also wipe .claude/rules/ so Guard 2 (zero-rules detection) can't
    // false-negative on stale rules from a previous run when the fresh
    // Pass 3 run fails silently (e.g. Claude ignores staging-override).
    // Step [2] recreates the subdirs from scratch. Any manual edits the
    // user made to rule files are lost — acceptable under --force
    // ("truly fresh start").
    const rulesDir = path.join(PROJECT_ROOT, ".claude/rules");
    if (fileExists(rulesDir)) fs.rmSync(rulesDir, { recursive: true, force: true });
    wasFreshClean = true;
    log("  🔄 Previous results deleted (--force)\n");
    return { wasFreshClean };
  }

  // v2.2.0 upgrade detection: if project was generated with older claudeos-core
  // (pre-2.2.0), default "resume" mode will skip regeneration of existing files
  // per Rule B idempotency, meaning v2.2.0 structural improvements will NOT be
  // picked up. Detect this case by checking CLAUDE.md for v2.2.0 markers.
  const claudeMd = path.join(PROJECT_ROOT, "CLAUDE.md");
  if (fileExists(claudeMd)) {
    try {
      const content = fs.readFileSync(claudeMd, "utf-8");
      // v2.2.0 scaffold enforces EXACTLY 8 top-level `##` sections.
      // Pre-v2.2.0 CLAUDE.md files typically carry 9+ sections (extra
      // "Rules Summary" / "Common Rules" / "Required to Observe"
      // blocks that v2.2.0 forbids). Counting `^## ` headings is a
      // language-independent heuristic that works across all 10
      // supported output languages. False positive (an existing
      // 8-section pre-v2.2.0 CLAUDE.md) is acceptable — the user
      // simply won't see the upgrade warning and can still run
      // `--force` manually.
      const sectionCount = (content.match(/^## /gm) || []).length;
      const hasV220Section8 = sectionCount === 8;
      if (!hasV220Section8) {
        log("\n  ⚠️  v2.2.0 upgrade detected");
        log("  ─────────────────────────");
        log("  Your existing CLAUDE.md was generated with an older claudeos-core version.");
        log("  v2.2.0 introduces structural changes that the default 'resume' mode");
        log("  CANNOT apply because existing files are preserved under Rule B (idempotency).");
        log("");
        log("  To fully adopt v2.2.0, choose one of:");
        log("    1. Rerun with --force:   npx claudeos-core init --force");
        log("       (overwrites generated files; your memory/ content is preserved)");
        log("    2. Choose 'fresh' below  (equivalent to --force)");
        log("");
        log("  See CHANGELOG.md Migration section for full details.\n");
      }
    } catch (_) { /* Read error is non-fatal; proceed to resume prompt */ }
  }

  const status = { pass1Done: existingPass1.length, pass2Done: pass2Exists };
  const mode = await selectResumeMode(lang, status);
  if (!mode) throw new InitError("Cancelled.");
  if (mode === "fresh") {
    for (const f of existingPass1) fs.unlinkSync(path.join(GENERATED_DIR, f));
    if (pass2Exists) fs.unlinkSync(path.join(GENERATED_DIR, "pass2-merged.json"));
    // Also reset pass 3 & pass 4 markers so they re-run
    const pass3M = path.join(GENERATED_DIR, "pass3-complete.json");
    const pass4M = path.join(GENERATED_DIR, "pass4-memory.json");
    if (fileExists(pass3M)) fs.unlinkSync(pass3M);
    if (fileExists(pass4M)) fs.unlinkSync(pass4M);
    // Clean .staged-rules/ leftover from a prior crashed run (same reason as --force branch).
    const stagedDir = path.join(GENERATED_DIR, ".staged-rules");
    if (fileExists(stagedDir)) fs.rmSync(stagedDir, { recursive: true, force: true });
    // Wipe .claude/rules/ for the same Guard 2 false-negative reason as
    // the --force branch. Step [2] recreates the subdirs; any manual
    // edits are lost — acceptable under an explicit "fresh" choice.
    const rulesDir = path.join(PROJECT_ROOT, ".claude/rules");
    if (fileExists(rulesDir)) fs.rmSync(rulesDir, { recursive: true, force: true });
    wasFreshClean = true;
  } else if (mode === "continue" && existingPass1.length === 0 && pass2Exists) {
    // pass2 exists but no pass1 → pass2 is stale, force re-run
    fs.unlinkSync(path.join(GENERATED_DIR, "pass2-merged.json"));
    log("    ⚠️  pass2-merged.json deleted (no pass1 files to continue from)");
  }

  return { wasFreshClean };
}

// ─── Stage 4: Create directory structure ──────────────────────────
function ensureDirectories() {
  const dirs = [
    ".claude/rules/00.core",
    ".claude/rules/10.backend",
    ".claude/rules/20.frontend",
    ".claude/rules/30.security-db",
    ".claude/rules/40.infra",
    ".claude/rules/50.sync",
    "claudeos-core/generated",
    "claudeos-core/standard/00.core",
    "claudeos-core/standard/10.backend",
    "claudeos-core/standard/20.frontend",
    "claudeos-core/standard/30.security-db",
    "claudeos-core/standard/40.infra",
    "claudeos-core/standard/80.verification",
    "claudeos-core/standard/90.optional",
    "claudeos-core/skills/00.shared",
    "claudeos-core/skills/10.backend-crud/scaffold-crud-feature",
    // v2.4.0 — `domains/` sub-folder under each per-domain skill category.
    // Pre-created so Pass 3c-N has a stable destination for per-domain
    // skill notes (`{category}/domains/{domain}.md`) and so the convention
    // is visible in the post-init dirtree alongside `scaffold-*-feature/`.
    // The `02.domains.md` orchestrator (sibling at category root) is
    // generated by Pass 3c-core, not pre-created — the file content is
    // project-specific. Empty pre-created `domains/` folders are
    // harmless on filesystems that allow them and self-document the
    // convention.
    "claudeos-core/skills/10.backend-crud/domains",
    "claudeos-core/skills/20.frontend-page/scaffold-page-feature",
    "claudeos-core/skills/20.frontend-page/domains",
    "claudeos-core/skills/50.testing",
    "claudeos-core/skills/90.experimental",
    "claudeos-core/guide/01.onboarding",
    "claudeos-core/guide/02.usage",
    "claudeos-core/guide/03.troubleshooting",
    "claudeos-core/guide/04.architecture",
    "claudeos-core/database",
    "claudeos-core/mcp-guide",
    "claudeos-core/memory",
    ".claude/rules/60.memory",
    // v2.4.0 — 80.verification rules (mirror of standard/80.verification).
    // Pre-created to give Pass 3 LLM a stable destination for verification
    // rules (testing strategy, build verification reminders that auto-load
    // when editing test files / build configs). Without this, prior runs
    // would create them at the LEGACY 50.verification path (cross-namespace
    // contamination from standard/50.verification), now corrected to the
    // unified 80.* numbering.
    ".claude/rules/80.verification",
    // v2.4.0 — 70.domains/ canonical per-domain folder, ALWAYS typed.
    //   - PLURAL folder (collection of N per-domain files)
    //   - 70 number to avoid 60.* collision with 60.memory
    //   - ALWAYS uses `{type}/` sub-folder (`backend/` or `frontend/`)
    //     regardless of single/multi-stack. Uniform convention prevents
    //     migration when a single-stack project later adds the other
    //     stack, and gives validators a single pattern to recognize.
    //   - Pre-created so Pass 3 LLM has a stable destination for
    //     `claudeos-core/standard/70.domains/{type}/{domain}.md` and
    //     `.claude/rules/70.domains/{type}/{domain}-rules.md` writes.
    "claudeos-core/standard/70.domains/backend",
    "claudeos-core/standard/70.domains/frontend",
    ".claude/rules/70.domains/backend",
    ".claude/rules/70.domains/frontend",
  ];
  for (const d of dirs) {
    ensureDir(path.join(PROJECT_ROOT, d));
  }
}

// ─── Stage 5: Load & validate domain-groups.json ──────────────────
function loadDomainGroups() {
  let domainGroups;
  try {
    domainGroups = JSON.parse(
      readFile(path.join(GENERATED_DIR, "domain-groups.json"))
    );
  } catch (e) {
    throw new InitError(`domain-groups.json is missing or malformed: ${e.message}\n    Re-run plan-installer or check claudeos-core/generated/`);
  }
  const totalGroups = domainGroups.totalGroups;
  if (!totalGroups || typeof totalGroups !== "number" || totalGroups < 1) {
    throw new InitError(`domain-groups.json has invalid totalGroups: ${totalGroups}\n    Re-run plan-installer or check claudeos-core/generated/`);
  }
  if (!domainGroups.groups || totalGroups !== domainGroups.groups.length) {
    throw new InitError(`domain-groups.json is malformed: expected ${totalGroups} groups, found ${domainGroups.groups ? domainGroups.groups.length : 0}`);
  }
  return { domainGroups, totalGroups };
}

// Loads the per-type pass1 prompt templates. Falls back to the single-stack
// pass1-prompt.md for backward compatibility with older plan-installer output.
function loadPass1Prompts() {
  const pass1Prompts = {};
  for (const type of ["backend", "frontend"]) {
    const promptFile = path.join(GENERATED_DIR, `pass1-${type}-prompt.md`);
    if (fileExists(promptFile)) {
      pass1Prompts[type] = readFile(promptFile);
    }
  }
  if (Object.keys(pass1Prompts).length === 0) {
    const fallback = path.join(GENERATED_DIR, "pass1-prompt.md");
    if (fileExists(fallback)) pass1Prompts["backend"] = readFile(fallback);
  }
  return pass1Prompts;
}

// Creates the progressBar closure. Extracted from cmdInit so the bar
// formatting is testable in isolation if needed.
function makeProgressBar(totalSteps, passStart, stepTimes) {
  return function progressBar(step, label) {
    const pct = Math.round((step / totalSteps) * 100);
    const elapsed = Date.now() - passStart;
    let eta = "";
    if (stepTimes.length > 0) {
      const avgMs = stepTimes.reduce((a, b) => a + b, 0) / stepTimes.length;
      const remaining = (totalSteps - step) * avgMs;
      eta = ` | ETA ${formatElapsed(remaining)}`;
    }
    const filled = Math.round(pct / 5);
    const bar = "█".repeat(filled) + "░".repeat(20 - filled);
    log(`    [${bar}] ${pct}% (${step}/${totalSteps}) ${formatElapsed(elapsed)}${eta} — ${label}`);
  };
}

// ─── Stage 6: Pass 1 — Deep analysis per domain group ─────────────
// Returns the number of steps to add to the outer completedSteps counter.
async function runPass1Loop(opts) {
  const { domainGroups, totalGroups, pass1Prompts, progressBar, stepTimes, startingStep } = opts;
  let step = startingStep;

  for (let i = 1; i <= totalGroups; i++) {
    const group = domainGroups.groups[i - 1];
    const domainList = (group.domains || []).join(", ") || "(unknown)";
    const estFiles = group.estimatedFiles || 0;
    const groupType = group.type || "backend";
    const icon = groupType === "frontend" ? "🎨" : "⚙️";

    log("");
    log(
      `    ${icon} [Pass 1-${i}/${totalGroups}] ${groupType}: ${domainList} (~${estFiles} files)`
    );

    const pass1Json = path.join(GENERATED_DIR, `pass1-${i}.json`);
    if (fileExists(pass1Json)) {
      try {
        const existing = JSON.parse(readFile(pass1Json));
        if (existing && existing.analysisPerDomain) {
          log(`    ⏭️  pass1-${i}.json already exists, skipping`);
          step++;
          continue;
        }
      } catch (_e) { /* malformed — re-run */ }
      log(`    ⚠️  pass1-${i}.json exists but is malformed, re-running`);
    }

    // Select prompt for this type
    const template = pass1Prompts[groupType] || pass1Prompts["backend"];
    if (!template) {
      throw new InitError(`No pass1 prompt found for type: ${groupType}`);
    }

    // Placeholder substitution — use replacement functions (not string form)
    // so that `$`, `$1`, `$&`, `$$` etc. in domainList are preserved as
    // literal characters rather than interpreted as regex back-references.
    // (Same bug class as bug #18 in lib/plan-parser.js replaceFileBlock.)
    let prompt = template
      .replace(/\{\{DOMAIN_GROUP\}\}/g, () => domainList)
      .replace(/\{\{PASS_NUM\}\}/g, () => String(i));
    prompt = injectProjectRoot(prompt);

    const t1 = Date.now();
    const ticker1 = makePassTicker(`Pass 1-${i}/${totalGroups}`, t1);
    const ok = await runClaudePromptAsync(prompt, {
      onTick: ticker1.onTick,
      tickMs: ticker1.tickMs,
    });
    ticker1.clearLine();
    const elapsed1 = Date.now() - t1;
    stepTimes.push(elapsed1);

    if (!ok) {
      throw new InitError(`Pass 1-${i} failed. Check the claude error output above.\n    If this persists, try: npx claudeos-core init --force`);
    }

    if (!fileExists(pass1Json)) {
      throw new InitError(`pass1-${i}.json was not created. Claude may have run but not produced expected output.\n    Ensure the prompt instructs Claude to write to claudeos-core/generated/pass1-${i}.json`);
    }

    step++;
    progressBar(step, `pass1-${i}.json created (${formatElapsed(elapsed1)})`);
  }
  log("");
  return step - startingStep;
}

// ─── Stage 7: Pass 2 — Merge analysis results ─────────────────────
// Returns the number of steps to add to the outer completedSteps counter (0 or 1).
async function runPass2(opts) {
  const { progressBar, stepTimes, nextStep } = opts;

  const pass2Json = path.join(GENERATED_DIR, "pass2-merged.json");

  // H3: resume-path structural validation. existsSync alone isn't enough —
  // a prior crashed run may have left a skeleton (`{}`) or malformed JSON
  // that passes existsSync but silently poisons Pass 3 (which parses this
  // file as its analysis input). Mirrors pass1's malformed-detection at
  // the pass1 loop above, and the "<5 top-level keys = INSUFFICIENT_KEYS"
  // threshold from pass-json-validator/index.js (ERROR level).
  let pass2IsValid = false;
  if (fileExists(pass2Json)) {
    try {
      const existing = JSON.parse(readFile(pass2Json));
      if (existing && typeof existing === "object" && !Array.isArray(existing)
          && Object.keys(existing).length >= 5) {
        pass2IsValid = true;
      }
    } catch (_e) { /* malformed — fall through to re-run */ }
    if (!pass2IsValid) {
      log("    ⚠️  pass2-merged.json exists but is malformed or incomplete (<5 top-level keys), re-running");
      try { fs.unlinkSync(pass2Json); } catch (_e) { /* best-effort cleanup */ }
    }
  }

  if (pass2IsValid) {
    log("    ⏭️  pass2-merged.json already exists, skipping");
    return 1;
  }

  const pass2PromptFile = path.join(GENERATED_DIR, "pass2-prompt.md");
  if (!fileExists(pass2PromptFile)) {
    throw new InitError("pass2-prompt.md not found. Re-run plan-installer.");
  }
  let prompt = injectProjectRoot(readFile(pass2PromptFile));

  const t2 = Date.now();
  const ticker2 = makePassTicker("Pass 2", t2);
  const ok = await runClaudePromptAsync(prompt, {
    onTick: ticker2.onTick,
    tickMs: ticker2.tickMs,
  });
  ticker2.clearLine();
  const elapsed2 = Date.now() - t2;
  stepTimes.push(elapsed2);

  if (!ok) {
    throw new InitError("Pass 2 failed. Check the claude error output above.\n    If this persists, try: npx claudeos-core init --force");
  }

  if (!fileExists(pass2Json)) {
    throw new InitError("pass2-merged.json was not created. Claude may have run but not produced expected output.");
  }

  progressBar(nextStep, `pass2-merged.json created (${formatElapsed(elapsed2)})`);
  return 1;
}

// ─── Stage 8: Build pass3-context.json (v2.1) ─────────────────────
// Writes a small (<5 KB) structured summary derived from project-analysis.json
// plus pass2-merged.json signals (size, top-level keys). Pass 3 prompts
// reference this INSTEAD OF re-reading pass2-merged.json repeatedly, which
// was the primary cause of `Prompt is too long` failures on large projects.
//
// Silent-on-failure: if pass3-context-builder returns null (e.g.
// project-analysis.json missing), we skip writing and let Pass 3 fall back
// to the pre-v2.1 behavior of reading pass2-merged.json directly.
function buildPass3ContextJson() {
  try {
    const { buildPass3Context } = require("../../plan-installer/pass3-context-builder");
    const pass3Ctx = buildPass3Context(GENERATED_DIR);
    if (pass3Ctx) {
      const { writeFileSafe: wfsCtx } = require("../../lib/safe-fs");
      const ctxPath = path.join(GENERATED_DIR, "pass3-context.json");
      const wrote = wfsCtx(ctxPath, JSON.stringify(pass3Ctx, null, 2));
      if (wrote) {
        const sizeKB = Math.round(JSON.stringify(pass3Ctx).length / 1024);
        const p2KB = pass3Ctx.pass2Merged.sizeKB;
        log(`    📄 pass3-context.json built (${sizeKB} KB summary of ${p2KB} KB pass2-merged.json)`);
        if (pass3Ctx.pass2Merged.large) {
          log(`    ⚠️  pass2-merged.json is large (${p2KB} KB). Pass 3 will rely heavily on pass3-context.json to avoid context overflow.`);
        }
      }
    }
  } catch (e) {
    log(`    ⚠️  pass3-context.json build skipped: ${e.message} (Pass 3 will fall back to pass2-merged.json)`);
  }
}

// ─── Stage 9a: Pass 3 marker pre-processing ───────────────────────
// Handles v1.7.x migration backfill + stale-marker detection (guide/outputs).
// The stale region below MUST include dropStalePass3Marker, EXPECTED_GUIDE_FILES,
// and findMissingOutputs — tested for by tests/pass3-marker.test.js source
// parity. The `completedSteps++` sentinel used by that region's regex lives
// in cmdInit directly, after dispatchPass3 returns.
function handlePass3StaleMarker(wasFreshClean) {
  const pass3Marker = path.join(GENERATED_DIR, "pass3-complete.json");
  const claudeMdPath = path.join(PROJECT_ROOT, "CLAUDE.md");

  // v1.7.1 → v1.7.2 migration: if CLAUDE.md exists from prior version but marker
  // is missing, backfill marker to preserve user's existing output.
  //
  // Gated by !wasFreshClean: --force and "fresh" resume mode wipe the marker
  // on purpose to force Pass 3 to re-run. They do NOT delete CLAUDE.md (user
  // may have manual edits worth preserving in the continue flow), so without
  // this gate the backfill would fire on a fresh run, re-write the marker,
  // and Pass 3 would skip — leaving stale CLAUDE.md + regenerated pass1/2 +
  // wiped rules/, which fails sync-checker and content-validator.
  if (!wasFreshClean && fileExists(claudeMdPath) && !fileExists(pass3Marker) && fileExists(path.join(GENERATED_DIR, "pass2-merged.json"))) {
    const { writeFileSafe: wfsMig } = require("../../lib/safe-fs");
    const backfillOk = wfsMig(pass3Marker, JSON.stringify({
      completedAt: new Date().toISOString(),
      backfilled: true,
      reason: "CLAUDE.md exists from prior version; marker backfilled to prevent regeneration. To force re-run, use --force or pick 'fresh' in the resume prompt.",
    }, null, 2));
    if (backfillOk) {
      log("    ℹ️  Detected existing CLAUDE.md — Pass 3 marker backfilled (use --force to regenerate)");
    } else {
      log("    ⚠️  CLAUDE.md exists but marker backfill failed — Pass 3 will re-run");
    }
  }

  // Stale marker detection (Pass 3). Drops the marker and re-runs Pass 3 if
  // any of the following is true:
  //   (a) CLAUDE.md was deleted externally (original check),
  //   (b) any of EXPECTED_GUIDE_FILES is missing or BOM-aware empty,
  //   (c) any entry in expected-outputs (standard sentinel / skills / plan) is
  //       missing or empty.
  //
  // (b) and (c) were previously only enforced as Pass 3 post-generation Guards
  // 3 (H2/H1), which gate marker *creation* on fresh runs. Projects that were
  // initialized on a pre-v2.0.0 release (before those guards existed) can end
  // up with a marker on disk even though guide/ or standard/skills/plan are
  // empty. Without this stale check, such projects hit a permanent
  // content-validator fail loop because init sees the marker and skips Pass 3
  // forever. This mirrors the Pass 4 dropStalePass4Marker pattern below.
  //
  // Unlink is surfaced as InitError on failure (symmetric with Pass 4).
  // Silently ignoring the error would leave the stale marker in place, and
  // the `if (fileExists(pass3Marker))` check below would accept it — skipping
  // Pass 3 while outputs are still incomplete. That silent-skip is the exact
  // bug class this audit round closes.
  function dropStalePass3Marker(reasonLog) {
    log(reasonLog);
    try { fs.unlinkSync(pass3Marker); } catch (e) {
      log(`    ❌ Failed to delete stale pass3-complete.json: ${e.code || e.message}`);
      throw new InitError(
        `Could not delete stale pass3-complete.json at:\n    ${pass3Marker}\n` +
        `    The file is likely locked by another process (Windows antivirus or a file-watcher).\n` +
        `    Close any editor/AV scanner holding the file and re-run \`npx claudeos-core init\`.`
      );
    }
  }
  if (fileExists(pass3Marker)) {
    // v2.1.1: protect split-mode partial markers.
    // An in-progress marker of the form { mode: "split", groupsCompleted: [...], completedAt: undefined }
    // must NOT be treated as stale. When the pipeline has normally completed
    // only through 3b, guide/skills/plan are empty, so the legacy check
    // falsely flagged the marker as stale. Deleting it made runPass3Split
    // lose track of completed stages and re-run from 3a (correct but wastes ~2x tokens).
    let markerIsSplitPartial = false;
    try {
      const parsed = JSON.parse(readFile(pass3Marker));
      markerIsSplitPartial =
        parsed &&
        parsed.mode === "split" &&
        Array.isArray(parsed.groupsCompleted) &&
        !parsed.completedAt;
    } catch (_e) {
      // malformed marker → fall through to the stale check (legacy behavior)
    }

    if (markerIsSplitPartial) {
      log(`    ↪️  split-mode partial marker detected — runPass3Split will resume`);
    } else if (!fileExists(claudeMdPath)) {
      dropStalePass3Marker("    ⚠️  pass3-complete.json exists but CLAUDE.md is missing — treating marker as stale, re-running Pass 3");
    } else {
      const guideDirForStale = path.join(PROJECT_ROOT, "claudeos-core/guide");
      const staleMissingGuides = EXPECTED_GUIDE_FILES.filter(g => {
        const fp = path.join(guideDirForStale, g);
        if (!fileExists(fp)) return true;
        try {
          return fs.readFileSync(fp, "utf-8").replace(/^\uFEFF/, "").trim().length === 0;
        } catch (_e) { return true; }
      });
      if (staleMissingGuides.length > 0) {
        dropStalePass3Marker(
          `    ⚠️  pass3-complete.json exists but ${staleMissingGuides.length}/${EXPECTED_GUIDE_FILES.length} guide files are missing or empty — treating marker as stale, re-running Pass 3`
        );
      } else {
        const staleMissingOutputs = findMissingOutputs(PROJECT_ROOT);
        if (staleMissingOutputs.length > 0) {
          dropStalePass3Marker(
            `    ⚠️  pass3-complete.json exists but ${staleMissingOutputs.length} required output(s) are missing or empty — treating marker as stale, re-running Pass 3`
          );
        }
      }
    }
  }
}

// ─── Stage 9b: Pass 3 dispatch (decide + run) ─────────────────────
// Returns { ran: boolean } so the caller can increment completedSteps
// with the literal "completedSteps++" token that the stale-region
// source-parity test regex requires.
async function dispatchPass3(opts) {
  const { wasFreshClean, lang, stepTimes, progressBar, nextStep } = opts;

  const pass3Marker = path.join(GENERATED_DIR, "pass3-complete.json");
  const claudeMdPath = path.join(PROJECT_ROOT, "CLAUDE.md");

  // Pass 3 split mode resolution.
  //
  // Pass 3 runs as 4 sequential `claude -p` calls (3a facts, 3b core, 3c
  // skills+guide, 3d-aux database/mcp-guide), each with fresh context.
  // This eliminates `Prompt is too long` failures by making output
  // accumulation overflow structurally impossible — each stage starts
  // with a clean context window. For projects with 16+ domains, 3b and 3c
  // are further split into core + batched sub-stages.
  //
  // Single-call mode (previously toggled by CLAUDEOS_PASS3_SPLIT=0) was
  // removed because empirical data showed it failed reliably on projects
  // with more than ~5 domains (output accumulation overflow was not
  // predictable from input size alone), and split mode is structurally
  // immune to this failure mode with bounded token overhead.
  log(`    🚀 Pass 3 split mode (3a → 3b → 3c → 3d-aux)`);
  try {
    const ctxPath = path.join(GENERATED_DIR, "pass3-context.json");
    if (fileExists(ctxPath)) {
      const pctx = JSON.parse(readFile(ctxPath));
      const rec = pctx && pctx.splitRecommendation;
      if (rec) {
        log(`       • estimated ${rec.estimatedFileCount} files from ${rec.totalDomains} domains`);
      }
    }
  } catch (_e) { /* best-effort log only */ }

  // Decide whether Pass 3 needs to run (from scratch, resumed, or skipped).
  //
  // Three states of pass3-complete.json:
  //   (a) absent — fresh run; call runPass3Split.
  //   (b) present + mode:"split" + no completedAt — partial marker from a
  //       prior run that was interrupted mid-pipeline (most commonly a
  //       Pass 3d-aux stream timeout). runPass3Split inspects
  //       groupsCompleted and resumes from the next unstarted stage.
  //       MUST call runPass3Split here.
  //   (c) present + completedAt set — finished; skip.
  //
  // Pre-v2.3.0 bug: the code branched only on fileExists(pass3Marker),
  // so case (b) fell into the skip branch and the remaining stages
  // (usually 3d-aux → database/ + mcp-guide/) were silently dropped on
  // re-run. The detection block earlier in this function correctly
  // identified the partial marker and logged "runPass3Split will
  // resume", but resumption never actually happened.
  let pass3NeedsRun = !fileExists(pass3Marker);
  let pass3IsResume = false;
  if (!pass3NeedsRun) {
    try {
      const parsed = JSON.parse(readFile(pass3Marker));
      if (parsed && parsed.mode === "split" && !parsed.completedAt) {
        pass3NeedsRun = true;
        pass3IsResume = true;
      }
    } catch (_e) {
      // Malformed marker — the earlier stale check already handles this
      // path (dropStalePass3Marker). If we still reach here with a bad
      // marker, fall through to skip; runPass3Split's own resume logic
      // would throw on malformed input.
    }
  }

  if (pass3NeedsRun) {
    if (pass3IsResume) {
      log("    ↪️  Resuming Pass 3 split from partial marker");
    }
    await runPass3Split({
      GENERATED_DIR, PROJECT_ROOT, TOOLS_DIR,
      pass3Marker, claudeMdPath,
      injectProjectRoot, readFile, fileExists,
      runClaudePromptAsync, makePassTicker, formatElapsed,
      log, countFiles,
      EXPECTED_GUIDE_FILES, findMissingOutputs,
      lang, stepTimes,
    });
    progressBar(nextStep, `Pass 3 complete (split mode)`);
    log("");
    return { ran: true };
  }

  log("    ⏭️  pass3-complete.json already complete, skipping");
  return { ran: false };
}

// ─── Stage 10: Pass 4 — L4 memory scaffolding ─────────────────────
// Returns 1 unconditionally (Pass 4 always counts as a completed step,
// whether skip / static fallback / Claude-driven).
async function runPass4(opts) {
  const { lang, stepTimes, progressBar, nextStep } = opts;

  const pass4Marker = path.join(GENERATED_DIR, "pass4-memory.json");
  const pass4PromptFile = path.join(GENERATED_DIR, "pass4-prompt.md");

  const { scaffoldMemory, scaffoldRules, scaffoldMasterPlans, scaffoldDocWritingGuide, scaffoldSkillsManifest } = require("../../lib/memory-scaffold");
  const { writeFileSafe } = require("../../lib/safe-fs");

  const memoryPath = path.join(PROJECT_ROOT, "claudeos-core/memory");
  const planPath = path.join(PROJECT_ROOT, "claudeos-core/plan");
  const rulesPath = path.join(PROJECT_ROOT, ".claude/rules");
  const standardCorePath = path.join(PROJECT_ROOT, "claudeos-core/standard/00.core");
  const skillsSharedPath = path.join(PROJECT_ROOT, "claudeos-core/skills/00.shared");

  function applyStaticFallback() {
    try {
      scaffoldMemory(memoryPath, { lang });
      scaffoldRules(rulesPath, { lang });
      scaffoldDocWritingGuide(standardCorePath, { lang });
      scaffoldMasterPlans(planPath, memoryPath, { lang });
      scaffoldSkillsManifest(skillsSharedPath, { lang });
      // v2.3.0: do NOT append an L4 memory section to CLAUDE.md. Pass 3
      // already authored Section 8 "Common Rules & Memory (L4)" covering
      // all of the content the append function would have added. An
      // additional `## N. ... (L4)` section would duplicate the memory
      // file table (one row per file in §8, another row per file in the
      // appended §9), triggering [S1]/[M-*]/[F2-*] validator errors.
      // See CHANGELOG v2.3.0 — "Pass 4 CLAUDE.md append retired."
    } catch (err) {
      // When lang !== "en", translation is REQUIRED. If it fails, we surface
      // a clear error rather than silently writing English (which would
      // contradict the user's --lang choice).
      throw new InitError(
        `Static fallback failed while translating to lang='${lang}':\n` +
        `    ${err.message}\n` +
        `    Ensure the \`claude\` CLI is available and authenticated, then re-run.\n` +
        `    Alternatively re-run with --lang en to skip translation.`
      );
    }
    const markerBody = JSON.stringify({
      analyzedAt: new Date().toISOString(),
      passNum: 4,
      fallback: true,
      lang,
      memoryFiles: [
        "claudeos-core/memory/decision-log.md",
        "claudeos-core/memory/failure-patterns.md",
        "claudeos-core/memory/compaction.md",
        "claudeos-core/memory/auto-rule-update.md",
      ],
      ruleFiles: [
        ".claude/rules/00.core/51.doc-writing-rules.md",
        ".claude/rules/00.core/52.ai-work-rules.md",
        ".claude/rules/60.memory/01.decision-log.md",
        ".claude/rules/60.memory/02.failure-patterns.md",
        ".claude/rules/60.memory/03.compaction.md",
        ".claude/rules/60.memory/04.auto-rule-update.md",
      ],
      // Note: master plan files are no longer generated (previously this
      // included "claudeos-core/plan/50.memory-master.md"). The marker schema
      // still accepts an optional planFiles field for backward compatibility.
      claudeMdAppended: true,
    }, null, 2);
    return writeFileSafe(pass4Marker, markerBody);
  }

  // M1: validate Pass 4 marker CONTENT, not just existence. Claude can emit
  // a malformed marker on partial failure (e.g. `{"error":"timeout"}`) that
  // still satisfies fileExists() and would cause the skip path to accept it
  // forever. Pass 4 prompt (pass-prompts/templates/common/pass4.md:255-283)
  // specifies the required structure; we check the minimum subset that
  // distinguishes a real marker from junk: object shape + passNum === 4 +
  // non-empty memoryFiles array.
  function isValidPass4Marker(markerPath) {
    if (!fileExists(markerPath)) return false;
    try {
      const data = JSON.parse(readFile(markerPath));
      if (!data || typeof data !== "object" || Array.isArray(data)) return false;
      if (data.passNum !== 4) return false;
      if (!Array.isArray(data.memoryFiles) || data.memoryFiles.length === 0) return false;
      return true;
    } catch (_e) { return false; }
  }

  // Stale / invalid marker detection. Delete and re-run if either:
  //   (a) memory/ was deleted externally (original stale-detection), OR
  //   (b) the marker file itself is malformed (M1).
  //
  // Unlink can fail on Windows if an AV or file-watcher has the handle open.
  // We surface that failure to the user — without it, the subsequent
  // `if (fileExists(pass4Marker))` check below would accept the stale marker
  // and skip Pass 4 silently, leaving the project with half-scaffolded memory
  // state (exactly the silent-failure class this audit is eliminating).
  const memoryAny = fileExists(path.join(PROJECT_ROOT, "claudeos-core/memory/decision-log.md"))
    || fileExists(path.join(PROJECT_ROOT, "claudeos-core/memory/compaction.md"));
  function dropStalePass4Marker(reasonLog) {
    log(reasonLog);
    try { fs.unlinkSync(pass4Marker); } catch (e) {
      log(`    ❌ Failed to delete stale pass4-memory.json: ${e.code || e.message}`);
      throw new InitError(
        `Could not delete stale pass4-memory.json at:\n    ${pass4Marker}\n` +
        `    The file is likely locked by another process (Windows antivirus or a file-watcher).\n` +
        `    Close any editor/AV scanner holding the file and re-run \`npx claudeos-core init\`.`
      );
    }
  }
  if (fileExists(pass4Marker)) {
    if (!memoryAny) {
      dropStalePass4Marker("    ⚠️  pass4-memory.json exists but memory/ is empty — re-running Pass 4");
    } else if (!isValidPass4Marker(pass4Marker)) {
      dropStalePass4Marker("    ⚠️  pass4-memory.json exists but is malformed (missing passNum/memoryFiles) — re-running Pass 4");
    }
  }

  const pass4Start = Date.now();
  let pass4Label = "Pass 4 complete";

  if (fileExists(pass4Marker)) {
    log("    ⏭️  pass4-memory.json already exists, skipping");
    pass4Label = "Pass 4 already present";
  } else if (!fileExists(pass4PromptFile)) {
    log("    ⚠️  pass4-prompt.md not found — falling back to static scaffold");
    if (applyStaticFallback()) { log("    ✅ Memory/Rules/Plans scaffolded + CLAUDE.md appended (static fallback)"); pass4Label = "Pass 4 (static fallback)"; }
    else { log("    ❌ Static fallback failed to write marker"); pass4Label = "Pass 4 fallback failed"; }
  } else {
    let prompt4 = injectProjectRoot(readFile(pass4PromptFile));

    // Same stale-staging guard as Pass 3 (in case a previous Pass 4 crashed
    // after writing to the staging dir but before the move could run).
    const stagedBeforeP4 = path.join(GENERATED_DIR, ".staged-rules");
    if (fileExists(stagedBeforeP4)) fs.rmSync(stagedBeforeP4, { recursive: true, force: true });

    const t4 = Date.now();
    // Pass 4's prompt lists 12 required outputs (pass4.md §§1-12). Of these:
    //   - 11 are file creations (#1-10 + #12)
    //   - 1 is an append to existing CLAUDE.md (#11, not a new file)
    // Of the 11 file creations, only 5 are visible to countFiles() during
    // the run:
    //   - #1-4 (4 memory files)                                 → observable
    //   - #5-10 (6 rule files) go to .staged-rules/ under
    //     claudeos-core/generated/, which countFiles() skips    → invisible
    //   - #12 (1 standard doc-writing-guide)                    → observable
    // So totalExpected = 5. (v2.0.x had 6 because plan/50.memory-master.md
    // was also generated; master plan generation was removed in v2.1.0.)
    // The final "100%" shows up on the outer progressBar once the staged
    // move + marker are done.
    const ticker4 = makePassTicker("Pass 4", t4, {
      baselineCount: countFiles(),
      totalExpected: 5,
    });
    const ok4 = await runClaudePromptAsync(prompt4, {
      onTick: ticker4.onTick,
      tickMs: ticker4.tickMs,
    });
    ticker4.clearLine();
    const elapsed4 = Date.now() - t4;

    // Move any rule files Pass 4 wrote to the staging dir. This runs regardless
    // of pass4Marker status, because Claude may have written rules before
    // failing to produce the marker. Static fallback (below) writes directly
    // to .claude/rules/ and is unaffected by the move (no-op on empty staging).
    const { moveStagedRules: mvP4 } = require("../../lib/staged-rules");
    const p4Move = mvP4(PROJECT_ROOT);
    if (p4Move.failed > 0) {
      log(`    ⚠️  Pass 4 staged-rules: ${p4Move.moved} moved, ${p4Move.failed} failed`);
      for (const err of p4Move.errors) log(`       • ${err}`);
    } else if (p4Move.moved > 0) {
      log(`    📦 Pass 4 staged-rules: ${p4Move.moved} rule files moved to .claude/rules/`);
    }

    if (!ok4 || !isValidPass4Marker(pass4Marker)) {
      log("    ⚠️  Pass 4 did not produce a valid pass4-memory.json — using static fallback");
      if (applyStaticFallback()) { log("    ✅ Memory/Rules/Plans scaffolded + CLAUDE.md appended (static fallback)"); pass4Label = `Pass 4 (static fallback, ${formatElapsed(elapsed4)})`; }
      else { log("    ❌ Static fallback failed to write marker"); pass4Label = "Pass 4 fallback failed"; }
    } else {
      // Claude-driven Pass 4 succeeded. Ensure memory + rules + plans + standard + CLAUDE.md append exist
      // (Claude may have created them; fill any gaps with static fallback).
      // scaffoldMemory is skip-safe: it only writes files that don't already exist,
      // so it won't overwrite Claude's translated content — it only fills gaps.
      // When lang !== "en", the gap-fill MUST translate: we do not silently
      // write English into a non-English project (bug #21).
      let gapResults;
      try {
        const memR   = scaffoldMemory(memoryPath, { lang });
        const ruleR  = scaffoldRules(rulesPath, { lang });
        const docR   = scaffoldDocWritingGuide(standardCorePath, { lang });
        const planR  = scaffoldMasterPlans(planPath, memoryPath, { lang });
        const manifestR = scaffoldSkillsManifest(skillsSharedPath, { lang });
        // v2.3.0: CLAUDE.md is never modified by Pass 4 anymore. See the
        // matching comment in applyStaticFallback above.
        // Collect all statuses into one flat array for summary reporting.
        gapResults = [
          ...memR,
          ...ruleR,
          ...planR,
          { file: docR.file, status: docR.status },
          { file: "skills/00.shared/" + manifestR.file, status: manifestR.status },
        ];
      } catch (err) {
        throw new InitError(
          `Pass 4 gap-fill failed while translating to lang='${lang}':\n` +
          `    ${err.message}\n` +
          `    Pass 4 Claude succeeded but some files were missing and translation of the ` +
          `static fallback to ${lang} failed.\n` +
          `    Re-run when \`claude\` CLI is available, or use --lang en.`
        );
      }
      // Summary: how many were already present (skipped) vs written by gap-fill.
      // This surfaces the true state regardless of what Claude printed during Pass 4.
      const skipped = gapResults.filter(r => r.status === "skipped" || r.status === "present-or-appended").length;
      const written = gapResults.filter(r => r.status === "written").length;
      const erroredItems = gapResults.filter(r => r.status === "error");
      const errored = erroredItems.length;
      log(`    ✅ Pass 4 complete (${formatElapsed(elapsed4)})`);
      if (written > 0 || errored > 0) {
        log(`       📋 Gap-fill: ${skipped} already present, ${written} created via fallback, ${errored} errored`);
      } else {
        log(`       📋 Gap-fill: all ${skipped} expected files already present`);
      }
      // Surface which files errored so the user can investigate (instead of
      // silently rolling them into a count). Common causes: write permission
      // or disk full. All erroredItems are non-fatal — Pass 4 marker still
      // gets written, but the user should know what was incomplete.
      for (const item of erroredItems) {
        log(`       ❌ ${item.file} — write failed (check disk space, permissions)`);
      }
      pass4Label = `Pass 4 complete (${formatElapsed(elapsed4)})`;
    }
  }
  // Record Pass 4 in the overall progress bar, regardless of which branch
  // (skip / static fallback / Claude-driven) ran above. Only feed stepTimes
  // when we actually did real work, so ETA for future steps stays meaningful.
  const pass4Elapsed = Date.now() - pass4Start;
  if (pass4Elapsed > 500) stepTimes.push(pass4Elapsed);
  progressBar(nextStep, pass4Label);
  return 1;
}

// ─── Stage 11: Run external verification tools ────────────────────
function runVerificationTools() {
  const verifyTools = [
    { name: "manifest-generator", script: path.join(TOOLS_DIR, "manifest-generator/index.js") },
    { name: "health-checker",     script: path.join(TOOLS_DIR, "health-checker/index.js") },
  ];

  for (const t of verifyTools) {
    if (!fileExists(t.script)) {
      log(`    ⏭️  ${t.name} — not found, skipping`);
      continue;
    }
    const ok = run(`node "${t.script}"`, { ignoreError: true });
    if (!ok) {
      log(`    ⚠️  ${t.name} reported issues (non-fatal)`);
    }
  }
}

// ─── Stage 12: Structural lint (v2.3.0+) ──────────────────────────
// Run the language-invariant CLAUDE.md validator after all passes complete.
// Failures do NOT abort the run — informational only.
function runLint() {
  try {
    const { validate } = require("../../claude-md-validator");
    const { formatSummaryLine } = require("../../claude-md-validator/reporter");
    const claudeMdPath = path.join(PROJECT_ROOT, "CLAUDE.md");
    if (fileExists(claudeMdPath)) {
      log("  [Lint] Validating CLAUDE.md structure...");
      const report = validate(claudeMdPath);
      log(`    ${formatSummaryLine(report)}`);
      if (!report.valid) {
        for (const err of report.errors) {
          log(`    ❌ [${err.id}] ${err.message}`);
        }
        log("");
        log("    Run `npx claudeos-core lint` for full remediation guidance,");
        log("    or `npx claudeos-core init --force` to regenerate.");
      }
      log("");
    }
  } catch (e) {
    // Lint is best-effort; don't block init completion on a lint bug.
    log(`    ⚠️  Lint step skipped: ${e.message || e}`);
    log("");
  }
}

// ─── Stage 13: Content integrity (Guard 4 — v2.3.0+) ──────────────
// Runs content-validator's path-claim + MANIFEST drift checks as a
// non-blocking final step after all passes. These are *advisories*, not
// generation failures — the documents are usable as-is, the advisories
// just flag spots where an LLM may have guessed at a filename or a
// skill registration may have drifted. We deliberately do NOT throw or
// unset pass3-complete.json here:
//   - Re-running Pass 3 is not guaranteed to fix LLM hallucinations
//     (the same fact JSON may trigger the same mis-inference again),
//     so a throw could deadlock the user in an `init --force` loop.
//   - content-validator's non-zero exit is preserved so that
//     `npx claudeos-core health` (and any CI wired to it) still treats
//     advisories as a real gate. `init` just presents them with softer
//     UX because by the time `init` finishes, the user's docs are
//     already on disk and fully usable.
function runContentValidator() {
  try {
    const cvPath = path.join(__dirname, "..", "..", "content-validator", "index.js");
    if (fileExists(cvPath)) {
      log("  [Content] Checking path-claims and MANIFEST consistency...");
      // Run in a child process so its process.exit(1) on advisories does
      // not terminate init. The exit code is informational for us — we
      // still surface the content as advisories regardless.
      const { spawnSync } = require("child_process");
      const result = spawnSync(process.execPath, [cvPath], {
        cwd: PROJECT_ROOT,
        env: { ...process.env, CLAUDEOS_ROOT: PROJECT_ROOT },
        encoding: "utf-8",
      });
      // Echo only the final summary line(s) — full output goes to
      // stale-report.json for later inspection.
      const out = (result.stdout || "").trim().split(/\r?\n/);
      const summary = out.slice(-3).join("\n"); // last 3 lines = summary
      log(summary.split("\n").map((l) => "    " + l).join("\n"));
      if (result.status !== 0) {
        log("");
        log("    ℹ️  Content advisories detected — these are quality notes,");
        log("       NOT generation failures. Your generated docs are ready");
        log("       to use as-is. Review when convenient:");
        log("         - stale-report.json (full advisory list)");
        log("         - npx claudeos-core health (standalone gate with exit code)");
      }
      log("");
    }
  } catch (e) {
    log(`    ⚠️  Content check skipped: ${e.message || e}`);
    log("");
  }
}

// ─── Stage 14: Print completion banner ────────────────────────────
function printCompletionBanner(opts) {
  const { lang, totalGroups, totalStart } = opts;
  const totalFiles = countFiles();
  const pass1Files = countPass1Files();
  const memoryReady = fileExists(path.join(PROJECT_ROOT, "claudeos-core/memory/decision-log.md"));
  const rulesReady = fileExists(path.join(PROJECT_ROOT, ".claude/rules/60.memory/01.decision-log.md"));
  const l4Status = (memoryReady && rulesReady) ? "memory + rules" : "partial";
  log("");
  log("╔════════════════════════════════════════════════════╗");
  log("║  ✅ ClaudeOS-Core — Complete                       ║");
  log("║                                                    ║");
  log(`║   Files created:     ${pad(String(totalFiles), 29)}║`);
  log(`║   Domains analyzed:  ${pad(totalGroups + " groups", 29)}║`);
  log(`║   Analysis passes:   ${pad(pass1Files + " pass1 files", 29)}║`);
  log(`║   L4 scaffolded:     ${pad(l4Status, 29)}║`);
  log(`║   Output language:   ${pad(SUPPORTED_LANGS[lang] || lang, 29)}║`);
  log(`║   Total time:        ${pad(formatElapsed(Date.now() - totalStart), 29)}║`);
  log("║                                                    ║");
  log("║   Verify anytime:                                  ║");
  log("║   npx claudeos-core health                         ║");
  log("║                                                    ║");
  log("║   Start using:                                     ║");
  log('║   "Create a CRUD for orders"                       ║');
  log("╚════════════════════════════════════════════════════╝");
  log("");
}

// ═══════════════════════════════════════════════════════════════════
// Main orchestrator
// ═══════════════════════════════════════════════════════════════════
async function cmdInit(parsedArgs) {
  const totalStart = Date.now();

  // ─── Prerequisites check ───────────────────────────────────
  checkPrerequisites();

  // ─── Language selection ────────────────────────────────────
  const lang = await resolveLanguage(parsedArgs);

  // ─── Resume / Fresh selection ──────────────────────────────
  // wasFreshClean: tracks whether we just wiped generated state via --force
  // or "fresh" resume mode. Used by the Pass 3 backfill guard below:
  // fresh/force explicitly means "regenerate from scratch", so a leftover
  // CLAUDE.md from a prior run must NOT cause Pass 3 to be skipped via the
  // v1.7.x migration backfill.
  const { wasFreshClean } = await applyResumeMode(parsedArgs, lang);

  log("");
  log("╔════════════════════════════════════════════════════╗");
  log("║       ClaudeOS-Core — Bootstrap (4-Pass)          ║");
  log("╚════════════════════════════════════════════════════╝");
  log(`    Project root: ${PROJECT_ROOT}`);
  log(`    Language:     ${SUPPORTED_LANGS[lang]} (${lang})`);
  log("");

  // ─── [1] Install dependencies ──────────────────────────────
  header("[1] Installing dependencies...");
  if (!fileExists(path.join(TOOLS_DIR, "node_modules"))) {
    run("npm install --silent", { cwd: TOOLS_DIR });
  }
  log("    ✅ Done\n");

  // ─── [2] Create directory structure ────────────────────────
  header("[2] Creating directory structure...");
  ensureDirectories();
  log("    ✅ Done\n");

  // ─── [3] Run plan-installer ────────────────────────────────
  header("[3] Analyzing project (plan-installer)...");
  run(`node "${path.join(TOOLS_DIR, "plan-installer/index.js")}"`);
  log("");

  // ─── [4] Pass 1: Deep analysis per domain group ────────────
  header("[4] Pass 1 — Deep analysis per domain group...");
  const { domainGroups, totalGroups } = loadDomainGroups();
  const pass1Prompts = loadPass1Prompts();

  // Progress tracking: Pass 1 (N groups) + Pass 2 + Pass 3 + Pass 4 = totalSteps
  const totalSteps = totalGroups + 3;
  let completedSteps = 0;
  const stepTimes = [];
  const passStart = Date.now();
  const progressBar = makeProgressBar(totalSteps, passStart, stepTimes);

  const p1Delta = await runPass1Loop({
    domainGroups, totalGroups, pass1Prompts,
    progressBar, stepTimes,
    startingStep: completedSteps,
  });
  completedSteps += p1Delta;

  // ─── [5] Pass 2: Merge analysis results ────────────────────
  header("[5] Pass 2 — Merging analysis results...");
  const p2Delta = await runPass2({
    progressBar, stepTimes, nextStep: completedSteps + 1,
  });
  completedSteps += p2Delta;
  log("");

  // ─── [5.5] Build pass3-context.json (v2.1) ─────────────────
  buildPass3ContextJson();
  log("");

  // ─── [6] Pass 3: Generate + verify ─────────────────────────
  header("[6] Pass 3 — Generating all files...");
  handlePass3StaleMarker(wasFreshClean);
  const { ran: p3Ran } = await dispatchPass3({
    wasFreshClean, lang, stepTimes,
    progressBar, nextStep: completedSteps + 1,
  });
  if (p3Ran) completedSteps++;
  log("");

  // ─── [7] Pass 4: L4 memory scaffolding ─────────────────────
  header("[7] Pass 4 — Memory scaffolding...");
  const p4Delta = await runPass4({
    lang, stepTimes, progressBar, nextStep: completedSteps + 1,
  });
  completedSteps += p4Delta;
  log("");

  // ─── [8] Run verification tools ────────────────────────────
  header("[8] Running verification tools...");
  runVerificationTools();
  log("");

  // ─── Structural lint (v2.3.0+) ─────────────────────────────
  runLint();

  // ─── Content integrity (Guard 4 — v2.3.0+) ─────────────────
  runContentValidator();

  // ─── Complete ──────────────────────────────────────────────
  printCompletionBanner({ lang, totalGroups, totalStart });
}

module.exports = { cmdInit, InitError };
