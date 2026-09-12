/**
 * ClaudeOS-Core — Java Scanner Tests
 *
 * Tests scanJavaDomains for:
 *   - Pattern A: controller/{domain}/*.java (layer-first)
 *   - Pattern B: {domain}/controller/*.java (domain-first)
 *   - Pattern C: controller/DomainController.java (flat, class name extraction)
 *   - Pattern D: {module}/{domain}/controller/ (module/domain — auto-upgrade from B)
 *   - Pattern E: {domain}/adapter/in/web/*.java (DDD/Hexagonal)
 *   - Supplementary scan: service-only domains without controllers
 *   - File counts: controllers, services, mappers, dtos, xmlMappers
 *   - Root package extraction
 *   - Full fallback (all patterns yield 0)
 *   - Skip list (common, config, util, etc.)
 */

const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const os = require("os");

const { scanJavaDomains } = require("../plan-installer/scanners/scan-java");

function makeTmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "ccore-java-"));
}
function cleanup(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}
function touch(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, "// placeholder\n");
}

// ─── Pattern A: controller/{domain}/*.java ─────────────────

describe("scanJavaDomains — Pattern A (layer-first)", () => {
  let tmp;
  beforeEach(() => { tmp = makeTmpDir(); });
  afterEach(() => cleanup(tmp));

  it("detects domains from controller/{domain}/ structure", async () => {
    touch(path.join(tmp, "src/main/java/com/example/controller/user/UserController.java"));
    touch(path.join(tmp, "src/main/java/com/example/controller/order/OrderController.java"));

    const stack = { language: "java", buildTool: "gradle" };
    const { backendDomains } = await scanJavaDomains(stack, tmp);

    const user = backendDomains.find(d => d.name === "user");
    const order = backendDomains.find(d => d.name === "order");
    assert.ok(user, "should detect user domain");
    assert.ok(order, "should detect order domain");
    assert.equal(user.pattern, "A");
  });

  it("counts service files for Pattern A domains", async () => {
    touch(path.join(tmp, "src/main/java/com/example/controller/product/ProductController.java"));
    touch(path.join(tmp, "src/main/java/com/example/service/product/ProductService.java"));

    const stack = { language: "java", buildTool: "gradle" };
    const { backendDomains } = await scanJavaDomains(stack, tmp);

    const product = backendDomains.find(d => d.name === "product" && d.pattern === "A");
    assert.ok(product, "should detect product domain");
    assert.equal(product.controllers, 1);
    assert.equal(product.services, 1);
  });
});

// ─── Pattern B: {domain}/controller/*.java ─────────────────

describe("scanJavaDomains — Pattern B (domain-first)", () => {
  let tmp;
  beforeEach(() => { tmp = makeTmpDir(); });
  afterEach(() => cleanup(tmp));

  it("detects domains from {domain}/controller/ structure", async () => {
    touch(path.join(tmp, "src/main/java/com/example/user/controller/UserController.java"));
    touch(path.join(tmp, "src/main/java/com/example/user/service/UserService.java"));
    touch(path.join(tmp, "src/main/java/com/example/order/controller/OrderController.java"));

    const stack = { language: "java", buildTool: "gradle" };
    const { backendDomains } = await scanJavaDomains(stack, tmp);

    const names = backendDomains.map(d => d.name);
    assert.ok(names.includes("user"));
    assert.ok(names.includes("order"));
    const user = backendDomains.find(d => d.name === "user");
    assert.equal(user.controllers, 1);
    assert.equal(user.services, 1);
  });

  it("counts repository and dao as mappers", async () => {
    touch(path.join(tmp, "src/main/java/com/example/payment/controller/PaymentController.java"));
    touch(path.join(tmp, "src/main/java/com/example/payment/repository/PaymentRepository.java"));
    touch(path.join(tmp, "src/main/java/com/example/payment/dao/PaymentDao.java"));

    const stack = { language: "java", buildTool: "gradle" };
    const { backendDomains } = await scanJavaDomains(stack, tmp);

    const payment = backendDomains.find(d => d.name === "payment");
    assert.ok(payment);
    assert.ok(payment.mappers >= 2, "repository + dao should count as mappers");
  });

  it("counts dto files", async () => {
    touch(path.join(tmp, "src/main/java/com/example/member/controller/MemberController.java"));
    touch(path.join(tmp, "src/main/java/com/example/member/dto/MemberDto.java"));
    touch(path.join(tmp, "src/main/java/com/example/member/dto/MemberRequestDto.java"));

    const stack = { language: "java", buildTool: "gradle" };
    const { backendDomains } = await scanJavaDomains(stack, tmp);

    const member = backendDomains.find(d => d.name === "member");
    assert.ok(member);
    assert.equal(member.dtos, 2);
  });

  it("counts MyBatis XML mappers", async () => {
    touch(path.join(tmp, "src/main/java/com/example/user/controller/UserController.java"));
    touch(path.join(tmp, "src/main/java/com/example/user/mapper/UserMapper.java"));
    touch(path.join(tmp, "src/main/resources/mapper/user/UserMapper.xml"));
    touch(path.join(tmp, "src/main/resources/mapper/user/UserDetailMapper.xml"));

    const stack = { language: "java", buildTool: "gradle" };
    const { backendDomains } = await scanJavaDomains(stack, tmp);

    const user = backendDomains.find(d => d.name === "user");
    assert.ok(user);
    assert.ok(user.xmlMappers >= 1, "should count XML mapper files");
  });
});

// ─── Pattern C: controller/DomainController.java (flat) ────

describe("scanJavaDomains — Pattern C (flat)", () => {
  let tmp;
  beforeEach(() => { tmp = makeTmpDir(); });
  afterEach(() => cleanup(tmp));

  it("extracts domain name from controller class name", async () => {
    // Flat structure: controller/ dir has no subdirectories, only named files
    touch(path.join(tmp, "src/main/java/com/example/controller/ProductController.java"));
    touch(path.join(tmp, "src/main/java/com/example/controller/CartController.java"));
    // No Pattern A/B structure (no {domain}/controller/ or controller/{domain}/)

    const stack = { language: "java", buildTool: "gradle" };
    const { backendDomains } = await scanJavaDomains(stack, tmp);

    // Pattern C extracts lowercase from PascalCase class name
    const names = backendDomains.map(d => d.name).sort();
    assert.deepEqual(names, ["cart", "product"], "flat layout must yield one domain per *Controller class");
    assert.ok(backendDomains.every(d => d.pattern === "C"), "flat layout must be classified as Pattern C");
    assert.ok(!names.includes("example"), "root package tail must not become a domain");
  });

  it("Spring Initializr default layout (root/controller + root/service) is Pattern C, not a single package-named domain", async () => {
    touch(path.join(tmp, "src/main/java/com/example/demo/controller/UserController.java"));
    touch(path.join(tmp, "src/main/java/com/example/demo/controller/OrderController.java"));
    touch(path.join(tmp, "src/main/java/com/example/demo/service/UserService.java"));
    touch(path.join(tmp, "src/main/java/com/example/demo/service/OrderService.java"));

    const { backendDomains, rootPackage } = await scanJavaDomains({ language: "java" }, tmp);
    assert.equal(rootPackage, "com.example.demo");
    const names = backendDomains.map(d => d.name).sort();
    assert.deepEqual(names, ["order", "user"]);
    const user = backendDomains.find(d => d.name === "user");
    assert.equal(user.pattern, "C");
    assert.equal(user.controllers, 1);
    assert.equal(user.services, 1);
  });
});

