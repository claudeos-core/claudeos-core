/**
 * ClaudeOS-Core — Stale Report Utility
 *
 * Shared helper for reading/updating claudeos-core/generated/stale-report.json.
 * Used by: content-validator, sync-checker, plan-validator, health-checker,
 *          pass-json-validator, manifest-generator.
 */

const fs = require("fs");
const path = require("path");

/**
 * Update stale-report.json with a new key and optional summary patch.
 * Reads existing file, merges data, writes back. Safe against missing/malformed files.
 *
 * @param {string} genDir - path to claudeos-core/generated/
 * @param {string} key - top-level key to set (e.g. "contentValidation", "syncMisses")
 * @param {object} data - value for that key
 * @param {object} [summaryPatch] - fields to merge into ex.summary
 */
function updateStaleReport(genDir, key, data, summaryPatch) {
  if (!fs.existsSync(genDir)) return;
  const rp = path.join(genDir, "stale-report.json");
  let ex = {};
  if (fs.existsSync(rp)) {
    try { ex = JSON.parse(fs.readFileSync(rp, "utf-8")); } catch (_e) { ex = {}; }
  }
  ex[key] = data;
  if (summaryPatch) {
    ex.summary = { ...(ex.summary || {}), ...summaryPatch };
  }
  fs.writeFileSync(rp, JSON.stringify(ex, null, 2));
}

module.exports = { updateStaleReport };
