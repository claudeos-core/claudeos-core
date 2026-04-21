/**
 * env-parser.js — Parse .env* files for factual project configuration.
 *
 * WHY THIS EXISTS:
 * claudeos-core's "LLMs guess, code confirms" principle requires that
 * factual project data (ports, hosts, API targets) be extracted from
 * declarative sources the project itself maintains, not guessed from
 * framework defaults. `.env.example` is such a source — it's the
 * canonical declaration of a project's runtime configuration surface.
 *
 * Historically, stack-detector only parsed .env for DATABASE_URL to
 * identify the DB. Everything else (ports, hosts, API endpoints) fell
 * back to hardcoded framework defaults (e.g., Vite → 5173), which
 * silently produced wrong values whenever a project customized its
 * configuration via .env. This utility closes that gap.
 *
 * SEARCH ORDER:
 * `.env.example` is preferred over actual `.env` files because it is
 * the shape-of-truth committed to VCS: developer-neutral, reflecting
 * the project's intended configuration surface, not one contributor's
 * local overrides.
 */

"use strict";

const path = require("path");
const { readFileSafe, existsSafe } = require("./safe-fs");

// Search order: public-facing → developer-specific → runtime-specific.
// .env.example is canonical because it's the committed, intended config.
const ENV_FILE_ORDER = [
  ".env.example",
  ".env.local.example",
  ".env.development.example",
  ".env.sample",
  ".env.template",
  ".env",
  ".env.local",
  ".env.development",
];

// Port variable name conventions across frameworks.
// Ordered by specificity — more specific wins when multiple are present.
const PORT_VAR_KEYS = [
  // Vite-specific common patterns
  "VITE_PORT",
  "VITE_DEV_PORT",
  "VITE_DEV_SERVER_PORT",
  "VITE_DESKTOP_PORT",
  // Next.js
  "NEXT_PUBLIC_PORT",
  "NEXT_PORT",
  // Nuxt
  "NUXT_PORT",
  "NUXT_PUBLIC_PORT",
  // Angular
  "NG_PORT",
  "NG_DEV_PORT",
  // Node / backend frameworks
  "APP_PORT",
  "SERVER_PORT",
  "HTTP_PORT",
  "DEV_PORT",
  // Python
  "FLASK_RUN_PORT",
  "UVICORN_PORT",
  "DJANGO_PORT",
  // Generic last — lowest priority because "PORT" collides with too many things
  "PORT",
];

// Host variable conventions.
const HOST_VAR_KEYS = [
  "VITE_DEV_HOST",
  "VITE_HOST",
  "NEXT_PUBLIC_HOST",
  "NUXT_HOST",
  "APP_HOST",
  "SERVER_HOST",
  "HTTP_HOST",
  "HOST",
];

// API target / backend proxy conventions.
const API_TARGET_VAR_KEYS = [
  "VITE_API_TARGET",
  "VITE_API_URL",
  "VITE_API_BASE_URL",
  "NEXT_PUBLIC_API_URL",
  "NEXT_PUBLIC_API_BASE_URL",
  "NUXT_PUBLIC_API_BASE",
  "API_TARGET",
  "API_URL",
  "API_BASE_URL",
  "BACKEND_URL",
  "PROXY_TARGET",
];

/**
 * Parse .env-style file content into a flat key-value object.
 * Handles: KEY=VALUE, quoted values, inline comments, blank lines, export prefix.
 * Does NOT expand ${VAR} interpolation — we keep raw declared values.
 */
function parseEnvContent(content) {
  if (!content || typeof content !== "string") return {};
  const result = {};
  const lines = content.split(/\r?\n/);
  for (const rawLine of lines) {
    let line = rawLine.trim();
    if (!line) continue;
    if (line.startsWith("#")) continue;
    // Strip `export` prefix (common in shell-sourced env files)
    if (line.startsWith("export ")) line = line.slice(7).trim();
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;
    let value = line.slice(eq + 1).trim();
    // Strip surrounding single or double quotes
    if (
      (value.startsWith('"') && value.endsWith('"') && value.length >= 2) ||
      (value.startsWith("'") && value.endsWith("'") && value.length >= 2)
    ) {
      value = value.slice(1, -1);
    } else {
      // Strip inline comment (only on unquoted values)
      const hashIdx = value.indexOf(" #");
      if (hashIdx !== -1) value = value.slice(0, hashIdx).trim();
    }
    result[key] = value;
  }
  return result;
}

/**
 * Locate the most authoritative env file in a project root.
 * Returns the absolute path, or null if none found.
 */
function findPrimaryEnvFile(root) {
  for (const name of ENV_FILE_ORDER) {
    const p = path.join(root, name);
    if (existsSafe(p)) return p;
  }
  return null;
}

/**
 * Read and parse the primary env file. Returns { file, vars } or null.
 */
function readPrimaryEnv(root) {
  const file = findPrimaryEnvFile(root);
  if (!file) return null;
  const content = readFileSafe(file);
  if (!content) return null;
  return {
    file: path.basename(file),
    vars: parseEnvContent(content),
  };
}

/**
 * Extract a port value from parsed env vars. Returns integer or null.
 * First match by PORT_VAR_KEYS ordering wins.
 */
