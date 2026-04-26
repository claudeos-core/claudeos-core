# ClaudeOS-Core

[![npm version](https://img.shields.io/npm/v/claudeos-core.svg?logo=npm&label=npm)](https://www.npmjs.com/package/claudeos-core)
[![CI](https://img.shields.io/github/actions/workflow/status/claudeos-core/claudeos-core/test.yml?branch=master&logo=github&label=CI)](https://github.com/claudeos-core/claudeos-core/actions/workflows/test.yml)
[![tests](https://img.shields.io/badge/tests-736%20passing-brightgreen?logo=node.js&logoColor=white)](https://github.com/claudeos-core/claudeos-core/actions/workflows/test.yml)
[![node](https://img.shields.io/node/v/claudeos-core.svg?logo=node.js&logoColor=white&label=node)](https://nodejs.org/)
[![license](https://img.shields.io/npm/l/claudeos-core.svg?color=blue)](LICENSE)
[![downloads](https://img.shields.io/npm/dm/claudeos-core.svg?logo=npm&color=blue&label=downloads)](https://www.npmjs.com/package/claudeos-core)

**Una CLI deterministic que auto-genera `CLAUDE.md` + `.claude/rules/` desde tu código fuente real — Node.js scanner + 4-pass Claude pipeline + 5 validators. 12 stacks, 10 idiomas, sin paths inventados.**

```bash
npx claudeos-core init
```

Funciona en [**12 stacks**](#supported-stacks) (monorepos incluidos) — un solo comando, sin configuración, resume-safe, idempotente.

[🇺🇸 English](README.md) · [🇰🇷 한국어](README.ko.md) · [🇨🇳 中文](README.zh-CN.md) · [🇯🇵 日本語](README.ja.md) · [🇻🇳 Tiếng Việt](README.vi.md) · [🇮🇳 हिन्दी](README.hi.md) · [🇷🇺 Русский](README.ru.md) · [🇫🇷 Français](README.fr.md) · [🇩🇪 Deutsch](README.de.md)

---

## ¿Qué es esto?

Claude Code recurre a los valores por defecto del framework cada sesión. Tu equipo usa **MyBatis**, pero Claude escribe JPA. Tu wrapper es `ApiResponse.ok()`, pero Claude escribe `ResponseEntity.success()`. Tus paquetes son layer-first, pero Claude genera domain-first. Escribir a mano `.claude/rules/` para cada repo lo soluciona — hasta que el código evoluciona y tus rules empiezan a hacer drift.

**ClaudeOS-Core las regenera de forma deterministic, desde tu código fuente real.** Un Node.js scanner lee primero (stack, ORM, layout de paquetes, paths de archivos). Luego un 4-pass Claude pipeline escribe el conjunto completo — `CLAUDE.md` + `.claude/rules/` auto-cargado + standards + skills — restringido por un path allowlist explícito del que el LLM no puede escapar. Cinco validators verifican el output antes de que se entregue.

El resultado: misma entrada → output byte-identical, en cualquiera de 10 idiomas, sin paths inventados. (Detalles abajo en [Qué lo hace diferente](#qué-lo-hace-diferente).)

Una [Memory Layer](#memory-layer-opcional-para-proyectos-de-larga-duración) separada se siembra para proyectos de larga duración.

---

## Míralo en un proyecto real

Ejecutado en [`spring-boot-realworld-example-app`](https://github.com/gothinkster/spring-boot-realworld-example-app) — Java 11 · Spring Boot 2.6 · MyBatis · SQLite · 187 source files. Output: **75 generated files**, tiempo total **53 minutos**, todos los validators ✅.

<p align="center">
  <img src="docs/assets/spring-boot-realworld-demo.gif" alt="ClaudeOS-Core init running on spring-boot-realworld-example-app — stack detection, 4-pass pipeline, validators, completion summary" width="769">
</p>

<details>
<summary><strong>Salida de terminal (versión texto, para búsqueda y copia)</strong></summary>

```text
╔════════════════════════════════════════════════════╗
║       ClaudeOS-Core — Bootstrap (4-Pass)          ║
╚════════════════════════════════════════════════════╝
    Project root: spring-boot-realworld-example-app
    Language:     English (en)

  [Phase 1] Detecting stack...
    Language:    java 11
    Framework:   spring-boot 2.6.3
    Database:    sqlite
    ORM:         mybatis
    PackageMgr:  gradle

  [Phase 2] Scanning structure...
    Backend:     2 domains
    Total:       2 domains
    Package:     io.spring.infrastructure

  [Phase 5] Active domains...
    ✅ 00.core   ✅ 10.backend   ⏭️ 20.frontend
    ✅ 30.security-db   ✅ 40.infra
    ✅ 80.verification  ✅ 90.optional

[4] Pass 1 — Deep analysis per domain group...
    ✅ pass1-1.json created (5m 34s)
    [█████░░░░░░░░░░░░░░░] 25% (1/4)

[5] Pass 2 — Merging analysis results...
    ✅ pass2-merged.json created (4m 22s)
    [██████████░░░░░░░░░░] 50% (2/4)

[6] Pass 3 — Generating all files...
    Pass 3 split mode (3a → 3b → 3c → 3d-aux)
    ✅ 3a complete (2m 57s)            — pass3a-facts.md (187-path allowlist)
    ✅ 3b complete (18m 49s)           — CLAUDE.md + 19 standards + 20 rules
    ✅ 3c complete (12m 35s)           — 13 skills + 9 guides
    ✅ 3d-aux complete (3m 18s)        — database/ + mcp-guide/
    Pass 3 split complete: 4/4 stages successful
    [███████████████░░░░░] 75% (3/4)

[7] Pass 4 — Memory scaffolding...
    Pass 4 staged-rules: 6 rule files moved to .claude/rules/
    ✅ Pass 4 complete (5m)
       Gap-fill: all 12 expected files already present
    [████████████████████] 100% (4/4)

╔═══════════════════════════════════════╗
║  ClaudeOS-Core — Health Checker       ║
╚═══════════════════════════════════════╝
  ✅ plan-validator         pass
  ✅ sync-checker           pass
  ✅ content-validator      pass
  ✅ pass-json-validator    pass
  ✅ All systems operational

  [Lint] ✅ CLAUDE.md structure valid (25 checks)
  [Content] ✅ All content validation passed
            Total: 0 advisories, 0 notes

╔════════════════════════════════════════════════════╗
║  ✅ ClaudeOS-Core — Complete                       ║
║   Files created:     75                           ║
║   Domains analyzed:  1 group                      ║
║   L4 scaffolded:     memory + rules               ║
║   Output language:   English                      ║
║   Total time:        53m 8s                       ║
╚════════════════════════════════════════════════════╝
```

</details>

<details>
<summary><strong>Lo que termina en tu <code>CLAUDE.md</code> (extracto real — Sección 1 + 2)</strong></summary>

```markdown
# CLAUDE.md — spring-boot-realworld-example-app

> Reference implementation of the RealWorld backend specification on
> Java 11 + Spring Boot 2.6, exposing both REST and GraphQL endpoints
> over a hexagonal MyBatis persistence layer.

#### 1. Role Definition

As the senior developer for this repository, you are responsible for
writing, modifying, and reviewing code. Responses must be written in English.
A Java Spring Boot REST + GraphQL API server organized around a hexagonal
(ports & adapters) architecture, with a CQRS-lite read/write split inside
an XML-driven MyBatis persistence layer and JWT-based authentication.

#### 2. Project Overview

| Item | Value |
|---|---|
| Language | Java 11 |
| Framework | Spring Boot 2.6.3 |
| Build Tool | Gradle (Groovy DSL) |
| Persistence | MyBatis 3 via `mybatis-spring-boot-starter:2.2.2` (no JPA) |
| Database | SQLite (`org.xerial:sqlite-jdbc:3.36.0.3`) — `dev.db` (default), `:memory:` (test) |
| Migration | Flyway — single baseline `V1__create_tables.sql` |
| API Style | REST (`io.spring.api.*`) + GraphQL via Netflix DGS `:4.9.21` |
| Authentication | JWT HS512 (`jjwt-api:0.11.2`) + Spring Security `PasswordEncoder` |
| Server Port | 8080 (default) |
| Test Stack | JUnit Jupiter 5, Mockito, AssertJ, rest-assured, spring-mock-mvc |
```

Cada valor de arriba — coordenadas exactas de dependencies, el nombre de archivo `dev.db`, el nombre de migración `V1__create_tables.sql`, "no JPA" — es extraído por el scanner desde `build.gradle` / `application.properties` / el árbol de fuentes antes de que Claude escriba el archivo. Nada se adivina.

</details>

<details>
<summary><strong>Una rule auto-cargada real (<code>.claude/rules/10.backend/01.controller-rules.md</code>)</strong></summary>

````markdown
---
paths:
  - "**/*"
---

#### Controller Rules

##### REST (`io.spring.api.*`)

- Controllers are the SOLE response wrapper for HTTP — no aggregator/facade above them.
  Return `ResponseEntity<?>` or a body Spring serializes via `JacksonCustomizations`.
- Each controller method calls exactly ONE application service method. Multi-source
  composition lives in the application service.
- Controllers MUST NOT import `io.spring.infrastructure.*`. No direct `@Mapper` access.
- Validate command-param arguments with `@Valid`. Custom JSR-303 constraints live under
  `io.spring.application.{aggregate}.*`.
- Resolve the current user via `@AuthenticationPrincipal User`.
- Let exceptions propagate to `io.spring.api.exception.CustomizeExceptionHandler`
  (`@ControllerAdvice`). Do NOT `try/catch` business exceptions inside the controller.

##### GraphQL (`io.spring.graphql.*`)

- DGS components (`@DgsComponent`) are the sole GraphQL response wrappers.
  Use `@DgsQuery` / `@DgsData` / `@DgsMutation`.
- Resolve the current user via `io.spring.graphql.SecurityUtil.getCurrentUser()`.

##### Examples

✅ Correct:
```java
@PostMapping
public ResponseEntity<?> createArticle(@AuthenticationPrincipal User user,
                                       @Valid @RequestBody NewArticleParam param) {
    Article article = articleCommandService.createArticle(param, user);
    ArticleData data = articleQueryService.findById(article.getId(), user)
        .orElseThrow(ResourceNotFoundException::new);
    return ResponseEntity.ok(Map.of("article", data));
}
```

❌ Incorrect:
```java
@PostMapping
public ResponseEntity<?> create(@RequestBody NewArticleParam p) {
    try {
        articleCommandService.createArticle(p, currentUser);
    } catch (Exception e) {                                      // NO — let CustomizeExceptionHandler handle it
        return ResponseEntity.status(500).body(e.getMessage());  // NO — leaks raw message
    }
    return ResponseEntity.ok().build();
}
```
````

El glob `paths: ["**/*"]` significa que Claude Code auto-carga esta rule cada vez que editas cualquier archivo del proyecto. Cada nombre de clase, path de paquete y exception handler de la rule viene directamente del código escaneado — incluyendo el `CustomizeExceptionHandler` y `JacksonCustomizations` reales del proyecto.

</details>

<details>
<summary><strong>Una semilla auto-generada de <code>decision-log.md</code> (extracto real)</strong></summary>

```markdown
#### 2026-04-26 — Hexagonal ports & adapters with MyBatis-only persistence

- **Context:** `io.spring.core.*` exposes `*Repository` ports (e.g.,
  `io.spring.core.article.ArticleRepository`) implemented by
  `io.spring.infrastructure.repository.MyBatis*Repository` adapters.
  The domain layer has zero `org.springframework.*` /
  `org.apache.ibatis.*` / `io.spring.infrastructure.*` imports.
- **Options considered:** JPA/Hibernate, Spring Data, MyBatis-Plus
  `BaseMapper`. None adopted.
- **Decision:** MyBatis 3 (`mybatis-spring-boot-starter:2.2.2`) with
  hand-written XML statements under `src/main/resources/mapper/*.xml`.
  Hexagonal port/adapter wiring keeps the domain framework-free.
- **Consequences:** Every SQL lives in XML — `@Select`/`@Insert`/`@Update`/`@Delete`
  annotations are forbidden. New aggregates require both a
  `core.{aggregate}.{Aggregate}Repository` port AND a
  `MyBatis{Aggregate}Repository` adapter; introducing a JPA repository would
  split the persistence model.
```

Pass 4 siembra `decision-log.md` con las decisiones arquitectónicas extraídas de `pass2-merged.json` para que las sesiones futuras recuerden *por qué* la base de código se ve como se ve — no solo *cómo* se ve. Cada opción ("JPA/Hibernate", "MyBatis-Plus") y cada consecuencia está fundamentada en el bloque real de dependencies de `build.gradle`.

</details>

---

## Probado en

ClaudeOS-Core viene con benchmarks de referencia sobre proyectos OSS reales. Si lo has usado en un repo público, por favor [abre un issue](https://github.com/claudeos-core/claudeos-core/issues) — lo añadiremos a esta tabla.

| Proyecto | Stack | Scanned → Generated | Estado |
|---|---|---|---|
| [`spring-boot-realworld-example-app`](https://github.com/gothinkster/spring-boot-realworld-example-app) | Java 11 · Spring Boot 2.6 · MyBatis · SQLite | 187 → 75 files | ✅ los 5 validators pasan |

---

## Inicio rápido

**Prerrequisitos:** Node.js 18+, [Claude Code](https://docs.anthropic.com/en/docs/claude-code) instalado y autenticado.

```bash
# 1. Ve a la raíz de tu proyecto
cd my-spring-boot-project

# 2. Ejecuta init (esto analiza tu código y le pide a Claude que escriba las rules)
npx claudeos-core init

# 3. Listo. Abre Claude Code y empieza a programar — tus rules ya están cargadas.
```

**Lo que obtienes** después de que `init` termina:

```
your-project/
├── .claude/
│   └── rules/                    ← Auto-cargado por Claude Code
│       ├── 00.core/              (rules generales — naming, arquitectura)
│       ├── 10.backend/           (rules del stack backend, si las hay)
│       ├── 20.frontend/           (rules del stack frontend, si las hay)
│       ├── 30.security-db/       (convenciones de seguridad y DB)
│       ├── 40.infra/             (env, logging, CI/CD)
│       ├── 50.sync/              (recordatorios de doc-sync — solo rules)
│       ├── 60.memory/            (memory rules — Pass 4, solo rules)
│       ├── 70.domains/{type}/    (rules por dominio, type = backend|frontend)
│       └── 80.verification/      (estrategia de testing + recordatorios de verificación de build)
├── claudeos-core/
│   ├── standard/                 ← Docs de referencia (refleja la estructura de categorías)
│   │   ├── 00.core/              (resumen del proyecto, arquitectura, naming)
│   │   ├── 10.backend/           (referencia backend — si hay stack backend)
│   │   ├── 20.frontend/          (referencia frontend — si hay stack frontend)
│   │   ├── 30.security-db/       (referencia de seguridad y DB)
│   │   ├── 40.infra/             (referencia de env / logging / CI-CD)
│   │   ├── 70.domains/{type}/    (referencia por dominio)
│   │   ├── 80.verification/      (referencia de build / startup / testing — solo standard)
│   │   └── 90.optional/          (extras específicos del stack — solo standard)
│   ├── skills/                   (patrones reutilizables que Claude puede aplicar)
│   ├── guide/                    (guías how-to para tareas comunes)
│   ├── database/                 (resumen del schema, guía de migración)
│   ├── mcp-guide/                (notas de integración MCP)
│   └── memory/                   (decision log, failure patterns, compaction)
└── CLAUDE.md                     (el índice que Claude lee primero)
```

Las categorías que comparten el mismo prefijo numérico entre `rules/` y `standard/` representan la misma área conceptual (ej.: rules `10.backend` ↔ standards `10.backend`). Categorías solo de rules: `50.sync` (recordatorios de doc sync) y `60.memory` (memory de Pass 4). Categoría solo de standard: `90.optional` (extras específicos del stack sin enforcement). Todos los demás prefijos (`00`, `10`, `20`, `30`, `40`, `70`, `80`) aparecen en AMBOS `rules/` y `standard/`. Claude Code ahora conoce tu proyecto.

---

## ¿Para quién es esto?

| Eres... | El dolor que esto elimina |
|---|---|
| **Un dev en solitario** que empieza un nuevo proyecto con Claude Code | "Enseñarle a Claude mis convenciones cada sesión" — desaparece. `CLAUDE.md` + `.claude/rules/` de 8 categorías generados de una sola pasada. |
| **Un team lead** que mantiene estándares compartidos entre repos | Drift de `.claude/rules/` cuando alguien renombra paquetes, cambia ORMs o response wrappers. ClaudeOS-Core re-sincroniza de forma deterministic — misma entrada, output byte-identical, sin ruido en el diff. |
| **Ya usas Claude Code** pero estás cansado de arreglar el código generado | Wrapper de respuesta incorrecto, layout de paquete equivocado, JPA cuando usas MyBatis, `try/catch` desperdigado cuando tu proyecto usa middleware centralizado. El scanner extrae tus convenciones reales; cada Claude pass se ejecuta contra un path allowlist explícito. |
| **Onboarding a un nuevo repo** (proyecto existente, te incorporas a un equipo) | Ejecuta `init` en el repo, obtén un mapa arquitectónico vivo: tabla de stack en CLAUDE.md, rules por capa con ejemplos ✅/❌, decision log sembrado con el "porqué" detrás de las decisiones mayores (JPA vs MyBatis, REST vs GraphQL, etc.). Leer 5 archivos vence a leer 5.000 archivos fuente. |
| **Trabajando en coreano / japonés / chino / 7 idiomas más** | La mayoría de generadores de rules de Claude Code son solo en inglés. ClaudeOS-Core escribe el conjunto completo en **10 idiomas** (`en/ko/ja/zh-CN/es/vi/hi/ru/fr/de`) con **validación estructural byte-identical** — mismo veredicto de `claude-md-validator` independientemente del idioma de salida. |
| **Trabajando en un monorepo** (Turborepo, pnpm/yarn workspaces, Lerna) | Dominios backend + frontend analizados en una sola ejecución con prompts separados; `apps/*/` y `packages/*/` recorridos automáticamente; rules por stack emitidas bajo `70.domains/{type}/`. |
| **Contribuyendo a OSS o experimentando** | El output es gitignore-friendly — `claudeos-core/` es tu directorio de trabajo local, solo `CLAUDE.md` + `.claude/` necesitan entregarse. Resume-safe si se interrumpe; idempotente en re-ejecuciones (tus ediciones manuales a las rules sobreviven sin `--force`). |

**No encaja si:** quieres un bundle preset one-size-fits-all de agents/skills/rules que funcione el día uno sin paso de scan (ver [docs/es/comparison.md](docs/es/comparison.md) para qué encaja dónde), tu proyecto aún no coincide con uno de los [stacks soportados](#supported-stacks), o solo necesitas un único `CLAUDE.md` (el `claude /init` integrado es suficiente — no hace falta instalar otra herramienta).

---

## ¿Cómo funciona?

ClaudeOS-Core invierte el flujo habitual de Claude Code:

```
Habitual: Tú describes el proyecto → Claude adivina tu stack → Claude escribe docs
Esto:     El código lee tu stack → El código pasa hechos confirmados a Claude → Claude escribe docs desde hechos
```

El pipeline corre en **tres etapas**, con código a ambos lados de la llamada al LLM:

**1. Step A — Scanner (deterministic, sin LLM).** Un Node.js scanner recorre la raíz de tu proyecto, lee `package.json` / `build.gradle` / `pom.xml` / `pyproject.toml`, parsea archivos `.env*` (con redacción de variables sensibles para `PASSWORD/SECRET/TOKEN/JWT_SECRET/...`), clasifica tu pattern de arquitectura (los 5 patterns A/B/C/D/E de Java, Kotlin CQRS / multi-module, Next.js App vs. Pages Router, FSD, components-pattern), descubre dominios y construye un allowlist explícito con cada path de archivo fuente que existe. Output: `project-analysis.json` — la única source of truth para lo que sigue.

**2. Step B — 4-Pass Claude pipeline (restringido por los hechos del Step A).**
- **Pass 1** lee archivos representativos por grupo de dominios y extrae ~50–100 convenciones por dominio — response wrappers, librerías de logging, manejo de errores, convenciones de naming, patterns de testing. Se ejecuta una vez por grupo de dominios (`max 4 domains, 40 files per group`) para que el contexto nunca desborde.
- **Pass 2** fusiona todo el análisis por-dominio en una imagen del proyecto entera y resuelve desacuerdos eligiendo la convención dominante.
- **Pass 3** escribe `CLAUDE.md` + `.claude/rules/` + `claudeos-core/standard/` + skills + guides — dividido en stages (`3a` facts → `3b-core/3b-N` rules+standards → `3c-core/3c-N` skills+guides → `3d-aux` database+mcp-guide) para que el prompt de cada stage entre en la context window del LLM incluso cuando `pass2-merged.json` es grande. Sub-divide 3b/3c en lotes de ≤15 dominios para proyectos con ≥16 dominios.
- **Pass 4** siembra la L4 memory layer (`decision-log.md`, `failure-patterns.md`, `compaction.md`, `auto-rule-update.md`) y añade rules universales de scaffold. A Pass 4 le está **prohibido modificar `CLAUDE.md`** — la Sección 8 de Pass 3 es authoritative.

**3. Step C — Verificación (deterministic, sin LLM).** Cinco validators revisan el output:
- `claude-md-validator` — 25 chequeos estructurales sobre `CLAUDE.md` (8 secciones, conteos H3/H4, unicidad de archivos de memory, invariante T1 de heading canónico). Language-invariant: mismo veredicto independientemente de `--lang`.
- `content-validator` — 10 chequeos de contenido incluyendo verificación de path-claim (`STALE_PATH` atrapa referencias inventadas tipo `src/...`) y detección de drift de MANIFEST.
- `pass-json-validator` — well-formedness JSON de Pass 1/2/3/4 + conteo de secciones stack-aware.
- `plan-validator` — consistencia plan ↔ disco (legacy, mayormente no-op desde v2.1.0).
- `sync-checker` — consistencia de registro disco ↔ `sync-map.json` a través de 7 directorios rastreados.

Tres niveles de severidad (`fail` / `warn` / `advisory`) para que las warnings nunca bloqueen el CI por hallucinations del LLM que el usuario puede corregir manualmente.

El invariante que lo une todo: **Claude solo puede citar paths que existen realmente en tu código**, porque Step A le entrega un allowlist finito. Si el LLM aún intenta inventar algo (raro pero pasa con ciertos seeds), Step C lo atrapa antes de que los docs se entreguen.

Para detalles per-pass, resume basado en markers, el workaround de staged-rules para el bloque de path sensible `.claude/` de Claude Code, y los internals de detección de stack, ver [docs/es/architecture.md](docs/es/architecture.md).

---

## Supported Stacks

12 stacks, auto-detectados desde los archivos de tu proyecto:

**Backend:** Java/Spring Boot · Kotlin/Spring Boot · Node/Express · Node/Fastify · Node/NestJS · Python/Django · Python/FastAPI · Python/Flask

**Frontend:** Node/Next.js · Node/Vite · Angular · Vue/Nuxt

Los proyectos multi-stack (ej.: backend Spring Boot + frontend Next.js) funcionan out of the box.

Para reglas de detección y qué extrae cada scanner, ver [docs/es/stacks.md](docs/es/stacks.md).

---

## Flujo diario

Tres comandos cubren ~95% del uso:

```bash
# Primera vez en un proyecto
npx claudeos-core init

# Después de que editaste manualmente standards o rules
npx claudeos-core lint

# Health check (ejecutar antes de commits, o en CI)
npx claudeos-core health
```

Para las opciones completas de cada comando, ver [docs/es/commands.md](docs/es/commands.md). Los comandos de memory layer (`memory compact`, `memory propose-rules`) están documentados en la sección [Memory Layer](#memory-layer-opcional-para-proyectos-de-larga-duración) abajo.

---

## Qué lo hace diferente

La mayoría de las herramientas de documentación de Claude Code generan desde una descripción (tú le dices a la herramienta, la herramienta le dice a Claude). ClaudeOS-Core genera desde tu código fuente real (la herramienta lee, la herramienta le dice a Claude qué está confirmado, Claude escribe solo lo confirmado).

Tres consecuencias concretas:

1. **Detección de stack deterministic.** Mismo proyecto + mismo código = mismo output. Nada de "esta vez Claude tiró distinto."
2. **Sin paths inventados.** El prompt de Pass 3 lista explícitamente cada path fuente permitido; Claude no puede citar paths que no existen.
3. **Multi-stack aware.** Los dominios backend y frontend usan prompts de análisis distintos en la misma ejecución.

Para una comparación lado a lado de scope con otras herramientas, ver [docs/es/comparison.md](docs/es/comparison.md). La comparación trata sobre **qué hace cada herramienta**, no **cuál es mejor** — la mayoría son complementarias.

---

## Verificación (post-generación)

Después de que Claude escribe los docs, el código los verifica. Cinco validators independientes:

| Validator | Qué chequea | Ejecutado por |
|---|---|---|
| `claude-md-validator` | Invariantes estructurales de CLAUDE.md (8 secciones, language-invariant) | `claudeos-core lint` |
| `content-validator` | Los path claims existen realmente; consistencia de manifest | `health` (advisory) |
| `pass-json-validator` | Outputs de Pass 1 / 2 / 3 / 4 son JSON well-formed | `health` (warn) |
| `plan-validator` | El plan guardado coincide con lo que hay en disco | `health` (fail-on-error) |
| `sync-checker` | Los archivos en disco coinciden con los registros de `sync-map.json` (detección de orphaned/unregistered) | `health` (fail-on-error) |

Un `health-checker` orquesta los cuatro validators de runtime con tres niveles de severidad (fail / warn / advisory) y termina con el código apropiado para CI. `claude-md-validator` corre por separado vía el comando `lint` ya que el drift estructural es una señal de re-init, no una soft warning. Ejecutable en cualquier momento:

```bash
npx claudeos-core health
```

Para los chequeos detallados de cada validator, ver [docs/es/verification.md](docs/es/verification.md).

---

## Memory Layer (opcional, para proyectos de larga duración)

Más allá del pipeline de scaffolding de arriba, ClaudeOS-Core siembra una carpeta `claudeos-core/memory/` para proyectos donde el contexto sobrevive a una sola sesión. Es opcional — puedes ignorarla si todo lo que quieres es `CLAUDE.md` + rules.

Cuatro archivos, todos escritos por Pass 4:

- `decision-log.md` — append-only "por qué elegimos X sobre Y", sembrado desde `pass2-merged.json`
- `failure-patterns.md` — errores recurrentes con scores de frequency/importance
- `compaction.md` — cómo se auto-compacta la memory con el tiempo
- `auto-rule-update.md` — patterns que deberían convertirse en nuevas rules

Dos comandos mantienen esta capa con el tiempo:

```bash
# Compactar el log de failure-patterns (ejecutar periódicamente)
npx claudeos-core memory compact

# Promover failure patterns frecuentes a rules propuestas
npx claudeos-core memory propose-rules
```

Para el modelo de memory y su ciclo de vida, ver [docs/es/memory-layer.md](docs/es/memory-layer.md).

---

## FAQ

**Q: ¿Necesito una API key de Claude?**
A: No. ClaudeOS-Core usa tu instalación existente de Claude Code — pipea prompts a `claude -p` en tu máquina. Sin cuentas extra.

**Q: ¿Esto sobrescribirá mi CLAUDE.md o `.claude/rules/` existentes?**
A: Primera ejecución en un proyecto fresco: los crea. Re-ejecutar sin `--force` preserva tus ediciones — los pass markers de la ejecución anterior se detectan y los passes se saltan. Re-ejecutar con `--force` borra y regenera todo (tus ediciones se pierden — eso significa `--force`). Ver [docs/es/safety.md](docs/es/safety.md).

**Q: Mi stack no está soportado. ¿Puedo añadir uno?**
A: Sí. Los nuevos stacks necesitan ~3 prompt templates + un domain scanner. Ver [CONTRIBUTING.md](CONTRIBUTING.md) para la guía de 8 pasos.

**Q: ¿Cómo genero docs en coreano (u otro idioma)?**
A: `npx claudeos-core init --lang ko`. 10 idiomas soportados: en, ko, ja, zh-CN, es, vi, hi, ru, fr, de.

**Q: ¿Funciona con monorepos?**
A: Sí — Turborepo (`turbo.json`), pnpm workspaces (`pnpm-workspace.yaml`), Lerna (`lerna.json`) y npm/yarn workspaces (`package.json#workspaces`) son detectados por el stack-detector. Cada app obtiene su propio análisis. Otros layouts de monorepo (ej.: NX) no se detectan específicamente, pero los patterns genéricos `apps/*/` y `packages/*/` siguen siendo recogidos por los scanners por stack.

**Q: ¿Y si Claude Code genera rules con las que no estoy de acuerdo?**
A: Edítalas directamente. Luego ejecuta `npx claudeos-core lint` para verificar que CLAUDE.md sigue siendo estructuralmente válido. Tus ediciones se preservan en ejecuciones posteriores de `init` (sin `--force`) — el mecanismo de resume salta los passes cuyos markers existen.

**Q: ¿Dónde reporto bugs?**
A: [GitHub Issues](https://github.com/claudeos-core/claudeos-core/issues). Para problemas de seguridad, ver [SECURITY.md](SECURITY.md).

---

## Si esto te ahorró tiempo

Una ⭐ en GitHub mantiene visible el proyecto y ayuda a otros a encontrarlo. Issues, PRs y contribuciones de stack templates son todas bienvenidas — ver [CONTRIBUTING.md](CONTRIBUTING.md).

---

## Documentación

| Tema | Lee esto |
|---|---|
| Cómo funciona el 4-pass pipeline (más profundo que el diagrama) | [docs/es/architecture.md](docs/es/architecture.md) |
| Diagramas visuales (Mermaid) de la arquitectura | [docs/es/diagrams.md](docs/es/diagrams.md) |
| Detección de stack — qué busca cada scanner | [docs/es/stacks.md](docs/es/stacks.md) |
| Memory layer — decision logs y failure patterns | [docs/es/memory-layer.md](docs/es/memory-layer.md) |
| Los 5 validators en detalle | [docs/es/verification.md](docs/es/verification.md) |
| Cada comando CLI y sus opciones | [docs/es/commands.md](docs/es/commands.md) |
| Instalación manual (sin `npx`) | [docs/es/manual-installation.md](docs/es/manual-installation.md) |
| Overrides del scanner — `.claudeos-scan.json` | [docs/es/advanced-config.md](docs/es/advanced-config.md) |
| Seguridad: qué se preserva en re-init | [docs/es/safety.md](docs/es/safety.md) |
| Comparación con herramientas similares (scope, no calidad) | [docs/es/comparison.md](docs/es/comparison.md) |
| Errores y recuperación | [docs/es/troubleshooting.md](docs/es/troubleshooting.md) |

---

## Contribuir

Las contribuciones son bienvenidas — añadir soporte de stack, mejorar prompts, arreglar bugs. Ver [CONTRIBUTING.md](CONTRIBUTING.md).

Para el Code of Conduct y la política de seguridad, ver [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) y [SECURITY.md](SECURITY.md).

## Licencia

[ISC License](LICENSE). Libre para cualquier uso, incluyendo comercial. © 2025–2026 ClaudeOS-Core contributors.

---

<sub>Mantenido por el equipo de [claudeos-core](https://github.com/claudeos-core). Issues y PRs en <https://github.com/claudeos-core/claudeos-core>.</sub>
