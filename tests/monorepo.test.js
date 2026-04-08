/**
 * ClaudeOS-Core — Monorepo Support Tests
 *
 * Tests JS/TS monorepo detection and scanning:
 *   - stack-detector: turbo.json, pnpm-workspace.yaml, lerna.json, package.json#workspaces
 *   - stack-detector: sub-package dependency merging (framework/frontend/ORM)
 *   - scan-node: monorepo apps and packages directory patterns
 *   - scan-frontend: monorepo app/pages directory patterns
 *   - Angular monorepo pattern
 */

const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const os = require("os");

const { detectStack } = require("../plan-installer/stack-detector");
const { scanNodeDomains } = require("../plan-installer/scanners/scan-node");
const { scanFrontendDomains } = require("../plan-installer/scanners/scan-frontend");

function makeTmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "ccore-mono-"));
}
function cleanup(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}
function writeFile(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
}
function touch(filePath) {
  writeFile(filePath, "// placeholder\n");
}

// ─── stack-detector: monorepo marker detection ──────────────

describe("detectStack — monorepo markers", () => {
  let tmp;
  beforeEach(() => { tmp = makeTmpDir(); });
  afterEach(() => cleanup(tmp));

  it("detects Turborepo from turbo.json", async () => {
    writeFile(path.join(tmp, "package.json"), JSON.stringify({
      workspaces: ["apps/*", "packages/*"],
    }));
    writeFile(path.join(tmp, "turbo.json"), JSON.stringify({ pipeline: {} }));

    const s = await detectStack(tmp);
    assert.equal(s.monorepo, "turborepo");
    assert.ok(s.detected.includes("turbo.json"));
    assert.deepEqual(s.workspaces, ["apps/*", "packages/*"]);
  });

  it("detects pnpm-workspace from pnpm-workspace.yaml", async () => {
    writeFile(path.join(tmp, "package.json"), JSON.stringify({}));
    writeFile(path.join(tmp, "pnpm-workspace.yaml"), "packages:\n  - 'apps/*'\n  - 'packages/*'\n");
    writeFile(path.join(tmp, "pnpm-lock.yaml"), "");

    const s = await detectStack(tmp);
    assert.equal(s.monorepo, "pnpm-workspace");
    assert.ok(s.detected.includes("pnpm-workspace.yaml"));
    assert.deepEqual(s.workspaces, ["apps/*", "packages/*"]);
  });

  it("detects Lerna from lerna.json", async () => {
    writeFile(path.join(tmp, "package.json"), JSON.stringify({}));
    writeFile(path.join(tmp, "lerna.json"), JSON.stringify({ version: "independent" }));

    const s = await detectStack(tmp);
    assert.equal(s.monorepo, "lerna");
    assert.ok(s.detected.includes("lerna.json"));
  });

  it("detects npm workspaces from package.json#workspaces", async () => {
    writeFile(path.join(tmp, "package.json"), JSON.stringify({
      workspaces: ["apps/*", "packages/*"],
    }));

    const s = await detectStack(tmp);
    assert.equal(s.monorepo, "npm-workspaces");
    assert.deepEqual(s.workspaces, ["apps/*", "packages/*"]);
  });

  it("supports yarn workspaces object format", async () => {
    writeFile(path.join(tmp, "package.json"), JSON.stringify({
      workspaces: { packages: ["apps/*", "libs/*"] },
    }));
    writeFile(path.join(tmp, "yarn.lock"), "");

    const s = await detectStack(tmp);
    assert.equal(s.monorepo, "npm-workspaces");
    assert.deepEqual(s.workspaces, ["apps/*", "libs/*"]);
    assert.equal(s.packageManager, "yarn");
  });

  it("returns null monorepo for non-monorepo project", async () => {
    writeFile(path.join(tmp, "package.json"), JSON.stringify({
      dependencies: { express: "^4.18.0" },
    }));

    const s = await detectStack(tmp);
    assert.equal(s.monorepo, null);
    assert.equal(s.workspaces, null);
  });

  it("prioritizes turbo.json over other markers", async () => {
    writeFile(path.join(tmp, "package.json"), JSON.stringify({ workspaces: ["apps/*"] }));
    writeFile(path.join(tmp, "turbo.json"), "{}");
    writeFile(path.join(tmp, "lerna.json"), "{}");

    const s = await detectStack(tmp);
    assert.equal(s.monorepo, "turborepo");
  });
});

