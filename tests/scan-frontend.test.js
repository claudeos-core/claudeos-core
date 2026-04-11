/**
 * ClaudeOS-Core — Frontend Scanner Tests
 *
 * Tests scanFrontendDomains and countFrontendStats for:
 *   - Angular feature module detection + deep fallback
 *   - Next.js App Router / Pages Router + reserved segment filtering
 *   - FSD (Feature-Sliced Design) + components scan
 *   - Fallback A (page.tsx), B (FSD deep), C (deep components), D (views/screens)
 *   - countFrontendStats (components, pages, hooks counts)
 */

const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const os = require("os");

const { scanFrontendDomains, countFrontendStats } = require("../plan-installer/scanners/scan-frontend");

function makeTmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "ccore-fe-"));
}
function cleanup(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}
function touch(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, "// placeholder\n");
}

// ─── Angular ────────────────────────────────────────────────

describe("scanFrontendDomains — Angular primary", () => {
  let tmp;
  beforeEach(() => { tmp = makeTmpDir(); });
  afterEach(() => cleanup(tmp));

  it("detects feature modules from src/app/*/", async () => {
    touch(path.join(tmp, "src/app/dashboard/dashboard.component.ts"));
    touch(path.join(tmp, "src/app/dashboard/dashboard.service.ts"));
    touch(path.join(tmp, "src/app/dashboard/dashboard.module.ts"));
    touch(path.join(tmp, "src/app/settings/settings.component.ts"));
    touch(path.join(tmp, "src/app/settings/settings.pipe.ts"));
    touch(path.join(tmp, "src/app/settings/settings.directive.ts"));
    touch(path.join(tmp, "src/app/settings/settings.guard.ts"));

    const stack = { frontend: "angular", language: "typescript" };
    const { frontendDomains } = await scanFrontendDomains(stack, tmp);

    const dash = frontendDomains.find(d => d.name === "dashboard");
    const sett = frontendDomains.find(d => d.name === "settings");
    assert.ok(dash, "should detect dashboard");
    assert.ok(sett, "should detect settings");
    assert.equal(dash.components, 1);
    assert.equal(dash.services, 1);
    assert.equal(dash.modules, 1);
    assert.equal(sett.pipes, 1);
    assert.equal(sett.directives, 1);
    assert.equal(sett.guards, 1);
  });

  it("skips shared/core/layout directories", async () => {
    touch(path.join(tmp, "src/app/shared/shared.module.ts"));
    touch(path.join(tmp, "src/app/core/core.service.ts"));
    touch(path.join(tmp, "src/app/layout/layout.component.ts"));

    const stack = { frontend: "angular", language: "typescript" };
    const { frontendDomains } = await scanFrontendDomains(stack, tmp);
    const names = frontendDomains.map(d => d.name);
    assert.ok(!names.includes("shared"));
    assert.ok(!names.includes("core"));
    assert.ok(!names.includes("layout"));
  });

  it("skips .spec.ts and .test.ts files", async () => {
    touch(path.join(tmp, "src/app/users/users.component.ts"));
    touch(path.join(tmp, "src/app/users/users.component.spec.ts"));
    touch(path.join(tmp, "src/app/users/users.service.test.ts"));

    const stack = { frontend: "angular", language: "typescript" };
    const { frontendDomains } = await scanFrontendDomains(stack, tmp);
    const users = frontendDomains.find(d => d.name === "users");
    assert.ok(users);
    assert.equal(users.totalFiles, 1, "should exclude spec/test files");
  });
});

describe("scanFrontendDomains — Angular deep fallback", () => {
  let tmp;
  beforeEach(() => { tmp = makeTmpDir(); });
  afterEach(() => cleanup(tmp));

  it("detects from modules/features/pages when src/app/*/ is empty", async () => {
    touch(path.join(tmp, "src/app/modules/billing/billing.component.ts"));
    touch(path.join(tmp, "src/app/modules/billing/billing.service.ts"));
    touch(path.join(tmp, "src/app/features/reports/reports.component.ts"));
    touch(path.join(tmp, "src/app/features/reports/reports.service.ts"));

    const stack = { frontend: "angular", language: "typescript" };
    const { frontendDomains } = await scanFrontendDomains(stack, tmp);
    const names = frontendDomains.map(d => d.name);
    assert.ok(names.includes("billing"), "should detect billing from modules/");
    assert.ok(names.includes("reports"), "should detect reports from features/");
  });
});

