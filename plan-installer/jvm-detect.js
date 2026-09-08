/**
 * ClaudeOS-Core — JVM / Spring detection helpers
 *
 * Pure text functions. No filesystem access, no side effects: every function
 * takes the build-file text (or a file list) and returns what that text
 * literally declares. Nothing here invents a version — every returned
 * version string is a substring of the input, or is resolved from a variable
 * that is itself defined in the input.
 *
 * Why this exists (v2.5.x): stack-detector's Gradle branch only set
 * `language = "java"` when it saw the string `spring-boot`. A legacy
 * `apply plugin: 'java'` + `spring-webmvc:4.3.30.RELEASE` build reported
 * `language: null` → "No language detected" → the Java scanner never ran.
 * Maven set the language but never the framework or its version. Ant and
 * Eclipse-WTP projects (build.xml, .classpath, WEB-INF/lib/*.jar — the
 * shape of most Korean SI legacy) were invisible.
 *
 * Scope of "Spring Framework" here: group id EXACTLY `org.springframework`.
 * `org.springframework.boot` / `.data` / `.security` / `.cloud` are other
 * projects with their own version lines and are deliberately excluded from
 * the framework-version search — a `spring-security-core:5.8.0` must never
 * be reported as Spring Framework 5.8.0.
 */

// ─── Version token ───────────────────────────────────────────────────
// Accepts `5.3.30`, `4.3.30.RELEASE`, `3.2.18.RELEASE`, `2.5.6`, `2.5.6.SEC03`,
// `6.1.0-M2`, `5.3.0-SNAPSHOT`. Must start with a digit.
const VER = "(\\d+(?:\\.\\d+){1,3}(?:[.-][A-Za-z0-9]+)*)";

// Spring Framework artifact names (group `org.springframework` only).
// `spring` alone is the 2.x-era single jar (`org.springframework:spring:2.5.6`).
// Spring 1.x published under the bare group `springframework`; 2.0+ under
// `org.springframework`. Both are the Framework; nothing else is.
const SPRING_GROUP = "(?:org\\.)?springframework";
const SPRING_FW_ARTIFACT = "spring(?:-(?:core|beans|context|context-support|context-indexer|aop|aspects|expression|instrument|jcl|jdbc|jms|messaging|orm|oxm|r2dbc|test|tx|web|webflux|webmvc|websocket|framework-bom|struts|ibatis|hibernate3|mock|agent|portlet|dao|support|remoting))?";

// ─── Gradle ──────────────────────────────────────────────────────────

/**
 * Which JVM plugins does a Gradle build file apply?
 * Handles the legacy `apply plugin: 'x'`, the `plugins { id 'x' }` DSL,
 * the Kotlin-DSL `id("x")`, and Kotlin-DSL bare identifiers (`java`,
 * `war`, `` `java-library` ``, `application`).
 */
function gradleJvmPlugins(g) {
  const found = new Set();
  const add = (p) => { if (p) found.add(p); };
  const PLUGINS = ["java", "java-library", "war", "ear", "application", "groovy", "org.springframework.boot", "spring-boot", "io.spring.dependency-management"];
  for (const p of PLUGINS) {
    const esc = p.replace(/[.-]/g, "\\$&");
    if (new RegExp(`apply\\s+plugin:\\s*['"]${esc}['"]`).test(g)) add(p);
    // Kotlin DSL legacy form: apply(plugin = "war")
    if (new RegExp(`apply\\s*\\(\\s*plugin\\s*=\\s*['"]${esc}['"]\\s*\\)`).test(g)) add(p);
    if (new RegExp(`\\bid\\s*\\(?\\s*['"]${esc}['"]`).test(g)) add(p);
  }
  // Kotlin DSL bare identifiers inside a plugins { } block only.
  const pluginsBlock = g.match(/plugins\s*\{([\s\S]*?)\}/);
  if (pluginsBlock) {
    const body = pluginsBlock[1];
    for (const line of body.split("\n")) {
      const t = line.trim().replace(/\/\/.*$/, "").trim();
      if (/^(java|war|ear|application|groovy)$/.test(t)) add(t);
      if (/^`java-library`$/.test(t)) add("java-library");
    }
  }
  return found;
}

