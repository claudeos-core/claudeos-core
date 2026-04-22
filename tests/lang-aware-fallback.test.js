/**
 * Regression test for the lang-aware fallback (bug #21).
 *
 * Contract:
 *   - lang === "en" (or omitted) → English static content. No Claude call.
 *   - lang === <supported, non-en> → MUST translate via Claude.
 *       * On success: translated content is written and cached.
 *       * On failure: THROW. DO NOT silently write English (that was bug #21).
 *   - lang === <unsupported> → throw immediately.
 *
 * Tests run without a real Claude CLI, so the translation path MUST throw.
 *
 * M2 — deterministic test environment:
 *   Previously this file relied on the `claude` CLI being UNAVAILABLE in the
 *   test env (exit non-zero / missing binary). On dev machines with an
 *   authenticated Claude CLI, translation actually *succeeded*, flipping every
 *   `assert.throws()` here to a fail. Fixed by setting
 *   CLAUDEOS_SKIP_TRANSLATION=1 for this test module — `translateIfNeeded()`
 *   in memory-scaffold.js short-circuits to throw before shelling to `claude`.
 *   Tests now assert the SAME behaviour (throw on translation attempt),
 *   independent of CLI availability, filesystem timing, or network.
 */

process.env.CLAUDEOS_SKIP_TRANSLATION = "1";

const { describe, it } = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");

const {
  MEMORY_FILES,
  RULE_FILES_60,
  CLAUDE_MD_APPEND,
  STANDARD_DOC_WRITING_GUIDE,
  scaffoldMemory,
  scaffoldRules,
  scaffoldDocWritingGuide,
  appendClaudeMdL4Memory,
} = require("../lib/memory-scaffold");

function makeTmp() {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "claudeos-lang-fallback-"));
  fs.mkdirSync(path.join(d, "claudeos-core", "memory"), { recursive: true });
  fs.mkdirSync(path.join(d, "claudeos-core", "generated"), { recursive: true });
  fs.mkdirSync(path.join(d, "claudeos-core", "plan"), { recursive: true });
  fs.mkdirSync(path.join(d, "claudeos-core", "standard", "00.core"), { recursive: true });
  fs.mkdirSync(path.join(d, ".claude", "rules"), { recursive: true });
  fs.writeFileSync(path.join(d, "CLAUDE.md"), "# Test Project\n");
  return d;
}

function cleanup(d) { try { fs.rmSync(d, { recursive: true, force: true }); } catch (_e) {} }

describe("lang=en (default) — identical to English static content", () => {
  it("scaffoldMemory writes exact MEMORY_FILES content when lang omitted", () => {
    const d = makeTmp();
    try {
      scaffoldMemory(path.join(d, "claudeos-core", "memory"));
      for (const name of Object.keys(MEMORY_FILES)) {
        const actual = fs.readFileSync(
          path.join(d, "claudeos-core", "memory", name),
          "utf-8"
        );
        assert.equal(actual, MEMORY_FILES[name]);
      }
    } finally { cleanup(d); }
  });

  it("scaffoldMemory writes English content when lang='en' explicit", () => {
    const d = makeTmp();
    try {
      scaffoldMemory(path.join(d, "claudeos-core", "memory"), { lang: "en" });
      const decisionLog = fs.readFileSync(
        path.join(d, "claudeos-core", "memory", "decision-log.md"),
        "utf-8"
      );
      assert.equal(decisionLog, MEMORY_FILES["decision-log.md"]);
    } finally { cleanup(d); }
  });

  it("scaffoldRules writes English rule content for lang='en'", () => {
    const d = makeTmp();
    try {
      scaffoldRules(path.join(d, ".claude", "rules"), { lang: "en" });
      const r = fs.readFileSync(
        path.join(d, ".claude", "rules", "60.memory", "01.decision-log.md"),
        "utf-8"
      );
      assert.equal(r, RULE_FILES_60["01.decision-log.md"]);
    } finally { cleanup(d); }
  });

  it("appendClaudeMdL4Memory is a no-op (retired v2.3.0) — does not mutate CLAUDE.md", () => {
    // Retired in v2.3.0 — see tests/pass4-claude-md-untouched.test.js
    // for the full rationale. Lang-specific behavior tests are obsolete
    // because the function no longer touches CLAUDE.md regardless of
    // `lang`. We keep one positive assertion here so that any future
    // accidental revival of the append path is caught inside the
    // lang-aware test file.
    //
    // makeTmp() seeds CLAUDE.md with "# Test Project\n", so the check
    // is byte-for-byte preservation rather than absence.
    const d = makeTmp();
    try {
      const claudeMdPath = path.join(d, "CLAUDE.md");
      const before = fs.readFileSync(claudeMdPath, "utf-8");
      appendClaudeMdL4Memory(claudeMdPath, { lang: "en" });
      const after = fs.readFileSync(claudeMdPath, "utf-8");
      assert.equal(after, before, "retired no-op must not mutate CLAUDE.md");
    } finally { cleanup(d); }
  });

  it("scaffoldDocWritingGuide writes English content for lang='en'", () => {
    const d = makeTmp();
    try {
      const r = scaffoldDocWritingGuide(
        path.join(d, "claudeos-core", "standard", "00.core"),
        { lang: "en" }
      );
      const content = fs.readFileSync(
        path.join(d, "claudeos-core", "standard", "00.core", r.file),
        "utf-8"
      );
      assert.equal(content, STANDARD_DOC_WRITING_GUIDE);
    } finally { cleanup(d); }
  });

  it("does NOT create a translation cache file for lang='en'", () => {
    const d = makeTmp();
    try {
      scaffoldMemory(path.join(d, "claudeos-core", "memory"), { lang: "en" });
      const cache = path.join(d, "claudeos-core", "generated", "fallback-cache-en.json");
      assert.equal(fs.existsSync(cache), false);
    } finally { cleanup(d); }
  });
});

