# 지원 스택

12개 스택, 모두 프로젝트 파일에서 자동 감지. **8개 backend** + **4개 frontend**.

이 문서는 각 스택이 어떻게 감지되며 스택별 scanner가 무엇을 추출하는지 설명합니다. 다음 용도로 활용하세요:

- 자기 스택이 지원되는지 확인.
- docs 생성 전에 scanner가 Claude에게 전달할 사실을 이해.
- `claudeos-core/generated/project-analysis.json`에서 무엇을 볼 수 있는지 확인.

프로젝트 구조가 비표준이라면 `.claudeos-scan.json` override는 [advanced-config.md](advanced-config.md) 참고.

> 영문 원본: [docs/stacks.md](../stacks.md).

---

## 감지가 어떻게 동작하나

`init`이 실행되면, scanner가 프로젝트 루트의 다음 파일을 대략 이 순서로 엽니다:

| 파일 | 알려주는 것 |
|---|---|
| `package.json` | Node.js 프로젝트; `dependencies`로 framework |
| `pom.xml` | Java/Maven 프로젝트 |
| `build.gradle` / `build.gradle.kts` | Java/Kotlin Gradle 프로젝트 |
| `pyproject.toml` / `requirements.txt` | Python 프로젝트; package로 framework |
| `angular.json` | Angular 프로젝트 |
| `nuxt.config.{ts,js}` | Vue/Nuxt 프로젝트 |
| `next.config.{ts,js}` | Next.js 프로젝트 |
| `vite.config.{ts,js}` | Vite 프로젝트 |

매치되는 게 없으면, `init`은 추측 대신 명확한 에러로 멈춥니다. (LLM에게 알아내라고 prompt하지 않음. 조용히 잘못된 docs를 만드는 것보다 시끄럽게 실패하는 게 낫다.)

scanner는 `plan-installer/stack-detector.js`에 있습니다 — 실제 감지 로직을 보고 싶다면.

---

## Backend stacks (8)

### Java / Spring Boot

**감지 조건:** `build.gradle` 또는 `pom.xml`이 `spring-boot-starter`를 포함. Gradle plugin block으로 Java가 Kotlin과 별도로 식별됨.

**Architecture pattern 감지.** scanner가 프로젝트를 **5개 패턴 중 하나로** 분류:

| Pattern | 예시 구조 |
|---|---|
| **A. Layer-first** | `controller/order/`, `service/order/`, `repository/order/` |
| **B. Domain-first** | `order/controller/`, `order/service/`, `order/repository/` |
| **C. Layer-then-domain** | `controller/order/sub1/`, `service/order/sub2/` |
| **D. Domain-then-layer** | `order/sub1/controller/`, `order/sub2/service/` |
| **E. Hexagonal / DDD** | `domain/`, `application/`, `infrastructure/`, `presentation/` |

패턴은 순서대로 시도됩니다 (A → B/D → E → C). scanner는 두 가지 보정도 가집니다: (1) **root-package detection** — layer를 가진 파일의 ≥80%를 커버하는 가장 긴 package prefix를 선택 (재실행 시 deterministic); (2) **deep-sweep fallback** for Pattern B/D — 표준 glob이 등록된 도메인에 대해 0개 파일을 반환하면, scanner가 `**/${domain}/**/*.java`를 다시 glob하여 각 파일의 경로를 따라가며 가장 가까운 layer dir을 찾음 — `core/{otherDomain}/{layer}/{domain}/` 같은 cross-domain coupling layout을 잡아냄.

**추출되는 사실:**
- Stack, framework version, ORM (JPA / MyBatis / jOOQ)
- DB 종류 (Postgres / MySQL / Oracle / MariaDB / H2 — H2 감지는 `\bh2\b` word-boundary regex로 `oauth2`, `cache2k` 등 false-positive 회피)
- Package manager (Gradle / Maven), build tool, logger (Logback / Log4j2)
- Domain list with 파일 수 (controllers, services, mappers, dtos, MyBatis XML mappers)

scanner는 `plan-installer/scanners/scan-java.js`에 있습니다.

---

### Kotlin / Spring Boot

**감지 조건:** `build.gradle.kts`가 존재하고 Kotlin plugin이 Spring Boot와 함께 적용됨. Java와 완전히 별도의 코드 경로 — Java 패턴을 재사용하지 않음.

