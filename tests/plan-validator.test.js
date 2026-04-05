/**
 * ClaudeOS-Core — Plan Validator Tests
 *
 * Tests extractCodeBlocks and replaceCodeBlock for correct handling
 * of nested code fences inside markdown content.
 */

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");
const { extractCodeBlocks, replaceCodeBlock, extractFileBlocks, replaceFileBlock } = require("../plan-validator/index");

// ─── extractCodeBlocks ──────────────────────────────────────

describe("extractCodeBlocks", () => {
  it("extracts a simple block without nested fences", () => {
    const content = [
      "## 1. `path/to/file.md`",
      "",
      "```markdown",
      "# Title",
      "Some content here",
      "```",
      "",
    ].join("\n");

    const blocks = extractCodeBlocks(content);
    assert.equal(blocks.length, 1);
    assert.equal(blocks[0].path, "path/to/file.md");
    assert.equal(blocks[0].content, "# Title\nSome content here");
  });

  it("correctly handles nested code fences inside markdown content", () => {
    const content = [
      "## 1. `standard/01.naming.md`",
      "",
      "```markdown",
      "# Naming Convention",
      "",
      "## Good Example",
      "",
      "```kotlin",
      "class UserService {",
      "    fun findById(id: Long): User",
      "}",
      "```",
      "",
      "## Bad Example",
      "",
      "```kotlin",
      "class usrSvc {",
      "    fun f(i: Long): Any",
      "}",
      "```",
      "",
      "End of file.",
      "```",
      "",
    ].join("\n");

    const blocks = extractCodeBlocks(content);
    assert.equal(blocks.length, 1);
    assert.equal(blocks[0].path, "standard/01.naming.md");
    assert.ok(blocks[0].content.includes("class UserService"), "should include first code block");
    assert.ok(blocks[0].content.includes("class usrSvc"), "should include second code block");
    assert.ok(blocks[0].content.includes("End of file."), "should include trailing text");
  });

  it("extracts multiple blocks with nested fences", () => {
    const content = [
      "## 1. `file-a.md`",
      "",
      "```markdown",
      "# File A",
      "",
      "```java",
      "public class Foo {}",
      "```",
      "```",
      "",
      "## 2. `file-b.md`",
      "",
      "```markdown",
      "# File B",
      "",
      "```python",
      "def hello():",
      "    pass",
      "```",
      "```",
      "",
    ].join("\n");

    const blocks = extractCodeBlocks(content);
    assert.equal(blocks.length, 2);
    assert.equal(blocks[0].path, "file-a.md");
    assert.ok(blocks[0].content.includes("public class Foo"));
    assert.equal(blocks[1].path, "file-b.md");
    assert.ok(blocks[1].content.includes("def hello()"));
  });

  it("returns empty array when no blocks found", () => {
    const blocks = extractCodeBlocks("# Just a heading\nSome text\n");
    assert.deepEqual(blocks, []);
  });
});

// ─── replaceCodeBlock ──────────────────────────────────────

describe("replaceCodeBlock", () => {
  it("replaces content in a simple block", () => {
    const content = [
      "## 1. `file.md`",
      "",
      "```markdown",
      "old content",
      "```",
      "",
    ].join("\n");

    const result = replaceCodeBlock(content, "file.md", "new content");
    assert.ok(result.includes("new content"));
    assert.ok(!result.includes("old content"));
  });

  it("replaces content while preserving nested fences", () => {
    const original = [
      "## 1. `standard/01.naming.md`",
      "",
      "```markdown",
      "# Old Title",
      "",
      "```kotlin",
      "class OldClass {}",
      "```",
      "",
      "Old footer",
      "```",
      "",
      "## 2. `other.md`",
      "",
      "```markdown",
      "untouched",
      "```",
    ].join("\n");

    const newContent = [
      "# New Title",
      "",
      "```kotlin",
      "class NewClass {}",
      "```",
      "",
      "New footer",
    ].join("\n");

    const result = replaceCodeBlock(original, "standard/01.naming.md", newContent);
    assert.ok(result.includes("class NewClass"), "should contain new content");
    assert.ok(!result.includes("class OldClass"), "should not contain old content");
    assert.ok(result.includes("untouched"), "should preserve other blocks");
  });

  it("returns content unchanged for non-existent path", () => {
    const content = "## 1. `file.md`\n\n```markdown\nhello\n```\n";
    const result = replaceCodeBlock(content, "nonexistent.md", "new");
    assert.equal(result, content);
  });
});

// ─── extractFileBlocks ──────────────────────────────────────

describe("extractFileBlocks", () => {
  it("extracts file blocks correctly", () => {
    const content = [
      '<file path="a.md">',
      "content A",
      "</file>",
      "",
      '<file path="b.md">',
      "content B",
      "</file>",
    ].join("\n");

    const blocks = extractFileBlocks(content);
    assert.equal(blocks.length, 2);
    assert.equal(blocks[0].path, "a.md");
    assert.equal(blocks[0].content, "content A");
    assert.equal(blocks[1].path, "b.md");
    assert.equal(blocks[1].content, "content B");
  });
});

// ─── replaceFileBlock ──────────────────────────────────────

describe("replaceFileBlock", () => {
  it("replaces content in a <file> block", () => {
    const content = '<file path="a.md">\nold content\n</file>\n<file path="b.md">\nkeep\n</file>';
    const result = replaceFileBlock(content, "a.md", "new content");
    assert.ok(result.includes("new content"));
    assert.ok(!result.includes("old content"));
    assert.ok(result.includes("keep"), "should preserve other blocks");
  });

  it("returns content unchanged for non-existent path", () => {
    const content = '<file path="a.md">\nhello\n</file>';
    const result = replaceFileBlock(content, "nonexistent.md", "new");
    assert.equal(result, content);
  });
});

// ─── Path traversal check ──────────────────────────────────────

describe("path traversal prevention", () => {
  it("blocks paths that escape ROOT via ../", () => {
    const ROOT = path.resolve("/tmp/fake-project");
    const malicious = path.join(ROOT, "../../etc/passwd");
    const resolved = path.resolve(malicious);
    assert.ok(!resolved.startsWith(path.resolve(ROOT) + path.sep),
      "traversal path must not pass startsWith check");
  });

  it("blocks paths that share ROOT prefix but are different dirs", () => {
    const ROOT = path.resolve("/tmp/project");
    const sibling = path.resolve("/tmp/project-evil/malicious.js");
    assert.ok(!sibling.startsWith(path.resolve(ROOT) + path.sep),
      "sibling dir must not pass startsWith check");
  });

  it("allows paths within ROOT", () => {
    const ROOT = path.resolve("/tmp/project");
    const valid = path.join(ROOT, ".claude/rules/test.md");
    const resolved = path.resolve(valid);
    assert.ok(resolved.startsWith(path.resolve(ROOT) + path.sep),
      "valid path must pass startsWith check");
  });
});
