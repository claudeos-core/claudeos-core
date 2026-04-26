# Safety: Qué se preserva al re-init

Una preocupación común: *"Personalicé mi `.claude/rules/`. Si ejecuto `npx claudeos-core init` de nuevo, ¿perderé mis ediciones?"*

**Respuesta corta:** Depende de si usas `--force`.

Esta página explica exactamente qué pasa cuando re-ejecutas, qué se toca y qué no.

> Original en inglés: [docs/safety.md](../safety.md). La traducción al español se mantiene sincronizada con el inglés.

---

## Los dos caminos a través del re-init

Cuando re-ejecutas `init` en un proyecto que ya tiene salida, una de dos cosas pasa:

### Camino 1 — Resume (default, sin `--force`)

`init` lee los markers de pase existentes (`pass1-*.json`, `pass2-merged.json`, `pass3-complete.json`, `pass4-memory.json`) en `claudeos-core/generated/`.

Para cada pase, si el marker existe y es estructuralmente válido, el pase se **salta**. Si los cuatro markers son válidos, `init` sale temprano — no tiene nada que hacer.

**Efecto en tus ediciones:** lo que has editado manualmente queda intacto. No se ejecutan pases, no se escriben archivos.

Este es el camino recomendado para la mayoría de los flujos "solo estoy re-revisando".

### Camino 2 — Inicio limpio (`--force`)

```bash
npx claudeos-core init --force
```

`--force` borra los markers de pase y las reglas, luego ejecuta la pipeline completa de 4 pasadas desde cero. **Las ediciones manuales a las reglas se pierden.** Esto es intencional — `--force` es la escotilla de escape para "quiero una regeneración limpia".

Lo que `--force` borra:
- Todos los archivos `.json` y `.md` bajo `claudeos-core/generated/` (los cuatro pass markers + salida del scanner)
- El directorio `claudeos-core/generated/.staged-rules/` sobrante si alguna ejecución previa crasheó a mitad de move
- Todo bajo `.claude/rules/`

Lo que `--force` **no** borra:
- Archivos `claudeos-core/memory/` (tu decision log y failure patterns se preservan)
- `claudeos-core/standard/`, `claudeos-core/skills/`, `claudeos-core/guide/`, etc. (estos los sobrescribe Pass 3, pero no se borran de antemano — lo que Pass 3 no regenere se queda)
- Archivos fuera de `claudeos-core/` y `.claude/`
- Tu CLAUDE.md (Pass 3 lo sobrescribe como parte de la generación normal)

**Por qué `.claude/rules/` se borra bajo `--force` pero otros directorios no:** Pass 3 tiene un guard de "zero-rules detection" que se dispara cuando `.claude/rules/` está vacío, usado para decidir si saltarse la etapa de reglas por dominio. Si están presentes reglas viejas de una ejecución previa, el guard daría falso negativo y las nuevas reglas no se generarían.

---

## Por qué existe `.claude/rules/` (el mecanismo de staging)

Esta es la pregunta más-frecuente, así que tiene su propia sección.

Claude Code tiene una **política de path sensible** que bloquea las escrituras de subprocesos a `.claude/`, incluso cuando el subproceso corre con `--dangerously-skip-permissions`. Esto es una frontera de seguridad deliberada en Claude Code mismo.

Pass 3 y Pass 4 de ClaudeOS-Core son invocaciones de subproceso de `claude -p`, así que no pueden escribir directamente en `.claude/rules/`. La solución alternativa:

1. El prompt del pase instruye a Claude a escribir todos los archivos de regla en `claudeos-core/generated/.staged-rules/` en su lugar.
2. Después de que el pase termina, el **orquestador Node.js** (que *no* está sujeto a la política de permisos de Claude Code) recorre el árbol de staging y mueve cada archivo a `.claude/rules/`, preservando sub-paths.
3. En éxito completo, el directorio de staging se elimina.
4. En fallo parcial (un file lock o error de rename cross-volume), el directorio de staging se **preserva** para que puedas inspeccionar lo que no logró cruzar, y la siguiente ejecución de `init` reintenta.

