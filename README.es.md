# ClaudeOS-Core

**La única herramienta que lee tu código fuente primero, confirma tu stack y patrones con análisis determinístico, y genera reglas de Claude Code adaptadas exactamente a tu proyecto.**

```bash
npx claudeos-core init
```

ClaudeOS-Core lee tu código fuente, extrae cada patrón que encuentra y genera un conjunto completo de Standards, Rules, Skills y Guides adaptados a _tu_ proyecto. Después, cuando le digas a Claude Code "Crea un CRUD para pedidos", generará código que coincide exactamente con tus patrones existentes.

[🇺🇸 English](./README.md) · [🇰🇷 한국어](./README.ko.md) · [🇨🇳 中文](./README.zh-CN.md) · [🇯🇵 日本語](./README.ja.md) · [🇻🇳 Tiếng Việt](./README.vi.md) · [🇮🇳 हिन्दी](./README.hi.md) · [🇷🇺 Русский](./README.ru.md) · [🇫🇷 Français](./README.fr.md) · [🇩🇪 Deutsch](./README.de.md)

---

## ¿Por qué ClaudeOS-Core?

> Humano describe el proyecto → LLM genera documentación

ClaudeOS-Core:

> Código analiza tu fuente → Código construye prompt personalizado → LLM genera documentación → Código verifica la salida

### El problema central: Los LLMs adivinan. El código confirma.

Cuando le pides a Claude "analiza este proyecto", **adivina** tu stack, ORM y estructura de dominios.

**ClaudeOS-Core no adivina.** Claude Node.js:

- `build.gradle` / `package.json` / `pyproject.toml` → **confirmed**
- directory scan → **confirmed**
- Java 5 patterns, Kotlin CQRS/BFF, Next.js App Router/FSD → **classified**
- domain groups → **split**
- stack-specific prompt → **assembled**

### El resultado

Otras herramientas producen documentación "generalmente buena".
ClaudeOS-Core produce documentación que sabe que tu proyecto usa `ApiResponse.ok()` (no `ResponseEntity.success()`), que tus mappers MyBatis XML están en `src/main/resources/mybatis/mappers/` — porque leyó tu código real.

### Before & After

**Sin ClaudeOS-Core**:
```
❌ JPA repository (MyBatis)
❌ ResponseEntity.success() (ApiResponse.ok())
❌ order/controller/ (controller/order/)
→ 20 min fix per file
```

**Con ClaudeOS-Core**:
```
✅ MyBatis mapper + XML (build.gradle)
✅ ApiResponse.ok() (source code)
✅ controller/order/ (Pattern A)
→ immediate match
```

Esta diferencia se acumula. 10 tareas/día × 20 minutos ahorrados = **más de 3 horas/día**.

---

## Stacks Soportados

| Stack | Detección | Profundidad de Análisis |
|---|---|---|
| **Java / Spring Boot** | `build.gradle`, `pom.xml`, 5 patrones de paquete | 10 categorías, 59 sub-ítems |
| **Kotlin / Spring Boot** | `build.gradle.kts`, kotlin plugin, `settings.gradle.kts`, CQRS/BFF auto-detect | 12 categorías, 95 sub-ítems |
| **Node.js / Express** | `package.json` | 9 categorías, 57 sub-ítems |
| **Node.js / NestJS** | `package.json` (`@nestjs/core`) | 10 categorías, 68 sub-ítems |
| **Next.js / React** | `package.json`, `next.config.*`, soporte FSD | 9 categorías, 55 sub-ítems |
| **Vue / Nuxt** | `package.json`, `nuxt.config.*`, Composition API | 9 categorías, 58 sub-ítems |
| **Python / Django** | `requirements.txt`, `pyproject.toml` | 10 categorías, 55 sub-ítems |
| **Python / FastAPI** | `requirements.txt`, `pyproject.toml` | 10 categorías, 58 sub-ítems |
| **Node.js / Fastify** | `package.json` | 10 categorías, 62 sub-ítems |
| **Angular** | `package.json`, `angular.json` | 12 categorías, 78 sub-ítems |

