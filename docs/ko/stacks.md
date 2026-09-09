# 지원 스택

12개 스택을 프로젝트 파일에서 자동으로 감지합니다. **백엔드 8개** + **프론트엔드 4개**.

이 문서는 각 스택을 어떻게 감지하고 스택별 scanner가 무엇을 추출하는지 설명합니다. 다음 용도로 활용하세요:

- 사용 중인 스택이 지원되는지 확인.
- 문서를 만들기 전에 scanner가 Claude에게 어떤 사실을 넘기는지 파악.
- `claudeos-core/generated/project-analysis.json`에서 어떤 정보를 볼 수 있는지 확인.

프로젝트 구조가 비표준이라면 `.claudeos-scan.json`으로 override할 수 있습니다. 자세한 내용은 [advanced-config.md](advanced-config.md) 참고.

> 영문 원본: [docs/stacks.md](../stacks.md).

---

## 감지 과정

`init`을 실행하면 scanner가 프로젝트 루트에서 다음 파일을 대략 이 순서로 살펴봅니다:

| 파일 | 알려주는 정보 |
|---|---|
| `package.json` | Node.js 프로젝트, `dependencies`에서 프레임워크 추론 |
| `pom.xml` | Java/Maven 프로젝트 |
| `build.gradle` / `build.gradle.kts` | Java/Kotlin Gradle 프로젝트 |
| `pyproject.toml` / `requirements.txt` | Python 프로젝트, 패키지에서 프레임워크 추론 |
| `angular.json` | Angular 프로젝트 |
| `nuxt.config.{ts,js}` | Vue/Nuxt 프로젝트 |
| `next.config.{ts,js}` | Next.js 프로젝트 |
| `vite.config.{ts,js}` | Vite 프로젝트 |

하나도 매치되지 않으면 `init`은 추측하지 않고 명확한 에러를 내며 멈춥니다. LLM에게 알아내라고 시키지 않습니다. 조용히 잘못된 문서를 만드는 것보다 시끄럽게 실패하는 쪽이 낫기 때문입니다.

실제 감지 로직은 `plan-installer/stack-detector.js`에서 볼 수 있습니다.

---

## Backend stacks (8)

### Java / Spring Boot

**감지 조건:** `build.gradle` 또는 `pom.xml`에 `spring-boot-starter`가 포함되어 있을 때. Gradle plugin block을 보고 Java를 Kotlin과 분리해서 식별합니다.

**아키텍처 패턴 감지.** scanner는 프로젝트를 **5개 패턴 중 하나로** 분류합니다:

| Pattern | 예시 구조 |
|---|---|
| **A. Layer-first** | `controller/order/`, `service/order/`, `repository/order/` |
| **B. Domain-first** | `order/controller/`, `order/service/`, `order/repository/` |
| **C. Layer-then-domain** | `controller/order/sub1/`, `service/order/sub2/` |
| **D. Domain-then-layer** | `order/sub1/controller/`, `order/sub2/service/` |
| **E. Hexagonal / DDD** | `domain/`, `application/`, `infrastructure/`, `presentation/` |

패턴은 A → B/D → E → C 순서로 시도합니다. scanner에는 두 가지 보정이 들어 있습니다. (1) **root-package detection** — layer가 있는 파일의 80% 이상을 포함하는 가장 긴 package prefix를 선택합니다 (재실행해도 결과가 같습니다). (2) **deep-sweep fallback** (Pattern B/D 전용) — 표준 glob이 등록된 도메인에서 파일을 한 개도 찾지 못하면 `**/${domain}/**/*.java`로 다시 glob을 돌리고, 각 파일 경로를 따라 올라가며 가장 가까운 layer 디렉토리를 찾습니다. `core/{otherDomain}/{layer}/{domain}/` 같은 cross-domain coupling layout도 이렇게 잡아냅니다.

