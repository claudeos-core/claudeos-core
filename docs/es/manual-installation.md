# Instalación manual

Si no puedes usar `npx` (firewall corporativo, entorno air-gapped, CI bloqueado), aquí tienes cómo instalar y ejecutar ClaudeOS-Core manualmente.

Para la mayoría de usuarios, `npx claudeos-core init` es suficiente — no necesitas leer esta página.

> Original en inglés: [docs/manual-installation.md](../manual-installation.md). La traducción al español se mantiene sincronizada con el inglés.

---

## Requisitos previos (independientemente del método de instalación)

- **Node.js 18+** — verifica con `node --version`. Si es más antiguo, actualiza vía [nvm](https://github.com/nvm-sh/nvm), [fnm](https://github.com/Schniz/fnm), o el package manager de tu OS.
- **Claude Code** — instalado y autenticado. Verifica con `claude --version`. Ver la [guía de instalación oficial de Anthropic](https://docs.anthropic.com/en/docs/claude-code).
- **Repo Git (preferido)** — `init` comprueba `.git/` y al menos uno de `package.json`, `build.gradle`, `pom.xml`, `pyproject.toml` en la raíz del proyecto.

---

## Opción 1 — Instalación global con npm

```bash
npm install -g claudeos-core
```

Verifica:

```bash
claudeos-core --version
```

Luego úsalo sin `npx`:

```bash
claudeos-core init
```

**Pros:** Estándar, funciona en la mayoría de los setups.
**Contras:** Necesita npm + acceso de escritura al `node_modules` global.

Para upgrade luego:

```bash
npm install -g claudeos-core@latest
```

Para desinstalar:

```bash
npm uninstall -g claudeos-core
```

---

## Opción 2 — devDependency por proyecto

Añade al `package.json` de tu proyecto:

```json
{
  "devDependencies": {
    "claudeos-core": "^2.4.0"
  }
}
```

Instala:

```bash
npm install
```

Usa vía scripts npm:

```json
{
  "scripts": {
    "claudeos:init": "claudeos-core init",
    "claudeos:health": "claudeos-core health",
    "claudeos:lint": "claudeos-core lint"
  }
}
```

Luego:

```bash
npm run claudeos:init
```

**Pros:** Versión pinchada por proyecto; CI-friendly; sin contaminación global.
**Contras:** Hincha `node_modules` — aunque las dependencias son mínimas (solo `glob` y `gray-matter`).

Para desinstalar de un proyecto:

```bash
npm uninstall claudeos-core
```

---

## Opción 3 — Clonar y enlazar (para contribuidores)

Para desarrollo o cuando quieres contribuir:

```bash
git clone https://github.com/claudeos-core/claudeos-core.git
cd claudeos-core
npm install
npm link
```

Ahora `claudeos-core` está en tu PATH globalmente, apuntando al repo clonado.

Para usar un clone local en otro proyecto:

```bash
cd /path/to/your/other/project
npm link claudeos-core
```

**Pros:** Edita el código fuente de la herramienta y prueba cambios inmediatamente.
**Contras:** Solo útil para contribuidores. El link se rompe si mueves el repo clonado.

---

## Opción 4 — Vendored / air-gapped

Para entornos sin acceso a internet:

**En una máquina con conexión:**

```bash
npm pack claudeos-core
# Produce claudeos-core-2.4.0.tgz
```

**Transfiere el `.tgz` a tu entorno air-gapped.**

**Instala desde el archivo local:**

```bash
npm install -g ./claudeos-core-2.4.0.tgz
```

También necesitarás:
- Node.js 18+ ya instalado en el entorno air-gapped.
- Claude Code ya instalado y autenticado.
- Los paquetes npm `glob` y `gray-matter` empaquetados en el caché npm offline (o vendored haciendo `npm pack` separadamente).

Para tener todas las dependencias transitivas empaquetadas, puedes ejecutar `npm install --omit=dev` dentro de una copia desempaquetada del tarball antes de transferir.

---

## Verificar la instalación

Después de cualquier método de instalación, verifica los cuatro requisitos:

```bash
# Debería imprimir versión (p. ej., 2.4.0)
claudeos-core --version

# Debería imprimir la versión de Claude Code
claude --version

# Debería imprimir la versión de Node (debe ser 18+)
node --version

# Debería imprimir el texto de Help
claudeos-core --help
```

Si los cuatro funcionan, estás listo para ejecutar `claudeos-core init` en un proyecto.

---

## Desinstalar

```bash
# Si está instalado globalmente
npm uninstall -g claudeos-core

# Si está instalado por proyecto
npm uninstall claudeos-core
```

Para también remover el contenido generado de un proyecto:

```bash
rm -rf claudeos-core/ .claude/rules/ CLAUDE.md
```

ClaudeOS-Core solo escribe a `claudeos-core/`, `.claude/rules/` y `CLAUDE.md`. Remover esos tres es suficiente para remover por completo el contenido generado de un proyecto.

---

## Integración CI

Para GitHub Actions, el workflow oficial usa `npx`:

```yaml
- uses: actions/setup-node@v5
  with:
    node-version: '20'

- run: npx claudeos-core health
```

Esto es suficiente para la mayoría de casos de uso CI — `npx` descarga el paquete bajo demanda y lo cachea.

Si tu CI es air-gapped o quieres una versión pinchada, usa la Opción 2 (devDependency por proyecto) y:

```yaml
- uses: actions/setup-node@v5
  with:
    node-version: '20'
    cache: 'npm'

- run: npm ci
- run: npm run claudeos:health
```

Para otros sistemas CI (GitLab, CircleCI, Jenkins, etc.), el patrón es el mismo: instalar Node, instalar Claude Code, autenticar, ejecutar `npx claudeos-core <command>`.

**`health` es el check CI recomendado** — es rápido (sin llamadas LLM) y cubre los cuatro validators de runtime. Para validación estructural, también ejecuta `claudeos-core lint`.

---

## Troubleshooting de instalación

### "Command not found: claudeos-core"

O no está instalado globalmente, o tu PATH no incluye el bin global de npm.

```bash
npm config get prefix
# Asegúrate de que el directorio bin/ bajo este path esté en tu PATH
```

O usa `npx` en su lugar:

```bash
npx claudeos-core <command>
```

### "Cannot find module 'glob'"

Estás ejecutando ClaudeOS-Core desde un directorio que no es la raíz de un proyecto. O `cd` a tu proyecto, o usa `npx` (que funciona desde cualquier lado).

### "Node.js version not supported"

Tienes Node 16 o más antiguo. Actualiza a Node 18+:

```bash
# nvm
nvm install 20 && nvm use 20

# fnm
fnm install 20 && fnm use 20

# package manager del OS — varía
```

### "Claude Code not found"

ClaudeOS-Core usa tu instalación local de Claude Code. Instala Claude Code primero ([guía oficial](https://docs.anthropic.com/en/docs/claude-code)), luego verifica con `claude --version`.

Si `claude` está instalado pero no en tu PATH, arregla tu PATH — no hay variable env de override.

---

## Ver también

- [commands.md](commands.md) — una vez instalado, qué ejecutar
- [troubleshooting.md](troubleshooting.md) — errores en runtime durante `init`