function gradlePackaging(plugins) {
  if (plugins.has("ear")) return "ear";
  if (plugins.has("war")) return "war";
  return null;
}

function gradleIsJvm(plugins) {
  return ["java", "java-library", "war", "ear", "application", "groovy", "org.springframework.boot", "spring-boot"]
    .some(p => plugins.has(p));
}

/**
 * Does the Gradle build declare a Spring Framework dependency
 * (group EXACTLY org.springframework)?
 */
function gradleHasSpringFramework(g) {
  // `org.springframework:spring-webmvc:…` / `org.springframework:spring:…`
  // The lookahead forbids `org.springframework.boot:` etc. by requiring `:`
  // immediately after the group.
  if (new RegExp(`['"]${SPRING_GROUP}:${SPRING_FW_ARTIFACT}(?:[:'"]|$)`, "m").test(g)) return true;
  // group: 'org.springframework', name: 'spring-webmvc' — any key order
  if (gradleMapDeps(g).some(d => d.isSpringFw)) return true;
  // mavenBom 'org.springframework:spring-framework-bom:…'
  if (/spring-framework-bom/.test(g)) return true;
  // version catalog accessor `libs.spring.webmvc` cannot be resolved here;
  // the catalog itself is inspected by the caller.
  return false;
}

/**
 * Resolve `${name}` / `$name` / `name` against `ext { name = '…' }`,
 * `def name = '…'`, `val name = "…"`, `name = "…"` inside the same file.
 * Returns the literal or null.
 */
function resolveGradleVar(g, name, props) {
  // `${project.springVersion}`, `${rootProject.ext.springVersion}`, `${ext.x}`
  // all denote the same ext property.
  name = name.replace(/^(?:rootProject|project)\.(?:ext\.)?|^ext\./, "");
  const esc = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const m = g.match(new RegExp(`(?:^|[\\s{;])(?:val\\s+|def\\s+|ext\\.|project\\.ext\\.)?${esc}\\s*=\\s*['"]${VER}['"]`, "m"));
  if (m) return m[1];
  // Dotted access: `versions.spring` (Groovy map `versions = [spring: '…']`),
  // `Versions.spring` (buildSrc `object Versions { const val spring = "…" }`),
  // or a direct `versions.spring = '…'` assignment.
  const dot = name.match(/^([\w]+)\.([\w]+)$/);
  if (dot) {
    const [, obj, key] = dot;
    const eo = obj.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), ek = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const map = g.match(new RegExp(`\\b${eo}\\s*=\\s*\\[([\\s\\S]*?)\\]`));
    if (map) { const kv = map[1].match(new RegExp(`(?:^|[\\s,\\[])['"]?${ek}['"]?\\s*:\\s*['"]${VER}['"]`)); if (kv) return kv[1]; }
    const objBlock = g.match(new RegExp(`object\\s+${eo}\\s*\\{([\\s\\S]*?)\\n\\}`));
    if (objBlock) { const kv = objBlock[1].match(new RegExp(`\\bval\\s+${ek}\\s*(?::\\s*String)?\\s*=\\s*["']${VER}["']`)); if (kv) return kv[1]; }
    const direct = g.match(new RegExp(`\\b${eo}\\.${ek}\\s*=\\s*['"]${VER}['"]`));
    if (direct) return direct[1];
  }
  // Second source: gradle.properties (`springVersion=4.3.30.RELEASE`). Kotlin
  // DSL `val springVersion: String by project` reads from there too.
  if (props && typeof props[name] === "string" && new RegExp(`^${VER}$`).test(props[name].trim())) return props[name].trim();
  return null;
}