**추출되는 사실:**
- 스택, 프레임워크 버전, ORM (JPA / MyBatis / jOOQ)
- DB 종류 (Postgres / MySQL / Oracle / MariaDB / H2). H2는 `\bh2\b` word-boundary regex로 감지하므로 `oauth2`, `cache2k` 같은 false-positive를 피합니다.
- 패키지 매니저 (Gradle / Maven), build tool, logger (Logback / Log4j2)
- 도메인 목록과 파일 수 (controller, service, mapper, dto, MyBatis XML mapper)

scanner 코드는 `plan-installer/scanners/scan-java.js`에 있습니다.

---

### Java / Spring Framework (Boot 없음) 과 레거시 JVM (v2.5.1+) — 위 Java 스택의 변형, 템플릿 동일

**탐지 조건:** 빌드가 JVM 플러그인을 선언하거나, 그룹이 **정확히** `org.springframework` (Spring 1.x는 `springframework`) 인 의존성을 선언한 경우. Spring Boot 유무는 상관없습니다. `org.springframework.boot` / `.security` / `.data` / `.cloud` 는 별개 프로젝트이며 절대 Spring Framework로 보고되지 않습니다.

| 빌드 형태 | 읽는 근거 |
|---|---|
| Gradle, `apply plugin:` 시절 | `'java'` / `'java-library'` / `'war'` / `'ear'` / `'application'`; `compile 'org.springframework:spring-webmvc:4.3.30.RELEASE'`; `group: 'org.springframework', name: 'spring-webmvc', version: '3.2.18.RELEASE'`; `org.springframework:spring:2.5.6` (2.x 시절 단일 jar) |
| Gradle, `plugins { }` / Kotlin DSL | `id 'java'`, 맨 이름 `java` / `war` / `` `java-library` ``, `apply(plugin = "war")`; `platform()` / `mavenBom` 을 통한 `spring-framework-bom`; 버전 카탈로그 `module = "org.springframework:spring-…"` + `version.ref` |
| Gradle, 변수 | `ext { springVersion = '…' }`, `def` / `val`, **`gradle.properties`** (같은 파일 정의가 우선), `${project.x}` / `${rootProject.ext.x}`, Groovy 맵 `${versions.spring}`, buildSrc `${Versions.spring}`, `apply from:` 스크립트; Boot 1.x/2.x `buildscript { classpath("…:spring-boot-gradle-plugin:1.5.22.RELEASE") }`; `options.release = 17` |
| Spring 1.x | `org.` 없는 그룹 `springframework` (Maven / Gradle / Ivy) — `springframework:spring:1.2.9` |
| Maven | `<packaging>`; `<groupId>org.springframework</groupId>` 의존성 (주석 제거 후); `spring-framework-bom` import; `<spring.version>` / `<spring.maven.version>` 프로퍼티; `spring-boot-starter-parent` 의 `<version>`; `spring-boot-dependencies` BOM; `<maven.compiler.release>`; Maven 2 시절 `maven-compiler-plugin` 의 `<source>1.5</source>`; **멀티 모듈** `<modules>` 자식 (≤30) |
| 리포지토리 형태 | `settings.gradle` 만 있는 루트; 루트 빌드 파일 없이 `*/pom.xml` 형제 프로젝트 (깊이 1, ≤30) |
| IDE 메타데이터 | `.settings/org.eclipse.jdt.core.prefs` 의 compliance; `.classpath` 의 JRE 이름 (`jdk1.6.0_45`) 과 `kind="lib"/"var"` jar 경로 (jar 가 커밋되지 않아도 됨); `.idea/misc.xml` 의 `languageLevel`; `nbproject/project.properties` |
| Ant / Ivy | `build.xml` (`<javac source="1.6">`), `ivy.xml` (`org="org.springframework"` 정확 일치, `rev="…"`) |
| Eclipse WTP / 빌드 도구 없음 | `.classpath` 의 JRE 컨테이너 (`JavaSE-1.7`), `.project` 의 `javanature`; `**/{WEB-INF/lib,lib,libs}/**/*.jar` 파일명 → Spring 버전 (`spring-webmvc-3.0.5.RELEASE.jar`), JDBC 드라이버 (`ojdbc*`, `mysql-connector`, `mariadb-java-client`, `postgresql-`, `h2-`, `sqlite-jdbc`, `mssql-jdbc` / `jtds`, `db2jcc`, Tibero / Altibase / Cubrid), ORM (`ibatis-*`, `mybatis-*`, `hibernate-*`) — `*.java` 소스가 함께 있을 때만 |
| 배포 기술자 | `WEB-INF/web.xml` — `DispatcherServlet` / `ContextLoaderListener` (Spring MVC, `war`), Struts 필터 (태그), `<web-app version>`; Spring XML 의 `spring-*-3.0.xsd` → major.minor 버전, 우선순위 최하위 |
| eGovFrame | `egovframework.rte[.*]` 좌표 → `spring-framework` + `detected` 에 `egovframe <version>` 태그 |

