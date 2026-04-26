/**
 * Tests for plan-installer/pass3-context-builder.js
 *
 * Covers:
 *   - null return when project-analysis.json missing
 *   - happy path with representative analysis + pass2-merged
 *   - pass2-merged size signals (small vs large)
 *   - malformed pass2-merged.json (still returns valid context)
 *   - domain summarization projects only universal fields
 */

const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");

const { buildPass3Context, describePass2, summarizeDomains } = require("../plan-installer/pass3-context-builder");

function makeTmp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "claudeos-pass3ctx-"));
}

function rm(dir) {
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch (_e) { /* best-effort */ }
}

test("buildPass3Context — returns null when project-analysis.json missing", () => {
  const tmp = makeTmp();
  try {
    const result = buildPass3Context(tmp);
    assert.strictEqual(result, null);
  } finally { rm(tmp); }
});

test("buildPass3Context — returns null when project-analysis.json is malformed", () => {
  const tmp = makeTmp();
  try {
    fs.writeFileSync(path.join(tmp, "project-analysis.json"), "{ not valid json");
    const result = buildPass3Context(tmp);
    assert.strictEqual(result, null);
  } finally { rm(tmp); }
});

test("buildPass3Context — happy path produces slim structured context", () => {
  const tmp = makeTmp();
  try {
    const analysis = {
      analyzedAt: "2026-04-20T00:00:00Z",
      lang: "ko",
      stack: {
        language: "kotlin",
        languageVersion: "1.9.20",
        framework: "spring-boot",
        frameworkVersion: "3.2.0",
        buildTool: "gradle",
        packageManager: null,
        database: "postgresql",
        orm: "exposed",
        frontend: null,
        multiModule: true,
        modules: ["reservation-command-server", "reservation-query-server", "bff-web"],
        architecture: "cqrs",
        detected: ["kotlin", "spring-boot", "cqrs", "bff"],
        port: 8080,
      },
      templates: { backend: "kotlin-spring", frontend: null },
      isMultiStack: false,
      rootPackage: "com.example.reservation",
      backendDomains: [
        { name: "reservation", type: "backend", totalFiles: 42, controllers: 3, services: 5, serverType: "command" },
        { name: "reservation-query", type: "backend", totalFiles: 28, controllers: 2, services: 3, serverType: "query" },
      ],
      frontendDomains: [],
      frontend: { exists: false },
      summary: { totalDomains: 2, backendDomains: 2, frontendDomains: 0, totalFiles: 70 },
      activeDomains: {
        "00.core": true, "10.backend": true, "20.frontend": false,
        "30.security-db": true, "40.infra": true, "80.verification": true, "90.optional": true,
      },
    };
    fs.writeFileSync(path.join(tmp, "project-analysis.json"), JSON.stringify(analysis));

    // Small pass2-merged.json for size signal test
    const pass2 = { universalPatterns: {}, responseFlow: { layer: "Aggregator" } };
    fs.writeFileSync(path.join(tmp, "pass2-merged.json"), JSON.stringify(pass2));

    const ctx = buildPass3Context(tmp);
    assert.ok(ctx, "expected non-null context");
    assert.strictEqual(ctx._schemaVersion, 1);

    // Stack projection
    assert.strictEqual(ctx.stack.language, "kotlin");
    assert.strictEqual(ctx.stack.buildTool, "gradle");
    assert.strictEqual(ctx.stack.orm, "exposed");
    assert.strictEqual(ctx.stack.port, 8080);

    // Architecture flags derived
    assert.strictEqual(ctx.architecture.cqrs, true);
    assert.strictEqual(ctx.architecture.bff, true);
    assert.strictEqual(ctx.architecture.multiModule, true);
    assert.deepStrictEqual(ctx.architecture.modules, [
      "reservation-command-server", "reservation-query-server", "bff-web",
    ]);
    assert.strictEqual(ctx.architecture.rootPackage, "com.example.reservation");

    // Domain summary projected (only universal fields kept, no raw dump)
    assert.strictEqual(ctx.backendDomains.length, 2);
    assert.strictEqual(ctx.backendDomains[0].name, "reservation");
    assert.strictEqual(ctx.backendDomains[0].serverType, "command");
    assert.strictEqual(ctx.backendDomains[0].totalFiles, 42);

    // pass2 descriptor populated
    assert.strictEqual(ctx.pass2Merged.exists, true);
    assert.ok(ctx.pass2Merged.topLevelKeys.includes("universalPatterns"));
    assert.strictEqual(ctx.pass2Merged.large, false);

    // needsPass2 slot exists for fields pass2-merged is authoritative for
    assert.ok(Object.prototype.hasOwnProperty.call(ctx, "needsPass2"));
    assert.strictEqual(ctx.needsPass2.responseWrapperLayer, null);

    // Total size under 5 KB (core design goal)
    const serialized = JSON.stringify(ctx);
    assert.ok(serialized.length < 5 * 1024, `context serialization too large: ${serialized.length} bytes`);
  } finally { rm(tmp); }
});