// ─── Pattern D: {module}/{domain}/controller/ ──────────────

describe("scanJavaDomains — Pattern D (module/domain)", () => {
  let tmp;
  beforeEach(() => { tmp = makeTmpDir(); });
  afterEach(() => cleanup(tmp));

  it("detects domains from module/domain structure with conflict", async () => {
    // Same domain name "user" under different parent modules triggers Pattern D
    touch(path.join(tmp, "src/main/java/com/example/front/user/controller/FrontUserController.java"));
    touch(path.join(tmp, "src/main/java/com/example/admin/user/controller/AdminUserController.java"));

    const stack = { language: "java", buildTool: "gradle" };
    const { backendDomains } = await scanJavaDomains(stack, tmp);

    // With conflict, "user" appears under both "front" and "admin"
    // Pattern D creates entries like "front/user" and "admin/user"
    assert.ok(backendDomains.length >= 2, "should detect at least 2 entries from conflict");
    // At least one domain should contain "user"
    const hasUser = backendDomains.some(d => d.name.includes("user"));
    assert.ok(hasUser, "should have domain entries containing 'user'");
  });
});

// ─── Pattern E: DDD/Hexagonal ──────────────────────────────

describe("scanJavaDomains — Pattern E (DDD/Hexagonal)", () => {
  let tmp;
  beforeEach(() => { tmp = makeTmpDir(); });
  afterEach(() => cleanup(tmp));

  it("detects domains from adapter/in/web/ structure", async () => {
    // Pure DDD structure: no controller/ dirs at all (otherwise B/A takes priority)
    touch(path.join(tmp, "src/main/java/com/example/payment/adapter/in/web/PaymentController.java"));
    touch(path.join(tmp, "src/main/java/com/example/payment/domain/service/PaymentService.java"));
    touch(path.join(tmp, "src/main/java/com/example/shipping/adapter/in/web/ShippingController.java"));

    const stack = { language: "java", buildTool: "gradle" };
    const { backendDomains } = await scanJavaDomains(stack, tmp);

    const names = backendDomains.map(d => d.name);
    assert.ok(names.includes("payment"), "should detect payment");
    assert.ok(names.includes("shipping"), "should detect shipping");
  });

  it("detects adapter/in/rest/ variant", async () => {
    touch(path.join(tmp, "src/main/java/com/example/inventory/adapter/in/rest/InventoryController.java"));

    const stack = { language: "java", buildTool: "gradle" };
    const { backendDomains } = await scanJavaDomains(stack, tmp);

    const names = backendDomains.map(d => d.name);
    assert.ok(names.includes("inventory"), "should detect from adapter/in/rest/");
  });

  it("counts infrastructure/ files as mappers", async () => {
    touch(path.join(tmp, "src/main/java/com/example/order/adapter/in/web/OrderController.java"));
    touch(path.join(tmp, "src/main/java/com/example/order/infrastructure/OrderRepositoryImpl.java"));
    touch(path.join(tmp, "src/main/java/com/example/order/infrastructure/OrderJpaAdapter.java"));

    const stack = { language: "java", buildTool: "gradle" };
    const { backendDomains } = await scanJavaDomains(stack, tmp);

    const order = backendDomains.find(d => d.name === "order");
    assert.ok(order, "should detect order domain");
    assert.ok(order.mappers >= 2, "infrastructure/ files should count as mappers");
  });
});

// ─── Supplementary scan: service-only domains ──────────────

describe("scanJavaDomains — supplementary scan", () => {
  let tmp;
  beforeEach(() => { tmp = makeTmpDir(); });
  afterEach(() => cleanup(tmp));

  it("detects domains without controllers via service/aggregator/facade", async () => {
    // A domain with controller (to establish a detected pattern)
    touch(path.join(tmp, "src/main/java/com/example/user/controller/UserController.java"));
    // Service-only domains (no controller)
    touch(path.join(tmp, "src/main/java/com/example/billing/service/BillingService.java"));
    touch(path.join(tmp, "src/main/java/com/example/notification/facade/NotificationFacade.java"));

    const stack = { language: "java", buildTool: "gradle" };
    const { backendDomains } = await scanJavaDomains(stack, tmp);

    const names = backendDomains.map(d => d.name);
    assert.ok(names.includes("billing"), "should detect service-only domain");
    assert.ok(names.includes("notification"), "should detect facade-only domain");
  });

  it("counts aggregator/facade/usecase/orchestrator as services", async () => {
    touch(path.join(tmp, "src/main/java/com/example/order/controller/OrderController.java"));
    touch(path.join(tmp, "src/main/java/com/example/order/service/OrderService.java"));
    touch(path.join(tmp, "src/main/java/com/example/order/aggregator/OrderAggregator.java"));
    touch(path.join(tmp, "src/main/java/com/example/order/facade/OrderFacade.java"));

    const stack = { language: "java", buildTool: "gradle" };
    const { backendDomains } = await scanJavaDomains(stack, tmp);

    const order = backendDomains.find(d => d.name === "order");
    assert.ok(order);
    assert.ok(order.services >= 3, "service + aggregator + facade should count as services >= 3");
  });
});

// ─── Skip list ─────────────────────────────────────────────

describe("scanJavaDomains — skip list", () => {
  let tmp;
  beforeEach(() => { tmp = makeTmpDir(); });
  afterEach(() => cleanup(tmp));

  it("skips common/config/util/shared directories in supplementary scan", async () => {
    // Primary domain to establish pattern
    touch(path.join(tmp, "src/main/java/com/example/user/controller/UserController.java"));
    // These should be skipped by supplementary scan
    touch(path.join(tmp, "src/main/java/com/example/common/service/CommonService.java"));
    touch(path.join(tmp, "src/main/java/com/example/config/service/ConfigService.java"));
    touch(path.join(tmp, "src/main/java/com/example/util/service/UtilService.java"));
    touch(path.join(tmp, "src/main/java/com/example/shared/service/SharedService.java"));

    const stack = { language: "java", buildTool: "gradle" };
    const { backendDomains } = await scanJavaDomains(stack, tmp);

    const names = backendDomains.map(d => d.name);
    assert.ok(names.includes("user"), "user should be detected");
    assert.ok(!names.includes("common"), "common should be skipped");
    assert.ok(!names.includes("config"), "config should be skipped");
    assert.ok(!names.includes("util"), "util should be skipped");
    assert.ok(!names.includes("shared"), "shared should be skipped");
  });
});