Detección automática: lenguaje y versión, framework y versión, ORM (MyBatis, JPA, Exposed, Prisma, TypeORM, SQLAlchemy, etc.), base de datos (PostgreSQL, MySQL, Oracle, MongoDB, SQLite), gestor de paquetes (Gradle, Maven, npm, yarn, pnpm, pip, poetry), arquitectura (CQRS, BFF — detectado de nombres de módulos), estructura multi-módulo (desde settings.gradle), monorepo (Turborepo, pnpm-workspace, Lerna, npm/yarn workspaces).

**No necesitas especificar nada. Todo se detecta automáticamente.**


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

Para proyectos Kotlin con estructura Gradle multi-módulo (ej: monorepo CQRS):

| Paso | Acción | Ejemplo |
|---|---|---|
| 1 | Escanear `settings.gradle.kts` buscando `include()` | Encuentra 14 módulos |
| 2 | Detectar tipo de módulo por nombre | `reservation-command-server` → tipo: `command` |
| 3 | Extraer dominio del nombre del módulo | `reservation-command-server` → dominio: `reservation` |
| 4 | Agrupar mismo dominio entre módulos | `reservation-command-server` + `common-query-server` → 1 dominio |
| 5 | Detectar arquitectura | Tiene módulos `command` + `query` → CQRS |

Tipos de módulo soportados: `command`, `query`, `bff`, `integration`, `standalone`, `library`. Las bibliotecas compartidas (`shared-lib`, `integration-lib`) se detectan como dominios especiales.

### Detección de Dominios Frontend

- **App Router**: `app/{domain}/page.tsx` (Next.js)
- **Pages Router**: `pages/{domain}/index.tsx`
- **FSD (Feature-Sliced Design)**: `features/*/`, `widgets/*/`, `entities/*/`
- **RSC/Client split**: Detecta patrón `client.tsx`, rastrea separación Server/Client
- **Config fallback**: Detecta Next.js/Vite/Nuxt desde archivos de configuración (soporte monorepo)
- **Fallback de directorios profundos**: Para proyectos React/CRA/Vite/Vue/RN, escanea `**/components/*/`, `**/views/*/`, `**/screens/*/`, `**/containers/*/`, `**/pages/*/`, `**/routes/*/`, `**/modules/*/`, `**/domains/*/` a cualquier profundidad

---

## Inicio Rápido

### Requisitos Previos

- **Node.js** v18+
- **Claude Code CLI** (instalado y autenticado)

### Instalación

```bash
cd /your/project/root

# Opción A: npx (recomendado — sin instalación)
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

# Solo Linux/macOS (solo Bash)
bash claudeos-core-tools/bootstrap.sh
```

### Idioma de salida (10 idiomas)

Al ejecutar `init` sin `--lang`, aparece un selector interactivo con teclas de flecha o teclas numéricas:

```
╔══════════════════════════════════════════════════╗
║  Select generated document language (required)   ║
╚══════════════════════════════════════════════════╝

  Los archivos generados (CLAUDE.md, Standards, Rules,
  Skills, Guides) se escribirán en español.

     1. en     — English
     ...
  ❯  5. es     — Español (Spanish)
     ...

  ↑↓ Move  1-0 Jump  Enter Select  ESC Cancel
```

La descripción cambia al idioma seleccionado al navegar. Para saltar el selector:

```bash
npx claudeos-core init --lang es    # Español
npx claudeos-core init --lang en    # English
npx claudeos-core init --lang ko    # 한국어
```

> **Nota:** Solo cambia el idioma de los archivos de documentación generados. El análisis de código (Pass 1–2) siempre se ejecuta en inglés; solo la salida generada (Pass 3) se escribe en el idioma elegido.

Eso es todo. Después de 5–18 minutos, toda la documentación estará generada y lista para usar.
El CLI muestra el tiempo transcurrido por cada Pass y el tiempo total en el banner de finalización.

### Instalación Manual Paso a Paso