// ─── stack-detector: sub-package dependency merging ─────────

describe("detectStack — monorepo sub-package deps", () => {
  let tmp;
  beforeEach(() => { tmp = makeTmpDir(); });
  afterEach(() => cleanup(tmp));

  it("detects Next.js from apps/web/package.json", async () => {
    writeFile(path.join(tmp, "package.json"), JSON.stringify({
      workspaces: ["apps/*"],
      devDependencies: { typescript: "^5.3.0" },
    }));
    writeFile(path.join(tmp, "turbo.json"), "{}");
    writeFile(path.join(tmp, "apps/web/package.json"), JSON.stringify({
      dependencies: { next: "^14.0.0", react: "^18.0.0" },
    }));

    const s = await detectStack(tmp);
    assert.equal(s.monorepo, "turborepo");
    assert.equal(s.frontend, "nextjs");
    assert.equal(s.language, "typescript");
  });

  it("detects Express from apps/api/package.json", async () => {
    writeFile(path.join(tmp, "package.json"), JSON.stringify({
      workspaces: ["apps/*"],
      devDependencies: { typescript: "^5.3.0" },
    }));
    writeFile(path.join(tmp, "turbo.json"), "{}");
    writeFile(path.join(tmp, "apps/api/package.json"), JSON.stringify({
      dependencies: { express: "^4.18.0", "@prisma/client": "^5.0.0" },
    }));

    const s = await detectStack(tmp);
    assert.equal(s.framework, "express");
    assert.equal(s.orm, "prisma");
  });

  it("detects both frontend and backend from separate sub-packages", async () => {
    writeFile(path.join(tmp, "package.json"), JSON.stringify({
      workspaces: ["apps/*", "packages/*"],
      devDependencies: { typescript: "^5.3.0" },
    }));
    writeFile(path.join(tmp, "turbo.json"), "{}");
    writeFile(path.join(tmp, "apps/web/package.json"), JSON.stringify({
      dependencies: { next: "^14.0.0", react: "^18.0.0" },
    }));
    writeFile(path.join(tmp, "apps/api/package.json"), JSON.stringify({
      dependencies: { fastify: "^4.26.0", pg: "^8.0.0" },
    }));

    const s = await detectStack(tmp);
    assert.equal(s.frontend, "nextjs");
    assert.equal(s.framework, "fastify");
    assert.equal(s.database, "postgresql");
  });

  it("detects ORM from packages/db/package.json", async () => {
    writeFile(path.join(tmp, "package.json"), JSON.stringify({
      workspaces: ["apps/*", "packages/*"],
    }));
    writeFile(path.join(tmp, "turbo.json"), "{}");
    writeFile(path.join(tmp, "packages/db/package.json"), JSON.stringify({
      dependencies: { "drizzle-orm": "^0.30.0", pg: "^8.0.0" },
    }));

    const s = await detectStack(tmp);
    assert.equal(s.orm, "drizzle");
    assert.equal(s.database, "postgresql");
  });

  it("reads pnpm-workspace.yaml paths for sub-package glob", async () => {
    writeFile(path.join(tmp, "package.json"), JSON.stringify({}));
    writeFile(path.join(tmp, "pnpm-workspace.yaml"), "packages:\n  - 'services/*'\n");
    writeFile(path.join(tmp, "pnpm-lock.yaml"), "");
    writeFile(path.join(tmp, "services/gateway/package.json"), JSON.stringify({
      dependencies: { express: "^4.18.0" },
    }));

    const s = await detectStack(tmp);
    assert.equal(s.monorepo, "pnpm-workspace");
    assert.equal(s.framework, "express");
  });
});

// ─── scan-node: monorepo backend detection ──────────────────

