/**
 * ClaudeOS-Core — Stack Detector Tests
 */

const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { detectStack } = require("../plan-installer/stack-detector");

function makeTmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "ccore-test-"));
}

function cleanup(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}

// ─── Java / Gradle ──────────────────────────────────────────

describe("detectStack — Java/Gradle", () => {
  let tmp;
  beforeEach(() => { tmp = makeTmpDir(); });
  afterEach(() => cleanup(tmp));

  it("detects Spring Boot + MyBatis + PostgreSQL from build.gradle", async () => {
    fs.writeFileSync(path.join(tmp, "build.gradle"), `
      plugins { id 'org.springframework.boot' version '3.2.0' }
      dependencies {
        implementation 'org.mybatis.spring.boot:mybatis-spring-boot-starter:3.0.3'
        runtimeOnly 'org.postgresql:postgresql'
      }
      sourceCompatibility = '17'
    `);
    const s = await detectStack(tmp);
    assert.equal(s.language, "java");
    assert.equal(s.framework, "spring-boot");
    assert.equal(s.frameworkVersion, "3.2.0");
    assert.equal(s.orm, "mybatis");
    assert.equal(s.database, "postgresql");
    assert.equal(s.languageVersion, "17");
    assert.equal(s.buildTool, "gradle");
  });

  it("detects JPA when mybatis is absent", async () => {
    fs.writeFileSync(path.join(tmp, "build.gradle"), `
      plugins { id 'org.springframework.boot' version '3.1.0' }
      dependencies {
        implementation 'org.springframework.boot:spring-boot-starter-data-jpa'
        runtimeOnly 'com.mysql:mysql-connector-j'
      }
    `);
    const s = await detectStack(tmp);
    assert.equal(s.orm, "jpa");
    assert.equal(s.database, "mysql");
  });

  it("detects Kotlin from build.gradle.kts", async () => {
    fs.writeFileSync(path.join(tmp, "build.gradle.kts"), `
      plugins {
        id("org.springframework.boot") version "3.3.0"
        kotlin("jvm") version "1.9.22"
      }
      dependencies {
        implementation("org.jetbrains.exposed:exposed-core")
        runtimeOnly("org.postgresql:postgresql")
      }
    `);
    const s = await detectStack(tmp);
    assert.equal(s.language, "kotlin");
    assert.equal(s.orm, "exposed");
    assert.equal(s.database, "postgresql");
  });

  it("detects Kotlin from version catalog", async () => {
    fs.writeFileSync(path.join(tmp, "build.gradle.kts"), `plugins { id("org.springframework.boot") }`);
    fs.mkdirSync(path.join(tmp, "gradle"), { recursive: true });
    fs.writeFileSync(path.join(tmp, "gradle/libs.versions.toml"), `
[versions]
kotlin = "2.0.0"
spring-boot = "3.3.1"
[libraries]
exposed-core = { module = "org.jetbrains.exposed:exposed-core" }
    `);
    const s = await detectStack(tmp);
    assert.equal(s.language, "kotlin");
    assert.equal(s.languageVersion, "2.0.0");
    assert.equal(s.frameworkVersion, "3.3.1");
    assert.equal(s.orm, "exposed");
  });
});

// ─── Java / Maven ──────────────────────────────────────────

describe("detectStack — Java/Maven", () => {
  let tmp;
  beforeEach(() => { tmp = makeTmpDir(); });
  afterEach(() => cleanup(tmp));

  it("detects Spring Boot + JPA from pom.xml", async () => {
    fs.writeFileSync(path.join(tmp, "pom.xml"), `
      <project>
        <parent>
          <groupId>org.springframework.boot</groupId>
          <artifactId>spring-boot-starter-parent</artifactId>
        </parent>
        <properties><java.version>21</java.version></properties>
        <dependencies>
          <dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-data-jpa</artifactId></dependency>
          <dependency><groupId>org.postgresql</groupId><artifactId>postgresql</artifactId></dependency>
        </dependencies>
      </project>
    `);
    const s = await detectStack(tmp);
    assert.equal(s.language, "java");
    assert.equal(s.buildTool, "maven");
    assert.equal(s.orm, "jpa");
    assert.equal(s.database, "postgresql");
    assert.equal(s.languageVersion, "21");
  });
});

// ─── Node.js ──────────────────────────────────────────────

