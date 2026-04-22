/**
 * tests/content-validator.test.js — regression coverage for the
 * v2.3.0 content-validator [10/10] path-claim + MANIFEST drift check.
 *
 * Uses a child_process spawn because content-validator is a CLI with
 * side effects (stale-report writes, process.exit). We set up a
 * disposable project tree under os.tmpdir() and point CLAUDEOS_ROOT
 * at it, so each test is hermetic.
 */

"use strict";

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const CV_PATH = path.join(__dirname, "..", "content-validator", "index.js");
const NODE = process.execPath;

/**
 * Build a minimal project tree that satisfies the upstream [1/9] -
 * [9/9] checks with warnings only (not errors), so the only ERRORs
 * surfaced come from our [10/10] check. Returns the absolute path to
 * the tree root.
 *
 * @param {object} opts
 * @param {string} [opts.ruleBody] body of .claude/rules/00.core/test-rule.md
 * @param {string} [opts.manifest] body of claudeos-core/skills/00.shared/MANIFEST.md
 * @param {string[]} [opts.skillFiles] skill paths (relative to root) to touch into existence
 * @param {string} [opts.claudeMd] body of CLAUDE.md
 */
function buildTree(opts = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "cv-test-"));
  fs.mkdirSync(path.join(root, ".claude", "rules", "00.core"), { recursive: true });
  fs.mkdirSync(path.join(root, "claudeos-core", "skills", "00.shared"), {
    recursive: true,
  });
  fs.mkdirSync(path.join(root, "claudeos-core", "standard", "00.core"), {
    recursive: true,
  });
  fs.mkdirSync(path.join(root, "claudeos-core", "generated"), { recursive: true });

  // Minimal CLAUDE.md — content doesn't matter for path-claim check,
  // only the presence of skill references does.
  const claudeMd = opts.claudeMd != null
    ? opts.claudeMd
    : "# CLAUDE.md\n\n## 1. Role Definition\n\nbody\nbody\n\n## 2. Project Overview\n\nbody\nbody\n";
  fs.writeFileSync(path.join(root, "CLAUDE.md"), claudeMd);

  if (opts.ruleBody) {
    fs.writeFileSync(
      path.join(root, ".claude/rules/00.core/test-rule.md"),
      opts.ruleBody
    );
  }

  if (opts.manifest) {
    fs.writeFileSync(
      path.join(root, "claudeos-core/skills/00.shared/MANIFEST.md"),
      opts.manifest
    );
  }

  for (const p of opts.skillFiles || []) {
    const abs = path.join(root, p);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, "# skill\n");
  }

  return root;
}

function runValidator(root) {
  const result = spawnSync(NODE, [CV_PATH], {
    env: { ...process.env, CLAUDEOS_ROOT: root },
    encoding: "utf-8",
  });
  return {
    code: result.status,
    stdout: result.stdout || "",
    stderr: result.stderr || "",
  };
}

function cleanup(root) {
  fs.rmSync(root, { recursive: true, force: true });
}

describe("content-validator [10/10] — path-claim verification", () => {
  test("fabricated src/ path in a rule file is reported as STALE_PATH", () => {
    // The frontend-react-B dogfood case: LLM references
    // `src/feature/routers/featureRoutePath.ts` when the actual file is
    // `routePath.ts` — hallucinated "feature" prefix from parent dir.
    const root = buildTree({
      ruleBody:
        "---\npaths: ['**/*']\n---\n\n# Test rule\n\n" +
        "See `src/feature/routers/featureRoutePath.ts` for routes.\n",
    });
    const result = runValidator(root);
    assert.notStrictEqual(result.code, 0, "should exit non-zero");
    assert.match(result.stdout, /STALE_PATH/);
    assert.match(result.stdout, /featureRoutePath\.ts/);
    cleanup(root);
  });

  test("fenced code blocks are NOT scanned for path claims", () => {
    // Scaffold examples inside ``` blocks should not trigger the
    // check — they are illustrative, not claims.
    const root = buildTree({
      ruleBody:
        "# Test rule\n\n" +
        "```markdown\n" +
        "- `src/example/fabricated.ts` (inside a fence, must be ignored)\n" +
        "```\n",
    });
    const result = runValidator(root);
    // No STALE_PATH from the fenced mention.
    assert.ok(
      !result.stdout.includes("STALE_PATH"),
      "fenced path must not be reported"
    );
    cleanup(root);
  });

  test("placeholder paths like src/{domain}/... are skipped", () => {
    const root = buildTree({
      ruleBody:
        "# Test rule\n\nSee `src/{domain}/feature.ts` for the template.\n",
    });
    const result = runValidator(root);
    assert.ok(
      !result.stdout.includes("STALE_PATH"),
      "placeholder path must not be reported as stale"
    );
    cleanup(root);
  });

  test("existing src/ paths do not trigger STALE_PATH", () => {
    const root = buildTree({
      ruleBody: "# Test rule\n\nSee `src/admin/existing.ts`.\n",
    });
    // Materialize the path so it exists.
    fs.mkdirSync(path.join(root, "src", "admin"), { recursive: true });
    fs.writeFileSync(path.join(root, "src", "admin", "existing.ts"), "// ok\n");

    const result = runValidator(root);
    assert.ok(
      !result.stdout.includes("STALE_PATH"),
      "existing path must not be reported"
    );
    cleanup(root);
  });
});

