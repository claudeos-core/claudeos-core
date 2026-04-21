# ClaudeOS-Core

**La única herramienta que lee primero tu código fuente, confirma tu stack y tus patrones mediante análisis determinístico, y luego genera reglas de Claude Code adaptadas exactamente a tu proyecto.**

```bash
npx claudeos-core init
```

ClaudeOS-Core lee tu codebase, extrae cada patrón que encuentra y genera un conjunto completo de Standards, Rules, Skills y Guides adaptados a _tu_ proyecto. Después, cuando le digas a Claude Code "Crea un CRUD para pedidos", producirá código que coincide exactamente con tus patrones existentes.

[🇺🇸 English](./README.md) · [🇰🇷 한국어](./README.ko.md) · [🇨🇳 中文](./README.zh-CN.md) · [🇯🇵 日本語](./README.ja.md) · [🇻🇳 Tiếng Việt](./README.vi.md) · [🇮🇳 हिन्दी](./README.hi.md) · [🇷🇺 Русский](./README.ru.md) · [🇫🇷 Français](./README.fr.md) · [🇩🇪 Deutsch](./README.de.md)

---

## ¿Por qué ClaudeOS-Core?

Cualquier otra herramienta de Claude Code funciona así:

> **El humano describe el proyecto → el LLM genera la documentación**

ClaudeOS-Core funciona así:

> **El código analiza tu fuente → el código construye un prompt adaptado → el LLM genera la documentación → el código verifica el resultado**

No es una pequeña diferencia. Aquí está por qué importa:

### El problema central: los LLMs adivinan. El código, no.

Cuando le pides a Claude que "analice este proyecto", **adivina** tu stack, tu ORM, tu estructura de dominios.
Puede ver `spring-boot` en tu `build.gradle` pero no darse cuenta de que usas MyBatis (no JPA).
Puede detectar un directorio `user/` sin percatarse de que tu proyecto usa empaquetado por capas primero (Patrón A), no por dominio primero (Patrón B).

**ClaudeOS-Core no adivina.** Antes de que Claude siquiera vea tu proyecto, el código Node.js ya ha:

- Parseado `build.gradle` / `package.json` / `pyproject.toml` y **confirmado** tu stack, ORM, BD y gestor de paquetes
- Escaneado tu estructura de directorios y **confirmado** tu lista de dominios con el conteo de archivos
- Clasificado la estructura de tu proyecto en uno de los 5 patrones Java, Kotlin CQRS/BFF, o Next.js App Router/FSD
- Dividido los dominios en grupos de tamaño óptimo que caben en la ventana de contexto de Claude
- Ensamblado un prompt específico del stack con todos los hechos confirmados inyectados

Cuando Claude recibe el prompt, no queda nada por adivinar. El stack está confirmado. Los dominios están confirmados. El patrón estructural está confirmado. El único trabajo de Claude es generar documentación que coincida con estos **hechos confirmados**.

### El resultado

Otras herramientas producen documentación "generalmente buena".
ClaudeOS-Core produce documentación que sabe que tu proyecto usa `ApiResponse.ok()` (no `ResponseEntity.success()`), que tus mappers MyBatis XML viven en `src/main/resources/mybatis/mappers/`, y que tu estructura de paquetes es `com.company.module.{domain}.controller` — porque leyó tu código real.

### Antes y después

**Sin ClaudeOS-Core** — le pides a Claude Code que cree un CRUD de Order:
```
❌ Usa un repository estilo JPA (tu proyecto usa MyBatis)
❌ Crea ResponseEntity.success() (tu wrapper es ApiResponse.ok())
❌ Coloca archivos en order/controller/ (tu proyecto usa controller/order/)
❌ Genera comentarios en inglés (tu equipo escribe comentarios en español)
→ Pasas 20 minutos corrigiendo cada archivo generado
```

**Con ClaudeOS-Core** — `.claude/rules/` ya contiene tus patrones confirmados:
```
✅ Genera mapper MyBatis + XML (detectado desde build.gradle)
✅ Usa ApiResponse.ok() (extraído de tu fuente real)
✅ Coloca archivos en controller/order/ (Patrón A confirmado por el escaneo estructural)
✅ Comentarios en español (--lang es aplicado)
→ El código generado coincide con las convenciones de tu proyecto al instante
```

Esta diferencia se acumula. 10 tareas/día × 20 minutos ahorrados = **más de 3 horas/día**.

---

## Stacks Soportados

| Stack | Detección | Profundidad de análisis |
|---|---|---|
| **Java / Spring Boot** | `build.gradle`, `pom.xml`, 5 patrones de paquete | 10 categorías, 59 sub-ítems |
| **Kotlin / Spring Boot** | `build.gradle.kts`, kotlin plugin, `settings.gradle.kts`, auto-detección CQRS/BFF | 12 categorías, 95 sub-ítems |
| **Node.js / Express** | `package.json` | 9 categorías, 57 sub-ítems |
| **Node.js / NestJS** | `package.json` (`@nestjs/core`) | 10 categorías, 68 sub-ítems |
| **Next.js / React** | `package.json`, `next.config.*`, soporte FSD | 9 categorías, 55 sub-ítems |
| **Vue / Nuxt** | `package.json`, `nuxt.config.*`, Composition API | 9 categorías, 58 sub-ítems |
| **Python / Django** | `requirements.txt`, `pyproject.toml` | 10 categorías, 55 sub-ítems |
| **Python / FastAPI** | `requirements.txt`, `pyproject.toml` | 10 categorías, 58 sub-ítems |
| **Node.js / Fastify** | `package.json` | 10 categorías, 62 sub-ítems |
| **Vite / React SPA** | `package.json`, `vite.config.*` | 9 categorías, 55 sub-ítems |
| **Angular** | `package.json`, `angular.json` | 12 categorías, 78 sub-ítems |

Auto-detectado: lenguaje y versión, framework y versión (incluyendo Vite como framework SPA), ORM (MyBatis, JPA, Exposed, Prisma, TypeORM, SQLAlchemy, etc.), base de datos (PostgreSQL, MySQL, Oracle, MongoDB, SQLite), gestor de paquetes (Gradle, Maven, npm, yarn, pnpm, pip, poetry), arquitectura (CQRS, BFF — a partir de los nombres de módulos), estructura multi-módulo (desde settings.gradle), monorepo (Turborepo, pnpm-workspace, Lerna, npm/yarn workspaces), **configuración de runtime desde `.env.example`** (v2.2.0 — extrae port/host/API-target de más de 16 nombres de variable convencionales a través de frameworks Vite · Next.js · Nuxt · Angular · Node · Python).

**No tienes que especificar nada. Todo se detecta automáticamente.**

### Configuración de runtime desde `.env` (v2.2.0)

v2.2.0 añade `lib/env-parser.js` para que el `CLAUDE.md` generado refleje lo que el proyecto declara realmente, en vez de los valores por defecto del framework.

- **Orden de búsqueda**: `.env.example` (canónico, commiteado) → `.env.local.example` → `.env.sample` → `.env.template` → `.env` → `.env.local` → `.env.development`. La variante `.example` gana porque es la forma-de-verdad neutral para desarrolladores, no los overrides locales de un contribuidor concreto.
- **Convenciones de variable de puerto reconocidas**: `VITE_PORT` / `VITE_DEV_PORT` / `VITE_DESKTOP_PORT` / `NEXT_PUBLIC_PORT` / `NUXT_PORT` / `NG_PORT` / `APP_PORT` / `SERVER_PORT` / `HTTP_PORT` / `DEV_PORT` / `FLASK_RUN_PORT` / `UVICORN_PORT` / `DJANGO_PORT` / `PORT` genérico. Los nombres específicos de framework ganan sobre `PORT` genérico cuando ambos están presentes.
- **Host y API target**: `VITE_DEV_HOST` / `VITE_API_TARGET` / `NEXT_PUBLIC_API_URL` / `NUXT_PUBLIC_API_BASE` / `BACKEND_URL` / `PROXY_TARGET`, etc.
- **Precedencia**: `server.port` de `application.yml` de Spring Boot sigue ganando (config framework-native), luego el puerto declarado en `.env`, y finalmente el valor por defecto del framework (Vite 5173, Next.js 3000, Django 8000, etc.) como último recurso.
- **Redacción de variables sensibles**: los valores de variables que coinciden con patrones `PASSWORD` / `SECRET` / `TOKEN` / `API_KEY` / `ACCESS_KEY` / `PRIVATE_KEY` / `CREDENTIAL` / `JWT_SECRET` / `CLIENT_SECRET` / `SESSION_SECRET` / `BEARER` / `SALT` se sustituyen por `***REDACTED***` antes de llegar a cualquier generador downstream. Defense-in-depth contra secretos commiteados accidentalmente en `.env.example`. `DATABASE_URL` se incluye explícitamente en la lista blanca para retrocompatibilidad con la identificación de DB del stack-detector.

### Detección de Dominios Java (5 patrones con fallback)

| Prioridad | Patrón | Estructura | Ejemplo |
|---|---|---|---|
| A | Capa primero | `controller/{domain}/` | `controller/user/UserController.java` |
| B | Dominio primero | `{domain}/controller/` | `user/controller/UserController.java` |
| D | Prefijo de módulo | `{module}/{domain}/controller/` | `front/member/controller/MemberController.java` |
| E | DDD/Hexagonal | `{domain}/adapter/in/web/` | `user/adapter/in/web/UserController.java` |
| C | Plano | `controller/*.java` | `controller/UserController.java` → extrae `user` del nombre de clase |

Los dominios solo con servicios (sin controladores) también se detectan mediante directorios `service/`, `dao/`, `aggregator/`, `facade/`, `usecase/`, `orchestrator/`, `mapper/`, `repository/`. Se omiten: `common`, `config`, `util`, `core`, `front`, `admin`, `v1`, `v2`, etc.

### Detección de Dominios Kotlin Multi-Módulo

Para proyectos Kotlin con estructura Gradle multi-módulo (por ejemplo, monorepo CQRS):

| Paso | Qué hace | Ejemplo |
|---|---|---|
| 1 | Escanea `settings.gradle.kts` en busca de `include()` | Encuentra 14 módulos |
| 2 | Detecta el tipo de módulo desde el nombre | `reservation-command-server` → tipo: `command` |
| 3 | Extrae el dominio del nombre del módulo | `reservation-command-server` → dominio: `reservation` |
| 4 | Agrupa el mismo dominio entre módulos | `reservation-command-server` + `common-query-server` → 1 dominio |
| 5 | Detecta la arquitectura | Tiene módulos `command` + `query` → CQRS |

Tipos de módulo soportados: `command`, `query`, `bff`, `integration`, `standalone`, `library`. Las bibliotecas compartidas (`shared-lib`, `integration-lib`) se detectan como dominios especiales.

### Detección de Dominios Frontend