// ─── Next.js / React / Vue ──────────────────────────────────

describe("scanFrontendDomains — Next.js App Router", () => {
  let tmp;
  beforeEach(() => { tmp = makeTmpDir(); });
  afterEach(() => cleanup(tmp));

  it("detects domains from app/*/", async () => {
    touch(path.join(tmp, "app/products/page.tsx"));
    touch(path.join(tmp, "app/products/layout.tsx"));
    touch(path.join(tmp, "app/products/client.tsx"));
    touch(path.join(tmp, "app/products/ProductList.tsx"));
    touch(path.join(tmp, "app/orders/page.tsx"));

    const stack = { frontend: "nextjs", language: "typescript" };
    const { frontendDomains } = await scanFrontendDomains(stack, tmp);

    const products = frontendDomains.find(d => d.name === "products");
    assert.ok(products, "should detect products");
    assert.equal(products.pages, 1);
    assert.equal(products.layouts, 1);
    assert.equal(products.clientFiles, 1);
    assert.equal(products.rscPattern, "RSC+Client split");
    assert.ok(frontendDomains.find(d => d.name === "orders"));
  });

  it("excludes reserved segments: api, _app, _document, not-found, error, loading", async () => {
    touch(path.join(tmp, "app/api/route.ts"));
    touch(path.join(tmp, "app/not-found/page.tsx"));
    touch(path.join(tmp, "app/error/page.tsx"));
    touch(path.join(tmp, "app/loading/page.tsx"));
    touch(path.join(tmp, "app/valid/page.tsx"));

    const stack = { frontend: "nextjs", language: "typescript" };
    const { frontendDomains } = await scanFrontendDomains(stack, tmp);
    const names = frontendDomains.map(d => d.name);
    assert.ok(!names.includes("api"));
    assert.ok(!names.includes("not-found"));
    assert.ok(!names.includes("error"));
    assert.ok(!names.includes("loading"));
    assert.ok(names.includes("valid"));
  });

  it("excludes [param], [...slug], (group) directories", async () => {
    touch(path.join(tmp, "app/shop/page.tsx"));
    touch(path.join(tmp, "app/[id]/page.tsx"));
    touch(path.join(tmp, "app/[...slug]/page.tsx"));
    touch(path.join(tmp, "app/(marketing)/page.tsx"));

    const stack = { frontend: "nextjs", language: "typescript" };
    const { frontendDomains } = await scanFrontendDomains(stack, tmp);
    const names = frontendDomains.map(d => d.name);
    assert.ok(names.includes("shop"));
    assert.ok(!names.some(n => n.startsWith("[")));
    assert.ok(!names.some(n => n.startsWith("(")));
  });
});

describe("scanFrontendDomains — Pages Router", () => {
  let tmp;
  beforeEach(() => { tmp = makeTmpDir(); });
  afterEach(() => cleanup(tmp));

  it("detects domains from pages/*/", async () => {
    touch(path.join(tmp, "pages/blog/index.tsx"));
    touch(path.join(tmp, "pages/blog/BlogCard.tsx"));
    touch(path.join(tmp, "src/pages/admin/index.tsx"));

    const stack = { frontend: "nextjs", language: "typescript" };
    const { frontendDomains } = await scanFrontendDomains(stack, tmp);
    const names = frontendDomains.map(d => d.name);
    assert.ok(names.includes("blog"));
    assert.ok(names.includes("admin"));
  });
});

