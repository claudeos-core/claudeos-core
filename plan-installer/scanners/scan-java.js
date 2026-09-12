/**
 * ClaudeOS-Core — Java Structure Scanner
 *
 * Scans Java project directory structure to discover backend domains.
 * Supports 5 patterns:
 *   A: controller/{domain}/*.java (layer-first)
 *   B: {domain}/controller/*.java (domain-first)
 *   C: controller/DomainController.java (flat, extract from class name)
 *   D: {module}/{domain}/controller/ (module/domain — auto-upgrade from B on conflict)
 *   E: {domain}/adapter/in/web/*.java (DDD/Hexagonal)
 *   F: {domain}/DomainController.java (package-by-feature — no layer directory;
 *      controller, service and repository sit side by side in the feature package)
 * Also includes supplementary service-only scan (all patterns) and full fallback.
 */

const path = require("path");
const { glob } = require("glob");
const { readFileSafe, existsSafe } = require("../../lib/safe-fs");

// Normalize backslash paths from glob on Windows to forward slashes
const norm = (p) => p.replace(/\\/g, "/");

// v2.5.0 — Module-aware scanning.
// Source roots (`[<module>/]src/main/java`, `[<module>/]src/main/resources`)
// are discovered ONCE with a single ignore-filtered walk; every subsequent
// pattern is then anchored at each discovered module prefix. This finds
// Gradle/Maven multi-module layouts (`api/src/main/java/...`) with the same
// pattern set as a single-module root, without re-walking the whole tree
// (node_modules, web bundles, build output) for every per-domain glob.
// `src/test/**` and `buildSrc/` are excluded: test-fixture projects
// (`src/test/resources/projects/demo/src/main/java/...`) and Gradle
// convention plugins are not application modules.
const JAVA_ROOT_IGNORE = ["**/node_modules/**", "**/build/**", "**/target/**", "**/out/**", "**/.gradle/**", "**/generated/**", "**/.git/**", "**/src/test/**", "**/buildSrc/**"];

