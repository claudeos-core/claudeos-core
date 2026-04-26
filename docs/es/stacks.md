# Supported Stacks

12 stacks, todos auto-detectados desde los archivos de tu proyecto. **8 backend** + **4 frontend**.

Esta página describe cómo se detecta cada stack y qué extrae el scanner por stack. Úsala para:

- Comprobar si tu stack está soportado.
- Entender qué hechos pasará el scanner a Claude antes de generar los docs.
- Ver qué esperar en `claudeos-core/generated/project-analysis.json`.

Si la estructura de tu proyecto es inusual, ver [advanced-config.md](advanced-config.md) para overrides de `.claudeos-scan.json`.

> Original en inglés: [docs/stacks.md](../stacks.md). La traducción al español se mantiene sincronizada con el inglés.

---

## Cómo funciona la detección

Cuando `init` se ejecuta, el scanner abre estos archivos en la raíz del proyecto aproximadamente en este orden:

| Archivo | Lo que le dice al scanner |
|---|---|
| `package.json` | Proyecto Node.js; framework vía `dependencies` |
| `pom.xml` | Proyecto Java/Maven |
| `build.gradle` / `build.gradle.kts` | Proyecto Java/Kotlin Gradle |
| `pyproject.toml` / `requirements.txt` | Proyecto Python; framework vía paquetes |
| `angular.json` | Proyecto Angular |
| `nuxt.config.{ts,js}` | Proyecto Vue/Nuxt |
| `next.config.{ts,js}` | Proyecto Next.js |
| `vite.config.{ts,js}` | Proyecto Vite |

Si nada coincide, `init` se detiene con un error claro en lugar de adivinar. (Sin fallback de "pedirle al LLM que lo descubra". Mejor fallar ruidosamente que producir docs incorrectos en silencio.)

El scanner está en `plan-installer/stack-detector.js` si quieres leer la lógica real de detección.

---

## Stacks backend (8)

### Java / Spring Boot

**Detectado cuando:** `build.gradle` o `pom.xml` contiene `spring-boot-starter`. Java se identifica por separado de Kotlin a través del bloque de plugins de Gradle.

**Detección de patrón de arquitectura.** El scanner clasifica tu proyecto en **uno de 5 patrones**:

| Patrón | Estructura ejemplo |
|---|---|
| **A. Layer-first** | `controller/order/`, `service/order/`, `repository/order/` |
| **B. Domain-first** | `order/controller/`, `order/service/`, `order/repository/` |
| **C. Layer-then-domain** | `controller/order/sub1/`, `service/order/sub2/` |
| **D. Domain-then-layer** | `order/sub1/controller/`, `order/sub2/service/` |
| **E. Hexagonal / DDD** | `domain/`, `application/`, `infrastructure/`, `presentation/` |

Los patrones se prueban en orden (A → B/D → E → C). El scanner también tiene dos refinamientos: (1) **detección de root-package** elige el prefijo de paquete más largo que cubre ≥80% de los archivos con capa (determinístico entre re-ejecuciones); (2) **fallback deep-sweep** para Patrón B/D — cuando los globs estándar devuelven cero archivos para un dominio registrado, el scanner re-ejecuta el glob `**/${domain}/**/*.java` y recorre la ruta de cada archivo para encontrar el directorio de capa más cercano, atrapando layouts de acoplamiento entre dominios como `core/{otherDomain}/{layer}/{domain}/`.

**Hechos extraídos:**
- Stack, versión del framework, ORM (JPA / MyBatis / jOOQ)
- Tipo de DB (Postgres / MySQL / Oracle / MariaDB / H2 — la detección de H2 usa un regex de límite de palabra `\bh2\b` para evitar falsos positivos en `oauth2`, `cache2k`, etc.)
- Package manager (Gradle / Maven), build tool, logger (Logback / Log4j2)
- Lista de dominios con conteo de archivos (controllers, services, mappers, dtos, MyBatis XML mappers)

El scanner está en `plan-installer/scanners/scan-java.js`.

---

### Kotlin / Spring Boot

**Detectado cuando:** `build.gradle.kts` está presente y el plugin Kotlin se aplica junto con Spring Boot. Tiene una ruta de código completamente separada de Java — no reutiliza patrones Java.

