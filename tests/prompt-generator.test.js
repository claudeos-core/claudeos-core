/**
 * ClaudeOS-Core — Prompt Generator + scan-node + scan-python Tests
 *
 * Tests:
 *   - prompt-generator: single-stack, multi-stack combine, language injection
 *   - scan-node: Express/NestJS/Fastify domain detection
 *   - scan-python: Django/FastAPI domain detection
 */

const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const os = require("os");

const { generatePrompts } = require("../plan-installer/prompt-generator");
const { scanNodeDomains } = require("../plan-installer/scanners/scan-node");
const { scanPythonDomains } = require("../plan-installer/scanners/scan-python");

function makeTmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "ccore-pg-"));
}
function cleanup(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}
function mkdirp(dir) {
  fs.mkdirSync(dir, { recursive: true });
}
function writeFile(filePath, content) {
  mkdirp(path.dirname(filePath));
  fs.writeFileSync(filePath, content);
}
function touch(filePath) {
  writeFile(filePath, "// placeholder\n");
}

// ─── prompt-generator ───────────────────────────────────────

describe("generatePrompts — single stack", () => {
  let tmpTemplates, tmpGenerated;
  beforeEach(() => {
    tmpTemplates = makeTmpDir();
    tmpGenerated = makeTmpDir();
    // Create minimal template structure
    writeFile(path.join(tmpTemplates, "common/header.md"), "# HEADER\n\n");
    writeFile(path.join(tmpTemplates, "common/pass3-footer.md"), "\n# FOOTER\n");
    writeFile(path.join(tmpTemplates, "common/lang-instructions.json"), JSON.stringify({
      instructions: { ko: "\n## LANG: Korean\n" },
      labels: { ko: "Korean" },
    }));
    writeFile(path.join(tmpTemplates, "java-spring/pass1.md"), "Analyze {{DOMAIN_GROUP}} group {{PASS_NUM}}.\n");
    writeFile(path.join(tmpTemplates, "java-spring/pass2.md"), "Merge all pass1 results.\n");
    writeFile(path.join(tmpTemplates, "java-spring/pass3.md"), "1. Generate backend standards.\n2. Generate rules.\n");
  });
  afterEach(() => { cleanup(tmpTemplates); cleanup(tmpGenerated); });

  it("generates pass1-backend-prompt.md with template body", () => {
    const templates = { backend: "java-spring", frontend: null };
    generatePrompts(templates, "en", tmpTemplates, tmpGenerated);

    const pass1 = fs.readFileSync(path.join(tmpGenerated, "pass1-backend-prompt.md"), "utf-8");
    assert.ok(pass1.includes("# HEADER"), "should include header");
    assert.ok(pass1.includes("Analyze"), "should include template body");
  });

  it("generates pass2-prompt.md", () => {
    const templates = { backend: "java-spring", frontend: null };
    generatePrompts(templates, "en", tmpTemplates, tmpGenerated);

    const pass2 = fs.readFileSync(path.join(tmpGenerated, "pass2-prompt.md"), "utf-8");
    assert.ok(pass2.includes("Merge all pass1"), "should include pass2 body");
  });

  it("generates pass3-prompt.md with header + body + footer", () => {
    const templates = { backend: "java-spring", frontend: null };
    generatePrompts(templates, "en", tmpTemplates, tmpGenerated);

    const pass3 = fs.readFileSync(path.join(tmpGenerated, "pass3-prompt.md"), "utf-8");
    assert.ok(pass3.includes("# HEADER"), "should include header");
    assert.ok(pass3.includes("Generate backend standards"), "should include body");
    assert.ok(pass3.includes("# FOOTER"), "should include footer");
  });

  it("injects language instruction for non-English", () => {
    const templates = { backend: "java-spring", frontend: null };
    generatePrompts(templates, "ko", tmpTemplates, tmpGenerated);

    const pass3 = fs.readFileSync(path.join(tmpGenerated, "pass3-prompt.md"), "utf-8");
    assert.ok(pass3.includes("LANG: Korean"), "should inject Korean language instruction");
  });

  it("does not inject language instruction for English", () => {
    const templates = { backend: "java-spring", frontend: null };
    generatePrompts(templates, "en", tmpTemplates, tmpGenerated);

    const pass3 = fs.readFileSync(path.join(tmpGenerated, "pass3-prompt.md"), "utf-8");
    assert.ok(!pass3.includes("LANG:"), "should not inject language for English");
  });
});

