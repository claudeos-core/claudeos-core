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
  // Abbreviated form (`DB_PASS`, `MYSQL_PASS`, bare `PASS`). Anchored to a
  // name-segment boundary (start / `_` / `-`) rather than a bare substring,
  // so `BYPASS_AUTH`, `PASSENGER_NAME` and `COMPASS_URL` are NOT swept up.
  // maskUrlCredentials' PARAM_RE has accepted `pass` as a connection
  // parameter name since v2.5.0; this closes the same gap on the env-key
  // side, where the value is copied verbatim into project-analysis.json.
  //
  // KNOWN, ACCEPTED OVER-MATCH: a leading `PASS_` segment also matches
  // benign names such as `PASS_RATE`. Narrowing to a trailing segment
  // (`/(^|[_-])pass$/i`) would fix that but drop `DB_PASS_2` / `PASS_FILE`.
  // The two failure modes are not symmetric — over-redaction costs one
  // config fact in project-analysis.json, under-redaction writes a live
  // credential into a file the Pass 3/4 prompts tell the model to read — so
  // the broader rule stands. Do not narrow it without re-reading this.
  /(^|[_-])pass([_-]|$)/i,
  // Same segment-anchored treatment for the `PW` abbreviation
  // (`DB_PW`, `ADMIN_PW`, `ROOT_PW`).
  /(^|[_-])pw([_-]|$)/i,
  /passphrase/i,
  // Trailing-segment only: `PASSWORD_PEPPER` / `PEPPER` are the secret,
  // `PEPPER_ROUNDS` is a cost parameter.
  /(^|[_-])pepper$/i,
  // Anchored so `SSH_KEYSCAN_HOSTS` (a host list) is not swept up, while
  // `SSH_KEY` / `SSH_KEY_PATH` still are.
  /ssh[_-]?key([_-]|$)/i,
  /sign(ing)?[_-]?key([_-]|$)/i,
  // Specific well-known secret-bearing `*_KEY` names. Deliberately NOT a
  // blanket `/(^|[_-])key([_-]|$)/i`: that would also redact `ROUTING_KEY`,
  // `PARTITION_KEY`, `SORT_KEY`, `IDEMPOTENCY_KEY` and `FOREIGN_KEY_CHECKS`,
  // which are architecture facts this tool exists to document. Each name is
  // anchored at its trailing boundary so `MASTER_KEYSPACE` (Cassandra) and
  // `SERVER_KEYSTORE_PATH` are not swept up.
  //
  // This is a curated list and will always trail real-world naming. If a
  // leak is found, add the specific name here rather than widening to a
  // blanket `key` rule.
  /master[_-]?key([_-]|$)/i,
  /deploy[_-]?key([_-]|$)/i,
  /license[_-]?key([_-]|$)/i,
  /server[_-]?key([_-]|$)/i,
  // Bare `SERVICE_ACCOUNT` (the JSON blob itself) and its secret-bearing
  // suffixes only. `SERVICE_ACCOUNT_EMAIL` / `_NAME` / `_ID` identify the
  // account, they do not authenticate as it — those are config facts.
  // Two patterns, not one with an optional group: an optional group matches
  // empty and the trailing `[_-]` then swallows the separator, which makes
  // `SERVICE_ACCOUNT_EMAIL` match after all.
  /service[_-]?account$/i,
  /service[_-]?account[_-](keys?|json|file|secret|token|creds?|credentials?)([_-]|$)/i,
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
// The userinfo rule maskUrlCredentials() applies. Shared so the backstop below
// can ask "did this already get masked?" instead of guessing from the result.
const USERINFO_RE = /^([a-z][a-z0-9+.:-]*:\/\/)([^/?#\s]*)@([^@/?#\s]+)/i;
// Schemes whose values routinely carry an `@` inside a PATH: scoped npm
// packages, image variants, `/users/@me`. A DSN scheme essentially never does.
const WEB_SCHEME_RE = /^(?:https?|wss?)$/i;
// A token that can follow the `@` terminating an authority: a host, an IPv6
// literal in brackets, optionally `:port`, then end-of-value or a delimiter.
const HOST_AFTER_AT_RE = /^(?:\[[0-9A-Fa-f:.]+\]|[A-Za-z0-9._~%-]+)(?::\d+)?(?:[/?#]|$)/;
// A complete `host[:port]` with a NUMERIC port.
const HOST_PORT_RE = /^(?:[A-Za-z0-9._~-]+)(?::\d+)?$/;

/**
 * v2.5.2 — True when a `scheme://…` value carries userinfo that
 * maskUrlCredentials() could not rewrite, because the password contains a raw
 * `/`, `?`, `#` or space and so pushed the real authority past the point where
 * the userinfo rule is forced to stop.
 *
 * The earlier implementation guessed from the TRUNCATED authority — the text
 * before the first `/?#` — and asked whether the part after its `:` was
 * all-digits. That inverted the test for the most common leak of all: in
 * `postgres://user:12345/6@db/app` the truncated authority is `user:12345`,
 * whose tail IS all digits, so a password merely BEGINNING with digits (which
 * base64-generated passwords routinely do) was waved through. It also could
 * not see a password holding a space, since the userinfo rule's own character
 * class excludes whitespace.
 *
 * This version instead locates the `@` that actually terminates an authority
 * and decides from there. `user:12345` and `a.com:8080` are syntactically
 * indistinguishable, so where ambiguity is irreducible the scheme breaks the
 * tie: for a DSN the value is treated as credentials, for http/https/ws/wss as
 * a path.
 *
 *   postgres://u:p/w@host/db            true   password holds `/`
 *   postgres://user:12345/6@db/app      true   digit-leading password
 *   postgres://u:pa ss@host/db          true   password holds a space
 *   redis://:pw?x@host/0                true   password holds `?`
 *   postgres://u:p@host/db              false  the userinfo rule handles it
 *   https://cdn.example.com/npm/@x/y    false  no credential shape at all
 *   http://a.com:8080/img/@2x.png       false  web scheme, complete host:port
 *   http://[::1]:8080/img/@2x.png       false  bracketed IPv6 is a host
 *   mongodb://h:port/db?x=a@b           false  the `@` sits in the query
 *   https://api:${PORT}/v1/@me          false  unexpanded template
 */
function hasUnmaskedUrlCredentials(value) {
  if (typeof value !== "string") return false;
  const m = value.match(/^([a-z][a-z0-9+.-]*(?::[a-z][a-z0-9+.-]*)*):\/\/(.*)$/i);
  if (!m) return false;
  const rest = m[2];
  if (!rest || !rest.includes("@")) return false;
  // An unexpanded `${VAR}` is a template, not a live secret. parseEnvContent
  // deliberately does not expand these, so redacting one loses a host for
  // nothing.
  if (/\$\{[^}]*\}/.test(rest)) return false;
  // Already masked by the userinfo rule — nothing is hidden.
  if (USERINFO_RE.test(value)) return false;

  const scheme = m[1].split(":")[0].toLowerCase();   // `jdbc:postgresql` → `jdbc`
  // What a strict parser would read as the authority: everything up to the
  // first `/`, `?` or `#`.
  const head = rest.slice(0, rest.search(/[/?#]/) === -1 ? rest.length : rest.search(/[/?#]/));
  // A bracketed IPv6 literal can only ever be a host, never userinfo.
  if (head.startsWith("[")) return false;
  // No `user:secret` shape at all. The empty-user form (`redis://:pw@host`)
  // starts with `:`, so it is admitted here.
  if (!head.includes(":")) return false;
  // For a web scheme, a head that is ALREADY a complete `host:port` means the
  // authority ended there and the `@` belongs to the path.
  if (WEB_SCHEME_RE.test(scheme) && HOST_PORT_RE.test(head)) return false;

  // The `@` that would terminate the real authority: the last one followed by
  // something that can be a host.
  // The loop stops at `i > 0`, NOT `i !== -1`. `String.prototype.lastIndexOf`
  // clamps a negative `fromIndex` to 0 rather than returning -1, so an `@`
  // sitting at index 0 that fails the host test re-finds itself forever and
  // hangs `init` at 100% CPU with no error (`postgres://@ :x` reproduces it).
  // Stopping at index 0 loses nothing: an `@` there means empty userinfo.
  for (let i = rest.lastIndexOf("@"); i > 0; i = rest.lastIndexOf("@", i - 1)) {
    // `continue`, NOT `return false`. Abandoning the whole search on the first
    // `@` that turns out to be query content let a DSN carrying an email or a
    // redirect URL in its query string defeat the backstop entirely:
    // `postgres://app:pa/ss@db/app?redirect=user@host` starts at the LAST `@`,
    // decides it is query content, and never examines the earlier `@` that
    // terminates the real authority.
    if (!HOST_AFTER_AT_RE.test(rest.slice(i + 1))) continue;
    // If a `?` precedes this `@` AND a `/` precedes that `?`, then a path had
    // already begun before the query started, so the authority was long since
    // over and this `@` is query content (`mongodb://h:port/db?x=a@b`). When
    // the `?` comes before any `/` it is inside the password instead
    // (`redis://:pw?x@host/0`).
    const q = rest.indexOf("?");
    if (q !== -1 && q < i && rest.slice(0, q).includes("/")) continue;
    return true;
  }
  return false;
}

const REDACTED = "***REDACTED***";
// Scalar env-derived fields (host, apiTarget) are rendered directly into
// generated docs, so the sentinel must never become their value.
const nullIfRedacted = (v) => (v === REDACTED ? null : v);

// v2.5.3 — Oracle JDBC DSNs carry credentials as `user/password@` BEFORE the
// connect descriptor, not as URL userinfo, and the `://` gate never sees them:
//
//   jdbc:oracle:thin:scott/tiger@//dbhost:1521/ORCL      (EZConnect)
//   jdbc:oracle:thin:scott/tiger@dbhost:1521:ORCL        (SID form)
//   jdbc:oracle:thin:scott/tiger@(DESCRIPTION=(ADDRESS=…  (TNS descriptor)
//   jdbc:oracle:oci:scott/tiger@PRODTNS                  (OCI alias)
//
// Neither `SPRING_DATASOURCE_URL` nor `JDBC_URL` trips a key-name rule, so
// this was the one DSN shape that reached project-analysis.json verbatim —
// and it is the standard one in the pre-Boot SI trees v2.5.1 opened up.
// `user/pw` is rewritten to `***/***`; the descriptor after `@` is kept so
// host, port and service name stay visible in the generated docs.
// `jdbc:oracle:thin:@//host/svc` (no credentials) and a password given as a
// `?user=…&password=…` parameter are untouched here (PARAM_RE below handles
// the parameter form).
//
// The `@` that ends the credentials is located by anchor strength, so a
// password that itself contains `@` is masked whole where the form allows it:
//   1. `@//`  — EZConnect; unambiguous, first occurrence wins
//   2. `@(`   — TNS descriptor; unambiguous, first occurrence wins
//   3. else   — SID / alias form: the FIRST `@` followed by a host character.
//      A password holding `@` in this form is masked only up to that `@`;
//      the remainder is unavoidable without knowing the alias list.
//
// When the body claims to carry credentials but NO anchor resolves — an `@`
// inside the user segment, an empty user, a missing descriptor — the whole
// value is returned as REDACTED rather than null. Returning null would hand it
// to the `://` gate, which cannot read an Oracle DSN either, and the password
// would travel on verbatim. Callers surface the key via credentialWarnings.
const ORACLE_PREFIX_RE = /^(jdbc:oracle:(?:thin|oci8?|kprb):)/i;
function maskOracleDsn(value) {
  const pm = value.match(ORACLE_PREFIX_RE);
  if (!pm) return null;
  const prefix = pm[1];
  const body = value.slice(prefix.length);
  if (body.startsWith("@")) return null;             // credential-free: nothing to mask
  // Past this point the body claims to carry credentials — a non-credential-free
  // Oracle DSN opens with `user/password@`. An alias holding neither `/` nor `@`
  // carries none, so it still falls through untouched.
  if (!body.includes("/") && !body.includes("@")) return null;
  //
  // v2.5.3 — from here a failure to locate the boundary returns REDACTED, not
  // null. Returning null handed the value to the `://` gate, which cannot see
  // an Oracle DSN either, so it travelled to project-analysis.json VERBATIM —
  // the exact hole v2.5.2 spent a release closing for URL userinfo, reopened
  // for this one shape. Dropping the whole value loses the host; that is the
  // trade v2.5.2 already made, and `envInfo.credentialWarnings` names the key.
  const slash = body.indexOf("/");
  if (slash <= 0) return REDACTED;                   // no user segment (`:/pw@host`)
  const user = body.slice(0, slash);
  // An `@` inside the user segment (Oracle Cloud / IAM names are shaped
  // `user@tenancy`) leaves no reliable boundary between user and password.
  if (/[@\s]/.test(user)) return REDACTED;
  let at = body.indexOf("@//");
  if (at === -1) at = body.indexOf("@(");
  if (at === -1) {
    const m = body.slice(slash).match(/@(?=[A-Za-z0-9_\[])/);
    at = m ? slash + m.index : -1;
  }
  if (at === -1 || at < slash) return REDACTED;      // no descriptor anchor (`user/pw@`)
  return prefix + "***/***" + body.slice(at);
}

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
  // Oracle DSNs are decided BEFORE the `://` gate (their credentials sit in
  // front of the connect descriptor, so that gate never sees them) but AFTER
  // PARAM_RE exists, so the parameter rule still runs on the result. Returning
  // straight from the Oracle branch skipped it, and
  // `…scott/tiger@//h/X?password=tiger` kept its parameter verbatim while the
  // userinfo was masked. A dropped value (`***REDACTED***`) carries no
  // parameters, so the same line covers it harmlessly.
  const oracle = maskOracleDsn(value);
  if (oracle !== null) return oracle.replace(PARAM_RE, "$1***");
  if (/^[a-z][a-z0-9+.:-]*:\/\//i.test(value)) {
    const userinfoMasked = USERINFO_RE.test(value);
    const masked = value
      .replace(USERINFO_RE, "$1***:***@$3")
      .replace(PARAM_RE, "$1***");
    // v2.5.2 — last-resort backstop for a password containing a raw `/`, `?`
    // or `#` (`postgres://u:p/w@host/db`). The rule above deliberately does
    // not rewrite an `@` that appears after the first `/` — such an `@`
    // normally belongs to the path (`https://cdn.example.com/npm/@scope/pkg`)
    // and masking it would replace the real host. The value therefore passed
    // through verbatim, and because its key is `DATABASE_URL` the key-name
    // rule did not backstop it either: it was the one combination that could
    // still write a plaintext password into project-analysis.json, which
    // Pass 3/4 prompts instruct the model to read.
    //
    // Base64-generated passwords contain `/` routinely, so this is not an
    // exotic shape. When the value carries the tell (see
    // hasUnmaskedUrlCredentials) the WHOLE value is dropped rather than
    // rewritten — the host cannot be located reliably once the authority is
    // ambiguous, and a lost host is a far cheaper failure than a leaked
    // credential. Callers are told which key it was via
    // envInfo.credentialWarnings.
    //
    // Gated on the USERINFO rule not having fired — NOT on `masked === value`.
    // PARAM_RE may rewrite a query parameter on the same value
    // (`postgres://u:p/w@host/db?sslmode=require&password=x`); a
    // "did anything change" gate would then skip the backstop and let `p/w`
    // through verbatim. Whether the userinfo rule matched is the only signal
    // that says the authority itself was masked.
    if (!userinfoMasked && hasUnmaskedUrlCredentials(value)) return "***REDACTED***";
    return masked;
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
    // v2.5.2 — the keys whose value `maskUrlCredentials` dropped whole rather
    // than partially masking. The credential is not leaked, but the user loses
    // the host for that key, so `init` names the keys in its Phase 1 summary
    // instead of silently swallowing them. Key NAMES only, never any part of
    // the value.
    //
    // Derived from what `maskUrlCredentials` ACTUALLY returned, so the list can
    // never name a key whose value was kept (masked) rather than dropped. The
    // `!== REDACTED` guard covers an env value that is literally the sentinel.
    credentialWarnings: Object.keys(vars).filter(
      k => !isSensitiveVarName(k) && vars[k] !== REDACTED && maskUrlCredentials(vars[k]) === REDACTED
    ),
    port: extractPort(vars),
    // A value the backstop dropped whole must not travel on as the literal
    // sentinel: `host` / `apiTarget` are rendered straight into CLAUDE.md §3,
    // and the scaffold's only sentinel guard covers `envInfo.vars`. Null makes
    // the row simply absent, which is what the scaffold already handles.
    host: nullIfRedacted(maskUrlCredentials(extractHost(vars))),
    apiTarget: nullIfRedacted(maskUrlCredentials(extractApiTarget(vars))),
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
  hasUnmaskedUrlCredentials,
  // Exported for test visibility:
  ENV_FILE_ORDER,
  PORT_VAR_KEYS,
  HOST_VAR_KEYS,
  API_TARGET_VAR_KEYS,
  SENSITIVE_VAR_PATTERNS,
};
