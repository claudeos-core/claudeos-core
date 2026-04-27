/**
 * ClaudeOS-Core — Skills Sync (manifest-generator hook)
 *
 * Role: After all Pass 3 stages complete, deterministically reconcile two
 * cross-references that LLMs (3b-core / 3c-core) routinely drift on:
 *
 *   1. MANIFEST.md "Per-domain notes" section
 *      - When `claudeos-core/skills/{category}/domains/` exists with N files,
 *        ensure MANIFEST.md surfaces the per-domain catalog explicitly.
 *      - Pattern matches the backend-style MANIFEST: a self-describing
 *        section listing all domain stems by name.
 *
 *   2. CLAUDE.md §6 Skills sub-section
 *      - When MANIFEST.md registers a category-root orchestrator
 *        (`{category}/{NN}.{name}.md`), ensure §6 mentions it.
 *      - Sub-skills (`{category}/{stem}/{file}.md`) are NOT added — they
 *        belong only in MANIFEST per the convention.
 *
 * Design principles:
 *   - Deterministic (no LLM)
 *   - Idempotent (safe to run repeatedly)
 *   - Append-only (never deletes user-edited content)
 *   - Failure-isolated (errors logged, don't break manifest-generator)
 *   - Multilingual (§6 detection by heading number, not text)
 */

const fs = require("fs");
const path = require("path");

// ─── Per-domain catalog discovery ────────────────────────────────────
//
// Walk every category under skills/ and find ones with a domains/ folder.
// Returns: [{ categoryDir, categoryRel, domains: [stem...] }, ...]
function discoverPerDomainCatalogs(skillsDir, rootRel) {
  const catalogs = [];
  if (!fs.existsSync(skillsDir)) return catalogs;

  for (const cat of fs.readdirSync(skillsDir, { withFileTypes: true })) {
    if (!cat.isDirectory()) continue;
    const domainsDir = path.join(skillsDir, cat.name, "domains");
    if (!fs.existsSync(domainsDir)) continue;
    if (!fs.statSync(domainsDir).isDirectory()) continue;

    const domains = fs
      .readdirSync(domainsDir)
      .filter((f) => f.endsWith(".md") && !f.startsWith("."))
      .map((f) => f.replace(/\.md$/, ""))
      .sort();

    if (domains.length === 0) continue;

    catalogs.push({
      categoryName: cat.name,
      categoryRel: `${rootRel}/${cat.name}`,
      domains,
    });
  }
  return catalogs;
}

// ─── MANIFEST.md patcher ─────────────────────────────────────────────
//
// For each category with domains/, ensure MANIFEST.md contains a
// "Per-domain notes" section listing the domain stems.
//
// Idempotency:
//   - If section exists AND already lists all current domains → no-op.
//   - If section exists but domain list is stale → replace ONLY the list
//     paragraph, preserving any user-added bullet/explanation below.
//   - If section missing → append at end of category section (or end of
//     file if category section structure is unrecognized).
//
// Returns: { patched: boolean, addedSections: [...], updatedLists: [...] }
function patchManifestPerDomainSections(manifestPath, catalogs) {
  if (!fs.existsSync(manifestPath)) {
    return { patched: false, reason: "MANIFEST.md not found" };
  }

  let content = fs.readFileSync(manifestPath, "utf-8");
  const original = content;
  const addedSections = [];
  const updatedLists = [];

  for (const cat of catalogs) {
    // Build the canonical domain list paragraph.
    const listLine =
      `\`${cat.categoryRel}/domains/{domain}.md\` — one file per domain. ` +
      `${cat.domains.length} domain${cat.domains.length === 1 ? "" : "s"} (${cat.domains.join(", ")}).`;

    // Detection regex: "### Per-domain notes" heading anywhere in file.
    // Multilingual variants are not auto-detected here — we use the
    // canonical English heading. If a project later adopts a different
    // heading, the section will simply be appended fresh, which is safe
    // (idempotency loss in that case is the cost of multilingual support).
    const sectionRe =
      /###\s+Per-domain\s+notes\s*\n([\s\S]*?)(?=\n###\s|\n##\s|$)/;

    const match = sectionRe.exec(content);

    if (match) {
      // Section exists. Check if our category's domain line is already
      // present and current.
      const sectionBody = match[1];
      const categoryLineRe = new RegExp(
        // Match a line containing the category path + "/domains/" followed
        // by a domain count. Capture full line for replacement.
        `(?:^|\\n)([^\\n]*\`${escapeRegex(cat.categoryRel)}/domains/[^\`]*\`[^\\n]*)`,
        "m"
      );
      const lineMatch = categoryLineRe.exec(sectionBody);

      if (lineMatch) {
        // Line exists for this category. Replace if stale.
        if (lineMatch[1].trim() !== listLine) {
          const newBody = sectionBody.replace(lineMatch[1], listLine);
          content = content.replace(sectionBody, newBody);
          updatedLists.push(cat.categoryName);
        }
        // else: already correct, skip silently.
      } else {
        // Section exists but no line for this category. Append the line
        // at the start of the section body (after the heading).
        const insertion = `\n${listLine}\n`;
        const newBody = insertion + sectionBody;
        content = content.replace(sectionBody, newBody);
        addedSections.push(cat.categoryName);
      }
    } else {
      // No "### Per-domain notes" section anywhere. Append a fresh section
      // at the end of the file.
      const fresh = `\n### Per-domain notes\n\n${listLine}\n`;
      content = content.trimEnd() + "\n" + fresh;
      addedSections.push(cat.categoryName);
    }
  }

  if (content === original) {
    return { patched: false, addedSections: [], updatedLists: [] };
  }

  fs.writeFileSync(manifestPath, content);
  return { patched: true, addedSections, updatedLists };
}

