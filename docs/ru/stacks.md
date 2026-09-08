# Поддерживаемые стеки

12 стеков, все определяются автоматически по файлам проекта. **8 backend** + **4 frontend**.

Эта страница описывает, как обнаруживается каждый стек и что извлекает per-stack сканер. Используйте её, чтобы:

- Проверить, поддерживается ли ваш стек.
- Понять, какие факты сканер передаст Claude перед генерацией docs.
- Увидеть, чего ожидать в `claudeos-core/generated/project-analysis.json`.

Если структура проекта необычна, см. [advanced-config.md](advanced-config.md) — override через `.claudeos-scan.json`.

> Английский оригинал: [docs/stacks.md](../stacks.md). Русский перевод синхронизирован с английским.

---

## Как работает обнаружение

Когда запускается `init`, сканер открывает следующие файлы в корне проекта примерно в таком порядке:

| Файл | Что сообщает сканеру |
|---|---|
| `package.json` | Node.js проект; framework через `dependencies` |
| `pom.xml` | Java/Maven проект |
| `build.gradle` / `build.gradle.kts` | Java/Kotlin Gradle проект |
| `pyproject.toml` / `requirements.txt` | Python проект; framework через пакеты |
| `angular.json` | Angular проект |
| `nuxt.config.{ts,js}` | Vue/Nuxt проект |
| `next.config.{ts,js}` | Next.js проект |
| `vite.config.{ts,js}` | Vite проект |

Если ничего не подходит, `init` останавливается с понятной ошибкой, а не угадывает. Никакого fallback «спросим LLM, пусть разбирается». Лучше упасть громко, чем тихо выдать неверные docs.

Сама логика обнаружения лежит в `plan-installer/stack-detector.js`, если хочется её прочитать.

---

## Backend стеки (8)

### Java / Spring Boot

**Определяется, когда:** `build.gradle` или `pom.xml` содержит `spring-boot-starter`. Java отделяется от Kotlin через блок Gradle plugin.

**Определение архитектурного паттерна.** Сканер классифицирует проект как **один из 5 паттернов**:

| Паттерн | Пример структуры |
|---|---|
| **A. Layer-first** | `controller/order/`, `service/order/`, `repository/order/` |
| **B. Domain-first** | `order/controller/`, `order/service/`, `order/repository/` |
| **C. Layer-then-domain** | `controller/order/sub1/`, `service/order/sub2/` |
| **D. Domain-then-layer** | `order/sub1/controller/`, `order/sub2/service/` |
| **E. Hexagonal / DDD** | `domain/`, `application/`, `infrastructure/`, `presentation/` |

Паттерны проверяются по порядку (A → B/D → E → C). У сканера есть ещё две доработки. (1) **root-package detection** выбирает самый длинный package prefix, который покрывает ≥80% layer-bearing файлов (детерминированно между перезапусками). (2) **deep-sweep fallback** для Pattern B/D: когда стандартные globs возвращают ноль файлов для зарегистрированного домена, сканер переглобирует `**/${domain}/**/*.java` и идёт по пути каждого файла, ища ближайший layer-каталог. Так ловятся cross-domain-coupling layouts вроде `core/{otherDomain}/{layer}/{domain}/`.

**Извлекаемые факты:**
- стек, версия framework, ORM (JPA / MyBatis / jOOQ);
- тип DB (Postgres / MySQL / Oracle / MariaDB / H2 — детекция H2 использует word-boundary regex `\bh2\b`, чтобы избежать false-positive на `oauth2`, `cache2k` и т.п.);
- package manager (Gradle / Maven), build tool, logger (Logback / Log4j2);
- domain list с количеством файлов (controllers, services, mappers, dtos, MyBatis XML mappers).

Сканер лежит в `plan-installer/scanners/scan-java.js`.

---

### Java / Spring Framework (без Boot) и legacy-JVM (v2.5.1+) — вариант Java-стека выше, тот же шаблон