- **App Router**: `app/{domain}/page.tsx` (Next.js)
- **Pages Router**: `pages/{domain}/index.tsx`
- **FSD (Feature-Sliced Design)**: `features/*/`, `widgets/*/`, `entities/*/`
- **División RSC/Client**: Detecta el patrón `client.tsx`, realiza seguimiento de la separación de componentes Server/Client
- **Rutas anidadas no estándar**: Detecta pages, components y capas FSD bajo rutas `src/*/` (ej: `src/admin/pages/dashboard/`, `src/admin/components/form/`, `src/admin/features/billing/`)
- **Detección platform/tier-split (v2.0.0)**: Reconoce layouts `src/{platform}/{subapp}/` — `{platform}` puede ser una palabra clave de dispositivo/objetivo (`desktop`, `pc`, `web`, `mobile`, `mc`, `mo`, `sp`, `tablet`, `tab`, `pwa`, `tv`, `ctv`, `ott`, `watch`, `wear`) o una palabra clave de nivel de acceso (`admin`, `cms`, `backoffice`, `back-office`, `portal`). Emite un dominio por cada par `(platform, subapp)` con el nombre `{platform}-{subapp}` y recuentos por dominio para routes/components/layouts/hooks. Se ejecuta simultáneamente sobre Angular, Next.js, React y Vue (glob multi-extensión `{tsx,jsx,ts,js,vue}`). Requiere ≥2 archivos fuente por subapp para evitar dominios ruidosos de 1 solo archivo.
- **División por plataforma en monorepo (v2.0.0)**: El escaneo de plataforma también coincide con `{apps,packages}/*/src/{platform}/{subapp}/` (Turborepo/pnpm workspace con `src/`) y `{apps,packages}/{platform}/{subapp}/` (workspaces sin envoltorio `src/`).
- **Fallback E — archivo de rutas (v2.0.0)**: Cuando los escáneres principales + los fallbacks A–D devuelven 0, hace un glob `**/routes/*.{tsx,jsx,ts,js,vue}` y agrupa por el nombre del directorio padre de `routes`. Captura proyectos de enrutamiento por archivo con React Router (CRA/Vite + `react-router`) que no encajan en los layouts `page.tsx` de Next.js ni de FSD. Se filtran los nombres de padre genéricos (`src`, `app`, `pages`).
- **Fallback de configuración**: Detecta Next.js/Vite/Nuxt desde archivos de configuración cuando no están en `package.json` (soporte de monorepo)
- **Fallback de directorio profundo**: Para proyectos React/CRA/Vite/Vue/RN, escanea `**/components/*/`, `**/views/*/`, `**/screens/*/`, `**/containers/*/`, `**/pages/*/`, `**/routes/*/`, `**/modules/*/`, `**/domains/*/` a cualquier profundidad
- **Listas de ignorados compartidas (v2.0.0)**: Todos los escáneres comparten `BUILD_IGNORE_DIRS` (`node_modules`, `build`, `dist`, `out`, `.next`, `.nuxt`, `.svelte-kit`, `.angular`, `.turbo`, `.cache`, `.parcel-cache`, `coverage`, `storybook-static`, `.vercel`, `.netlify`) y `TEST_FILE_IGNORE` (spec/test/stories/e2e/cy + `__snapshots__`/`__tests__`) para que los resultados de build y las fixtures de test no inflen los recuentos por dominio.

### Overrides de escáner (v2.0.0)

Coloca un `.claudeos-scan.json` opcional en la raíz de tu proyecto para extender los valores por defecto del escáner sin modificar el toolkit. Todos los campos son **aditivos** — las entradas del usuario extienden los valores por defecto, nunca los reemplazan:

```json
{
  "frontendScan": {
    "platformKeywords": ["kiosk"],
    "skipSubappNames": ["legacy"],
    "minSubappFiles": 3
  }
}
```

| Campo | Por defecto | Propósito |
|---|---|---|
| `platformKeywords` | lista integrada indicada arriba | Palabras clave `{platform}` adicionales para el escaneo de plataforma (ej: `kiosk`, `vr`, `embedded`) |
| `skipSubappNames` | solo directorios estructurales | Nombres de subapp adicionales para excluir de la emisión de dominios del escaneo de plataforma |
| `minSubappFiles` | `2` | Anula el recuento mínimo de archivos requerido para que un subapp se convierta en dominio |

Archivo ausente o JSON mal formado → cae silenciosamente a los valores por defecto (no crashea). Uso típico: activar una abreviatura corta (`adm`, `bo`) que la lista integrada excluye por ser demasiado ambigua, o aumentar `minSubappFiles` para monorepos ruidosos.

---

## Inicio Rápido

### Prerrequisitos

- **Node.js** v18+
- **Claude Code CLI** (instalado y autenticado)

### Instalación

```bash
cd /your/project/root

# Opción A: npx (recomendado — no requiere instalación)
npx claudeos-core init

# Opción B: instalación global
npm install -g claudeos-core
claudeos-core init

# Opción C: devDependency del proyecto
npm install --save-dev claudeos-core
npx claudeos-core init

# Opción D: git clone (para desarrollo/contribución)
git clone https://github.com/claudeos-core/claudeos-core.git claudeos-core-tools

# Multiplataforma (PowerShell, CMD, Bash, Zsh — cualquier terminal)
node claudeos-core-tools/bin/cli.js init

# Linux/macOS (solo Bash)
bash claudeos-core-tools/bootstrap.sh
```

### Idioma de salida (10 idiomas)

Cuando ejecutas `init` sin `--lang`, aparece un selector interactivo — usa las flechas o las teclas numéricas para elegir:

```
╔══════════════════════════════════════════════════╗
║  Select generated document language (required)   ║
╚══════════════════════════════════════════════════╝

  Los archivos generados (CLAUDE.md, Standards, Rules,
  Skills, Guides) se escribirán en español.

     1. en     — English
     2. ko     — 한국어 (Korean)
     3. zh-CN  — 简体中文 (Chinese Simplified)
     4. ja     — 日本語 (Japanese)
  ❯  5. es     — Español (Spanish)
     6. vi     — Tiếng Việt (Vietnamese)
     7. hi     — हिन्दी (Hindi)
     8. ru     — Русский (Russian)
     9. fr     — Français (French)
    10. de     — Deutsch (German)

  ↑↓ Move  1-0 Jump  Enter Select  ESC Cancel
```

La descripción cambia al idioma seleccionado a medida que navegas. Para saltarte el selector, pasa `--lang` directamente:

```bash
npx claudeos-core init --lang ko    # Coreano
npx claudeos-core init --lang ja    # Japonés
npx claudeos-core init --lang en    # Inglés (por defecto)
```

> **Nota:** Esto establece el idioma solo para los archivos de documentación generados. El análisis de código (Pass 1–2) siempre se ejecuta en inglés; la salida generada (Pass 3) se escribe en el idioma elegido. Los ejemplos de código dentro de los archivos generados mantienen la sintaxis original del lenguaje de programación.