// ─── Root package extraction ───────────────────────────────

describe("scanJavaDomains — root package", () => {
  let tmp;
  beforeEach(() => { tmp = makeTmpDir(); });
  afterEach(() => cleanup(tmp));

  it("extracts root package from controller path", async () => {
    touch(path.join(tmp, "src/main/java/com/example/app/user/controller/UserController.java"));
    touch(path.join(tmp, "src/main/java/com/example/app/user/service/UserService.java"));

    const stack = { language: "java", buildTool: "gradle" };
    const { rootPackage } = await scanJavaDomains(stack, tmp);

    assert.ok(rootPackage, "should extract root package");
    assert.ok(rootPackage.includes("com.example"), `should contain com.example, got: ${rootPackage}`);
  });

  it("v2.4.0: mono-package project picks the most specific (longest) prefix", async () => {
    // For a single-package project, all 1-, 2-, 3-segment prefixes have
    // the same count. The frequency-based picker should choose the
    // LONGEST (most specific) — `com.example.app`, not `com`.
    for (const d of ["user", "order", "payment"]) {
      touch(path.join(tmp, `src/main/java/com/example/app/${d}/controller/${d}Controller.java`));
      touch(path.join(tmp, `src/main/java/com/example/app/${d}/service/${d}Service.java`));
    }
    const stack = { language: "java", buildTool: "gradle" };
    const { rootPackage } = await scanJavaDomains(stack, tmp);
    assert.equal(rootPackage, "com.example.app",
      `mono-package should resolve to most-specific root, got: ${rootPackage}`);
  });

  it("v2.4.0: multi-module project picks the majority root, not the first-glob match", async () => {
    // Pre-v2.4.0 the first matched file's prefix won, which broke
    // multi-module projects with a small minority subtree. Here 6
    // domains live under `org.foo.api.*` and only 1 stub lives under
    // `org.foo.misc.legacy.*` — the expected root is `org.foo.api`.
    // (An adversarial glob ordering — minority files first — would
    // otherwise pick `org.foo.misc.legacy` under the old logic.)
    for (const d of ["user", "order", "payment", "report", "audit", "invoice"]) {
      touch(path.join(tmp, `src/main/java/org/foo/api/${d}/controller/${d}Controller.java`));
      touch(path.join(tmp, `src/main/java/org/foo/api/${d}/service/${d}Service.java`));
    }
    // Single minority stub under a different subtree.
    touch(path.join(tmp, `src/main/java/org/foo/misc/legacy/controller/LegacyController.java`));

    const stack = { language: "java", buildTool: "gradle" };
    const { rootPackage } = await scanJavaDomains(stack, tmp);
    assert.equal(rootPackage, "org.foo.api",
      `multi-module should pick majority root, got: ${rootPackage}`);
  });

  it("v2.4.0: Pattern B deep-sweep fallback finds cross-module files (front + core split)", async () => {
    // Multi-module layout: HTTP layer at `front/{domain}/controller/`,
    // service/dao at `core/{domain}/service|dao/`. Pre-v2.4.0 the
    // standard glob `**/{domain}/{layer}/` covered both via leading `**`,
    // but cross-domain coupling cases (next test) were missed. Verify
    // multi-module layout still produces correct counts.
    touch(path.join(tmp, "src/main/java/org/foo/api/front/widget/controller/WidgetController.java"));
    touch(path.join(tmp, "src/main/java/org/foo/api/front/widget/aggregator/WidgetAggregator.java"));
    touch(path.join(tmp, "src/main/java/org/foo/api/core/widget/service/WidgetService.java"));
    touch(path.join(tmp, "src/main/java/org/foo/api/core/widget/dao/WidgetDao.java"));

    const stack = { language: "java", buildTool: "gradle" };
    const { backendDomains } = await scanJavaDomains(stack, tmp);
    const widget = backendDomains.find((d) => d.name === "widget");
    assert.ok(widget, "widget domain must be registered");
    assert.ok(widget.totalFiles >= 4, `widget should count ≥4 files across both modules; got ${widget.totalFiles}`);
    assert.ok(widget.services >= 1, `service in core/{domain}/ should be counted; got services=${widget.services}`);
    assert.ok(widget.mappers >= 1, `dao in core/{domain}/ should be counted; got mappers=${widget.mappers}`);
  });

  it("v2.4.0: Pattern B deep-sweep fallback finds cross-domain coupling (layer/domain inverted)", async () => {
    // Cross-domain coupling pattern: domain "notification" has its
    // controller at `front/notification/controller/`, but its services
    // live UNDER `core/inventory/service/notification/*` (a different
    // module owns the file location). The pre-v2.4.0 standard glob
    // `**/notification/service/*.java` does NOT match this layout (layer
    // comes BEFORE domain). The deep-sweep fallback catches it because
    // `**/notification/**/*.java` matches the file, and walking-up
    // finds `service` as the nearest layer dir.
    touch(path.join(tmp, "src/main/java/org/foo/api/front/notification/controller/NotificationController.java"));
    touch(path.join(tmp, "src/main/java/org/foo/api/core/inventory/service/notification/NotificationService.java"));
    touch(path.join(tmp, "src/main/java/org/foo/api/core/inventory/service/notification/NotificationServiceImpl.java"));

    const stack = { language: "java", buildTool: "gradle" };
    const { backendDomains } = await scanJavaDomains(stack, tmp);
    const notif = backendDomains.find((d) => d.name === "notification");
    assert.ok(notif, "notification domain must be registered (via primary controller)");
    assert.ok(notif.services >= 2,
      `cross-domain services under core/{other}/service/notification/ must be counted; got services=${notif.services}`);
    assert.ok(notif.totalFiles >= 3,
      `notification should count ≥3 files (1 controller + 2 services); got totalFiles=${notif.totalFiles}`);
  });

  it("v2.4.0: deep-sweep recognizes implementation layers (factory/strategy/impl/etc.)", async () => {
    // Enterprise codebases place code under non-canonical
    // implementation layers like factory/strategy/impl/handler/manager.
    // Pre-v2.4.0 deep-sweep only recognized service|aggregator|facade|
    // usecase|orchestrator and dropped any file whose nearest layer
    // didn't match. This caused legitimate domains to report 0 totalFiles
    // and made downstream Pass 1 batches see "~0 files" for groups that
    // actually contain substantial code.
    //
    // Setup: domain "settle" has its controller at front/settle/controller/,
    // so Pattern B picks it up. But all its real code lives under
    // core/settle/{factory,strategy,impl,handler,helper}/ — non-standard
    // layers. Standard glob `**/settle/{service,mapper,dao}/*.java`
    // returns 0 files, so deep-sweep fires.
    touch(path.join(tmp, "src/main/java/org/foo/api/front/settle/controller/SettleController.java"));
    touch(path.join(tmp, "src/main/java/org/foo/api/core/settle/factory/SettleFactory.java"));
    touch(path.join(tmp, "src/main/java/org/foo/api/core/settle/strategy/CardStrategy.java"));
    touch(path.join(tmp, "src/main/java/org/foo/api/core/settle/strategy/CashStrategy.java"));
    touch(path.join(tmp, "src/main/java/org/foo/api/core/settle/impl/AbstractSettleImpl.java"));
    touch(path.join(tmp, "src/main/java/org/foo/api/core/settle/handler/SettleHandler.java"));
    touch(path.join(tmp, "src/main/java/org/foo/api/core/settle/helper/SettleHelper.java"));

    const stack = { language: "java", buildTool: "gradle" };
    const { backendDomains } = await scanJavaDomains(stack, tmp);
    const settle = backendDomains.find((d) => d.name === "settle");
    assert.ok(settle, "settle domain must be registered");
    // Expect 1 controller + 6 services (factory/strategy×2/impl/handler/helper)
    assert.ok(settle.services >= 6,
      `non-canonical layers must be counted as services; got services=${settle.services}`);
    assert.ok(settle.totalFiles >= 7,
      `settle should count ≥7 files; got totalFiles=${settle.totalFiles}`);
  });

  it("v2.4.0: deep-sweep classifies bare-domain .java files as services (catch-all)", async () => {
    // Even more degenerate layout: domain "nft" has files DIRECTLY under
    // core/nft/ with no layer subdir at all (e.g., NftService.java sits at
    // core/nft/NftService.java). Without the catch-all, deep-sweep walks
    // up the path, finds no recognized layer (only "nft" and "core"), and
    // doesn't increment any counter. Result: nft reports 0 totalFiles
    // even though it has real code.
    touch(path.join(tmp, "src/main/java/org/foo/api/front/nft/controller/NftController.java"));
    touch(path.join(tmp, "src/main/java/org/foo/api/core/nft/NftService.java"));
    touch(path.join(tmp, "src/main/java/org/foo/api/core/nft/NftClient.java"));
    touch(path.join(tmp, "src/main/java/org/foo/api/core/nft/NftConverter.java"));

    const stack = { language: "java", buildTool: "gradle" };
    const { backendDomains } = await scanJavaDomains(stack, tmp);
    const nft = backendDomains.find((d) => d.name === "nft");
    assert.ok(nft, "nft domain must be registered");
    assert.ok(nft.totalFiles >= 4,
      `bare-domain files must be counted via catch-all; got totalFiles=${nft.totalFiles}`);
  });

  it("v2.4.0: 80% threshold tolerates a small minority subtree", async () => {
    // 9 files under `<root>.api`, 1 file under `<root>.tools`.
    // 1-segment `org` count = 10
    // 2-segment `org.foo` count = 10
    // 3-segment `org.foo.api` count = 9 (≥80% of 10 = 8 → eligible)
    // 3-segment `org.foo.tools` count = 1 (< 8 → not eligible)
    // Longest among eligible = `org.foo.api`.
    for (let i = 0; i < 9; i++) {
      touch(path.join(tmp, `src/main/java/org/foo/api/d${i}/controller/D${i}.java`));
    }
    touch(path.join(tmp, `src/main/java/org/foo/tools/admin/controller/AdminController.java`));

    const stack = { language: "java", buildTool: "gradle" };
    const { rootPackage } = await scanJavaDomains(stack, tmp);
    assert.equal(rootPackage, "org.foo.api",
      `80% threshold should pick 'org.foo.api' over 'org.foo'; got: ${rootPackage}`);
  });
});