describe("scanNodeDomains — monorepo", () => {
  let tmp;
  beforeEach(() => { tmp = makeTmpDir(); });
  afterEach(() => cleanup(tmp));

  it("detects modules from apps/api/src/modules/*/", async () => {
    touch(path.join(tmp, "apps/api/src/modules/users/users.controller.ts"));
    touch(path.join(tmp, "apps/api/src/modules/users/users.service.ts"));
    touch(path.join(tmp, "apps/api/src/modules/orders/orders.controller.ts"));

    const stack = { language: "typescript", framework: "nestjs", monorepo: "turborepo" };
    const { backendDomains } = await scanNodeDomains(stack, tmp);

    const names = backendDomains.map(d => d.name);
    assert.ok(names.includes("users"), "should detect users from apps/api/src/modules/");
    assert.ok(names.includes("orders"), "should detect orders from apps/api/src/modules/");
  });

  it("detects domains from apps/api/src/*/", async () => {
    touch(path.join(tmp, "apps/api/src/products/products.router.ts"));
    touch(path.join(tmp, "apps/api/src/products/products.service.ts"));
    touch(path.join(tmp, "apps/api/src/payments/payments.controller.ts"));

    const stack = { language: "typescript", framework: "express", monorepo: "turborepo" };
    const { backendDomains } = await scanNodeDomains(stack, tmp);

    const names = backendDomains.map(d => d.name);
    assert.ok(names.includes("products"), "should detect products from apps/api/src/");
    assert.ok(names.includes("payments"), "should detect payments from apps/api/src/");
  });

  it("detects domains from packages/*/src/*/", async () => {
    touch(path.join(tmp, "packages/core/src/auth/auth.service.ts"));
    touch(path.join(tmp, "packages/core/src/auth/auth.controller.ts"));

    const stack = { language: "typescript", framework: "express", monorepo: "turborepo" };
    const { backendDomains } = await scanNodeDomains(stack, tmp);

    const names = backendDomains.map(d => d.name);
    assert.ok(names.includes("auth"), "should detect auth from packages/core/src/");
  });

  it("combines standard src/ and monorepo apps/ results", async () => {
    touch(path.join(tmp, "src/modules/local/local.controller.ts"));
    touch(path.join(tmp, "apps/api/src/modules/remote/remote.controller.ts"));

    const stack = { language: "typescript", framework: "nestjs", monorepo: "turborepo" };
    const { backendDomains } = await scanNodeDomains(stack, tmp);

    const names = backendDomains.map(d => d.name);
    assert.ok(names.includes("local"), "should include standard src/ domain");
    assert.ok(names.includes("remote"), "should include monorepo apps/ domain");
  });

  it("skips common/shared dirs in monorepo paths too", async () => {
    touch(path.join(tmp, "apps/api/src/common/logger.ts"));
    touch(path.join(tmp, "apps/api/src/utils/helpers.ts"));

    const stack = { language: "typescript", framework: "express", monorepo: "turborepo" };
    const { backendDomains } = await scanNodeDomains(stack, tmp);

    const names = backendDomains.map(d => d.name);
    assert.ok(!names.includes("common"));
    assert.ok(!names.includes("utils"));
  });
});

// ─── scan-frontend: monorepo frontend detection ─────────────