Eso es todo. Tras 10 minutos (proyecto pequeño) a 2 horas (monorepo de 60+ dominios), toda la documentación se genera y queda lista para usar. La CLI muestra una barra de progreso con porcentaje, tiempo transcurrido y ETA para cada pass. Ver [Auto-escalado por tamaño del proyecto](#auto-escalado-por-tamaño-del-proyecto) para los tiempos detallados por tamaño de proyecto.

### Instalación Manual Paso a Paso

Si quieres control total sobre cada fase — o si el pipeline automatizado falla en algún paso — puedes ejecutar cada etapa manualmente. Esto también sirve para entender cómo funciona ClaudeOS-Core internamente.

#### Paso 1: Clonar e instalar dependencias

```bash
cd /your/project/root

git clone https://github.com/claudeos-core/claudeos-core.git claudeos-core-tools
cd claudeos-core-tools && npm install && cd ..
```

#### Paso 2: Crear la estructura de directorios

```bash
# Rules (v2.0.0: añadido 60.memory)
mkdir -p .claude/rules/{00.core,10.backend,20.frontend,30.security-db,40.infra,50.sync,60.memory}

# Standards
mkdir -p claudeos-core/standard/{00.core,10.backend-api,20.frontend-ui,30.security-db,40.infra,50.verification,90.optional}

# Skills
mkdir -p claudeos-core/skills/{00.shared,10.backend-crud/scaffold-crud-feature,20.frontend-page/scaffold-page-feature,50.testing,90.experimental}

# Guide, Database, MCP, Generated, Memory (v2.0.0: añadido memory; v2.1.0: eliminado plan)
mkdir -p claudeos-core/guide/{01.onboarding,02.usage,03.troubleshooting,04.architecture}
mkdir -p claudeos-core/{database,mcp-guide,generated,memory}
```

> **Nota v2.1.0:** El directorio `claudeos-core/plan/` ya no se crea. La generación de Master plan se eliminó porque los master plans eran un backup interno que Claude Code nunca leía en runtime, y agregarlos disparaba fallos `Prompt is too long`. Usa `git` para backup/restore.

#### Paso 3: Ejecutar plan-installer (análisis del proyecto)

Esto escanea tu proyecto, detecta el stack, encuentra dominios, los divide en grupos y genera prompts.

```bash
node claudeos-core-tools/plan-installer/index.js
```

**Salida (en `claudeos-core/generated/`):**
- `project-analysis.json` — stack detectado, dominios, info de frontend
- `domain-groups.json` — grupos de dominios para Pass 1
- `pass1-backend-prompt.md` / `pass1-frontend-prompt.md` — prompts de análisis
- `pass2-prompt.md` — prompt de merge
- `pass3-prompt.md` — plantilla de prompt de Pass 3 con el bloque Phase 1 "Read Once, Extract Facts" anteanteado (Rules A–E). El pipeline automatizado divide Pass 3 en múltiples etapas en runtime; esta plantilla alimenta cada etapa.
- `pass3-context.json` — resumen slim del proyecto (< 5 KB, construido tras Pass 2) que los prompts de Pass 3 prefieren frente al `pass2-merged.json` completo (v2.1.0)
- `pass4-prompt.md` — prompt de scaffolding de memory L4 (v2.0.0; usa el mismo `staging-override.md` para las escrituras de reglas `60.memory/`)

Puedes inspeccionar estos archivos para verificar la precisión de la detección antes de continuar.

#### Paso 4: Pass 1 — Análisis profundo del código (por grupo de dominios)

Ejecuta Pass 1 por cada grupo de dominios. Consulta `domain-groups.json` para saber cuántos grupos hay.

```bash
# Comprueba cuántos grupos hay
cat claudeos-core/generated/domain-groups.json | node -e "
  const g = JSON.parse(require('fs').readFileSync('/dev/stdin','utf-8'));
  g.groups.forEach((g,i) => console.log('Group '+(i+1)+': ['+g.domains.join(', ')+'] ('+g.type+', ~'+g.estimatedFiles+' files)'));
"

# Ejecuta Pass 1 para cada grupo (reemplaza los dominios y el número de grupo)
# Nota: v1.6.1+ usa String.replace() de Node.js en vez de perl — perl ya
# no es necesario, y la semántica de funciones de reemplazo previene la inyección
# regex de los caracteres $/&/$1 que pudieran aparecer en los nombres de dominio.
#
# Para el grupo 1:
DOMAIN_LIST="user, order, product" PASS_NUM=1 node -e "
  const fs = require('fs');
  const tpl = fs.readFileSync('claudeos-core/generated/pass1-backend-prompt.md','utf-8');
  const out = tpl
    .replace(/\{\{DOMAIN_GROUP\}\}/g, () => process.env.DOMAIN_LIST)
    .replace(/\{\{PASS_NUM\}\}/g, () => process.env.PASS_NUM);
  process.stdout.write(out);
" | claude -p --dangerously-skip-permissions

# Para el grupo 2 (si existe):
DOMAIN_LIST="payment, system, delivery" PASS_NUM=2 node -e "
  const fs = require('fs');
  const tpl = fs.readFileSync('claudeos-core/generated/pass1-backend-prompt.md','utf-8');
  const out = tpl
    .replace(/\{\{DOMAIN_GROUP\}\}/g, () => process.env.DOMAIN_LIST)
    .replace(/\{\{PASS_NUM\}\}/g, () => process.env.PASS_NUM);
  process.stdout.write(out);
" | claude -p --dangerously-skip-permissions

# Para grupos frontend, sustituye pass1-backend-prompt.md → pass1-frontend-prompt.md
```

**Verificar:** `ls claudeos-core/generated/pass1-*.json` debería mostrar un JSON por grupo.

#### Paso 5: Pass 2 — Combinar resultados del análisis

```bash
cat claudeos-core/generated/pass2-prompt.md \
  | claude -p --dangerously-skip-permissions
```

**Verificar:** `claudeos-core/generated/pass2-merged.json` debe existir con 9+ claves de nivel superior.

#### Paso 6: Pass 3 — Generar toda la documentación (dividido en varias etapas)

**Nota v2.1.0:** Pass 3 **siempre se ejecuta en modo split** por parte del pipeline automatizado. Cada etapa es una llamada `claude -p` separada con una ventana de contexto nueva, así que el overflow por acumulación de salida es estructuralmente imposible sin importar el tamaño del proyecto. La plantilla `pass3-prompt.md` se ensambla por etapa con una directiva `STAGE:` que le indica a Claude qué subconjunto de archivos debe emitir. En modo manual, el camino más simple sigue siendo alimentar la plantilla completa y dejar que Claude genere todo en una sola llamada — pero esto solo es fiable en proyectos pequeños (≤5 dominios). Para cualquier cosa más grande, usa `npx claudeos-core init` para que el runner de split gestione la orquestación de etapas.

**Modo de llamada única (solo proyectos pequeños, ≤5 dominios):**

```bash
cat claudeos-core/generated/pass3-prompt.md \
  | claude -p --dangerously-skip-permissions
```

**Modo etapa por etapa (recomendado para todos los tamaños de proyecto):**

El pipeline automatizado ejecuta estas etapas. La lista de etapas es:

| Etapa | Escribe | Notas |
|---|---|---|
| `3a` | `pass3a-facts.md` (fact sheet destilado de 5–10 KB) | Lee `pass2-merged.json` una sola vez; las etapas posteriores referencian este archivo |
| `3b-core` | `CLAUDE.md`, `standard/` común, `.claude/rules/` común | Archivos transversales al proyecto; sin salida específica de dominio |
| `3b-1..N` | `standard/60.domains/*.md` específicos de dominio + reglas de dominio | Lote de ≤15 dominios por etapa (auto-dividido a partir de ≥16 dominios) |
| `3c-core` | `guide/` (9 archivos), `skills/00.shared/MANIFEST.md`, orquestadores `skills/*/` | Skills compartidos y todas las guías de cara al usuario |
| `3c-1..N` | Sub-skills de dominio bajo `skills/20.frontend-page/scaffold-page-feature/` | Lote de ≤15 dominios por etapa |
| `3d-aux` | `database/`, `mcp-guide/` | Tamaño fijo, independiente del número de dominios |

Para un proyecto de 1–15 dominios esto se expande a 4 etapas (`3a`, `3b-core`, `3c-core`, `3d-aux` — sin sub-división por lotes). Para 16–30 dominios se expande a 8 etapas (`3b` y `3c` cada una sub-dividida en 2 lotes). Ver [Auto-escalado por tamaño del proyecto](#auto-escalado-por-tamaño-del-proyecto) para la tabla completa.

**Verificar:** `CLAUDE.md` debe existir en la raíz de tu proyecto, y debe escribirse el marcador `claudeos-core/generated/pass3-complete.json`. En modo split, el marcador contiene `mode: "split"` y un array `groupsCompleted` que lista cada etapa que terminó — la lógica de marcador parcial usa esto para reanudar desde la etapa correcta tras un crash en lugar de reiniciar desde `3a` (lo que duplicaría el coste en tokens).

> **Nota de staging:** Pass 3 escribe los archivos de reglas primero en `claudeos-core/generated/.staged-rules/` porque la política de rutas sensibles de Claude Code bloquea las escrituras directas a `.claude/`. El pipeline automatizado gestiona el movimiento automáticamente tras cada etapa. Si ejecutas una etapa manualmente, tendrás que mover el árbol staged tú mismo: `mv claudeos-core/generated/.staged-rules/* .claude/rules/` (preservando los sub-paths).

#### Paso 7: Pass 4 — Scaffolding de memory

```bash
cat claudeos-core/generated/pass4-prompt.md \
  | claude -p --dangerously-skip-permissions
```

**Verificar:** `claudeos-core/memory/` debe contener 4 archivos (`decision-log.md`, `failure-patterns.md`, `compaction.md`, `auto-rule-update.md`), `.claude/rules/60.memory/` debe contener 4 archivos de reglas, y `CLAUDE.md` debe tener ahora una sección `## Memory (L4)` añadida. Marcador: `claudeos-core/generated/pass4-memory.json`.

> **Gap-fill v2.1.0:** Pass 4 también asegura que `claudeos-core/skills/00.shared/MANIFEST.md` exista. Si Pass 3c lo omitió (posible en proyectos skill-sparse porque las plantillas `pass3.md` de cada stack listan `MANIFEST.md` entre los targets de generación sin marcarlo como REQUIRED), el gap-fill crea un stub mínimo para que `.claude/rules/50.sync/02.skills-sync.md` (ruta v2.2.0 — el número de reglas de sync se redujo de 3 a 2, por lo que lo que era `03` ahora es `02`) siempre tenga un target de referencia válido. Idempotente: omite el paso si el archivo ya tiene contenido real (>20 caracteres).

> **Nota:** Si `claude -p` falla o `pass4-prompt.md` está ausente, el pipeline automatizado cae a un scaffold estático vía `lib/memory-scaffold.js` (con traducción por Claude cuando `--lang` no es inglés). El fallback estático solo se ejecuta dentro de `npx claudeos-core init` — el modo manual requiere que Pass 4 tenga éxito.

#### Paso 8: Ejecutar las herramientas de verificación

```bash
# Generar metadata (requerido antes de otras comprobaciones)
node claudeos-core-tools/manifest-generator/index.js

# Ejecutar todas las comprobaciones
node claudeos-core-tools/health-checker/index.js

# O ejecutar comprobaciones individuales:
node claudeos-core-tools/plan-validator/index.js --check # Consistencia Plan ↔ disco
node claudeos-core-tools/sync-checker/index.js          # Archivos no registrados/huérfanos
node claudeos-core-tools/content-validator/index.js     # Comprobaciones de calidad de archivos (incl. sección memory/ [9/9])
node claudeos-core-tools/pass-json-validator/index.js   # Comprobaciones de JSON Pass 1–4 + marcador de finalización
```

#### Paso 9: Verificar los resultados

```bash
# Contar archivos generados
find .claude claudeos-core -type f | grep -v node_modules | grep -v '/generated/' | wc -l

# Revisar CLAUDE.md
head -30 CLAUDE.md

# Revisar un archivo standard
cat claudeos-core/standard/00.core/01.project-overview.md | head -20

# Revisar reglas
ls .claude/rules/*/
```

> **Consejo:** Si algún paso falla, puedes corregir el problema y volver a ejecutar solo ese paso. Los resultados de Pass 1/2 se cachean — si `pass1-N.json` o `pass2-merged.json` ya existe, el pipeline automatizado los omite. Usa `npx claudeos-core init --force` para eliminar resultados previos y empezar desde cero.

### Empezar a Usar

```
# En Claude Code — simplemente pregunta de forma natural:
"Crea un CRUD para el dominio order"
"Añade un API de autenticación de usuarios"
"Refactoriza este código para que coincida con los patrones del proyecto"

# Claude Code referencia automáticamente tus Standards, Rules y Skills generados.
```

---

## Cómo Funciona — Pipeline de 4 Passes

```
npx claudeos-core init
    │
    ├── [1] npm install                        ← Dependencias (~10s)
    ├── [2] Estructura de directorios          ← Crear carpetas (~1s)
    ├── [3] plan-installer (Node.js)           ← Escaneo del proyecto (~5s)
    │       ├── Auto-detecta stack (multi-stack aware)
    │       ├── Extrae la lista de dominios (tagged: backend/frontend)
    │       ├── Divide en grupos de dominios (por tipo)
    │       ├── Construye pass3-context.json (resumen slim, v2.1.0)
    │       └── Selecciona prompts específicos del stack (por tipo)
    │
    ├── [4] Pass 1 × N  (claude -p)            ← Análisis profundo del código (~2-8min)
    │       ├── ⚙️ Grupos backend → prompt específico de backend
    │       └── 🎨 Grupos frontend → prompt específico de frontend
    │
    ├── [5] Pass 2 × 1  (claude -p)            ← Merge del análisis (~1min)
    │       └── Consolida TODOS los resultados de Pass 1 en pass2-merged.json
    │
    ├── [6] Pass 3 (modo split, v2.1.0)        ← Genera todo
    │       │
    │       ├── 3a     × 1  (claude -p)        ← Extracción de hechos (~5-10min)
    │       │       └── Lee pass2-merged.json una vez → pass3a-facts.md
    │       │
    │       ├── 3b-core × 1  (claude -p)       ← CLAUDE.md + standard/rules comunes
    │       ├── 3b-1..N × N  (claude -p)       ← Standards/reglas de dominio (≤15 dominios/lote)
    │       │
    │       ├── 3c-core × 1  (claude -p)       ← Guides + skills compartidos + MANIFEST.md
    │       ├── 3c-1..N × N  (claude -p)       ← Sub-skills de dominio (≤15 dominios/lote)
    │       │
    │       └── 3d-aux  × 1  (claude -p)       ← Stubs de database/ + mcp-guide/
    │
    ├── [7] Pass 4 × 1  (claude -p)            ← Memory scaffolding (~30s-5min)
    │       ├── Seedea memory/ (decision-log, failure-patterns, …)
    │       ├── Genera reglas 60.memory/
    │       ├── Añade la sección "Memory (L4)" al CLAUDE.md
    │       └── Gap-fill: asegura que skills/00.shared/MANIFEST.md exista (v2.1.0)
    │
    └── [8] Verificación                       ← Auto-ejecuta el health checker
```

### ¿Por qué 4 Passes?

**Pass 1** es el único pass que lee tu código fuente. Selecciona archivos representativos por dominio y extrae patrones de 55–95 categorías de análisis (según el stack). Para proyectos grandes, Pass 1 se ejecuta varias veces — una por cada grupo de dominios. En proyectos multi-stack (por ejemplo, Java backend + React frontend), los dominios backend y frontend usan **prompts de análisis diferentes** adaptados a cada stack.

**Pass 2** combina todos los resultados de Pass 1 en un análisis unificado: patrones comunes (100% compartidos), patrones mayoritarios (50%+ compartidos), patrones específicos de dominio, anti-patrones por severidad y preocupaciones transversales (naming, seguridad, BD, testing, logging, rendimiento). Los resultados de backend y frontend se combinan.

**Pass 3** (modo split, v2.1.0) toma el análisis combinado y genera todo el ecosistema de archivos (CLAUDE.md, reglas, standards, skills, guides) a través de múltiples llamadas `claude -p` secuenciales. La clave es que el overflow por acumulación de salida no es predecible desde el tamaño de entrada: el Pass 3 de llamada única funcionaba bien en proyectos de 2 dominios y fallaba de forma confiable a ~5 dominios, y la frontera de fallo variaba según lo verboso que resultara cada archivo. El modo split esquiva esto por completo — cada etapa arranca con una ventana de contexto nueva y escribe un subconjunto acotado de archivos. La consistencia entre etapas (que era la principal ventaja del enfoque de llamada única) se preserva mediante `pass3a-facts.md`, un fact sheet destilado de 5–10 KB que todas las etapas posteriores referencian.

La plantilla de prompt de Pass 3 también incluye un **bloque Phase 1 "Read Once, Extract Facts"** con cinco reglas que acotan aún más el volumen de salida:

- **Rule A** — Referencia la tabla de hechos; no releas `pass2-merged.json`.
- **Rule B** — Escritura idempotente de archivos (omitir si el target existe con contenido real), haciendo Pass 3 seguro de re-ejecutar tras una interrupción.
- **Rule C** — Consistencia entre archivos aplicada a través de la tabla de hechos como única fuente de verdad.
- **Rule D** — Concisión de salida: una línea (`[WRITE]`/`[SKIP]`) entre escrituras de archivo, sin restatear la tabla de hechos, sin echoar el contenido del archivo.
- **Rule E** — Comprobación idempotente por lote: un único `Glob` al inicio de PHASE 2 en vez de llamadas `Read` por cada target.

En **v2.2.0**, Pass 3 también incrusta en línea un scaffold CLAUDE.md determinista (`pass-prompts/templates/common/claude-md-scaffold.md`) en el prompt. Esto fija los títulos y el orden de las 8 secciones de nivel superior para que el `CLAUDE.md` generado no se desvíe entre proyectos, mientras que el contenido de cada sección sigue adaptándose a cada proyecto. El nuevo parser `.env` del stack-detector (`lib/env-parser.js`) suministra `stack.envInfo` al prompt para que las filas de port/host/API target coincidan con lo que el proyecto realmente declara en lugar de los valores por defecto del framework.

**Pass 4** scaffoldea la capa Memory L4: archivos persistentes de conocimiento de equipo (decision-log, failure-patterns, compaction policy, auto-rule-update) más las reglas `60.memory/` que indican a sesiones futuras cuándo y cómo leer/escribir esos archivos. La capa de memory es lo que permite que Claude Code acumule lecciones entre sesiones en lugar de redescubrirlas cada vez. Cuando `--lang` no es inglés, el contenido estático de fallback se traduce vía Claude antes de ser escrito. v2.1.0 añade un gap-fill para `skills/00.shared/MANIFEST.md` por si Pass 3c lo omitió.

---

## Estructura de Archivos Generados

```
your-project/
│
├── CLAUDE.md                          ← Punto de entrada de Claude Code (estructura determinista de 8 secciones, v2.2.0)
│
├── .claude/
│   └── rules/                         ← Reglas disparadas por glob
│       ├── 00.core/
│       ├── 10.backend/
│       ├── 20.frontend/
│       ├── 30.security-db/
│       ├── 40.infra/
│       ├── 50.sync/                   ← Reglas de recordatorio de sync
│       └── 60.memory/                 ← Reglas de scope on-demand de memory L4 (v2.0.0)
│
├── claudeos-core/                     ← Directorio principal de salida
│   ├── generated/                     ← JSON de análisis + prompts dinámicos + marcadores de Pass (añadir a gitignore)
│   │   ├── project-analysis.json      ← Info del stack (multi-stack aware)
│   │   ├── domain-groups.json         ← Grupos con type: backend/frontend
│   │   ├── pass1-backend-prompt.md    ← Prompt de análisis backend
│   │   ├── pass1-frontend-prompt.md   ← Prompt de análisis frontend (si detectado)
│   │   ├── pass2-prompt.md            ← Prompt de merge
│   │   ├── pass2-merged.json          ← Salida de Pass 2 (consumido solo por Pass 3a)
│   │   ├── pass3-context.json         ← Resumen slim (< 5 KB) para Pass 3 (v2.1.0)
│   │   ├── pass3-prompt.md            ← Plantilla de prompt de Pass 3 (bloque Phase 1 anteanteado)
│   │   ├── pass3a-facts.md            ← Fact sheet escrito por Pass 3a, leído por 3b/3c/3d (v2.1.0)
│   │   ├── pass4-prompt.md            ← Prompt de scaffolding de memory (v2.0.0)
│   │   ├── pass3-complete.json        ← Marcador de finalización de Pass 3 (modo split: incluye groupsCompleted, v2.1.0)
│   │   ├── pass4-memory.json          ← Marcador de finalización de Pass 4 (salta en resume)
│   │   ├── rule-manifest.json         ← Índice de archivos para las herramientas de verificación
│   │   ├── sync-map.json              ← Mapeo Plan ↔ disco (vacío en v2.1.0; se conserva por compat con sync-checker)
│   │   ├── stale-report.json          ← Resultados consolidados de verificación
│   │   ├── .i18n-cache-<lang>.json    ← Caché de traducción (no inglés `--lang`)
│   │   └── .staged-rules/             ← Dir de staging transitorio para escrituras de `.claude/rules/` (auto-movido + limpiado)
│   ├── standard/                      ← Estándares de codificación (15-19 archivos + por dominio en 60.domains/)
│   │   ├── 00.core/                   ← Visión general, arquitectura, naming
│   │   ├── 10.backend-api/            ← Patrones de API (específicos del stack)
│   │   ├── 20.frontend-ui/            ← Patrones frontend (si detectado)
│   │   ├── 30.security-db/            ← Seguridad, esquema BD, utilidades
│   │   ├── 40.infra/                  ← Config, logging, CI/CD
│   │   ├── 50.verification/           ← Build verification, testing
│   │   ├── 60.domains/                ← Standards por dominio (escritos por Pass 3b-N, v2.1.0)
│   │   └── 90.optional/               ← Convenciones opcionales (extras específicos del stack)
│   ├── skills/                        ← Skills de scaffolding CRUD/page
│   │   └── 00.shared/MANIFEST.md      ← Única fuente de verdad para los skills registrados
│   ├── guide/                         ← Onboarding, FAQ, troubleshooting (9 archivos)
│   ├── database/                      ← Esquema de BD, guía de migración
│   ├── mcp-guide/                     ← Guía de integración de servidor MCP
│   └── memory/                        ← L4: conocimiento de equipo (4 archivos) — commitea estos
│       ├── decision-log.md            ← El "porqué" detrás de las decisiones de diseño
│       ├── failure-patterns.md        ← Errores recurrentes y sus fixes (auto-scored — `npx claudeos-core memory score`)
│       ├── compaction.md              ← Estrategia de compaction de 4 etapas (ejecuta `npx claudeos-core memory compact`)
│       └── auto-rule-update.md        ← Propuestas de mejora de reglas (`npx claudeos-core memory propose-rules`)
│
└── claudeos-core-tools/               ← Este toolkit (no modificar)
```

Cada archivo standard incluye ✅ ejemplos correctos, ❌ ejemplos incorrectos y una tabla resumen de reglas — todo derivado de los patrones reales de tu código, no de plantillas genéricas.

> **Nota v2.1.0:** `claudeos-core/plan/` ya no se genera. Los master plans eran un backup interno que Claude Code no consumía en runtime, y agregarlos en Pass 3 era una causa principal de overflow por acumulación de salida. Usa `git` para backup/restore en su lugar. Los proyectos que hagan upgrade desde v2.0.x pueden borrar sin problema cualquier directorio `claudeos-core/plan/` existente.

### Recomendaciones de gitignore

**Sí commitear** (conocimiento de equipo — pensado para compartir):
- `CLAUDE.md` — punto de entrada de Claude Code
- `.claude/rules/**` — reglas auto-cargadas
- `claudeos-core/standard/**`, `skills/**`, `guide/**`, `database/**`, `mcp-guide/**`, `plan/**` — documentación generada
- `claudeos-core/memory/**` — historial de decisiones, patrones de fallo, propuestas de reglas

**NO commitear** (artefactos de build regenerables):

```gitignore
# ClaudeOS-Core — análisis generado y caché de traducción
claudeos-core/generated/
```

El directorio `generated/` contiene el JSON de análisis (`pass1-*.json`, `pass2-merged.json`), prompts (`pass1/2/3/4-prompt.md`), marcadores de finalización de Pass (`pass3-complete.json`, `pass4-memory.json`), caché de traducción (`.i18n-cache-<lang>.json`) y el directorio transitorio de staging (`.staged-rules/`) — todo reconstruible volviendo a ejecutar `npx claudeos-core init`.

---

## Auto-escalado por Tamaño del Proyecto

El modo split de Pass 3 escala el número de etapas en función del número de dominios. La sub-división por lotes entra en acción a partir de 16 dominios para mantener cada etapa por debajo de ~50 archivos de salida, que es el rango empíricamente seguro de `claude -p` antes de que empiece el overflow por acumulación de salida.

| Tamaño del proyecto | Dominios | Etapas de Pass 3 | Total `claude -p` | Tiempo Est. |
|---|---|---|---|---|
| Pequeño | 1–4 | 4 (`3a`, `3b-core`, `3c-core`, `3d-aux`) | 7 (Pass 1 + 2 + 4 etapas de Pass 3 + Pass 4) | ~10–15 min |
| Medio | 5–15 | 4 | 8–9 | ~25–45 min |
| Grande | 16–30 | **8** (3b, 3c cada uno dividido en 2 lotes) | 11–12 | **~60–105 min** |
| X-Large | 31–45 | 10 | 13–14 | ~100–150 min |
| XX-Large | 46–60 | 12 | 15–16 | ~150–200 min |
| XXX-Large | 61+ | 14+ | 17+ | 200 min+ |

Fórmula de conteo de etapas (cuando hay lotes): `1 (3a) + 1 (3b-core) + N (3b-1..N) + 1 (3c-core) + N (3c-1..N) + 1 (3d-aux) = 2N + 4`, donde `N = ceil(totalDomains / 15)`.

Pass 4 (memory scaffolding) añade ~30 segundos a 5 minutos encima según si se ejecuta la generación dirigida por Claude o el fallback estático. Para proyectos multi-stack (ej: Java + React), los dominios backend y frontend se cuentan juntos. Un proyecto con 6 dominios backend + 4 frontend = 10 en total = tier Medio.

---

## Herramientas de Verificación

ClaudeOS-Core incluye 5 herramientas de verificación integradas que se ejecutan automáticamente después de la generación:

```bash
# Ejecutar todas las comprobaciones a la vez (recomendado)
npx claudeos-core health

# Comandos individuales
npx claudeos-core validate     # Comparación Plan ↔ disco
npx claudeos-core refresh      # Sync Disco → Plan
npx claudeos-core restore      # Restore Plan → Disco

# O usar node directamente (usuarios de git clone)
node claudeos-core-tools/health-checker/index.js
node claudeos-core-tools/manifest-generator/index.js
node claudeos-core-tools/plan-validator/index.js --check
node claudeos-core-tools/sync-checker/index.js
```

| Herramienta | Qué hace |
|---|---|
| **manifest-generator** | Construye el JSON de metadata (`rule-manifest.json`, `sync-map.json`, inicializa `stale-report.json`); indexa 7 directorios incluyendo `memory/` (`totalMemory` en summary). v2.1.0: `plan-manifest.json` ya no se genera dado que los master plans fueron eliminados. |
| **plan-validator** | Valida los bloques `<file>` del master plan contra el disco para proyectos que aún tengan `claudeos-core/plan/` (caso de upgrade legacy). v2.1.0: omite la emisión de `plan-sync-status.json` cuando `plan/` está ausente o vacío — `stale-report.json` sigue registrando un no-op aprobado. |
| **sync-checker** | Detecta archivos no registrados (en disco pero no en el plan) y entradas huérfanas — cubre 7 directorios (añadido `memory/` en v2.0.0). Sale limpiamente cuando `sync-map.json` no tiene mapeos (estado por defecto de v2.1.0). |
| **content-validator** | Comprobación de calidad en 9 secciones — archivos vacíos, ejemplos ✅/❌ ausentes, secciones requeridas, más integridad del scaffold de memory L4 (fechas de encabezados de decision-log, campos requeridos de failure-pattern, parsing fence-aware) |
| **pass-json-validator** | Valida la estructura del JSON de Pass 1–4 más los marcadores de finalización `pass3-complete.json` (forma de modo split, v2.1.0) y `pass4-memory.json` |

---

## Cómo Usa Claude Code tu Documentación

ClaudeOS-Core genera documentación que Claude Code realmente lee — así es cómo:

### Qué lee Claude Code automáticamente

| Archivo | Cuándo | Garantizado |
|---|---|---|
| `CLAUDE.md` | En el inicio de cada conversación | Siempre |
| `.claude/rules/00.core/*` | Cuando se edita cualquier archivo (`paths: ["**/*"]`) | Siempre |
| `.claude/rules/10.backend/*` | Cuando se edita cualquier archivo (`paths: ["**/*"]`) | Siempre |
| `.claude/rules/20.frontend/*` | Cuando se edita cualquier archivo frontend (limitado a rutas de component/page/style) | Condicional |
| `.claude/rules/30.security-db/*` | Cuando se edita cualquier archivo (`paths: ["**/*"]`) | Siempre |
| `.claude/rules/40.infra/*` | Solo al editar archivos de config/infra (rutas limitadas) | Condicional |
| `.claude/rules/50.sync/*` | Solo al editar archivos de claudeos-core (rutas limitadas) | Condicional |
| `.claude/rules/60.memory/*` | Cuando se edita `claudeos-core/memory/*` (limitado a rutas de memory) — indica **cómo** leer/escribir la capa de memory on-demand | Condicional (v2.0.0) |

### Qué lee Claude Code on-demand a través de referencias de reglas

Cada archivo de regla enlaza a su standard correspondiente mediante una sección `## Reference`. Claude lee solo el standard relevante para la tarea actual:

- `claudeos-core/standard/**` — patrones de codificación, ejemplos ✅/❌, convenciones de naming
- `claudeos-core/database/**` — esquema BD (para queries, mappers, migrations)
- `claudeos-core/memory/**` (v2.0.0) — capa de conocimiento de equipo L4; **no** se auto-carga (sería demasiado ruidoso en cada conversación). En su lugar, las reglas `60.memory/*` indican a Claude *cuándo* leer estos archivos: al inicio de sesión (skim del `decision-log.md` reciente + `failure-patterns.md` de alta importancia), y append-on-demand al tomar decisiones o al encontrar errores recurrentes.

El `00.standard-reference.md` sirve como directorio de todos los archivos standard para descubrir standards que no tienen una regla correspondiente.

### Qué NO lee Claude Code (ahorra contexto)

Estas carpetas están excluidas explícitamente mediante la sección `DO NOT Read` en la regla standard-reference:

| Carpeta | Por qué se excluye |
|---|---|
| `claudeos-core/plan/` | Backups de Master Plan de proyectos legacy (v2.0.x y anteriores). No se genera en v2.1.0. Si está presente, Claude Code no la carga automáticamente — read-on-demand únicamente. |
| `claudeos-core/generated/` | JSON de metadata de build, prompts, marcadores de Pass, caché de traducción, `.staged-rules/`. No es para codificar. |
| `claudeos-core/guide/` | Guías de onboarding para humanos. |
| `claudeos-core/mcp-guide/` | Docs del servidor MCP. No es para codificar. |
| `claudeos-core/memory/` (auto-load) | **Auto-load deshabilitado** por diseño — inflaría el contexto en cada conversación. En su lugar, se lee on-demand vía las reglas `60.memory/*` (ej: escaneo al inicio de sesión de `failure-patterns.md`). Commitea siempre estos archivos. |

---

## Flujo de Trabajo Diario

### Después de la instalación

```
# Simplemente usa Claude Code como de costumbre — referencia tus standards automáticamente:
"Crea un CRUD para el dominio order"
"Añade un API de actualización de perfil de usuario"
"Refactoriza este código para que coincida con los patrones del proyecto"
```

### Después de editar Standards manualmente

```bash
# Después de editar archivos de standards o reglas:
npx claudeos-core refresh

# Verifica que todo es consistente
npx claudeos-core health
```

### Cuando los docs se corrompen

```bash
# Recomendación v2.1.0: usa git para restaurar (dado que los master plans ya no se
# generan). Commitea tus docs generados regularmente para poder revertir archivos
# concretos sin regenerar:
git checkout HEAD -- .claude/rules/ claudeos-core/

# Legacy (proyectos v2.0.x con claudeos-core/plan/ aún presente):
npx claudeos-core restore
```

### Mantenimiento de la capa Memory (v2.0.0)

La capa Memory L4 (`claudeos-core/memory/`) acumula conocimiento de equipo entre sesiones. Tres subcomandos de CLI la mantienen en buen estado:

```bash
# Compact: aplica la política de compaction de 4 etapas (ejecutar periódicamente — ej: mensualmente)
npx claudeos-core memory compact
#   Etapa 1: resume entradas antiguas (>30 días, cuerpo → una línea)
#   Etapa 2: combina encabezados duplicados (frecuencia sumada, se mantiene el fix más reciente)
#   Etapa 3: descarta baja-importancia + antiguas (importancia <3 Y lastSeen >60 días)
#   Etapa 4: aplica tope de 400 líneas por archivo (se descarta primero lo más antiguo y de menor importancia)

# Score: re-rankea las entradas de failure-patterns.md por importancia
npx claudeos-core memory score
#   importance = round(frequency × 1.5 + recency × 5), cap 10
#   Ejecutar después de añadir varios nuevos patrones de fallo

# Propose-rules: propone adiciones de reglas a partir de fallos recurrentes
npx claudeos-core memory propose-rules
#   Lee entradas de failure-patterns.md con frequency ≥ 3
#   Calcula confianza (sigmoid sobre evidencia ponderada × multiplicador de anchor)
#   Escribe propuestas en memory/auto-rule-update.md (NO se aplican auto)
#   Confidence ≥ 0.70 merece revisión seria; acepta → edita regla + registra decisión

# v2.1.0: `memory --help` ahora enruta a la ayuda del subcomando (antes mostraba top-level)
npx claudeos-core memory --help
```

> **Fixes v2.1.0:** `memory score` ya no deja líneas `importance` duplicadas tras la primera ejecución (antes la línea auto-scored se añadía arriba mientras la original plana se dejaba debajo). El marcador de resumen de la Etapa 1 de `memory compact` ahora es un elemento de lista markdown propio (`- _Summarized on ..._`) para que se renderice limpiamente y se vuelva a parsear correctamente en las siguientes compactaciones.

Cuándo escribir en memory (Claude lo hace on-demand, pero también puedes editar manualmente):
- **`decision-log.md`** — añade una nueva entrada cada vez que elijas entre patrones en competencia, selecciones una biblioteca, definas una convención de equipo o decidas NO hacer algo. Append-only; nunca edites entradas históricas.
- **`failure-patterns.md`** — añade en la **segunda ocurrencia** de un error recurrente o de una root cause no obvia. Los errores de primera vez no necesitan una entrada.
- `compaction.md` y `auto-rule-update.md` — generados/gestionados por los subcomandos de CLI indicados arriba; no los edites a mano.

### Integración CI/CD

```yaml
# Ejemplo de GitHub Actions
- run: npx claudeos-core validate
# Exit code 1 bloquea el PR

# Opcional: housekeeping mensual de memory (workflow cron separado)
- run: npx claudeos-core memory compact
- run: npx claudeos-core memory score
```

---

## ¿En Qué Se Diferencia?

### vs otras herramientas de Claude Code

| | ClaudeOS-Core | Everything Claude Code (50K+ ⭐) | Harness | specs-generator | Claude `/init` |
|---|---|---|---|---|---|
| **Enfoque** | Código analiza primero, luego el LLM genera | Presets de configuración preconstruidos | El LLM diseña equipos de agentes | El LLM genera specs | El LLM escribe CLAUDE.md |
| **Lee tu código fuente** | ✅ Análisis estático determinístico | ❌ | ❌ | ❌ (lee el LLM) | ❌ (lee el LLM) |
| **Detección de stack** | El código confirma (ORM, BD, build tool, pkg manager) | N/A (stack-agnostic) | El LLM adivina | El LLM adivina | El LLM adivina |
| **Detección de dominios** | El código confirma (Java 5 patrones, Kotlin CQRS, Next.js FSD) | N/A | El LLM adivina | N/A | N/A |
| **Mismo proyecto → Mismo resultado** | ✅ Análisis determinístico | ✅ (archivos estáticos) | ❌ (el LLM varía) | ❌ (el LLM varía) | ❌ (el LLM varía) |
| **Gestión de proyectos grandes** | División en grupos de dominios (4 dominios / 40 archivos por grupo) | N/A | Sin división | Sin división | Límite de ventana de contexto |
| **Salida** | CLAUDE.md + Rules + Standards + Skills + Guides + Plans (40-50+ archivos) | Agents + Skills + Commands + Hooks | Agents + Skills | 6 docs de spec | CLAUDE.md (1 archivo) |
| **Ubicación de salida** | `.claude/rules/` (auto-cargado por Claude Code) | `.claude/` variados | `.claude/agents/` + `.claude/skills/` | `.claude/steering/` + `specs/` | `CLAUDE.md` |
| **Verificación post-generación** | ✅ 5 validadores automáticos | ❌ | ❌ | ❌ | ❌ |
| **Salida multi-idioma** | ✅ 10 idiomas | ❌ | ❌ | ❌ | ❌ |
| **Multi-stack** | ✅ Backend + Frontend simultáneo | ❌ Stack-agnostic | ❌ | ❌ | Parcial |
| **Capa de memory persistente** | ✅ L4 — decision log + failure patterns + propuestas de reglas auto-scored (v2.0.0) | ❌ | ❌ | ❌ | ❌ |
| **Orquestación de agentes** | ❌ | ✅ 28 agentes | ✅ 6 patrones | ❌ | ❌ |

### La diferencia clave en una frase

**Otras herramientas dan a Claude "instrucciones generalmente buenas". ClaudeOS-Core da a Claude "instrucciones extraídas de tu código real".**

Por eso Claude Code deja de generar código JPA en tu proyecto MyBatis,
deja de usar `success()` cuando tu codebase usa `ok()`,
y deja de crear directorios `user/controller/` cuando tu proyecto usa `controller/user/`.

### Complementarias, no competidoras

ClaudeOS-Core se centra en **reglas y standards específicos del proyecto**.
Otras herramientas se centran en **orquestación y workflows de agentes**.

Puedes usar ClaudeOS-Core para generar las reglas de tu proyecto, y encima usar ECC o Harness para equipos de agentes y automatización de workflows. Resuelven problemas diferentes.

---

## FAQ

**P: ¿Modifica mi código fuente?**
No. Solo crea `CLAUDE.md`, `.claude/rules/` y `claudeos-core/`. Tu código existente nunca se modifica.

**P: ¿Cuánto cuesta?**
Llama a `claude -p` varias veces a lo largo de 4 passes. En el modo split de v2.1.0, Pass 3 por sí solo se expande en 4–14+ etapas según el tamaño del proyecto (ver [Auto-escalado](#auto-escalado-por-tamaño-del-proyecto)). Un proyecto pequeño típico (1–15 dominios) usa 8–9 llamadas `claude -p` en total; un proyecto de 18 dominios usa 11; un proyecto de 60 dominios usa 15–17. Cada etapa se ejecuta con una ventana de contexto nueva — el coste en tokens por llamada es en realidad más bajo que el del Pass 3 de llamada única, porque ninguna etapa tiene que sostener el árbol de archivos completo en un único contexto. Cuando `--lang` no es inglés, el path de fallback estático puede invocar algunas llamadas adicionales a `claude -p` para traducir; los resultados se cachean en `claudeos-core/generated/.i18n-cache-<lang>.json` para que las ejecuciones posteriores los reutilicen. Esto entra dentro del uso normal de Claude Code.

**P: ¿Qué es el modo split de Pass 3 y por qué se añadió en v2.1.0?**
Antes de v2.1.0, Pass 3 hacía una única llamada `claude -p` que debía emitir todo el árbol de archivos generados (`CLAUDE.md`, standards, reglas, skills, guides — típicamente 30–60 archivos) en una sola respuesta. Esto funcionaba en proyectos pequeños pero chocaba de forma confiable con fallos `Prompt is too long` por acumulación de salida a ~5 dominios. El fallo no era predecible desde el tamaño de entrada — dependía de lo verboso que resultara cada archivo generado, y podía darse en el mismo proyecto de forma intermitente. El modo split esquiva el problema de forma estructural: Pass 3 se descompone en etapas secuenciales (`3a` → `3b-core` → `3b-N` → `3c-core` → `3c-N` → `3d-aux`), cada una una llamada `claude -p` separada con una ventana de contexto nueva. La consistencia entre etapas se preserva mediante `pass3a-facts.md`, un fact sheet destilado de 5–10 KB que cada etapa posterior referencia en lugar de releer `pass2-merged.json`. El marcador `pass3-complete.json` lleva un array `groupsCompleted` para que un crash durante `3c-2` reanude desde `3c-2` (no desde `3a`), evitando doblar el coste en tokens.
**P: ¿Debería commitear los archivos generados a Git?**
Sí, recomendado. Tu equipo puede compartir los mismos standards de Claude Code. Considera añadir `claudeos-core/generated/` a `.gitignore` (el JSON de análisis es regenerable).

**P: ¿Qué pasa con proyectos de stack mixto (ej: Java backend + React frontend)?**
Totalmente soportado. ClaudeOS-Core auto-detecta ambos stacks, etiqueta los dominios como `backend` o `frontend`, y usa prompts de análisis específicos del stack para cada uno. Pass 2 combina todo, y Pass 3 genera tanto los standards de backend como los de frontend a lo largo de sus etapas de split — los dominios backend van a algunos lotes 3b/3c, los frontend a otros, todos referenciando el mismo `pass3a-facts.md` para mantener la consistencia.

**P: ¿Funciona con monorepos Turborepo / pnpm workspaces / Lerna?**
Sí. ClaudeOS-Core detecta `turbo.json`, `pnpm-workspace.yaml`, `lerna.json`, o `package.json#workspaces` y escanea automáticamente los `package.json` de los sub-paquetes para dependencias de framework/ORM/BD. El escaneo de dominios cubre los patrones `apps/*/src/` y `packages/*/src/`. Ejecuta desde la raíz del monorepo.

**P: ¿Qué pasa al volver a ejecutar?**
Si existen resultados previos de Pass 1/2, un prompt interactivo te permite elegir: **Continue** (reanudar desde donde se detuvo) o **Fresh** (borrar todo y empezar de nuevo). Usa `--force` para saltarte el prompt y empezar siempre desde cero. En el modo split de v2.1.0, el resume de Pass 3 funciona a granularidad de etapa — si la ejecución crasheó durante `3c-2`, el siguiente `init` reanuda desde `3c-2` en lugar de reiniciar desde `3a` (lo que doblaría el coste en tokens). El marcador `pass3-complete.json` registra `mode: "split"` más un array `groupsCompleted` para dirigir esta lógica.

**P: ¿NestJS tiene su propia plantilla o usa la de Express?**
NestJS usa una plantilla dedicada `node-nestjs` con categorías de análisis específicas de NestJS: decorators `@Module`, `@Injectable`, `@Controller`, Guards, Pipes, Interceptors, contenedor DI, patrones CQRS y `Test.createTestingModule`. Los proyectos Express usan la plantilla separada `node-express`.

**P: ¿Qué pasa con proyectos Vue / Nuxt?**
Vue/Nuxt usa una plantilla dedicada `vue-nuxt` que cubre Composition API, `<script setup>`, defineProps/defineEmits, Pinia stores, `useFetch`/`useAsyncData`, rutas de servidor Nitro y `@nuxt/test-utils`. Los proyectos Next.js/React usan la plantilla `node-nextjs`.

**P: ¿Soporta Kotlin?**
Sí. ClaudeOS-Core auto-detecta Kotlin a partir de `build.gradle.kts` o del plugin kotlin en `build.gradle`. Usa una plantilla dedicada `kotlin-spring` con análisis específico de Kotlin (data classes, sealed classes, coroutines, extension functions, MockK, etc.).

**P: ¿Qué pasa con arquitectura CQRS / BFF?**
Totalmente soportado para proyectos Kotlin multi-módulo. ClaudeOS-Core lee `settings.gradle.kts`, detecta los tipos de módulo (command, query, bff, integration) a partir de los nombres de módulo, y agrupa el mismo dominio entre los módulos Command/Query. Los standards generados incluyen reglas separadas para command controllers vs query controllers, patrones BFF/Feign y convenciones de comunicación entre módulos.

**P: ¿Qué pasa con monorepos Gradle multi-módulo?**
ClaudeOS-Core escanea todos los submódulos (`**/src/main/kotlin/**/*.kt`) independientemente de la profundidad de anidamiento. Los tipos de módulo se infieren de las convenciones de naming (ej: `reservation-command-server` → dominio: `reservation`, tipo: `command`). Las bibliotecas compartidas (`shared-lib`, `integration-lib`) también se detectan.

**P: ¿Qué es la capa Memory L4 (v2.0.0)? ¿Debo commitear `claudeos-core/memory/`?**
Sí — **commitea siempre** `claudeos-core/memory/`. Es conocimiento persistente del equipo: `decision-log.md` registra el *porqué* detrás de las decisiones arquitectónicas (append-only), `failure-patterns.md` registra errores recurrentes con importancia puntuada para que las sesiones futuras los eviten, `compaction.md` define la política de compaction de 4 etapas y `auto-rule-update.md` recopila propuestas de mejora de reglas generadas por la máquina. A diferencia de las reglas (auto-cargadas por path), los archivos de memory son **on-demand** — Claude los lee solo cuando las reglas `60.memory/*` se lo indican (ej: escaneo al inicio de sesión de fallos de alta importancia). Esto mantiene bajo el coste de contexto conservando el conocimiento a largo plazo.

**P: ¿Qué pasa si Pass 4 falla?**
El pipeline automatizado (`npx claudeos-core init`) tiene un fallback estático: si `claude -p` falla o `pass4-prompt.md` está ausente, scaffoldea la capa de memory directamente vía `lib/memory-scaffold.js`. Cuando `--lang` no es inglés, el fallback estático **debe** traducir vía la CLI `claude` — si también falla, la ejecución se aborta con `InitError` (sin fallback silencioso a inglés). Vuelve a ejecutar cuando `claude` esté autenticado, o usa `--lang en` para saltarte la traducción. Los resultados de traducción se cachean en `claudeos-core/generated/.i18n-cache-<lang>.json` para que las ejecuciones posteriores los reutilicen.

**P: ¿Qué hacen `memory compact` / `memory score` / `memory propose-rules`?**
Ver la sección [Mantenimiento de la capa Memory](#mantenimiento-de-la-capa-memory-v200) arriba. Versión corta: `compact` ejecuta la política de 4 etapas (resume antiguas, combina duplicadas, descarta baja-importancia antiguas, aplica tope de 400 líneas); `score` re-rankea `failure-patterns.md` por importancia (frecuencia × recencia); `propose-rules` propone adiciones de reglas a partir de fallos recurrentes en `auto-rule-update.md` (no se aplican auto — revisa y acepta/rechaza manualmente).

**P: ¿Por qué `--force` (o el modo resume "fresh") borra `.claude/rules/`?**
v2.0.0 añadió tres guards de silent-failure en Pass 3 (Guard 3 cubre dos variantes de salida incompleta: H2 para `guide/` y H1 para `standard/skills`). Guard 1 ("movimiento parcial de staged-rules") y Guard 3 ("salida incompleta — archivos guide ausentes/vacíos o sentinel de standard ausente / skills vacío") no dependen de reglas existentes, pero Guard 2 ("cero reglas detectadas") sí — se dispara cuando Claude ignora la directiva `staging-override.md` e intenta escribir directamente en `.claude/` (donde la política de rutas sensibles de Claude Code lo bloquea). Las reglas obsoletas de una ejecución anterior harían que Guard 2 produjera falsos negativos — por eso `--force`/`fresh` borra `.claude/rules/` para asegurar una detección limpia. **Las ediciones manuales de archivos de reglas se perderán** con `--force`/`fresh`; haz un backup antes si es necesario. (Nota v2.1.0: Guard 3 H1 ya no comprueba `plan/` dado que los master plans ya no se generan.)

**P: ¿Qué es `claudeos-core/generated/.staged-rules/` y por qué existe?**
La política de rutas sensibles de Claude Code rechaza las escrituras directas a `.claude/` desde el subproceso `claude -p` (incluso con `--dangerously-skip-permissions`). v2.0.0 evita esto haciendo que los prompts de Pass 3/4 redirijan todas las escrituras de `.claude/rules/` al directorio de staging; el orquestador Node.js (que no está sujeto a esa política) luego mueve el árbol staged a `.claude/rules/` después de cada pass. Esto es transparente para el usuario — el directorio se auto-crea, se auto-limpia y se auto-mueve. Si una ejecución previa crashea a mitad del movimiento, la siguiente ejecución limpia el dir de staging antes de reintentar. En el modo split de v2.1.0, el runner de etapas mueve las reglas staged a `.claude/rules/` tras cada etapa (no solo al final), así que un crash a mitad de Pass 3 deja las reglas de las etapas previamente completadas en su sitio.

**P: ¿Puedo ejecutar Pass 3 manualmente en lugar de `npx claudeos-core init`?**
Sí para proyectos pequeños (≤5 dominios) — las instrucciones manuales de llamada única del [Paso 6](#paso-6-pass-3--generar-toda-la-documentación-dividido-en-varias-etapas) siguen funcionando. Para proyectos más grandes deberías usar `npx claudeos-core init` porque el runner de split es lo que orquesta la ejecución etapa-a-etapa con contextos nuevos, gestiona la sub-división por lotes a ≥16 dominios, escribe la forma correcta del marcador `pass3-complete.json` (`mode: "split"` + `groupsCompleted`) y mueve las reglas staged entre etapas. Reproducir esa orquestación a mano es posible pero tedioso. Si tienes una razón para ejecutar etapas manualmente (ej: debuggear una etapa concreta), puedes templatizar `pass3-prompt.md` con la directiva `STAGE:` apropiada y pasarlo a `claude -p` directamente — pero recuerda mover `.staged-rules/` tras cada etapa y actualizar el marcador tú mismo.

**P: Mi proyecto es un upgrade desde v2.0.x y tiene un directorio `claudeos-core/plan/` existente. ¿Qué hago?**
Nada requerido — las herramientas de v2.1.0 ignoran `plan/` cuando está ausente o vacío, y `plan-validator` sigue gestionando los proyectos legacy con directorios `plan/` poblados por retrocompatibilidad. Puedes borrar sin problemas `claudeos-core/plan/` si no necesitas los backups de master plan (el historial de git es un mejor backup de todos modos). Si conservas `plan/`, ejecutar `npx claudeos-core init` no lo actualizará — el contenido nuevo ya no se agrega en master plans en v2.1.0. Las herramientas de verificación gestionan ambos casos limpiamente.

---

## Estructura de Plantillas

```
pass-prompts/templates/
├── common/                  # header/footer compartidos + pass4 + staging-override + CLAUDE.md scaffold (v2.2.0)
│   ├── header.md             # Rol + directiva de formato de salida (todas las passes)
│   ├── pass3-footer.md       # Instrucción post-Pass-3 health-check + 5 bloques CRITICAL de guardrails (v2.2.0)
│   ├── pass3-phase1.md       # Bloque "Read Once, Extract Facts" con Rules A-E (v2.1.0)
│   ├── pass4.md              # Prompt de scaffolding de memoria (v2.0.0)
│   ├── staging-override.md   # Redirige escrituras .claude/rules/** a .staged-rules/** (v2.0.0)
│   ├── claude-md-scaffold.md # Plantilla CLAUDE.md determinista de 8 secciones (v2.2.0)
│   └── lang-instructions.json # Directivas de salida por idioma (10 idiomas)
├── java-spring/             # Java / Spring Boot
├── kotlin-spring/           # Kotlin / Spring Boot (CQRS, BFF, multi-módulo)
├── node-express/            # Node.js / Express
├── node-nestjs/             # Node.js / NestJS (Module, DI, Guard, Pipe, Interceptor)
├── node-fastify/            # Node.js / Fastify
├── node-nextjs/             # Next.js / React (App Router, RSC)
├── node-vite/               # Vite SPA (React, client-side routing, VITE_ env, Vitest)
├── vue-nuxt/                # Vue / Nuxt (Composition API, Pinia, Nitro)
├── angular/                 # Angular
├── python-django/           # Python / Django (DRF)
├── python-fastapi/          # Python / FastAPI
└── python-flask/            # Python / Flask (Blueprint, app factory, Jinja2)
```

`plan-installer` auto-detecta tu stack(s), y luego ensambla prompts específicos del tipo. NestJS, Vue/Nuxt, Vite SPA y Flask usan cada uno plantillas dedicadas con categorías de análisis específicas del framework (ej: `@Module`/`@Injectable`/Guards para NestJS; `<script setup>`/Pinia/useFetch para Vue; client-side routing/`VITE_` env para Vite; Blueprint/`app.factory`/Flask-SQLAlchemy para Flask). Para proyectos multi-stack, se generan `pass1-backend-prompt.md` y `pass1-frontend-prompt.md` por separado, mientras que `pass3-prompt.md` combina los targets de generación de ambos stacks. En v2.1.0, la plantilla de Pass 3 se anteanteponte con `common/pass3-phase1.md` (el bloque "Read Once, Extract Facts" con Rules A–E) antes de ser troceada por etapa en modo split. Pass 4 usa la plantilla compartida `common/pass4.md` (memory scaffolding) independientemente del stack.

**En v2.2.0**, el prompt de Pass 3 también incrusta en línea `common/claude-md-scaffold.md` (la plantilla CLAUDE.md determinista de 8 secciones) entre el bloque phase1 y el cuerpo específico del stack — esto fija la estructura de secciones para que los CLAUDE.md generados no se desvíen entre proyectos, mientras el contenido se adapta por proyecto. Las plantillas se escriben **English-first**; la inyección de idioma desde `lang-instructions.json` instruye al LLM a traducir títulos de sección y prosa al idioma de salida objetivo en tiempo de emisión.

---

## Soporte de Monorepo

ClaudeOS-Core auto-detecta setups de monorepo JS/TS y escanea sub-paquetes buscando dependencias.

**Marcadores de monorepo soportados** (auto-detectados):
- `turbo.json` (Turborepo)
- `pnpm-workspace.yaml` (pnpm workspaces)
- `lerna.json` (Lerna)
- `package.json#workspaces` (npm/yarn workspaces)

**Ejecuta desde la raíz del monorepo** — ClaudeOS-Core lee `apps/*/package.json` y `packages/*/package.json` para descubrir dependencias de framework/ORM/BD entre sub-paquetes:

```bash
cd my-monorepo
npx claudeos-core init
```

**Qué se detecta:**
- Dependencias de `apps/web/package.json` (ej: `next`, `react`) → stack frontend
- Dependencias de `apps/api/package.json` (ej: `express`, `prisma`) → stack backend
- Dependencias de `packages/db/package.json` (ej: `drizzle-orm`) → ORM/BD
- Paths de workspace personalizados desde `pnpm-workspace.yaml` (ej: `services/*`)

**El escaneo de dominios también cubre layouts de monorepo:**
- `apps/api/src/modules/*/` y `apps/api/src/*/` para dominios backend
- `apps/web/app/*/`, `apps/web/src/app/*/`, `apps/web/pages/*/` para dominios frontend
- `packages/*/src/*/` para dominios de paquetes compartidos

```
my-monorepo/                    ← Ejecuta aquí: npx claudeos-core init
├── turbo.json                  ← Auto-detectado como Turborepo
├── apps/
│   ├── web/                    ← Next.js detectado desde apps/web/package.json
│   │   ├── app/dashboard/      ← Dominio frontend detectado
│   │   └── package.json        ← { "dependencies": { "next": "^14" } }
│   └── api/                    ← Express detectado desde apps/api/package.json
│       ├── src/modules/users/  ← Dominio backend detectado
│       └── package.json        ← { "dependencies": { "express": "^4" } }
├── packages/
│   ├── db/                     ← Drizzle detectado desde packages/db/package.json
│   └── ui/
└── package.json                ← { "workspaces": ["apps/*", "packages/*"] }
```

> **Nota:** Para monorepos Kotlin/Java, la detección multi-módulo usa `settings.gradle.kts` (ver [Detección de Dominios Kotlin Multi-Módulo](#detección-de-dominios-kotlin-multi-módulo) arriba) y no requiere marcadores de monorepo JS.

## Troubleshooting

**"claude: command not found"** — La CLI de Claude Code no está instalada o no está en el PATH. Ver [docs de Claude Code](https://code.claude.com/docs/en/overview).

**"npm install failed"** — La versión de Node.js puede ser demasiado baja. Requiere v18+.

**"0 domains detected"** — La estructura de tu proyecto puede no ser estándar. Ver los patrones de detección anteriores para tu stack.

**"0 domains detected" en proyecto Kotlin** — Asegúrate de que tu proyecto tiene `build.gradle.kts` (o `build.gradle` con plugin kotlin) en la raíz, y los archivos fuente están bajo `**/src/main/kotlin/`. Para proyectos multi-módulo, asegúrate de que `settings.gradle.kts` contiene sentencias `include()`. Los proyectos Kotlin de un solo módulo (sin `settings.gradle`) también están soportados — los dominios se extraen de la estructura de paquete/clase bajo `src/main/kotlin/`.

**"Language detected as java instead of kotlin"** — ClaudeOS-Core comprueba primero el `build.gradle(.kts)` raíz, luego los archivos de build de los submódulos. Si el archivo de build raíz usa el plugin `java` sin `kotlin`, pero los submódulos usan Kotlin, la herramienta comprueba hasta 5 archivos de build de submódulos como fallback. Si aun así no se detecta, asegúrate de que al menos un `build.gradle.kts` contiene `kotlin("jvm")` u `org.jetbrains.kotlin`.

**"CQRS not detected"** — La detección de arquitectura depende de que los nombres de módulos contengan las palabras clave `command` y `query`. Si tus módulos usan otros naming (ej: `write-server`, `read-server`), la arquitectura CQRS no se auto-detectará. Puedes ajustar manualmente los prompts generados después de que plan-installer se ejecute.

**"Pass 3 produced 0 rule files under .claude/rules/" (v2.0.0)** — Se disparó el Guard 2: Claude ignoró la directiva `staging-override.md` e intentó escribir directamente en `.claude/`, donde la política de rutas sensibles de Claude Code bloquea las escrituras. Vuelve a ejecutar con `npx claudeos-core init --force`. Si el error persiste, inspecciona `claudeos-core/generated/pass3-prompt.md` para verificar que el bloque `staging-override.md` está al principio.

**"Pass 3 finished but N rule file(s) could not be moved from staging" (v2.0.0)** — Se disparó el Guard 1: el movimiento de staging se topó con un file lock transitorio (normalmente antivirus de Windows o file-watcher). El marcador NO se escribe, así que la siguiente ejecución de `init` reintenta Pass 3 automáticamente. Simplemente vuelve a ejecutar `npx claudeos-core init`.

**"Pass 3 produced CLAUDE.md and rules but N/9 guide files are missing or empty" (v2.0.0)** — Se disparó el Guard 3 (H2): Claude truncó la respuesta a mitad de camino tras escribir CLAUDE.md + reglas pero antes de terminar (o empezar) la sección `claudeos-core/guide/` (se esperan 9 archivos). También se dispara ante un archivo con solo BOM o solo whitespace (se escribió el encabezado pero el cuerpo quedó truncado). Sin este guard, el marcador de finalización se escribiría igual, dejando `guide/` permanentemente vacío en ejecuciones posteriores. Aquí el marcador NO se escribe, así que la siguiente ejecución de `init` reintenta Pass 3 a partir de los mismos resultados de Pass 2. Si se repite, vuelve a ejecutar con `npx claudeos-core init --force` para regenerar desde cero.

**"Pass 3 finished but the following required output(s) are missing or empty" (v2.0.0, actualizado en v2.1.0)** — Se disparó el Guard 3 (H1): Claude truncó DESPUÉS de `claudeos-core/guide/` pero antes (o durante) `claudeos-core/standard/` o `claudeos-core/skills/`. Requisitos: (a) `standard/00.core/01.project-overview.md` existe y no está vacío (sentinel escrito por el prompt Pass 3 de cada stack), (b) `skills/` tiene ≥1 `.md` no vacío. `database/` y `mcp-guide/` se excluyen intencionadamente (algunos stacks legítimamente producen cero archivos). `plan/` ya no se comprueba a partir de v2.1.0 (los master plans fueron eliminados). Mismo camino de recuperación que Guard 3 (H2): vuelve a ejecutar `init`, o `--force` si persiste.

**"Pass 3 split stage crashed partway through (v2.1.0)"** — Cuando una de las etapas de split (ej: `3b-1`, `3c-2`) falla a mitad de ejecución, el marcador a nivel de etapa NO se escribe, pero las etapas completadas SÍ se registran en `pass3-complete.json.groupsCompleted`. La siguiente ejecución de `init` lee este array y reanuda desde la primera etapa no completada, saltándose todo el trabajo previo ya completado. No tienes que hacer nada manualmente — simplemente vuelve a ejecutar `npx claudeos-core init`. Si el resume sigue fallando en la misma etapa, inspecciona `claudeos-core/generated/pass3-prompt.md` en busca de contenido malformado, y luego prueba `--force` para un reinicio completo. La forma de `pass3-complete.json` (`mode: "split"`, `groupsCompleted: [...]`) es estable; un marcador ausente o malformado provoca que Pass 3 completo se vuelva a ejecutar desde `3a`.

**"Pass 3 stale marker (shape mismatch) — treating as incomplete" (v2.1.0)** — Se está interpretando un `pass3-complete.json` de una ejecución de llamada única pre-v2.1.0 bajo las nuevas reglas de modo split. La comprobación de forma busca `mode: "split"` y un array `groupsCompleted`; si falta alguno, el marcador se trata como parcial y Pass 3 se vuelve a ejecutar en modo split. Si hiciste upgrade desde v2.0.x, esto es esperado una sola vez — la siguiente ejecución escribirá la forma correcta de marcador. No se requiere acción.

**"pass2-merged.json exists but is malformed or incomplete (<5 top-level keys), re-running" (v2.0.0)** — Log informativo, no un error. En resume, `init` ahora parsea y valida `pass2-merged.json` (se requieren ≥5 claves de nivel superior, coincidiendo con el umbral `INSUFFICIENT_KEYS` de `pass-json-validator`). Un `{}` esqueleto o un JSON mal formado de una ejecución previa crasheada se borra automáticamente y Pass 2 se vuelve a ejecutar. No se necesita acción manual — el pipeline se auto-repara. Si sigue recurriendo, inspecciona `claudeos-core/generated/pass2-prompt.md` y reintenta con `--force`.

**"Static fallback failed while translating to lang='ko'" (v2.0.0)** — Cuando `--lang` no es inglés, Pass 4 / fallback estático / gap-fill requieren todos la CLI `claude` para traducir. Si la traducción falla (CLI no autenticada, timeout de red, o la validación estricta rechazó la salida: longitud <40%, code fences rotos, frontmatter perdido, etc.), la ejecución se aborta en vez de escribir silenciosamente en inglés. Solución: asegúrate de que `claude` está autenticado, o vuelve a ejecutar con `--lang en` para saltarte la traducción.

**"pass4-memory.json exists but memory/ is empty" (v2.0.0)** — Una ejecución previa escribió el marcador pero el usuario (o un script de limpieza) borró `claudeos-core/memory/`. La CLI auto-detecta este marcador obsoleto y vuelve a ejecutar Pass 4 en el siguiente `init`. No se necesita acción manual.

**"pass4-memory.json exists but is malformed (missing passNum/memoryFiles) — re-running Pass 4" (v2.0.0)** — Log informativo, no un error. El contenido del marcador de Pass 4 ahora se valida (`passNum === 4` + array `memoryFiles` no vacío), no solo su existencia. Un fallo parcial de Claude que emitiera algo como `{"error":"timeout"}` como cuerpo del marcador previamente se aceptaba como éxito para siempre; ahora el marcador se borra y Pass 4 se vuelve a ejecutar automáticamente.

**"Could not delete stale pass3-complete.json / pass4-memory.json" InitError (v2.0.0)** — `init` detectó un marcador obsoleto (Pass 3: CLAUDE.md fue borrado externamente; Pass 4: memory/ vacío o cuerpo del marcador mal formado) y trató de eliminarlo, pero la llamada `unlinkSync` falló — típicamente porque el antivirus de Windows o un file-watcher (editor, indexador IDE) está reteniendo el file handle. Anteriormente esto se ignoraba silenciosamente, haciendo que el pipeline saltara el pass y reutilizara el marcador obsoleto. Ahora falla de forma explícita. Solución: cierra cualquier editor/AV scanner que pueda tener el archivo abierto, y vuelve a ejecutar `npx claudeos-core init`.

**"CLAUDEOS_SKIP_TRANSLATION=1 is set but --lang='ko' requires translation" InitError (v2.0.0)** — Tienes la variable de entorno de solo-test `CLAUDEOS_SKIP_TRANSLATION=1` configurada en tu shell (probablemente un resto de setup de CI/test) Y elegiste un `--lang` no-inglés. Esta env var cortocircuita el path de traducción del que dependen el fallback estático y el gap-fill de Pass 4 para la salida no-inglesa. `init` detecta el conflicto en el momento de la selección de idioma y aborta inmediatamente (en vez de crashear a mitad de Pass 4 con un error anidado confuso). Solución: o bien `unset CLAUDEOS_SKIP_TRANSLATION` antes de ejecutar, o usa `npx claudeos-core init --lang en`.

**Advertencia "⚠️ v2.2.0 upgrade detected" (v2.2.0)** — Tu `CLAUDE.md` existente fue generado con una versión anterior a v2.2.0. La regeneración en modo resume por defecto omitirá los archivos existentes bajo Rule B idempotency, por lo que las mejoras estructurales de v2.2.0 (scaffold CLAUDE.md de 8 secciones, paths por archivo en `40.infra/*`, precisión de puerto basada en `.env.example`, rediseño de Section 8 `Common Rules & Memory (L4)` (rediseñado con dos sub-secciones: Common Rules · L4 Memory), fila de regla `60.memory/*`, `04.doc-writing-guide.md` con forward-reference) NO se aplicarían. Solución: vuelve a ejecutar con `npx claudeos-core init --force`. Sobrescribe los archivos generados (`CLAUDE.md`, `.claude/rules/`, `claudeos-core/standard/`, `claudeos-core/skills/`, `claudeos-core/guide/`) preservando `claudeos-core/memory/` (decision-log, failure-patterns acumulados — append-only). Haz commit del proyecto antes si quieres revisar el diff de las sobrescrituras.

**El puerto en CLAUDE.md difiere de `.env.example` (v2.2.0)** — El nuevo parser `.env` del stack-detector (`lib/env-parser.js`) lee `.env.example` primero (canónico, commiteado), luego variantes `.env` como fallback. Variables de puerto reconocidas: `PORT`, `VITE_PORT`, `VITE_DESKTOP_PORT`, `NEXT_PUBLIC_PORT`, `NUXT_PORT`, `DJANGO_PORT`, etc. Para Spring Boot, `server.port` de `application.yml` sigue teniendo prioridad sobre `.env` (config framework-native gana). Si tu proyecto usa un nombre de var env inusual, renómbralo a una convención reconocida o abre un issue para extender `PORT_VAR_KEYS`. Los valores por defecto del framework (Vite 5173, Next.js 3000, Django 8000) se usan solo cuando tanto la detección directa como `.env` están silenciosos.

**Valores secretos redactados como `***REDACTED***` en docs generados (v2.2.0)** — Comportamiento esperado. El parser `.env` de v2.2.0 redacta automáticamente valores de variables que coinciden con patrones `PASSWORD`/`SECRET`/`TOKEN`/`API_KEY`/`CREDENTIAL`/`PRIVATE_KEY` antes de que lleguen a cualquier generador. Esto es defense-in-depth contra secretos commiteados accidentalmente en `.env.example`. `DATABASE_URL` se mantiene tal cual por back-compat de identificación de DB en stack-detector. Si ves `***REDACTED***` en algún lugar del `CLAUDE.md` generado, es un bug — los valores redactados no deberían llegar a la tabla; por favor reporta un issue. La config runtime no sensible (port, host, API target, NODE_ENV, etc.) pasa sin cambios.

---

## Contribuir

¡Las contribuciones son bienvenidas! Áreas donde más se necesita ayuda:

- **Nuevas plantillas de stack** — Ruby/Rails, Go (Gin/Fiber/Echo), PHP (Laravel/Symfony), Rust (Axum/Actix), Svelte/SvelteKit, Remix
- **Integración IDE** — extensión de VS Code, plugin de IntelliJ
- **Plantillas de CI/CD** — GitLab CI, CircleCI, ejemplos de Jenkins (GitHub Actions ya incluido — ver `.github/workflows/test.yml`)
- **Test coverage** — Ampliar la suite de tests (actualmente 602 tests en 30 archivos de test cubriendo scanners, stack detection, domain grouping, plan parsing, prompt generation, CLI selectors, monorepo detection, Vite SPA detection, verification tools, memory scaffold L4, validación de resume de Pass 2, Pass 3 Guards 1/2/3 (H1 sentinel + H2 BOM-aware empty-file + estricto stale-marker unlink), sub-división por lotes de Pass 3 en modo split, resume de Pass 3 con marcador parcial (v2.1.0), validación del contenido del marcador de Pass 4 + rigor del stale-marker unlink + gap-fill de scaffoldSkillsManifest (v2.1.0), guard env-skip de traducción + early fail-fast + workflow CI, movimiento de staged-rules, fallback lang-aware de traducción, suite de regresión por eliminación de master plan (v2.1.0), regresión de formato de memory score/compact (v2.1.0), y estructura de la plantilla AI Work Rules, y extracción de port/host/API-target del parser `.env` + redacción de variables sensibles (v2.2.0))

Ver [`CONTRIBUTING.md`](./CONTRIBUTING.md) para la lista completa de áreas, estilo de código, convención de commits y la guía paso a paso para añadir una nueva plantilla de stack.

---

## Autor

Creado por **claudeos-core** — [GitHub](https://github.com/claudeos-core) · [Email](mailto:claudeoscore@gmail.com)

## Licencia

ISC
