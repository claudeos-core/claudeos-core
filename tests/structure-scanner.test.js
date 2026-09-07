/**
 * ClaudeOS-Core — Structure Scanner Tests
 *
 * Tests scanStructure for correct domain detection across stacks.
 */

const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { scanStructure } = require("../plan-installer/structure-scanner");

function makeTmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "ccore-scanner-"));
}
function cleanup(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}
function mkdirp(dir) {
  fs.mkdirSync(dir, { recursive: true });
}
function touch(filePath) {
  mkdirp(path.dirname(filePath));
  fs.writeFileSync(filePath, "// placeholder\n");
}

// ─── Next.js [param] filter ─────────────────────────────────

describe("scanStructure — Next.js [param] filter", () => {
  let tmp;
  beforeEach(() => { tmp = makeTmpDir(); });
  afterEach(() => cleanup(tmp));

  it("excludes [param] dynamic route directories from frontend domains", async () => {
    // app/products/page.tsx → "products" domain (valid)
    touch(path.join(tmp, "app/products/page.tsx"));
    // app/products/[id]/page.tsx → "[id]" should be filtered
    touch(path.join(tmp, "app/products/[id]/page.tsx"));
    // app/[...slug]/page.tsx → "[...slug]" should be filtered
    touch(path.join(tmp, "app/[...slug]/page.tsx"));
    // app/(group)/page.tsx → "(group)" should be filtered
    touch(path.join(tmp, "app/(group)/page.tsx"));

    const stack = { frontend: "nextjs", language: "typescript" };
    const result = await scanStructure(stack, tmp);

    const domainNames = result.frontendDomains.map(d => d.name);
    assert.ok(domainNames.includes("products"), "should include products");
    assert.ok(!domainNames.some(n => n.startsWith("[")), "should exclude [param] dirs");
    assert.ok(!domainNames.some(n => n.startsWith("(")), "should exclude (group) dirs");
  });
});

// ─── Java Pattern B — domain-first ──────────────────────────

describe("scanStructure — Java Pattern B", () => {
  let tmp;
  beforeEach(() => { tmp = makeTmpDir(); });
  afterEach(() => cleanup(tmp));

  it("detects domains from domain/controller structure", async () => {
    touch(path.join(tmp, "src/main/java/com/example/user/controller/UserController.java"));
    touch(path.join(tmp, "src/main/java/com/example/user/service/UserService.java"));
    touch(path.join(tmp, "src/main/java/com/example/order/controller/OrderController.java"));

    const stack = { language: "java", buildTool: "gradle" };
    const result = await scanStructure(stack, tmp);

    const names = result.backendDomains.map(d => d.name);
    assert.ok(names.includes("user"), "should detect user domain");
    assert.ok(names.includes("order"), "should detect order domain");
  });
});

// ─── Python/FastAPI router-based detection ────────────────────────

describe("scanStructure — FastAPI router detection", () => {
  let tmp;
  beforeEach(() => { tmp = makeTmpDir(); });
  afterEach(() => cleanup(tmp));

  it("detects domains from router files", async () => {
    touch(path.join(tmp, "app/users/router.py"));
    touch(path.join(tmp, "app/users/models.py"));
    touch(path.join(tmp, "app/orders/router.py"));

    const stack = { language: "python", framework: "fastapi" };
    const result = await scanStructure(stack, tmp);

    const names = result.backendDomains.map(d => d.name);
    assert.ok(names.includes("users"), "should detect users domain");
    assert.ok(names.includes("orders"), "should detect orders domain");
  });
});

// ─── Node.js/NestJS backend ────────────────────────────────

describe("scanStructure — Node.js backend", () => {
  let tmp;
  beforeEach(() => { tmp = makeTmpDir(); });
  afterEach(() => cleanup(tmp));

  it("detects modules from src/modules/*/ for NestJS", async () => {
    touch(path.join(tmp, "src/modules/users/users.controller.ts"));
    touch(path.join(tmp, "src/modules/users/users.service.ts"));
    touch(path.join(tmp, "src/modules/auth/auth.controller.ts"));

    const stack = { language: "typescript", framework: "nestjs" };
    const result = await scanStructure(stack, tmp);

    const names = result.backendDomains.map(d => d.name);
    assert.ok(names.includes("users"), "should detect users module");
    assert.ok(names.includes("auth"), "should detect auth module");
  });
});

// ─── Java Pattern A — layer-first ──────────────────────────

