/**
 * ClaudeOS-Core — Node.js Structure Scanner
 *
 * Scans Node.js backend (Express/NestJS/Fastify) project structure to discover domains.
 * Supports monorepo layouts (apps/*, packages/*) in addition to single-project src/.
 */

const path = require("path");
const { glob } = require("glob");

// v2.5.0 — Layer-first stem de-duplication (shared shape with scan-python.js).
// For every plural key whose singular form is ALSO a key, fold the plural
// into the singular via `merge(into, from)` and drop the plural. Handles
// `-ies`→`-y`, `-(s|x|z|ch|sh)es`→base, and plain `-s`. No merge happens
// when only one form exists — the scanner never invents a singular.
function mergePluralStems(byDomain, merge) {
  for (const name of Object.keys(byDomain)) {
    const cands = [];
    if (/ies$/.test(name)) cands.push(name.slice(0, -3) + "y");
    if (/(?:s|x|z|ch|sh)es$/.test(name)) cands.push(name.slice(0, -2));
    if (/[^s]s$/.test(name)) cands.push(name.slice(0, -1));
    const singular = cands.find(c => c !== name && byDomain[c]);
    if (!singular) continue;
    merge(byDomain[singular], byDomain[name]);
    delete byDomain[name];
  }
}

async function scanNodeDomains(stack, ROOT) {
  const backendDomains = [];
  const skipDirs = ["common", "shared", "config", "utils", "lib", "core", "main", "interfaces", "types", "constants", "guards", "decorators", "pipes", "filters", "interceptors"];

  // Collect candidate directories: standard src/ + monorepo apps/*/src/
  const nestModules = await glob("src/modules/*/", { cwd: ROOT });
  let srcDirs = nestModules.length > 0 ? nestModules : await glob("src/*/", { cwd: ROOT });

  // Monorepo: scan apps/*/src/ and packages/*/src/ when standard src/ yields nothing backend-relevant
  if (stack.monorepo || srcDirs.length === 0) {
    const monoModules = await glob("{apps,packages}/*/src/modules/*/", { cwd: ROOT, ignore: ["**/node_modules/**"] });
    if (monoModules.length > 0) {
      srcDirs = [...srcDirs, ...monoModules];
    } else {
      const monoDirs = await glob("{apps,packages}/*/src/*/", { cwd: ROOT, ignore: ["**/node_modules/**"] });
      srcDirs = [...srcDirs, ...monoDirs];
    }
  }

  // v2.5.0 — Layer-first layouts (Express / Fastify / Koa): src/controllers/,
  // src/routes/, src/services/, src/models/. Every folder is a LAYER, so the
  // loop below used to emit "controllers", "services", "routes" as domains.
  // When (almost) every candidate folder is a layer name, derive domains from
  // the file stems inside those layers instead: user.controller.js,
  // users.routes.ts, orderService.js → user, users, order.
  const LAYER_DIRS = new Set(["controllers", "controller", "routes", "route", "routers", "router", "services", "service",
    "models", "model", "repositories", "repository", "middlewares", "middleware", "handlers", "handler",
    "validators", "validations", "schemas", "dtos", "entities", "dao", "helpers", "api"]);
  // Infrastructure folders that are neither layers nor features.
  const NODE_GENERIC_DIRS = new Set(["db", "database", "migrations", "seeds", "scripts", "public", "static", "views", "templates",
    "assets", "test", "tests", "__tests__", "mocks", "__mocks__", "docs", "node_modules", "dist", "build"]);
  const candidateNames = srcDirs.map(d => path.basename(d.replace(/\/$/, ""))).filter(n => !skipDirs.includes(n) && !NODE_GENERIC_DIRS.has(n));
  const layerNames = candidateNames.filter(n => LAYER_DIRS.has(n));
  // A tree is layer-first only when a ROUTING layer folder exists at the
  // top (`controllers/`, `routes/`, `handlers/`, `api/`). Data-only layer
  // folders (`entities/`, `dtos/`, `schemas/`, `models/`) also appear in
  // module-first NestJS trees (`src/users/`, `src/orders/` + shared
  // `src/entities/`), where the modules are the domains — treating that as
  // layer-first would rename `users` to `user` and invent one-file domains.
  const ROUTING_LAYERS = new Set(["controllers", "controller", "routes", "route", "routers", "router", "handlers", "handler", "api"]);
  const hasRoutingLayer = layerNames.some(n => ROUTING_LAYERS.has(n));
  // Then: at least two layer folders (or the only candidate is a layer).
  // Remaining non-layer siblings (`src/jobs/`, `src/billing/`) are MIXED-
  // layout feature folders and become whole-folder domains — they must not
  // disable the layer-first path, which would resurrect `controllers` /
  // `routes` / `services` as domains.
  if (hasRoutingLayer && (layerNames.length >= 2 || (layerNames.length === 1 && candidateNames.length === 1))) {
    const byDomain = {};
    const featureNames = candidateNames.filter(n => !LAYER_DIRS.has(n));
    for (const dir of srcDirs) {
      const name = path.basename(dir.replace(/\/$/, ""));
      if (!featureNames.includes(name)) continue;
      const files = await glob(`${dir.replace(/\\/g, "/").replace(/\/?$/, "/")}**/*.{ts,js,mjs,cjs}`, { cwd: ROOT, ignore: ["**/*.spec.*", "**/*.test.*", "**/*.d.ts", "**/node_modules/**"] });
      if (files.length === 0) continue;
      const e = (byDomain[name] = byDomain[name] || { name, type: "backend", controllers: 0, services: 0, dtos: 0, totalFiles: 0 });
      for (const f of files) {
        if (/controller|router|route|handler/.test(f)) e.controllers++;
        if (/service/.test(f)) e.services++;
        if (/dto|schema|type|validator/.test(f)) e.dtos++;
        e.totalFiles++;
      }
    }
    // Layer/role suffixes are stripped REPEATEDLY (`email.service.impl.ts` →
    // `email`, not `emailimpl`); `impl`, `base`, `abstract`, `interface`,
    // `types`, `spec` are role words, not domains.
    // A suffix counts only after a separator (`user.controller`, `user-controller`)
    // or as a PascalCase word (`userController`, `UserService`) — never as a bare
    // substring, so `prototype` is not cut down to `proto`.
    const DOTTED_SUFFIX_RE = /[.\-_](?:controller|router|routes?|service|handler|model|repository|repo|middleware|validator|schema|dto|entity|dao|helper|impl|base|abstract|interface|types?|spec|mock|factory|utils?)s?$/i;
    const CAMEL_SUFFIX_RE = /(?<=[a-z0-9])(?:Controller|Router|Routes?|Service|Handler|Model|Repository|Repo|Middleware|Validator|Schema|Dto|DTO|Entity|Dao|DAO|Helper|Impl|Base|Abstract|Interface|Types?|Spec|Mock|Factory|Utils?)s?$/;
    const stemOf = (f) => {
      const base = path.basename(f).replace(/\.(ts|js|mjs|cjs)$/, "");
      // user.controller | user-controller | userController | users.routes | UserService | index
      let stem = base;
      for (let i = 0; i < 6; i++) {
        const next = stem.replace(DOTTED_SUFFIX_RE, "").replace(CAMEL_SUFFIX_RE, "");
        if (next === stem) break;
        stem = next;
      }
      stem = stem.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase().replace(/^[.\-_]+|[.\-_]+$/g, "");
      return stem && stem !== "index" && stem !== "app" && stem !== "main" ? stem : null;
    };
    // Role comes from the LAYER FOLDER (authoritative), never from substrings
    // of the file path (`models/prototype.ts` is not a dto because it contains
    // "type").
    const ROLE_OF_LAYER = (layer) => ROUTING_LAYERS.has(layer) ? "controllers"
      : /^services?$/.test(layer) ? "services"
      : /^(dtos?|schemas?|validators?|validations|entities)$/.test(layer) ? "dtos" : null;
    for (const dir of srcDirs) {
      const layer = path.basename(dir.replace(/\/$/, ""));
      if (!LAYER_DIRS.has(layer)) continue;
      const role = ROLE_OF_LAYER(layer);
      const files = await glob(`${dir.replace(/\\/g, "/").replace(/\/?$/, "/")}**/*.{ts,js,mjs,cjs}`, { cwd: ROOT, ignore: ["**/*.spec.*", "**/*.test.*", "**/*.d.ts"] });
      for (const f of files) {
        const d = stemOf(f);
        if (!d) continue;
        const e = (byDomain[d] = byDomain[d] || { name: d, type: "backend", controllers: 0, services: 0, dtos: 0, totalFiles: 0 });
        if (role) e[role]++;
        e.totalFiles++;
      }
    }
    // Merge a plural stem into its singular twin when BOTH exist
    // (`users.routes.js` + `user.controller.js` → `user`). Only pairs are
    // merged — a lone `orders` stays `orders`, so no guessed singularization.
    mergePluralStems(byDomain, (into, from) => {
      into.controllers += from.controllers; into.services += from.services;
      into.dtos += from.dtos; into.totalFiles += from.totalFiles;
    });
    for (const d of Object.values(byDomain)) backendDomains.push({ ...d, pattern: "layer-first" });
    if (backendDomains.length > 0) return { backendDomains };
    // fall through to the directory loop if stems yielded nothing
  }

  for (let dir of srcDirs) {
    // A folder named after a layer (`entities/`, `dtos/`, `controllers/`) is
    // never a feature domain, whichever layout won above.
    if (LAYER_DIRS.has(path.basename(dir.replace(/\/$/, "")))) continue;
    if (!dir.endsWith("/")) dir += "/";
    const name = path.basename(dir.replace(/\/$/, ""));
    if (skipDirs.includes(name)) continue;
    const files = await glob(`${dir.replace(/\\/g, "/")}**/*.{ts,js}`, { cwd: ROOT, ignore: ["**/*.spec.*", "**/*.test.*"] });
    if (files.length > 0) {
      const controllers = files.filter(f => /controller|router|route|handler/.test(f)).length;
      const services = files.filter(f => /service/.test(f)).length;
      const dtos = files.filter(f => /dto|schema|type/.test(f)).length;
      const entities = files.filter(f => /entity|model/.test(f) && !/controller|service|dto/.test(f)).length;
      const modules = files.filter(f => /\.module\./.test(f)).length;
      const guards = files.filter(f => /guard/.test(f)).length;
      const pipes = files.filter(f => /pipe/.test(f)).length;
      const interceptors = files.filter(f => /interceptor/.test(f)).length;
      const domain = { name, type: "backend", controllers, services, dtos, totalFiles: files.length };
      if (entities > 0) domain.entities = entities;
      if (modules > 0) domain.modules = modules;
      if (guards > 0) domain.guards = guards;
      if (pipes > 0) domain.pipes = pipes;
      if (interceptors > 0) domain.interceptors = interceptors;
      backendDomains.push(domain);
    }
  }

  return { backendDomains };
}

module.exports = { scanNodeDomains };
