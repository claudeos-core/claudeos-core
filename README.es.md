# ClaudeOS-Core

[![npm version](https://img.shields.io/npm/v/claudeos-core.svg?logo=npm&label=npm)](https://www.npmjs.com/package/claudeos-core)
[![CI](https://img.shields.io/github/actions/workflow/status/claudeos-core/claudeos-core/test.yml?branch=master&logo=github&label=CI)](https://github.com/claudeos-core/claudeos-core/actions/workflows/test.yml)
[![tests](https://img.shields.io/badge/tests-736%20passing-brightgreen?logo=node.js&logoColor=white)](https://github.com/claudeos-core/claudeos-core/actions/workflows/test.yml)
[![node](https://img.shields.io/node/v/claudeos-core.svg?logo=node.js&logoColor=white&label=node)](https://nodejs.org/)
[![license](https://img.shields.io/npm/l/claudeos-core.svg?color=blue)](LICENSE)
[![downloads](https://img.shields.io/npm/dm/claudeos-core.svg?logo=npm&color=blue&label=downloads)](https://www.npmjs.com/package/claudeos-core)

**Haz que Claude Code siga las convenciones de TU proyecto al primer intento — no los valores predeterminados genéricos.**

Un scanner determinístico de Node.js lee tu código primero; luego una pipeline de Claude de 4 pasadas escribe el conjunto completo — `CLAUDE.md` + `.claude/rules/` auto-cargado + standards + skills + L4 memory. 10 idiomas de salida, 5 validators post-generación, y un allowlist explícito de rutas que impide al LLM inventar archivos o frameworks que no están en tu código.

Funciona en [**12 stacks**](#supported-stacks) (monorepos incluidos) — un solo comando `npx`, sin configuración, resume-safe, idempotente.

```bash
npx claudeos-core init
```

[🇺🇸 English](README.md) · [🇰🇷 한국어](README.ko.md) · [🇨🇳 中文](README.zh-CN.md) · [🇯🇵 日本語](README.ja.md) · [🇻🇳 Tiếng Việt](README.vi.md) · [🇮🇳 हिन्दी](README.hi.md) · [🇷🇺 Русский](README.ru.md) · [🇫🇷 Français](README.fr.md) · [🇩🇪 Deutsch](README.de.md)

---

## ¿Qué es esto?

Usas Claude Code. Es potente, pero cada sesión empieza desde cero — no tiene memoria de cómo está estructurado _tu_ proyecto. Así que recurre a valores predeterminados "generalmente buenos" que rara vez coinciden con lo que tu equipo realmente hace:

- Tu equipo usa **MyBatis**, pero Claude genera repositorios JPA.
- Tu wrapper de respuesta es `ApiResponse.ok()`, pero Claude escribe `ResponseEntity.success()`.
- Tus paquetes son layer-first (`controller/order/`), pero Claude crea domain-first (`order/controller/`).
- Tus errores pasan por middleware centralizado, pero Claude esparce `try/catch` por cada endpoint.

Te gustaría tener un set de `.claude/rules/` por proyecto — Claude Code lo carga automáticamente cada sesión — pero escribir esas reglas a mano para cada repo nuevo lleva horas, y se desactualizan a medida que el código evoluciona.

**ClaudeOS-Core las escribe por ti, desde tu código fuente real.** Un scanner determinístico de Node.js lee tu proyecto primero (stack, ORM, layout de paquetes, convenciones, rutas de archivos). Luego una pipeline de Claude de 4 pasadas convierte los hechos extraídos en un conjunto de documentación completo:

- **`CLAUDE.md`** — el índice del proyecto que Claude lee en cada sesión
- **`.claude/rules/`** — reglas auto-cargadas por categoría (`00.core` / `10.backend` / `20.frontend` / `30.security-db` / `40.infra` / `60.memory` / `70.domains` / `80.verification`)
- **`claudeos-core/standard/`** — documentos de referencia (el "por qué" detrás de cada regla)
- **`claudeos-core/skills/`** — patrones reutilizables (CRUD scaffolding, plantillas de página)
- **`claudeos-core/memory/`** — decision log + failure patterns que crecen con el proyecto

Como el scanner le entrega a Claude un allowlist explícito de rutas, el LLM **no puede inventar archivos o frameworks que no estén en tu código**. Cinco validators post-generación (`claude-md-validator`, `content-validator`, `pass-json-validator`, `plan-validator`, `sync-checker`) verifican la salida antes de que se envíe — language-invariant, así que las mismas reglas se aplican generes en inglés, español, o cualquiera de los otros 8 idiomas.

```
Antes:    Tú → Claude Code → código "generalmente bueno" → corrección manual cada vez
Después:  Tú → Claude Code → código que coincide con TU proyecto → listo para enviar
```

---

## Velo en un proyecto real

Ejecutado en [`spring-boot-realworld-example-app`](https://github.com/gothinkster/spring-boot-realworld-example-app) — Java 11 · Spring Boot 2.6 · MyBatis · SQLite · 187 archivos fuente. Salida: **75 archivos generados**, tiempo total **53 minutos**, todos los validators ✅.

<p align="center">
  <img src="docs/assets/spring-boot-realworld-demo.gif" alt="ClaudeOS-Core init running on spring-boot-realworld-example-app — stack detection, 4-pass pipeline, validators, completion summary" width="769">
</p>

<details>
<summary><strong>📺 Salida del terminal (versión texto, para búsqueda y copia)</strong></summary>

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
    🚀 Pass 3 split mode (3a → 3b → 3c → 3d-aux)
    ✅ 3a complete (2m 57s)            — pass3a-facts.md (187-path allowlist)
    ✅ 3b complete (18m 49s)           — CLAUDE.md + 19 standards + 20 rules
    ✅ 3c complete (12m 35s)           — 13 skills + 9 guides
    ✅ 3d-aux complete (3m 18s)        — database/ + mcp-guide/
    🎉 Pass 3 split complete: 4/4 stages successful
    [███████████████░░░░░] 75% (3/4)

[7] Pass 4 — Memory scaffolding...
    📦 Pass 4 staged-rules: 6 rule files moved to .claude/rules/
    ✅ Pass 4 complete (5m)
       📋 Gap-fill: all 12 expected files already present
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
<summary><strong>📄 Lo que termina en tu <code>CLAUDE.md</code> (extracto real — Section 1 + 2)</strong></summary>

```markdown
# CLAUDE.md — spring-boot-realworld-example-app

> Reference implementation of the RealWorld backend specification on
> Java 11 + Spring Boot 2.6, exposing both REST and GraphQL endpoints
> over a hexagonal MyBatis persistence layer.

## 1. Role Definition

As the senior developer for this repository, you are responsible for
writing, modifying, and reviewing code. Responses must be written in English.
A Java Spring Boot REST + GraphQL API server organized around a hexagonal
(ports & adapters) architecture, with a CQRS-lite read/write split inside
an XML-driven MyBatis persistence layer and JWT-based authentication.

## 2. Project Overview

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

Cada valor de arriba — coordenadas exactas de dependencias, el nombre de archivo `dev.db`, el nombre de la migración `V1__create_tables.sql`, "no JPA" — es extraído por el scanner desde `build.gradle` / `application.properties` / el árbol de fuentes antes de que Claude escriba el archivo. Nada se adivina.

</details>

<details>
<summary><strong>🛡️ Una regla auto-cargada real (<code>.claude/rules/10.backend/01.controller-rules.md</code>)</strong></summary>

````markdown
---
paths:
  - "**/*"
---

# Controller Rules

## REST (`io.spring.api.*`)

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

## GraphQL (`io.spring.graphql.*`)

- DGS components (`@DgsComponent`) are the sole GraphQL response wrappers.
  Use `@DgsQuery` / `@DgsData` / `@DgsMutation`.
- Resolve the current user via `io.spring.graphql.SecurityUtil.getCurrentUser()`.

## Examples

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

El glob `paths: ["**/*"]` significa que Claude Code carga automáticamente esta regla cada vez que editas cualquier archivo del proyecto. Cada nombre de clase, ruta de paquete, y exception handler en la regla viene directamente del código fuente escaneado — incluyendo el `CustomizeExceptionHandler` y `JacksonCustomizations` reales del proyecto.

</details>

<details>
<summary><strong>🧠 Un seed auto-generado de <code>decision-log.md</code> (extracto real)</strong></summary>

```markdown
## 2026-04-26 — Hexagonal ports & adapters with MyBatis-only persistence

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

Pass 4 inicializa `decision-log.md` con las decisiones arquitectónicas extraídas de `pass2-merged.json`, así las sesiones futuras recuerdan *por qué* el código se ve como se ve — no solo *cómo* se ve. Cada opción ("JPA/Hibernate", "MyBatis-Plus") y cada consecuencia están fundamentadas en el bloque real de dependencias de `build.gradle`.

</details>

---

## Quick Start

**Requisitos previos:** Node.js 18+, [Claude Code](https://docs.anthropic.com/en/docs/claude-code) instalado y autenticado.

```bash
# 1. Ve a la raíz de tu proyecto
cd my-spring-boot-project

# 2. Ejecuta init (esto analiza tu código y le pide a Claude que escriba las reglas)
npx claudeos-core init

# 3. Listo. Abre Claude Code y empieza a programar — tus reglas ya están cargadas.
```

**Lo que obtienes** después de que `init` termina:

```
your-project/
├── .claude/
│   └── rules/                    ← Auto-cargado por Claude Code
│       ├── 00.core/              (reglas generales — naming, arquitectura)
│       ├── 10.backend/           (reglas de stack backend, si las hay)
│       ├── 20.frontend/          (reglas de stack frontend, si las hay)
│       ├── 30.security-db/       (convenciones de seguridad y DB)
│       ├── 40.infra/             (env, logging, CI/CD)
│       ├── 50.sync/              (recordatorios de doc-sync — solo rules)
│       ├── 60.memory/            (reglas de memoria — Pass 4, solo rules)
│       ├── 70.domains/{type}/    (reglas por dominio, type = backend|frontend)
│       └── 80.verification/      (estrategia de pruebas + recordatorios de verificación de build)
├── claudeos-core/
│   ├── standard/                 ← Documentos de referencia (espejan la estructura de categorías)
│   │   ├── 00.core/              (resumen del proyecto, arquitectura, naming)
│   │   ├── 10.backend/           (referencia backend — si hay stack backend)
│   │   ├── 20.frontend/          (referencia frontend — si hay stack frontend)
│   │   ├── 30.security-db/       (referencia de seguridad y DB)
│   │   ├── 40.infra/             (referencia env / logging / CI-CD)
│   │   ├── 70.domains/{type}/    (referencia por dominio)
│   │   ├── 80.verification/      (referencia de build / arranque / pruebas — solo standard)
│   │   └── 90.optional/          (extras específicos del stack — solo standard)
│   ├── skills/                   (patrones reutilizables que Claude puede aplicar)
│   ├── guide/                    (guías how-to para tareas comunes)
│   ├── database/                 (resumen de esquema, guía de migraciones)
│   ├── mcp-guide/                (notas de integración MCP)
│   └── memory/                   (decision log, failure patterns, compaction)
└── CLAUDE.md                     (el índice que Claude lee primero)
```

Las categorías que comparten el mismo prefijo numérico entre `rules/` y `standard/` representan la misma área conceptual (p. ej., reglas `10.backend` ↔ standards `10.backend`). Categorías solo de rules: `50.sync` (recordatorios de sincronización de docs) y `60.memory` (memoria de Pass 4). Categoría solo de standard: `90.optional` (extras específicos del stack sin enforcement). Todos los demás prefijos (`00`, `10`, `20`, `30`, `40`, `70`, `80`) aparecen en AMBOS `rules/` y `standard/`. Claude Code ahora conoce tu proyecto.

---

## ¿Para quién es esto?

| Eres... | El dolor que esto elimina |
|---|---|
| **Un dev en solitario** empezando un proyecto nuevo con Claude Code | "Enseñarle a Claude mis convenciones cada sesión" — desaparece. `CLAUDE.md` + `.claude/rules/` de 8 categorías generados en una sola pasada. |
| **Un team lead** manteniendo estándares compartidos entre repos | El `.claude/rules/` se desincroniza cuando la gente renombra paquetes, cambia de ORM, o modifica wrappers de respuesta. ClaudeOS-Core re-sincroniza determinísticamente — misma entrada, salida byte-idéntica, sin ruido en los diffs. |
| **Ya usas Claude Code** pero estás cansado de corregir el código generado | Wrapper de respuesta incorrecto, layout de paquetes incorrecto, JPA cuando usas MyBatis, `try/catch` esparcido cuando tu proyecto usa middleware centralizado. El scanner extrae tus convenciones reales; cada pasada de Claude se ejecuta contra un allowlist explícito de rutas. |
| **Haciendo onboarding a un nuevo repo** (proyecto existente, uniéndote a un equipo) | Ejecuta `init` en el repo, obtén un mapa de arquitectura vivo: tabla de stack en CLAUDE.md, reglas por capa con ejemplos ✅/❌, decision log seedeado con el "por qué" detrás de las decisiones principales (JPA vs MyBatis, REST vs GraphQL, etc.). Leer 5 archivos le gana a leer 5,000 archivos fuente. |
| **Trabajando en español / coreano / japonés / chino / 6 idiomas más** | La mayoría de los generadores de reglas de Claude Code son solo en inglés. ClaudeOS-Core escribe el conjunto completo en **10 idiomas** (`en/ko/ja/zh-CN/es/vi/hi/ru/fr/de`) con **validación estructural byte-idéntica** — el mismo veredicto de `claude-md-validator` independientemente del idioma de salida. |
| **Trabajando con un monorepo** (Turborepo, pnpm/yarn workspaces, Lerna) | Dominios backend + frontend analizados en una sola ejecución con prompts separados; `apps/*/` y `packages/*/` recorridos automáticamente; reglas por stack emitidas bajo `70.domains/{type}/`. |
| **Contribuyendo a OSS o experimentando** | La salida es gitignore-friendly — `claudeos-core/` es tu directorio de trabajo local, solo `CLAUDE.md` + `.claude/` necesitan enviarse. Resume-safe si se interrumpe; idempotente al re-ejecutar (tus ediciones manuales en las reglas sobreviven sin `--force`). |

**No es para ti si:** quieres un bundle preset de tipo "talla única" con agentes/skills/rules que funcione el primer día sin paso de escaneo (ver [docs/es/comparison.md](docs/es/comparison.md) para entender qué encaja en cada caso), tu proyecto aún no encaja en uno de los [stacks soportados](#supported-stacks), o solo necesitas un único `CLAUDE.md` (el `claude /init` integrado es suficiente — no hace falta instalar otra herramienta).

---

## ¿Cómo funciona?

ClaudeOS-Core invierte el flujo de trabajo habitual de Claude Code:

```
Habitual:    Tú describes el proyecto → Claude adivina tu stack → Claude escribe docs
Aquí:        El código lee tu stack → El código pasa hechos confirmados a Claude → Claude escribe docs a partir de hechos
```

La pipeline corre en **tres etapas**, con código a ambos lados de la llamada al LLM:

**1. Step A — Scanner (determinístico, sin LLM).** Un scanner Node.js recorre la raíz de tu proyecto, lee `package.json` / `build.gradle` / `pom.xml` / `pyproject.toml`, parsea archivos `.env*` (con redacción de variables sensibles para `PASSWORD/SECRET/TOKEN/JWT_SECRET/...`), clasifica tu patrón de arquitectura (los 5 patrones de Java A/B/C/D/E, Kotlin CQRS / multi-módulo, Next.js App vs. Pages Router, FSD, components-pattern), descubre dominios, y construye un allowlist explícito de cada ruta de archivo fuente que existe. Salida: `project-analysis.json` — la única fuente de verdad para lo que sigue.

**2. Step B — Pipeline de Claude de 4 pasadas (restringida por los hechos del Step A).**
- **Pass 1** lee archivos representativos por grupo de dominio y extrae ~50–100 convenciones por dominio — wrappers de respuesta, librerías de logging, manejo de errores, convenciones de naming, patrones de testing. Se ejecuta una vez por grupo de dominio (`máx 4 dominios, 40 archivos por grupo`) para que el contexto nunca se desborde.
- **Pass 2** fusiona todo el análisis por dominio en una imagen a nivel de proyecto y resuelve los desacuerdos eligiendo la convención dominante.
- **Pass 3** escribe `CLAUDE.md` + `.claude/rules/` + `claudeos-core/standard/` + skills + guides — dividido en stages (`3a` facts → `3b-core/3b-N` rules+standards → `3c-core/3c-N` skills+guides → `3d-aux` database+mcp-guide) para que el prompt de cada stage quepa en la ventana de contexto del LLM incluso cuando `pass2-merged.json` es grande. Sub-divide 3b/3c en batches de ≤15 dominios para proyectos con ≥16 dominios.
- **Pass 4** seedea la capa de memoria L4 (`decision-log.md`, `failure-patterns.md`, `compaction.md`, `auto-rule-update.md`) y agrega reglas universales de scaffold. Pass 4 tiene **prohibido modificar `CLAUDE.md`** — la Section 8 de Pass 3 es autoritativa.

**3. Step C — Verification (determinístico, sin LLM).** Cinco validators verifican la salida:
- `claude-md-validator` — 25 checks estructurales en `CLAUDE.md` (8 secciones, conteos H3/H4, unicidad de archivos de memoria, invariante T1 de heading canónico). Language-invariant: mismo veredicto independientemente de `--lang`.
- `content-validator` — 10 checks de contenido incluyendo verificación de path-claim (`STALE_PATH` atrapa referencias `src/...` fabricadas) y detección de drift en MANIFEST.
- `pass-json-validator` — well-formedness JSON de Pass 1/2/3/4 + conteo de secciones consciente del stack.
- `plan-validator` — consistencia plan ↔ disco (legacy, mayormente no-op desde v2.1.0).
- `sync-checker` — consistencia de registro disco ↔ `sync-map.json` a través de 7 directorios rastreados.

Tres niveles de severidad (`fail` / `warn` / `advisory`) para que las warnings nunca bloqueen CI por hallucinations del LLM que el usuario puede arreglar manualmente.

El invariante que ata todo: **Claude solo puede citar rutas que realmente existen en tu código**, porque el Step A le entrega un allowlist finito. Si el LLM aun así intenta inventar algo (raro pero ocurre con ciertos seeds), el Step C lo atrapa antes de que los docs se envíen.

Para detalles por pasada, resume basado en marker, el workaround de staged-rules para el block de path sensible `.claude/` de Claude Code, e internals de detección de stack, ver [docs/es/architecture.md](docs/es/architecture.md).

---

## Supported Stacks

12 stacks, auto-detectados desde los archivos de tu proyecto:

**Backend:** Java/Spring Boot · Kotlin/Spring Boot · Node/Express · Node/Fastify · Node/NestJS · Python/Django · Python/FastAPI · Python/Flask

**Frontend:** Node/Next.js · Node/Vite · Angular · Vue/Nuxt

Los proyectos multi-stack (p. ej., Spring Boot backend + Next.js frontend) funcionan sin más.

Para reglas de detección y lo que cada scanner extrae, ver [docs/es/stacks.md](docs/es/stacks.md).

---

## Flujo diario

Tres comandos cubren ~95% del uso:

```bash
# Primera vez en un proyecto
npx claudeos-core init

# Después de editar manualmente standards o rules
npx claudeos-core lint

# Health check (ejecuta antes de commits, o en CI)
npx claudeos-core health
```

Dos más para mantenimiento del memory layer:

```bash
# Compactar el log de failure-patterns (ejecuta periódicamente)
npx claudeos-core memory compact

# Promover patrones de fallos frecuentes a reglas propuestas
npx claudeos-core memory propose-rules
```

Para todas las opciones de cada comando, ver [docs/es/commands.md](docs/es/commands.md).

---

## Qué hace diferente a esto

La mayoría de las herramientas de documentación de Claude Code generan a partir de una descripción (tú le dices a la herramienta, la herramienta le dice a Claude). ClaudeOS-Core genera a partir de tu código fuente real (la herramienta lee, la herramienta le dice a Claude lo que está confirmado, Claude escribe solo lo que está confirmado).

Tres consecuencias concretas:

1. **Detección determinística del stack.** Mismo proyecto + mismo código = misma salida. Nada de "esta vez Claude tiró el dado distinto".
2. **Sin rutas inventadas.** El prompt de Pass 3 lista explícitamente cada ruta de origen permitida; Claude no puede citar rutas que no existen.
3. **Multi-stack consciente.** Los dominios backend y frontend usan distintos prompts de análisis en la misma ejecución.

Para una comparación lado a lado de scope con otras herramientas, ver [docs/es/comparison.md](docs/es/comparison.md). La comparación trata sobre **qué hace cada herramienta**, no **cuál es mejor** — la mayoría son complementarias.

---

## Verificación (post-generación)

Después de que Claude escribe los docs, el código los verifica. Cinco validators separados:

| Validator | Qué comprueba | Lo ejecuta |
|---|---|---|
| `claude-md-validator` | Invariantes estructurales de CLAUDE.md (8 secciones, language-invariant) | `claudeos-core lint` |
| `content-validator` | Las rutas declaradas existen realmente; consistencia del manifest | `health` (advisory) |
| `pass-json-validator` | Las salidas Pass 1 / 2 / 3 / 4 son JSON bien formado | `health` (warn) |
| `plan-validator` | El plan guardado coincide con lo que hay en disco | `health` (fail-on-error) |
| `sync-checker` | Los archivos en disco coinciden con los registros de `sync-map.json` (detección de huérfanos/no registrados) | `health` (fail-on-error) |

Un `health-checker` orquesta los cuatro validators de runtime con severidad de tres niveles (fail / warn / advisory) y termina con el código adecuado para CI. `claude-md-validator` se ejecuta por separado vía el comando `lint` ya que el drift estructural es una señal de re-init, no un soft warning. Ejecuta cuando quieras:

```bash
npx claudeos-core health
```

Para los checks de cada validator en detalle, ver [docs/es/verification.md](docs/es/verification.md).

---

## Memory Layer (opcional, para proyectos de larga duración)

Después de v2.0, ClaudeOS-Core escribe una carpeta `claudeos-core/memory/` con cuatro archivos:

- `decision-log.md` — append-only "por qué elegimos X sobre Y"
- `failure-patterns.md` — errores recurrentes con puntuaciones de frequency/importance
- `compaction.md` — cómo se auto-compacta la memoria con el tiempo
- `auto-rule-update.md` — patrones que deberían convertirse en nuevas reglas

Puedes ejecutar `npx claudeos-core memory propose-rules` para pedirle a Claude que mire los patrones de fallos recientes y sugiera nuevas reglas para añadir.

Para el modelo de memoria y el ciclo de vida, ver [docs/es/memory-layer.md](docs/es/memory-layer.md).

---

## FAQ

**P: ¿Necesito una API key de Claude?**
R: No. ClaudeOS-Core usa tu instalación existente de Claude Code — canaliza prompts a `claude -p` en tu máquina. No necesitas cuentas extra.

**P: ¿Esto sobrescribirá mi CLAUDE.md o `.claude/rules/` existente?**
R: Primera ejecución en un proyecto nuevo: los crea. Re-ejecutar sin `--force` preserva tus ediciones — los marcadores de pase de la ejecución anterior se detectan y los pases se omiten. Re-ejecutar con `--force` borra y regenera todo (tus ediciones se pierden — eso es lo que `--force` significa). Ver [docs/es/safety.md](docs/es/safety.md).

**P: Mi stack no está soportado. ¿Puedo añadir uno?**
R: Sí. Los stacks nuevos necesitan ~3 plantillas de prompt + un domain scanner. Ver [CONTRIBUTING.md](CONTRIBUTING.md) para la guía de 8 pasos.

**P: ¿Cómo genero docs en español (u otro idioma)?**
R: `npx claudeos-core init --lang es`. 10 idiomas soportados: en, ko, ja, zh-CN, es, vi, hi, ru, fr, de.

**P: ¿Funciona con monorepos?**
R: Sí — Turborepo (`turbo.json`), pnpm workspaces (`pnpm-workspace.yaml`), Lerna (`lerna.json`) y npm/yarn workspaces (`package.json#workspaces`) son detectados por el stack-detector. Cada app obtiene su propio análisis. Otras estructuras de monorepo (p. ej., NX) no se detectan específicamente, pero los patrones genéricos `apps/*/` y `packages/*/` los siguen detectando los scanners por stack.

**P: ¿Qué pasa si Claude Code genera reglas con las que no estoy de acuerdo?**
R: Edítalas directamente. Luego ejecuta `npx claudeos-core lint` para verificar que CLAUDE.md sigue siendo estructuralmente válido. Tus ediciones se preservan en ejecuciones posteriores de `init` (sin `--force`) — el mecanismo de resume omite los pases cuyos marcadores existen.

**P: ¿Dónde reporto bugs?**
R: [GitHub Issues](https://github.com/claudeos-core/claudeos-core/issues). Para problemas de seguridad, ver [SECURITY.md](SECURITY.md).

---

## Documentación

| Tema | Lee esto |
|---|---|
| Cómo funciona la pipeline de 4 pasadas (más profundo que el diagrama) | [docs/es/architecture.md](docs/es/architecture.md) |
| Diagramas visuales (Mermaid) de la arquitectura | [docs/es/diagrams.md](docs/es/diagrams.md) |
| Detección de stack — qué busca cada scanner | [docs/es/stacks.md](docs/es/stacks.md) |
| Memory layer — decision logs y failure patterns | [docs/es/memory-layer.md](docs/es/memory-layer.md) |
| Los 5 validators en detalle | [docs/es/verification.md](docs/es/verification.md) |
| Cada comando CLI y opción | [docs/es/commands.md](docs/es/commands.md) |
| Instalación manual (sin `npx`) | [docs/es/manual-installation.md](docs/es/manual-installation.md) |
| Overrides del scanner — `.claudeos-scan.json` | [docs/es/advanced-config.md](docs/es/advanced-config.md) |
| Seguridad: qué se preserva al re-init | [docs/es/safety.md](docs/es/safety.md) |
| Comparación con herramientas similares (scope, no calidad) | [docs/es/comparison.md](docs/es/comparison.md) |
| Errores y recuperación | [docs/es/troubleshooting.md](docs/es/troubleshooting.md) |

---

## Contribuir

Las contribuciones son bienvenidas — añadir soporte de stacks, mejorar prompts, arreglar bugs. Ver [CONTRIBUTING.md](CONTRIBUTING.md).

Para el Código de Conducta y la política de seguridad, ver [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) y [SECURITY.md](SECURITY.md).

## Licencia

[ISC](LICENSE) — gratis para cualquier uso, incluyendo comercial.

---

<sub>Construido con cuidado por [@claudeos-core](https://github.com/claudeos-core). Si esto te ahorró tiempo, una ⭐ en GitHub ayuda a mantenerlo visible.</sub>