**추출 항목 (위 Spring Boot 목록에 더해):** `frameworkVersion` 과 함께 `framework: "spring-framework"`, `packaging` (`war` / `ear` / `jar` / `pom` — 선언된 경우에만), `springFrameworkVersion` (Framework 버전을 명시적으로 고정한 Boot 프로젝트에서도 채워짐), 소스 루트가 `src/main/java` 가 아닐 때 `sourceLayout: "legacy"`.

**버전 정책.** 모든 버전 문자열은 빌드 파일, jar 이름, 또는 같은 프로젝트 안에 정의된 변수/프로퍼티의 부분 문자열입니다. 해석되지 않는 `${var}` 는 리터럴 대신 `null` 이 되고, 버전이 없는 Spring 2.0 시절 `spring.jar` 는 `frameworkVersion: null` 로 프레임워크만 보고합니다. 프레임워크 기본값에서 가져오는 값은 하나도 없습니다.

**우선순위.** 빌드 파일 (Gradle / Maven) 이 먼저, 그다음 Node / Python 매니페스트, 마지막이 위의 레거시 근거입니다. 레거시 근거는 아무도 주장하지 않은 언어를 채우거나, *잠정* Node 언어 (프레임워크도 프론트엔드 프레임워크도 없는 루트 `package.json` — 애셋 도구용) 를 되찾을 수 있을 뿐이며, 그것도 강한 근거 (`build.xml`, `.project` 의 javanature, 형제 빌드 파일, `WEB-INF/web.xml`) 가 있을 때만입니다. Next.js / Django 프로젝트가 떠도는 `.idea/` 나 벤더링된 jar 때문에 Java 로 뒤집히는 일은 없고, `*.java` 소스가 없는 jar 디렉터리는 아무것도 주장하지 않습니다.

**오탐 가드.** Spring 이 전혀 없는 JVM 프로젝트 (`java-library`, `application`, 서블릿만 쓰는 `war`, Struts 1/2 단독) 는 `framework: null` 인 Java 로 보고됩니다. `com.android.application` 은 JVM `application` 플러그인이 아닙니다. Spring Framework 를 쓰는 Kotlin 프로젝트는 `language: kotlin` 을 유지합니다.

**소스 루트.** `scan-java` 는 `src/main/java` / `src/main/resources` 패턴을 발견된 루트에 맞춰 다시 씁니다. `[<module>/]src/main/java` 가 하나라도 있으면 그것만 사용합니다. 없으면 순서대로: `.classpath` 의 `kind="src"` 항목 (테스트 폴더 제외), `build.xml` 의 `<javac srcdir>` (`<property>` 해석 포함), 그다음 `*.java` 를 담고 있는 `src/java`, `src`, `JavaSource`, `java`, `WebContent/WEB-INF/src`. 이후 동일한 5개 도메인 패턴이 적용되므로 `src/com/acme/erp/controller/*.java` 는 `src/main/java` 아래에 있을 때와 똑같이 Pattern C 입니다.

