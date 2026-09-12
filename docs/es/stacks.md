# Supported Stacks

12 stacks, todos auto-detectados desde los archivos del proyecto. **8 backend** + **4 frontend**.

Esta página describe cómo se detecta cada stack y qué extrae el scanner por stack. Úsala para:

- Comprobar si tu stack está soportado.
- Entender qué hechos le pasará el scanner a Claude antes de generar los docs.
- Ver qué esperar en `claudeos-core/generated/project-analysis.json`.

Si la estructura de tu proyecto es inusual, ver [advanced-config.md](advanced-config.md) para overrides de `.claudeos-scan.json`.

> Original en inglés: [docs/stacks.md](../stacks.md). La traducción al español se mantiene sincronizada con el inglés.

---

## Cómo funciona la detección

Cuando corres `init`, el scanner abre estos archivos en la raíz del proyecto, aproximadamente en este orden:

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

Si nada coincide, `init` se detiene con un error claro en lugar de adivinar. (Sin fallback de "que lo descubra el LLM". Mejor fallar ruidosamente que producir docs incorrectos en silencio.)

El scanner está en `plan-installer/stack-detector.js` si quieres leer la lógica real de detección.

---

## Stacks backend (8)

### Java / Spring Boot

**Detectado cuando:** `build.gradle` o `pom.xml` contiene `spring-boot-starter`. Java se identifica por separado de Kotlin con el bloque de plugins de Gradle.

**Detección de patrón de arquitectura.** El scanner clasifica el proyecto en **uno de 6 patrones**:

| Patrón | Estructura ejemplo |
|---|---|
| **A. Layer-first** | `controller/order/`, `service/order/`, `repository/order/` |
| **B. Domain-first** | `order/controller/`, `order/service/`, `order/repository/` |
| **C. Layer-then-domain** | `controller/order/sub1/`, `service/order/sub2/` |
| **D. Domain-then-layer** | `order/sub1/controller/`, `order/sub2/service/` |
| **E. Hexagonal / DDD** | `domain/`, `application/`, `infrastructure/`, `presentation/` |
| **F. Package-by-feature** (v2.5.3) | `order/OrderController.java`, `order/OrderService.java`, `order/OrderRepository.java` — sin directorio de capa |

Los patrones se prueban en orden A → B/D → E → C; **después F se ejecuta como pasada suplementaria sobre todos los árboles**, registrando cada paquete de feature que contiene directamente un `*Controller.java` y que ningún patrón anterior reclamó. Así un árbol mixto conserva tanto sus dominios `order/controller/` como los de `payment/PaymentController.java`. F cuenta archivos por sufijo del nombre de clase (`*Service`, `*Repository`/`*Mapper`/`*Dao`, `*Dto`/`*Entity`/`*Vo`, todo lo demás como service), porque no hay directorio de capa que leer. Un controller situado directamente en el paquete base junto a `*Application.java` es la demo de paquete único de Initializr y mantiene la regla del patrón C (dominio a partir del nombre de clase). (1) **detección de root-package**, que elige el prefijo de paquete más largo que cubre ≥80% de los archivos con capa (determinístico entre re-ejecuciones); (2) **fallback deep-sweep** para Patrón B/D: cuando los globs estándar devuelven cero archivos para un dominio registrado, el scanner re-ejecuta el glob `**/${domain}/**/*.java` y recorre la ruta de cada archivo para encontrar el directorio de capa más cercano, atrapando layouts de acoplamiento entre dominios como `core/{otherDomain}/{layer}/{domain}/`.

**Hechos extraídos:**
- Stack, versión del framework, ORM (JPA / MyBatis / jOOQ)
- Tipo de DB (Postgres / MySQL / Oracle / MariaDB / H2; la detección de H2 usa un regex de límite de palabra `\bh2\b` para evitar falsos positivos en `oauth2`, `cache2k`, etc.)
- Package manager (Gradle / Maven), build tool, logger (Logback / Log4j2)
- Lista de dominios con conteo de archivos (controllers, services, mappers, dtos, MyBatis XML mappers)

