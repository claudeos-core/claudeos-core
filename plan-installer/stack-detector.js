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
const { readStackEnvInfo, extractPort } = require("../lib/env-parser");
const JVM = require("./jvm-detect");

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
  // v2.5.1 — JDBC coordinates common in enterprise / Korean-market deployments.
  ["mssql-jdbc", "mssql"], ["sqljdbc", "mssql"], ["jtds", "mssql"], ["sqlserver", "mssql"],
  ["com.ibm.db2", "db2"], ["db2jcc", "db2"],
  ["tibero", "tibero"], ["altibase", "altibase"], ["cubrid", "cubrid"],
];

// h2 needs word-boundary check (avoid oauth2, cache2k false positives)
const H2_REGEX = /\bh2\b/;

// Java version literals come in two spellings: modern `17` / `21` and the
// legacy dotted form `1.8` (Java 8 — still the norm in enterprise SI
// codebases). Normalize the legacy form so `1.8` → `8`; pass everything
// else through unchanged.
function normalizeJavaVersion(v) {
  if (v == null) return v;
  const m = String(v).match(/^1\.(\d+)$/);
  return m ? m[1] : String(v);
}

// v2.5.0 — Source-language evidence. Build-file keywords alone are ambiguous:
// `buildSrc/build.gradle.kts` carries `kotlin-dsl` in pure-Java repos, and a
// Java catalog may pin `kotlin = "1.9.22"` only to settle kotlin-stdlib
// conflicts. When `.java` sources exist and no `.kt` sources do, a "kotlin"
// keyword must NOT flip the language — the Kotlin scanner would then find
// zero domains and `init` would abort. Memoized per detectStack() call.
async function hasJavaOnlySources(ROOT) {
  // `buildSrc/` and `build-logic/` (Gradle's documented buildSrc replacement)
  // hold convention plugins written in Kotlin DSL — build tooling, not
  // application code.
  const ignore = ["**/node_modules/**", "**/build/**", "**/target/**", "**/buildSrc/**", "**/build-logic/**", "**/gradle/plugins/**", "**/src/test/**", "**/.git/**"];
  const kt = await glob("**/src/main/{java,kotlin}/**/*.kt", { cwd: ROOT, ignore });
  if (kt.length > 0) return false;
  const java = await glob("**/src/main/java/**/*.java", { cwd: ROOT, ignore });
  return java.length > 0;
}

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
/**
 * v2.5.1 — Fold one child pom (Maven <module> or a depth-1 sibling project)
 * into `stack`, filling only what is still null. `${prop}` in the child
 * resolves against the child first, then `rootPom` (may be "").
 *
 * v2.5.2 — Lifted out of detectStack(). It only ever read and mutated
 * `stack`, so taking it as the first parameter makes the dependency
 * explicit and lets the legacy-JVM block below live outside detectStack too.
 */
function absorbMavenPom(stack, cp, rootPom, mod) {
  const cpClean = stripComments(cp);
  const propsText = cp + "\n" + rootPom;
  if (!stack.framework && cpClean.includes("spring-boot")) { stack.framework = "spring-boot"; stack.detected.push(`spring-boot (${mod})`); }
  if (stack.framework === "spring-boot" && !stack.frameworkVersion) { const bv = JVM.mavenSpringBootVersion(propsText, cpClean); if (bv) stack.frameworkVersion = bv; }
  if (!stack.framework && JVM.mavenHasSpringFramework(cpClean)) { stack.framework = "spring-framework"; stack.detected.push(`spring-framework (${mod})`); }
  // Root <properties> may already have yielded the Framework version
  // before any module declared the framework itself — link them.
  if (stack.framework === "spring-framework" && !stack.frameworkVersion && stack.springFrameworkVersion) stack.frameworkVersion = stack.springFrameworkVersion;
  if (!stack.springFrameworkVersion) {
    const v = JVM.mavenSpringFrameworkVersion(propsText, cpClean);
    if (v) { stack.springFrameworkVersion = v; if (stack.framework === "spring-framework" && !stack.frameworkVersion) stack.frameworkVersion = v; }
  }
  if (JVM.hasEgovframe(cpClean) && !stack.detected.some(d => d.startsWith("egovframe"))) {
    const ev = JVM.egovframeVersion(cpClean, propsText);
    stack.detected.push(ev ? `egovframe ${ev}` : "egovframe");
    if (!stack.framework) { stack.framework = "spring-framework"; stack.detected.push("spring-framework"); }
  }
  if (!stack.orm) { if (IBATIS_REGEX.test(cpClean)) { stack.orm = "ibatis"; stack.detected.push(`ibatis (${mod})`); } else detectFirst(stack, "orm", cpClean, MAVEN_ORM_RULES); }
  for (const [keyword, value] of DB_KEYWORD_RULES.filter(([kw]) => kw !== "postgres")) {
    if (cpClean.includes(keyword)) { if (!stack.database) stack.database = value; if (!stack.databases.includes(value)) stack.databases.push(value); }
  }
  if (!stack.languageVersion) {
    const jv = cp.match(/<java\.version>\s*(\d+(?:\.\d+)?)\s*<\/java\.version>/) || cp.match(/<maven\.compiler\.(?:source|release)>\s*(\d+(?:\.\d+)?)\s*</);
    if (jv) stack.languageVersion = normalizeJavaVersion(jv[1]);
  }
  if (!stack.packaging) { const pk = JVM.mavenPackaging(cp); if (pk && pk !== "pom") stack.packaging = pk; }
  if (stack.framework !== "spring-boot") for (const t of JVM.legacyFrameworkTags(cpClean)) { const tag = t.version ? `${t.tag} ${t.version}` : t.tag; if (!stack.detected.includes(tag)) stack.detected.push(tag); }
}

/**
 * v2.5.2 — The legacy-JVM evidence pass, lifted out of detectStack().
 *
 * Everything here reads evidence WEAKER than a root build file: sibling
 * build files one directory down, Ant / Eclipse / IntelliJ / NetBeans
 * metadata, jars on disk, `WEB-INF/web.xml`, Spring XSDs. It therefore runs
 * last, after the Gradle, Maven, Node and Python blocks, and may only
 *   (a) fill a language nobody claimed, or
 *   (b) reclaim a PROVISIONAL Node language (see `languageFromPackageJson`).
 *
 * It was ~220 lines inline in a function that is already the largest in the
 * codebase, which is what made the v2.5.2 scanner fixes expensive to reason
 * about. It is self-contained: `jvmMayClaim`, `parked`, `jarIgnore`,
 * `referencedJars` and the `anyJavaSources` memo are all local to this pass,
 * and the reclaim it opens is also settled here. Its only outside
 * dependencies are `stack` (mutated in place, exactly as before) and the
 * module-level helpers.
 *
 * Pure move: no behavior change, no reordering, no renaming. `stack` is
 * mutated rather than returned so the call site reads identically to the
 * inline block it replaces.
 *
 * @param {string}  ROOT                    project root
 * @param {object}  stack                   the detection accumulator, mutated in place
 * @param {boolean} languageFromPackageJson `stack.language` came from a root package.json
 */