describe("scanFrontendDomains — FSD", () => {
  let tmp;
  beforeEach(() => { tmp = makeTmpDir(); });
  afterEach(() => cleanup(tmp));

  it("detects features/widgets/entities domains", async () => {
    touch(path.join(tmp, "src/features/auth/ui/LoginForm.tsx"));
    touch(path.join(tmp, "src/features/auth/model/authStore.ts"));
    touch(path.join(tmp, "src/widgets/header/ui/Header.tsx"));
    touch(path.join(tmp, "src/entities/user/ui/UserCard.tsx"));

    const stack = { frontend: "react", language: "typescript" };
    const { frontendDomains } = await scanFrontendDomains(stack, tmp);
    const names = frontendDomains.map(d => d.name);
    assert.ok(names.includes("features/auth"));
    assert.ok(names.includes("widgets/header"));
    assert.ok(names.includes("entities/user"));
  });

  it("skips ui/common/shared/lib/config in FSD", async () => {
    touch(path.join(tmp, "features/ui/Button.tsx"));
    touch(path.join(tmp, "features/common/helpers.ts"));
    touch(path.join(tmp, "features/shared/utils.ts"));

    const stack = { frontend: "react", language: "typescript" };
    const { frontendDomains } = await scanFrontendDomains(stack, tmp);
    const names = frontendDomains.map(d => d.name);
    assert.ok(!names.some(n => n.endsWith("/ui")));
    assert.ok(!names.some(n => n.endsWith("/common")));
    assert.ok(!names.some(n => n.endsWith("/shared")));
  });
});

describe("scanFrontendDomains — components/* scan", () => {
  let tmp;
  beforeEach(() => { tmp = makeTmpDir(); });
  afterEach(() => cleanup(tmp));

  it("detects component domains with >= 2 files", async () => {
    touch(path.join(tmp, "src/components/forms/InputField.tsx"));
    touch(path.join(tmp, "src/components/forms/SelectField.tsx"));
    // single file — should not be detected
    touch(path.join(tmp, "src/components/solo/Solo.tsx"));

    const stack = { frontend: "react", language: "typescript" };
    const { frontendDomains } = await scanFrontendDomains(stack, tmp);
    const names = frontendDomains.map(d => d.name);
    assert.ok(names.includes("comp-forms"), "should detect forms with comp- prefix");
    assert.ok(!names.includes("comp-solo"), "should skip single-file component dirs");
  });

  it("skips ui/common/shared/layout/icons", async () => {
    touch(path.join(tmp, "components/ui/Button.tsx"));
    touch(path.join(tmp, "components/ui/Input.tsx"));
    touch(path.join(tmp, "components/icons/Arrow.tsx"));
    touch(path.join(tmp, "components/icons/Check.tsx"));

    const stack = { frontend: "react", language: "typescript" };
    const { frontendDomains } = await scanFrontendDomains(stack, tmp);
    const names = frontendDomains.map(d => d.name);
    assert.ok(!names.includes("comp-ui"));
    assert.ok(!names.includes("comp-icons"));
  });
});

// ─── Fallback A: page.tsx based ─────────────────────────────

describe("scanFrontendDomains — Fallback A (page.tsx)", () => {
  let tmp;
  beforeEach(() => { tmp = makeTmpDir(); });
  afterEach(() => cleanup(tmp));

  it("extracts domains from deep page.tsx when primary scan returns 0", async () => {
    // No direct app/*/ or pages/*/ dirs — only nested deeper
    touch(path.join(tmp, "src/web/app/dashboard/page.tsx"));
    touch(path.join(tmp, "src/web/app/dashboard/client.tsx"));
    touch(path.join(tmp, "src/web/app/settings/page.tsx"));

    const stack = { frontend: "nextjs", language: "typescript" };
    const { frontendDomains } = await scanFrontendDomains(stack, tmp);
    const names = frontendDomains.map(d => d.name);
    assert.ok(names.includes("dashboard"), "fallback A should detect dashboard");
    assert.ok(names.includes("settings"), "fallback A should detect settings");

    const dash = frontendDomains.find(d => d.name === "dashboard");
    assert.equal(dash.clientFiles, 1);
    assert.equal(dash.rscPattern, "RSC+Client split");
  });

  it("excludes _app, _document, api, ( and [ prefixed dirs", async () => {
    touch(path.join(tmp, "src/web/app/_app/page.tsx"));
    touch(path.join(tmp, "src/web/app/api/page.tsx"));
    touch(path.join(tmp, "src/web/app/(group)/page.tsx"));
    touch(path.join(tmp, "src/web/app/[id]/page.tsx"));
    touch(path.join(tmp, "src/web/app/real/page.tsx"));

    const stack = { frontend: "nextjs", language: "typescript" };
    const { frontendDomains } = await scanFrontendDomains(stack, tmp);
    const names = frontendDomains.map(d => d.name);
    assert.ok(names.includes("real"));
    assert.ok(!names.some(n => n.startsWith("_")));
    assert.ok(!names.some(n => n.startsWith("(")));
    assert.ok(!names.some(n => n.startsWith("[")));
  });
});