describe("detectStack — Node.js", () => {
  let tmp;
  beforeEach(() => { tmp = makeTmpDir(); });
  afterEach(() => cleanup(tmp));

  it("detects Next.js + TypeScript + Prisma + PostgreSQL", async () => {
    fs.writeFileSync(path.join(tmp, "package.json"), JSON.stringify({
      dependencies: { next: "^14.0.0", react: "^18.0.0", "@prisma/client": "^5.0.0" },
      devDependencies: { typescript: "^5.3.0" },
    }));
    fs.writeFileSync(path.join(tmp, "pnpm-lock.yaml"), "");
    const s = await detectStack(tmp);
    assert.equal(s.language, "typescript");
    assert.equal(s.frontend, "nextjs");
    assert.equal(s.orm, "prisma");
    assert.equal(s.packageManager, "pnpm");
  });

  it("detects Express + Drizzle", async () => {
    fs.writeFileSync(path.join(tmp, "package.json"), JSON.stringify({
      dependencies: { express: "^4.18.0", "drizzle-orm": "^0.30.0", pg: "^8.0.0" },
    }));
    const s = await detectStack(tmp);
    assert.equal(s.framework, "express");
    assert.equal(s.orm, "drizzle");
    assert.equal(s.database, "postgresql");
  });

  it("survives malformed package.json", async () => {
    fs.writeFileSync(path.join(tmp, "package.json"), "NOT JSON {{{");
    const s = await detectStack(tmp);
    assert.equal(s.language, null); // should not crash
  });
});

// ─── Python ──────────────────────────────────────────────

describe("detectStack — Python", () => {
  let tmp;
  beforeEach(() => { tmp = makeTmpDir(); });
  afterEach(() => cleanup(tmp));

  it("detects FastAPI + SQLAlchemy from pyproject.toml", async () => {
    fs.writeFileSync(path.join(tmp, "pyproject.toml"), `
[tool.poetry.dependencies]
python = ">=3.11"
fastapi = "^0.109.0"
sqlalchemy = "^2.0.0"
    `);
    const s = await detectStack(tmp);
    assert.equal(s.language, "python");
    assert.equal(s.framework, "fastapi");
    assert.equal(s.orm, "sqlalchemy");
    assert.equal(s.languageVersion, "3.11");
  });

  it("detects Django from requirements.txt", async () => {
    fs.writeFileSync(path.join(tmp, "requirements.txt"), "django==5.0.1\npsycopg2-binary==2.9.9\n");
    const s = await detectStack(tmp);
    assert.equal(s.framework, "django");
    assert.equal(s.database, "postgresql");
  });
});

// ─── DB from config files ──────────────────────────────────

describe("detectStack — Config fallbacks", () => {
  let tmp;
  beforeEach(() => { tmp = makeTmpDir(); });
  afterEach(() => cleanup(tmp));

  it("detects DB from .env file", async () => {
    fs.writeFileSync(path.join(tmp, "package.json"), JSON.stringify({ dependencies: {} }));
    fs.writeFileSync(path.join(tmp, ".env"), "DATABASE_URL=postgresql://localhost:5432/mydb");
    const s = await detectStack(tmp);
    assert.equal(s.database, "postgresql");
  });

  it("detects frontend from next.config.mjs when not in package.json", async () => {
    fs.writeFileSync(path.join(tmp, "next.config.mjs"), "export default {};");
    const s = await detectStack(tmp);
    assert.equal(s.frontend, "nextjs");
  });
});

// ─── h2 word boundary ──────────────────────────────────────

describe("detectStack — h2 false positive prevention", () => {
  let tmp;
  beforeEach(() => { tmp = makeTmpDir(); });
  afterEach(() => cleanup(tmp));

  it("does NOT detect h2 from oauth2 or cache2k in Gradle", async () => {
    fs.writeFileSync(path.join(tmp, "build.gradle"), `
      plugins { id 'org.springframework.boot' version '3.2.0' }
      dependencies {
        implementation 'org.springframework.boot:spring-boot-starter-oauth2-client'
        implementation 'com.github.cache2k:cache2k-spring'
      }
    `);
    const s = await detectStack(tmp);
    assert.equal(s.database, null);
  });

  it("detects h2 with word boundary in Gradle", async () => {
    fs.writeFileSync(path.join(tmp, "build.gradle"), `
      plugins { id 'org.springframework.boot' version '3.2.0' }
      dependencies { runtimeOnly 'com.h2database:h2' }
    `);
    const s = await detectStack(tmp);
    assert.equal(s.database, "h2");
  });

  it("does NOT detect h2 from http2 in pom.xml", async () => {
    fs.writeFileSync(path.join(tmp, "pom.xml"), `
      <project>
        <dependencies>
          <dependency><groupId>org.eclipse.jetty.http2</groupId><artifactId>http2-server</artifactId></dependency>
        </dependencies>
      </project>
    `);
    const s = await detectStack(tmp);
    assert.equal(s.database, null);
  });
});

// ─── TypeScript version extraction ────────────────────────────