**구체적으로 감지되는 것:**
- **CQRS** — 분리된 command/query 패키지
- **BFF** — backend-for-frontend 패턴
- **Multi-module Gradle** — `settings.gradle.kts`가 `include(":module")` 보유
- **Module 간 공유 query 도메인** — `resolveSharedQueryDomains()`가 package/class-name 분해를 통해 공유 query module 파일을 재분배

**지원되는 ORMs:** Exposed, jOOQ, JPA (Hibernate), R2DBC.

**Kotlin이 자체 scanner를 갖는 이유:** Java 패턴이 Kotlin 코드베이스에 잘 맞지 않습니다. Kotlin 프로젝트는 CQRS와 multi-module 구조를 선호하는 경향이 있어 Java의 A~E 분류로는 깔끔하게 표현할 수 없습니다.

scanner는 `plan-installer/scanners/scan-kotlin.js`에 있습니다.

---

### Node / Express

**감지 조건:** `express`가 `package.json` dependencies에 있음.

**Stack detector 식별:** ORM (Prisma / TypeORM / Sequelize / Drizzle / Knex / Mongoose), DB 종류, package manager (npm / yarn / pnpm), TypeScript 사용 여부.

**Domain 발견:** 공유 Node.js scanner (`plan-installer/scanners/scan-node.js`)가 `src/*/` (또는 NestJS-style modules가 있으면 `src/modules/*/`)를 순회하며 `controller|router|route|handler`, `service`, `dto|schema|type` 패턴, entity/module/guard/pipe/interceptor 패턴 매칭 파일 수를 셉니다. 같은 scanner code path가 Express, Fastify, NestJS 모두에 사용됩니다 — framework 이름은 어떤 Pass 1 prompt를 선택하느냐를 결정할 뿐, 어떤 scanner가 실행되느냐가 아닙니다.

---

### Node / Fastify

**감지 조건:** `fastify`가 dependencies에 있음.

Domain 발견은 위에서 설명한 공유 `scan-node.js`를 사용합니다. Pass 1은 Fastify의 plugin 패턴과 route schema를 찾도록 Claude에게 요청하는 Fastify-specific prompt 템플릿을 사용.

---

### Node / NestJS

**감지 조건:** `@nestjs/core`가 dependencies에 있음.

Domain 발견은 공유 `scan-node.js`를 사용합니다. NestJS의 표준 `src/modules/<module>/` 레이아웃이 자동 감지되며 (둘 다 존재할 때 `src/*/`보다 우선), 각 module이 도메인이 됩니다. Pass 1은 NestJS-specific prompt 템플릿을 사용.

---

### Python / Django

**감지 조건:** `requirements.txt` 또는 `pyproject.toml`에 substring `django` (소문자)가 나타남. 표준 package manager 선언은 소문자를 쓰므로, 일반 프로젝트에 매치됩니다.

**Domain 발견:** scanner가 `**/models.py`를 순회하며 `models.py`를 포함한 각 디렉토리를 Django app/도메인으로 처리합니다. (`settings.py`의 `INSTALLED_APPS`를 파싱하지 않습니다 — disk 위 `models.py` 존재가 신호.)

**도메인별 stats:** `views`, `models`, `serializers`, `admin`, `forms`, `urls`, `tasks` 매칭 파일 수.

---

### Python / FastAPI

**감지 조건:** `fastapi`가 dependencies에 있음.

**Domain 발견:** glob `**/{router,routes,endpoints}*.py` — 각 unique 부모 디렉토리가 도메인. scanner는 `APIRouter(...)` 호출을 파싱하지 않음 — filename이 신호.

**Stack-detector가 감지하는 ORMs:** SQLAlchemy, Tortoise ORM.

---

### Python / Flask

**감지 조건:** `flask`가 dependencies에 있음.

**Domain 발견:** FastAPI와 동일한 `**/{router,routes,endpoints}*.py` glob을 사용. 결과가 없으면 scanner는 `{app,src/app}/*/` 디렉토리로 fallback.

**Flat-project fallback (v1.7.1):** 도메인 후보가 없으면, scanner가 프로젝트 루트의 `{main,app}.py`를 찾고 프로젝트를 single-domain "app"으로 처리.

---

## Frontend stacks (4)

### Node / Next.js

**감지 조건:** `next.config.{ts,js}`가 존재하거나, `next`가 `package.json` dependencies에 있음.

