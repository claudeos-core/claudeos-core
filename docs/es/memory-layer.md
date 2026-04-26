# Memory Layer (L4)

Después de v2.0, ClaudeOS-Core escribe un memory layer persistente junto con la documentación regular. Esto es para proyectos de larga duración donde quieres que Claude Code:

1. Recuerde decisiones arquitectónicas y su justificación.
2. Aprenda de fallos recurrentes.
3. Auto-promueva patrones de fallo frecuentes a reglas permanentes.

Si solo usas ClaudeOS-Core para generación one-shot, puedes ignorar esta capa por completo. Los archivos de memoria se escriben pero no crecerán si no los actualizas.

> Original en inglés: [docs/memory-layer.md](../memory-layer.md). La traducción al español se mantiene sincronizada con el inglés.

---

## Lo que se escribe

Después de que Pass 4 se completa, el memory layer consiste en:

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

Los archivos de regla `60.memory/` tienen globs `paths:` que coinciden con los archivos del proyecto donde la memoria debería cargarse. Cuando Claude Code está editando un archivo que coincide con un glob, el archivo de memoria correspondiente se carga al contexto.

Esto es **carga bajo demanda** — la memoria no siempre está en contexto, solo cuando es relevante. Eso mantiene ligero el contexto de trabajo de Claude.

---

## Los cuatro archivos de memoria

### `decision-log.md` — decisiones arquitectónicas append-only

Cuando tomas una decisión técnica no obvia, tú (o Claude, indicado por ti) añades un bloque:

```markdown
## 2026-04-15 — Use UTC for all stored timestamps

**Why:** Frontend users span 12+ time zones. Storing local time meant scheduling
bugs whenever a user traveled. UTC at the database level + per-user TZ at the
display layer cleanly separates concerns.

**Considered alternatives:**
- Per-row timezone column — rejected: query complexity.
- Browser-local time — rejected: server-side scheduling needs absolute times.
```

Este archivo **crece con el tiempo**. No se auto-borra. Las decisiones viejas siguen siendo contexto valioso.

La regla auto-cargada (`60.memory/01.decision-log.md`) le dice a Claude Code que consulte este archivo antes de responder preguntas como "¿Por qué estructuramos X de esta manera?"

### `failure-patterns.md` — errores recurrentes

Cuando Claude Code comete un error recurrente (p. ej., "Claude sigue generando JPA cuando nuestro proyecto usa MyBatis"), una entrada va aquí:

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

Los campos `frequency` / `importance` / `last seen` impulsan decisiones automatizadas:

- **Compaction:** entradas con `lastSeen > 60 days` Y `importance < 3` se descartan.
- **Promoción de regla:** entradas con `frequency >= 3` se exponen como candidatos para nuevas entradas `.claude/rules/` vía `memory propose-rules`. (Importance no es un filtro — solo afecta el score de confidence de cada propuesta.)

Los campos de metadata se parsean por los subcomandos `memory` usando regex anclado (`^[\s*-]+\*{0,2}\s*key\s*\*{0,2}\s*[:=]`) así que las líneas de campo deben verse aproximadamente como el ejemplo de arriba. Variaciones indentadas o en cursiva se toleran.

### `compaction.md` — log de compactación

Este archivo rastrea el historial de compactación:

```markdown
## Last Compaction
- timestamp: 2026-04-26T03:14:00Z
- entries-summarized: 3
- entries-merged: 1
- entries-dropped: 2
- file-trimmed: false
```

Solo la sección `## Last Compaction` se sobrescribe en cada ejecución de `memory compact`. Cualquier cosa que añadas en otro lugar del archivo se preserva.

### `auto-rule-update.md` — cola de reglas propuestas

Cuando ejecutas `memory propose-rules`, Claude lee `failure-patterns.md` y añade contenido de regla propuesto aquí:

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

Revisas las propuestas, copias las que quieres a archivos de regla reales. **El comando propose-rules no se auto-aplica** — eso es intencional, ya que las reglas redactadas por LLM necesitan revisión humana.

---

## Algoritmo de compactación

La memoria crece pero no se hincha. Compactación de cuatro etapas se ejecuta cuando llamas:

```bash
npx claudeos-core memory compact
```

| Etapa | Trigger | Acción |
|---|---|---|
| 1 | `lastSeen > 30 days` Y no preservado | Body colapsado a un "fix" de 1 línea + meta |
| 2 | Headings duplicados | Fusionados (frequencies sumadas, body = más reciente) |
| 3 | `importance < 3` Y `lastSeen > 60 days` | Descartado |
| 4 | Archivo > 400 líneas | Recortar las entradas más viejas no preservadas |

**Las entradas "preservadas"** sobreviven a todas las etapas. Una entrada se preserva si alguno de:

- `importance >= 7`
- `lastSeen < 30 days`
- El body contiene una ruta de regla activa concreta (no glob) (p. ej., `.claude/rules/10.backend/orm-rules.md`)

El check de "ruta de regla activa" es interesante: si una entrada de memoria referencia un archivo de regla real, actualmente existente, la entrada se ancla al ciclo de vida de esa regla. Mientras la regla exista, la memoria se queda.

