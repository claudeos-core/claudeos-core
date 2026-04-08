/**
 * ClaudeOS-Core — Domain Grouper
 *
 * Splits domains into analysis groups, determines active domains,
 * and selects appropriate templates based on detected stack.
 */

function splitDomainGroups(domains, type, template) {
  const MAX_FILES_PER_GROUP = 40;
  const MAX_DOMAINS_PER_GROUP = 4;
  const groups = [];
  let current = [];
  let fileCount = 0;

  for (const d of domains) {
    // Flush current group before adding if it would exceed limits
    if (current.length > 0 && (fileCount + d.totalFiles >= MAX_FILES_PER_GROUP || current.length >= MAX_DOMAINS_PER_GROUP)) {
      groups.push({ type, template, domains: [...current], estimatedFiles: fileCount });
      current = [];
      fileCount = 0;
    }
    current.push(d.name);
    fileCount += d.totalFiles;
  }
  if (current.length > 0) {
    groups.push({ type, template, domains: [...current], estimatedFiles: fileCount });
  }

  return groups;
}

// ─── Determine active domains ───────────────────────────────────
function determineActiveDomains(stack) {
  const isBackend = !!stack.framework;
  return {
    "00.core": true,
    "10.backend": !!isBackend,
    "20.frontend": !!stack.frontend,
    "30.security-db": !!(stack.database || stack.framework),
    "40.infra": true,
    "50.verification": true,
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
  else if (stack.framework === "fastapi" || stack.framework === "flask") templates.backend = "python-fastapi";
  else if ((stack.language === "typescript" || stack.language === "javascript") && stack.framework) templates.backend = "node-express";
  else if (stack.language === "python" && stack.framework) templates.backend = "python-fastapi";

  // Frontend template
  if (stack.frontend === "nextjs" || stack.frontend === "react" || stack.frontend === "vue") {
    templates.frontend = "node-nextjs";
  } else if (stack.frontend === "angular") {
    templates.frontend = "angular";
  }

  return templates;
}

module.exports = { splitDomainGroups, determineActiveDomains, selectTemplates };
