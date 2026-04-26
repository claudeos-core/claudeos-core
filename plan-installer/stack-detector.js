/**
 * ClaudeOS-Core — Stack Detector
 *
 * Detects project language, framework, build tool, database, ORM, and frontend.
 * Supports: Java, Kotlin, TypeScript/JavaScript, Python
 * Multi-stack aware (backend + frontend simultaneous detection).
 */

const path = require("path");
const { glob } = require("glob");
const { readFileSafe, readJsonSafe, existsSafe } = require("../lib/safe-fs");
const { readStackEnvInfo } = require("../lib/env-parser");

// ─── Lookup tables ──────────────────────────────────────────────

// iBatis detection — ONLY matches Apache iBatis (EOL 2010) or
// Spring iBatis (`spring-ibatis`, `ibatis-sqlmap`, `ibatis-core`).
// This pattern intentionally avoids matching MyBatis coords
// (`org.mybatis:mybatis`, `mybatis-spring-boot-starter`) — MyBatis
// evolved out of iBatis but is a separate library with different
// XML namespace and SqlSessionFactory architecture.
//
// Why separate from the ORM_RULES tables: the other entries match on
// substring include() calls, which would produce false positives for
// iBatis (MyBatis coords contain "mybatis" which does NOT include
// "ibatis" — but legacy Spring projects may have both). We use a
// precise regex on specific library coords instead.
const IBATIS_REGEX = /\borg\.apache\.ibatis\b|\bspring-ibatis\b|\bibatis-sqlmap\b|\bibatis-core\b|\bibatis-common\b/i;

// ORM detection rules: [keyword, ormName]  (order = priority, first match wins)
const GRADLE_ORM_RULES = [
  ["mybatis", "mybatis"],
  ["jpa", "jpa"], ["hibernate", "jpa"],
  ["exposed", "exposed"],
  ["jooq", "jooq"],
  ["spring-data-jdbc", "spring-data-jdbc"],
  ["r2dbc", "r2dbc"],
];

const MAVEN_ORM_RULES = [
  ["mybatis", "mybatis"],
  ["jpa", "jpa"], ["hibernate", "jpa"],
  ["exposed", "exposed"],
  ["jooq", "jooq"],
];

const NODE_ORM_RULES = [
  [["@prisma/client", "prisma"], "prisma"],
  [["typeorm"], "typeorm"],
  [["sequelize"], "sequelize"],
  [["drizzle-orm"], "drizzle"],
  [["knex"], "knex"],
];

// DB detection rules: [keyword, dbName]
const DB_KEYWORD_RULES = [
  ["postgresql", "postgresql"], ["postgres", "postgresql"],
  ["mariadb", "mariadb"],        // v2.3.2+: MariaDB is a distinct DB, not a MySQL alias
  ["mysql", "mysql"],
  ["oracle", "oracle"],
  ["mongodb", "mongodb"],
  ["sqlite", "sqlite"],
];

// h2 needs word-boundary check (avoid oauth2, cache2k false positives)
const H2_REGEX = /\bh2\b/;

// ─── Helpers ────────────────────────────────────────────────────

function detectFirst(stack, field, content, rules) {
  if (stack[field]) return;
  for (const [keyword, value] of rules) {
    if (content.includes(keyword)) {
      stack[field] = value;
      stack.detected.push(value);
      return;
    }
  }
}