**Detecta específicamente:**
- **CQRS** — paquetes command/query separados
- **BFF** — patrón backend-for-frontend
- **Multi-module Gradle** — `settings.gradle.kts` con `include(":module")`
- **Dominios shared query entre módulos** — `resolveSharedQueryDomains()` redistribuye archivos del módulo shared query vía descomposición de package/class-name

**ORMs soportados:** Exposed, jOOQ, JPA (Hibernate), R2DBC.

**Por qué Kotlin tiene su propio scanner:** los patrones Java no encajan bien con codebases Kotlin. Los proyectos Kotlin tienden a CQRS y setups multi-módulo que la clasificación A-a-E de patrones Java no puede representar limpiamente.

El scanner está en `plan-installer/scanners/scan-kotlin.js`.

---

### Node / Express

**Detectado cuando:** `express` está en las dependencies de `package.json`.

**El stack detector identifica:** ORM (Prisma / TypeORM / Sequelize / Drizzle / Knex / Mongoose), tipo de DB, package manager (npm / yarn / pnpm), uso de TypeScript.

**Descubrimiento de dominios:** el scanner Node.js compartido (`plan-installer/scanners/scan-node.js`) recorre `src/*/` (o `src/modules/*/` si existen módulos estilo NestJS), cuenta archivos que coinciden con `controller|router|route|handler`, `service`, `dto|schema|type`, y patrones entity/module/guard/pipe/interceptor. La misma ruta de código del scanner se usa para Express, Fastify y NestJS — el nombre del framework determina qué prompt de Pass 1 se selecciona, no qué scanner se ejecuta.

---

### Node / Fastify

**Detectado cuando:** `fastify` está en dependencies.

El descubrimiento de dominios usa el mismo scanner compartido `scan-node.js` descrito arriba. Pass 1 usa una plantilla de prompt específica de Fastify que pide a Claude que busque los patrones de plugin y schemas de ruta de Fastify.

---

### Node / NestJS

**Detectado cuando:** `@nestjs/core` está en dependencies.

El descubrimiento de dominios usa el scanner compartido `scan-node.js`. El layout estándar de NestJS `src/modules/<module>/` se detecta automáticamente (preferido sobre `src/*/` cuando ambos existen) y cada módulo se convierte en un dominio. Pass 1 usa una plantilla de prompt específica de NestJS.

---

### Python / Django

**Detectado cuando:** la subcadena `django` (minúscula) aparece en `requirements.txt` o `pyproject.toml`. Las declaraciones estándar de package manager usan minúsculas, así que esto coincide con proyectos típicos.

**Descubrimiento de dominios:** el scanner recorre `**/models.py` y trata cada directorio que contiene `models.py` como una app/dominio Django. (No parsea `INSTALLED_APPS` desde `settings.py` — la presencia en disco de `models.py` es la señal.)

**Estadísticas por dominio:** cuenta archivos que coinciden con `views`, `models`, `serializers`, `admin`, `forms`, `urls`, `tasks`.

---

### Python / FastAPI

**Detectado cuando:** `fastapi` está en dependencies.

**Descubrimiento de dominios:** glob `**/{router,routes,endpoints}*.py` — cada directorio padre único se convierte en un dominio. El scanner no parsea las llamadas `APIRouter(...)`; el nombre del archivo es la señal.

**ORMs detectados por stack-detector:** SQLAlchemy, Tortoise ORM.

---

### Python / Flask

**Detectado cuando:** `flask` está en dependencies.

**Descubrimiento de dominios:** usa el mismo glob `**/{router,routes,endpoints}*.py` que FastAPI. Si eso no produce nada, el scanner cae a directorios `{app,src/app}/*/`.

**Fallback flat-project (v1.7.1):** Si no se encuentran candidatos a dominio, el scanner busca `{main,app}.py` en la raíz del proyecto y trata el proyecto como una "app" de un único dominio.

---

## Stacks frontend (4)

### Node / Next.js

**Detectado cuando:** `next.config.{ts,js}` existe, O `next` está en las dependencies de `package.json`.

**Detecta convención de routing:**

- **App Router** (Next.js 13+) — directorio `app/` con `page.tsx`/`layout.tsx`
- **Pages Router** (legacy) — directorio `pages/`
- **FSD (Feature-Sliced Design)** — `src/features/`, `src/widgets/`, `src/entities/`

**El scanner extrae:**
- Modo de routing (App Router / Pages Router / FSD)
- Conteos de RSC vs Client component (Next.js App Router — contando archivos cuyo nombre contiene `client.` como `client.tsx`, no parseando directivas `"use client"` dentro del fuente)
- Lista de dominios desde `app/` o `pages/` (y `src/features/` etc. para FSD)

