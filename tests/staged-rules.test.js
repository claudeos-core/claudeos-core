/**
 * moveStagedRules — copies Pass 3/Pass 4 staged rule files from
 * claudeos-core/generated/.staged-rules/** to .claude/rules/**.
 *
 * Workaround for Claude Code's sensitive-path block on .claude/.
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const os = require("os");

const { moveStagedRules, countFilesRecursive } = require("../lib/staged-rules");

function tmpDir() { return fs.mkdtempSync(path.join(os.tmpdir(), "staged-rules-")); }
function cleanup(d) { try { fs.rmSync(d, { recursive: true, force: true }); } catch (_e) {} }

function stage(projectRoot, rel, body) {
  const abs = path.join(projectRoot, "claudeos-core", "generated", ".staged-rules", rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, body);
}

test("skipped: no staging dir → returns skipped=true, no error", () => {
  const d = tmpDir();
  try {
    const r = moveStagedRules(d);
    assert.equal(r.skipped, true);
    assert.equal(r.moved, 0);
    assert.equal(r.failed, 0);
  } finally { cleanup(d); }
});

test("moves nested files preserving subpath, creates .claude/rules/", () => {
  const d = tmpDir();
  try {
    stage(d, "00.core/00.standard-reference.md", "# std ref\n");
    stage(d, "10.backend/01.controller-rules.md", "# ctrl\n");
    stage(d, "60.memory/01.decision-log.md", "# dlog\n");

    const r = moveStagedRules(d);

    assert.equal(r.skipped, false);
    assert.equal(r.moved, 3);
    assert.equal(r.failed, 0);
    assert.deepEqual(
      r.files.sort(),
      ["00.core/00.standard-reference.md", "10.backend/01.controller-rules.md", "60.memory/01.decision-log.md"]
    );

    // Destinations exist with original content
    assert.equal(fs.readFileSync(path.join(d, ".claude/rules/00.core/00.standard-reference.md"), "utf-8"), "# std ref\n");
    assert.equal(fs.readFileSync(path.join(d, ".claude/rules/10.backend/01.controller-rules.md"), "utf-8"), "# ctrl\n");
    assert.equal(fs.readFileSync(path.join(d, ".claude/rules/60.memory/01.decision-log.md"), "utf-8"), "# dlog\n");

    // Staging dir removed on full success
    assert.equal(fs.existsSync(path.join(d, "claudeos-core/generated/.staged-rules")), false);
  } finally { cleanup(d); }
});

test("overwrites existing file in .claude/rules/ (move semantics)", () => {
  const d = tmpDir();
  try {
    const dstDir = path.join(d, ".claude/rules/00.core");
    fs.mkdirSync(dstDir, { recursive: true });
    fs.writeFileSync(path.join(dstDir, "foo.md"), "OLD CONTENT");
    stage(d, "00.core/foo.md", "NEW CONTENT");

    const r = moveStagedRules(d);

    assert.equal(r.moved, 1);
    assert.equal(r.failed, 0);
    assert.equal(fs.readFileSync(path.join(dstDir, "foo.md"), "utf-8"), "NEW CONTENT");
  } finally { cleanup(d); }
});

test("empty staging dir → skipped=false, moved=0, dir removed", () => {
  const d = tmpDir();
  try {
    fs.mkdirSync(path.join(d, "claudeos-core/generated/.staged-rules"), { recursive: true });
    const r = moveStagedRules(d);
    assert.equal(r.skipped, false);
    assert.equal(r.moved, 0);
    assert.equal(r.failed, 0);
    // Empty tree still cleaned up
    assert.equal(fs.existsSync(path.join(d, "claudeos-core/generated/.staged-rules")), false);
  } finally { cleanup(d); }
});

test("idempotent: running twice is safe (second run skipped)", () => {
  const d = tmpDir();
  try {
    stage(d, "00.core/a.md", "a\n");
    const r1 = moveStagedRules(d);
    const r2 = moveStagedRules(d);
    assert.equal(r1.moved, 1);
    assert.equal(r2.skipped, true);
    assert.equal(fs.readFileSync(path.join(d, ".claude/rules/00.core/a.md"), "utf-8"), "a\n");
  } finally { cleanup(d); }
});

test("countFilesRecursive: returns 0 for missing dir", () => {
  const d = tmpDir();
  try {
    assert.equal(countFilesRecursive(path.join(d, "does/not/exist")), 0);
  } finally { cleanup(d); }
});

test("countFilesRecursive: counts across nested subdirectories", () => {
  const d = tmpDir();
  try {
    const root = path.join(d, ".claude/rules");
    fs.mkdirSync(path.join(root, "00.core"), { recursive: true });
    fs.mkdirSync(path.join(root, "10.backend"), { recursive: true });
    fs.mkdirSync(path.join(root, "60.memory/deep"), { recursive: true });
    fs.writeFileSync(path.join(root, "00.core/a.md"), "");
    fs.writeFileSync(path.join(root, "00.core/b.md"), "");
    fs.writeFileSync(path.join(root, "10.backend/c.md"), "");
    fs.writeFileSync(path.join(root, "60.memory/deep/d.md"), "");
    assert.equal(countFilesRecursive(root), 4);
  } finally { cleanup(d); }
});

test("countFilesRecursive: empty directory returns 0", () => {
  const d = tmpDir();
  try {
    const root = path.join(d, ".claude/rules");
    fs.mkdirSync(root, { recursive: true });
    assert.equal(countFilesRecursive(root), 0);
  } finally { cleanup(d); }
});
