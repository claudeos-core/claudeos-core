/**
 * ClaudeOS-Core — Kotlin Scanner Tests
 *
 * Tests scanKotlinDomains and resolveSharedQueryDomains for:
 *   - Multi-module domain detection (command/query/bff)
 *   - CQRS domain merging (command + query → single domain)
 *   - Shared query module resolution (Pattern A: package-based, B-1: existing match, B-2: PascalCase)
 *   - Single-module fallback (domain/controller/ pattern)
 *   - Library module detection
 *   - Root package extraction
 *   - Generic name guarding (common-query → common-query, not common)
 */

const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const os = require("os");

const { scanKotlinDomains, resolveSharedQueryDomains } = require("../plan-installer/scanners/scan-kotlin");

function makeTmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "ccore-kt-"));
}
function cleanup(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}
function touch(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, "// placeholder\n");
}

// ─── Multi-module detection ─────────────────────────────────

describe("scanKotlinDomains — multi-module", () => {
  let tmp;
  beforeEach(() => { tmp = makeTmpDir(); });
  afterEach(() => cleanup(tmp));

  it("detects domains from servers/command/*/", async () => {
    touch(path.join(tmp, "servers/command/reservation-command-server/src/main/kotlin/com/example/reservation/controller/ReservationController.kt"));
    touch(path.join(tmp, "servers/command/reservation-command-server/src/main/kotlin/com/example/reservation/service/ReservationService.kt"));
    touch(path.join(tmp, "servers/command/reservation-command-server/src/main/kotlin/com/example/reservation/dto/ReservationDto.kt"));

    const stack = { language: "kotlin", buildTool: "gradle" };
    const { backendDomains, rootPackage } = await scanKotlinDomains(stack, tmp);

    assert.ok(backendDomains.length >= 1);
    const res = backendDomains.find(d => d.name === "reservation");
    assert.ok(res, "should detect reservation domain");
    assert.ok(res.serverTypes.includes("command"));
    assert.equal(res.pattern, "kotlin-multimodule");
    assert.ok(rootPackage, "should extract rootPackage");
  });

  it("merges command and query modules of same domain", async () => {
    touch(path.join(tmp, "servers/command/booking-command-server/src/main/kotlin/com/example/booking/controller/BookingCommandController.kt"));
    touch(path.join(tmp, "servers/command/booking-command-server/src/main/kotlin/com/example/booking/service/BookingCommandService.kt"));
    touch(path.join(tmp, "servers/query/booking-query-server/src/main/kotlin/com/example/booking/controller/BookingQueryController.kt"));
    touch(path.join(tmp, "servers/query/booking-query-server/src/main/kotlin/com/example/booking/service/BookingQueryService.kt"));

    const stack = { language: "kotlin", buildTool: "gradle" };
    const { backendDomains } = await scanKotlinDomains(stack, tmp);

    const booking = backendDomains.find(d => d.name === "booking");
    assert.ok(booking, "should merge into single booking domain");
    assert.ok(booking.serverTypes.includes("command"));
    assert.ok(booking.serverTypes.includes("query"));
    assert.equal(booking.controllers, 2);
    assert.equal(booking.services, 2);
    assert.equal(booking.totalFiles, 4);
  });

  it("detects bff module type", async () => {
    touch(path.join(tmp, "servers/pms-bff-server/src/main/kotlin/com/example/pms/controller/PmsController.kt"));

    const stack = { language: "kotlin", buildTool: "gradle" };
    const { backendDomains } = await scanKotlinDomains(stack, tmp);

    const pms = backendDomains.find(d => d.name === "pms");
    assert.ok(pms);
    assert.ok(pms.serverTypes.includes("bff"));
  });

  it("detects standalone server (no CQRS suffix)", async () => {
    touch(path.join(tmp, "servers/iam-server/src/main/kotlin/com/example/iam/controller/IamController.kt"));
    touch(path.join(tmp, "servers/iam-server/src/main/kotlin/com/example/iam/service/IamService.kt"));

    const stack = { language: "kotlin", buildTool: "gradle" };
    const { backendDomains } = await scanKotlinDomains(stack, tmp);

    const iam = backendDomains.find(d => d.name === "iam");
    assert.ok(iam, "should detect iam domain");
    assert.ok(iam.serverTypes.includes("standalone"));
  });
});

// ─── Generic name guarding ──────────────────────────────────

describe("scanKotlinDomains — generic name guard", () => {
  let tmp;
  beforeEach(() => { tmp = makeTmpDir(); });
  afterEach(() => cleanup(tmp));

  it("appends server type suffix for generic domain names (common/shared)", async () => {
    touch(path.join(tmp, "servers/query/common-query-server/src/main/kotlin/com/example/common/controller/CommonController.kt"));

    const stack = { language: "kotlin", buildTool: "gradle" };
    const { backendDomains } = await scanKotlinDomains(stack, tmp);

    // "common" is generic — should become "common-query" to avoid ambiguity
    const found = backendDomains.find(d => d.name === "common-query");
    assert.ok(found, "should suffix generic name with server type");
  });
});

