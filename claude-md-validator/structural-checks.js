/**
 * structural-checks.js — Language-invariant structural validation for CLAUDE.md.
 *
 * WHY LANGUAGE-INVARIANT:
 * claudeos-core generates CLAUDE.md in 10 different output languages. Any
 * validation that relies on matching translated natural-language strings
 * (forbidden section titles, heading text, etc.) must maintain a separate
 * blocklist per language — an unbounded maintenance burden and a common
 * source of false negatives (a new phrasing slips through because its
 * translation wasn't listed).
 *
 * This module uses only structural signals that survive translation:
 *   - Markdown syntax: `^## `, `^### `, `^#### `, `^```  — not localized.
 *   - File names: `decision-log.md`, `failure-patterns.md`, etc. — literal
 *     identifiers that stay the same in every language.
 *   - Counts and positions: section count, sub-section count per section,
 *     number of times a given memory file is referenced.
 *
 * All checks here pass or fail identically regardless of whether the
 * CLAUDE.md was generated in English, Korean, Japanese, Vietnamese, etc.
 */

"use strict";

const EXPECTED_H2_COUNT = 8;

// Memory file names are literal identifiers and never translated.
// Used as language-invariant markers for the L4 Memory sub-section.
const MEMORY_FILES = [
  "decision-log.md",
  "failure-patterns.md",
  "compaction.md",
  "auto-rule-update.md",
];

// Canonical section headings. Every generated CLAUDE.md, regardless of
// output language, must contain the English canonical phrase in each
// section's heading. Translation may be appended in parentheses.
//
// This enforces cross-repo discoverability: a multi-project search like
// `grep "## 7. DO NOT Read"` must match every sibling CLAUDE.md in an
// organization. Without this invariant, one project's §7 reads
// "DO NOT Read (...)" and another's reads "읽지 말 것 (DO NOT Read)" —
// structurally identical but cosmetically divergent, breaking grep.
//
// Each entry's value is a case-insensitive substring that MUST appear
// in the heading line. The substrings are chosen to be unambiguous and
// resistant to translators rearranging punctuation or spacing.
const CANONICAL_HEADING_TOKEN = {
  1: "Role Definition",
  2: "Project Overview",
  3: "Build",            // matches "Build & Run Commands", "Build and Run", etc.
  4: "Core Architecture",
  5: "Directory Structure",
  6: "Standard",         // matches "Standard / Rules / Skills Reference" family
  7: "DO NOT Read",
  8: "Memory",           // matches "Common Rules & Memory (L4)" family
};

// Per-section sub-section (###) count invariants from the scaffold.
// Keys are 1-based section indices.
const H3_COUNT_BY_SECTION = {
  4: { min: 3, max: 4, name: "Core Architecture" }, // Overall / Data Flow / Core Patterns [/ Absent]
  6: { exact: 3, name: "Standard / Rules / Skills Reference" },
  8: { exact: 2, name: "Common Rules & Memory (L4)" },
};

// Per-section sub-sub-section (####) count invariants.
const H4_COUNT_BY_SECTION = {
  8: { exact: 2, name: "L4 Memory Files + Memory Workflow" },
};

/**
 * Split markdown content into sections keyed by top-level (## ) headings.
 *
 * Respects fenced code blocks: `## ` inside a fenced block is NOT a heading.
 * (Scaffold templates contain example `##` lines inside ```markdown blocks
 * that must not be counted as real headings.)
 *
 * Handles BOM (U+FEFF) at the start of the file: some Windows editors and
 * cross-platform generators prepend a BOM to UTF-8 files. Without stripping
 * it, the first `##` line reads as `\ufeff##` and never matches the heading
 * regex, silently under-counting sections by 1.
 *
 * Returns: Array<{ index, title, body, startLine, endLine }>
 *   - index: 0-based section index (Section 1 = index 0)
 *   - title: heading text with `## ` stripped
 *   - body: lines between this heading and the next `## ` heading (exclusive)
 *   - startLine / endLine: 1-based line numbers for error reporting
 */
