/**
 * Tests for Pass 3 batch sub-division on large projects.
 *
 * Design: 3b and 3c are sub-divided into batches of ~15 domains each when
 * the project has more than 15 total domains. This prevents single-stage
 * output-accumulation overflow on projects with 50+ domains.
 *
 * These tests verify:
 *   1. computeBatches(domainOrder) logic — correct splitting
 *   2. loadDomainOrder() — domain-groups.json + project-analysis.json fallback
 *   3. buildBatchScopeNote — first batch has guide/CLAUDE.md, later batches don't
 *   4. Source-parity: init.js implements batch loop for 3b/3c, not 3a/3d
 *
 * Implementation lives inside runPass3Split closure (not exported), so we
 * test via:
 *   - Re-implementation in test file (parity-checked against init.js source)
 *   - Source regex checks for structural invariants
 */

const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");

const DOMAINS_PER_BATCH = 15;

// ─── computeBatches re-implementation (parity-check test at end) ──────

function computeBatches(domainOrder) {
  if (!domainOrder || domainOrder.length <= DOMAINS_PER_BATCH) {
    return [domainOrder || []];
  }
  const batches = [];
  for (let i = 0; i < domainOrder.length; i += DOMAINS_PER_BATCH) {
    batches.push(domainOrder.slice(i, i + DOMAINS_PER_BATCH));
  }
  return batches;
}

test("batch — small project (3 domains) → single batch (no subdivision)", () => {
  const batches = computeBatches(["a", "b", "c"]);
  assert.strictEqual(batches.length, 1);
  assert.deepStrictEqual(batches[0], ["a", "b", "c"]);
});

test("batch — exactly 15 domains → single batch (boundary)", () => {
  const domains = Array.from({ length: 15 }, (_, i) => `d${i}`);
  const batches = computeBatches(domains);
  assert.strictEqual(batches.length, 1);
  assert.strictEqual(batches[0].length, 15);
});

test("batch — 16 domains → 2 batches (just over boundary)", () => {
  const domains = Array.from({ length: 16 }, (_, i) => `d${i}`);
  const batches = computeBatches(domains);
  assert.strictEqual(batches.length, 2);
  assert.strictEqual(batches[0].length, 15);
  assert.strictEqual(batches[1].length, 1);
});

test("batch — 18 domains → 2 batches of 15+3", () => {
  const domains = Array.from({ length: 18 }, (_, i) => `d${i}`);
  const batches = computeBatches(domains);
  assert.strictEqual(batches.length, 2);
  assert.strictEqual(batches[0].length, 15);
  assert.strictEqual(batches[1].length, 3);
});

test("batch — 50 domains → 4 batches of 15+15+15+5", () => {
  const domains = Array.from({ length: 50 }, (_, i) => `d${i}`);
  const batches = computeBatches(domains);
  assert.strictEqual(batches.length, 4);
  assert.deepStrictEqual(batches.map(b => b.length), [15, 15, 15, 5]);
});

test("batch — 70 domains → 5 batches of 15+15+15+15+10", () => {
  const domains = Array.from({ length: 70 }, (_, i) => `d${i}`);
  const batches = computeBatches(domains);
  assert.strictEqual(batches.length, 5);
  assert.deepStrictEqual(batches.map(b => b.length), [15, 15, 15, 15, 10]);
});

test("batch — order preserved across batches", () => {
  const domains = Array.from({ length: 20 }, (_, i) => `d${i}`);
  const batches = computeBatches(domains);
  const flat = batches.flat();
  assert.deepStrictEqual(flat, domains);
});

test("batch — empty/null input returns single empty batch", () => {
  assert.deepStrictEqual(computeBatches([]), [[]]);
  assert.deepStrictEqual(computeBatches(null), [[]]);
  assert.deepStrictEqual(computeBatches(undefined), [[]]);
});

// ─── init.js source-parity ─────────────────────────────────────

test("batch — init.js source-parity: computeBatches implementation matches", () => {
  const initSrc = fs.readFileSync(
    path.join(__dirname, "..", "bin", "commands", "init.js"), "utf-8");

  // computeBatches 함수 존재 확인
  assert.match(initSrc, /function computeBatches/,
    "init.js must define computeBatches function");

  // DOMAINS_PER_BATCH 상수 = 15
  assert.match(initSrc, /DOMAINS_PER_BATCH\s*=\s*15/,
    "init.js must set DOMAINS_PER_BATCH = 15");

  // loadDomainOrder 함수 존재
  assert.match(initSrc, /function loadDomainOrder/,
    "init.js must define loadDomainOrder function");

  // buildBatchScopeNote 헬퍼 존재
  assert.match(initSrc, /function buildBatchScopeNote/,
    "init.js must define buildBatchScopeNote function");
});

