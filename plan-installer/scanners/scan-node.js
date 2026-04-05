/**
 * ClaudeOS-Core — Node.js Structure Scanner
 *
 * Scans Node.js backend (Express/NestJS/Fastify) project structure to discover domains.
 */

const path = require("path");
const { glob } = require("glob");

async function scanNodeDomains(stack, ROOT) {
  const backendDomains = [];

  const nestModules = await glob("src/modules/*/", { cwd: ROOT });
  const srcDirs = nestModules.length > 0 ? nestModules : await glob("src/*/", { cwd: ROOT });
  const skipDirs = ["common", "shared", "config", "utils", "lib", "core", "main", "interfaces", "types", "constants", "guards", "decorators", "pipes", "filters", "interceptors"];
  for (let dir of srcDirs) {
    if (!dir.endsWith("/")) dir += "/";
    const name = path.basename(dir.replace(/\/$/, ""));
    if (skipDirs.includes(name)) continue;
    const files = await glob(`${dir.replace(/\\/g, "/")}**/*.{ts,js}`, { cwd: ROOT, ignore: ["**/*.spec.*", "**/*.test.*"] });
    if (files.length > 0) {
      const controllers = files.filter(f => /controller|router|route/.test(f)).length;
      const services = files.filter(f => /service/.test(f)).length;
      const dtos = files.filter(f => /dto|schema|type/.test(f)).length;
      backendDomains.push({ name, type: "backend", controllers, services, dtos, totalFiles: files.length });
    }
  }

  return { backendDomains };
}

module.exports = { scanNodeDomains };