Si deseas control total sobre cada fase, o si el pipeline automatizado falla en algún paso, puedes ejecutar cada etapa manualmente. También es útil para entender cómo funciona ClaudeOS-Core internamente.

#### Step 1: Clonar e instalar dependencias

```bash
cd /your/project/root

git clone https://github.com/claudeos-core/claudeos-core.git claudeos-core-tools
cd claudeos-core-tools && npm install && cd ..
```

#### Step 2: Crear estructura de directorios

```bash
# Rules
mkdir -p .claude/rules/{00.core,10.backend,20.frontend,30.security-db,40.infra,50.sync}

# Standards
mkdir -p claudeos-core/standard/{00.core,10.backend-api,20.frontend-ui,30.security-db,40.infra,50.verification,90.optional}

# Skills
mkdir -p claudeos-core/skills/{00.shared,10.backend-crud/scaffold-crud-feature,20.frontend-page/scaffold-page-feature,50.testing,90.experimental}

# Guide, Plan, Database, MCP, Generated
mkdir -p claudeos-core/guide/{01.onboarding,02.usage,03.troubleshooting,04.architecture}
mkdir -p claudeos-core/{plan,database,mcp-guide,generated}
```

#### Step 3: Ejecutar plan-installer (análisis del proyecto)

Escanea tu proyecto, detecta el stack, encuentra dominios, los divide en grupos y genera prompts.

```bash
node claudeos-core-tools/plan-installer/index.js
```

**Salida (`claudeos-core/generated/`):**
- `project-analysis.json` — stack detectado, dominios, info de frontend
- `domain-groups.json` — grupos de dominios para Pass 1
- `pass1-backend-prompt.md` / `pass1-frontend-prompt.md` — prompts de análisis
- `pass2-prompt.md` — prompt de fusión
- `pass3-prompt.md` — prompt de generación

Puedes inspeccionar estos archivos para verificar la precisión de la detección antes de continuar.

#### Step 4: Pass 1 — Análisis profundo de código por grupo de dominio

Ejecuta Pass 1 para cada grupo de dominio. Revisa `domain-groups.json` para el número de grupos.

```bash
# Check groups
cat claudeos-core/generated/domain-groups.json | node -e "
  const g = JSON.parse(require('fs').readFileSync('/dev/stdin','utf-8'));
  g.groups.forEach((g,i) => console.log('Group '+(i+1)+': ['+g.domains.join(', ')+'] ('+g.type+', ~'+g.estimatedFiles+' files)'));
"

# Run Pass 1 for group 1:
cp claudeos-core/generated/pass1-backend-prompt.md /tmp/_pass1.md
DOMAIN_LIST="user, order, product" PASS_NUM=1 \
  perl -pi -e 's/\{\{DOMAIN_GROUP\}\}/$ENV{DOMAIN_LIST}/g; s/\{\{PASS_NUM\}\}/$ENV{PASS_NUM}/g' /tmp/_pass1.md
cat /tmp/_pass1.md | claude -p --dangerously-skip-permissions

# Para grupos frontend, use pass1-frontend-prompt.md
```

**Verificar:** `ls claudeos-core/generated/pass1-*.json` debe mostrar un JSON por grupo.

#### Step 5: Pass 2 — Fusionar resultados de análisis

```bash
cat claudeos-core/generated/pass2-prompt.md \
  | claude -p --dangerously-skip-permissions
```

**Verificar:** `claudeos-core/generated/pass2-merged.json` debe existir con 9+ claves de nivel superior.

#### Step 6: Pass 3 — Generar toda la documentación

```bash
cat claudeos-core/generated/pass3-prompt.md \
  | claude -p --dangerously-skip-permissions
```

**Verificar:** `CLAUDE.md` debe existir en la raíz del proyecto.

#### Step 7: Ejecutar herramientas de verificación

```bash
# Generar metadatos (requerido antes de otras verificaciones)
node claudeos-core-tools/manifest-generator/index.js

# Ejecutar todas las verificaciones
node claudeos-core-tools/health-checker/index.js

# O ejecutar verificaciones individuales:
node claudeos-core-tools/plan-validator/index.js --check # Plan ↔ disk
node claudeos-core-tools/sync-checker/index.js          # Sync status
node claudeos-core-tools/content-validator/index.js     # Content quality
node claudeos-core-tools/pass-json-validator/index.js   # JSON format
```