State management, styling, y librerías de data-fetching no se detectan a nivel de scanner. Los prompts de Pass 1 piden a Claude que busque esos patrones en el código fuente.

---

### Node / Vite

**Detectado cuando:** `vite.config.{ts,js}` existe, O `vite` está en dependencies.

El port por defecto es `5173` (convención Vite) — aplicado como fallback de último recurso. El scanner no parsea `vite.config` para `server.port`; si tu proyecto declara un port en `.env*`, el env-parser lo recoge primero.

El stack detector identifica Vite en sí; el framework UI subyacente — cuando no es React (el fallback por defecto) — lo identifica el LLM en Pass 1 desde el código fuente, no el scanner.

---

### Angular

**Detectado cuando:** `angular.json` está presente, O `@angular/core` está en dependencies.

**Detecta:**
- Estructura de **Feature module** — `src/app/<feature>/`
- **Workspaces de monorepo** — patrones genéricos `apps/*/src/app/*/` y `packages/*/src/app/*/` (funciona para layouts NX aunque `nx.json` no sea una señal de detección explícita)

El port por defecto es `4200` (convención Angular) — aplicado como fallback de último recurso. El scanner lee `angular.json` solo para detección de stack, no para extracción de port; si tu proyecto declara el port en un archivo `.env*`, el env-parser lo recoge primero.

---

### Vue / Nuxt

**Detectado cuando:** `nuxt.config.{ts,js}` existe para Nuxt, O `vue` está en dependencies para Vue plano.

El scanner identifica el framework y ejecuta la extracción de dominios frontend (patrones App/Pages/FSD/components). La detección de versión Nuxt y módulos (Pinia, VueUse, etc.) se delega a Pass 1 — Claude lee el fuente e identifica lo que se usa, en lugar de que el scanner haga pattern-match sobre `package.json`.

---

## Proyectos multi-stack

Un proyecto con backend y frontend (p. ej., Spring Boot en `backend/` + Next.js en `frontend/`) está completamente soportado.

Cada stack ejecuta su **propio scanner** con su **propio prompt de análisis**. La salida fusionada de Pass 2 cubre ambos stacks. Pass 3 genera archivos separados de rule y standard para cada uno, organizados en:

```
.claude/rules/
├── 10.backend/                  ← Reglas Spring Boot
├── 20.frontend/                 ← Reglas Next.js
└── 70.domains/
    ├── backend/                 ← por dominio backend
    └── frontend/                ← por dominio frontend

claudeos-core/standard/
├── 10.backend/
├── 20.frontend/
└── 70.domains/
    ├── backend/
    └── frontend/
```

El typing `70.domains/{type}/` está **siempre activo** — incluso si tu proyecto es de un solo stack, el layout usa `70.domains/backend/` (o `frontend/`). Esto mantiene la convención uniforme: cuando un proyecto de un solo stack añade luego un segundo stack, no se necesita migración.

**La detección multi-stack** capta:
- Un manifest de monorepo en la raíz del proyecto: `turbo.json`, `pnpm-workspace.yaml`, `lerna.json`
- Un `package.json` raíz con un campo `workspaces`

Cuando se detecta un monorepo, el scanner recorre `apps/*/package.json` y `packages/*/package.json` (más cualquier glob de workspace personalizado del manifest), fusiona las listas de dependencias, y ejecuta scanners backend y frontend según se necesiten.

---

## Detección de platform-split en frontend

Algunos proyectos frontend organizan por plataforma (PC, mobile, admin) en el nivel superior:

```
src/
├── pc/
│   ├── home/
│   └── product/
├── mobile/
│   ├── home/
│   └── checkout/
└── admin/
    ├── users/
    └── reports/
```

El scanner detecta `src/{platform}/{subapp}/` y emite cada `{platform}-{subapp}` como un dominio separado. Palabras clave de plataforma por defecto:

- **Dispositivo / entorno objetivo:** `desktop`, `pc`, `web`, `mobile`, `mc`, `mo`, `sp`, `tablet`, `tab`, `pwa`, `tv`, `ctv`, `ott`, `watch`, `wear`
- **Tier de acceso / audiencia:** `admin`, `cms`, `backoffice`, `back-office`, `portal`

