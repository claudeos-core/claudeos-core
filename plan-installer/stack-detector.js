/**
 * ClaudeOS-Core — Stack Detector
 *
 * Detects project language, framework, build tool, database, ORM, and frontend.
 * Supports: Java, Kotlin, TypeScript/JavaScript, Python
 * Multi-stack aware (backend + frontend simultaneous detection).
 */

const path = require("path");
const { glob } = require("glob");
const { readFileSafe, readJsonSafe, existsSafe } = require("../lib/safe-fs");

// ─── Lookup tables ──────────────────────────────────────────────

// ORM detection rules: [keyword, ormName]  (order = priority, first match wins)
const GRADLE_ORM_RULES = [
  ["mybatis", "mybatis"],
  ["jpa", "jpa"], ["hibernate", "jpa"],
  ["exposed", "exposed"],
  ["jooq", "jooq"],
  ["spring-data-jdbc", "spring-data-jdbc"],
  ["r2dbc", "r2dbc"],
];

const MAVEN_ORM_RULES = [
  ["mybatis", "mybatis"],
  ["jpa", "jpa"], ["hibernate", "jpa"],
  ["exposed", "exposed"],
  ["jooq", "jooq"],
];

const NODE_ORM_RULES = [
  [["@prisma/client", "prisma"], "prisma"],
  [["typeorm"], "typeorm"],
  [["sequelize"], "sequelize"],
  [["drizzle-orm"], "drizzle"],
  [["knex"], "knex"],
];

// DB detection rules: [keyword, dbName]
const DB_KEYWORD_RULES = [
  ["postgresql", "postgresql"], ["postgres", "postgresql"],
  ["mysql", "mysql"],
  ["oracle", "oracle"],
  ["mongodb", "mongodb"],
  ["sqlite", "sqlite"],
];

// h2 needs word-boundary check (avoid oauth2, cache2k false positives)
const H2_REGEX = /\bh2\b/;

// ─── Helpers ────────────────────────────────────────────────────

function detectFirst(stack, field, content, rules) {
  if (stack[field]) return;
  for (const [keyword, value] of rules) {
    if (content.includes(keyword)) {
      stack[field] = value;
      stack.detected.push(value);
      return;
    }
  }
}

function detectDb(stack, content, rules) {
  if (stack.database) return;
  for (const [keyword, value] of rules) {
    if (content.includes(keyword)) {
      stack.database = value;
      stack.detected.push(value);
      return;
    }
  }
  // h2 with word boundary
  if (!stack.database && H2_REGEX.test(content)) {
    stack.database = "h2";
    stack.detected.push("h2");
  }
}


/**
 * Detect the project's technology stack.
 * @param {string} ROOT - project root path
 * @returns {Promise<object>} stack info
 */