// ─── Library module detection ───────────────────────────────

describe("scanKotlinDomains — library modules", () => {
  let tmp;
  beforeEach(() => { tmp = makeTmpDir(); });
  afterEach(() => cleanup(tmp));

  it("detects shared-lib as a domain", async () => {
    touch(path.join(tmp, "shared-lib/src/main/kotlin/com/example/shared/dto/CommonDto.kt"));
    touch(path.join(tmp, "shared-lib/src/main/kotlin/com/example/shared/service/CommonService.kt"));

    const stack = { language: "kotlin", buildTool: "gradle" };
    const { backendDomains } = await scanKotlinDomains(stack, tmp);

    // shared-lib matches */src/main/kotlin/ glob → detected as multimodule first
    // (library scan only catches libs NOT already captured by multimodule)
    const lib = backendDomains.find(d => d.name === "shared-lib");
    assert.ok(lib, "should detect shared-lib");
    assert.equal(lib.totalFiles, 2);
  });
});

// ─── resolveSharedQueryDomains ──────────────────────────────

describe("resolveSharedQueryDomains", () => {
  it("Pattern A: redistributes files by package-based domain extraction", () => {
    const backendDomains = [
      {
        name: "common-query", type: "backend",
        controllers: 5, services: 5, mappers: 0, dtos: 3, totalFiles: 13,
        modules: ["common-query-server"], serverTypes: ["query"],
        pattern: "kotlin-multimodule",
      },
      {
        name: "reservation", type: "backend",
        controllers: 2, services: 2, mappers: 0, dtos: 1, totalFiles: 5,
        modules: ["reservation-command-server"], serverTypes: ["command"],
        pattern: "kotlin-multimodule",
      },
    ];

    // Files in common-query-server with reservation package path
    const ktFiles = [
      "servers/query/common-query-server/src/main/kotlin/com/example/reservation/controller/ReservationQueryController.kt",
      "servers/query/common-query-server/src/main/kotlin/com/example/reservation/service/ReservationQueryService.kt",
      "servers/query/common-query-server/src/main/kotlin/com/example/reservation/dto/ReservationResponse.kt",
      // Non-reservation file
      "servers/query/common-query-server/src/main/kotlin/com/example/stats/controller/StatsController.kt",
    ];

    resolveSharedQueryDomains(backendDomains, ktFiles);

    const reservation = backendDomains.find(d => d.name === "reservation");
    assert.ok(reservation);
    assert.ok(reservation.serverTypes.includes("query"), "should add query server type");
    assert.ok(reservation.totalFiles > 5, "should have increased totalFiles from merge");

    // Stats should be created as new domain
    const stats = backendDomains.find(d => d.name === "stats");
    assert.ok(stats, "should create new stats domain from shared module");
  });

  it("Pattern B-1: matches class name against existing domain names", () => {
    const backendDomains = [
      {
        name: "common-query", type: "backend",
        controllers: 3, services: 3, mappers: 0, dtos: 0, totalFiles: 6,
        modules: ["common-query-server"], serverTypes: ["query"],
        pattern: "kotlin-multimodule",
      },
      {
        name: "payment", type: "backend",
        controllers: 1, services: 1, mappers: 0, dtos: 0, totalFiles: 2,
        modules: ["payment-command-server"], serverTypes: ["command"],
        pattern: "kotlin-multimodule",
      },
    ];

    // File whose package doesn't reveal domain, but class name matches "payment"
    const ktFiles = [
      "servers/query/common-query-server/src/main/kotlin/com/example/query/controller/PaymentQueryController.kt",
    ];

    resolveSharedQueryDomains(backendDomains, ktFiles);

    const payment = backendDomains.find(d => d.name === "payment");
    assert.ok(payment);
    assert.ok(payment.controllers > 1, "should merge controller count from shared module");
  });

  it("Pattern B-2: extracts domain from PascalCase class name", () => {
    const backendDomains = [
      {
        name: "common-query", type: "backend",
        controllers: 2, services: 0, mappers: 0, dtos: 0, totalFiles: 2,
        modules: ["common-query-server"], serverTypes: ["query"],
        pattern: "kotlin-multimodule",
      },
    ];

    // Class name "InventoryReadService.kt" → domain "inventory"
    const ktFiles = [
      "servers/query/common-query-server/src/main/kotlin/com/example/query/service/InventoryReadService.kt",
    ];

    resolveSharedQueryDomains(backendDomains, ktFiles);

    const inventory = backendDomains.find(d => d.name === "inventory");
    assert.ok(inventory, "should create inventory domain from PascalCase extraction");
    assert.equal(inventory.resolvedFrom, "common-query");
  });

  it("no-op when no shared modules exist", () => {
    const backendDomains = [
      {
        name: "reservation", type: "backend",
        controllers: 2, services: 2, mappers: 0, dtos: 1, totalFiles: 5,
        modules: ["reservation-command-server"], serverTypes: ["command"],
        pattern: "kotlin-multimodule",
      },
    ];
    const original = JSON.parse(JSON.stringify(backendDomains));
    resolveSharedQueryDomains(backendDomains, []);
    assert.deepEqual(backendDomains, original, "should not modify when no shared modules");
  });

  it("removes fully resolved shared module entries", () => {
    const backendDomains = [
      {
        name: "common-query", type: "backend",
        controllers: 1, services: 0, mappers: 0, dtos: 0, totalFiles: 1,
        modules: ["common-query-server"], serverTypes: ["query"],
        pattern: "kotlin-multimodule",
      },
      {
        name: "order", type: "backend",
        controllers: 1, services: 1, mappers: 0, dtos: 0, totalFiles: 2,
        modules: ["order-command-server"], serverTypes: ["command"],
        pattern: "kotlin-multimodule",
      },
    ];

    const ktFiles = [
      "servers/query/common-query-server/src/main/kotlin/com/example/order/controller/OrderQueryController.kt",
    ];

    resolveSharedQueryDomains(backendDomains, ktFiles);

    const commonQuery = backendDomains.find(d => d.name === "common-query");
    assert.ok(!commonQuery, "fully resolved shared module should be removed");
    const order = backendDomains.find(d => d.name === "order");
    assert.ok(order);
    assert.ok(order.totalFiles > 2, "order should have absorbed the file");
  });
});