El algoritmo de compactación es una mímica deliberada de las curvas de olvido humanas — cosas frecuentes, recientes, importantes se quedan; cosas raras, viejas, no importantes se desvanecen.

Para el código de compactación, ver `bin/commands/memory.js` (función `compactFile()`).

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

Donde `recency = max(0, 1 - daysSince(lastSeen) / 90)` (decaimiento lineal sobre 90 días).

Efectos:
- Una entrada con `frequency = 3` y `lastSeen = today` → `round(3 × 1.5 + 1.0 × 5) = round(9.5) = 10`
- Una entrada con `frequency = 3` y `lastSeen = 90+ days ago` → `round(3 × 1.5 + 0 × 5) = 5`

**El comando score elimina TODAS las líneas de importance existentes antes de la inserción.** Esto previene regresiones de línea duplicada al re-ejecutar score múltiples veces.

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
   evidence    = 1.5 × frequency + 0.5 × importance   (importance default 0; capado a 6 si importance falta)
   confidence  = sigmoid_{k=0.35, x0=8}(evidence) × (anchored ? 1.0 : 0.6)
   ```
   donde `anchored` significa que la entrada referencia una ruta de archivo real en disco.
5. Escribe las propuestas en `auto-rule-update.md` para revisión humana.

**El valor de evidence se capa a 6 cuando importance falta** — sin un score de importance, frequency sola no debería ser suficiente para empujar el sigmoid hacia confidence alto. (Esto capa la entrada al sigmoid, no el número de propuestas.)

---

## Flujo típico

Para un proyecto de larga duración, el ritmo se ve así:

1. **Ejecuta `init` una vez** para configurar los archivos de memoria junto con todo lo demás.

2. **Usa Claude Code normalmente durante unas semanas.** Detecta errores recurrentes (p. ej., Claude sigue usando el wrapper de respuesta equivocado). Añade entradas a `failure-patterns.md` — manualmente o pidiendo a Claude que lo haga (la regla en `60.memory/02.failure-patterns.md` instruye a Claude cuándo añadir).

3. **Ejecuta periódicamente `memory score`** para refrescar valores de importance. Esto es rápido e idempotente.

4. **Cuando tienes ~5+ patrones de score alto**, ejecuta `memory propose-rules` para obtener reglas redactadas.

5. **Revisa las propuestas** en `auto-rule-update.md`. Para cada una que quieras, copia el contenido a un archivo de regla permanente bajo `.claude/rules/`.

6. **Ejecuta `memory compact` periódicamente** (una vez al mes, o en CI programado) para mantener `failure-patterns.md` acotado.

Este ritmo es para lo que están diseñados los cuatro archivos. Saltarse cualquier paso está bien — el memory layer es opt-in, y los archivos no usados no estorban.

---

## Continuidad de sesión

CLAUDE.md se auto-carga por Claude Code en cada sesión. Los archivos de memoria **no se auto-cargan por defecto** — se cargan bajo demanda por las reglas `60.memory/` cuando su glob `paths:` coincide con el archivo que Claude está editando actualmente.

Esto significa: en una sesión nueva de Claude Code, la memoria no es visible hasta que empiezas a trabajar en un archivo relevante.

Después de que la auto-compactación de Claude Code corre (alrededor del 85% del contexto), Claude pierde conciencia de los archivos de memoria incluso si fueron cargados antes. La Section 8 de CLAUDE.md incluye un bloque de prosa **Session Resume Protocol** que recuerda a Claude:

- Re-escanear `failure-patterns.md` para entradas relevantes.
- Re-leer las entradas más recientes de `decision-log.md`.
- Re-emparejar reglas `60.memory/` contra archivos abiertos actualmente.

Esto es **prosa, no enforced** — pero la prosa está estructurada para que Claude tienda a seguirla. El Session Resume Protocol es parte del scaffold canónico v2.3.2+ y se preserva a través de los 10 idiomas de salida.

---

## Cuándo saltarse el memory layer

El memory layer aporta valor para:

- **Proyectos de larga vida** (meses o más).
- **Equipos** — `decision-log.md` se convierte en una memoria institucional compartida y herramienta de onboarding.
- **Proyectos donde Claude Code se invoca ≥10×/día** — los patrones de fallo se acumulan rápido lo suficiente para ser útiles.

Es excesivo para:

- Scripts one-off que descartarás en una semana.
- Proyectos spike o prototipo.
- Tutoriales o demos.

Los archivos de memoria todavía se escriben por Pass 4, pero si no los actualizas, no crecen. No hay carga de mantenimiento si no lo estás usando.

Si activamente no quieres que las reglas de memoria auto-carguen nada (por razones de coste de contexto), puedes:

- Borrar las reglas `60.memory/` — Pass 4 no las recreará en resume, solo en `--force`.
- O estrechar los globs `paths:` en cada regla para que no coincidan con nada.

---

## Ver también

- [architecture.md](architecture.md) — Pass 4 en el contexto de la pipeline
- [commands.md](commands.md) — referencia de `memory compact` / `memory score` / `memory propose-rules`
- [verification.md](verification.md) — checks `[9/9]` de memory de content-validator
