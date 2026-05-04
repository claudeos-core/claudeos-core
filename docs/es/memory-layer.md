# Memory Layer (L4)

Desde v2.0, ClaudeOS-Core escribe un memory layer persistente junto con la documentación regular. Está pensado para proyectos de larga duración donde quieres que Claude Code:

1. Recuerde decisiones arquitectónicas y su justificación.
2. Aprenda de fallos recurrentes.
3. Auto-promueva patrones de fallo frecuentes a reglas permanentes.

Si solo usas ClaudeOS-Core para generación one-shot, puedes ignorar esta capa entera. Los archivos de memoria se escriben pero no crecen si no los actualizas.

> Original en inglés: [docs/memory-layer.md](../memory-layer.md). La traducción al español se mantiene sincronizada con el inglés.

---

## Lo que se escribe

Cuando Pass 4 termina, el memory layer queda así:

```
claudeos-core/
└── memory/
    ├── decision-log.md          (append-only "why we chose X over Y")
    ├── failure-patterns.md      (recurring errors, with frequency + importance)
    ├── compaction.md            (how memory is compacted over time)
    └── auto-rule-update.md      (patterns that should become new rules)

.claude/
└── rules/
    └── 60.memory/
        ├── 01.decision-log.md       (rule that auto-loads decision-log.md)
        ├── 02.failure-patterns.md   (rule that auto-loads failure-patterns.md)
        ├── 03.compaction.md         (rule that auto-loads compaction.md)
        └── 04.auto-rule-update.md   (rule that auto-loads auto-rule-update.md)
```

Los archivos de regla `60.memory/` tienen globs `paths:` que coinciden con los archivos del proyecto donde debe cargarse la memoria. Cuando Claude Code edita un archivo que coincide con un glob, el archivo de memoria correspondiente entra al contexto.

Es **carga bajo demanda**: la memoria no está siempre en contexto, solo cuando hace falta. Así el contexto de trabajo de Claude se mantiene ligero.

---

## Los cuatro archivos de memoria

### `decision-log.md`: decisiones arquitectónicas append-only

Cuando tomas una decisión técnica no obvia, tú (o Claude, si se lo pides) añades un bloque:

```markdown
## 2026-04-15 — Use UTC for all stored timestamps

**Why:** Frontend users span 12+ time zones. Storing local time meant scheduling
bugs whenever a user traveled. UTC at the database level + per-user TZ at the
display layer cleanly separates concerns.

**Considered alternatives:**
- Per-row timezone column — rejected: query complexity.
- Browser-local time — rejected: server-side scheduling needs absolute times.
```

Este archivo **crece con el tiempo**. No se auto-borra. Las decisiones viejas siguen aportando contexto valioso.

La regla auto-cargada (`60.memory/01.decision-log.md`) le dice a Claude Code que consulte este archivo antes de responder preguntas como "¿Por qué estructuramos X así?".

### `failure-patterns.md`: errores recurrentes

Cuando Claude Code comete un error recurrente (por ejemplo, "Claude sigue generando JPA aunque usamos MyBatis"), añades una entrada aquí:

```markdown
### Generates JPA repositories instead of MyBatis mappers
- frequency: 7
- importance: 4
- last seen: 2026-04-22
- context: Pattern recurs when generating Order/Product/Customer CRUD modules.

**Fix:** Always check `build.gradle` for `mybatis-spring-boot-starter` before
generating repositories. Use `<Domain>Mapper.java` + `<Domain>.xml`, not
`<Domain>Repository.java extends JpaRepository`.
```

Los campos `frequency`, `importance` y `last seen` impulsan decisiones automatizadas:

- **Compaction:** las entradas con `lastSeen > 60 days` Y `importance < 3` se descartan.
- **Promoción de regla:** las entradas con `frequency >= 3` aparecen como candidatas para nuevas entradas `.claude/rules/` vía `memory propose-rules`. (Importance no filtra; solo afecta el score de confidence de cada propuesta.)

Los subcomandos `memory` parsean los campos de metadata con un regex anclado (`^[\s*-]+\*{0,2}\s*key\s*\*{0,2}\s*[:=]`), así que las líneas de campo tienen que parecerse al ejemplo de arriba. Variaciones indentadas o en cursiva se toleran.

