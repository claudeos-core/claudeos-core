# Comandos CLI

Cada comando, cada flag y cada exit code que ClaudeOS-Core soporta de verdad.

Esta página es una referencia. Si recién empiezas, lee primero el [Inicio rápido del README principal](../../README.es.md#inicio-rápido).

Todos los comandos corren con `npx claudeos-core <command>` (o `claudeos-core <command>` si lo instalaste globalmente: ver [manual-installation.md](manual-installation.md)).

> Original en inglés: [docs/commands.md](../commands.md). La traducción al español se mantiene sincronizada con el inglés.

---

## Flags globales

Estos funcionan en todos los comandos:

| Flag | Efecto |
|---|---|
| `--help` / `-h` | Muestra ayuda. Si va después de un comando (por ejemplo, `memory --help`), el subcomando maneja su propia ayuda. |
| `--version` / `-v` | Imprime la versión instalada. |
| `--lang <code>` | Idioma de salida. Uno de: `en`, `ko`, `ja`, `zh-CN`, `es`, `vi`, `hi`, `ru`, `fr`, `de`. Default: `en`. Hoy solo lo consume `init`. |
| `--force` / `-f` | Salta el prompt de resume y borra resultados anteriores. Hoy solo lo consume `init`. |

Esa es la lista completa de flags CLI. **No existen `--json`, `--strict`, `--quiet`, `--verbose`, `--dry-run` ni similares.** Si los viste en docs antiguos, no son reales: `bin/cli.js` parsea solo los cuatro flags de arriba.

---

## Referencia rápida

| Comando | Úsalo cuando |
|---|---|
| `init` | Primera vez en un proyecto. Genera todo. |
| `lint` | Después de editar `CLAUDE.md` a mano. Corre validación estructural. |
| `health` | Antes de hacer commit, o en CI. Corre los cuatro validators de contenido/path. |
| `restore` | Plan guardado → disco. (Casi no-op desde v2.1.0; queda por back-compat.) |
| `refresh` | Disco → plan guardado. (Casi no-op desde v2.1.0; queda por back-compat.) |
| `validate` | Corre el modo `--check` de plan-validator. (Casi no-op desde v2.1.0.) |
| `memory <sub>` | Mantenimiento del memory layer: `compact`, `score`, `propose-rules`. |

`restore` / `refresh` / `validate` siguen existiendo porque son inofensivos en proyectos que no usan los archivos de plan legacy. Si `plan/` no existe (el default desde v2.1.0), los tres se saltan con mensajes informativos.

---

## `init` — Generar el set de documentación

```bash
npx claudeos-core init [--lang <code>] [--force]
```

El comando principal. Corre la [pipeline de 4 pasadas](architecture.md) de extremo a extremo:

1. El scanner produce `project-analysis.json`.
2. Pass 1 analiza cada grupo de dominios.
3. Pass 2 fusiona dominios en una imagen a nivel de proyecto.
4. Pass 3 genera CLAUDE.md, rules, standards, skills y guides.
5. Pass 4 levanta el scaffolding del memory layer.

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

- `pass1-<group>.json`: salida Pass 1 por dominio
- `pass2-merged.json`: salida Pass 2
- `pass3-complete.json`: marker Pass 3 (también rastrea qué sub-etapas de split mode terminaron)
- `pass4-memory.json`: marker Pass 4

Si un marker está malformado (por ejemplo, un crash a mitad de escritura dejó `{"error":"timeout"}`), el validator lo rechaza y el pase corre de nuevo.

Para un Pass 3 parcial (split mode interrumpido entre etapas), el mecanismo de resume inspecciona el cuerpo del marker. Si `mode === "split"` y falta `completedAt`, Pass 3 se invoca otra vez y reanuda desde la siguiente etapa no iniciada.

### Qué hace `--force`

`--force` borra:
- Cada archivo `.json` y `.md` dentro de `claudeos-core/generated/` (incluidos los cuatro pass markers)
- El directorio `claudeos-core/generated/.staged-rules/` sobrante si alguna ejecución previa crasheó a mitad de move
- Todo dentro de `.claude/rules/` (para que la "zero-rules detection" de Pass 3 no dé falso negativo por reglas viejas)

`--force` **no** borra:
- Archivos de `claudeos-core/memory/` (el decision log y los failure patterns se preservan)
- Archivos fuera de `claudeos-core/` y `.claude/`

**Las ediciones manuales a las reglas se pierden con `--force`.** Es el trade-off: `--force` existe para "quiero un slate limpio". Si quieres conservar tus ediciones, vuelve a correr sin `--force`.

### Interactivo vs no-interactivo

Sin `--lang`, `init` muestra un selector de idioma interactivo (10 opciones, flechas o entrada numérica). En entornos no-TTY (CI, entrada por pipe), el selector cae a readline y luego a un default no-interactivo si no hay entrada.

Sin `--force`, si hay markers de pase existentes, `init` muestra un prompt Continue / Fresh. Pasar `--force` salta este prompt por completo.

---

## `lint` — Validar la estructura de `CLAUDE.md`

```bash
npx claudeos-core lint
```

Corre `claude-md-validator` contra el `CLAUDE.md` de tu proyecto. Rápido: sin llamadas LLM, solo checks estructurales.

**Exit codes:**
- `0`: Pasa.
- `1`: Falla. Al menos un issue estructural.

**Lo que comprueba** (ver [verification.md](verification.md) para la lista completa de check IDs):

- El conteo de secciones debe ser exactamente 8.
- Section 4 debe tener 3 o 4 sub-secciones H3.
- Section 6 debe tener exactamente 3 sub-secciones H3.
- Section 8 debe tener exactamente 2 sub-secciones H3 (Common Rules + L4 Memory) Y exactamente 2 sub-sub-secciones H4 (L4 Memory Files + Memory Workflow).
- Cada heading de sección canónica debe contener su token inglés (por ejemplo, `Role Definition`, `Memory`) para que el grep multi-repo funcione sin importar `--lang`.
- Cada uno de los 4 archivos de memoria aparece en exactamente UNA fila de tabla markdown, confinada a Section 8.

El validator es **language-invariant**: los mismos checks pasan sobre un CLAUDE.md generado con `--lang ko`, `--lang ja` o cualquier otro idioma soportado.

Va bien para hooks pre-commit y CI.

---

## `health` — Ejecutar la suite de verificación

```bash
npx claudeos-core health
```

Orquesta **4 validators** (claude-md-validator corre aparte con `lint`):

| Orden | Validator | Tier | Qué pasa al fallar |
|---|---|---|---|
| 1 | `manifest-generator` (prerequisito) | — | Si esto falla, `sync-checker` se salta. |
| 2 | `plan-validator` | fail | Exit 1. |
| 3 | `sync-checker` | fail | Exit 1 (si manifest tuvo éxito). |
| 4 | `content-validator` | advisory | Aparece pero no bloquea. |
| 5 | `pass-json-validator` | warn | Aparece pero no bloquea. |

**Exit codes:**
- `0`: Sin hallazgos a nivel `fail`. Puede haber warnings y advisories.
- `1`: Al menos un hallazgo a nivel `fail`.

La severidad de 3 niveles (fail / warn / advisory) se agregó para que los hallazgos de `content-validator` (que muchas veces son falsos positivos en layouts inusuales) no bloqueen pipelines CI.

Para los detalles de los checks de cada validator, ver [verification.md](verification.md).

---

## `restore` — Aplicar plan guardado al disco (legacy)

```bash
npx claudeos-core restore
```

Corre `plan-validator` en modo `--execute`: copia contenido de archivos `claudeos-core/plan/*.md` a las ubicaciones que describen.

**Estado v2.1.0:** La generación de master plan se eliminó. `claudeos-core/plan/` ya no se auto-crea. Si `plan/` no existe, este comando registra un mensaje informativo y sale limpiamente.

El comando queda para usuarios que mantienen archivos de plan a mano para backup/restore ad-hoc. Es inofensivo correrlo en un proyecto v2.1.0+.

Crea un backup `.bak` de cualquier archivo que sobrescriba.

---

## `refresh` — Sincronizar disco al plan guardado (legacy)

```bash
npx claudeos-core refresh
```

El inverso de `restore`. Corre `plan-validator` en modo `--refresh`: lee el estado actual de los archivos en disco y actualiza `claudeos-core/plan/*.md` para que coincidan.

**Estado v2.1.0:** Igual que `restore`: no-op cuando `plan/` está ausente.

---

## `validate` — Diff plan ↔ disco (legacy)

```bash
npx claudeos-core validate
```

Corre `plan-validator` en modo `--check`: reporta diferencias entre `claudeos-core/plan/*.md` y el disco, pero no modifica nada.

**Estado v2.1.0:** No-op cuando `plan/` está ausente. Casi todos los usuarios deberían correr `health` en su lugar, que llama a `plan-validator` junto con los otros validators.

---

## `memory <subcommand>` — Mantenimiento del memory layer

```bash
npx claudeos-core memory <subcommand>
```

Tres subcomandos. Operan sobre archivos `claudeos-core/memory/` que escribe Pass 4 de `init`. Si esos archivos faltan, cada subcomando registra `not found` y se salta de forma graceful (herramientas best-effort).

Para los detalles del modelo de memoria, ver [memory-layer.md](memory-layer.md).

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

Tras la compactación, solo la sección `## Last Compaction` de `compaction.md` se reemplaza. Todo lo demás (tus notas manuales) se preserva.

### `memory score`

```bash
npx claudeos-core memory score
```

Recalcula scores de importance para entradas en `failure-patterns.md`:

```
importance = round(frequency × 1.5 + recency × 5), capped at 10
```

Elimina cualquier línea de importance existente antes de insertar (evita regresiones por línea duplicada). El nuevo score vuelve al body de la entrada.

### `memory propose-rules`

```bash
npx claudeos-core memory propose-rules
```

Lee `failure-patterns.md`, elige entradas con frequency ≥ 3 y pide a Claude que redacte contenido de regla `.claude/rules/` propuesto para los candidatos top.

Confidence por candidato:
```
evidence    = 1.5 × frequency + 0.5 × importance   (importance default 0; capado a 6 si importance falta)
confidence  = sigmoid_{k=0.35, x0=8}(evidence) × (anchored ? 1.0 : 0.6)
```

(`anchored` = la entrada menciona una ruta de archivo concreta que existe en disco.)

La salida se **agrega a `claudeos-core/memory/auto-rule-update.md`** para tu revisión. **No se auto-aplica**: tú decides qué sugerencias copiar a archivos de regla reales.

---

## Variables de entorno

| Variable | Efecto |
|---|---|
| `CLAUDEOS_SKIP_TRANSLATION=1` | Corta el path de traducción de memory-scaffold; lanza antes de invocar `claude -p`. Lo usan CI y tests dependientes de traducción para no necesitar una instalación real de Claude CLI. Semántica estricta `=== "1"`: otros valores no la activan. |
| `CLAUDEOS_ROOT` | `bin/cli.js` la establece de forma automática a la raíz del proyecto del usuario. Interno: no la sobrescribas. |

Esa es la lista completa. No hay `CLAUDE_PATH`, `DEBUG=claudeos:*`, `CLAUDEOS_NO_COLOR` ni nada similar: esos no existen.

---

## Exit codes

| Code | Significado |
|---|---|
| `0` | Éxito. |
| `1` | Fallo de validación (hallazgo a nivel `fail`) o `InitError` (por ejemplo, prerequisito ausente, marker malformado, file lock). |
| Otro | Burbujea del proceso Node subyacente o sub-tool: excepciones no atrapadas, errores de escritura, etc. |

No hay un exit code especial para "interrumpido": Ctrl-C simplemente termina el proceso. Vuelve a correr `init` y el mecanismo de resume toma el control.

---

## Lo que corre `npm test` (para contribuidores)

Si clonaste el repo y quieres correr la suite de tests localmente:

```bash
npm test
```

Esto corre `node tests/*.test.js` sobre 33 archivos de test. La suite usa el runner `node:test` integrado en Node (sin Jest, sin Mocha) y `node:assert/strict`.

Para un solo archivo de test:

```bash
node tests/scan-java.test.js
```

CI corre la suite en Linux / macOS / Windows × Node 18 / 20. El workflow CI define `CLAUDEOS_SKIP_TRANSLATION=1` para que los tests dependientes de traducción no necesiten un CLI `claude`.

---

## Ver también

- [architecture.md](architecture.md): qué hace `init` realmente por dentro
- [verification.md](verification.md): qué comprueban los validators
- [memory-layer.md](memory-layer.md): sobre qué operan los subcomandos `memory`
- [troubleshooting.md](troubleshooting.md): cuando los comandos fallan