async function detectStack(ROOT) {
  const stack = {
    language: null, languageVersion: null,
    framework: null, frameworkVersion: null,
    buildTool: null, database: null, orm: null,
    frontend: null, frontendVersion: null,
    packageManager: null, monorepo: null, workspaces: null,
    detected: [],
  };

  // ── Java/Kotlin: Gradle ──
  const gradleFile = existsSafe(path.join(ROOT, "build.gradle.kts"))
    ? "build.gradle.kts"
    : existsSafe(path.join(ROOT, "build.gradle")) ? "build.gradle" : null;
  if (gradleFile) {
    const g = readFileSafe(path.join(ROOT, gradleFile));
    if (g) {
      stack.buildTool = "gradle"; stack.detected.push(gradleFile);
      if (g.includes("spring-boot")) { stack.language = "java"; stack.framework = "spring-boot"; stack.detected.push("spring-boot"); }
      const svPatterns = [
        /org\.springframework\.boot.*version\s*['"]([^'"]+)['"]/,
        /id\s*\(\s*["']org\.springframework\.boot["']\s*\)\s*version\s*["']([^"']+)["']/,
        /spring-boot-dependencies:([^'")\s]+)/,
      ];
      for (const pattern of svPatterns) {
        const sv = g.match(pattern);
        if (sv) { stack.frameworkVersion = sv[1]; break; }
      }
      const jv = g.match(/sourceCompatibility\s*=\s*['"]?(\d+)['"]?/);
      if (jv) stack.languageVersion = jv[1];

      detectFirst(stack, "orm", g, GRADLE_ORM_RULES);
      // Exclude "postgres" (substring of postgresql — false positive on r2dbc-postgres) and "sqlite" (rare in Gradle deps)
      // "postgresql" is still matched via DB_KEYWORD_RULES; h2 uses word-boundary check separately
      detectDb(stack, g, DB_KEYWORD_RULES.filter(([kw]) => !["postgres", "sqlite"].includes(kw)));

      // Kotlin detection: override language if Kotlin plugin found
      if (g.includes("kotlin") || g.includes("org.jetbrains.kotlin")) {
        stack.language = "kotlin"; stack.detected.push("kotlin");
        const kvPatterns = [
          /kotlin\S*\s*version\s*['"]([^'"]+)['"]/,
          /org\.jetbrains\.kotlin\S*\s*version\s*['"]([^'"]+)['"]/,
          /kotlin\("jvm"\)\s*version\s*["']([^"']+)["']/,
        ];
        for (const pattern of kvPatterns) {
          const match = g.match(pattern);
          if (match) { stack.languageVersion = match[1]; break; }
        }
      }
    }
  }

  // ── Gradle: version catalogs (libs.versions.toml) ──
  const versionCatalog = path.join(ROOT, "gradle/libs.versions.toml");
  if (existsSafe(versionCatalog)) {
    const vc = readFileSafe(versionCatalog);
    if (vc) {
      stack.detected.push("libs.versions.toml");
      if (!stack.languageVersion) {
        const kvMatch = vc.match(/kotlin\s*=\s*["']([^"']+)["']/);
        if (kvMatch) stack.languageVersion = kvMatch[1];
      }
      if (!stack.frameworkVersion) {
        const sbMatch = vc.match(/spring-boot\s*=\s*["']([^"']+)["']/);
        if (sbMatch) stack.frameworkVersion = sbMatch[1];
      }
      // Version catalog ORM (labels include " (catalog)" suffix)
      if (!stack.orm && vc.includes("exposed")) { stack.orm = "exposed"; stack.detected.push("exposed (catalog)"); }
      else if (!stack.orm && vc.includes("jooq")) { stack.orm = "jooq"; stack.detected.push("jooq (catalog)"); }
      else if (!stack.orm && (vc.includes("jpa") || vc.includes("hibernate"))) { stack.orm = "jpa"; stack.detected.push("jpa (catalog)"); }
      if (!stack.database && vc.includes("postgresql")) { stack.database = "postgresql"; }
      if (!stack.database && vc.includes("mysql")) { stack.database = "mysql"; }
      if (!stack.database && vc.includes("mongodb")) { stack.database = "mongodb"; }
      if (!stack.language && vc.includes("kotlin")) {
        stack.language = "kotlin"; stack.detected.push("kotlin (catalog)");
      }
    }
  }

  // ── Kotlin: multi-module Gradle detection ──
  if (stack.language !== "kotlin" && stack.buildTool === "gradle") {
    const subBuildFiles = await glob("**/build.gradle{,.kts}", { cwd: ROOT, ignore: ["**/node_modules/**", "**/build/**"] });
    for (const sbf of subBuildFiles.slice(0, 5)) {
      const sc = readFileSafe(path.join(ROOT, sbf));
      if (sc && (sc.includes("kotlin") || sc.includes("org.jetbrains.kotlin"))) {
        stack.language = "kotlin"; stack.detected.push("kotlin (submodule)");
        const kv = sc.match(/kotlin\S*\s*version\s*['"]([^'"]+)['"]/);
        if (kv) stack.languageVersion = kv[1];
        break;
      }
    }
  }

  // ── Kotlin: detect CQRS/multi-module from settings.gradle ──
  const settingsFile = existsSafe(path.join(ROOT, "settings.gradle.kts"))
    ? "settings.gradle.kts"
    : existsSafe(path.join(ROOT, "settings.gradle")) ? "settings.gradle" : null;
  if (settingsFile && stack.language === "kotlin") {
    const sg = readFileSafe(path.join(ROOT, settingsFile));
    if (sg) {
      const sgClean = sg.split("\n").filter(l => !l.trimStart().startsWith("//")).join("\n");
      const includes = [];
      const includeBlocks = [...sgClean.matchAll(/include\s*\(([^)]*)\)/gs)];
      for (const block of includeBlocks) {
        const quotedValues = [...block[1].matchAll(/["']([^"']+)["']/g)].map(m => m[1]);
        includes.push(...quotedValues);
      }
      if (includes.length === 0) {
        const groovyIncludes = [...sgClean.matchAll(/include\s+(.+)/g)];
        for (const line of groovyIncludes) {
          const quotedValues = [...line[1].matchAll(/['"]([^'"]+)['"]/g)].map(m => m[1]);
          includes.push(...quotedValues);
        }
      }
      const cleanModules = includes.map(m => m.replace(/^:/, ""));
      if (cleanModules.length > 0) {
        stack.multiModule = true;
        stack.modules = cleanModules;
        stack.detected.push(`multi-module (${cleanModules.length} modules)`);
        const hasCommand = cleanModules.some(m => m.includes("command"));
        const hasQuery = cleanModules.some(m => m.includes("query"));
        const hasBff = cleanModules.some(m => m.includes("bff"));
        if (hasCommand && hasQuery) { stack.architecture = "cqrs"; stack.detected.push("cqrs"); }
        if (hasBff) { stack.detected.push("bff"); }
      }
    }
  }

  // ── Java: Maven ──
  if (existsSafe(path.join(ROOT, "pom.xml"))) {
    const pom = readFileSafe(path.join(ROOT, "pom.xml"));
    if (pom) {
      if (!stack.buildTool) { stack.buildTool = "maven"; stack.language = "java"; stack.detected.push("pom.xml"); }
      const sv = pom.match(/<spring-boot[^>]*version>([^<]+)/);
      if (sv) stack.frameworkVersion = sv[1];
      const jv = pom.match(/<java\.version>(\d+)/);
      if (jv) stack.languageVersion = jv[1];
      if (pom.includes("spring-boot") && !stack.framework) { stack.framework = "spring-boot"; stack.detected.push("spring-boot"); }
      detectFirst(stack, "orm", pom, MAVEN_ORM_RULES);
      // Maven DB: original does not push to detected (unlike Gradle)
      if (!stack.database && pom.includes("postgresql")) stack.database = "postgresql";
      if (!stack.database && pom.includes("mysql")) stack.database = "mysql";
      if (!stack.database && pom.includes("oracle")) stack.database = "oracle";
      if (!stack.database && pom.includes("mongodb")) stack.database = "mongodb";
      if (!stack.database && H2_REGEX.test(pom)) stack.database = "h2";
      if (!stack.database && pom.includes("sqlite")) stack.database = "sqlite";
    }
  }

  // ── Node.js ──
  if (existsSafe(path.join(ROOT, "package.json"))) {
    const pkg = readJsonSafe(path.join(ROOT, "package.json"));
    if (pkg) {
      stack.detected.push("package.json");

      // ── Monorepo detection ──
      // Detect monorepo markers: turbo.json, pnpm-workspace.yaml, lerna.json, package.json#workspaces
      if (existsSafe(path.join(ROOT, "turbo.json"))) { stack.monorepo = "turborepo"; stack.detected.push("turbo.json"); }
      else if (existsSafe(path.join(ROOT, "pnpm-workspace.yaml"))) { stack.monorepo = "pnpm-workspace"; stack.detected.push("pnpm-workspace.yaml"); }
      else if (existsSafe(path.join(ROOT, "lerna.json"))) { stack.monorepo = "lerna"; stack.detected.push("lerna.json"); }
      else if (pkg.workspaces) { stack.monorepo = "npm-workspaces"; stack.detected.push("npm-workspaces"); }
      if (stack.monorepo) {
        // Resolve workspace paths from package.json#workspaces or pnpm-workspace.yaml
        let wsPatterns = [];
        if (Array.isArray(pkg.workspaces)) wsPatterns = pkg.workspaces;
        else if (pkg.workspaces && Array.isArray(pkg.workspaces.packages)) wsPatterns = pkg.workspaces.packages;
        if (wsPatterns.length === 0 && existsSafe(path.join(ROOT, "pnpm-workspace.yaml"))) {
          const wy = readFileSafe(path.join(ROOT, "pnpm-workspace.yaml"));
          if (wy) {
            const wm = [...wy.matchAll(/- ['"]?([^'"#\n]+)['"]?/g)].map(m => m[1].trim());
            if (wm.length > 0) wsPatterns = wm;
          }
        }
        if (wsPatterns.length > 0) stack.workspaces = wsPatterns;
      }

      // Merge deps from root + sub-package package.json files (monorepo)
      // Sub-packages provide framework/frontend/ORM that root may lack
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };
      if (stack.monorepo) {
        const subPkgGlobs = ["{apps,packages}/*/package.json"];
        if (stack.workspaces) {
          for (const ws of stack.workspaces) {
            const wsGlob = ws.replace(/\/?\*?\*?$/, "/*/package.json");
            if (!subPkgGlobs.includes(wsGlob)) subPkgGlobs.push(wsGlob);
          }
        }
        for (const spg of subPkgGlobs) {
          const subPkgs = await glob(spg, { cwd: ROOT, ignore: ["**/node_modules/**"] });
          for (const sp of subPkgs) {
            const sub = readJsonSafe(path.join(ROOT, sp));
            if (sub) Object.assign(deps, sub.dependencies, sub.devDependencies);
          }
        }
      }

      if (!stack.language) stack.language = deps.typescript ? "typescript" : "javascript";
      if (deps.typescript) { stack.detected.push("typescript"); const tv = deps.typescript.match(/(\d+(?:\.\d+)*)/); if (tv) stack.languageVersion = tv[1]; }

      // Frontend (Angular checked before React — Angular projects may include react in devDependencies)
      const frontendRules = [
        ["next", "nextjs", "next.js"],
        ["@angular/core", "angular", "angular"],
        ["react", "react", "react"],
        ["vue", "vue", "vue"],
      ];
      for (const [dep, name, label] of frontendRules) {
        if (deps[dep] && !stack.frontend) {
          stack.frontend = name; stack.detected.push(label);
          stack.frontendVersion = deps[dep].replace(/[^0-9.]/g, "");
          break;
        }
      }

      // Backend framework (NestJS > Fastify > Express — more specific first)
      const frameworkRules = [
        ["@nestjs/core", "nestjs", "nestjs"],
        ["fastify", "fastify", "fastify"],
        ["express", "express", "express"],
      ];
      for (const [dep, name, label] of frameworkRules) {
        if (deps[dep] && !stack.framework) {
          stack.framework = name; stack.detected.push(label);
          if (dep !== "express") stack.frameworkVersion = deps[dep].replace(/[^0-9.]/g, "");
          break;
        }
      }

      // ORM
      for (const [depKeys, ormName] of NODE_ORM_RULES) {
        if (stack.orm) break;
        if (depKeys.some(d => deps[d])) {
          stack.orm = ormName; stack.detected.push(ormName);
        }
      }
      if (deps.mongoose) { if (!stack.database) stack.database = "mongodb"; if (!stack.orm) stack.orm = "mongoose"; stack.detected.push("mongoose"); }

      // DB
      const nodeDbRules = [["pg", "postgresql"], ["mysql2", "mysql"], ["mongodb", "mongodb"]];
      for (const [dep, db] of nodeDbRules) {
        if (deps[dep] && !stack.database) { stack.database = db; break; }
      }

      // Package manager
      stack.packageManager = existsSafe(path.join(ROOT, "pnpm-lock.yaml")) ? "pnpm"
        : existsSafe(path.join(ROOT, "yarn.lock")) ? "yarn" : "npm";

      if (pkg.engines && pkg.engines.node && !stack.languageVersion) {
        const nv = pkg.engines.node.match(/(\d+(?:\.\d+)*)/);
        if (nv) stack.languageVersion = nv[1];
      }
    }
  }

  // ── Python ──
  const hasPyproject = existsSafe(path.join(ROOT, "pyproject.toml"));
  const hasRequirements = existsSafe(path.join(ROOT, "requirements.txt"));
  if (hasPyproject || hasRequirements) {
    if (!stack.language) stack.language = "python";
    stack.detected.push("python");

    const pyFrameworkRules = [["django", "django"], ["fastapi", "fastapi"], ["flask", "flask"]];
    const pyOrmRules = [["sqlalchemy", "sqlalchemy"], ["tortoise", "tortoise-orm"]];

    if (hasPyproject) {
      const pp = readFileSafe(path.join(ROOT, "pyproject.toml"));
      if (pp) {
        const pv = pp.match(/python\s*=\s*"[><=^~]*(\d+\.\d+)/);
        if (pv && !stack.languageVersion) stack.languageVersion = pv[1];
        for (const [kw, name] of pyFrameworkRules) {
          if (pp.includes(kw) && !stack.framework) { stack.framework = name; stack.detected.push(name); break; }
        }
        for (const [kw, name] of pyOrmRules) {
          if (pp.includes(kw) && !stack.orm) { stack.orm = name; stack.detected.push(name); break; }
        }
        if (pp.includes("poetry")) { stack.packageManager = "poetry"; }
        if (pp.includes("pdm")) { stack.packageManager = "pdm"; }
      }
    }

    if (hasRequirements) {
      const r = readFileSafe(path.join(ROOT, "requirements.txt"));
      if (r) {
        for (const [kw, name] of pyFrameworkRules) {
          if (r.includes(kw) && !stack.framework) { stack.framework = name; stack.detected.push(name); break; }
        }
        for (const [kw, name] of pyOrmRules) {
          if (r.includes(kw) && !stack.orm) { stack.orm = name; break; }
        }
        if (r.includes("psycopg") && !stack.database) stack.database = "postgresql";
        if (r.includes("mysqlclient") && !stack.database) stack.database = "mysql";
      }
    }

    if (!stack.packageManager) {
      stack.packageManager = existsSafe(path.join(ROOT, "Pipfile")) ? "pipenv"
        : existsSafe(path.join(ROOT, "poetry.lock")) ? "poetry" : "pip";
    }
  }

  // ── DB from config files ──
  const ymls = await glob("**/application*.yml", { cwd: ROOT, absolute: true, ignore: ["**/node_modules/**", "**/build/**", "**/target/**", "**/.gradle/**"] });
  for (const y of ymls) {
    const c = readFileSafe(y);
    if (!c) continue;
    if (!stack.database && c.includes("postgresql")) stack.database = "postgresql";
    if (!stack.database && c.includes("mysql")) stack.database = "mysql";
    if (!stack.database && c.includes("oracle")) stack.database = "oracle";
    if (!stack.database && c.includes("mongodb")) stack.database = "mongodb";
    if (!stack.database && H2_REGEX.test(c)) stack.database = "h2";
    if (!stack.database && c.includes("sqlite")) stack.database = "sqlite";
    if (!stack.port) {
      const pm = c.match(/server:\s*\n\s*port:\s*(\d+)/) || c.match(/server\.port\s*[=:]\s*(\d+)/);
      if (pm) stack.port = parseInt(pm[1]);
    }
  }

  // .env
  for (const ef of [".env", ".env.local", ".env.development"]) {
    const ep = path.join(ROOT, ef);
    if (existsSafe(ep)) {
      const ec = readFileSafe(ep);
      if (ec && ec.includes("DATABASE_URL")) {
        // .env: original checks postgres (not postgresql), no oracle/h2
        if (ec.includes("postgres") && !stack.database) stack.database = "postgresql";
        if (ec.includes("mysql") && !stack.database) stack.database = "mysql";
        if (ec.includes("mongodb") && !stack.database) stack.database = "mongodb";
        if (ec.includes("sqlite") && !stack.database) stack.database = "sqlite";
      }
    }
  }

  // Prisma schema
  const prismaSchema = path.join(ROOT, "prisma/schema.prisma");
  if (existsSafe(prismaSchema)) {
    const ps = readFileSafe(prismaSchema);
    if (ps) {
      const prov = ps.match(/provider\s*=\s*"(\w+)"/);
      if (prov && !stack.database) {
        const db = { postgresql: "postgresql", mysql: "mysql", sqlite: "sqlite", mongodb: "mongodb" };
        if (db[prov[1]]) stack.database = db[prov[1]];
      }
    }
  }

  // ── Config file fallback (monorepo) ──
  const frontendFallbacks = [
    [["next.config.js", "next.config.mjs", "next.config.ts"], "nextjs", "next.config (fallback)"],
    [["vite.config.ts", "vite.config.js"], "react", "vite.config (fallback)"],
    [["nuxt.config.ts", "nuxt.config.js"], "vue", "nuxt.config (fallback)"],
    [["angular.json", ".angular.json"], "angular", "angular.json (fallback)"],
  ];
  if (!stack.frontend) {
    for (const [files, name, label] of frontendFallbacks) {
      if (files.some(f => existsSafe(path.join(ROOT, f)))) {
        stack.frontend = name; stack.detected.push(label);
        if (!stack.language) stack.language = "typescript";
        break;
      }
    }
  }

  return stack;
}

module.exports = { detectStack };