// ─── Single-module fallback ─────────────────────────────────

describe("scanKotlinDomains — single-module fallback", () => {
  let tmp;
  beforeEach(() => { tmp = makeTmpDir(); });
  afterEach(() => cleanup(tmp));

  it("detects domains from domain/controller/ in single-module project", async () => {
    touch(path.join(tmp, "src/main/kotlin/com/example/reservation/controller/ReservationController.kt"));
    touch(path.join(tmp, "src/main/kotlin/com/example/reservation/service/ReservationService.kt"));
    touch(path.join(tmp, "src/main/kotlin/com/example/reservation/repository/ReservationRepository.kt"));
    touch(path.join(tmp, "src/main/kotlin/com/example/member/controller/MemberController.kt"));
    touch(path.join(tmp, "src/main/kotlin/com/example/member/dto/MemberDto.kt"));

    const stack = { language: "kotlin", buildTool: "gradle" };
    const { backendDomains } = await scanKotlinDomains(stack, tmp);

    const res = backendDomains.find(d => d.name === "reservation");
    const mem = backendDomains.find(d => d.name === "member");
    assert.ok(res, "should detect reservation");
    assert.ok(mem, "should detect member");
    assert.equal(res.pattern, "kotlin-single");
    assert.equal(res.controllers, 1);
    assert.equal(res.services, 1);
    assert.equal(res.mappers, 1);
  });

  it("skips common/config/util directories in single-module", async () => {
    touch(path.join(tmp, "src/main/kotlin/com/example/common/service/CommonService.kt"));
    touch(path.join(tmp, "src/main/kotlin/com/example/config/service/ConfigService.kt"));
    touch(path.join(tmp, "src/main/kotlin/com/example/util/service/UtilService.kt"));
    touch(path.join(tmp, "src/main/kotlin/com/example/order/controller/OrderController.kt"));

    const stack = { language: "kotlin", buildTool: "gradle" };
    const { backendDomains } = await scanKotlinDomains(stack, tmp);

    const names = backendDomains.map(d => d.name);
    assert.ok(!names.includes("common"));
    assert.ok(!names.includes("config"));
    assert.ok(!names.includes("util"));
    assert.ok(names.includes("order"));
  });

  it("returns empty when no .kt files exist", async () => {
    touch(path.join(tmp, "src/main/java/com/example/App.java"));

    const stack = { language: "kotlin", buildTool: "gradle" };
    const { backendDomains } = await scanKotlinDomains(stack, tmp);
    assert.equal(backendDomains.length, 0);
  });
});

// ─── Root package extraction ────────────────────────────────

describe("scanKotlinDomains — root package", () => {
  let tmp;
  beforeEach(() => { tmp = makeTmpDir(); });
  afterEach(() => cleanup(tmp));

  it("extracts root package from controller path in multi-module", async () => {
    touch(path.join(tmp, "servers/iam-server/src/main/kotlin/com/example/app/iam/controller/IamController.kt"));
    touch(path.join(tmp, "servers/iam-server/src/main/kotlin/com/example/app/iam/service/IamService.kt"));

    const stack = { language: "kotlin", buildTool: "gradle" };
    const { rootPackage } = await scanKotlinDomains(stack, tmp);
    assert.ok(rootPackage, "should extract rootPackage");
    assert.ok(rootPackage.startsWith("com.example"), `rootPackage should start with com.example, got: ${rootPackage}`);
  });
});