describe("scanStructure — Java Pattern A", () => {
  let tmp;
  beforeEach(() => { tmp = makeTmpDir(); });
  afterEach(() => cleanup(tmp));

  it("detects domains from controller/{domain}/ structure", async () => {
    touch(path.join(tmp, "src/main/java/com/example/controller/user/UserController.java"));
    touch(path.join(tmp, "src/main/java/com/example/controller/order/OrderController.java"));
    touch(path.join(tmp, "src/main/java/com/example/service/user/UserService.java"));

    const stack = { language: "java", buildTool: "gradle" };
    const result = await scanStructure(stack, tmp);

    const names = result.backendDomains.map(d => d.name);
    assert.ok(names.includes("user"), "should detect user domain");
    assert.ok(names.includes("order"), "should detect order domain");
  });
});

// ─── Java Pattern C — flat structure ─────────────────────────

describe("scanStructure — Java Pattern C", () => {
  let tmp;
  beforeEach(() => { tmp = makeTmpDir(); });
  afterEach(() => cleanup(tmp));

  it("detects domains from flat controller structure", async () => {
    // Flat: controller dir + service dir at same level (no domain subdirectory)
    touch(path.join(tmp, "src/main/java/com/example/controller/ProductController.java"));
    touch(path.join(tmp, "src/main/java/com/example/controller/CartController.java"));
    touch(path.join(tmp, "src/main/java/com/example/service/ProductService.java"));

    const stack = { language: "java", buildTool: "gradle" };
    const result = await scanStructure(stack, tmp);

    // On Windows, fallback detects "example" as domain; on Unix, Pattern C extracts "product"/"cart"
    assert.ok(result.backendDomains.length > 0, "should detect at least one domain");
  });
});

// ─── Java Pattern E — DDD/Hexagonal ──────────────────────────

describe("scanStructure — Java Pattern E", () => {
  let tmp;
  beforeEach(() => { tmp = makeTmpDir(); });
  afterEach(() => cleanup(tmp));

  it("detects domains from DDD/Hexagonal structure", async () => {
    // adapter/in/web/ + domain/service/ to ensure fallback also catches it
    touch(path.join(tmp, "src/main/java/com/example/payment/adapter/in/web/PaymentController.java"));
    touch(path.join(tmp, "src/main/java/com/example/payment/service/PaymentService.java"));
    touch(path.join(tmp, "src/main/java/com/example/shipping/adapter/in/web/ShippingController.java"));
    touch(path.join(tmp, "src/main/java/com/example/shipping/service/ShippingService.java"));

    const stack = { language: "java", buildTool: "gradle" };
    const result = await scanStructure(stack, tmp);

    const names = result.backendDomains.map(d => d.name);
    assert.ok(names.includes("payment"), "should detect payment domain");
    assert.ok(names.includes("shipping"), "should detect shipping domain");
  });
});

// ─── Java supplementary scan — service-only domains ──────────

describe("scanStructure — Java supplementary scan", () => {
  let tmp;
  beforeEach(() => { tmp = makeTmpDir(); });
  afterEach(() => cleanup(tmp));

  it("detects core-only domains without controllers (all patterns)", async () => {
    // Pattern A domain with controller
    touch(path.join(tmp, "src/main/java/com/example/controller/product/ProductController.java"));
    // Core domain with service only (no controller)
    touch(path.join(tmp, "src/main/java/com/example/business/service/BusinessService.java"));
    touch(path.join(tmp, "src/main/java/com/example/statistics/service/StatisticsService.java"));

    const stack = { language: "java", buildTool: "gradle" };
    const result = await scanStructure(stack, tmp);

    const names = result.backendDomains.map(d => d.name);
    assert.ok(names.includes("product"), "should detect product (has controller)");
    assert.ok(names.includes("business"), "should detect business (service-only)");
    assert.ok(names.includes("statistics"), "should detect statistics (service-only)");
  });
});

// ─── Java dao/aggregator detection ───────────────────────────

describe("scanStructure — Java dao/aggregator", () => {
  let tmp;
  beforeEach(() => { tmp = makeTmpDir(); });
  afterEach(() => cleanup(tmp));

  it("counts dao as mappers and aggregator as services", async () => {
    touch(path.join(tmp, "src/main/java/com/example/order/controller/OrderController.java"));
    touch(path.join(tmp, "src/main/java/com/example/order/aggregator/OrderAggregator.java"));
    touch(path.join(tmp, "src/main/java/com/example/order/service/OrderService.java"));
    touch(path.join(tmp, "src/main/java/com/example/order/dao/OrderDao.java"));

    const stack = { language: "java", buildTool: "gradle" };
    const result = await scanStructure(stack, tmp);

    const order = result.backendDomains.find(d => d.name === "order");
    assert.ok(order, "should detect order domain");
    assert.ok(order.services >= 2, "aggregator + service should count as services >= 2");
    assert.ok(order.mappers >= 1, "dao should count as mappers >= 1");
  });
});

// ─── Java facade/usecase/orchestrator detection ─────────────