// ─── Full fallback ─────────────────────────────────────────

describe("scanJavaDomains — full fallback", () => {
  let tmp;
  beforeEach(() => { tmp = makeTmpDir(); });
  afterEach(() => cleanup(tmp));

  it("falls back to directory path parsing when no standard pattern matches", async () => {
    // Non-standard structure without src/main/java prefix
    touch(path.join(tmp, "app/modules/inventory/service/InventoryService.java"));
    touch(path.join(tmp, "app/modules/inventory/repository/InventoryRepo.java"));
    touch(path.join(tmp, "app/modules/catalog/service/CatalogService.java"));

    const stack = { language: "java", buildTool: "gradle" };
    const { backendDomains } = await scanJavaDomains(stack, tmp);

    const names = backendDomains.map(d => d.name);
    assert.ok(names.includes("inventory"), "fallback should detect inventory");
    assert.ok(names.includes("catalog"), "fallback should detect catalog");
  });

  it("returns empty for project with no Java files", async () => {
    touch(path.join(tmp, "src/main/kotlin/com/example/App.kt"));

    const stack = { language: "java", buildTool: "gradle" };
    const { backendDomains } = await scanJavaDomains(stack, tmp);
    assert.equal(backendDomains.length, 0);
  });
});

// ─── MyBatis XML (mybatis/ path) ───────────────────────────

describe("scanJavaDomains — MyBatis XML mybatis path", () => {
  let tmp;
  beforeEach(() => { tmp = makeTmpDir(); });
  afterEach(() => cleanup(tmp));

  it("counts XML mappers from mybatis/mappers/ path", async () => {
    touch(path.join(tmp, "src/main/java/com/example/order/controller/OrderController.java"));
    touch(path.join(tmp, "src/main/java/com/example/order/service/OrderService.java"));
    touch(path.join(tmp, "src/main/resources/mybatis/mappers/order/OrderMapper.xml"));

    const stack = { language: "java", buildTool: "gradle" };
    const { backendDomains } = await scanJavaDomains(stack, tmp);

    const order = backendDomains.find(d => d.name === "order");
    assert.ok(order, "should detect order domain");
    assert.ok(order.xmlMappers >= 1, "should count XML from mybatis/ path");
  });
});

// ─── v2.5.0: multi-module source roots ────────────────────────
describe("scanJavaDomains — multi-module source roots (v2.5.0)", () => {
  let tmp;
  beforeEach(() => { tmp = makeTmpDir(); });
  afterEach(() => cleanup(tmp));

  it("finds domain-first layouts under <module>/src/main/java with the primary patterns (not the fallback)", async () => {
    touch(path.join(tmp, "api/src/main/java/com/acme/user/controller/UserController.java"));
    touch(path.join(tmp, "api/src/main/java/com/acme/order/controller/OrderController.java"));
    touch(path.join(tmp, "core/src/main/java/com/acme/user/service/UserService.java"));
    touch(path.join(tmp, "core/src/main/java/com/acme/order/service/OrderService.java"));
    touch(path.join(tmp, "core/src/main/resources/mapper/user/UserMapper.xml"));
    // build output must not be scanned
    touch(path.join(tmp, "api/build/classes/java/main/com/acme/ghost/controller/GhostController.java"));

    const { backendDomains, rootPackage } = await scanJavaDomains({ language: "java" }, tmp);
    assert.equal(rootPackage, "com.acme");
    const names = backendDomains.map(d => d.name).sort();
    assert.deepEqual(names, ["order", "user"]);
    const user = backendDomains.find(d => d.name === "user");
    assert.equal(user.pattern, "B");
    assert.equal(user.controllers, 1);
    assert.equal(user.services, 1);
    assert.equal(user.xmlMappers, 1);
  });
});

