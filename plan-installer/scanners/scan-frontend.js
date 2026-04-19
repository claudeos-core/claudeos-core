/**
 * ClaudeOS-Core — Frontend Structure Scanner
 *
 * Scans frontend project directory structure to discover domains.
 * Supports: Angular, Next.js, React, Vue.
 * Includes FSD (Feature-Sliced Design), components scan, and 4-stage fallback.
 * Also provides frontend file count statistics.
 */

const fs = require("fs");
const path = require("path");
const { glob } = require("glob");

// Project-level override: `.claudeos-scan.json` at project root can extend
// the defaults. Supported fields (all optional, all additive — never replace
// defaults):
//   {
//     "frontendScan": {
//       "platformKeywords": ["extra-platform", "custom-tier"],
//       "skipSubappNames": ["my-shared-dir"],
//       "minSubappFiles": 3
//     }
//   }
// Invalid JSON or missing file: silently falls back to defaults.
function loadScanOverrides(ROOT) {
  try {
    const content = fs.readFileSync(path.join(ROOT, ".claudeos-scan.json"), "utf-8");
    return JSON.parse(content) || {};
  } catch (_e) {
    return {};
  }
}

// Build output / cache / generated dirs that should never be scanned for
// source code. Centralized so platform scan, Fallback E, and future scanners
// share the same exclusion set.
const BUILD_IGNORE_DIRS = [
  "**/node_modules/**",
  "**/build/**", "**/dist/**", "**/out/**",
  "**/.next/**", "**/.nuxt/**", "**/.svelte-kit/**", "**/.angular/**",
  "**/.turbo/**", "**/.cache/**", "**/.parcel-cache/**",
  "**/coverage/**", "**/storybook-static/**",
  "**/.vercel/**", "**/.netlify/**",
];

// Test / story / type-declaration file globs.
const TEST_FILE_IGNORE = [
  "**/*.spec.*", "**/*.test.*", "**/*.stories.*",
  "**/*.e2e.*", "**/*.cy.*",
  "**/__snapshots__/**", "**/__tests__/**",
];

// Build a glob prefix from a glob-returned directory path. Glob v10+ strips
// trailing slashes from results, and on Windows returns backslash paths;
// without normalization, the pattern `${dir}**/*.tsx` becomes something like
// `src/foo**/*.tsx` which only matches one level deep (foo/X.tsx) — not
// nested paths like foo/routes/X.tsx. Ensuring a trailing `/` turns it into
// `src/foo/**/*.tsx` which matches any depth.
function dirGlobPrefix(dir) {
  const fwd = dir.replace(/\\/g, "/");
  return fwd.endsWith("/") ? fwd : fwd + "/";
}

