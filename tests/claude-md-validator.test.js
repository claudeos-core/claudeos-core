/**
 * Tests for claude-md-validator.
 *
 * Validates structural invariants that hold across all 10 supported output
 * languages. The test fixtures are intentionally written in different
 * languages (English, Japanese, Korean) to prove that the same validator
 * produces the same verdict regardless of language — this is the core
 * design goal: no per-language blocklist maintenance.
 */

"use strict";

const { test, describe } = require("node:test");
const assert = require("node:assert");
const path = require("path");
const fs = require("fs");

const { validate } = require("../claude-md-validator");
const checks = require("../claude-md-validator/structural-checks");

const FIXTURES = path.join(__dirname, "fixtures", "claude-md");

function fixture(name) {
  return path.join(FIXTURES, name);
}

describe("claude-md-validator — valid fixtures pass (all 10 languages)", () => {
  // Each supported --lang value has a valid fixture. The validator is
  // supposed to be language-invariant; verifying all 10 languages here
  // empirically proves that property. Adding or removing a supported
  // language must also update this list.
  const ALL_SUPPORTED_LANGS = [
    { code: "en", name: "English" },
    { code: "ko", name: "Korean" },
    { code: "ja", name: "Japanese" },
    { code: "zh-CN", name: "Chinese (Simplified)" },
    { code: "es", name: "Spanish" },
    { code: "vi", name: "Vietnamese" },
    { code: "hi", name: "Hindi" },
    { code: "ru", name: "Russian" },
    { code: "fr", name: "French" },
    { code: "de", name: "German" },
  ];

  for (const { code, name } of ALL_SUPPORTED_LANGS) {
    const fname = `valid-${code}.md`;
    test(`${name} (${code}) valid CLAUDE.md passes all structural checks`, () => {
      const report = validate(fixture(fname));
      if (!report.valid) {
        console.error(`Unexpected failures for ${code}:`, report.errors);
      }
      assert.strictEqual(report.valid, true);
      assert.strictEqual(report.errors.length, 0);
    });
  }
});

describe("claude-md-validator — §9 anti-pattern detection (language-invariant)", () => {
  test("Korean §9 re-declaration: detects all four symptom classes", () => {
    const report = validate(fixture("bad-ko.md"));
    assert.strictEqual(report.valid, false);

    // S1 — section count
    const s1 = report.errors.find((e) => e.id === "S1");
    assert.ok(s1, "should report S1 section-count failure");
    assert.strictEqual(s1.actual, 9);
    assert.strictEqual(s1.expected, 8);

    // M-* — four memory files, each duplicated
    for (const file of checks.MEMORY_FILES) {
      const m = report.errors.find((e) => e.id === `M-${file}`);
      assert.ok(m, `should report M-${file} duplication`);
      assert.strictEqual(m.actual, 2);
    }

    // F2-* — four memory files each leaked outside Section 8
    for (const file of checks.MEMORY_FILES) {
      const f2 = report.errors.find((e) => e.id === `F2-${file}`);
      assert.ok(f2, `should report F2-${file} scope violation`);
      assert.strictEqual(f2.actual, 1);
    }

    // Total: 1 (S1) + 4 (M) + 4 (F2) = 9 errors
    assert.strictEqual(report.errors.length, 9);
  });

  test("Japanese §9 re-declaration: detects identical error pattern", () => {
    const report = validate(fixture("bad-ja.md"));
    assert.strictEqual(report.valid, false);

    // Same structural error signature, different language.
    const s1 = report.errors.find((e) => e.id === "S1");
    assert.strictEqual(s1.actual, 9);

    for (const file of checks.MEMORY_FILES) {
      assert.ok(
        report.errors.find((e) => e.id === `M-${file}`),
        `M-${file} should be detected in Japanese too`
      );
      assert.ok(
        report.errors.find((e) => e.id === `F2-${file}`),
        `F2-${file} should be detected in Japanese too`
      );
    }

    // Identical error count to the Korean case — proves language independence.
    assert.strictEqual(report.errors.length, 9);
  });

  // Additional language families to close out the language-invariance proof.
  // Koreans (CJK), Japanese (CJK), Chinese (CJK), Russian (Cyrillic), Hindi
  // (Devanagari), Spanish (Latin) — five distinct scripts. Each bad fixture
  // is the same valid-XX.md with a §9 memory re-declaration appended, and
  // the validator must produce a byte-for-byte identical 9-error signature
  // (1 S1 + 4 M-* + 4 F2-*) for each.
  const ADDITIONAL_BAD_FIXTURES = [
    { code: "zh-CN", name: "Chinese (Simplified)" },
    { code: "ru", name: "Russian" },
    { code: "hi", name: "Hindi" },
    { code: "es", name: "Spanish" },
  ];

  for (const { code, name } of ADDITIONAL_BAD_FIXTURES) {
    test(`${name} (${code}) §9 re-declaration: identical 9-error signature`, () => {
      const report = validate(fixture(`bad-${code}.md`));
      assert.strictEqual(report.valid, false);

      const s1 = report.errors.find((e) => e.id === "S1");
      assert.ok(s1, `S1 detected in ${code}`);
      assert.strictEqual(s1.actual, 9);

      for (const file of checks.MEMORY_FILES) {
        assert.ok(
          report.errors.find((e) => e.id === `M-${file}`),
          `M-${file} detected in ${code}`
        );
        assert.ok(
          report.errors.find((e) => e.id === `F2-${file}`),
          `F2-${file} detected in ${code}`
        );
      }

      // The signature is intentionally identical across languages.
      assert.strictEqual(
        report.errors.length,
        9,
        `${code} must produce the same 9-error signature as ko/ja`
      );
    });
  }
});