El scanner está en `plan-installer/scanners/scan-java.js`.

---

### Java / Spring Framework (sin Boot) y JVM heredada (v2.5.1+) — variante del stack Java anterior, misma plantilla

**Se detecta cuando:** el build declara un plugin JVM o una dependencia cuyo grupo es **exactamente** `org.springframework` (o `springframework` en Spring 1.x), con o sin Spring Boot. `org.springframework.boot` / `.security` / `.data` / `.cloud` son proyectos distintos y nunca se reportan como Spring Framework.

| Forma del build | Evidencia leída |
|---|---|
| Gradle, era `apply plugin:` | `'java'` / `'java-library'` / `'war'` / `'ear'` / `'application'`; `compile 'org.springframework:spring-webmvc:4.3.30.RELEASE'`; `group: 'org.springframework', name: 'spring-webmvc', version: '3.2.18.RELEASE'`; `org.springframework:spring:2.5.6` (jar único de la serie 2.x) |
| Gradle, `plugins { }` / Kotlin DSL | `id 'java'`, `java` / `war` / `` `java-library` `` a secas, `apply(plugin = "war")`; `spring-framework-bom` vía `platform()` / `mavenBom`; catálogo de versiones `module = "org.springframework:spring-…"` + `version.ref` |
| Gradle, variables | `ext { springVersion = '…' }`, `def` / `val`, **`gradle.properties`** (gana la definición del propio archivo), `${project.x}` / `${rootProject.ext.x}`, mapas Groovy `${versions.spring}`, buildSrc `${Versions.spring}`, scripts `apply from:`; Boot 1.x/2.x `buildscript { classpath("…:spring-boot-gradle-plugin:1.5.22.RELEASE") }`; `options.release = 17` |
| Spring 1.x | grupo `springframework` sin `org.` (Maven / Gradle / Ivy) — `springframework:spring:1.2.9` |
| Maven | `<packaging>`; dependencias con `<groupId>org.springframework</groupId>` (sin comentarios); import de `spring-framework-bom`; propiedades `<spring.version>` / `<spring.maven.version>`; `<version>` de `spring-boot-starter-parent`; BOM `spring-boot-dependencies`; `<maven.compiler.release>`; `<source>1.5</source>` del `maven-compiler-plugin` de la era Maven 2; **multi-módulo**: hijos de `<modules>` (≤30) |
| Formas de repositorio | raíz con solo `settings.gradle`; sin build file en la raíz pero con proyectos hermanos `*/pom.xml` (profundidad 1, ≤30) |
| Metadatos de IDE | compliance de `.settings/org.eclipse.jdt.core.prefs`; nombre del JRE en `.classpath` (`jdk1.6.0_45`) y rutas de jar con `kind="lib"/"var"` (los jars no tienen que estar versionados); `languageLevel` de `.idea/misc.xml`; `nbproject/project.properties` |
| Ant / Ivy | `build.xml` (`<javac source="1.6">`), `ivy.xml` (`org="org.springframework"` exacto, `rev="…"`) |
| Eclipse WTP / sin build tool | contenedor JRE de `.classpath` (`JavaSE-1.7`), `javanature` en `.project`; nombres de jar en `**/{WEB-INF/lib,lib,libs}/**/*.jar` → versión de Spring (`spring-webmvc-3.0.5.RELEASE.jar`), driver JDBC (`ojdbc*`, `mysql-connector`, `mariadb-java-client`, `postgresql-`, `h2-`, `sqlite-jdbc`, `mssql-jdbc` / `jtds`, `db2jcc`, Tibero / Altibase / Cubrid), ORM (`ibatis-*`, `mybatis-*`, `hibernate-*`) — solo si hay fuentes `*.java` al lado |
| Descriptor de despliegue | `WEB-INF/web.xml` — `DispatcherServlet` / `ContextLoaderListener` (Spring MVC, `war`), filtros Struts (etiqueta), `<web-app version>`; XML de Spring `spring-*-3.0.xsd` → versión mayor.menor, la prioridad más baja |
| eGovFrame | coordenadas `egovframework.rte[.*]` → `spring-framework` más una etiqueta `egovframe <version>` en `detected` |