**Определяется, когда:** сборка объявляет JVM-плагин либо зависимость, группа которой **в точности** `org.springframework` (или `springframework` для Spring 1.x) — с Spring Boot или без него. `org.springframework.boot` / `.security` / `.data` / `.cloud` — отдельные проекты и никогда не выводятся как Spring Framework.

| Форма сборки | Что читается |
|---|---|
| Gradle, эпоха `apply plugin:` | `'java'` / `'java-library'` / `'war'` / `'ear'` / `'application'`; `compile 'org.springframework:spring-webmvc:4.3.30.RELEASE'`; `group: 'org.springframework', name: 'spring-webmvc', version: '3.2.18.RELEASE'`; `org.springframework:spring:2.5.6` (единый jar эпохи 2.x) |
| Gradle, `plugins { }` / Kotlin DSL | `id 'java'`, голые `java` / `war` / `` `java-library` ``, `apply(plugin = "war")`; `spring-framework-bom` через `platform()` / `mavenBom`; каталог версий `module = "org.springframework:spring-…"` + `version.ref` |
| Gradle, переменные | `ext { springVersion = '…' }`, `def` / `val`, **`gradle.properties`** (определение в самом файле важнее), `${project.x}` / `${rootProject.ext.x}`, Groovy-карты `${versions.spring}`, buildSrc `${Versions.spring}`, скрипты `apply from:`; Boot 1.x/2.x `buildscript { classpath("…:spring-boot-gradle-plugin:1.5.22.RELEASE") }`; `options.release = 17` |
| Spring 1.x | группа `springframework` без `org.` (Maven / Gradle / Ivy) — `springframework:spring:1.2.9` |
| Maven | `<packaging>`; зависимости с `<groupId>org.springframework</groupId>` (комментарии вырезаны); импорт `spring-framework-bom`; свойства `<spring.version>` / `<spring.maven.version>`; `<version>` у `spring-boot-starter-parent`; BOM `spring-boot-dependencies`; `<maven.compiler.release>`; `<source>1.5</source>` в `maven-compiler-plugin` времён Maven 2; **многомодульность**: дети `<modules>` (≤30) |
| Формы репозитория | корень только с `settings.gradle`; в корне нет файла сборки, но есть соседние проекты `*/pom.xml` (глубина 1, ≤30) |
| Метаданные IDE | compliance из `.settings/org.eclipse.jdt.core.prefs`; имя JRE в `.classpath` (`jdk1.6.0_45`) и пути к jar с `kind="lib"/"var"` (сами jar могут отсутствовать в репозитории); `languageLevel` в `.idea/misc.xml`; `nbproject/project.properties` |
| Ant / Ivy | `build.xml` (`<javac source="1.6">`), `ivy.xml` (`org="org.springframework"` точное совпадение, `rev="…"`) |
| Eclipse WTP / без сборщика | контейнер JRE в `.classpath` (`JavaSE-1.7`), `javanature` в `.project`; имена jar из `**/{WEB-INF/lib,lib,libs}/**/*.jar` → версия Spring (`spring-webmvc-3.0.5.RELEASE.jar`), JDBC-драйвер (`ojdbc*`, `mysql-connector`, `mariadb-java-client`, `postgresql-`, `h2-`, `sqlite-jdbc`, `mssql-jdbc` / `jtds`, `db2jcc`, Tibero / Altibase / Cubrid), ORM (`ibatis-*`, `mybatis-*`, `hibernate-*`) — только если рядом есть исходники `*.java` |
| Дескриптор развёртывания | `WEB-INF/web.xml` — `DispatcherServlet` / `ContextLoaderListener` (Spring MVC, `war`), фильтры Struts (метка), `<web-app version>`; в Spring XML `spring-*-3.0.xsd` → версия major.minor, самый низкий приоритет |
| eGovFrame | координаты `egovframework.rte[.*]` → `spring-framework` плюс метка `egovframe <version>` в `detected` |