function splitByH2(content) {
  // Strip UTF-8 BOM if present — it otherwise prevents the first ## from
  // matching `^## ` because the line starts with \ufeff instead.
  if (content.charCodeAt(0) === 0xfeff) {
    content = content.slice(1);
  }
  const lines = content.split(/\r?\n/);
  const sections = [];
  let current = null;
  let inFence = false;
  let fenceMarker = null;

  lines.forEach((line, idx) => {
    const trimmed = line.trimStart();
    // Track fenced code blocks so ## inside them is ignored.
    // Markdown allows both ``` and ~~~ fences.
    const fenceMatch = trimmed.match(/^(```+|~~~+)/);
    if (fenceMatch) {
      if (!inFence) {
        inFence = true;
        fenceMarker = fenceMatch[1][0]; // ` or ~
      } else if (trimmed.startsWith(fenceMarker)) {
        inFence = false;
        fenceMarker = null;
      }
    }

    if (!inFence && /^## (?!#)/.test(line)) {
      // Close previous section
      if (current) {
        current.endLine = idx; // line before the new heading
        sections.push(current);
      }
      current = {
        index: sections.length,
        title: line.replace(/^## /, "").trim(),
        body: [],
        startLine: idx + 1,
        endLine: null,
      };
    } else if (current) {
      current.body.push(line);
    }
  });

  if (current) {
    current.endLine = lines.length;
    sections.push(current);
  }

  return sections;
}

/**
 * Count lines matching a regex within a section's body, skipping fenced
 * code blocks.
 */
function countInSection(section, regex) {
  let count = 0;
  let inFence = false;
  let fenceMarker = null;

  for (const line of section.body) {
    const trimmed = line.trimStart();
    const fenceMatch = trimmed.match(/^(```+|~~~+)/);
    if (fenceMatch) {
      if (!inFence) {
        inFence = true;
        fenceMarker = fenceMatch[1][0];
      } else if (trimmed.startsWith(fenceMarker)) {
        inFence = false;
        fenceMarker = null;
      }
      continue;
    }
    if (!inFence && regex.test(line)) count++;
  }
  return count;
}

function countH3InSection(section) {
  return countInSection(section, /^### (?!#)/);
}

function countH4InSection(section) {
  return countInSection(section, /^#### (?!#)/);
}

// ─── Individual checks ────────────────────────────────────────────

/**
 * S1 — Top-level section count must be exactly 8.
 */
function checkH2Count(sections) {
  const actual = sections.length;
  return {
    id: "S1",
    pass: actual === EXPECTED_H2_COUNT,
    actual,
    expected: EXPECTED_H2_COUNT,
    message:
      actual === EXPECTED_H2_COUNT
        ? null
        : `Expected exactly ${EXPECTED_H2_COUNT} top-level (## ) sections, found ${actual}.`,
    severity: "error",
    remediation:
      actual > EXPECTED_H2_COUNT
        ? `Remove surplus section(s) starting at section ${EXPECTED_H2_COUNT + 1}. ` +
          `Merge content into the appropriate Section 1-8 or move to .claude/rules/*.`
        : actual < EXPECTED_H2_COUNT
        ? `Add the missing section(s). Canonical order: Role Definition, Project Overview, ` +
          `Build & Run Commands, Core Architecture, Directory Structure, ` +
          `Standard / Rules / Skills Reference, DO NOT Read, Common Rules & Memory (L4).`
        : null,
  };
}

/**
 * S3-S5 — Sub-section (### ) count per section.
 * Checks Section 4, 6, 8 against H3_COUNT_BY_SECTION.
 */
function checkH3Counts(sections) {
  const results = [];
  for (const [sectionNumStr, rule] of Object.entries(H3_COUNT_BY_SECTION)) {
    const sectionNum = parseInt(sectionNumStr, 10);
    const sectionIdx = sectionNum - 1;
    if (sectionIdx >= sections.length) continue;

    const section = sections[sectionIdx];
    const actual = countH3InSection(section);
    let pass = false;
    let expected = "";

    if (rule.exact !== undefined) {
      pass = actual === rule.exact;
      expected = String(rule.exact);
    } else if (rule.min !== undefined || rule.max !== undefined) {
      pass =
        (rule.min === undefined || actual >= rule.min) &&
        (rule.max === undefined || actual <= rule.max);
      expected = `${rule.min || 0}-${rule.max || "∞"}`;
    }

    results.push({
      id: `S-H3-${sectionNum}`,
      pass,
      actual,
      expected,
      section: sectionNum,
      sectionName: rule.name,
      message: pass
        ? null
        : `Section ${sectionNum} (${rule.name}) must have ${expected} ### sub-sections, found ${actual}.`,
      severity: "error",
      remediation: pass
        ? null
        : actual > (rule.max || rule.exact)
        ? `Remove or merge surplus ### sub-section(s) within Section ${sectionNum}.`
        : `Add missing required ### sub-section(s) within Section ${sectionNum}.`,
    });
  }
  return results;
}

/**
 * S-H4 — #### sub-sub-section count per section.
 * Section 8 must have exactly 2 #### headings (L4 Memory Files + Memory Workflow).
 */
function checkH4Counts(sections) {
  const results = [];
  for (const [sectionNumStr, rule] of Object.entries(H4_COUNT_BY_SECTION)) {
    const sectionNum = parseInt(sectionNumStr, 10);
    const sectionIdx = sectionNum - 1;
    if (sectionIdx >= sections.length) continue;

    const section = sections[sectionIdx];
    const actual = countH4InSection(section);
    const pass = actual === rule.exact;

    results.push({
      id: `S-H4-${sectionNum}`,
      pass,
      actual,
      expected: rule.exact,
      section: sectionNum,
      sectionName: rule.name,
      message: pass
        ? null
        : `Section ${sectionNum} must have exactly ${rule.exact} #### headings (${rule.name}), found ${actual}.`,
      severity: "error",
      remediation: pass
        ? null
        : `Adjust #### headings within Section ${sectionNum}. Expected: L4 Memory Files, Memory Workflow.`,
    });
  }
  return results;
}

/**
 * Count how many times a memory filename appears as the primary cell of
 * a table row — i.e., a row whose first non-whitespace table cell is
 * the filename (usually wrapped in backticks and preceded by the memory
 * directory path).
 *
 * Pattern: `| \`claudeos-core/memory/<filename>\` | ... | ... |`
 *
 * Fence-aware: table-row lines inside fenced code blocks (```, ~~~) are
 * NOT counted. This handles the legitimate case where scaffold examples
 * or user documentation show a sample L4 Memory Files table inside a
 * code block — those are illustrations, not declarations.
 *
 * This distinguishes the canonical "one row per memory file" declaration
 * from incidental prose mentions in workflow text (e.g., "3. append to
 * `decision-log.md`"), which are expected to appear multiple times in
 * normal Section 8 content.
 */
function countMemoryFileTableRows(content, filename) {
  const escaped = filename.replace(/\./g, "\\.");
  // Matches a markdown table row whose first cell references the memory
  // file path. Tolerates leading whitespace and either `memory/filename`
  // or just `filename` wrapped in backticks.
  const rowRegex = new RegExp(`^\\s*\\|\\s*\`[^\`]*${escaped}\`\\s*\\|`);

  let count = 0;
  let inFence = false;
  let fenceMarker = null;
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trimStart();
    const fenceMatch = trimmed.match(/^(```+|~~~+)/);
    if (fenceMatch) {
      if (!inFence) {
        inFence = true;
        fenceMarker = fenceMatch[1][0];
      } else if (trimmed.startsWith(fenceMarker)) {
        inFence = false;
        fenceMarker = null;
      }
      continue;
    }
    if (!inFence && rowRegex.test(line)) count++;
  }
  return count;
}

/**
 * M1-M4 — Each memory file appears in EXACTLY ONE table row.
 *
 * This is the core detector for the §9 re-declaration anti-pattern.
 *
 * Why table-row matching instead of raw mention counting:
 *   The scaffold's Section 8 prose (workflow steps, remediation guidance)
 *   legitimately mentions memory filenames multiple times. What must not
 *   appear twice is the TABLE ROW declaring the file — the anti-pattern
 *   is a duplicate L4 Memory Files table, not prose references.
 *
 * Language-invariance: filenames (`decision-log.md`, etc.) and markdown
 * table syntax (`| ... |`) are not translated. This check behaves
 * identically in every output language.
 */
function checkMemoryFileUniqueness(content) {
  return MEMORY_FILES.map((filename) => {
    const actual = countMemoryFileTableRows(content, filename);
    const pass = actual === 1;

    let message = null;
    let remediation = null;
    if (!pass) {
      if (actual > 1) {
        message =
          `Memory file "${filename}" appears in ${actual} table rows (expected 1). ` +
          `This indicates L4 memory table re-declaration (v2.2.0 anti-pattern).`;
        remediation =
          `Keep only the table row in Section 8 sub-section 2 (L4 Memory). ` +
          `Delete any duplicate rows — often found in a surplus §9 section.`;
      } else {
        message =
          `Memory file "${filename}" is missing from the L4 Memory Files table.`;
        remediation =
          `Add a row for "${filename}" to the L4 Memory Files table in ` +
          `Section 8, sub-section 2.`;
      }
    }

    return {
      id: `M-${filename}`,
      pass,
      actual,
      expected: 1,
      file: filename,
      message,
      severity: "error",
      remediation,
    };
  });
}

/**
 * F2 — Memory file table rows must be confined to Section 8.
 *
 * An L4 Memory Files table row appearing in Section 6, §9, or anywhere
 * outside Section 8 sub-section 2 is the canonical §9 anti-pattern:
 * the memory table has been re-declared in a surplus section.
 *
 * Only table rows are counted, not prose mentions. This is the same
 * rationale as checkMemoryFileUniqueness — workflow text legitimately
 * references memory filenames in multiple places.
 */
function checkMemoryScopedToSection8(sections, content) {
  if (sections.length < 8) return [];
  const s8 = sections[7];
  const s8Body = s8.body.join("\n");
  const results = [];

  for (const filename of MEMORY_FILES) {
    const totalRows = countMemoryFileTableRows(content, filename);
    const s8Rows = countMemoryFileTableRows(s8Body, filename);
    const outside = totalRows - s8Rows;

    if (outside > 0) {
      results.push({
        id: `F2-${filename}`,
        pass: false,
        actual: outside,
        expected: 0,
        file: filename,
        message:
          `Memory file "${filename}" has ${outside} table row(s) outside Section 8.`,
        severity: "error",
        remediation:
          `The L4 Memory Files table belongs only in Section 8 sub-section 2. ` +
          `Remove the surplus row(s) (typically in a duplicate §9 section).`,
      });
    }
  }

  return results;
}

/**
 * S2 — Each ## section has non-trivial body content (at least 2 non-empty lines).
 *
 * Catches the case where a section heading exists but body was never filled.
 */
function checkSectionsHaveContent(sections) {
  return sections.map((section, i) => {
    const nonEmpty = section.body.filter((l) => l.trim().length > 0).length;
    const pass = nonEmpty >= 2;
    return {
      id: `S2-${i + 1}`,
      pass,
      actual: nonEmpty,
      expected: ">= 2",
      section: i + 1,
      sectionTitle: section.title,
      message: pass
        ? null
        : `Section ${i + 1} ("${section.title}") appears empty or near-empty (${nonEmpty} non-empty lines).`,
      severity: "warning",
      remediation: pass
        ? null
        : `Populate Section ${i + 1} per the scaffold's per-section rules.`,
    };
  });
}

/**
 * T1 — Each `## N.` section heading contains the English canonical token.
 *
 * Enforces the scaffold's "English canonical primary + translation
 * parenthetical" rule. Without this check, two projects in the same
 * organization can end up with §7 headings like:
 *
 *   project-A: ## 7. DO NOT Read (직접 읽지 말아야 할 파일)
 *   project-B: ## 7. 읽지 말 것 (Files Not to Be Read Directly)
 *
 * Both are "equivalent in meaning" (what the old scaffold asked for) but
 * multi-repo grep breaks: `grep "## 7. DO NOT Read"` matches one and not
 * the other. This check restores cross-repo discoverability while leaving
 * the BODY of every section free to be written in any target language.
 *
 * The check is a case-insensitive substring match on the heading line.
 * Short canonical tokens (e.g., "Build", "Standard", "Memory") are chosen
 * so translators can reorder or rephrase freely without breaking them.
 */
function checkCanonicalHeadings(sections) {
  const results = [];
  // Check only as many sections as we have — if the section count is
  // off, checkH2Count (S1) already reports that; don't stack errors.
  const upTo = Math.min(sections.length, EXPECTED_H2_COUNT);
  for (let i = 0; i < upTo; i++) {
    const sectionNum = i + 1;
    const expectedToken = CANONICAL_HEADING_TOKEN[sectionNum];
    const heading = sections[i].title || "";
    const pass = heading.toLowerCase().includes(expectedToken.toLowerCase());
    results.push({
      id: `T1-${sectionNum}`,
      pass,
      actual: heading,
      expected: `heading containing "${expectedToken}"`,
      section: sectionNum,
      sectionTitle: heading,
      message: pass
        ? null
        : `Section ${sectionNum} heading must contain the English canonical ` +
          `token "${expectedToken}". Found: "${heading}".`,
      severity: "error",
      remediation: pass
        ? null
        : `Rewrite the heading with the English canonical phrase as primary ` +
          `text. Translation may be appended in parentheses. ` +
          `Example: "## ${sectionNum}. ${expectedToken}" or ` +
          `"## ${sectionNum}. ${expectedToken} (translation)".`,
    });
  }
  return results;
}

module.exports = {
  // High-level API
  splitByH2,
  // Individual checks
  checkH2Count,
  checkH3Counts,
  checkH4Counts,
  checkMemoryFileUniqueness,
  checkMemoryScopedToSection8,
  checkSectionsHaveContent,
  checkCanonicalHeadings,
  // Utilities (exported for tests)
  countH3InSection,
  countH4InSection,
  // Constants
  EXPECTED_H2_COUNT,
  MEMORY_FILES,
  H3_COUNT_BY_SECTION,
  H4_COUNT_BY_SECTION,
  CANONICAL_HEADING_TOKEN,
};