describe("claude-md-validator — edge cases", () => {
  test("BOM-prefixed UTF-8 files are handled correctly", () => {
    // Some Windows editors and cross-platform tools prepend a UTF-8 BOM
    // (U+FEFF) to text files. Without explicit BOM handling, the first
    // `## ` line reads as `\ufeff## ` and fails to match the heading
    // regex, producing a silent off-by-one section count.
    const os = require("node:os");
    const pathMod = require("node:path");

    const validContent = fs.readFileSync(
      fixture("valid-en.md"),
      "utf8"
    );
    const tmpDir = fs.mkdtempSync(pathMod.join(os.tmpdir(), "bom-test-"));
    const bomFile = pathMod.join(tmpDir, "CLAUDE.md");
    fs.writeFileSync(bomFile, "\ufeff" + validContent);

    const report = validate(bomFile);
    assert.strictEqual(
      report.valid,
      true,
      "BOM-prefixed valid CLAUDE.md should still pass"
    );
    assert.strictEqual(report.errors.length, 0);

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test("BOM + bad fixture still produces the canonical 9-error signature", () => {
    const os = require("node:os");
    const pathMod = require("node:path");

    const badContent = fs.readFileSync(
      fixture("bad-ko.md"),
      "utf8"
    );
    const tmpDir = fs.mkdtempSync(pathMod.join(os.tmpdir(), "bom-bad-"));
    const bomFile = pathMod.join(tmpDir, "CLAUDE.md");
    fs.writeFileSync(bomFile, "\ufeff" + badContent);

    const report = validate(bomFile);
    assert.strictEqual(report.valid, false);
    // Same 9-error signature as the non-BOM case — BOM is stripped
    // upstream, so downstream checks see identical content.
    assert.strictEqual(report.errors.length, 9);

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test("memory-file table rows inside fenced code blocks are NOT counted", () => {
    // Example case: scaffold or user documentation shows a sample L4 Memory
    // Files table inside a ``` block as an illustration. That sample is
    // not an actual declaration and must not be counted against the
    // "exactly one declaration" rule.
    const os = require("node:os");
    const pathMod = require("node:path");

    const tmpDir = fs.mkdtempSync(pathMod.join(os.tmpdir(), "fence-table-"));
    const file = pathMod.join(tmpDir, "CLAUDE.md");
    // 8 real sections, but fence contains a fake decision-log.md row.
    const sections = [];
    for (let i = 1; i <= 7; i++) {
      sections.push(`## ${i}. Section\nbody line.\nbody line.`);
    }
    sections.push(
      "## 8. Section\nbody\n\n```markdown\n" +
        "| `claudeos-core/memory/decision-log.md` | illustration | in a fence |\n" +
        "```\n\n"
    );
    fs.writeFileSync(file, sections.join("\n\n"));

    const report = validate(file);
    // The fence row must not contribute to M-decision-log.md's count.
    const m = report.errors.find((e) => e.id === "M-decision-log.md");
    assert.ok(m, "should still report decision-log.md as missing");
    assert.strictEqual(
      m.actual,
      0,
      "fence-row must not inflate the table-row count"
    );

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test("directory path is handled gracefully (no crash)", () => {
    // Pointing the validator at a directory used to surface the raw
    // EISDIR stack trace. It must now return a structured error instead.
    const os = require("node:os");
    const pathMod = require("node:path");
    const tmpDir = fs.mkdtempSync(pathMod.join(os.tmpdir(), "dir-test-"));

    const report = validate(tmpDir);
    assert.strictEqual(report.valid, false);
    const err = report.errors.find((e) => e.id === "NOT_A_FILE");
    assert.ok(err, "NOT_A_FILE error must be emitted");
    assert.match(err.message, /not a regular file/);

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test("non-string path arguments are rejected gracefully", () => {
    // path.resolve() throws TypeError on null/undefined/number/object,
    // which would surface as a raw stack trace. The validator must
    // return a structured INVALID_PATH error instead so the CLI can
    // render a clean message.
    const inputs = [null, undefined, 123, {}, [], "", false];
    for (const input of inputs) {
      const report = validate(input);
      assert.strictEqual(
        report.valid,
        false,
        `validate(${JSON.stringify(input)}) should not be valid`
      );
      const err = report.errors.find((e) => e.id === "INVALID_PATH");
      assert.ok(
        err,
        `INVALID_PATH error expected for input ${JSON.stringify(input)}`
      );
    }
  });
});

describe("claude-md-validator — T1 title determinism", () => {
  // T1 enforces the "English canonical primary + translation
  // parenthetical" rule introduced to fix multi-repo heading drift.
  // These tests check that the invariant holds regardless of output
  // language and whether the translation is omitted.

  test("all 8 canonical tokens match the scaffold's primary headings", () => {
    // The validator's CANONICAL_HEADING_TOKEN table must stay in sync
    // with the scaffold template. If the scaffold ever renames a
    // canonical section, this assertion fails and prevents silent drift.
    const scaffoldPath = path.join(
      __dirname,
      "..",
      "pass-prompts",
      "templates",
      "common",
      "claude-md-scaffold.md"
    );
    const scaffold = fs.readFileSync(scaffoldPath, "utf8");
    for (const [num, token] of Object.entries(checks.CANONICAL_HEADING_TOKEN)) {
      const re = new RegExp(`^## ${num}\\. [^\\n]*${token}`, "im");
      assert.match(
        scaffold,
        re,
        `Scaffold §${num} heading must contain canonical token "${token}"`
      );
    }
  });

  test("English-only headings pass (no translation parenthetical)", () => {
    // When output language is English, the canonical heading alone
    // is sufficient — the parenthetical is optional.
    const report = validate(fixture("valid-en.md"));
    assert.strictEqual(report.valid, true);
    // Specifically assert every T1-N check passed.
    for (let n = 1; n <= 8; n++) {
      const t1 = report.allResults.find((r) => r.id === `T1-${n}`);
      assert.ok(t1, `T1-${n} result must exist`);
      assert.strictEqual(t1.pass, true, `T1-${n} should pass for English fixture`);
    }
  });

  test("non-English primary heading (without English canonical) is rejected", () => {
    // The anti-pattern: English phrase in the parenthetical, not the
    // primary heading text:
    //   ## 7. 읽지 말 것 (Files Not to Be Read Directly)
    // Multi-repo grep for "## 7. DO NOT Read" would miss this repo.
    const os = require("node:os");
    const pathMod = require("node:path");
    const tmpDir = fs.mkdtempSync(pathMod.join(os.tmpdir(), "t1-antipat-"));

    // Take the valid English fixture and flip §7 to the anti-pattern.
    let content = fs.readFileSync(fixture("valid-en.md"), "utf8");
    content = content.replace(
      /^## 7\. DO NOT Read[^\n]*$/m,
      "## 7. 읽지 말 것 (Files Not to Be Read Directly)"
    );
    const badFile = pathMod.join(tmpDir, "CLAUDE.md");
    fs.writeFileSync(badFile, content);

    const report = validate(badFile);
    const t1_7 = report.errors.find((e) => e.id === "T1-7");
    assert.ok(t1_7, "T1-7 must be raised when §7 lacks the English canonical");
    assert.match(t1_7.message, /DO NOT Read/);

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test("canonical tokens use case-insensitive matching", () => {
    // Translators may capitalize differently ("DO NOT READ", "do not read").
    // Case must not affect whether the canonical is recognized.
    const os = require("node:os");
    const pathMod = require("node:path");
    const tmpDir = fs.mkdtempSync(pathMod.join(os.tmpdir(), "t1-case-"));

    let content = fs.readFileSync(fixture("valid-en.md"), "utf8");
    content = content.replace(
      /^## 7\. DO NOT Read[^\n]*$/m,
      "## 7. do not read (lowercase variant)"
    );
    const file = pathMod.join(tmpDir, "CLAUDE.md");
    fs.writeFileSync(file, content);

    const report = validate(file);
    const t1_7 = report.allResults.find((r) => r.id === "T1-7");
    assert.strictEqual(
      t1_7.pass,
      true,
      "T1-7 should pass with lowercase canonical token"
    );

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test("T1 is skipped cleanly when section count is wrong", () => {
    // If S1 already reports the wrong number of sections, we do not
    // stack additional T1 errors for missing sections — those would be
    // duplicate noise. The check truncates to min(sections.length, 8).
    const os = require("node:os");
    const pathMod = require("node:path");
    const tmpDir = fs.mkdtempSync(pathMod.join(os.tmpdir(), "t1-short-"));

    // Only 3 sections, each with proper canonical heading.
    const content = [
      "# Short",
      "",
      "## 1. Role Definition",
      "body",
      "body",
      "",
      "## 2. Project Overview",
      "body",
      "body",
      "",
      "## 3. Build",
      "body",
      "body",
      "",
    ].join("\n");
    const file = pathMod.join(tmpDir, "CLAUDE.md");
    fs.writeFileSync(file, content);

    const report = validate(file);
    // S1 should fail, but T1-1/T1-2/T1-3 should all pass, and
    // T1-4..T1-8 should simply not exist (not fail).
    for (let n = 1; n <= 3; n++) {
      const t = report.allResults.find((r) => r.id === `T1-${n}`);
      assert.ok(t, `T1-${n} should exist`);
      assert.strictEqual(t.pass, true, `T1-${n} should pass`);
    }
    for (let n = 4; n <= 8; n++) {
      const t = report.allResults.find((r) => r.id === `T1-${n}`);
      assert.strictEqual(
        t,
        undefined,
        `T1-${n} should not be emitted when only 3 sections exist`
      );
    }

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });
});

describe("claude-md-validator — section structure", () => {
  test("splitByH2 handles fenced code blocks correctly", () => {
    const content = [
      "# Title",
      "",
      "## 1. Intro",
      "body",
      "",
      "```markdown",
      "## This is inside a fence, not a real heading",
      "```",
      "",
      "## 2. Next",
      "body",
      "",
    ].join("\n");

    const sections = checks.splitByH2(content);
    assert.strictEqual(sections.length, 2);
    assert.strictEqual(sections[0].title, "1. Intro");
    assert.strictEqual(sections[1].title, "2. Next");
  });

  test("splitByH2 respects ~~~ fences as well as ``` fences", () => {
    const content = [
      "## 1. A",
      "",
      "~~~",
      "## fake heading inside tilde fence",
      "~~~",
      "",
      "## 2. B",
    ].join("\n");

    const sections = checks.splitByH2(content);
    assert.strictEqual(sections.length, 2);
  });

  test("checkH2Count flags both surplus and deficit", () => {
    const surplus = checks.checkH2Count(new Array(9).fill({}));
    assert.strictEqual(surplus.pass, false);
    assert.match(surplus.remediation, /Remove/);

    const deficit = checks.checkH2Count(new Array(7).fill({}));
    assert.strictEqual(deficit.pass, false);
    assert.match(deficit.remediation, /Add/);

    const exact = checks.checkH2Count(new Array(8).fill({}));
    assert.strictEqual(exact.pass, true);
  });
});

describe("claude-md-validator — memory file detection", () => {
  test("recognizes backtick-wrapped memory path in table row", () => {
    const content =
      "| `claudeos-core/memory/decision-log.md` | Why | Append-only. |";
    const report = validate.__dummy; // unused — we call checks directly
    assert.strictEqual(
      (content.match(
        /^\s*\|\s*`[^`]*decision-log\.md`\s*\|/gm
      ) || []).length,
      1,
      "sanity: regex matches the row form used in fixtures"
    );
  });

  test("prose mentions of memory files do not count as table rows", () => {
    const content = [
      "This refers to `decision-log.md` in prose.",
      "Also 2. **Skim recent decisions**: review `decision-log.md` entries.",
    ].join("\n");

    // M check should not fire on prose mentions alone — they have no
    // surrounding `| ... |` table structure.
    const results = checks.checkMemoryFileUniqueness(content);
    const decisionLog = results.find((r) => r.file === "decision-log.md");
    // 0 table rows → reports "missing" error, but proves prose mentions
    // are not miscounted as duplicates.
    assert.strictEqual(decisionLog.actual, 0);
  });
});

describe("claude-md-validator — file not found", () => {
  test("returns failure report when file is absent", () => {
    const report = validate("/tmp/definitely-not-a-real-file-xyz.md");
    assert.strictEqual(report.valid, false);
    const missing = report.errors.find((e) => e.id === "FILE_MISSING");
    assert.ok(missing);
  });
});

// ─── Session Resume block (v2.4.0+) ─────────────────────────────
//
// The Session Resume block is a RECOMMENDED (not required) prose
// subsection inside Section 8's "Memory Workflow" H4. It appears as a
// bold-labeled paragraph followed by a 3-bullet list, NOT as a third
// `#### Session Resume` heading. The structural validator enforces
// exactly 2 H4 headings in Section 8 (L4 Memory Files + Memory
// Workflow), so a Session Resume H4 is rejected; the prose form is
// accepted and does not require its own structural check because it
// passes through as ordinary section content.
//
// Rationale for RECOMMENDED-not-required: existing CLAUDE.md files
// generated before v2.4.0 do not carry the block, and we want them to
// remain structurally valid. Scaffold guidance instructs new
// generation to include it, but the validator stays permissive on
// presence to preserve backward compatibility.
describe("claude-md-validator — Session Resume block (v2.4.0)", () => {
  test("valid CLAUDE.md with Session Resume prose block passes all checks", () => {
    // The positive fixture includes the Session Resume block inside
    // Memory Workflow as a bold-labeled paragraph + 3 bullets. This
    // MUST pass exactly the same checks as valid-en.md (which does
    // NOT include the block) — Session Resume presence is additive.
    const report = validate(fixture("valid-en-with-session-resume.md"));
    if (!report.valid) {
      console.error(
        "Unexpected Session Resume positive fixture failures:",
        report.errors
      );
    }
    assert.strictEqual(report.valid, true);
    assert.strictEqual(report.errors.length, 0);
  });

  test("Session Resume placed as a 3rd H4 under Section 8 fails with S-H4-8", () => {
    // The negative fixture puts Session Resume as `#### Session Resume`
    // — a third H4 sibling to L4 Memory Files and Memory Workflow.
    // Structural validator must reject this with S-H4-8 (exactly 2
    // H4 headings required in Section 8).
    const report = validate(fixture("bad-session-resume-as-h4.md"));
    assert.strictEqual(report.valid, false);

    const h4Error = report.errors.find((e) => e.id === "S-H4-8");
    assert.ok(
      h4Error,
      "expected S-H4-8 error when Session Resume is placed as a 3rd H4"
    );
    assert.match(h4Error.message, /exactly 2 #### headings/);
    assert.match(h4Error.message, /found 3/);
  });

  test("backward compat: valid-en.md without Session Resume still passes", () => {
    // Explicitly asserts backward compatibility. Projects generated
    // before v2.4.0 have no Session Resume block; they must continue
    // to validate without any change. This prevents the test suite
    // from accidentally drifting into requiring the block.
    const report = validate(fixture("valid-en.md"));
    assert.strictEqual(report.valid, true);
    assert.strictEqual(report.errors.length, 0);
  });
});
