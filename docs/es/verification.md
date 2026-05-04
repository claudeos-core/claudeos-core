# Verification

Cuando Claude termina de generar la documentación, código verifica la salida con **5 validators separados**. Ninguno llama a un LLM: todos los checks son determinísticos.

Esta página cubre qué comprueba cada validator, cómo funcionan los niveles de severidad y cómo leer la salida.

> Original en inglés: [docs/verification.md](../verification.md). La traducción al español se mantiene sincronizada con el inglés.

---

## Por qué verificación post-generación

Los LLMs no son determinísticos. Incluso con prompts inyectados con hechos (la [allowlist de rutas de origen](architecture.md#los-prompts-inyectados-con-hechos-previenen-alucinaciones)), Claude todavía puede:

- Saltarse una sección requerida bajo presión de contexto.
- Citar una ruta que casi (pero no del todo) coincide con la allowlist (por ejemplo, `src/feature/routers/featureRoutePath.ts` inventada a partir de un directorio padre y un nombre de constante TypeScript).
- Generar referencias cruzadas inconsistentes entre standards y rules.
- Volver a declarar contenido de Section 8 en otro lugar de CLAUDE.md.

Los validators atrapan estas salidas silenciosamente malas antes de que los docs se envíen.

---

## Los 5 validators

### 1. `claude-md-validator` — invariantes estructurales

Valida `CLAUDE.md` contra un conjunto de checks estructurales (la tabla de abajo lista las familias de check ID; el total de IDs individuales reportables varía porque `checkSectionsHaveContent` y `checkCanonicalHeadings` emiten uno por sección, etc.). Vive en `claude-md-validator/`.

**Cómo correrlo:**
```bash
npx claudeos-core lint
```

(`health` no lo corre: ver [Por qué dos puntos de entrada](#por-qué-dos-puntos-de-entrada-lint-vs-health) abajo.)

**Lo que comprueba:**

| Check ID | Lo que aplica |
|---|---|
| `S1` | El conteo de secciones es exactamente 8 |
| `S2-N` | Cada sección tiene al menos 2 líneas de cuerpo no vacías |
| `S-H3-4` | Section 4 tiene 3 o 4 sub-secciones H3 |
| `S-H3-6` | Section 6 tiene exactamente 3 sub-secciones H3 |
| `S-H3-8` | Section 8 tiene exactamente 2 sub-secciones H3 |
| `S-H4-8` | Section 8 tiene exactamente 2 headings H4 (L4 Memory Files / Memory Workflow) |
| `M-<file>` | Cada uno de los 4 archivos de memoria (`decision-log.md`, `failure-patterns.md`, `compaction.md`, `auto-rule-update.md`) aparece en exactamente UNA fila de tabla markdown |
| `F2-<file>` | Las filas de tabla de archivos de memoria están confinadas a Section 8 |
| `T1-1` a `T1-8` | Cada heading de sección `## N.` contiene su token canónico inglés (`Role Definition`, `Project Overview`, `Build`, `Core Architecture`, `Directory Structure`, `Standard`, `DO NOT Read`, `Memory`); match de subcadena case-insensitive |

**Por qué language-invariant:** el validator nunca matchea contra prosa de heading traducida. Solo matchea estructura markdown (niveles de heading, conteos, ordenamiento) y tokens canónicos en inglés. Los mismos checks pasan en un CLAUDE.md generado en cualquiera de los 10 idiomas soportados.

**Por qué importa en la práctica:** un CLAUDE.md generado con `--lang ja` y uno generado con `--lang en` se ven completamente distintos para un humano, pero `claude-md-validator` produce veredictos pass/fail idénticos byte por byte sobre ambos. Sin mantener un diccionario por idioma.

### 2. `content-validator` — checks de path y manifest

Valida el **contenido** de los archivos generados (no la estructura de CLAUDE.md). Vive en `content-validator/`.

**10 checks** (los primeros 9 están etiquetados `[N/9]` en la salida de consola; el décimo se agregó después y se etiqueta `[10/10]`; esta asimetría se preserva en el código para que los greps CI existentes sigan matcheando):

| Check | Lo que aplica |
|---|---|
| `[1/9]` CLAUDE.md existe, ≥100 chars, contiene palabras clave de sección requeridas (10-language aware) |
| `[2/9]` Los archivos `.claude/rules/**/*.md` tienen YAML frontmatter con la clave `paths:`, sin archivos vacíos |
| `[3/9]` Los archivos `claudeos-core/standard/**/*.md` son ≥200 chars y contienen ejemplos ✅/❌ + una tabla markdown (los standards Kotlin también comprueban bloques ` ```kotlin `) |
| `[4/9]` Los archivos `claudeos-core/skills/**/*.md` no están vacíos; orchestrator + MANIFEST presentes |
| `[5/9]` `claudeos-core/guide/` tiene los 9 archivos esperados, cada uno no vacío (check de vacuidad BOM-aware) |
| `[6/9]` Archivos de `claudeos-core/plan/` no vacíos (informativo desde v2.1.2 — `plan/` ya no se auto-crea) |
| `[7/9]` Archivos de `claudeos-core/database/` existen (warning si faltan) |
| `[8/9]` Archivos de `claudeos-core/mcp-guide/` existen (warning si faltan) |
| `[9/9]` `claudeos-core/memory/` 4 archivos existen + validación estructural (decision-log fecha ISO, campos requeridos de failure-pattern, marcador `## Last Compaction` de compaction) |
| `[10/10]` Verificación de path-claim + drift de MANIFEST (3 sub-clases — ver abajo) |

**Sub-clases del check `[10/10]`:**

| Clase | Lo que detecta |
|---|---|
| `STALE_PATH` | Cualquier referencia `src/...\.(ts|tsx|js|jsx)` en `.claude/rules/**` o `claudeos-core/standard/**` debe resolver a un archivo real. Bloques de código entre fences y rutas placeholder (`src/{domain}/feature.ts`) quedan excluidos. |
| `STALE_SKILL_ENTRY` | Cada ruta de skill registrada en `claudeos-core/skills/00.shared/MANIFEST.md` debe existir en disco. |
| `MANIFEST_DRIFT` | Cada skill registrado debe mencionarse en `CLAUDE.md` (con **excepción orchestrator/sub-skill**: Pass 3b escribe Section 6 antes de que Pass 3c cree sub-skills, así que listar cada sub-skill es estructuralmente imposible). |

La excepción orchestrator/sub-skill: un sub-skill registrado en `{category}/{parent-stem}/{NN}.{name}.md` se considera cubierto cuando un orchestrator en `{category}/*{parent-stem}*.md` aparece mencionado en CLAUDE.md.

**Severidad:** content-validator corre a nivel **advisory**: aparece en la salida pero no bloquea CI. La razón: volver a correr Pass 3 no garantiza arreglar las alucinaciones del LLM, así que bloquear dejaría a los usuarios atrapados en bucles `--force`. La señal de detección (exit no-cero más entrada en `stale-report`) alcanza para pipelines CI y triage humano.

### 3. `pass-json-validator` — buena formación de salida de pase

Valida que los archivos JSON que escribe cada pase estén bien formados y contengan las claves esperadas. Vive en `pass-json-validator/`.

**Archivos validados:**

| Archivo | Claves requeridas |
|---|---|
| `project-analysis.json` | 5 claves requeridas (stack, domains, etc.) |
| `domain-groups.json` | 4 claves requeridas |
| `pass1-*.json` | 4 claves requeridas + objeto `analysisPerDomain` |
| `pass2-merged.json` | 10 secciones comunes (siempre) + 2 secciones backend (cuando hay stack backend) + 1 sección base kotlin + 2 secciones kotlin CQRS (cuando aplique). Match difuso con mapa de alias semántico; conteo de claves top-level <5 = ERROR, <9 = WARNING; detección de valores vacíos. |
| `pass3-complete.json` | Presencia y estructura del marker |
| `pass4-memory.json` | Estructura del marker: object, `passNum === 4`, array `memoryFiles` no vacío |

El check de pass2 es **stack-aware**: lee `project-analysis.json` para determinar backend/kotlin/cqrs y ajusta qué secciones espera.

**Severidad:** corre a nivel **warn-only**: aparece pero no bloquea CI.

### 4. `plan-validator` — Consistencia plan ↔ disco (legacy)

Compara archivos `claudeos-core/plan/*.md` contra disco. Vive en `plan-validator/`.

**3 modos:**
- `--check` (default): solo detectar drift
- `--refresh`: actualizar archivos de plan desde disco
- `--execute`: aplicar contenido del plan al disco (crea backups `.bak`)

**Estado v2.1.0:** La generación de master plan se eliminó en v2.1.0. `claudeos-core/plan/` ya no se auto-crea con `init`. Cuando `plan/` está ausente, este validator se salta con mensajes informativos.

Sigue en la suite de validators para usuarios que mantienen archivos de plan a mano para backup ad-hoc.

**Seguridad:** path traversal queda bloqueado: `isWithinRoot(absPath)` rechaza rutas que escapan a la raíz del proyecto con `../`.

**Severidad:** corre a nivel **fail** cuando hay drift real. No-op cuando `plan/` está ausente.

### 5. `sync-checker` — Consistencia disco ↔ Master Plan

Verifica que los archivos registrados en `sync-map.json` (lo escribe `manifest-generator`) coincidan con los archivos realmente en disco. Check bidireccional sobre los 7 directorios rastreados. Vive en `sync-checker/`.

**Check de dos pasos:**

1. **Disk → Plan:** Recorre 7 directorios rastreados (`.claude/rules`, `standard`, `skills`, `guide`, `database`, `mcp-guide`, `memory`) + `CLAUDE.md`. Reporta archivos que existen en disco pero no están registrados en `sync-map.json`.
2. **Plan → Disk:** Reporta rutas registradas en `sync-map.json` que ya no existen en disco (huérfanas).

**Exit code:** Solo los archivos huérfanos causan exit 1. Los archivos no registrados son informativos (un proyecto v2.1.0+ tiene cero rutas registradas por defecto, así que es el caso común).

**Severidad:** corre a nivel **fail** para archivos huérfanos. Skip limpio cuando `sync-map.json` no tiene mappings.

---

## Niveles de severidad

No todo check fallido es igual de serio. El `health-checker` orquesta los validators de runtime con severidad de tres niveles:

| Tier | Símbolo | Comportamiento |
|---|---|---|
| **fail** | `❌` | Bloquea la finalización. CI sale con código no-cero. Hay que arreglarlo. |
| **warn** | `⚠️` | Aparece en la salida pero no bloquea. Conviene investigar. |
| **advisory** | `ℹ️` | Revisar después. A veces son falsos positivos en layouts de proyecto inusuales. |

**Ejemplos por tier:**

- **fail:** plan-validator detecta drift real; sync-checker encuentra archivos huérfanos; falta un archivo de guía requerido.
- **warn:** pass-json-validator encuentra una brecha de schema no crítica.
- **advisory:** `STALE_PATH` de content-validator marca una ruta que existe pero está gitignored (falso positivo en algunos proyectos).

El sistema de 3 niveles se agregó para que los hallazgos de `content-validator` (que pueden ser falsos positivos en layouts inusuales) no bloqueen pipelines CI. Sin él, cada advisory bloquearía, y volver a correr `init` no arregla de forma fiable las alucinaciones del LLM.

La línea de resumen muestra el desglose:
```
All systems operational (1 advisory, 1 warning)
```

---

## Por qué dos puntos de entrada: `lint` vs `health`

```bash
npx claudeos-core lint     # solo claude-md-validator
npx claudeos-core health   # 4 otros validators
```

**¿Por qué la división?**

`claude-md-validator` encuentra issues **estructurales**: conteo de secciones equivocado, tabla de archivos de memoria redeclarada, heading canónico al que le falta el token inglés. Estas son señales de que **CLAUDE.md hay que regenerarlo**, no soft warnings para investigar. La solución es volver a correr `init` (con `--force` si hace falta).

Los otros validators encuentran issues de **contenido**: paths, entradas de manifest, brechas de schema. Estos pueden revisarse y arreglarse a mano sin regenerar todo.

Mantener `lint` separado permite usarlo en hooks pre-commit (rápido, solo estructural) sin arrastrar los checks de contenido más lentos.

---

## Ejecutar validación

```bash
# Corre validación estructural sobre CLAUDE.md
npx claudeos-core lint

# Corre la suite health de 4 validators
npx claudeos-core health
```

Para CI, `health` es el check recomendado. Sigue siendo rápido (sin llamadas LLM) y cubre todo salvo los checks estructurales de CLAUDE.md, que la mayoría de las pipelines CI no necesitan verificar en cada commit.

Para hooks pre-commit, `lint` es lo bastante rápido para correrlo en cada commit.

---

## Formato de salida

Los validators producen salida legible por humanos por defecto:

```
[content-validator]
ℹ advisory  STALE_PATH  src/legacy/oldRoutes.ts → file does not exist
            (cited in claudeos-core/standard/10.backend/03.routing.md:42)

[sync-checker]
✓ pass     0 orphaned files; 0 unregistered files
```

El `manifest-generator` escribe artefactos legibles por máquina en `claudeos-core/generated/`:

- `rule-manifest.json`: lista de archivos + frontmatter de gray-matter + stat
- `sync-map.json`: mappings de paths registrados (v2.1.0+: array vacío por defecto)
- `stale-report.json`: hallazgos consolidados de todos los validators

---

## Integración CI

Un ejemplo mínimo de GitHub Actions:

```yaml
name: ClaudeOS Health
on: [push, pull_request]
jobs:
  health:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v5
        with:
          node-version: '20'
      - run: npx claudeos-core health
```

El exit code es no-cero solo para hallazgos a nivel `fail`. `warn` y `advisory` imprimen pero no fallan el build.

El workflow CI oficial (en `.github/workflows/test.yml`) corre sobre `ubuntu-latest`, `windows-latest`, `macos-latest` × Node 18 / 20.

---

## Cuando los validators marcan algo con lo que no estás de acuerdo

Los falsos positivos pasan, sobre todo en layouts de proyecto inusuales (por ejemplo, archivos generados gitignored, pasos de build personalizados que emiten a paths no estándar).

**Para suprimir detección sobre un archivo específico**, mira [advanced-config.md](advanced-config.md) para los overrides `.claudeos-scan.json` disponibles.

**Si un validator está mal a nivel general** (no solo en tu proyecto), [abre un issue](https://github.com/claudeos-core/claudeos-core/issues): estos checks se afinan con el tiempo en base a reportes reales.

---

## Ver también

- [architecture.md](architecture.md): dónde encajan los validators en la pipeline
- [commands.md](commands.md): referencia de comandos `lint` y `health`
- [troubleshooting.md](troubleshooting.md): qué significan errores específicos de validator