test("describePass2 — flags large pass2-merged as large:true", () => {
  const tmp = makeTmp();
  try {
    const bigPath = path.join(tmp, "pass2-merged.json");
    // 400 KB of padding inside a valid JSON.
    const bigObj = { padding: "x".repeat(400 * 1024) };
    fs.writeFileSync(bigPath, JSON.stringify(bigObj));
    const desc = describePass2(bigPath);
    assert.strictEqual(desc.exists, true);
    assert.strictEqual(desc.large, true);
    assert.ok(desc.sizeKB >= 300);
  } finally { rm(tmp); }
});

test("describePass2 — returns valid descriptor when file is missing", () => {
  const desc = describePass2(path.join(os.tmpdir(), "does-not-exist-" + Date.now() + ".json"));
  assert.strictEqual(desc.exists, false);
  assert.strictEqual(desc.sizeBytes, 0);
  assert.strictEqual(desc.large, false);
  assert.deepStrictEqual(desc.topLevelKeys, []);
});

test("describePass2 — handles malformed JSON gracefully (size reported, keys empty)", () => {
  const tmp = makeTmp();
  try {
    const bad = path.join(tmp, "pass2-merged.json");
    fs.writeFileSync(bad, "{ not valid json but has content");
    const desc = describePass2(bad);
    assert.strictEqual(desc.exists, true);
    assert.ok(desc.sizeBytes > 0);
    assert.deepStrictEqual(desc.topLevelKeys, []);
  } finally { rm(tmp); }
});

test("summarizeDomains — returns empty array for non-array input", () => {
  assert.deepStrictEqual(summarizeDomains(null), []);
  assert.deepStrictEqual(summarizeDomains(undefined), []);
  assert.deepStrictEqual(summarizeDomains({}), []);
  assert.deepStrictEqual(summarizeDomains("string"), []);
});

test("summarizeDomains — projects only defined scanner-specific fields", () => {
  const domains = [
    { name: "order", type: "backend", totalFiles: 15, controllers: 2, services: 4, pattern: "B" },
    { name: "dashboard", type: "frontend", totalFiles: 8, pages: 3, components: 12 },
    { name: "admin", type: "backend", totalFiles: 0 }, // all optionals missing
  ];
  const result = summarizeDomains(domains);
  assert.strictEqual(result.length, 3);

  // Backend Java-ish
  assert.strictEqual(result[0].controllers, 2);
  assert.strictEqual(result[0].pattern, "B");
  assert.ok(!("pages" in result[0]), "unrelated field should not appear");

  // Frontend
  assert.strictEqual(result[1].pages, 3);
  assert.strictEqual(result[1].components, 12);
  assert.ok(!("controllers" in result[1]));

  // Sparse
  assert.strictEqual(result[2].totalFiles, 0);
  assert.ok(!("controllers" in result[2]));
  assert.ok(!("pattern" in result[2]));
});

test("buildPass3Context — handles frontend-only project (no backend domains)", () => {
  const tmp = makeTmp();
  try {
    const analysis = {
      stack: { language: "typescript", framework: "vite", frontend: "react", port: 5173 },
      templates: { backend: null, frontend: "node-vite" },
      isMultiStack: false,
      backendDomains: [],
      frontendDomains: [
        { name: "dashboard", type: "frontend", totalFiles: 12, pages: 4, components: 15 },
      ],
      frontend: { exists: true, components: 15, pages: 4, hooks: 6 },
      summary: { totalDomains: 1, backendDomains: 0, frontendDomains: 1, totalFiles: 12 },
      activeDomains: { "00.core": true, "10.backend": false, "20.frontend": true },
    };
    fs.writeFileSync(path.join(tmp, "project-analysis.json"), JSON.stringify(analysis));

    const ctx = buildPass3Context(tmp);
    assert.ok(ctx);
    assert.strictEqual(ctx.stack.language, "typescript");
    assert.strictEqual(ctx.stack.frontend, "react");
    assert.strictEqual(ctx.architecture.cqrs, false);
    assert.strictEqual(ctx.architecture.bff, false);
    assert.strictEqual(ctx.architecture.multiModule, false);
    assert.strictEqual(ctx.domainCount.backend, 0);
    assert.strictEqual(ctx.domainCount.frontend, 1);
    assert.strictEqual(ctx.frontend.exists, true);
    // pass2-merged doesn't exist here; descriptor should still be valid
    assert.strictEqual(ctx.pass2Merged.exists, false);
  } finally { rm(tmp); }
});
