/**
 * ClaudeOS-Core — Kotlin Structure Scanner
 *
 * Scans Kotlin project directory structure to discover backend domains.
 * Supports multi-module monorepos, CQRS architecture, and shared query resolution.
 * Also includes single-module fallback for non-monorepo Kotlin projects.
 */

const path = require("path");
const { glob } = require("glob");

// Normalize backslash paths from glob on Windows to forward slashes
const norm = (p) => p.replace(/\\/g, "/");

async function scanKotlinDomains(stack, ROOT) {
  const backendDomains = [];
  let rootPackage = null;

  // Scan all .kt files across all submodules
  const ktFiles = (await glob("**/src/main/kotlin/**/*.kt", {
    cwd: ROOT,
    ignore: ["**/node_modules/**", "**/build/**", "**/test/**", "**/generated/**"],
  })).map(norm);

  // Detect root package from first controller/service file
  for (const f of ktFiles) {
    const m = f.match(/src\/main\/kotlin\/(.+?)\/(controller|service|mapper|dto|entity|repository|adapter)/);
    if (m) { rootPackage = m[1].replace(/\//g, "."); break; }
  }

  // Detect modules from directory structure (servers/*/ or direct submodules)
  const moduleGlobs = [
    "servers/*/*/src/main/kotlin/",     // servers/command/reservation-command-server/
    "servers/*/src/main/kotlin/",        // servers/iam-server/
    "*/src/main/kotlin/",                // shared-lib/ or integration-lib/
  ];
  const moduleSet = {};
  for (const mg of moduleGlobs) {
    const moduleDirs = (await glob(mg, { cwd: ROOT })).map(norm);
    for (const md of moduleDirs) {
      const parts = md.replace(/\/src\/main\/kotlin\/?$/, "").split("/");
      const moduleName = parts[parts.length - 1]; // e.g., "reservation-command-server"
      if (moduleSet[moduleName]) {
        // Name conflict: upgrade first entry to full key too
        if (!moduleName.includes("__")) {
          const existingPath = moduleSet[moduleName];
          const existingFullKey = existingPath.replace(/\/src\/main\/kotlin\/?$/, "").replace(/\//g, "__");
          moduleSet[existingFullKey] = existingPath;
          delete moduleSet[moduleName];
        }
        const fullKey = md.replace(/\/src\/main\/kotlin\/?$/, "").replace(/\//g, "__");
        moduleSet[fullKey] = md;
      } else {
        moduleSet[moduleName] = md;
      }
    }
  }

  // Categorize modules and extract domains
  const skipModules = ["build", "gradle", "buildSrc", ".gradle", "node_modules"];
  const serverTypes = { command: "command", query: "query", bff: "bff", integration: "integration" };
  const domainMap = {};

  for (const [moduleName, modulePath] of Object.entries(moduleSet)) {
    // Full key (e.g., "servers__command__reservation-command-server") → extract actual module name
    const actualModuleName = moduleName.includes("__")
      ? moduleName.split("__").pop()
      : moduleName;

    if (skipModules.some(s => actualModuleName.includes(s))) continue;

    // Determine server type from module name
    let serverType = "standalone";
    for (const [key, val] of Object.entries(serverTypes)) {
      if (actualModuleName.includes(key)) { serverType = val; break; }
    }

    // Extract domain name from module name
    let domainName = actualModuleName
      .replace(/-(?:command|query|bff|integration|adapter)-server$/, "")
      .replace(/-server$/, "");

    // Guard: if domain extraction resulted in a generic name that is likely a shared module
    const genericNames = ["common", "shared", "base", "core", "global", "internal"];
    if (genericNames.includes(domainName) && serverType !== "standalone") {
      domainName = `${domainName}-${serverType}`;
    }

    // Scan files in this module (append "/" to prevent prefix overlap)
    const modulePrefix = modulePath.replace(/\/?$/, "").replace(/\/src\/main\/kotlin$/, "") + "/";
    const moduleKtFiles = ktFiles.filter(f => f.startsWith(modulePrefix) || f === modulePrefix.slice(0, -1));
    const controllers = moduleKtFiles.filter(f => /controller/i.test(f)).length;
    const services = moduleKtFiles.filter(f => /service/i.test(f)).length;
    const repositories = moduleKtFiles.filter(f => /repository|mapper/i.test(f)).length;
    const dtos = moduleKtFiles.filter(f => /dto|vo|request|response|model/i.test(f) && !/repository|service|controller/i.test(f)).length;
    const totalFiles = moduleKtFiles.length;

    if (totalFiles === 0) continue;

    const key = `${domainName}:${serverType}`;
    if (domainMap[key]) {
      // Merge into existing entry (e.g., same domain+type from collided module names)
      domainMap[key].moduleNames.push(moduleName);
      domainMap[key].controllers += controllers;
      domainMap[key].services += services;
      domainMap[key].repositories += repositories;
      domainMap[key].dtos += dtos;
      domainMap[key].totalFiles += totalFiles;
    } else {
      domainMap[key] = {
        name: domainName,
        moduleNames: [moduleName],
        modulePath,
        serverType,
        controllers,
        services,
        repositories,
        dtos,
        totalFiles,
      };
    }
  }

  // Group by domain: merge command/query/bff of same domain
  const domainGroups = {};
  for (const [key, info] of Object.entries(domainMap)) {
    const { name } = info;
    if (!domainGroups[name]) {
      domainGroups[name] = { name, type: "backend", modules: [], controllers: 0, services: 0, repositories: 0, dtos: 0, totalFiles: 0, serverTypes: [] };
    }
    const dg = domainGroups[name];
    dg.modules.push(...info.moduleNames);
    dg.controllers += info.controllers;
    dg.services += info.services;
    dg.repositories += info.repositories;
    dg.dtos += info.dtos;
    dg.totalFiles += info.totalFiles;
    if (!dg.serverTypes.includes(info.serverType)) dg.serverTypes.push(info.serverType);
  }

  // Push to backendDomains
  for (const dg of Object.values(domainGroups)) {
    backendDomains.push({
      name: dg.name,
      type: "backend",
      controllers: dg.controllers,
      services: dg.services,
      mappers: dg.repositories,
      dtos: dg.dtos,
      totalFiles: dg.totalFiles,
      modules: dg.modules,
      serverTypes: dg.serverTypes,
      pattern: "kotlin-multimodule",
    });
  }

  // Also scan shared libraries as special domains
  const libDirs = (await glob("{shared-lib,integration-lib,*-lib}/src/main/kotlin/", { cwd: ROOT })).map(norm);
  for (const ld of libDirs) {
    const libName = ld.split("/")[0];
    if (domainGroups[libName]) continue; // Already captured
    const libFiles = ktFiles.filter(f => f.startsWith(libName + "/"));
    if (libFiles.length > 0) {
      backendDomains.push({
        name: libName,
        type: "backend",
        controllers: 0,
        services: libFiles.filter(f => /service/i.test(f)).length,
        mappers: 0,
        dtos: libFiles.filter(f => /dto|vo|model/i.test(f)).length,
        totalFiles: libFiles.length,
        modules: [libName],
        serverTypes: ["library"],
        pattern: "kotlin-library",
      });
    }
  }

  // Resolve shared query modules: redistribute internal domains to actual domain entries
  resolveSharedQueryDomains(backendDomains, ktFiles);

  // ── Kotlin single-module fallback (no multi-module structure detected) ──
  if (backendDomains.length === 0 && ktFiles.length > 0) {
    const ktDomains = {};
    const skipNames = ["common", "config", "util", "utils", "base", "shared", "global", "framework", "infra", "main", "generated", "build"];
    const layerKw = ["controller", "service", "repository", "mapper", "dao", "dto", "vo", "entity", "aggregate", "adapter"];
    const handledByLayerDir = new Set();
    for (const f of ktFiles) {
      const parts = f.replace(/\\/g, "/").split("/");
      for (let i = 0; i < parts.length - 1; i++) {
        if (layerKw.includes(parts[i].toLowerCase())) {
          handledByLayerDir.add(f);
          // domain/layer/ pattern
          if (i > 0) {
            const d = parts[i - 1].toLowerCase();
            if (!skipNames.includes(d) && !layerKw.includes(d) && d.length > 1 && d !== "kotlin") {
              if (!ktDomains[d]) ktDomains[d] = { controllers: 0, services: 0, mappers: 0, dtos: 0, totalFiles: 0 };
              if (parts[i] === "controller") ktDomains[d].controllers++;
              else if (parts[i] === "service") ktDomains[d].services++;
              else if (["repository", "mapper", "dao"].includes(parts[i])) ktDomains[d].mappers++;
              else if (["dto", "vo", "entity"].includes(parts[i])) ktDomains[d].dtos++;
              ktDomains[d].totalFiles++;
            }
          }
          break;
        }
      }
    }
    // v2.5.0 — Package-by-feature without layer sub-directories:
    //   com/acme/user/UserController.kt, com/acme/user/UserService.kt
    // (the idiomatic Kotlin/Spring layout — no controller/ or service/ folder).
    // The loop above needs a layer folder name in the path; before v2.5.0 a
    // project with none aborted `init` with "invalid totalGroups: 0".
    // Derive the domain from the directory that directly holds layer-suffixed
    // classes; if that directory is the root package itself (flat), use the
    // class-name stem instead (UserController → user).
    //
    // Runs for every file the layer-dir loop did NOT handle, so a MIXED layout
    // (`user/controller/UserController.kt` + `order/OrderController.kt`) keeps
    // both domains. In that mixed case only feature packages (parent named
    // after its classes) are accepted; the class-name-stem fallback is reserved
    // for projects with no layer dirs at all, so a stray `SomeHandler.kt` in
    // the root package never becomes a domain of an otherwise structured tree.
    {
      // The layer-dir loop registers a domain named after the ROOT package
      // whenever a layer folder (dto/, vo/, entity/…) sits directly under it
      // (`com/acme/dto/UserDto.kt` → "acme"). That is a flat-root artifact,
      // not a feature: it must neither switch this fallback into strict mode
      // nor survive next to real domains.
      // "Root" here is the longest package prefix shared by ALL .kt files
      // (`rootPackage` above stops at the first layer dir and may include a
      // domain segment, so it cannot be used for this). The artifact is the
      // entry named after that root tail that carries no controllers and no
      // services — only dto/mapper counts.
      const pkgDirs = ktFiles.map(f => (f.match(/src\/main\/kotlin\/(.+)\/[^/]+\.kt$/) || [])[1]).filter(Boolean).map(d => d.split("/"));
      let common = pkgDirs.length ? pkgDirs[0].slice() : [];
      for (const d of pkgDirs) { let i = 0; while (i < common.length && i < d.length && common[i] === d[i]) i++; common = common.slice(0, i); }
      const rootTail = common.length ? common[common.length - 1].toLowerCase() : null;
      const isFlatRootArtifact = (d) => d === rootTail && ktDomains[d] && ktDomains[d].controllers === 0 && ktDomains[d].services === 0;
      const strict = Object.keys(ktDomains).some(d => !isFlatRootArtifact(d));
      const suffixRe = /([A-Za-z0-9]+?)(Controller|Service|Repository|Handler|UseCase|Mapper|Dao|Router|Resource)\.kt$/;
      const bucket = (m) => (m === "Controller" || m === "Router" || m === "Resource") ? "controllers"
        : (m === "Service" || m === "Handler" || m === "UseCase") ? "services" : "mappers";
      // Group layer-suffixed classes by the directory that directly holds them.
      const byParent = {};
      for (const f of ktFiles) {
        if (handledByLayerDir.has(f)) continue;
        const m = f.match(suffixRe);
        if (!m) continue;
        const parts = f.split("/");
        const parent = parts.length >= 2 ? parts[parts.length - 2].toLowerCase() : "";
        (byParent[parent] = byParent[parent] || []).push({ stem: m[1], kind: m[2] });
      }
      const add = (d, kind) => {
        if (!ktDomains[d]) ktDomains[d] = { controllers: 0, services: 0, mappers: 0, dtos: 0, totalFiles: 0 };
        ktDomains[d][bucket(kind)]++;
        ktDomains[d].totalFiles++;
      };
      for (const [parent, files] of Object.entries(byParent)) {
        // A feature package is one whose classes are named after it (user/UserController.kt).
        // Otherwise the directory is a flat root/app package (app/UserController.kt,
        // app/OrderController.kt) and each class-name stem is its own domain.
        const stems = files.map(x => x.stem.toLowerCase());
        const featurePkg = parent.length > 1 && !skipNames.includes(parent) && !layerKw.includes(parent)
          && parent !== "kotlin" && parent !== "app" && stems.some(st => st.startsWith(parent.replace(/-/g, "")));
        if (strict && !featurePkg) continue;
        for (const x of files) {
          const d = featurePkg ? parent : x.stem.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
          if (d.length > 1 && !skipNames.includes(d)) add(d, x.kind);
        }
      }
      if (rootTail && isFlatRootArtifact(rootTail) && Object.keys(ktDomains).length > 1) delete ktDomains[rootTail];
    }
    for (const [d, data] of Object.entries(ktDomains)) {
      if (data.totalFiles > 0) backendDomains.push({ name: d, type: "backend", ...data, pattern: "kotlin-single" });
    }
  }

  return { backendDomains, rootPackage };
}

// ─── Resolve shared query modules ────────────────────────────────
// When a shared query module (e.g., common-query-server) contains controllers/services
// for multiple domains, extract the actual domains and merge them into existing entries.
// Supports two extraction patterns:
//   A) Package-based: .../kotlin/com/company/.../DOMAIN/controller/XxxController.kt
//   B) Class-name-based: .../controller/ReservationQueryController.kt → "reservation"
// Safety: if no shared modules are found, this function does nothing (no-op).

function resolveSharedQueryDomains(backendDomains, ktFiles) {
  const genericNames = ["common", "shared", "base", "core", "global"];
  const layerNames = new Set([
    "controller", "service", "repository", "mapper", "api", "handler",
    "dto", "model", "entity", "config", "configuration", "util", "utils",
    "infra", "infrastructure", "framework", "common", "shared", "base",
    "core", "global", "internal", "external", "exception", "interceptor",
    "filter", "converter", "event", "listener", "client", "feign",
    "adapter", "port", "domain", "application", "presentation",
    "persistence", "web", "rest", "grpc", "query", "command",
    "aggregate", "aggregator", "vo", "valueobject",
  ]);
  const skipPackages = new Set([
    "com", "org", "net", "io", "kr", "jp", "cn", "de", "fr", "uk", "us",
    "dev", "app", "main", "server", "backend", "project", "kotlin",
  ]);
  const classSuffixes = new Set([
    "Controller", "Service", "Repository", "Mapper", "Handler", "Api",
    "Query", "Command", "Read", "Write", "Get", "Find", "List", "Search",
    "Admin", "Dto", "Request", "Response", "Entity", "Model", "Impl",
    "Factory", "Builder", "Adapter", "Client", "Facade", "Provider",
  ]);

  // Find shared modules: generic name + query server type
  const sharedModules = backendDomains.filter(d =>
    d.pattern === "kotlin-multimodule" &&
    d.serverTypes && d.serverTypes.includes("query") &&
    genericNames.some(g => d.name.startsWith(g))
  );
  if (sharedModules.length === 0) return;

  // Existing domain names for Pattern B-1 matching (longest-first for greedy match)
  const existingDomains = backendDomains
    .filter(d => !sharedModules.includes(d) && d.pattern === "kotlin-multimodule")
    .map(d => d.name)
    .sort((a, b) => b.length - a.length);

  for (const shared of sharedModules) {
    const moduleNames = shared.modules || [];
    const sharedKtFiles = ktFiles.filter(f =>
      moduleNames.some(m => {
        const p = m.includes("__") ? m.replace(/__/g, "/") : m;
        return f.includes(`/${p}/`) || f.startsWith(`${p}/`);
      })
    );
    if (sharedKtFiles.length === 0) continue;

    const domainFileMap = {}; // { domainName: [filePaths] }

    for (const filePath of sharedKtFiles) {
      let domain = null;
      const parts = filePath.replace(/\\/g, "/").split("/");

      // ── Pattern A: Package-based ──
      const kotlinIdx = parts.findIndex(p => p === "kotlin");
      if (kotlinIdx >= 0) {
        for (let i = kotlinIdx + 1; i < parts.length - 1; i++) {
          if (layerNames.has(parts[i].toLowerCase())) {
            if (i - 1 > kotlinIdx) {
              const candidate = parts[i - 1].toLowerCase();
              const depth = (i - 1) - kotlinIdx;
              if (
                depth >= 3 &&
                !layerNames.has(candidate) &&
                !skipPackages.has(candidate) &&
                candidate.length > 2
              ) {
                domain = candidate;
              }
            }
            break;
          }
        }
      }

      // ── Pattern B-1: Match class name against existing domain names ──
      if (!domain) {
        const fileName = parts[parts.length - 1].replace(/\.kt$/, "").toLowerCase();
        for (const ed of existingDomains) {
          const normalized = ed.replace(/-/g, "");
          if (fileName.startsWith(normalized) && fileName.length > normalized.length) {
            domain = ed;
            break;
          }
        }
      }

      // ── Pattern B-2: Extract from PascalCase class name ──
      if (!domain) {
        const fileName = parts[parts.length - 1].replace(/\.kt$/, "");
        const words = fileName.match(/[A-Z][a-z]+|[A-Z]+(?=[A-Z][a-z]|$)/g);
        if (words && words.length >= 2) {
          const domainWords = [];
          for (const w of words) {
            if (classSuffixes.has(w)) break;
            domainWords.push(w);
          }
          if (domainWords.length > 0) {
            const extracted = domainWords.join("").toLowerCase();
            if (
              !genericNames.includes(extracted) &&
              !skipPackages.has(extracted) &&
              extracted.length > 2
            ) {
              domain = extracted;
            }
          }
        }
      }

      if (domain) {
        if (!domainFileMap[domain]) domainFileMap[domain] = [];
        domainFileMap[domain].push(filePath);
      }
    }

    // ── Merge extracted domains into backendDomains ──
    let distributedFiles = 0;
    for (const [domain, files] of Object.entries(domainFileMap)) {
      // Find matching existing domain (exact or normalized)
      const existing = backendDomains.find(d =>
        d !== shared &&
        (d.name === domain || d.name.replace(/-/g, "") === domain.replace(/-/g, ""))
      );

      const ctrlCount = files.filter(f =>
        /\/controller\//i.test(f) || /Controller\.kt$/i.test(f)
      ).length;
      const svcCount = files.filter(f =>
        /\/service\//i.test(f) || /Service\.kt$/i.test(f)
      ).length;
      const repoCount = files.filter(f =>
        /\/repository\//i.test(f) || /\/mapper\//i.test(f) ||
        /Repository\.kt$/i.test(f) || /Mapper\.kt$/i.test(f)
      ).length;
      const dtoCount = files.filter(f =>
        (/\/dto\//i.test(f) || /\/vo\//i.test(f) || /Dto\.kt$/i.test(f) ||
         /Vo\.kt$/i.test(f) || /Request\.kt$/i.test(f) || /Response\.kt$/i.test(f)) &&
        !/\/controller\//i.test(f) && !/\/service\//i.test(f) &&
        !/\/repository\//i.test(f)
      ).length;

      if (existing) {
        // Merge into existing domain
        if (!existing.modules) existing.modules = [];
        for (const m of moduleNames) {
          if (!existing.modules.includes(m)) existing.modules.push(m);
        }
        if (!existing.serverTypes) existing.serverTypes = [];
        if (!existing.serverTypes.includes("query")) existing.serverTypes.push("query");
        existing.controllers += ctrlCount;
        existing.services += svcCount;
        if (existing.mappers != null) existing.mappers += repoCount;
        existing.dtos += dtoCount;
        existing.totalFiles += files.length;
      } else {
        // Create new domain entry
        backendDomains.push({
          name: domain,
          type: "backend",
          controllers: ctrlCount,
          services: svcCount,
          mappers: repoCount,
          dtos: dtoCount,
          totalFiles: files.length,
          modules: [...moduleNames],
          serverTypes: ["query"],
          pattern: "kotlin-multimodule",
          resolvedFrom: shared.name,
        });
      }
      distributedFiles += files.length;
    }

    // Adjust shared module: keep only undistributed files
    if (distributedFiles > 0) {
      shared.totalFiles = Math.max(0, shared.totalFiles - distributedFiles);
      shared.resolvedDomains = Object.keys(domainFileMap);
      if (shared.totalFiles === 0) shared._resolved = true;
    }
  }

  // Remove fully resolved shared entries (all files distributed)
  for (let i = backendDomains.length - 1; i >= 0; i--) {
    if (backendDomains[i]._resolved) backendDomains.splice(i, 1);
  }
}

module.exports = { scanKotlinDomains, resolveSharedQueryDomains };