**Datos extraídos (además de la lista de Spring Boot anterior):** `framework: "spring-framework"` con `frameworkVersion`, `packaging` (`war` / `ear` / `jar` / `pom` — solo si se declara), `springFrameworkVersion` (también se rellena en proyectos Boot que fijan la versión del Framework de forma explícita), `sourceLayout: "legacy"` cuando la raíz de fuentes no es `src/main/java`.

**Política de versiones.** Toda cadena de versión es una subcadena de un archivo de build, del nombre de un jar, o de una variable o propiedad definida en el mismo proyecto. Un `${var}` que no se puede resolver da `null`, nunca el literal; un `spring.jar` de la era Spring 2.0 sin versión en el nombre reporta el framework con `frameworkVersion: null`. Nada se toma de los valores por defecto del framework.

**Precedencia.** Primero los archivos de build (Gradle / Maven), luego los manifiestos de Node / Python, y por último la evidencia heredada anterior. Esa evidencia solo puede rellenar un lenguaje que nadie reclamó, o recuperar un lenguaje Node *provisional* (un `package.json` raíz sin framework ni framework de frontend detectado — herramientas de assets), y únicamente con evidencia fuerte: `build.xml`, un `.project` con javanature, un build file hermano o `WEB-INF/web.xml`. Un proyecto Next.js o Django nunca pasa a Java por un `.idea/` suelto o un jar vendorizado; un directorio de jars sin fuentes `*.java` no reclama nada.

**Protección contra falsos positivos.** Un proyecto JVM sin Spring alguno (`java-library`, `application`, `war` solo de servlets, Struts 1/2 por su cuenta) se reporta como Java con `framework: null`. `com.android.application` no es el plugin JVM `application`. Un proyecto Kotlin que usa Spring Framework sigue siendo `language: kotlin`.

**Raíces de fuentes.** `scan-java` reescribe sus patrones `src/main/java` / `src/main/resources` según la raíz descubierta. Si existe algún `[<module>/]src/main/java`, solo se usan esos. Si no, en orden: entradas `kind="src"` de `.classpath` (excluyendo carpetas de test), `<javac srcdir>` de `build.xml` (con resolución de `<property>`), y después `src/java`, `src`, `JavaSource`, `java`, `WebContent/WEB-INF/src` si contienen `*.java`. Luego se aplican los mismos cinco patrones de dominio, así que `src/com/acme/erp/controller/*.java` es Pattern C exactamente igual que si estuviera bajo `src/main/java`.

**Límites conocidos.** Los archivos Gradle no se limpian de comentarios (una coordenada comentada con `//` sigue contando — siempre ha sido así con Boot). No se resuelve la herencia de un pom padre externo al repositorio. La capa de controladores `web/` de eGovFrame todavía no se reconoce como nombre de capa para Pattern A/B. Un subdirectorio `controller/impl/` es registrado por el patrón A como un dominio llamado `impl`. Un controller cuyo nombre de clase no termina en `Controller` (`OrderResource`, `OrderEndpoint`) no es una señal del patrón F — desde v2.5.3 `init` lo indica en la fase 2 cuando un backend detectado no produce dominios.

Los helpers están en `plan-installer/jvm-detect.js` (funciones de texto puras, con tests unitarios aislados).

---

### Kotlin / Spring Boot

**Detectado cuando:** `build.gradle.kts` está presente y el plugin Kotlin se aplica junto con Spring Boot. Tiene ruta de código totalmente separada de Java: no reutiliza patrones Java.

**Detecta específicamente:**
- **CQRS:** paquetes command/query separados
- **BFF:** patrón backend-for-frontend
- **Multi-module Gradle:** `settings.gradle.kts` con `include(":module")`
- **Dominios shared query entre módulos:** `resolveSharedQueryDomains()` redistribuye archivos del módulo shared query con descomposición de package/class-name

**ORMs soportados:** Exposed, jOOQ, JPA (Hibernate), R2DBC.

