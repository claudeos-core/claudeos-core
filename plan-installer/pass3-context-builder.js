/**
 * ClaudeOS-Core — Pass 3 Context Builder
 *
 * Builds a slim `pass3-context.json` that Pass 3 prompts reference INSTEAD OF
 * re-reading the full `pass2-merged.json` repeatedly. pass2-merged.json on
 * large multi-module projects can exceed 300 KB, and Pass 3 historically
 * re-reads it once per file generated (30-50 times), which is the #1 cause
 * of `Prompt is too long` Pass 3 failures.
 *
 * Design constraints:
 *   - pass2-merged.json is an LLM-generated free-form JSON: field names and
 *     nesting vary by stack and by Claude's interpretation of the pass2
 *     template. We CANNOT reliably project specific nested fields out of it.
 *   - project-analysis.json IS structured (we wrote it ourselves in
 *     plan-installer). We use it as the authoritative source for stack facts.
 *   - pass2-merged.json is still useful as a file, so we report its
 *     existence/size/top-level key count here as signals — the Pass 3 prompt
 *     then knows whether to fall back to reading it for specific details.
 *
 * Output shape (see `buildPass3Context` return) is intentionally flat and
 * small: <5 KB even for large projects, vs. pass2-merged.json at 50-500 KB.
 */

"use strict";

const fs = require("fs");
const path = require("path");

/**
 * Safely read + parse a JSON file. Returns null on any error.
 * Mirrors lib/safe-fs.js readJsonSafe but inlined to avoid circular-dep risk
 * during tool-time module loading (this file is called from plan-installer
 * after all scanners have run).
 */
function readJsonSafe(filePath) {
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(raw);
  } catch (_e) {
    return null;
  }
}

/**
 * Describe pass2-merged.json as signals (size, top-level key count, existence)
 * without loading its contents into the context JSON. Pass 3 prompts use these
 * signals to decide whether to read the full file for a specific missing detail.
 */
function describePass2(pass2MergedPath) {
  let exists = false;
  let sizeBytes = 0;
  let topLevelKeys = [];
  try {
    const stat = fs.statSync(pass2MergedPath);
    exists = true;
    sizeBytes = stat.size;
    try {
      const parsed = JSON.parse(fs.readFileSync(pass2MergedPath, "utf-8"));
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        topLevelKeys = Object.keys(parsed).slice(0, 40); // cap at 40 to keep context small
      }
    } catch (_e) {
      // Malformed pass2-merged.json — leave topLevelKeys empty, still report size.
    }
  } catch (_e) {
    // File doesn't exist yet (e.g. Pass 2 has not run). Still return a valid descriptor.
  }
  return {
    exists,
    sizeBytes,
    sizeKB: Math.round(sizeBytes / 1024),
    topLevelKeys,
    // Heuristic flag: >300 KB is the empirical threshold above which repeated
    // re-reads reliably cause Pass 3 context overflow on 200K-context models.
    large: sizeBytes > 300 * 1024,
  };
}

/**
 * Extract domain summaries from project-analysis.json's domains array.
 * Each entry in `domains` has varying fields depending on the scanner that
 * produced it (scan-java, scan-kotlin, scan-node, scan-python, scan-frontend).
 * We project only the fields that are universally useful for Pass 3 consistency.
 */
function summarizeDomains(analysisDomains) {
  if (!Array.isArray(analysisDomains)) return [];
  return analysisDomains.map((d) => {
    const summary = {
      name: d.name,
      type: d.type || "backend",
      totalFiles: d.totalFiles || 0,
    };
    // Optional, scanner-specific fields — only include if present.
    if (typeof d.controllers === "number") summary.controllers = d.controllers;
    if (typeof d.services === "number") summary.services = d.services;
    if (typeof d.repositories === "number") summary.repositories = d.repositories;
    if (typeof d.mappers === "number") summary.mappers = d.mappers;
    if (typeof d.dtos === "number") summary.dtos = d.dtos;
    if (typeof d.pages === "number") summary.pages = d.pages;
    if (typeof d.components === "number") summary.components = d.components;
    if (d.pattern) summary.pattern = d.pattern;          // Java A-E patterns
    if (d.modulePath) summary.modulePath = d.modulePath; // multi-module Java
    if (d.serverType) summary.serverType = d.serverType; // Kotlin CQRS server types
    if (d.domainName) summary.domainName = d.domainName;
    return summary;
  });
}

/**
 * Extract the port default from project-analysis.stack.port (plan-installer
 * sets this based on framework). Kept as a top-level convenience field so
 * Pass 3 doesn't need to traverse the nested stack object.
 */
function extractPort(projectAnalysis) {
  return (projectAnalysis && projectAnalysis.stack && projectAnalysis.stack.port) || null;
}

/**
 * Build the slim Pass 3 context object.
 *
 * @param {string} generatedDir - absolute path to claudeos-core/generated/
 * @returns {object|null} context object, or null if project-analysis.json is
 *   missing/malformed (caller should then NOT write pass3-context.json — Pass 3
 *   will fall back to the full pass2-merged.json path).
 */