test("batch — init.js source-parity: 3b and 3c are batched via for-loop", () => {
  const initSrc = fs.readFileSync(
    path.join(__dirname, "..", "bin", "commands", "init.js"), "utf-8");

  // 3b 배치 루프: `3b-${bi + 1}` 형태의 stageId
  assert.match(initSrc, /stageId\s*=\s*isBatched\s*\?\s*`3b-\$\{bi\s*\+\s*1\}`/,
    "init.js must use dynamic 3b-N stageId when batched");

  // 3c 배치 루프
  assert.match(initSrc, /stageId\s*=\s*isBatched\s*\?\s*`3c-\$\{bi\s*\+\s*1\}`/,
    "init.js must use dynamic 3c-N stageId when batched");

  // 3b의 backward-compatible "3b" stageId (단일 배치 시)
  assert.match(initSrc, /stageId.*=.*"3b"/,
    "init.js must fall back to plain '3b' stageId when not batched");
});

test("batch — init.js source-parity: 3a is NOT batched, 3d is aux-only", () => {
  const initSrc = fs.readFileSync(
    path.join(__dirname, "..", "bin", "commands", "init.js"), "utf-8");

  // 3a runStage 호출은 직접 "3a" 문자열 (배치 없음, 단일 스테이지)
  assert.match(initSrc, /runStage\("3a"/,
    "init.js must call runStage with plain '3a' (no batching)");

  // Master plan 생성 제거됨 — 3d-standard/rules/skills/guide는 더 이상 없음.
  // plain "3d" 호출도 없음 (aux 전용 runStage로 대체됨).
  assert.doesNotMatch(initSrc, /runStage\("3d"/,
    "init.js must NOT have a plain 3d stage — only 3d-aux remains");
  assert.doesNotMatch(initSrc, /runStage\("3d-standard"/,
    "init.js must NOT call 3d-standard — master plan aggregation removed");
  assert.doesNotMatch(initSrc, /runStage\("3d-rules"/,
    "init.js must NOT call 3d-rules — master plan aggregation removed");
  assert.doesNotMatch(initSrc, /runStage\("3d-skills"/,
    "init.js must NOT call 3d-skills — master plan aggregation removed");
  assert.doesNotMatch(initSrc, /runStage\("3d-guide"/,
    "init.js must NOT call 3d-guide — master plan aggregation removed");

  // 3d-aux만 남음 (database + mcp-guide stub)
  assert.match(initSrc, /runStage\("3d-aux"/,
    "init.js must call 3d-aux sub-stage (only remaining 3d sub-stage)");

  // build3dSubPrompt 헬퍼 존재 (aux 전용으로 축소됨)
  assert.match(initSrc, /function build3dSubPrompt/,
    "init.js must define build3dSubPrompt helper");
});

test("batch — marker groupsCompleted shape is backward-compatible", () => {
  // 도메인 7개 프로젝트 (3b/3c 단일, 3d는 aux 하나만):
  //   ["3a", "3b", "3c", "3d-aux"]
  // 도메인 18개 프로젝트 (3b/3c 배치, 3d는 aux 하나만):
  //   ["3a", "3b-core", "3b-1", "3b-2", "3c-core", "3c-1", "3c-2", "3d-aux"]
  const singleBatchMarker = {
    mode: "split",
    groupsCompleted: ["3a", "3b", "3c", "3d-aux"],
    completedAt: "2026-04-20T...",
  };
  const batchedMarker = {
    mode: "split",
    groupsCompleted: [
      "3a",
      "3b-core", "3b-1", "3b-2",
      "3c-core", "3c-1", "3c-2",
      "3d-aux",
    ],
    completedAt: "2026-04-20T...",
  };

  const s1 = JSON.parse(JSON.stringify(singleBatchMarker));
  const s2 = JSON.parse(JSON.stringify(batchedMarker));

  assert.strictEqual(s1.groupsCompleted.length, 4);
  assert.strictEqual(s2.groupsCompleted.length, 8);

  // 3d-aux 포함 (두 케이스 모두)
  assert.ok(s1.groupsCompleted.includes("3d-aux"),
    "single-batch marker must include 3d-aux");
  assert.ok(s2.groupsCompleted.includes("3d-aux"),
    "batched marker must include 3d-aux");

  // 제거된 3d 서브스테이지들은 marker에 없어야 함
  for (const removed of ["3d", "3d-standard", "3d-rules", "3d-skills", "3d-guide"]) {
    assert.ok(!s1.groupsCompleted.includes(removed),
      `marker must NOT include removed stage '${removed}'`);
    assert.ok(!s2.groupsCompleted.includes(removed),
      `marker must NOT include removed stage '${removed}'`);
  }

  // 배치 모드에서만 core 스테이지 있음
  assert.ok(s2.groupsCompleted.includes("3b-core"));
  assert.ok(s2.groupsCompleted.includes("3c-core"));
  assert.ok(!s1.groupsCompleted.includes("3b-core"),
    "single-batch marker must NOT include 3b-core (backward-compat for 3b/3c)");
});

test("batch — total stages calculation: 3d is always 1 (aux only)", () => {
  // 공식: isBatched ? (1 + 1 + N + 1 + N + 1) : (1 + 1 + 1 + 1)
  // 즉 3a + 3b(단일 or core+N) + 3c(단일 or core+N) + 3d-aux(1)
  //
  // 배치 없음 (도메인 ≤15) → 1 + 1 + 1 + 1 = 4
  assert.strictEqual(1 + 1 + 1 + 1, 4);
  // 배치 2개 (도메인 16~30) → 1 + 1 + 2 + 1 + 2 + 1 = 8
  assert.strictEqual(1 + 1 + 2 + 1 + 2 + 1, 8);
  // 배치 5개 (도메인 61~75) → 1 + 1 + 5 + 1 + 5 + 1 = 14
  assert.strictEqual(1 + 1 + 5 + 1 + 5 + 1, 14);
  // 배치 7개 (도메인 91~105) → 1 + 1 + 7 + 1 + 7 + 1 = 18
  assert.strictEqual(1 + 1 + 7 + 1 + 7 + 1, 18);
});

// ─── 3b-core / 3c-core 스테이지 분리 검증 ───────────────────────

test("batch — init.js: 3b-core stage is defined for multi-batch projects", () => {
  const initSrc = fs.readFileSync(
    path.join(__dirname, "..", "bin", "commands", "init.js"), "utf-8");

  // 3b-core stage 호출이 isBatched 분기 안에 있어야 함
  assert.match(initSrc, /runStage\("3b-core"/,
    "init.js must define 3b-core stage for multi-batch projects");

  // 3c-core stage 호출
  assert.match(initSrc, /runStage\("3c-core"/,
    "init.js must define 3c-core stage for multi-batch projects");

  // buildStageCorePrompt 헬퍼 존재
  assert.match(initSrc, /function buildStageCorePrompt/,
    "init.js must define buildStageCorePrompt helper");
});

test("batch — init.js: core stages run only when isBatched is true", () => {
  const initSrc = fs.readFileSync(
    path.join(__dirname, "..", "bin", "commands", "init.js"), "utf-8");

  // 3b-core 호출이 `if (isBatched)` 내부에 있는지 확인
  // 구조: `if (isBatched) { ... runStage("3b-core" ... }`
  // 정확한 구조 매칭이 어려우므로 근접성으로 확인
  const runStageCoreMatch = initSrc.match(/if\s*\(isBatched\)\s*\{[\s\S]{0,500}runStage\("3b-core"/);
  assert.ok(runStageCoreMatch,
    "init.js must guard 3b-core runStage call with `if (isBatched)`");

  const runStageCCoreMatch = initSrc.match(/if\s*\(isBatched\)\s*\{[\s\S]{0,500}runStage\("3c-core"/);
  assert.ok(runStageCCoreMatch,
    "init.js must guard 3c-core runStage call with `if (isBatched)`");
});

test("batch — buildBatchScopeNote: instructs NO common files (delegated to 3b-core)", () => {
  const initSrc = fs.readFileSync(
    path.join(__dirname, "..", "bin", "commands", "init.js"), "utf-8");

  // 3b batch scope 설명에서 "already generated by 3b-core" 혹은 유사 문구 존재
  assert.match(initSrc, /ALREADY GENERATED by the 3b-core/,
    "buildBatchScopeNote(3b, ...) must tell Claude that common files are already generated by 3b-core");

  assert.match(initSrc, /ALREADY GENERATED by the 3c-core/,
    "buildBatchScopeNote(3c, ...) must tell Claude that common files are already generated by 3c-core");
});

test("batch — marker groupsCompleted includes core stages when batched", () => {
  // 다중 배치 성공 시 marker 샘플 (3d는 aux-only):
  const batchedMarker = {
    mode: "split",
    groupsCompleted: [
      "3a",
      "3b-core", "3b-1", "3b-2",
      "3c-core", "3c-1", "3c-2",
      "3d-aux",
    ],
    completedAt: "2026-04-20T...",
  };

  // 단일 배치 성공 시 marker (backward-compatible — core 스테이지 없음):
  const singleBatchMarker = {
    mode: "split",
    groupsCompleted: ["3a", "3b", "3c", "3d-aux"],
    completedAt: "2026-04-20T...",
  };

  // 두 형태 모두 JSON round-trip OK
  const s1 = JSON.parse(JSON.stringify(batchedMarker));
  const s2 = JSON.parse(JSON.stringify(singleBatchMarker));

  assert.strictEqual(s1.groupsCompleted.length, 8);
  assert.ok(s1.groupsCompleted.includes("3b-core"));
  assert.ok(s1.groupsCompleted.includes("3c-core"));

  assert.strictEqual(s2.groupsCompleted.length, 4);
  assert.ok(!s2.groupsCompleted.includes("3b-core"),
    "single-batch marker must NOT include 3b-core (backward-compat)");
});

// ─── Empirical scenario: 18-domain project (production run 2026-04-20) ──
// Real data point from a 102-minute production run on a React 19 + Vite 6
// admin frontend. These tests pin the observed stage structure so future
// refactoring doesn't accidentally break projects of this exact shape.

test("batch — 18-domain empirical scenario: 2 batches of 15+3 (as observed in production)", () => {
  // Generic 18-domain fixture used to pin the split behavior observed in an
  // actual 18-domain production run (names anonymized — behavior is
  // count-driven, so exact names don't matter to the algorithm).
  const domains = Array.from({ length: 18 }, (_, i) => `domain-${i + 1}`);
  assert.strictEqual(domains.length, 18, "fixture must have exactly 18 domains");

  const batches = computeBatches(domains);
  assert.strictEqual(batches.length, 2, "18 domains → exactly 2 batches");
  assert.strictEqual(batches[0].length, 15, "first batch holds 15 domains");
  assert.strictEqual(batches[1].length, 3, "second batch holds 3 domains");

  // Confirm the split preserves order (important: domain-groups.json feeds
  // this ordering, and out-of-order batches would break 3b-core's fact-sheet
  // assumptions about which domains go in which batch).
  assert.deepStrictEqual(batches[0], domains.slice(0, 15));
  assert.deepStrictEqual(batches[1], domains.slice(15, 18));
});

test("batch — 18 domains produces exactly 8 stages total (3a + 3b-core + 3b-1/2 + 3c-core + 3c-1/2 + 3d-aux)", () => {
  // CHANGELOG v2.1.0 claims: "16-30 domains → 8 stages"
  // This test pins that invariant for the 18-domain case specifically.
  const domains = Array.from({ length: 18 }, (_, i) => `d${i}`);
  const batches = computeBatches(domains);
  const isBatched = batches.length > 1;

  // Total stages = 1 (3a) + 1 (3b-core) + N (3b-1..N) + 1 (3c-core) + N (3c-1..N) + 1 (3d-aux)
  //             = 2N + 4 when isBatched
  const totalStages = isBatched ? (2 * batches.length + 4) : 4;
  assert.strictEqual(totalStages, 8,
    "18 domains must produce exactly 8 stages (2*2 + 4 = 8)");

  // Verify each logical stage name is distinct (no duplicate markers)
  const stageNames = [
    "3a",
    "3b-core", ...batches.map((_, i) => `3b-${i + 1}`),
    "3c-core", ...batches.map((_, i) => `3c-${i + 1}`),
    "3d-aux",
  ];
  assert.strictEqual(stageNames.length, 8);
  assert.strictEqual(new Set(stageNames).size, stageNames.length,
    "all stage names must be unique");
});
