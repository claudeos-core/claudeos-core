const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { spawnSync } = require("child_process");

const TOOLS_DIR = path.resolve(__dirname, "..");
const CLI = path.join(TOOLS_DIR, "bin/cli.js");

function tmpProject() {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "memcmd-"));
  fs.mkdirSync(path.join(d, "claudeos-core/memory"), { recursive: true });
  fs.mkdirSync(path.join(d, "claudeos-core/generated"), { recursive: true });
  return d;
}

function runMemory(cwd, ...args) {
  return spawnSync("node", [CLI, "memory", ...args], { cwd, encoding: "utf-8" });
}

test("memory score: recomputes importance of failure patterns", () => {
  const d = tmpProject();
  const fp = path.join(d, "claudeos-core/memory/failure-patterns.md");
  fs.writeFileSync(fp, `# Failure Patterns

## error-001
- frequency: 5
- last seen: ${new Date().toISOString().slice(0, 10)}
- Fix: use correct path
`);
  const r = runMemory(d, "score");
  assert.equal(r.status, 0, r.stderr);
  const updated = fs.readFileSync(fp, "utf-8");
  assert.match(updated, /\*\*importance\*\*:/);
  fs.rmSync(d, { recursive: true, force: true });
});

test("memory compact: removes low-importance aged entries", () => {
  const d = tmpProject();
  const fp = path.join(d, "claudeos-core/memory/failure-patterns.md");
  const oldDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  fs.writeFileSync(fp, `# Failure Patterns

## old-low
- importance: 1
- last seen: ${oldDate}
- Fix: gone
`);
  // Also create decision-log.md (compact expects both)
  fs.writeFileSync(path.join(d, "claudeos-core/memory/decision-log.md"), "# Decision Log\n");
  fs.writeFileSync(path.join(d, "claudeos-core/memory/compaction.md"), "# Compaction\n## Last Compaction\n(never)\n");
  const r = runMemory(d, "compact");
  assert.equal(r.status, 0, r.stderr);
  const after = fs.readFileSync(fp, "utf-8");
  assert.ok(!after.includes("old-low"), "low-importance aged entry should be removed");

  const comp = fs.readFileSync(path.join(d, "claudeos-core/memory/compaction.md"), "utf-8");
  assert.match(comp, /Ran at/);
  fs.rmSync(d, { recursive: true, force: true });
});

test("memory compact: Stage 1 summarization preserves metadata lines (regression)", () => {
  // Regression guard: previously Stage 1 replaced the entire body with
  // `_Summarized..._` + Fix line, dropping `- frequency:`, `- last seen:`,
  // `- importance:` lines. This caused parseEntries on the next run to return
  // meta.lastSeen=null, which made Stage 3 unable to drop the entry — creating
  // a "zombie" entry that could never be cleaned up.
  const d = tmpProject();
  const old40 = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  fs.writeFileSync(path.join(d, "claudeos-core/memory/decision-log.md"), "# Decision Log\n");
  fs.writeFileSync(path.join(d, "claudeos-core/memory/compaction.md"), "# Compaction\n## Last Compaction\n(never)\n");
  fs.writeFileSync(path.join(d, "claudeos-core/memory/failure-patterns.md"), `# Failure Patterns

## aged-for-summary
- frequency: 3
- last seen: ${old40}
- importance: 4
- Fix: old fix
Verbose body text that should be dropped by summarization.
More verbose content here.
`);

  const r = runMemory(d, "compact");
  assert.equal(r.status, 0, r.stderr);
  const after = fs.readFileSync(path.join(d, "claudeos-core/memory/failure-patterns.md"), "utf-8");
  // Verbose text must be gone
  assert.doesNotMatch(after, /Verbose body text that should be dropped/);
  // Summarized marker present
  assert.match(after, /_Summarized on \d{4}-\d{2}-\d{2}/);
  // Metadata must be preserved
  assert.match(after, /- frequency: 3/, "frequency line must survive summarization");
  assert.match(after, new RegExp(`- last seen: ${old40}`),
    "last seen line must survive summarization");
  // Fix line preserved
  assert.match(after, /- Fix: old fix/);
  fs.rmSync(d, { recursive: true, force: true });
});