describe("generatePrompts — multi-stack combine", () => {
  let tmpTemplates, tmpGenerated;
  beforeEach(() => {
    tmpTemplates = makeTmpDir();
    tmpGenerated = makeTmpDir();
    writeFile(path.join(tmpTemplates, "common/header.md"), "# HEADER\n\n");
    writeFile(path.join(tmpTemplates, "common/pass3-footer.md"), "\n# FOOTER\n");
    writeFile(path.join(tmpTemplates, "common/lang-instructions.json"), JSON.stringify({ instructions: {}, labels: {} }));
    writeFile(path.join(tmpTemplates, "java-spring/pass1.md"), "Backend pass1.\n");
    writeFile(path.join(tmpTemplates, "java-spring/pass2.md"), "Backend pass2.\n");
    writeFile(path.join(tmpTemplates, "java-spring/pass3.md"), "1. Generate backend standards.\n");
    writeFile(path.join(tmpTemplates, "node-nextjs/pass1.md"), "Frontend pass1.\n");
    writeFile(path.join(tmpTemplates, "node-nextjs/pass2.md"), "Frontend pass2.\n");
    writeFile(path.join(tmpTemplates, "node-nextjs/pass3.md"), "1. frontend component standards.\n2. frontend routing standards.\n3. frontend data-fetching standards.\n4. backend api patterns.\n");
  });
  afterEach(() => { cleanup(tmpTemplates); cleanup(tmpGenerated); });

  it("generates both pass1-backend-prompt.md and pass1-frontend-prompt.md", () => {
    const templates = { backend: "java-spring", frontend: "node-nextjs" };
    generatePrompts(templates, "en", tmpTemplates, tmpGenerated);

    assert.ok(fs.existsSync(path.join(tmpGenerated, "pass1-backend-prompt.md")));
    assert.ok(fs.existsSync(path.join(tmpGenerated, "pass1-frontend-prompt.md")));

    const be = fs.readFileSync(path.join(tmpGenerated, "pass1-backend-prompt.md"), "utf-8");
    const fe = fs.readFileSync(path.join(tmpGenerated, "pass1-frontend-prompt.md"), "utf-8");
    assert.ok(be.includes("Backend pass1"));
    assert.ok(fe.includes("Frontend pass1"));
  });

  it("combines backend + frontend sections in pass3-prompt.md", () => {
    const templates = { backend: "java-spring", frontend: "node-nextjs" };
    generatePrompts(templates, "en", tmpTemplates, tmpGenerated);

    const pass3 = fs.readFileSync(path.join(tmpGenerated, "pass3-prompt.md"), "utf-8");
    assert.ok(pass3.includes("Generate backend standards"), "should include backend body");
    assert.ok(pass3.includes("Additional: Frontend generation targets"), "should include frontend separator");
    // Frontend sections with matching keywords should be included
    assert.ok(pass3.includes("component") || pass3.includes("routing") || pass3.includes("data-fetch"),
      "should include frontend-specific sections");
    assert.ok(pass3.includes("# FOOTER"), "should include footer");
  });

  it("uses primary template (backend) for pass2", () => {
    const templates = { backend: "java-spring", frontend: "node-nextjs" };
    generatePrompts(templates, "en", tmpTemplates, tmpGenerated);

    const pass2 = fs.readFileSync(path.join(tmpGenerated, "pass2-prompt.md"), "utf-8");
    assert.ok(pass2.includes("Backend pass2"), "pass2 should use backend template");
    assert.ok(!pass2.includes("Frontend pass2"), "pass2 should not include frontend template");
  });
});