**Routing convention 감지:**

- **App Router** (Next.js 13+) — `app/` 디렉토리 + `page.tsx`/`layout.tsx`
- **Pages Router** (legacy) — `pages/` 디렉토리
- **FSD (Feature-Sliced Design)** — `src/features/`, `src/widgets/`, `src/entities/`

**Scanner 추출:**
- Routing mode (App Router / Pages Router / FSD)
- RSC vs Client component 수 (Next.js App Router — `client.tsx` 같은 이름 매칭으로, 소스 안의 `"use client"` 파싱 아님)
- `app/` 또는 `pages/`에서 도메인 list (FSD는 `src/features/` 등)

State management, styling, data-fetching 라이브러리는 scanner 레벨에서 감지하지 않습니다. Pass 1 prompt가 대신 그 패턴을 소스에서 찾도록 Claude에게 요청합니다.

---

### Node / Vite

**감지 조건:** `vite.config.{ts,js}`가 존재하거나, `vite`가 dependencies에 있음.

기본 port는 `5173` (Vite 컨벤션) — 마지막 fallback으로 적용. scanner는 `vite.config`의 `server.port`를 파싱하지 않음 — `.env*`에 port가 선언돼 있으면 env-parser가 먼저 잡아냄.

stack detector가 Vite 자체를 식별. 기본 fallback인 React가 아닌 다른 UI framework는 Pass 1에서 LLM이 소스로부터 식별 (scanner가 아님).

---

### Angular

**감지 조건:** `angular.json`이 있거나, `@angular/core`가 dependencies에 있음.

**감지:**
- **Feature module** 구조 — `src/app/<feature>/`
- **Monorepo workspaces** — 일반 `apps/*/src/app/*/`와 `packages/*/src/app/*/` 패턴 (NX layout에서도 작동, `nx.json` 자체가 명시적 감지 신호는 아님)

기본 port는 `4200` (Angular 컨벤션) — 마지막 fallback으로 적용. scanner는 stack 감지를 위해서만 `angular.json`을 읽으며, port 추출에는 사용하지 않음. 프로젝트가 `.env*`에 port를 선언했다면 env-parser가 먼저 잡아냄.

---

### Vue / Nuxt

**감지 조건:** Nuxt는 `nuxt.config.{ts,js}` 존재; plain Vue는 `vue`가 dependencies에 있음.

scanner가 framework를 식별하고 frontend domain 추출 (App/Pages/FSD/components 패턴)을 실행합니다. Nuxt 버전과 module 감지 (Pinia, VueUse 등)는 Pass 1로 위임 — scanner가 `package.json`을 패턴 매칭하는 게 아니라 Claude가 소스를 읽고 무엇이 사용되는지 식별합니다.

---

## Multi-stack 프로젝트

backend와 frontend가 모두 있는 프로젝트 (예: `backend/`의 Spring Boot + `frontend/`의 Next.js)도 완전히 지원됩니다.

각 스택은 **자체 scanner**와 **자체 분석 prompt**로 실행됩니다. 병합된 Pass 2 출력이 양쪽 스택 모두를 다룹니다. Pass 3가 각 스택에 대한 별도의 rule과 standard 파일을 생성하며 다음과 같이 정리됩니다:

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

`70.domains/{type}/` 타입 분류는 **항상 활성화** — 프로젝트가 single-stack이어도 layout은 `70.domains/backend/` (또는 `frontend/`)을 사용. 컨벤션을 일관되게 유지하면, single-stack 프로젝트가 나중에 두 번째 스택을 추가할 때 마이그레이션이 필요 없습니다.

**Multi-stack 감지가 인식하는 것:**
- 프로젝트 루트의 monorepo manifest: `turbo.json`, `pnpm-workspace.yaml`, `lerna.json`
- Root `package.json`의 `workspaces` 필드

monorepo가 감지되면, scanner가 `apps/*/package.json`과 `packages/*/package.json` (manifest의 모든 custom workspace glob 포함)을 순회하고, dependency list를 병합하며, 필요에 따라 backend와 frontend scanner를 모두 실행합니다.

---

## Frontend platform-split 감지

일부 frontend 프로젝트는 최상위 레벨에서 platform별 (PC, mobile, admin)로 정리됩니다:

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

