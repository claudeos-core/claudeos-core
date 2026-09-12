# Safety: Qué se preserva al re-init, y qué nunca sale de tu `.env`

Una duda común: *"Personalicé mi `.claude/rules/`. Si vuelvo a ejecutar `npx claudeos-core init`, ¿pierdo mis ediciones?"*

**Respuesta corta:** depende de si usas `--force`.

Esta página explica qué pasa exactamente cuando re-ejecutas, qué se toca y qué no.

> Original en inglés: [docs/safety.md](../safety.md). La traducción al español se mantiene sincronizada con el inglés.

---

## Los dos caminos a través del re-init

Cuando re-ejecutas `init` en un proyecto que ya tiene salida, ocurre una de dos cosas:

### Camino 1: Resume (default, sin `--force`)

`init` lee los markers de pase existentes (`pass1-*.json`, `pass2-merged.json`, `pass3-complete.json`, `pass4-memory.json`) en `claudeos-core/generated/`.

Para cada pase, si el marker existe y es estructuralmente válido, el pase se **salta**. Si los cuatro markers son válidos, `init` sale antes de tiempo: no tiene nada que hacer.

**Efecto en tus ediciones:** lo que has editado a mano queda intacto. No corren pases ni se escriben archivos.

Es el camino recomendado para la mayoría de los flujos "solo estoy revisando otra vez".

### Camino 2: Inicio limpio (`--force`)

```bash
npx claudeos-core init --force
```

`--force` borra los markers de pase y las reglas, y luego ejecuta la pipeline completa de 4 pasadas desde cero. **Las ediciones manuales a las reglas se pierden.** Es intencional: `--force` es la escotilla de escape para "quiero regenerar limpio".

Lo que `--force` borra:
- Todos los archivos `.json` y `.md` bajo `claudeos-core/generated/` (los cuatro pass markers más la salida del scanner)
- El directorio `claudeos-core/generated/.staged-rules/` sobrante si una ejecución previa crasheó a mitad de move
- Las categorías gestionadas por claudeos-core bajo `.claude/rules/`: toda entrada con prefijo `NN.` (`00.core/`, `10.backend/`, … `90.optional/`). Los archivos o carpetas que tú mismo pusiste ahí sin ese prefijo (p. ej. `.claude/rules/my-team-conventions.md`) **quedan intactos**: esta herramienta nunca los generó.

Lo que `--force` **no** borra:
- Archivos `claudeos-core/memory/` (decision log y failure patterns se preservan)
- `claudeos-core/standard/`, `claudeos-core/skills/`, `claudeos-core/guide/`, etc. Pass 3 los sobrescribe, pero no se borran antes: lo que Pass 3 no regenere se queda.
- Archivos fuera de `claudeos-core/` y `.claude/`
- CLAUDE.md (Pass 3 lo sobrescribe como parte de la generación normal)

**Por qué las categorías gestionadas `.claude/rules/NN.*` se borran con `--force` y otros directorios no:** Pass 3 tiene un guard de "zero-rules detection" que se dispara cuando `.claude/rules/` está vacío, y decide si saltarse la etapa de reglas por dominio. Si quedaran reglas viejas de una ejecución previa, el guard daría falso negativo y las reglas nuevas no se generarían.

---

## Por qué existe `.claude/rules/` (el mecanismo de staging)

Es la pregunta más frecuente, así que tiene sección propia.

Claude Code tiene una **política de path sensible** que bloquea las escrituras de subprocesos a `.claude/`, incluso si el subproceso corre con `--dangerously-skip-permissions`. Es una frontera de seguridad deliberada del propio Claude Code.

Pass 3 y Pass 4 de ClaudeOS-Core son invocaciones de subproceso de `claude -p`, así que no pueden escribir directamente en `.claude/rules/`. El workaround:

1. El prompt del pase instruye a Claude a escribir todos los archivos de regla en `claudeos-core/generated/.staged-rules/`.
2. Cuando el pase termina, el **orquestador Node.js** (que *no* está sujeto a la política de permisos de Claude Code) recorre el árbol de staging y mueve cada archivo a `.claude/rules/`, preservando sub-paths.
3. En éxito completo, el directorio de staging se elimina.
4. En fallo parcial (un file lock o error de rename cross-volume), el directorio de staging se **preserva** para que puedas inspeccionar lo que no llegó a cruzar; la siguiente ejecución de `init` reintenta.

