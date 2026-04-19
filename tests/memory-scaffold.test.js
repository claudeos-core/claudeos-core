const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const os = require("os");
const {
  scaffoldMemory, scaffoldRules, appendClaudeMdL4Memory, scaffoldMasterPlans,
  scaffoldDocWritingGuide,
  MEMORY_FILES, RULE_FILES_00, RULE_FILES_60,
} = require("../lib/memory-scaffold");

function tmpDir(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

// ─── scaffoldMemory ──────────────────────────────────────────

test("scaffoldMemory: creates 4 files with correct content markers", () => {
  const d = tmpDir("ms-memory-");
  const results = scaffoldMemory(d);
  assert.equal(results.length, 4);
  for (const name of Object.keys(MEMORY_FILES)) {
    assert.ok(fs.existsSync(path.join(d, name)), `${name} should exist`);
  }
  const comp = fs.readFileSync(path.join(d, "compaction.md"), "utf-8");
  assert.match(comp, /## Last Compaction/);
  const fp = fs.readFileSync(path.join(d, "failure-patterns.md"), "utf-8");
  assert.match(fp, /# Failure Patterns/);
  const dl = fs.readFileSync(path.join(d, "decision-log.md"), "utf-8");
  assert.match(dl, /# Decision Log/);
  fs.rmSync(d, { recursive: true, force: true });
});

test("scaffoldMemory: skips existing files unless overwrite", () => {
  const d = tmpDir("ms-memory2-");
  scaffoldMemory(d);
  const fp = path.join(d, "decision-log.md");
  fs.writeFileSync(fp, "user content");
  const results = scaffoldMemory(d);
  assert.equal(results.find(r => r.file === "decision-log.md").status, "skipped");
  assert.equal(fs.readFileSync(fp, "utf-8"), "user content");

  const results2 = scaffoldMemory(d, { overwrite: true });
  assert.equal(results2.find(r => r.file === "decision-log.md").status, "written");
  assert.notEqual(fs.readFileSync(fp, "utf-8"), "user content");
  fs.rmSync(d, { recursive: true, force: true });
});

// ─── scaffoldRules ───────────────────────────────────────────

test("scaffoldRules: creates 00.core/03 + 04 and 60.memory/01-04", () => {
  const d = tmpDir("ms-rules-");
  const results = scaffoldRules(d);
  // 00.core has 2 files, 60.memory has 4 files
  assert.equal(results.length, 2 + 4);

  // 00.core files
  for (const name of Object.keys(RULE_FILES_00)) {
    assert.ok(fs.existsSync(path.join(d, "00.core", name)), `00.core/${name} should exist`);
  }
  // 60.memory files
  for (const name of Object.keys(RULE_FILES_60)) {
    assert.ok(fs.existsSync(path.join(d, "60.memory", name)), `60.memory/${name} should exist`);
  }

  // Verify all rule files have YAML frontmatter
  for (const [dirName, files] of [["00.core", RULE_FILES_00], ["60.memory", RULE_FILES_60]]) {
    for (const name of Object.keys(files)) {
      const c = fs.readFileSync(path.join(d, dirName, name), "utf-8");
      assert.match(c, /^---\n/, `${dirName}/${name} should start with frontmatter`);
      assert.match(c, /\nname:/, `${dirName}/${name} should have name key`);
      assert.match(c, /\npaths:/, `${dirName}/${name} should have paths key`);
    }
  }
  fs.rmSync(d, { recursive: true, force: true });
});

test("scaffoldRules: no 60.runtime or 70.memory directory is created", () => {
  const d = tmpDir("ms-rules-noruntime-");
  scaffoldRules(d);
  assert.ok(!fs.existsSync(path.join(d, "60.runtime")), "60.runtime must NOT be created");
  assert.ok(!fs.existsSync(path.join(d, "70.memory")), "70.memory must NOT be created (renumbered to 60.memory)");
  fs.rmSync(d, { recursive: true, force: true });
});

test("scaffoldRules: rule file paths reference memory/ not runtime/", () => {
  const d = tmpDir("ms-rules-paths-");
  scaffoldRules(d);
  for (const name of Object.keys(RULE_FILES_60)) {
    const c = fs.readFileSync(path.join(d, "60.memory", name), "utf-8");
    assert.match(c, /claudeos-core\/memory\//, `${name} should reference memory/ path`);
    assert.doesNotMatch(c, /claudeos-core\/runtime\//, `${name} must not reference runtime/`);
  }
  fs.rmSync(d, { recursive: true, force: true });
});

// ─── appendClaudeMdL4Memory ───────────────────────────────────

test("appendClaudeMdL4Memory: appends section to existing CLAUDE.md", () => {
  const d = tmpDir("ms-claude-");
  const claudeMd = path.join(d, "CLAUDE.md");
  fs.writeFileSync(claudeMd, "# CLAUDE.md\n\nExisting content.\n");
  const ok = appendClaudeMdL4Memory(claudeMd);
  assert.equal(ok, true);
  const c = fs.readFileSync(claudeMd, "utf-8");
  assert.match(c, /Existing content/);
  assert.match(c, /\(L4\)/);
  assert.match(c, /Memory/);
  // Must NOT contain Runtime content anymore
  assert.doesNotMatch(c, /L4\/L5/);
  assert.doesNotMatch(c, /session-state\.md/);
  fs.rmSync(d, { recursive: true, force: true });
});

test("appendClaudeMdL4Memory: idempotent — does not append twice", () => {
  const d = tmpDir("ms-claude-idem-");
  const claudeMd = path.join(d, "CLAUDE.md");
  fs.writeFileSync(claudeMd, "# CLAUDE.md\n");
  appendClaudeMdL4Memory(claudeMd);
  const once = fs.readFileSync(claudeMd, "utf-8");
  appendClaudeMdL4Memory(claudeMd);
  const twice = fs.readFileSync(claudeMd, "utf-8");
  assert.equal(once, twice, "second call should be a no-op");
  fs.rmSync(d, { recursive: true, force: true });
});

test("appendClaudeMdL4Memory: returns false if CLAUDE.md does not exist", () => {
  const ok = appendClaudeMdL4Memory("/tmp/nonexistent-claudemd-" + Date.now() + ".md");
  assert.equal(ok, false);
});

test("appendClaudeMdL4Memory: static fallback defers to Claude-driven translated section", () => {
  // Priority policy: Claude-driven Pass 4 output (in user's chosen language)
  // always wins over the static English fallback. This test uses a Korean
  // translation as an example, but the detection mechanism is
  // language-agnostic — see the next test for the multi-language proof.
  const d = tmpDir("ms-claude-translated-");
  const claudeMd = path.join(d, "CLAUDE.md");
  fs.writeFileSync(claudeMd, `# CLAUDE.md

## 메모리 (L4)

Translated section written by Claude-driven Pass 4 (e.g. --lang ko).
`);
  const ok = appendClaudeMdL4Memory(claudeMd);
  assert.equal(ok, true, "should return true (already present — no-op)");
  const c = fs.readFileSync(claudeMd, "utf-8");
  // Must not append the English static fallback on top of the translated section
  assert.ok(!c.includes("This project uses the ClaudeOS-Core L4 Memory layer"),
    "English fallback must not override Claude-driven translated section");
  const markerCount = (c.match(/\(L4\)/g) || []).length;
  assert.equal(markerCount, 1, `should have exactly one (L4) marker, got ${markerCount}`);
  fs.rmSync(d, { recursive: true, force: true });
});

test("appendClaudeMdL4Memory: (L4) marker detection is language-agnostic", () => {
  // The `(L4)` token is language-independent — Claude may translate the
  // heading to any supported language and detection must still work.
  // This guards the init.js gap-fill pattern: after Claude-driven Pass 4
  // writes a translated section, init.js re-calls this function as a
  // safety net. It must recognise the translated section in any language
  // and return true (no-op) rather than appending a duplicate English one.
  const translations = [
    ["ko", "메모리 (L4)"],
    ["ja", "メモリ (L4)"],
    ["zh-CN", "内存 (L4)"],
    ["es", "Memoria (L4)"],
    ["de", "Speicher (L4)"],
  ];
  for (const [code, heading] of translations) {
    const d = tmpDir(`ms-claude-${code}-`);
    const claudeMd = path.join(d, "CLAUDE.md");
    fs.writeFileSync(claudeMd, `# CLAUDE.md\n\n## ${heading}\n\nTranslated section.\n`);
    appendClaudeMdL4Memory(claudeMd);
    const c = fs.readFileSync(claudeMd, "utf-8");
    const markerCount = (c.match(/\(L4\)/g) || []).length;
    assert.equal(markerCount, 1, `${code} translation: expected 1 marker (no duplicate), got ${markerCount}`);
    fs.rmSync(d, { recursive: true, force: true });
  }
});

test("appendClaudeMdL4Memory: empty CLAUDE.md receives English fallback (default policy)", () => {
  // Default language policy: when the (L4) marker is absent (either Claude
  // failed or never ran), the static English fallback is appended. English
  // is chosen as the fallback language because it is the lowest common
  // denominator and avoids maintaining 10 hardcoded translations of the
  // entire section body. The normal path (Claude-driven Pass 4 success)
  // uses the user's --lang choice; this fallback only fires when Claude
  // cannot generate the section.
  const d = tmpDir("ms-claude-fallback-");
  const claudeMd = path.join(d, "CLAUDE.md");
  fs.writeFileSync(claudeMd, "# CLAUDE.md\n");
  const ok = appendClaudeMdL4Memory(claudeMd);
  assert.equal(ok, true);
  const c = fs.readFileSync(claudeMd, "utf-8");
  assert.ok(c.includes("## Memory (L4)"),
    "English heading must be present in fallback");
  assert.ok(c.includes("This project uses the ClaudeOS-Core L4 Memory layer"),
    "English fallback body must be present");
  fs.rmSync(d, { recursive: true, force: true });
});

test("appendClaudeMdL4Memory: preserves user-added content after the L4 section", () => {
  // Regression test: if the user adds their own section after L4,
  // subsequent init runs (which call this function for gap-fill) must not
  // clobber user content.
  const d = tmpDir("ms-claude-user-");
  const claudeMd = path.join(d, "CLAUDE.md");
  fs.writeFileSync(claudeMd, "# CLAUDE.md\n");
  appendClaudeMdL4Memory(claudeMd);  // first run adds L4
  // User adds their own section afterwards
  fs.appendFileSync(claudeMd, "\n## My Custom Notes\n\nImportant user content.\n");
  const beforeSecondCall = fs.readFileSync(claudeMd, "utf-8");
  appendClaudeMdL4Memory(claudeMd);  // second run should be no-op
  const afterSecondCall = fs.readFileSync(claudeMd, "utf-8");
  assert.equal(beforeSecondCall, afterSecondCall,
    "second call must not modify file when (L4) marker is present");
  assert.ok(afterSecondCall.includes("My Custom Notes"),
    "user-added section must be preserved");
  assert.ok(afterSecondCall.includes("Important user content"));
  fs.rmSync(d, { recursive: true, force: true });
});

test("appendClaudeMdL4Memory: marker is heading-scoped — body text with (L4) does not trigger false positive", () => {
  // Regression guard: the marker must only match `(L4)` inside Markdown
  // headings (e.g. `## Memory (L4)`), NOT body text. Without this guard,
  // users who mention "Layer 4 (L4)" or OSI networking terms in their
  // CLAUDE.md would inadvertently block the fallback from adding the
  // actual Memory section.
  const d = tmpDir("ms-claude-bodytext-");
  const claudeMd = path.join(d, "CLAUDE.md");
  fs.writeFileSync(claudeMd,
    "# CLAUDE.md\n\nThis uses (L4) load balancer terminology.\nNothing to do with memory.\n");
  const ok = appendClaudeMdL4Memory(claudeMd);
  assert.equal(ok, true);
  const c = fs.readFileSync(claudeMd, "utf-8");
  // Fallback should have been applied because no heading contains (L4)
  assert.ok(c.includes("## Memory (L4)"),
    "fallback heading must be appended when (L4) only appears in body text");
  assert.ok(c.includes("This project uses the ClaudeOS-Core L4 Memory layer"),
    "fallback body must be present");
  // User's original text must be preserved
  assert.ok(c.includes("load balancer terminology"),
    "user body text must be preserved");
  fs.rmSync(d, { recursive: true, force: true });
});

test("appendClaudeMdL4Memory: marker works for `### Memory (L4)` subheadings too", () => {
  // Flexibility: the marker regex accepts `##`, `###`, `####` etc. so that
  // Claude can translate the section and nest it under an existing heading
  // structure without the fallback re-appending.
  const d = tmpDir("ms-claude-subheading-");
  const claudeMd = path.join(d, "CLAUDE.md");
  fs.writeFileSync(claudeMd, "# CLAUDE.md\n\n## Documentation\n\n### Memory (L4)\n\nSubheading.\n");
  const ok = appendClaudeMdL4Memory(claudeMd);
  assert.equal(ok, true);
  const c = fs.readFileSync(claudeMd, "utf-8");
  // No English fallback body should be added
  assert.ok(!c.includes("This project uses the ClaudeOS-Core L4 Memory layer"),
    "fallback must not append when a subheading already contains (L4)");
  fs.rmSync(d, { recursive: true, force: true });
});

test("scaffoldMemory: Claude-driven gap-fill — creates only missing files, preserves existing translated ones", () => {
  // Regression guard for init.js gap-fill path: when Claude-driven Pass 4
  // succeeds but creates only some memory files (e.g. in Korean), calling
  // scaffoldMemory(dir) must:
  //   - write the missing ones (status: "written") using English fallback
  //   - skip the existing ones (status: "skipped") so Claude's translation
  //     and any user data remain untouched.
  const d = tmpDir("ms-gapfill-");
  // Simulate: Claude made 3 files in Korean, missed decision-log.md
  fs.writeFileSync(path.join(d, "failure-patterns.md"),
    "# 실패 패턴\n\n## 예시\n- frequency: 5\n- last seen: 2026-04-17\n- Fix: 해결\n");
  fs.writeFileSync(path.join(d, "compaction.md"),
    "# 압축\n\n## Last Compaction\n(never)\n");
  fs.writeFileSync(path.join(d, "auto-rule-update.md"), "# 자동 규칙\n");

  const results = scaffoldMemory(d);
  const byFile = Object.fromEntries(results.map(r => [r.file, r.status]));

  assert.equal(byFile["decision-log.md"], "written",
    "missing decision-log.md should be written");
  assert.equal(byFile["failure-patterns.md"], "skipped",
    "existing Korean failure-patterns.md must be preserved (skipped)");
  assert.equal(byFile["compaction.md"], "skipped");
  assert.equal(byFile["auto-rule-update.md"], "skipped");

  // Verify Korean content is intact
  const fp = fs.readFileSync(path.join(d, "failure-patterns.md"), "utf-8");
  assert.match(fp, /# 실패 패턴/, "Korean title must survive");
  assert.match(fp, /예시/, "user data must survive");

  // Verify the new decision-log.md is English fallback
  const dl = fs.readFileSync(path.join(d, "decision-log.md"), "utf-8");
  assert.match(dl, /# Decision Log/, "gap-fill decision-log should be English fallback");

  fs.rmSync(d, { recursive: true, force: true });
});

// ─── scaffoldMasterPlans ──────────────────────────────────────

test("scaffoldMasterPlans: creates 50.memory-master.md only (no legacy 32.memory-master.md or 32.runtime-master.md)", () => {
  const d = tmpDir("ms-plan-");
  const planDir = path.join(d, "plan");
  const memoryDir = path.join(d, "memory");
  scaffoldMemory(memoryDir);
  const results = scaffoldMasterPlans(planDir, memoryDir);
  assert.equal(results.length, 1);
  assert.equal(results[0].file, "50.memory-master.md");
  assert.equal(results[0].status, "written");
  assert.ok(fs.existsSync(path.join(planDir, "50.memory-master.md")));
  assert.ok(!fs.existsSync(path.join(planDir, "32.memory-master.md")), "legacy 32.memory-master (renumbered to 50) must NOT exist");
  assert.ok(!fs.existsSync(path.join(planDir, "32.runtime-master.md")), "runtime master must NOT exist");
  assert.ok(!fs.existsSync(path.join(planDir, "33.memory-master.md")), "33.memory-master was also historical");
  fs.rmSync(d, { recursive: true, force: true });
});

test("scaffoldMasterPlans: embeds all 4 memory files in <file> blocks", () => {
  const d = tmpDir("ms-plan2-");
  const planDir = path.join(d, "plan");
  const memoryDir = path.join(d, "memory");
  scaffoldMemory(memoryDir);
  scaffoldMasterPlans(planDir, memoryDir);
  const content = fs.readFileSync(path.join(planDir, "50.memory-master.md"), "utf-8");
  for (const name of Object.keys(MEMORY_FILES)) {
    assert.match(
      content,
      new RegExp(`<file path="claudeos-core/memory/${name.replace(".", "\\.")}">`),
      `should contain <file> block for ${name}`
    );
  }
  fs.rmSync(d, { recursive: true, force: true });
});

test("scaffoldMasterPlans: skips if file exists, overwrites if opts.overwrite", () => {
  const d = tmpDir("ms-plan3-");
  const planDir = path.join(d, "plan");
  const memoryDir = path.join(d, "memory");
  scaffoldMemory(memoryDir);
  scaffoldMasterPlans(planDir, memoryDir);
  const original = fs.readFileSync(path.join(planDir, "50.memory-master.md"), "utf-8");

  const r1 = scaffoldMasterPlans(planDir, memoryDir);
  assert.equal(r1[0].status, "skipped");

  const r2 = scaffoldMasterPlans(planDir, memoryDir, { overwrite: true });
  assert.equal(r2[0].status, "written");
  // Content should still be valid
  assert.ok(fs.readFileSync(path.join(planDir, "50.memory-master.md"), "utf-8").includes("50. Memory Master Plan"));
  fs.rmSync(d, { recursive: true, force: true });
});

// ─── scaffoldDocWritingGuide ──────────────────────────────────

test("scaffoldDocWritingGuide: creates file with next sequential number", () => {
  const d = tmpDir("ms-std-");
  // Simulate existing 01, 02, 03 in standard/00.core/
  fs.writeFileSync(path.join(d, "01.existing.md"), "x");
  fs.writeFileSync(path.join(d, "02.existing.md"), "x");
  fs.writeFileSync(path.join(d, "03.existing.md"), "x");
  const r = scaffoldDocWritingGuide(d);
  assert.equal(r.status, "written");
  assert.equal(r.file, "04.doc-writing-guide.md");
  assert.ok(fs.existsSync(path.join(d, "04.doc-writing-guide.md")));
  fs.rmSync(d, { recursive: true, force: true });
});

test("scaffoldDocWritingGuide: if empty directory, uses 01", () => {
  const d = tmpDir("ms-std2-");
  const r = scaffoldDocWritingGuide(d);
  assert.equal(r.status, "written");
  assert.match(r.file, /^\d{2}\.doc-writing-guide\.md$/);
  fs.rmSync(d, { recursive: true, force: true });
});

// ─── 52.ai-work-rules.md content guards (session improvements) ─
//
// These tests pin the structure and content additions made during the
// AI Work Rules hardening pass. They catch silent regressions if anyone
// later edits RULE_FILES_00["52.ai-work-rules.md"] without intent.

const AI_WORK_RULES = RULE_FILES_00["52.ai-work-rules.md"];

test("ai-work-rules: structural sanity — 7 sections, 17 hallucination patterns, frontmatter", () => {
  const sections = (AI_WORK_RULES.match(/^## /gm) || []).length;
  const tableRows = (AI_WORK_RULES.match(/^\| \d+ \|/gm) || []).length;
  assert.equal(sections, 7, "expected 7 ## sections");
  assert.equal(tableRows, 17, "expected 17 hallucination pattern rows");
  // Pattern numbering must be 1..17 continuous (no gaps from removals)
  const nums = [...AI_WORK_RULES.matchAll(/^\| (\d+) \|/gm)].map(m => parseInt(m[1]));
  assert.deepEqual(nums, Array.from({ length: 17 }, (_, i) => i + 1));
  // Frontmatter
  assert.match(AI_WORK_RULES, /^---\nname: AI Work Rules\npaths:\n {2}- "\*\*\/\*"\n---/);
});

test("ai-work-rules: Safety & Security section — destructive commands + secrets rules", () => {
  assert.match(AI_WORK_RULES, /## Safety & Security/);
  // CRITICAL override marker
  assert.match(AI_WORK_RULES, /CRITICAL: These rules override every other rule/);
  // Destructive cmd rule must enumerate the high-risk commands
  assert.match(AI_WORK_RULES, /Destructive commands require explicit user confirmation/);
  for (const cmd of ["rm -rf", "git reset --hard", "git push --force", "DROP TABLE", "npm publish"]) {
    assert.ok(AI_WORK_RULES.includes(cmd), `destructive cmd list missing: ${cmd}`);
  }
  // Re-confirm clause prevents "blanket authorization" interpretation
  assert.match(AI_WORK_RULES, /Authorization for one destructive command is NOT general authorization/);
  // Secrets rule covers files + variable-name-only reference
  assert.match(AI_WORK_RULES, /Never echo, log, write to comments, or commit values from secret files/);
  for (const f of [".env*", "*.pem", "*.key", "id_rsa*"]) {
    assert.ok(AI_WORK_RULES.includes(f), `secret file pattern missing: ${f}`);
  }
  assert.match(AI_WORK_RULES, /process\.env\.DB_PASSWORD/);
});

test("ai-work-rules: Hallucination patterns 11-17 — universal AI failure modes present", () => {
  // P0/P1/P-NEXT-0/A4 additions: import / API version / config drift / RSC / props / secrets / migrations
  const required = [
    /Suggesting an import or package name without verifying/,            // 11 (B+C)
    /Mixing API signatures from different major versions/,               // 12 (B+C)
    /Editing one environment config file without checking sibling parity/, // 13 (B+C)
    /Mixing server\/client component boundaries/,                        // 14 (P1)
    /Inventing component prop names or function arguments/,              // 15 (P1)
    /Hardcoding API keys, tokens, passwords, or DB credentials/,         // 16 (P-NEXT-0)
    /Editing historical database migration files/,                       // 17 (A4)
  ];
  for (const re of required) assert.match(AI_WORK_RULES, re);
});

test("ai-work-rules: backend/frontend balance — frontend examples present in §3 #6 and §7", () => {
  // P0 additions: frontend env prefixes + state libs + Angular env files
  for (const token of [
    "VITE_", "NEXT_PUBLIC_", "REACT_APP_",                // env prefixes
    "Pinia", "Redux", "Zustand",                          // frontend state libs
    "environment*.ts", "vite.config.*", "next.config.*",  // frontend config family
    "Angular",                                            // explicit framework name
  ]) {
    assert.ok(AI_WORK_RULES.includes(token), `frontend balance token missing: ${token}`);
  }
});

test("ai-work-rules: pattern 12 (wrong-version API) — references both manifest AND lockfile", () => {
  // P0 lockfile addition prevents AI from trusting only manifest version ranges
  for (const f of ["package-lock.json", "pnpm-lock.yaml", "yarn.lock", "poetry.lock", "Pipfile.lock", "uv.lock"]) {
    assert.ok(AI_WORK_RULES.includes(f), `lockfile not referenced: ${f}`);
  }
  for (const f of ["pom.xml", "build.gradle", "package.json", "pyproject.toml"]) {
    assert.ok(AI_WORK_RULES.includes(f), `manifest not referenced: ${f}`);
  }
});

test("ai-work-rules: pattern 17 (DB migration) — covers Flyway/Alembic/Rails/Prisma/TypeORM", () => {
  // A4 additions
  for (const m of [
    "migrations/V*.sql",       // Flyway
    "alembic/versions/*.py",   // Alembic
    "db/migrate/*.rb",         // Rails
    "prisma/migrations",       // Prisma
    "migrations/*.ts",         // TypeORM
  ]) {
    assert.ok(AI_WORK_RULES.includes(m), `migration pattern missing: ${m}`);
  }
  // Verify command suggestions
  for (const cmd of ["flyway info", "alembic history", "prisma migrate status"]) {
    assert.ok(AI_WORK_RULES.includes(cmd), `migration history cmd missing: ${cmd}`);
  }
});

test("ai-work-rules: §1 #2 narrowed — subagent delegation allowed for non-critical work", () => {
  // P1: original "Always read directly. Do not rely on sub-agent summaries" was too absolute
  assert.match(AI_WORK_RULES, /Always read and judge critical facts directly/);
  assert.match(AI_WORK_RULES, /Sub-agents can explore and summarize/);
  // The pre-P1 absolute form must be gone
  assert.ok(!/\*\*Always read and judge directly\.\*\* Do not rely on sub-agent summaries/.test(AI_WORK_RULES),
    "pre-P1 absolute subagent prohibition still present");
});

test("ai-work-rules: §3 No Unsolicited Work — Exception clauses (P1) prevent contradiction", () => {
  // §3 #1 Exception: factual errors must be reported even if unsolicited
  assert.match(AI_WORK_RULES, /Exception: factual errors in this project's own docs/);
  // §3 #7 Exception: internal dirs may be read when debugging or when user asks
  assert.match(AI_WORK_RULES, /Exception: read directly when the user explicitly asks/);
});

test("ai-work-rules: §3 #4 (empty directories) — marker convention (P-FIX-2)", () => {
  // The pre-fix absolute "are intentional" form must be gone
  assert.ok(!AI_WORK_RULES.includes("Empty directories/file references for future expansion are intentional"),
    "pre-fix absolute empty-dir rule still present");
  // Marker convention must enable detection of neglected empty dirs
  assert.match(AI_WORK_RULES, /verify markers before flagging or removing/);
  for (const m of [".gitkeep", "KEEP_EMPTY.md", "listed in CLAUDE.md as planned"]) {
    assert.ok(AI_WORK_RULES.includes(m), `marker hint missing: ${m}`);
  }
  assert.match(AI_WORK_RULES, /ask the user before deleting/);
});

test("ai-work-rules: §6 Planned References — Exception for typo masquerade (P-FIX-1)", () => {
  // The §3 #1 Exception ("report dead references") must not contradict §6 #3 anymore
  assert.match(AI_WORK_RULES, /typo masquerading as a planned reference/);
  assert.match(AI_WORK_RULES, /3\+ documents/);
});

test("ai-work-rules: P2 cleanup — redundant patterns 5/6/13 removed", () => {
  // P2 removed three patterns that duplicated other rules
  assert.ok(!AI_WORK_RULES.includes("Exaggerating common techniques as"),
    "removed pattern 'Exaggerating common as rare' came back");
  assert.ok(!AI_WORK_RULES.includes("Reporting explicitly excluded items as"),
    "removed pattern 'Excluded items as missing' came back");
  assert.ok(!AI_WORK_RULES.includes("Over-reporting minor wording differences across layers as"),
    "removed pattern 'Over-reporting wording' came back");
});

test("ai-work-rules: P2 merge — single 'Project Architecture' section (no separate Memory vs Rules)", () => {
  assert.match(AI_WORK_RULES, /## Project Architecture — Hands Off/);
  assert.ok(!AI_WORK_RULES.includes("## Memory vs Rules"),
    "pre-P2 separate 'Memory vs Rules' section came back");
  // Merged content still present
  assert.match(AI_WORK_RULES, /Memory.*on-demand.*Rules.*auto-loaded by path match.*never simultaneously loaded by default/s);
});

test("ai-work-rules: P3 — pattern 7 explanation is audience-agnostic (not vibe-coding)", () => {
  assert.ok(!AI_WORK_RULES.includes("vibe-coding workflows"),
    "pre-P3 'vibe-coding workflows' framing came back");
  assert.match(AI_WORK_RULES, /AI-assisted code generation/);
  assert.match(AI_WORK_RULES, /regardless of audience experience/);
});

test("ai-work-rules: F1 cleanup — §1 has 4 bullets (Cross-check duplicate removed)", () => {
  const accuracySection = AI_WORK_RULES.split("## Accuracy First")[1].split("##")[0];
  const bullets = (accuracySection.match(/^- /gm) || []).length;
  assert.equal(bullets, 4, "§1 Accuracy First should have exactly 4 bullets after F1 cleanup");
  // The removed bullet is gone
  assert.ok(!AI_WORK_RULES.includes("Cross-check agent results against source documents"),
    "removed §1 #5 'Cross-check agent results' bullet came back");
});

test("ai-work-rules: §7 Code/Document Accuracy — B3 neighbor file pattern bullet present", () => {
  assert.match(AI_WORK_RULES, /Before writing new code, read 2-3 neighboring files/);
  assert.match(AI_WORK_RULES, /naming conventions, error handling, logging style/);
  // §7 should now have 3 bullets (B3 added one)
  const codeSection = AI_WORK_RULES.split("## Code/Document Generation Accuracy")[1] || "";
  const bullets = (codeSection.match(/^- /gm) || []).length;
  assert.equal(bullets, 3, "§7 should have 3 bullets after B3 addition");
});

test("ai-work-rules: 'Established conventions take precedence' rule (B+C initial) preserved", () => {
  // The high-value rule from the initial B+C round must survive all later refactors
  assert.match(AI_WORK_RULES, /Established codebase conventions take precedence over textbook-ideal patterns/);
  assert.match(AI_WORK_RULES, /Propose modernization.*ONLY when the user explicitly requests it/);
});

// ─── Integration: full static fallback ────────────────────────

test("static fallback integration: scaffolds memory + rules + plan + standard + CLAUDE.md", () => {
  const d = tmpDir("ms-integration-");
  const memoryDir = path.join(d, "claudeos-core/memory");
  const planDir = path.join(d, "claudeos-core/plan");
  const standardCoreDir = path.join(d, "claudeos-core/standard/00.core");
  const rulesDir = path.join(d, ".claude/rules");
  const claudeMd = path.join(d, "CLAUDE.md");
  fs.writeFileSync(claudeMd, "# CLAUDE.md\n\nInitial.\n");
  fs.mkdirSync(standardCoreDir, { recursive: true });

  scaffoldMemory(memoryDir);
  scaffoldRules(rulesDir);
  scaffoldDocWritingGuide(standardCoreDir);
  scaffoldMasterPlans(planDir, memoryDir);
  const appended = appendClaudeMdL4Memory(claudeMd);

  assert.equal(appended, true);
  // Memory files
  for (const name of Object.keys(MEMORY_FILES)) {
    assert.ok(fs.existsSync(path.join(memoryDir, name)));
  }
  // Rules files
  for (const name of Object.keys(RULE_FILES_00)) {
    assert.ok(fs.existsSync(path.join(rulesDir, "00.core", name)));
  }
  for (const name of Object.keys(RULE_FILES_60)) {
    assert.ok(fs.existsSync(path.join(rulesDir, "60.memory", name)));
  }
  // Plan
  assert.ok(fs.existsSync(path.join(planDir, "50.memory-master.md")));
  // Standard (any XX.doc-writing-guide.md)
  const stdFiles = fs.readdirSync(standardCoreDir).filter(f => f.endsWith("doc-writing-guide.md"));
  assert.equal(stdFiles.length, 1);
  // CLAUDE.md should contain (L4) marker
  assert.match(fs.readFileSync(claudeMd, "utf-8"), /\(L4\)/);
  fs.rmSync(d, { recursive: true, force: true });
});
