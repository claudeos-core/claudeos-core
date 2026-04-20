/**
 * ClaudeOS-Core — Plan Parser Tests
 *
 * Tests the shared lib/plan-parser.js module directly:
 *   - parseFileBlocks: path-only and content modes
 *   - parseCodeBlocks: path-only and content modes, nested fence handling
 *   - replaceFileBlock / replaceCodeBlock
 *   - findClosingFence edge cases (via parseCodeBlocks)
 */

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

const { parseFileBlocks, parseCodeBlocks, replaceFileBlock, replaceCodeBlock } = require("../lib/plan-parser");

// ─── parseFileBlocks ────────────────────────────────────────

describe("parseFileBlocks — path only", () => {
  it("extracts paths without content", () => {
    const content = '<file path="a.md">\nsome content\n</file>\n<file path="b.md">\nmore\n</file>';
    const blocks = parseFileBlocks(content);
    assert.equal(blocks.length, 2);
    assert.equal(blocks[0].path, "a.md");
    assert.equal(blocks[1].path, "b.md");
    assert.equal(blocks[0].content, undefined, "should not include content in path-only mode");
  });

  it("returns empty for no blocks", () => {
    assert.deepEqual(parseFileBlocks("# no blocks here"), []);
  });

  it("filters out placeholder paths like '...'", () => {
    // Regression test: 50.memory-master.md contained prose like:
    //   "Use <file path=\"...\"> blocks to wrap files"
    // which was mistakenly parsed as an actual source path and reported
    // as orphaned in sync-checker.
    const content =
      'Use <file path="..."> blocks to wrap files.\n\n' +
      '<file path="real/path.md">\ncontent\n</file>';
    const blocks = parseFileBlocks(content);
    assert.equal(blocks.length, 1, "only real path should be extracted");
    assert.equal(blocks[0].path, "real/path.md");
  });

  it("filters out angle-bracket template placeholders", () => {
    const content =
      '<file path="<actual-path>">\nplaceholder\n</file>\n' +
      '<file path="claudeos-core/memory/decision-log.md">\nreal content\n</file>';
    const blocks = parseFileBlocks(content);
    assert.equal(blocks.length, 1);
    assert.equal(blocks[0].path, "claudeos-core/memory/decision-log.md");
  });
});

describe("parseFileBlocks — with content", () => {
  it("extracts paths and content", () => {
    const content = '<file path="CLAUDE.md">\n# Title\nBody here\n</file>';
    const blocks = parseFileBlocks(content, { includeContent: true });
    assert.equal(blocks.length, 1);
    assert.equal(blocks[0].path, "CLAUDE.md");
    assert.equal(blocks[0].content, "# Title\nBody here");
  });

  it("handles multiple blocks", () => {
    const content = '<file path="a.md">\nA\n</file>\n\n<file path="b.md">\nB\n</file>';
    const blocks = parseFileBlocks(content, { includeContent: true });
    assert.equal(blocks.length, 2);
    assert.equal(blocks[0].content, "A");
    assert.equal(blocks[1].content, "B");
  });
});

// ─── parseCodeBlocks ────────────────────────────────────────

describe("parseCodeBlocks — path only", () => {
  it("extracts paths from heading", () => {
    const content = "## 1. `path/to/file.md`\n\n```markdown\ncontent\n```\n\n## 2. `other/file.md`\n\n```markdown\nmore\n```\n";
    const blocks = parseCodeBlocks(content);
    assert.equal(blocks.length, 2);
    assert.equal(blocks[0].path, "path/to/file.md");
    assert.equal(blocks[1].path, "other/file.md");
    assert.equal(blocks[0].content, undefined);
  });

  it("skips headings without path (no /)", () => {
    const content = "## 1. `just-a-name`\n\n```markdown\ncontent\n```\n";
    const blocks = parseCodeBlocks(content);
    assert.equal(blocks.length, 0, "should skip paths without /");
  });
});

describe("parseCodeBlocks — with content", () => {
  it("extracts content with nested fences", () => {
    const content = [
      "## 1. `standard/naming.md`",
      "",
      "```markdown",
      "# Naming",
      "",
      "```kotlin",
      "class Foo {}",
      "```",
      "",
      "End.",
      "```",
    ].join("\n");

    const blocks = parseCodeBlocks(content, { includeContent: true });
    assert.equal(blocks.length, 1);
    assert.equal(blocks[0].path, "standard/naming.md");
    assert.ok(blocks[0].content.includes("class Foo"));
    assert.ok(blocks[0].content.includes("End."));
  });

  it("handles multiple nested fences", () => {
    // Two nested code blocks inside one markdown block
    // The outer ``` closes after both inner blocks
    const content = [
      "## 1. `standard/rules.md`",
      "",
      "```markdown",
      "# Rules",
      "",
      "```java",
      "public class A {}",
      "```",
      "",
      "```python",
      "def a(): pass",
      "```",
      "",
      "End of doc.",
      "```",
    ].join("\n");

    const blocks = parseCodeBlocks(content, { includeContent: true });
    assert.equal(blocks.length, 1);
    assert.ok(blocks[0].content.includes("public class A"));
    assert.ok(blocks[0].content.includes("def a()"));
    assert.ok(blocks[0].content.includes("End of doc."));
  });

  it("returns empty for no code blocks", () => {
    assert.deepEqual(parseCodeBlocks("# nothing", { includeContent: true }), []);
  });
});