// ─── v2.5.0 (review follow-up): flat-vs-domain-first disambiguation ────
describe("scanJavaDomains — flat guard does not swallow single-domain domain-first projects", () => {
  let tmp;
  beforeEach(() => { tmp = makeTmpDir(); });
  afterEach(() => cleanup(tmp));

  it("account/{controller/LoginController, service/AccountService, dto/LoginDto} stays Pattern B `account`", async () => {
    touch(path.join(tmp, "src/main/java/com/example/account/controller/LoginController.java"));
    touch(path.join(tmp, "src/main/java/com/example/account/controller/SignupController.java"));
    touch(path.join(tmp, "src/main/java/com/example/account/service/AccountService.java"));
    touch(path.join(tmp, "src/main/java/com/example/account/dto/LoginDto.java"));
    const { backendDomains } = await scanJavaDomains({ language: "java" }, tmp);
    assert.deepEqual(backendDomains.map(d => d.name), ["account"]);
    const acc = backendDomains[0];
    assert.equal(acc.pattern, "B");
    assert.equal(acc.controllers, 2);
    assert.equal(acc.services, 1);
    assert.equal(acc.dtos, 1);
  });

  it("a *Application.java directly in the base package is a flat signal even when a controller shares the package name", async () => {
    touch(path.join(tmp, "src/main/java/com/example/demo/DemoApplication.java"));
    touch(path.join(tmp, "src/main/java/com/example/demo/controller/DemoController.java"));
    touch(path.join(tmp, "src/main/java/com/example/demo/controller/UserController.java"));
    const { backendDomains } = await scanJavaDomains({ language: "java" }, tmp);
    assert.deepEqual(backendDomains.map(d => d.name).sort(), ["demo", "user"]);
    assert.ok(backendDomains.every(d => d.pattern === "C"));
  });

  it("multi-module with per-module packages (com.example.api / com.example.core) yields class-name domains, not module names", async () => {
    touch(path.join(tmp, "api/src/main/java/com/example/api/controller/UserController.java"));
    touch(path.join(tmp, "api/src/main/java/com/example/api/controller/OrderController.java"));
    touch(path.join(tmp, "core/src/main/java/com/example/core/service/UserService.java"));
    touch(path.join(tmp, "core/src/main/java/com/example/core/service/OrderService.java"));
    const { backendDomains, rootPackage } = await scanJavaDomains({ language: "java" }, tmp);
    assert.equal(rootPackage, "com.example");
    const names = backendDomains.map(d => d.name).sort();
    assert.deepEqual(names, ["order", "user"], "module names api/core must not become domains");
    const user = backendDomains.find(d => d.name === "user");
    assert.equal(user.pattern, "C");
    assert.equal(user.controllers, 1);
    assert.equal(user.services, 1);
  });

  it("test-fixture projects under src/test/** and buildSrc/ are not treated as modules", async () => {
    touch(path.join(tmp, "src/main/java/com/example/user/controller/UserController.java"));
    touch(path.join(tmp, "src/main/java/com/example/user/service/UserService.java"));
    touch(path.join(tmp, "src/test/resources/projects/demo/src/main/java/com/fixture/foo/controller/FooController.java"));
    touch(path.join(tmp, "src/test/resources/projects/demo/src/main/java/com/fixture/foo/service/FooService.java"));
    touch(path.join(tmp, "buildSrc/src/main/java/com/example/gradle/ConventionPlugin.java"));
    const { backendDomains, rootPackage } = await scanJavaDomains({ language: "java" }, tmp);
    assert.equal(rootPackage, "com.example.user");
    assert.deepEqual(backendDomains.map(d => d.name), ["user"]);
  });
});

describe("scanJavaDomains — flat controllers next to domain-first packages are re-attached by class name (review follow-up 2)", () => {
  let tmp;
  beforeEach(() => { tmp = makeTmpDir(); });
  afterEach(() => cleanup(tmp));

  it("demo/controller/HomeController.java + demo/user/controller/UserController.java → [home (C), user (B)]", async () => {
    touch(path.join(tmp, "src/main/java/com/example/demo/DemoApplication.java"));
    touch(path.join(tmp, "src/main/java/com/example/demo/controller/HomeController.java"));
    touch(path.join(tmp, "src/main/java/com/example/demo/user/controller/UserController.java"));
    touch(path.join(tmp, "src/main/java/com/example/demo/user/service/UserService.java"));
    const { backendDomains } = await scanJavaDomains({ language: "java" }, tmp);
    const byName = Object.fromEntries(backendDomains.map(d => [d.name, d]));
    assert.deepEqual(Object.keys(byName).sort(), ["home", "user"], "HomeController must not be dropped from every domain");
    assert.equal(byName.user.pattern, "B");
    assert.equal(byName.home.pattern, "C");
    assert.equal(byName.home.controllers, 1);
    assert.ok(!("demo" in byName), "no package-named pseudo-domain");
  });
});

// ─── v2.5.1: legacy source roots (Ant / Eclipse WTP / bare src) ─────────

