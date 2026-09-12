/**
 * ClaudeOS-Core — Stack shape predicates
 *
 * v2.5.3 — `hasBackendStack` lived as a local `const hasBackend` inside
 * `detectStack()` (port-splitting logic). The Phase 2 "no domains" warning in
 * plan-installer needs the same answer, so it is one function now: the two
 * call sites can never disagree about what counts as a backend.
 *
 * `stack.framework` is populated by backend frameworks (spring-boot,
 * spring-framework, express, fastify, nestjs, django, fastapi, flask) and by
 * exactly one non-backend value, `vite`, which stack-detector records when a
 * Vite SPA has no backend framework at all. Frontend frameworks (Next.js,
 * Nuxt, Angular) go to `stack.frontend` and never to `stack.framework`.
 */

function hasBackendStack(stack) {
  if (!stack) return false;
  return (!!stack.framework && stack.framework !== "vite")
    || ["java", "kotlin", "python"].includes(stack.language);
}

function hasFrontendStack(stack) {
  return !!(stack && stack.frontend);
}

module.exports = { hasBackendStack, hasFrontendStack };
