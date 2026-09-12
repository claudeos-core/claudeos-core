"use strict";

const test = require("node:test");
const assert = require("node:assert");
const path = require("node:path");
const fs = require("node:fs");
const os = require("node:os");

const {
  parseEnvContent,
  extractPort,
  extractHost,
  extractApiTarget,
  readStackEnvInfo,
  findPrimaryEnvFile,
  ENV_FILE_ORDER,
} = require("../lib/env-parser");

test("env-parser — parseEnvContent", async (t) => {
  await t.test("parses basic KEY=VALUE pairs", () => {
    const r = parseEnvContent("FOO=bar\nBAZ=qux\n");
    assert.deepEqual(r, { FOO: "bar", BAZ: "qux" });
  });

  await t.test("ignores comment lines and blank lines", () => {
    const r = parseEnvContent("# comment\n\nFOO=bar\n# another\nBAZ=qux\n");
    assert.deepEqual(r, { FOO: "bar", BAZ: "qux" });
  });

  await t.test("strips double quotes and single quotes from values", () => {
    const r = parseEnvContent(`A="hello"\nB='world'\nC=plain\n`);
    assert.deepEqual(r, { A: "hello", B: "world", C: "plain" });
  });

  await t.test("strips inline comments on unquoted values", () => {
    const r = parseEnvContent("FOO=bar # trailing comment\nBAZ=qux\n");
    assert.equal(r.FOO, "bar");
    assert.equal(r.BAZ, "qux");
  });

  await t.test("preserves '#' inside quoted values", () => {
    const r = parseEnvContent(`URL="http://x.com/#frag"\n`);
    assert.equal(r.URL, "http://x.com/#frag");
  });

  await t.test("handles `export` prefix", () => {
    const r = parseEnvContent("export FOO=bar\nexport BAZ=qux\n");
    assert.deepEqual(r, { FOO: "bar", BAZ: "qux" });
  });

  await t.test("rejects invalid key names", () => {
    const r = parseEnvContent("123FOO=bar\n-BAD=x\nGOOD=ok\n");
    assert.deepEqual(r, { GOOD: "ok" });
  });

  await t.test("handles CRLF line endings", () => {
    const r = parseEnvContent("A=1\r\nB=2\r\n");
    assert.deepEqual(r, { A: "1", B: "2" });
  });

  await t.test("handles empty content", () => {
    assert.deepEqual(parseEnvContent(""), {});
    assert.deepEqual(parseEnvContent(null), {});
    assert.deepEqual(parseEnvContent(undefined), {});
  });

  await t.test("preserves values with = inside them", () => {
    const r = parseEnvContent("CONN=key1=val1;key2=val2\n");
    assert.equal(r.CONN, "key1=val1;key2=val2");
  });
});

test("env-parser — extractPort", async (t) => {
  await t.test("finds VITE_DESKTOP_PORT (Vite custom port scenario)", () => {
    const port = extractPort({ VITE_DESKTOP_PORT: "3000", OTHER: "x" });
    assert.equal(port, 3000);
  });

  await t.test("prefers Vite-specific over generic PORT", () => {
    const port = extractPort({ PORT: "8000", VITE_PORT: "3000" });
    assert.equal(port, 3000); // VITE_PORT wins by ordering
  });

  await t.test("finds Flask FLASK_RUN_PORT", () => {
    const port = extractPort({ FLASK_RUN_PORT: "5001" });
    assert.equal(port, 5001);
  });

  await t.test("finds generic PORT as last resort", () => {
    const port = extractPort({ PORT: "4000" });
    assert.equal(port, 4000);
  });

  await t.test("returns null when no port variable present", () => {
    assert.equal(extractPort({ FOO: "bar" }), null);
    assert.equal(extractPort({}), null);
    assert.equal(extractPort(null), null);
  });

  await t.test("rejects invalid port numbers", () => {
    assert.equal(extractPort({ PORT: "abc" }), null);
    assert.equal(extractPort({ PORT: "0" }), null);
    assert.equal(extractPort({ PORT: "99999" }), null);
    assert.equal(extractPort({ PORT: "-1" }), null);
  });
});

test("env-parser — extractHost and extractApiTarget", async (t) => {
  await t.test("extracts VITE_DEV_HOST", () => {
    const host = extractHost({ VITE_DEV_HOST: "localhost" });
    assert.equal(host, "localhost");
  });

  await t.test("extracts VITE_API_TARGET", () => {
    const target = extractApiTarget({ VITE_API_TARGET: "http://localhost:8080" });
    assert.equal(target, "http://localhost:8080");
  });

  await t.test("returns null when neither present", () => {
    assert.equal(extractHost({ FOO: "bar" }), null);
    assert.equal(extractApiTarget({ FOO: "bar" }), null);
  });
});

