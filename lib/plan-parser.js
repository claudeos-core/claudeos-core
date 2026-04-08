/**
 * ClaudeOS-Core — Plan Parser (shared)
 *
 * Shared parsing logic for plan files used by both manifest-generator and plan-validator.
 * Two block formats:
 *   - <file path="..."> ... </file>   (standard plan format)
 *   - ## N. `path` \n```markdown ... ```  (code block format, e.g. sync-rules-master)
 *
 * Each function accepts a content string and returns parsed blocks.
 * Replace functions modify content in-place and return the updated string.
 */

// ─── Extract <file path="..."> blocks ───────────────────────

/**
 * Parse <file path="..."> ... </file> blocks from plan content.
 * @param {string} content - plan file content
 * @param {{ includeContent?: boolean }} options
 * @returns {Array<{ path: string, content?: string }>}
 */
function parseFileBlocks(content, { includeContent = false } = {}) {
  const result = [];
  if (includeContent) {
    const re = /<file\s+path="([^"]+)">\s*\n([\s\S]*?)\n<\/file>/g;
    let m;
    while ((m = re.exec(content)) !== null) {
      result.push({ path: m[1], content: m[2] });
    }
  } else {
    const re = /<file\s+path="([^"]+)">/g;
    let m;
    while ((m = re.exec(content)) !== null) {
      result.push({ path: m[1] });
    }
  }
  return result;
}

// ─── Extract ## N. `path` ```markdown ... ``` blocks ────────

/**
 * Parse ## N. `path` + ```markdown ... ``` blocks from plan content.
 * Uses indexOf-based parsing to correctly handle nested code fences.
 * @param {string} content - plan file content
 * @param {{ includeContent?: boolean }} options
 * @returns {Array<{ path: string, content?: string }>}
 */
function parseCodeBlocks(content, { includeContent = false } = {}) {
  const result = [];
  const headingRe = includeContent
    ? /^##\s+\d+\.\s+([^\n]+)/gm
    : /^##\s+\d+\.\s+`?([^`\n]+)`?/gm;
  let headingMatch;
  while ((headingMatch = headingRe.exec(content)) !== null) {
    const filePath = headingMatch[1].replace(/`/g, "").replace(/\s+[—–\-].*$/, "").trim();

    if (!includeContent) {
      // Path-only mode: just validate and collect
      if (filePath && filePath.includes("/")) {
        result.push({ path: filePath });
      }
      continue;
    }

    // Content mode: find opening ```markdown and matching closing ```
    const openFence = content.indexOf("```markdown\n", headingMatch.index);
    if (openFence < 0) continue;
    const contentStart = openFence + "```markdown\n".length;
    const closingPos = findClosingFence(content, contentStart);
    if (closingPos < 0) continue;
    const blockContent = content.substring(contentStart, closingPos).trimEnd();
    result.push({ path: filePath, content: blockContent });
    // Advance headingRe past this block to avoid re-matching inside content
    headingRe.lastIndex = closingPos;
  }
  return result;
}

// ─── Replace <file> block content ───────────────────────────

/**
 * Replace content inside a <file path="..."> block.
 * @param {string} content - full plan file content
 * @param {string} filePath - path attribute to match
 * @param {string} newContent - replacement content
 * @returns {string} updated content
 */
function replaceFileBlock(content, filePath, newContent) {
  const escaped = filePath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return content.replace(
    new RegExp(`(<file\\s+path="${escaped}">\\s*\\n)[\\s\\S]*?(\\n</file>)`, "g"),
    `$1${newContent}$2`
  );
}

// ─── Replace code block content ─────────────────────────────

/**
 * Replace content inside a ## N. `path` ```markdown ... ``` block.
 * Uses indexOf-based approach to handle nested code fences.
 * @param {string} content - full plan file content
 * @param {string} filePath - path to match in heading
 * @param {string} newContent - replacement content
 * @returns {string} updated content
 */
function replaceCodeBlock(content, filePath, newContent) {
  const cleanPath = filePath.replace(/`/g, "");
  const headingPattern = new RegExp(`^##\\s+\\d+\\.\\s+\`?${cleanPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\`?`, "m");
  const headingMatch = headingPattern.exec(content);
  if (!headingMatch) return content;
  const afterHeading = content.indexOf("```markdown\n", headingMatch.index);
  if (afterHeading < 0) return content;
  const contentStart = afterHeading + "```markdown\n".length;
  const closingPos = findClosingFence(content, contentStart);
  if (closingPos < 0) return content;
  return content.substring(0, contentStart) + newContent + "\n" + content.substring(closingPos);
}

// ─── Internal: find closing ``` with nesting ────────────────

function findClosingFence(content, startPos) {
  let searchPos = startPos;
  let nestDepth = 0;
  while (searchPos < content.length) {
    const nextFence = content.indexOf("\n```", searchPos);
    if (nextFence < 0) break;
    const fenceLineStart = nextFence + 1;
    const nextNewline = content.indexOf("\n", fenceLineStart + 3);
    const restOfLine = nextNewline >= 0
      ? content.substring(fenceLineStart + 3, nextNewline)
      : content.substring(fenceLineStart + 3);
    const isOpening = /^[a-zA-Z]/.test(restOfLine.trim());
    if (isOpening) {
      nestDepth++;
      searchPos = nextNewline >= 0 ? nextNewline : fenceLineStart + 3;
    } else if (nestDepth > 0) {
      nestDepth--;
      searchPos = nextNewline >= 0 ? nextNewline : fenceLineStart + 3;
    } else {
      return fenceLineStart;
    }
  }
  return -1;
}

// Plan files that use code block format instead of <file> block format
const CODE_BLOCK_PLANS = ["21.sync-rules-master.md"];

module.exports = { parseFileBlocks, parseCodeBlocks, replaceFileBlock, replaceCodeBlock, CODE_BLOCK_PLANS };