async function detectLegacyJvm(ROOT, stack, languageFromPackageJson) {
  // ── Java: legacy evidence (runs AFTER Node/Python) ──
  // v2.5.1 — Everything below reads evidence weaker than a root build file:
  // sibling-directory build files, Ant / Eclipse / IntelliJ / NetBeans
  // metadata, jars on disk, `WEB-INF/web.xml`, Spring XSDs. It therefore runs
  // last and may only (a) fill a language nobody claimed, or (b) reclaim a
  // PROVISIONAL Node language — a root package.json that exists for gulp /
  // jQuery / Tailwind asset tooling, with NO Node framework detected — and
  // only on STRONG JVM evidence (build.xml, `.project` javanature, a sibling
  // pom/gradle, a WEB-INF/web.xml, or Spring jars beside *.java sources).
  // A Next.js / Express / Django project with a stray `.idea/misc.xml` or a
  // vendored `tools/lib/*.jar` is never flipped to Java.
  // `src/test/**` is excluded everywhere below: a test-resources `web.xml`
  // or a test fixture jar is not deployment evidence for the application.
  // v2.5.2 — `out/` (IntelliJ), `bin/` (Eclipse default output), `.gradle/`,
  // `.idea/` and `.svn/` are pruned as well. They hold no evidence the blocks
  // below read (jars under a `lib/` segment, `WEB-INF/web.xml`, Spring XML),
  // but they are walked on every framework-less Java project because these
  // three globs are all rooted at `**`. Pruning them is free correctness AND
  // the only cheap lever on walk cost for large enterprise trees.
  const jarIgnore = ["**/node_modules/**", "**/build/**", "**/target/**", "**/.git/**", "**/dist/**", "**/src/test/**", "**/out/**", "**/bin/**", "**/.gradle/**", "**/.idea/**", "**/.svn/**"];
  const referencedJars = [];
  // Memoized: does the tree hold any *.java source at all? Shared by the
  // Ant / jar / last-resort decisions below so the walk happens at most once.
  let anyJavaMemo = null;
  const anyJavaSources = async () => {
    if (anyJavaMemo === null) anyJavaMemo = (await glob("**/*.java", { cwd: ROOT, ignore: jarIgnore, nodir: true })).length > 0;
    return anyJavaMemo;
  };
  let jvmMayClaim = !stack.language;
  // Provisional-language reclaim. The Node language is PARKED, not dropped:
  // if none of the JVM blocks below actually claims the project (a `build.xml`
  // that is not Ant — a Phing file or an empty stub — with no *.java anywhere),
  // the parked values are restored at the end of this section. A gulp-only
  // site therefore never ends up with `language: null`, and a reclaimed Java
  // project does not keep `packageManager: "npm"` from the asset tooling.
  let parked = null;
  if (!jvmMayClaim && languageFromPackageJson && !stack.framework && !stack.frontend && !stack.buildTool) {
    const strong =
      existsSafe(path.join(ROOT, "build.xml")) ||
      JVM.eclipseHasJavaNature(readFileSafe(path.join(ROOT, ".project"))) ||
      (await glob("*/{pom.xml,build.gradle,build.gradle.kts}", { cwd: ROOT, ignore: ["node_modules/**"] })).length > 0 ||
      (await glob("**/WEB-INF/web.xml", { cwd: ROOT, ignore: jarIgnore, nodir: true })).length > 0;
    if (strong) {
      jvmMayClaim = true;
      parked = { language: stack.language, languageVersion: stack.languageVersion, packageManager: stack.packageManager };
      stack.language = null; stack.languageVersion = null; stack.packageManager = null;
    }
  }
  // ── Java: build files one directory down (no root build file) ──
  // v2.5.1 — SI repositories often hold sibling projects (`erp-web/pom.xml`,
  // `erp-batch/pom.xml`) with no aggregator at the root. Depth-1 poms are
  // absorbed with the same rules as Maven <modules>. Depth-1 Gradle files
  // without a root `settings.gradle` / `build.gradle` are NOT swept — they
  // count as strong evidence for the reclaim above and the `*.java` last
  // resort then sets the language, but framework/version stay null (a root
  // `settings.gradle` is what makes the Gradle sub-module sweep run).
  if (!stack.buildTool && jvmMayClaim) {
    const siblingPoms = (await glob("*/pom.xml", { cwd: ROOT, ignore: ["node_modules/**"] })).map(p => p.replace(/\\/g, "/")).sort();
    if (siblingPoms.length) {
      stack.buildTool = "maven"; stack.language = "java";
      stack.detected.push(`pom.xml (${siblingPoms.length} sibling project${siblingPoms.length > 1 ? "s" : ""})`);
      if (!stack.packageManager) stack.packageManager = "maven";
      for (const sp of siblingPoms.slice(0, 30)) {
        const cp = readFileSafe(path.join(ROOT, sp));
        if (cp) absorbMavenPom(stack, cp, "", path.dirname(sp));
      }
    }
  }

  // ── Java: Ant / Eclipse WTP / no build tool (legacy) ──
  // v2.5.x — The shape of most pre-Maven enterprise code: a `build.xml`,
  // an Eclipse `.classpath`/`.project`, `WebContent/WEB-INF/lib/*.jar`, and
  // sources under `src/` (no `src/main/java`). Evidence, in order of
  // strength:
  //   1. build.xml            → buildTool "ant", Java level from <javac source="">
  //   2. .classpath/.project  → Java level from the JRE container, javanature
  //   3. **/WEB-INF/lib/*.jar → packaging "war"; Spring jars → framework +
  //                             version parsed from the jar NAME
  //                             (spring-webmvc-3.0.5.RELEASE.jar). An
  //                             unversioned `spring.jar` (2.0 era) reports the
  //                             framework with version null — never a guess.
  //   4. **/*.java            → language "java" as a last resort
  // Only runs when no Gradle/Maven build file claimed the project.
  if (!stack.buildTool && jvmMayClaim) {
    const buildXml = path.join(ROOT, "build.xml");
    if (existsSafe(buildXml)) {
      const bx = readFileSafe(buildXml);
      // `<project>` alone is not Ant — Phing (PHP) and other XML build tools
      // use the same root element. Require a `<javac>` task or *.java sources.
      if (bx && /<project\b/.test(bx) && (/<javac\b/.test(bx) || await anyJavaSources())) {
        stack.buildTool = "ant"; stack.language = "java"; stack.detected.push("build.xml");
        if (!stack.packageManager) stack.packageManager = "ant";
        const src = JVM.antJavacSource(bx);
        if (src && !stack.languageVersion) stack.languageVersion = normalizeJavaVersion(src);
        // v2.5.1 — Ant + Ivy: ivy.xml is the dependency manifest.
        const ivy = readFileSafe(path.join(ROOT, "ivy.xml"));
        if (ivy) {
          stack.detected.push("ivy.xml");
          if (!stack.framework && JVM.ivyHasSpringFramework(ivy)) { stack.framework = "spring-framework"; stack.detected.push("spring-framework (ivy)"); }
          const iv = JVM.ivySpringFrameworkVersion(ivy);
          if (iv) { stack.springFrameworkVersion = iv; if (stack.framework === "spring-framework" && !stack.frameworkVersion) stack.frameworkVersion = iv; }
          if (!stack.orm) { if (IBATIS_REGEX.test(ivy)) { stack.orm = "ibatis"; stack.detected.push("ibatis (ivy)"); } else detectFirst(stack, "orm", ivy, GRADLE_ORM_RULES); }
          detectDb(stack, ivy, DB_KEYWORD_RULES.filter(([kw]) => !["postgres", "sqlite"].includes(kw)));
        }
      }
    }
    const classpathXml = readFileSafe(path.join(ROOT, ".classpath"));
    const projectXml = readFileSafe(path.join(ROOT, ".project"));
    const jdtPrefs = readFileSafe(path.join(ROOT, ".settings/org.eclipse.jdt.core.prefs"));
    if (classpathXml || projectXml || jdtPrefs) {
      if (JVM.eclipseHasJavaNature(projectXml) || (classpathXml && /JRE_CONTAINER|kind="src"/.test(classpathXml)) || jdtPrefs) {
        if (!stack.language) { stack.language = "java"; stack.detected.push(".classpath/.project"); }
        // `.settings/org.eclipse.jdt.core.prefs` compliance level is what the
        // compiler actually used — it outranks the JRE container name.
        const lvl = JVM.eclipseJdtPrefsLevel(jdtPrefs) || (classpathXml ? JVM.eclipseJreLevel(classpathXml) : null);
        if (lvl && !stack.languageVersion) stack.languageVersion = normalizeJavaVersion(lvl);
      }
    }
    // IntelliJ / NetBeans project metadata.
    const ideaMisc = readFileSafe(path.join(ROOT, ".idea/misc.xml"));
    if (ideaMisc) {
      const lvl = JVM.intellijLanguageLevel(ideaMisc);
      if (lvl) { if (!stack.language) { stack.language = "java"; stack.detected.push(".idea/misc.xml"); } if (!stack.languageVersion) stack.languageVersion = normalizeJavaVersion(lvl); }
    }
    const nbProps = readFileSafe(path.join(ROOT, "nbproject/project.properties"));
    const nb = JVM.netbeansProject(nbProps);
    if (nbProps && (nb.level || nb.jars.length)) {
      if (!stack.language) { stack.language = "java"; stack.detected.push("nbproject"); }
      if (nb.level && !stack.languageVersion) stack.languageVersion = normalizeJavaVersion(nb.level);
    }
    // Jar names referenced by IDE metadata even when the jars themselves are
    // not committed (`.classpath kind="lib"/"var"`, NetBeans file.reference).
    // Fed into the same classifier as jars on disk, below.
    referencedJars.push(...JVM.eclipseClasspathJars(classpathXml), ...nb.jars);
    if (referencedJars.some(j => /WEB-INF\/lib\//.test(j)) && !stack.packaging) stack.packaging = "war";
    if (!stack.language && await anyJavaSources()) { stack.language = "java"; stack.detected.push("java sources"); }
  }

  // ── Java: jars on disk (any build tool, or none) ──
  // v2.5.1 — Also runs for Gradle/Maven projects that still resolve from
  // `fileTree(dir: 'WEB-INF/lib')` instead of coordinates — common in SI
  // codebases that adopted a build tool without migrating the jars. Fills
  // nulls only; coordinate-based answers above always win. Capped so a
  // vendored `lib/` with thousands of jars cannot stall detection.
  if (!stack.framework && (stack.language === "java" || (jvmMayClaim && !stack.buildTool))) {
    // Recursive under the lib roots: `lib/spring/*.jar`, `lib/db/*.jar` are
    // common hand-sorted layouts.
    const onDisk = await glob("**/{WEB-INF/lib,lib,libs}/**/*.jar", { cwd: ROOT, ignore: jarIgnore, nodir: true });
    const jars = [...onDisk.map(j => j.replace(/\\/g, "/")), ...referencedJars];
    if (jars.length) {
      if (jars.some(j => /WEB-INF\/lib\//.test(j)) && !stack.packaging) stack.packaging = "war";
      const cls = JVM.classifyJars(jars.slice(0, 500).map(j => path.basename(j)));
      // Jars alone are weak evidence — require *.java sources beside them.
      if (!stack.language && await anyJavaSources()) { stack.language = "java"; stack.detected.push("jars"); }
      // Everything below is dependency evidence for a JAVA project. A jar
      // directory with no sources is not a project and gets no DB / ORM /
      // framework either.
      if (stack.language === "java") {
      // JDBC drivers and ORM jars on disk are the only dependency evidence a
      // no-build-tool project has. Same dual output as every other DB source.
      for (const db of cls.databases) {
        if (!stack.database) stack.database = db;
        if (!stack.databases.includes(db)) stack.databases.push(db);
      }
      if (cls.orm && !stack.orm) { stack.orm = cls.orm; stack.detected.push(`${cls.orm} (jar)`); }
      if (cls.springBoot || cls.springFramework) {
        if (!stack.framework) {
          stack.framework = cls.springBoot ? "spring-boot" : "spring-framework";
          stack.detected.push(`${stack.framework} (jar)`);
        }
        if (cls.springFrameworkVersion && !stack.springFrameworkVersion) stack.springFrameworkVersion = cls.springFrameworkVersion;
        if (!stack.frameworkVersion) {
          if (stack.framework === "spring-boot" && cls.springBootVersion) stack.frameworkVersion = cls.springBootVersion;
          if (stack.framework === "spring-framework" && cls.springFrameworkVersion) stack.frameworkVersion = cls.springFrameworkVersion;
        }
      }
      } // language === "java"
    }
  }

  // ── Java: deployment descriptor + Spring XML schema evidence ──
  // v2.5.1 — For trees with no coordinates and no jars (jars gitignored,
  // IDE metadata absent): `WEB-INF/web.xml` naming DispatcherServlet /
  // ContextLoaderListener is Spring MVC evidence and a war signal; Spring XML
  // configs carry `spring-beans-3.0.xsd` — major.minor only, the
  // lowest-fidelity version source, consulted last and never overriding a
  // pinned version. Struts descriptors add a tag without setting a framework.
  // Spring Boot projects are skipped: Boot owns the servlet container, its
  // WAR packaging is declared in the build file, and the `detected` array of
  // a Boot project must stay byte-identical to v2.5.0 output.
  if (stack.framework !== "spring-boot" && (stack.language === "java" || (jvmMayClaim && !stack.buildTool))) {
    const webXmls = await glob("**/WEB-INF/web.xml", { cwd: ROOT, ignore: jarIgnore, nodir: true });
    for (const wx of webXmls.slice(0, 5)) {
      const facts = JVM.webXmlFacts(readFileSafe(path.join(ROOT, wx)));
      if (!stack.packaging) stack.packaging = "war";
      if (facts.spring) {
        if (!stack.language) stack.language = "java";
        if (!stack.framework) { stack.framework = "spring-framework"; stack.detected.push("spring-framework (web.xml)"); }
      }
      if (facts.struts && !stack.detected.some(d => d.startsWith(facts.struts))) stack.detected.push(`${facts.struts} (web.xml)`);
      if (facts.servletVersion && !stack.detected.some(d => d.startsWith("servlet "))) stack.detected.push(`servlet ${facts.servletVersion}`);
      if (!stack.language) { stack.language = "java"; stack.detected.push("web.xml"); }
    }
    if (stack.framework === "spring-framework" && !stack.frameworkVersion) {
      const xmls = await glob("**/{WEB-INF,resources,config,conf,spring}/**/*.xml", { cwd: ROOT, ignore: jarIgnore, nodir: true });
      let best = null;
      for (const x of xmls.slice(0, 50)) {
        const v = JVM.springXsdVersion(readFileSafe(path.join(ROOT, x)));
        if (v && (!best || parseFloat(v) > parseFloat(best))) best = v;
      }
      if (best) { stack.detected.push(`spring-xsd ${best}`); stack.frameworkVersion = best; if (!stack.springFrameworkVersion) stack.springFrameworkVersion = best; }
    }
  }

  // Settle the provisional-language reclaim (see `parked` above).
  if (parked) {
    if (stack.language === "java") {
      stack.detected.push("java (reclaimed from provisional package.json language)");
    } else {
      stack.language = parked.language; stack.languageVersion = parked.languageVersion;
      if (!stack.packageManager) stack.packageManager = parked.packageManager;
    }
  }
}

async function detectStack(ROOT) {
  // Lazily evaluated once per call; only consulted when a "kotlin" keyword
  // would otherwise flip the language (see hasJavaOnlySources).
  let javaOnlyMemo = null;
  const isJavaOnly = async () => {
    if (javaOnlyMemo === null) javaOnlyMemo = await hasJavaOnlySources(ROOT);
    return javaOnlyMemo;
  };
  // Set when `language` was taken from a root package.json (see Node block);
  // the Python block reclaims it when the backend turns out to be Python.
  let languageFromPackageJson = false;
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
    // v2.5.x — JVM legacy support. `packaging` is what the build file
    // DECLARES (Gradle `war`/`ear` plugin, Maven `<packaging>`, or a
    // `WEB-INF/lib` tree) — null when nothing is declared, never an
    // invented "jar". `springFrameworkVersion` is the org.springframework
    // line when it is pinned explicitly; for Boot projects it is normally
    // null because Boot manages it.
    packaging: null, springFrameworkVersion: null,
    detected: [],
  };

  // ── Java/Kotlin: Gradle ──
  const gradleFile = existsSafe(path.join(ROOT, "build.gradle.kts"))
    ? "build.gradle.kts"
    : existsSafe(path.join(ROOT, "build.gradle")) ? "build.gradle" : null;
  // v2.5.1 — a root holding only settings.gradle{,.kts} (modules carry the
  // build files) is still a Gradle project; the sub-module sweep does the rest.
  if (!gradleFile) {
    const sg = ["settings.gradle.kts", "settings.gradle"].find(f => existsSafe(path.join(ROOT, f)));
    if (sg) { stack.buildTool = "gradle"; stack.detected.push(sg); if (!stack.packageManager) stack.packageManager = "gradle"; }
  }
  if (gradleFile) {
    const g = readFileSafe(path.join(ROOT, gradleFile));
    if (g) {
      stack.buildTool = "gradle"; stack.detected.push(gradleFile);
      // v2.4.0 — JVM project package manager. Set "gradle" so generated docs
      // and downstream tooling don't show "PackageMgr: none" for a build tool
      // that IS the package manager. Only set if not already detected.
      if (!stack.packageManager) stack.packageManager = "gradle";
      // v2.5.x — JVM plugin evidence first, independent of Spring Boot.
      // `apply plugin: 'java'` / `'war'` / `'application'` / `plugins { java }`
      // is proof of a Java project on its own. Before this, a legacy
      // `apply plugin: 'java'` + `spring-webmvc:4.3.30.RELEASE` build reported
      // `language: null` and the Java scanner never ran.
      // v2.5.1 — gradle.properties is a second variable source for
      // `${springVersion}` / `${springBootVersion}` references.
      const gProps = JVM.parseGradleProperties(readFileSafe(path.join(ROOT, "gradle.properties")));
      // v2.5.1 — variable definitions may live outside build.gradle:
      // `apply from: 'gradle/dependencies.gradle'` scripts and buildSrc
      // Kotlin constants (`object Versions { const val spring = "…" }`).
      // Appended to the RESOLUTION text only; detection still reads `g`.
      let gResolve = g;
      for (const rel of JVM.gradleAppliedScripts(g).slice(0, 10)) {
        const t = readFileSafe(path.join(ROOT, rel)); if (t) gResolve += "\n" + t;
      }
      if (existsSafe(path.join(ROOT, "buildSrc"))) {
        const kts = await glob("buildSrc/src/main/{kotlin,java,groovy}/**/*.{kt,groovy,java}", { cwd: ROOT, nodir: true });
        for (const f of kts.slice(0, 20)) { const t = readFileSafe(path.join(ROOT, f)); if (t) gResolve += "\n" + t; }
      }
      const gPlugins = JVM.gradleJvmPlugins(g);
      const jvmByPlugin = JVM.gradleIsJvm(gPlugins) && !stack.language;
      if (jvmByPlugin) stack.language = "java";
      const gPack = JVM.gradlePackaging(gPlugins);
      if (gPack) stack.packaging = gPack;
      // `spring-boot` (starter coords) OR `org.springframework.boot` (plugin id —
      // the only spelling present in a multi-module root that declares
      // `id 'org.springframework.boot' version 'x' apply false`).
      if (g.includes("spring-boot") || g.includes("org.springframework.boot")) {
        stack.language = "java"; stack.framework = "spring-boot"; stack.detected.push("spring-boot");
      } else if (jvmByPlugin) {
        // Label the plugin evidence only when Boot is absent, so the
        // `detected` array of every existing Boot project stays
        // byte-identical to pre-v2.5.x output.
        stack.detected.push("java (gradle plugin)");
      }
      // v2.5.x — Spring Framework WITHOUT Boot (group exactly
      // org.springframework: spring-webmvc / spring-context / the 2.x
      // single `spring` jar / spring-framework-bom). Boot wins when both
      // appear because Boot manages the Framework version.
      if (!stack.framework && JVM.gradleHasSpringFramework(g)) {
        stack.language = "java"; stack.framework = "spring-framework"; stack.detected.push("spring-framework");
      }
      if (JVM.hasEgovframe(g)) {
        const ev = JVM.egovframeVersion(g);
        stack.detected.push(ev ? `egovframe ${ev}` : "egovframe");
        if (!stack.framework) { stack.language = "java"; stack.framework = "spring-framework"; stack.detected.push("spring-framework"); }
      }
      const gSfv = JVM.gradleSpringFrameworkVersion(gResolve, gProps);
      if (gSfv) stack.springFrameworkVersion = gSfv;
      if (stack.framework === "spring-framework" && gSfv) stack.frameworkVersion = gSfv;
      // Struts / JSF tags are legacy evidence; not pushed for Boot projects
      // (their `detected` array must stay byte-identical to v2.5.0 output).
      if (stack.framework !== "spring-boot") for (const t of JVM.legacyFrameworkTags(g)) stack.detected.push(t.version ? `${t.tag} ${t.version}` : t.tag);
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
      // v2.5.x — Boot version. The helper covers every form the loop above
      // covered PLUS the Boot 1.x/2.x buildscript-classpath form
      // (`classpath("org.springframework.boot:spring-boot-gradle-plugin:1.5.22.RELEASE")`,
      // optionally via `${springBootVersion}`), which had no `version`
      // keyword for the old regexes to anchor on.
      if (stack.framework === "spring-boot" && !stack.frameworkVersion) {
        const bv = JVM.gradleSpringBootVersion(gResolve, gProps);
        if (bv) stack.frameworkVersion = bv;
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
        // `(\d+(?:\.\d+)?)` — captures `1.8` whole instead of stopping at `1`
        /sourceCompatibility\s*=\s*['"]?(\d+(?:\.\d+)?)['"]?/,
        /targetCompatibility\s*=\s*['"]?(\d+(?:\.\d+)?)['"]?/,
        // (2) JavaVersion enum — supports both VERSION_21 and VERSION_1_8
        /JavaVersion\.VERSION_(?:1_)?(\d+)/,
        // (3) toolchain block
        /JavaLanguageVersion\.of\s*\(\s*(\d+)\s*\)/,
        // (3b) v2.5.1 — `options.release = 17` / `options.release.set(17)`
        /options\.release(?:\.set)?\s*[=(]\s*(\d+)/,
      ];
      for (const pattern of javaVersionPatterns) {
        const m = g.match(pattern);
        if (m) { stack.languageVersion = normalizeJavaVersion(m[1]); break; }
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
          const extAssign = new RegExp(`${escapedVarName}\\s*=\\s*['"]?(\\d+(?:\\.\\d+)?)['"]?`);
          const extVal = g.match(extAssign);
          if (extVal) stack.languageVersion = normalizeJavaVersion(extVal[1]);
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
      // (unless the source tree is Java-only — see hasJavaOnlySources).
      if ((g.includes("kotlin") || g.includes("org.jetbrains.kotlin")) && !(await isJavaOnly())) {
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
      // v2.5.x — Spring Framework declared through the catalog
      // (`spring-webmvc = { module = "org.springframework:spring-webmvc",
      // version.ref = "spring" }`). The build file only shows
      // `libs.spring.webmvc`, so this is the one place the coordinate and
      // its version are visible.
      if (!stack.framework && JVM.catalogHasSpringFramework(vc)) {
        if (!stack.language) stack.language = "java";
        stack.framework = "spring-framework"; stack.detected.push("spring-framework (catalog)");
      }
      if (!stack.springFrameworkVersion) {
        const cSfv = JVM.catalogSpringFrameworkVersion(vc);
        if (cSfv) {
          stack.springFrameworkVersion = cSfv;
          if (stack.framework === "spring-framework" && !stack.frameworkVersion) stack.frameworkVersion = cSfv;
        }
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
      // A `kotlin = "x.y.z"` version entry or a Kotlin *plugin* coordinate in
      // the catalog is decisive — it overrides the `java` default that the
      // root build file's `org.springframework.boot` plugin id sets.
      // Library coordinates (`org.jetbrains.kotlin:kotlin-stdlib`) are NOT a
      // signal: Java projects pin them in the catalog to settle transitive
      // version conflicts without writing a line of Kotlin.
      const KOTLIN_CATALOG_RE = /(^\s*kotlin\s*=|org\.jetbrains\.kotlin\.(?:jvm|plugin|multiplatform|android|kapt)|kotlin-gradle-plugin)/m;
      if (stack.language !== "kotlin" && KOTLIN_CATALOG_RE.test(vc) && !(await isJavaOnly())) {
        stack.language = "kotlin"; stack.detected.push("kotlin (catalog)");
      }
    }
  }

  // ── Java: multi-module Gradle detection ──
  // Root build.gradle of a multi-module project often holds only
  // `allprojects { repositories {...} }` and no framework coords at all;
  // the real declarations live in `api/build.gradle`, `core/build.gradle`, …
  // Scan sub-module build files (same bound as the Kotlin block below) for
  // the Java plugin / Spring Boot coords so the project isn't reported as
  // "no language detected" and the Java scanner actually runs.
  if (!stack.language && stack.buildTool === "gradle") {
    const subBuildFiles = await glob("*/**/build.gradle{,.kts}", { cwd: ROOT, ignore: ["**/node_modules/**", "**/build/**", "**/buildSrc/**"] });
    for (const sbf of subBuildFiles.slice(0, 30)) {
      const sc = readFileSafe(path.join(ROOT, sbf));
      if (!sc) continue;
      if (sc.includes("kotlin") || sc.includes("org.jetbrains.kotlin")) continue; // handled by the Kotlin block
      // v2.5.x — any JVM plugin or an org.springframework coordinate counts,
      // not only java/java-library/Boot.
      const scPlugins = JVM.gradleJvmPlugins(sc);
      const isJava = JVM.gradleIsJvm(scPlugins)
        || sc.includes("spring-boot")
        || JVM.gradleHasSpringFramework(sc);
      if (isJava) {
        // Do not `break` on the first Java module: a `core` library module
        // usually comes before the `api` module that actually declares
        // Spring Boot. Set language once, keep sweeping for framework/versions.
        if (stack.language !== "java") { stack.language = "java"; stack.detected.push("java (submodule)"); }
        if (!stack.packaging) { const p = JVM.gradlePackaging(scPlugins); if (p) stack.packaging = p; }
        if (!stack.framework && (sc.includes("spring-boot") || sc.includes("org.springframework.boot"))) {
          stack.framework = "spring-boot"; stack.detected.push("spring-boot (submodule)");
        }
        if (!stack.framework && JVM.gradleHasSpringFramework(sc)) {
          stack.framework = "spring-framework"; stack.detected.push("spring-framework (submodule)");
        }
        if (!stack.springFrameworkVersion) {
          const sfv = JVM.gradleSpringFrameworkVersion(sc);
          if (sfv) { stack.springFrameworkVersion = sfv; if (stack.framework === "spring-framework" && !stack.frameworkVersion) stack.frameworkVersion = sfv; }
        }
        if (!stack.frameworkVersion && stack.framework === "spring-boot") {
          // `spring-boot-starter-web:2.7.18`, `spring-boot-dependencies:3.2.0`,
          // or `id 'org.springframework.boot' version '3.2.5'` inside the module.
          const sv = JVM.gradleSpringBootVersion(sc)
            || (sc.match(/spring-boot[\w-]*[:\s'"]+(\d+\.\d+\.\d+)/) || [])[1];
          if (sv) stack.frameworkVersion = sv;
        }
        if (!stack.languageVersion) {
          const jv = sc.match(/(?:sourceCompatibility|targetCompatibility)\s*=\s*['"]?(\d+(?:\.\d+)?)['"]?/)
            || sc.match(/JavaVersion\.VERSION_(?:1_)?(\d+)/)
            || sc.match(/JavaLanguageVersion\.of\s*\(\s*(\d+)\s*\)/);
          if (jv) stack.languageVersion = normalizeJavaVersion(jv[1]);
        }
        if (stack.framework && stack.frameworkVersion && stack.languageVersion) break;
      }
    }
  }

  // ── Kotlin: multi-module Gradle detection ──
  // v2.5.0: `buildSrc/` is ignored (its `kotlin-dsl` plugin is not evidence of
  // Kotlin application code) and a Java-only source tree never flips.
  if (stack.language !== "kotlin" && stack.buildTool === "gradle" && !(await isJavaOnly())) {
    const subBuildFiles = await glob("**/build.gradle{,.kts}", { cwd: ROOT, ignore: ["**/node_modules/**", "**/build/**", "**/buildSrc/**"] });
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
      // v2.5.x — declared packaging (war / ear / jar / pom). Null when the
      // pom is silent; Maven's implicit "jar" default is NOT written back.
      const mPack = JVM.mavenPackaging(pom);
      if (mPack && !stack.packaging) stack.packaging = mPack;
      // Boot version: <spring-boot.version> property (the only form the
      // old regex knew), the starter-parent <version>, or the
      // spring-boot-dependencies BOM import.
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
        /<java\.version>\s*(\d+(?:\.\d+)?)\s*<\/java\.version>/,
        /<maven\.compiler\.source>\s*(\d+(?:\.\d+)?)\s*<\/maven\.compiler\.source>/,
        /<maven\.compiler\.target>\s*(\d+(?:\.\d+)?)\s*<\/maven\.compiler\.target>/,
        // v2.5.1 — `<maven.compiler.release>17</maven.compiler.release>` (JEP 247 style)
        /<maven\.compiler\.release>\s*(\d+)\s*<\/maven\.compiler\.release>/,
      ];
      for (const pattern of mvnJavaPatterns) {
        const m = pom.match(pattern);
        if (m) { stack.languageVersion = normalizeJavaVersion(m[1]); break; }
      }
      // Pattern 3 fallback: if <java.version> references a property,
      // resolve it inside the same pom.
      if (!stack.languageVersion) {
        const propRef = pom.match(/<java\.version>\s*\$\{([^}]+)\}\s*<\/java\.version>/);
        if (propRef) {
          const propName = propRef[1].trim();
          const escapedProp = propName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          const propDef = new RegExp(`<${escapedProp}>\\s*(\\d+(?:\\.\\d+)?)\\s*</${escapedProp}>`);
          const propVal = pom.match(propDef);
          if (propVal) stack.languageVersion = normalizeJavaVersion(propVal[1]);
        }
      }
      // v2.5.x — Pattern 4: pre-properties era. Maven 2 poms carried the
      // level only inside the compiler plugin:
      //   <plugin><artifactId>maven-compiler-plugin</artifactId>
      //     <configuration><source>1.5</source><target>1.5</target></configuration>
      if (!stack.languageVersion) {
        const cps = JVM.mavenCompilerPluginSource(pom);
        if (cps) stack.languageVersion = normalizeJavaVersion(cps);
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
      if (stack.framework === "spring-boot" && !stack.frameworkVersion) {
        const bv = JVM.mavenSpringBootVersion(pom, pomClean);
        if (bv) stack.frameworkVersion = bv;
      }
      // v2.5.x — Spring Framework without Boot. Only <dependency> blocks
      // whose groupId is EXACTLY org.springframework count (comment-stripped
      // text, so a `<!-- … -->`-disabled dependency is ignored). Version comes
      // from spring-framework-bom, the first versioned Framework dependency,
      // or a <spring.version>-style property — `${prop}` resolved in-file.
      if (!stack.framework && JVM.mavenHasSpringFramework(pomClean)) {
        stack.framework = "spring-framework"; stack.detected.push("spring-framework");
      }
      const mSfv = JVM.mavenSpringFrameworkVersion(pom, pomClean);
      if (mSfv) {
        stack.springFrameworkVersion = mSfv;
        if (stack.framework === "spring-framework" && !stack.frameworkVersion) stack.frameworkVersion = mSfv;
      }
      // v2.5.1 — eGovFrame (전자정부 표준프레임워크): Spring MVC underneath.
      if (JVM.hasEgovframe(pomClean)) {
        const ev = JVM.egovframeVersion(pomClean, pom);
        stack.detected.push(ev ? `egovframe ${ev}` : "egovframe");
        if (!stack.framework) { stack.framework = "spring-framework"; stack.detected.push("spring-framework"); }
      }
      if (stack.framework !== "spring-boot") for (const t of JVM.legacyFrameworkTags(pomClean)) stack.detected.push(t.version ? `${t.tag} ${t.version}` : t.tag);
      // v2.5.1 — Maven multi-module. A root `<packaging>pom</packaging>` with
      // `<modules>` usually declares nothing but dependencyManagement; the
      // Spring coordinates live in `web/pom.xml`. Sweep the listed modules
      // (bounded) and fill only what the root left null. `${prop}` in a child
      // resolves against the child first, then the root <properties>.
      const moduleNames = [...pomClean.matchAll(/<module>\s*([^<]+?)\s*<\/module>/g)].map(m => m[1]);
      for (const mod of moduleNames.slice(0, 30)) {
        const cp = readFileSafe(path.join(ROOT, mod, "pom.xml"));
        if (cp) absorbMavenPom(stack, cp, pom, mod);
      }
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
      // "postgres" is excluded (substring of postgresql — Maven coords always
      // spell it out) so the primary-DB race is identical to pre-v2.5.1.
      const mvnDbRules = DB_KEYWORD_RULES.filter(([kw]) => kw !== "postgres");
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

      // Provisional: a root package.json may exist only for frontend tooling
      // (Tailwind/PostCSS) in a Python repo. The Python block below reclaims
      // `language` when a Python framework is detected and no Node backend is.
      if (!stack.language) { stack.language = deps.typescript ? "typescript" : "javascript"; languageFromPackageJson = true; }
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
      // v2.5.0 — Record the frontend bundler independently of `framework`.
      // When a backend framework occupies `stack.framework` (Spring + React/Vite
      // in one repo), `framework === "vite"` can never be true, and
      // selectTemplates() used to fall back to the Next.js template for a
      // Vite SPA. `frontendBundler` carries that signal regardless of backend.
      if (deps.vite && stack.frontend && stack.frontend !== "nextjs") {
        stack.frontendBundler = "vite";
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

  let subDirSpa = null;
  // ── Frontend in a sub-directory (v2.5.0) ──
  // Spring/Django/... repos commonly keep the SPA in frontend/, client/, web/ or
  // ui/ with its own package.json and no root package.json. Detect it there and
  // record the sub-directory so the frontend scanner can be rooted at it.
  if (!stack.frontend) {
    for (const sub of ["frontend", "client", "web", "ui", "webapp", "front"]) {
      const subDir = path.join(ROOT, sub);
      const pj = path.join(subDir, "package.json");
      const spkg = existsSafe(pj) ? readJsonSafe(pj) : null;
      const sdeps = spkg ? { ...(spkg.dependencies || {}), ...(spkg.devDependencies || {}) } : null;
      if (sdeps) {
        // Same precedence as the root package.json rules (Angular before React —
        // Angular projects may carry react in devDependencies). `nuxt` maps to
        // vue so a Nuxt app is not missed when `vue` is only transitive.
        const rules = [["next", "nextjs", "next.js"], ["@angular/core", "angular", "angular"], ["nuxt", "vue", "nuxt"], ["react", "react", "react"], ["vue", "vue", "vue"]];
        for (const [dep, name, label] of rules) {
          if (sdeps[dep]) {
            stack.frontend = name;
            // `frontendVersion` is the framework's version (Vue for a Nuxt app),
            // never the meta-framework's — a Nuxt 3.11 app is not "Vue 3.11".
            const verDep = dep === "nuxt" ? (sdeps.vue ? "vue" : null) : dep;
            stack.frontendVersion = verDep ? String(sdeps[verDep]).replace(/[^0-9.]/g, "") : null;
            stack.frontendRoot = sub;
            stack.detected.push(`${label} (${sub}/)`);
            break;
          }
        }
        if (stack.frontend && sdeps.vite && stack.frontend !== "nextjs") stack.frontendBundler = "vite";
      }
      // Config-file fallback inside the sub-directory (mirrors the root fallback
      // below): a package.json without a recognizable framework dep, or none at all.
      if (!stack.frontend) {
        const subFallbacks = [
          [["next.config.js", "next.config.mjs", "next.config.ts"], "nextjs", null, "next.config"],
          [["vite.config.ts", "vite.config.js"], "react", "vite", "vite.config"],
          [["nuxt.config.ts", "nuxt.config.js"], "vue", null, "nuxt.config"],
          [["angular.json", ".angular.json"], "angular", null, "angular.json"],
        ];
        for (const [files, frontendName, bundler, label] of subFallbacks) {
          if (files.some(f => existsSafe(path.join(subDir, f)))) {
            stack.frontend = frontendName;
            stack.frontendRoot = sub;
            if (bundler) stack.frontendBundler = bundler;
            stack.detected.push(`${label} (${sub}/, fallback)`);
            break;
          }
        }
      }
      if (stack.frontend) {
        // Remember the sub-directory; language / package manager are filled
        // AFTER every backend block has run (see "SPA-only sub-directory
        // repo" below). Filling them here would pre-empt the Python block's
        // `if (!stack.language)` and turn a Django + frontend/ repo into
        // "typescript", silently skipping the Python scanner.
        subDirSpa = { subDir, sdeps };
        break;
      }
    }
  }

  // ── Python ──
  const hasPyproject = existsSafe(path.join(ROOT, "pyproject.toml"));
  const hasRequirements = existsSafe(path.join(ROOT, "requirements.txt"));
  if (hasPyproject || hasRequirements) {
    // v2.5.0 — a Python manifest at the root beats a `language` that came
    // from a root package.json with NO Node backend framework: that
    // package.json exists for Tailwind/PostCSS/ESLint tooling, and the
    // backend is Python. (A NestJS/Express/Fastify framework keeps Node.)
    const NODE_BACKENDS = ["nestjs", "express", "fastify"];
    if (!stack.language) {
      stack.language = "python";
    } else if (languageFromPackageJson && !NODE_BACKENDS.includes(stack.framework)) {
      stack.language = "python";
      stack.languageVersion = null; // was the TypeScript version; Python's is read below
    }
    stack.detected.push("python");

    const pyFrameworkRules = [["django", "django"], ["fastapi", "fastapi"], ["flask", "flask"]];
    const pyOrmRules = [["sqlalchemy", "sqlalchemy"], ["tortoise", "tortoise-orm"]];

    // v2.5.0 — keyword matching is case-insensitive. `pip freeze` and PyPI
    // canonical names are capitalized (`Django==5.0`, `Flask==3.0`,
    // `SQLAlchemy==2.0`); the previous case-sensitive `includes()` never
    // recognized Django/Flask from requirements.txt, and a Django project
    // then aborted `init` with "domain-groups.json has invalid totalGroups: 0".
    if (hasPyproject) {
      const ppRaw = readFileSafe(path.join(ROOT, "pyproject.toml"));
      const pp = ppRaw ? ppRaw.toLowerCase() : ppRaw;
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
      const rRaw = readFileSafe(path.join(ROOT, "requirements.txt"));
      const r = rRaw ? rRaw.toLowerCase() : rRaw;
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

  // ── Java: legacy evidence (runs AFTER Node/Python) ── (see detectLegacyJvm)
  await detectLegacyJvm(ROOT, stack, languageFromPackageJson);

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
  // .env: original checks postgres (not postgresql), no oracle/h2.
  // Preserve that semantics, but update both primary and array
  // outputs together.
  //
  // Returns true when a file in `files` actually DECLARED a DATABASE_URL —
  // not merely when a keyword matched. A runtime `.env` carrying a dialect
  // this keyword list does not cover (`jdbc:oracle:thin:@…`, `jdbc:sqlserver://…`)
  // still means the project answered the question, and a template must not
  // answer it differently.
  const detectDbFromEnvFiles = (files) => {
    let declared = false;
    for (const ef of files) {
      const ep = path.join(ROOT, ef);
      if (!existsSafe(ep)) continue;
      const ec = readFileSafe(ep);
      if (!ec || !ec.includes("DATABASE_URL")) continue;
      declared = true;
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
    return declared;
  };

  // Runtime env files first — they hold the real values. Unchanged behaviour.
  const runtimeEnvDeclared = detectDbFromEnvFiles([".env", ".env.local", ".env.development"]);

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

  // v2.5.x — `.env` is gitignored in most repos, so on a fresh clone the
  // runtime files are absent and the DB type went undetected even though the
  // project committed a perfectly good `.env.example`. lib/env-parser.js has
  // always treated `.env.example` as the canonical "shape of truth" (it heads
  // ENV_FILE_ORDER); this aligns DB detection with that.
  //
  // POSITION MATTERS: this runs LAST, after every other DB source including
  // the Prisma block above. An `.env.example` value is a placeholder by
  // definition; `schema.prisma`, build files and `application.yml` are
  // declarative statements of intent. Hoisting this above them would let a
  // stale placeholder win the `if (!stack.database)` race against a real
  // declaration — worse than the null it replaces.
  //
  // Two guards keep it strictly additive — a template is consulted ONLY to
  // fill a total blank, never to contradict or pad an existing answer:
  //   1. no runtime env file declared a DATABASE_URL, and
  //   2. no other source (build.gradle / pom.xml / requirements.txt /
  //      application.yml / schema.prisma) has identified a database.
  // So a placeholder `mysql://` in `.env.example` can never append a phantom
  // dialect to a project whose build file already said `oracle`.
  if (!runtimeEnvDeclared && stack.databases.length === 0 && !stack.database) {
    detectDbFromEnvFiles([".env.example", ".env.sample", ".env.template"]);
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
        // v2.5.0 — keep the bundler signal even when a backend owns `framework`.
        if (frameworkName === "vite") stack.frontendBundler = "vite";
        break;
      }
    }
  }

  // ── .env-derived factual config ──
  // Read .env.example (preferred) or .env to capture ports/hosts/API targets
  // the project actually declares. This overrides framework-default guesses
  // in downstream code (plan-installer/index.js defaultPort) and exposes the
  // full variable map to Pass 3 prompts via project-analysis.json.
  // v2.5.0 — SPA-only sub-directory repo. Runs after EVERY backend block
  // (Gradle / Maven / Node / Python): a repo whose only application is the
  // SPA in `frontend/` must not be reported as "no language detected", but a
  // backend's language / package manager always takes precedence.
  if (subDirSpa && !stack.language) {
    const { subDir, sdeps } = subDirSpa;
    const ts = (sdeps && sdeps.typescript) || existsSafe(path.join(subDir, "tsconfig.json"));
    stack.language = ts ? "typescript" : "javascript";
    if (sdeps && sdeps.typescript && !stack.languageVersion) {
      const tv = String(sdeps.typescript).match(/(\d+(?:\.\d+)*)/);
      if (tv) stack.languageVersion = tv[1];
    }
  }
  if (subDirSpa && !stack.packageManager) {
    const { subDir } = subDirSpa;
    stack.packageManager = existsSafe(path.join(subDir, "pnpm-lock.yaml")) ? "pnpm"
      : existsSafe(path.join(subDir, "yarn.lock")) ? "yarn"
      : existsSafe(path.join(subDir, "bun.lockb")) || existsSafe(path.join(subDir, "bun.lock")) ? "bun" : "npm";
  }

  const envInfo = readStackEnvInfo(ROOT);
  if (envInfo) {
    stack.envInfo = envInfo;
    // Promote .env-declared port to stack.port if no earlier detection won
    // (e.g., Spring application.yml parsing).
    //
    // v2.5.0 — a root `.env*` may carry BOTH a backend port and a frontend
    // dev-server port (`VITE_PORT` / `NEXT_PUBLIC_PORT` / `NUXT_PORT` /
    // `NG_PORT`). `extractPort()` prefers the frontend keys, so when a
    // backend exists the frontend key must go to `frontendPort`, never to the
    // backend's `stack.port`.
    // v2.5.2 — read the UNREDACTED port values (`envInfo.portVars`), not the
    // redacted `vars` map. No current key-name rule intersects a port key, so
    // this changes nothing today; it removes the structural dependency of
    // port detection on the redaction rule set. Falls back to `vars` for an
    // envInfo produced by a pre-v2.5.2 caller.
    const vars = envInfo.portVars || envInfo.vars || {};
    const feKeys = Object.keys(vars).filter(k => /^(VITE_|NEXT_|NUXT_|NG_)\w*PORT$/.test(k));
    const backendOnlyVars = Object.fromEntries(Object.entries(vars).filter(([k]) => !feKeys.includes(k)));
    const backendPort = extractPort(backendOnlyVars);
    const frontendPort = feKeys.length ? extractPort(Object.fromEntries(feKeys.map(k => [k, vars[k]]))) : null;
    const hasBackend = (!!stack.framework && stack.framework !== "vite") || ["java", "kotlin", "python"].includes(stack.language);
    if (!stack.port) {
      const p = hasBackend ? backendPort : envInfo.port;
      if (p) stack.port = p;
    }
    if (frontendPort && stack.frontend && !stack.frontendRoot && !stack.frontendPort) stack.frontendPort = frontendPort;
    // Keep `stack.envInfo.port` consistent with the split: Pass 3 prompts read
    // `stack.envInfo.port` for the backend Server Port row, so it must never
    // carry the frontend dev-server value when a backend exists.
    envInfo.port = hasBackend ? (backendPort || null) : envInfo.port;
    if (frontendPort) envInfo.frontendPort = frontendPort;
  }
  // v2.5.0 — Sub-directory SPA: its own `.env*` (VITE_PORT, VITE_API_URL,
  // NEXT_PUBLIC_*) lives under `frontend/`, not at the project root. Read it
  // separately (same redaction/masking) so the dev-server port and API target
  // come from the project instead of framework-default guesses. Kept apart
  // from `stack.envInfo` / `stack.port` so a frontend `PORT=3000` never
  // overrides the backend's port.
  if (stack.frontendRoot) {
    const feEnv = readStackEnvInfo(path.join(ROOT, stack.frontendRoot));
    if (feEnv) {
      stack.frontendEnvInfo = { ...feEnv, source: `${stack.frontendRoot}/${feEnv.source}` };
      if (feEnv.port) stack.frontendPort = feEnv.port;
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