describe("content-validator [10/10] — MANIFEST drift", () => {
  test("STALE_SKILL_ENTRY when MANIFEST registers a skill with no file on disk", () => {
    const root = buildTree({
      manifest:
        "# Skills Manifest\n\n" +
        "## Registered Skills\n\n" +
        "| Skill | Entry | Purpose | Status |\n" +
        "|---|---|---|---|\n" +
        "| **foo** | `claudeos-core/skills/20.frontend-page/missing.md` | x | active |\n",
      // Don't touch missing.md into existence — that's the whole point.
    });
    const result = runValidator(root);
    assert.match(result.stdout, /STALE_SKILL_ENTRY/);
    assert.match(result.stdout, /missing\.md/);
    cleanup(root);
  });

  test("MANIFEST_DRIFT when a registered skill is not referenced in CLAUDE.md", () => {
    // Skill exists on disk + in MANIFEST, but CLAUDE.md does not
    // mention it in any skill reference. Exactly the frontend-react-B
    // drift pattern (3 skills in MANIFEST, only 1 in CLAUDE.md §6).
    const root = buildTree({
      manifest:
        "# Skills Manifest\n\n" +
        "## Registered Skills\n\n" +
        "| Skill | Entry | Purpose | Status |\n" +
        "|---|---|---|---|\n" +
        "| **foo** | `claudeos-core/skills/20.frontend-page/foo.md` | x | active |\n",
      skillFiles: ["claudeos-core/skills/20.frontend-page/foo.md"],
      // CLAUDE.md uses the default stub which does not mention foo.md.
    });
    const result = runValidator(root);
    assert.match(result.stdout, /MANIFEST_DRIFT/);
    assert.match(result.stdout, /foo\.md/);
    cleanup(root);
  });

  test("registered skill referenced in CLAUDE.md produces no drift", () => {
    const root = buildTree({
      manifest:
        "# Skills Manifest\n\n" +
        "## Registered Skills\n\n" +
        "| Skill | Entry | Purpose | Status |\n" +
        "|---|---|---|---|\n" +
        "| **foo** | `claudeos-core/skills/20.frontend-page/foo.md` | x | active |\n",
      skillFiles: ["claudeos-core/skills/20.frontend-page/foo.md"],
      claudeMd:
        "# CLAUDE.md\n\n## 1. Role Definition\n\nbody\nbody\n\n" +
        "## 6. Standard / Rules / Skills Reference\n\n" +
        "### Skills\n\n" +
        "- `claudeos-core/skills/20.frontend-page/foo.md` — foo skill\n",
    });
    const result = runValidator(root);
    assert.ok(
      !result.stdout.includes("MANIFEST_DRIFT"),
      "skill referenced in CLAUDE.md body should not drift"
    );
    cleanup(root);
  });

  test("MANIFEST.md self-reference is ignored (not treated as a skill entry)", () => {
    // MANIFEST.md itself appears in backticks inside MANIFEST ("본
    // MANIFEST..."), which should never count as a registered skill.
    const root = buildTree({
      manifest:
        "# Skills Manifest\n\n" +
        "Reference to itself: `claudeos-core/skills/00.shared/MANIFEST.md`\n",
    });
    const result = runValidator(root);
    // No STALE_SKILL_ENTRY, no MANIFEST_DRIFT — MANIFEST.md doesn't
    // register itself as a skill even though it mentions its own path.
    assert.ok(
      !result.stdout.includes("STALE_SKILL_ENTRY"),
      "MANIFEST.md self-reference must be excluded"
    );
    assert.ok(
      !result.stdout.includes("MANIFEST_DRIFT"),
      "MANIFEST.md self-reference must be excluded"
    );
    cleanup(root);
  });

  test("no MANIFEST.md present → check is silently skipped", () => {
    const root = buildTree({
      // Omit manifest entirely.
    });
    const result = runValidator(root);
    // The [10/10] summary line should note "no MANIFEST.md found".
    assert.match(result.stdout, /no MANIFEST\.md found/);
    cleanup(root);
  });
});