El mover está en `lib/staged-rules.js`. Usa `fs.renameSync` primero, cayendo a `fs.copyFileSync + fs.unlinkSync` en errores Windows cross-volume / file-lock por antivirus.

**Lo que realmente ves:** en flujo normal, `.staged-rules/` se crea y vacía dentro de una sola ejecución de `init` — quizá nunca lo notes. Si una ejecución crashea a mitad de etapa, encontrarás archivos allí en el siguiente `init`, y `--force` los limpia.

---

## Qué se preserva cuándo

| Categoría de archivo | Sin `--force` | Con `--force` |
|---|---|---|
| Ediciones manuales a `.claude/rules/` | ✅ Preservado (no se re-ejecutan pases) | ❌ Perdido (directorio borrado) |
| Ediciones manuales a `claudeos-core/standard/` | ✅ Preservado (no se re-ejecutan pases) | ❌ Sobrescrito por Pass 3 si regenera los mismos archivos |
| Ediciones manuales a `claudeos-core/skills/` | ✅ Preservado | ❌ Sobrescrito por Pass 3 |
| Ediciones manuales a `claudeos-core/guide/` | ✅ Preservado | ❌ Sobrescrito por Pass 3 |
| Ediciones manuales a `CLAUDE.md` | ✅ Preservado | ❌ Sobrescrito por Pass 3 |
| Archivos `claudeos-core/memory/` | ✅ Preservado | ✅ Preservado (`--force` no borra memoria) |
| Archivos fuera de `claudeos-core/` y `.claude/` | ✅ Nunca tocado | ✅ Nunca tocado |
| Pass markers (`generated/*.json`) | ✅ Preservado (usado para resume) | ❌ Borrado (fuerza re-ejecución completa) |

**El resumen honesto:** ClaudeOS-Core no tiene una capa de diff-y-merge. No hay prompt "revisar cambios antes de aplicar". La historia de preservación es binaria: o re-ejecuta solo lo que falta (default) o borra y regenera (`--force`).

Si has hecho ediciones manuales significativas y necesitas integrar contenido nuevo generado por la herramienta, el flujo recomendado es:

1. Commitea tus ediciones a git primero.
2. Ejecuta `npx claudeos-core init --force` en un branch separado.
3. Usa `git diff` para ver qué cambió.
4. Fusiona manualmente lo que quieras de cada lado.

Este es un flujo voluminoso a propósito. La herramienta deliberadamente no intenta auto-fusionar — equivocarse en eso corrompería reglas en silencio de formas sutiles.

---

## Detección de upgrade pre-v2.2.0

Cuando ejecutas `init` en un proyecto con un CLAUDE.md generado por una versión más antigua (pre-v2.2.0, antes de que el scaffold de 8 secciones se hiciera enforced), la herramienta detecta esto vía conteo de heading (conteo de heading `^## ` ≠ 8 — heurística independiente del idioma) y emite un warning:

```
⚠️  v2.2.0 upgrade detected
─────────────────────────
Your existing CLAUDE.md was generated with an older claudeos-core version.
v2.2.0 introduces structural changes that the default 'resume' mode
CANNOT apply because existing files are preserved under Rule B (idempotency).

To fully adopt v2.2.0, choose one of:
  1. Rerun with --force:   npx claudeos-core init --force
     (overwrites generated files; your memory/ content is preserved)
  2. Choose 'fresh' below  (equivalent to --force)
```

El warning es informativo. La herramienta continúa normalmente — puedes ignorarlo si quieres mantener el formato más antiguo. Pero en `--force`, el upgrade estructural se aplica y `claude-md-validator` pasará.

**Los archivos de memoria se preservan a través de upgrades `--force`.** Solo los archivos generados se sobrescriben.

---

## Inmutabilidad de Pass 4 (v2.3.0+)

Una sutileza específica: **Pass 4 no toca `CLAUDE.md`.** La Section 8 de Pass 3 ya redactó todas las referencias requeridas a archivos de memoria L4. Si Pass 4 también escribiera a CLAUDE.md, re-declararía contenido de Section 8, creando los errores de validator `[S1]`/`[M-*]`/`[F2-*]`.