Añade palabras clave personalizadas vía `frontendScan.platformKeywords` en `.claudeos-scan.json` (ver [advanced-config.md](advanced-config.md)).

**Regla single-SPA skip (v2.3.0):** Si solo UNA palabra clave de plataforma coincide en el árbol del proyecto (p. ej., el proyecto tiene `src/admin/api/`, `src/admin/dto/`, `src/admin/routers/` sin otras plataformas), se omite la emisión de subapp. De lo contrario, las capas arquitectónicas (`api`, `dto`, `routers`) se emitirían falsamente como dominios feature.

Para forzar la emisión de subapp de todas formas, define `frontendScan.forceSubappSplit: true` en `.claudeos-scan.json`. Ver [advanced-config.md](advanced-config.md).

---

## Extracción de `.env` (v2.2.0+)

El scanner lee archivos `.env*` para configuración de runtime para que los docs generados reflejen tu port, host y DB URL reales.

**Orden de búsqueda** (gana la primera coincidencia):

1. `.env.example` (canónico, commiteado)
2. `.env.local.example`
3. `.env.development.example`
4. `.env.sample`
5. `.env.template`
6. `.env`
7. `.env.local`
8. `.env.development`

**Redacción de variables sensibles:** las claves que coinciden con `PASSWORD`, `SECRET`, `TOKEN`, `API_KEY`, `CREDENTIAL`, `PRIVATE_KEY`, `JWT_SECRET`, etc. se redactan automáticamente a `***REDACTED***` antes de copiarse a `project-analysis.json`. **Excepción:** `DATABASE_URL` está en whitelist porque el scanner necesita el protocolo para detectar el tipo de DB.

**Precedencia de resolución de port:**
1. `server.port` de `application.yml` de Spring Boot
2. Claves de port `.env` (16+ claves convencionales comprobadas, ordenadas por especificidad — específicas de Vite primero, `PORT` genérico al final)
3. Default del stack (FastAPI/Django=8000, Flask=5000, Vite=5173, Express/NestJS/Fastify=3000, default=8080)

El parser está en `lib/env-parser.js`. Los tests están en `tests/env-parser.test.js`.

---

## Lo que el scanner produce — `project-analysis.json`

Después de que Step A termina, encontrarás este archivo en `claudeos-core/generated/project-analysis.json`. Claves de nivel superior (varía por stack):

```json
{
  "stack": {
    "language": "java",
    "framework": "spring-boot",
    "frameworkVersion": "3.2.0",
    "orm": "mybatis",
    "database": "postgres",
    "packageManager": "gradle",
    "buildTool": "gradle",
    "logger": "logback",
    "port": 8080,
    "envInfo": { "source": ".env.example", "vars": {...}, "port": 8080, "host": "localhost", "apiTarget": null },
    "detected": ["spring-boot", "mybatis", "postgres", "gradle", "logback"]
  },
  "domains": ["order", "customer", "product", ...],
  "domainStats": { "order": { "controllers": 1, "services": 2, "mappers": 1, "dtos": 4, "xmlMappers": 1 }, ... },
  "architecturePattern": "B",  // for Java
  "monorepo": null,  // or { "type": "turborepo", "workspaces": [...] }
  "frontend": null   // or { "framework": "next.js", "routingMode": "app-router", ... }
}
```

Puedes leer este archivo directamente para ver exactamente qué extrajo el scanner de tu proyecto.

---

## Añadir un nuevo stack

La arquitectura del scanner es modular. Añadir un nuevo stack requiere:

1. Un archivo `plan-installer/scanners/scan-<stack>.js` (lógica de extracción de dominios).
2. Tres plantillas de prompt Claude: `pass1.md`, `pass2.md`, `pass3.md` bajo `pass-prompts/templates/<stack>/`.
3. Reglas de detección de stack añadidas a `plan-installer/stack-detector.js`.
4. Routing en el dispatcher en `bin/commands/init.js`.
5. Tests con un proyecto fixture bajo `tests/fixtures/<stack>/`.

Ver [CONTRIBUTING.md](../../CONTRIBUTING.md) para la guía completa e implementaciones de referencia para copiar.

---

## Override del comportamiento del scanner

Si tu proyecto tiene una estructura inusual o la auto-detección elige el stack equivocado, deja un archivo `.claudeos-scan.json` en la raíz de tu proyecto.

Ver [advanced-config.md](advanced-config.md) para los campos override disponibles.
