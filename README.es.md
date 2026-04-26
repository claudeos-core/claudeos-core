# ClaudeOS-Core

[![npm version](https://img.shields.io/npm/v/claudeos-core.svg?logo=npm&label=npm)](https://www.npmjs.com/package/claudeos-core)
[![CI](https://img.shields.io/github/actions/workflow/status/claudeos-core/claudeos-core/test.yml?branch=master&logo=github&label=CI)](https://github.com/claudeos-core/claudeos-core/actions/workflows/test.yml)
[![tests](https://img.shields.io/badge/tests-736%20passing-brightgreen?logo=node.js&logoColor=white)](https://github.com/claudeos-core/claudeos-core/actions/workflows/test.yml)
[![node](https://img.shields.io/node/v/claudeos-core.svg?logo=node.js&logoColor=white&label=node)](https://nodejs.org/)
[![license](https://img.shields.io/npm/l/claudeos-core.svg?color=blue)](LICENSE)
[![downloads](https://img.shields.io/npm/dm/claudeos-core.svg?logo=npm&color=blue&label=downloads)](https://www.npmjs.com/package/claudeos-core)

**Una CLI que analiza tu código fuente y genera de forma reproducible `CLAUDE.md` y `.claude/rules/`. Combina un scanner en Node.js, una pipeline de 4 pasos sobre Claude y 5 validators. Soporta 12 stacks y 10 idiomas, y no inventa rutas que no existan en tu repo.**

```bash
npx claudeos-core init
```

Funciona sobre [**12 stacks**](#supported-stacks), monorepos incluidos. Un solo comando, sin configuración, segura ante interrupciones e idempotente al volver a ejecutarla.

[🇺🇸 English](README.md) · [🇰🇷 한국어](README.ko.md) · [🇨🇳 中文](README.zh-CN.md) · [🇯🇵 日本語](README.ja.md) · [🇻🇳 Tiếng Việt](README.vi.md) · [🇮🇳 हिन्दी](README.hi.md) · [🇷🇺 Русский](README.ru.md) · [🇫🇷 Français](README.fr.md) · [🇩🇪 Deutsch](README.de.md)

---

## ¿Qué es esto?

Cada vez que abres una sesión nueva, Claude Code vuelve a los valores genéricos del framework. El equipo usa **MyBatis**, pero Claude escribe JPA. El wrapper de respuesta es `ApiResponse.ok()` y, aun así, Claude acaba escribiendo `ResponseEntity.success()`. Los paquetes se organizan por capa, pero el código generado los reorganiza por dominio. Mantener a mano un `.claude/rules/` por repositorio resuelve el problema; hasta que el código evoluciona y esas reglas dejan de cuadrar con la realidad.

**ClaudeOS-Core las regenera de forma reproducible a partir del código real.** Primero entra un scanner en Node.js que reconoce el stack, el ORM, la organización de paquetes y las rutas de archivos. A continuación, la pipeline de 4 pasos sobre Claude escribe el conjunto completo: `CLAUDE.md`, las reglas auto-cargadas en `.claude/rules/`, los estándares y las skills. Todo queda acotado por una lista explícita de rutas permitidas que el modelo no puede saltarse. Y para cerrar, cinco validators revisan el resultado antes de darlo por bueno.

De este modo, la misma entrada produce siempre la misma salida, byte a byte, en cualquiera de los 10 idiomas disponibles, y sin que aparezca jamás una ruta inexistente. Más abajo se entra en detalle en [Qué lo hace diferente](#qué-lo-hace-diferente).

Para proyectos de larga duración, además se prepara una [Memory Layer](#memory-layer-opcional-para-proyectos-de-larga-duración) aparte.

---

## Míralo en un proyecto real

Lo ejecutamos sobre [`spring-boot-realworld-example-app`](https://github.com/gothinkster/spring-boot-realworld-example-app): Java 11, Spring Boot 2.6, MyBatis, SQLite y 187 archivos fuente. El resultado: **75 archivos generados**, **53 minutos** en total y todos los validators en verde ✅.

<p align="center">
  <img src="docs/assets/spring-boot-realworld-demo.gif" alt="ClaudeOS-Core init running on spring-boot-realworld-example-app — stack detection, 4-pass pipeline, validators, completion summary" width="769">
</p>

<details>
<summary><strong>Salida de terminal (versión texto, para buscar y copiar)</strong></summary>

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
<summary><strong>Lo que acaba en tu <code>CLAUDE.md</code> (extracto real, secciones 1 y 2)</strong></summary>

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

Cada valor de la tabla anterior, desde las coordenadas exactas de cada dependencia hasta el nombre del archivo `dev.db`, el de la migración `V1__create_tables.sql` o ese «no JPA», sale del scanner. Lo extrae directamente de `build.gradle`, `application.properties` y el árbol de fuentes antes de que Claude empiece a escribir. Nada se adivina.

</details>

<details>
<summary><strong>Una regla auto-cargada real (<code>.claude/rules/10.backend/01.controller-rules.md</code>)</strong></summary>

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

El glob `paths: ["**/*"]` hace que Claude Code cargue esta regla automáticamente cada vez que se edita cualquier archivo del proyecto. Los nombres de clase, las rutas de paquete y el manejador de excepciones que aparecen en la regla salen tal cual del código escaneado; reflejan, por tanto, el `CustomizeExceptionHandler` y el `JacksonCustomizations` reales del proyecto.

</details>

<details>
<summary><strong>Un seed de <code>decision-log.md</code> auto-generado (extracto real)</strong></summary>

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

Pass 4 deja sembrado `decision-log.md` con las decisiones de arquitectura que extrae de `pass2-merged.json`. De esta forma, en sesiones futuras no solo se recuerda *cómo* es el código, sino también *por qué*. Cada opción («JPA/Hibernate», «MyBatis-Plus») y cada consecuencia parten del bloque de dependencias real de `build.gradle`.

</details>

---

## Probado en

ClaudeOS-Core viene con benchmarks de referencia ejecutados sobre proyectos OSS reales. Si lo has usado en un repositorio público, [abre un issue](https://github.com/claudeos-core/claudeos-core/issues) y lo añadimos a la tabla.

| Proyecto | Stack | Escaneado → Generado | Estado |
|---|---|---|---|
| [`spring-boot-realworld-example-app`](https://github.com/gothinkster/spring-boot-realworld-example-app) | Java 11 · Spring Boot 2.6 · MyBatis · SQLite | 187 → 75 archivos | ✅ los 5 validators pasan |

---

## Inicio rápido

**Requisitos previos:** Node.js 18+ y [Claude Code](https://docs.anthropic.com/en/docs/claude-code) instalado y autenticado.

```bash
# 1. Sitúate en la raíz del proyecto
cd my-spring-boot-project

# 2. Lanza init (analiza el código y le pide a Claude que escriba las reglas)
npx claudeos-core init

# 3. Listo. Abre Claude Code y empieza a programar; las reglas ya están cargadas.
```

Cuando termina `init` te encuentras con esto:

```
your-project/
├── .claude/
│   └── rules/                    ← Cargado automáticamente por Claude Code
│       ├── 00.core/              (reglas generales: nombrado, arquitectura)
│       ├── 10.backend/           (reglas del stack backend, si lo hay)
│       ├── 20.frontend/          (reglas del stack frontend, si lo hay)
│       ├── 30.security-db/       (convenciones de seguridad y BD)
│       ├── 40.infra/             (env, logs, CI/CD)
│       ├── 50.sync/              (recordatorios de sincronización docs, solo reglas)
│       ├── 60.memory/            (reglas de memoria, Pass 4, solo reglas)
│       ├── 70.domains/{type}/    (reglas por dominio, type = backend|frontend)
│       └── 80.verification/      (recordatorios de testing y verificación de build)
├── claudeos-core/
│   ├── standard/                 ← Documentación de referencia (misma estructura por categoría)
│   │   ├── 00.core/              (visión del proyecto, arquitectura, nombrado)
│   │   ├── 10.backend/           (referencia backend, si hay stack backend)
│   │   ├── 20.frontend/          (referencia frontend, si hay stack frontend)
│   │   ├── 30.security-db/       (referencia de seguridad y BD)
│   │   ├── 40.infra/             (referencia env / logs / CI-CD)
│   │   ├── 70.domains/{type}/    (referencia por dominio)
│   │   ├── 80.verification/      (referencia build / arranque / tests, solo standard)
│   │   └── 90.optional/          (extras según stack, solo standard)
│   ├── skills/                   (patrones reutilizables que Claude puede aplicar)
│   ├── guide/                    (guías how-to para tareas frecuentes)
│   ├── database/                 (visión del esquema, guía de migraciones)
│   ├── mcp-guide/                (notas de integración MCP)
│   └── memory/                   (decision log, failure patterns, compaction)
└── CLAUDE.md                     (el índice que Claude lee primero)
```

Las categorías que comparten prefijo numérico entre `rules/` y `standard/` representan la misma área conceptual; por ejemplo, las reglas de `10.backend` se corresponden con los estándares de `10.backend`. Solo viven en `rules/` las categorías `50.sync` (recordatorios de sincronización) y `60.memory` (memoria de Pass 4); en cambio, solo en `standard/` vive `90.optional` (extras por stack, sin enforcement). El resto de prefijos (`00`, `10`, `20`, `30`, `40`, `70`, `80`) aparece en ambos lados. Con eso, Claude Code ya conoce el proyecto.

---

## ¿Para quién es esto?

| Si eres... | El dolor que quita |
|---|---|
| **Dev en solitario** que arranca un proyecto con Claude Code | Se acabó lo de explicarle a Claude las convenciones del proyecto en cada sesión. Generas `CLAUDE.md` y las 8 categorías de `.claude/rules/` de una sola pasada. |
| **Tech lead** manteniendo estándares compartidos entre repos | Cuando alguien renombra paquetes, cambia de ORM o retoca el wrapper de respuesta, `.claude/rules/` deja de cuadrar. ClaudeOS-Core lo resincroniza siempre igual: misma entrada, misma salida byte a byte y sin ruido en el diff. |
| **Ya usas Claude Code** y estás cansado de corregir lo que genera | Wrapper equivocado, paquetes mal organizados, JPA cuando se usa MyBatis, `try/catch` esparcidos cuando ya hay middleware central. El scanner extrae las convenciones reales y cada paso de Claude se ejecuta contra una lista explícita de rutas permitidas. |
| **Te incorporas a un repo nuevo** (proyecto existente, llegada al equipo) | Lanzas `init` sobre el repo y obtienes un mapa vivo de la arquitectura: tabla de stack en CLAUDE.md, reglas por capa con ejemplos ✅/❌ y un decision log sembrado con el «por qué» de las decisiones grandes (JPA frente a MyBatis, REST frente a GraphQL, etc.). Leer 5 archivos sale más a cuenta que leer 5.000 fuentes. |
| **Trabajas en coreano, japonés, chino o 7 idiomas más** | La mayoría de generadores de reglas para Claude Code solo hablan inglés. ClaudeOS-Core escribe el conjunto completo en **10 idiomas** (`en/ko/ja/zh-CN/es/vi/hi/ru/fr/de`) con **validación estructural byte-identical**: el veredicto de `claude-md-validator` no varía según el idioma de salida. |
| **Trabajas en monorepo** (Turborepo, pnpm/yarn workspaces, Lerna) | En una sola ejecución se analizan los dominios de backend y frontend con prompts distintos. Recorre `apps/*/` y `packages/*/` automáticamente y emite las reglas de cada stack bajo `70.domains/{type}/`. |
| **Contribuyes a OSS o estás experimentando** | La salida es amigable con `.gitignore`: `claudeos-core/` es el directorio de trabajo local y al repo solo viajan `CLAUDE.md` y `.claude/`. Si interrumpes el proceso, lo retoma; al volver a ejecutarlo es idempotente y, sin `--force`, respeta las ediciones manuales. |

**No es para ti si:** buscas un pack único y universal de agents/skills/rules que funcione el primer día sin paso de escaneo (consulta [docs/es/comparison.md](docs/es/comparison.md) para ver qué encaja en cada caso); el proyecto todavía no entra en los [stacks soportados](#supported-stacks); o solo necesitas un único `CLAUDE.md`, en cuyo caso el `claude /init` integrado ya basta y no hace falta otra herramienta.

---

## ¿Cómo funciona?

ClaudeOS-Core invierte el flujo habitual de Claude Code:

```
Habitual: Tú describes el proyecto → Claude adivina tu stack → Claude escribe la documentación
Esto:     El código lee tu stack    → El código pasa hechos confirmados a Claude → Claude escribe a partir de hechos
```

La pipeline avanza en **tres etapas**, con código tanto antes como después de la llamada al LLM:

**1. Etapa A — Scanner (reproducible, sin LLM).** Un scanner en Node.js recorre la raíz del proyecto, lee `package.json`, `build.gradle`, `pom.xml` o `pyproject.toml`, parsea los archivos `.env*` (con redacción automática de variables sensibles como `PASSWORD/SECRET/TOKEN/JWT_SECRET/...`), clasifica el patrón de arquitectura (los 5 patrones A/B/C/D/E de Java, CQRS o multi-módulo en Kotlin, App Router o Pages Router en Next.js, FSD, components-pattern), descubre los dominios y compone una lista explícita con todas las rutas de archivos fuente que existen. El resultado se vuelca en `project-analysis.json`, la única fuente de verdad para lo que viene después.

**2. Etapa B — Pipeline de 4 pasos sobre Claude (limitada por los hechos de la etapa A).**
- **Pass 1** lee archivos representativos por grupo de dominios y extrae unas 50–100 convenciones por dominio: wrappers de respuesta, librería de logging, manejo de errores, convenciones de nombrado, patrones de tests. Se ejecuta una vez por grupo (`max 4 domains, 40 files per group`) para que el contexto nunca se desborde.
- **Pass 2** funde los análisis por dominio en una única visión del proyecto y resuelve los conflictos quedándose con la convención dominante.
- **Pass 3** escribe `CLAUDE.md`, `.claude/rules/`, `claudeos-core/standard/`, las skills y las guides. Va dividido en etapas (`3a` facts → `3b-core/3b-N` rules+standards → `3c-core/3c-N` skills+guides → `3d-aux` database+mcp-guide) para que el prompt de cada etapa quepa en la ventana de contexto incluso cuando `pass2-merged.json` es grande. Si hay 16 dominios o más, 3b/3c se subdividen en lotes de 15 como mucho.
- **Pass 4** siembra la capa de memoria L4 (`decision-log.md`, `failure-patterns.md`, `compaction.md`, `auto-rule-update.md`) y añade reglas de scaffolding universales. Pass 4 **tiene prohibido tocar `CLAUDE.md`**: la sección 8 que produce Pass 3 manda.

**3. Etapa C — Verificación (reproducible, sin LLM).** Cinco validators revisan la salida:
- `claude-md-validator`: 25 comprobaciones estructurales sobre `CLAUDE.md` (8 secciones, conteos de H3/H4, unicidad de archivos de memoria, invariante T1 de heading canónico). Es independiente del idioma; el veredicto es el mismo para cualquier `--lang`.
- `content-validator`: 10 comprobaciones de contenido, entre ellas la verificación de las rutas citadas (`STALE_PATH` caza referencias inventadas a `src/...`) y la detección de drift en MANIFEST.
- `pass-json-validator`: que los JSON de Pass 1/2/3/4 estén bien formados y tengan el número de secciones esperado según el stack.
- `plan-validator`: consistencia entre plan y disco (legacy, prácticamente no-op desde la v2.1.0).
- `sync-checker`: consistencia entre los 7 directorios rastreados en disco y `sync-map.json`.

Existen tres niveles de severidad (`fail` / `warn` / `advisory`), de modo que las alucinaciones del LLM que el usuario puede arreglar a mano nunca bloquean la CI con simples warnings.

La invariante que sostiene todo esto es clara: **Claude solo puede citar rutas que existan de verdad en el código**, porque la etapa A le pasa una lista cerrada. Y si aun así el LLM intenta inventarse algo (raro, pero pasa con ciertos seeds), la etapa C lo intercepta antes de entregar la documentación.

Para los detalles de cada paso, el sistema de resume basado en marcadores, el truco de staged-rules que esquiva el bloqueo de rutas sensibles de `.claude/` por parte de Claude Code, y la lógica interna de detección de stacks, consulta [docs/es/architecture.md](docs/es/architecture.md).

---

## Supported Stacks

12 stacks que se autodetectan a partir de los archivos del proyecto:

**Backend:** Java/Spring Boot · Kotlin/Spring Boot · Node/Express · Node/Fastify · Node/NestJS · Python/Django · Python/FastAPI · Python/Flask

**Frontend:** Node/Next.js · Node/Vite · Angular · Vue/Nuxt

Los proyectos multi-stack (por ejemplo, backend Spring Boot con frontend Next.js) funcionan tal cual.

Las reglas de detección y lo que extrae cada scanner están en [docs/es/stacks.md](docs/es/stacks.md).

---

## Flujo diario

Con tres comandos cubres aproximadamente el 95% del uso:

```bash
# Primera vez en un proyecto
npx claudeos-core init

# Tras editar manualmente standards o reglas
npx claudeos-core lint

# Health check (antes de hacer commit, o en CI)
npx claudeos-core health
```

Las opciones completas de cada comando están en [docs/es/commands.md](docs/es/commands.md). Los comandos de la capa de memoria (`memory compact`, `memory propose-rules`) se documentan más abajo en la sección [Memory Layer](#memory-layer-opcional-para-proyectos-de-larga-duración).

---

## Qué lo hace diferente

La mayoría de herramientas de documentación para Claude Code parten de una descripción: tú se la cuentas a la herramienta y la herramienta se la cuenta a Claude. ClaudeOS-Core, en cambio, parte del código fuente real. La herramienta lee, le entrega a Claude lo que está confirmado y Claude solo escribe lo que está confirmado.

Esto se traduce en tres consecuencias concretas:

1. **Detección reproducible del stack.** Mismo proyecto y mismo código equivalen a la misma salida. Nada de «esta vez Claude lo ha hecho distinto».
2. **Sin rutas inventadas.** El prompt de Pass 3 lleva listadas todas las rutas fuente permitidas; Claude no puede citar nada que no exista.
3. **Consciente del multi-stack.** En la misma ejecución, los dominios de backend y de frontend usan prompts de análisis distintos.

Para una comparación lado a lado con otras herramientas, consulta [docs/es/comparison.md](docs/es/comparison.md). La comparación va de **qué hace cada herramienta**, no de **cuál es mejor**; en su mayoría son complementarias.

---

## Verificación (post-generación)

Cuando Claude termina de escribir, le toca al código revisarlo. Cinco validators independientes:

| Validator | Qué comprueba | Lo lanza |
|---|---|---|
| `claude-md-validator` | Invariantes estructurales de CLAUDE.md (8 secciones, independiente del idioma) | `claudeos-core lint` |
| `content-validator` | Que las rutas citadas existen y que el manifest es consistente | `health` (advisory) |
| `pass-json-validator` | Que los JSON de Pass 1 / 2 / 3 / 4 están bien formados | `health` (warn) |
| `plan-validator` | Que el plan guardado coincide con lo que hay en disco | `health` (fail-on-error) |
| `sync-checker` | Que los archivos en disco cuadran con `sync-map.json` (detecta huérfanos y no registrados) | `health` (fail-on-error) |

El `health-checker` orquesta los cuatro validators de runtime con las tres severidades (fail / warn / advisory) y termina con el código de salida adecuado para CI. `claude-md-validator`, por su parte, corre por separado a través del comando `lint`, porque cualquier drift estructural es señal de que toca volver a hacer init, no un simple aviso. Se puede lanzar cuando convenga:

```bash
npx claudeos-core health
```

El detalle de las comprobaciones de cada validator está en [docs/es/verification.md](docs/es/verification.md).

---

## Memory Layer (opcional, para proyectos de larga duración)

Más allá de la pipeline de scaffolding, ClaudeOS-Core también prepara la carpeta `claudeos-core/memory/` para proyectos en los que el contexto sobrevive a una sola sesión. Es opcional: si solo interesan `CLAUDE.md` y las reglas, se puede ignorar sin problema.

Son cuatro archivos y los escribe Pass 4:

- `decision-log.md`: bitácora append-only de «por qué elegimos X en lugar de Y», sembrada desde `pass2-merged.json`.
- `failure-patterns.md`: errores recurrentes con puntuaciones de frecuencia e importancia.
- `compaction.md`: cómo se compacta la memoria automáticamente con el tiempo.
- `auto-rule-update.md`: patrones que merecen convertirse en reglas nuevas.

Dos comandos mantienen viva esta capa:

```bash
# Compactar el log de failure-patterns (ejecuta de vez en cuando)
npx claudeos-core memory compact

# Promover los failure patterns frecuentes a propuestas de regla
npx claudeos-core memory propose-rules
```

El modelo de memoria y su ciclo de vida están en [docs/es/memory-layer.md](docs/es/memory-layer.md).

---

## FAQ

**P: ¿Necesito una API key de Claude?**
R: No. ClaudeOS-Core se apoya en la instalación existente de Claude Code y manda los prompts al `claude -p` que ya tienes en la máquina. Sin cuentas extra.

**P: ¿Va a sobrescribir mi CLAUDE.md o mi `.claude/rules/`?**
R: La primera vez sobre un proyecto nuevo los crea. Si vuelves a ejecutarlo sin `--force`, se respetan las ediciones, porque detecta los marcadores de pass de la ejecución anterior y se salta esos pasos. Con `--force`, en cambio, borra y regenera todo (y sí, también desaparecen las ediciones; eso es lo que significa `--force`). Más detalle en [docs/es/safety.md](docs/es/safety.md).

**P: Mi stack no está soportado, ¿puedo añadirlo?**
R: Sí. Para un stack nuevo hacen falta unos 3 prompt templates y un domain scanner. La guía en 8 pasos vive en [CONTRIBUTING.md](CONTRIBUTING.md).

**P: ¿Cómo genero la documentación en español (o en otro idioma)?**
R: Con `npx claudeos-core init --lang es`. Hay 10 idiomas soportados: en, ko, ja, zh-CN, es, vi, hi, ru, fr, de.

**P: ¿Funciona con monorepos?**
R: Sí. El stack-detector reconoce Turborepo (`turbo.json`), pnpm workspaces (`pnpm-workspace.yaml`), Lerna (`lerna.json`) y los workspaces de npm/yarn (`package.json#workspaces`). Cada app se analiza por separado. Otros layouts (NX, por ejemplo) no se detectan de manera específica, aunque los scanners de cada stack siguen reconociendo los patrones genéricos `apps/*/` y `packages/*/`.

**P: ¿Y si Claude Code genera reglas con las que no estoy de acuerdo?**
R: Se editan directamente. Después, un `npx claudeos-core lint` confirma que CLAUDE.md sigue siendo estructuralmente válido. Esas ediciones sobreviven a los siguientes `init` (sin `--force`), porque el mecanismo de resume se salta los pasos cuyos marcadores ya existen.

**P: ¿Dónde reporto bugs?**
R: En [GitHub Issues](https://github.com/claudeos-core/claudeos-core/issues). Para temas de seguridad, consulta [SECURITY.md](SECURITY.md).

---

## Si esto te ahorró tiempo

Una ⭐ en GitHub mantiene el proyecto visible y ayuda a que otra gente lo encuentre. Issues, PRs y contribuciones de templates de stack son siempre bienvenidos; los detalles están en [CONTRIBUTING.md](CONTRIBUTING.md).

---

## Documentación

| Tema | Lectura recomendada |
|---|---|
| Cómo funciona la pipeline de 4 pasos (más a fondo que el diagrama) | [docs/es/architecture.md](docs/es/architecture.md) |
| Diagramas visuales (Mermaid) de la arquitectura | [docs/es/diagrams.md](docs/es/diagrams.md) |
| Detección de stack: qué busca cada scanner | [docs/es/stacks.md](docs/es/stacks.md) |
| Memory layer: decision logs y failure patterns | [docs/es/memory-layer.md](docs/es/memory-layer.md) |
| Detalle de los 5 validators | [docs/es/verification.md](docs/es/verification.md) |
| Todos los comandos y opciones de la CLI | [docs/es/commands.md](docs/es/commands.md) |
| Instalación manual (sin `npx`) | [docs/es/manual-installation.md](docs/es/manual-installation.md) |
| Overrides del scanner: `.claudeos-scan.json` | [docs/es/advanced-config.md](docs/es/advanced-config.md) |
| Seguridad: qué se preserva al volver a hacer init | [docs/es/safety.md](docs/es/safety.md) |
| Comparación con herramientas similares (alcance, no calidad) | [docs/es/comparison.md](docs/es/comparison.md) |
| Errores y recuperación | [docs/es/troubleshooting.md](docs/es/troubleshooting.md) |

---

## Contribuir

Las contribuciones son bienvenidas: añadir soporte de stacks, mejorar prompts, arreglar bugs. Detalles en [CONTRIBUTING.md](CONTRIBUTING.md).

Para el código de conducta y la política de seguridad, consulta [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) y [SECURITY.md](SECURITY.md).

## Licencia

[ISC License](LICENSE). De libre uso, también comercial. © 2025–2026 ClaudeOS-Core contributors.

---

<sub>Mantenido por el equipo [claudeos-core](https://github.com/claudeos-core). Issues y PRs en <https://github.com/claudeos-core/claudeos-core>.</sub>
