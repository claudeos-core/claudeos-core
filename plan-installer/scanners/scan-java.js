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

async function scanJavaDomains(stack, ROOT) {
  const backendDomains = [];
  let rootPackage = null;

  const javaFiles = await glob("src/main/java/**/*.java", { cwd: ROOT });
  for (const f of javaFiles) {
    const m = f.match(/src\/main\/java\/(.+?)\/(controller|aggregator|service|mapper|dao|dto|entity|repository|adapter)/);
    if (m) { rootPackage = m[1].replace(/\//g, "."); break; }
  }
  const domainMap = {};
  let detectedPattern = null;

  // Pattern A: controller/{domain}/*.java (layer-first — domain under controller)
  const controllersA = await glob("src/main/java/**/controller/*/*.java", { cwd: ROOT });
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
    const controllersB = await glob("src/main/java/**/*/controller/*.java", { cwd: ROOT });
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
    if (Object.keys(domainMap).length > 0) detectedPattern = domainMap[Object.keys(domainMap)[0]].pattern;
  }

  // Pattern E: DDD/Hexagonal — {domain}/adapter/in/web/*.java or {domain}/adapter/in/rest/*.java
  if (!detectedPattern) {
    const controllersE = await glob("src/main/java/**/adapter/in/{web,rest}/*.java", { cwd: ROOT });
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
    const controllersC = await glob("src/main/java/**/controller/*.java", { cwd: ROOT });
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

  // ── Supplementary scan: detect domains without controllers (service/dao/aggregator only) ──
  // Runs for ALL detected patterns (A/B/C/D/E) to catch core-only domains
  {
    const serviceDirs = await glob("src/main/java/**/*/service/*.java", { cwd: ROOT });
    const mapperDirs = await glob("src/main/java/**/*/{mapper,repository,dao}/*.java", { cwd: ROOT });
    const aggregatorDirs = await glob("src/main/java/**/*/aggregator/*.java", { cwd: ROOT });
    const allServiceFiles = [...serviceDirs, ...mapperDirs, ...aggregatorDirs];
    const skipDomains = ["common", "config", "util", "utils", "base", "core", "shared", "global", "framework", "infra", "front", "admin", "back", "internal", "external", "web", "app", "test", "tests", "main", "generated", "build"];
    for (const f of allServiceFiles) {
      const m = f.match(/\/([^/]+)\/(service|mapper|repository|dao|aggregator)\/[^/]+\.java$/);
      if (m) {
        const d = m[1];
        if (!domainMap[d] && !skipDomains.includes(d) && !/^v\d+$/.test(d)) {
          domainMap[d] = { controllers: 0, services: 0, mappers: 0, dtos: 0, xmlMappers: 0, pattern: detectedPattern || "B" };
        }
      }
    }
  }

  // Scan service/mapper/dao/aggregator/dto/xml files for each domain
  for (const d of Object.keys(domainMap)) {
    const p = domainMap[d].pattern;
    const dn = domainMap[d].domainName || d;
    let svcGlob, mprGlob, dtoGlob, aggGlob;

    if (p === "A") {
      svcGlob = `src/main/java/**/service/${d}/*.java`;
      mprGlob = `src/main/java/**/{mapper,repository,dao}/${d}/*.java`;
      dtoGlob = `src/main/java/**/dto/${d}/**/*.java`;
      aggGlob = `src/main/java/**/aggregator/${d}/*.java`;
    } else if (p === "B" || p === "D") {
      svcGlob = `src/main/java/**/${dn}/service/*.java`;
      mprGlob = `src/main/java/**/${dn}/{mapper,repository,dao}/*.java`;
      dtoGlob = `src/main/java/**/${dn}/dto/**/*.java`;
      aggGlob = `src/main/java/**/${dn}/aggregator/*.java`;
    } else if (p === "E") {
      svcGlob = `src/main/java/**/${d}/{application,domain}/**/*.java`;
      mprGlob = `src/main/java/**/${d}/adapter/out/{persistence,repository}/*.java`;
      dtoGlob = `src/main/java/**/${d}/**/{dto,command,query}/**/*.java`;
      aggGlob = null; // DDD/Hexagonal typically doesn't use aggregator layer
    } else {
      // Pattern C: Flat — match domain name from file name
      const cap = d.charAt(0).toUpperCase() + d.slice(1);
      svcGlob = `src/main/java/**/service/${cap}*.java`;
      mprGlob = `src/main/java/**/{mapper,repository,dao}/${cap}*.java`;
      dtoGlob = `src/main/java/**/dto/${cap}*.java`;
      aggGlob = `src/main/java/**/aggregator/${cap}*.java`;
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
    const totalFiles = svc.length + agg.length + mpr.length + dto.length + xml.length + domainMap[d].controllers;
    backendDomains.push({ name: d, type: "backend", ...domainMap[d], totalFiles });
  }

  // ── Java fallback: extract domains directly from all .java files when glob returns 0 ──
  if (backendDomains.length === 0) {
    const allJava = await glob("**/*.java", { cwd: ROOT, ignore: ["**/node_modules/**", "**/build/**", "**/target/**", "**/test/**", "**/generated/**"] });
    const javaDomains = {};
    const skipNames = ["common", "config", "util", "utils", "base", "shared", "global", "framework", "infra", "api", "main", "front", "admin", "back", "internal", "external", "web", "app", "test", "tests", "generated", "build"];
    const versionPattern = /^v\d+$/;
    const layerNames = ["controller", "aggregator", "service", "mapper", "repository", "dao", "dto", "vo", "entity", "adapter"];

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
            else if (parts[i] === "aggregator" || parts[i] === "service") javaDomains[prevDir].services++;
            else if (["mapper", "repository", "dao"].includes(parts[i])) javaDomains[prevDir].mappers++;
            else if (["dto", "vo"].includes(parts[i])) javaDomains[prevDir].dtos++;
          }
          // layer/{domain}/ pattern (layer before domain)
          if (nextDir && !nextDir.endsWith(".java") && !skipNames.includes(nextDir) && !layerNames.includes(nextDir) && !versionPattern.test(nextDir)) {
            if (!javaDomains[nextDir]) javaDomains[nextDir] = { controllers: 0, services: 0, mappers: 0, dtos: 0, xmlMappers: 0, pattern: "A" };
            if (parts[i] === "controller") javaDomains[nextDir].controllers++;
            else if (parts[i] === "aggregator" || parts[i] === "service") javaDomains[nextDir].services++;
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
