/**
 * ClaudeOS-Core — stack-shape predicate tests (v2.5.3)
 *
 * `hasBackendStack` / `hasFrontendStack` decide whether the Phase 2
 * "no domains" warning fires for a side. The former gate,
 * `backend === 0 && frontend === 0`, was silent when a Spring Boot + Next.js
 * repo lost its whole backend; a plain `||` would have warned on every
 * single-sided project. The key is what Phase 1 detected, not the other
 * side's count.
 */

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const { hasBackendStack, hasFrontendStack } = require("../lib/stack-shape");

describe("hasBackendStack / hasFrontendStack", () => {
  it("backend frameworks and JVM/Python languages count as a backend", () => {
    for (const s of [
      { language: "java", framework: "spring-boot" },
      { language: "java", framework: "spring-framework" },
      { language: "java", framework: null },            // plain Java / legacy tree, framework unresolved
      { language: "kotlin", framework: null },
      { language: "python", framework: "django" },
      { language: "python", framework: null },
      { language: "typescript", framework: "nestjs" },
      { language: "javascript", framework: "express" },
      { language: "javascript", framework: "fastify" },
    ]) assert.equal(hasBackendStack(s), true, JSON.stringify(s));
  });

  it("frontend-only stacks are NOT a backend — including the Vite sentinel in `framework`", () => {
    for (const s of [
      { language: "javascript", framework: null, frontend: "nextjs" },
      { language: "typescript", framework: null, frontend: "angular" },
      { language: "typescript", framework: null, frontend: "vue" },
      { language: "typescript", framework: "vite", frontend: "react" },   // stack-detector stores "vite" here for a bare SPA
      { language: null, framework: null },
      null,
      undefined,
    ]) assert.equal(hasBackendStack(s), false, JSON.stringify(s));
  });

  it("hasFrontendStack keys on `stack.frontend` only", () => {
    assert.equal(hasFrontendStack({ frontend: "nextjs" }), true);
    assert.equal(hasFrontendStack({ frontend: "react", framework: "vite" }), true);
    assert.equal(hasFrontendStack({ frontend: null, framework: "spring-boot" }), false);
    assert.equal(hasFrontendStack({}), false);
    assert.equal(hasFrontendStack(null), false);
  });

  it("the Phase 2 warning matrix: fires only where a detected side has zero domains", () => {
    const warn = (stack, be, fe) => ({
      backend: hasBackendStack(stack) && be === 0,
      frontend: hasFrontendStack(stack) && fe === 0,
    });
    const boot = { language: "java", framework: "spring-boot" };
    const bootNext = { ...boot, frontend: "nextjs" };
    const nextOnly = { language: "javascript", framework: null, frontend: "nextjs" };
    const viteOnly = { language: "typescript", framework: "vite", frontend: "react" };

    assert.deepEqual(warn(bootNext, 0, 1), { backend: true, frontend: false }, "Boot+Next, backend missed → warn backend (was silent pre-2.5.3)");
    assert.deepEqual(warn(bootNext, 0, 0), { backend: true, frontend: true }, "both missed → both");
    assert.deepEqual(warn(bootNext, 3, 1), { backend: false, frontend: false }, "healthy");
    assert.deepEqual(warn(nextOnly, 0, 1), { backend: false, frontend: false }, "Next-only: zero backend domains is normal");
    assert.deepEqual(warn(viteOnly, 0, 2), { backend: false, frontend: false }, "Vite-only: `framework: vite` must not read as a backend");
    assert.deepEqual(warn(boot, 1, 0), { backend: false, frontend: false }, "Boot-only: zero frontend domains is normal");
    assert.deepEqual(warn(boot, 0, 0), { backend: true, frontend: false }, "Boot-only, backend missed → backend only");
  });

  it("plan-installer and stack-detector both use the shared predicate (no drift)", () => {
    const root = path.join(__dirname, "..");
    const installer = fs.readFileSync(path.join(root, "plan-installer/index.js"), "utf8");
    const detector = fs.readFileSync(path.join(root, "plan-installer/stack-detector.js"), "utf8");
    assert.match(installer, /require\("\.\.\/lib\/stack-shape"\)/);
    assert.match(installer, /hasBackendStack\(stack\) && backendDomains\.length === 0/);
    assert.match(installer, /hasFrontendStack\(stack\) && frontendDomains\.length === 0/);
    // `domains` IS backendDomains.concat(frontendDomains), so the zero-total
    // gate restored in v2.5.3 (`domains.length === 0`) is the same CONDITION
    // this expression describes — what must not come back is the old SHAPE, in
    // which it was the only branch and a one-sided miss therefore said nothing.
    // The behavioural matrix above is what actually pins that; this line just
    // stops a straight revert.
    assert.doesNotMatch(installer, /backendDomains\.length === 0 && frontendDomains\.length === 0/, "a straight revert to the one-branch both-zero gate must not reappear");
    assert.match(detector, /const hasBackend = hasBackendStack\(stack\)/);
    assert.doesNotMatch(detector, /stack\.framework !== "vite"\) \|\| \["java", "kotlin", "python"\]/, "inline copy must not survive in stack-detector");
  });
});