// ─── replaceFileBlock ───────────────────────────────────────

describe("replaceFileBlock (shared)", () => {
  it("replaces content in matching block", () => {
    const content = '<file path="a.md">\nold\n</file>\n<file path="b.md">\nkeep\n</file>';
    const result = replaceFileBlock(content, "a.md", "new");
    assert.ok(result.includes("new"));
    assert.ok(!result.includes("old"));
    assert.ok(result.includes("keep"));
  });

  it("returns unchanged for non-matching path", () => {
    const content = '<file path="a.md">\nhello\n</file>';
    assert.equal(replaceFileBlock(content, "z.md", "new"), content);
  });

  it("preserves $ special characters in newContent ($1, $&, $$, etc.) as literals", () => {
    // Regression guard: the original implementation used a string replacement
    // which interprets `$1`, `$&`, `$$` as back-references / specials.
    // If a memory/rule/standard file documents regex syntax or shell PIDs,
    // refresh would corrupt the content. The fix uses a replacement function.
    const content = '<file path="doc.md">\nold\n</file>';

    // Case 1: $1 (would have become the captured "opening group")
    const r1 = replaceFileBlock(content, "doc.md", "price: $100 total");
    assert.ok(r1.includes("price: $100 total"),
      "$1-style sequences must be preserved literally, not expanded to capture groups");

    // Case 2: $$ (would have collapsed to $)
    const r2 = replaceFileBlock(content, "doc.md", "a$$b");
    assert.ok(r2.includes("a$$b"),
      "$$ must be preserved literally, not collapsed to $");

    // Case 3: $& (whole-match back-reference)
    const r3 = replaceFileBlock(content, "doc.md", "regex $& example");
    assert.ok(r3.includes("regex $& example"),
      "$& must be preserved literally, not expanded to the whole match");

    // Case 4: $0, $9 (other numbered groups)
    const r4 = replaceFileBlock(content, "doc.md", "refs $0 and $9 here");
    assert.ok(r4.includes("refs $0 and $9 here"),
      "$0/$9 must be preserved literally");
  });
});

// ─── replaceCodeBlock ───────────────────────────────────────

describe("replaceCodeBlock (shared)", () => {
  it("replaces content preserving nested fences", () => {
    const original = [
      "## 1. `file.md`",
      "",
      "```markdown",
      "old content",
      "```",
    ].join("\n");

    const result = replaceCodeBlock(original, "file.md", "new content");
    assert.ok(result.includes("new content"));
    assert.ok(!result.includes("old content"));
  });

  it("returns unchanged for non-matching path", () => {
    const content = "## 1. `file.md`\n\n```markdown\nhello\n```\n";
    assert.equal(replaceCodeBlock(content, "nonexistent.md", "new"), content);
  });
});

// ─── Consistency: shared module matches plan-validator behavior ──

describe("shared plan-parser — backward compatibility", () => {
  it("parseFileBlocks(includeContent:true) matches plan-validator extractFileBlocks", () => {
    const content = '<file path="test.md">\n# Test\nContent\n</file>';
    const blocks = parseFileBlocks(content, { includeContent: true });
    assert.equal(blocks[0].path, "test.md");
    assert.equal(blocks[0].content, "# Test\nContent");
  });

  it("parseCodeBlocks(includeContent:true) matches plan-validator extractCodeBlocks", () => {
    const content = "## 1. `test/file.md`\n\n```markdown\n# Test\n```\n";
    const blocks = parseCodeBlocks(content, { includeContent: true });
    assert.equal(blocks[0].path, "test/file.md");
    assert.equal(blocks[0].content, "# Test");
  });

  it("parseFileBlocks(path-only) matches manifest-generator extractFileBlocks output shape", () => {
    const content = '<file path="CLAUDE.md">\ncontent\n</file>';
    const blocks = parseFileBlocks(content);
    assert.equal(blocks[0].path, "CLAUDE.md");
    assert.equal(blocks[0].content, undefined);
  });
});