**Извлекаемые факты (в дополнение к списку Spring Boot выше):** `framework: "spring-framework"` вместе с `frameworkVersion`, `packaging` (`war` / `ear` / `jar` / `pom` — только если объявлен), `springFrameworkVersion` (заполняется и для Boot-проектов, явно фиксирующих версию Framework), `sourceLayout: "legacy"`, когда корень исходников не `src/main/java`.

**Политика версий.** Любая строка версии — подстрока файла сборки, имени jar либо переменной или свойства, определённых в том же проекте. Неразрешимый `${var}` даёт `null`, а не литерал; `spring.jar` эпохи Spring 2.0 без версии в имени сообщает только фреймворк с `frameworkVersion: null`. Ничто не берётся из значений по умолчанию фреймворка.

**Приоритет.** Сначала файлы сборки (Gradle / Maven), затем манифесты Node / Python, и только потом перечисленные выше legacy-признаки. Они могут лишь заполнить язык, который никто не занял, либо вернуть *предварительный* Node-язык (корневой `package.json` без обнаруженного фреймворка и фронтенд-фреймворка — инструменты для ассетов), и только при сильных признаках: `build.xml`, `.project` с javanature, файл сборки в соседнем каталоге или `WEB-INF/web.xml`. Проект на Next.js или Django никогда не станет Java из-за случайного `.idea/` или вендоренного jar; каталог с jar без исходников `*.java` не заявляет ничего.

**Защита от ложных срабатываний.** JVM-проект вовсе без Spring (`java-library`, `application`, чисто сервлетный `war`, Struts 1/2 сам по себе) выводится как Java с `framework: null`. `com.android.application` — не JVM-плагин `application`. Проект на Kotlin, использующий Spring Framework, остаётся `language: kotlin`.

**Корни исходников.** `scan-java` переписывает свои шаблоны `src/main/java` / `src/main/resources` под найденный корень. Если существует хотя бы один `[<module>/]src/main/java`, используются только они. Иначе по порядку: записи `kind="src"` из `.classpath` (тестовые каталоги исключаются), `<javac srcdir>` из `build.xml` (с разрешением `<property>`), затем `src/java`, `src`, `JavaSource`, `java`, `WebContent/WEB-INF/src`, если в них есть `*.java`. Дальше применяются те же пять доменных шаблонов, поэтому `src/com/acme/erp/controller/*.java` — это Pattern C ровно так же, как под `src/main/java`.

**Известные ограничения.** Файлы Gradle не очищаются от комментариев (координата, закомментированная через `//`, по-прежнему учитывается — для Boot так было всегда). Наследование от родительского pom вне репозитория не разрешается. Слой контроллеров `web/` в eGovFrame пока не распознаётся как имя слоя для Pattern A/B.

Вспомогательные функции — в `plan-installer/jvm-detect.js` (чистые текстовые функции, покрытые отдельными юнит-тестами).

---

### Kotlin / Spring Boot

**Определяется, когда:** присутствует `build.gradle.kts` и Kotlin plugin применён вместе со Spring Boot. Имеет полностью отдельный code path от Java и не переиспользует Java-паттерны.

**Специально определяет:**
- **CQRS** — отдельные command/query пакеты;
- **BFF** — паттерн backend-for-frontend;
- **Multi-module Gradle** — `settings.gradle.kts` с `include(":module")`;
- **Shared query domains across modules** — `resolveSharedQueryDomains()` перераспределяет файлы shared query модуля через декомпозицию package/class-name.

**Поддерживаемые ORM:** Exposed, jOOQ, JPA (Hibernate), R2DBC.

**Почему у Kotlin собственный сканер.** Java-паттерны плохо ложатся на Kotlin-кодовые базы. Kotlin-проекты тяготеют к CQRS и multi-module setup, которые Java-классификация A–E не представляет чисто.

