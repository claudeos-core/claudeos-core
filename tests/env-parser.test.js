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

  await t.test("redactSensitiveVars preserves DATABASE_URL (documented whitelist)", () => {
    // DATABASE_URL contains credentials but is kept for stack-detector back-compat
    const input = { DATABASE_URL: "postgres://user:pass@host/db" };
    const out = redactSensitiveVars(input);
    assert.strictEqual(out.DATABASE_URL, "postgres://user:pass@host/db");
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