describe("generatePrompts — frontend only", () => {
  let tmpTemplates, tmpGenerated;
  beforeEach(() => {
    tmpTemplates = makeTmpDir();
    tmpGenerated = makeTmpDir();
    writeFile(path.join(tmpTemplates, "common/header.md"), "# HEADER\n\n");
    writeFile(path.join(tmpTemplates, "common/pass3-footer.md"), "\n# FOOTER\n");
    writeFile(path.join(tmpTemplates, "common/lang-instructions.json"), JSON.stringify({ instructions: {}, labels: {} }));
    writeFile(path.join(tmpTemplates, "node-nextjs/pass1.md"), "Frontend pass1.\n");
    writeFile(path.join(tmpTemplates, "node-nextjs/pass2.md"), "Frontend pass2.\n");
    writeFile(path.join(tmpTemplates, "node-nextjs/pass3.md"), "1. frontend standards.\n");
  });
  afterEach(() => { cleanup(tmpTemplates); cleanup(tmpGenerated); });

  it("generates pass1-frontend-prompt.md when only frontend template", () => {
    const templates = { backend: null, frontend: "node-nextjs" };
    generatePrompts(templates, "en", tmpTemplates, tmpGenerated);

    assert.ok(fs.existsSync(path.join(tmpGenerated, "pass1-frontend-prompt.md")));
    assert.ok(!fs.existsSync(path.join(tmpGenerated, "pass1-backend-prompt.md")));
  });

  it("pass3 does not include multi-stack separator", () => {
    const templates = { backend: null, frontend: "node-nextjs" };
    generatePrompts(templates, "en", tmpTemplates, tmpGenerated);

    const pass3 = fs.readFileSync(path.join(tmpGenerated, "pass3-prompt.md"), "utf-8");
    assert.ok(!pass3.includes("Additional: Frontend generation targets"), "should not have multi-stack separator");
  });
});

describe("generatePrompts — missing templates", () => {
  let tmpTemplates, tmpGenerated;
  beforeEach(() => {
    tmpTemplates = makeTmpDir();
    tmpGenerated = makeTmpDir();
    writeFile(path.join(tmpTemplates, "common/header.md"), "# HEADER\n\n");
    writeFile(path.join(tmpTemplates, "common/pass3-footer.md"), "\n# FOOTER\n");
    writeFile(path.join(tmpTemplates, "common/lang-instructions.json"), JSON.stringify({ instructions: {}, labels: {} }));
  });
  afterEach(() => { cleanup(tmpTemplates); cleanup(tmpGenerated); });

  it("does not crash when template files are missing", () => {
    const templates = { backend: "nonexistent-stack", frontend: null };
    // Should not throw
    generatePrompts(templates, "en", tmpTemplates, tmpGenerated);
    // pass3 is generated with header+footer even without body (graceful degradation)
    // The important thing is no crash
    assert.ok(true, "should not throw");
  });
});

describe("generatePrompts — strips header/footer from template body", () => {
  let tmpTemplates, tmpGenerated;
  beforeEach(() => {
    tmpTemplates = makeTmpDir();
    tmpGenerated = makeTmpDir();
    writeFile(path.join(tmpTemplates, "common/header.md"), "# HEADER\n\n");
    writeFile(path.join(tmpTemplates, "common/pass3-footer.md"), "\n# FOOTER\n");
    writeFile(path.join(tmpTemplates, "common/lang-instructions.json"), JSON.stringify({ instructions: {}, labels: {} }));
    // Template with embedded header that should be stripped
    writeFile(path.join(tmpTemplates, "java-spring/pass1.md"),
      "Project root path: /some/path\nInterpret all file paths relative to this root.\n\n---\n\nActual template content.\n");
    writeFile(path.join(tmpTemplates, "java-spring/pass3.md"),
      "1. Generate stuff.\n\nAfter completion, run the following commands in order:\n1. npx claudeos-core health\n");
  });
  afterEach(() => { cleanup(tmpTemplates); cleanup(tmpGenerated); });

  it("strips Project root path header from pass1 body", () => {
    const templates = { backend: "java-spring", frontend: null };
    generatePrompts(templates, "en", tmpTemplates, tmpGenerated);

    const pass1 = fs.readFileSync(path.join(tmpGenerated, "pass1-backend-prompt.md"), "utf-8");
    assert.ok(!pass1.includes("Project root path:"), "should strip old header");
    assert.ok(pass1.includes("Actual template content"), "should keep actual content");
  });

  it("strips 'After completion' footer from pass3 body", () => {
    const templates = { backend: "java-spring", frontend: null };
    generatePrompts(templates, "en", tmpTemplates, tmpGenerated);

    const pass3 = fs.readFileSync(path.join(tmpGenerated, "pass3-prompt.md"), "utf-8");
    assert.ok(!pass3.includes("After completion, run the following"), "should strip old footer");
    assert.ok(pass3.includes("Generate stuff"), "should keep main content");
  });
});

