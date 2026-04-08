/**
 * ClaudeOS-Core — Domain Grouper + Safe-FS Tests
 */

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const os = require("os");

const { splitDomainGroups, determineActiveDomains, selectTemplates } = require("../plan-installer/domain-grouper");
const { readFileSafe, readJsonSafe, existsSafe, statSafe } = require("../lib/safe-fs");

// ─── splitDomainGroups ──────────────────────────────────────

describe("splitDomainGroups", () => {
  it("keeps small projects in one group", () => {
    const domains = [
      { name: "user", totalFiles: 10 },
      { name: "order", totalFiles: 8 },
    ];
    const groups = splitDomainGroups(domains, "backend", "java-spring");
    assert.equal(groups.length, 1);
    assert.deepEqual(groups[0].domains, ["user", "order"]);
    assert.equal(groups[0].estimatedFiles, 18);
  });

  it("splits when adding a domain would exceed MAX_FILES_PER_GROUP (40)", () => {
    const domains = [
      { name: "a", totalFiles: 25 },
      { name: "b", totalFiles: 20 },
      { name: "c", totalFiles: 10 },
    ];
    const groups = splitDomainGroups(domains, "backend", "java-spring");
    assert.equal(groups.length, 2);
    // Group flushes before adding "b" because 25+20=45 >= 40
    assert.deepEqual(groups[0].domains, ["a"]);
    assert.equal(groups[0].estimatedFiles, 25);
    assert.deepEqual(groups[1].domains, ["b", "c"]);
    assert.equal(groups[1].estimatedFiles, 30);
  });

  it("splits when exceeding MAX_DOMAINS_PER_GROUP (4)", () => {
    const domains = Array.from({ length: 6 }, (_, i) => ({ name: `d${i}`, totalFiles: 5 }));
    const groups = splitDomainGroups(domains, "frontend", "node-nextjs");
    assert.equal(groups.length, 2);
    assert.equal(groups[0].domains.length, 4);
    assert.equal(groups[1].domains.length, 2);
  });

  it("returns empty for empty input", () => {
    assert.deepEqual(splitDomainGroups([], "backend", "java-spring"), []);
  });

  it("splits exactly at 40-file boundary", () => {
    const domains = [
      { name: "a", totalFiles: 20 },
      { name: "b", totalFiles: 20 },
      { name: "c", totalFiles: 5 },
    ];
    const groups = splitDomainGroups(domains, "backend", "java-spring");
    // a(20) added. b check: 20+20=40 >= 40 → flush [a]. b(20) added. c check: 20+5=25 < 40 → ok.
    assert.equal(groups.length, 2);
    assert.deepEqual(groups[0].domains, ["a"]);
    assert.deepEqual(groups[1].domains, ["b", "c"]);
  });

  it("handles single domain exceeding MAX_FILES_PER_GROUP", () => {
    const domains = [
      { name: "huge", totalFiles: 100 },
      { name: "small", totalFiles: 5 },
    ];
    const groups = splitDomainGroups(domains, "backend", "java-spring");
    // huge(100): current empty, no flush needed, added. small: 100+5=105 >= 40 → flush [huge].
    assert.equal(groups.length, 2);
    assert.deepEqual(groups[0].domains, ["huge"]);
    assert.equal(groups[0].estimatedFiles, 100);
    assert.deepEqual(groups[1].domains, ["small"]);
  });
});

// ─── determineActiveDomains ──────────────────────────────────

describe("determineActiveDomains", () => {
  it("activates backend for spring-boot", () => {
    const active = determineActiveDomains({ framework: "spring-boot", database: "postgresql" });
    assert.equal(active["10.backend"], true);
    assert.equal(active["20.frontend"], false);
    assert.equal(active["30.security-db"], true);
  });

  it("activates frontend for nextjs", () => {
    const active = determineActiveDomains({ framework: null, frontend: "nextjs" });
    assert.equal(active["10.backend"], false);
    assert.equal(active["20.frontend"], true);
  });

  it("activates both for full-stack", () => {
    const active = determineActiveDomains({ framework: "express", frontend: "nextjs", database: "postgresql" });
    assert.equal(active["10.backend"], true);
    assert.equal(active["20.frontend"], true);
  });
});