**알려진 한계.** Gradle 파일은 주석을 제거하지 않습니다 (`//` 로 주석 처리된 좌표도 계산됨 — Boot 에서도 늘 그랬습니다). 리포지토리 밖 부모 pom 으로부터의 상속은 해석하지 않습니다. eGovFrame 의 `web/` 컨트롤러 레이어는 아직 Pattern A/B 의 레이어 이름으로 인식되지 않습니다.

헬퍼는 `plan-installer/jvm-detect.js` 에 있습니다 (순수 텍스트 함수, 단위 테스트로 격리 검증).

---

### Kotlin / Spring Boot

**감지 조건:** `build.gradle.kts`가 있고 Kotlin plugin이 Spring Boot와 함께 적용된 경우. Java와는 완전히 별도의 코드 경로로 동작하므로 Java 패턴을 재사용하지 않습니다.

**구체적으로 감지하는 것:**
- **CQRS** — 분리된 command/query 패키지
- **BFF** — backend-for-frontend 패턴
- **Multi-module Gradle** — `settings.gradle.kts`에 `include(":module")` 선언이 있는 구조
- **모듈 간 공유 query 도메인** — `resolveSharedQueryDomains()`가 package/class-name 분해를 통해 공유 query 모듈 파일을 재분배

**지원하는 ORM:** Exposed, jOOQ, JPA (Hibernate), R2DBC.

**Kotlin이 별도 scanner를 갖는 이유.** Java 패턴이 Kotlin 코드베이스에는 잘 맞지 않습니다. Kotlin 프로젝트는 CQRS와 multi-module 구조를 선호하는 경향이 있어서 Java의 A~E 분류로는 깔끔하게 표현되지 않습니다.

scanner 코드는 `plan-installer/scanners/scan-kotlin.js`에 있습니다.

---

### Node / Express

**감지 조건:** `package.json`의 dependencies에 `express`가 있을 때.

**Stack detector가 식별하는 것:** ORM (Prisma / TypeORM / Sequelize / Drizzle / Knex / Mongoose), DB 종류, 패키지 매니저 (npm / yarn / pnpm), TypeScript 사용 여부.

**도메인 추출.** 공유 Node.js scanner(`plan-installer/scanners/scan-node.js`)가 `src/*/`를 순회하면서(NestJS 스타일 모듈이 있으면 `src/modules/*/` 사용) `controller|router|route|handler`, `service`, `dto|schema|type`, entity/module/guard/pipe/interceptor 패턴에 매치되는 파일 수를 셉니다. 같은 scanner 코드 경로를 Express, Fastify, NestJS가 모두 사용합니다. 프레임워크 이름은 어떤 Pass 1 prompt를 고를지를 결정할 뿐, 어떤 scanner가 도는지를 정하지 않습니다.

---

### Node / Fastify

**감지 조건:** dependencies에 `fastify`가 있을 때.

도메인 추출은 위에서 설명한 공유 `scan-node.js`를 사용합니다. Pass 1은 Fastify 전용 prompt 템플릿을 사용해, Fastify의 plugin 패턴과 route schema를 찾도록 Claude에게 요청합니다.

---

### Node / NestJS

**감지 조건:** dependencies에 `@nestjs/core`가 있을 때.

도메인 추출은 공유 `scan-node.js`를 사용합니다. NestJS 표준 레이아웃인 `src/modules/<module>/`가 자동으로 감지되고(둘 다 있으면 `src/*/`보다 우선), 각 모듈이 하나의 도메인이 됩니다. Pass 1은 NestJS 전용 prompt 템플릿을 사용합니다.

---

### Python / Django

**감지 조건:** `requirements.txt` 또는 `pyproject.toml`에 소문자 `django` 부분 문자열이 등장할 때. 일반적인 패키지 매니저 선언은 소문자를 쓰기 때문에 보통 프로젝트는 그대로 매치됩니다.