describe("scanJavaDomains — legacy source roots", () => {
  let tmp;
  beforeEach(() => { tmp = makeTmpDir(); });
  afterEach(() => cleanup(tmp));

  const write = (rel, content) => { const p = path.join(tmp, rel); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, content); };

  it("Ant: <javac srcdir=\"${src}\"> resolves the property and roots the scan there (Pattern C)", async () => {
    write("build.xml", `<project><property name="src" value="src"/><target name="compile"><javac srcdir="\${src}" source="1.6"/></target></project>`);
    for (const n of ["User", "Order", "Product"]) {
      touch(path.join(tmp, `src/com/acme/erp/controller/${n}Controller.java`));
      touch(path.join(tmp, `src/com/acme/erp/service/${n}Service.java`));
    }
    const stack = { language: "java", buildTool: "ant" };
    const { backendDomains } = await scanJavaDomains(stack, tmp);
    assert.deepEqual(backendDomains.map(d => d.name).sort(), ["order", "product", "user"]);
    assert.equal(backendDomains[0].pattern, "C");
    assert.equal(stack.sourceLayout, "legacy");
  });

  it("Eclipse: <classpathentry kind=\"src\"> is authoritative; a `test` folder outside src/test is NOT a root", async () => {
    // `test/` is not under src/test/, so JAVA_ROOT_IGNORE alone would not
    // exclude it — the .classpath test-folder filter must.
    write(".classpath", `<classpath><classpathentry kind="src" path="JavaSource"/><classpathentry kind="src" path="test"/></classpath>`);
    touch(path.join(tmp, "JavaSource/com/acme/app/controller/UserController.java"));
    touch(path.join(tmp, "JavaSource/com/acme/app/service/UserService.java"));
    touch(path.join(tmp, "test/com/acme/app/controller/BogusController.java"));
    const stack = { language: "java" };
    const { backendDomains } = await scanJavaDomains(stack, tmp);
    assert.deepEqual(backendDomains.map(d => d.name), ["user"], "test/ must not contribute a domain");
  });

  it("legacy roots are consulted ONLY when no src/main/java exists anywhere", async () => {
    // A modern tree plus a stray top-level src/legacy/ holding *.java: the
    // scan must stay rooted at src/main/java and never pick up src/legacy.
    touch(path.join(tmp, "src/main/java/com/ex/controller/UserController.java"));
    touch(path.join(tmp, "src/main/java/com/ex/service/UserService.java"));
    touch(path.join(tmp, "src/legacy/com/old/controller/GhostController.java"));
    const stack = { language: "java", buildTool: "gradle" };
    const { backendDomains } = await scanJavaDomains(stack, tmp);
    assert.deepEqual(backendDomains.map(d => d.name), ["user"]);
    assert.equal(stack.sourceLayout, undefined, "modern layout must not be flagged legacy");
  });

  it("bare src/ with no build file at all is scanned (Pattern B domain-first)", async () => {
    touch(path.join(tmp, "src/kr/co/acme/user/controller/UserController.java"));
    touch(path.join(tmp, "src/kr/co/acme/user/service/UserService.java"));
    touch(path.join(tmp, "src/kr/co/acme/board/controller/BoardController.java"));
    const stack = { language: "java" };
    const { backendDomains } = await scanJavaDomains(stack, tmp);
    assert.deepEqual(backendDomains.map(d => d.name).sort(), ["board", "user"]);
    assert.equal(backendDomains.find(d => d.name === "user").pattern, "B");
  });

  it("src/ and src/java/ both present → the deeper one wins, no duplicate domains", async () => {
    touch(path.join(tmp, "src/java/com/acme/controller/UserController.java"));
    const stack = { language: "java" };
    const { backendDomains } = await scanJavaDomains(stack, tmp);
    assert.deepEqual(backendDomains.map(d => d.name), ["user"]);
  });
});

// ─── v2.5.3: Pattern F — package-by-feature (no layer directory) ─────────────
//
// Until v2.5.3 a domain was REGISTERED only by a layer directory in its path.
// The deep-sweep catch-all counts layer-less files but only for a domain
// something else already registered, so the layout Spring's own guide
// recommends (`com/acme/order/{OrderController,OrderService,OrderRepository}`)
// yielded zero backend domains, and in a mixed tree the one domain with a
// `controller/` dir survived while the rest silently vanished.

