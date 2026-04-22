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
  // v2.3.0: CLAUDE.md is NEVER modified by Pass 4 anymore. The prompt
  // must contain the explicit prohibition, not the old append block.
  assert.match(body, /CLAUDE\.md MUST NOT BE MODIFIED/,
    "pass4 prompt must forbid CLAUDE.md modification in v2.3.0");
  assert.match(body, /Pass 3 already authored all 8 sections/,
    "pass4 prompt must reference Pass 3 as the authoritative author of CLAUDE.md");
  // The old "### N. Append a new section to existing CLAUDE.md"
  // instruction header must be gone.
  assert.doesNotMatch(
    body,
    /^###\s+\d+\.\s+Append a new section to existing\s+`?CLAUDE\.md`?/m,
    "old 'Append new section to CLAUDE.md' header must be retired"
  );
  // Master plan reference must NOT be in the prompt — master plan generation
  // was removed in this version.
  assert.doesNotMatch(body, /50\.memory-master/,
    "must not reference 50.memory-master — master plan generation removed");
  // Runtime rule references must be gone
  assert.doesNotMatch(body, /60\.runtime/, "must not reference old 60.runtime");
  assert.doesNotMatch(body, /70\.memory/, "must not reference old 70.memory (renumbered to 60)");
  assert.doesNotMatch(body, /01\.session-state\.md/, "must not reference runtime session-state");
  assert.doesNotMatch(body, /32\.runtime-master/, "must not reference runtime master plan");

  fs.rmSync(generatedDir, { recursive: true, force: true });
});

test("generatePrompts: pass4 enforces path fact grounding (v2.3.0 STALE_PATH prevention)", () => {
  // v2.3.0 regression guard. frontend-react-B dogfooding surfaced four
  // STALE_PATH errors in Pass 4 output (rules + standard files):
  //   - src/feature/main.tsx (Vite convention hallucination)
  //   - src/feature/routers/featureRoutePath.ts (prefix-from-parent-dir)
  //   - src/components/utils/classNameMaker.ts (plausible but unverified)
  // Root cause: Pass 4 prompt never referenced pass3a-facts.md, so the
  // LLM wrote concrete paths from prior knowledge instead of from the
  // analysis artifacts. The fix pulls pass3a-facts.md into the set of
  // required reads and adds a MANDATORY "Path fact grounding" block with
  // all three anti-patterns documented as ❌ examples.
  //
  // Checking on a frontend-only Vite stack because that's the exact
  // configuration the bug was discovered on.
  const templatesDir = path.join(__dirname, "../pass-prompts/templates");
  const generatedDir = tmpDir("p4-grounding-");

  generatePrompts(
    { backend: null, frontend: "node-vite" },
    "en",
    templatesDir,
    generatedDir
  );

  const pass4 = path.join(generatedDir, "pass4-prompt.md");
  const body = fs.readFileSync(pass4, "utf-8");

  // 1. pass3a-facts.md must be listed as a mandatory read at the top
  //    of the prompt. Previously only project-analysis.json and
  //    pass2-merged.json were listed.
  assert.match(
    body,
    /pass3a-facts\.md.*\*\*MANDATORY\*\*/s,
    "pass4 prompt must list pass3a-facts.md as a MANDATORY read"
  );

  // 2. The Path fact grounding block must be present with its
  //    canonical section header.
  assert.match(
    body,
    /## CRITICAL — Path fact grounding \(MANDATORY/,
    "pass4 prompt must contain the Path fact grounding CRITICAL section"
  );

  // 3. All three flagship anti-pattern examples must be documented
  //    verbatim so future dogfood-regression cases are named in-prompt.
  assert.match(
    body,
    /❌ `src\/feature\/main\.tsx`/,
    "must document the Vite-convention hallucination anti-pattern"
  );
  assert.match(
    body,
    /❌ `src\/feature\/routers\/featureRoutePath\.ts`/,
    "must document the parent-dir-prefix hallucination anti-pattern"
  );
  assert.match(
    body,
    /❌ `src\/components\/utils\/classNameMaker\.ts`/,
    "must document the plausible-but-unverified hallucination anti-pattern"
  );

  // 4a. MSW / testing-library convention class — added after
  //     real-world dogfooding surfaced `src/__mocks__/handlers.ts`
  //     as a Pass 3b hallucination in testing-strategy.md.
  assert.match(
    body,
    /❌ `src\/__mocks__\/handlers\.ts`/,
    "must document the MSW/testing-library convention hallucination class"
  );
  assert.match(
    body,
    /testing-library conventions \(MSW, Vitest, Jest,[\s\n]+React Testing Library\)/,
    "must name the specific library ecosystem that triggers testing-path hallucinations"
  );
  assert.match(
    body,
    /these paths do not[\s\n]+exist/,
    "must explicitly reject the premise that testing paths exist by convention"
  );

  // 5. The positive guidance — "use a directory-scoped rule instead
  //    of inventing a filename" — must also be present. This is what
  //    the LLM is supposed to do when in doubt.
  assert.match(
    body,
    /directory-scoped rule is correct; an invented file path is a bug/,
    "must document the positive pattern (directory scope over invented filename)"
  );

  // 5a. Testing-strategy-specific positive guidance — if no tests
  //     exist, describe abstractly, don't name paths.
  assert.match(
    body,
    /zero test coverage.*abstract terms|describe.*abstract.*without naming/s,
    "must document the testing-strategy-specific positive pattern"
  );

  // 6. The block must explicitly connect the rule to the downstream
  //    validator so the LLM understands why this matters.
  assert.match(
    body,
    /content-validator.*STALE_PATH/s,
    "must cross-reference content-validator's STALE_PATH detection"
  );

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