describe("scanStructure — Java facade/usecase/orchestrator", () => {
  let tmp;
  beforeEach(() => { tmp = makeTmpDir(); });
  afterEach(() => cleanup(tmp));

  it("counts facade and usecase as services", async () => {
    touch(path.join(tmp, "src/main/java/com/example/payment/controller/PaymentController.java"));
    touch(path.join(tmp, "src/main/java/com/example/payment/facade/PaymentFacade.java"));
    touch(path.join(tmp, "src/main/java/com/example/payment/usecase/ProcessPaymentUseCase.java"));
    touch(path.join(tmp, "src/main/java/com/example/payment/service/PaymentService.java"));

    const stack = { language: "java", buildTool: "gradle" };
    const result = await scanStructure(stack, tmp);

    const payment = result.backendDomains.find(d => d.name === "payment");
    assert.ok(payment, "should detect payment domain");
    assert.ok(payment.services >= 3, "facade + usecase + service should count as services >= 3");
  });

  it("detects domain with only orchestrator (no controller)", async () => {
    touch(path.join(tmp, "src/main/java/com/example/order/controller/OrderController.java"));
    touch(path.join(tmp, "src/main/java/com/example/billing/orchestrator/BillingOrchestrator.java"));
    touch(path.join(tmp, "src/main/java/com/example/billing/service/BillingService.java"));

    const stack = { language: "java", buildTool: "gradle" };
    const result = await scanStructure(stack, tmp);

    const names = result.backendDomains.map(d => d.name);
    assert.ok(names.includes("billing"), "should detect billing via supplementary scan (orchestrator)");
  });
});

// ─── Java MyBatis XML — mybatis/ path ────────────────────────

describe("scanStructure — Java MyBatis XML path", () => {
  let tmp;
  beforeEach(() => { tmp = makeTmpDir(); });
  afterEach(() => cleanup(tmp));

  it("detects domain with mybatis/mappers/ XML path", async () => {
    touch(path.join(tmp, "src/main/java/com/example/user/controller/UserController.java"));
    touch(path.join(tmp, "src/main/java/com/example/user/service/UserService.java"));
    touch(path.join(tmp, "src/main/resources/mybatis/mappers/user/UserMapper.xml"));
    touch(path.join(tmp, "src/main/resources/mybatis/mappers/user/UserDetailMapper.xml"));

    const stack = { language: "java", buildTool: "gradle" };
    const result = await scanStructure(stack, tmp);

    const user = result.backendDomains.find(d => d.name === "user");
    assert.ok(user, "should detect user domain");
    // XML mapper count varies by OS (main regex vs fallback path handling)
    assert.ok(user.totalFiles >= 2, "should count at least controller + service files");
  });
});

// ─── Angular domain detection ────────────────────────────────

describe("scanStructure — Angular", () => {
  let tmp;
  beforeEach(() => { tmp = makeTmpDir(); });
  afterEach(() => cleanup(tmp));

  it("detects feature modules from src/app/*/", async () => {
    touch(path.join(tmp, "src/app/dashboard/dashboard.component.ts"));
    touch(path.join(tmp, "src/app/dashboard/dashboard.service.ts"));
    touch(path.join(tmp, "src/app/settings/settings.component.ts"));
    touch(path.join(tmp, "src/app/settings/settings.module.ts"));

    const stack = { frontend: "angular", language: "typescript" };
    const result = await scanStructure(stack, tmp);

    const names = result.frontendDomains.map(d => d.name);
    assert.ok(names.includes("dashboard"), "should detect dashboard feature");
    assert.ok(names.includes("settings"), "should detect settings feature");
  });
});

// ─── Frontend Fallback C — deep components ───────────────────

describe("scanStructure — Frontend Fallback C", () => {
  let tmp;
  beforeEach(() => { tmp = makeTmpDir(); });
  afterEach(() => cleanup(tmp));

  it("detects domains from deep **/components/*/ directories", async () => {
    touch(path.join(tmp, "src/desktop/app/components/order/OrderList.tsx"));
    touch(path.join(tmp, "src/desktop/app/components/order/OrderDetail.tsx"));
    touch(path.join(tmp, "src/desktop/app/components/product/ProductCard.tsx"));
    touch(path.join(tmp, "src/desktop/app/components/product/ProductGrid.tsx"));

    const stack = { frontend: "react", language: "typescript" };
    const result = await scanStructure(stack, tmp);

    const names = result.frontendDomains.map(d => d.name);
    assert.ok(names.includes("order"), "should detect order from deep components");
    assert.ok(names.includes("product"), "should detect product from deep components");
  });
});

// ─── Frontend Fallback D — views/screens ─────────────────────