// ─── Fallback B: FSD deep ───────────────────────────────────

describe("scanFrontendDomains — Fallback B (FSD deep)", () => {
  let tmp;
  beforeEach(() => { tmp = makeTmpDir(); });
  afterEach(() => cleanup(tmp));

  it("detects FSD domains when no primary or fallback A results", async () => {
    // Deep FSD — no app/*/  or pages/*/ or components/*/
    touch(path.join(tmp, "src/desktop/widgets/sidebar/ui/Sidebar.tsx"));
    touch(path.join(tmp, "src/desktop/widgets/sidebar/model/store.ts"));
    touch(path.join(tmp, "src/desktop/features/login/ui/LoginForm.tsx"));

    const stack = { frontend: "react", language: "typescript" };
    const { frontendDomains } = await scanFrontendDomains(stack, tmp);
    const names = frontendDomains.map(d => d.name);
    assert.ok(names.includes("widgets/sidebar"), "fallback B should detect sidebar widget");
    assert.ok(names.includes("features/login"), "fallback B should detect login feature");
  });
});

// ─── Fallback C: deep components ────────────────────────────

describe("scanFrontendDomains — Fallback C (deep components)", () => {
  let tmp;
  beforeEach(() => { tmp = makeTmpDir(); });
  afterEach(() => cleanup(tmp));

  it("detects from deep **/components/*/ when A and B fail", async () => {
    // No app/, pages/, features/, widgets/ — only nested components
    touch(path.join(tmp, "src/desktop/app/components/order/OrderList.tsx"));
    touch(path.join(tmp, "src/desktop/app/components/order/OrderDetail.tsx"));
    touch(path.join(tmp, "src/desktop/app/components/product/ProductCard.tsx"));
    touch(path.join(tmp, "src/desktop/app/components/product/ProductGrid.tsx"));

    const stack = { frontend: "react", language: "typescript" };
    const { frontendDomains } = await scanFrontendDomains(stack, tmp);
    const names = frontendDomains.map(d => d.name);
    assert.ok(names.includes("order"), "fallback C should detect order");
    assert.ok(names.includes("product"), "fallback C should detect product");
  });

  it("skips template/error/header/footer in deep components", async () => {
    touch(path.join(tmp, "src/desktop/app/components/template/Base.tsx"));
    touch(path.join(tmp, "src/desktop/app/components/template/Wrapper.tsx"));
    touch(path.join(tmp, "src/desktop/app/components/error/ErrorBoundary.tsx"));
    touch(path.join(tmp, "src/desktop/app/components/error/ErrorPage.tsx"));

    const stack = { frontend: "react", language: "typescript" };
    const { frontendDomains } = await scanFrontendDomains(stack, tmp);
    const names = frontendDomains.map(d => d.name);
    assert.ok(!names.includes("template"));
    assert.ok(!names.includes("error"));
  });
});

// ─── Fallback D: views/screens/containers ───────────────────