Сканер лежит в `plan-installer/scanners/scan-kotlin.js`.

---

### Node / Express

**Определяется, когда:** `express` есть в `dependencies` `package.json`.

**Stack detector определяет:** ORM (Prisma / TypeORM / Sequelize / Drizzle / Knex / Mongoose), тип DB, package manager (npm / yarn / pnpm), использование TypeScript.

**Domain discovery:** общий Node.js-сканер (`plan-installer/scanners/scan-node.js`) обходит `src/*/` (или `src/modules/*/`, если есть NestJS-style модули), считает файлы, совпадающие с `controller|router|route|handler`, `service`, `dto|schema|type`, плюс паттерны entity/module/guard/pipe/interceptor. Тот же code path используется для Express, Fastify и NestJS: имя framework определяет, какой Pass 1 prompt будет выбран, а не какой сканер запустится.

---

### Node / Fastify

**Определяется, когда:** `fastify` есть в dependencies.

Domain discovery использует тот же общий сканер `scan-node.js`. Pass 1 берёт Fastify-специфичный prompt-шаблон, который просит Claude искать паттерны Fastify plugin и route schema.

---

### Node / NestJS

**Определяется, когда:** `@nestjs/core` есть в dependencies.

Domain discovery использует общий сканер `scan-node.js`. Стандартный layout `src/modules/<module>/` NestJS определяется автоматически (предпочитается `src/*/`, когда оба существуют), и каждый модуль становится доменом. Pass 1 берёт NestJS-специфичный prompt-шаблон.

---

### Python / Django

**Определяется, когда:** подстрока `django` (lowercase) появляется в `requirements.txt` или `pyproject.toml`. Стандартные декларации package manager используют lowercase, так что это совпадает с типичными проектами.

**Domain discovery:** сканер обходит `**/models.py` и считает каждый каталог, содержащий `models.py`, Django app/доменом. `INSTALLED_APPS` из `settings.py` он не парсит — сигналом служит наличие `models.py` на диске.

**Per-domain stats:** считает файлы, совпадающие с `views`, `models`, `serializers`, `admin`, `forms`, `urls`, `tasks`.

---

### Python / FastAPI

**Определяется, когда:** `fastapi` есть в dependencies.

**Domain discovery:** glob `**/{router,routes,endpoints}*.py`, и каждый уникальный родительский каталог становится доменом. Сканер не парсит вызовы `APIRouter(...)`, сигналом служит имя файла.

**ORM, определяемые stack-detector:** SQLAlchemy, Tortoise ORM.

---

### Python / Flask

**Определяется, когда:** `flask` есть в dependencies.

**Domain discovery:** использует тот же glob `**/{router,routes,endpoints}*.py`, что и FastAPI. Если он ничего не находит, сканер откатывается на каталоги `{app,src/app}/*/`.

**Flat-project fallback (v1.7.1).** Если кандидатов на домены не найдено, сканер ищет `{main,app}.py` в корне проекта и трактует проект как одно-доменный «app».

---

## Frontend стеки (4)

### Node / Next.js

**Определяется, когда:** существует `next.config.{ts,js}`, ИЛИ `next` есть в `dependencies` `package.json`.

**Определяет конвенцию маршрутизации:**

- **App Router** (Next.js 13+) — каталог `app/` с `page.tsx`/`layout.tsx`;
- **Pages Router** (legacy) — каталог `pages/`;
- **FSD (Feature-Sliced Design)** — `src/features/`, `src/widgets/`, `src/entities/`.

**Сканер извлекает:**
- routing mode (App Router / Pages Router / FSD);
- счётчики RSC vs Client component (для Next.js App Router — подсчётом файлов, в имени которых есть `client.`, например `client.tsx`, а не парсингом директив `"use client"` внутри исходников);
- domain list из `app/` или `pages/` (и `src/features/` и т.п. для FSD).