// Logging framework rules: [regex, frameworkName]
// Order matters only for identification — all matches are collected.
// We use regexes (not plain includes()) because "log4j" is a substring
// of "log4jdbc" and "log4j-to-slf4j", which are JDBC adapters /
// bridges, not Log4j2 as the primary logging framework.
const LOGGING_RULES = [
  // Log4j2 — the current Apache Logging project.
  // Matches artifact coords in two forms:
  //   - Gradle coord string: `org.apache.logging.log4j:log4j-core`
  //     (or `org.apache.logging.log4j.log4j-core` in some catalogs).
  //   - Maven XML: `<groupId>org.apache.logging.log4j</groupId>` paired
  //     with `<artifactId>log4j-core</artifactId>`. The two tags are
  //     matched on the same content (after comment stripping, so the
  //     order and proximity within pom.xml is what matters — both must
  //     be present somewhere in the non-commented dependency region).
  // Does NOT match `log4j-to-slf4j` / `log4j-api` alone (which bridge
  // Log4j API to SLF4J and are usually paired with Logback).
  [/org\.apache\.logging\.log4j[.:]log4j-core/i, "log4j2"],
  [/<groupId>\s*org\.apache\.logging\.log4j\s*<\/groupId>[\s\S]{0,300}?<artifactId>\s*log4j-core\s*<\/artifactId>/i, "log4j2"],
  // Log4j2 via config file patterns
  [/\blog4j2[\w.-]*\.(?:xml|properties|yaml|yml|json)\b/i, "log4j2"],

  // Logback — Spring Boot's default. Matches the dependency in two forms:
  //   - Gradle coord string: `ch.qos.logback:logback-classic`
  //   - Maven XML: `<groupId>ch.qos.logback</groupId>` paired with
  //     `<artifactId>logback-classic</artifactId>` (or logback-core).
  // Also matches config file references `logback-*.xml` / `logback*.groovy`.
  [/ch\.qos\.logback[.:]logback-classic|logback[\w.-]*\.xml|logback[\w.-]*\.groovy/i, "logback"],
  [/<groupId>\s*ch\.qos\.logback\s*<\/groupId>[\s\S]{0,300}?<artifactId>\s*logback-(?:classic|core)\s*<\/artifactId>/i, "logback"],

  // log4jdbc — JDBC logging adapter. Not a primary logging framework
  // but useful metadata because CLAUDE.md / logging standards commonly
  // describe both the primary framework AND JDBC adapters.
  [/log4jdbc/i, "log4jdbc"],

  // Log4j 1.x (EOL 2015) — still appears in legacy projects.
  // The challenge is distinguishing it from Log4j2 adapters such as
  // `log4j-to-slf4j`, `log4j-api`, `log4j-core` (all Log4j2 ecosystem).
  //
  // The groupId for Log4j 1.x is literally `log4j` (not
  // `org.apache.logging.log4j`), so we anchor on the coord form
  // `log4j:log4j` with surrounding quotes/whitespace boundaries so
  // that `org.apache.logging.log4j:log4j-to-slf4j` does NOT match
  // (word boundary alone isn't enough — `log4j:log4j` appears as a
  // substring in `...log4j:log4j-to-slf4j`).
  //
  // Also matches:
  //   <groupId>log4j</groupId>  (Maven XML form)
  //   log4j.properties / log4j.xml (config files, not log4j2.*)
  [
    /(?:['":\s]log4j:log4j(?:[:'"]|\s|$))|<groupId>\s*log4j\s*<\/groupId>|\blog4j(?!2)\.(?:properties|xml)\b/im,
    "log4j",
  ],
];

// Comment stripping for dependency/config content before regex scanning.
// Used by detectLogging and the Maven DB scan to ensure commented-out
// dependencies are never interpreted as "in use".
//
// Three comment styles are handled:
//   1. Line-level `//` (Gradle Kotlin/Groovy DSL).
//   2. Line-level `#` (yml, properties, shell).
//   3. Block-level `<!-- ... -->` (Maven pom.xml, XML config). Commonly
//      used to disable a whole `<dependency>` block during migration
//      (e.g., commenting out an old log4j 1.x dep after switching to
//      Spring Boot's managed Logback). Block stripping is non-greedy
//      and multi-line so nested blocks and `<dependency>` blocks
//      spanning many lines are handled correctly.
//
// Returns a new string with the commented regions removed (replaced
// with a newline to preserve approximate line counts for any
// downstream logic that cares about position). Content outside
// comments is preserved byte-for-byte.
function stripComments(content) {
  // Step 1: remove XML block comments first (can span multiple lines).
  // Non-greedy `[\s\S]*?` matches newlines; the `/g` flag removes every
  // occurrence. We intentionally do NOT handle nested `<!-- ... -->`
  // because XML spec forbids nesting — any well-formed `<!-- ... -->`
  // is flat.
  const withoutBlock = content.replace(/<!--[\s\S]*?-->/g, "\n");
  // Step 2: drop lines that are entirely a line-comment.
  return withoutBlock
    .split(/\r?\n/)
    .filter(line => {
      const trimmed = line.trimStart();
      return !trimmed.startsWith("//") && !trimmed.startsWith("#");
    })
    .join("\n");
}

function detectLogging(stack, content) {
  // Collect every matching logging framework. Uses stack.loggingFrameworks
  // array (multi-valued) because it is common for a project to declare
  // two: Logback as primary + log4jdbc as JDBC adapter.
  //
  // Comment stripping: commented-out lines in Gradle (`//`),
  // yml/properties/shell-style (`#`), and XML block comments
  // (`<!-- ... -->`) must not match. Without this, a line like
  // `// implementation 'ch.qos.logback:logback-classic'` (commented
  // out because the project switched away from explicit version
  // pinning to Spring Boot's managed version) or a pom.xml
  // `<!-- <dependency>log4j:log4j:1.2.17</dependency> -->` block
  // (commented out during migration to Logback) is mistakenly
  // reported as in use. We preserve the classic Logback detection
  // path via the `logging.config:` yml reference or the logback
  // config file glob elsewhere.
  const stripped = stripComments(content);
  for (const [regex, name] of LOGGING_RULES) {
    if (regex.test(stripped) && !stack.loggingFrameworks.includes(name)) {
      stack.loggingFrameworks.push(name);
    }
  }
}

function detectDb(stack, content, rules) {
  // Iterate every rule and record every DB keyword present in `content`.
  // Two outputs:
  //   (a) stack.database — primary DB (first match, legacy semantics).
  //       Skipped once set, so earlier-called detectDb invocations
  //       (Gradle build.gradle → application.yml → pom.xml) establish
  //       the primary DB in source-file order.
  //   (b) stack.databases — every DB keyword detected across all sources.
  //       Deduped and order-preserved. Fills in multi-dialect projects.
  for (const [keyword, value] of rules) {
    if (content.includes(keyword)) {
      if (!stack.database) {
        stack.database = value;
        stack.detected.push(value);
      }
      if (!stack.databases.includes(value)) {
        stack.databases.push(value);
      }
    }
  }
  // h2 with word boundary — same pattern, separate from the keyword
  // rules table because it needs regex (to avoid false positives from
  // oauth2, cache2k, etc.).
  if (H2_REGEX.test(content)) {
    if (!stack.database) {
      stack.database = "h2";
      stack.detected.push("h2");
    }
    if (!stack.databases.includes("h2")) {
      stack.databases.push("h2");
    }
  }
}


/**
 * Detect the project's technology stack.
 * @param {string} ROOT - project root path
 * @returns {Promise<object>} stack info
 */
async function detectStack(ROOT) {
  const stack = {
    language: null, languageVersion: null,
    framework: null, frameworkVersion: null,
    buildTool: null, database: null, orm: null,
    // databases: multi-dialect projects declare more than one DB
    // driver (e.g., PostgreSQL + MariaDB + Oracle for dialect-switchable
    // backends). `database` keeps its legacy semantics of "the primary
    // DB that wins the first-match race" for backward compatibility
    // with v2.x consumers; `databases` is the full ordered list of
    // every DB keyword detected across all config sources. Consumers
    // that care about multi-dialect support (Pass 1 prompts, Pass 3
    // standard files for database-schema docs) should prefer this
    // field. Empty array, not null, when no DB is detected — makes
    // the array-comprehension in prompts simpler.
    databases: [],
    orm: null,
    // loggingFrameworks: detected JVM logging frameworks (Logback,
    // Log4j2, SLF4J-only, etc.). Like `databases`, this is an
    // informational list for Pass 1 prompts — the LLM can use it to
    // ground logging-related standard/rule content. Empty array when
    // no JVM logging evidence is found (e.g., Node.js projects).
    // Mainly populated from Gradle/Maven dependency keywords and from
    // `logging.config` references in application.yml.
    loggingFrameworks: [],
    frontend: null, frontendVersion: null,
    packageManager: null, monorepo: null, workspaces: null,
    detected: [],
  };

  // ── Java/Kotlin: Gradle ──
  const gradleFile = existsSafe(path.join(ROOT, "build.gradle.kts"))
    ? "build.gradle.kts"
    : existsSafe(path.join(ROOT, "build.gradle")) ? "build.gradle" : null;
  if (gradleFile) {
    const g = readFileSafe(path.join(ROOT, gradleFile));
    if (g) {
      stack.buildTool = "gradle"; stack.detected.push(gradleFile);
      // v2.4.0 — JVM project package manager. Set "gradle" so generated docs
      // and downstream tooling don't show "PackageMgr: none" for a build tool
      // that IS the package manager. Only set if not already detected.
      if (!stack.packageManager) stack.packageManager = "gradle";
      if (g.includes("spring-boot")) { stack.language = "java"; stack.framework = "spring-boot"; stack.detected.push("spring-boot"); }
      const svPatterns = [
        /org\.springframework\.boot.*version\s*['"]([^'"]+)['"]/,
        /id\s*\(\s*["']org\.springframework\.boot["']\s*\)\s*version\s*["']([^"']+)["']/,
        /spring-boot-dependencies:([^'")\s]+)/,
      ];
      for (const pattern of svPatterns) {
        const sv = g.match(pattern);
        if (sv) {
          // Reject captures that are variable references like `${var}`
          // — those need resolution via the fallback block below.
          if (/^\$\{/.test(sv[1])) continue;
          stack.frameworkVersion = sv[1];
          break;
        }
      }
      // Fallback: some projects centralize the Spring Boot version in
      // an `ext { springBootVersion = '3.5.5' }` block and reference
      // it from the plugin declaration (`version "${springBootVersion}"`).
      // If none of the above patterns matched but we can find a
      // variable-reference form, resolve the variable inside the same
      // build.gradle.
      if (!stack.frameworkVersion) {
        const svVarRef = g.match(/springframework\.boot[^\n]*version\s*['"]\$\{?(\w+)\}?['"]/);
        if (svVarRef) {
          const varName = svVarRef[1];
          const escapedVar = varName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          const varDef = new RegExp(`${escapedVar}\\s*=\\s*['"]([\\d.]+)['"]`);
          const varVal = g.match(varDef);
          if (varVal) stack.frameworkVersion = varVal[1];
        }
      }
      // Java version — Gradle writes this in several forms. Try each
      // pattern until one matches. Earlier patterns take precedence.
      //
      // Pattern 1: direct numeric literal (most common, v1.x era)
      //   sourceCompatibility = 21
      //   sourceCompatibility = '21'
      //   sourceCompatibility = "21"
      //
      // Pattern 2: JavaVersion enum (common with Spring Initializr)
      //   sourceCompatibility = JavaVersion.VERSION_21
      //   sourceCompatibility = JavaVersion.VERSION_1_8   (Java 8)
      //
      // Pattern 3: Gradle toolchain block (modern, Gradle 6.7+)
      //   java { toolchain { languageVersion = JavaLanguageVersion.of(21) } }
      //
      // Pattern 4: ext variable reference (common in team/enterprise
      // projects that centralize versions)
      //   ext { javaVersion = '21' }
      //   java { sourceCompatibility = "${javaVersion}" }
      //
      // Without pattern 4, an ext-variable-reference-only build.gradle
      // produces languageVersion=null, leaving the LLM to guess (e.g.
      // "Java 17+" for a Spring Boot 3.x project that actually targets
      // Java 21).
      const javaVersionPatterns = [
        // (1) numeric literal on sourceCompatibility or targetCompatibility
        /sourceCompatibility\s*=\s*['"]?(\d+)['"]?/,
        /targetCompatibility\s*=\s*['"]?(\d+)['"]?/,
        // (2) JavaVersion enum — supports both VERSION_21 and VERSION_1_8
        /JavaVersion\.VERSION_(?:1_)?(\d+)/,
        // (3) toolchain block
        /JavaLanguageVersion\.of\s*\(\s*(\d+)\s*\)/,
      ];
      for (const pattern of javaVersionPatterns) {
        const m = g.match(pattern);
        if (m) { stack.languageVersion = m[1]; break; }
      }
      // (4) ext variable reference fallback — if the Compatibility
      // assignment used "${varName}" we now resolve varName inside the
      // same file's ext block. We only run this if the numeric patterns
      // above did not already find a value.
      if (!stack.languageVersion) {
        const varRefMatch = g.match(/(?:source|target)Compatibility\s*=\s*["']?\$\{?(\w+)\}?["']?/);
        if (varRefMatch) {
          const varName = varRefMatch[1];
          // Escape the variable name for use in a RegExp. In practice
          // Gradle variable names are [A-Za-z0-9_], so escaping is a
          // defensive guard against unexpected characters, not a
          // practical necessity for today's inputs.
          const escapedVarName = varName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          const extAssign = new RegExp(`${escapedVarName}\\s*=\\s*['"]?(\\d+)['"]?`);
          const extVal = g.match(extAssign);
          if (extVal) stack.languageVersion = extVal[1];
        }
      }

      // iBatis detection: runs BEFORE generic ORM_RULES because the
      // generic table's "mybatis" keyword (substring match) would
      // happily match Apache iBatis coords like `ibatis-core` if the
      // order were reversed — "mybatis" is not a substring of
      // "ibatis", but a future maintainer adding "ibatis" to the
      // generic table would create ambiguity. Explicit precedence here.
      if (IBATIS_REGEX.test(g)) {
        stack.orm = "ibatis";
        stack.detected.push("ibatis");
      } else {
        detectFirst(stack, "orm", g, GRADLE_ORM_RULES);
      }
      // Exclude "postgres" (substring of postgresql — false positive on r2dbc-postgres) and "sqlite" (rare in Gradle deps)
      // "postgresql" is still matched via DB_KEYWORD_RULES; h2 uses word-boundary check separately
      detectDb(stack, g, DB_KEYWORD_RULES.filter(([kw]) => !["postgres", "sqlite"].includes(kw)));

      // Logging framework detection from Gradle dependencies.
      detectLogging(stack, g);

      // Kotlin detection: override language if Kotlin plugin found
      if (g.includes("kotlin") || g.includes("org.jetbrains.kotlin")) {
        stack.language = "kotlin"; stack.detected.push("kotlin");
        const kvPatterns = [
          /kotlin\S*\s*version\s*['"]([^'"]+)['"]/,
          /org\.jetbrains\.kotlin\S*\s*version\s*['"]([^'"]+)['"]/,
          /kotlin\("jvm"\)\s*version\s*["']([^"']+)["']/,
        ];
        for (const pattern of kvPatterns) {
          const match = g.match(pattern);
          if (match) { stack.languageVersion = match[1]; break; }
        }
      }
    }
  }

  // ── Gradle: version catalogs (libs.versions.toml) ──
  const versionCatalog = path.join(ROOT, "gradle/libs.versions.toml");
  if (existsSafe(versionCatalog)) {
    const vc = readFileSafe(versionCatalog);
    if (vc) {
      stack.detected.push("libs.versions.toml");
      if (!stack.languageVersion) {
        const kvMatch = vc.match(/kotlin\s*=\s*["']([^"']+)["']/);
        if (kvMatch) stack.languageVersion = kvMatch[1];
      }
      if (!stack.frameworkVersion) {
        const sbMatch = vc.match(/spring-boot\s*=\s*["']([^"']+)["']/);
        if (sbMatch) stack.frameworkVersion = sbMatch[1];
      }
      // Version catalog ORM (labels include " (catalog)" suffix)
      if (!stack.orm && vc.includes("exposed")) { stack.orm = "exposed"; stack.detected.push("exposed (catalog)"); }
      else if (!stack.orm && vc.includes("jooq")) { stack.orm = "jooq"; stack.detected.push("jooq (catalog)"); }
      else if (!stack.orm && (vc.includes("jpa") || vc.includes("hibernate"))) { stack.orm = "jpa"; stack.detected.push("jpa (catalog)"); }
      // DBs from version catalog — dual output (primary + array)
      const catalogDbs = [
        ["postgresql", "postgresql"],
        ["mysql", "mysql"],
        ["mongodb", "mongodb"],
      ];
      for (const [keyword, value] of catalogDbs) {
        if (vc.includes(keyword)) {
          if (!stack.database) stack.database = value;
          if (!stack.databases.includes(value)) stack.databases.push(value);
        }
      }
      if (!stack.language && vc.includes("kotlin")) {
        stack.language = "kotlin"; stack.detected.push("kotlin (catalog)");
      }
    }
  }

  // ── Kotlin: multi-module Gradle detection ──
  if (stack.language !== "kotlin" && stack.buildTool === "gradle") {
    const subBuildFiles = await glob("**/build.gradle{,.kts}", { cwd: ROOT, ignore: ["**/node_modules/**", "**/build/**"] });
    for (const sbf of subBuildFiles.slice(0, 5)) {
      const sc = readFileSafe(path.join(ROOT, sbf));
      if (sc && (sc.includes("kotlin") || sc.includes("org.jetbrains.kotlin"))) {
        stack.language = "kotlin"; stack.detected.push("kotlin (submodule)");
        const kv = sc.match(/kotlin\S*\s*version\s*['"]([^'"]+)['"]/);
        if (kv) stack.languageVersion = kv[1];
        break;
      }
    }
  }

  // ── Kotlin: detect CQRS/multi-module from settings.gradle ──
  const settingsFile = existsSafe(path.join(ROOT, "settings.gradle.kts"))
    ? "settings.gradle.kts"
    : existsSafe(path.join(ROOT, "settings.gradle")) ? "settings.gradle" : null;
  if (settingsFile && stack.language === "kotlin") {
    const sg = readFileSafe(path.join(ROOT, settingsFile));
    if (sg) {
      const sgClean = sg.split("\n").filter(l => !l.trimStart().startsWith("//")).join("\n");
      const includes = [];
      const includeBlocks = [...sgClean.matchAll(/include\s*\(([^)]*)\)/gs)];
      for (const block of includeBlocks) {
        const quotedValues = [...block[1].matchAll(/["']([^"']+)["']/g)].map(m => m[1]);
        includes.push(...quotedValues);
      }
      if (includes.length === 0) {
        const groovyIncludes = [...sgClean.matchAll(/include\s+(.+)/g)];
        for (const line of groovyIncludes) {
          const quotedValues = [...line[1].matchAll(/['"]([^'"]+)['"]/g)].map(m => m[1]);
          includes.push(...quotedValues);
        }
      }
      const cleanModules = includes.map(m => m.replace(/^:/, ""));
      if (cleanModules.length > 0) {
        stack.multiModule = true;
        stack.modules = cleanModules;
        stack.detected.push(`multi-module (${cleanModules.length} modules)`);
        const hasCommand = cleanModules.some(m => m.includes("command"));
        const hasQuery = cleanModules.some(m => m.includes("query"));
        const hasBff = cleanModules.some(m => m.includes("bff"));
        if (hasCommand && hasQuery) { stack.architecture = "cqrs"; stack.detected.push("cqrs"); }
        if (hasBff) { stack.detected.push("bff"); }
      }
    }
  }

  // ── Java: Maven ──
  if (existsSafe(path.join(ROOT, "pom.xml"))) {
    const pom = readFileSafe(path.join(ROOT, "pom.xml"));
    if (pom) {
      if (!stack.buildTool) { stack.buildTool = "maven"; stack.language = "java"; stack.detected.push("pom.xml"); }
      // v2.4.0 — JVM package manager (parallel to Gradle case above).
      if (!stack.packageManager) stack.packageManager = "maven";
      const sv = pom.match(/<spring-boot[^>]*version>([^<]+)/);
      if (sv) stack.frameworkVersion = sv[1];
      // Java version — Maven commonly uses three patterns:
      //
      // Pattern 1: direct <java.version>21</java.version>
      //
      // Pattern 2: <maven.compiler.source>21</maven.compiler.source>
      //   (and matching <maven.compiler.target>), used when the project
      //   avoids the Spring Boot parent's `java.version` property.
      //
      // Pattern 3: property reference — `<java.version>${project.javaVersion}</java.version>`
      //   where `<project.javaVersion>21</project.javaVersion>` is
      //   declared earlier in <properties>. Enterprise projects
      //   centralize versions this way so all child modules pick up the
      //   same value.
      //
      // We try patterns in order (1) → (2) → (3). Pattern 3 is a
      // fallback that resolves the referenced property within the same
      // pom.xml (cross-file resolution — parent pom, BOM — is out of
      // scope; the resulting null falls through to LLM-side analysis).
      const mvnJavaPatterns = [
        /<java\.version>\s*(\d+)\s*<\/java\.version>/,
        /<maven\.compiler\.source>\s*(\d+)\s*<\/maven\.compiler\.source>/,
        /<maven\.compiler\.target>\s*(\d+)\s*<\/maven\.compiler\.target>/,
      ];
      for (const pattern of mvnJavaPatterns) {
        const m = pom.match(pattern);
        if (m) { stack.languageVersion = m[1]; break; }
      }
      // Pattern 3 fallback: if <java.version> references a property,
      // resolve it inside the same pom.
      if (!stack.languageVersion) {
        const propRef = pom.match(/<java\.version>\s*\$\{([^}]+)\}\s*<\/java\.version>/);
        if (propRef) {
          const propName = propRef[1].trim();
          const escapedProp = propName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          const propDef = new RegExp(`<${escapedProp}>\\s*(\\d+)\\s*</${escapedProp}>`);
          const propVal = pom.match(propDef);
          if (propVal) stack.languageVersion = propVal[1];
        }
      }
      // For dependency detection (framework, ORM, DB, logging), strip
      // XML block comments first. A `<!-- <dependency>...</dependency> -->`
      // block is a standard Maven pattern for disabling a dep during
      // migration (e.g., commenting out a legacy log4j 1.x dep after
      // switching to Spring Boot's managed Logback); without stripping,
      // those deps are counted as "in use". The `<properties>` scan
      // above stays on the raw `pom` because (a) commented-out property
      // definitions are rare in practice and (b) the property-reference
      // resolution already scopes itself to the declared property name.
      const pomClean = stripComments(pom);
      if (pomClean.includes("spring-boot") && !stack.framework) { stack.framework = "spring-boot"; stack.detected.push("spring-boot"); }
      if (IBATIS_REGEX.test(pomClean)) {
        stack.orm = "ibatis";
        stack.detected.push("ibatis");
      } else {
        detectFirst(stack, "orm", pomClean, MAVEN_ORM_RULES);
      }
      // Maven DB: original does not push to detected (unlike Gradle)
      // DB keyword scan: reuses detectDb's dual-output semantics
      // (primary first-match → stack.database; every match →
      // stack.databases). Maven original did not push to `detected`
      // (unlike Gradle), so we preserve that omission here.
      const mvnDbRules = [
        ["postgresql", "postgresql"],
        ["mariadb", "mariadb"],
        ["mysql", "mysql"],
        ["oracle", "oracle"],
        ["mongodb", "mongodb"],
        ["sqlite", "sqlite"],
      ];
      for (const [keyword, value] of mvnDbRules) {
        if (pomClean.includes(keyword)) {
          if (!stack.database) stack.database = value;
          if (!stack.databases.includes(value)) stack.databases.push(value);
        }
      }
      if (H2_REGEX.test(pomClean)) {
        if (!stack.database) stack.database = "h2";
        if (!stack.databases.includes("h2")) stack.databases.push("h2");
      }

      // Logging framework detection from Maven dependencies. detectLogging
      // does its own comment stripping internally, so passing raw `pom`
      // works correctly — but we pass `pomClean` for consistency with
      // the other Maven dependency scans in this block.
      detectLogging(stack, pomClean);
    }
  }

  // ── Node.js ──
  if (existsSafe(path.join(ROOT, "package.json"))) {
    const pkg = readJsonSafe(path.join(ROOT, "package.json"));
    if (pkg) {
      stack.detected.push("package.json");

      // ── Monorepo detection ──
      // Detect monorepo markers: turbo.json, pnpm-workspace.yaml, lerna.json, package.json#workspaces
      if (existsSafe(path.join(ROOT, "turbo.json"))) { stack.monorepo = "turborepo"; stack.detected.push("turbo.json"); }
      else if (existsSafe(path.join(ROOT, "pnpm-workspace.yaml"))) { stack.monorepo = "pnpm-workspace"; stack.detected.push("pnpm-workspace.yaml"); }
      else if (existsSafe(path.join(ROOT, "lerna.json"))) { stack.monorepo = "lerna"; stack.detected.push("lerna.json"); }
      else if (pkg.workspaces) { stack.monorepo = "npm-workspaces"; stack.detected.push("npm-workspaces"); }
      if (stack.monorepo) {
        // Resolve workspace paths from package.json#workspaces or pnpm-workspace.yaml
        let wsPatterns = [];
        if (Array.isArray(pkg.workspaces)) wsPatterns = pkg.workspaces;
        else if (pkg.workspaces && Array.isArray(pkg.workspaces.packages)) wsPatterns = pkg.workspaces.packages;
        if (wsPatterns.length === 0 && existsSafe(path.join(ROOT, "pnpm-workspace.yaml"))) {
          const wy = readFileSafe(path.join(ROOT, "pnpm-workspace.yaml"));
          if (wy) {
            const wm = [...wy.matchAll(/- ['"]?([^'"#\n]+)['"]?/g)].map(m => m[1].trim());
            if (wm.length > 0) wsPatterns = wm;
          }
        }
        if (wsPatterns.length > 0) stack.workspaces = wsPatterns;
      }

      // Merge deps from root + sub-package package.json files (monorepo)
      // Sub-packages provide framework/frontend/ORM that root may lack
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };
      if (stack.monorepo) {
        const subPkgGlobs = ["{apps,packages}/*/package.json"];
        if (stack.workspaces) {
          for (const ws of stack.workspaces) {
            const wsGlob = /[*?]/.test(ws)
              ? ws.replace(/\/?\*?\*?$/, "/*/package.json")
              : `${ws.replace(/\/?$/, "")}/{,*/}package.json`;
            if (!subPkgGlobs.includes(wsGlob)) subPkgGlobs.push(wsGlob);
          }
        }
        for (const spg of subPkgGlobs) {
          const subPkgs = await glob(spg, { cwd: ROOT, ignore: ["**/node_modules/**"] });
          for (const sp of subPkgs) {
            const sub = readJsonSafe(path.join(ROOT, sp));
            if (sub) Object.assign(deps, sub.dependencies, sub.devDependencies);
          }
        }
      }

      if (!stack.language) stack.language = deps.typescript ? "typescript" : "javascript";
      if (deps.typescript) { stack.detected.push("typescript"); const tv = deps.typescript.match(/(\d+(?:\.\d+)*)/); if (tv) stack.languageVersion = tv[1]; }

      // Frontend (Angular checked before React — Angular projects may include react in devDependencies)
      const frontendRules = [
        ["next", "nextjs", "next.js"],
        ["@angular/core", "angular", "angular"],
        ["react", "react", "react"],
        ["vue", "vue", "vue"],
      ];
      for (const [dep, name, label] of frontendRules) {
        if (deps[dep] && !stack.frontend) {
          stack.frontend = name; stack.detected.push(label);
          stack.frontendVersion = deps[dep].replace(/[^0-9.]/g, "");
          break;
        }
      }

      // Backend framework (NestJS > Fastify > Express — more specific first)
      const frameworkRules = [
        ["@nestjs/core", "nestjs", "nestjs"],
        ["fastify", "fastify", "fastify"],
        ["express", "express", "express"],
      ];
      for (const [dep, name, label] of frameworkRules) {
        if (deps[dep] && !stack.framework) {
          stack.framework = name; stack.detected.push(label);
          if (dep !== "express") stack.frameworkVersion = deps[dep].replace(/[^0-9.]/g, "");
          break;
        }
      }

      // Vite as framework (only if no backend framework was detected — Vite is a build/dev tool for SPA)
      if (deps.vite && !stack.framework) {
        stack.framework = "vite";
        stack.detected.push("vite");
        stack.frameworkVersion = deps.vite.replace(/[^0-9.]/g, "");
      }

      // ORM
      for (const [depKeys, ormName] of NODE_ORM_RULES) {
        if (stack.orm) break;
        if (depKeys.some(d => deps[d])) {
          stack.orm = ormName; stack.detected.push(ormName);
        }
      }
      if (deps.mongoose) {
        if (!stack.database) stack.database = "mongodb";
        if (!stack.databases.includes("mongodb")) stack.databases.push("mongodb");
        if (!stack.orm) stack.orm = "mongoose";
        stack.detected.push("mongoose");
      }

      // DB
      const nodeDbRules = [["pg", "postgresql"], ["mysql2", "mysql"], ["mongodb", "mongodb"]];
      for (const [dep, db] of nodeDbRules) {
        if (deps[dep] && !stack.database) { stack.database = db; break; }
      }

      // Package manager
      stack.packageManager = existsSafe(path.join(ROOT, "pnpm-lock.yaml")) ? "pnpm"
        : existsSafe(path.join(ROOT, "yarn.lock")) ? "yarn" : "npm";

      if (pkg.engines && pkg.engines.node && !stack.languageVersion) {
        const nv = pkg.engines.node.match(/(\d+(?:\.\d+)*)/);
        if (nv) stack.languageVersion = nv[1];
      }
    }
  }

  // ── Python ──
  const hasPyproject = existsSafe(path.join(ROOT, "pyproject.toml"));
  const hasRequirements = existsSafe(path.join(ROOT, "requirements.txt"));
  if (hasPyproject || hasRequirements) {
    if (!stack.language) stack.language = "python";
    stack.detected.push("python");

    const pyFrameworkRules = [["django", "django"], ["fastapi", "fastapi"], ["flask", "flask"]];
    const pyOrmRules = [["sqlalchemy", "sqlalchemy"], ["tortoise", "tortoise-orm"]];

    if (hasPyproject) {
      const pp = readFileSafe(path.join(ROOT, "pyproject.toml"));
      if (pp) {
        const pv = pp.match(/python\s*=\s*"[><=^~]*(\d+\.\d+)/);
        if (pv && !stack.languageVersion) stack.languageVersion = pv[1];
        for (const [kw, name] of pyFrameworkRules) {
          if (pp.includes(kw) && !stack.framework) { stack.framework = name; stack.detected.push(name); break; }
        }
        for (const [kw, name] of pyOrmRules) {
          if (pp.includes(kw) && !stack.orm) { stack.orm = name; stack.detected.push(name); break; }
        }
        if (pp.includes("poetry")) { stack.packageManager = "poetry"; }
        if (pp.includes("pdm")) { stack.packageManager = "pdm"; }
      }
    }

    if (hasRequirements) {
      const r = readFileSafe(path.join(ROOT, "requirements.txt"));
      if (r) {
        for (const [kw, name] of pyFrameworkRules) {
          if (r.includes(kw) && !stack.framework) { stack.framework = name; stack.detected.push(name); break; }
        }
        for (const [kw, name] of pyOrmRules) {
          if (r.includes(kw) && !stack.orm) { stack.orm = name; break; }
        }
        const pyDbs = [
          ["psycopg", "postgresql"],
          ["mysqlclient", "mysql"],
        ];
        for (const [kw, value] of pyDbs) {
          if (r.includes(kw)) {
            if (!stack.database) stack.database = value;
            if (!stack.databases.includes(value)) stack.databases.push(value);
          }
        }
      }
    }

    if (!stack.packageManager) {
      stack.packageManager = existsSafe(path.join(ROOT, "Pipfile")) ? "pipenv"
        : existsSafe(path.join(ROOT, "poetry.lock")) ? "poetry" : "pip";
    }
  }

  // ── DB from config files ──
  //
  // Glob covers Spring Boot's full configuration-file naming space:
  //   - `application.{yml,yaml,properties}` (Spring Initializr default;
  //     .yml is most common, .yaml is spec-official, .properties is the
  //     framework default when nothing specifies)
  //   - `application-*.{yml,yaml,properties}` profile variants
  //     (e.g. application-local.yml, application-dev.properties)
  //   - `bootstrap.{yml,yaml,properties}` + profile variants
  //     (Spring Cloud Config / Consul / Eureka; loaded before `application.*`
  //     so must be part of the same scan)
  //
  // The regexes inside the loop are format-agnostic: the `port` regex
  // set covers both yml `server:\n  port: N` syntax and .properties
  // `server.port=N` flat-key syntax. DB keyword detection is
  // substring-based and works identically across all three formats.
  const configGlob = "**/{application,bootstrap}*.{yml,yaml,properties}";
  const ymls = await glob(configGlob, {
    cwd: ROOT, absolute: true,
    ignore: ["**/node_modules/**", "**/build/**", "**/target/**", "**/.gradle/**"],
  });
  for (const y of ymls) {
    const c = readFileSafe(y);
    if (!c) continue;
    // DB detection — dual output per source file.
    //
    // NOTE on mariadb: earlier versions of this detector deliberately
    // OMITTED mariadb from yml-side keyword matching because some
    // projects mention mariadb in commented-out profile sections or
    // as fallback drivers. With multi-dialect support (`stack.databases`
    // array in v2.3.2+), the cost of over-reporting is lower than the
    // cost of under-reporting — `databases` is an informational list
    // for the LLM, and a false positive is easier to filter out in the
    // prompt than a miss is to detect. So mariadb is now included.
    const ymlDbs = [
      ["postgresql", "postgresql"],
      ["mariadb", "mariadb"],
      ["mysql", "mysql"],
      ["oracle", "oracle"],
      ["mongodb", "mongodb"],
    ];
    for (const [keyword, value] of ymlDbs) {
      if (c.includes(keyword)) {
        if (!stack.database) stack.database = value;
        if (!stack.databases.includes(value)) stack.databases.push(value);
      }
    }
    if (H2_REGEX.test(c)) {
      if (!stack.database) stack.database = "h2";
      if (!stack.databases.includes("h2")) stack.databases.push("h2");
    }
    if (c.includes("sqlite")) {
      if (!stack.database) stack.database = "sqlite";
      if (!stack.databases.includes("sqlite")) stack.databases.push("sqlite");
    }
    if (!stack.port) {
      // Port — Spring Boot accepts both plain numeric values and
      // property placeholders with a default:
      //   port: 8090
      //   port: ${APP_PORT:8090}         ← Spring placeholder, default 8090
      //   server.port=8090               ← .properties-style, yml-inline
      //   server.port=${SERVER_PORT:8090}
      //
      // Without the placeholder patterns (3)/(4), a Spring Boot yml
      // using `port: ${APP_PORT:8090}` produces stack.port=null, leaving
      // the LLM to guess (e.g. assuming the "port 8080" Spring Boot
      // framework default).
      const portPatterns = [
        // (1) direct numeric literal in yml `server:\n  port: N`
        //     (port immediately after server: with no intermediate keys)
        /server:\s*\n\s*port:\s*(\d+)/,
        // (2) flat-key style `server.port=N` or `server.port: N`
        /server\.port\s*[=:]\s*(\d+)/,
        // (3) placeholder-with-default in yml `server:\n  port: ${VAR:N}`
        //     — capture the default value, which is what the app falls back
        //     to when VAR is unset (the most common dev/local scenario)
        /server:\s*\n\s*port:\s*\$\{[^}:]+:(\d+)\}/,
        // (4) placeholder-with-default in flat-key form
        /server\.port\s*[=:]\s*\$\{[^}:]+:(\d+)\}/,
        // (5) v2.4.0 — nested-block yml: `server:` block with intermediate
        //     keys (e.g. `ssl:`, `http:`, `error:`, `tomcat:`, `compression:`)
        //     BEFORE `port:`. Real Spring Boot configs often look like:
        //       server:
        //         ssl:
        //           key-store: ...
        //         port: 8443
        //     Pre-v2.4.0 pattern (1) requires `port:` immediately after
        //     `server:\n`, missing this common form. The lazy-quantified
        //     gap allows up to ~20000 chars between `server:` and `port:`,
        //     while the leading-whitespace constraint on `port:` ensures
        //     we match an INDENTED key (still inside the server: block),
        //     not an outdented sibling key at column 0.
        //
        //     v2.4.0: window expanded from 2000 to 20000 chars after
        //     observing an enterprise YAML where the `server:` block
        //     contained ssl/http/tomcat/compression children spanning
        //     ~3000 chars before `port: 8443`. The 2000 limit silently
        //     missed the port and the detector defaulted to the Spring
        //     Boot 8080 fallback.
        /^server:[\s\S]{0,20000}?\n[ \t]+port:\s*(\d+)/m,
        // (6) v2.4.0 — same nested-block form with placeholder-with-default
        /^server:[\s\S]{0,20000}?\n[ \t]+port:\s*\$\{[^}:]+:(\d+)\}/m,
      ];
      for (const re of portPatterns) {
        const pm = c.match(re);
        if (pm) { stack.port = parseInt(pm[1]); break; }
      }
    }

    // Logging framework detection from yml. `logging.config:
    // classpath:logback-app.xml` tells us Logback is primary; bare
    // mentions of log4jdbc in the doc mean the adapter is in use.
    detectLogging(stack, c);
  }

  // .env
  for (const ef of [".env", ".env.local", ".env.development"]) {
    const ep = path.join(ROOT, ef);
    if (existsSafe(ep)) {
      const ec = readFileSafe(ep);
      if (ec && ec.includes("DATABASE_URL")) {
        // .env: original checks postgres (not postgresql), no oracle/h2.
        // Preserve that semantics, but update both primary and array
        // outputs together.
        const envDbs = [
          ["postgres", "postgresql"],
          ["mysql", "mysql"],
          ["mongodb", "mongodb"],
          ["sqlite", "sqlite"],
        ];
        for (const [keyword, value] of envDbs) {
          if (ec.includes(keyword)) {
            if (!stack.database) stack.database = value;
            if (!stack.databases.includes(value)) stack.databases.push(value);
          }
        }
      }
    }
  }

  // Prisma schema
  const prismaSchema = path.join(ROOT, "prisma/schema.prisma");
  if (existsSafe(prismaSchema)) {
    const ps = readFileSafe(prismaSchema);
    if (ps) {
      const prov = ps.match(/provider\s*=\s*"(\w+)"/);
      if (prov && !stack.database) {
        const db = { postgresql: "postgresql", mysql: "mysql", sqlite: "sqlite", mongodb: "mongodb" };
        if (db[prov[1]]) stack.database = db[prov[1]];
      }
    }
  }

  // ── Config file fallback (monorepo) ──
  // [configFiles, frontendName, frameworkName (optional), label]
  const frontendFallbacks = [
    [["next.config.js", "next.config.mjs", "next.config.ts"], "nextjs", null, "next.config (fallback)"],
    [["vite.config.ts", "vite.config.js"], "react", "vite", "vite.config (fallback)"],
    [["nuxt.config.ts", "nuxt.config.js"], "vue", null, "nuxt.config (fallback)"],
    [["angular.json", ".angular.json"], "angular", null, "angular.json (fallback)"],
  ];
  if (!stack.frontend) {
    for (const [files, frontendName, frameworkName, label] of frontendFallbacks) {
      if (files.some(f => existsSafe(path.join(ROOT, f)))) {
        stack.frontend = frontendName; stack.detected.push(label);
        if (!stack.language) stack.language = "typescript";
        if (frameworkName && !stack.framework) {
          stack.framework = frameworkName;
          stack.detected.push(frameworkName + " (fallback)");
        }
        break;
      }
    }
  }

  // ── .env-derived factual config ──
  // Read .env.example (preferred) or .env to capture ports/hosts/API targets
  // the project actually declares. This overrides framework-default guesses
  // in downstream code (plan-installer/index.js defaultPort) and exposes the
  // full variable map to Pass 3 prompts via project-analysis.json.
  const envInfo = readStackEnvInfo(ROOT);
  if (envInfo) {
    stack.envInfo = envInfo;
    // Promote .env-declared port to stack.port if no earlier detection won
    // (e.g., Spring application.yml parsing at line 407).
    if (!stack.port && envInfo.port) {
      stack.port = envInfo.port;
    }
  }

  // v2.4.0 — Spring Boot ships Logback as the default logging implementation
  // via spring-boot-starter (transitively). Most projects do not declare
  // `ch.qos.logback:logback-classic` explicitly because the starter brings
  // it in. The dependency-only LOGGING_RULES regex therefore misses Logback
  // for the common case. Fill in the default unless the project has
  // explicitly opted into log4j2 (in which case spring-boot-starter-log4j2
  // would replace the Logback default).
  if (stack.framework === "spring-boot"
      && !stack.loggingFrameworks.includes("log4j2")
      && !stack.loggingFrameworks.includes("logback")) {
    stack.loggingFrameworks.push("logback");
    stack.detected.push("logback (spring-boot default)");
  }

  return stack;
}

module.exports = { detectStack };
