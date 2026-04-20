/**
 * ClaudeOS-Core — Memory command (L4 memory)
 *
 * Subcommands:
 *   memory compact         — apply 4-stage compaction to decision-log.md / failure-patterns.md
 *   memory score           — recompute importance of failure-patterns.md entries
 *   memory propose-rules   — analyze failure patterns, append suggestions to auto-rule-update.md
 */

const path = require("path");
const fs = require("fs");
const { PROJECT_ROOT, log } = require("../lib/cli-utils");
const { readFileSafe, writeFileSafe, ensureDir } = require("../../lib/safe-fs");

const MEMORY_DIR = path.join(PROJECT_ROOT, "claudeos-core/memory");
const GEN_DIR = path.join(PROJECT_ROOT, "claudeos-core/generated");

const FILE_SIZE_LINE_CAP = 400;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Parse a memory file into header + list of `## ...` entries.
 * Returns { header, entries: [{ heading, body, meta }] }
 * meta.lastSeen (Date|null), meta.frequency (number|null), meta.importance (number|null)
 */
function parseEntries(raw) {
  const lines = raw.split("\n");
  const headerLines = [];
  let i = 0;
  // Track whether we're inside a fenced code block so `## ...` lines
  // that appear as example markdown inside ```...``` are treated as
  // body content, not as new entry headings.
  let inFence = false;
  const FENCE_RE = /^(```|~~~)/;
  for (; i < lines.length; i++) {
    if (FENCE_RE.test(lines[i])) inFence = !inFence;
    if (!inFence && /^##\s+/.test(lines[i])) break;
    headerLines.push(lines[i]);
  }
  const entries = [];
  let cur = null;
  for (; i < lines.length; i++) {
    if (FENCE_RE.test(lines[i])) inFence = !inFence;
    if (!inFence && /^##\s+/.test(lines[i])) {
      if (cur) entries.push(cur);
      cur = { heading: lines[i], body: [] };
    } else if (cur) {
      cur.body.push(lines[i]);
    }
  }
  if (cur) entries.push(cur);

  for (const e of entries) {
    const full = [e.heading, ...e.body].join("\n");
    e.meta = {
      lastSeen: parseDate(full),
      frequency: parseField(full, "frequency") ?? parseField(full, "count"),
      importance: parseField(full, "importance"),
    };
  }
  return { header: headerLines.join("\n"), entries };
}

function parseDate(text) {
  // Match a proper field line: `- last seen: 2026-04-17`, `- **last seen**: ...`,
  // `- date: ...`. Anchored to line start (`^...m`) and a leading hyphen so
  // a date mentioned inside a verbose `Fix:` line (e.g. "apply at 2026-04-17")
  // doesn't accidentally get picked up as the entry's lastSeen.
  const fieldRe = /^[\s*-]+\*{0,2}\s*(?:last\s*seen|date)\s*\*{0,2}\s*[:=]\s*(\d{4}-\d{2}-\d{2})/im;
  const m = text.match(fieldRe);
  if (m) return new Date(m[1]);
  // Fallback: decision-log style heading `## 2026-04-17 — ...`
  const h = text.match(/^##\s+(\d{4}-\d{2}-\d{2})/m);
  if (h) return new Date(h[1]);
  return null;
}

function parseField(text, key) {
  // Anchor to field-line format: `- <key>: N`, `- **<key>**: N`, with optional
  // leading whitespace/markdown. Requires start-of-line + a hyphen (or asterisk)
  // so pseudo-fields inside a Fix body (e.g. "set the frequency: 10 in config")
  // are not picked up as the entry's real frequency value.
  // The callers order auto-scored lines (e.g. `- **importance**: 10`) ahead
  // of any user-entered plain line, so first-match still favors auto-scored.
  const re = new RegExp(`^[\\s*-]+\\*{0,2}\\s*${key}\\*{0,2}\\s*[:=]\\s*([0-9]+)`, "im");
  const m = text.match(re);
  return m ? parseInt(m[1], 10) : null;
}

function serialize({ header, entries }) {
  // Reconcile meta values back into body lines before writing.
  // Stage 2 (merge duplicates) updates `e.meta.frequency` in memory but the
  // body still carries the original `- frequency: N` line from the first
  // occurrence. Without rewriting those lines, the merged frequency total
  // would be silently discarded on disk. Same for `last seen:`.
  const body = entries.map(e => {
    const updatedBody = e.body.map(line => {
      // Preserve indentation/prefix — match `[- **]frequency:[**] N` etc.
      if (/^\s*-\s+\*?\*?frequency\*?\*?:\s*/i.test(line)
          && e.meta.frequency !== null && e.meta.frequency !== undefined) {
        return line.replace(
          /^(\s*-\s+\*?\*?frequency\*?\*?:\s*).*/i,
          `$1${e.meta.frequency}`
        );
      }
      if (/^\s*-\s+\*?\*?last seen\*?\*?:\s*/i.test(line)
          && e.meta.lastSeen instanceof Date && !isNaN(e.meta.lastSeen)) {
        const iso = e.meta.lastSeen.toISOString().slice(0, 10);
        return line.replace(
          /^(\s*-\s+\*?\*?last seen\*?\*?:\s*).*/i,
          `$1${iso}`
        );
      }
      return line;
    });
    return [e.heading, ...updatedBody].join("\n");
  }).join("\n");
  return header + (body ? "\n" + body : "") + (body.endsWith("\n") ? "" : "\n");
}

function daysSince(date) {
  if (!date) return Infinity;
  return (Date.now() - date.getTime()) / DAY_MS;
}

function loadActiveRulePaths() {
  const manifestPath = path.join(GEN_DIR, "rule-manifest.json");
  if (!fs.existsSync(manifestPath)) return new Set();
  try {
    const mf = JSON.parse(readFileSafe(manifestPath, "{}"));
    const paths = new Set();
    for (const r of mf.rules || []) {
      if (Array.isArray(r.paths)) r.paths.forEach(p => paths.add(p));
    }
    return paths;
  } catch (_e) {
    return new Set();
  }
}

function isPreserved(entry, activeRulePaths) {
  if ((entry.meta.importance ?? 0) >= 7) return true;
  if (daysSince(entry.meta.lastSeen) < 30) return true;
  const full = [entry.heading, ...entry.body].join("\n");
  for (const p of activeRulePaths) {
    // Skip glob patterns (`**/*`, `src/**/*.java`, etc.) — they are
    // applicability scopes, not anchor references. A literal glob inside
    // entry body (e.g. a Fix line explaining a glob) would otherwise make
    // every matching low-importance entry permanently preserved. Only
    // concrete file paths count as anchors.
    if (!p || /[*?[\]]/.test(p)) continue;
    if (full.includes(p)) return true;
  }
  return false;
}

function compactFile(filePath, activeRulePaths) {
  if (!fs.existsSync(filePath)) return { changed: false, reason: "missing" };
  const raw = readFileSafe(filePath);
  const parsed = parseEntries(raw);
  const before = parsed.entries.length;

  // Stage 1: Summarize aged entries (>30 days, not preserved)
  // Safety: skip entries with no parseable lastSeen date — don't assume "aged" from absence
  // Preserve metadata lines (frequency/last seen/importance) so later stages
  // (Stage 3 drop, next compact run) can still parse them. Only drop the
  // verbose prose lines.
  //
  // Fix line matching is anchored to the field format `- Fix: ...` or
  // `- **fix**: ...` (optionally also `solution:`) so that verbose prose
  // containing words like "solve" or "fixing" does not get picked up as
  // the fix line by accident.
  const FIX_LINE_RE = /^\s*-\s*\*{0,2}\s*(fix|solution)\s*\*{0,2}\s*[:=]/i;
  for (const e of parsed.entries) {
    if (!e.meta.lastSeen) continue;
    if (!isPreserved(e, activeRulePaths) && daysSince(e.meta.lastSeen) > 30) {
      const metaLines = e.body.filter(l =>
        /^\s*-\s*\*{0,2}\s*(frequency|last\s*seen|importance)\s*\*{0,2}\s*[:=]/i.test(l)
      );
      const fixLine = e.body.find(l => FIX_LINE_RE.test(l)) || "- (fix omitted)";
      // Summary marker formatted as a proper markdown list item so that:
      //   1. parseEntries can re-read it as a body line in future compactions
      //   2. GitHub/IDE markdown renderers format it consistently with the
      //      surrounding list (previously an inline italic string broke the
      //      list flow visually).
      const summaryLine = `- _Summarized on ${new Date().toISOString().slice(0, 10)} — original body dropped._`;
      e.body = [
        ...metaLines,
        summaryLine,
        fixLine,
      ];
    }
  }

  // Stage 2: Merge duplicates (by heading)
  const map = new Map();
  for (const e of parsed.entries) {
    const key = e.heading.trim();
    if (map.has(key)) {
      const prev = map.get(key);
      const prevFreq = prev.meta.frequency || 1;
      const curFreq = e.meta.frequency || 1;
      prev.meta.frequency = prevFreq + curFreq;
      if ((e.meta.lastSeen?.getTime() || 0) > (prev.meta.lastSeen?.getTime() || 0)) {
        prev.meta.lastSeen = e.meta.lastSeen;
        prev.body = e.body;
      }
    } else {
      map.set(key, e);
    }
  }
  parsed.entries = Array.from(map.values());

  // Stage 3: Drop low-importance (<3) older than 60 days
  // Safety: require parseable lastSeen AND explicit low importance — don't drop undated entries.
  // Also respect isPreserved() — an entry anchored by an active rule (concrete
  // file path match) must not be silently dropped even if it scored low and
  // is old. That anchor is the whole point of the rule-memory connection.
  parsed.entries = parsed.entries.filter(e => {
    if (!e.meta.lastSeen) return true;
    if (isPreserved(e, activeRulePaths)) return true;
    if ((e.meta.importance ?? 5) < 3 && daysSince(e.meta.lastSeen) > 60) return false;
    return true;
  });

  // Stage 4: Enforce line cap
  let totalLines = parsed.header.split("\n").length + parsed.entries.reduce((a, e) => a + 1 + e.body.length, 0);
  if (totalLines > FILE_SIZE_LINE_CAP) {
    parsed.entries.sort((a, b) => {
      const ap = isPreserved(a, activeRulePaths) ? 1 : 0;
      const bp = isPreserved(b, activeRulePaths) ? 1 : 0;
      if (ap !== bp) return bp - ap;
      return (b.meta.lastSeen?.getTime() || 0) - (a.meta.lastSeen?.getTime() || 0);
    });
    while (totalLines > FILE_SIZE_LINE_CAP && parsed.entries.length > 0) {
      const dropped = parsed.entries.pop();
      totalLines -= (1 + dropped.body.length);
    }
  }

  const after = parsed.entries.length;
  writeFileSafe(filePath, serialize(parsed));
  return { changed: true, before, after };
}

function cmdCompact() {
  ensureDir(MEMORY_DIR);
  const activeRulePaths = loadActiveRulePaths();

  const files = ["decision-log.md", "failure-patterns.md"];
  const summaries = [];
  for (const f of files) {
    const r = compactFile(path.join(MEMORY_DIR, f), activeRulePaths);
    summaries.push({ file: f, ...r });
    if (r.changed) log(`  ✅ ${f}: ${r.before} → ${r.after} entries`);
    else log(`  ⏭️  ${f}: ${r.reason}`);
  }

  // Update compaction.md "Last Compaction" section.
  // Replace ONLY the "## Last Compaction" section (up to next `##` heading or EOF).
  // Preserves any user-added content that follows.
  const compPath = path.join(MEMORY_DIR, "compaction.md");
  if (fs.existsSync(compPath)) {
    const raw = readFileSafe(compPath);
    const marker = "## Last Compaction";
    const body = `${marker}\nRan at ${new Date().toISOString()}\n${summaries.map(s => `- ${s.file}: ${s.before} → ${s.after}`).join("\n")}\n`;
    const idx = raw.indexOf(marker);
    let updated;
    if (idx >= 0) {
      // Find next `##` heading after marker (or EOF)
      const afterMarker = raw.slice(idx + marker.length);
      const nextHeadingRel = afterMarker.search(/\n## /);
      const sectionEnd = nextHeadingRel >= 0 ? idx + marker.length + nextHeadingRel + 1 : raw.length;
      updated = raw.slice(0, idx) + body + raw.slice(sectionEnd);
    } else {
      updated = raw + (raw.endsWith("\n") ? "" : "\n") + body;
    }
    writeFileSafe(compPath, updated);
  }
}

function cmdScore() {
  const file = path.join(MEMORY_DIR, "failure-patterns.md");
  if (!fs.existsSync(file)) {
    log("  ⏭️  failure-patterns.md not found");
    return;
  }
  const raw = readFileSafe(file);
  const parsed = parseEntries(raw);
  let scored = 0;
  for (const e of parsed.entries) {
    const freq = e.meta.frequency || 1;
    const ageDays = daysSince(e.meta.lastSeen);
    const recency = ageDays === Infinity ? 0 : Math.max(0, 1 - ageDays / 90);
    const importance = Math.min(10, Math.round((freq * 1.5) + (recency * 5)));
    const line = `- **importance**: ${importance} _(auto-scored ${new Date().toISOString().slice(0, 10)}, freq=${freq}, recency=${recency.toFixed(2)})_`;

    // Remove ALL existing importance lines (both the bold auto-scored variant
    // and the plain `- importance: N` variant). Without this, the first score
    // run leaves two importance lines — the auto-scored one at the top and
    // the original user-written one below it — which is confusing and makes
    // the file look like it has conflicting values.
    const IMPORTANCE_LINE_RE = /^\s*-\s*\*{0,2}\s*importance\s*\*{0,2}\s*[:=]/i;
    e.body = e.body.filter(l => !IMPORTANCE_LINE_RE.test(l));
    e.body.unshift(line);
    e.meta.importance = importance;
    scored++;
  }
  writeFileSafe(file, serialize(parsed));
  log(`  ✅ Scored ${scored} entries in failure-patterns.md`);
}

/**
 * Compute a confidence score for an auto-rule-update proposal.
 *
 * Replaces the v1 formula `min(1, freq/10 + imp/20)` which saturated too fast
 * (freq=10 → 1.0 regardless of recency/importance). New formula uses a
 * sigmoid on weighted evidence + an anchor-match multiplier.
 *
 * Inputs:
 *   freq      — number of times the pattern was seen (>= 3 at this point)
 *   imp       — importance score 1..10 (null → treated as below-average)
 *   anchored  — true if an active rule path actually matches this pattern's body
 *
 * Design:
 *   evidence     = 1.5 * freq + 0.5 * imp        (freq weighs 3× importance)
 *   sigmoid(x)   = 1 / (1 + exp(-k * (x - x0)))  (x0=8 center, k=0.35 slope)
 *   unanchored   × 0.6  (we're less confident which rule is affected)
 *   low evidence cap: if imp is null/undefined, cap evidence at 6 so the
 *     sigmoid cannot exceed ~0.36 — importance must be set for a strong score.
 *
 * Rough calibration:
 *   freq=3,  imp=5,  anchored   → ~0.35
 *   freq=5,  imp=7,  anchored   → ~0.66
 *   freq=10, imp=8,  anchored   → ~0.91
 *   freq=10, imp=8,  unanchored → ~0.55
 *   freq=3,  imp=null, anchored → ~0.26
 */
function computeConfidence(freq, imp, anchored) {
  const f = Math.max(0, freq || 0);
  const hasImp = imp !== null && imp !== undefined;
  const i = hasImp ? imp : 0;
  let evidence = 1.5 * f + 0.5 * i;
  // Penalise missing importance: cap evidence so sigmoid can't exceed ~0.36
  if (!hasImp) evidence = Math.min(evidence, 6);
  const k = 0.35;
  const x0 = 8;
  const sig = 1 / (1 + Math.exp(-k * (evidence - x0)));
  const multiplier = anchored ? 1.0 : 0.6;
  return Math.max(0, Math.min(1, sig * multiplier));
}

function cmdProposeRules() {
  const fpPath = path.join(MEMORY_DIR, "failure-patterns.md");
  const proposalPath = path.join(MEMORY_DIR, "auto-rule-update.md");
  if (!fs.existsSync(fpPath)) {
    log("  ⏭️  failure-patterns.md not found");
    return;
  }
  const parsed = parseEntries(readFileSafe(fpPath));
  const candidates = parsed.entries.filter(e => (e.meta.frequency || 0) >= 3);
  if (candidates.length === 0) {
    log("  ℹ️  No failure patterns with frequency >= 3 — nothing to propose");
    return;
  }

  const activeRulePaths = loadActiveRulePaths();
  const rulesArr = Array.from(activeRulePaths);
  const META_LINE_RE = /^\s*-\s*\*{0,2}\s*(?:frequency|count|last\s*seen|importance)\*{0,2}\s*[:=]/i;
  const proposals = [];
  for (const e of candidates) {
    const id = e.heading.replace(/^##\s+/, "").trim();
    const body = e.body.join("\n");
    // Same glob-skip logic as isPreserved(): a rule's `paths: ["**/*"]`
    // is a scope, not a concrete anchor. Only count matches against
    // literal file paths so we don't falsely anchor a pattern just because
    // its body mentions a glob string.
    const matchedRule = rulesArr.find(p => p && !/[*?[\]]/.test(p) && body.includes(p));
    const anchored = !!matchedRule;
    const affectedRule = matchedRule || "(no matching active rule — consider new rule)";
    const confidence = computeConfidence(e.meta.frequency, e.meta.importance, anchored);
    // Build a meaningful summary by skipping metadata and blank lines,
    // taking up to 3 content-bearing lines. Metadata-only summaries
    // (which happened when an entry's first 3 lines were frequency/last seen/importance)
    // are useless for the reviewer.
    const summary = e.body
      .filter(l => l.trim() && !META_LINE_RE.test(l))
      .slice(0, 3)
      .join(" ")
      .trim() || "(no body content)";
    proposals.push({
      id,
      frequency: e.meta.frequency,
      importance: e.meta.importance,
      anchored,
      affectedRule,
      confidence: confidence.toFixed(2),
      summary,
    });
  }

  const existing = readFileSafe(proposalPath, "# Auto Rule Update Proposals\n");
  const block = `\n## Generated at ${new Date().toISOString()}\n\n${proposals.map(p => `### ${p.id}\n- **Affected rule:** \`${p.affectedRule}\`${p.anchored ? "" : " _(unanchored — confidence reduced)_"}\n- **Frequency:** ${p.frequency ?? "?"} · **Importance:** ${p.importance ?? "?"} · **Confidence:** ${p.confidence}\n- **Summary:** ${p.summary}\n- **Proposed change:** <review failure-patterns.md "${p.id}" and edit the affected rule accordingly>\n`).join("\n")}\n`;

  writeFileSafe(proposalPath, existing + block);
  log(`  ✅ Appended ${proposals.length} proposal(s) to auto-rule-update.md`);
}

function showHelp() {
  log(`
Usage: npx claudeos-core memory <subcommand>

Subcommands:
  compact            Apply 4-stage compaction to decision-log.md and failure-patterns.md
  score              Recompute importance of failure-patterns.md entries (frequency × recency)
  propose-rules      Analyze failure patterns, append rule update suggestions to auto-rule-update.md
`);
}

async function cmdMemory(parsedArgs) {
  const sub = process.argv.slice(3)[0];
  switch (sub) {
    case "compact":       return cmdCompact();
    case "score":         return cmdScore();
    case "propose-rules": return cmdProposeRules();
    case undefined:
    case "--help":
    case "-h":
      showHelp();
      return;
    default:
      log(`Unknown memory subcommand: ${sub}`);
      showHelp();
      process.exit(1);
  }
}

module.exports = { cmdMemory, computeConfidence };