function buildPass3Context(generatedDir) {
  const analysisPath = path.join(generatedDir, "project-analysis.json");
  const pass2Path = path.join(generatedDir, "pass2-merged.json");

  const analysis = readJsonSafe(analysisPath);
  if (!analysis || typeof analysis !== "object") {
    // Without project-analysis.json we have nothing structured to summarize.
    // Let Pass 3 fall back to reading pass2-merged.json directly.
    return null;
  }

  const stack = analysis.stack || {};
  const summary = analysis.summary || {};
  const active = analysis.activeDomains || {};

  const context = {
    _schemaVersion: 1,
    _generatedAt: new Date().toISOString(),
    _purpose:
      "Slim, read-once summary for Pass 3 prompts. Reference this INSTEAD OF " +
      "re-reading pass2-merged.json during file generation. Only consult " +
      "pass2-merged.json for specific method names / exact paths not captured " +
      "here — and only once per detail.",

    // ─── Stack facts (authoritative — from project-analysis.json) ──────
    stack: {
      language: stack.language || null,
      languageVersion: stack.languageVersion || null,
      framework: stack.framework || null,
      frameworkVersion: stack.frameworkVersion || null,
      buildTool: stack.buildTool || null,
      packageManager: stack.packageManager || null,
      database: stack.database || null,
      orm: stack.orm || null,
      frontend: stack.frontend || null,
      frontendVersion: stack.frontendVersion || null,
      port: extractPort(analysis),
    },

    // ─── Architecture flags ──────────────────────────────────────────
    architecture: {
      cqrs: !!(stack.architecture && String(stack.architecture).includes("cqrs")),
      bff: Array.isArray(stack.detected) && stack.detected.includes("bff"),
      multiModule: !!stack.multiModule,
      monorepo: stack.monorepo || null,
      workspaces: stack.workspaces || null,
      modules: Array.isArray(stack.modules) ? stack.modules : [],
      rootPackage: analysis.rootPackage || null,
    },

    // ─── Active domain groups (which 00.core / 10.backend / ... apply) ──
    activeDomains: active,

    // ─── Template routing (what pass3 templates were combined) ──────────
    templates: analysis.templates || {},
    isMultiStack: !!analysis.isMultiStack,

    // ─── Domain summary (flat list, small per-domain footprint) ─────────
    domainCount: {
      total: summary.totalDomains || 0,
      backend: summary.backendDomains || 0,
      frontend: summary.frontendDomains || 0,
    },
    backendDomains: summarizeDomains(analysis.backendDomains),
    frontendDomains: summarizeDomains(analysis.frontendDomains),

    // ─── Frontend stats (if scan-frontend ran) ──────────────────────────
    frontend: analysis.frontend || { exists: false },

    // ─── pass2-merged.json descriptor (signals, not contents) ───────────
    // Pass 3 reads this to decide whether it's safe to open the full file
    // for a specific missing detail, and how aggressively to summarize first.
    pass2Merged: describePass2(pass2Path),

    // ─── Split-mode recommendation (informational only) ─────────────────
    // Heuristic that predicts whether single-call Pass 3 would likely hit
    // `Prompt is too long`. Surfaced in init logs as "estimated N files
    // from M domains". As of the current release this does NOT drive the
    // split/single-call decision — init.js defaults to split mode for all
    // projects regardless of this recommendation. Kept for diagnostic
    // visibility and future use (e.g. token budget estimation, UI hints).
    splitRecommendation: (function computeSplit() {
      const pass2Desc = describePass2(pass2Path);
      const backendCount = Array.isArray(analysis.backendDomains) ? analysis.backendDomains.length : 0;
      const frontendCount = Array.isArray(analysis.frontendDomains) ? analysis.frontendDomains.length : 0;
      const totalDomains = backendCount + frontendCount;

      // Rough estimate: each domain yields 5-8 files (standards + rules + skills),
      // plus ~15 stack-independent files (CLAUDE.md, guides, master plans, etc.).
      const estimatedFileCount = 15 + totalDomains * 6;

      // Thresholds calibrated from empirical failures:
      //  - pass2 > 300KB: historic input-overflow threshold (v2.1 original heuristic)
      //  - estimated files > 35: empirical output-accumulation threshold
      //    (observed overflow at ~40 files with pass2=35KB — output was the cause)
      const largeInput = pass2Desc.sizeBytes > 300 * 1024;
      const largeOutput = estimatedFileCount > 35;
      const recommend = largeInput || largeOutput;

      return {
        recommend,
        reasons: [
          largeInput ? `pass2-merged.json is ${pass2Desc.sizeKB} KB (> 300 KB input threshold)` : null,
          largeOutput ? `estimated ${estimatedFileCount} output files (> 35 file threshold) from ${totalDomains} domains` : null,
        ].filter(Boolean),
        estimatedFileCount,
        totalDomains,
      };
    })(),

    // ─── Fields that pass2-merged.json is authoritative for ─────────────
    // These are all `null` in pass3-context.json by design — Pass 3 must
    // read pass2-merged.json ONCE (during the Phase 1 fact-table fill)
    // to get their actual values. Listed here so Pass 3 knows exactly
    // what to look for instead of free-form scanning.
    needsPass2: {
      responseWrapperLayer: null,       // "Controller" | "Aggregator" | "Service"
      responseWrapperMethod: null,      // e.g. "makeResponse"
      responseUtilClass: null,          // FQN, e.g. "com.company.util.ApiResponseUtil"
      responseUtilMethods: null,        // ["success", "fail", ...] exact names
      mapperXmlPath: null,              // verbatim, if MyBatis
      aggregatorExists: null,
      aggregatorNaming: null,
      sharedBaseClasses: null,          // array of FQNs
      sharedUtilPackage: null,
      authMethod: null,                 // "JWT" | "Session" | "OAuth2" | ...
    },
  };

  return context;
}

module.exports = { buildPass3Context, describePass2, summarizeDomains };