// ─── scan-node ──────────────────────────────────────────────

describe("scanNodeDomains — Express/NestJS", () => {
  let tmp;
  beforeEach(() => { tmp = makeTmpDir(); });
  afterEach(() => cleanup(tmp));

  it("detects modules from src/modules/*/", async () => {
    touch(path.join(tmp, "src/modules/users/users.controller.ts"));
    touch(path.join(tmp, "src/modules/users/users.service.ts"));
    touch(path.join(tmp, "src/modules/users/users.dto.ts"));
    touch(path.join(tmp, "src/modules/auth/auth.controller.ts"));

    const stack = { language: "typescript", framework: "nestjs" };
    const { backendDomains } = await scanNodeDomains(stack, tmp);

    const users = backendDomains.find(d => d.name === "users");
    assert.ok(users, "should detect users module");
    assert.equal(users.controllers, 1);
    assert.equal(users.services, 1);
    assert.equal(users.dtos, 1);
    assert.equal(users.totalFiles, 3);

    const auth = backendDomains.find(d => d.name === "auth");
    assert.ok(auth, "should detect auth module");
  });

  it("falls back to src/*/ when no modules/ dir", async () => {
    touch(path.join(tmp, "src/orders/orders.router.ts"));
    touch(path.join(tmp, "src/orders/orders.service.ts"));
    touch(path.join(tmp, "src/products/products.route.ts"));

    const stack = { language: "typescript", framework: "express" };
    const { backendDomains } = await scanNodeDomains(stack, tmp);

    const names = backendDomains.map(d => d.name);
    assert.ok(names.includes("orders"));
    assert.ok(names.includes("products"));
  });

  it("skips common/shared/config/utils/lib dirs", async () => {
    touch(path.join(tmp, "src/common/logger.ts"));
    touch(path.join(tmp, "src/shared/constants.ts"));
    touch(path.join(tmp, "src/config/database.ts"));
    touch(path.join(tmp, "src/utils/helpers.ts"));
    touch(path.join(tmp, "src/lib/cache.ts"));

    const stack = { language: "typescript", framework: "express" };
    const { backendDomains } = await scanNodeDomains(stack, tmp);

    const names = backendDomains.map(d => d.name);
    assert.ok(!names.includes("common"));
    assert.ok(!names.includes("shared"));
    assert.ok(!names.includes("config"));
    assert.ok(!names.includes("utils"));
    assert.ok(!names.includes("lib"));
  });

  it("excludes .spec.ts and .test.ts files from counts", async () => {
    touch(path.join(tmp, "src/modules/posts/posts.controller.ts"));
    touch(path.join(tmp, "src/modules/posts/posts.service.ts"));
    touch(path.join(tmp, "src/modules/posts/posts.controller.spec.ts"));
    touch(path.join(tmp, "src/modules/posts/posts.service.test.ts"));

    const stack = { language: "typescript", framework: "nestjs" };
    const { backendDomains } = await scanNodeDomains(stack, tmp);

    const posts = backendDomains.find(d => d.name === "posts");
    assert.ok(posts);
    assert.equal(posts.totalFiles, 2, "should exclude spec/test files");
  });

  it("returns empty for project with no src dirs", async () => {
    touch(path.join(tmp, "index.ts"));

    const stack = { language: "typescript", framework: "express" };
    const { backendDomains } = await scanNodeDomains(stack, tmp);
    assert.equal(backendDomains.length, 0);
  });
});

// ─── scan-python ────────────────────────────────────────────