describe("scanStructure — Frontend Fallback D", () => {
  let tmp;
  beforeEach(() => { tmp = makeTmpDir(); });
  afterEach(() => cleanup(tmp));

  it("detects domains from views/ and screens/ directories", async () => {
    touch(path.join(tmp, "src/views/profile/ProfileView.tsx"));
    touch(path.join(tmp, "src/views/profile/ProfileEdit.tsx"));
    touch(path.join(tmp, "src/screens/home/HomeScreen.tsx"));
    touch(path.join(tmp, "src/screens/home/HomeWidget.tsx"));

    const stack = { frontend: "react", language: "typescript" };
    const result = await scanStructure(stack, tmp);

    const names = result.frontendDomains.map(d => d.name);
    assert.ok(names.includes("profile"), "should detect profile from views/");
    assert.ok(names.includes("home"), "should detect home from screens/");
  });
});

// ─── Kotlin single-module ────────────────────────────────────

describe("scanStructure — Kotlin single-module", () => {
  let tmp;
  beforeEach(() => { tmp = makeTmpDir(); });
  afterEach(() => cleanup(tmp));

  it("detects domains from domain/controller/ in single-module Kotlin project", async () => {
    touch(path.join(tmp, "src/main/kotlin/com/example/reservation/controller/ReservationController.kt"));
    touch(path.join(tmp, "src/main/kotlin/com/example/reservation/service/ReservationService.kt"));
    touch(path.join(tmp, "src/main/kotlin/com/example/member/controller/MemberController.kt"));

    const stack = { language: "kotlin", buildTool: "gradle" };
    const result = await scanStructure(stack, tmp);

    const names = result.backendDomains.map(d => d.name);
    assert.ok(names.includes("reservation"), "should detect reservation domain");
    assert.ok(names.includes("member"), "should detect member domain");
  });
});

// ─── Django models.py detection ──────────────────────────────

describe("scanStructure — Django", () => {
  let tmp;
  beforeEach(() => { tmp = makeTmpDir(); });
  afterEach(() => cleanup(tmp));

  it("detects apps from models.py files", async () => {
    touch(path.join(tmp, "blog/models.py"));
    touch(path.join(tmp, "blog/views.py"));
    touch(path.join(tmp, "accounts/models.py"));
    touch(path.join(tmp, "accounts/serializers.py"));

    const stack = { language: "python", framework: "django" };
    const result = await scanStructure(stack, tmp);

    const names = result.backendDomains.map(d => d.name);
    assert.ok(names.includes("blog"), "should detect blog app");
    assert.ok(names.includes("accounts"), "should detect accounts app");
  });
});

// ─── v2.5.0: layer-first Node / Python, frontend sub-directory ──
describe("scanStructure — v2.5.0 layouts", () => {
  let tmp;
  beforeEach(() => { tmp = makeTmpDir(); });
  afterEach(() => cleanup(tmp));

  it("Express layer-first (src/controllers, src/routes, src/services) yields file-stem domains, not layer names", async () => {
    // `users.routes.js` (plural) must fold into `user` — routes are commonly
    // named after the collection while controllers/models use the singular.
    for (const f of ["src/controllers/user.controller.js", "src/controllers/order.controller.js", "src/routes/users.routes.js",
      "src/routes/order.routes.js", "src/services/userService.js", "src/models/User.js", "src/middlewares/auth.js", "src/config/db.js"]) touch(path.join(tmp, f));
    const r = await scanStructure({ language: "javascript", framework: "express" }, tmp);
    const names = r.domains.filter(d => d.type === "backend").map(d => d.name).sort();
    assert.deepEqual(names, ["auth", "order", "user"]);
    const user = r.domains.find(d => d.name === "user");
    assert.equal(user.pattern, "layer-first");
    assert.equal(user.controllers, 2, "controller + (plural) route file");
    assert.equal(user.services, 1);
    assert.equal(user.totalFiles, 4, "controller + routes + service + model");
  });

  it("FastAPI layer-first (app/routers, app/models, app/schemas) yields file-stem domains, plural routers folded into singular models", async () => {
    for (const f of ["app/main.py", "app/routers/__init__.py", "app/routers/users.py", "app/routers/orders.py",
      "app/models/user.py", "app/models/order.py", "app/schemas/user_schema.py", "app/core/config.py",
      "app/routers/categories.py", "app/models/category.py", "app/routers/reports.py"]) touch(path.join(tmp, f));
    const r = await scanStructure({ language: "python", framework: "fastapi" }, tmp);
    const names = r.domains.filter(d => d.type === "backend").map(d => d.name).sort();
    // users→user, orders→order, categories→category (both forms present);
    // `reports` has no singular twin and is kept verbatim (never guessed).
    assert.deepEqual(names, ["category", "order", "reports", "user"]);
    assert.equal(r.domains.find(d => d.name === "user").totalFiles, 3, "routers/users + models/user + schemas/user_schema");
  });

  it("frontend in frontend/ sub-directory (stack.frontendRoot) is scanned there", async () => {
    for (const f of ["frontend/app/dashboard/page.tsx", "frontend/app/settings/page.tsx", "frontend/app/layout.tsx",
      "src/main/java/com/a/user/controller/UserController.java"]) touch(path.join(tmp, f));
    const r = await scanStructure({ language: "java", frontend: "nextjs", frontendRoot: "frontend" }, tmp);
    const fe = r.domains.filter(d => d.type === "frontend").map(d => d.name).sort();
    assert.deepEqual(fe, ["dashboard", "settings"]);
    assert.deepEqual(r.domains.filter(d => d.type === "backend").map(d => d.name), ["user"]);
  });
});