describe("content-validator [10/10] — real-world frontend-react-B simulation", () => {
  test("reproduces all drift classes seen during real-world dogfooding", () => {
    // Recreate: 2 hallucinated src/ paths in a rule, MANIFEST with 4
    // skills (2 missing on disk), CLAUDE.md referencing only 1 of the
    // 4 skills. Expected: STALE_PATH × 2, STALE_SKILL_ENTRY × 2,
    // MANIFEST_DRIFT × 3.
    const root = buildTree({
      ruleBody:
        "# Routing rule\n\n" +
        "See `src/feature/routers/featureRoutePath.ts` and " +
        "`src/feature/routers/featureComponentMap.ts`.\n",
      manifest:
        "# Skills Manifest\n\n" +
        "## Registered Skills\n\n" +
        "| Skill | Entry | Purpose | Status |\n" +
        "|---|---|---|---|\n" +
        "| **scaffold** | `claudeos-core/skills/20.frontend-page/01.scaffold-page-feature.md` | x | active |\n" +
        "| **playground** | `claudeos-core/skills/20.frontend-page/playground/01.add-playground-sample.md` | x | active |\n" +
        "| **docs** | `claudeos-core/skills/20.frontend-page/docs/01.add-docs-page.md` | x | active |\n" +
        "| **home** | `claudeos-core/skills/20.frontend-page/home/01.edit-guide-home.md` | x | active |\n",
      skillFiles: [
        "claudeos-core/skills/20.frontend-page/01.scaffold-page-feature.md",
        "claudeos-core/skills/20.frontend-page/playground/01.add-playground-sample.md",
        // docs/* and home/* intentionally absent.
      ],
      claudeMd:
        "# CLAUDE.md\n\n## 1. Role Definition\n\nbody\nbody\n\n" +
        "## 6. Standard / Rules / Skills Reference\n\n" +
        "### Skills\n\n" +
        "- `claudeos-core/skills/00.shared/MANIFEST.md`\n" +
        "- `claudeos-core/skills/20.frontend-page/01.scaffold-page-feature.md`\n",
    });

    const result = runValidator(root);

    // Count each error class appearance.
    const count = (re) => (result.stdout.match(re) || []).length;
    const stalePath = count(/STALE_PATH/g);
    const staleSkill = count(/STALE_SKILL_ENTRY/g);
    const drift = count(/MANIFEST_DRIFT/g);

    assert.strictEqual(stalePath, 2, `STALE_PATH count: ${stalePath}`);
    assert.strictEqual(staleSkill, 2, `STALE_SKILL_ENTRY count: ${staleSkill}`);
    assert.strictEqual(drift, 3, `MANIFEST_DRIFT count: ${drift}`);

    cleanup(root);
  });
});