function extractPort(vars) {
  if (!vars) return null;
  for (const key of PORT_VAR_KEYS) {
    if (key in vars) {
      const n = parseInt(vars[key], 10);
      if (!Number.isNaN(n) && n > 0 && n < 65536) return n;
    }
  }
  return null;
}

/**
 * Extract a host value from parsed env vars. Returns string or null.
 */
function extractHost(vars) {
  if (!vars) return null;
  for (const key of HOST_VAR_KEYS) {
    if (key in vars && vars[key]) return vars[key];
  }
  return null;
}

/**
 * Extract an API target URL from parsed env vars. Returns string or null.
 */
function extractApiTarget(vars) {
  if (!vars) return null;
  for (const key of API_TARGET_VAR_KEYS) {
    if (key in vars && vars[key]) return vars[key];
  }
  return null;
}

/**
 * Sensitive variable name patterns. env vars matching any of these patterns
 * are redacted from the `vars` map returned to downstream consumers
 * (stack-detector, prompt-generator, CLAUDE.md scaffold).
 *
 * Even though `.env.example` is conventionally a placeholder file committed
 * to VCS (and should not contain real secrets), projects occasionally check
 * in real values by mistake. claudeos-core piping those values into
 * CLAUDE.md would amplify the leak — CLAUDE.md is committed, shared, and
 * potentially published as part of open-source documentation.
 *
 * Redaction strategy:
 *   - Matching keys are kept in the map so consumers can still detect
 *     "this variable exists" (e.g., "project declares an API_KEY env var").
 *   - Values are replaced with the sentinel string "***REDACTED***".
 *   - extractPort / extractHost / extractApiTarget already scan only a
 *     whitelist of config-relevant keys (PORT, HOST, API_TARGET, etc.)
 *     so sensitive keys cannot leak through those paths regardless of
 *     this filter.
 *
 * Patterns are case-insensitive substring matches against the variable name.
 */
const SENSITIVE_VAR_PATTERNS = [
  /password/i,
  /passwd/i,
  /secret/i,
  /api[_-]?key/i,
  /access[_-]?key/i,
  /private[_-]?key/i,
  /auth[_-]?token/i,
  /token/i,           // matches TOKEN, AUTH_TOKEN, GIT_TOKEN, NPM_TOKEN
                      // (underscore is a word character in regex \b,
                      // so \btoken\b fails to match "_TOKEN" suffix)
  /credential/i,
  /bearer/i,
  /\bsalt\b/i,
  /encryption[_-]?key/i,
  /cert(ificate)?[_-]?key/i,
  /secret[_-]?key/i,
  /client[_-]?secret/i,
  /session[_-]?secret/i,
  /jwt[_-]?secret/i,
];

/**
 * Returns true if the given env var name matches any sensitive pattern.
 */
function isSensitiveVarName(name) {
  if (!name || typeof name !== "string") return false;
  return SENSITIVE_VAR_PATTERNS.some(re => re.test(name));
}

/**
 * Redacts sensitive values in an env vars map. Returns a new object;
 * original is not mutated. Preserves keys so "variable exists" signal
 * is kept, but replaces values with a sentinel string.
 *
 * Whitelist exception: DATABASE_URL is kept as-is because stack-detector's
 * db-identification path has always used it and existing project-analysis
 * consumers depend on reading it. (The DB URL contains credentials, but
 * this has been the established behavior since v1.x and changing it would
 * be a breaking change. Downstream consumers that write CLAUDE.md content
 * from vars should still redact it at their layer.)
 */
function redactSensitiveVars(vars) {
  if (!vars || typeof vars !== "object") return vars;
  const out = {};
  for (const [k, v] of Object.entries(vars)) {
    if (k === "DATABASE_URL") {
      out[k] = v;  // documented whitelist for stack-detector back-compat
    } else if (isSensitiveVarName(k)) {
      out[k] = "***REDACTED***";
    } else {
      out[k] = v;
    }
  }
  return out;
}

/**
 * Top-level convenience: read the project's env file and produce the
 * stack.envInfo object consumed by project-analysis.json.
 *
 * Returns null when no env file exists (caller falls back to framework defaults).
 *
 * Sensitive variable values (passwords, secrets, tokens, API keys) are
 * redacted in `vars` via redactSensitiveVars before being returned.
 * extractPort/Host/ApiTarget use a whitelist of config-relevant keys so
 * they are unaffected by redaction.
 */
function readStackEnvInfo(root) {
  const primary = readPrimaryEnv(root);
  if (!primary) return null;
  const { file, vars } = primary;
  return {
    source: file,
    vars: redactSensitiveVars(vars),
    port: extractPort(vars),
    host: extractHost(vars),
    apiTarget: extractApiTarget(vars),
  };
}

module.exports = {
  parseEnvContent,
  findPrimaryEnvFile,
  readPrimaryEnv,
  extractPort,
  extractHost,
  extractApiTarget,
  readStackEnvInfo,
  isSensitiveVarName,
  redactSensitiveVars,
  // Exported for test visibility:
  ENV_FILE_ORDER,
  PORT_VAR_KEYS,
  HOST_VAR_KEYS,
  API_TARGET_VAR_KEYS,
  SENSITIVE_VAR_PATTERNS,
};