async function scanFrontendDomains(stack, ROOT) {
  const frontendDomains = [];

  // ── Angular ──
  if (stack.frontend === "angular") {
    // Angular feature modules: src/app/*/ with *.component.ts or *.module.ts (+ monorepo apps/*/)
    const angularAppDirs = [
      ...await glob("{src/app,app}/*/", { cwd: ROOT }),
      ...await glob("{apps,packages}/*/src/app/*/", { cwd: ROOT, ignore: ["**/node_modules/**"] }),
    ];
    // Skip structural containers (modules/features/pages/views) at the
    // src/app/*/ level — the files INSIDE those containers are the real
    // features, and the Angular deep fallback below extracts them properly.
    const skipAngularDirs = ["shared", "core", "common", "layout", "layouts",
      "environments", "assets", "styles", "testing", "utils",
      "modules", "features", "pages", "views"];
    for (const dir of angularAppDirs) {
      const name = path.basename(dir.replace(/\/$/, ""));
      if (skipAngularDirs.includes(name) || name.startsWith("_") || name.startsWith(".")) continue;
      const files = await glob(`${dirGlobPrefix(dir)}**/*.ts`, { cwd: ROOT, ignore: ["**/*.spec.ts", "**/*.test.ts"] });
      if (files.length > 0) {
        const components = files.filter(f => /\.component\.ts$/.test(f)).length;
        const services = files.filter(f => /\.service\.ts$/.test(f)).length;
        const modules = files.filter(f => /\.module\.ts$/.test(f)).length;
        const pipes = files.filter(f => /\.pipe\.ts$/.test(f)).length;
        const directives = files.filter(f => /\.directive\.ts$/.test(f)).length;
        const guards = files.filter(f => /\.guard\.ts$/.test(f)).length;
        frontendDomains.push({ name, type: "frontend", components, services, modules, pipes, directives, guards, totalFiles: files.length });
      }
    }

    // Angular fallback: scan **/modules/*/ and **/features/*/ with *.component.ts detection
    if (frontendDomains.length === 0) {
      const deepAngularDirs = await glob("**/{modules,features,pages,views}/*/", { cwd: ROOT, ignore: ["**/node_modules/**", "**/dist/**", "**/.angular/**"] });
      for (const dir of deepAngularDirs) {
        const name = path.basename(dir.replace(/\/$/, ""));
        if (skipAngularDirs.includes(name) || name.startsWith("_") || name.startsWith(".")) continue;
        const files = await glob(`${dirGlobPrefix(dir)}**/*.ts`, { cwd: ROOT, ignore: ["**/*.spec.ts", "**/*.test.ts"] });
        if (files.length >= 2) {
          const components = files.filter(f => /\.component\.ts$/.test(f)).length;
          const services = files.filter(f => /\.service\.ts$/.test(f)).length;
          frontendDomains.push({ name, type: "frontend", components, services, totalFiles: files.length });
        }
      }
    }
  }

  // ── Next.js/React/Vue ──
  if (stack.frontend === "nextjs" || stack.frontend === "react" || stack.frontend === "vue") {
    // App Router / Pages Router / SPA domains (standard + monorepo + Vite SPA paths)
    const allDirs = [
      ...await glob("{app,src/app}/*/", { cwd: ROOT }),
      ...await glob("{pages,src/pages}/*/", { cwd: ROOT }),
      ...await glob("{apps,packages}/*/app/*/", { cwd: ROOT, ignore: ["**/node_modules/**"] }),
      ...await glob("{apps,packages}/*/src/app/*/", { cwd: ROOT, ignore: ["**/node_modules/**"] }),
      ...await glob("{apps,packages}/*/pages/*/", { cwd: ROOT, ignore: ["**/node_modules/**"] }),
      ...await glob("{apps,packages}/*/src/pages/*/", { cwd: ROOT, ignore: ["**/node_modules/**"] }),
      // Non-standard nested page paths (e.g., src/admin/pages/*, src/dashboard/app/*)
      ...await glob("src/*/{app,pages}/*/", { cwd: ROOT, ignore: ["**/node_modules/**"] }),
      // Vite SPA / CRA common paths (src/views/*, src/screens/*, src/routes/*)
      ...await glob("src/{views,screens,routes}/*/", { cwd: ROOT, ignore: ["**/node_modules/**"] }),
    ];
    // Reserved Next.js/Router segments + structural containers that are never
    // real route features. "components"/"hooks"/"widgets" under app/ or
    // pages/ are UI containers handled by dedicated scanners — not routes.
    const skipPages = ["api", "_app", "_document", "fonts", "not-found", "error", "loading",
      "components", "hooks", "widgets", "entities", "features", "modules",
      "lib", "libs", "utils", "util", "config", "types", "shared", "common", "assets"];
    for (const dir of allDirs) {
      const name = path.basename(dir);
      if (skipPages.includes(name) || name.startsWith("(") || name.startsWith("[") || name.startsWith("_") || name.startsWith(".")) continue;
      const files = await glob(`${dirGlobPrefix(dir)}**/*.{tsx,jsx,ts,js,vue}`, { cwd: ROOT });
      if (files.length > 0) {
        const pages = files.filter(f => /page\.|index\./.test(f)).length;
        const layouts = files.filter(f => /layout\./.test(f)).length;
        const clientFiles = files.filter(f => /client\./.test(f)).length;
        const serverFiles = pages + layouts;
        const components = files.filter(f => !/page\.|layout\.|index\.|client\./.test(f)).length;
        frontendDomains.push({
          name, type: "frontend", pages, layouts, clientFiles, serverFiles, components, totalFiles: files.length,
          rscPattern: clientFiles > 0 ? "RSC+Client split" : "default",
        });
      }
    }

    // FSD (Feature-Sliced Design): features/*, widgets/*, entities/*
    const fsdLayers = ["features", "widgets", "entities"];
    for (const layer of fsdLayers) {
      const fsdDirs = [...new Set([
        ...await glob(`{${layer},src/${layer}}/*/`, { cwd: ROOT }),
        ...await glob(`src/*/${layer}/*/`, { cwd: ROOT, ignore: ["**/node_modules/**"] }),
      ])];
      for (const dir of fsdDirs) {
        const name = path.basename(dir);
        if (["ui", "common", "shared", "lib", "config", "index"].includes(name)) continue;
        const files = await glob(`${dirGlobPrefix(dir)}**/*.{tsx,jsx,ts,js,vue}`, { cwd: ROOT, ignore: ["**/*.spec.*", "**/*.test.*", "**/*.stories.*"] });
        if (files.length > 0) {
          const uiFiles = files.filter(f => /\bui\b/.test(f)).length;
          const modelFiles = files.filter(f => /model|store|hook/.test(f)).length;
          frontendDomains.push({ name: `${layer}/${name}`, type: "frontend", components: uiFiles, models: modelFiles, totalFiles: files.length });
        }
      }
    }

    // components/* (existing + nested src/*/components/*)
    const compDirSet = new Set([
      ...await glob("{src/,}components/*/", { cwd: ROOT }),
      ...await glob("src/*/components/*/", { cwd: ROOT, ignore: ["**/node_modules/**"] }),
    ]);
    const compDirs = [...compDirSet];
    for (const dir of compDirs) {
      const name = path.basename(dir);
      if (["ui", "common", "shared", "layout", "icons"].includes(name)) continue;
      const files = await glob(`${dirGlobPrefix(dir)}**/*.{tsx,jsx,vue}`, { cwd: ROOT });
      if (files.length >= 2) {
        frontendDomains.push({ name: `comp-${name}`, type: "frontend", components: files.length, totalFiles: files.length });
      }
    }

    // ── Fallback: extract domains when primary scanners return 0 ──
    if (frontendDomains.length === 0) {
      // Fallback A: Next.js page.tsx / client.tsx based detection
      const pageFiles = await glob("**/page.{tsx,jsx}", { cwd: ROOT, ignore: ["**/node_modules/**", "**/.next/**"] });
      const domainSet = {};
      const skipNames = ["app", "src", "pages", "api", "_app", "_document"];
      for (const f of pageFiles) {
        const parts = f.replace(/\\/g, "/").split("/");
        const appIdx = parts.indexOf("app");
        const pagesIdx = parts.indexOf("pages");
        const baseIdx = appIdx >= 0 ? appIdx : pagesIdx;
        if (baseIdx >= 0 && baseIdx + 1 < parts.length - 1) {
          const domain = parts[baseIdx + 1];
          if (!skipNames.includes(domain) && !domain.startsWith("_") && !domain.startsWith("(") && !domain.startsWith("[") && !domain.startsWith(".")) {
            if (!domainSet[domain]) domainSet[domain] = { pages: 0, clientFiles: 0, totalFiles: 0 };
            domainSet[domain].pages++;
            domainSet[domain].totalFiles++;
          }
        }
      }
      const clientFiles = await glob("**/client.{tsx,jsx}", { cwd: ROOT, ignore: ["**/node_modules/**", "**/.next/**"] });
      for (const f of clientFiles) {
        const parts = f.replace(/\\/g, "/").split("/");
        const appIdx = parts.indexOf("app");
        const baseIdx = appIdx >= 0 ? appIdx : -1;
        if (baseIdx >= 0 && baseIdx + 1 < parts.length - 1) {
          const domain = parts[baseIdx + 1];
          if (domainSet[domain]) {
            domainSet[domain].clientFiles++;
            domainSet[domain].totalFiles++;
          }
        }
      }
      for (const [name, data] of Object.entries(domainSet)) {
        frontendDomains.push({
          name, type: "frontend", pages: data.pages, clientFiles: data.clientFiles, totalFiles: data.totalFiles,
          rscPattern: data.clientFiles > 0 ? "RSC+Client split" : "default",
        });
      }

      // Fallback B: FSD widgets/features/entities
      for (const layer of ["widgets", "features", "entities"]) {
        const layerFiles = await glob(`**/${layer}/*/**/*.{tsx,jsx,ts,js,vue}`, { cwd: ROOT, ignore: ["**/node_modules/**", "**/.next/**", "**/*.spec.*", "**/*.test.*"] });
        const layerDomains = {};
        for (const f of layerFiles) {
          const parts = f.replace(/\\/g, "/").split("/");
          const layerIdx = parts.indexOf(layer);
          if (layerIdx >= 0 && layerIdx + 1 < parts.length) {
            const domain = parts[layerIdx + 1];
            if (!["ui", "common", "shared", "lib", "config"].includes(domain)) {
              if (!layerDomains[domain]) layerDomains[domain] = 0;
              layerDomains[domain]++;
            }
          }
        }
        for (const [name, count] of Object.entries(layerDomains)) {
          frontendDomains.push({ name: `${layer}/${name}`, type: "frontend", totalFiles: count });
        }
      }

      // Fallback C: Deep components/**/components/*/ detection (React/CRA/Vite projects)
      if (frontendDomains.length === 0) {
        const deepCompDirs = await glob("**/components/*/", { cwd: ROOT, ignore: ["**/node_modules/**", "**/.next/**", "**/build/**", "**/dist/**", "**/.git/**", "**/vendor/**", "**/__pycache__/**", "**/coverage/**"] });
        const deepDomains = {};
        const skipDomainNames = ["ui", "common", "shared", "layout", "layouts", "icons", "assets", "config", "utils", "lib", "error", "footer", "header", "inputs", "template"];
        for (const dir of deepCompDirs) {
          const name = path.basename(dir.replace(/\/$/, ""));
          if (skipDomainNames.includes(name) || name.startsWith("_") || name.startsWith(".")) continue;
          const files = await glob(`${dirGlobPrefix(dir)}**/*.{tsx,jsx,ts,js,vue}`, { cwd: ROOT, ignore: ["**/*.spec.*", "**/*.test.*", "**/*.stories.*"] });
          if (files.length >= 2) {
            if (!deepDomains[name]) deepDomains[name] = { components: 0, totalFiles: 0 };
            deepDomains[name].components += files.length;
            deepDomains[name].totalFiles += files.length;
          }
        }
        for (const [name, data] of Object.entries(deepDomains)) {
          frontendDomains.push({ name, type: "frontend", components: data.components, totalFiles: data.totalFiles });
        }
      }

      // Fallback D: views/screens/containers/pages/routes deep detection
      if (frontendDomains.length === 0) {
        const domainDirPatterns = ["views", "screens", "containers", "pages", "routes", "modules", "domains"];
        const deepDirDomains = {};
        const skipDirNames = ["api", "auth", "_app", "_document", "index", "ui", "common", "shared",
          "layout", "layouts", "lib", "config", "utils", "assets", "hooks", "store", "types",
          "constants", "helpers", "services", "middleware", "interceptors", "guards", "decorators"];

        for (const pattern of domainDirPatterns) {
          const dirs = await glob(`**/${pattern}/*/`, { cwd: ROOT, ignore: ["**/node_modules/**", "**/.next/**", "**/build/**", "**/dist/**", "**/.git/**", "**/vendor/**", "**/__pycache__/**", "**/coverage/**"] });
          for (const dir of dirs) {
            const name = path.basename(dir.replace(/\/$/, ""));
            if (skipDirNames.includes(name) || name.startsWith("_") || name.startsWith(".") || name.startsWith("(") || name.startsWith("[")) continue;
            const files = await glob(`${dirGlobPrefix(dir)}**/*.{tsx,jsx,ts,js,vue}`, { cwd: ROOT, ignore: ["**/*.spec.*", "**/*.test.*", "**/*.stories.*"] });
            if (files.length >= 2) {
              if (!deepDirDomains[name]) deepDirDomains[name] = { components: 0, pages: 0, totalFiles: 0, sources: [] };
              const tsx = files.filter(f => /\.(tsx|jsx|vue)$/.test(f)).length;
              deepDirDomains[name].components += tsx;
              deepDirDomains[name].totalFiles += files.length;
              if (!deepDirDomains[name].sources.includes(pattern)) deepDirDomains[name].sources.push(pattern);
            }
          }
        }
        for (const [name, data] of Object.entries(deepDirDomains)) {
          frontendDomains.push({ name, type: "frontend", components: data.components, totalFiles: data.totalFiles, sources: data.sources });
        }
      }

    }
  }

  // ── Shared frontend patterns (run for ANY frontend: Angular, Next.js, React, Vue) ──
  //
  // These patterns don't depend on framework-specific file extensions or
  // folder conventions — they look for top-level segmentation by platform or
  // by routes/-file layouts, which appear across all frontend frameworks.
  if (stack.frontend) {
    // Read optional per-project override (.claudeos-scan.json).
    const overrides = loadScanOverrides(ROOT).frontendScan || {};
    // Platform-split layout: src/{platform}/{subapp}/ where platform is a
    // device/target-environment OR access-tier keyword. Both form the same
    // structural pattern (top-level segmentation with a common subapp layout).
    // Subapp name comes from the filesystem at scan time via path.basename —
    // no project-specific names are hardcoded.
    // Produces one domain per (platform, subapp) pair, named `{platform}-{subapp}`.
    // NOTE: 3-letter+ access-tier names only. The short `adm` abbreviation
    // is deliberately excluded — too ambiguous in isolation and false-positive
    // risk isn't worth the small convenience gain. If a project uses `src/adm/`
    // as an admin tier root, rename to `admin` or add `"adm"` to
    // `frontendScan.platformKeywords` in `.claudeos-scan.json`.
    const DEFAULT_PLATFORM_KEYWORDS = [
      // device / target-environment
      "desktop", "pc", "web",
      "mobile", "mc", "mo", "sp",
      "tablet", "tab",
      "pwa",
      "tv", "ctv", "ott",
      "watch", "wear",
      // access-tier / audience
      "admin", "cms", "backoffice", "back-office", "portal",
    ];
    const PLATFORM_KEYWORDS = [
      ...DEFAULT_PLATFORM_KEYWORDS,
      ...(Array.isArray(overrides.platformKeywords) ? overrides.platformKeywords : []),
    ];
    // Minimum source files to qualify as a subapp. A single-file directory
    // under a platform root is almost always an accidental fixture or a
    // placeholder, not a real subapp. Raising the floor avoids noisy
    // 1-file "domains" in the Pass 1 group plan.
    const MIN_SUBAPP_FILES = typeof overrides.minSubappFiles === "number" && overrides.minSubappFiles >= 1
      ? overrides.minSubappFiles
      : 2;
    // Conservative skip list — never-a-feature names at the subapp level.
    // Includes infrastructure dirs, structural dirs that other scanners
    // already handle (components/hooks/layouts), FSD layer names, and
    // framework router dirs. Patterns like `src/admin/pages/*/` and
    // `src/admin/components/*/` fall through to the App/Pages Router and
    // components scanners instead of being captured as bare subapps.
    // `store`/`stores` are deliberately NOT skipped — e-commerce projects
    // legitimately use them as subapp names.
    const DEFAULT_SKIP_SUBAPP_NAMES = [
      // infrastructure
      "assets", "common", "shared", "utils", "util",
      "lib", "libs", "config", "constants", "helpers", "types",
      "test", "tests", "__mocks__", "mocks", "__tests__",
      // structural (handled by dedicated scanners at a deeper level)
      "components", "hooks", "layouts", "layout",
      // FSD layers (handled by FSD scanner)
      "widgets", "features", "entities",
      // framework router dirs (handled by App/Pages Router scanner + fallback D)
      "app", "pages", "routes", "views", "screens", "containers",
      "modules", "domains",
    ];
    const SKIP_SUBAPP_NAMES = [
      ...DEFAULT_SKIP_SUBAPP_NAMES,
      ...(Array.isArray(overrides.skipSubappNames) ? overrides.skipSubappNames : []),
    ];
    // Match both standalone projects (src/{platform}/{subapp}/) and monorepo
    // workspaces ({apps,packages}/*/src/{platform}/{subapp}/ and
    // {apps,packages}/{platform}/{subapp}/ — some monorepos skip the src/ wrapper).
    const platformGlobs = [
      `src/{${PLATFORM_KEYWORDS.join(",")}}/*/`,
      `{apps,packages}/*/src/{${PLATFORM_KEYWORDS.join(",")}}/*/`,
      `{apps,packages}/{${PLATFORM_KEYWORDS.join(",")}}/*/`,
    ];
    const platformDirs = [];
    for (const p of platformGlobs) {
      const dirs = await glob(p, { cwd: ROOT, ignore: ["**/node_modules/**"] });
      platformDirs.push(...dirs);
    }
    // Dedupe (the three globs can produce overlapping matches in some layouts)
    const seenPlatformDirs = new Set();
    for (const dir of platformDirs) {
      const dirFwd = dir.replace(/\\/g, "/").replace(/\/$/, "");
      if (seenPlatformDirs.has(dirFwd)) continue;
      seenPlatformDirs.add(dirFwd);
      const parts = dirFwd.split("/");
      // Locate platform segment: the FIRST segment that matches a keyword.
      // findIndex (not findLast) — if the subapp name also happens to be a
      // keyword (e.g., `src/pc/admin/`), the subapp should stay as the
      // second match, not be mistaken for the platform segment.
      // Paths handled: src/<p>/<s>, apps/<workspace>/src/<p>/<s>, apps/<p>/<s>.
      const platformIdx = parts.findIndex(seg => PLATFORM_KEYWORDS.includes(seg));
      if (platformIdx < 0 || platformIdx + 1 >= parts.length) continue;
      const platform = parts[platformIdx];
      const subapp = parts[platformIdx + 1];
      if (!subapp || SKIP_SUBAPP_NAMES.includes(subapp) || subapp.startsWith("_") || subapp.startsWith(".")) continue;
      const files = await glob(`${dirGlobPrefix(dir)}**/*.{tsx,jsx,ts,js,vue}`, {
        cwd: ROOT,
        ignore: [...BUILD_IGNORE_DIRS, ...TEST_FILE_IGNORE],
      });
      if (files.length < MIN_SUBAPP_FILES) continue;
      // Normalize Windows backslashes so the segment regex works cross-platform.
      const filesFwd = files.map(f => f.replace(/\\/g, "/"));
      const routes = filesFwd.filter(f => /\/routes\//.test(f)).length;
      const components = filesFwd.filter(f => /\/components\//.test(f)).length;
      const layouts = filesFwd.filter(f => /\/layouts?\//.test(f)).length;
      const hooks = filesFwd.filter(f => /\/hooks\//.test(f)).length;
      frontendDomains.push({
        name: `${platform}-${subapp}`,
        type: "frontend",
        platform,
        subapp,
        routes, components, layouts, hooks,
        totalFiles: files.length,
      });
    }

    // Fallback E: React Router file-routing (any depth). Groups by the
    // parent dir of `routes/`. Domain name = parent basename. Covers
    // CRA/Vite + React Router projects that don't match Next.js page.tsx
    // or FSD layout. Only fires when every other primary and fallback
    // scanner returned 0 domains.
    if (frontendDomains.length === 0) {
      const routeFiles = await glob("**/routes/*.{tsx,jsx,ts,js,vue}", {
        cwd: ROOT,
        ignore: [...BUILD_IGNORE_DIRS, ...TEST_FILE_IGNORE],
      });
      const routeDomains = {};
      const skipParents = ["src", "app", "pages", "", "."];
      for (const f of routeFiles) {
        const parts = f.replace(/\\/g, "/").split("/");
        const routesIdx = parts.lastIndexOf("routes");
        if (routesIdx < 1) continue;
        const parent = parts[routesIdx - 1];
        if (skipParents.includes(parent) || parent.startsWith("_") || parent.startsWith(".")) continue;
        if (!routeDomains[parent]) routeDomains[parent] = { routes: 0, totalFiles: 0 };
        routeDomains[parent].routes++;
        routeDomains[parent].totalFiles++;
      }
      for (const [name, data] of Object.entries(routeDomains)) {
        frontendDomains.push({ name, type: "frontend", routes: data.routes, totalFiles: data.totalFiles });
      }
    }
  }

  return { frontendDomains };
}

// ── Frontend file count statistics ──
async function countFrontendStats(stack, ROOT) {
  const frontend = { exists: false, components: 0, pages: 0, hooks: 0 };
  if (stack.frontend) {
    frontend.exists = true;
    if (stack.frontend === "angular") {
      frontend.components = (await glob("{src/,}**/*.component.ts", { cwd: ROOT, ignore: ["**/node_modules/**", "**/dist/**"] })).length;
      frontend.pages = (await glob("{src/,}**/*.module.ts", { cwd: ROOT, ignore: ["**/node_modules/**", "**/dist/**"] })).length;
      frontend.hooks = (await glob("{src/,}**/*.service.ts", { cwd: ROOT, ignore: ["**/node_modules/**", "**/dist/**"] })).length;
    } else {
      frontend.components = (await glob("{src/,}**/components/**/*.{tsx,jsx,vue}", { cwd: ROOT, ignore: ["**/node_modules/**"] })).length;
      frontend.pages = (await glob("{src/,}{app,pages}/**/{page,index}.{tsx,jsx,vue}", { cwd: ROOT, ignore: ["**/node_modules/**"] })).length
        + (await glob("src/*/{app,pages}/**/{page,index}.{tsx,jsx,vue}", { cwd: ROOT, ignore: ["**/node_modules/**"] })).length;
      frontend.hooks = (await glob("{src/,}**/hooks/**/*.{ts,js}", { cwd: ROOT, ignore: ["**/node_modules/**"] })).length;
    }
  }

  // App Router RSC/Client overall stats (for project-analysis.json)
  if (stack.frontend === "nextjs") {
    const allClientFiles = await glob("{app,src/app}/**/client.{tsx,ts,jsx,js}", { cwd: ROOT });
    const allPageFiles = await glob("{app,src/app}/**/page.{tsx,ts,jsx,js}", { cwd: ROOT });
    const allLayoutFiles = await glob("{app,src/app}/**/layout.{tsx,ts,jsx,js}", { cwd: ROOT });
    frontend.clientComponents = allClientFiles.length;
    frontend.serverPages = allPageFiles.length;
    frontend.layouts = allLayoutFiles.length;
    frontend.rscPattern = allClientFiles.length > 0;
  }

  return frontend;
}

module.exports = { scanFrontendDomains, countFrontendStats };