describe("scanPythonDomains — Django", () => {
  let tmp;
  beforeEach(() => { tmp = makeTmpDir(); });
  afterEach(() => cleanup(tmp));

  it("detects apps from models.py files", async () => {
    touch(path.join(tmp, "blog/models.py"));
    touch(path.join(tmp, "blog/views.py"));
    touch(path.join(tmp, "blog/urls.py"));
    touch(path.join(tmp, "accounts/models.py"));
    touch(path.join(tmp, "accounts/serializers.py"));

    const stack = { language: "python", framework: "django" };
    const { backendDomains } = await scanPythonDomains(stack, tmp);

    const blog = backendDomains.find(d => d.name === "blog");
    assert.ok(blog, "should detect blog app");
    assert.equal(blog.views, 1);
    assert.equal(blog.models, 1);
    assert.equal(blog.totalFiles, 3);

    const accounts = backendDomains.find(d => d.name === "accounts");
    assert.ok(accounts);
    assert.equal(accounts.serializers, 1);
  });

  it("skips venv and migrations directories", async () => {
    touch(path.join(tmp, "venv/lib/models.py"));
    touch(path.join(tmp, "blog/migrations/0001_initial.py"));
    touch(path.join(tmp, "blog/models.py"));

    const stack = { language: "python", framework: "django" };
    const { backendDomains } = await scanPythonDomains(stack, tmp);

    const names = backendDomains.map(d => d.name);
    assert.ok(names.includes("blog"));
    assert.ok(!names.some(n => n.includes("venv")));
    assert.ok(!names.some(n => n.includes("migrations")));
  });
});

describe("scanPythonDomains — FastAPI", () => {
  let tmp;
  beforeEach(() => { tmp = makeTmpDir(); });
  afterEach(() => cleanup(tmp));

  it("detects domains from router files", async () => {
    touch(path.join(tmp, "app/users/router.py"));
    touch(path.join(tmp, "app/users/models.py"));
    touch(path.join(tmp, "app/users/schemas.py"));
    touch(path.join(tmp, "app/orders/routes.py"));

    const stack = { language: "python", framework: "fastapi" };
    const { backendDomains } = await scanPythonDomains(stack, tmp);

    const names = backendDomains.map(d => d.name);
    assert.ok(names.includes("users"));
    assert.ok(names.includes("orders"));
  });

  it("falls back to app/*/ dirs when no router files found", async () => {
    touch(path.join(tmp, "app/inventory/main.py"));
    touch(path.join(tmp, "app/inventory/service.py"));
    touch(path.join(tmp, "app/shipping/main.py"));

    const stack = { language: "python", framework: "fastapi" };
    const { backendDomains } = await scanPythonDomains(stack, tmp);

    const names = backendDomains.map(d => d.name);
    assert.ok(names.includes("inventory"));
    assert.ok(names.includes("shipping"));
  });

  it("skips core/common/utils/__pycache__", async () => {
    touch(path.join(tmp, "app/core/config.py"));
    touch(path.join(tmp, "app/common/helpers.py"));
    touch(path.join(tmp, "app/utils/validators.py"));

    const stack = { language: "python", framework: "fastapi" };
    const { backendDomains } = await scanPythonDomains(stack, tmp);

    const names = backendDomains.map(d => d.name);
    assert.ok(!names.includes("core"));
    assert.ok(!names.includes("common"));
    assert.ok(!names.includes("utils"));
  });

  it("deduplicates domains from multiple router files in same dir", async () => {
    touch(path.join(tmp, "app/payments/router.py"));
    touch(path.join(tmp, "app/payments/routes.py"));
    touch(path.join(tmp, "app/payments/endpoints.py"));

    const stack = { language: "python", framework: "fastapi" };
    const { backendDomains } = await scanPythonDomains(stack, tmp);

    const payments = backendDomains.filter(d => d.name === "payments");
    assert.equal(payments.length, 1, "should not duplicate domain");
  });
});

describe("scanPythonDomains — Flask", () => {
  let tmp;
  beforeEach(() => { tmp = makeTmpDir(); });
  afterEach(() => cleanup(tmp));

  it("detects domains using same FastAPI router detection", async () => {
    touch(path.join(tmp, "app/auth/routes.py"));
    touch(path.join(tmp, "app/auth/models.py"));

    const stack = { language: "python", framework: "flask" };
    const { backendDomains } = await scanPythonDomains(stack, tmp);

    const names = backendDomains.map(d => d.name);
    assert.ok(names.includes("auth"));
  });
});
