/**
 * ClaudeOS-Core — Structure Scanner (Orchestrator)
 *
 * Scans project directory structure to discover domains (backend + frontend).
 * Delegates to language-specific scanners in ./scanners/.
 *
 * Supported scanners:
 *   - scan-java.js      — Java (5 patterns: A/B/C/D/E + fallback)
 *   - scan-kotlin.js    — Kotlin (multi-module + CQRS + single fallback)
 *   - scan-node.js      — Node.js (Express/NestJS/Fastify)
 *   - scan-python.js    — Python (Django/FastAPI/Flask)
 *   - scan-frontend.js  — Angular, Next.js, React, Vue (+ 4-stage fallback + stats)
 */

const { scanJavaDomains } = require("./scanners/scan-java");
const { scanKotlinDomains, resolveSharedQueryDomains } = require("./scanners/scan-kotlin");
const { scanNodeDomains } = require("./scanners/scan-node");
const { scanPythonDomains } = require("./scanners/scan-python");
const { scanFrontendDomains, countFrontendStats } = require("./scanners/scan-frontend");
const path = require("path");

async function scanStructure(stack, ROOT) {
  let backendDomains = [];
  let frontendDomains = [];
  let rootPackage = null;

  // ── Backend scanners ──
  if (stack.language === "java") {
    const r = await scanJavaDomains(stack, ROOT);
    backendDomains.push(...r.backendDomains);
    if (r.rootPackage) rootPackage = r.rootPackage;
  }

  if (stack.language === "kotlin") {
    const r = await scanKotlinDomains(stack, ROOT);
    backendDomains.push(...r.backendDomains);
    if (r.rootPackage) rootPackage = r.rootPackage;
  }

  // v2.5.0 — dispatch is framework-aware for Python. A Django/FastAPI/Flask
  // repo may carry a package.json (tailwind/postcss tooling, or a SPA in a
  // sub-directory) that sets `language` to typescript/javascript; the backend
  // is still Python and must be scanned by the Python scanner, never by the
  // Node scanner.
  const PY_FRAMEWORKS = ["django", "fastapi", "flask"];
  const isPythonBackend = stack.language === "python" || PY_FRAMEWORKS.includes(stack.framework);

  if ((stack.language === "typescript" || stack.language === "javascript") && stack.framework && stack.framework !== "vite" && !isPythonBackend) {
    const r = await scanNodeDomains(stack, ROOT);
    backendDomains.push(...r.backendDomains);
  }

  if (isPythonBackend) {
    const r = await scanPythonDomains(stack, ROOT);
    backendDomains.push(...r.backendDomains);
  }

  // ── Frontend scanner ──
  // v2.5.0: when the SPA lives in frontend/ (stack.frontendRoot), scan there.
  const FE_ROOT = stack.frontendRoot ? path.join(ROOT, stack.frontendRoot) : ROOT;
  const fe = await scanFrontendDomains(stack, FE_ROOT, { projectRoot: ROOT });
  frontendDomains.push(...fe.frontendDomains);

  // ── Frontend stats ──
  const frontend = await countFrontendStats(stack, FE_ROOT);

  // ── Aggregate ──
  const allDomains = [
    ...backendDomains.sort((a, b) => b.totalFiles - a.totalFiles),
    ...frontendDomains.sort((a, b) => b.totalFiles - a.totalFiles),
  ];

  return { domains: allDomains, backendDomains, frontendDomains, rootPackage, frontend };
}

module.exports = { scanStructure, resolveSharedQueryDomains };