**Por qué Kotlin tiene su propio scanner:** los patrones Java no encajan bien con codebases Kotlin. Los proyectos Kotlin tienden a CQRS y setups multi-módulo que la clasificación A-a-E de patrones Java no puede representar de forma limpia.

El scanner está en `plan-installer/scanners/scan-kotlin.js`.

---

### Node / Express

**Detectado cuando:** `express` está en las dependencies de `package.json`.

**El stack detector identifica:** ORM (Prisma / TypeORM / Sequelize / Drizzle / Knex / Mongoose), tipo de DB, package manager (npm / yarn / pnpm), uso de TypeScript.

**Descubrimiento de dominios:** el scanner Node.js compartido (`plan-installer/scanners/scan-node.js`) recorre `src/*/` (o `src/modules/*/` si hay módulos estilo NestJS), cuenta archivos que coinciden con `controller|router|route|handler`, `service`, `dto|schema|type`, y patrones entity/module/guard/pipe/interceptor. La misma ruta de código del scanner se usa para Express, Fastify y NestJS: el nombre del framework determina qué prompt de Pass 1 se selecciona, no qué scanner se ejecuta.

---

### Node / Fastify

**Detectado cuando:** `fastify` está en dependencies.

El descubrimiento de dominios usa el mismo scanner compartido `scan-node.js` descrito arriba. Pass 1 usa una plantilla de prompt específica de Fastify, que le pide a Claude buscar los patrones de plugin y schemas de ruta de Fastify.

---

### Node / NestJS

**Detectado cuando:** `@nestjs/core` está en dependencies.

El descubrimiento de dominios usa el scanner compartido `scan-node.js`. El layout estándar de NestJS `src/modules/<module>/` se detecta automáticamente (preferido sobre `src/*/` cuando ambos existen) y cada módulo pasa a ser un dominio. Pass 1 usa una plantilla de prompt específica de NestJS.

---

### Python / Django

**Detectado cuando:** la subcadena `django` (minúscula) aparece en `requirements.txt` o `pyproject.toml`. Las declaraciones estándar de package manager usan minúsculas, así que esto coincide con proyectos típicos.

**Descubrimiento de dominios:** el scanner recorre `**/models.py` y trata cada directorio con `models.py` como una app/dominio Django. (No parsea `INSTALLED_APPS` desde `settings.py`; la presencia en disco de `models.py` es la señal.)

**Estadísticas por dominio:** cuenta archivos que coinciden con `views`, `models`, `serializers`, `admin`, `forms`, `urls`, `tasks`.

---

### Python / FastAPI

**Detectado cuando:** `fastapi` está en dependencies.

**Descubrimiento de dominios:** glob `**/{router,routes,endpoints}*.py`. Cada directorio padre único pasa a ser un dominio. El scanner no parsea las llamadas `APIRouter(...)`; la señal es el nombre del archivo.

**ORMs detectados por stack-detector:** SQLAlchemy, Tortoise ORM.

---

### Python / Flask

**Detectado cuando:** `flask` está en dependencies.

**Descubrimiento de dominios:** usa el mismo glob `**/{router,routes,endpoints}*.py` que FastAPI. Si eso no produce nada, el scanner cae a directorios `{app,src/app}/*/`.

**Fallback flat-project (v1.7.1):** si no encuentra candidatos a dominio, el scanner busca `{main,app}.py` en la raíz del proyecto y trata el proyecto como una "app" de un único dominio.

---

## Stacks frontend (4)

### Node / Next.js

**Detectado cuando:** `next.config.{ts,js}` existe, O `next` está en las dependencies de `package.json`.

**Detecta convención de routing:**

- **App Router** (Next.js 13+): directorio `app/` con `page.tsx`/`layout.tsx`
- **Pages Router** (legacy): directorio `pages/`
- **FSD (Feature-Sliced Design):** `src/features/`, `src/widgets/`, `src/entities/`

**El scanner extrae:**
- Modo de routing (App Router / Pages Router / FSD)
- Conteos de RSC vs Client component (Next.js App Router; cuenta archivos cuyo nombre contiene `client.` como `client.tsx`, no parsea directivas `"use client"` dentro del fuente)
- Lista de dominios desde `app/` o `pages/` (y `src/features/` etc. para FSD)

