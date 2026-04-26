# Comandos CLI

Cada comando, cada flag, cada exit code que ClaudeOS-Core soporta realmente.

Esta página es una referencia. Si eres nuevo, lee primero el [Quick Start del README principal](../../README.es.md#quick-start).

Todos los comandos se ejecutan vía `npx claudeos-core <command>` (o `claudeos-core <command>` si está instalado globalmente — ver [manual-installation.md](manual-installation.md)).

> Original en inglés: [docs/commands.md](../commands.md). La traducción al español se mantiene sincronizada con el inglés.

---

## Flags globales

Estos funcionan en todos los comandos:

| Flag | Efecto |
|---|---|
| `--help` / `-h` | Muestra ayuda. Cuando se coloca después de un comando (p. ej., `memory --help`), el subcomando maneja su propia ayuda. |
| `--version` / `-v` | Imprime la versión instalada. |
| `--lang <code>` | Idioma de salida. Uno de: `en`, `ko`, `ja`, `zh-CN`, `es`, `vi`, `hi`, `ru`, `fr`, `de`. Default: `en`. Actualmente consumido solo por `init`. |
| `--force` / `-f` | Salta el prompt de resume; borra resultados anteriores. Actualmente consumido solo por `init`. |

Esa es la lista completa de flags CLI. **Sin `--json`, `--strict`, `--quiet`, `--verbose`, `--dry-run`, etc.** Si los has visto en docs antiguos, no son reales — `bin/cli.js` parsea solo los cuatro flags de arriba.

---

## Referencia rápida

| Comando | Úsalo cuando |
|---|---|
| `init` | Primera vez en un proyecto. Genera todo. |
| `lint` | Después de editar manualmente `CLAUDE.md`. Ejecuta validación estructural. |
| `health` | Antes de commit, o en CI. Ejecuta los cuatro validators de contenido/path. |
| `restore` | Plan guardado → disco. (Mayormente no-op desde v2.1.0; mantenido por back-compat.) |
| `refresh` | Disco → plan guardado. (Mayormente no-op desde v2.1.0; mantenido por back-compat.) |
| `validate` | Ejecuta el modo `--check` de plan-validator. (Mayormente no-op desde v2.1.0.) |
| `memory <sub>` | Mantenimiento del memory layer: `compact`, `score`, `propose-rules`. |

`restore` / `refresh` / `validate` se mantienen porque son inofensivos en proyectos que no usan los archivos de plan legacy. Si `plan/` no existe (el default v2.1.0+), todos se saltan con mensajes informativos.

---

## `init` — Generar el set de documentación

```bash
npx claudeos-core init [--lang <code>] [--force]
```

El comando principal. Ejecuta la [pipeline de 4 pasadas](architecture.md) de extremo a extremo:

1. El scanner produce `project-analysis.json`.
2. Pass 1 analiza cada grupo de dominios.
3. Pass 2 fusiona dominios en una imagen a nivel de proyecto.
4. Pass 3 genera CLAUDE.md, rules, standards, skills, guides.
5. Pass 4 hace scaffold del memory layer.

**Ejemplos:**

```bash
# Primera vez, salida en inglés
npx claudeos-core init

# Primera vez, salida en español
npx claudeos-core init --lang es

# Re-hacer todo desde cero
npx claudeos-core init --force
```

### Resume safety

`init` es **resume-safe**. Si se interrumpe (corte de red, timeout, Ctrl-C), la siguiente ejecución retoma desde el último marker de pase completado. Los markers viven en `claudeos-core/generated/`:

- `pass1-<group>.json` — salida Pass 1 por dominio
- `pass2-merged.json` — salida Pass 2
- `pass3-complete.json` — marker Pass 3 (también rastrea qué sub-etapas de split mode se completaron)
- `pass4-memory.json` — marker Pass 4

Si un marker está malformado (p. ej., un crash a mitad de escritura dejó `{"error":"timeout"}`), el validator lo rechaza y el pase se re-ejecuta.

Para un Pass 3 parcial (split mode interrumpido entre etapas), el mecanismo de resume inspecciona el cuerpo del marker — si `mode === "split"` y `completedAt` falta, Pass 3 se re-invoca y reanuda desde la siguiente etapa no iniciada.

### Qué hace `--force`

`--force` borra:
- Cada archivo `.json` y `.md` bajo `claudeos-core/generated/` (incluyendo los cuatro pass markers)
- El directorio `claudeos-core/generated/.staged-rules/` sobrante si alguna ejecución previa crasheó a mitad de move
- Todo bajo `.claude/rules/` (para que la "zero-rules detection" de Pass 3 no pueda dar falso negativo en reglas viejas)

`--force` **no** borra:
- Archivos `claudeos-core/memory/` (tu decision log y failure patterns se preservan)
- Archivos fuera de `claudeos-core/` y `.claude/`

**Las ediciones manuales a las reglas se pierden bajo `--force`.** Ese es el trade-off — `--force` existe para "quiero un slate limpio". Si quieres preservar ediciones, simplemente re-ejecuta sin `--force`.

### Interactivo vs no-interactivo

Sin `--lang`, `init` muestra un selector de idioma interactivo (10 opciones, flechas o entrada numérica). En entornos no-TTY (CI, entrada por pipe), el selector cae a readline, luego a un default no-interactivo si no hay entrada.

Sin `--force`, si se detectan markers de pase existentes, `init` muestra un prompt Continue / Fresh. Pasar `--force` salta este prompt completamente.

---

## `lint` — Validar la estructura de `CLAUDE.md`

```bash
npx claudeos-core lint
```

Ejecuta `claude-md-validator` contra el `CLAUDE.md` de tu proyecto. Rápido — sin llamadas LLM, solo checks estructurales.

**Exit codes:**
- `0` — Pasa.
- `1` — Falla. Al menos un issue estructural.

**Lo que comprueba** (ver [verification.md](verification.md) para la lista completa de check IDs):

- El conteo de secciones debe ser exactamente 8.
- Section 4 debe tener 3 o 4 sub-secciones H3.
- Section 6 debe tener exactamente 3 sub-secciones H3.
- Section 8 debe tener exactamente 2 sub-secciones H3 (Common Rules + L4 Memory) Y exactamente 2 sub-sub-secciones H4 (L4 Memory Files + Memory Workflow).
- Cada heading de sección canónica debe contener su token inglés (p. ej., `Role Definition`, `Memory`) para que el grep multi-repo funcione independientemente de `--lang`.
- Cada uno de los 4 archivos de memoria aparece en exactamente UNA fila de tabla markdown, confinada a Section 8.

El validator es **language-invariant**: los mismos checks funcionan sobre un CLAUDE.md generado con `--lang ko`, `--lang ja` o cualquier otro idioma soportado.

Adecuado para hooks pre-commit y CI.

---

## `health` — Ejecutar la suite de verificación

```bash
npx claudeos-core health
```

Orquesta **4 validators** (claude-md-validator se ejecuta separadamente vía `lint`):

| Orden | Validator | Tier | Qué pasa al fallar |
|---|---|---|---|
| 1 | `manifest-generator` (prerequisito) | — | Si esto falla, `sync-checker` se salta. |
| 2 | `plan-validator` | fail | Exit 1. |
| 3 | `sync-checker` | fail | Exit 1 (si manifest tuvo éxito). |
| 4 | `content-validator` | advisory | Aparece pero no bloquea. |
| 5 | `pass-json-validator` | warn | Aparece pero no bloquea. |

**Exit codes:**
- `0` — Sin hallazgos a nivel `fail`. Pueden estar presentes warnings y advisories.
- `1` — Al menos un hallazgo a nivel `fail`.

La severidad de 3 niveles (fail / warn / advisory) se añadió para que los hallazgos de `content-validator` (que a menudo tienen falsos positivos en layouts inusuales) no deadlockeen pipelines CI.

Para detalles de los checks de cada validator, ver [verification.md](verification.md).

---

## `restore` — Aplicar plan guardado al disco (legacy)

```bash
npx claudeos-core restore
```

Ejecuta `plan-validator` en modo `--execute`: copia contenido de archivos `claudeos-core/plan/*.md` a las ubicaciones que describen.

**Estado v2.1.0:** La generación de master plan se eliminó. `claudeos-core/plan/` ya no se auto-crea. Si `plan/` no existe, este comando registra un mensaje informativo y sale limpiamente.

El comando se mantiene para usuarios que mantienen archivos de plan a mano para fines de backup/restore ad-hoc. Es inofensivo ejecutarlo en un proyecto v2.1.0+.

Crea un backup `.bak` de cualquier archivo que sobrescriba.

---

## `refresh` — Sincronizar disco al plan guardado (legacy)

```bash
npx claudeos-core refresh
```

El inverso de `restore`. Ejecuta `plan-validator` en modo `--refresh`: lee el estado actual de los archivos de disco y actualiza `claudeos-core/plan/*.md` para que coincidan.

**Estado v2.1.0:** Igual que `restore` — no-op cuando `plan/` está ausente.

---

## `validate` — Diff plan ↔ disco (legacy)

```bash
npx claudeos-core validate
```

Ejecuta `plan-validator` en modo `--check`: reporta diferencias entre `claudeos-core/plan/*.md` y el disco, pero no modifica nada.

**Estado v2.1.0:** No-op cuando `plan/` está ausente. La mayoría de los usuarios deberían ejecutar `health` en su lugar, que llama a `plan-validator` junto con los otros validators.

---

## `memory <subcommand>` — Mantenimiento del memory layer

```bash
npx claudeos-core memory <subcommand>
```

Tres subcomandos. Los subcomandos operan sobre archivos `claudeos-core/memory/` escritos por Pass 4 de `init`. Si esos archivos faltan, cada subcomando registra `not found` y se salta gracefully (herramientas best-effort).

Para detalles del modelo de memoria, ver [memory-layer.md](memory-layer.md).

### `memory compact`

```bash
npx claudeos-core memory compact
```

Aplica una compactación de 4 etapas sobre `decision-log.md` y `failure-patterns.md`:

| Etapa | Trigger | Acción |
|---|---|---|
| 1 | `lastSeen > 30 days` Y no preservado | El cuerpo se colapsa a un "fix" de 1 línea + meta |
| 2 | Headings duplicados | Fusionados (frequencies sumadas, body = más reciente) |
| 3 | `importance < 3` Y `lastSeen > 60 days` | Descartado |
| 4 | Archivo > 400 líneas | Recortar las entradas más viejas no preservadas |

Las entradas con `importance >= 7`, `lastSeen < 30 days`, o un body que referencia una ruta de regla activa concreta (no glob) se auto-preservan.

Después de la compactación, solo la sección `## Last Compaction` de `compaction.md` se reemplaza — todo lo demás (tus notas manuales) se preserva.

### `memory score`

```bash
npx claudeos-core memory score
```

Recomputa scores de importance para entradas en `failure-patterns.md`:

```
importance = round(frequency × 1.5 + recency × 5), capped at 10
```

Elimina cualquier línea de importance existente antes de la inserción (previene regresiones de línea duplicada). El nuevo score se escribe de vuelta en el body de la entrada.

### `memory propose-rules`

```bash
npx claudeos-core memory propose-rules
```

Lee `failure-patterns.md`, elige entradas con frequency ≥ 3, y pide a Claude que redacte contenido de regla `.claude/rules/` propuesto para los candidatos top.

Confidence por candidato:
```
evidence    = 1.5 × frequency + 0.5 × importance   (importance default 0; capado a 6 si importance falta)
confidence  = sigmoid_{k=0.35, x0=8}(evidence) × (anchored ? 1.0 : 0.6)
```

(`anchored` = la entrada menciona una ruta de archivo concreta que existe en disco.)

La salida se **añade a `claudeos-core/memory/auto-rule-update.md`** para tu revisión. **No se auto-aplica** — tú decides qué sugerencias copiar a archivos de regla reales.

---

## Variables de entorno

| Variable | Efecto |
|---|---|
| `CLAUDEOS_SKIP_TRANSLATION=1` | Corta el path de traducción de memory-scaffold; lanza antes de invocar `claude -p`. Usado por CI y tests dependientes de traducción para que no necesiten una instalación real de Claude CLI. Semántica estricta `=== "1"` — otros valores no la activan. |
| `CLAUDEOS_ROOT` | Establecido automáticamente por `bin/cli.js` a la raíz del proyecto del usuario. Interno — no sobrescribir. |

Esa es la lista completa. No hay `CLAUDE_PATH`, `DEBUG=claudeos:*`, `CLAUDEOS_NO_COLOR`, etc. — esos no existen.

---

## Exit codes

| Code | Significado |
|---|---|
| `0` | Éxito. |
| `1` | Fallo de validación (hallazgo a nivel `fail`) o `InitError` (p. ej., prerequisito ausente, marker malformado, file lock). |
| Otro | Burbuja del proceso Node subyacente o sub-tool — excepciones no atrapadas, errores de escritura, etc. |

No hay un exit code especial para "interrumpido" — Ctrl-C simplemente termina el proceso. Re-ejecuta `init` y el mecanismo de resume toma el control.

---

## Lo que `npm test` ejecuta (para contribuidores)

Si has clonado el repo y quieres ejecutar la suite de tests localmente:

```bash
npm test
```

Esto ejecuta `node tests/*.test.js` a través de 33 archivos de test. La suite de tests usa el runner `node:test` integrado de Node (sin Jest, sin Mocha) y `node:assert/strict` de Node.

Para un único archivo de test:

```bash
node tests/scan-java.test.js
```

CI ejecuta la suite en Linux / macOS / Windows × Node 18 / 20. El workflow CI define `CLAUDEOS_SKIP_TRANSLATION=1` para que los tests dependientes de traducción no necesiten un CLI `claude`.

---

## Ver también

- [architecture.md](architecture.md) — qué hace `init` realmente por dentro
- [verification.md](verification.md) — qué comprueban los validators
- [memory-layer.md](memory-layer.md) — sobre qué operan los subcomandos `memory`
- [troubleshooting.md](troubleshooting.md) — cuando los comandos fallan