test("env-parser — readStackEnvInfo integration", async (t) => {
  await t.test("reads .env.example (multi-port Vite scenario)", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "env-test-"));
    try {
      fs.writeFileSync(
        path.join(tmp, ".env.example"),
        [
          "# Mock multi-port Vite .env.example",
          "VITE_DEV_HOST=localhost",
          "VITE_DESKTOP_PORT=5173",
          "VITE_MOBILE_PORT=5174",
          "VITE_STORYBOOK_PORT=6006",
          "VITE_API_TARGET=http://localhost:8080",
        ].join("\n")
      );
      const info = readStackEnvInfo(tmp);
      assert.ok(info, "readStackEnvInfo should return non-null");
      assert.equal(info.source, ".env.example");
      assert.equal(info.port, 5173);
      assert.equal(info.host, "localhost");
      assert.equal(info.apiTarget, "http://localhost:8080");
      assert.equal(info.vars.VITE_MOBILE_PORT, "5174");
      assert.equal(info.vars.VITE_STORYBOOK_PORT, "6006");
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  await t.test("prefers .env.example over .env", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "env-test-"));
    try {
      fs.writeFileSync(path.join(tmp, ".env.example"), "PORT=3000\n");
      fs.writeFileSync(path.join(tmp, ".env"), "PORT=9999\n");
      const info = readStackEnvInfo(tmp);
      assert.equal(info.source, ".env.example");
      assert.equal(info.port, 3000);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  await t.test("falls back to .env when .env.example absent", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "env-test-"));
    try {
      fs.writeFileSync(path.join(tmp, ".env"), "PORT=4000\n");
      const info = readStackEnvInfo(tmp);
      assert.equal(info.source, ".env");
      assert.equal(info.port, 4000);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  await t.test("returns null when no env file exists", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "env-test-"));
    try {
      const info = readStackEnvInfo(tmp);
      assert.equal(info, null);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });
});

test("env-parser — findPrimaryEnvFile search order", async (t) => {
  await t.test(".env.example wins over .env.sample", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "env-test-"));
    try {
      fs.writeFileSync(path.join(tmp, ".env.sample"), "PORT=1111\n");
      fs.writeFileSync(path.join(tmp, ".env.example"), "PORT=2222\n");
      const found = findPrimaryEnvFile(tmp);
      assert.ok(found.endsWith(".env.example"));
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  await t.test("ENV_FILE_ORDER places committed files ahead of local files", () => {
    const envExampleIdx = ENV_FILE_ORDER.indexOf(".env.example");
    const envLocalIdx = ENV_FILE_ORDER.indexOf(".env.local");
    assert.ok(envExampleIdx < envLocalIdx, ".env.example should come before .env.local");
    const envIdx = ENV_FILE_ORDER.indexOf(".env");
    assert.ok(envExampleIdx < envIdx, ".env.example should come before .env");
  });
});