State management, styling y librerías de data-fetching no se detectan a nivel de scanner. Los prompts de Pass 1 le piden a Claude buscar esos patrones en el código fuente.

---

### Node / Vite

**Detectado cuando:** `vite.config.{ts,js}` existe, O `vite` está en dependencies.

El port por defecto es `5173` (convención Vite), aplicado como fallback de último recurso. El scanner no parsea `vite.config` para `server.port`; si tu proyecto declara un port en `.env*`, el env-parser lo recoge primero.

El stack detector identifica Vite en sí. El framework UI subyacente, cuando no es React (el fallback por defecto), lo identifica el LLM en Pass 1 desde el código fuente, no el scanner.

---

### Angular

**Detectado cuando:** `angular.json` está presente, O `@angular/core` está en dependencies.

**Detecta:**
- Estructura de **Feature module:** `src/app/<feature>/`
- **Workspaces de monorepo:** patrones genéricos `apps/*/src/app/*/` y `packages/*/src/app/*/` (funciona para layouts NX aunque `nx.json` no sea una señal de detección explícita)

El port por defecto es `4200` (convención Angular), aplicado como fallback de último recurso. El scanner lee `angular.json` solo para detección de stack, no para extracción de port; si tu proyecto declara el port en un archivo `.env*`, el env-parser lo recoge primero.

---

### Vue / Nuxt

**Detectado cuando:** `nuxt.config.{ts,js}` existe para Nuxt, O `vue` está en dependencies para Vue plano.

El scanner identifica el framework y corre la extracción de dominios frontend (patrones App/Pages/FSD/components). La detección de versión Nuxt y módulos (Pinia, VueUse, etc.) se delega a Pass 1: Claude lee el fuente e identifica lo que se usa, en lugar de que el scanner haga pattern-match sobre `package.json`.

---

## Proyectos multi-stack

Un proyecto con backend y frontend (por ejemplo, Spring Boot en `backend/` + Next.js en `frontend/`) está totalmente soportado.

Cada stack ejecuta su **propio scanner** con su **propio prompt de análisis**. La salida fusionada de Pass 2 cubre ambos stacks. Pass 3 genera archivos separados de rule y standard para cada uno, organizados así:

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

El typing `70.domains/{type}/` está **siempre activo**: incluso si tu proyecto es de un solo stack, el layout usa `70.domains/backend/` (o `frontend/`). Así, la convención queda uniforme: cuando un proyecto de un solo stack añade luego un segundo stack, no hace falta migrar nada.

**La detección multi-stack** capta:
- Un manifest de monorepo en la raíz del proyecto: `turbo.json`, `pnpm-workspace.yaml`, `lerna.json`
- Un `package.json` raíz con campo `workspaces`

Al detectar un monorepo, el scanner recorre `apps/*/package.json` y `packages/*/package.json` (más cualquier glob de workspace personalizado del manifest), fusiona las listas de dependencias, y corre scanners backend y frontend según se necesiten.

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

El scanner detecta `src/{platform}/{subapp}/` y emite cada `{platform}-{subapp}` como dominio separado. Palabras clave de plataforma por defecto:

- **Dispositivo / entorno objetivo:** `desktop`, `pc`, `web`, `mobile`, `mc`, `mo`, `sp`, `tablet`, `tab`, `pwa`, `tv`, `ctv`, `ott`, `watch`, `wear`
- **Tier de acceso / audiencia:** `admin`, `cms`, `backoffice`, `back-office`, `portal`

Añade palabras clave personalizadas con `frontendScan.platformKeywords` en `.claudeos-scan.json` (ver [advanced-config.md](advanced-config.md)).

**Regla single-SPA skip (v2.3.0):** si solo UNA palabra clave de plataforma coincide en el árbol del proyecto (por ejemplo, el proyecto tiene `src/admin/api/`, `src/admin/dto/`, `src/admin/routers/` sin otras plataformas), se omite la emisión de subapp. De lo contrario, las capas arquitectónicas (`api`, `dto`, `routers`) se emitirían falsamente como dominios feature.

