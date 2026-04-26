#!/usr/bin/env node

/**
 * ClaudeOS-Core — plan-installer (orchestrator)
 *
 * Modules:
 *   - stack-detector.js      — detectStack()
 *   - structure-scanner.js   — scanStructure(), resolveSharedQueryDomains()
 *   - domain-grouper.js      — splitDomainGroups(), determineActiveDomains(), selectTemplates()
 *   - prompt-generator.js    — generatePrompts()
 */

const path = require("path");
const { ensureDir, writeFileSafe } = require("../lib/safe-fs");
const { detectStack } = require("./stack-detector");
const { scanStructure } = require("./structure-scanner");
const { splitDomainGroups, determineActiveDomains, selectTemplates } = require("./domain-grouper");
const { generatePrompts } = require("./prompt-generator");
const { collectSourcePaths } = require("./source-paths");

const ROOT = process.env.CLAUDEOS_ROOT || path.resolve(__dirname, "../..");
const GENERATED_DIR = path.join(ROOT, "claudeos-core/generated");
const TEMPLATES_DIR = path.join(__dirname, "../pass-prompts/templates");

async function main() {
  console.log("\n╔═══════════════════════════════════════╗");
  console.log("║  ClaudeOS-Core — Plan Installer       ║");
  console.log("╚═══════════════════════════════════════╝\n");

  ensureDir(GENERATED_DIR);

  // Phase 1: Stack detection
  console.log("  [Phase 1] Detecting stack...");
  const stack = await detectStack(ROOT);
  console.log(`    Language:    ${stack.language || "unknown"} ${stack.languageVersion || ""}`);
  console.log(`    Framework:   ${stack.framework || "none"} ${stack.frameworkVersion || ""}`);
  if (!stack.language && !stack.framework) {
    console.warn("\n  ⚠️  No language or framework detected.");
    console.warn("  Supported: Java, Kotlin, TypeScript, JavaScript, Python");
    console.warn("  Ensure you have build.gradle, package.json, pyproject.toml, or requirements.txt in the project root.\n");
  }
  console.log(`    Frontend:    ${stack.frontend || "none"} ${stack.frontendVersion || ""}`);
  // v2.4.0 — when a project ships more than one DB driver (e.g. Oracle +
  // MySQL master/slave), surface the full list so downstream LLMs (Pass 1)
  // see the dual-dialect setup without having to re-derive it from source
  // code. Singular `Database:` line preserved for byte-for-byte parity in
  // single-DB projects (the dominant case).
  if (Array.isArray(stack.databases) && stack.databases.length > 1) {
    console.log(`    Database:    ${stack.database} (primary)`);
    console.log(`    Databases:   ${stack.databases.join(", ")} (multi-dialect)`);
  } else {
    console.log(`    Database:    ${stack.database || "none"}`);
  }
  console.log(`    ORM:         ${stack.orm || "none"}`);
  console.log(`    PackageMgr:  ${stack.packageManager || "none"}\n`);

  // Phase 2: Structure scan
  console.log("  [Phase 2] Scanning structure...");
  const { domains, backendDomains, frontendDomains, rootPackage, frontend } = await scanStructure(stack, ROOT);
  console.log(`    Backend:     ${backendDomains.length} domains`);
  console.log(`    Frontend:    ${frontendDomains.length} domains`);
  console.log(`    Total:       ${domains.length} domains`);
  if (rootPackage) console.log(`    Package:     ${rootPackage}`);
  if (frontend.exists) console.log(`    Components:  ${frontend.components} components, ${frontend.pages} pages, ${frontend.hooks} hooks`);
  if (backendDomains.length === 0 && frontendDomains.length === 0) {
    console.warn("\n  ⚠️  No domains detected.");
    console.warn("  Pass 1 will be skipped. Generated output may be minimal.\n");
  }
  console.log();

  // Phase 2.5: Allowed source paths (v2.3.x+ — path-hallucination prevention)
  //
  // Collect the authoritative list of source files that actually exist on
  // disk. Pass 3/4 prompts use this list (via pass3a-facts.md and the
  // pass3-footer.md grounding rule) to refuse citations of convention-based
  // fabricated paths like `src/app/providers.tsx` when the project does
  // not in fact ship that file. See plan-installer/source-paths.js for
  // the full rationale.
  console.log("  [Phase 2.5] Collecting source-path allowlist...");
  const sourcePaths = await collectSourcePaths(ROOT);
  if (sourcePaths.mode === "full") {
    console.log(`    ${sourcePaths.totalFiles} source file(s) enumerated (full mode)`);
  } else {
    console.log(`    ${sourcePaths.totalFiles} source files across ${sourcePaths.paths.length} dirs (rollup mode — project exceeds enumeration budget)`);
  }
  console.log();

  // Phase 3: Template selection
  console.log("  [Phase 3] Selecting templates...");
  const templates = selectTemplates(stack);
  const isMultiStack = !!(templates.backend && templates.frontend);
  if (templates.backend) console.log(`    Backend:     ${templates.backend}`);
  if (templates.frontend) console.log(`    Frontend:    ${templates.frontend}`);
  console.log(`    Mode:        ${isMultiStack ? "🔀 Multi-stack" : "Single-stack"}`);
  console.log();

  // Phase 4: Domain group splitting
  console.log("  [Phase 4] Splitting domain groups...");
  const allGroups = [];
  if (templates.backend && backendDomains.length > 0) allGroups.push(...splitDomainGroups(backendDomains, "backend", templates.backend));
  if (templates.frontend && frontendDomains.length > 0) allGroups.push(...splitDomainGroups(frontendDomains, "frontend", templates.frontend));
  allGroups.forEach((g, i) => { g.passNum = i + 1; });
  allGroups.forEach((g, i) => {
    const icon = g.type === "backend" ? "⚙️" : "🎨";
    console.log(`    ${icon} Group ${i + 1}: [${g.domains.join(", ")}] (${g.type}, ~${g.estimatedFiles} files)`);
  });
  console.log();

  // Phase 5: Active domains
  console.log("  [Phase 5] Active domains...");
  const active = determineActiveDomains(stack);
  Object.entries(active).forEach(([k, v]) => console.log(`    ${v ? "✅" : "⏭️"} ${k}`));
  console.log();

  // Phase 6: Prompt generation
  const lang = process.env.CLAUDEOS_LANG || "en";
  console.log(`  [Phase 6] Generating prompts (lang: ${lang})...`);
  generatePrompts(templates, lang, TEMPLATES_DIR, GENERATED_DIR);
  console.log();

  // Save outputs
  //
  // Port resolution precedence (stack.port):
  //   1. stack.port already set by stack-detector (Spring application.yml
  //      server.port, or .env file PORT variable) — highest authority.
  //   2. defaultPort fallback below — framework convention, only used when
  //      the project declares no port of its own. This is a last-resort
  //      default; prefer that stack-detector extract it from .env.example
  //      to keep CLAUDE.md truthful to what the project actually runs.
  const defaultPort = (stack.framework === "fastapi" || stack.framework === "django") ? 8000
    : stack.framework === "flask" ? 5000
    : stack.framework === "vite" ? 5173
    : stack.frontend === "angular" ? 4200
    : stack.frontend === "nextjs" ? 3000
    : (stack.framework === "express" || stack.framework === "nestjs" || stack.framework === "fastify") ? 3000 : 8080;
  const analysis = {
    analyzedAt: new Date().toISOString(), lang,
    stack: { ...stack, port: stack.port || defaultPort },
    templates, isMultiStack, rootPackage,
    domains, backendDomains, frontendDomains, frontend,
    activeDomains: active,
    // v2.3.x+: authoritative on-disk source-file list. Consumed by
    // pass3-context-builder → pass3a-facts.md → Pass 3/4 prompts to
    // prevent convention-based path hallucination (e.g. Next.js
    // `src/app/providers.tsx` when the project does not ship it).
    allowedSourcePaths: sourcePaths,
    summary: {
      totalDomains: domains.length, backendDomains: backendDomains.length,
      frontendDomains: frontendDomains.length,
      totalFiles: domains.reduce((s, d) => s + d.totalFiles, 0),
    },
  };
  writeFileSafe(path.join(GENERATED_DIR, "project-analysis.json"), JSON.stringify(analysis, null, 2));
  console.log("  💾 project-analysis.json saved");

  const domainGroups = {
    generatedAt: new Date().toISOString(), isMultiStack, templates,
    totalDomains: domains.length, totalGroups: allGroups.length,
    maxDomainsPerGroup: 4, maxFilesPerGroup: 40, groups: allGroups,
  };
  writeFileSafe(path.join(GENERATED_DIR, "domain-groups.json"), JSON.stringify(domainGroups, null, 2));
  console.log("  💾 domain-groups.json saved\n");
  console.log("  ✅ Plan Installer complete\n");
}

main().catch(e => {
  console.error(`\n  ❌ Plan Installer failed: ${e.message || e}`);
  if (e.code === "EACCES" || e.code === "EPERM") console.error("  Check file/directory permissions.");
  process.exit(1);
});