describe("scanFrontendDomains — monorepo Next.js", () => {
  let tmp;
  beforeEach(() => { tmp = makeTmpDir(); });
  afterEach(() => cleanup(tmp));

  it("detects domains from apps/web/app/*/", async () => {
    touch(path.join(tmp, "apps/web/app/dashboard/page.tsx"));
    touch(path.join(tmp, "apps/web/app/dashboard/layout.tsx"));
    touch(path.join(tmp, "apps/web/app/settings/page.tsx"));

    const stack = { frontend: "nextjs", language: "typescript", monorepo: "turborepo" };
    const { frontendDomains } = await scanFrontendDomains(stack, tmp);

    const names = frontendDomains.map(d => d.name);
    assert.ok(names.includes("dashboard"), "should detect dashboard from apps/web/app/");
    assert.ok(names.includes("settings"), "should detect settings from apps/web/app/");
  });

  it("detects domains from apps/web/src/app/*/", async () => {
    touch(path.join(tmp, "apps/web/src/app/products/page.tsx"));
    touch(path.join(tmp, "apps/web/src/app/products/ProductList.tsx"));

    const stack = { frontend: "nextjs", language: "typescript", monorepo: "turborepo" };
    const { frontendDomains } = await scanFrontendDomains(stack, tmp);

    const names = frontendDomains.map(d => d.name);
    assert.ok(names.includes("products"), "should detect products from apps/web/src/app/");
  });

  it("detects domains from apps/web/pages/*/", async () => {
    touch(path.join(tmp, "apps/web/pages/blog/index.tsx"));
    touch(path.join(tmp, "apps/web/pages/blog/BlogCard.tsx"));

    const stack = { frontend: "nextjs", language: "typescript", monorepo: "turborepo" };
    const { frontendDomains } = await scanFrontendDomains(stack, tmp);

    const names = frontendDomains.map(d => d.name);
    assert.ok(names.includes("blog"), "should detect blog from apps/web/pages/");
  });

  it("excludes reserved segments in monorepo paths", async () => {
    touch(path.join(tmp, "apps/web/app/api/route.ts"));
    touch(path.join(tmp, "apps/web/app/not-found/page.tsx"));
    touch(path.join(tmp, "apps/web/app/[id]/page.tsx"));
    touch(path.join(tmp, "apps/web/app/(group)/page.tsx"));
    touch(path.join(tmp, "apps/web/app/valid/page.tsx"));

    const stack = { frontend: "nextjs", language: "typescript", monorepo: "turborepo" };
    const { frontendDomains } = await scanFrontendDomains(stack, tmp);

    const names = frontendDomains.map(d => d.name);
    assert.ok(names.includes("valid"));
    assert.ok(!names.includes("api"));
    assert.ok(!names.includes("not-found"));
    assert.ok(!names.some(n => n.startsWith("[")));
    assert.ok(!names.some(n => n.startsWith("(")));
  });

  it("combines standard app/ and monorepo apps/ results", async () => {
    touch(path.join(tmp, "app/local/page.tsx"));
    touch(path.join(tmp, "apps/web/app/remote/page.tsx"));

    const stack = { frontend: "nextjs", language: "typescript", monorepo: "turborepo" };
    const { frontendDomains } = await scanFrontendDomains(stack, tmp);

    const names = frontendDomains.map(d => d.name);
    assert.ok(names.includes("local"), "should include standard app/ domain");
    assert.ok(names.includes("remote"), "should include monorepo apps/ domain");
  });
});

describe("scanFrontendDomains — monorepo Angular", () => {
  let tmp;
  beforeEach(() => { tmp = makeTmpDir(); });
  afterEach(() => cleanup(tmp));

  it("detects feature modules from apps/*/src/app/*/", async () => {
    touch(path.join(tmp, "apps/admin/src/app/dashboard/dashboard.component.ts"));
    touch(path.join(tmp, "apps/admin/src/app/dashboard/dashboard.service.ts"));
    touch(path.join(tmp, "apps/admin/src/app/reports/reports.component.ts"));

    const stack = { frontend: "angular", language: "typescript", monorepo: "turborepo" };
    const { frontendDomains } = await scanFrontendDomains(stack, tmp);

    const names = frontendDomains.map(d => d.name);
    assert.ok(names.includes("dashboard"), "should detect dashboard from apps/admin/src/app/");
    assert.ok(names.includes("reports"), "should detect reports from apps/admin/src/app/");
  });
});

describe("scanFrontendDomains — monorepo packages/*/", () => {
  let tmp;
  beforeEach(() => { tmp = makeTmpDir(); });
  afterEach(() => cleanup(tmp));

  it("detects from packages/web/app/*/", async () => {
    touch(path.join(tmp, "packages/web/app/shop/page.tsx"));
    touch(path.join(tmp, "packages/web/app/shop/ShopList.tsx"));

    const stack = { frontend: "nextjs", language: "typescript", monorepo: "turborepo" };
    const { frontendDomains } = await scanFrontendDomains(stack, tmp);

    const names = frontendDomains.map(d => d.name);
    assert.ok(names.includes("shop"), "should detect shop from packages/web/app/");
  });
});