**도메인 추출.** scanner가 `**/models.py`를 순회하면서 `models.py`가 들어 있는 각 디렉토리를 Django app(도메인)으로 취급합니다. `settings.py`의 `INSTALLED_APPS`는 파싱하지 않습니다. 디스크 위 `models.py` 존재가 신호입니다.

**도메인별 통계:** `views`, `models`, `serializers`, `admin`, `forms`, `urls`, `tasks`에 매치되는 파일 수.

---

### Python / FastAPI

**감지 조건:** dependencies에 `fastapi`가 있을 때.

**도메인 추출:** `**/{router,routes,endpoints}*.py` glob을 사용합니다. 각 부모 디렉토리가 하나의 도메인이 됩니다. scanner는 `APIRouter(...)` 호출을 파싱하지 않습니다. 파일명이 신호입니다.

**Stack-detector가 감지하는 ORM:** SQLAlchemy, Tortoise ORM.

---

### Python / Flask

**감지 조건:** dependencies에 `flask`가 있을 때.

**도메인 추출:** FastAPI와 같은 `**/{router,routes,endpoints}*.py` glob을 사용합니다. 결과가 없으면 `{app,src/app}/*/` 디렉토리로 fallback합니다.

**Flat-project fallback (v1.7.1):** 도메인 후보가 하나도 없으면 scanner가 프로젝트 루트의 `{main,app}.py`를 찾아 single-domain "app" 프로젝트로 처리합니다.

---

## Frontend stacks (4)

### Node / Next.js

**감지 조건:** `next.config.{ts,js}`가 있거나 `package.json` dependencies에 `next`가 있을 때.

**라우팅 컨벤션 감지:**

- **App Router** (Next.js 13+) — `app/` 디렉토리에 `page.tsx`/`layout.tsx`
- **Pages Router** (legacy) — `pages/` 디렉토리
- **FSD (Feature-Sliced Design)** — `src/features/`, `src/widgets/`, `src/entities/`

**Scanner가 추출하는 것:**
- 라우팅 모드 (App Router / Pages Router / FSD)
- RSC vs Client 컴포넌트 수 (Next.js App Router 한정. `client.tsx` 같은 파일명 매칭으로 잡고, 소스 안의 `"use client"`를 파싱하진 않습니다)
- `app/` 또는 `pages/`의 도메인 목록 (FSD라면 `src/features/` 등)

상태 관리, 스타일링, data-fetching 라이브러리는 scanner 단계에서 감지하지 않습니다. 대신 Pass 1 prompt가 소스에서 해당 패턴을 찾도록 Claude에게 요청합니다.

---

### Node / Vite

**감지 조건:** `vite.config.{ts,js}`가 있거나 dependencies에 `vite`가 있을 때.

기본 port는 Vite 컨벤션인 `5173`이며, 마지막 fallback으로만 사용합니다. scanner는 `vite.config`의 `server.port`를 파싱하지 않습니다. `.env*`에 port가 선언돼 있으면 env-parser가 먼저 잡아냅니다.

stack detector가 잡아내는 건 Vite 자체까지입니다. 기본 fallback인 React가 아닌 UI 프레임워크라면 Pass 1에서 LLM이 소스를 직접 보고 식별합니다 (scanner가 아닙니다).

---

### Angular

**감지 조건:** `angular.json`이 있거나 dependencies에 `@angular/core`가 있을 때.

**감지하는 것:**
- **Feature module** 구조 — `src/app/<feature>/`
- **Monorepo workspaces** — 일반적인 `apps/*/src/app/*/`와 `packages/*/src/app/*/` 패턴. NX 레이아웃에서도 동작합니다 (`nx.json` 자체를 감지 신호로 쓰진 않습니다).

기본 port는 Angular 컨벤션인 `4200`이며, 마지막 fallback으로만 사용합니다. scanner는 stack 감지에만 `angular.json`을 읽고 port 추출에는 사용하지 않습니다. `.env*`에 port를 선언했다면 env-parser가 먼저 잡아냅니다.

---

### Vue / Nuxt

