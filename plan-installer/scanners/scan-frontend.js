/**
 * ClaudeOS-Core — Frontend Structure Scanner
 *
 * Scans frontend project directory structure to discover domains.
 * Supports: Angular, Next.js, React, Vue.
 * Includes FSD (Feature-Sliced Design), components scan, and 4-stage fallback.
 * Also provides frontend file count statistics.
 */

const path = require("path");
const { glob } = require("glob");

async function scanFrontendDomains(stack, ROOT) {
  const frontendDomains = [];

  // ── Angular ──
  if (stack.frontend === "angular") {
    // Angular feature modules: src/app/*/ with *.component.ts or *.module.ts (+ monorepo apps/*/)
    const angularAppDirs = [
      ...await glob("{src/app,app}/*/", { cwd: ROOT }),
      ...await glob("{apps,packages}/*/src/app/*/", { cwd: ROOT, ignore: ["**/node_modules/**"] }),
    ];
    const skipAngularDirs = ["shared", "core", "common", "layout", "layouts", "environments", "assets", "styles", "testing", "utils"];
    for (const dir of angularAppDirs) {
      const name = path.basename(dir.replace(/\/$/, ""));
      if (skipAngularDirs.includes(name) || name.startsWith("_") || name.startsWith(".")) continue;
      const files = await glob(`${dir.replace(/\\/g, "/")}**/*.ts`, { cwd: ROOT, ignore: ["**/*.spec.ts", "**/*.test.ts"] });
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
        const files = await glob(`${dir.replace(/\\/g, "/")}**/*.ts`, { cwd: ROOT, ignore: ["**/*.spec.ts", "**/*.test.ts"] });
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
    // App Router / Pages Router domains (standard + monorepo apps/*/)
    const allDirs = [
      ...await glob("{app,src/app}/*/", { cwd: ROOT }),
      ...await glob("{pages,src/pages}/*/", { cwd: ROOT }),
      ...await glob("{apps,packages}/*/app/*/", { cwd: ROOT, ignore: ["**/node_modules/**"] }),
      ...await glob("{apps,packages}/*/src/app/*/", { cwd: ROOT, ignore: ["**/node_modules/**"] }),
      ...await glob("{apps,packages}/*/pages/*/", { cwd: ROOT, ignore: ["**/node_modules/**"] }),
      ...await glob("{apps,packages}/*/src/pages/*/", { cwd: ROOT, ignore: ["**/node_modules/**"] }),
    ];
    const skipPages = ["api", "_app", "_document", "fonts", "not-found", "error", "loading"];
    for (const dir of allDirs) {
      const name = path.basename(dir);
      if (skipPages.includes(name) || name.startsWith("(") || name.startsWith("[") || name.startsWith("_") || name.startsWith(".")) continue;
      const files = await glob(`${dir.replace(/\\/g, "/")}**/*.{tsx,jsx,ts,js,vue}`, { cwd: ROOT });
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
      const fsdDirs = await glob(`{${layer},src/${layer}}/*/`, { cwd: ROOT });
      for (const dir of fsdDirs) {
        const name = path.basename(dir);
        if (["ui", "common", "shared", "lib", "config", "index"].includes(name)) continue;
        const files = await glob(`${dir.replace(/\\/g, "/")}**/*.{tsx,jsx,ts,js,vue}`, { cwd: ROOT, ignore: ["**/*.spec.*", "**/*.test.*", "**/*.stories.*"] });
        if (files.length > 0) {
          const uiFiles = files.filter(f => /\bui\b/.test(f)).length;
          const modelFiles = files.filter(f => /model|store|hook/.test(f)).length;
          frontendDomains.push({ name: `${layer}/${name}`, type: "frontend", components: uiFiles, models: modelFiles, totalFiles: files.length });
        }
      }
    }

    // components/* (existing)
    const compDirs = await glob("{src/,}components/*/", { cwd: ROOT });
    for (const dir of compDirs) {
      const name = path.basename(dir);
      if (["ui", "common", "shared", "layout", "icons"].includes(name)) continue;
      const files = await glob(`${dir.replace(/\\/g, "/")}**/*.{tsx,jsx,vue}`, { cwd: ROOT });
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
          const files = await glob(`${dir.replace(/\\/g, "/")}**/*.{tsx,jsx,ts,js,vue}`, { cwd: ROOT, ignore: ["**/*.spec.*", "**/*.test.*", "**/*.stories.*"] });
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
            const files = await glob(`${dir.replace(/\\/g, "/")}**/*.{tsx,jsx,ts,js,vue}`, { cwd: ROOT, ignore: ["**/*.spec.*", "**/*.test.*", "**/*.stories.*"] });
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
      frontend.pages = (await glob("{src/,}{app,pages}/**/{page,index}.{tsx,jsx,vue}", { cwd: ROOT, ignore: ["**/node_modules/**"] })).length;
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