Para forzar la emisión de subapp igual, pon `frontendScan.forceSubappSplit: true` en `.claudeos-scan.json`. Ver [advanced-config.md](advanced-config.md).

---

## Extracción de `.env` (v2.2.0+)

El scanner lee archivos `.env*` para configuración de runtime, para que los docs generados reflejen tu port, host y DB URL reales.

**Orden de búsqueda** (gana la primera coincidencia):

1. `.env.example` (canónico, commiteado)
2. `.env.local.example`
3. `.env.development.example`
4. `.env.sample`
5. `.env.template`
6. `.env`
7. `.env.local`
8. `.env.development`

**Redacción de variables sensibles:** las claves que coinciden con `PASSWORD`, `PASS`, `PW`, `PASSPHRASE`, `SECRET`, `TOKEN`, `API_KEY`, `CREDENTIAL`, `PRIVATE_KEY`, `JWT_SECRET`, `SSH_KEY`, `MASTER_KEY`, `SERVICE_ACCOUNT`, etc. se redactan automáticamente a `***REDACTED***` antes de copiarse a `project-analysis.json`. Cualquier otro valor con forma de URL (`DATABASE_URL`, `REDIS_URL`, `MONGO_URI`, `jdbc:postgresql://…`) ve sus credenciales enmascaradas como `***:***`, conservando esquema, host, puerto y ruta (`postgres://***:***@db.internal:5432/app`): el tipo de DB sigue siendo reconocible y la contraseña nunca llega al archivo. La propia detección del tipo de DB del scanner lee el texto crudo de `.env` directamente y no se ve afectada. Desde v2.5.2, un valor cuyo userinfo esa regla no puede reescribir se descarta ENTERO (`***REDACTED***`) en lugar de pasar tal cual: una contraseña con `/`, `?`, `#` o un espacio sin codificar, o que simplemente empieza por dígitos de modo que la authority truncada se lee como `host:port`. El host se pierde con él, e `init` nombra las claves afectadas en su resumen de la Fase 1 (`envInfo.credentialWarnings`, solo nombres, para el `.env` raíz y el propio de una SPA en subdirectorio). `envInfo.host` / `envInfo.apiTarget` pasan a ser `null` en vez de llevar el centinela al §3 de CLAUDE.md. Codifica la contraseña en porcentaje (`/` como `%2F`) para conservar el host. Los DSN de Oracle JDBC, que llevan las credenciales antes del connect descriptor en lugar de como userinfo de URL (`jdbc:oracle:thin:scott/tiger@//dbhost:1521/ORCL`, `…@dbhost:1521:ORCL`, `…@(DESCRIPTION=…)`, `jdbc:oracle:oci:user/pw@ALIAS`), se enmascaran desde v2.5.3 como `jdbc:oracle:thin:***/***@//dbhost:1521/ORCL` — host, puerto y nombre de servicio siguen visibles.

**Precedencia de resolución de port:**
1. `server.port` de `application.yml` de Spring Boot
2. Claves de port `.env` (16+ claves convencionales comprobadas, ordenadas por especificidad: específicas de Vite primero, `PORT` genérico al final)
3. Default del stack (FastAPI/Django=8000, Flask=5000, Vite=5173, Express/NestJS/Fastify=3000, default=8080)

El parser está en `lib/env-parser.js`. Los tests, en `tests/env-parser.test.js`.

---

## Lo que el scanner produce — `project-analysis.json`

Cuando Step A termina, encontrarás este archivo en `claudeos-core/generated/project-analysis.json`. Claves de nivel superior (varía por stack):

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

Puedes leer este archivo directamente para ver qué extrajo el scanner de tu proyecto.

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

Si tu proyecto tiene una estructura inusual o la auto-detección elige el stack equivocado, deja un archivo `.claudeos-scan.json` en la raíz del proyecto.

Ver [advanced-config.md](advanced-config.md) para los campos override disponibles.
