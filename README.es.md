# ClaudeOS-Core

[![npm version](https://img.shields.io/npm/v/claudeos-core.svg?logo=npm&label=npm)](https://www.npmjs.com/package/claudeos-core)
[![CI](https://img.shields.io/github/actions/workflow/status/claudeos-core/claudeos-core/test.yml?branch=master&logo=github&label=CI)](https://github.com/claudeos-core/claudeos-core/actions/workflows/test.yml)
[![tests](https://img.shields.io/badge/tests-736%20passing-brightgreen?logo=node.js&logoColor=white)](https://github.com/claudeos-core/claudeos-core/actions/workflows/test.yml)
[![node](https://img.shields.io/node/v/claudeos-core.svg?logo=node.js&logoColor=white&label=node)](https://nodejs.org/)
[![license](https://img.shields.io/npm/l/claudeos-core.svg?color=blue)](LICENSE)
[![downloads](https://img.shields.io/npm/dm/claudeos-core.svg?logo=npm&color=blue&label=downloads)](https://www.npmjs.com/package/claudeos-core)

**Genera automáticamente la documentación de Claude Code a partir de tu código fuente real.** Una herramienta CLI que analiza estáticamente tu proyecto y luego ejecuta una pipeline de Claude de 4 pasadas para generar `.claude/rules/`, standards, skills y guías — para que Claude Code siga las convenciones de tu proyecto, no las genéricas.

```bash
npx claudeos-core init
```

[🇺🇸 English](README.md) · [🇰🇷 한국어](README.ko.md) · [🇨🇳 中文](README.zh-CN.md) · [🇯🇵 日本語](README.ja.md) · [🇻🇳 Tiếng Việt](README.vi.md) · [🇮🇳 हिन्दी](README.hi.md) · [🇷🇺 Русский](README.ru.md) · [🇫🇷 Français](README.fr.md) · [🇩🇪 Deutsch](README.de.md)

---

## ¿Qué es esto?

Usas Claude Code. Es inteligente, pero no conoce **las convenciones de tu proyecto**:
- Tu equipo usa MyBatis, pero Claude genera código JPA.
- Tu wrapper es `ApiResponse.ok()`, pero Claude escribe `ResponseEntity.success()`.
- Tus paquetes son `controller/order/`, pero Claude crea `order/controller/`.

Así que pasas mucho tiempo arreglando cada archivo generado.

**ClaudeOS-Core resuelve esto.** Escanea tu código fuente real, descubre tus convenciones y escribe un conjunto completo de reglas en `.claude/rules/` — el directorio que Claude Code lee automáticamente. La próxima vez que digas *"Crea un CRUD para órdenes"*, Claude seguirá tus convenciones al primer intento.

```
Antes:    Tú → Claude Code → código "generalmente bueno" → corrección manual
Después:  Tú → Claude Code → código que coincide con tu proyecto → listo para enviar
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
<summary><strong>📄 Lo que termina en tu <code>CLAUDE.md</code> (extracto real)</strong></summary>

```markdown
## 4. Core Architecture

### Core Patterns

- **Hexagonal ports & adapters**: domain ports live in `io.spring.core.{aggregate}`
  and are implemented by `io.spring.infrastructure.repository.MyBatis{Aggregate}Repository`.
  The domain layer has zero MyBatis imports.
- **CQRS-lite read/write split (same DB)**: write side goes through repository ports
  + entities; read side is a separate `readservice` package whose `@Mapper`
  interfaces return `*Data` DTOs directly (no entity hydration).
- **No aggregator/orchestrator layer**: multi-source orchestration happens inside
  application services (e.g., `ArticleQueryService`); there is no `*Aggregator`
  class in the codebase.
- **Application-supplied UUIDs**: entity constructors assign their own UUID; PK is
  passed via `#{user.id}` on INSERT. The global
  `mybatis.configuration.use-generated-keys=true` flag is dead config
  (auto-increment is unused).
- **JWT HS512 authentication**: `io.spring.infrastructure.service.DefaultJwtService`
  is the sole token subject in/out; `io.spring.api.security.JwtTokenFilter`
  extracts the token at the servlet layer.
```

Nota: cada afirmación anterior está fundamentada en el código fuente real — nombres de clases, rutas de paquetes, claves de configuración y la marca de configuración muerta son todas extraídas por el scanner antes de que Claude escriba el archivo.

</details>

<details>
<summary><strong>🛡️ Una regla auto-cargada real (<code>.claude/rules/10.backend/03.data-access-rules.md</code>)</strong></summary>

````markdown
---
paths:
  - "**/*"
---

# Data Access Rules

## XML-only SQL
- Every SQL statement lives in `src/main/resources/mapper/*.xml`.
  NO `@Select` / `@Insert` / `@Update` / `@Delete` annotations on `@Mapper` methods.
- Each `@Mapper` interface has exactly one XML file at
  `src/main/resources/mapper/{InterfaceName}.xml`.
- `<mapper namespace="...">` MUST be the fully qualified Java interface name.
  The single existing exception is `TransferData.xml` (free-form `transfer.data`).

## Dynamic SQL
- `<if>` predicates MUST guard both null and empty:
  `<if test="X != null and X != ''">`. Empty-only is the existing HIGH-severity bug pattern.
- Prefer `LIMIT n OFFSET m` over MySQL-style `LIMIT m, n`.

## Examples

✅ Correct:
```xml
<update id="update">
  UPDATE articles
  <set>
    <if test="article.title != null and article.title != ''">title = #{article.title},</if>
    updated_at = #{article.updatedAt}
  </set>
  WHERE id = #{article.id}
</update>
```

❌ Incorrect:
```xml
<mapper namespace="article.mapper">          <!-- NO — namespace MUST be FQCN -->
```
````

El glob `paths: ["**/*"]` significa que Claude Code carga automáticamente esta regla cada vez que editas cualquier archivo del proyecto. Los ejemplos ✅/❌ vienen directamente de las convenciones reales y los patrones de bugs existentes en este código.

</details>

<details>
<summary><strong>🧠 Un seed auto-generado de <code>decision-log.md</code> (extracto real)</strong></summary>

```markdown
## 2026-04-26 — CQRS-lite read/write split inside the persistence layer

- **Context:** Writes go through `core.*Repository` port → `MyBatis*Repository`
  adapter → `io.spring.infrastructure.mybatis.mapper.{Aggregate}Mapper`.
  Reads bypass the domain port: application service →
  `io.spring.infrastructure.mybatis.readservice.{Concept}ReadService` directly,
  returning flat `*Data` DTOs from `io.spring.application.data.*`.
- **Options considered:** Single repository surface returning hydrated entities
  for both reads and writes.
- **Decision:** Same database, two `@Mapper` packages — `mapper/` (write side,
  operates on core entities) and `readservice/` (read side, returns `*Data` DTOs).
  Read DTOs avoid entity hydration overhead.
- **Consequences:** Reads are NOT routed through the domain port — this is
  intentional, not a bug. Application services may inject both a `*Repository`
  (writes) and one or more `*ReadService` interfaces (reads) at the same time.
  Do NOT add hydrate-then-map glue in the read path.
```

Pass 4 inicializa `decision-log.md` con las decisiones arquitectónicas extraídas de `pass2-merged.json`, así las sesiones futuras recuerdan *por qué* el código se ve como se ve — no solo *cómo* se ve.

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

| Eres... | Esto te ayuda a... |
|---|---|
| **Un dev en solitario** empezando un proyecto nuevo con Claude Code | Saltarte por completo la fase de "enseñarle a Claude mis convenciones" |
| **Un team lead** que mantiene estándares compartidos | Automatizar la parte tediosa de mantener `.claude/rules/` actualizado |
| **Ya usas Claude Code** pero estás cansado de corregir el código generado | Hacer que Claude siga TUS patrones, no patrones "generalmente buenos" |

**No es para ti si:** quieres un bundle preset de tipo "talla única" con agentes/skills/rules que funcione el primer día sin paso de escaneo (ver [docs/es/comparison.md](docs/es/comparison.md) para entender qué encaja en cada caso), o tu proyecto aún no encaja en uno de los [stacks soportados](#supported-stacks).

---

## ¿Cómo funciona?

ClaudeOS-Core invierte el flujo de trabajo habitual de Claude Code:

```
Habitual:    Tú describes el proyecto → Claude adivina tu stack → Claude escribe docs
Aquí:        El código lee tu stack → El código pasa hechos confirmados a Claude → Claude escribe docs a partir de hechos
```

La idea clave: **un scanner Node.js lee tu código fuente primero** (determinístico, sin IA), y luego una pipeline de Claude de 4 pasadas escribe la documentación, restringida por lo que el scanner encontró. Claude no puede inventar rutas o frameworks que no estén realmente en tu código.

Para la arquitectura completa, ver [docs/es/architecture.md](docs/es/architecture.md).

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