Библиотеки state management, styling и data-fetching на уровне сканера не определяются. Промпты Pass 1 просят Claude искать эти паттерны в исходниках самостоятельно.

---

### Node / Vite

**Определяется, когда:** существует `vite.config.{ts,js}`, ИЛИ `vite` есть в dependencies.

Порт по умолчанию — `5173` (конвенция Vite), применяется как fallback последней надежды. Сканер не парсит `vite.config` на предмет `server.port`. Если проект декларирует порт в `.env*`, env-parser подхватит его первым.

Stack detector идентифицирует сам Vite. Нижележащий UI-фреймворк (когда это не React, fallback по умолчанию) определяет LLM в Pass 1 по исходному коду, а не сканер.

---

### Angular

**Определяется, когда:** присутствует `angular.json`, ИЛИ `@angular/core` есть в dependencies.

**Определяет:**
- **Feature module** структура — `src/app/<feature>/`;
- **Monorepo workspaces** — универсальные паттерны `apps/*/src/app/*/` и `packages/*/src/app/*/` (работает для NX layouts, даже если сам `nx.json` не служит явным сигналом обнаружения).

Порт по умолчанию — `4200` (конвенция Angular), применяется как fallback последней надежды. Сканер читает `angular.json` только для stack detection, не для извлечения порта. Если проект декларирует порт в файле `.env*`, env-parser подхватит его первым.

---

### Vue / Nuxt

**Определяется, когда:** существует `nuxt.config.{ts,js}` для Nuxt, ИЛИ `vue` есть в dependencies для plain Vue.

Сканер идентифицирует framework и запускает frontend domain extraction (App/Pages/FSD/components-паттерны). Версия Nuxt и обнаружение модулей (Pinia, VueUse и т.д.) делегируются Pass 1: Claude читает исходники и определяет, что используется, а не сканер сопоставлением паттернов с `package.json`.

---

## Multi-stack проекты

Проект и с backend, и с frontend (например, Spring Boot в `backend/` + Next.js в `frontend/`) полностью поддерживается.

Каждый стек запускает **свой сканер** со **своим analysis prompt**. Объединённый Pass 2 покрывает оба стека. Pass 3 пишет отдельные rule- и standard-файлы для каждого, организованные так:

```
.claude/rules/
├── 10.backend/                  ← Spring Boot rules
├── 20.frontend/                 ← Next.js rules
└── 70.domains/
    ├── backend/                 ← per-backend-domain
    └── frontend/                ← per-frontend-domain

claudeos-core/standard/
├── 10.backend/
├── 20.frontend/
└── 70.domains/
    ├── backend/
    └── frontend/
```

Типизация `70.domains/{type}/` **всегда включена**: даже если проект single-stack, layout использует `70.domains/backend/` (или `frontend/`). Это сохраняет единообразную конвенцию: когда single-stack проект позже добавит второй стек, миграция не понадобится.

**Multi-stack detection** подхватывает:
- manifest monorepo в корне проекта: `turbo.json`, `pnpm-workspace.yaml`, `lerna.json`;
- корневой `package.json` с полем `workspaces`.

Когда обнаружен monorepo, сканер обходит `apps/*/package.json` и `packages/*/package.json` (плюс любые кастомные workspace globs из manifest), сливает списки зависимостей и запускает backend- и frontend-сканеры по необходимости.

---

## Обнаружение разделения по платформам (frontend)

Некоторые frontend-проекты организованы по платформам (PC, mobile, admin) на верхнем уровне:

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

Сканер определяет `src/{platform}/{subapp}/` и эмитит каждый `{platform}-{subapp}` как отдельный домен. Ключевые слова платформ по умолчанию:

- **Device / target environment:** `desktop`, `pc`, `web`, `mobile`, `mc`, `mo`, `sp`, `tablet`, `tab`, `pwa`, `tv`, `ctv`, `ott`, `watch`, `wear`.
- **Access tier / audience:** `admin`, `cms`, `backoffice`, `back-office`, `portal`.