### `compaction.md`: log de compactación

Este archivo rastrea el historial de compactación:

```markdown
## Last Compaction
- timestamp: 2026-04-26T03:14:00Z
- entries-summarized: 3
- entries-merged: 1
- entries-dropped: 2
- file-trimmed: false
```

Solo la sección `## Last Compaction` se sobrescribe en cada `memory compact`. Cualquier cosa que añadas en otro lugar del archivo se preserva.

### `auto-rule-update.md`: cola de reglas propuestas

Cuando ejecutas `memory propose-rules`, Claude lee `failure-patterns.md` y añade aquí el contenido de regla propuesto:

```markdown
## Proposed: Use MyBatis mappers, not JPA repositories
- confidence: 0.83
- evidence:
  - failure-patterns.md: "Generates JPA repositories instead of MyBatis mappers" (frequency 7, importance 4)
- proposed-rule-path: .claude/rules/00.core/orm-mybatis.md
- proposed-rule-content: |
    Always use `<Domain>Mapper.java` + `<Domain>.xml` for data access.
    Project uses `mybatis-spring-boot-starter` (see build.gradle).
    Do NOT generate JpaRepository subclasses.
```

Revisas las propuestas y copias las que quieras a archivos de regla reales. **El comando propose-rules no se auto-aplica.** Es intencional: las reglas redactadas por LLM necesitan revisión humana.

---

## Algoritmo de compactación

La memoria crece pero no se hincha. La compactación corre en cuatro etapas cuando llamas:

```bash
npx claudeos-core memory compact
```

| Etapa | Trigger | Acción |
|---|---|---|
| 1 | `lastSeen > 30 days` Y no preservado | Body colapsado a un "fix" de 1 línea + meta |
| 2 | Headings duplicados | Fusionados (frequencies sumadas, body = más reciente) |
| 3 | `importance < 3` Y `lastSeen > 60 days` | Descartado |
| 4 | Archivo > 400 líneas | Recortar las entradas más viejas no preservadas |

**Las entradas "preservadas"** sobreviven a todas las etapas. Una entrada se preserva si cumple alguno de:

- `importance >= 7`
- `lastSeen < 30 days`
- El body contiene una ruta de regla activa concreta, no glob (por ejemplo, `.claude/rules/10.backend/orm-rules.md`)

El check de "ruta de regla activa" es curioso: si una entrada de memoria referencia un archivo de regla real y existente, la entrada se ancla al ciclo de vida de esa regla. Mientras la regla exista, la memoria se queda.

El algoritmo imita a propósito las curvas de olvido humanas: lo frecuente, reciente e importante se queda; lo raro, viejo y poco importante se desvanece.

Para el código de compactación, mira `bin/commands/memory.js` (función `compactFile()`).

---

## Importance scoring

Ejecuta:

```bash
npx claudeos-core memory score
```

Recomputa importance para entradas en `failure-patterns.md`:

```
importance = round(frequency × 1.5 + recency × 5), capped at 10
```

Donde `recency = max(0, 1 - daysSince(lastSeen) / 90)` (decaimiento lineal a 90 días).

Efectos:
- Una entrada con `frequency = 3` y `lastSeen = today` → `round(3 × 1.5 + 1.0 × 5) = round(9.5) = 10`
- Una entrada con `frequency = 3` y `lastSeen = 90+ days ago` → `round(3 × 1.5 + 0 × 5) = 5`

**El comando score elimina TODAS las líneas de importance existentes antes de insertar.** Así se evitan regresiones de línea duplicada al re-ejecutar score varias veces.

---

## Promoción de regla: `propose-rules`

Ejecuta:

```bash
npx claudeos-core memory propose-rules
```

Esto:

1. Lee `failure-patterns.md`.
2. Filtra entradas con `frequency >= 3`.
3. Pide a Claude que redacte contenido de regla propuesto para cada candidato.
4. Computa confidence:
   ```
   evidence    = 1.5 × frequency + 0.5 × importance   (importance default 0; capado a 6 si falta importance)
   confidence  = sigmoid_{k=0.35, x0=8}(evidence) × (anchored ? 1.0 : 0.6)
   ```
   donde `anchored` significa que la entrada referencia una ruta de archivo real en disco.