**감지 조건:** Nuxt는 `nuxt.config.{ts,js}` 존재 여부로, plain Vue는 dependencies에 `vue`가 있는지로 판별합니다.

scanner는 프레임워크를 식별하고 프론트엔드 도메인을 추출합니다 (App/Pages/FSD/components 패턴). Nuxt 버전이나 모듈 감지 (Pinia, VueUse 등)는 Pass 1에 맡깁니다. scanner가 `package.json`을 패턴 매칭하는 게 아니라, Claude가 소스를 직접 읽고 무엇이 쓰이는지 판별하는 방식입니다.

---

## 멀티 스택 프로젝트

백엔드와 프론트엔드가 함께 있는 프로젝트 (예: `backend/`의 Spring Boot + `frontend/`의 Next.js)도 그대로 지원합니다.

각 스택은 **자체 scanner**와 **자체 분석 prompt**로 돌아갑니다. 병합된 Pass 2 출력이 양쪽 스택을 모두 다루고, Pass 3가 스택별로 rule과 standard 파일을 따로 만들어 다음과 같이 정리합니다:

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

`70.domains/{type}/` 타입 분류는 **항상 활성화**됩니다. single-stack 프로젝트라도 layout은 `70.domains/backend/`(또는 `frontend/`)를 그대로 씁니다. 컨벤션을 일관되게 유지하면, single-stack 프로젝트에 나중에 두 번째 스택을 추가해도 마이그레이션이 필요 없습니다.

**멀티 스택 감지가 인식하는 것:**
- 프로젝트 루트의 monorepo manifest: `turbo.json`, `pnpm-workspace.yaml`, `lerna.json`
- 루트 `package.json`의 `workspaces` 필드

monorepo가 감지되면 scanner가 `apps/*/package.json`과 `packages/*/package.json`(manifest의 custom workspace glob 포함)을 순회하고, 의존성 목록을 병합한 뒤, 필요에 따라 백엔드와 프론트엔드 scanner를 모두 실행합니다.

---

## 프론트엔드 platform-split 감지

일부 프론트엔드 프로젝트는 최상위 레벨에서 platform별(PC, mobile, admin)로 정리되어 있습니다:

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

scanner는 `src/{platform}/{subapp}/`를 감지해서 각 `{platform}-{subapp}`을 별도 도메인으로 내보냅니다. 기본 platform 키워드는 다음과 같습니다:

- **Device / target environment:** `desktop`, `pc`, `web`, `mobile`, `mc`, `mo`, `sp`, `tablet`, `tab`, `pwa`, `tv`, `ctv`, `ott`, `watch`, `wear`
- **Access tier / audience:** `admin`, `cms`, `backoffice`, `back-office`, `portal`

`.claudeos-scan.json`의 `frontendScan.platformKeywords`로 직접 키워드를 추가할 수 있습니다 ([advanced-config.md](advanced-config.md) 참고).

**Single-SPA skip rule (v2.3.0):** 프로젝트 트리에서 platform 키워드가 단 하나만 매치되는 경우(예: 다른 platform 없이 `src/admin/api/`, `src/admin/dto/`, `src/admin/routers/`만 있는 프로젝트), subapp emission을 건너뜁니다. 그렇지 않으면 아키텍처 레이어(`api`, `dto`, `routers`)가 feature 도메인으로 잘못 잡힐 수 있기 때문입니다.

강제로 subapp을 내보내려면 `.claudeos-scan.json`에 `frontendScan.forceSubappSplit: true`를 설정하세요. [advanced-config.md](advanced-config.md) 참고.

---

## `.env` 추출 (v2.2.0+)

scanner는 `.env*` 파일을 읽어 런타임 설정을 가져옵니다. 생성된 문서에 실제 port, host, DB URL이 그대로 반영되도록 하기 위해서입니다.

**검색 순서** (첫 매치 우선):

1. `.env.example` (canonical, committed)
2. `.env.local.example`
3. `.env.development.example`
4. `.env.sample`
5. `.env.template`
6. `.env`
7. `.env.local`
8. `.env.development`