describe("scanJavaDomains — Pattern F (package-by-feature, v2.5.3)", () => {
  let tmp;
  beforeEach(() => { tmp = makeTmpDir(); });
  afterEach(() => cleanup(tmp));
  const stack = () => ({ language: "java", buildTool: "gradle" });
  const byName = (r) => Object.fromEntries(r.backendDomains.map(d => [d.name, d]));

  it("registers each feature package and counts files by class-name suffix", async () => {
    for (const f of [
      "order/OrderController.java", "order/OrderService.java", "order/OrderRepository.java", "order/OrderDto.java", "order/OrderEntity.java",
      "payment/PaymentController.java", "payment/PaymentService.java",
    ]) touch(path.join(tmp, "src/main/java/com/acme", f));

    const r = await scanJavaDomains(stack(), tmp);
    const d = byName(r);
    assert.deepEqual(Object.keys(d).sort(), ["order", "payment"]);
    assert.equal(d.order.pattern, "F");
    assert.equal(d.order.controllers, 1);
    assert.equal(d.order.services, 1);
    assert.equal(d.order.mappers, 1);
    assert.equal(d.order.dtos, 2, "Dto + Entity");
    assert.equal(d.order.totalFiles, 5);
    assert.equal(d.payment.totalFiles, 2);
    assert.equal(r.rootPackage, "com.acme", "root package is derived from the feature directories");
    assert.ok(!("featureDir" in d.order), "internal bookkeeping must not leak into the result");
  });

  it("neither *Application.java, nor @RestController, nor file count is required — the parent directory is the signal", async () => {
    touch(path.join(tmp, "src/main/java/com/acme/Application.java"));
    touch(path.join(tmp, "src/main/java/com/acme/order/OrderController.java"));
    touch(path.join(tmp, "src/main/java/com/acme/order/OrderService.java"));
    const r = await scanJavaDomains(stack(), tmp);
    assert.deepEqual(r.backendDomains.map(d => d.name), ["order"]);
    assert.equal(r.rootPackage, "com.acme");
  });

  it("mixed tree: a layer-dir domain no longer makes the layer-less ones vanish", async () => {
    // Pre-v2.5.3 this returned exactly ["legacy"] — order/payment's 4 files were dropped, not misattributed.
    touch(path.join(tmp, "src/main/java/com/acme/order/OrderController.java"));
    touch(path.join(tmp, "src/main/java/com/acme/order/OrderService.java"));
    touch(path.join(tmp, "src/main/java/com/acme/payment/PaymentController.java"));
    touch(path.join(tmp, "src/main/java/com/acme/payment/PaymentService.java"));
    touch(path.join(tmp, "src/main/java/com/acme/legacy/controller/LegacyController.java"));

    const d = byName(await scanJavaDomains(stack(), tmp));
    assert.deepEqual(Object.keys(d).sort(), ["legacy", "order", "payment"]);
    assert.equal(d.legacy.pattern, "B");
    assert.equal(d.legacy.controllers, 1, "the B domain is counted exactly once");
    assert.equal(d.order.pattern, "F");
    assert.equal(d.order.totalFiles, 2);
    assert.equal(d.payment.totalFiles, 2);
  });

  it("a layer-less controller attaches to a domain the supplementary scan would find, once", async () => {
    touch(path.join(tmp, "src/main/java/com/acme/order/OrderController.java"));
    touch(path.join(tmp, "src/main/java/com/acme/order/service/OrderService.java"));
    const d = byName(await scanJavaDomains(stack(), tmp));
    assert.deepEqual(Object.keys(d), ["order"]);
    assert.equal(d.order.controllers, 1);
    assert.equal(d.order.services, 1);
    assert.equal(d.order.totalFiles, 2);
  });

  it("works under Gradle/Maven modules and legacy bare src/ roots, including numbered eGovFrame controllers", async () => {
    touch(path.join(tmp, "api/src/main/java/com/acme/order/OrderController.java"));
    touch(path.join(tmp, "api/src/main/java/com/acme/order/OrderService.java"));
    touch(path.join(tmp, "core/src/main/java/com/acme/billing/BillingController.java"));
    let d = byName(await scanJavaDomains(stack(), tmp));
    assert.deepEqual(Object.keys(d).sort(), ["billing", "order"]);
    assert.equal(d.order.totalFiles, 2);

    cleanup(tmp); tmp = makeTmpDir();
    touch(path.join(tmp, "src/kr/go/egov/sample/EgovSample2Controller.java"));
    touch(path.join(tmp, "src/kr/go/egov/sample/EgovSampleServiceImpl.java"));
    touch(path.join(tmp, "src/kr/go/egov/cmmn/EgovCmmnUtil.java"));
    const r = await scanJavaDomains(stack(), tmp);
    d = byName(r);
    assert.deepEqual(Object.keys(d), ["sample"], "cmmn has no controller and is not a domain");
    assert.equal(d.sample.totalFiles, 2);
    assert.equal(r.rootPackage, "kr.go.egov");
  });

  it("does NOT register: base-package controllers (→ Pattern C by class name), layer/adapter/skip directories, or a same-named package elsewhere", async () => {
    // Initializr single-package demo: controller directly in the base package
    touch(path.join(tmp, "src/main/java/com/acme/demo/DemoApplication.java"));
    touch(path.join(tmp, "src/main/java/com/acme/demo/HelloController.java"));
    let r = await scanJavaDomains(stack(), tmp);
    assert.deepEqual(r.backendDomains.map(d => `${d.name}[${d.pattern}]`), ["hello[C]"], "demo must not become a domain");
    assert.equal(r.rootPackage, "com.acme.demo", "main-class location names the base package");

    cleanup(tmp); tmp = makeTmpDir();
    // Hexagonal: E owns it, `rest` must not become an F domain
    touch(path.join(tmp, "src/main/java/com/acme/order/adapter/in/rest/OrderController.java"));
    r = await scanJavaDomains(stack(), tmp);
    assert.deepEqual(r.backendDomains.map(d => `${d.name}[${d.pattern}]`), ["order[E]"]);

    cleanup(tmp); tmp = makeTmpDir();
    // Same-named package under another parent must not be swept into the feature count
    touch(path.join(tmp, "src/main/java/com/acme/order/OrderController.java"));
    touch(path.join(tmp, "src/main/java/com/acme/legacy/order/OrderLegacyHelper.java"));
    touch(path.join(tmp, "src/main/java/com/acme/legacy/order/OrderLegacyHelper2.java"));
    r = await scanJavaDomains(stack(), tmp);
    assert.deepEqual(r.backendDomains.map(d => d.name), ["order"]);
    assert.equal(r.backendDomains[0].totalFiles, 1, "only the feature directory the controller lives in is counted");
  });

  it("a class name containing `Constructor` does not crash the scan", async () => {
    touch(path.join(tmp, "src/main/java/com/acme/order/OrderConstructorController.java"));
    touch(path.join(tmp, "src/main/java/com/acme/order/Constructor.java"));
    const r = await scanJavaDomains(stack(), tmp);
    assert.deepEqual(r.backendDomains.map(d => d.name), ["order"]);
    assert.equal(r.backendDomains[0].totalFiles, 2);
  });

  it("healthy A/B/C/E trees are byte-for-byte unchanged in name, pattern, and counts", async () => {
    // Pattern A
    touch(path.join(tmp, "src/main/java/com/acme/controller/order/OrderController.java"));
    touch(path.join(tmp, "src/main/java/com/acme/service/order/OrderService.java"));
    let r = await scanJavaDomains(stack(), tmp);
    assert.deepEqual(r.backendDomains.map(d => `${d.name}[${d.pattern}]${d.controllers}/${d.services}`), ["order[A]1/1"]);
    // Pattern C
    cleanup(tmp); tmp = makeTmpDir();
    touch(path.join(tmp, "src/main/java/com/acme/controller/OrderController.java"));
    touch(path.join(tmp, "src/main/java/com/acme/controller/PaymentController.java"));
    r = await scanJavaDomains(stack(), tmp);
    assert.deepEqual(r.backendDomains.map(d => `${d.name}[${d.pattern}]${d.controllers}`).sort(), ["order[C]1", "payment[C]1"]);
  });
});

// ─── v2.5.3: a controller file is counted exactly once ───────────────────────
//
// Pattern B counted `{d}/controller/X.java`; when the domain had NOTHING else
// (`standardCount === 0`) the deep-sweep re-globbed `**/{d}/**/*.java`,
// walked up the same file's path, met `controller`, and counted it again.
// A scaffold-stage domain therefore reported `controllers: 2` for one file;
// adding any service/dto file hid the bug by skipping the sweep.

describe("scanJavaDomains — controller-only domain is counted once (v2.5.3)", () => {
  let tmp;
  beforeEach(() => { tmp = makeTmpDir(); });
  afterEach(() => cleanup(tmp));
  const stack = () => ({ language: "java", buildTool: "gradle" });

  it("controller-only Pattern B domain: controllers=1, totalFiles=1", async () => {
    touch(path.join(tmp, "src/main/java/com/acme/order/controller/OrderController.java"));
    const [d] = (await scanJavaDomains(stack(), tmp)).backendDomains;
    assert.equal(d.pattern, "B");
    assert.equal(d.controllers, 1);
    assert.equal(d.totalFiles, 1);
  });

  it("controller-only Pattern D (module/domain) domains: each counted once", async () => {
    touch(path.join(tmp, "src/main/java/com/acme/api/order/controller/OrderApiController.java"));
    touch(path.join(tmp, "src/main/java/com/acme/admin/order/controller/OrderAdminController.java"));
    const r = await scanJavaDomains(stack(), tmp);
    for (const d of r.backendDomains) {
      assert.equal(d.pattern, "D", d.name);
      assert.equal(d.controllers, 1, `${d.name} must be counted once`);
    }
  });

  it("the deep-sweep still fires and counts inverted `{layer}/{domain}/` files — without re-counting the controller", async () => {
    // Pattern B registers `settle` from front/settle/controller/. Its only other file
    // lives under core/inventory/handler/settle/ (layer before domain), reachable only
    // via the sweep, and the sweep's glob also returns the controller itself.
    // Pre-v2.5.3: controllers=2 (the same file twice) + services=1.
    touch(path.join(tmp, "src/main/java/org/foo/front/settle/controller/SettleController.java"));
    touch(path.join(tmp, "src/main/java/org/foo/core/inventory/handler/settle/SettleHandler.java"));
    const settle = (await scanJavaDomains(stack(), tmp)).backendDomains.find(d => d.name === "settle");
    assert.ok(settle);
    assert.equal(settle.controllers, 1, "the controller must not be re-counted by the sweep");
    assert.equal(settle.services, 1, "the inverted handler must still be found by the sweep");
    assert.equal(settle.totalFiles, 2);
  });
});