#### Step 8: Verificar los resultados

```bash
find .claude claudeos-core -type f | grep -v node_modules | grep -v '/generated/' | wc -l
head -30 CLAUDE.md
ls .claude/rules/*/
```

> **Consejo:** Si un paso falla, puedes volver a ejecutar solo ese paso. Los resultados de Pass 1/2 se cachean — si `pass1-N.json` o `pass2-merged.json` ya existen, el pipeline automatizado los omite. Usa `npx claudeos-core init --force` para eliminar resultados anteriores y empezar de nuevo.

### Empieza a Usar

```
# En Claude Code — simplemente habla de forma natural:
"Crea un CRUD para el dominio de pedidos"
"Añade una API de autenticación de usuarios"
"Refactoriza este código según los patrones del proyecto"

# Claude Code referencia automáticamente tus Standards, Rules y Skills generados.
```

---

## Cómo Funciona — Pipeline de 3 Pasadas

```
npx claudeos-core init
    │
    ├── [1] npm install                    ← Dependencias (~10s)
    ├── [2] Estructura de directorios      ← Crear carpetas (~1s)
    ├── [3] plan-installer (Node.js)       ← Escaneo del proyecto (~5s)
    │       ├── Auto-detección de stack (multi-stack)
    │       ├── Extracción de lista de dominios (etiquetados: backend/frontend)
    │       ├── División en grupos de dominios (por tipo)
    │       └── Selección de prompts específicos por stack (por tipo)
    │
    ├── [4] Pass 1 × N  (claude -p)       ← Análisis profundo de código (~2-8min)
    │       ├── ⚙️ Grupos backend → prompt de análisis backend
    │       └── 🎨 Grupos frontend → prompt de análisis frontend
    │
    ├── [5] Pass 2 × 1  (claude -p)       ← Fusión de análisis (~1min)
    │       └── Consolidar TODOS los resultados de Pass 1 (backend + frontend)
    │
    ├── [6] Pass 3 × 1  (claude -p)       ← Generar todo (~3-5min)
    │       └── Prompt combinado (objetivos backend + frontend)
    │
    └── [7] Verificación                   ← Ejecución automática del health checker
```

### ¿Por Qué 3 Pasadas?

**Pass 1** es la única pasada que lee tu código fuente. Selecciona archivos representativos por dominio y extrae patrones en 55–95 categorías de análisis (por stack). Para proyectos grandes, Pass 1 se ejecuta múltiples veces — una por grupo de dominios. En proyectos multi-stack (ej: backend Java + frontend React), backend y frontend usan **prompts de análisis diferentes** adaptados a cada stack.

**Pass 2** fusiona todos los resultados de Pass 1 en un análisis unificado: patrones comunes (100% compartidos), patrones mayoritarios (50%+ compartidos), patrones específicos de dominio, anti-patrones por severidad y preocupaciones transversales (nombrado, seguridad, BD, testing, logging, rendimiento).

**Pass 3** toma el análisis fusionado y genera todo el ecosistema de archivos. Nunca lee código fuente — solo el JSON de análisis. En modo multi-stack, el prompt de generación combina los objetivos de backend y frontend para generar ambos conjuntos de estándares en una sola pasada.

---

## Estructura de Archivos Generados

```
your-project/
│
├── CLAUDE.md                          ← Punto de entrada de Claude Code
│
├── .claude/
│   └── rules/                         ← Reglas activadas por Glob
│       ├── 00.core/
│       ├── 10.backend/
│       ├── 20.frontend/
│       ├── 30.security-db/
│       ├── 40.infra/
│       └── 50.sync/                   ← Reglas de recordatorio de sincronización
│
├── claudeos-core/                     ← Directorio principal de salida
│   ├── generated/                     ← JSON de análisis + prompts dinámicos
│   ├── standard/                      ← Estándares de código (15-19 archivos)
│   ├── skills/                        ← Skills de scaffolding CRUD
│   ├── guide/                         ← Onboarding, FAQ, troubleshooting (9 archivos)
│   ├── plan/                          ← Master Plans (backup/restauración)
│   ├── database/                      ← Esquema BD, guía de migración
│   └── mcp-guide/                     ← Guía de integración de servidor MCP
│
└── claudeos-core-tools/               ← Este toolkit (no modificar)
```

