/**
 * ClaudeOS-Core — Python Structure Scanner
 *
 * Scans Python (Django/FastAPI/Flask) project structure to discover domains.
 */

const path = require("path");
const { glob } = require("glob");

// v2.5.0 — Layer-first stem de-duplication (same rule as scan-node.js).
// Fold a plural key into its singular twin ONLY when both exist
// (`routers/users.py` + `models/user.py` → `user`); a lone plural is kept.
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

async function scanPythonDomains(stack, ROOT) {
  const backendDomains = [];

  // ── Django ──
  if (stack.framework === "django") {
    const candidates = await glob("**/models.py", { cwd: ROOT, ignore: ["**/node_modules/**", "**/venv/**", "**/.venv/**", "**/env/**", "**/migrations/**"] });
    for (const f of candidates) {
      const dir = path.dirname(f);
      if (dir === "." || dir.includes("venv")) continue;
      const name = path.basename(dir);
      const appFiles = await glob(`${dir.replace(/\\/g, "/")}/*.py`, { cwd: ROOT });
      const views = appFiles.filter(x => x.includes("views")).length;
      const models = appFiles.filter(x => x.includes("models")).length;
      const serializers = appFiles.filter(x => x.includes("serializers")).length;
      const admin = appFiles.filter(x => x.includes("admin")).length;
      const forms = appFiles.filter(x => x.includes("forms")).length;
      const urls = appFiles.filter(x => x.includes("urls")).length;
      const tasks = appFiles.filter(x => x.includes("tasks")).length;
      const domain = { name, type: "backend", views, models, serializers, totalFiles: appFiles.length };
      if (admin > 0) domain.admin = admin;
      if (forms > 0) domain.forms = forms;
      if (urls > 0) domain.urls = urls;
      if (tasks > 0) domain.tasks = tasks;
      backendDomains.push(domain);
    }
  }

  // ── FastAPI / Flask / generic Python ──
  if (stack.framework === "fastapi" || stack.framework === "flask" || (stack.language === "python" && stack.framework !== "django")) {
    const routerFiles = await glob("**/{router,routes,endpoints}*.py", { cwd: ROOT, ignore: ["**/venv/**", "**/.venv/**"] });
    const seen = new Set();
    for (const f of routerFiles) {
      const dir = path.dirname(f);
      const name = path.basename(dir);
      if (name === "." || seen.has(name) || ["venv", ".venv", "__pycache__"].includes(name)) continue;
      seen.add(name);
      const appFiles = await glob(`${dir.replace(/\\/g, "/")}/*.py`, { cwd: ROOT });
      backendDomains.push({ name, type: "backend", totalFiles: appFiles.length });
    }
    // v2.5.0 — Layer-first FastAPI/Flask: app/routers/users.py, app/models/user.py,
    // app/schemas/user.py. Folders are layers, so derive domains from file stems.
    if (backendDomains.filter(d => d.type === "backend").length === 0) {
      const PY_LAYER_DIRS = new Set(["routers", "router", "routes", "route", "api", "endpoints", "views", "controllers",
        "services", "service", "models", "model", "schemas", "schema", "repositories", "repository", "crud", "dao", "handlers"]);
      const PY_GENERIC_DIRS = new Set(["core", "common", "utils", "__pycache__", "config", "db", "database", "tests", "test", "app", "static", "templates", "migrations",
        "env", "venv", ".venv", "virtualenv", "node_modules", "site-packages", "scripts", "docs"]);
      const allSub = (await glob("{app,src/app,src}/*/", { cwd: ROOT, ignore: ["**/venv/**", "**/.venv/**", "**/env/**", "**/virtualenv/**", "**/node_modules/**", "**/site-packages/**", "**/__pycache__/**"] }))
        .map(d => d.replace(/\\/g, "/").replace(/\/?$/, "/"));
      const baseOf = (d) => path.basename(d.replace(/\/$/, ""));
      const parentOf = (d) => d.replace(/\/$/, "").split("/").slice(0, -1).join("/") + "/";
      const layerDirs = allSub.filter(d => PY_LAYER_DIRS.has(baseOf(d)));
      // Feature packages that sit NEXT TO the layer folders (same parent):
      // `src/routers/` + `src/tasks/` is a mixed layout — `tasks` must become a
      // domain too, not be silently dropped. Scanned symmetrically with the
      // layer folders (both come from the same glob), never from other trees.
      const layerParents = new Set(layerDirs.map(parentOf));
      const featureDirs = allSub.filter(d => layerParents.has(parentOf(d)) && !PY_LAYER_DIRS.has(baseOf(d)) && !PY_GENERIC_DIRS.has(baseOf(d)));
      if (layerDirs.length > 0) {
        const byDomain = {};
        for (const dir of layerDirs) {
          const files = await glob(`${dir}*.py`, { cwd: ROOT });
          for (const f of files) {
            let stem = path.basename(f, ".py").replace(/_(router|routes?|service|model|schema|repository|crud|handler|views?|api)s?$/i, "").toLowerCase();
            if (!stem || ["__init__", "base", "deps", "dependencies", "main", "app", "utils", "common"].includes(stem)) continue;
            const e = (byDomain[stem] = byDomain[stem] || { name: stem, type: "backend", totalFiles: 0 });
            e.totalFiles++;
          }
        }
        for (const dir of featureDirs) {
          const files = await glob(`${dir}**/*.py`, { cwd: ROOT, ignore: ["**/__pycache__/**"] });
          if (files.length === 0) continue;
          const name = baseOf(dir).toLowerCase();
          const e = (byDomain[name] = byDomain[name] || { name, type: "backend", totalFiles: 0 });
          e.totalFiles += files.length;
        }
        mergePluralStems(byDomain, (into, from) => { into.totalFiles += from.totalFiles; });
        for (const d of Object.values(byDomain)) backendDomains.push({ ...d, pattern: "layer-first" });
      }
    }
    if (backendDomains.filter(d => d.type === "backend").length === 0) {
      const appDirs = await glob("{app,src/app}/*/", { cwd: ROOT });
      for (let dir of appDirs) {
        if (!dir.endsWith("/")) dir += "/";
        const name = path.basename(dir.replace(/\/$/, ""));
        if (["core", "common", "utils", "__pycache__"].includes(name)) continue;
        const files = await glob(`${dir.replace(/\\/g, "/")}*.py`, { cwd: ROOT });
        if (files.length > 0) backendDomains.push({ name, type: "backend", totalFiles: files.length });
      }
    }
    // Flat project fallback: main.py or app.py at root or in app/ directory with no subdomain structure
    if (backendDomains.filter(d => d.type === "backend").length === 0) {
      const flatEntries = await glob("{main,app}.py", { cwd: ROOT, ignore: ["**/venv/**", "**/.venv/**"] });
      if (flatEntries.length > 0) {
        const allPy = await glob("*.py", { cwd: ROOT, ignore: ["**/venv/**", "**/.venv/**", "setup.py", "conftest.py"] });
        if (allPy.length > 0) {
          backendDomains.push({ name: "app", type: "backend", totalFiles: allPy.length, flat: true });
        }
      }
      // Also check app/ directory with main.py but no subdirectories
      if (backendDomains.filter(d => d.type === "backend").length === 0) {
        const appMain = await glob("{app,src/app}/{main,app}.py", { cwd: ROOT, ignore: ["**/venv/**", "**/.venv/**"] });
        if (appMain.length > 0) {
          const dir = path.dirname(appMain[0]).replace(/\\/g, "/");
          const appPy = await glob(`${dir}/*.py`, { cwd: ROOT });
          if (appPy.length > 0) {
            backendDomains.push({ name: path.basename(dir), type: "backend", totalFiles: appPy.length, flat: true });
          }
        }
      }
    }
  }

  return { backendDomains };
}

module.exports = { scanPythonDomains };