// ─── v2.5.3 review fixes ─────────────────────────────────────────────────────
//
// Three defects found by re-running the v2.5.3 working tree against the v2.5.2
// scanner on the same fixtures: a nested feature package was counted twice, the
// base-package rule fired on any single-domain project, and a package named
// after an Object.prototype member aborted `init`.

describe("scanJavaDomains — Pattern F nesting and base-package rule (v2.5.3 fixes)", () => {
  let tmp;
  beforeEach(() => { tmp = makeTmpDir(); });
  afterEach(() => cleanup(tmp));
  const stack = () => ({ language: "java", buildTool: "gradle" });
  const byName = (r) => Object.fromEntries(r.backendDomains.map(d => [d.name, d]));
  const total = (r) => r.backendDomains.reduce((s, d) => s + d.totalFiles, 0);

  it("a nested feature package is counted by itself only, never by its parent too", async () => {
    // The F glob is recursive so `order/dto/` belongs to `order` — but
    // `order/item/` holds a controller, so it is its own domain. Counting its
    // files in BOTH reported 7 files for 5 (the parent's `services` inflated
    // while its `controllers` stayed right, the ledger already covering those).
    for (const f of ["order/OrderController.java", "order/OrderService.java",
                     "order/item/ItemController.java", "order/item/ItemService.java", "order/item/ItemRepository.java"]) {
      touch(path.join(tmp, "src/main/java/com/acme", f));
    }
    const r = await scanJavaDomains(stack(), tmp);
    const d = byName(r);
    assert.equal(d.order.totalFiles, 2, "order owns OrderController + OrderService only");
    assert.equal(d.order.services, 1);
    assert.equal(d.item.totalFiles, 3);
    assert.equal(total(r), 5, "every .java file counted exactly once");
  });

  it("three levels of nesting still sum to the real file count", async () => {
    for (const f of ["shop/ShopController.java", "shop/order/OrderController.java",
                     "shop/order/pay/PayController.java", "shop/order/pay/PayService.java"]) {
      touch(path.join(tmp, "src/main/java/com/acme", f));
    }
    const r = await scanJavaDomains(stack(), tmp);
    const d = byName(r);
    assert.deepEqual(Object.keys(d).sort(), ["order", "pay", "shop"]);
    assert.equal(d.shop.totalFiles, 1);
    assert.equal(d.order.totalFiles, 1);
    assert.equal(d.pay.totalFiles, 2);
    assert.equal(total(r), 4);
  });

  it("a sub-package with no controller of its own still belongs to the feature", async () => {
    touch(path.join(tmp, "src/main/java/com/acme/order/OrderController.java"));
    touch(path.join(tmp, "src/main/java/com/acme/order/dto/OrderDto.java"));
    touch(path.join(tmp, "src/main/java/com/acme/order/internal/Helper.java"));
    const r = await scanJavaDomains(stack(), tmp);
    const [d] = r.backendDomains;
    assert.equal(d.name, "order");
    assert.equal(d.pattern, "F");
    assert.equal(d.totalFiles, 3, "dto/ and internal/ are the feature's own sub-packages");
  });

  it("a layer-less controller joins the domain that already owns its directory", async () => {
    // `rootPackage` IS the single domain's directory in a single-domain project,
    // so the old `relDir === rootPkgPath` signal read `order/` as an Initializr
    // base package and produced a second domain literally named `orderfacade`.
    touch(path.join(tmp, "src/main/java/com/acme/order/adapter/in/web/OrderController.java"));
    touch(path.join(tmp, "src/main/java/com/acme/order/OrderFacadeController.java"));
    touch(path.join(tmp, "src/main/java/com/acme/order/application/OrderService.java"));
    const r = await scanJavaDomains(stack(), tmp);
    assert.deepEqual(r.backendDomains.map(d => d.name), ["order"], "no `orderfacade` domain");
    assert.equal(r.backendDomains[0].pattern, "E");
    assert.equal(r.backendDomains[0].controllers, 2);
    assert.equal(total(r), 3);
  });

  it("the Initializr base-package rule still fires — it keys on where *Application.java lives", async () => {
    touch(path.join(tmp, "src/main/java/com/acme/demo/DemoApplication.java"));
    touch(path.join(tmp, "src/main/java/com/acme/demo/HelloController.java"));
    let r = await scanJavaDomains(stack(), tmp);
    assert.deepEqual(r.backendDomains.map(d => `${d.name}[${d.pattern}]`), ["hello[C]"]);

    // Mixed: base-package controller (C) + layer-dir domain (B) + feature domain (F)
    cleanup(tmp); tmp = makeTmpDir();
    touch(path.join(tmp, "src/main/java/com/acme/demo/DemoApplication.java"));
    touch(path.join(tmp, "src/main/java/com/acme/demo/HomeController.java"));
    touch(path.join(tmp, "src/main/java/com/acme/demo/user/controller/UserController.java"));
    touch(path.join(tmp, "src/main/java/com/acme/demo/pay/PayController.java"));
    r = await scanJavaDomains(stack(), tmp);
    assert.deepEqual(r.backendDomains.map(d => `${d.name}[${d.pattern}]`).sort(), ["home[C]", "pay[F]", "user[B]"]);
    assert.equal(r.backendDomains.find(d => d.name === "user").controllers, 1, "counted once, not twice");
  });

  it("a package named after an Object.prototype member neither aborts the scan nor pollutes Object", async () => {
    // `domainPaths["constructor"]` resolved to Object.prototype.constructor, so
    // `if (!map[d]) map[d] = []` was skipped and `.push` threw — an `init` abort.
    touch(path.join(tmp, "src/main/java/com/acme/constructor/controller/AController.java"));
    touch(path.join(tmp, "src/main/java/com/acme/order/controller/OrderController.java"));
    touch(path.join(tmp, "src/main/java/com/acme/order/service/OrderService.java"));
    const r = await scanJavaDomains(stack(), tmp);
    assert.ok(r.backendDomains.some(d => d.name === "constructor"), "the package is a domain like any other");
    assert.ok(r.backendDomains.some(d => d.name === "order"));
    assert.equal(Object.prototype.hasOwnProperty.call(Object, "controllers"), false, "no global mutation");

    cleanup(tmp); tmp = makeTmpDir();
    // Same through the Pattern F path (no layer directory).
    touch(path.join(tmp, "src/main/java/com/acme/toString/ToStringController.java"));
    touch(path.join(tmp, "src/main/java/com/acme/order/OrderController.java"));
    const r2 = await scanJavaDomains(stack(), tmp);
    assert.deepEqual(r2.backendDomains.map(d => d.name).sort(), ["order", "toString"]);
  });
});