// v2.5.x — Source roots, not module prefixes. Every pattern below is written
// against the Maven/Gradle convention (`src/main/java`, `src/main/resources`)
// and is rewritten per discovered root, so the pattern set stays a single
// source of truth while legacy layouts become scannable:
//
//   modern   [<module>/]src/main/java          (unchanged behaviour)
//   Eclipse  <classpathentry kind="src" path="src"/>   ← consulted first
//   Ant      <javac srcdir="src">  (with <property> resolution)
//   bare     src/java, src, JavaSource, java, WebContent/WEB-INF/src holding *.java
//
// Candidates are tried in that order and every candidate that holds *.java
// becomes a root, except one nested inside (or enclosing) a root already
// accepted — the FIRST-listed of a nested pair wins, which is why the bare
// list names `src/java` before `src`.
//
// Legacy roots are consulted ONLY when no `src/main/java` exists anywhere in
// the tree, so a modern project with a stray top-level `src/` cannot be
// mis-rooted. For legacy roots the resources root is the java root itself:
// iBatis-era projects keep sqlmap XML next to the classes.
async function discoverSourceRoots(ROOT) {
  const javaRoots = (await glob("**/src/main/java/", { cwd: ROOT, ignore: JAVA_ROOT_IGNORE })).map(norm);
  const resRoots = (await glob("**/src/main/resources/", { cwd: ROOT, ignore: JAVA_ROOT_IGNORE })).map(norm);
  const prefixes = new Set();
  for (const r of [...javaRoots, ...resRoots]) {
    const m = r.replace(/\/$/, "").match(/^(.*?)src\/main\/(?:java|resources)$/);
    if (m) prefixes.add(m[1]); // "" for root, "api/" for a module
  }
  if (prefixes.size) {
    return [...prefixes].sort().map(pre => ({ prefix: pre, javaRoot: pre + "src/main/java", resRoot: pre + "src/main/resources", legacy: false }));
  }

  // ── legacy fallbacks ──
  const candidates = [];
  const cpXml = readFileSafe(path.join(ROOT, ".classpath"));
  if (cpXml) {
    for (const m of cpXml.matchAll(/<classpathentry\b[^>]*\bkind\s*=\s*["']src["'][^>]*\bpath\s*=\s*["']([^"']+)["']/g)) {
      const p = norm(m[1]).replace(/^\/|\/$/g, "");
      if (p && !/(^|\/)test(s)?(\/|$)/i.test(p)) candidates.push(p);
    }
  }
  const bx = readFileSafe(path.join(ROOT, "build.xml"));
  if (bx) {
    const props = {};
    for (const m of bx.matchAll(/<property\b[^>]*\bname\s*=\s*["']([^"']+)["'][^>]*\bvalue\s*=\s*["']([^"']+)["']/g)) props[m[1]] = m[2];
    for (const m of bx.matchAll(/<javac\b[^>]*\bsrcdir\s*=\s*["']([^"']+)["']/g)) {
      const p = norm(m[1].replace(/\$\{([^}]+)\}/g, (_, k) => props[k] ?? "")).replace(/^\.?\/|\/$/g, "");
      if (p && !/test/i.test(p)) candidates.push(p);
    }
  }
  for (const c of ["src/java", "src", "JavaSource", "java", "WebContent/WEB-INF/src"]) candidates.push(c);

  const roots = [];
  const seen = new Set();
  for (const c of candidates) {
    if (seen.has(c)) continue;
    seen.add(c);
    if (!existsSafe(path.join(ROOT, c))) continue;
    const hasJava = (await glob(c + "/**/*.java", { cwd: ROOT, ignore: JAVA_ROOT_IGNORE, nodir: true })).length > 0;
    if (!hasJava) continue;
    // Nested pair (`src` vs `src/java`) → keep the first-accepted one only.
    if (roots.some(r => c.startsWith(r.javaRoot + "/") || r.javaRoot.startsWith(c + "/"))) continue;
    roots.push({ prefix: "", javaRoot: c, resRoot: c, legacy: true });
  }
  return roots;
}

// Run one `src/main/...`-relative pattern against every discovered source
// root — rewriting the conventional leading segment to that root's actual
// directory — and return the merged, normalized, de-duplicated file list.
function makeModuleGlob(ROOT, roots) {
  return async (pattern) => {
    const out = new Set();
    for (const r of roots) {
      // Replacement FUNCTIONS so a `$` in a discovered root path is literal.
      const p = pattern
        .replace(/^src\/main\/java(?=\/|$)/, () => r.javaRoot)
        .replace(/^src\/main\/resources(?=\/|$)/, () => r.resRoot);
      for (const f of await glob(p, { cwd: ROOT })) out.add(norm(f));
    }
    return [...out];
  };
}

async function scanJavaDomains(stack, ROOT) {
  const backendDomains = [];
  let rootPackage = null;

  const sourceRoots = await discoverSourceRoots(ROOT);
  const rootsInUse = sourceRoots.length ? sourceRoots : [{ prefix: "", javaRoot: "src/main/java", resRoot: "src/main/resources", legacy: false }];
  const modulePrefixes = rootsInUse.map(r => r.prefix).filter(Boolean);
  const gj = makeModuleGlob(ROOT, rootsInUse);
  // Regex fragment matching any java root — used where file PATHS (not
  // glob patterns) are inspected below. Modern roots collapse to the
  // conventional `src/main/java`; legacy roots contribute their own dir.
  const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const JAVA_ROOT_ALT = [...new Set(rootsInUse.map(r => r.legacy ? r.javaRoot : "src/main/java"))].map(escRe).join("|");
  if (stack && rootsInUse.some(r => r.legacy)) stack.sourceLayout = "legacy";

  const javaFiles = (await gj("src/main/java/**/*.java"));

  // v2.4.0 — Pick the LONGEST package prefix (1-4 segments) that still
  // covers ≥80% of layer-bearing files. Pre-v2.4.0 the first matched file
  // won, which misclassified projects whose actual production code lives
  // under one root (e.g. `<orgA>.<projectA>.*`) but where a small number
  // of stub files happen to sit under another deeper subtree (e.g.
  // `<orgA>.<otherModule>.core.<dir>.*`) — glob enumeration order then
  // determined the rootPackage non-deterministically.
  //
  // Algorithm: count every (1-, 2-, 3-, 4-)segment prefix preceding a
  // known layer marker. Then pick the longest prefix whose count is at
  // least 80% of the maximum (1-segment) count. This gives:
  //   • Mono-package project (`com.example.app.*` only): root = `com.example.app`
  //     (all 4 prefix lengths tied, longest = most specific root).
  //   • Multi-module project (95% under `<root>.api.*`, 5% stubs under
  //     `<root>.misc.*`): root = `<root>.api` (the LONGEST prefix that
  //     still covers ≥80% of files), not `<root>` (too generic) and
  //     not the minority `<root>.misc.*` location (no longer first-match).
  // v2.5.3 — the counting and the 80% pick are split into helpers so Pattern F
  // (package-by-feature, no layer marker anywhere) can run the same algorithm
  // over its feature directories when the layer-marker pass finds nothing.
  const countPkgPrefixes = (counts, segs) => {
    for (let len = Math.min(4, segs.length); len >= 1; len--) {
      const prefix = segs.slice(0, len).join(".");
      counts.set(prefix, (counts.get(prefix) || 0) + 1);
    }
  };
  const pickRootPackage = (counts) => {
    if (counts.size === 0) return null;
    const maxCount = Math.max(...counts.values());
    const threshold = Math.ceil(maxCount * 0.8);
    const candidates = [...counts.entries()].filter(([_, c]) => c >= threshold);
    // Among candidates, pick the longest prefix (most specific root that
    // still covers the majority of files). Tie-break on length DESC.
    candidates.sort((a, b) => b[0].length - a[0].length);
    return candidates[0][0];
  };
  const pkgCounts = new Map();
  for (const f of javaFiles) {
    const m = f.match(new RegExp(`(?:${JAVA_ROOT_ALT})/(.+?)/(controller|aggregator|facade|usecase|orchestrator|service|mapper|dao|dto|entity|repository|adapter)`));
    if (!m) continue;
    countPkgPrefixes(pkgCounts, m[1].split("/"));
  }
  rootPackage = pickRootPackage(pkgCounts);
  // v2.5.3 — keyed by DIRECTORY NAMES straight from the filesystem, so a
  // package legally named `constructor`, `toString` or `valueOf` would
  // otherwise resolve to an inherited Object.prototype member: `if (!map[d])`
  // reads truthy, the entry is never created, and the next line either throws
  // (`domainPaths[d].push is not a function` — an `init` abort, present since
  // v2.4.0) or increments a property on the global `Object`. A null prototype
  // removes the whole class; Object.keys/values/entries and spread are unaffected.
  const domainMap = Object.create(null);
  let detectedPattern = null;

  // v2.5.0 — Flat-layout guard for Pattern B/D and the supplementary scan.
  //
  // In the standard Spring Initializr layout the layer dirs sit DIRECTLY
  // under the root package: `com/example/demo/controller/UserController.java`.
  // The Pattern B glob `**/*/controller/*.java` matched that with `*` =
  // `demo` (the root package's last segment), so every flat project was
  // classified as "Pattern B, single domain named after the package" and
  // Pattern C (domain from class name) was unreachable.
  //
  // Two signals must BOTH hold for a `{d}/{layer}/` path to count as flat:
  //   1. `{d}` is the root package's last segment (the layer dir is a
  //      direct child of the root package), AND
  //   2. none of the `*Controller` class stems under `{d}/controller/`
  //      start with `{d}` — i.e. the classes are named after OTHER things
  //      (`UserController`, `OrderController` under `demo/`).
  // Signal 2 keeps single-domain domain-first projects intact: in
  // `com/example/payment/controller/PaymentController.java` the root
  // package also ends in `payment`, but the controller stem IS `payment`,
  // so it stays Pattern B.
  //
  // Signal 2 looks at EVERY layer class under the base dir (controller,
  // service, mapper, repository, dao, dto), not only controllers: a
  // single-domain project such as `account/{controller/LoginController,
  // service/AccountService, dto/LoginDto}` is domain-first because
  // `AccountService` is named after the package, even though no controller is.
  // A `*Application.java` (Spring Boot main class) sitting DIRECTLY in the base
  // dir is a positive flat signal on its own — Initializr places it there,
  // domain-first projects keep it one level above the domain packages.
  //
  // Base dirs: the root package, plus — for a file inside a Gradle/Maven
  // module — `<rootPkg>/<moduleName>` (`api/src/main/java/com/example/api/
  // controller/`), where the module's own sub-package plays the role of the
  // Initializr base package and the domains again come from class names.
  const rootPkgPath = rootPackage ? rootPackage.replace(/\./g, "/") : null;
  const flatDirCache = new Map();
  const LAYER_CLASS_RE = /^(?:controller|service|mapper|repository|dao|dto)\/([A-Za-z0-9]+?)(?:Controller|Service|Mapper|Repository|Dao|Dto)\.java$/;
  const isFlatBase = (base) => {
    if (!flatDirCache.has(base)) {
      const dirRe = new RegExp(`(^|/)(?:${JAVA_ROOT_ALT})/${escRe(base)}/`);
      const under = [];
      for (const x of javaFiles) {
        const m = x.match(dirRe);
        if (m) under.push(x.slice(m.index + m[0].length));
      }
      const appInBase = under.some(rel => /^[A-Za-z0-9]*Application\.java$/.test(rel));
      const stems = under.map(rel => (rel.match(LAYER_CLASS_RE) || [])[1]).filter(Boolean).map(s => s.toLowerCase());
      const tail = base.split("/").pop().toLowerCase();
      flatDirCache.set(base, appInBase || (stems.length > 0 && !stems.some(s => s.startsWith(tail))));
    }
    return flatDirCache.get(base);
  };
  // Directories (relative to src/main/java) holding a Spring Boot main class
  // (`*Application.java`). The Initializr base package is wherever that class
  // lives, independent of `rootPackage` (which is capped at 4 segments and
  // therefore misses `kr/co/<org>/<proj>/<app>` style base packages).
  const appBases = [...new Set(javaFiles
    .map(f => (f.match(new RegExp(`(?:${JAVA_ROOT_ALT})/(.+)/[A-Za-z0-9]*Application\\.java$`)) || [])[1])
    .filter(Boolean))];
  const isFlatLayerPath = (f, layerSegment) => {
    if (!rootPkgPath && appBases.length === 0) return false;
    const bases = [rootPkgPath, ...appBases].filter(Boolean);
    const pre = modulePrefixes.find(p => p && f.startsWith(p));
    if (pre && rootPkgPath) bases.push(`${rootPkgPath}/${pre.replace(/\/$/, "").split("/").pop()}`);
    for (const base of bases) {
      const layerRe = new RegExp(`(^|/)(?:${JAVA_ROOT_ALT})/${escRe(base)}/${escRe(layerSegment)}/[^/]+\\.java$`);
      if (layerRe.test(f) && isFlatBase(base)) return true;
    }
    return false;
  };

  // Controllers that Pattern B skipped as "flat" (layer dir directly under the
  // base package). If another pattern wins (mixed tree: `demo/controller/
  // HomeController.java` next to `demo/user/controller/UserController.java`),
  // Pattern C never runs, so these are re-attached below by class name —
  // a controller must never silently belong to no domain.
  const flatSkippedControllers = [];

  // v2.5.3 — every controller file that a primary pattern has already
  // counted. The deep-sweep below re-globs `**/{domain}/**/*.java`, which
  // includes the very `{domain}/controller/X.java` files Pattern B just
  // counted; walking up their path meets `controller` and counted them a
  // second time. That only showed when the domain had NOTHING but a
  // controller (any service/dto file made standardCount > 0 and skipped the
  // sweep), so a scaffold-stage domain reported `controllers: 2` for one
  // file. A file is counted once, whoever counts it.
  const countedControllerFiles = new Set();
  const addController = (d, f) => { domainMap[d].controllers++; countedControllerFiles.add(f); };

  // Pattern A: controller/{domain}/*.java (layer-first — domain under controller)
  const controllersA = (await gj("src/main/java/**/controller/*/*.java"));
  for (const f of controllersA) {
    const m = f.match(/controller\/([^/]+)\//);
    if (m) {
      const d = m[1];
      if (!domainMap[d]) domainMap[d] = { controllers: 0, services: 0, mappers: 0, dtos: 0, xmlMappers: 0, pattern: "A" };
      addController(d, f);
    }
  }
  if (Object.keys(domainMap).length > 0) detectedPattern = "A";

  // Pattern B/D: {domain}/controller/*.java (domain-first — controller under domain)
  // D extends B: {module}/{domain}/controller/ — auto-upgrade to module/domain on name conflict
  if (!detectedPattern) {
    const controllersB = (await gj("src/main/java/**/*/controller/*.java"));
    const domainPaths = Object.create(null);
    for (const f of controllersB) {
      if (isFlatLayerPath(f, "controller")) { flatSkippedControllers.push(f); continue; }
      const m = f.match(/\/([^/]+)\/controller\/[^/]+\.java$/);
      if (m) {
        const d = m[1];
        const parentMatch = f.match(/\/([^/]+)\/([^/]+)\/controller\//);
        const parentModule = parentMatch ? parentMatch[1] : null;
        if (!domainPaths[d]) domainPaths[d] = [];
        domainPaths[d].push({ file: f, module: parentModule });
      }
    }

    // If same domain name found in multiple modules, use module/domain form (Pattern D)
    for (const [d, entries] of Object.entries(domainPaths)) {
      const modules = [...new Set(entries.map(e => e.module).filter(Boolean))];
      if (modules.length > 1) {
        // Pattern D: conflict — register as module/domain
        for (const entry of entries) {
          const fullName = entry.module ? `${entry.module}/${d}` : d;
          if (!domainMap[fullName]) domainMap[fullName] = { controllers: 0, services: 0, mappers: 0, dtos: 0, xmlMappers: 0, pattern: "D", modulePath: entry.module, domainName: d };
          addController(fullName, entry.file);
        }
      } else {
        if (!domainMap[d]) domainMap[d] = { controllers: 0, services: 0, mappers: 0, dtos: 0, xmlMappers: 0, pattern: "B" };
        for (const entry of entries) addController(d, entry.file);
      }
    }
    if (Object.keys(domainMap).length > 0) {
      // Determine pattern by majority vote (B vs D)
      const patternCounts = {};
      for (const v of Object.values(domainMap)) patternCounts[v.pattern] = (patternCounts[v.pattern] || 0) + 1;
      detectedPattern = Object.entries(patternCounts).sort((a, b) => b[1] - a[1])[0][0];
    }
  }

  // Pattern E: DDD/Hexagonal — {domain}/adapter/in/web/*.java or {domain}/adapter/in/rest/*.java
  if (!detectedPattern) {
    const controllersE = (await gj("src/main/java/**/adapter/in/{web,rest}/*.java"));
    for (const f of controllersE) {
      const m = f.match(/\/([^/]+)\/adapter\/in\/(web|rest)\/[^/]+\.java$/);
      if (m) {
        const d = m[1];
        if (!domainMap[d]) domainMap[d] = { controllers: 0, services: 0, mappers: 0, dtos: 0, xmlMappers: 0, pattern: "E" };
        addController(d, f);
      }
    }
    if (Object.keys(domainMap).length > 0) detectedPattern = "E";
  }

  // Pattern C: Flat structure — controller/*.java (no domain directory, extract domain from class name)
  if (!detectedPattern) {
    const controllersC = (await gj("src/main/java/**/controller/*.java"));
    for (const f of controllersC) {
      const m = f.match(/\/([A-Z][a-zA-Z]*)Controller\.java$/);
      if (m) {
        const d = m[1].toLowerCase();
        if (!domainMap[d]) domainMap[d] = { controllers: 0, services: 0, mappers: 0, dtos: 0, xmlMappers: 0, pattern: "C" };
        addController(d, f);
      }
    }
    if (Object.keys(domainMap).length > 0) detectedPattern = "C";
  }

  // Mixed tree: Pattern B/D/E claimed the tree, but flat controllers under the
  // base package were skipped. Attach each by class name as a Pattern C
  // domain (`HomeController` → `home`) so it is analyzed and gets rules.
  if (detectedPattern && detectedPattern !== "C") {
    for (const f of flatSkippedControllers) {
      const m = f.match(/\/([A-Z][a-zA-Z]*)Controller\.java$/);
      if (!m) continue;
      const d = m[1].toLowerCase();
      if (!domainMap[d]) domainMap[d] = { controllers: 0, services: 0, mappers: 0, dtos: 0, xmlMappers: 0, pattern: "C" };
      addController(d, f);
    }
  }

  // ── Pattern F: package-by-feature — {domain}/DomainController.java, no layer directory ──
  //
  // v2.5.3 — Until now a domain was REGISTERED only by a layer directory in
  // its path (`controller/`, `service/`, `adapter/in/web/`). The v2.4.0
  // deep-sweep catch-all counts layer-less files, but only for a domain
  // something else has already registered; it cannot register one. So the
  // layout Spring's own "Structuring Your Code" guide recommends —
  //
  //   com/acme/order/OrderController.java
  //   com/acme/order/OrderService.java
  //   com/acme/order/OrderRepository.java
  //
  // — produced zero backend domains, and in a mixed tree the one domain that
  // did have a `controller/` dir survived while the rest silently vanished
  // (confirmed against real trees, not fixtures).
  //
  // This pass runs for EVERY detectedPattern, like the supplementary scan:
  // it only ever adds a domain no earlier pattern claimed, so healthy A–E
  // trees are unchanged. A `*Controller.java` registers its PARENT directory
  // as the domain when that parent is not itself a layer/adapter/skip
  // directory and not a flat base package. Controllers sitting directly in
  // the base package (`com/acme/OrderController.java` next to
  // `Application.java`) are the Initializr single-package demo shape and
  // keep the Pattern C rule: domain from the class name.
  //
  // Counting for an F domain is by class-name suffix over every `.java`
  // directly under the feature directory and its sub-packages — there is no
  // layer directory to read, so the name is the only signal.
  {
    const F_SKIP = new Set([
      "common", "config", "util", "utils", "base", "core", "shared", "global", "framework",
      "infra", "front", "admin", "back", "internal", "external", "web", "app", "test", "tests",
      "main", "generated", "build", "api", "impl", "rest", "in", "out", "adapter", "controller",
      "service", "mapper", "repository", "dao", "dto", "vo", "entity", "aggregator", "facade",
      "usecase", "orchestrator", "handler", "resource", "endpoint",
    ]);
    const allControllers = await gj("src/main/java/**/*Controller.java");
    const fCounts = new Map();
    for (const f of allControllers) {
      if (countedControllerFiles.has(f)) continue;
      const rootM = f.match(new RegExp(`(?:^|/)(?:${JAVA_ROOT_ALT})/(.+)/([^/]+)\\.java$`));
      if (!rootM) continue;
      const relDir = rootM[1];                 // e.g. com/acme/order
      const segs = relDir.split("/");
      const parent = segs[segs.length - 1];    // e.g. order
      if (segs.length < 2) continue;           // a controller at the very root of src/main/java is not a feature
      if (F_SKIP.has(parent) || /^v\d+$/.test(parent) || parent.includes(".")) continue;
      // v2.5.3 — a directory an earlier pattern ALREADY owns wins over the
      // base-package rule below. `rootPkgPath` equals the one feature
      // directory in every single-domain project, so a layer-less
      // `order/OrderFacadeController.java` sitting next to
      // `order/adapter/in/web/` was read as an Initializr demo and became a
      // domain literally named `orderfacade`, splitting one logical domain in
      // two. Attaching it to the domain that already owns the directory is
      // both the smaller change and the right answer.
      const claimed = domainMap[parent];
      if (claimed && claimed.pattern !== "F") {
        // Registered earlier by a layer-dir pattern (e.g. supplementary
        // `{d}/service/`) — attach this layer-less controller to it, once.
        addController(parent, f);
        continue;
      }
      // Flat base package (Initializr demo): domain from class name, Pattern C.
      // The signal is where `*Application.java` actually lives. Accepting
      // `relDir === rootPkgPath` as a second signal misfired on every
      // single-domain project — `rootPackage` is derived from layer markers,
      // and with one domain those markers ARE that domain's directory, so an
      // `order/{dto,internal}` feature read as a base package and lost the
      // files no Pattern C glob reaches.
      if (appBases.includes(relDir)) {
        const cm = rootM[2].match(/^([A-Z][a-zA-Z0-9]*)Controller$/);
        if (!cm) continue;
        const d = cm[1].toLowerCase();
        if (!domainMap[d]) domainMap[d] = { controllers: 0, services: 0, mappers: 0, dtos: 0, xmlMappers: 0, pattern: "C" };
        addController(d, f);
        continue;
      }
      // `claimed` here is either absent or an F domain for this same directory
      // (a second controller in the feature package): register once, count once.
      if (!claimed) {
        domainMap[parent] = { controllers: 0, services: 0, mappers: 0, dtos: 0, xmlMappers: 0, pattern: "F", featureDir: relDir };
        countPkgPrefixes(fCounts, segs.slice(0, -1));
      }
      addController(parent, f);
    }
    if (Object.values(domainMap).some(v => v.pattern === "F")) {
      if (!detectedPattern) detectedPattern = "F";
      if (!rootPackage) rootPackage = pickRootPackage(fCounts);
    }
    // A single-package Initializr demo has no layer marker and no feature
    // directory either; the Spring Boot main class then names the base
    // package on its own.
    if (!rootPackage && appBases.length === 1) rootPackage = appBases[0].replace(/\//g, ".");
  }

  // ── Supplementary scan: detect domains without controllers (service/dao/aggregator/facade/usecase only) ──
  // Runs for ALL detected patterns (A/B/C/D/E) to catch core-only domains
  {
    const serviceDirs = (await gj("src/main/java/**/*/service/*.java"));
    const mapperDirs = (await gj("src/main/java/**/*/{mapper,repository,dao}/*.java"));
    const orchestrationDirs = (await gj("src/main/java/**/*/{aggregator,facade,usecase,orchestrator}/*.java"));
    const allServiceFiles = [...serviceDirs, ...mapperDirs, ...orchestrationDirs];
    const skipDomains = ["common", "config", "util", "utils", "base", "core", "shared", "global", "framework", "infra", "front", "admin", "back", "internal", "external", "web", "app", "test", "tests", "main", "generated", "build"];
    for (const f of allServiceFiles) {
      const m = f.match(/\/([^/]+)\/(service|mapper|repository|dao|aggregator|facade|usecase|orchestrator)\/[^/]+\.java$/);
      if (m && isFlatLayerPath(f, m[2])) continue; // flat layout: layer dir directly under root package
      if (m) {
        const d = m[1];
        if (!domainMap[d] && !skipDomains.includes(d) && !/^v\d+$/.test(d)) {
          // A domain found here HAS a layer directory, so it is counted with
          // the layer-dir globs even when Pattern F owns the tree.
          const suppPattern = detectedPattern && detectedPattern !== "F" ? detectedPattern : "B";
          domainMap[d] = { controllers: 0, services: 0, mappers: 0, dtos: 0, xmlMappers: 0, pattern: suppPattern };
        }
      }
    }
  }

  // Scan service/mapper/dao/aggregator/facade/usecase/dto/xml files for each domain
  for (const d of Object.keys(domainMap)) {
    const p = domainMap[d].pattern;
    const dn = domainMap[d].domainName || d;
    let svcGlob, mprGlob, dtoGlob, aggGlob;

    if (p === "A") {
      svcGlob = `src/main/java/**/service/${d}/*.java`;
      mprGlob = `src/main/java/**/{mapper,repository,dao}/${d}/*.java`;
      dtoGlob = `src/main/java/**/dto/${d}/**/*.java`;
      aggGlob = `src/main/java/**/{aggregator,facade,usecase,orchestrator}/${d}/*.java`;
    } else if (p === "B" || p === "D") {
      svcGlob = `src/main/java/**/${dn}/service/*.java`;
      mprGlob = `src/main/java/**/${dn}/{mapper,repository,dao}/*.java`;
      dtoGlob = `src/main/java/**/${dn}/dto/**/*.java`;
      aggGlob = `src/main/java/**/${dn}/{aggregator,facade,usecase,orchestrator}/*.java`;
    } else if (p === "E") {
      svcGlob = `src/main/java/**/${d}/{application,domain}/**/*.java`;
      mprGlob = `src/main/java/**/${d}/{adapter/out/{persistence,repository},infrastructure}/*.java`;
      dtoGlob = `src/main/java/**/${d}/**/{dto,command,query}/**/*.java`;
      aggGlob = null; // DDD/Hexagonal typically doesn't use aggregator layer
    } else if (p === "F") {
      // v2.5.3 — package-by-feature: no layer directory to glob on. Every
      // `.java` under the feature directory (anchored at the exact path the
      // controller was found in, so a same-named package elsewhere in the
      // tree is not swept in) is classified by class-name suffix. Files
      // already counted as controllers are skipped. XML mappers use the
      // domain-subdirectory convention like B.
      //
      // The glob is recursive on purpose — a feature's own sub-packages
      // (`order/dto/`, `order/internal/`) are its files. But a nested package
      // that holds a controller of its own is a SEPARATE F domain, and counting
      // its files here as well double-counted them: `shop/` + `shop/order/` +
      // `shop/order/pay/` reported 6 files for 4, with the parent's `services`
      // inflated while its `controllers` stayed right (the ledger already
      // covered those). Excluding every file under a deeper F feature directory
      // loses nothing — that domain counts them itself.
      const ownDir = domainMap[d].featureDir;
      const nestedDirs = Object.values(domainMap)
        .filter(v => v.pattern === "F" && v.featureDir && v.featureDir.startsWith(ownDir + "/"))
        .map(v => "/" + v.featureDir + "/");
      const featureFiles = (await gj(`src/main/java/${ownDir}/**/*.java`));
      for (const f of featureFiles) {
        if (countedControllerFiles.has(f)) continue;
        if (nestedDirs.some(nd => f.includes(nd))) continue;
        const stem = path.posix.basename(f, ".java");
        const parentSeg = f.split("/").slice(-2, -1)[0];
        if (/Controller$/.test(stem) || parentSeg === "controller") { addController(d, f); }
        else if (/(Repository|Mapper|Dao)(Impl)?$/.test(stem) || ["mapper", "repository", "dao"].includes(parentSeg)) domainMap[d].mappers++;
        else if (/(Dto|Vo|Entity|Request|Response|Payload|Command|Query)$/.test(stem) || ["dto", "vo", "entity", "model", "request", "response", "payload"].includes(parentSeg)) domainMap[d].dtos++;
        else domainMap[d].services++;
      }
      const xmlF = await gj(`src/main/resources/{mapper,mybatis}/**/${dn}/*.xml`);
      domainMap[d].xmlMappers = xmlF.length;
      const totalF = domainMap[d].services + domainMap[d].mappers + domainMap[d].dtos + domainMap[d].xmlMappers + domainMap[d].controllers;
      const { featureDir: _fd, ...rest } = domainMap[d];
      backendDomains.push({ name: d, type: "backend", ...rest, totalFiles: totalF });
      continue;
    } else {
      // Pattern C: Flat — match domain name from file name
      const cap = d.charAt(0).toUpperCase() + d.slice(1);
      svcGlob = `src/main/java/**/service/${cap}*.java`;
      mprGlob = `src/main/java/**/{mapper,repository,dao}/${cap}*.java`;
      dtoGlob = `src/main/java/**/dto/${cap}*.java`;
      aggGlob = `src/main/java/**/{aggregator,facade,usecase,orchestrator}/${cap}*.java`;
    }
    // Pattern C (flat): XML may be in flat directory without domain subdirectory (e.g., mapper/OrderMapper.xml)
    // Other patterns: XML is in domain subdirectory (e.g., mapper/order/OrderMapper.xml)
    const capDn = dn.charAt(0).toUpperCase() + dn.slice(1);
    const xmlGlob = p === "C"
      ? `src/main/resources/{mapper,mybatis}/**/{${dn}/${capDn}*.xml,${capDn}*.xml}`
      : `src/main/resources/{mapper,mybatis}/**/${dn}/*.xml`;

    const svc = await gj(svcGlob);
    const mpr = await gj(mprGlob);
    const dto = await gj(dtoGlob);
    const xml = await gj(xmlGlob);
    const agg = aggGlob ? await gj(aggGlob) : [];
    domainMap[d].services = svc.length + agg.length;
    domainMap[d].mappers = mpr.length;
    domainMap[d].dtos = dto.length;
    domainMap[d].xmlMappers = xml.length;

    // v2.4.0 — Deep-sweep fallback (Pattern B/D only).
    //
    // Pre-v2.4.0: standard globs assume `{domain}/{layer}/X.java`. This
    // misses two non-canonical layouts:
    //   (a) Multi-module split: `front/{domain}/{layer}/` for HTTP
    //       layer + `core/{domain}/{layer}/` for service/dao layer.
    //       Standard glob `**/{domain}/{layer}/` actually matches BOTH
    //       via the leading `**`, so this case generally works.
    //   (b) Cross-domain coupling: `core/{otherDomain}/{layer}/{domain}/`
    //       — services for `{domain}` living under a different module's
    //       layer directory (the layer dir comes BEFORE the domain dir).
    //       Standard glob `**/{domain}/{layer}/*.java` does NOT match
    //       this layout.
    //
    // When standard globs return zero files for a Pattern B/D domain
    // that is registered in domainMap (so it does exist), fall back to
    // a deep sweep: `**/${dn}/**/*.java` finds every .java file under
    // ANY directory named ${dn}. We then classify each file by walking
    // up its path to find the nearest layer dir, which catches both
    // `${dn}/{layer}/` AND `{layer}/${dn}/` placements.
    //
    // Restricting to Pattern B/D and to the zero-files case keeps the
    // legacy behavior identical for projects whose standard globs
    // already cover everything, and prevents over-counting for
    // domains with healthy direct-layout file counts.
    const standardCount = svc.length + agg.length + mpr.length + dto.length + xml.length;
    if (standardCount === 0 && (p === "B" || p === "D")) {
      const deepFiles = (await gj(`src/main/java/**/${dn}/**/*.java`));
      // v2.4.0 — extended layer recognition. Enterprise codebases
      // commonly include implementation/support layers beyond the canonical
      // controller/service/mapper/dto trio. Files in `factory/`, `strategy/`,
      // `impl/`, `helper/`, etc. were previously dropped by deep-sweep
      // (no `break`), causing domains with non-standard layer names to
      // report 0 totalFiles. The recognized list is augmented and a
      // catch-all classifies any remaining `.java` file under the domain
      // tree as a service (the most generic backend layer).
      const SVC_LAYERS = ["aggregator", "facade", "usecase", "orchestrator", "service",
                          "factory", "strategy", "impl", "helper", "support",
                          "client", "provider", "manager", "handler", "interceptor",
                          "filter", "listener", "task", "scheduler", "command", "query",
                          "validator", "converter", "translator", "resolver"];
      const DAO_LAYERS = ["mapper", "repository", "dao"];
      const DTO_LAYERS = ["dto", "vo", "entity", "model", "request", "response", "payload"];
      for (const f of deepFiles) {
        if (countedControllerFiles.has(f)) continue; // v2.5.3 — already counted by a primary pattern
        const parts = f.split("/");
        let classified = false;
        for (let i = parts.length - 2; i >= 0; i--) {
          const seg = parts[i];
          if (seg === "controller") { domainMap[d].controllers++; classified = true; break; }
          if (SVC_LAYERS.includes(seg)) { domainMap[d].services++; classified = true; break; }
          if (DAO_LAYERS.includes(seg)) { domainMap[d].mappers++; classified = true; break; }
          if (DTO_LAYERS.includes(seg)) { domainMap[d].dtos++; classified = true; break; }
        }
        // Fallback: any unclassified .java file under the domain tree is
        // counted as a service. This catches layouts like
        // `core/${dn}/X.java` (no layer subdir) and prevents legitimate
        // backend domains from reporting 0 totalFiles when their files
        // happen to live under unrecognized parent directories.
        if (!classified) domainMap[d].services++;
      }
    }

    const totalFiles = domainMap[d].services + domainMap[d].mappers + domainMap[d].dtos + domainMap[d].xmlMappers + domainMap[d].controllers;
    backendDomains.push({ name: d, type: "backend", ...domainMap[d], totalFiles });
  }

  // ── Java fallback: extract domains directly from all .java files when glob returns 0 ──
  if (backendDomains.length === 0) {
    const allJava = (await glob("**/*.java", { cwd: ROOT, ignore: ["**/node_modules/**", "**/build/**", "**/target/**", "**/test/**", "**/generated/**"] })).map(norm);
    const javaDomains = Object.create(null);
    const skipNames = ["common", "config", "util", "utils", "base", "shared", "global", "framework", "infra", "api", "main", "front", "admin", "back", "internal", "external", "web", "app", "test", "tests", "generated", "build"];
    const versionPattern = /^v\d+$/;
    const layerNames = ["controller", "aggregator", "facade", "usecase", "orchestrator", "service", "mapper", "repository", "dao", "dto", "vo", "entity", "adapter"];

    for (const f of allJava) {
      const parts = f.replace(/\\/g, "/").split("/");
      for (let i = 0; i < parts.length - 1; i++) {
        if (layerNames.includes(parts[i])) {
          const prevDir = parts[i - 1];
          const nextDir = parts[i + 1];

          // {domain}/layer/ pattern (domain before layer)
          if (i > 0 && !skipNames.includes(prevDir) && !layerNames.includes(prevDir) && !prevDir.includes(".") && !versionPattern.test(prevDir)) {
            if (!javaDomains[prevDir]) javaDomains[prevDir] = { controllers: 0, services: 0, mappers: 0, dtos: 0, xmlMappers: 0, pattern: "B" };
            if (parts[i] === "controller") javaDomains[prevDir].controllers++;
            else if (["aggregator", "facade", "usecase", "orchestrator", "service"].includes(parts[i])) javaDomains[prevDir].services++;
            else if (["mapper", "repository", "dao"].includes(parts[i])) javaDomains[prevDir].mappers++;
            else if (["dto", "vo"].includes(parts[i])) javaDomains[prevDir].dtos++;
          }
          // layer/{domain}/ pattern (layer before domain)
          if (nextDir && !nextDir.endsWith(".java") && !skipNames.includes(nextDir) && !layerNames.includes(nextDir) && !versionPattern.test(nextDir)) {
            if (!javaDomains[nextDir]) javaDomains[nextDir] = { controllers: 0, services: 0, mappers: 0, dtos: 0, xmlMappers: 0, pattern: "A" };
            if (parts[i] === "controller") javaDomains[nextDir].controllers++;
            else if (["aggregator", "facade", "usecase", "orchestrator", "service"].includes(parts[i])) javaDomains[nextDir].services++;
            else if (["mapper", "repository", "dao"].includes(parts[i])) javaDomains[nextDir].mappers++;
            else if (["dto", "vo"].includes(parts[i])) javaDomains[nextDir].dtos++;
          }
          break;
        }
      }
    }

    for (const [d, data] of Object.entries(javaDomains)) {
      const total = data.controllers + data.services + data.mappers + data.dtos;
      if (total > 0) {
        backendDomains.push({ name: d, type: "backend", ...data, totalFiles: total });
      }
    }
  }

  return { backendDomains, rootPackage };
}

module.exports = { scanJavaDomains };
