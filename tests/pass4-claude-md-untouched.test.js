/**
 * tests/pass4-claude-md-untouched.test.js — regression guard for the
 * v2.3.0 fix that removes Pass 4's CLAUDE.md append behavior.
 *
 * Pre-v2.3.0, two paths wrote to CLAUDE.md during Pass 4:
 *   1) the pass4.md prompt instructed the LLM to append a `## N.
 *      ... (L4)` section, and
 *   2) init.js's static fallback called `appendClaudeMdL4Memory()`
 *      which did the same from Node code.
 *
 * Both are removed in v2.3.0. The Pass 3 scaffold already authors
 * Section 8 "Common Rules & Memory (L4)" with the full Common Rules
 * table, the L4 memory file table, and the memory workflow — so any
 * additional Pass 4 write is pure duplication and triggers [S1],
 * [M-*], and [F2-*] validator errors.
 *
 * These tests verify the prompt, the orchestrator, and the scaffold
 * library no longer contain active writes to CLAUDE.md.
 */

"use strict";

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");

const ROOT = path.join(__dirname, "..");

describe("pass4 CLAUDE.md immutability (v2.3.0)", () => {
  test("pass4.md prompt contains no active instruction to append to CLAUDE.md", () => {
    const p = path.join(ROOT, "pass-prompts/templates/common/pass4.md");
    const src = fs.readFileSync(p, "utf-8");

    // The old prompt had an `### 11. Append a new section to existing
    // CLAUDE.md` header. That header is gone. The phrase "CLAUDE.md
    // MUST NOT BE MODIFIED" replaces it and documents the fix.
    assert.ok(
      !/^###\s+\d+\.\s+Append a new section to existing\s+`?CLAUDE\.md`?/m.test(src),
      "pass4.md must not contain an active 'Append new section to CLAUDE.md' header"
    );
    assert.ok(
      /CLAUDE\.md MUST NOT BE MODIFIED/.test(src),
      "pass4.md must explicitly forbid CLAUDE.md modification"
    );

    // The output-discipline bullet that used to say "append only" is
    // replaced with "Do NOT touch CLAUDE.md".
    assert.ok(
      !/Do NOT overwrite existing CLAUDE\.md content — \*\*append only\*\*/.test(src),
      "the old 'append only' bullet must be gone"
    );
    assert.ok(
      /Do NOT touch CLAUDE\.md\.\s+Pass 3 already authored/.test(src),
      "pass4.md must state the new rule: Pass 4 does not touch CLAUDE.md"
    );
  });

  test("init.js no longer imports appendClaudeMdL4Memory from memory-scaffold", () => {
    const p = path.join(ROOT, "bin/commands/init.js");
    const src = fs.readFileSync(p, "utf-8");

    // The require destructure must not pull in the retired helper.
    // Matching an explicit pattern rather than a substring so the
    // word "appendClaudeMdL4Memory" appearing inside a doc comment
    // does not trip the check.
    const importPattern = /const\s*\{[^}]*\bappendClaudeMdL4Memory\b[^}]*\}\s*=\s*require\(["']\.\.\/\.\.\/lib\/memory-scaffold["']\);/;
    assert.ok(
      !importPattern.test(src),
      "init.js must not import appendClaudeMdL4Memory"
    );

    // No bare function calls either.
    const callPattern = /^[^\S\r\n]*appendClaudeMdL4Memory\s*\(/m;
    assert.ok(
      !callPattern.test(src),
      "init.js must not call appendClaudeMdL4Memory"
    );
  });

  test("memory-scaffold.js keeps appendClaudeMdL4Memory as a no-op for backwards compat", () => {
    const { appendClaudeMdL4Memory } = require("../lib/memory-scaffold");
    assert.equal(typeof appendClaudeMdL4Memory, "function",
      "export must still exist so any external caller does not crash");

    // Write an arbitrary CLAUDE.md and confirm it is NOT mutated by
    // the deprecated function.
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "p4-claude-"));
    const claudeMdPath = path.join(tmp, "CLAUDE.md");
    const original = "# CLAUDE.md\n\n## 1. Role\n\nbody\n\n## 8. Common Rules & Memory (L4)\n\nstub\n";
    fs.writeFileSync(claudeMdPath, original);

    const ret = appendClaudeMdL4Memory(claudeMdPath, { lang: "en" });
    const after = fs.readFileSync(claudeMdPath, "utf-8");

    assert.equal(after, original, "CLAUDE.md content must be untouched");
    assert.equal(ret, true, "return value preserved for caller summary reporting");

    fs.rmSync(tmp, { recursive: true, force: true });
  });

  test("memory-scaffold.js no-op is independent of (L4) marker presence", () => {
    // Ensure the no-op truly ignores the input file — even when the
    // file has NO Section 8 at all, the function must not append.
    const { appendClaudeMdL4Memory } = require("../lib/memory-scaffold");
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "p4-claude-"));
    const claudeMdPath = path.join(tmp, "CLAUDE.md");
    const minimal = "# Minimal CLAUDE.md\n\nno sections at all\n";
    fs.writeFileSync(claudeMdPath, minimal);

    appendClaudeMdL4Memory(claudeMdPath, { lang: "ko" });
    const after = fs.readFileSync(claudeMdPath, "utf-8");

    assert.equal(after, minimal,
      "even a CLAUDE.md without (L4) must not receive an appended section");
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  test("memory-scaffold.js no-op does not crash on a non-existent CLAUDE.md", () => {
    // Pre-v2.3.0 the function returned false when the file was missing.
    // The no-op must not throw and must still return a boolean.
    const { appendClaudeMdL4Memory } = require("../lib/memory-scaffold");
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "p4-claude-"));
    const claudeMdPath = path.join(tmp, "does-not-exist.md");

    const ret = appendClaudeMdL4Memory(claudeMdPath, { lang: "en" });
    assert.equal(typeof ret, "boolean");

    fs.rmSync(tmp, { recursive: true, force: true });
  });
});