El movimiento vive en `lib/staged-rules.js`. Usa `fs.renameSync` primero y cae a `fs.copyFileSync + fs.unlinkSync` ante errores Windows cross-volume o file-lock por antivirus.

**Lo que ves en la práctica:** en flujo normal, `.staged-rules/` se crea y vacía dentro de una sola ejecución de `init`. Quizá ni te enteres. Si una ejecución crashea a mitad de etapa, encontrarás archivos ahí en el siguiente `init`, y `--force` los limpia.

---

## Qué se preserva cuándo

| Categoría de archivo | Sin `--force` | Con `--force` |
|---|---|---|
| Ediciones manuales a archivos generados `.claude/rules/NN.*/` | ✅ Preservado (no se re-ejecutan pases) | ❌ Perdido (categorías gestionadas borradas) |
| Tus propios archivos bajo `.claude/rules/` sin prefijo `NN.` | ✅ Preservado | ✅ Preservado (nunca se tocan) |
| Ediciones manuales a `claudeos-core/standard/` | ✅ Preservado (no se re-ejecutan pases) | ❌ Sobrescrito por Pass 3 si regenera los mismos archivos |
| Ediciones manuales a `claudeos-core/skills/` | ✅ Preservado | ❌ Sobrescrito por Pass 3 |
| Ediciones manuales a `claudeos-core/guide/` | ✅ Preservado | ❌ Sobrescrito por Pass 3 |
| Ediciones manuales a `CLAUDE.md` | ✅ Preservado | ❌ Sobrescrito por Pass 3 |
| Archivos `claudeos-core/memory/` | ✅ Preservado | ✅ Preservado (`--force` no borra memoria) |
| Archivos fuera de `claudeos-core/` y `.claude/` | ✅ Nunca tocado | ✅ Nunca tocado |
| Pass markers (`generated/*.json`) | ✅ Preservado (usado para resume) | ❌ Borrado (fuerza re-ejecución completa) |

**El resumen honesto:** ClaudeOS-Core no tiene capa de diff-y-merge. No hay prompt "revisar cambios antes de aplicar". La preservación es binaria: o re-ejecuta solo lo que falta (default) o borra y regenera (`--force`).

Si has hecho ediciones manuales importantes y necesitas integrar contenido nuevo generado por la herramienta, el flujo recomendado es:

1. Commitea tus ediciones a git primero.
2. Ejecuta `npx claudeos-core init --force` en un branch aparte.
3. Usa `git diff` para ver qué cambió.
4. Fusiona a mano lo que quieras de cada lado.

Es un flujo pesado a propósito. La herramienta deliberadamente no intenta auto-fusionar: hacerlo mal corrompería reglas en silencio y de formas sutiles.

---

## Detección de upgrade pre-v2.2.0

Cuando ejecutas `init` en un proyecto con un CLAUDE.md generado por una versión más antigua (pre-v2.2.0, antes de que el scaffold de 8 secciones se hiciera enforced), la herramienta lo detecta por conteo de heading (conteo de heading `^## ` ≠ 8, heurística independiente del idioma) y emite un warning:

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

El warning es informativo. La herramienta continúa con normalidad: puedes ignorarlo si quieres mantener el formato antiguo. Pero con `--force`, el upgrade estructural se aplica y `claude-md-validator` pasa.

**Los archivos de memoria se preservan en upgrades con `--force`.** Solo se sobrescriben los archivos generados.

---

## Inmutabilidad de Pass 4 (v2.3.0+)

Una sutileza concreta: **Pass 4 no toca `CLAUDE.md`.** La Section 8 de Pass 3 ya redactó todas las referencias requeridas a archivos de memoria L4. Si Pass 4 escribiera también a CLAUDE.md, re-declararía contenido de Section 8 y dispararía los errores de validator `[S1]`, `[M-*]` y `[F2-*]`.

