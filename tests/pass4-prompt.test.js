const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { generatePrompts } = require("../plan-installer/prompt-generator");

function tmpDir(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

test("generatePrompts: emits pass4-prompt.md alongside pass1/2/3", () => {
  const templatesDir = path.join(__dirname, "../pass-prompts/templates");
  const generatedDir = tmpDir("p4-");

  generatePrompts(
    { backend: "java-spring", frontend: null },
    "en",
    templatesDir,
    generatedDir
  );

  const pass4 = path.join(generatedDir, "pass4-prompt.md");
  assert.ok(fs.existsSync(pass4), "pass4-prompt.md should exist");
  const body = fs.readFileSync(pass4, "utf-8");
  assert.match(body, /L4 Memory/);
  assert.match(body, /pass4-memory\.json/);
  assert.match(body, /decision-log\.md/);
  assert.match(body, /failure-patterns\.md/);
  // Runtime content must be gone
  assert.doesNotMatch(body, /session-state\.md/);
  assert.doesNotMatch(body, /pass4-runtime-memory\.json/);
  assert.doesNotMatch(body, /L4 Runtime/);

  fs.rmSync(generatedDir, { recursive: true, force: true });
});

test("generatePrompts: pass4 includes lang instruction for non-English", () => {
  const templatesDir = path.join(__dirname, "../pass-prompts/templates");
  const generatedDir = tmpDir("p4-ko-");

  generatePrompts(
    { backend: "java-spring", frontend: null },
    "ko",
    templatesDir,
    generatedDir
  );

  const pass4 = path.join(generatedDir, "pass4-prompt.md");
  const body = fs.readFileSync(pass4, "utf-8");
  assert.match(body, /한국어|Korean/i);

  fs.rmSync(generatedDir, { recursive: true, force: true });
});

test("generatePrompts: pass4 replaces {{LANG_NAME}} with resolved language label", () => {
  const templatesDir = path.join(__dirname, "../pass-prompts/templates");
  const generatedDir = tmpDir("p4-lang-");

  generatePrompts(
    { backend: "java-spring", frontend: null },
    "ko",
    templatesDir,
    generatedDir
  );

  const pass4 = path.join(generatedDir, "pass4-prompt.md");
  const body = fs.readFileSync(pass4, "utf-8");
  // {{LANG_NAME}} should be replaced with the Korean label
  assert.ok(!body.includes("{{LANG_NAME}}"), "{{LANG_NAME}} placeholder should be resolved");
  assert.match(body, /한국어 \(Korean\)/, "should contain Korean language label");

  fs.rmSync(generatedDir, { recursive: true, force: true });
});

test("generatePrompts: pass4 for English resolves {{LANG_NAME}} to English", () => {
  const templatesDir = path.join(__dirname, "../pass-prompts/templates");
  const generatedDir = tmpDir("p4-en-");

  generatePrompts(
    { backend: "node-express", frontend: null },
    "en",
    templatesDir,
    generatedDir
  );

  const pass4 = path.join(generatedDir, "pass4-prompt.md");
  const body = fs.readFileSync(pass4, "utf-8");
  assert.ok(!body.includes("{{LANG_NAME}}"), "{{LANG_NAME}} should be resolved");
  assert.match(body, /English/, "should contain English label");

  fs.rmSync(generatedDir, { recursive: true, force: true });
});

test("generatePrompts: pass4 contains rule file generation instructions", () => {
  const templatesDir = path.join(__dirname, "../pass-prompts/templates");
  const generatedDir = tmpDir("p4-rules-");

  generatePrompts(
    { backend: "java-spring", frontend: null },
    "en",
    templatesDir,
    generatedDir
  );

  const pass4 = path.join(generatedDir, "pass4-prompt.md");
  const body = fs.readFileSync(pass4, "utf-8");
  assert.match(body, /00\.core/, "should reference 00.core rule directory");
  assert.match(body, /60\.memory/, "should reference 60.memory rule directory");
  assert.match(body, /51\.doc-writing-rules\.md/, "should list doc-writing-rules");
  assert.match(body, /52\.ai-work-rules\.md/, "should list ai-work-rules");
  assert.match(body, /01\.decision-log\.md/, "should list decision-log rule");
  assert.match(body, /02\.failure-patterns\.md/, "should list failure-patterns rule");
  assert.match(body, /CLAUDE\.md append/, "should instruct CLAUDE.md append");
  assert.match(body, /50\.memory-master/, "should reference memory master plan");
  assert.match(body, /Common rules/, "should instruct common rules table in CLAUDE.md append");
  // Runtime rule references must be gone
  assert.doesNotMatch(body, /60\.runtime/, "must not reference old 60.runtime");
  assert.doesNotMatch(body, /70\.memory/, "must not reference old 70.memory (renumbered to 60)");
  assert.doesNotMatch(body, /01\.session-state\.md/, "must not reference runtime session-state");
  assert.doesNotMatch(body, /32\.runtime-master/, "must not reference runtime master plan");

  fs.rmSync(generatedDir, { recursive: true, force: true });
});

test("generatePrompts: pass4 for Japanese resolves {{LANG_NAME}} correctly", () => {
  const templatesDir = path.join(__dirname, "../pass-prompts/templates");
  const generatedDir = tmpDir("p4-ja-");

  generatePrompts(
    { backend: "kotlin-spring", frontend: null },
    "ja",
    templatesDir,
    generatedDir
  );

  const pass4 = path.join(generatedDir, "pass4-prompt.md");
  const body = fs.readFileSync(pass4, "utf-8");
  assert.ok(!body.includes("{{LANG_NAME}}"));
  assert.match(body, /日本語 \(Japanese\)/);

  fs.rmSync(generatedDir, { recursive: true, force: true });
});

test("generatePrompts: pass3 and pass4 include .staged-rules redirect directive", () => {
  const templatesDir = path.join(__dirname, "../pass-prompts/templates");
  const generatedDir = tmpDir("staged-inject-");

  generatePrompts(
    { backend: "java-spring", frontend: null },
    "en",
    templatesDir,
    generatedDir
  );

  for (const name of ["pass3-prompt.md", "pass4-prompt.md"]) {
    const body = fs.readFileSync(path.join(generatedDir, name), "utf-8");
    assert.match(body, /\.staged-rules/, `${name} must instruct writes to .staged-rules/`);
    assert.match(body, /Write path redirect/i, `${name} must contain the redirect directive heading`);
    assert.match(body, /claudeos-core\/generated\/\.staged-rules/, `${name} must show full staging path`);
  }

  fs.rmSync(generatedDir, { recursive: true, force: true });
});

test("generatePrompts: pass1 and pass2 do NOT contain the staging redirect (only pass3/pass4 need it)", () => {
  const templatesDir = path.join(__dirname, "../pass-prompts/templates");
  const generatedDir = tmpDir("staged-p1p2-");

  generatePrompts(
    { backend: "java-spring", frontend: null },
    "en",
    templatesDir,
    generatedDir
  );

  // Pass 1 & 2 write only to generated/ — no rule files — so injecting the
  // redirect there would be noise and could confuse Claude.
  for (const name of ["pass1-backend-prompt.md", "pass2-prompt.md"]) {
    const full = path.join(generatedDir, name);
    if (!fs.existsSync(full)) continue;
    const body = fs.readFileSync(full, "utf-8");
    assert.doesNotMatch(body, /Write path redirect/i, `${name} must NOT include the redirect directive`);
  }

  fs.rmSync(generatedDir, { recursive: true, force: true });
});

test("generatePrompts: redirect is injected for EVERY supported stack template", () => {
  // Discover all stack template dirs dynamically so newly-added stacks are
  // covered automatically (no hardcoded list to drift out of sync).
  const templatesDir = path.join(__dirname, "../pass-prompts/templates");
  const stackDirs = fs.readdirSync(templatesDir, { withFileTypes: true })
    .filter(d => d.isDirectory() && d.name !== "common")
    .map(d => d.name)
    .filter(name => fs.existsSync(path.join(templatesDir, name, "pass3.md")));

  // Safety floor — if templates get accidentally moved/deleted, fail loudly.
  assert.ok(stackDirs.length >= 10, `expected 10+ stack templates with pass3.md, found ${stackDirs.length}: ${stackDirs.join(", ")}`);

  for (const stack of stackDirs) {
    const generatedDir = tmpDir(`staged-${stack.replace(/[^a-z]/gi, "")}-`);
    try {
      generatePrompts(
        { backend: stack, frontend: null },
        "en",
        templatesDir,
        generatedDir
      );
      const pass3 = path.join(generatedDir, "pass3-prompt.md");
      assert.ok(fs.existsSync(pass3), `${stack}: pass3-prompt.md not generated`);
      const body = fs.readFileSync(pass3, "utf-8");
      assert.match(body, /Write path redirect/i, `${stack}: pass3 missing redirect directive`);
      assert.match(body, /claudeos-core\/generated\/\.staged-rules/, `${stack}: pass3 missing staging path`);
      const occurrences = (body.match(/Write path redirect/gi) || []).length;
      assert.equal(occurrences, 1, `${stack}: redirect must appear exactly once (found ${occurrences})`);
    } finally {
      fs.rmSync(generatedDir, { recursive: true, force: true });
    }
  }
});

test("generatePrompts: redirect stays once in multi-stack (backend + frontend) combos", () => {
  // combinedBody concatenates a frontend section after the backend body. The
  // redirect lives before combinedBody, so it must not be duplicated into the
  // frontend tail. Verify with a few representative cross-stack combos.
  const templatesDir = path.join(__dirname, "../pass-prompts/templates");
  const combos = [
    { backend: "java-spring", frontend: "node-nextjs" },
    { backend: "kotlin-spring", frontend: "angular" },
    { backend: "node-nestjs", frontend: "vue-nuxt" },
    { backend: "python-fastapi", frontend: "node-vite" },
  ];

  for (const combo of combos) {
    const generatedDir = tmpDir(`staged-multi-${combo.backend}-`);
    try {
      generatePrompts(combo, "en", templatesDir, generatedDir);
      const body = fs.readFileSync(path.join(generatedDir, "pass3-prompt.md"), "utf-8");
      const occurrences = (body.match(/Write path redirect/gi) || []).length;
      assert.equal(
        occurrences, 1,
        `${combo.backend} + ${combo.frontend}: redirect must appear exactly once (found ${occurrences})`
      );
      assert.match(body, /\.staged-rules/, `${combo.backend} + ${combo.frontend}: staging path missing`);
    } finally {
      fs.rmSync(generatedDir, { recursive: true, force: true });
    }
  }
});

test("generatePrompts: redirect survives in frontend-only projects (backend=null)", () => {
  // When backend is null, primaryTemplate falls back to frontend. The
  // injection must still happen — Pass 3 generates .claude/rules/ content for
  // frontend stacks (20.frontend, etc.) too.
  const templatesDir = path.join(__dirname, "../pass-prompts/templates");
  const frontendOnlyStacks = ["node-nextjs", "vue-nuxt", "angular"];

  for (const stack of frontendOnlyStacks) {
    const generatedDir = tmpDir(`staged-feonly-${stack}-`);
    try {
      generatePrompts(
        { backend: null, frontend: stack },
        "en",
        templatesDir,
        generatedDir
      );
      const pass3 = path.join(generatedDir, "pass3-prompt.md");
      assert.ok(fs.existsSync(pass3), `${stack}: frontend-only pass3-prompt.md not generated`);
      const body = fs.readFileSync(pass3, "utf-8");
      assert.match(body, /Write path redirect/i, `${stack}: frontend-only pass3 missing redirect`);
    } finally {
      fs.rmSync(generatedDir, { recursive: true, force: true });
    }
  }
});