/** Parse gradle.properties into {key: value}. Comments and blanks skipped. */
function parseGradleProperties(text) {
  const out = {};
  if (!text) return out;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#") || line.startsWith("!")) continue;
    const m = line.match(/^([^=:\s]+)\s*[=:]\s*(.*)$/);
    if (m) out[m[1]] = m[2];
  }
  return out;
}

/** Turn a captured version-or-variable into a literal, or null. */
function literalOrResolve(g, captured, props) {
  if (!captured) return null;
  const v = captured.match(/^\$\{?([\w.]+)\}?$/);
  if (v) return resolveGradleVar(g, v[1], props);
  return /^\d/.test(captured) ? captured : null;
}

/**
 * Files a build script pulls in for variable definitions:
 * `apply from: 'gradle/dependencies.gradle'` / `apply(from = "…")`.
 * Returns the relative paths as written.
 */
function gradleAppliedScripts(g) {
  const out = [];
  for (const m of g.matchAll(/apply\s*(?:\(\s*)?from\s*[:=]\s*['"]([^'"]+)['"]/g)) out.push(m[1]);
  for (const m of g.matchAll(/apply\s+from\s*:\s*rootProject\.file\(\s*['"]([^'"]+)['"]\s*\)/g)) out.push(m[1]);
  return [...new Set(out)];
}

/**
 * Spring Framework version from a Gradle build file. Order:
 *   1. spring-framework-bom coordinate (the one place a project pins it when
 *      individual deps are versionless)
 *   2. explicit coordinate `org.springframework:spring-xxx:V`
 *   3. group/name/version notation
 * Each accepts a `${var}` and resolves it in-file.
 */
function gradleSpringFrameworkVersion(g, props) {
  const CANDIDATES = [
    new RegExp(`spring-framework-bom:(\\$\\{?[\\w.]+\\}?|${VER})`),
    new RegExp(`['"]${SPRING_GROUP}:${SPRING_FW_ARTIFACT}:(\\$\\{?[\\w.]+\\}?|${VER})['"]`),
  ];
  for (const re of CANDIDATES) {
    const m = g.match(re);
    if (!m) continue;
    const v = literalOrResolve(g, m[1], props);
    if (v) return v;
  }
  // group:/name:/version: map notation, any key order, single- or multi-line.
  for (const d of gradleMapDeps(g)) {
    if (!d.isSpringFw || !d.version) continue;
    const v = literalOrResolve(g, d.version, props);
    if (v) return v;
  }
  return null;
}

/**
 * Parse Gradle map-notation dependencies: a run of `group:`/`name:`/`version:`
 * pairs (2–3 of them, any order, commas/newlines between). Returns
 * [{group, name, version, isSpringFw}].
 */
function gradleMapDeps(g) {
  const out = [];
  const RUN = /((?:\b(?:group|name|version)\s*:\s*['"][^'"]*['"]\s*,?\s*){2,3})/g;
  for (const m of g.matchAll(RUN)) {
    const d = {};
    for (const kv of m[1].matchAll(/\b(group|name|version)\s*:\s*['"]([^'"]*)['"]/g)) d[kv[1]] = kv[2];
    if (!d.group || !d.name) continue;
    d.isSpringFw = new RegExp(`^${SPRING_GROUP}$`).test(d.group) && new RegExp(`^${SPRING_FW_ARTIFACT}$`).test(d.name);
    out.push(d);
  }
  return out;
}

/**
 * Spring Boot version from a Gradle build file — covers the forms the
 * existing detector already handled PLUS the Boot 1.x/2.x buildscript
 * classpath form (`spring-boot-gradle-plugin:1.5.22.RELEASE`, with or
 * without a `${springBootVersion}` indirection).
 */
function gradleSpringBootVersion(g, props) {
  const CANDIDATES = [
    new RegExp(`id\\s*\\(?\\s*['"]org\\.springframework\\.boot['"]\\s*\\)?\\s*version\\s*\\(?\\s*['"](\\$\\{?[\\w.]+\\}?|${VER})['"]`),
    new RegExp(`spring-boot-gradle-plugin:(\\$\\{?[\\w.]+\\}?|${VER})`),
    new RegExp(`spring-boot-dependencies:(\\$\\{?[\\w.]+\\}?|${VER})`),
    new RegExp(`org\\.springframework\\.boot[^\\n]*version\\s*['"](\\$\\{?[\\w.]+\\}?|${VER})['"]`),
  ];
  for (const re of CANDIDATES) {
    const m = g.match(re);
    if (!m) continue;
    const v = literalOrResolve(g, m[1], props);
    if (v) return v;
  }
  return null;
}

// ─── Gradle version catalog (libs.versions.toml) ────────────────────

/**
 * Spring Framework version from a version catalog. Finds a library whose
 * module is `org.springframework:spring-*` and resolves its
 * `version.ref` / inline `version`. Returns null if absent.
 */
function catalogSpringFrameworkVersion(toml) {
  if (!toml) return null;
  const lib = toml.match(new RegExp(`module\\s*=\\s*["']org\\.springframework:${SPRING_FW_ARTIFACT}["'][^\\n]*`));
  if (!lib) return null;
  const line = lib[0];
  const ref = line.match(/version\.ref\s*=\s*["']([\w.-]+)["']/);
  if (ref) {
    const def = toml.match(new RegExp(`^\\s*${ref[1].replace(/[.-]/g, "\\$&")}\\s*=\\s*["']${VER}["']`, "m"));
    return def ? def[1] : null;
  }
  const inline = line.match(new RegExp(`version\\s*=\\s*["']${VER}["']`));
  return inline ? inline[1] : null;
}

function catalogHasSpringFramework(toml) {
  return !!toml && new RegExp(`org\\.springframework:${SPRING_FW_ARTIFACT}["']`).test(toml);
}

// ─── Maven ───────────────────────────────────────────────────────────

/** `<packaging>war</packaging>` at project level, or null when absent. */
function mavenPackaging(pom) {
  const m = pom.match(/<packaging>\s*(jar|war|ear|pom|bundle)\s*<\/packaging>/);
  return m ? m[1] : null;
}

/** Resolve `${prop}` against `<prop>value</prop>` in the same pom. */
function resolveMavenProp(pom, name) {
  const esc = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const m = pom.match(new RegExp(`<${esc}>\\s*${VER}\\s*</${esc}>`));
  return m ? m[1] : null;
}

function literalOrResolveMaven(pom, captured) {
  if (!captured) return null;
  const v = captured.match(/^\$\{([\w.-]+)\}$/);
  if (v) return resolveMavenProp(pom, v[1]);
  return /^\d/.test(captured) ? captured : null;
}

/**
 * Every <dependency> block whose groupId is EXACTLY org.springframework.
 * Returns [{artifactId, version|null}]. Works on comment-stripped text.
 */
function mavenSpringFrameworkDeps(pomClean) {
  const out = [];
  const blocks = pomClean.matchAll(/<dependency>([\s\S]*?)<\/dependency>/g);
  for (const b of blocks) {
    const body = b[1];
    if (!new RegExp(`<groupId>\\s*${SPRING_GROUP}\\s*</groupId>`).test(body)) continue;
    const a = body.match(/<artifactId>\s*([\w.-]+)\s*<\/artifactId>/);
    if (!a) continue;
    if (!new RegExp(`^${SPRING_FW_ARTIFACT}$`).test(a[1])) continue;
    const v = body.match(/<version>\s*([^<]+?)\s*<\/version>/);
    out.push({ artifactId: a[1], version: v ? v[1] : null });
  }
  return out;
}

function mavenHasSpringFramework(pomClean) {
  return mavenSpringFrameworkDeps(pomClean).length > 0;
}

/**
 * Spring Framework version from a pom. Order:
 *   1. spring-framework-bom import (dependencyManagement)
 *   2. first org.springframework dependency carrying a <version>
 *   3. a conventional <spring.version> / <spring-framework.version> property
 * `${prop}` values are resolved in-file.
 */
function mavenSpringFrameworkVersion(pom, pomClean) {
  const deps = mavenSpringFrameworkDeps(pomClean);
  const bom = deps.find(d => d.artifactId === "spring-framework-bom" && d.version);
  if (bom) { const v = literalOrResolveMaven(pom, bom.version); if (v) return v; }
  for (const d of deps) {
    if (!d.version) continue;
    const v = literalOrResolveMaven(pom, d.version);
    if (v) return v;
  }
  for (const prop of ["spring.version", "spring-framework.version", "springframework.version", "org.springframework.version"]) {
    const v = resolveMavenProp(pom, prop);
    if (v) return v;
  }
  return null;
}

/**
 * Spring Boot version from a pom: starter-parent <version>, the
 * spring-boot-dependencies BOM import, or a <spring-boot.version> property.
 */
function mavenSpringBootVersion(pom, pomClean) {
  // Bounded to the <parent> block: a `(?:(?!</parent>)[\s\S])*?` scan cannot
  // run past </parent> into a later <dependency> that happens to mention
  // spring-boot-starter-parent.
  const parentBlock = pomClean.match(/<parent>((?:(?!<\/parent>)[\s\S])*)<\/parent>/);
  if (parentBlock && /<artifactId>\s*spring-boot-starter-parent\s*<\/artifactId>/.test(parentBlock[1])) {
    const pv = parentBlock[1].match(/<version>\s*([^<]+?)\s*<\/version>/);
    if (pv) { const v = literalOrResolveMaven(pom, pv[1]); if (v) return v; }
  }
  const bom = pomClean.match(/<artifactId>\s*spring-boot-dependencies\s*<\/artifactId>\s*<version>\s*([^<]+?)\s*<\/version>/);
  if (bom) { const v = literalOrResolveMaven(pom, bom[1]); if (v) return v; }
  const prop = pom.match(new RegExp(`<spring-boot[.\\w-]*version>\\s*${VER}\\s*<`));
  if (prop) return prop[1];
  return null;
}

/**
 * Java level from a legacy maven-compiler-plugin <configuration>
 * (`<source>1.5</source>`), used when no <java.version> /
 * <maven.compiler.source> property exists. Returns the raw token.
 */
function mavenCompilerPluginSource(pom) {
  // Walk <plugin> blocks individually so a compiler plugin WITHOUT a
  // <configuration> cannot borrow <source> from the next plugin's block.
  for (const b of pom.matchAll(/<plugin>((?:(?!<\/plugin>)[\s\S])*)<\/plugin>/g)) {
    if (!/<artifactId>\s*maven-compiler-plugin\s*<\/artifactId>/.test(b[1])) continue;
    const s = b[1].match(/<(?:source|release|target)>\s*(\d+(?:\.\d+)?)\s*<\/(?:source|release|target)>/);
    return s ? s[1] : null;
  }
  return null;
}

// ─── Ant / Eclipse / no build tool ───────────────────────────────────

/** `<javac … source="1.6">` → "1.6". */
function antJavacSource(buildXml) {
  const m = buildXml.match(/<javac\b[^>]*\b(?:source|target)\s*=\s*["'](\d+(?:\.\d+)?)["']/);
  return m ? m[1] : null;
}

/** `.classpath` JRE container → "1.7" / "17"; null if absent. */
function eclipseJreLevel(classpathXml) {
  const m = classpathXml.match(/(?:JavaSE|J2SE|JRE)-(\d+(?:\.\d+)?)/)
    // Custom VM names: `jdk1.6.0_45`, `jre1.8.0_202`, `jdk-17.0.2`, `jdk17`
    || classpathXml.match(/\/(?:jdk|jre)-?(1\.\d|\d{1,2})(?:[._]\d+)*["'/]/);
  return m ? m[1] : null;
}

/** `.settings/org.eclipse.jdt.core.prefs` → compliance / source level. */
function eclipseJdtPrefsLevel(prefs) {
  if (!prefs) return null;
  const m = prefs.match(/org\.eclipse\.jdt\.core\.compiler\.(?:compliance|source)\s*=\s*(\d+(?:\.\d+)?)/);
  return m ? m[1] : null;
}

/** Jar basenames referenced by `.classpath` `kind="lib"` / `kind="var"` entries. */
function eclipseClasspathJars(classpathXml) {
  if (!classpathXml) return [];
  const out = [];
  for (const m of classpathXml.matchAll(/<classpathentry\b[^>]*\bkind\s*=\s*["'](?:lib|var)["'][^>]*\bpath\s*=\s*["']([^"']+\.jar)["']/gi)) out.push(m[1]);
  for (const m of classpathXml.matchAll(/<classpathentry\b[^>]*\bpath\s*=\s*["']([^"']+\.jar)["'][^>]*\bkind\s*=\s*["'](?:lib|var)["']/gi)) out.push(m[1]);
  return [...new Set(out)];
}

/** IntelliJ `.idea/misc.xml` → `languageLevel="JDK_1_7"` / `"JDK_17"`. */
function intellijLanguageLevel(miscXml) {
  if (!miscXml) return null;
  const m = miscXml.match(/languageLevel\s*=\s*["']JDK_(\d+)(?:_(\d+))?["']/);
  if (!m) return null;
  return m[2] ? `${m[1]}.${m[2]}` : m[1];
}

/** NetBeans `nbproject/project.properties` → { level, jars[] }. */
function netbeansProject(props) {
  if (!props) return { level: null, jars: [] };
  const level = (props.match(/^\s*javac\.(?:source|target)\s*=\s*(\d+(?:\.\d+)?)/m) || [])[1] || null;
  const jars = [...props.matchAll(/^\s*file\.reference\.([^=\s]+\.jar)\s*=/gm)].map(m => m[1]);
  return { level, jars };
}

/**
 * `WEB-INF/web.xml` evidence: Spring MVC (`org.springframework.web.servlet.
 * DispatcherServlet`, `ContextLoaderListener`), Struts, servlet spec version.
 */
function webXmlFacts(webXml) {
  if (!webXml) return { spring: false, struts: null, servletVersion: null };
  return {
    spring: /org\.springframework\./.test(webXml),
    struts: /org\.apache\.struts2\.|StrutsPrepareAndExecuteFilter/.test(webXml) ? "struts2"
          : /org\.apache\.struts\.action\.ActionServlet/.test(webXml) ? "struts" : null,
    servletVersion: (webXml.match(/<web-app\b[^>]*\bversion\s*=\s*["'](\d+\.\d+)["']/) || [])[1] || null,
  };
}

/**
 * Spring XSD schema versions in a Spring XML config —
 * `…/spring-beans-3.0.xsd` → "3.0". Major.minor only; the lowest-fidelity
 * version source, used only when nothing else pinned it. Returns the
 * highest version seen (a 3.0 project may still reference a 2.5 schema for
 * one namespace).
 */
function springXsdVersion(xml) {
  if (!xml) return null;
  let best = null;
  for (const m of xml.matchAll(/springframework\.org\/schema\/[\w-]+\/spring-[\w-]+-(\d+\.\d+)\.xsd/g)) {
    if (!best || parseFloat(m[1]) > parseFloat(best)) best = m[1];
  }
  return best;
}

/** Struts / JSF tags from Maven or Gradle text: [{tag, version}] */
function legacyFrameworkTags(text) {
  const tags = [];
  const push = (tag, v) => { if (!tags.some(t => t.tag === tag)) tags.push({ tag, version: v || null }); };
  // Maven blocks
  for (const b of text.matchAll(/<dependency>((?:(?!<\/dependency>)[\s\S])*)<\/dependency>/g)) {
    const g = (b[1].match(/<groupId>\s*([^<]+?)\s*<\/groupId>/) || [])[1];
    const a = (b[1].match(/<artifactId>\s*([^<]+?)\s*<\/artifactId>/) || [])[1];
    const v = (b[1].match(/<version>\s*([^<]+?)\s*<\/version>/) || [])[1];
    if (!g || !a) continue;
    if (/^(org\.apache\.)?struts$/.test(g) && /^(struts|struts-core)$/.test(a)) push("struts", v);
    if (g === "org.apache.struts" && a === "struts2-core") push("struts2", v);
    if (/^javax\.faces$|^jakarta\.faces$|^org\.glassfish$/.test(g) && /faces|jsf/.test(a)) push("jsf", v);
  }
  // Gradle coordinates
  for (const m of text.matchAll(new RegExp(`['"]((?:org\\.apache\\.)?struts):(struts|struts-core|struts2-core):(${VER})['"]`, "g"))) push(m[2] === "struts2-core" ? "struts2" : "struts", m[3]);
  for (const m of text.matchAll(new RegExp(`['"](?:javax|jakarta)\\.faces:[\\w.-]+:(${VER})['"]`, "g"))) push("jsf", m[1]);
  return tags;
}

function eclipseHasJavaNature(projectXml) {
  return /org\.eclipse\.jdt\.core\.javanature/.test(projectXml || "");
}

/**
 * Classify a list of jar file names (basename only). Returns
 *   { springFramework: bool, springFrameworkVersion, springBoot: bool,
 *     springBootVersion }
 * `spring-webmvc-3.0.5.RELEASE.jar` → 3.0.5.RELEASE; `spring.jar` →
 * present, version null (Spring 2.0 era shipped unversioned names).
 */
function classifyJars(jarNames) {
  const r = { springFramework: false, springFrameworkVersion: null, springBoot: false, springBootVersion: null, databases: [], orm: null };
  const fwRe = new RegExp(`^${SPRING_FW_ARTIFACT}(?:-${VER})?\\.jar$`);
  const bootRe = new RegExp(`^spring-boot(?:-[\\w-]+)?-${VER}\\.jar$`);
  // JDBC driver jar names → DB. Values reuse stack-detector's vocabulary.
  // Includes drivers common in Korean enterprise deployments (Tibero, Altibase,
  // Cubrid) — legacy SI systems frequently ship them in WEB-INF/lib.
  const DB_JARS = [
    [/^ojdbc\d*/i, "oracle"], [/^postgresql-/i, "postgresql"], [/^mysql-connector/i, "mysql"],
    [/^mariadb-java-client/i, "mariadb"], [/^h2-/i, "h2"], [/^sqlite-jdbc/i, "sqlite"],
    [/^(mssql-jdbc|sqljdbc|jtds)/i, "mssql"], [/^(db2jcc|jcc-)/i, "db2"], [/^tibero/i, "tibero"],
    [/^altibase/i, "altibase"], [/^cubrid/i, "cubrid"], [/^mongo(db)?-(java-)?driver/i, "mongodb"],
  ];
  // ORM jar names. iBatis before MyBatis: `mybatis` is not a substring of
  // `ibatis`, but keep explicit precedence for the same reason
  // stack-detector's IBATIS_REGEX runs first.
  const ORM_JARS = [
    [/^ibatis/i, "ibatis"], [/^mybatis/i, "mybatis"], [/^hibernate/i, "jpa"],
    [/^eclipselink/i, "jpa"], [/^openjpa/i, "jpa"], [/^jooq-/i, "jooq"],
  ];
  for (const n of jarNames) {
    const b = n.match(bootRe);
    if (b) { r.springBoot = true; if (!r.springBootVersion) r.springBootVersion = b[1]; continue; }
    const f = n.match(fwRe);
    if (f) { r.springFramework = true; if (!r.springFrameworkVersion && f[1]) r.springFrameworkVersion = f[1]; }
    for (const [re, db] of DB_JARS) if (re.test(n) && !r.databases.includes(db)) r.databases.push(db);
    if (!r.orm) for (const [re, orm] of ORM_JARS) if (re.test(n)) { r.orm = orm; break; }
  }
  return r;
}

// ─── Ant + Ivy ───────────────────────────────────────────────────────

/** `<dependency org="org.springframework" name="spring-webmvc" rev="V"/>` */
function ivySpringFrameworkVersion(ivy) {
  if (!ivy) return null;
  for (const m of ivy.matchAll(/<dependency\b([^>]*)\/?>/g)) {
    const a = m[1];
    if (!new RegExp(`\\borg\\s*=\\s*["']${SPRING_GROUP}["']`).test(a)) continue;
    const name = (a.match(/\bname\s*=\s*["']([\w.-]+)["']/) || [])[1];
    if (!name || !new RegExp(`^${SPRING_FW_ARTIFACT}$`).test(name)) continue;
    const rev = (a.match(new RegExp(`\\brev\\s*=\\s*["']${VER}["']`)) || [])[1];
    if (rev) return rev;
  }
  return null;
}
function ivyHasSpringFramework(ivy) {
  return !!ivy && [...ivy.matchAll(/<dependency\b([^>]*)\/?>/g)].some(m =>
    new RegExp(`\\borg\\s*=\\s*["']${SPRING_GROUP}["']`).test(m[1]) &&
    new RegExp(`\\bname\\s*=\\s*["']${SPRING_FW_ARTIFACT}["']`).test(m[1]));
}

// ─── eGovFrame (전자정부 표준프레임워크) ─────────────────────────────
// Korea's government-standard framework wraps Spring MVC. Group ids:
// `egovframework.rte` (RTE 2.x–4.x), `egovframework.rte.*`. Reported as
// `spring-framework` (templates and prompts understand Spring) plus an
// `egovframe <version>` tag in `detected`. Its poms pin Spring through
// `<spring.maven.version>`, which the Maven property list already resolves.

/** eGovFrame RTE version from a pom (comment-stripped) or a Gradle file. */
function egovframeVersion(text, propsText) {
  if (!text) return null;
  // Maven <dependency> with groupId egovframework.rte[.x]
  for (const b of text.matchAll(/<dependency>((?:(?!<\/dependency>)[\s\S])*)<\/dependency>/g)) {
    if (!/<groupId>\s*egovframework\.rte(?:\.[\w.]+)?\s*<\/groupId>/.test(b[1])) continue;
    const v = (b[1].match(/<version>\s*([^<]+?)\s*<\/version>/) || [])[1];
    if (!v) continue;
    const lit = literalOrResolveMaven(propsText || text, v);
    if (lit) return lit;
  }
  // Property fallback
  const prop = resolveMavenProp(propsText || text, "egovframework.rte.version");
  if (prop) return prop;
  // Gradle coordinate
  const g = text.match(new RegExp(`['"]egovframework\\.rte(?:\\.[\\w.]+)?:[\\w.-]+:(\\$\\{?[\\w.]+\\}?|${VER})['"]`));
  if (g) return literalOrResolve(text, g[1]);
  return null;
}
function hasEgovframe(text) {
  return !!text && /egovframework\.rte/.test(text);
}

module.exports = {
  SPRING_GROUP, gradleMapDeps, gradleAppliedScripts, eclipseJdtPrefsLevel, eclipseClasspathJars,
  intellijLanguageLevel, netbeansProject, webXmlFacts, springXsdVersion, legacyFrameworkTags,
  parseGradleProperties, ivySpringFrameworkVersion, ivyHasSpringFramework, egovframeVersion, hasEgovframe,
  VER,
  gradleJvmPlugins, gradlePackaging, gradleIsJvm, gradleHasSpringFramework,
  gradleSpringFrameworkVersion, gradleSpringBootVersion, resolveGradleVar,
  catalogSpringFrameworkVersion, catalogHasSpringFramework,
  mavenPackaging, mavenSpringFrameworkDeps, mavenHasSpringFramework,
  mavenSpringFrameworkVersion, mavenSpringBootVersion, mavenCompilerPluginSource,
  antJavacSource, eclipseJreLevel, eclipseHasJavaNature, classifyJars,
};