describe("scanFrontendDomains — Fallback D (views/screens)", () => {
  let tmp;
  beforeEach(() => { tmp = makeTmpDir(); });
  afterEach(() => cleanup(tmp));

  it("detects from views/screens/containers/routes when A-C fail", async () => {
    // No app/, pages/, features/, components/ — only views/screens
    touch(path.join(tmp, "src/views/profile/ProfileView.tsx"));
    touch(path.join(tmp, "src/views/profile/ProfileEdit.tsx"));
    touch(path.join(tmp, "src/screens/home/HomeScreen.tsx"));
    touch(path.join(tmp, "src/screens/home/HomeWidget.tsx"));
    touch(path.join(tmp, "src/containers/checkout/CheckoutForm.tsx"));
    touch(path.join(tmp, "src/containers/checkout/CartSummary.tsx"));

    const stack = { frontend: "react", language: "typescript" };
    const { frontendDomains } = await scanFrontendDomains(stack, tmp);
    const names = frontendDomains.map(d => d.name);
    assert.ok(names.includes("profile"), "fallback D should detect profile from views/");
    assert.ok(names.includes("home"), "fallback D should detect home from screens/");
    assert.ok(names.includes("checkout"), "fallback D should detect checkout from containers/");
  });

  it("skips auth/layout/utils/hooks directories", async () => {
    touch(path.join(tmp, "src/views/auth/Login.tsx"));
    touch(path.join(tmp, "src/views/auth/Register.tsx"));
    touch(path.join(tmp, "src/views/layout/MainLayout.tsx"));
    touch(path.join(tmp, "src/views/layout/Sidebar.tsx"));

    const stack = { frontend: "react", language: "typescript" };
    const { frontendDomains } = await scanFrontendDomains(stack, tmp);
    const names = frontendDomains.map(d => d.name);
    assert.ok(!names.includes("auth"));
    assert.ok(!names.includes("layout"));
  });
});

// ─── countFrontendStats ─────────────────────────────────────

describe("countFrontendStats", () => {
  let tmp;
  beforeEach(() => { tmp = makeTmpDir(); });
  afterEach(() => cleanup(tmp));

  it("returns exists:false when no frontend", async () => {
    const stats = await countFrontendStats({ frontend: null }, tmp);
    assert.equal(stats.exists, false);
    assert.equal(stats.components, 0);
  });

  it("counts React components/pages/hooks", async () => {
    touch(path.join(tmp, "src/components/Button.tsx"));
    touch(path.join(tmp, "src/components/Card.tsx"));
    touch(path.join(tmp, "app/dashboard/page.tsx"));
    touch(path.join(tmp, "src/hooks/useAuth.ts"));

    const stats = await countFrontendStats({ frontend: "react" }, tmp);
    assert.equal(stats.exists, true);
    assert.equal(stats.components, 2);
    assert.equal(stats.pages, 1);
    assert.equal(stats.hooks, 1);
  });

  it("counts Angular components/modules/services", async () => {
    touch(path.join(tmp, "src/app/home/home.component.ts"));
    touch(path.join(tmp, "src/app/home/home.module.ts"));
    touch(path.join(tmp, "src/app/home/home.service.ts"));

    const stats = await countFrontendStats({ frontend: "angular" }, tmp);
    assert.equal(stats.exists, true);
    assert.equal(stats.components, 1);
    assert.equal(stats.pages, 1); // modules counted as pages for angular
    assert.equal(stats.hooks, 1); // services counted as hooks for angular
  });

  it("counts Next.js RSC/Client stats", async () => {
    touch(path.join(tmp, "app/shop/page.tsx"));
    touch(path.join(tmp, "app/shop/client.tsx"));
    touch(path.join(tmp, "app/shop/layout.tsx"));
    touch(path.join(tmp, "app/blog/page.tsx"));

    const stats = await countFrontendStats({ frontend: "nextjs" }, tmp);
    assert.equal(stats.clientComponents, 1);
    assert.equal(stats.serverPages, 2);
    assert.equal(stats.layouts, 1);
    assert.equal(stats.rscPattern, true);
  });
});