// ─── CLAUDE.md §6 Skills patcher ─────────────────────────────────────
//
// Extract orchestrators from MANIFEST.md (category-root files only),
// ensure §6 Skills sub-section mentions each one. Append missing entries
// after the existing bullet list.
//
// Section detection:
//   - §6 = first heading starting with "## 6." (any language after that)
//   - Skills sub-section = first "### " heading inside §6 whose text
//     contains "Skills" (covers EN/KO/JA/etc — most translations keep
//     the word "Skills")
//
// Idempotency:
//   - For each orchestrator path, search the WHOLE §6 Skills sub-section
//     body. If the path is already mentioned anywhere, skip.
//   - Otherwise, append a new bullet at end of sub-section.
function patchClaudeMdSkillsSection(claudeMdPath, manifestPath) {
  if (!fs.existsSync(claudeMdPath)) {
    return { patched: false, reason: "CLAUDE.md not found" };
  }
  if (!fs.existsSync(manifestPath)) {
    return { patched: false, reason: "MANIFEST.md not found" };
  }

  const manifestContent = fs.readFileSync(manifestPath, "utf-8");

  // Extract orchestrators from MANIFEST.
  // An orchestrator is a path of the form:
  //   claudeos-core/skills/{category}/{NN}.{name}.md
  // (sub-folder paths like {category}/{stem}/file.md are NOT orchestrators)
  const orchestrators = [];
  const seen = new Set();
  // Match backtick-quoted paths in MANIFEST. Then filter to category-root.
  // CRITICAL: the inline description capture must stay on the SAME line.
  // We use [^\S\n] for "horizontal whitespace" to exclude newlines, and
  // [^|`\n] for the description content (already excludes \n).
  const pathRe =
    /`(claudeos-core\/skills\/[^/`]+\/[^/`]+\.md)`(?:[^\S\n]*\|[^\S\n]*([^|`\n]+))?/g;
  let m;
  while ((m = pathRe.exec(manifestContent)) !== null) {
    const fullPath = m[1];
    // Exclude MANIFEST.md itself and any path with sub-folder.
    if (fullPath.endsWith("/MANIFEST.md")) continue;
    // Verify it's category-root: 4 segments exactly
    //   claudeos-core/skills/{category}/{file}.md
    const parts = fullPath.split("/");
    if (parts.length !== 4) continue;
    if (seen.has(fullPath)) continue;
    seen.add(fullPath);

    // Try to capture the description from the same MANIFEST table row.
    // We look ONLY on the same line (until the next newline) to avoid
    // accidentally absorbing content from following sections (e.g.
    // "### Per-domain notes" heading appearing right after).
    const afterPath = manifestContent.slice(m.index + m[0].length);
    const lineEnd = afterPath.indexOf("\n");
    const sameLine = lineEnd === -1 ? afterPath : afterPath.slice(0, lineEnd);
    let description = (m[2] || "").trim();
    if (!description) {
      // Look for `| description |` or `| description` pattern on same line.
      const descMatch = /^\s*\|\s*([^|\n]+?)\s*(?:\||$)/.exec(sameLine);
      if (descMatch) description = descMatch[1].trim();
    }

    orchestrators.push({ path: fullPath, description });
  }

  if (orchestrators.length === 0) {
    return { patched: false, reason: "no orchestrators found in MANIFEST" };
  }

  let content = fs.readFileSync(claudeMdPath, "utf-8");
  const original = content;

  // Locate §6 Skills sub-section.
  // Step 1: find "## 6." heading position
  const section6Re = /^##\s+6\.\s+[^\n]*$/m;
  const s6Match = section6Re.exec(content);
  if (!s6Match) {
    return { patched: false, reason: "§6 heading not found in CLAUDE.md" };
  }
  const s6Start = s6Match.index;

  // Find end of §6: next "## " heading at same level
  const afterS6 = content.slice(s6Start + s6Match[0].length);
  const nextSectionRe = /\n##\s+/;
  const nextMatch = nextSectionRe.exec(afterS6);
  const s6End = nextMatch
    ? s6Start + s6Match[0].length + nextMatch.index
    : content.length;

  const section6 = content.slice(s6Start, s6End);

  // Step 2: find Skills sub-section inside §6
  // Match "### " line containing word "Skills" (case-insensitive).
  // Capture body until next "### " or end of section.
  const skillsSubRe = /^###\s+[^\n]*Skills[^\n]*$/im;
  const skillsMatch = skillsSubRe.exec(section6);
  if (!skillsMatch) {
    return {
      patched: false,
      reason: "Skills sub-section not found in CLAUDE.md §6",
    };
  }

  const skillsHeadingStart = skillsMatch.index;
  const skillsBodyStart = skillsHeadingStart + skillsMatch[0].length;
  const afterSkills = section6.slice(skillsBodyStart);
  const nextSubRe = /\n###\s+/;
  const nextSubMatch = nextSubRe.exec(afterSkills);
  const skillsBodyEnd = nextSubMatch
    ? skillsBodyStart + nextSubMatch.index
    : section6.length;

  const skillsBody = section6.slice(skillsBodyStart, skillsBodyEnd);

  // Step 3: for each orchestrator, check if mentioned in skillsBody.
  // We accept any mention (path appears in body) as "covered".
  const missing = [];
  for (const orch of orchestrators) {
    if (skillsBody.includes(orch.path)) continue;
    missing.push(orch);
  }

  if (missing.length === 0) {
    return { patched: false, addedOrchestrators: [] };
  }

  // Step 4: build new bullets and append before the trailing whitespace
  // of skillsBody (so they sit at the end of the bullet list, before
  // the blank line that precedes the next sub-section).
  const newBullets = missing
    .map((o) => {
      const desc = o.description || "orchestrator";
      return `- \`${o.path}\` — ${desc}`;
    })
    .join("\n");

  // Trim trailing whitespace from skillsBody, append bullets, restore
  // a trailing blank line for separation.
  const trimmed = skillsBody.replace(/\s+$/, "");
  const newSkillsBody = `${trimmed}\n${newBullets}\n\n`;

  // Reassemble §6
  const newSection6 =
    section6.slice(0, skillsBodyStart) +
    newSkillsBody +
    section6.slice(skillsBodyEnd);

  // Reassemble full file
  content =
    content.slice(0, s6Start) + newSection6 + content.slice(s6End);

  if (content === original) {
    return { patched: false, addedOrchestrators: [] };
  }

  fs.writeFileSync(claudeMdPath, content);
  return {
    patched: true,
    addedOrchestrators: missing.map((o) => o.path),
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ─── Public entry point ──────────────────────────────────────────────
//
// Called from manifest-generator/index.js main() after rule-manifest.json
// + sync-map.json + stale-report.json are written.
//
// Errors are logged but do NOT throw — manifest-generator must remain
// robust to partial-state projects (e.g. small projects without a
// domains/ folder, or projects that haven't run Pass 3 yet).
function syncSkillsCatalog(rootDir) {
  const skillsDir = path.join(rootDir, "claudeos-core/skills");
  const sharedManifestPath = path.join(skillsDir, "00.shared/MANIFEST.md");
  const claudeMdPath = path.join(rootDir, "CLAUDE.md");

  const result = {
    perDomain: { patched: false },
    skillsSection: { patched: false },
  };

  // Step 1: discover per-domain catalogs.
  let catalogs;
  try {
    catalogs = discoverPerDomainCatalogs(skillsDir, "claudeos-core/skills");
  } catch (e) {
    console.log(`  ⚠️  skills-sync: discovery failed (${e.message})`);
    return result;
  }

  // Step 2: patch MANIFEST.md per-domain sections.
  if (catalogs.length > 0) {
    try {
      result.perDomain = patchManifestPerDomainSections(
        sharedManifestPath,
        catalogs
      );
      if (result.perDomain.patched) {
        const added = result.perDomain.addedSections || [];
        const updated = result.perDomain.updatedLists || [];
        if (added.length) {
          console.log(
            `  ✅ MANIFEST.md — Per-domain section added for [${added.join(", ")}]`
          );
        }
        if (updated.length) {
          console.log(
            `  ✅ MANIFEST.md — Per-domain list refreshed for [${updated.join(", ")}]`
          );
        }
      }
    } catch (e) {
      console.log(`  ⚠️  skills-sync: MANIFEST patch failed (${e.message})`);
    }
  }

  // Step 3: patch CLAUDE.md §6 Skills sub-section.
  try {
    result.skillsSection = patchClaudeMdSkillsSection(
      claudeMdPath,
      sharedManifestPath
    );
    if (result.skillsSection.patched) {
      const added = result.skillsSection.addedOrchestrators || [];
      console.log(
        `  ✅ CLAUDE.md — §6 Skills updated (${added.length} orchestrator${added.length === 1 ? "" : "s"} added)`
      );
    }
  } catch (e) {
    console.log(`  ⚠️  skills-sync: CLAUDE.md patch failed (${e.message})`);
  }

  return result;
}

module.exports = {
  syncSkillsCatalog,
  // Exposed for unit tests
  discoverPerDomainCatalogs,
  patchManifestPerDomainSections,
  patchClaudeMdSkillsSection,
};