Cada archivo de estándar incluye ejemplos ✅ correctos, ejemplos ❌ incorrectos y una tabla resumen de reglas — todo derivado de tus patrones de código reales, no de plantillas genéricas.

---

## Auto-escalado por Tamaño de Proyecto

| Tamaño | Dominios | Ejecuciones Pass 1 | Total `claude -p` | Tiempo Est. |
|---|---|---|---|---|
| Pequeño | 1–4 | 1 | 3 | ~5min |
| Mediano | 5–8 | 2 | 4 | ~8min |
| Grande | 9–16 | 3–4 | 5–6 | ~12min |
| Extra Grande | 17+ | 5+ | 7+ | ~18min+ |

Para proyectos multi-stack (ej: Java + React), los dominios de backend y frontend se cuentan juntos. Un proyecto con 6 dominios backend + 4 frontend = 10 total, escalando como "Grande".

---

## Herramientas de Verificación

ClaudeOS-Core incluye 5 herramientas de verificación integradas que se ejecutan automáticamente después de la generación:

```bash
# Ejecutar todas las verificaciones a la vez (recomendado)
npx claudeos-core health

# Comandos individuales
npx claudeos-core validate     # Comparación Plan ↔ disco
npx claudeos-core refresh      # Sincronización Disco → Plan
npx claudeos-core restore      # Restauración Plan → Disco
```

| Herramienta | Función |
|---|---|
| **manifest-generator** | Construye JSON de metadatos (rule-manifest, sync-map, plan-manifest) |
| **plan-validator** | Compara bloques `<file>` del Master Plan con el disco — 3 modos: check, refresh, restore |
| **sync-checker** | Detecta archivos no registrados (en disco pero no en plan) y entradas huérfanas |
| **content-validator** | Valida calidad de archivos — archivos vacíos, ejemplos ✅/❌ faltantes, secciones requeridas |
| **pass-json-validator** | Valida estructura JSON de Pass 1–3, claves requeridas y completitud de secciones |

---

## Cómo Claude Code Usa tu Documentación

Así es como Claude Code lee la documentación generada por ClaudeOS-Core:

### Archivos que se leen automáticamente

| Archivo | Cuándo | Garantizado |
|---|---|---|
| `CLAUDE.md` | Al inicio de cada conversación | Siempre |
| `.claude/rules/00.core/*` | Al editar archivos (`paths: ["**/*"]`) | Siempre |
| `.claude/rules/10.backend/*` | Al editar archivos (`paths: ["**/*"]`) | Siempre |
| `.claude/rules/30.security-db/*` | Al editar archivos (`paths: ["**/*"]`) | Siempre |
| `.claude/rules/40.infra/*` | Solo al editar archivos config/infra (paths con alcance) | Condicional |
| `.claude/rules/50.sync/*` | Solo al editar archivos claudeos-core (paths con alcance) | Condicional |

### Archivos leídos bajo demanda vía referencias en reglas

Cada archivo de regla enlaza a su standard correspondiente en la sección `## Reference`. Claude solo lee el standard relevante para la tarea actual:

- `claudeos-core/standard/**` — Patrones de código, ejemplos ✅/❌, convenciones de nombres
- `claudeos-core/database/**` — Schema DB (para queries, mappers, migraciones)

`00.standard-reference.md` sirve como directorio para descubrir standards sin regla correspondiente.

### Archivos que NO se leen (ahorro de contexto)

Excluidos explícitamente por la sección `DO NOT Read` de la regla standard-reference:

| Carpeta | Razón de exclusión |
|---|---|
| `claudeos-core/plan/` | Backups de Master Plan (~340KB). Usa `npx claudeos-core refresh` para sincronizar. |
| `claudeos-core/generated/` | Metadatos JSON de build. No es referencia de código. |
| `claudeos-core/guide/` | Guías de onboarding para humanos. |
| `claudeos-core/mcp-guide/` | Docs de servidor MCP. No es referencia de código. |

---

## Flujo de Trabajo Diario

### Después de la Instalación

```
# Usa Claude Code normalmente — referencia tus estándares automáticamente:
"Crea un CRUD para el dominio de pedidos"
"Añade una API de actualización de perfil de usuario"
"Refactoriza este código según los patrones del proyecto"
```

### Después de Editar Estándares Manualmente

```bash
# Después de editar archivos standard o rules:
npx claudeos-core refresh

# Verifica que todo sea consistente
npx claudeos-core health
```

### Cuando los Documentos se Corrompen

```bash
# Restaura todo desde el Master Plan
npx claudeos-core restore
```

### Integración CI/CD

```yaml
# Ejemplo de GitHub Actions
- run: npx claudeos-core validate
# Código de salida 1 bloquea el PR
```

---

## ¿En Qué se Diferencia?

| | ClaudeOS-Core | Everything Claude Code (50K+ ⭐) | Harness | specs-generator | Claude `/init` |
|---|---|---|---|---|---|
| **Approach** | Code analyzes first, then LLM generates | Pre-built config presets | LLM designs agent teams | LLM generates spec docs | LLM writes CLAUDE.md |
| **Reads your source code** | ✅ Deterministic static analysis | ❌ | ❌ | ❌ (LLM reads) | ❌ (LLM reads) |
| **Stack detection** | Code confirms (ORM, DB, build tool, pkg manager) | N/A (stack-agnostic) | LLM guesses | LLM guesses | LLM guesses |
| **Domain detection** | Code confirms (Java 5 patterns, Kotlin CQRS, Next.js FSD) | N/A | LLM guesses | N/A | N/A |
| **Same project → Same result** | ✅ Deterministic analysis | ✅ (static files) | ❌ (LLM varies) | ❌ (LLM varies) | ❌ (LLM varies) |
| **Large project handling** | Domain group splitting (4 domains / 40 files per group) | N/A | No splitting | No splitting | Context window limit |
| **Output** | CLAUDE.md + Rules + Standards + Skills + Guides + Plans (40-50+ files) | Agents + Skills + Commands + Hooks | Agents + Skills | 6 spec documents | CLAUDE.md (1 file) |
| **Output location** | `.claude/rules/` (auto-loaded by Claude Code) | `.claude/` various | `.claude/agents/` + `.claude/skills/` | `.claude/steering/` + `specs/` | `CLAUDE.md` |
| **Post-generation verification** | ✅ 5 automated validators | ❌ | ❌ | ❌ | ❌ |
| **Multi-language output** | ✅ 10 languages | ❌ | ❌ | ❌ | ❌ |
| **Multi-stack** | ✅ Backend + Frontend simultaneous | ❌ Stack-agnostic | ❌ | ❌ | Partial |
| **Agent orchestration** | ❌ | ✅ 28 agents | ✅ 6 patterns | ❌ | ❌ |

### Key difference

**Other tools give Claude "generally good instructions." ClaudeOS-Core gives Claude "instructions extracted from your actual code."**

### Complementary, not competing

ClaudeOS-Core: **project-specific rules**. Other tools: **agent orchestration**.
Use both together.

---
## FAQ

**P: ¿Modifica mi código fuente?**
No. Solo crea `CLAUDE.md`, `.claude/rules/` y `claudeos-core/`. Tu código existente nunca se modifica.

**P: ¿Cuánto cuesta?**
Llama a `claude -p` entre 3–7 veces. Está dentro del uso normal de Claude Code.

**P: ¿Debería hacer commit de los archivos generados a Git?**
Sí, recomendado. Tu equipo puede compartir los mismos estándares de Claude Code. Considera añadir `claudeos-core/generated/` a `.gitignore` (el JSON de análisis es regenerable).