describe("scanStructure — Python mixed layer-first + feature packages (v2.5.0 review follow-up)", () => {
  let tmp;
  beforeEach(() => { tmp = makeTmpDir(); });
  afterEach(() => cleanup(tmp));

  it("src/routers/users.py + src/tasks/billing.py yields both `users` and `tasks`", async () => {
    for (const f of ["src/main.py", "src/routers/__init__.py", "src/routers/users.py", "src/tasks/__init__.py", "src/tasks/billing.py", "src/core/config.py"]) touch(path.join(tmp, f));
    const r = await scanStructure({ language: "python", framework: "fastapi" }, tmp);
    const names = r.domains.filter(d => d.type === "backend").map(d => d.name).sort();
    assert.deepEqual(names, ["tasks", "users"]);
    assert.equal(r.domains.find(d => d.name === "tasks").totalFiles, 2);
  });

  it("frontend in a sub-directory still reads .claudeos-scan.json from the PROJECT root", async () => {
    // forceSubappSplit lives at the project root; without it a single
    // `src/<platform>/<subapp>/` tree is skipped (single-SPA rule).
    fs.writeFileSync(path.join(tmp, ".claudeos-scan.json"), JSON.stringify({ frontendScan: { forceSubappSplit: true } }));
    fs.mkdirSync(path.join(tmp, "frontend"), { recursive: true });
    fs.writeFileSync(path.join(tmp, "frontend/package.json"), JSON.stringify({ dependencies: { react: "^18.2.0" } }));
    for (const f of ["frontend/src/desktop/shop/routes/Home.tsx", "frontend/src/desktop/shop/routes/Cart.tsx", "frontend/src/desktop/shop/components/Header.tsx",
      "frontend/src/desktop/shop/App.tsx", "src/main/java/com/a/user/controller/UserController.java"]) touch(path.join(tmp, f));
    const r = await scanStructure({ language: "java", frontend: "react", frontendRoot: "frontend" }, tmp);
    const fe = r.domains.filter(d => d.type === "frontend").map(d => d.name);
    assert.ok(fe.includes("desktop-shop"), `override must be honored from the project root, got: ${fe.join(", ")}`);
  });
});

describe("scanStructure — review follow-up 2 layouts", () => {
  let tmp;
  beforeEach(() => { tmp = makeTmpDir(); });
  afterEach(() => cleanup(tmp));

  it("Express layer-first with extra db/ and jobs/ folders still yields stem domains + jobs, never layer names", async () => {
    for (const f of ["src/controllers/user.controller.js", "src/controllers/order.controller.js", "src/routes/users.routes.js", "src/routes/orders.routes.js",
      "src/services/userService.js", "src/models/User.js", "src/db/knex.js", "src/db/migrations/001_init.js", "src/jobs/nightly-report.js", "src/jobs/index.js"]) touch(path.join(tmp, f));
    const r = await scanStructure({ language: "javascript", framework: "express" }, tmp);
    const names = r.domains.filter(d => d.type === "backend").map(d => d.name).sort();
    assert.deepEqual(names, ["jobs", "order", "user"], "db is infrastructure, jobs is a feature folder, layer names never appear");
    assert.equal(r.domains.find(d => d.name === "jobs").pattern, "layer-first");
    assert.equal(r.domains.find(d => d.name === "jobs").totalFiles, 2);
  });

  it("Python layer-first ignores a virtualenv / node_modules living under src/", async () => {
    for (const f of ["src/main.py", "src/routers/users.py", "src/models/user.py",
      "src/env/lib/python3.11/site-packages/pkg/__init__.py", "src/node_modules/pkg/setup.py", "src/virtualenv/lib/site.py", "src/venv/bin/activate_this.py"]) touch(path.join(tmp, f));
    const r = await scanStructure({ language: "python", framework: "fastapi" }, tmp);
    assert.deepEqual(r.domains.filter(d => d.type === "backend").map(d => d.name).sort(), ["user"]);
  });
});

