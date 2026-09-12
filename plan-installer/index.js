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
const { hasBackendStack, hasFrontendStack } = require("../lib/stack-shape");
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
    console.warn("  Ensure you have build.gradle(.kts), pom.xml, package.json, pyproject.toml, or requirements.txt in the project root.\n");
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
  console.log(`    PackageMgr:  ${stack.packageManager || "none"}`);
  // v2.5.2 — a URL value whose password holds a raw `/`, `?` or `#` cannot
  // have its userinfo rewritten without risking the host, so the whole value
  // is dropped. Say so: silently losing a DATABASE_URL would otherwise look
  // like a detection bug. Key names only, never any part of the value.
  // Both env sources are reported. A sub-directory SPA keeps its own
  // `frontend/.env`, read into `stack.frontendEnvInfo`, and reading only
  // `stack.envInfo` swallowed exactly the drop this warning exists to announce.
  for (const info of [stack.envInfo, stack.frontendEnvInfo]) {
    const credWarn = (info && info.credentialWarnings) || [];
    if (!credWarn.length) continue;
    console.warn(`\n  ⚠️  Credential-shaped value dropped from ${credWarn.join(", ")} (${info.source}).`);
    console.warn("  The password contains a raw '/', '?', '#' or space, which makes the URL's host");
    console.warn("  ambiguous, so the value was redacted whole rather than partially masked.");
    console.warn("  Percent-encode the password (e.g. '/' as %2F) to keep the host visible.");
  }
  console.log("");

  // Phase 2: Structure scan
  console.log("  [Phase 2] Scanning structure...");
  const { domains, backendDomains, frontendDomains, rootPackage, frontend } = await scanStructure(stack, ROOT);
  console.log(`    Backend:     ${backendDomains.length} domains`);
  console.log(`    Frontend:    ${frontendDomains.length} domains`);
  console.log(`    Total:       ${domains.length} domains`);
  if (rootPackage) console.log(`    Package:     ${rootPackage}`);
  if (frontend.exists) console.log(`    Components:  ${frontend.components} components, ${frontend.pages} pages, ${frontend.hooks} hooks`);
  // v2.5.3 — Warn per side, keyed on what Phase 1 actually detected.
  //
  // The former gate was `backend === 0 && frontend === 0`. That was right
  // for what it protected — a Next.js-only project legitimately has zero
  // backend domains, a Spring-only project zero frontend domains, and a
  // plain `||` would warn on every one of them (verified: it fired on all
  // eight fixtures in the v2.5.3 audit, five of them healthy). But it was
  // also silent in the case that matters: a Spring Boot + Next.js repo
  // whose Java scanner returned nothing produced a frontend-only document
  // set with no warning at all, because the frontend count kept the total
  // above zero. The right key is not the other side's count but whether
  // Phase 1 said this side exists — `hasBackendStack` (the same predicate
  // stack-detector uses to split ports) and `stack.frontend`.
  //
  // A zero TOTAL is reported first and unconditionally. Keying the whole
  // block on the per-side predicates dropped the original message for a
  // project Phase 1 recognized NEITHER side of — a bare repository, a plain
  // Node script, a TypeScript library — which then produced zero domains,
  // skipped Pass 1, and said nothing at all. That is the case the warning
  // existed for. It also keeps the per-side messages honest: "Pass 1 will
  // analyze the frontend only" is false when there is no frontend either.
  const missingBackend = hasBackendStack(stack) && backendDomains.length === 0;
  const missingFrontend = hasFrontendStack(stack) && frontendDomains.length === 0;
  const backendLabel = `${stack.language || "unknown"}${stack.framework ? " / " + stack.framework : ""}`;
  if (domains.length === 0) {
    console.warn("\n  ⚠️  No domains detected.");
    console.warn("  Pass 1 will be skipped. Generated output may be minimal.");
    if (missingBackend) console.warn(`  Phase 1 detected a backend (${backendLabel}) whose layout the scanner did not recognize.`);
    if (missingFrontend) console.warn(`  Phase 1 detected a frontend (${stack.frontend}) whose layout the scanner did not recognize.`);
    if (missingBackend || missingFrontend) console.warn("  Please open an issue with the directory shape.");
    console.warn("");
  } else if (missingBackend) {
    console.warn(`\n  ⚠️  Backend detected (${backendLabel}) but no backend domains were found.`);
    console.warn("  Pass 1 will analyze the frontend only; backend Standards/Rules/Skills will be missing.");
    console.warn("  If the backend has a layout the scanner does not recognize, please open an issue with its directory shape.\n");
  } else if (missingFrontend) {
    console.warn(`\n  ⚠️  Frontend detected (${stack.frontend}) but no frontend domains were found.`);
    console.warn("  Pass 1 will analyze the backend only; frontend Standards/Rules/Skills will be missing.\n");
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
  generatePrompts(templates, lang, TEMPLATES_DIR, GENERATED_DIR, stack);
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
  //
  // v2.5.0 — backend port and frontend dev-server port are resolved
  // SEPARATELY. Pre-v2.5.0 the single chain (`stack.frontend === "angular"
  // ? 4200 …`) handed a Spring/Django backend the Angular/Next dev-server
  // port whenever a SPA lived beside it. Now:
  //   stack.port         — the backend's port when a backend exists; for a
  //                        frontend-only project it is the dev-server port.
  //   stack.frontendPort — the SPA's dev-server port whenever a frontend
  //                        exists: sub-directory `.env*` (stack-detector) →
  //                        root `.env*` PORT for a root SPA → convention.
  // Same definition as stack-detector's env-port split: a JVM/Python project
  // is a backend even when no framework was recognized (plain Maven/Gradle
  // project without Spring Boot coordinates).
  const hasBackend = (!!stack.framework && stack.framework !== "vite") || ["java", "kotlin", "python"].includes(stack.language);
  const backendDefaultPort = (stack.framework === "fastapi" || stack.framework === "django") ? 8000
    : stack.framework === "flask" ? 5000
    : (stack.framework === "express" || stack.framework === "nestjs" || stack.framework === "fastify") ? 3000 : 8080;
  const frontendDefaultPort = (stack.frontendBundler === "vite" || stack.framework === "vite") ? 5173
    : stack.frontend === "angular" ? 4200
    : 3000;
  const frontendPort = !stack.frontend ? null
    : stack.frontendPort ? stack.frontendPort
    : (!hasBackend && stack.port) ? stack.port
    : frontendDefaultPort;
  const defaultPort = hasBackend ? backendDefaultPort : (stack.frontend ? frontendPort : backendDefaultPort);
  const analysis = {
    analyzedAt: new Date().toISOString(), lang,
    stack: { ...stack, port: stack.port || defaultPort, ...(frontendPort ? { frontendPort } : {}) },
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