test("memory compact: preserves content after 'Last Compaction' section", () => {
  const d = tmpProject();
  const comp = path.join(d, "claudeos-core/memory/compaction.md");
  fs.writeFileSync(comp, `# Compaction Strategy

## Stage 1
content

## Last Compaction
(never)

## Project-specific error categories
- Kotlin compilation errors
- Gradle build failures

## User-added notes
Important content that must be preserved.
`);
  fs.writeFileSync(path.join(d, "claudeos-core/memory/decision-log.md"), "# Decision Log\n");
  fs.writeFileSync(path.join(d, "claudeos-core/memory/failure-patterns.md"), "# Failure Patterns\n");

  const r = runMemory(d, "compact");
  assert.equal(r.status, 0, r.stderr);

  const after = fs.readFileSync(comp, "utf-8");
  // Last Compaction section updated
  assert.match(after, /Ran at \d{4}-\d{2}-\d{2}/);
  // Post-marker content must be preserved
  assert.match(after, /Project-specific error categories/);
  assert.match(after, /Kotlin compilation errors/);
  assert.match(after, /User-added notes/);
  assert.match(after, /Important content that must be preserved/);
  fs.rmSync(d, { recursive: true, force: true });
});

test("memory compact: Stage 2 merges duplicate pattern-ids and writes summed frequency to disk", () => {
  // Regression guard: serialize() previously discarded the merged frequency
  // because it wrote the original body text verbatim. This test ensures the
  // summed meta.frequency value actually reaches the file.
  const d = tmpProject();
  fs.writeFileSync(path.join(d, "claudeos-core/memory/decision-log.md"), "# Decision Log\n");
  fs.writeFileSync(path.join(d, "claudeos-core/memory/compaction.md"),
    "# Compaction\n## Last Compaction\n(never)\n");
  fs.writeFileSync(path.join(d, "claudeos-core/memory/failure-patterns.md"), `# Failure Patterns

## dup-pattern
- frequency: 3
- last seen: 2026-04-10
- importance: 5
- Fix: first version

## dup-pattern
- frequency: 5
- last seen: 2026-04-17
- importance: 5
- Fix: second version (latest)
`);

  const r = runMemory(d, "compact");
  assert.equal(r.status, 0, r.stderr);

  const after = fs.readFileSync(path.join(d, "claudeos-core/memory/failure-patterns.md"), "utf-8");

  // Only one pattern-id remains
  const headings = after.match(/^## dup-pattern/gm) || [];
  assert.equal(headings.length, 1, "duplicate patterns should be merged into one");

  // Frequency must be summed (3 + 5 = 8), not kept at 3
  assert.match(after, /frequency: 8/, "merged frequency must be written as sum (3+5=8)");
  assert.doesNotMatch(after, /frequency: 3\b/, "old frequency value (3) must be overwritten");

  // last seen must be the more recent date
  assert.match(after, /last seen: 2026-04-17/, "last seen must be the most recent date");
  assert.doesNotMatch(after, /last seen: 2026-04-10/, "older last seen must be overwritten");

  // Latest body content wins
  assert.match(after, /second version \(latest\)/, "newer body should win");

  fs.rmSync(d, { recursive: true, force: true });
});

test("memory propose-rules: generates proposals only for freq>=3", () => {
  const d = tmpProject();
  const fp = path.join(d, "claudeos-core/memory/failure-patterns.md");
  const today = new Date().toISOString().slice(0, 10);
  fs.writeFileSync(fp, `# Failure Patterns

## recurring-bug
- frequency: 5
- last seen: ${today}
- importance: 6

## rare-bug
- frequency: 1
- last seen: ${today}
`);
  fs.writeFileSync(path.join(d, "claudeos-core/memory/auto-rule-update.md"), "# Auto Rule Update Proposals\n");
  const r = runMemory(d, "propose-rules");
  assert.equal(r.status, 0, r.stderr);
  const out = fs.readFileSync(path.join(d, "claudeos-core/memory/auto-rule-update.md"), "utf-8");
  assert.match(out, /recurring-bug/);
  assert.ok(!out.includes("rare-bug"), "rare-bug should not propose (freq < 3)");
  fs.rmSync(d, { recursive: true, force: true });
});

test("memory propose-rules: reads auto-scored **importance** line (not user-entered plain value)", () => {
  // Regression guard: parseField's regex previously failed on `- **importance**: N`
  // (Markdown bolding) because `\bimportance\s*[:=]` required the colon to
  // follow the word directly, but `**importance**:` places `**` between.
  // The fix allows optional `**` so the auto-scored line wins over any
  // original `- importance: X` the user may have typed below it.
  const d = tmpProject();
  const today = new Date().toISOString().slice(0, 10);
  const fp = path.join(d, "claudeos-core/memory/failure-patterns.md");
  fs.writeFileSync(fp, `# Failure Patterns

## bolded-pattern
- **importance**: 10 _(auto-scored ${today}, freq=5, recency=1.00)_
- frequency: 5
- last seen: ${today}
- importance: 6
- Fix: whatever
`);
  fs.writeFileSync(path.join(d, "claudeos-core/memory/auto-rule-update.md"), "# Auto Rule Update\n");

  const r = runMemory(d, "propose-rules");
  assert.equal(r.status, 0, r.stderr);
  const out = fs.readFileSync(path.join(d, "claudeos-core/memory/auto-rule-update.md"), "utf-8");
  // Must use the auto-scored importance (10), not the user-entered value (6)
  assert.match(out, /Importance:\*\*\s*10/, "should use auto-scored importance=10, not user value=6");
  assert.doesNotMatch(out, /Importance:\*\*\s*6/, "must not use stale user-entered importance=6");
  fs.rmSync(d, { recursive: true, force: true });
});

test("memory compact: parses bolded **last seen** field (regression)", () => {
  // Companion regression guard: parseDate must also handle `**last seen**: ...`
  // otherwise compact's Stage 3 (drop low-importance >60 days) would fail to
  // read the date and incorrectly preserve entries.
  const d = tmpProject();
  const longAgo = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  fs.writeFileSync(path.join(d, "claudeos-core/memory/decision-log.md"), "# Decision Log\n");
  fs.writeFileSync(path.join(d, "claudeos-core/memory/compaction.md"), "# Compaction\n## Last Compaction\n(never)\n");
  fs.writeFileSync(path.join(d, "claudeos-core/memory/failure-patterns.md"), `# Failure Patterns

## aged-bolded
- **importance**: 1
- **last seen**: ${longAgo}
- Fix: old
`);

  const r = runMemory(d, "compact");
  assert.equal(r.status, 0, r.stderr);
  const after = fs.readFileSync(path.join(d, "claudeos-core/memory/failure-patterns.md"), "utf-8");
  // With bolded fields correctly parsed, Stage 3 should drop this entry
  // (importance < 3 AND lastSeen > 60 days ago)
  assert.ok(!after.includes("aged-bolded"),
    "entry with bolded fields should be parseable and droppable by Stage 3");
  fs.rmSync(d, { recursive: true, force: true });
});

test("memory compact: Stage 1 picks the actual Fix: field line, not verbose prose containing 'fix'", () => {
  // Regression guard: `body.find(l => /fix|solution/i.test(l))` matched
  // verbose lines like "We tried prefixing the service to fix ambiguity"
  // before reaching the real `- Fix: ...` field. The fix anchors the regex
  // to the field format `^- <opt **>(fix|solution)<opt **>:`.
  const d = tmpProject();
  const old = new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  fs.writeFileSync(path.join(d, "claudeos-core/memory/decision-log.md"), "# Decision Log\n");
  fs.writeFileSync(path.join(d, "claudeos-core/memory/compaction.md"), "# Compaction\n## Last Compaction\n(never)\n");
  fs.writeFileSync(path.join(d, "claudeos-core/memory/failure-patterns.md"), `# Failure Patterns

## bean-conflict
- frequency: 3
- last seen: ${old}
- importance: 4
Multiple services are prefixing the bean names to fix collision.
We tried solving this various ways.
- Fix: use @Primary annotation on the canonical bean
`);

  const r = runMemory(d, "compact");
  assert.equal(r.status, 0, r.stderr);
  const after = fs.readFileSync(path.join(d, "claudeos-core/memory/failure-patterns.md"), "utf-8");
  // After summarization, the real Fix: field line must be preserved
  assert.match(after, /- Fix: use @Primary annotation/,
    "real Fix: field line must be kept by Stage 1 summarization");
  // The verbose "prefixing ... to fix" line must NOT be picked as the fix
  assert.doesNotMatch(after, /prefixing the bean names/,
    "verbose prose with 'fix' word must not be selected as the fix line");
  fs.rmSync(d, { recursive: true, force: true });
});

test("memory compact: parseDate ignores dates inside Fix: field body (not a last seen)", () => {
  // Regression guard: `parseDate` previously matched `at <DATE>` inside any
  // line, so a Fix line like "- Fix: apply at 2026-04-17" would incorrectly
  // set the entry's lastSeen. The fix anchors parseDate to proper field
  // lines (`- last seen:` / `- date:`) so verbose Fix content is ignored.
  const d = tmpProject();
  fs.writeFileSync(path.join(d, "claudeos-core/memory/decision-log.md"), "# Decision Log\n");
  fs.writeFileSync(path.join(d, "claudeos-core/memory/compaction.md"), "# Compaction\n## Last Compaction\n(never)\n");
  // Entry has NO "last seen:" field but Fix contains a date.
  // With the bug, parseDate would return 2030-01-01 (a future date from Fix body)
  // and the entry would be wrongly preserved/scored.
  fs.writeFileSync(path.join(d, "claudeos-core/memory/failure-patterns.md"), `# Failure Patterns

## undated-entry
- frequency: 3
- importance: 1
- Fix: apply the patch released at 2030-01-01 to mitigate
`);

  // Run score — without the fix, recency would be computed from the Fix date
  const r = runMemory(d, "score");
  assert.equal(r.status, 0, r.stderr);
  const after = fs.readFileSync(path.join(d, "claudeos-core/memory/failure-patterns.md"), "utf-8");
  // With the fix, no lastSeen parsed → recency=0
  assert.match(after, /recency=0\.00/,
    "undated entry should score with recency=0, not a Fix-body date");
  fs.rmSync(d, { recursive: true, force: true });
});

test("memory compact: Stage 3 preserves rule-anchored entries (not just high-importance)", () => {
  // Regression guard for a silent bug in v2.0.0: Stage 3 only checked
  // importance<3 + age>60, ignoring isPreserved(). So even an entry that
  // was anchored to an active rule (via a concrete file path match in its
  // body) would be dropped when its auto-scored importance went low.
  // Fix: Stage 3 now respects isPreserved() — anchored entries survive.
  const d = tmpProject();
  // Manifest with one concrete-path rule (this is what "anchor" means)
  fs.mkdirSync(path.join(d, "claudeos-core/generated"), { recursive: true });
  fs.writeFileSync(path.join(d, "claudeos-core/generated/rule-manifest.json"),
    JSON.stringify({
      rules: [{
        path: ".claude/rules/60.memory/01.decision-log.md",
        paths: ["claudeos-core/memory/decision-log.md"],
      }],
    }));
  const longAgo = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  fs.writeFileSync(path.join(d, "claudeos-core/memory/decision-log.md"), "# Decision Log\n");
  fs.writeFileSync(path.join(d, "claudeos-core/memory/compaction.md"), "# Compaction\n## Last Compaction\n(never)\n");
  fs.writeFileSync(path.join(d, "claudeos-core/memory/failure-patterns.md"), `# Failure Patterns

## anchored-but-low
- frequency: 3
- last seen: ${longAgo}
- importance: 1
- Fix: update claudeos-core/memory/decision-log.md with rationale
`);

  const r = runMemory(d, "compact");
  assert.equal(r.status, 0, r.stderr);
  const after = fs.readFileSync(path.join(d, "claudeos-core/memory/failure-patterns.md"), "utf-8");
  assert.match(after, /## anchored-but-low/,
    "entry anchored to active rule (by concrete path) must not be dropped by Stage 3");
  fs.rmSync(d, { recursive: true, force: true });
});

test("memory compact: glob patterns (**/*, src/**/*.java) in activeRulePaths are not treated as anchors", () => {
  // Regression guard: isPreserved/cmdPropose previously matched any
  // activeRulePath found literally in entry body, so a rule with
  // `paths: ["**/*"]` (most common fallback scope) combined with a Fix
  // line containing "**/*.java" would falsely mark the entry as anchored.
  // That made low-importance aged entries permanent zombies.
  const d = tmpProject();
  fs.mkdirSync(path.join(d, "claudeos-core/generated"), { recursive: true });
  fs.writeFileSync(path.join(d, "claudeos-core/generated/rule-manifest.json"),
    JSON.stringify({
      rules: [{ path: ".claude/rules/00.core/52.ai-work-rules.md", paths: ["**/*"] }],
    }));
  const longAgo = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  fs.writeFileSync(path.join(d, "claudeos-core/memory/decision-log.md"), "# Decision Log\n");
  fs.writeFileSync(path.join(d, "claudeos-core/memory/compaction.md"), "# Compaction\n## Last Compaction\n(never)\n");
  fs.writeFileSync(path.join(d, "claudeos-core/memory/failure-patterns.md"), `# Failure Patterns

## glob-mention-but-trivial
- frequency: 1
- last seen: ${longAgo}
- importance: 1
- Fix: use **/*.java pattern in the include list
`);

  const r = runMemory(d, "compact");
  assert.equal(r.status, 0, r.stderr);
  const after = fs.readFileSync(path.join(d, "claudeos-core/memory/failure-patterns.md"), "utf-8");
  assert.ok(!after.includes("glob-mention-but-trivial"),
    "glob pattern in body must not shield a trivial old entry from Stage 3 drop");
  fs.rmSync(d, { recursive: true, force: true });
});

test("memory compact: parseEntries ignores '## ...' inside fenced code blocks", () => {
  // Regression guard: parseEntries used to split on every `## ` regardless
  // of context, so a Fix line embedding a markdown example with headings
  // inside ```...``` would be fragmented into multiple bogus entries.
  // The fix tracks fence state (``` and ~~~) and only treats ## lines
  // outside fences as entry boundaries.
  const d = tmpProject();
  fs.writeFileSync(path.join(d, "claudeos-core/memory/decision-log.md"), "# Decision Log\n");
  fs.writeFileSync(path.join(d, "claudeos-core/memory/compaction.md"),
    "# Compaction\n## Last Compaction\n(never)\n");
  fs.writeFileSync(path.join(d, "claudeos-core/memory/failure-patterns.md"), `# Failure Patterns

## real-with-embedded-md
- frequency: 4
- last seen: 2026-04-17
- Fix: use this template

\`\`\`markdown
## Example heading in doc
## Another example
\`\`\`

~~~yaml
## yaml comment
~~~

- **Real fix:** apply the above
`);

  const r = runMemory(d, "compact");
  assert.equal(r.status, 0, r.stderr);
  // Compact's summary line shows the entry count it actually saw.
  // With the fix, the file is recognised as exactly 1 entry, not 4.
  assert.match(r.stdout, /failure-patterns\.md: 1 → 1 entries/,
    "fenced code blocks must not create phantom entries");

  const after = fs.readFileSync(path.join(d, "claudeos-core/memory/failure-patterns.md"), "utf-8");
  // The real entry survives with its code block intact
  assert.match(after, /## real-with-embedded-md/);
  assert.match(after, /Example heading in doc/,
    "embedded markdown example must remain in body");
  fs.rmSync(d, { recursive: true, force: true });
});

test("memory score: parseField is anchored to field-line format (ignores pseudo-fields in Fix body)", () => {
  // Regression guard: previous `\b${key}\s*[:=]` matched any occurrence of
  // `frequency:` in the text, so a Fix line describing config like
  // "bump frequency: 10 to 50" would override the real `- frequency: 3`
  // field. The fix anchors to line-start + `-` prefix so only real field
  // lines are picked up.
  const d = tmpProject();
  fs.writeFileSync(path.join(d, "claudeos-core/memory/decision-log.md"), "# Decision Log\n");
  fs.writeFileSync(path.join(d, "claudeos-core/memory/compaction.md"), "# Compaction\n## Last Compaction\n(never)\n");
  fs.writeFileSync(path.join(d, "claudeos-core/memory/failure-patterns.md"), `# Failure Patterns

## config-trap
- Fix: bump pool frequency: 10 then restart
- frequency: 3
- last seen: 2026-04-17
`);

  const r = runMemory(d, "score");
  assert.equal(r.status, 0, r.stderr);
  const after = fs.readFileSync(path.join(d, "claudeos-core/memory/failure-patterns.md"), "utf-8");
  // Score uses the real frequency=3, not the 10 embedded in Fix
  assert.match(after, /auto-scored [^,]+, freq=3/,
    "score must use real `- frequency: 3` field, not pseudo-field in Fix body");
  assert.doesNotMatch(after, /auto-scored [^,]+, freq=10/,
    "must not match `frequency: 10` inside Fix description");
  fs.rmSync(d, { recursive: true, force: true });
});

test("memory propose-rules: summary skips metadata lines and uses content (Symptom/Fix/etc)", () => {
  // Regression guard: summary used to be `body.split("\n").slice(0, 3)`, which
  // often captured only `- **importance**:`, `- frequency:`, `- last seen:`
  // — the metadata lines typed at the top — leaving no actual content
  // (Symptom/Root cause/Fix) in the proposal. The fix filters out metadata
  // field lines and empty lines, then takes up to 3 content lines.
  const d = tmpProject();
  fs.writeFileSync(path.join(d, "claudeos-core/memory/decision-log.md"), "# Decision Log\n");
  fs.writeFileSync(path.join(d, "claudeos-core/memory/compaction.md"), "# Compaction\n## Last Compaction\n(never)\n");
  fs.writeFileSync(path.join(d, "claudeos-core/memory/failure-patterns.md"), `# Failure Patterns

## content-rich-bug
- **importance**: 10 _(auto-scored 2026-04-17, freq=5, recency=1.00)_
- frequency: 5
- last seen: 2026-04-17
- importance: 8
- **Symptom:** NullPointerException in UserService
- **Root cause:** Lazy fields accessed after session close
- **Fix:** Use @Transactional(readOnly=true) wrapper
`);
  fs.writeFileSync(path.join(d, "claudeos-core/memory/auto-rule-update.md"),
    "# Auto Rule Update Proposals\n");

  const r = runMemory(d, "propose-rules");
  assert.equal(r.status, 0, r.stderr);
  const out = fs.readFileSync(path.join(d, "claudeos-core/memory/auto-rule-update.md"), "utf-8");
  // Summary must contain real content, not just metadata
  assert.match(out, /Symptom.*NullPointerException/,
    "summary must include Symptom content, not only metadata lines");
  assert.match(out, /Fix:.*@Transactional/,
    "summary must include Fix content");
  // Summary must NOT be purely metadata
  assert.doesNotMatch(out, /Summary:\*\*\s*-\s*\*\*importance\*\*.*- frequency:.*- last seen:/,
    "summary must not be just the metadata lines");
  fs.rmSync(d, { recursive: true, force: true });
});

// ─── New in v2.0-memory-only: sigmoid confidence formula ──────

const { computeConfidence } = require("../bin/commands/memory");

test("computeConfidence: sigmoid does not saturate at freq=10 alone", () => {
  // Old formula: min(1, 10/10 + 5/20) = 1.0 (saturated)
  // New formula with imp=5, anchored: evidence = 15+2.5 = 17.5, sigmoid(17.5-8)*0.35 ≈ 0.965
  // With imp=null, anchored: evidence capped at 6, sigmoid(6-8)*0.35 ≈ 0.33
  const highWithImp = computeConfidence(10, 5, true);
  const highNoImp = computeConfidence(10, null, true);
  assert.ok(highWithImp < 1.0, `freq=10 imp=5 should not saturate to 1.0, got ${highWithImp}`);
  assert.ok(highWithImp > 0.85, `freq=10 imp=5 anchored should be strong, got ${highWithImp}`);
  assert.ok(highNoImp < 0.5, `freq=10 no imp should be penalised, got ${highNoImp}`);
});

test("computeConfidence: unanchored proposals receive 0.6x multiplier", () => {
  const anchored = computeConfidence(10, 8, true);
  const unanchored = computeConfidence(10, 8, false);
  assert.ok(Math.abs(unanchored - anchored * 0.6) < 0.01,
    `unanchored (${unanchored}) should be ~0.6 * anchored (${anchored})`);
});

test("computeConfidence: typical calibration points", () => {
  // Spot-check that the formula maps to reasonable ranges
  const weak = computeConfidence(3, 5, true);   // just barely proposable
  const medium = computeConfidence(5, 7, true);  // accumulating evidence
  const strong = computeConfidence(10, 8, true); // clear pattern
  assert.ok(weak < 0.5, `weak (freq=3 imp=5) should be <0.5, got ${weak}`);
  assert.ok(medium > 0.5 && medium < 0.85, `medium should be 0.5-0.85, got ${medium}`);
  assert.ok(strong > 0.8 && strong < 1.0, `strong should be 0.8-1.0, got ${strong}`);
  // Monotonicity
  assert.ok(weak < medium && medium < strong,
    `should be monotonic: ${weak} < ${medium} < ${strong}`);
});

test("computeConfidence: always returns [0, 1] range", () => {
  const zero = computeConfidence(0, null, false);
  assert.ok(zero >= 0 && zero <= 1, `zero case should be [0,1], got ${zero}`);
  // Extreme high values should saturate near but not exceed 1
  const extreme = computeConfidence(1000, 10, true);
  assert.ok(extreme <= 1.0);
  assert.ok(extreme > 0.99);
});

test("memory propose-rules: unanchored patterns tagged in output", () => {
  const d = tmpProject();
  const fp = path.join(d, "claudeos-core/memory/failure-patterns.md");
  const today = new Date().toISOString().slice(0, 10);
  // Entry whose body does NOT reference any active rule path
  fs.writeFileSync(fp, `# Failure Patterns

## orphan-pattern
- frequency: 5
- last seen: ${today}
- importance: 7
- Fix: unrelated to any rule
`);
  fs.writeFileSync(path.join(d, "claudeos-core/memory/auto-rule-update.md"), "# Auto Rule Update Proposals\n");
  const r = runMemory(d, "propose-rules");
  assert.equal(r.status, 0, r.stderr);
  const out = fs.readFileSync(path.join(d, "claudeos-core/memory/auto-rule-update.md"), "utf-8");
  assert.match(out, /orphan-pattern/);
  assert.match(out, /no matching active rule/);
  assert.match(out, /unanchored/, "should tag unanchored proposal");
  fs.rmSync(d, { recursive: true, force: true });
});