5. Escribe las propuestas en `auto-rule-update.md` para revisión humana.

**El valor de evidence se capa a 6 cuando falta importance.** Sin un score de importance, frequency sola no debería bastar para empujar el sigmoid hacia confidence alto. (Esto capa la entrada al sigmoid, no el número de propuestas.)

---

## Flujo típico

Para un proyecto de larga duración, el ritmo va así:

1. **Ejecuta `init` una vez** para configurar los archivos de memoria junto con el resto.

2. **Usa Claude Code con normalidad unas semanas.** Detecta errores recurrentes (por ejemplo, Claude sigue usando el wrapper de respuesta equivocado). Añade entradas a `failure-patterns.md`, a mano o pidiéndoselo a Claude (la regla `60.memory/02.failure-patterns.md` le indica cuándo hacerlo).

3. **Ejecuta `memory score` cada cierto tiempo** para refrescar valores de importance. Es rápido e idempotente.

4. **Cuando tengas ~5+ patrones con score alto**, ejecuta `memory propose-rules` para obtener reglas redactadas.

5. **Revisa las propuestas** en `auto-rule-update.md`. Para cada una que quieras, copia el contenido a un archivo de regla permanente en `.claude/rules/`.

6. **Ejecuta `memory compact` cada cierto tiempo** (una vez al mes, o en CI programado) para mantener `failure-patterns.md` acotado.

Este ritmo es para lo que están diseñados los cuatro archivos. Saltarse cualquier paso está bien: el memory layer es opt-in y los archivos no usados no estorban.

---

## Continuidad de sesión

Claude Code carga CLAUDE.md automáticamente en cada sesión. Los archivos de memoria **no se cargan por defecto**: las reglas `60.memory/` los cargan bajo demanda cuando su glob `paths:` coincide con el archivo que Claude edita en ese momento.

Es decir: en una sesión nueva de Claude Code, la memoria no es visible hasta que empiezas a trabajar en un archivo relevante.

Cuando corre la auto-compactación de Claude Code (alrededor del 85% del contexto), Claude pierde conciencia de los archivos de memoria aunque los hubiera cargado antes. La Section 8 de CLAUDE.md incluye un bloque de prosa **Session Resume Protocol** que recuerda a Claude:

- Re-escanear `failure-patterns.md` por entradas relevantes.
- Re-leer las entradas más recientes de `decision-log.md`.
- Re-emparejar reglas `60.memory/` con los archivos abiertos en ese momento.

Es **prosa, no enforced**, pero está estructurada para que Claude tienda a seguirla. El Session Resume Protocol forma parte del scaffold canónico v2.3.2+ y se preserva en los 10 idiomas de salida.

---

## Cuándo saltarse el memory layer

El memory layer aporta valor en:

- **Proyectos de larga vida** (meses o más).
- **Equipos**: `decision-log.md` se convierte en memoria institucional compartida y herramienta de onboarding.
- **Proyectos donde Claude Code se invoca ≥10×/día**: los patrones de fallo se acumulan lo bastante rápido para ser útiles.

Es excesivo para:

- Scripts one-off que descartarás en una semana.
- Proyectos spike o prototipo.
- Tutoriales o demos.

Pass 4 sigue escribiendo los archivos de memoria, pero si no los actualizas, no crecen. No hay carga de mantenimiento si no lo usas.

Si directamente no quieres que las reglas de memoria carguen nada (por coste de contexto), puedes:

- Borrar las reglas `60.memory/`. Pass 4 no las recreará en resume, solo con `--force`.
- O estrechar los globs `paths:` de cada regla para que no coincidan con nada.

---

## Ver también

- [architecture.md](architecture.md): Pass 4 en el contexto de la pipeline
- [commands.md](commands.md): referencia de `memory compact` / `memory score` / `memory propose-rules`
- [verification.md](verification.md): checks `[9/9]` de memory en content-validator