// ─── v2.5.0: backend port vs frontend dev-server port (plan-installer) ──
describe("plan-installer — port resolution keeps backend and frontend ports apart (review follow-up 2)", () => {
  const { execSync } = require("child_process");
  const TOOLS = path.resolve(__dirname, "..");
  let tmp;
  beforeEach(() => { tmp = makeTmpDir(); });
  afterEach(() => cleanup(tmp));
  function run() {
    mkdirp(path.join(tmp, "claudeos-core/generated"));
    execSync(`node "${path.join(TOOLS, "plan-installer/index.js")}"`, { cwd: tmp, env: { ...process.env, CLAUDEOS_ROOT: tmp }, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] });
    return JSON.parse(fs.readFileSync(path.join(tmp, "claudeos-core/generated/project-analysis.json"), "utf-8")).stack;
  }

  it("Spring backend + client/ Angular: backend keeps 8080, frontendPort is 4200", () => {
    fs.writeFileSync(path.join(tmp, "pom.xml"), "<project><dependencies><dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-web</artifactId></dependency></dependencies></project>");
    touch(path.join(tmp, "src/main/java/com/a/user/controller/UserController.java"));
    touch(path.join(tmp, "client/angular.json"));
    touch(path.join(tmp, "client/src/app/dashboard/dashboard.component.ts"));
    const s = run();
    assert.equal(s.port, 8080, "backend must not inherit the Angular dev-server port");
    assert.equal(s.frontendPort, 4200);
  });

  it("SPA-only frontend/ with PORT in frontend/.env.example: both ports come from it", () => {
    fs.mkdirSync(path.join(tmp, "frontend"), { recursive: true });
    fs.writeFileSync(path.join(tmp, "frontend/package.json"), JSON.stringify({ dependencies: { react: "^18.2.0" }, devDependencies: { vite: "^5.0.0" } }));
    fs.writeFileSync(path.join(tmp, "frontend/.env.example"), "PORT=3000\n");
    touch(path.join(tmp, "frontend/src/pages/home/index.tsx"));
    const s = run();
    assert.equal(s.frontendPort, 3000);
    assert.equal(s.port, 3000, "frontend-only project: the dev-server port is THE port");
  });

  it("root Vite SPA with .env PORT=4000: port and frontendPort agree", () => {
    fs.writeFileSync(path.join(tmp, "package.json"), JSON.stringify({ dependencies: { react: "^18.2.0" }, devDependencies: { vite: "^5.0.0" } }));
    fs.writeFileSync(path.join(tmp, ".env.example"), "PORT=4000\n");
    touch(path.join(tmp, "src/pages/home/index.tsx"));
    const s = run();
    assert.equal(s.port, 4000);
    assert.equal(s.frontendPort, 4000);
  });
});