**P: ¿Qué pasa con proyectos de stack mixto (ej: backend Java + frontend React)?**
Totalmente soportado. ClaudeOS-Core auto-detecta ambos stacks, etiqueta dominios como `backend` o `frontend`, y usa prompts de análisis específicos para cada uno. Pass 2 fusiona todo, y Pass 3 genera los estándares de backend y frontend en una sola pasada.

**P: ¿Funciona con Turborepo / pnpm workspaces / monorepos Lerna?**
Sí. ClaudeOS-Core detecta `turbo.json`, `pnpm-workspace.yaml`, `lerna.json` o `package.json#workspaces` y escanea automáticamente los `package.json` de sub-paquetes en busca de dependencias de framework/ORM/BD. El escaneo de dominios cubre patrones `apps/*/src/` y `packages/*/src/`. Ejecuta desde la raíz del monorepo.

**P: ¿Qué pasa al re-ejecutar?**
Si existen resultados previos de Pass 1/2, un prompt interactivo te permite elegir: **Continue** (reanudar desde donde se detuvo) o **Fresh** (eliminar todo y empezar de nuevo). Usa `--force` para omitir el prompt y siempre empezar de nuevo. Pass 3 siempre se re-ejecuta. Las versiones anteriores pueden restaurarse desde los Master Plans.

**P: ¿NestJS tiene su propia plantilla o usa la de Express?**
NestJS usa una plantilla dedicada `node-nestjs` con categorías de análisis específicas de NestJS: decoradores `@Module`, `@Injectable`, `@Controller`, Guards, Pipes, Interceptors, contenedor DI, patrones CQRS y `Test.createTestingModule`. Los proyectos Express usan la plantilla separada `node-express`.

**P: ¿Qué hay de los proyectos Vue / Nuxt?**
Vue/Nuxt usa una plantilla dedicada `vue-nuxt` que cubre Composition API, `<script setup>`, defineProps/defineEmits, stores Pinia, `useFetch`/`useAsyncData`, rutas de servidor Nitro y `@nuxt/test-utils`. Los proyectos Next.js/React usan la plantilla `node-nextjs`.

**P: ¿Soporta Kotlin?**
Sí. ClaudeOS-Core detecta automáticamente Kotlin desde `build.gradle.kts` o el plugin kotlin en `build.gradle`. Utiliza una plantilla dedicada `kotlin-spring` con análisis específico de Kotlin (data classes, sealed classes, coroutines, extension functions, MockK, etc.).

**P: ¿Qué hay de la arquitectura CQRS / BFF?**
Totalmente soportado para proyectos multi-módulo de Kotlin. ClaudeOS-Core lee `settings.gradle.kts`, detecta tipos de módulos (command, query, bff, integration) de los nombres, y agrupa el mismo dominio entre módulos Command/Query. Los estándares generados incluyen reglas separadas para command controllers vs query controllers, patrones BFF/Feign y convenciones de comunicación entre módulos.

**P: ¿Qué hay de los monorepos multi-módulo de Gradle?**
ClaudeOS-Core escanea todos los submódulos (`**/src/main/kotlin/**/*.kt`) sin importar la profundidad de anidamiento. Los tipos de módulos se infieren de las convenciones de nombres (ej: `reservation-command-server` → dominio: `reservation`, tipo: `command`). Las bibliotecas compartidas (`shared-lib`, `integration-lib`) también se detectan.

---

## Estructura de Plantillas

```
pass-prompts/templates/
├── common/                  # Encabezado/pie compartido
├── java-spring/             # Java / Spring Boot
├── kotlin-spring/           # Kotlin / Spring Boot (CQRS, BFF, multi-module)
├── node-express/            # Node.js / Express
├── node-nestjs/             # Node.js / NestJS (Module, DI, Guard, Pipe, Interceptor)
├── node-fastify/            # Node.js / Fastify
├── node-nextjs/             # Next.js / React
├── vue-nuxt/                # Vue / Nuxt (Composition API, Pinia, Nitro)
├── angular/                 # Angular
├── python-django/           # Python / Django (DRF)
└── python-fastapi/          # Python / FastAPI
```