test("sensitive variable redaction", async (t) => {
  const { isSensitiveVarName, redactSensitiveVars, readStackEnvInfo } = require("../lib/env-parser");

  await t.test("isSensitiveVarName detects common secret patterns", () => {
    const sensitive = [
      "DB_PASSWORD", "password", "ADMIN_PASSWD",
      "API_KEY", "API-KEY", "apikey",
      "CLIENT_SECRET", "JWT_SECRET", "SESSION_SECRET",
      "AUTH_TOKEN", "AUTH-TOKEN", "BEARER_TOKEN",
      "AWS_SECRET_ACCESS_KEY", "ACCESS_KEY",
      "PRIVATE_KEY", "PRIVATE-KEY", "ENCRYPTION_KEY",
      "DATABASE_PASSWORD", "CREDENTIAL", "CREDENTIALS",
      "GIT_TOKEN", "GITHUB_TOKEN", "NPM_TOKEN",
      "SALT", "password_salt",
    ];
    for (const name of sensitive) {
      assert.ok(isSensitiveVarName(name), `${name} should be detected as sensitive`);
    }
  });

  await t.test("isSensitiveVarName allows normal config variables", () => {
    const safe = [
      "PORT", "HOST", "DATABASE_URL", "API_TARGET",
      "VITE_DESKTOP_PORT", "NODE_ENV", "DEBUG",
      "LOG_LEVEL", "APP_NAME", "BUILD_TARGET",
      "REDIS_HOST", "REDIS_PORT",
    ];
    for (const name of safe) {
      assert.ok(!isSensitiveVarName(name), `${name} should NOT be flagged sensitive`);
    }
  });

  await t.test("redactSensitiveVars replaces sensitive values with sentinel", () => {
    const input = {
      PORT: "3000",
      DB_PASSWORD: "supersecret",
      API_KEY: "sk-prod-abc123",
      HOST: "localhost",
      JWT_SECRET: "mytopsecretkey",
    };
    const out = redactSensitiveVars(input);
    assert.strictEqual(out.PORT, "3000");
    assert.strictEqual(out.HOST, "localhost");
    assert.strictEqual(out.DB_PASSWORD, "***REDACTED***");
    assert.strictEqual(out.API_KEY, "***REDACTED***");
    assert.strictEqual(out.JWT_SECRET, "***REDACTED***");
  });

  await t.test("redactSensitiveVars masks credentials inside URL-shaped values (DATABASE_URL, REDIS_URL, …)", () => {
    const input = {
      DATABASE_URL: "postgres://user:pass@host:5432/db?sslmode=require",
      REDIS_URL: "redis://:secret@cache.internal:6379/0",
      JDBC_URL: "jdbc:postgresql://app:pw@db.internal:5432/app",
      API_URL: "https://api.example.com/v1",
      PORT: "3000",
    };
    const out = redactSensitiveVars(input);
    assert.strictEqual(out.DATABASE_URL, "postgres://***:***@host:5432/db?sslmode=require");
    assert.strictEqual(out.REDIS_URL, "redis://***:***@cache.internal:6379/0");
    assert.strictEqual(out.JDBC_URL, "jdbc:postgresql://***:***@db.internal:5432/app", "jdbc:<driver>:// scheme must be masked too");
    assert.strictEqual(out.API_URL, "https://api.example.com/v1", "URLs without userinfo are untouched");
    assert.strictEqual(out.PORT, "3000");
  });

  await t.test("redactSensitiveVars does not mutate input", () => {
    const input = { DB_PASSWORD: "secret" };
    const out = redactSensitiveVars(input);
    assert.strictEqual(input.DB_PASSWORD, "secret");  // original intact
    assert.strictEqual(out.DB_PASSWORD, "***REDACTED***");
    assert.notStrictEqual(input, out);  // different objects
  });

  await t.test("redactSensitiveVars handles null/undefined gracefully", () => {
    assert.strictEqual(redactSensitiveVars(null), null);
    assert.strictEqual(redactSensitiveVars(undefined), undefined);
    assert.deepStrictEqual(redactSensitiveVars({}), {});
  });

  await t.test("isSensitiveVarName detects abbreviated / less common secret names", () => {
    // These names were NOT matched before: `/password/i` and `/passwd/i` miss
    // the bare `PASS` form entirely, and there was no ssh/signing key rule.
    const sensitive = [
      "DB_PASS", "MYSQL_PASS", "PASS", "pass", "REDIS-PASS", "DB_PASS_2",
      "PASSPHRASE", "KEY_PASSPHRASE",
      "SSH_KEY", "SSH-KEY", "SSHKEY",
      "SIGNING_KEY", "SIGN_KEY", "SIGNINGKEY",
    ];
    for (const name of sensitive) {
      assert.ok(isSensitiveVarName(name), `${name} should be detected as sensitive`);
    }
  });

  await t.test("abbreviated `pass` rule is segment-anchored, not a substring match", () => {
    // A bare /pass/i would redact these config values and destroy real facts.
    const safe = [
      "BYPASS_AUTH", "PASSENGER_NAME", "COMPASS_URL", "PASSTHROUGH_MODE",
    ];
    for (const name of safe) {
      assert.ok(!isSensitiveVarName(name), `${name} should NOT be flagged sensitive`);
    }
  });

  await t.test("secret-name corpus: real-world secret key names are all redacted", () => {
    const secrets = [
      "DB_PASS", "DB_PW", "ADMIN_PW", "ROOT_PW", "REDIS_PASS", "SMTP_PASS",
      "RABBITMQ_DEFAULT_PASS", "POSTGRES_PASSWORD", "MYSQL_ROOT_PASSWORD",
      "MONGO_INITDB_ROOT_PASSWORD", "LDAP_BIND_PASSWORD", "KEYSTORE_PASSWORD",
      "TRUSTSTORE_PASSWORD", "SSL_KEY_PASSWORD", "PASSPHRASE", "PEPPER",
      "SECRET_KEY_BASE", "DJANGO_SECRET_KEY", "NEXTAUTH_SECRET", "COOKIE_SECRET",
      "OAUTH_CLIENT_SECRET", "HMAC_SECRET", "WEBHOOK_SECRET", "CSRF_SECRET",
      "STRIPE_SECRET_KEY", "SENDGRID_API_KEY", "AWS_ACCESS_KEY_ID",
      "GCP_SERVICE_ACCOUNT_KEY", "GOOGLE_APPLICATION_CREDENTIALS",
      "SLACK_BOT_TOKEN", "REFRESH_TOKEN", "PRIVATE_TOKEN", "VAPID_PRIVATE_KEY",
      "SSH_KEY", "SSH_PRIVATE_KEY", "DEPLOY_KEY", "MASTER_KEY", "LICENSE_KEY",
      "FCM_SERVER_KEY", "SIGNING_KEY", "JWT_SIGNING_KEY", "DATA_ENCRYPTION_KEY",
      "RECAPTCHA_SECRET_KEY", "BASIC_AUTH_PASSWORD", "PASSWORD_SALT",
      "KEYSTORE_PASSPHRASE", "PASSWORD_PEPPER", "SSH_KEY_PATH",
      "SERVICE_ACCOUNT", "SERVICE_ACCOUNT_JSON", "SERVICE_ACCOUNT_KEY_PATH",
    ];
    for (const name of secrets) {
      assert.ok(isSensitiveVarName(name), `${name} must be redacted`);
    }
  });

  await t.test("benign-name corpus: architecture facts survive redaction", () => {
    // These carry information the generated docs depend on. A blanket
    // `key` / `pass` rule would destroy them — see the comments on
    // SENSITIVE_VAR_PATTERNS before widening anything.
    const benign = [
      "ROUTING_KEY", "PARTITION_KEY", "SORT_KEY", "IDEMPOTENCY_KEY",
      "FOREIGN_KEY_CHECKS", "KEY_PREFIX", "CACHE_KEY_PREFIX", "KEY_ALGORITHM",
      "MASTER_KEYSPACE", "MASTER_HOST", "SERVER_KEYSTORE_PATH", "SERVER_NAME",
      "SERVICE_NAME", "SERVICE_PORT", "DEPLOY_ENV", "DEPLOY_TARGET",
      "LICENSE_URL", "BYPASS_AUTH", "BYPASS_CACHE", "PASSENGER_APP_ENV",
      "COMPASS_URL", "ENCOMPASS_ID", "PASSIVE_MODE", "SURPASS_LIMIT",
      "HARDWARE_ID", "KEYCLOAK_REALM", "DESIGN_SYSTEM", "ASSIGNEE",
      "POWER_MODE", "SPAWN_RATE",
      // Anchor regressions found in review round 2: each of these was
      // redacted by an unanchored pattern before the anchors were added.
      "SERVICE_ACCOUNT_EMAIL", "SERVICE_ACCOUNT_NAME", "SERVICE_ACCOUNT_ID",
      "SSH_KEYSCAN_HOSTS", "SSH_KNOWN_HOSTS", "PEPPER_ROUNDS",
      "SERVER_KEYS_DIR", "PWD", "OLDPWD",
    ];
    for (const name of benign) {
      assert.ok(!isSensitiveVarName(name), `${name} must NOT be redacted`);
    }
  });

  await t.test("accepted over-match: a leading PASS_ segment is redacted (documented trade-off)", () => {
    // `PASS_RATE=0.95` loses one config fact. Narrowing the rule to a
    // trailing segment would drop `DB_PASS_2` / `PASS_FILE` and leak a live
    // credential instead. This test exists so the trade-off is deliberate,
    // not rediscovered as a "bug" and narrowed into a leak.
    assert.ok(isSensitiveVarName("PASS_RATE"));
  });

  await t.test("redactSensitiveVars redacts DB_PASS (v2.5.0 leak: written verbatim to project-analysis.json)", () => {
    const input = {
      DATABASE_URL: "postgres://appuser:s3cr3t@db.internal:5432/app",
      DB_PASS: "hunter2",
      SERVER_PORT: "8081",
    };
    const out = redactSensitiveVars(input);
    assert.strictEqual(out.DB_PASS, "***REDACTED***");
    // Unchanged behaviour around it: URL userinfo masked, plain config kept.
    assert.strictEqual(out.DATABASE_URL, "postgres://***:***@db.internal:5432/app");
    assert.strictEqual(out.SERVER_PORT, "8081");
  });

  await t.test("readStackEnvInfo end-to-end redacts secrets", () => {
    const os = require("node:os");
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "redact-e2e-"));
    try {
      fs.writeFileSync(path.join(tmp, ".env.example"),
        "PORT=3000\n" +
        "DB_PASSWORD=realsecret\n" +
        "API_KEY=sk-abc\n" +
        "HOST=example.com\n"
      );
      const info = readStackEnvInfo(tmp);
      assert.strictEqual(info.port, 3000);
      assert.strictEqual(info.host, "example.com");
      assert.strictEqual(info.vars.PORT, "3000");
      assert.strictEqual(info.vars.HOST, "example.com");
      assert.strictEqual(info.vars.DB_PASSWORD, "***REDACTED***");
      assert.strictEqual(info.vars.API_KEY, "***REDACTED***");
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  await t.test("extractPort still works when PORT name variants are non-sensitive", () => {
    // Critical: redaction does not break port/host/apiTarget extraction
    const { extractPort, extractHost, extractApiTarget } = require("../lib/env-parser");
    const vars = {
      VITE_DESKTOP_PORT: "3000",
      DB_PASSWORD: "***REDACTED***",  // simulating post-redaction state
      VITE_API_TARGET: "http://api",
    };
    assert.strictEqual(extractPort(vars), 3000);
    assert.strictEqual(extractApiTarget(vars), "http://api");
  });
});

// ─── v2.5.0: credential masking must survive punctuation in passwords ──
test("maskUrlCredentials masks passwords containing @, Go DSNs, and never rewrites @ that sits in a path, query, mailto or plain value", () => {
  const { maskUrlCredentials } = require("../lib/env-parser");
  assert.strictEqual(maskUrlCredentials("postgres://app:p@ss@db:5432/app"), "postgres://***:***@db:5432/app", "password with @");
  // v2.5.2 — a raw "/" inside a password cannot be rewritten in place without
  // risking the host, but leaving the value verbatim leaked the password into
  // project-analysis.json (the key is DATABASE_URL, so the key-name rule does
  // not backstop it). The whole value is dropped instead. Superseded the
  // v2.5.0 "left alone" assertion deliberately.
  assert.strictEqual(maskUrlCredentials("postgres://app:pa/ss@db:5432/app"), "***REDACTED***");
  assert.strictEqual(maskUrlCredentials("https://cdn.jsdelivr.net/npm/@scope/pkg"), "https://cdn.jsdelivr.net/npm/@scope/pkg", "scoped package path");
  assert.strictEqual(maskUrlCredentials("https://api.example.com/users/@me"), "https://api.example.com/users/@me", "@ in path");
  assert.strictEqual(maskUrlCredentials("https://host:8080/path/@x"), "https://host:8080/path/@x", "port before path with @");
  assert.strictEqual(maskUrlCredentials("mailto:ops@example.com"), "mailto:ops@example.com", "mailto is not a DSN");
  assert.strictEqual(maskUrlCredentials("0:30@daily"), "0:30@daily", "cron-ish value is not a DSN");
  assert.strictEqual(maskUrlCredentials("postgres://app:p@ss@db:5432/app?sslmode=require"), "postgres://***:***@db:5432/app?sslmode=require");
  assert.strictEqual(maskUrlCredentials("app:secret@tcp(db:3306)/app"), "***:***@tcp(db:3306)/app", "Go/MySQL DSN without scheme");
  assert.strictEqual(maskUrlCredentials("user:pw@smtp.internal:587"), "user:pw@smtp.internal:587", "generic a:b@c is NOT rewritten (only the Go tcp()/unix() DSN shape is)");
  assert.strictEqual(maskUrlCredentials("app:secret@unix(/var/run/mysqld.sock)/app"), "***:***@unix(/var/run/mysqld.sock)/app");
  assert.strictEqual(maskUrlCredentials("https://api.example.com/v1?redirect=user@host"), "https://api.example.com/v1?redirect=user@host", "@ in query string is not userinfo");
  assert.strictEqual(maskUrlCredentials("ops@example.com"), "ops@example.com", "plain e-mail untouched");
  assert.strictEqual(maskUrlCredentials("jdbc:mysql://root:r@@t@db/app"), "jdbc:mysql://***:***@db/app");
  // Credentials carried as connection parameters (JDBC / Mongo / SQL Server / token query params)
  assert.strictEqual(maskUrlCredentials("jdbc:postgresql://db:5432/app?user=app&password=s3cret"), "jdbc:postgresql://db:5432/app?user=app&password=***");
  assert.strictEqual(maskUrlCredentials("mongodb://host/db?authSource=admin&password=x"), "mongodb://host/db?authSource=admin&password=***");
  assert.strictEqual(maskUrlCredentials("sqlserver://host;databaseName=app;user=sa;password=x"), "sqlserver://host;databaseName=app;user=sa;password=***");
  assert.strictEqual(maskUrlCredentials("https://api.example.com/v1?token=abc&page=2"), "https://api.example.com/v1?token=***&page=2");
  assert.strictEqual(maskUrlCredentials("user:p@ss@tcp(h:3306)/db"), "***:***@tcp(h:3306)/db", "Go DSN password containing @");
});

// ─── v2.5.2: last-resort backstop for userinfo holding a raw RFC-3986 delimiter ──
test("hasUnmaskedUrlCredentials flags only the shapes the userinfo rule cannot reach", () => {
  const { hasUnmaskedUrlCredentials: H, maskUrlCredentials } = require("../lib/env-parser");

  // Flagged: the authority looks like `user:password` and the real `@` sits
  // past the first `/`, `?` or `#` — the masking regex was forced to stop early.
  for (const v of [
    "postgres://u:p/w@host/db",            // raw "/" in password
    "redis://:pw?x@host/0",                // raw "?" in password, empty user
    "mysql://root:a/b/c@db:3306/app",      // several raw "/"
    "postgres://app:pa#ss@db/app",         // raw "#"
    "postgres://app:Zm9v/YmFy@db:5432/app", // base64-generated password
  ]) {
    assert.strictEqual(H(v), true, `should flag: ${v}`);
    assert.strictEqual(maskUrlCredentials(v), "***REDACTED***", `should redact whole: ${v}`);
  }

  // Not flagged — every one of these is either already masked by the userinfo
  // rule, or an "@" that legitimately belongs to a path/query.
  for (const v of [
    "postgres://u:p@host/db",                 // masking handles it
    "postgres://app:p@ss@db:5432/app",        // "@" in password, still in authority
    "https://cdn.jsdelivr.net/npm/@scope/pkg", // scoped npm path
    "https://api.example.com/users/@me",      // "@" in path
    "https://host:8080/path/@x",              // host:port, not user:password
    "http://a.com:8080/img/@2x.png",          // ditto
    "https://api.example.com/v1?redirect=user@host", // "@" in query
    "https://user@host/path",                 // user, no password
    "mailto:ops@example.com",                 // not a DSN
    "jdbc:postgresql://db:5432/app?user=app&password=s3cret", // PARAM_RE handles it
  ]) {
    assert.strictEqual(H(v), false, `should NOT flag: ${v}`);
  }

  // The masking rule still wins where it applies: only values whose
  // authority it could NOT mask are candidates for the whole-value drop.
  assert.strictEqual(maskUrlCredentials("postgres://app:p@ss@db:5432/app"), "postgres://***:***@db:5432/app");
  assert.strictEqual(maskUrlCredentials("https://host:8080/path/@x"), "https://host:8080/path/@x");
  // A masked userinfo plus an "@" later in the path must NOT trip the backstop.
  assert.strictEqual(maskUrlCredentials("postgres://u:p@host/path/@x"), "postgres://***:***@host/path/@x");

  // The backstop is gated on the userinfo rule not firing — not on "did the
  // value change at all". PARAM_RE rewriting a query parameter on the same
  // value must not let the raw-delimiter password through.
  assert.strictEqual(maskUrlCredentials("postgres://app:pa/ss@db:5432/app?token=abc"), "***REDACTED***");
  assert.strictEqual(maskUrlCredentials("postgres://app:pa/ss@db:5432/app?sslmode=require&password=x"), "***REDACTED***");
});

test("readStackEnvInfo reports the dropped keys by name", (t) => {
  const os = require("os"), fs = require("fs"), pathMod = require("path");
  const { readStackEnvInfo } = require("../lib/env-parser");
  const dir = fs.mkdtempSync(pathMod.join(os.tmpdir(), "envwarn-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  fs.writeFileSync(pathMod.join(dir, ".env"), [
    "DATABASE_URL=postgres://app:pa/ss@db:5432/app",
    "REDIS_URL=redis://cache:6379/0",
    "SERVER_PORT=8080",
    "DB_PASSWORD=hunter2",
  ].join("\n"));

  const info = readStackEnvInfo(dir);
  assert.deepStrictEqual(info.credentialWarnings, ["DATABASE_URL"], "names the key, and only that key");
  assert.strictEqual(info.vars.DATABASE_URL, "***REDACTED***");
  assert.strictEqual(info.vars.REDIS_URL, "redis://cache:6379/0", "credential-free URL untouched");

  // Warning must never echo any part of the value.
  const blob = JSON.stringify(info);
  assert.ok(!blob.includes("pa/ss") && !blob.includes("hunter2"), "no secret material anywhere in envInfo");

  // Port resolution is unaffected by the drop, and still reads the raw map.
  assert.strictEqual(info.port, 8080);
});

// ─── v2.5.2 regression: the credential backstop's own threat model ───────────
//
// The first cut of `hasUnmaskedUrlCredentials` guessed from the TRUNCATED
// authority — the text before the first `/?#` — and returned false when the
// part after its `:` was all digits, on the reasoning that `host:port` is not
// `user:password`. For `postgres://user:12345/6@db/app` the truncated
// authority is `user:12345`, whose tail IS all digits, so a password that
// merely BEGINS with digits was waved straight through. Base64-generated
// passwords do that routinely, and `isSensitiveVarName("DATABASE_URL")` is
// false, so nothing else backstopped it.
test("the backstop catches passwords the userinfo rule cannot reach", () => {
  const { maskUrlCredentials: M } = require("../lib/env-parser");
  for (const v of [
    "postgres://user:12345/6@db.internal:5432/app", // digit-leading password
    "mysql://root:8080/x@h/d",                      // password that looks like a port
    "redis://:1234/abc@r:6379/0",                   // empty user, digit-leading
    "postgres://u:pa ss@host/db",                   // space (userinfo rule excludes \s)
    "postgres://app:pa/ss@db:5432/app",             // raw "/"
    "postgres://app:pa/ss@db:5432/app?token=abc",   // ...with a query PARAM_RE rewrites
    "redis://:pw?x@host/0",                         // raw "?"
    "postgres://app:pa#ss@db/app",                  // raw "#"
    "amqp://guest:gu/est@rabbit:5672/",
    "mongodb+srv://u:p/w@cluster.mongodb.net/db",
    "https://user:pa/ss@host/x",                    // web scheme, head is not host:port
  ]) {
    assert.strictEqual(M(v), "***REDACTED***", `should redact whole: ${v}`);
  }
});

test("the backstop never destroys a credential-free URL", () => {
  const { maskUrlCredentials: M } = require("../lib/env-parser");
  for (const v of [
    "postgres://u:p@host/db",                       // the userinfo rule handles it
    "postgres://u:p@host/path/@x",                  // ...plus an "@" in the path
    "https://cdn.jsdelivr.net/npm/@scope/pkg",      // scoped npm path
    "http://a.com:8080/img/@2x.png",                // web scheme, complete host:port
    "http://[::1]:8080/img/@2x.png",                // bracketed IPv6 is a host
    "http://[2001:db8::1]:8080/health",
    "mongodb://host:port/db?authSource=admin&x=a@b", // the "@" sits in the query
    "mongodb://h1:27017,h2:27017/db?opt=a@b",        // replica set, "@" in query
    "https://api.internal:${PORT}/v1/@me",           // unexpanded template
    "https://example.com:443/redirect?to=https://other.com/@x",
    "file:///c:/data/app.db",
    "jdbc:oracle:thin:@//host:1521/ORCL",
  ]) {
    assert.notStrictEqual(M(v), "***REDACTED***", `must not redact whole: ${v}`);
  }
  // Ordinary masking is untouched.
  assert.strictEqual(M("postgres://u:p@host/db"), "postgres://***:***@host/db");
  assert.strictEqual(M("postgres://app:p@ss@db:5432/app"), "postgres://***:***@db:5432/app");
});

test("host and apiTarget never carry the redaction sentinel", (t) => {
  const os2 = require("os"), fs2 = require("fs"), path2 = require("path");
  const { readStackEnvInfo } = require("../lib/env-parser");
  const dir = fs2.mkdtempSync(path2.join(os2.tmpdir(), "envsent-"));
  t.after(() => fs2.rmSync(dir, { recursive: true, force: true }));
  fs2.writeFileSync(path2.join(dir, ".env.example"),
    "API_TARGET=http://svc:p/w@api.internal/v1\nHOST=http://h:p/w@real.host/x\n");

  const info = readStackEnvInfo(dir);
  // These two are rendered straight into CLAUDE.md §3, and the scaffold's only
  // sentinel guard covers `envInfo.vars`. Null makes the row simply absent.
  assert.strictEqual(info.apiTarget, null);
  assert.strictEqual(info.host, null);
  // The warning still names both keys so the loss is not silent.
  assert.deepStrictEqual(info.credentialWarnings.sort(), ["API_TARGET", "HOST"]);
});

// ─── v2.5.2 regression: the backstop must always terminate ──────────────────
//
// `String.prototype.lastIndexOf` clamps a negative `fromIndex` to 0 instead of
// returning -1, so a backward scan written as
// `for (i = s.lastIndexOf("@"); i !== -1; i = s.lastIndexOf("@", i - 1))`
// re-finds an "@" at index 0 forever. That hung `init` at 100% CPU with no
// error and no output — strictly worse than reporting a wrong value.
test("the credential backstop terminates on every input shape", () => {
  const { hasUnmaskedUrlCredentials: H, maskUrlCredentials: M } = require("../lib/env-parser");
  const started = Date.now();
  for (const v of [
    "postgres://@ :x",      // "@" at index 0, fails the host test, head holds ":"
    "postgres://@\t:x",
    "redis://@ :p",
    "postgres://@", "postgres://@:", "postgres://:@", "postgres://@@", "postgres://",
    "postgres://@host/db",  // empty userinfo: real, and not a credential
  ]) {
    assert.strictEqual(typeof H(v), "boolean", `must return for: ${v}`);
    assert.strictEqual(typeof M(v), "string", `must return for: ${v}`);
  }
  assert.ok(Date.now() - started < 2000, "must not spin");
  assert.strictEqual(M("postgres://@host/db"), "postgres://***:***@host/db");
});

// A DSN that also carries an "@" inside a query parameter (an email address, a
// redirect URL) must not defeat the backstop. The scan has to `continue` past
// that "@" to the earlier one that terminates the real authority, not abandon
// the search with `return false`.
test("an @ in a query string does not disable the backstop", () => {
  const { maskUrlCredentials: M } = require("../lib/env-parser");
  for (const v of [
    "postgres://app:pa/ss@db:5432/app?redirect=user@host",
    "mongodb://user:p/w@cluster.example.net:27017/db?authSource=admin&x=a@b",
    "postgres://user:12345/6@db.internal:5432/app?opt=a@b",
  ]) {
    assert.strictEqual(M(v), "***REDACTED***", `should redact whole: ${v}`);
  }
  // ...while a credential-free DSN whose query merely holds an "@" is kept.
  for (const v of [
    "mongodb://host:port/db?authSource=admin&x=a@b",
    "mongodb://h1:27017,h2:27017/db?opt=a@b",
    "https://api.example.com/v1?redirect=user@host",
  ]) {
    assert.notStrictEqual(M(v), "***REDACTED***", `must not redact: ${v}`);
  }
});

// ─── v2.5.3: Oracle JDBC DSN credentials ─────────────────────────────────────
//
// `jdbc:oracle:thin:user/pw@…` carries credentials before the connect
// descriptor, not as URL userinfo. The `://` gate never matched it, the
// scheme-less branch only knows the Go/MySQL `@tcp(` shape, and neither
// SPRING_DATASOURCE_URL nor JDBC_URL trips a key-name rule — so v2.5.0–2.5.2
// wrote the password verbatim into project-analysis.json. Standard shape in
// the pre-Boot SI trees v2.5.1 opened up.
test("v2.5.3: Oracle thin/oci DSN credentials are masked, descriptor kept", () => {
  const { maskUrlCredentials: M } = require("../lib/env-parser");
  const cases = [
    ["jdbc:oracle:thin:scott/tiger@//dbhost:1521/ORCL", "jdbc:oracle:thin:***/***@//dbhost:1521/ORCL"],   // EZConnect
    ["jdbc:oracle:thin:scott/tiger@dbhost:1521:ORCL", "jdbc:oracle:thin:***/***@dbhost:1521:ORCL"],       // SID form
    ["jdbc:oracle:thin:scott/tiger@(DESCRIPTION=(ADDRESS=(HOST=h)))", "jdbc:oracle:thin:***/***@(DESCRIPTION=(ADDRESS=(HOST=h)))"],
    ["jdbc:oracle:oci:scott/tiger@PRODTNS", "jdbc:oracle:oci:***/***@PRODTNS"],
    ["jdbc:oracle:oci8:scott/tiger@PRODTNS", "jdbc:oracle:oci8:***/***@PRODTNS"],
    ["JDBC:ORACLE:THIN:SCOTT/TIGER@//h:1521/X", "JDBC:ORACLE:THIN:***/***@//h:1521/X"],                  // case-insensitive
    ["jdbc:oracle:thin:scott/p/w@//h/X", "jdbc:oracle:thin:***/***@//h/X"],                              // `/` in password
    ["jdbc:oracle:thin:scott/ti@ger@//h/X", "jdbc:oracle:thin:***/***@//h/X"],                           // `@` in password, EZConnect anchor
    ["jdbc:oracle:thin:scott/ti@ger@(DESCRIPTION=x)", "jdbc:oracle:thin:***/***@(DESCRIPTION=x)"],       // `@` in password, TNS anchor
  ];
  for (const [input, expected] of cases) {
    assert.strictEqual(M(input), expected, `mask: ${input}`);
  }
});

test("v2.5.3: credential-free Oracle DSNs and parameter-form credentials are unchanged / handled by PARAM_RE", () => {
  const { maskUrlCredentials: M } = require("../lib/env-parser");
  for (const v of [
    "jdbc:oracle:thin:@//dbhost:1521/ORCL",
    "jdbc:oracle:thin:@dbhost:1521:ORCL",
    "jdbc:oracle:thin:@(DESCRIPTION=(ADDRESS=(HOST=h)))",
    "jdbc:oracle:oci:@PRODTNS",
  ]) {
    assert.strictEqual(M(v), v, `must not touch: ${v}`);
  }
  assert.strictEqual(
    M("jdbc:oracle:thin:@//h/X?user=scott&password=tiger"),
    "jdbc:oracle:thin:@//h/X?user=scott&password=***",
  );
});

test("v2.5.3: Oracle rule does not disturb the URL, DSN, or scheme-less branches", () => {
  const { maskUrlCredentials: M } = require("../lib/env-parser");
  assert.strictEqual(M("postgres://app:pa/ss@db:5432/app"), "***REDACTED***");
  assert.strictEqual(M("jdbc:postgresql://db/app?user=a&password=b"), "jdbc:postgresql://db/app?user=a&password=***");
  assert.strictEqual(M("jdbc:mysql://u:p@h:3306/db"), "jdbc:mysql://***:***@h:3306/db");
  assert.strictEqual(M("u:p@tcp(h:3306)/db"), "***:***@tcp(h:3306)/db");
  assert.strictEqual(M("https://cdn.example.com/npm/@scope/pkg"), "https://cdn.example.com/npm/@scope/pkg");
  assert.strictEqual(M("mailto:ops@example.com"), "mailto:ops@example.com");
});

test("v2.5.3: Oracle DSN under SPRING_DATASOURCE_URL is masked through redactSensitiveVars", () => {
  const { redactSensitiveVars } = require("../lib/env-parser");
  const out = redactSensitiveVars({ SPRING_DATASOURCE_URL: "jdbc:oracle:thin:scott/tiger@//ora.internal:1521/ORCL", PORT: "8080" });
  assert.strictEqual(out.SPRING_DATASOURCE_URL, "jdbc:oracle:thin:***/***@//ora.internal:1521/ORCL");
  assert.ok(!JSON.stringify(out).includes("tiger"), "password must not survive anywhere");
  assert.strictEqual(out.PORT, "8080");
});

// ─── v2.5.3 review fixes: the Oracle branch must not be an escape hatch ──────
//
// Two gaps found by diffing the v2.5.3 working tree against v2.5.2 over a
// 35-value corpus: returning straight from the Oracle branch skipped the
// parameter rule, and every shape the Oracle anchor could not resolve fell
// through to the `://` gate — which cannot see an Oracle DSN either — and
// travelled to project-analysis.json verbatim.

test("v2.5.3: the parameter rule still runs on a masked Oracle DSN", () => {
  const { maskUrlCredentials: M } = require("../lib/env-parser");
  assert.strictEqual(
    M("jdbc:oracle:thin:scott/tiger@//h:1521/X?password=tiger"),
    "jdbc:oracle:thin:***/***@//h:1521/X?password=***",
  );
  // A non-credential property is untouched.
  assert.strictEqual(
    M("jdbc:oracle:thin:scott/tiger@//h:1521/X?oracle.jdbc.ReadTimeout=1000"),
    "jdbc:oracle:thin:***/***@//h:1521/X?oracle.jdbc.ReadTimeout=1000",
  );
});

test("v2.5.3: an Oracle DSN whose credential boundary cannot be located is dropped WHOLE", () => {
  const { maskUrlCredentials: M } = require("../lib/env-parser");
  for (const v of [
    "jdbc:oracle:thin:usr@tenancy/tiger@//h:1521/X",  // `@` in the user (Oracle Cloud / IAM shape)
    "jdbc:oracle:thin:/tiger@//h/X",                  // no user segment
    "jdbc:oracle:thin:scott/tiger@",                  // no descriptor after the `@`
  ]) {
    assert.strictEqual(M(v), "***REDACTED***", `must be dropped whole: ${v}`);
  }
});

test("v2.5.3: the whole-value drop does not swallow credential-free Oracle values", () => {
  const { maskUrlCredentials: M } = require("../lib/env-parser");
  for (const v of [
    "jdbc:oracle:thin:@//h:1521/X",
    "jdbc:oracle:thin:@h:1521:SID",
    "jdbc:oracle:thin:@(DESCRIPTION=(ADDRESS=(HOST=h)))",
    "jdbc:oracle:oci:@PRODTNS",
    "jdbc:oracle:thin:@tnsalias?TNS_ADMIN=/opt/wallet",
    "jdbc:oracle:thin:@ldap://oid:389/cn=x,cn=OracleContext",
    "jdbc:oracle:thin:PRODTNS",                       // alias only: no `/`, no `@`
  ]) {
    assert.strictEqual(M(v), v, `must not touch: ${v}`);
  }
});

test("v2.5.3: a dropped Oracle value is named in credentialWarnings, not silently swallowed", () => {
  const { readStackEnvInfo } = require("../lib/env-parser");
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccore-env-oracle-"));
  try {
    fs.writeFileSync(path.join(dir, ".env.example"),
      "ORACLE_IAM_URL=jdbc:oracle:thin:usr@tenancy/tiger@//ora:1521/PRD\n" +
      "OK_URL=jdbc:oracle:thin:scott/tiger@//ora:1521/ORCL\n" +
      "PORT=8080\n");
    const info = readStackEnvInfo(dir);
    assert.strictEqual(info.vars.ORACLE_IAM_URL, "***REDACTED***");
    assert.strictEqual(info.vars.OK_URL, "jdbc:oracle:thin:***/***@//ora:1521/ORCL");
    assert.deepStrictEqual(info.credentialWarnings, ["ORACLE_IAM_URL"]);
    assert.ok(!JSON.stringify(info).includes("tiger"), "the password must not survive anywhere");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