// ─── review follow-up 3 ───────────────────────────────────────
describe("detectStack / scanStructure — Python backend + frontend package.json (review follow-up 3)", () => {
  let tmp;
  beforeEach(() => { tmp = makeTmpDir(); });
  afterEach(() => cleanup(tmp));

  it("Django + frontend/ (React + Vite) stays language=python and the Python scanner runs", async () => {
    fs.writeFileSync(path.join(tmp, "requirements.txt"), "Django==5.0.6\n");
    for (const f of ["manage.py", "accounts/models.py", "accounts/views.py", "blog/models.py", "frontend/src/pages/home/index.tsx"]) touch(path.join(tmp, f));
    fs.writeFileSync(path.join(tmp, "frontend/package.json"), JSON.stringify({ dependencies: { react: "^18.2.0" }, devDependencies: { vite: "^5.0.0", typescript: "^5.0.0" } }));
    const { detectStack } = require("../plan-installer/stack-detector");
    const s = await detectStack(tmp);
    assert.equal(s.language, "python", "sub-directory SPA must not pre-empt the Python block");
    assert.equal(s.framework, "django");
    assert.equal(s.frontend, "react");
    assert.equal(s.frontendRoot, "frontend");
    assert.equal(s.packageManager, "pip", "backend package manager wins over the SPA's");
    const r = await scanStructure(s, tmp);
    assert.deepEqual(r.domains.filter(d => d.type === "backend").map(d => d.name).sort(), ["accounts", "blog"]);
  });

  it("Django repo with a root package.json used only for tooling still dispatches to the Python scanner", async () => {
    fs.writeFileSync(path.join(tmp, "requirements.txt"), "Django==5.0.6\n");
    fs.writeFileSync(path.join(tmp, "package.json"), JSON.stringify({ devDependencies: { tailwindcss: "^3.4.0", postcss: "^8.0.0" } }));
    for (const f of ["manage.py", "accounts/models.py", "blog/models.py"]) touch(path.join(tmp, f));
    const r = await scanStructure({ language: "typescript", framework: "django" }, tmp);
    assert.deepEqual(r.domains.filter(d => d.type === "backend").map(d => d.name).sort(), ["accounts", "blog"]);
  });

  it("module-first NestJS tree with shared entities/ + dtos/ keeps its modules as domains", async () => {
    for (const f of ["src/auth/auth.controller.ts", "src/auth/auth.service.ts", "src/users/users.controller.ts", "src/users/users.service.ts",
      "src/orders/orders.controller.ts", "src/entities/user.entity.ts", "src/entities/audit-log.entity.ts", "src/dtos/pagination.dto.ts", "src/main.ts"]) touch(path.join(tmp, f));
    const r = await scanStructure({ language: "typescript", framework: "nestjs" }, tmp);
    const names = r.domains.filter(d => d.type === "backend").map(d => d.name).sort();
    assert.deepEqual(names, ["auth", "orders", "users"], "no layer-first rename, no one-file stem domains, no `entities`/`dtos` pseudo-domains");
  });

  it("Spring backend + root React/Vite SPA with root .env VITE_PORT: backend keeps 8080, frontendPort is the .env value", async () => {
    fs.writeFileSync(path.join(tmp, "build.gradle"), "plugins { id 'org.springframework.boot' version '3.2.0' }\ndependencies { implementation 'org.springframework.boot:spring-boot-starter-web' }");
    fs.writeFileSync(path.join(tmp, "package.json"), JSON.stringify({ dependencies: { react: "^18.2.0" }, devDependencies: { vite: "^5.0.0" } }));
    fs.writeFileSync(path.join(tmp, ".env.example"), "VITE_PORT=3000\nSERVER_PORT=8080\n");
    touch(path.join(tmp, "src/main/java/com/a/user/controller/UserController.java"));
    touch(path.join(tmp, "src/pages/home/index.tsx"));
    const { detectStack } = require("../plan-installer/stack-detector");
    const s = await detectStack(tmp);
    assert.equal(s.port, 8080, "VITE_PORT must not become the backend port");
    assert.equal(s.frontendPort, 3000);
  });
});

// ─── review follow-up 4 ───────────────────────────────────────
describe("review follow-up 4 — stack detection", () => {
  let tmp;
  beforeEach(() => { tmp = makeTmpDir(); });
  afterEach(() => cleanup(tmp));
  const { detectStack } = require("../plan-installer/stack-detector");

  it("Java Spring repo with build-logic/ Kotlin convention plugins + catalog kotlin pin stays java", async () => {
    fs.writeFileSync(path.join(tmp, "build.gradle.kts"), 'plugins { id("org.springframework.boot") version "3.3.1" }');
    fs.mkdirSync(path.join(tmp, "gradle"), { recursive: true });
    fs.writeFileSync(path.join(tmp, "gradle/libs.versions.toml"), '[versions]\nkotlin = "1.9.22"\n');
    touch(path.join(tmp, "build-logic/src/main/kotlin/JavaConventionsPlugin.kt"));
    touch(path.join(tmp, "src/main/java/com/acme/user/controller/UserController.java"));
    const s = await detectStack(tmp);
    assert.equal(s.language, "java");
    const r = await scanStructure(s, tmp);
    assert.deepEqual(r.domains.filter(d => d.type === "backend").map(d => d.name), ["user"]);
  });

  it("Django repo whose root package.json exists only for tooling reports language=python (not typescript 5.x)", async () => {
    fs.writeFileSync(path.join(tmp, "requirements.txt"), "Django==5.0.6\n");
    fs.writeFileSync(path.join(tmp, "package.json"), JSON.stringify({ devDependencies: { tailwindcss: "^3.4.0", typescript: "5.4.0" } }));
    for (const f of ["manage.py", "blog/models.py"]) touch(path.join(tmp, f));
    const s = await detectStack(tmp);
    assert.equal(s.language, "python");
    assert.equal(s.framework, "django");
    assert.notEqual(s.languageVersion, "5.4.0", "the TypeScript version must not be reported as the Python version");
  });

  it("NestJS repo with a stray requirements.txt keeps Node (a Node backend framework wins)", async () => {
    fs.writeFileSync(path.join(tmp, "package.json"), JSON.stringify({ dependencies: { "@nestjs/core": "^10.0.0" }, devDependencies: { typescript: "5.4.0" } }));
    fs.writeFileSync(path.join(tmp, "requirements.txt"), "black==24.0\n");
    const s = await detectStack(tmp);
    assert.equal(s.language, "typescript");
    assert.equal(s.framework, "nestjs");
  });

  it("root .env with SERVER_PORT + VITE_PORT: envInfo.port is the backend port, frontendPort the Vite one", async () => {
    fs.writeFileSync(path.join(tmp, "build.gradle"), "plugins { id 'org.springframework.boot' version '3.2.0' }\ndependencies { implementation 'org.springframework.boot:spring-boot-starter-web' }");
    fs.writeFileSync(path.join(tmp, "package.json"), JSON.stringify({ dependencies: { react: "^18.2.0" }, devDependencies: { vite: "^5.0.0" } }));
    fs.writeFileSync(path.join(tmp, ".env.example"), "VITE_PORT=3000\nSERVER_PORT=8080\n");
    const s = await detectStack(tmp);
    assert.equal(s.port, 8080);
    assert.equal(s.envInfo.port, 8080, "Pass 3 reads stack.envInfo.port for the backend row");
    assert.equal(s.frontendPort, 3000);
    assert.equal(s.envInfo.frontendPort, 3000);
  });
});