La regla se aplica por varias vías:
- El prompt de Pass 4 dice explícitamente "CLAUDE.md MUST NOT BE MODIFIED."
- La función `appendClaudeMdL4Memory()` en `lib/memory-scaffold.js` es un no-op de 3 líneas (devuelve true incondicionalmente, sin escrituras).
- El test de regresión `tests/pass4-claude-md-untouched.test.js` aplica este contrato.

**Lo que importa como usuario:** si re-ejecutas un proyecto pre-v2.3.0 donde el viejo Pass 4 añadía una Section 9 a CLAUDE.md, verás errores de `claude-md-validator`. Ejecuta `npx claudeos-core init --force` para regenerar limpio.

---

## Lo que hace el comando `restore`

```bash
npx claudeos-core restore
```

`restore` ejecuta `plan-validator` en modo `--execute`. Históricamente copiaba contenido de archivos `claudeos-core/plan/*.md` a las ubicaciones que describían.

**Estado v2.1.0:** la generación de master plan se eliminó en v2.1.0. `claudeos-core/plan/` ya no lo crea `init` automáticamente. Sin archivos `plan/`, `restore` es un no-op: registra un mensaje informativo y sale limpio.

El comando sigue ahí para quien mantiene archivos de plan a mano para backup/restore ad-hoc. Si quieres un backup real, usa git.

---

## Patrones de recuperación

### "Borré algunos archivos fuera del flujo de ClaudeOS"

```bash
npx claudeos-core init --force
```

Re-ejecuta Pass 3 y Pass 4 desde cero. Los archivos borrados se regeneran. Tus ediciones manuales a otros archivos se pierden (por `--force`); combina con git para tener red.

### "Quiero quitar una regla específica"

Borra el archivo y ya. El siguiente `init` (sin `--force`) no la recreará porque el marker de resume de Pass 3 salta todo el pase.

Si quieres que se recree en el siguiente `init --force`, no hace falta hacer nada: la regeneración es automática.

Si quieres que se borre permanentemente (que no se regenere nunca), tienes que mantener el proyecto pinchado en su estado actual y no volver a ejecutar `--force`. No hay un mecanismo built-in "no regenerar este archivo".

### "Quiero personalizar permanentemente un archivo generado"

La herramienta no tiene marcadores begin/end estilo HTML para regiones personalizadas. Dos opciones:

1. **No ejecutes `--force` en este proyecto.** Tus ediciones se preservan indefinidamente con resume default.
2. **Forkea la plantilla del prompt:** modifica `pass-prompts/templates/<stack>/pass3.md` en tu copia, instala tu fork y el archivo regenerado reflejará tus cambios.

Para overrides simples específicos del proyecto, con la opción 1 suele bastar.

---

## Lo que comprueban los validators (después de re-init)

Cuando `init` termina (sea resumido o con `--force`), los validators corren automáticamente:

- `claude-md-validator`: corre por separado vía `lint`
- `health-checker`: corre los cuatro validators de contenido/path

Si algo va mal (archivos faltantes, referencias cruzadas rotas, paths fabricados), verás la salida del validator. Mira [verification.md](verification.md) para la lista de checks.

Los validators no arreglan nada: reportan. Tú lees el reporte y decides si re-ejecutas `init` o arreglas a mano.

---

## Confianza a través de testing

El camino "preservar ediciones del usuario" (resume sin `--force`) se ejercita con tests de integración en `tests/init-command.test.js` y `tests/pass3-marker.test.js`.

CI corre en Linux / macOS / Windows × Node 18 / 20.