// ─── v2.5.3 review fix: the zero-total case must never be silent ─────────────
//
// Keying the whole warning block on the per-side predicates dropped the
// original "No domains detected" message for a project Phase 1 recognized
// NEITHER side of — a bare repository, a plain Node script, a TypeScript
// library. Those produce zero domains, skip Pass 1, and said nothing at all.
// It also let the per-side message lie: "Pass 1 will analyze the frontend
// only" is false when there is no frontend either.

describe("Phase 2 warning — which message fires", () => {
  // Mirrors the branch in plan-installer/index.js. The source-level test below
  // pins that the real file still has this shape.
  const decide = (stack, be, fe) => {
    const missingBackend = hasBackendStack(stack) && be === 0;
    const missingFrontend = hasFrontendStack(stack) && fe === 0;
    if (be + fe === 0) {
      return { kind: "none-at-all", namesBackend: missingBackend, namesFrontend: missingFrontend };
    }
    if (missingBackend) return { kind: "backend-only-missing" };
    if (missingFrontend) return { kind: "frontend-only-missing" };
    return { kind: "silent" };
  };

  const bare = { language: null, framework: null, frontend: null };
  const node = { language: "javascript", framework: null, frontend: null };
  const boot = { language: "java", framework: "spring-boot", frontend: null };
  const bootNext = { language: "java", framework: "spring-boot", frontend: "nextjs" };
  const nextOnly = { language: "javascript", framework: null, frontend: "nextjs" };
  const viteOnly = { language: "typescript", framework: "vite", frontend: "react" };

  it("a project Phase 1 recognized neither side of still warns", () => {
    assert.equal(decide(bare, 0, 0).kind, "none-at-all");
    assert.equal(decide(node, 0, 0).kind, "none-at-all");
    assert.equal(decide(bare, 0, 0).namesBackend, false, "nothing to name when nothing was detected");
    assert.equal(decide(bare, 0, 0).namesFrontend, false);
  });

  it("zero total wins over the per-side message, and names the side that was detected", () => {
    const d = decide(boot, 0, 0);
    assert.equal(d.kind, "none-at-all", "Pass 1 is skipped — saying 'frontend only' would be false");
    assert.equal(d.namesBackend, true);
    assert.equal(d.namesFrontend, false);
  });

  it("the per-side message fires only when the other side actually has domains", () => {
    assert.equal(decide(bootNext, 0, 1).kind, "backend-only-missing");
    assert.equal(decide(bootNext, 3, 0).kind, "frontend-only-missing");
  });

  it("healthy single-sided projects stay silent", () => {
    assert.equal(decide(boot, 2, 0).kind, "silent");
    assert.equal(decide(nextOnly, 0, 2).kind, "silent");
    assert.equal(decide(viteOnly, 0, 2).kind, "silent");
    assert.equal(decide(bootNext, 3, 1).kind, "silent");
  });

  it("plan-installer still carries that shape (no drift)", () => {
    const installer = fs.readFileSync(path.join(__dirname, "..", "plan-installer/index.js"), "utf8");
    assert.match(installer, /if \(domains\.length === 0\)/, "the zero-total gate must come first");
    assert.match(installer, /No domains detected/);
    assert.match(installer, /stack\.language \|\| "unknown"/, "a null language must not print as `null`");
    assert.match(installer, /Pass 1 will analyze the frontend only/);
    assert.match(installer, /Pass 1 will analyze the backend only/);
  });
});
