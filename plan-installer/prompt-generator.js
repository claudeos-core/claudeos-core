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

  const header = existsSafe(headerPath) ? readFileSafe(headerPath) : "";
  const footer = existsSafe(footerPath) ? readFileSafe(footerPath) : "";

  let langInstruction = "";
  if (lang && lang !== "en" && existsSafe(langPath)) {
    const langData = readJsonSafe(langPath);
    if (langData && langData.instructions && langData.instructions[lang]) {
      langInstruction = langData.instructions[lang];
      console.log(`    🌐 Language: ${langData.labels[lang]} (Pass 3 output)`);
    }
  }

  function readTemplate(templateName, passName) {
    const src = path.join(templatesDir, templateName, `${passName}.md`);
    if (!existsSafe(src)) return null;
    let body = readFileSafe(src);
    body = body.replace(/^Project root path:.*\nInterpret all file paths.*\n\n?---\n\n?/s, "");
    body = body.replace(/\nAfter completion, run the following commands in order:[\s\S]*$/, "");
    return body;
  }

  const activeTemplates = [templates.backend, templates.frontend].filter(Boolean);
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
    let combinedBody = primaryBody || "";

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
      header + langInstruction + combinedBody.trimEnd() + "\n" + footer
    );
    console.log(`    ✅ pass3-prompt.md${templates.frontend && templates.backend ? " (multi-stack combined)" : ""}`);
  }
}

module.exports = { generatePrompts };
