/**
 * ClaudeOS-Core — Domain Grouper
 *
 * Splits domains into analysis groups, determines active domains,
 * and selects appropriate templates based on detected stack.
 */

// ─── Splitting thresholds ───────────────────────────────────────
//
// MAX_FILES_PER_GROUP and MAX_DOMAINS_PER_GROUP are the original budgets that
// have governed Pass 1 batching since v1.x. They are sound for projects with
// a roughly uniform file-size distribution but can produce time-outlier
// batches when a single domain contains a very large file (e.g. a 2500-line
// TUI Grid wrapper) — observed in field testing where a group of ~29
// files ran ~70% longer than a group of 39 files.
//
// MAX_LINES_PER_GROUP is the optional second axis. It only fires when the
// caller supplies per-domain `totalLines`; scanners that do not yet record
// line counts leave it unset and the line-budget check is skipped, so this
// field is strictly additive (no behavior change for existing scanners).
//
// The 8000-line threshold is a pragmatic starting point calibrated against
// observed field tests: ~40 files × ~200 lines/file average. It can be
// tuned later once more scanners populate `totalLines` and we have more
// data on per-stack line-count distributions.
const MAX_FILES_PER_GROUP = 40;
const MAX_DOMAINS_PER_GROUP = 4;
const MAX_LINES_PER_GROUP = 8000;

function splitDomainGroups(domains, type, template) {
  const groups = [];
  let current = [];
  let fileCount = 0;
  let lineCount = 0;

  for (const d of domains) {
    // Read `totalLines` as an optional signal. Domains produced by scanners
    // that have not yet been extended to record line counts leave this
    // undefined, which makes the line-budget check a no-op (0 + undefined
    // stays undefined; the `hasLines` guard below suppresses the comparison
    // entirely in that case). This preserves exact byte-for-byte output for
    // all existing callers.
    const domainLines = (typeof d.totalLines === "number" && d.totalLines >= 0) ? d.totalLines : 0;
    const hasLines = domainLines > 0;

    // Flush current group before adding if it would exceed any budget.
    // The line-budget condition (`hasLines && ...`) is only evaluated when
    // the incoming domain actually carries line-count data — callers using
    // the legacy `{ name, totalFiles }` shape retain the original 2-axis
    // behavior.
    const wouldExceedFiles = fileCount + d.totalFiles > MAX_FILES_PER_GROUP;
    const wouldExceedDomains = current.length >= MAX_DOMAINS_PER_GROUP;
    const wouldExceedLines = hasLines && (lineCount + domainLines > MAX_LINES_PER_GROUP);

    if (current.length > 0 && (wouldExceedFiles || wouldExceedDomains || wouldExceedLines)) {
      groups.push({ type, template, domains: [...current], estimatedFiles: fileCount });
      current = [];
      fileCount = 0;
      lineCount = 0;
    }
    current.push(d.name);
    fileCount += d.totalFiles;
    lineCount += domainLines;
  }
  if (current.length > 0) {
    groups.push({ type, template, domains: [...current], estimatedFiles: fileCount });
  }

  return groups;
}

// ─── Determine active domains ───────────────────────────────────
function determineActiveDomains(stack) {
  const isBackend = !!stack.framework && stack.framework !== "vite";
  return {
    "00.core": true,
    "10.backend": !!isBackend,
    "20.frontend": !!stack.frontend,
    "30.security-db": !!(stack.database || isBackend || stack.frontend),
    "40.infra": true,
    "80.verification": true,
    "90.optional": true,
  };
}

// ─── Template selection (multi-stack) ──────────────────────────────
function selectTemplates(stack) {
  const templates = { backend: null, frontend: null };

  // Backend template (requires a backend framework; language-only fallback skipped for pure frontend projects)
  if (stack.language === "kotlin") templates.backend = "kotlin-spring";
  else if (stack.language === "java") templates.backend = "java-spring";
  else if (stack.framework === "nestjs") templates.backend = "node-nestjs";
  else if (stack.framework === "express") templates.backend = "node-express";
  else if (stack.framework === "fastify") templates.backend = "node-fastify";
  else if (stack.framework === "django") templates.backend = "python-django";
  else if (stack.framework === "fastapi") templates.backend = "python-fastapi";
  else if (stack.framework === "flask") templates.backend = "python-flask";
  else if ((stack.language === "typescript" || stack.language === "javascript") && stack.framework && stack.framework !== "vite") templates.backend = "node-express";
  else if (stack.language === "python" && stack.framework) templates.backend = "python-fastapi";

  // Frontend template
  if (stack.frontend === "nextjs") {
    templates.frontend = "node-nextjs";
  } else if (stack.frontend === "react") {
    templates.frontend = stack.framework === "vite" ? "node-vite" : "node-nextjs";
  } else if (stack.frontend === "vue") {
    templates.frontend = "vue-nuxt";
  } else if (stack.frontend === "angular") {
    templates.frontend = "angular";
  }

  return templates;
}

module.exports = { splitDomainGroups, determineActiveDomains, selectTemplates };
