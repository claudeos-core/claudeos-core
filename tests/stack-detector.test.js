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

  it("v2.4.0: packageManager === 'gradle' for Gradle projects", async () => {
    // Pre-v2.4.0: stack.packageManager was null for Gradle/Maven projects,
    // surfacing as `PackageMgr: none` in init output. v2.4.0 sets the JVM
    // build tool as the package manager so downstream display + generated
    // docs reflect what the project actually uses.
    fs.writeFileSync(path.join(tmp, "build.gradle"), `
      plugins { id 'org.springframework.boot' version '3.2.0' }
      dependencies { implementation 'org.springframework.boot:spring-boot-starter-web' }
    `);
    const s = await detectStack(tmp);
    assert.equal(s.packageManager, "gradle");
    assert.equal(s.buildTool, "gradle");
  });

  it("v2.4.0: packageManager === 'gradle' for Kotlin Gradle projects", async () => {
    fs.writeFileSync(path.join(tmp, "build.gradle.kts"), `
      plugins {
        id("org.springframework.boot") version "3.3.0"
        kotlin("jvm") version "1.9.22"
      }
    `);
    const s = await detectStack(tmp);
    assert.equal(s.packageManager, "gradle");
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

  // ── Java version detection (v2.3.2+): regex must cover the four common
  // Gradle patterns. Without pattern 4, an `ext`-variable-reference
  // build.gradle (`sourceCompatibility = "${javaVersion}"`) returns
  // null and the downstream LLM fills the gap by guessing (e.g.
  // "Java 17+" for a Spring Boot 3.x project actually targeting Java 21).

  it("extracts Java version from JavaVersion enum (Spring Initializr form)", async () => {
    fs.writeFileSync(path.join(tmp, "build.gradle"), `
      plugins { id 'org.springframework.boot' version '3.3.0' }
      java {
        sourceCompatibility = JavaVersion.VERSION_21
      }
    `);
    const s = await detectStack(tmp);
    assert.equal(s.languageVersion, "21");
  });

  it("extracts Java 8 from JavaVersion.VERSION_1_8 legacy form", async () => {
    fs.writeFileSync(path.join(tmp, "build.gradle"), `
      plugins { id 'org.springframework.boot' version '2.7.0' }
      sourceCompatibility = JavaVersion.VERSION_1_8
    `);
    const s = await detectStack(tmp);
    assert.equal(s.languageVersion, "8");
  });

  it("extracts Java version from toolchain block (Gradle 6.7+)", async () => {
    fs.writeFileSync(path.join(tmp, "build.gradle"), `
      plugins { id 'org.springframework.boot' version '3.2.0' }
      java {
        toolchain {
          languageVersion = JavaLanguageVersion.of(21)
        }
      }
    `);
    const s = await detectStack(tmp);
    assert.equal(s.languageVersion, "21");
  });

  it("extracts Java version from ext-variable reference (enterprise form)", async () => {
    // Regression guard: this is the pattern that produced
    // languageVersion=null before v2.3.2. `ext { javaVersion = '21' }`
    // defines the value, then `sourceCompatibility = "${javaVersion}"`
    // references it — the pre-v2.3.2 regex expected a literal number
    // after the `=`.
    fs.writeFileSync(path.join(tmp, "build.gradle"), `
      plugins { id 'org.springframework.boot' version '3.5.5' }
      ext {
        javaVersion = '21'
      }
      java {
        sourceCompatibility = "\${javaVersion}"
      }
    `);
    const s = await detectStack(tmp);
    assert.equal(s.languageVersion, "21");
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

  it("v2.4.0: packageManager === 'maven' for Maven projects", async () => {
    fs.writeFileSync(path.join(tmp, "pom.xml"), `
      <project>
        <parent>
          <groupId>org.springframework.boot</groupId>
          <artifactId>spring-boot-starter-parent</artifactId>
        </parent>
      </project>
    `);
    const s = await detectStack(tmp);
    assert.equal(s.packageManager, "maven");
    assert.equal(s.buildTool, "maven");
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

// ─── Server port (v2.3.2+) ─────────────────────────────────
//
// Spring Boot applications commonly use property placeholders with a
// default value (e.g. `port: ${APP_PORT:8090}`) so the same yml can run
// locally and in containerized environments. Without placeholder
// support, the detector returns null for these projects and the
// downstream LLM fills the gap by assuming "port 8080" (the Spring
// Boot framework default).

describe("detectStack — Server port (yml and placeholder)", () => {
  let tmp;
  beforeEach(() => { tmp = makeTmpDir(); });
  afterEach(() => cleanup(tmp));

  it("extracts port from plain yml `server.port`", async () => {
    fs.writeFileSync(path.join(tmp, "build.gradle"),
      `plugins { id 'org.springframework.boot' version '3.2.0' }`);
    fs.writeFileSync(path.join(tmp, "application.yml"),
      `server:\n  port: 8080\n`);
    const s = await detectStack(tmp);
    assert.equal(s.port, 8080);
  });

  it("extracts port from flat-key `server.port=N`", async () => {
    fs.writeFileSync(path.join(tmp, "build.gradle"),
      `plugins { id 'org.springframework.boot' version '3.2.0' }`);
    // Using yml file with flat-key syntax that some projects choose.
    fs.writeFileSync(path.join(tmp, "application.yml"),
      `spring.profiles.active: local\nserver.port=9000\n`);
    const s = await detectStack(tmp);
    assert.equal(s.port, 9000);
  });

  it("extracts port default from Spring property placeholder", async () => {
    // Regression guard for the `${VAR:default}` placeholder pattern.
    // The default (8090) is what the app falls back to when VAR is unset.
    fs.writeFileSync(path.join(tmp, "build.gradle"),
      `plugins { id 'org.springframework.boot' version '3.5.5' }`);
    fs.writeFileSync(path.join(tmp, "application.yml"),
      `server:\n  port: \${APP_PORT:8090}\n  shutdown: graceful\n`);
    const s = await detectStack(tmp);
    assert.equal(s.port, 8090);
  });

  it("extracts port default from flat-key placeholder", async () => {
    fs.writeFileSync(path.join(tmp, "build.gradle"),
      `plugins { id 'org.springframework.boot' version '3.2.0' }`);
    fs.writeFileSync(path.join(tmp, "application.yml"),
      `server.port=\${SERVER_PORT:3000}\n`);
    const s = await detectStack(tmp);
    assert.equal(s.port, 3000);
  });

  it("v2.4.0: extracts port from deeply-nested server: block (>2000 char gap)", async () => {
    // Regression guard for the 2000-char window limit. Enterprise YAMLs
    // commonly have `server:` blocks with ssl/http/
    // tomcat/compression/error children spanning thousands of chars
    // before `port:`. The pre-v2.4.0 pattern silently missed these
    // and the detector defaulted to the Spring Boot 8080 fallback.
    fs.writeFileSync(path.join(tmp, "build.gradle"),
      `plugins { id 'org.springframework.boot' version '2.5.12' }`);
    // Build a server: block with ~3000 chars of nested ssl/http/tomcat
    // config, then `port: 8443` after.
    const sslBlock = "  ssl:\n" + "    key-store: classpath:keystore.p12\n".repeat(20)
      + "    key-store-password: changeit\n".repeat(20)
      + "    key-alias: my-cert\n".repeat(20);
    const httpBlock = "  http:\n" + "    max-header-size: 32KB\n".repeat(20)
      + "    encoding: UTF-8\n".repeat(20);
    const tomcatBlock = "  tomcat:\n" + "    threads:\n      max: 200\n".repeat(20)
      + "    accesslog:\n      enabled: true\n".repeat(20);
    const yml = `server:\n${sslBlock}${httpBlock}${tomcatBlock}  port: 8443\n`;
    // Sanity: confirm the gap really exceeds 2000 chars
    const gap = yml.indexOf("port: 8443") - "server:\n".length;
    assert.ok(gap > 2000, `gap should exceed 2000 chars, got ${gap}`);
    fs.writeFileSync(path.join(tmp, "application-local.yml"), yml);
    const s = await detectStack(tmp);
    assert.equal(s.port, 8443);
  });

  it("v2.4.0: still works with shallow server: block (regression-safe)", async () => {
    // Ensure the window expansion didn't break the simple case.
    fs.writeFileSync(path.join(tmp, "build.gradle"),
      `plugins { id 'org.springframework.boot' version '2.5.12' }`);
    fs.writeFileSync(path.join(tmp, "application.yml"),
      `server:\n  ssl:\n    enabled: true\n  port: 8443\n`);
    const s = await detectStack(tmp);
    assert.equal(s.port, 8443);
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

// ─── Vite detection ──────────────────────────────────

describe("detectStack — Vite", () => {
  let tmp;
  beforeEach(() => { tmp = makeTmpDir(); });
  afterEach(() => cleanup(tmp));

  it("detects Vite as framework from package.json", async () => {
    fs.writeFileSync(path.join(tmp, "package.json"), JSON.stringify({
      dependencies: { react: "^18.0.0", "react-dom": "^18.0.0" },
      devDependencies: { vite: "^5.4.0", typescript: "^5.3.0" },
    }));
    const s = await detectStack(tmp);
    assert.equal(s.framework, "vite");
    assert.equal(s.frontend, "react");
    assert.equal(s.language, "typescript");
    assert.equal(s.frameworkVersion, "5.4.0");
  });

  it("detects Vite + Vue (framework=vite, frontend=vue)", async () => {
    fs.writeFileSync(path.join(tmp, "package.json"), JSON.stringify({
      dependencies: { vue: "^3.4.0" },
      devDependencies: { vite: "^5.0.0" },
    }));
    const s = await detectStack(tmp);
    assert.equal(s.framework, "vite");
    assert.equal(s.frontend, "vue");
  });

  it("does not override NestJS framework when Vite is also present", async () => {
    fs.writeFileSync(path.join(tmp, "package.json"), JSON.stringify({
      dependencies: { "@nestjs/core": "^10.0.0", react: "^18.0.0" },
      devDependencies: { vite: "^5.0.0" },
    }));
    const s = await detectStack(tmp);
    assert.equal(s.framework, "nestjs");
  });

  it("does not override Express framework when Vite is also present", async () => {
    fs.writeFileSync(path.join(tmp, "package.json"), JSON.stringify({
      dependencies: { express: "^4.18.0", react: "^18.0.0" },
      devDependencies: { vite: "^5.0.0" },
    }));
    const s = await detectStack(tmp);
    assert.equal(s.framework, "express");
  });

  it("detects Vite from vite.config.ts fallback (no package.json)", async () => {
    fs.writeFileSync(path.join(tmp, "vite.config.ts"), "export default {};");
    const s = await detectStack(tmp);
    assert.equal(s.framework, "vite");
    assert.equal(s.frontend, "react");
  });
});

// ─── iBatis detection (v2.3.2+) ─────────────────────────────
//
// Apache iBatis (EOL 2010) and Spring iBatis are distinct from MyBatis.
// MyBatis evolved out of iBatis but uses a different XML namespace
// (`mapper` vs `sqlMap`) and different runtime (SqlSessionFactory vs
// SqlMapClient). Legacy enterprise codebases still using iBatis must
// not be conflated with MyBatis — doing so would produce incorrect
// guidance in Pass 3.

describe("detectStack — iBatis vs MyBatis distinction", () => {
  let tmp;
  beforeEach(() => { tmp = makeTmpDir(); });
  afterEach(() => cleanup(tmp));

  it("detects Apache iBatis from Gradle coord", async () => {
    fs.writeFileSync(path.join(tmp, "build.gradle"), `
      plugins { id 'org.springframework.boot' version '2.7.0' }
      dependencies {
        implementation 'org.apache.ibatis:ibatis-core:3.0'
        implementation 'org.apache.ibatis:ibatis-common:2.3.4.726'
      }
    `);
    const s = await detectStack(tmp);
    assert.equal(s.orm, "ibatis");
  });

  it("detects Spring iBatis from Gradle coord", async () => {
    fs.writeFileSync(path.join(tmp, "build.gradle"), `
      plugins { id 'org.springframework.boot' version '2.5.0' }
      dependencies {
        implementation 'org.springframework:spring-ibatis:2.0.8'
      }
    `);
    const s = await detectStack(tmp);
    assert.equal(s.orm, "ibatis");
  });

  it("detects iBatis from Maven coord", async () => {
    fs.writeFileSync(path.join(tmp, "pom.xml"), `
      <project>
        <dependencies>
          <dependency>
            <groupId>org.apache.ibatis</groupId>
            <artifactId>ibatis-sqlmap</artifactId>
          </dependency>
        </dependencies>
      </project>
    `);
    const s = await detectStack(tmp);
    assert.equal(s.orm, "ibatis");
  });

  it("does NOT confuse MyBatis with iBatis (Gradle)", async () => {
    fs.writeFileSync(path.join(tmp, "build.gradle"), `
      plugins { id 'org.springframework.boot' version '3.5.5' }
      dependencies {
        implementation 'org.mybatis.spring.boot:mybatis-spring-boot-starter:3.0.4'
      }
    `);
    const s = await detectStack(tmp);
    assert.equal(s.orm, "mybatis");
    assert.notEqual(s.orm, "ibatis");
  });
});

// ─── Maven Java version patterns (v2.3.2+) ──────────────────

describe("detectStack — Maven Java version patterns", () => {
  let tmp;
  beforeEach(() => { tmp = makeTmpDir(); });
  afterEach(() => cleanup(tmp));

  it("extracts Java version from <java.version> direct value", async () => {
    fs.writeFileSync(path.join(tmp, "pom.xml"), `
      <project>
        <properties>
          <java.version>21</java.version>
        </properties>
      </project>
    `);
    const s = await detectStack(tmp);
    assert.equal(s.languageVersion, "21");
  });

  it("extracts Java version from <maven.compiler.source>", async () => {
    fs.writeFileSync(path.join(tmp, "pom.xml"), `
      <project>
        <properties>
          <maven.compiler.source>17</maven.compiler.source>
          <maven.compiler.target>17</maven.compiler.target>
        </properties>
      </project>
    `);
    const s = await detectStack(tmp);
    assert.equal(s.languageVersion, "17");
  });

  it("resolves property reference inside <properties>", async () => {
    fs.writeFileSync(path.join(tmp, "pom.xml"), `
      <project>
        <properties>
          <project.javaVersion>21</project.javaVersion>
          <java.version>\${project.javaVersion}</java.version>
        </properties>
      </project>
    `);
    const s = await detectStack(tmp);
    assert.equal(s.languageVersion, "21");
  });
});

// ─── Gradle ext springBootVersion (v2.3.2+) ─────────────────

describe("detectStack — Gradle ext.springBootVersion reference", () => {
  let tmp;
  beforeEach(() => { tmp = makeTmpDir(); });
  afterEach(() => cleanup(tmp));

  it("resolves Spring Boot version from ext block when plugin references ${var}", async () => {
    fs.writeFileSync(path.join(tmp, "build.gradle"), `
      ext {
        springBootVersion = '3.3.1'
      }
      plugins {
        id 'org.springframework.boot' version "\${springBootVersion}"
      }
      dependencies {
        implementation 'org.springframework.boot:spring-boot-starter-web'
      }
    `);
    const s = await detectStack(tmp);
    assert.equal(s.frameworkVersion, "3.3.1");
  });
});

// ─── Multi-dialect databases (v2.3.2+) ──────────────────────
//
// v2.3.2 adds `stack.databases` (plural) alongside `stack.database`.
// Multi-dialect projects (e.g. PostgreSQL + MariaDB + Oracle declared
// simultaneously) previously lost all but the first DB indicator
// because `stack.database` only stored the first match.

describe("detectStack — Multi-dialect databases array", () => {
  let tmp;
  beforeEach(() => { tmp = makeTmpDir(); });
  afterEach(() => cleanup(tmp));

  it("collects all three JDBC drivers declared in Gradle", async () => {
    fs.writeFileSync(path.join(tmp, "build.gradle"), `
      plugins { id 'org.springframework.boot' version '3.5.5' }
      dependencies {
        implementation 'org.postgresql:postgresql:42.7.3'
        implementation 'org.mariadb.jdbc:mariadb-java-client:3.3.3'
        implementation 'com.oracle.database.jdbc:ojdbc11:23.4.0.24.05'
      }
    `);
    const s = await detectStack(tmp);
    assert.equal(s.database, "postgresql"); // first match = primary
    assert.deepEqual(s.databases.sort(), ["mariadb", "oracle", "postgresql"]);
  });

  it("returns single-entry databases array for single-DB projects", async () => {
    fs.writeFileSync(path.join(tmp, "build.gradle"), `
      plugins { id 'org.springframework.boot' version '3.2.0' }
      dependencies {
        implementation 'org.springframework.boot:spring-boot-starter-data-jpa'
        runtimeOnly 'org.postgresql:postgresql'
      }
    `);
    const s = await detectStack(tmp);
    assert.equal(s.database, "postgresql");
    assert.deepEqual(s.databases, ["postgresql"]);
  });

  it("returns empty databases array when no DB detected", async () => {
    fs.writeFileSync(path.join(tmp, "build.gradle"), `
      plugins { id 'org.springframework.boot' version '3.2.0' }
      dependencies {
        implementation 'org.springframework.boot:spring-boot-starter-web'
      }
    `);
    const s = await detectStack(tmp);
    assert.equal(s.database, null);
    assert.deepEqual(s.databases, []);
  });

  it("MariaDB is detected as its own entry (not aliased to MySQL)", async () => {
    fs.writeFileSync(path.join(tmp, "build.gradle"), `
      plugins { id 'org.springframework.boot' version '3.2.0' }
      dependencies {
        implementation 'org.mariadb.jdbc:mariadb-java-client:3.3.3'
      }
    `);
    const s = await detectStack(tmp);
    assert.equal(s.database, "mariadb");
    assert.ok(s.databases.includes("mariadb"));
    assert.ok(!s.databases.includes("mysql"));
  });
});

// ─── Logging framework detection (v2.3.2+) ──────────────────

describe("detectStack — Logging framework detection", () => {
  let tmp;
  beforeEach(() => { tmp = makeTmpDir(); });
  afterEach(() => cleanup(tmp));

  it("detects Logback from dependency and logback-*.xml reference", async () => {
    fs.writeFileSync(path.join(tmp, "build.gradle"), `
      plugins { id 'org.springframework.boot' version '3.2.0' }
    `);
    fs.writeFileSync(path.join(tmp, "application.yml"), `
      logging:
        config: classpath:logback-spring.xml
    `);
    const s = await detectStack(tmp);
    assert.ok(s.loggingFrameworks.includes("logback"));
  });

  it("detects Log4j2 from coord", async () => {
    fs.writeFileSync(path.join(tmp, "build.gradle"), `
      plugins { id 'org.springframework.boot' version '3.2.0' }
      dependencies {
        implementation 'org.apache.logging.log4j:log4j-core:2.20.0'
      }
    `);
    const s = await detectStack(tmp);
    assert.ok(s.loggingFrameworks.includes("log4j2"));
  });

  it("detects log4jdbc JDBC adapter", async () => {
    fs.writeFileSync(path.join(tmp, "build.gradle"), `
      plugins { id 'org.springframework.boot' version '3.5.5' }
      dependencies {
        implementation 'org.bgee.log4jdbc-log4j2:log4jdbc-log4j2-jdbc4.1:1.16'
      }
    `);
    const s = await detectStack(tmp);
    assert.ok(s.loggingFrameworks.includes("log4jdbc"));
  });

  it("does NOT falsely detect Log4j 1.x from log4j-to-slf4j bridge", async () => {
    // Regression guard: `log4j-to-slf4j` (a Log4j2 ecosystem library
    // that bridges Log4j API to SLF4J) was previously matched by the
    // naive Log4j 1.x regex. Log4j 1.x uses coord `log4j:log4j`, not
    // `org.apache.logging.log4j:log4j-*`.
    fs.writeFileSync(path.join(tmp, "build.gradle"), `
      plugins { id 'org.springframework.boot' version '3.5.5' }
      dependencies {
        implementation 'org.apache.logging.log4j:log4j-to-slf4j:2.17.1'
        implementation 'org.apache.logging.log4j:log4j-api:2.17.1'
      }
    `);
    const s = await detectStack(tmp);
    assert.ok(!s.loggingFrameworks.includes("log4j"),
      `Should NOT detect Log4j 1.x from log4j-to-slf4j / log4j-api; got ${JSON.stringify(s.loggingFrameworks)}`);
  });

  it("correctly identifies Log4j 1.x when the coord is actually log4j:log4j", async () => {
    fs.writeFileSync(path.join(tmp, "build.gradle"), `
      plugins { id 'org.springframework.boot' version '2.0.0' }
      dependencies {
        implementation 'log4j:log4j:1.2.17'
      }
    `);
    const s = await detectStack(tmp);
    assert.ok(s.loggingFrameworks.includes("log4j"));
  });

  it("empty loggingFrameworks when no JVM logging evidence", async () => {
    fs.writeFileSync(path.join(tmp, "package.json"),
      JSON.stringify({ dependencies: { react: "18.0.0" } }));
    const s = await detectStack(tmp);
    assert.deepEqual(s.loggingFrameworks, []);
  });

  it("comment-stripping prevents false-positive Logback detection from commented-out Gradle dep (non-Spring project)", async () => {
    // Regression guard for the comment-stripping logic in detectLogging():
    // a commented-out `// implementation 'ch.qos.logback:logback-classic'`
    // line should not be matched as a real dependency. The fix strips
    // `//`-prefixed and `#`-prefixed lines before running LOGGING_RULES.
    //
    // Uses a non-Spring-Boot Gradle project so the v2.4.0 spring-boot
    // Logback fallback (which auto-adds Logback to every Spring Boot
    // project regardless of explicit dep) does not apply.
    fs.writeFileSync(path.join(tmp, "build.gradle"), `
      plugins { id 'java' }
      dependencies {
        // implementation 'ch.qos.logback:logback-classic:1.4.11'
        implementation 'org.apache.commons:commons-lang3:3.14.0'
      }
    `);
    const s = await detectStack(tmp);
    assert.ok(!s.loggingFrameworks.includes("logback"),
      `Should NOT detect Logback from commented-out dep in non-Spring project; got ${JSON.stringify(s.loggingFrameworks)}`);
  });

  it("v2.4.0: Spring Boot project gets Logback via fallback even with no explicit logback dep", async () => {
    // Spring Boot ships Logback transitively via spring-boot-starter.
    // Most projects do not declare logback-classic explicitly. The
    // v2.4.0 fallback adds Logback when framework=spring-boot and no
    // explicit log4j2 was detected. The `detected` array preserves
    // provenance via "(spring-boot default)" marker so consumers can
    // distinguish fallback-derived from explicit declaration.
    fs.writeFileSync(path.join(tmp, "build.gradle"), `
      plugins { id 'org.springframework.boot' version '3.5.5' }
      dependencies {
        implementation 'org.springframework.boot:spring-boot-starter'
      }
    `);
    const s = await detectStack(tmp);
    assert.ok(s.loggingFrameworks.includes("logback"),
      `Spring Boot project must report Logback via fallback; got ${JSON.stringify(s.loggingFrameworks)}`);
    assert.ok(s.detected.includes("logback (spring-boot default)"),
      `provenance marker missing from detected[]; got ${JSON.stringify(s.detected)}`);
  });

  it("v2.4.0: port detection finds nested port: inside server: block (after intermediate keys)", async () => {
    // Real Spring Boot configs commonly have `server:` blocks with
    // intermediate keys (ssl, http, error) BEFORE the `port:` declaration:
    //   server:
    //     ssl:
    //       enabled: true
    //     port: 8443
    // Pre-v2.4.0 pattern only matched `port:` IMMEDIATELY after `server:\n`,
    // missing this layout. Pattern (5) handles the nested form.
    fs.writeFileSync(path.join(tmp, "build.gradle"), `
      plugins { id 'org.springframework.boot' version '2.5.12' }
    `);
    fs.mkdirSync(path.join(tmp, "src/main/resources/properties"), { recursive: true });
    fs.writeFileSync(
      path.join(tmp, "src/main/resources/properties/application-local.yml"),
      "server:\n" +
      "  ssl:\n" +
      "    enabled: true\n" +
      "    key-store: classpath:keystore.p12\n" +
      "  http:\n" +
      "    encoding:\n" +
      "      charset: UTF-8\n" +
      "  port: 8443\n"
    );
    const s = await detectStack(tmp);
    assert.equal(s.port, 8443,
      `nested port: in server: block should be detected; got port=${s.port}`);
  });

  it("v2.4.0: port detection inside nested properties/ subdirectory", async () => {
    // Some projects keep yml files under a `properties/` subdirectory
    // (`src/main/resources/properties/application-{profile}.yml`) rather
    // than at the standard `src/main/resources/` root. The configGlob
    // `**/{application,bootstrap}*.{yml,yaml,properties}` should match
    // any depth — verify it does.
    fs.writeFileSync(path.join(tmp, "build.gradle"), `
      plugins { id 'org.springframework.boot' version '2.5.12' }
    `);
    fs.mkdirSync(path.join(tmp, "src/main/resources/properties"), { recursive: true });
    fs.writeFileSync(
      path.join(tmp, "src/main/resources/properties/application-local.yml"),
      "server:\n  port: 9090\n"
    );
    const s = await detectStack(tmp);
    assert.equal(s.port, 9090,
      `port in nested properties/ subdir should be detected; got port=${s.port}`);
  });

  it("v2.4.0: Spring Boot project with explicit log4j2 does NOT get Logback fallback", async () => {
    // Opt-out path: when the project explicitly declares log4j2 (e.g.
    // via spring-boot-starter-log4j2 which excludes Logback), the
    // fallback must NOT add Logback to avoid mis-reporting both as
    // active.
    fs.writeFileSync(path.join(tmp, "build.gradle"), `
      plugins { id 'org.springframework.boot' version '3.5.5' }
      dependencies {
        implementation 'org.springframework.boot:spring-boot-starter'
        implementation 'org.apache.logging.log4j:log4j-core'
      }
    `);
    const s = await detectStack(tmp);
    assert.ok(s.loggingFrameworks.includes("log4j2"));
    assert.ok(!s.loggingFrameworks.includes("logback"),
      `explicit log4j2 must suppress Logback fallback; got ${JSON.stringify(s.loggingFrameworks)}`);
  });

  it("detects Logback from yml logging.config reference even when gradle dep is commented", async () => {
    // Companion case: the commented-out gradle line above should not
    // trigger detection, but the active yml reference should.
    fs.writeFileSync(path.join(tmp, "build.gradle"), `
      plugins { id 'org.springframework.boot' version '3.5.5' }
      dependencies {
        // implementation 'ch.qos.logback:logback-classic:1.4.11'
      }
    `);
    fs.writeFileSync(path.join(tmp, "application.yml"), `
      logging:
        config: classpath:logback-spring.xml
    `);
    const s = await detectStack(tmp);
    assert.ok(s.loggingFrameworks.includes("logback"));
  });
});

// ─── Config file glob expansion (v2.3.2+) ────────────────────
//
// Spring Boot's config-file naming space is larger than just
// `application*.yml`. v2.3.1 only scanned `.yml`; v2.3.2 extends
// to `.yaml`, `.properties`, and `bootstrap*` variants. This matters
// for Spring Initializr defaults (`.properties`), Spring Cloud
// projects (`bootstrap.yml`), and projects using YAML-spec extension.

describe("detectStack — application/bootstrap config glob", () => {
  let tmp;
  beforeEach(() => { tmp = makeTmpDir(); });
  afterEach(() => cleanup(tmp));

  it("extracts port from application.properties (Spring Initializr default)", async () => {
    fs.writeFileSync(path.join(tmp, "build.gradle"),
      `plugins { id 'org.springframework.boot' version '3.2.0' }`);
    fs.writeFileSync(path.join(tmp, "application.properties"), `
server.port=8080
spring.datasource.url=jdbc:postgresql://localhost:5432/mydb
`);
    const s = await detectStack(tmp);
    assert.equal(s.port, 8080);
    assert.equal(s.database, "postgresql");
  });

  it("extracts from application.yaml (spec-official extension)", async () => {
    fs.writeFileSync(path.join(tmp, "build.gradle"),
      `plugins { id 'org.springframework.boot' version '3.2.0' }`);
    fs.writeFileSync(path.join(tmp, "application.yaml"), `
server:
  port: 9000
spring:
  datasource:
    url: jdbc:mysql://localhost/db
`);
    const s = await detectStack(tmp);
    assert.equal(s.port, 9000);
    assert.equal(s.database, "mysql");
  });

  it("extracts from bootstrap.yml (Spring Cloud)", async () => {
    fs.writeFileSync(path.join(tmp, "build.gradle"),
      `plugins { id 'org.springframework.boot' version '3.2.0' }`);
    fs.writeFileSync(path.join(tmp, "bootstrap.yml"), `
server:
  port: \${SERVICE_PORT:7777}
spring:
  application:
    name: my-service
`);
    const s = await detectStack(tmp);
    assert.equal(s.port, 7777);
  });

  it("extracts port from application-local.properties profile variant", async () => {
    fs.writeFileSync(path.join(tmp, "build.gradle"),
      `plugins { id 'org.springframework.boot' version '3.2.0' }`);
    fs.writeFileSync(path.join(tmp, "application-local.properties"),
      `server.port=3030\n`);
    const s = await detectStack(tmp);
    assert.equal(s.port, 3030);
  });
});
