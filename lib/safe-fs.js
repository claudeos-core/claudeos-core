/**
 * ClaudeOS-Core — Safe filesystem utilities
 *
 * Wraps fs operations with consistent error handling.
 * All read functions return a fallback value on failure instead of throwing.
 */

const fs = require("fs");
const path = require("path");

/**
 * Safely read a file as UTF-8 string.
 * @param {string} filePath
 * @param {string} [fallback=""] - returned on error
 * @returns {string}
 */
function readFileSafe(filePath, fallback = "") {
  try {
    return fs.readFileSync(filePath, "utf-8");
  } catch (e) {
    if (e.code !== "ENOENT") {
      console.warn(`    ⚠️  Cannot read ${path.basename(filePath)}: ${e.code || e.message}`);
    }
    return fallback;
  }
}

/**
 * Safely parse a JSON file.
 * @param {string} filePath
 * @param {*} [fallback=null] - returned on error
 * @returns {*}
 */
function readJsonSafe(filePath, fallback = null) {
  const raw = readFileSafe(filePath, null);
  if (raw === null) return fallback;
  try {
    return JSON.parse(raw);
  } catch (e) {
    console.warn(`    ⚠️  JSON parse error in ${path.basename(filePath)}: ${e.message}`);
    return fallback;
  }
}

/**
 * Check if a file exists (swallows permission errors).
 * @param {string} filePath
 * @returns {boolean}
 */
function existsSafe(filePath) {
  try {
    return fs.existsSync(filePath);
  } catch {
    return false;
  }
}

/**
 * Ensure a directory exists (recursive).
 * @param {string} dir
 */
function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Write a file with error reporting.
 * @param {string} filePath
 * @param {string} content
 * @returns {boolean} success
 */
function writeFileSafe(filePath, content) {
  try {
    fs.writeFileSync(filePath, content);
    return true;
  } catch (e) {
    console.error(`    ❌ Cannot write ${path.basename(filePath)}: ${e.code || e.message}`);
    return false;
  }
}

/**
 * Get file stat safely.
 * @param {string} filePath
 * @returns {{ lines: number, bytes: number, modified: string } | null}
 */
function statSafe(filePath) {
  try {
    const c = fs.readFileSync(filePath, "utf-8");
    const s = fs.statSync(filePath);
    return {
      lines: c.split("\n").length,
      bytes: s.size,
      modified: s.mtime.toISOString().split("T")[0],
    };
  } catch {
    return null;
  }
}

module.exports = {
  readFileSafe,
  readJsonSafe,
  existsSafe,
  ensureDir,
  writeFileSafe,
  statSafe,
};
