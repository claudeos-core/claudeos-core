# Architecture — La pipeline de 4 pasadas

Este documento explica cómo `claudeos-core init` funciona realmente, de principio a fin. Si solo quieres usar la herramienta, el [README principal](../../README.es.md) es suficiente — esto es para entender *por qué* el diseño es como es.

Si nunca has usado la herramienta, [ejecútala una vez primero](../../README.es.md#quick-start). Los conceptos a continuación se asentarán mucho más rápido tras ver la salida.

> Original en inglés: [docs/architecture.md](../architecture.md). La traducción al español se mantiene sincronizada con el inglés.

---

## La idea central — "El código confirma, Claude crea"

La mayoría de las herramientas que generan documentación de Claude Code funcionan en un paso:

```
Tu descripción  →  Claude  →  CLAUDE.md / rules / standards
```

Claude tiene que adivinar tu stack, tus convenciones, tu estructura de dominios. Adivina bien, pero adivina. ClaudeOS-Core invierte esto:

```
Tu código fuente
       ↓
[Step A: El código lee]      ← Scanner Node.js, determinístico, sin IA
       ↓
project-analysis.json     ← hechos confirmados: stack, dominios, rutas
       ↓
[Step B: Claude escribe]   ← Pipeline LLM de 4 pasadas, restringida por hechos
       ↓
[Step C: El código verifica]   ← 5 validators, ejecutados automáticamente
       ↓
.claude/rules/  +  claudeos-core/{standard,skills,guide,...}
```

**El código se encarga de las partes que tienen que ser exactas** (tu stack, tus rutas de archivo, tu estructura de dominios).
**Claude se encarga de las partes que tienen que ser expresivas** (explicaciones, convenciones, prosa).
No se solapan, y no se cuestionan mutuamente.

La razón por la que esto importa: un LLM no puede inventar rutas o frameworks que no estén realmente en tu código. El prompt de Pass 3 pasa explícitamente a Claude la allowlist de rutas de origen del scanner. Si Claude intenta citar una ruta que no está en la lista, el `content-validator` post-generación la marca.

---

## Step A — El scanner (determinístico)

Antes de que Claude se invoque siquiera, un proceso Node.js recorre tu proyecto y escribe `claudeos-core/generated/project-analysis.json`. Este archivo es la única fuente de verdad para todo lo que viene después.

### Qué lee el scanner

El scanner recoge señales de estos archivos en la raíz del proyecto:

| Archivo | Lo que le dice al scanner |
|---|---|
| `package.json` | Proyecto Node.js; framework vía `dependencies` |
| `pom.xml` | Proyecto Java/Maven |
| `build.gradle` / `build.gradle.kts` | Proyecto Java/Kotlin Gradle |
| `pyproject.toml` / `requirements.txt` | Proyecto Python; framework vía paquetes |
| `angular.json` | Proyecto Angular |
| `nuxt.config.{ts,js}` | Proyecto Nuxt |
| `next.config.{ts,js}` | Proyecto Next.js |
| `vite.config.{ts,js}` | Proyecto Vite |
| Archivos `.env*` | Configuración de runtime (port, host, DB URL — ver abajo) |

Si nada coincide, `init` se detiene con un error claro en lugar de adivinar.

### Lo que el scanner escribe en `project-analysis.json`

- **Metadatos del stack** — language, framework, ORM, DB, package manager, build tool, logger.
- **Patrón de arquitectura** — para Java, uno de 5 patrones (layer-first / domain-first / layer-then-domain / domain-then-layer / hexagonal). Para Kotlin, detección de CQRS / BFF / multi-module. Para frontend, layouts App Router / Pages Router / FSD más patrones `components/*/`, con fallbacks multi-etapa.
- **Lista de dominios** — descubierta recorriendo el árbol de directorios, con un conteo de archivos por dominio. El scanner elige uno o dos archivos representativos por dominio para que Pass 1 los lea.
- **Allowlist de rutas de origen** — cada ruta de archivo fuente que existe en tu proyecto. Los prompts de Pass 3 incluyen esta lista explícitamente para que Claude no tenga que adivinar nada.
- **Estructura monorepo** — Turborepo (`turbo.json`), pnpm workspaces (`pnpm-workspace.yaml`), Lerna (`lerna.json`) y npm/yarn workspaces (`package.json#workspaces`), cuando están presentes. NX no se auto-detecta específicamente; los patrones genéricos `apps/*/` y `packages/*/` los siguen captando los scanners por stack de todas formas.
- **Snapshot de `.env`** — port, host, API target, vars sensibles redactadas. Ver [stacks.md](stacks.md) para el orden de búsqueda.

El scanner **no tiene llamadas a LLM**. Mismo proyecto + mismo código = mismo `project-analysis.json`, cada vez.

Para detalles por stack (qué extrae cada scanner y cómo), ver [stacks.md](stacks.md).

---

## Step B — La pipeline de Claude de 4 pasadas

Cada pase tiene un trabajo específico. Se ejecutan en secuencia, leyendo el Pass N la salida de Pass (N-1) como un archivo estructurado pequeño (no la salida completa de todos los pases anteriores).

### Pass 1 — Análisis profundo por dominio

**Entrada:** `project-analysis.json` + un archivo representativo de cada dominio.

**Qué hace:** Lee los archivos representativos y extrae patrones a través de docenas de categorías de análisis por stack (típicamente entre 50 y 100+ ítems a nivel bullet, variando por stack — la plantilla CQRS-aware de Kotlin/Spring es la más densa, las plantillas ligeras de Node.js son las más compactas). Por ejemplo: "¿Este controller usa `@RestController` o `@Controller`? ¿Qué wrapper de respuesta se usa? ¿Qué librería de logging?"

**Salida:** `pass1-<group-N>.json` — un archivo por grupo de dominios.

Para proyectos grandes, Pass 1 se ejecuta varias veces — una invocación por grupo de dominios. La regla de agrupación es **como máximo 4 dominios y 40 archivos por grupo**, aplicada automáticamente en `plan-installer/domain-grouper.js`. Un proyecto de 12 dominios ejecutaría Pass 1 tres veces.

Esta división existe porque la ventana de contexto de Claude es finita. Tratar de meter los archivos fuente de 12 dominios en un solo prompt o desbordaría el contexto o forzaría al LLM a pasar por encima. Dividir mantiene cada pase enfocado.

### Pass 2 — Merge entre dominios

**Entrada:** Todos los archivos `pass1-*.json`.

**Qué hace:** Los fusiona en una imagen única a nivel de proyecto. Cuando dos dominios discrepan (p. ej., uno dice que el wrapper de respuesta es `success()`, otro dice `ok()`), Pass 2 elige la convención dominante y anota la discrepancia.

**Salida:** `pass2-merged.json` — típicamente 100–400 KB.

### Pass 3 — Generación de documentación (split mode)

**Entrada:** `pass2-merged.json`.

**Qué hace:** Escribe la documentación real. Este es el pase pesado — produce ~40–50 archivos markdown a través de CLAUDE.md, `.claude/rules/`, `claudeos-core/standard/`, `claudeos-core/skills/`, `claudeos-core/guide/`, `claudeos-core/database/` y `claudeos-core/mcp-guide/`.

**Salida:** Todos los archivos para el usuario, organizados en la estructura de directorios mostrada en el [README principal](../../README.es.md#quick-start).

Para mantener la salida de cada etapa dentro de la ventana de contexto de Claude (la entrada Pass 2 fusionada es grande, y la salida generada es aún mayor), Pass 3 **siempre se divide en etapas** — incluso para proyectos pequeños. La división se aplica incondicionalmente; los proyectos pequeños solo tienen menos batches por dominio:

| Etapa | Lo que escribe |
|---|---|
| **3a** | Una pequeña "tabla de hechos" (`pass3a-facts.md`) extraída de `pass2-merged.json`. Actúa como una entrada comprimida para etapas posteriores para que no tengan que volver a leer el archivo merged grande. |
| **3b-core** | Genera `CLAUDE.md` (el índice que Claude Code lee primero) + el grueso de `claudeos-core/standard/`. |
| **3b-N** | Archivos de rule y standard por dominio (una etapa por grupo de ≤15 dominios). |
| **3c-core** | Genera los archivos orchestrator de `claudeos-core/skills/` + `claudeos-core/guide/`. |
| **3c-N** | Archivos de skill por dominio. |
| **3d-aux** | Genera contenido auxiliar bajo `claudeos-core/database/` y `claudeos-core/mcp-guide/`. |

Para proyectos muy grandes (≥16 dominios), 3b y 3c se subdividen en batches. Cada batch obtiene una ventana de contexto fresca.

Después de que todas las etapas terminen exitosamente, se escribe `pass3-complete.json` como marcador. Si `init` se interrumpe a mitad de camino, la siguiente ejecución lee el marcador y reanuda desde la siguiente etapa no iniciada — las etapas completadas no se vuelven a ejecutar.

### Pass 4 — Memory layer scaffolding

**Entrada:** `project-analysis.json`, `pass2-merged.json`, `pass3a-facts.md`.

**Qué hace:** Genera el L4 memory layer más las reglas universales de scaffold. Todas las escrituras de scaffold son **skip-if-exists**, así que re-ejecutar Pass 4 no sobrescribe nada.

- `claudeos-core/memory/` — 4 archivos markdown (`decision-log.md`, `failure-patterns.md`, `compaction.md`, `auto-rule-update.md`)
- `.claude/rules/60.memory/` — 4 archivos de rule (`01.decision-log.md`, `02.failure-patterns.md`, `03.compaction.md`, `04.auto-rule-update.md`) que auto-cargan los archivos de memoria cuando Claude Code está editando áreas relevantes
- `.claude/rules/00.core/51.doc-writing-rules.md` y `52.ai-work-rules.md` — reglas genéricas universales (Pass 3 genera reglas `00.core` específicas del proyecto como `00.standard-reference.md`; Pass 4 añade estos dos archivos de slot reservado si aún no existen)
- `claudeos-core/standard/00.core/<NN>.doc-writing-guide.md` — meta-guía para escribir reglas adicionales. El prefijo numérico se asigna automáticamente a `Math.max(existing-numbers) + 1`, así que típicamente es `04` o `05` dependiendo de lo que Pass 3 ya haya escrito allí.

**Salida:** Archivos de memoria + marcador `pass4-memory.json`.

Importante: **Pass 4 no modifica `CLAUDE.md`.** Pass 3 ya redactó la Section 8 (que referencia los archivos de memoria). Modificar CLAUDE.md de nuevo aquí volvería a declarar el contenido de Section 8 y dispararía errores de validator. Esto se aplica a través del prompt y se verifica con `tests/pass4-claude-md-untouched.test.js`.

Para detalles sobre lo que hace cada archivo de memoria y el ciclo de vida, ver [memory-layer.md](memory-layer.md).

---

## Step C — Verificación (determinística, post-Claude)

Después de que Claude termina, código Node.js verifica la salida a través de 5 validators. **Ninguno llama a un LLM** — todos los checks son determinísticos.

| Validator | Qué comprueba |
|---|---|
| `claude-md-validator` | Checks estructurales sobre `CLAUDE.md` (conteo de secciones top-level, conteos H3/H4 por sección, unicidad/scope de filas de tabla de archivos de memoria, tokens canónicos T1 de heading). Language-invariant — los mismos checks pasan para los 10 idiomas de salida. |
| `content-validator` | 10 checks a nivel de contenido: archivos requeridos existen, rutas citadas en standards/skills son reales, MANIFEST es consistente. |
| `pass-json-validator` | Las salidas JSON de Pass 1 / 2 / 3 / 4 están bien formadas y contienen las claves esperadas. |
| `plan-validator` | (Legacy) Compara archivos de plan guardados con disco. La generación de master plan se eliminó en v2.1.0, así que esto es mayormente un no-op ahora — se mantiene por back-compat. |
| `sync-checker` | Los archivos en disco bajo directorios rastreados coinciden con los registros de `sync-map.json` (huérfanos vs. no registrados). |

Estos tienen **3 niveles de severidad**:

- **fail** — Bloquea la finalización, sale con código distinto de cero en CI. Algo está estructuralmente roto.
- **warn** — Aparece en la salida, pero no bloquea. Vale la pena investigar.
- **advisory** — Revisar después. A menudo falsos positivos en layouts de proyecto inusuales (p. ej., archivos gitignored marcados como "missing").

Para la lista completa de checks por validator, ver [verification.md](verification.md).

Los validators se orquestan de dos maneras:

1. **`claudeos-core lint`** — ejecuta solo `claude-md-validator`. Rápido, solo estructural. Úsalo después de editar CLAUDE.md manualmente.
2. **`claudeos-core health`** — ejecuta los otros 4 validators (claude-md-validator se mantiene separado intencionalmente, ya que el drift estructural en CLAUDE.md es una señal de re-init, no un soft warning). Recomendado en CI.

---

## Por qué importa esta arquitectura

### Los prompts inyectados con hechos previenen alucinaciones

Cuando Pass 3 corre, el prompt se ve aproximadamente así (simplificado):

```
Stack: java-spring-boot
ORM: mybatis
Architecture pattern: layer-first

Allowed source paths (you may only cite these):
- src/main/java/com/example/order/controller/OrderController.java
- src/main/java/com/example/order/service/OrderService.java
- ... [497 more]

DO NOT cite paths outside this list.

Now, for each domain, write a "Skill" that explains the domain's
conventions...
```

Claude no tiene oportunidad de inventar rutas. La restricción es **positiva** (whitelist), no negativa ("no inventes cosas") — la diferencia importa porque los LLMs cumplen mejor con restricciones positivas concretas que con restricciones negativas abstractas.

Si pese a esto Claude aún cita una ruta fabricada, el check `content-validator [10/10]` al final la marca como `STALE_PATH`. El usuario ve el aviso antes de que los docs se envíen.

### Resume-safe vía marcadores

Cada pase escribe un archivo de marcador (`pass1-<N>.json`, `pass2-merged.json`, `pass3-complete.json`, `pass4-memory.json`) cuando se completa con éxito. Si `init` se interrumpe (corte de red, timeout, Ctrl-C tuyo), la siguiente ejecución lee los marcadores y retoma donde quedó la última. No pierdes trabajo.

El marcador de Pass 3 también rastrea **qué sub-etapas** se completaron, así un Pass 3 parcial (p. ej., 3b terminó, 3c crasheó a mitad de etapa) reanuda desde la siguiente etapa, no desde 3a.

### Re-ejecuciones idempotentes

Ejecutar `init` en un proyecto que ya tiene reglas **no** sobrescribe silenciosamente las ediciones manuales.

El mecanismo: el sistema de permisos de Claude Code bloquea las escrituras de subprocesos a `.claude/`, incluso con `--dangerously-skip-permissions`. Así que se instruye a Pass 3/4 que escriban los archivos de regla en `claudeos-core/generated/.staged-rules/` en su lugar. Después de cada pase, el orquestador Node.js (que no está sujeto a la política de permisos de Claude Code) mueve los archivos staged a `.claude/rules/`.

En la práctica esto significa: **en un proyecto nuevo, re-ejecutar crea todo de nuevo. En un proyecto donde has editado reglas manualmente, re-ejecutar con `--force` regenera desde cero (tus ediciones se pierden — eso es lo que `--force` significa). Sin `--force`, el mecanismo de resume entra en juego y solo se ejecutan los pases no completados.**

Para la historia completa de preservación, ver [safety.md](safety.md).

### Verificación language-invariant

Los validators no hacen match con texto de heading traducido. Hacen match con la **forma estructural** (niveles de heading, conteos, ordenamiento). Esto significa que el mismo `claude-md-validator` produce veredictos idénticos byte por byte sobre un CLAUDE.md generado en cualquiera de los 10 idiomas soportados. Sin diccionarios por idioma. Sin carga de mantenimiento al añadir un nuevo idioma.

---

## Rendimiento — qué esperar

Los tiempos concretos dependen mucho de:
- Tamaño del proyecto (número de archivos fuente, número de dominios)
- Latencia de red a la API de Anthropic
- Qué modelo Claude está seleccionado en tu config de Claude Code

Guía aproximada:

| Paso | Tiempo en proyecto pequeño (<200 archivos) | Tiempo en proyecto mediano (~1000 archivos) |
|---|---|---|
| Step A (scanner) | < 5 segundos | 10–30 segundos |
| Step B (4 pases Claude) | Unos pocos minutos | 10–30 minutos |
| Step C (validators) | < 5 segundos | 10–20 segundos |

Pass 1 domina el reloj de pared en proyectos grandes porque se ejecuta una vez por grupo de dominios. Un proyecto de 24 dominios = 6 invocaciones de Pass-1 (24 / 4 dominios por grupo).

Si quieres un número preciso, ejecútalo una vez en tu proyecto — esa es la única respuesta honesta.

---

## Dónde vive el código de cada paso

| Paso | Archivo |
|---|---|
| Orquestador del scanner | `plan-installer/index.js` |
| Detección de stack | `plan-installer/stack-detector.js` |
| Scanners por stack | `plan-installer/scanners/scan-{java,kotlin,node,python,frontend}.js` |
| Agrupación de dominios | `plan-installer/domain-grouper.js` |
| Ensamblado de prompts | `plan-installer/prompt-generator.js` |
| Orquestador de init | `bin/commands/init.js` |
| Plantillas de pase | `pass-prompts/templates/<stack>/pass{1,2,3}.md` por stack; `pass-prompts/templates/common/pass4.md` compartido entre stacks |
| Memory scaffolding | `lib/memory-scaffold.js` |
| Validators | `claude-md-validator/`, `content-validator/`, `pass-json-validator/`, `plan-validator/`, `sync-checker/` |
| Orquestador de verificación | `health-checker/index.js` |

---

## Lectura adicional

- [stacks.md](stacks.md) — qué extrae cada scanner por stack
- [memory-layer.md](memory-layer.md) — Pass 4 en detalle
- [verification.md](verification.md) — los 5 validators
- [diagrams.md](diagrams.md) — la misma arquitectura como imágenes Mermaid
- [comparison.md](comparison.md) — cómo difiere esto de otras herramientas Claude Code