// ─── selectTemplates ──────────────────────────────────────

describe("selectTemplates", () => {
  it("selects java-spring for Java", () => {
    const t = selectTemplates({ language: "java" });
    assert.equal(t.backend, "java-spring");
  });

  it("selects kotlin-spring for Kotlin", () => {
    const t = selectTemplates({ language: "kotlin" });
    assert.equal(t.backend, "kotlin-spring");
  });

  it("selects node-nextjs frontend for Next.js", () => {
    const t = selectTemplates({ language: "java", frontend: "nextjs" });
    assert.equal(t.backend, "java-spring");
    assert.equal(t.frontend, "node-nextjs");
  });

  it("selects python-django for Django", () => {
    const t = selectTemplates({ language: "python", framework: "django" });
    assert.equal(t.backend, "python-django");
  });

  it("selects python-fastapi for FastAPI", () => {
    const t = selectTemplates({ language: "python", framework: "fastapi" });
    assert.equal(t.backend, "python-fastapi");
  });

  it("handles frontend-only project (no backend template without framework)", () => {
    const t = selectTemplates({ language: "typescript", frontend: "react" });
    assert.equal(t.backend, null);
    assert.equal(t.frontend, "node-nextjs");
  });

  it("selects node-nestjs for NestJS", () => {
    const t = selectTemplates({ language: "typescript", framework: "nestjs" });
    assert.equal(t.backend, "node-nestjs");
  });

  it("selects node-nestjs with frontend for NestJS + Next.js", () => {
    const t = selectTemplates({ language: "typescript", framework: "nestjs", frontend: "nextjs" });
    assert.equal(t.backend, "node-nestjs");
    assert.equal(t.frontend, "node-nextjs");
  });

  it("selects node-fastify for Fastify", () => {
    const t = selectTemplates({ language: "typescript", framework: "fastify" });
    assert.equal(t.backend, "node-fastify");
  });

  it("selects angular frontend for Angular", () => {
    const t = selectTemplates({ language: "typescript", frontend: "angular" });
    assert.equal(t.backend, null);
    assert.equal(t.frontend, "angular");
  });

  it("selects both backend and angular frontend", () => {
    const t = selectTemplates({ language: "typescript", framework: "express", frontend: "angular" });
    assert.equal(t.backend, "node-express");
    assert.equal(t.frontend, "angular");
  });
});

// ─── safe-fs ──────────────────────────────────────────────

describe("safe-fs", () => {
  it("readFileSafe returns fallback for missing file", () => {
    assert.equal(readFileSafe("/tmp/nonexistent-file-xyz-123"), "");
    assert.equal(readFileSafe("/tmp/nonexistent-file-xyz-123", "FALLBACK"), "FALLBACK");
  });

  it("readJsonSafe returns fallback for missing file", () => {
    assert.equal(readJsonSafe("/tmp/nonexistent-file-xyz-123"), null);
    assert.deepEqual(readJsonSafe("/tmp/nonexistent-file-xyz-123", {}), {});
  });

  it("readJsonSafe returns fallback for malformed JSON", () => {
    const tmp = path.join(os.tmpdir(), "ccore-test-bad-json.json");
    fs.writeFileSync(tmp, "NOT {{{ JSON");
    const result = readJsonSafe(tmp, { fallback: true });
    assert.deepEqual(result, { fallback: true });
    fs.unlinkSync(tmp);
  });

  it("existsSafe returns false for missing file", () => {
    assert.equal(existsSafe("/tmp/nonexistent-file-xyz-123"), false);
  });

  it("statSafe returns null for missing file", () => {
    assert.equal(statSafe("/tmp/nonexistent-file-xyz-123"), null);
  });

  it("statSafe returns correct info for existing file", () => {
    const tmp = path.join(os.tmpdir(), "ccore-test-stat.txt");
    fs.writeFileSync(tmp, "line1\nline2\nline3");
    const s = statSafe(tmp);
    assert.equal(s.lines, 3);
    assert.ok(s.bytes > 0);
    assert.ok(s.modified);
    fs.unlinkSync(tmp);
  });
});
