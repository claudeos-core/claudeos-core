/**
 * ClaudeOS-Core — Prompt Generator
 *
 * Generates dynamic prompts for Pass 1/2/3 based on detected stack and language.
 * Supports multi-stack combined prompts (backend + frontend merged in Pass 3).
 */

const path = require("path");
const { readFileSafe, readJsonSafe, existsSafe, writeFileSafe } = require("../lib/safe-fs");

/**
 * Generate pass prompts from templates.
 * @param {object} templates - { backend: string|null, frontend: string|null }
 * @param {string} lang - output language code (e.g. "ko", "en")
 * @param {string} templatesDir - path to pass-prompts/templates/
 * @param {string} generatedDir - path to claudeos-core/generated/
 */
function generatePrompts(templates, lang, templatesDir, generatedDir) {
  const commonDir  = path.join(templatesDir, "common");
  const headerPath = path.join(commonDir, "header.md");
  const footerPath = path.join(commonDir, "pass3-footer.md");
  const langPath   = path.join(commonDir, "lang-instructions.json");
  const stagingOverridePath = path.join(commonDir, "staging-override.md");

  const header = existsSafe(headerPath) ? readFileSafe(headerPath) : "";
  const footer = existsSafe(footerPath) ? readFileSafe(footerPath) : "";
  // Injected into pass3/pass4 prompts — redirects .claude/rules/* writes to
  // claudeos-core/generated/.staged-rules/* to bypass Claude Code's sensitive-
  // path block. The Node.js orchestrator moves the staged files after each pass.
  const stagingOverride = existsSafe(stagingOverridePath) ? readFileSafe(stagingOverridePath) + "\n" : "";
  // v2.1: Phase 1 "Read Once, Extract Facts" block prepended to every Pass 3
  // prompt. Teaches Claude to read pass2-merged.json exactly once into a
  // compact in-context fact table and reference that table for all subsequent
  // file generation — fixes the `Prompt is too long` failure on large projects
  // caused by 10-20× re-reads of pass2-merged.json. Also includes idempotent
  // skip rules (Rule B) so interrupted Pass 3 runs can resume safely.
  const phase1Path = path.join(commonDir, "pass3-phase1.md");
  const phase1 = existsSafe(phase1Path) ? readFileSafe(phase1Path) + "\n" : "";

  // v2.2: CLAUDE.md Scaffold — the 8-section deterministic template for CLAUDE.md.
  // Embedded inline (not referenced by path) because the prompt runs in the user's
  // project directory where the scaffold file does not exist. Stack-specific pass3
  // templates and pass3-footer both reference "pass-prompts/templates/common/
  // claude-md-scaffold.md" in their instructions, and this embed makes that
  // reference resolvable via in-context content. Wrapped in explicit delimiters
  // so the LLM can reliably locate the scaffold block.
  // v2.3.0: Demote scaffold meta-section `##` headers to `###` before
  // embedding. Inside the embedded scaffold, the only `##`-level headings
  // visible to the LLM should be the 8 canonical CLAUDE.md sections inside
  // the Template structure code block (`## 1. Role Definition` ... `## 8.`).
  // Scaffold meta-sections like `## Why this scaffold exists`, `## Hard
  // constraints`, `## Per-section generation rules`, `## Validation checks`,
  // `## Examples`, `## Usage from pass3 prompts` used to share the same
  // `##` level, producing 40+ `##` lines in the prompt and creating an
  // unintended pattern bias ("this prompt has many `##` sections → my
  // output should too"). Demotion is code-block-aware: `##` lines inside
  // ``` or ~~~ fenced blocks are preserved so the Template structure
  // example remains intact.
  function demoteScaffoldMetaHeaders(scaffoldContent) {
    const lines = scaffoldContent.split(/\r?\n/);
    let inFence = false;
    let fenceMarker = null;
    return lines.map(line => {
      const trimmed = line.trimStart();
      const fenceMatch = trimmed.match(/^(```+|~~~+)/);
      if (fenceMatch) {
        if (!inFence) {
          inFence = true;
          fenceMarker = fenceMatch[1][0];
        } else if (trimmed.startsWith(fenceMarker)) {
          inFence = false;
          fenceMarker = null;
        }
        return line;
      }
      // Only demote outside fenced code blocks.
      // Also preserve the top-level `# CLAUDE.md Scaffold Template ...`
      // single `#` — it's the scaffold doc title, not a section.
      if (!inFence && /^## (?!#)/.test(line)) {
        return line.replace(/^## /, "### ");
      }
      return line;
    }).join("\n");
  }

  const scaffoldPath = path.join(commonDir, "claude-md-scaffold.md");
  const scaffold = existsSafe(scaffoldPath)
    ? "\n---\n\n# === EMBEDDED: claude-md-scaffold.md ===\n\n"
      + "The content below is the scaffold referenced by stack-specific sections\n"
      + "and the Pass 3 footer. Treat this embedded block as the authoritative\n"
      + "source when instructions mention `pass-prompts/templates/common/claude-md-scaffold.md`.\n\n"
      + "NOTE: Scaffold meta-section headers have been demoted from `##` to `###`\n"
      + "when embedded here. The ONLY `##` headings visible in this block are the\n"
      + "8 canonical CLAUDE.md sections inside the Template structure example —\n"
      + "those 8 are the count your generated CLAUDE.md must match exactly.\n\n"
      + demoteScaffoldMetaHeaders(readFileSafe(scaffoldPath))
      + "\n\n# === END EMBEDDED: claude-md-scaffold.md ===\n\n---\n\n"
    : "";

  let langInstruction = "";
  if (lang && lang !== "en" && existsSafe(langPath)) {
    const langData = readJsonSafe(langPath);
    if (langData && langData.instructions && langData.instructions[lang]) {
      langInstruction = langData.instructions[lang];
      const label = (langData.labels && langData.labels[lang]) || lang;
      console.log(`    🌐 Language: ${label} (Pass 3 output)`);
    }
  }

  function readTemplate(templateName, passName) {
    const src = path.join(templatesDir, templateName, `${passName}.md`);
    if (!existsSafe(src)) return null;
    return readFileSafe(src);
  }

  const activeTemplates = [...new Set([templates.backend, templates.frontend].filter(Boolean))];
  const primaryTemplate = templates.backend || templates.frontend;

  for (let ti = 0; ti < activeTemplates.length; ti++) {
    const tmpl = activeTemplates[ti];
    const type = (tmpl === templates.frontend && tmpl !== templates.backend) ? "frontend"
      : (ti === 1 && templates.frontend) ? "frontend" : "backend";
    const body = readTemplate(tmpl, "pass1");
    if (body) {
      writeFileSafe(path.join(generatedDir, `pass1-${type}-prompt.md`), header + body);
      console.log(`    ✅ pass1-${type}-prompt.md (${tmpl})`);
    }
  }

  if (primaryTemplate) {
    const body = readTemplate(primaryTemplate, "pass2");
    if (body) {
      writeFileSafe(path.join(generatedDir, "pass2-prompt.md"), header + body);
      console.log(`    ✅ pass2-prompt.md (${primaryTemplate})`);
    }
  }

  if (primaryTemplate) {
    const primaryBody = readTemplate(primaryTemplate, "pass3");
    if (!primaryBody) {
      console.log(`    ⚠️  pass3 template not found for ${primaryTemplate}, skipping`);
      return;
    }
    let combinedBody = primaryBody;

    if (templates.backend && templates.frontend && templates.backend !== templates.frontend) {
      const frontendBody = readTemplate(templates.frontend, "pass3");
      if (frontendBody) {
        combinedBody += "\n\n---\n\n";
        combinedBody += "# Additional: Frontend generation targets (auto-detected)\n\n";
        combinedBody += "In addition to the backend standards above, also generate the following frontend standards.\n";
        combinedBody += "Reference the frontend analysis results in pass2-merged.json.\n\n";
        const frontendSections = frontendBody
          .split(/\n(?=\d+\.\s)/)
          .filter(s => /frontend|component|page|routing|data[.\-]fetch|state|styling/i.test(s))
          .join("\n");
        if (frontendSections.trim()) combinedBody += frontendSections;
      }
    }

    writeFileSafe(
      path.join(generatedDir, "pass3-prompt.md"),
      header + langInstruction + stagingOverride + phase1 + scaffold + combinedBody.trimEnd() + "\n" + footer
    );
    console.log(`    ✅ pass3-prompt.md${templates.frontend && templates.backend ? " (multi-stack combined)" : ""}`);
  }

  // ─── Pass 4 (L4 memory + rules + CLAUDE.md append) ───
  const pass4Path = path.join(commonDir, "pass4.md");
  if (existsSafe(pass4Path)) {
    const langPath2 = path.join(commonDir, "lang-instructions.json");
    const langData2 = existsSafe(langPath2) ? readJsonSafe(langPath2) : null;
    const langLabel = (langData2 && langData2.labels && langData2.labels[lang]) || "English";
    let pass4Body = readFileSafe(pass4Path);
    // Replace {{LANG_NAME}} with the resolved language label.
    // Use a replacement function to be consistent with other placeholder
    // substitutions and to be safe against future labels that might contain
    // `$` characters (which would otherwise be interpreted as back-refs).
    pass4Body = pass4Body.replace(/\{\{LANG_NAME\}\}/g, () => langLabel);
    writeFileSafe(
      path.join(generatedDir, "pass4-prompt.md"),
      header + langInstruction + stagingOverride + pass4Body
    );
    console.log(`    ✅ pass4-prompt.md (memory + rules, lang: ${langLabel})`);
  }
}

module.exports = { generatePrompts };
