# Troubleshooting

Errores comunes y cómo arreglarlos. Si tu problema no está aquí, [abre un issue](https://github.com/claudeos-core/claudeos-core/issues) con los pasos para reproducirlo.

> Original en inglés: [docs/troubleshooting.md](../troubleshooting.md). La traducción al español se mantiene sincronizada con el inglés.

---

## Problemas de instalación

### "Command not found: claudeos-core"

No lo has instalado globalmente, o el bin global de npm no está en tu PATH.

**Opción A — Usar `npx` (recomendado, sin instalar):**
```bash
npx claudeos-core init
```

**Opción B — Instalar globalmente:**
```bash
npm install -g claudeos-core
claudeos-core init
```

Si está npm-installed pero sigue dando "command not found", revisa tu PATH:
```bash
npm config get prefix
# Verifica que el directorio bin/ bajo este prefix esté en tu PATH
```

### "Cannot find module 'glob'" o similar

Estás ejecutando ClaudeOS-Core fuera de la raíz de un proyecto. O:

1. `cd` a tu proyecto primero.
2. Usa `npx claudeos-core init` (funciona desde cualquier directorio).

### "Node.js version not supported"

ClaudeOS-Core requiere Node.js 18+. Comprueba tu versión:

```bash
node --version
```

Actualiza vía [nvm](https://github.com/nvm-sh/nvm), [fnm](https://github.com/Schniz/fnm), o el package manager de tu OS.

---

## Comprobaciones pre-flight

### "Claude Code not found"

ClaudeOS-Core usa tu instalación local de Claude Code. Instálalo primero:

- [Guía de instalación oficial](https://docs.anthropic.com/en/docs/claude-code)
- Verifica: `claude --version`

Si `claude` está instalado pero no en PATH, arregla el PATH de tu shell — no hay variable env de override.

### "Could not detect stack"

El scanner no pudo identificar el framework de tu proyecto. Causas:

- No hay `package.json` / `pom.xml` / `build.gradle` / `pyproject.toml` en la raíz del proyecto.
- Tu stack no está en [los 12 stacks soportados](stacks.md).
- Layout personalizado que no coincide con las reglas de auto-detección.

**Fix:** verifica que la raíz del proyecto tenga uno de los archivos reconocidos. Si tu stack está soportado pero tu layout es inusual, ver [advanced-config.md](advanced-config.md) para overrides `.claudeos-scan.json`.

### "Authentication test failed"

`init` ejecuta un rápido `claude -p "echo ok"` para verificar que Claude Code está autenticado. Si esto falla:

```bash
claude --version           # Debería imprimir versión
claude -p "say hi"         # Debería imprimir una respuesta
```

Si `-p` devuelve un error de auth, sigue el flujo de auth de Claude Code. ClaudeOS-Core no puede arreglar la auth de Claude por ti.

---

## Problemas en runtime de init

### Init se cuelga o tarda mucho tiempo

Pass 1 en un proyecto grande tarda un rato. Diagnósticos:

1. **¿Funciona Claude Code?** Ejecuta `claude --version` en otra terminal.
2. **¿Está bien la red?** Cada pase llama a Claude Code, que llama a la API de Anthropic.
3. **¿Es muy grande tu proyecto?** El splitting de grupo de dominios se aplica auto (4 dominios / 40 archivos por grupo), así que un proyecto de 24 dominios ejecuta Pass 1 seis veces.

Si está atascado mucho tiempo sin salida (sin avance del progress ticker), mátalo (Ctrl-C) y reanuda:

```bash
npx claudeos-core init   # Reanuda desde el último marker de pase completado
```

El mecanismo de resume solo re-ejecuta los pases que no completaron.

### Errores "Prompt is too long" de Claude

Esto significa que Pass 3 se quedó sin ventana de contexto. Mitigaciones que la herramienta ya aplica:

- **Pass 3 split mode** (3a → 3b-core → 3b-N → 3c-core → 3c-N → 3d-aux) — automático.
- **Splitting de grupo de dominios** — auto-aplicado cuando dominios > 4 o archivos > 40 por grupo.
- **Sub-división por batch** — para ≥16 dominios, 3b/3c sub-dividen en batches de ≤15 dominios cada uno.

Si aún golpeas límites de contexto pese a esto, el proyecto es excepcionalmente grande. Las opciones actuales son:

1. Divide tu proyecto en directorios separados y ejecuta `init` en cada uno.
2. Añade overrides agresivos `frontendScan.platformKeywords` vía `.claudeos-scan.json` para saltar subapps no esenciales.
3. [Abre un issue](https://github.com/claudeos-core/claudeos-core/issues) — quizá necesitemos un nuevo override para tu caso.

No hay un flag para "forzar splitting más agresivo" más allá de lo que ya es automático.

### Init falla a mitad de camino

La herramienta es **resume-safe**. Solo re-ejecuta:

```bash
npx claudeos-core init
```

Retoma desde el último marker de pase completado. Sin trabajo perdido.

Si quieres un slate limpio (borrar todos los markers y regenerar todo), usa `--force`:

```bash
npx claudeos-core init --force
```

Ten en cuenta: `--force` borra ediciones manuales a `.claude/rules/`. Ver [safety.md](safety.md) para detalles.

### Windows: errores "EBUSY" o file-lock

El file locking de Windows es más estricto que en Unix. Causas:

- Antivirus escaneando archivos a mitad de write.
- Un IDE tiene un archivo abierto con lock exclusivo.
- Un `init` previo crasheó y dejó un handle viejo.

Fixes (prueba en orden):

1. Cierra tu IDE, reintenta.
2. Desactiva el real-time scan del antivirus para la carpeta del proyecto (o whitelistea el path del proyecto).
3. Reinicia Windows (limpia handles viejos).
4. Si persiste, ejecuta desde WSL2 en su lugar.

La lógica de move de `lib/staged-rules.js` cae de `renameSync` a `copyFileSync + unlinkSync` para manejar la mayoría de la interferencia de antivirus automáticamente. Si aún golpeas errores de lock, los archivos staged quedan en `claudeos-core/generated/.staged-rules/` para inspección — re-ejecuta `init` para reintentar el move.

### Fallos de rename cross-volume (Linux/macOS)

`init` puede necesitar renombrar atómicamente entre mount points (p. ej., `/tmp` a tu proyecto en un disco distinto). La herramienta cae a copy-then-delete automáticamente — sin acción necesaria.

Si ves fallos persistentes de move, comprueba que tienes acceso de escritura tanto a `claudeos-core/generated/.staged-rules/` como a `.claude/rules/`.

---

## Problemas de validación

### "STALE_PATH: file does not exist"

Un path mencionado en standards/skills/guides no se resuelve a un archivo real. Causas:

- Pass 3 alucinó un path (p. ej., inventó `featureRoutePath.ts` desde un dir padre + un nombre de constante TypeScript).
- Borraste un archivo pero los docs aún lo referencian.
- El archivo está gitignored pero la allowlist del scanner lo tenía.

**Fix:**

```bash
npx claudeos-core init --force
```

Esto regenera Pass 3 / 4 con una allowlist fresca.

Si el path está intencionalmente gitignored y quieres que el scanner lo ignore, ver [advanced-config.md](advanced-config.md) para qué soporta realmente `.claudeos-scan.json` (el conjunto soportado de campos es pequeño).

Si `--force` no lo arregla (re-ejecutar puede re-disparar la misma alucinación en seeds de LLM raros), edita el archivo ofensivo a mano y elimina el path malo. El validator corre a nivel **advisory**, así que esto no bloqueará CI — puedes enviar y arreglar más tarde.

### "MANIFEST_DRIFT: registered skill not in CLAUDE.md"

Los skills registrados en `claudeos-core/skills/00.shared/MANIFEST.md` deberían mencionarse en algún lugar de CLAUDE.md. El validator tiene una **excepción orchestrator/sub-skill** — los sub-skills se consideran cubiertos cuando su orchestrator se menciona.

**Fix:** si el orchestrator de un sub-skill genuinamente no se menciona en CLAUDE.md, ejecuta `init --force` para regenerar. Si el orchestrator SÍ se menciona y el validator aún lo marca, eso es un bug del validator — por favor [abre un issue](https://github.com/claudeos-core/claudeos-core/issues) con los paths de los archivos.

### "Section 8 has wrong number of H4 sub-sections"

`claude-md-validator` requiere exactamente 2 headings `####` bajo Section 8 (L4 Memory Files / Memory Workflow).

Causas probables:

- Editaste manualmente CLAUDE.md y rompiste la estructura de Section 8.
- Un Pass 4 pre-v2.3.0 corrió y añadió una Section 9.
- Estás actualizando desde una versión pre-v2.2.0 (scaffold de 8 secciones aún no enforced).

**Fix:**

```bash
npx claudeos-core init --force
```

Esto regenera CLAUDE.md limpiamente. Los archivos de memoria se preservan a través de `--force` (solo los archivos generados se sobrescriben).

### "T1: section heading missing English canonical token"

Cada heading de sección `## N.` debe contener su token canónico inglés (p. ej., `## 1. Role Definition` o `## 1. Definición de Rol (Role Definition)`). Esto es para mantener funcionando el grep multi-repo independientemente de `--lang`.

**Fix:** edita el heading para incluir el token inglés entre paréntesis, o ejecuta `init --force` para regenerar (el scaffold v2.3.0+ aplica esta convención automáticamente).

---

## Problemas del memory layer

### "Memory file growing too large"

Ejecuta compactación:

```bash
npx claudeos-core memory compact
```

Esto aplica el algoritmo de compactación de 4 etapas. Ver [memory-layer.md](memory-layer.md) para qué hace cada etapa.

### "propose-rules sugiere reglas con las que no estoy de acuerdo"

La salida es un draft para revisión, no auto-aplicado. Solo declina lo que no quieras:

- Edita `claudeos-core/memory/auto-rule-update.md` directamente para remover propuestas que rechaces.
- O salta el paso de aplicar por completo — tu `.claude/rules/` no cambia a menos que copies contenido propuesto a archivos de regla manualmente.

### `memory <subcommand>` dice "not found"

Los archivos de memoria faltan. Se crean por Pass 4 de `init`. Si fueron borrados:

```bash
npx claudeos-core init --force
```

O, si solo quieres que los archivos de memoria se recreen sin re-ejecutar todo, la herramienta no tiene un comando single-pass-replay. `--force` es el camino.

---

## Problemas en CI

### Tests pasan localmente pero fallan en CI

Razones más probables:

1. **CI no tiene `claude` instalado.** Los tests dependientes de traducción salen vía `CLAUDEOS_SKIP_TRANSLATION=1`. El workflow CI oficial define esta env var; si tu fork no, defínela.

2. **Normalización de paths (Windows).** El codebase normaliza backslashes Windows a forward slashes en muchos sitios, pero los tests pueden tropezar en diferencias sutiles. El CI oficial corre en Windows + Linux + macOS así que la mayoría de issues se atrapan — si ves un fallo específico de Windows, podría ser un bug real.

3. **Versión de Node.** Los tests corren en Node 18 + 20. Si estás en Node 16 o 22, podrías golpear incompatibilidades — pincha a 18 o 20 para paridad CI.

### `health` sale 0 en CI pero esperaba no-cero

`health` sale no-cero solo en hallazgos a nivel **fail**. **warn** y **advisory** imprimen pero no bloquean.

Si quieres fallar en advisories (p. ej., para ser estricto sobre `STALE_PATH`), no hay flag built-in — necesitarías hacer grep de la salida y salir consecuentemente:

```bash
npx claudeos-core health > health.log
if grep -q "advisory" health.log; then exit 1; fi
```

---

## Obtener ayuda

Si nada de lo anterior encaja:

1. **Captura el mensaje exacto de error.** Los errores de ClaudeOS-Core incluyen paths de archivo e identificadores — esos ayudan a reproducir.
2. **Revisa el issue tracker:** [GitHub Issues](https://github.com/claudeos-core/claudeos-core/issues) — tu issue puede ya estar reportado.
3. **Abre un nuevo issue** con: OS, versión Node, versión Claude Code (`claude --version`), stack del proyecto, y la salida del error. Si es posible, incluye `claudeos-core/generated/project-analysis.json` (las vars sensibles se auto-redactan).

Para problemas de seguridad, ver [SECURITY.md](../../SECURITY.md) — no abras issues públicos para vulnerabilidades.

---

## Ver también

- [safety.md](safety.md) — qué hace `--force` y qué preserva
- [verification.md](verification.md) — qué significan los hallazgos del validator
- [advanced-config.md](advanced-config.md) — overrides `.claudeos-scan.json`