describe("lang=<non-en> without real Claude CLI — MUST throw (no silent English fallback)", () => {
  it("scaffoldMemory throws for lang='ko'", () => {
    const d = makeTmp();
    try {
      assert.throws(
        () => scaffoldMemory(path.join(d, "claudeos-core", "memory"), { lang: "ko" }),
        /translation|Claude/i
      );
    } finally { cleanup(d); }
  });

  it("scaffoldRules throws for lang='ja'", () => {
    const d = makeTmp();
    try {
      assert.throws(
        () => scaffoldRules(path.join(d, ".claude", "rules"), { lang: "ja" }),
        /translation|Claude/i
      );
    } finally { cleanup(d); }
  });

  it("appendClaudeMdL4Memory is lang-invariant no-op (retired v2.3.0) — no throw on lang='zh-CN'", () => {
    // Retired in v2.3.0. The pre-v2.3.0 invariant — "non-English lang
    // MUST throw without real Claude CLI, to prevent silent English
    // fallback into a translated project" — was tied to the append
    // path being active. With the append retired, there is nothing to
    // fall back silently INTO, so lang becomes irrelevant to this
    // function. The no-op must simply not throw for any lang.
    //
    // makeTmp() seeds CLAUDE.md with "# Test Project\n"; the check
    // here is that non-English lang does NOT throw and does NOT
    // mutate the file.
    const d = makeTmp();
    try {
      const claudeMdPath = path.join(d, "CLAUDE.md");
      const before = fs.readFileSync(claudeMdPath, "utf-8");
      assert.doesNotThrow(
        () => appendClaudeMdL4Memory(claudeMdPath, { lang: "zh-CN" }),
        "retired no-op must be lang-invariant"
      );
      const after = fs.readFileSync(claudeMdPath, "utf-8");
      assert.equal(after, before, "non-English lang must not mutate CLAUDE.md either");
    } finally { cleanup(d); }
  });

  it("scaffoldDocWritingGuide throws for lang='de'", () => {
    const d = makeTmp();
    try {
      assert.throws(
        () => scaffoldDocWritingGuide(
          path.join(d, "claudeos-core", "standard", "00.core"),
          { lang: "de" }
        ),
        /translation|Claude/i
      );
    } finally { cleanup(d); }
  });

  it("failed translation does NOT leave a cache file (retry on next run)", () => {
    const d = makeTmp();
    try {
      try { scaffoldMemory(path.join(d, "claudeos-core", "memory"), { lang: "ko" }); }
      catch (_e) { /* expected */ }
      const cache = path.join(d, "claudeos-core", "generated", "fallback-cache-ko.json");
      assert.equal(fs.existsSync(cache), false);
    } finally { cleanup(d); }
  });
});

describe("unsupported lang — throws with clear message", () => {
  it("throws for lang='xx'", () => {
    const d = makeTmp();
    try {
      assert.throws(
        () => scaffoldMemory(path.join(d, "claudeos-core", "memory"), { lang: "xx" }),
        /unsupported lang/i
      );
    } finally { cleanup(d); }
  });
});

describe("appendClaudeMdL4Memory — retired v2.3.0, invariant under repeated calls", () => {
  it("repeated calls do not mutate CLAUDE.md regardless of lang argument", () => {
    const d = makeTmp();
    try {
      const claudeMdPath = path.join(d, "CLAUDE.md");
      const original = "# CLAUDE.md\n\n## 8. Common Rules & Memory (L4)\n\nauthored by Pass 3\n";
      fs.writeFileSync(claudeMdPath, original);

      // Multiple calls with different langs must all be no-ops.
      appendClaudeMdL4Memory(claudeMdPath, { lang: "en" });
      appendClaudeMdL4Memory(claudeMdPath, { lang: "ko" });
      appendClaudeMdL4Memory(claudeMdPath, { lang: "zh-CN" });

      const after = fs.readFileSync(claudeMdPath, "utf-8");
      assert.equal(after, original, "repeated calls must leave content byte-identical");
    } finally { cleanup(d); }
  });
});
