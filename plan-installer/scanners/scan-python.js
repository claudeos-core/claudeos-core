/**
 * ClaudeOS-Core — Python Structure Scanner
 *
 * Scans Python (Django/FastAPI/Flask) project structure to discover domains.
 */

const path = require("path");
const { glob } = require("glob");

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
