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

  it("detects from containers/modules/domains when primary and A-C fail", async () => {
    // No app/, pages/, views/, screens/, features/, components/ — only containers
    touch(path.join(tmp, "src/containers/checkout/CheckoutForm.tsx"));
    touch(path.join(tmp, "src/containers/checkout/CartSummary.tsx"));
    touch(path.join(tmp, "src/containers/profile/ProfileCard.tsx"));
    touch(path.join(tmp, "src/containers/profile/ProfileEdit.tsx"));

    const stack = { frontend: "react", language: "typescript" };
    const { frontendDomains } = await scanFrontendDomains(stack, tmp);
    const names = frontendDomains.map(d => d.name);
    assert.ok(names.includes("checkout"), "fallback D should detect checkout from containers/");
    assert.ok(names.includes("profile"), "fallback D should detect profile from containers/");
  });

  it("skips layout/utils/hooks directories in fallback D", async () => {
    // Only containers (no views/screens that would be caught by primary)
    touch(path.join(tmp, "src/containers/layout/MainLayout.tsx"));
    touch(path.join(tmp, "src/containers/layout/Sidebar.tsx"));
    touch(path.join(tmp, "src/containers/utils/Helper.tsx"));
    touch(path.join(tmp, "src/containers/utils/Formatter.tsx"));

    const stack = { frontend: "react", language: "typescript" };
    const { frontendDomains } = await scanFrontendDomains(stack, tmp);
    const names = frontendDomains.map(d => d.name);
    assert.ok(!names.includes("layout"));
    assert.ok(!names.includes("utils"));
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

// ─── Vite SPA primary paths (src/views/*, src/screens/*, src/routes/*) ──

describe("scanFrontendDomains — Vite SPA primary paths", () => {
  let tmp;
  beforeEach(() => { tmp = makeTmpDir(); });
  afterEach(() => cleanup(tmp));

  it("detects domains from src/views/*/", async () => {
    touch(path.join(tmp, "src/views/Dashboard/DashboardView.tsx"));
    touch(path.join(tmp, "src/views/Dashboard/StatsCard.tsx"));
    touch(path.join(tmp, "src/views/Settings/SettingsView.tsx"));

    const stack = { frontend: "react", language: "typescript" };
    const { frontendDomains } = await scanFrontendDomains(stack, tmp);
    const names = frontendDomains.map(d => d.name);
    assert.ok(names.includes("Dashboard"), "should detect Dashboard from src/views/");
    assert.ok(names.includes("Settings"), "should detect Settings from src/views/");
  });

  it("detects domains from src/screens/*/", async () => {
    touch(path.join(tmp, "src/screens/Home/HomeScreen.tsx"));
    touch(path.join(tmp, "src/screens/Home/HeroBanner.tsx"));

    const stack = { frontend: "react", language: "typescript" };
    const { frontendDomains } = await scanFrontendDomains(stack, tmp);
    const names = frontendDomains.map(d => d.name);
    assert.ok(names.includes("Home"), "should detect Home from src/screens/");
  });

  it("detects domains from src/routes/*/", async () => {
    touch(path.join(tmp, "src/routes/auth/LoginPage.tsx"));
    touch(path.join(tmp, "src/routes/auth/RegisterPage.tsx"));

    const stack = { frontend: "react", language: "typescript" };
    const { frontendDomains } = await scanFrontendDomains(stack, tmp);
    const names = frontendDomains.map(d => d.name);
    assert.ok(names.includes("auth"), "should detect auth from src/routes/");
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

// ─── Platform-root pattern (Block A) ────────────────────────

describe("scanFrontendDomains — platform-root pattern", () => {
  let tmp;
  beforeEach(() => { tmp = makeTmpDir(); });
  afterEach(() => cleanup(tmp));

  it("detects src/{platform}/{subapp}/ as `{platform}-{subapp}` domain", async () => {
    touch(path.join(tmp, "src/desktop/shop/routes/Home.tsx"));
    touch(path.join(tmp, "src/desktop/shop/routes/Cart.tsx"));
    touch(path.join(tmp, "src/desktop/shop/components/Header.tsx"));
    touch(path.join(tmp, "src/desktop/shop/layouts/Main.tsx"));
    touch(path.join(tmp, "src/desktop/shop/hooks/useSession.ts"));
    touch(path.join(tmp, "src/desktop/shop/App.tsx"));

    const { frontendDomains } = await scanFrontendDomains({ frontend: "react" }, tmp);
    const d = frontendDomains.find(x => x.name === "desktop-shop");
    assert.ok(d, `expected domain 'desktop-shop', got: ${frontendDomains.map(x => x.name).join(", ")}`);
    assert.equal(d.platform, "desktop");
    assert.equal(d.subapp, "shop");
    assert.equal(d.routes, 2);
    assert.equal(d.components, 1);
    assert.equal(d.layouts, 1);
    assert.equal(d.hooks, 1);
    assert.equal(d.totalFiles, 6);
  });

  it("handles multiple platforms sharing the same subapp name", async () => {
    touch(path.join(tmp, "src/desktop/store/routes/Main.tsx"));
    touch(path.join(tmp, "src/desktop/store/routes/Product.tsx"));
    touch(path.join(tmp, "src/mobile/store/routes/Main.tsx"));
    touch(path.join(tmp, "src/mobile/store/routes/Product.tsx"));

    const { frontendDomains } = await scanFrontendDomains({ frontend: "react" }, tmp);
    const names = frontendDomains.map(d => d.name);
    assert.ok(names.includes("desktop-store"), `missing desktop-store in: ${names.join(", ")}`);
    assert.ok(names.includes("mobile-store"), `missing mobile-store in: ${names.join(", ")}`);
  });

  it("detects 2-letter platform abbreviations (pc, mc, sp)", async () => {
    touch(path.join(tmp, "src/pc/admin/routes/Users.tsx"));
    touch(path.join(tmp, "src/pc/admin/routes/Roles.tsx"));
    touch(path.join(tmp, "src/mc/admin/routes/Users.tsx"));
    touch(path.join(tmp, "src/mc/admin/routes/Roles.tsx"));
    touch(path.join(tmp, "src/sp/console/routes/Dashboard.tsx"));
    touch(path.join(tmp, "src/sp/console/routes/Metrics.tsx"));

    const { frontendDomains } = await scanFrontendDomains({ frontend: "react" }, tmp);
    const names = frontendDomains.map(d => d.name);
    assert.ok(names.includes("pc-admin"), `missing pc-admin in: ${names.join(", ")}`);
    assert.ok(names.includes("mc-admin"), `missing mc-admin in: ${names.join(", ")}`);
    assert.ok(names.includes("sp-console"), `missing sp-console in: ${names.join(", ")}`);
  });

  it("skips generic infrastructure subapp names (assets, common, shared, utils)", async () => {
    touch(path.join(tmp, "src/desktop/assets/icon.tsx"));
    touch(path.join(tmp, "src/desktop/common/helper.tsx"));
    touch(path.join(tmp, "src/desktop/shared/types.ts"));
    touch(path.join(tmp, "src/desktop/utils/format.ts"));
    touch(path.join(tmp, "src/desktop/lib/x.ts"));

    const { frontendDomains } = await scanFrontendDomains({ frontend: "react" }, tmp);
    const names = frontendDomains.map(d => d.name);
    for (const skipped of ["desktop-assets", "desktop-common", "desktop-shared", "desktop-utils", "desktop-lib"]) {
      assert.ok(!names.includes(skipped), `should not emit ${skipped}, got: ${names.join(", ")}`);
    }
  });

  it("allows `store` as subapp name (e-commerce projects)", async () => {
    // `store` is NOT a structural/framework name, so it's a legitimate
    // subapp name for e-commerce projects.
    touch(path.join(tmp, "src/desktop/store/routes/Cart.tsx"));
    touch(path.join(tmp, "src/desktop/store/routes/Checkout.tsx"));

    const { frontendDomains } = await scanFrontendDomains({ frontend: "react" }, tmp);
    const names = frontendDomains.map(d => d.name);
    assert.ok(names.includes("desktop-store"), `desktop-store should be emitted, got: ${names.join(", ")}`);
  });

  it("detects access-tier platforms (admin, cms) with their subapps", async () => {
    touch(path.join(tmp, "src/admin/console/routes/Users.tsx"));
    touch(path.join(tmp, "src/admin/console/components/Nav.tsx"));
    touch(path.join(tmp, "src/cms/editor/routes/Page.tsx"));
    touch(path.join(tmp, "src/cms/editor/routes/Media.tsx"));

    const { frontendDomains } = await scanFrontendDomains({ frontend: "react" }, tmp);
    const names = frontendDomains.map(d => d.name);
    assert.ok(names.includes("admin-console"), `admin-console should be emitted, got: ${names.join(", ")}`);
    assert.ok(names.includes("cms-editor"), `cms-editor should be emitted, got: ${names.join(", ")}`);
  });

  it("`adm` is NOT a platform keyword (too ambiguous in isolation)", async () => {
    touch(path.join(tmp, "src/adm/dashboard/routes/Home.tsx"));
    touch(path.join(tmp, "src/adm/dashboard/routes/Settings.tsx"));

    const { frontendDomains } = await scanFrontendDomains({ frontend: "react" }, tmp);
    const names = frontendDomains.map(d => d.name);
    assert.ok(!names.includes("adm-dashboard"), `adm should not produce platform domain, got: ${names.join(", ")}`);
  });

  it("single-file subapp is skipped (noise floor)", async () => {
    // A single .tsx file inside a platform/subapp is almost always accidental.
    touch(path.join(tmp, "src/desktop/loner/solo.tsx"));
    // Meanwhile, a 2-file sibling is kept.
    touch(path.join(tmp, "src/desktop/real/routes/A.tsx"));
    touch(path.join(tmp, "src/desktop/real/routes/B.tsx"));

    const { frontendDomains } = await scanFrontendDomains({ frontend: "react" }, tmp);
    const names = frontendDomains.map(d => d.name);
    assert.ok(!names.includes("desktop-loner"), `1-file subapp should be suppressed, got: ${names.join(", ")}`);
    assert.ok(names.includes("desktop-real"), `2+ files should pass threshold, got: ${names.join(", ")}`);
  });

  it("platform scan coexists with components/* scan", async () => {
    touch(path.join(tmp, "src/desktop/shop/routes/Home.tsx"));
    touch(path.join(tmp, "src/desktop/shop/routes/Cart.tsx"));
    // components scan requires >= 2 .tsx/.jsx/.vue files per dir.
    touch(path.join(tmp, "src/components/my-button/MyButton.tsx"));
    touch(path.join(tmp, "src/components/my-button/MyButtonIcon.tsx"));
    touch(path.join(tmp, "src/components/my-modal/MyModal.tsx"));
    touch(path.join(tmp, "src/components/my-modal/MyModalBody.tsx"));

    const { frontendDomains } = await scanFrontendDomains({ frontend: "react" }, tmp);
    const names = frontendDomains.map(d => d.name);
    assert.ok(names.includes("desktop-shop"), `missing desktop-shop in: ${names.join(", ")}`);
    assert.ok(names.includes("comp-my-button"), `missing comp-my-button in: ${names.join(", ")}`);
    assert.ok(names.includes("comp-my-modal"), `missing comp-my-modal in: ${names.join(", ")}`);
  });

  it("unknown platform keyword does not match", async () => {
    touch(path.join(tmp, "src/backend/foo/routes/x.tsx"));
    touch(path.join(tmp, "src/backend/foo/routes/y.tsx"));
    touch(path.join(tmp, "src/server/bar/routes/y.tsx"));
    touch(path.join(tmp, "src/server/bar/routes/z.tsx"));

    const { frontendDomains } = await scanFrontendDomains({ frontend: "react" }, tmp);
    const names = frontendDomains.map(d => d.name);
    assert.ok(!names.includes("backend-foo"), `unexpected backend-foo in: ${names.join(", ")}`);
    assert.ok(!names.includes("server-bar"), `unexpected server-bar in: ${names.join(", ")}`);
  });

  it("also runs for Angular projects", async () => {
    // Angular uses .ts/.component.ts — platform scan globs {tsx,jsx,ts,js,vue}
    // so Angular files are captured by this shared (framework-agnostic) scanner.
    touch(path.join(tmp, "src/desktop/shop/routes/home.component.ts"));
    touch(path.join(tmp, "src/desktop/shop/routes/cart.component.ts"));
    touch(path.join(tmp, "src/desktop/shop/components/header.component.ts"));

    const { frontendDomains } = await scanFrontendDomains({ frontend: "angular" }, tmp);
    const d = frontendDomains.find(x => x.name === "desktop-shop");
    assert.ok(d, `angular platform scan should emit desktop-shop, got: ${frontendDomains.map(x => x.name).join(", ")}`);
    assert.equal(d.routes, 2);
    assert.equal(d.components, 1);
  });

  it("detects platform split in monorepo workspace (apps/<workspace>/src/<platform>/<subapp>/)", async () => {
    // Typical Turborepo/pnpm workspace structure
    touch(path.join(tmp, "apps/web-app/src/desktop/shop/routes/Home.tsx"));
    touch(path.join(tmp, "apps/web-app/src/desktop/shop/routes/Cart.tsx"));
    touch(path.join(tmp, "apps/web-app/src/mobile/shop/routes/Home.tsx"));
    touch(path.join(tmp, "apps/web-app/src/mobile/shop/routes/Cart.tsx"));

    const { frontendDomains } = await scanFrontendDomains({ frontend: "react" }, tmp);
    const names = frontendDomains.map(d => d.name);
    assert.ok(names.includes("desktop-shop"), `monorepo desktop-shop should be emitted, got: ${names.join(", ")}`);
    assert.ok(names.includes("mobile-shop"), `monorepo mobile-shop should be emitted, got: ${names.join(", ")}`);
  });

  it("detects monorepo layout without src/ wrapper (packages/<platform>/<subapp>/)", async () => {
    // Some monorepos put platform at the workspace level directly under packages/
    touch(path.join(tmp, "packages/desktop/admin/routes/Dashboard.tsx"));
    touch(path.join(tmp, "packages/desktop/admin/routes/Users.tsx"));

    const { frontendDomains } = await scanFrontendDomains({ frontend: "react" }, tmp);
    const names = frontendDomains.map(d => d.name);
    assert.ok(names.includes("desktop-admin"), `packages/<platform>/<subapp>/ should be detected, got: ${names.join(", ")}`);
  });

  it("realistic Angular layout: platform-split module with services/modules/pipes", async () => {
    // Mimics a real Angular CLI project: angular.json + tsconfig + app modules
    // under a platform root, with typical Angular file conventions.
    touch(path.join(tmp, "angular.json"));
    touch(path.join(tmp, "tsconfig.json"));
    touch(path.join(tmp, "src/desktop/console/console.module.ts"));
    touch(path.join(tmp, "src/desktop/console/console-routing.module.ts"));
    touch(path.join(tmp, "src/desktop/console/routes/dashboard.component.ts"));
    touch(path.join(tmp, "src/desktop/console/routes/dashboard.component.html"));
    touch(path.join(tmp, "src/desktop/console/routes/users.component.ts"));
    touch(path.join(tmp, "src/desktop/console/components/nav.component.ts"));
    touch(path.join(tmp, "src/desktop/console/services/auth.service.ts"));
    touch(path.join(tmp, "src/desktop/console/services/api.service.ts"));
    touch(path.join(tmp, "src/desktop/console/guards/auth.guard.ts"));
    touch(path.join(tmp, "src/desktop/console/pipes/format.pipe.ts"));
    // test files should be excluded by TEST_FILE_IGNORE
    touch(path.join(tmp, "src/desktop/console/routes/dashboard.component.spec.ts"));
    touch(path.join(tmp, "src/desktop/console/services/auth.service.spec.ts"));

    const { frontendDomains } = await scanFrontendDomains({ frontend: "angular" }, tmp);
    const d = frontendDomains.find(x => x.name === "desktop-console");
    assert.ok(d, `realistic Angular layout should emit desktop-console, got: ${frontendDomains.map(x => x.name).join(", ")}`);
    assert.equal(d.routes, 2, "routes should count 2 (excluding .spec.ts)");
    assert.equal(d.components, 1, "components should count nav.component.ts");
    // totalFiles excludes .html (not in {tsx,jsx,ts,js,vue}) AND excludes .spec.ts
    // So we count: console.module.ts + console-routing.module.ts + dashboard.ts +
    // users.ts + nav.ts + auth.service.ts + api.service.ts + auth.guard.ts + format.pipe.ts = 9
    assert.equal(d.totalFiles, 9, `totalFiles should be 9, got ${d.totalFiles}`);
  });

  it("also runs for Vue/Nuxt projects", async () => {
    touch(path.join(tmp, "src/mobile/shop/routes/Home.vue"));
    touch(path.join(tmp, "src/mobile/shop/routes/Cart.vue"));

    const { frontendDomains } = await scanFrontendDomains({ frontend: "vue" }, tmp);
    const d = frontendDomains.find(x => x.name === "mobile-shop");
    assert.ok(d, `vue platform scan should emit mobile-shop, got: ${frontendDomains.map(x => x.name).join(", ")}`);
    assert.equal(d.routes, 2);
  });

  it("ignores build output / cache dirs (.next, .turbo, coverage, storybook-static, etc.)", async () => {
    // Real source under platform root
    touch(path.join(tmp, "src/desktop/shop/routes/Home.tsx"));
    touch(path.join(tmp, "src/desktop/shop/routes/Cart.tsx"));
    // Various build/cache dirs that must be excluded
    touch(path.join(tmp, "src/desktop/shop/.next/build/chunk.js"));
    touch(path.join(tmp, "src/desktop/shop/.nuxt/dist/client.js"));
    touch(path.join(tmp, "src/desktop/shop/.angular/cache/compiled.ts"));
    touch(path.join(tmp, "src/desktop/shop/.turbo/node-modules/leftover.ts"));
    touch(path.join(tmp, "src/desktop/shop/coverage/lcov-report/prettify.js"));
    touch(path.join(tmp, "src/desktop/shop/storybook-static/assets/iframe.js"));
    touch(path.join(tmp, "src/desktop/shop/out/static/chunk.js"));
    touch(path.join(tmp, "src/desktop/shop/.vercel/output/server.js"));
    touch(path.join(tmp, "src/desktop/shop/.cache/parcel/bundle.js"));

    const { frontendDomains } = await scanFrontendDomains({ frontend: "react" }, tmp);
    const d = frontendDomains.find(x => x.name === "desktop-shop");
    assert.ok(d, `desktop-shop should still be detected, got: ${frontendDomains.map(x => x.name).join(", ")}`);
    assert.equal(d.totalFiles, 2, `build/cache files must not inflate count, got ${d.totalFiles}`);
  });

  it("ignores test file variants (spec/test/stories/e2e/cy/snapshots)", async () => {
    touch(path.join(tmp, "src/desktop/shop/routes/Home.tsx"));
    touch(path.join(tmp, "src/desktop/shop/routes/Cart.tsx"));
    // Various test file variants that must be excluded
    touch(path.join(tmp, "src/desktop/shop/routes/Home.spec.tsx"));
    touch(path.join(tmp, "src/desktop/shop/routes/Home.test.tsx"));
    touch(path.join(tmp, "src/desktop/shop/routes/Home.stories.tsx"));
    touch(path.join(tmp, "src/desktop/shop/routes/Home.e2e.ts"));
    touch(path.join(tmp, "src/desktop/shop/routes/Home.cy.ts"));
    touch(path.join(tmp, "src/desktop/shop/__snapshots__/Home.tsx.snap.ts"));
    touch(path.join(tmp, "src/desktop/shop/__tests__/Home.helper.ts"));

    const { frontendDomains } = await scanFrontendDomains({ frontend: "react" }, tmp);
    const d = frontendDomains.find(x => x.name === "desktop-shop");
    assert.ok(d, `desktop-shop should still be detected, got: ${frontendDomains.map(x => x.name).join(", ")}`);
    assert.equal(d.totalFiles, 2, `test files must not inflate count, got ${d.totalFiles}`);
  });

  it("primary + platform scan do NOT double-count the same dir", async () => {
    // Create a structure where both the components/* scan AND the platform
    // scan could theoretically fire. The SKIP list (containing "components"
    // at the subapp level) prevents duplication: the components scan emits
    // `comp-{name}`, and the platform scan sees `subapp=components` → skip.
    touch(path.join(tmp, "src/desktop/components/my-widget/A.tsx"));
    touch(path.join(tmp, "src/desktop/components/my-widget/B.tsx"));
    // Also a real platform/subapp pair that should emit cleanly
    touch(path.join(tmp, "src/desktop/shop/routes/Home.tsx"));
    touch(path.join(tmp, "src/desktop/shop/routes/Cart.tsx"));

    const { frontendDomains } = await scanFrontendDomains({ frontend: "react" }, tmp);
    const names = frontendDomains.map(d => d.name);
    // components scan: emits comp-my-widget (via src/*/components/*)
    assert.ok(names.includes("comp-my-widget"), `missing comp-my-widget in: ${names.join(", ")}`);
    // platform scan: must NOT also emit `desktop-components` for the same files
    assert.ok(!names.includes("desktop-components"), `should not double-emit components as desktop-components, got: ${names.join(", ")}`);
    // platform scan for the real subapp
    assert.ok(names.includes("desktop-shop"), `missing desktop-shop in: ${names.join(", ")}`);
  });

  it("`.claudeos-scan.json` adds custom platform keywords", async () => {
    fs.writeFileSync(path.join(tmp, ".claudeos-scan.json"), JSON.stringify({
      frontendScan: { platformKeywords: ["kiosk"] },
    }));
    touch(path.join(tmp, "src/kiosk/register/routes/Checkout.tsx"));
    touch(path.join(tmp, "src/kiosk/register/routes/Payment.tsx"));

    const { frontendDomains } = await scanFrontendDomains({ frontend: "react" }, tmp);
    const names = frontendDomains.map(d => d.name);
    assert.ok(names.includes("kiosk-register"), `custom platform kiosk should be honored, got: ${names.join(", ")}`);
  });

  it("`.claudeos-scan.json` adds custom skip subapp names", async () => {
    fs.writeFileSync(path.join(tmp, ".claudeos-scan.json"), JSON.stringify({
      frontendScan: { skipSubappNames: ["legacy"] },
    }));
    touch(path.join(tmp, "src/desktop/legacy/routes/OldPage.tsx"));
    touch(path.join(tmp, "src/desktop/legacy/routes/OldList.tsx"));
    touch(path.join(tmp, "src/desktop/modern/routes/NewPage.tsx"));
    touch(path.join(tmp, "src/desktop/modern/routes/NewList.tsx"));

    const { frontendDomains } = await scanFrontendDomains({ frontend: "react" }, tmp);
    const names = frontendDomains.map(d => d.name);
    assert.ok(!names.includes("desktop-legacy"), `legacy should be skipped via override, got: ${names.join(", ")}`);
    assert.ok(names.includes("desktop-modern"), `modern subapp should still emit`);
  });

  it("`.claudeos-scan.json` overrides minSubappFiles threshold", async () => {
    fs.writeFileSync(path.join(tmp, ".claudeos-scan.json"), JSON.stringify({
      frontendScan: { minSubappFiles: 3 },
    }));
    touch(path.join(tmp, "src/desktop/small/routes/A.tsx"));
    touch(path.join(tmp, "src/desktop/small/routes/B.tsx"));
    touch(path.join(tmp, "src/desktop/large/routes/A.tsx"));
    touch(path.join(tmp, "src/desktop/large/routes/B.tsx"));
    touch(path.join(tmp, "src/desktop/large/routes/C.tsx"));

    const { frontendDomains } = await scanFrontendDomains({ frontend: "react" }, tmp);
    const names = frontendDomains.map(d => d.name);
    assert.ok(!names.includes("desktop-small"), `2-file subapp should be below threshold=3, got: ${names.join(", ")}`);
    assert.ok(names.includes("desktop-large"), `3-file subapp should pass threshold=3`);
  });

  it("malformed `.claudeos-scan.json` falls back to defaults", async () => {
    fs.writeFileSync(path.join(tmp, ".claudeos-scan.json"), "{ not valid json");
    touch(path.join(tmp, "src/desktop/shop/routes/Home.tsx"));
    touch(path.join(tmp, "src/desktop/shop/routes/Cart.tsx"));

    const { frontendDomains } = await scanFrontendDomains({ frontend: "react" }, tmp);
    const names = frontendDomains.map(d => d.name);
    assert.ok(names.includes("desktop-shop"), `defaults should apply on malformed config, got: ${names.join(", ")}`);
  });

  it("detects deeply nested files under a platform subapp (Windows path regression)", async () => {
    // Regression: glob returns backslash paths without trailing slash on
    // Windows; the pattern `${dir}**/*.tsx` only matched 1 level deep
    // (foo/X.tsx) but not nested paths (foo/routes/X.tsx). dirGlobPrefix
    // now ensures `${dir}/**/*.tsx` is used, matching any depth.
    touch(path.join(tmp, "src/desktop/shop/App.tsx"));
    touch(path.join(tmp, "src/desktop/shop/index.tsx"));
    touch(path.join(tmp, "src/desktop/shop/routes/Home.tsx"));
    touch(path.join(tmp, "src/desktop/shop/routes/nested/Deep.tsx"));
    touch(path.join(tmp, "src/desktop/shop/components/ui/Button.tsx"));
    touch(path.join(tmp, "src/desktop/shop/components/form/Field.tsx"));

    const { frontendDomains } = await scanFrontendDomains({ frontend: "react" }, tmp);
    const d = frontendDomains.find(x => x.name === "desktop-shop");
    assert.ok(d, `desktop-shop should be detected with nested files`);
    assert.equal(d.totalFiles, 6, `all nested files should be counted, got ${d.totalFiles}`);
  });

  it("empty subapp dir (no source files) produces no domain", async () => {
    fs.mkdirSync(path.join(tmp, "src/desktop/empty-app"), { recursive: true });
    touch(path.join(tmp, "src/desktop/real-app/routes/Home.tsx"));
    touch(path.join(tmp, "src/desktop/real-app/routes/Cart.tsx"));

    const { frontendDomains } = await scanFrontendDomains({ frontend: "react" }, tmp);
    const names = frontendDomains.map(d => d.name);
    assert.ok(!names.includes("desktop-empty-app"), `empty app should not produce domain`);
    assert.ok(names.includes("desktop-real-app"), `real-app should produce domain`);
  });
});

// ─── Deep routes-file fallback (Block B / Fallback E) ───────

describe("scanFrontendDomains — Fallback E (deep routes file)", () => {
  let tmp;
  beforeEach(() => { tmp = makeTmpDir(); });
  afterEach(() => cleanup(tmp));

  it("extracts domain from routes parent dir when primary returns 0", async () => {
    touch(path.join(tmp, "packages/main-app/routes/Login.tsx"));
    touch(path.join(tmp, "packages/main-app/routes/Home.tsx"));

    const { frontendDomains } = await scanFrontendDomains({ frontend: "react" }, tmp);
    const d = frontendDomains.find(x => x.name === "main-app");
    assert.ok(d, `expected 'main-app', got: ${frontendDomains.map(x => x.name).join(", ")}`);
    assert.equal(d.routes, 2);
    assert.equal(d.totalFiles, 2);
  });

  it("skips generic parent names (src, app, pages)", async () => {
    touch(path.join(tmp, "deeply/nested/src/routes/Home.tsx"));
    touch(path.join(tmp, "deeply/nested/app/routes/Home.tsx"));
    touch(path.join(tmp, "deeply/nested/pages/routes/Home.tsx"));

    const { frontendDomains } = await scanFrontendDomains({ frontend: "react" }, tmp);
    const names = frontendDomains.map(d => d.name);
    assert.ok(!names.includes("src"), `should not emit 'src' domain in: ${names.join(", ")}`);
    assert.ok(!names.includes("app"), `should not emit 'app' domain in: ${names.join(", ")}`);
    assert.ok(!names.includes("pages"), `should not emit 'pages' domain in: ${names.join(", ")}`);
  });

  it("does NOT fire when primary returns domains", async () => {
    // components/* scan returns 1 domain → fallback chain should not run
    touch(path.join(tmp, "src/components/my-widget/A.tsx"));
    touch(path.join(tmp, "src/components/my-widget/B.tsx"));
    // also add a routes/ structure that would match fallback E
    touch(path.join(tmp, "other-app/routes/X.tsx"));
    touch(path.join(tmp, "other-app/routes/Y.tsx"));

    const { frontendDomains } = await scanFrontendDomains({ frontend: "react" }, tmp);
    const names = frontendDomains.map(d => d.name);
    assert.ok(names.includes("comp-my-widget"), `should include comp-my-widget`);
    assert.ok(!names.includes("other-app"), `fallback E should not fire when primary populated: got ${names.join(", ")}`);
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