Esto se aplica en ambos sentidos:
- El prompt de Pass 4 dice explícitamente "CLAUDE.md MUST NOT BE MODIFIED."
- La función `appendClaudeMdL4Memory()` en `lib/memory-scaffold.js` es un no-op de 3 líneas (devuelve true incondicionalmente, no hace escrituras).
- El test de regresión `tests/pass4-claude-md-untouched.test.js` aplica este contrato.

**Lo que debes saber como usuario:** si re-ejecutas un proyecto pre-v2.3.0 donde el viejo Pass 4 añadía una Section 9 a CLAUDE.md, verás errores de `claude-md-validator`. Ejecuta `npx claudeos-core init --force` para regenerar limpiamente.

---

## Lo que hace el comando `restore`

```bash
npx claudeos-core restore
```

`restore` ejecuta `plan-validator` en modo `--execute`. Históricamente copiaba contenido de archivos `claudeos-core/plan/*.md` a las ubicaciones que describen.

**Estado v2.1.0:** La generación de master plan se eliminó en v2.1.0. `claudeos-core/plan/` ya no se auto-crea por `init`. Sin archivos `plan/`, `restore` es un no-op — registra un mensaje informativo y sale limpiamente.

El comando se mantiene para usuarios que mantienen archivos de plan a mano para backup/restore ad-hoc. Si quieres un backup real, usa git.

---

## Patrones de recuperación

### "Borré algunos archivos fuera del flujo de ClaudeOS"

```bash
npx claudeos-core init --force
```

Re-ejecuta Pass 3 / Pass 4 desde cero. Los archivos borrados se regeneran. Tus ediciones manuales a otros archivos se pierden (porque `--force`) — combina con git para seguridad.

### "Quiero quitar una regla específica"

Solo borra el archivo. El siguiente `init` (sin `--force`) no la recreará porque el marker de resume de Pass 3 saltará todo el pase.

Si quieres que se recree en el siguiente `init --force`, no necesitas hacer nada — la regeneración es automática.

Si quieres que se borre permanentemente (nunca regenerada), necesitas mantener el proyecto pinchado a su estado actual y no ejecutar `--force` de nuevo. No hay un mecanismo built-in "no regenerar este archivo".

### "Quiero personalizar permanentemente un archivo generado"

La herramienta no tiene marcadores begin/end estilo HTML para regiones personalizadas. Dos opciones:

1. **No ejecutes `--force` en este proyecto** — tus ediciones se preservan indefinidamente bajo default-resume.
2. **Forkea la plantilla del prompt** — modifica `pass-prompts/templates/<stack>/pass3.md` en tu propia copia de la herramienta, instala tu fork, y el archivo regenerado reflejará tus personalizaciones.

Para overrides simples específicos del proyecto, la opción 1 suele bastar.

---

## Lo que comprueban los validators (después de re-init)

Después de que `init` termina (sea resumido o `--force`), los validators corren automáticamente:

- `claude-md-validator` — corre por separado vía `lint`
- `health-checker` — corre los cuatro validators de contenido/path

Si algo está mal (archivos faltantes, referencias cruzadas rotas, paths fabricados), verás la salida del validator. Ver [verification.md](verification.md) para la lista de checks.

Los validators no arreglan nada — reportan. Tú lees el reporte, luego decides si re-ejecutar `init` o arreglar manualmente.

---

## Confianza a través de testing

El camino "preservar ediciones del usuario" (resume sin `--force`) se ejercita por tests de integración bajo `tests/init-command.test.js` y `tests/pass3-marker.test.js`.

CI corre a través de Linux / macOS / Windows × Node 18 / 20.

Si encuentras un caso donde ClaudeOS-Core perdió tus ediciones de una manera que contradice este doc, eso es un bug. [Repórtalo](https://github.com/claudeos-core/claudeos-core/issues) con pasos de reproducción.

---

## Ver también

- [architecture.md](architecture.md) — el mecanismo de staging en contexto
- [commands.md](commands.md) — `--force` y otros flags
- [troubleshooting.md](troubleshooting.md) — recuperación de errores específicos