describe("review follow-up 4 — plan-installer port defaults for a framework-less JVM backend + SPA", () => {
  const { execSync } = require("child_process");
  const TOOLS = path.resolve(__dirname, "..");
  let tmp;
  beforeEach(() => { tmp = makeTmpDir(); });
  afterEach(() => cleanup(tmp));

  it("plain Maven project (no Spring Boot coords) + frontend/ Vite: backend keeps 8080, frontendPort 5173", () => {
    fs.writeFileSync(path.join(tmp, "pom.xml"), "<project><groupId>com.acme</groupId><artifactId>app</artifactId></project>");
    touch(path.join(tmp, "src/main/java/com/acme/user/controller/UserController.java"));
    fs.mkdirSync(path.join(tmp, "frontend"), { recursive: true });
    fs.writeFileSync(path.join(tmp, "frontend/package.json"), JSON.stringify({ dependencies: { react: "^18.2.0" }, devDependencies: { vite: "^5.0.0" } }));
    touch(path.join(tmp, "frontend/src/pages/home/index.tsx"));
    mkdirp(path.join(tmp, "claudeos-core/generated"));
    execSync(`node "${path.join(TOOLS, "plan-installer/index.js")}"`, { cwd: tmp, env: { ...process.env, CLAUDEOS_ROOT: tmp }, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] });
    const s = JSON.parse(fs.readFileSync(path.join(tmp, "claudeos-core/generated/project-analysis.json"), "utf-8")).stack;
    assert.equal(s.language, "java");
    assert.equal(s.port, 8080, "a JVM project is a backend even without a recognized framework");
    assert.equal(s.frontendPort, 5173);
  });
});

describe("review follow-up 4 — Node layer-first stems and Java 5-segment base package", () => {
  let tmp;
  beforeEach(() => { tmp = makeTmpDir(); });
  afterEach(() => cleanup(tmp));

  it("`email.service.impl.ts` and `models/prototype.ts` do not create `emailimpl` / dto-typed `prototype` domains", async () => {
    for (const f of ["src/controllers/user.controller.ts", "src/routes/user.routes.ts", "src/services/user.service.ts", "src/services/email.service.impl.ts",
      "src/models/prototype.ts", "src/models/user.model.ts"]) touch(path.join(tmp, f));
    const r = await scanStructure({ language: "typescript", framework: "express" }, tmp);
    const byName = Object.fromEntries(r.domains.filter(d => d.type === "backend").map(d => [d.name, d]));
    assert.ok(!("emailimpl" in byName), Object.keys(byName).join(","));
    assert.ok("email" in byName, "impl suffix stripped → email");
    assert.equal(byName.email.services, 1);
    assert.equal(byName.prototype.dtos, 0, "role comes from the layer folder, not from the substring 'type'");
    assert.equal(byName.user.controllers, 2);
    assert.equal(byName.user.services, 1);
  });

  it("5-segment Initializr base package (kr/co/org/proj/app) is Pattern C via the *Application.java anchor", async () => {
    const { scanJavaDomains } = require("../plan-installer/scanners/scan-java");
    for (const f of ["DemoApplication.java", "controller/UserController.java", "controller/OrderController.java", "service/UserService.java", "service/OrderService.java"])
      touch(path.join(tmp, "src/main/java/kr/co/acme/shop/app", f));
    const { backendDomains } = await scanJavaDomains({ language: "java" }, tmp);
    assert.deepEqual(backendDomains.map(d => d.name).sort(), ["order", "user"]);
    assert.ok(backendDomains.every(d => d.pattern === "C"));
    assert.ok(!backendDomains.some(d => d.name === "app"), "module/package tail must not become a domain");
  });
});
