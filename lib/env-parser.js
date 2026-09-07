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
 * Mask the userinfo component of a URL-shaped value:
 *   postgres://app:s3cret@db.internal:5432/app  →  postgres://***:***@db.internal:5432/app
 * Scheme, host, port, path and query are preserved so consumers can still
 * identify the DB engine / host. Non-URL values pass through unchanged.
 */
function maskUrlCredentials(value) {
  if (typeof value !== "string") return value;
  // Scheme may itself contain `:` (`jdbc:postgresql://`, `jdbc:mysql://`).
  // Userinfo is everything between `://` and the LAST `@` of the authority
  // part, so a password containing `@` (`p@ss`) is masked whole. It may NOT
  // contain `/`, `?` or `#`: an `@` that appears after the first `/` belongs
  // to the path or query (`https://cdn.example.com/npm/@scope/pkg`,
  // `/users/@me`, `?redirect=user@host`) and must never be rewritten —
  // masking it would replace the real host with a path fragment. A raw `/`
  // inside a password is not a valid URL and is deliberately left alone.
  // Credentials carried as connection PARAMETERS rather than userinfo:
  //   jdbc:postgresql://db/app?user=app&password=s3cret
  //   mongodb://host/db?authSource=admin&password=x
  //   sqlserver://host;databaseName=app;user=sa;password=x
  // The parameter NAME is kept, the value becomes `***`.
  const PARAM_RE = /([?&;](?:password|passwd|pwd|pass|secret|token|access[_-]?key|secret[_-]?key|api[_-]?key|sas|signature)=)[^&;\s]*/gi;
  if (/^[a-z][a-z0-9+.:-]*:\/\//i.test(value)) {
    return value
      .replace(/^([a-z][a-z0-9+.:-]*:\/\/)([^/?#\s]*)@([^@/?#\s]+)/i, "$1***:***@$3")
      .replace(PARAM_RE, "$1***");
  }
  // Scheme-less credentials are recognized ONLY in the Go/MySQL DSN shape
  // (`user:pw@tcp(host:3306)/db`, `user:pw@unix(/path)/db`); the password may
  // itself contain `@` (`p@ss`) — everything up to the `@` before `tcp(`/`unix(`
  // is userinfo. A generic `a:b@c` rule would corrupt `mailto:ops@example.com`
  // or `0:30@daily`.
  return value
    .replace(/^([^:@/\s]+):(.*)@(?=(?:tcp|unix)\()/, "***:***@")
    .replace(PARAM_RE, "$1***");
}

/**
 * Redacts sensitive values in an env vars map. Returns a new object;
 * original is not mutated. Preserves keys so "variable exists" signal
 * is kept, but replaces values with a sentinel string.
 *
 * v2.5.0 — the former DATABASE_URL whitelist is gone. Its stated
 * justification ("stack-detector's db-identification path depends on it")
 * was stale: stack-detector scans the raw .env text with includes() and
 * never reads envInfo.vars. Meanwhile the unredacted value — typically
 * `postgres://user:password@host/db` — landed verbatim in
 * project-analysis.json, which Pass 3/4 prompts instruct the LLM to read.
 * Every URL-shaped value (DATABASE_URL, REDIS_URL, MONGO_URI, AMQP_URL, …)
 * now has its userinfo masked while keeping scheme/host/path intact.
 */
function redactSensitiveVars(vars) {
  if (!vars || typeof vars !== "object") return vars;
  const out = {};
  for (const [k, v] of Object.entries(vars)) {
    if (isSensitiveVarName(k)) {
      out[k] = "***REDACTED***";
    } else {
      out[k] = maskUrlCredentials(v);
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
    host: maskUrlCredentials(extractHost(vars)),
    apiTarget: maskUrlCredentials(extractApiTarget(vars)),
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
  maskUrlCredentials,
  // Exported for test visibility:
  ENV_FILE_ORDER,
  PORT_VAR_KEYS,
  HOST_VAR_KEYS,
  API_TARGET_VAR_KEYS,
  SENSITIVE_VAR_PATTERNS,
};