**민감 변수 마스킹:** `PASSWORD`, `PASS`, `PW`, `PASSPHRASE`, `SECRET`, `TOKEN`, `API_KEY`, `CREDENTIAL`, `PRIVATE_KEY`, `JWT_SECRET`, `SSH_KEY`, `MASTER_KEY`, `SERVICE_ACCOUNT` 등에 매치되는 키는 `project-analysis.json`에 복사되기 전에 자동으로 `***REDACTED***`로 가립니다. 그 밖의 URL 형태 값 (`DATABASE_URL`, `REDIS_URL`, `MONGO_URI`, `jdbc:postgresql://…`)은 자격 증명만 `***:***`로 가리고 scheme, host, port, path는 그대로 둡니다 (`postgres://***:***@db.internal:5432/app`). DB 종류는 여전히 알아볼 수 있고 비밀번호는 파일에 도달하지 않습니다. scanner 자체의 DB 종류 감지는 `.env` 원문을 직접 읽으므로 영향을 받지 않습니다. v2.5.2부터, 그 규칙으로 userinfo를 다시 쓸 수 없는 값은 그대로 통과시키지 않고 통째로 버립니다 (`***REDACTED***`). 비밀번호에 원시 `/`, `?`, `#`, 공백이 들어 있거나, 숫자로 시작해서 잘린 authority가 `host:port`로 읽히는 경우입니다. host도 함께 사라지며, `init`이 Phase 1 요약에서 해당 키 이름을 알려줍니다 (`envInfo.credentialWarnings`, 키 이름만, 루트 `.env`와 하위 SPA의 `.env` 양쪽). `envInfo.host` / `envInfo.apiTarget`은 sentinel을 CLAUDE.md 3절로 흘리지 않고 `null`이 됩니다. host를 보존하려면 비밀번호를 percent-encoding 하세요 (`/`는 `%2F`).

**Port 결정 우선순위:**
1. Spring Boot `application.yml`의 `server.port`
2. `.env`의 port 키 (16개 이상의 컨벤션 키를 specificity 순서로 검사. Vite 전용 키가 먼저, generic `PORT`가 마지막)
3. 스택 기본값 (FastAPI/Django=8000, Flask=5000, Vite=5173, Express/NestJS/Fastify=3000, 그 외=8080)

parser는 `lib/env-parser.js`에, 테스트는 `tests/env-parser.test.js`에 있습니다.

---

## Scanner가 만드는 결과 — `project-analysis.json`

Step A가 끝나면 `claudeos-core/generated/project-analysis.json`에서 이 파일을 확인할 수 있습니다. 최상위 키는 스택에 따라 다음과 같이 달라집니다:

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

이 파일을 직접 열어 보면 scanner가 프로젝트에서 정확히 무엇을 추출했는지 알 수 있습니다.

---

## 새 스택 추가하기

scanner 아키텍처는 모듈식입니다. 새 스택을 추가하려면 다음이 필요합니다:

1. `plan-installer/scanners/scan-<stack>.js` 파일 (도메인 추출 로직).
2. Claude prompt 템플릿 3개: `pass-prompts/templates/<stack>/`의 `pass1.md`, `pass2.md`, `pass3.md`.
3. `plan-installer/stack-detector.js`에 스택 감지 규칙 추가.
4. `bin/commands/init.js` dispatcher의 라우팅.
5. `tests/fixtures/<stack>/` 안의 fixture 프로젝트와 테스트.

전체 가이드와 참고 구현은 [CONTRIBUTING.md](../../CONTRIBUTING.md) 참고.

---

## Scanner 동작 override

프로젝트 구조가 비표준이거나 자동 감지가 잘못된 스택을 골랐다면, 프로젝트 루트에 `.claudeos-scan.json` 파일을 두면 됩니다.

설정 가능한 override 필드는 [advanced-config.md](advanced-config.md) 참고.