scanner는 `src/{platform}/{subapp}/`를 감지하고 각 `{platform}-{subapp}`을 별도의 도메인으로 emit합니다. 기본 platform 키워드:

- **Device / target environment:** `desktop`, `pc`, `web`, `mobile`, `mc`, `mo`, `sp`, `tablet`, `tab`, `pwa`, `tv`, `ctv`, `ott`, `watch`, `wear`
- **Access tier / audience:** `admin`, `cms`, `backoffice`, `back-office`, `portal`

`.claudeos-scan.json`의 `frontendScan.platformKeywords`로 custom 키워드 추가 가능 ([advanced-config.md](advanced-config.md) 참고).

**Single-SPA skip rule (v2.3.0):** 프로젝트 트리에서 ONE platform 키워드만 매치되면 (예: 프로젝트에 다른 platform 없이 `src/admin/api/`, `src/admin/dto/`, `src/admin/routers/`만 있는 경우), subapp emission이 skip됩니다. 그러지 않으면 architectural layer (`api`, `dto`, `routers`)가 feature 도메인으로 잘못 emit될 수 있습니다.

강제로 subapp을 emit하려면 `.claudeos-scan.json`에 `frontendScan.forceSubappSplit: true`를 설정하세요. [advanced-config.md](advanced-config.md) 참고.

---

## `.env` 추출 (v2.2.0+)

scanner는 `.env*` 파일을 읽어 runtime 설정을 가져오므로, 생성된 docs가 실제 port, host, DB URL을 반영합니다.

**검색 순서** (첫 매치 wins):

1. `.env.example` (canonical, committed)
2. `.env.local.example`
3. `.env.development.example`
4. `.env.sample`
5. `.env.template`
6. `.env`
7. `.env.local`
8. `.env.development`

**Sensitive-variable 마스킹:** `PASSWORD`, `SECRET`, `TOKEN`, `API_KEY`, `CREDENTIAL`, `PRIVATE_KEY`, `JWT_SECRET` 등에 매치되는 키는 `project-analysis.json`에 복사되기 전에 자동으로 `***REDACTED***`로 마스킹됩니다. **예외:** `DATABASE_URL`은 화이트리스트 — scanner가 protocol을 통해 DB type을 감지해야 하기 때문.

**Port 해결 우선순위:**
1. Spring Boot `application.yml`의 `server.port`
2. `.env` port 키 (16+ 컨벤션 키 검사, specificity 순서 — Vite-specific 먼저, generic `PORT`는 마지막)
3. Stack 기본값 (FastAPI/Django=8000, Flask=5000, Vite=5173, Express/NestJS/Fastify=3000, default=8080)

parser는 `lib/env-parser.js`에 있습니다. 테스트는 `tests/env-parser.test.js`.

---

## Scanner가 만드는 것 — `project-analysis.json`

Step A 종료 후 `claudeos-core/generated/project-analysis.json`에서 이 파일을 볼 수 있습니다. Top-level 키 (스택에 따라 다름):

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
  "monorepo": null,  // 또는 { "type": "turborepo", "workspaces": [...] }
  "frontend": null   // 또는 { "framework": "next.js", "routingMode": "app-router", ... }
}
```

이 파일을 직접 읽어서 scanner가 프로젝트에서 정확히 무엇을 추출했는지 확인할 수 있습니다.

---

## 새 스택 추가하기

scanner 아키텍처는 모듈식입니다. 새 스택 추가에 필요한 것:

1. `plan-installer/scanners/scan-<stack>.js` 파일 (도메인 추출 로직).
2. 3개의 Claude prompt 템플릿: `pass-prompts/templates/<stack>/`의 `pass1.md`, `pass2.md`, `pass3.md`.
3. `plan-installer/stack-detector.js`에 stack 감지 규칙 추가.
4. `bin/commands/init.js` dispatcher에 routing.
5. `tests/fixtures/<stack>/`에 fixture 프로젝트 + 테스트.

전체 가이드와 참고 구현은 [CONTRIBUTING.md](../../CONTRIBUTING.md) 참고.

---

## Scanner 동작 override

프로젝트 구조가 비표준이거나 자동 감지가 잘못된 스택을 선택하면 프로젝트 루트에 `.claudeos-scan.json` 파일을 둡니다.

가능한 override 필드는 [advanced-config.md](advanced-config.md) 참고.