// ─── Vue support ────────────────────────────────────────────

describe("scanFrontendDomains — Vue", () => {
  let tmp;
  beforeEach(() => { tmp = makeTmpDir(); });
  afterEach(() => cleanup(tmp));

  it("detects .vue files in app router structure", async () => {
    touch(path.join(tmp, "src/pages/about/index.vue"));
    touch(path.join(tmp, "src/pages/about/AboutHero.vue"));

    const stack = { frontend: "vue", language: "typescript" };
    const { frontendDomains } = await scanFrontendDomains(stack, tmp);
    const names = frontendDomains.map(d => d.name);
    assert.ok(names.includes("about"));
  });
});

// ─── Non-standard nested paths (src/admin/pages/*, src/admin/components/*) ──

describe("scanFrontendDomains — non-standard nested paths", () => {
  let tmp;
  beforeEach(() => { tmp = makeTmpDir(); });
  afterEach(() => cleanup(tmp));

  it("detects pages under src/admin/pages/*/", async () => {
    touch(path.join(tmp, "src/admin/pages/dashboard/page.tsx"));
    touch(path.join(tmp, "src/admin/pages/dashboard/DashboardChart.tsx"));
    touch(path.join(tmp, "src/admin/pages/settings/page.tsx"));

    const stack = { frontend: "react", language: "typescript" };
    const { frontendDomains } = await scanFrontendDomains(stack, tmp);
    const names = frontendDomains.map(d => d.name);
    assert.ok(names.includes("dashboard"), "should detect dashboard from src/admin/pages/");
    assert.ok(names.includes("settings"), "should detect settings from src/admin/pages/");
  });

  it("detects components under src/admin/components/*/", async () => {
    touch(path.join(tmp, "src/admin/components/form/InputField.tsx"));
    touch(path.join(tmp, "src/admin/components/form/SelectField.tsx"));
    touch(path.join(tmp, "src/admin/components/table/DataTable.tsx"));
    touch(path.join(tmp, "src/admin/components/table/TableHeader.tsx"));

    const stack = { frontend: "react", language: "typescript" };
    const { frontendDomains } = await scanFrontendDomains(stack, tmp);
    const names = frontendDomains.map(d => d.name);
    assert.ok(names.includes("comp-form"), "should detect form from src/admin/components/");
    assert.ok(names.includes("comp-table"), "should detect table from src/admin/components/");
  });

  it("detects FSD features under src/admin/features/*/", async () => {
    touch(path.join(tmp, "src/admin/features/billing/ui/BillingCard.tsx"));
    touch(path.join(tmp, "src/admin/features/billing/model/store.ts"));

    const stack = { frontend: "react", language: "typescript" };
    const { frontendDomains } = await scanFrontendDomains(stack, tmp);
    const names = frontendDomains.map(d => d.name);
    assert.ok(names.includes("features/billing"), "should detect billing from src/admin/features/");
  });
});

describe("countFrontendStats — non-standard paths", () => {
  let tmp;
  beforeEach(() => { tmp = makeTmpDir(); });
  afterEach(() => cleanup(tmp));

  it("counts pages under src/admin/pages/", async () => {
    touch(path.join(tmp, "src/admin/pages/settings/index.tsx"));
    touch(path.join(tmp, "src/admin/pages/users/index.tsx"));

    const stats = await countFrontendStats({ frontend: "react" }, tmp);
    assert.ok(stats.pages >= 2, `should count nested pages, got ${stats.pages}`);
  });
});

// ─── No frontend ────────────────────────────────────────────

describe("scanFrontendDomains — no frontend", () => {
  let tmp;
  beforeEach(() => { tmp = makeTmpDir(); });
  afterEach(() => cleanup(tmp));

  it("returns empty when stack has no frontend", async () => {
    touch(path.join(tmp, "src/main/java/com/example/App.java"));

    const stack = { language: "java" };
    const { frontendDomains } = await scanFrontendDomains(stack, tmp);
    assert.equal(frontendDomains.length, 0);
  });
});