`plan-installer` auto-detecta tu(s) stack(s) y ensambla prompts específicos por tipo. NestJS y Vue/Nuxt usan plantillas dedicadas con categorías de análisis específicas del framework (ej: `@Module`/`@Injectable`/Guards para NestJS, `<script setup>`/Pinia/useFetch para Vue). Para proyectos multi-stack, se generan `pass1-backend-prompt.md` y `pass1-frontend-prompt.md` por separado, mientras que `pass3-prompt.md` combina los objetivos de generación de ambos stacks.

---

## Soporte Monorepo

ClaudeOS-Core detecta automáticamente configuraciones de monorepo JS/TS y escanea sub-paquetes en busca de dependencias.

**Marcadores de monorepo soportados** (auto-detectados):
- `turbo.json` (Turborepo)
- `pnpm-workspace.yaml` (pnpm workspaces)
- `lerna.json` (Lerna)
- `package.json#workspaces` (npm/yarn workspaces)

**Ejecuta desde la raíz del monorepo** — ClaudeOS-Core lee `apps/*/package.json` y `packages/*/package.json` para descubrir dependencias de framework/ORM/BD en los sub-paquetes:

```bash
cd my-monorepo
npx claudeos-core init
```

**Qué se detecta:**
- Dependencias de `apps/web/package.json` (ej: `next`, `react`) → stack frontend
- Dependencias de `apps/api/package.json` (ej: `express`, `prisma`) → stack backend
- Dependencias de `packages/db/package.json` (ej: `drizzle-orm`) → ORM/BD
- Rutas de workspace personalizadas desde `pnpm-workspace.yaml` (ej: `services/*`)

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

## Solución de Problemas

**"claude: command not found"** — Claude Code CLI no está instalado o no está en el PATH. Consulta la [documentación de Claude Code](https://code.claude.com/docs/en/overview).

**"npm install failed"** — La versión de Node.js puede ser demasiado baja. Se requiere v18+.

**"0 domains detected"** — La estructura de tu proyecto puede ser no estándar. Consulta los patrones de detección en la [documentación en coreano](./README.ko.md#트러블슈팅) para tu stack.

**"0 dominios detectados" en proyecto Kotlin** — Asegúrate de que `build.gradle.kts` (o `build.gradle` con plugin kotlin) exista en la raíz, y los archivos fuente estén bajo `**/src/main/kotlin/`. Para proyectos multi-módulo, `settings.gradle.kts` debe contener sentencias `include()`. Los proyectos Kotlin de módulo único (sin `settings.gradle`) también son compatibles — los dominios se extraen de la estructura de paquetes/clases bajo `src/main/kotlin/`.

**"Lenguaje detectado como java en vez de kotlin"** — ClaudeOS-Core primero verifica el `build.gradle(.kts)` raíz, luego los archivos build de submódulos. Asegúrate de que al menos uno contenga `kotlin("jvm")` o `org.jetbrains.kotlin`.

**"CQRS no detectado"** — La detección de arquitectura depende de que los nombres de módulos contengan las palabras `command` y `query`. Si tus módulos usan nombres diferentes, puedes ajustar manualmente los prompts generados.

---

## Contribuir

¡Las contribuciones son bienvenidas! Áreas donde más se necesita ayuda:

- **Nuevas plantillas de stack** — Ruby/Rails, Go/Gin, PHP/Laravel, Rust/Axum
- **Soporte profundo para monorepos** — Raíces de sub-proyectos separadas, detección de workspaces
- **Cobertura de tests** — Suite de tests en expansión (actualmente 256 tests cubriendo todos los scanners, detección de stack, agrupación de dominios, parsing de planes, generación de prompts, selectores CLI, detección de monorepos y herramientas de verificación)

---

## Autor

Creado por **claudeos-core** — [GitHub](https://github.com/claudeos-core) · [Email](mailto:claudeoscore@gmail.com)

## Licencia

ISC