describe("detectStack — TypeScript version extraction", () => {
  let tmp;
  beforeEach(() => { tmp = makeTmpDir(); });
  afterEach(() => cleanup(tmp));

  it("extracts version from caret range ^5.3.2", async () => {
    fs.writeFileSync(path.join(tmp, "package.json"), JSON.stringify({
      devDependencies: { typescript: "^5.3.2" },
    }));
    const s = await detectStack(tmp);
    assert.equal(s.languageVersion, "5.3.2");
  });

  it("extracts first version from range >=5.0 <6", async () => {
    fs.writeFileSync(path.join(tmp, "package.json"), JSON.stringify({
      devDependencies: { typescript: ">=5.0 <6" },
    }));
    const s = await detectStack(tmp);
    assert.equal(s.languageVersion, "5.0");
  });

  it("extracts version from engines.node range", async () => {
    fs.writeFileSync(path.join(tmp, "package.json"), JSON.stringify({
      dependencies: {},
      engines: { node: ">=18.0.0" },
    }));
    const s = await detectStack(tmp);
    assert.equal(s.languageVersion, "18.0.0");
  });
});

// ─── Kotlin CQRS detection ──────────────────────────────────

describe("detectStack — Kotlin CQRS", () => {
  let tmp;
  beforeEach(() => { tmp = makeTmpDir(); });
  afterEach(() => cleanup(tmp));

  it("detects CQRS from settings.gradle.kts modules", async () => {
    fs.writeFileSync(path.join(tmp, "build.gradle.kts"), `
      plugins { kotlin("jvm") version "2.0.0"; id("org.springframework.boot") version "3.3.0" }
    `);
    fs.writeFileSync(path.join(tmp, "settings.gradle.kts"), `
      include(":reservation-command-server", ":reservation-query-server", ":pms-bff-server", ":iam-server")
    `);
    const s = await detectStack(tmp);
    assert.equal(s.language, "kotlin");
    assert.equal(s.architecture, "cqrs");
    assert.equal(s.multiModule, true);
    assert.equal(s.modules.length, 4);
    assert.ok(s.detected.includes("cqrs"));
    assert.ok(s.detected.includes("bff"));
  });
});

// ─── Fastify detection ──────────────────────────────────

describe("detectStack — Fastify", () => {
  let tmp;
  beforeEach(() => { tmp = makeTmpDir(); });
  afterEach(() => cleanup(tmp));

  it("detects Fastify as framework", async () => {
    fs.writeFileSync(path.join(tmp, "package.json"), JSON.stringify({
      dependencies: { fastify: "^4.26.0", "@prisma/client": "^5.0.0" },
      devDependencies: { typescript: "^5.3.0" },
    }));
    const s = await detectStack(tmp);
    assert.equal(s.framework, "fastify");
    assert.equal(s.language, "typescript");
    assert.equal(s.orm, "prisma");
  });

  it("prefers NestJS over Fastify when both present", async () => {
    fs.writeFileSync(path.join(tmp, "package.json"), JSON.stringify({
      dependencies: { fastify: "^4.26.0", "@nestjs/core": "^10.0.0", express: "^4.18.0" },
    }));
    const s = await detectStack(tmp);
    assert.equal(s.framework, "nestjs");
  });

  it("prefers Fastify over Express when both present", async () => {
    fs.writeFileSync(path.join(tmp, "package.json"), JSON.stringify({
      dependencies: { fastify: "^4.26.0", express: "^4.18.0" },
    }));
    const s = await detectStack(tmp);
    assert.equal(s.framework, "fastify");
  });
});

// ─── Angular detection ──────────────────────────────────

describe("detectStack — Angular", () => {
  let tmp;
  beforeEach(() => { tmp = makeTmpDir(); });
  afterEach(() => cleanup(tmp));

  it("detects Angular as frontend", async () => {
    fs.writeFileSync(path.join(tmp, "package.json"), JSON.stringify({
      dependencies: { "@angular/core": "^17.0.0", "@angular/router": "^17.0.0", rxjs: "^7.8.0" },
      devDependencies: { typescript: "^5.3.0" },
    }));
    const s = await detectStack(tmp);
    assert.equal(s.frontend, "angular");
    assert.equal(s.frontendVersion, "17.0.0");
    assert.equal(s.language, "typescript");
  });

  it("prefers Angular over React when both present", async () => {
    fs.writeFileSync(path.join(tmp, "package.json"), JSON.stringify({
      dependencies: { "@angular/core": "^17.0.0", react: "^18.0.0" },
    }));
    const s = await detectStack(tmp);
    assert.equal(s.frontend, "angular");
  });

  it("detects Angular from angular.json fallback", async () => {
    fs.writeFileSync(path.join(tmp, "angular.json"), '{"version": 1}');
    const s = await detectStack(tmp);
    assert.equal(s.frontend, "angular");
  });
});
