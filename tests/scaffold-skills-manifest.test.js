/**
 * Tests for scaffoldSkillsManifest (v2.1.0).
 *
 * scaffoldSkillsManifest is a Pass 4 gap-fill that auto-creates
 * claudeos-core/skills/00.shared/MANIFEST.md when Pass 3c omits it.
 * This is necessary because .claude/rules/50.sync/03.skills-sync.md
 * names MANIFEST.md as the single source of truth for skill registration,
 * and skill-sparse projects sometimes leave that reference dangling.
 *
 * Contract:
 *   - Creates MANIFEST.md if missing               → { status: "written" }
 *   - Skips if existing content > 20 chars          → { status: "skipped" }
 *   - Overwrites stub content (≤ 20 chars)          → { status: "written" }
 *   - Respects { overwrite: true }                  → { status: "written" }
 *   - Creates parent directory if missing           → ensureDir behavior
 *   - Writes English content for lang="en"          → contains "Skill Registry"
 *   - Throws for unsupported lang (without CLI)     → translate error
 *   - Module exports are consistent                 → function + stub constant
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const os = require("os");

const {
  scaffoldSkillsManifest,
  SKILLS_MANIFEST_STUB,
} = require("../lib/memory-scaffold");

function tmpDir(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

// ─── Basic file creation ─────────────────────────────────────

test("scaffoldSkillsManifest: creates MANIFEST.md in empty directory", () => {
  const d = tmpDir("ssm-basic-");
  const sharedDir = path.join(d, "skills/00.shared");
  const result = scaffoldSkillsManifest(sharedDir, { lang: "en" });

  assert.equal(result.file, "MANIFEST.md");
  assert.equal(result.status, "written");

  const target = path.join(sharedDir, "MANIFEST.md");
  assert.ok(fs.existsSync(target), "MANIFEST.md should exist on disk");

  const content = fs.readFileSync(target, "utf-8");
  assert.match(content, /# Skill Registry/, "should contain the stub header");
  assert.ok(content.length > 100, "content should be non-trivial");

  fs.rmSync(d, { recursive: true, force: true });
});

test("scaffoldSkillsManifest: creates parent directory if missing (ensureDir behavior)", () => {
  const d = tmpDir("ssm-ensuredir-");
  // Note: "skills/00.shared" does not exist yet at this point
  const sharedDir = path.join(d, "skills/00.shared");
  assert.ok(!fs.existsSync(sharedDir), "parent dir must be absent initially");

  const result = scaffoldSkillsManifest(sharedDir, { lang: "en" });
  assert.equal(result.status, "written");
  assert.ok(fs.existsSync(sharedDir), "parent dir must be created");
  assert.ok(fs.existsSync(path.join(sharedDir, "MANIFEST.md")));

  fs.rmSync(d, { recursive: true, force: true });
});

// ─── Idempotency (skip path) ─────────────────────────────────

test("scaffoldSkillsManifest: skips when file already has real content (>20 chars)", () => {
  const d = tmpDir("ssm-skip-");
  const sharedDir = path.join(d, "skills/00.shared");
  fs.mkdirSync(sharedDir, { recursive: true });

  const userContent = "# My Custom Skill Registry\n\nProject-specific content.\n";
  fs.writeFileSync(path.join(sharedDir, "MANIFEST.md"), userContent);

  const result = scaffoldSkillsManifest(sharedDir, { lang: "en" });
  assert.equal(result.status, "skipped", "should skip existing content");

  const afterContent = fs.readFileSync(path.join(sharedDir, "MANIFEST.md"), "utf-8");
  assert.equal(afterContent, userContent, "user content must not be overwritten");

  fs.rmSync(d, { recursive: true, force: true });
});

test("scaffoldSkillsManifest: overwrites empty stub (≤20 chars)", () => {
  const d = tmpDir("ssm-stub-");
  const sharedDir = path.join(d, "skills/00.shared");
  fs.mkdirSync(sharedDir, { recursive: true });

  // Tiny stub that should be considered "empty enough" to overwrite
  fs.writeFileSync(path.join(sharedDir, "MANIFEST.md"), "x");

  const result = scaffoldSkillsManifest(sharedDir, { lang: "en" });
  assert.equal(result.status, "written", "should overwrite tiny stub");

  const afterContent = fs.readFileSync(path.join(sharedDir, "MANIFEST.md"), "utf-8");
  assert.notEqual(afterContent, "x", "stub should be replaced");
  assert.match(afterContent, /# Skill Registry/);

  fs.rmSync(d, { recursive: true, force: true });
});

test("scaffoldSkillsManifest: respects overwrite=true even for large content", () => {
  const d = tmpDir("ssm-overwrite-");
  const sharedDir = path.join(d, "skills/00.shared");
  fs.mkdirSync(sharedDir, { recursive: true });

  const userContent = "# Custom Manifest\n\n" + "Long content. ".repeat(20);
  fs.writeFileSync(path.join(sharedDir, "MANIFEST.md"), userContent);

  const result = scaffoldSkillsManifest(sharedDir, { lang: "en", overwrite: true });
  assert.equal(result.status, "written", "overwrite=true should replace");

  const afterContent = fs.readFileSync(path.join(sharedDir, "MANIFEST.md"), "utf-8");
  assert.notEqual(afterContent, userContent);
  assert.match(afterContent, /# Skill Registry/);

  fs.rmSync(d, { recursive: true, force: true });
});

// ─── Content validation ──────────────────────────────────────

test("scaffoldSkillsManifest: English stub contains expected sections", () => {
  const d = tmpDir("ssm-content-");
  const sharedDir = path.join(d, "skills/00.shared");
  scaffoldSkillsManifest(sharedDir, { lang: "en" });

  const content = fs.readFileSync(path.join(sharedDir, "MANIFEST.md"), "utf-8");
  // Must reference its role as the sync-checker anchor
  assert.match(content, /# Skill Registry/, "heading");
  assert.match(content, /50\.sync\/03\.skills-sync\.md/, "sync anchor reference");
  assert.match(content, /How to register/, "registration instructions section");
  assert.match(content, /Registered skills/, "registry table section");
  // Should be a valid skeleton (no placeholder TODOs that would fail content-validator)
  assert.doesNotMatch(content, /TODO|FIXME|XXX/i, "no unresolved placeholders");

  fs.rmSync(d, { recursive: true, force: true });
});

// ─── Non-English translation path ────────────────────────────

test("scaffoldSkillsManifest: throws clear error when translation is blocked (lang != en)", () => {
  const d = tmpDir("ssm-lang-");
  const sharedDir = path.join(d, "skills/00.shared");

  // Run with CLAUDEOS_SKIP_TRANSLATION=1 so memory-scaffold refuses to shell
  // out to `claude -p`. We expect a clear error, not silent English fallback.
  const prevEnv = process.env.CLAUDEOS_SKIP_TRANSLATION;
  process.env.CLAUDEOS_SKIP_TRANSLATION = "1";
  try {
    assert.throws(
      () => scaffoldSkillsManifest(sharedDir, { lang: "ko" }),
      /translation skipped/i,
      "should throw when translation is required but blocked"
    );
  } finally {
    if (prevEnv === undefined) delete process.env.CLAUDEOS_SKIP_TRANSLATION;
    else process.env.CLAUDEOS_SKIP_TRANSLATION = prevEnv;
  }

  fs.rmSync(d, { recursive: true, force: true });
});

// ─── Module export surface ───────────────────────────────────

test("scaffoldSkillsManifest: module exports function + stub constant", () => {
  assert.equal(typeof scaffoldSkillsManifest, "function",
    "scaffoldSkillsManifest must be exported as a function");
  assert.equal(typeof SKILLS_MANIFEST_STUB, "string",
    "SKILLS_MANIFEST_STUB must be exported as a string constant");
  assert.ok(SKILLS_MANIFEST_STUB.length > 100,
    "stub constant must be non-trivial");
  assert.match(SKILLS_MANIFEST_STUB, /# Skill Registry/,
    "stub must start with expected heading");
});
