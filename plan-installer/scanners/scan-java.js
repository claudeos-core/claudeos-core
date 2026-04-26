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
 * Also includes supplementary service-only scan (all patterns) and full fallback.
 */

const path = require("path");
const { glob } = require("glob");

// Normalize backslash paths from glob on Windows to forward slashes
const norm = (p) => p.replace(/\\/g, "/");

async function scanJavaDomains(stack, ROOT) {
  const backendDomains = [];
  let rootPackage = null;

  const javaFiles = (await glob("src/main/java/**/*.java", { cwd: ROOT })).map(norm);

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
  const pkgCounts = new Map();
  for (const f of javaFiles) {
    const m = f.match(/src\/main\/java\/(.+?)\/(controller|aggregator|facade|usecase|orchestrator|service|mapper|dao|dto|entity|repository|adapter)/);
    if (!m) continue;
    const segs = m[1].split("/");
    for (let len = Math.min(4, segs.length); len >= 1; len--) {
      const prefix = segs.slice(0, len).join(".");
      pkgCounts.set(prefix, (pkgCounts.get(prefix) || 0) + 1);
    }
  }
  if (pkgCounts.size > 0) {
    const maxCount = Math.max(...pkgCounts.values());
    const threshold = Math.ceil(maxCount * 0.8);
    const candidates = [...pkgCounts.entries()].filter(([_, c]) => c >= threshold);
    // Among candidates, pick the longest prefix (most specific root that
    // still covers the majority of files). Tie-break on length DESC.
    candidates.sort((a, b) => b[0].length - a[0].length);
    rootPackage = candidates[0][0];
  }
  const domainMap = {};
  let detectedPattern = null;

  // Pattern A: controller/{domain}/*.java (layer-first — domain under controller)
  const controllersA = (await glob("src/main/java/**/controller/*/*.java", { cwd: ROOT })).map(norm);
  for (const f of controllersA) {
    const m = f.match(/controller\/([^/]+)\//);
    if (m) {
      const d = m[1];
      if (!domainMap[d]) domainMap[d] = { controllers: 0, services: 0, mappers: 0, dtos: 0, xmlMappers: 0, pattern: "A" };
      domainMap[d].controllers++;
    }
  }
  if (Object.keys(domainMap).length > 0) detectedPattern = "A";

  // Pattern B/D: {domain}/controller/*.java (domain-first — controller under domain)
  // D extends B: {module}/{domain}/controller/ — auto-upgrade to module/domain on name conflict
  if (!detectedPattern) {
    const controllersB = (await glob("src/main/java/**/*/controller/*.java", { cwd: ROOT })).map(norm);
    const domainPaths = {};
    for (const f of controllersB) {
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
          domainMap[fullName].controllers++;
        }
      } else {
        if (!domainMap[d]) domainMap[d] = { controllers: 0, services: 0, mappers: 0, dtos: 0, xmlMappers: 0, pattern: "B" };
        domainMap[d].controllers += entries.length;
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
    const controllersE = (await glob("src/main/java/**/adapter/in/{web,rest}/*.java", { cwd: ROOT })).map(norm);
    for (const f of controllersE) {
      const m = f.match(/\/([^/]+)\/adapter\/in\/(web|rest)\/[^/]+\.java$/);
      if (m) {
        const d = m[1];
        if (!domainMap[d]) domainMap[d] = { controllers: 0, services: 0, mappers: 0, dtos: 0, xmlMappers: 0, pattern: "E" };
        domainMap[d].controllers++;
      }
    }
    if (Object.keys(domainMap).length > 0) detectedPattern = "E";
  }

  // Pattern C: Flat structure — controller/*.java (no domain directory, extract domain from class name)
  if (!detectedPattern) {
    const controllersC = (await glob("src/main/java/**/controller/*.java", { cwd: ROOT })).map(norm);
    for (const f of controllersC) {
      const m = f.match(/\/([A-Z][a-zA-Z]*)Controller\.java$/);
      if (m) {
        const d = m[1].toLowerCase();
        if (!domainMap[d]) domainMap[d] = { controllers: 0, services: 0, mappers: 0, dtos: 0, xmlMappers: 0, pattern: "C" };
        domainMap[d].controllers++;
      }
    }
    if (Object.keys(domainMap).length > 0) detectedPattern = "C";
  }

  // ── Supplementary scan: detect domains without controllers (service/dao/aggregator/facade/usecase only) ──
  // Runs for ALL detected patterns (A/B/C/D/E) to catch core-only domains
  {
    const serviceDirs = (await glob("src/main/java/**/*/service/*.java", { cwd: ROOT })).map(norm);
    const mapperDirs = (await glob("src/main/java/**/*/{mapper,repository,dao}/*.java", { cwd: ROOT })).map(norm);
    const orchestrationDirs = (await glob("src/main/java/**/*/{aggregator,facade,usecase,orchestrator}/*.java", { cwd: ROOT })).map(norm);
    const allServiceFiles = [...serviceDirs, ...mapperDirs, ...orchestrationDirs];
    const skipDomains = ["common", "config", "util", "utils", "base", "core", "shared", "global", "framework", "infra", "front", "admin", "back", "internal", "external", "web", "app", "test", "tests", "main", "generated", "build"];
    for (const f of allServiceFiles) {
      const m = f.match(/\/([^/]+)\/(service|mapper|repository|dao|aggregator|facade|usecase|orchestrator)\/[^/]+\.java$/);
      if (m) {
        const d = m[1];
        if (!domainMap[d] && !skipDomains.includes(d) && !/^v\d+$/.test(d)) {
          domainMap[d] = { controllers: 0, services: 0, mappers: 0, dtos: 0, xmlMappers: 0, pattern: detectedPattern || "B" };
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

    const svc = await glob(svcGlob, { cwd: ROOT });
    const mpr = await glob(mprGlob, { cwd: ROOT });
    const dto = await glob(dtoGlob, { cwd: ROOT });
    const xml = await glob(xmlGlob, { cwd: ROOT });
    const agg = aggGlob ? await glob(aggGlob, { cwd: ROOT }) : [];
    domainMap[d].services = svc.length + agg.length;
    domainMap[d].mappers = mpr.length;
    domainMap[d].dtos = dto.length;
    domainMap[d].xmlMappers = xml.length;

    // v2.4.0 — Deep-sweep fallback (Pattern B/D only).
    //
    // Pre-v2.4.0: standard globs assume `{domain}/{layer}/X.java`. This
    // misses two real-world layouts:
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
      const deepFiles = (await glob(`src/main/java/**/${dn}/**/*.java`, { cwd: ROOT })).map(norm);
      // v2.4.0 — extended layer recognition. Real-world enterprise codebases
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
    const javaDomains = {};
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