describe("content-validator [10/10] — orchestrator/sub-skill exception (v2.3.0)", () => {
  // When a skill ships with sub-skills under `scaffold-X-feature/` nested
  // under the same category, CLAUDE.md §6 is structurally unable to list
  // every sub-skill — Pass 3b writes §6 before Pass 3c creates the
  // sub-skills, so forcing Pass 3b to predict them either fails or
  // hallucinates filenames. The exception: when the ORCHESTRATOR is
  // referenced in CLAUDE.md, sub-skills registered in MANIFEST under that
  // orchestrator's stem are considered covered via indirection. This
  // mirrors the real-world backend-java-spring layout
  // (10.backend-crud/01.scaffold-crud-feature.md + 8 sub-skills).

  function buildBackendCrudTree() {
    return buildTree({
      manifest:
        "# Skills Manifest\n\n" +
        "## Registered Skills\n\n" +
        "| Skill | Entry | Purpose | Status |\n" +
        "|---|---|---|---|\n" +
        "| **scaffold-crud-feature** | `claudeos-core/skills/10.backend-crud/01.scaffold-crud-feature.md` | orchestrator | active |\n" +
        "| dto | `claudeos-core/skills/10.backend-crud/scaffold-crud-feature/01.dto.md` | DTO | active |\n" +
        "| mapper-read | `claudeos-core/skills/10.backend-crud/scaffold-crud-feature/02.mapper-read.md` | read mapper | active |\n" +
        "| mapper-write | `claudeos-core/skills/10.backend-crud/scaffold-crud-feature/03.mapper-write.md` | write mapper | active |\n" +
        "| service | `claudeos-core/skills/10.backend-crud/scaffold-crud-feature/04.service.md` | service | active |\n",
      skillFiles: [
        "claudeos-core/skills/10.backend-crud/01.scaffold-crud-feature.md",
        "claudeos-core/skills/10.backend-crud/scaffold-crud-feature/01.dto.md",
        "claudeos-core/skills/10.backend-crud/scaffold-crud-feature/02.mapper-read.md",
        "claudeos-core/skills/10.backend-crud/scaffold-crud-feature/03.mapper-write.md",
        "claudeos-core/skills/10.backend-crud/scaffold-crud-feature/04.service.md",
      ],
      claudeMd:
        "# CLAUDE.md\n\n## 1. Role Definition\n\nbody\nbody\n\n" +
        "## 6. Standard / Rules / Skills Reference\n\n" +
        "### Skills\n\n" +
        "- `claudeos-core/skills/00.shared/MANIFEST.md`\n" +
        "- `claudeos-core/skills/10.backend-crud/01.scaffold-crud-feature.md` — CRUD orchestrator\n",
    });
  }

  test("orchestrator mentioned in CLAUDE.md → sub-skills NOT flagged as drift", () => {
    const root = buildBackendCrudTree();
    const result = runValidator(root);
    const driftCount = (result.stdout.match(/MANIFEST_DRIFT/g) || []).length;
    assert.strictEqual(
      driftCount,
      0,
      `sub-skills covered by orchestrator must not produce MANIFEST_DRIFT, got ${driftCount}`
    );
    cleanup(root);
  });

  test("orchestrator mention + missing sub-skill file → STALE_SKILL_ENTRY still fires", () => {
    // Integrity is not suppressed by the exception: if MANIFEST registers
    // a sub-skill that has no file on disk, that is still a real problem.
    const root = buildBackendCrudTree();
    // Remove one sub-skill file from disk — MANIFEST still registers it.
    const missingSub = path.join(
      root,
      "claudeos-core/skills/10.backend-crud/scaffold-crud-feature/04.service.md"
    );
    fs.unlinkSync(missingSub);

    const result = runValidator(root);
    const staleCount = (result.stdout.match(/STALE_SKILL_ENTRY/g) || []).length;
    const driftCount = (result.stdout.match(/MANIFEST_DRIFT/g) || []).length;
    assert.strictEqual(staleCount, 1, `expected 1 STALE_SKILL_ENTRY, got ${staleCount}`);
    assert.strictEqual(driftCount, 0, `exception still applies to surviving sub-skills`);
    cleanup(root);
  });

  test("orchestrator NOT mentioned → every registered skill (including sub-skills) flagged", () => {
    // Control case: when CLAUDE.md does not mention the orchestrator at
    // all, the exception does not apply. Every row in MANIFEST must be
    // accounted for by a CLAUDE.md reference, so we get full drift.
    const root = buildBackendCrudTree();
    // Rewrite CLAUDE.md without the orchestrator reference.
    fs.writeFileSync(
      path.join(root, "CLAUDE.md"),
      "# CLAUDE.md\n\n## 1. Role Definition\n\nbody\nbody\n\n" +
        "## 6. Standard / Rules / Skills Reference\n\n" +
        "### Skills\n\n" +
        "- `claudeos-core/skills/00.shared/MANIFEST.md`\n"
    );

    const result = runValidator(root);
    const driftCount = (result.stdout.match(/MANIFEST_DRIFT/g) || []).length;
    // 1 orchestrator + 4 sub-skills = 5 drift rows.
    assert.strictEqual(
      driftCount,
      5,
      `without orchestrator reference, all 5 registered skills drift, got ${driftCount}`
    );
    cleanup(root);
  });

  test("sub-skill without matching orchestrator stem → still flagged", () => {
    // Guard against over-exception: a registered sub-skill under a
    // DIFFERENT parent stem must not be covered by an unrelated
    // orchestrator reference. The exception only applies when the
    // orchestrator's basename stem matches the sub-skill's parent dir.
    const root = buildTree({
      manifest:
        "# Skills Manifest\n\n" +
        "| Skill | Entry | Purpose | Status |\n" +
        "|---|---|---|---|\n" +
        "| **crud** | `claudeos-core/skills/10.backend-crud/01.scaffold-crud-feature.md` | orchestrator | active |\n" +
        "| **unrelated** | `claudeos-core/skills/10.backend-crud/other-feature/01.thing.md` | unrelated sub-skill | active |\n",
      skillFiles: [
        "claudeos-core/skills/10.backend-crud/01.scaffold-crud-feature.md",
        "claudeos-core/skills/10.backend-crud/other-feature/01.thing.md",
      ],
      claudeMd:
        "# CLAUDE.md\n\n## 1. Role Definition\n\nbody\nbody\n\n" +
        "### Skills\n\n" +
        "- `claudeos-core/skills/10.backend-crud/01.scaffold-crud-feature.md`\n",
      // `other-feature` stem does NOT match `scaffold-crud-feature` stem,
      // so its sub-skill must still drift.
    });
    const result = runValidator(root);
    const driftCount = (result.stdout.match(/MANIFEST_DRIFT/g) || []).length;
    assert.strictEqual(
      driftCount,
      1,
      `sub-skill under unrelated parent must still flag, got ${driftCount}`
    );
    assert.match(result.stdout, /other-feature\/01\.thing\.md/);
    cleanup(root);
  });

  test("sibling layout (one-level-deep skill, not sub-skill) is unaffected", () => {
    // Regression guard for the original frontend-react-B shape:
    // `playground/01.add-playground-sample.md` is a standalone skill
    // named "playground", NOT a sub-skill of a "scaffold-page-feature"
    // orchestrator. The exception must not accidentally cover it when
    // some unrelated orchestrator is mentioned.
    const root = buildTree({
      manifest:
        "# Skills Manifest\n\n" +
        "| Skill | Entry | Purpose | Status |\n" +
        "|---|---|---|---|\n" +
        "| scaffold | `claudeos-core/skills/20.frontend-page/01.scaffold-page-feature.md` | unrelated orchestrator | active |\n" +
        "| playground | `claudeos-core/skills/20.frontend-page/playground/01.add-playground-sample.md` | standalone | active |\n",
      skillFiles: [
        "claudeos-core/skills/20.frontend-page/01.scaffold-page-feature.md",
        "claudeos-core/skills/20.frontend-page/playground/01.add-playground-sample.md",
      ],
      claudeMd:
        "# CLAUDE.md\n\n## 1. Role Definition\n\nbody\nbody\n\n" +
        "### Skills\n\n" +
        "- `claudeos-core/skills/20.frontend-page/01.scaffold-page-feature.md`\n",
    });
    const result = runValidator(root);
    const driftCount = (result.stdout.match(/MANIFEST_DRIFT/g) || []).length;
    // playground/01.add-playground-sample.md must drift: its parent
    // stem "playground" does not match the referenced orchestrator
    // stem "scaffold-page-feature".
    assert.strictEqual(
      driftCount,
      1,
      `standalone "playground" skill must still drift when its own orchestrator is not referenced`
    );
    cleanup(root);
  });
});