Кастомные ключевые слова добавляются через `frontendScan.platformKeywords` в `.claudeos-scan.json` (см. [advanced-config.md](advanced-config.md)).

**Single-SPA skip rule (v2.3.0).** Если по дереву проекта совпадает ТОЛЬКО ОДНО ключевое слово платформы (например, в проекте есть `src/admin/api/`, `src/admin/dto/`, `src/admin/routers/` без других платформ), эмиссия subapp пропускается. Иначе архитектурные слои (`api`, `dto`, `routers`) ложно ушли бы как feature-домены.

Чтобы всё-таки принудительно эмитить subapp, поставьте `frontendScan.forceSubappSplit: true` в `.claudeos-scan.json`. См. [advanced-config.md](advanced-config.md).

---

## Извлечение `.env` (v2.2.0+)

Сканер читает файлы `.env*` для runtime-конфигурации, чтобы сгенерированные docs отражали реальные port, host и DB URL.

**Порядок поиска** (побеждает первое совпадение):

1. `.env.example` (canonical, committed)
2. `.env.local.example`
3. `.env.development.example`
4. `.env.sample`
5. `.env.template`
6. `.env`
7. `.env.local`
8. `.env.development`

**Маскирование чувствительных переменных:** ключи, совпадающие с `PASSWORD`, `PASS`, `PW`, `PASSPHRASE`, `SECRET`, `TOKEN`, `API_KEY`, `CREDENTIAL`, `PRIVATE_KEY`, `JWT_SECRET`, `SSH_KEY`, `MASTER_KEY`, `SERVICE_ACCOUNT` и т.п., автоматически меняются на `***REDACTED***` перед копированием в `project-analysis.json`. У любого другого значения в форме URL (`DATABASE_URL`, `REDIS_URL`, `MONGO_URI`, `jdbc:postgresql://…`) маскируются только учётные данные — они заменяются на `***:***`, а схема, хост, порт и путь сохраняются (`postgres://***:***@db.internal:5432/app`). Тип DB по-прежнему различим, пароль в файл не попадает. Собственное определение типа DB сканером читает сырой текст `.env` напрямую и не затрагивается.

**Приоритет разрешения порта:**
1. `application.yml` Spring Boot — `server.port`.
2. Ключи порта в `.env` (проверяется 16+ конвенциональных ключей, упорядоченных по специфичности: Vite-специфичные первыми, общий `PORT` последним).
3. Stack default (FastAPI/Django=8000, Flask=5000, Vite=5173, Express/NestJS/Fastify=3000, default=8080).

Парсер лежит в `lib/env-parser.js`. Тесты — в `tests/env-parser.test.js`.

---

## Что производит сканер — `project-analysis.json`

После завершения Step A файл лежит в `claudeos-core/generated/project-analysis.json`. Top-level ключи (зависят от стека):

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

Можно прочитать этот файл напрямую, чтобы увидеть, что именно сканер извлёк из проекта.

---

## Добавление нового стека

Архитектура сканера модульная. Чтобы добавить новый стек, нужно:

1. Файл `plan-installer/scanners/scan-<stack>.js` (логика domain extraction).
2. Три prompt-шаблона Claude: `pass1.md`, `pass2.md`, `pass3.md` под `pass-prompts/templates/<stack>/`.
3. Правила stack-detection в `plan-installer/stack-detector.js`.
4. Маршрутизация в dispatcher в `bin/commands/init.js`.
5. Тесты с fixture-проектом под `tests/fixtures/<stack>/`.

Полный гайд и эталонные реализации, с которых можно копировать, см. в [CONTRIBUTING.md](../../CONTRIBUTING.md).

---

## Override поведения сканера

Если у проекта необычная структура или авто-detection выбирает не тот стек, положите файл `.claudeos-scan.json` в корень проекта.

Доступные поля override см. в [advanced-config.md](advanced-config.md).