Si encuentras un caso donde ClaudeOS-Core perdió tus ediciones de una forma que contradiga este doc, es un bug. [Repórtalo](https://github.com/claudeos-core/claudeos-core/issues) con pasos de reproducción.

---

## Lo que nunca llega a los archivos generados: secretos de `.env`

Todo lo anterior trata de que *tus archivos* sobrevivan a ClaudeOS. Esta sección trata de que *tus secretos* no salgan de ellos. Está aquí porque «¿esta herramienta copia mi `.env` en algo que lee un LLM?» es una pregunta de seguridad, y esta es la página que se abre para eso.

`init` lee un archivo `.env*` (orden de búsqueda en [stacks.md](stacks.md#extracción-de-env-v220)) para que el CLAUDE.md generado indique el puerto, host y base de datos reales. Las variables parseadas se escriben en `claudeos-core/generated/project-analysis.json`, y los prompts de Pass 3 / Pass 4 indican al modelo que lea ese archivo. Antes de escribir, tres reglas se aplican a cada valor, en este orden:

1. **Redacción por nombre de clave.** Una clave que coincida con `PASSWORD`, `PASS`, `PW`, `SECRET`, `TOKEN`, `API_KEY`, `CREDENTIAL`, `PRIVATE_KEY`, `JWT_SECRET`, `SSH_KEY`, `MASTER_KEY`, `SERVICE_ACCOUNT` y similares pasa a `***REDACTED***`. La clave sobrevive, de modo que «esta variable existe» sigue siendo un hecho que la documentación puede afirmar.
2. **Enmascarado de credenciales dentro de cadenas de conexión.** Para una clave que la primera regla no atrapa (`DATABASE_URL`, `REDIS_URL`, `MONGO_URI`, `SPRING_DATASOURCE_URL`, …) se reescribe solo la *parte de credenciales* y se conserva el resto, de forma que el tipo de BD, host, puerto y ruta siguen siendo legibles:
   - Userinfo de URL: `postgres://app:s3cret@db:5432/app` → `postgres://***:***@db:5432/app`
   - Parámetros de query/propiedad: `?user=app&password=x` → `?user=app&password=***`
   - DSN de Go/MySQL: `user:pw@tcp(host:3306)/db` → `***:***@tcp(host:3306)/db`
   - Oracle JDBC (v2.5.3): `jdbc:oracle:thin:scott/tiger@//dbhost:1521/ORCL` → `jdbc:oracle:thin:***/***@//dbhost:1521/ORCL` (también las formas `@host:port:SID`, `@(DESCRIPTION=…)` y `jdbc:oracle:oci:`)
3. **Descarte del valor completo (v2.5.2).** Cuando la segunda regla no puede reescribir la credencial de forma segura — una contraseña con `/`, `?`, `#` o espacio en crudo, que empieza por dígitos, o un DSN de Oracle cuyo segmento de usuario contiene un `@` (v2.5.3) — el valor se descarta entero (`***REDACTED***`) en lugar de enmascararse parcialmente. Perder el host es un fallo mucho más barato que filtrar una contraseña. `init` nombra las claves afectadas en su resumen de Fase 1 (solo nombres de clave). Codifica la contraseña en percent-encoding (`/` como `%2F`) para conservar el host visible.

Dos campos escalares derivados de `.env` — `envInfo.host` y `envInfo.apiTarget` — se renderizan directamente en CLAUDE.md §3; si su valor fue descartado son `null` y la fila se omite, así que el centinela nunca aparece en un documento generado.

**Lo que no se cubre.** Una plantilla `${VAR}` sin expandir se deja intacta (no contiene un secreto vivo). No se leen comentarios ni archivos distintos del único `.env*` seleccionado. La detección de tipo de BD del scanner lee el texto crudo de `.env` en memoria y nunca lo escribe. Si tu proyecto guarda una credencial con una forma que ninguna regla reconoce, abre un issue con la *forma* (nunca el valor) — cada regla listada aquí nació así.

**Cómo comprobarlo.** Tras `init`, haz `grep -i` de tu contraseña en `claudeos-core/generated/project-analysis.json`. No debe estar. Las reglas de enmascarado están fijadas por tests en `tests/env-parser.test.js`, incluidas las formas exactas que una vez se filtraron.

## Ver también

- [stacks.md](stacks.md#extracción-de-env-v220) — orden de búsqueda de `.env` y campos extraídos
- [architecture.md](architecture.md): el mecanismo de staging en contexto
- [commands.md](commands.md): `--force` y otros flags
- [troubleshooting.md](troubleshooting.md): recuperación de errores específicos
