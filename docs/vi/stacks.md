# Stacks được hỗ trợ

12 stack, tất cả tự động phát hiện từ tệp dự án. **8 backend** + **4 frontend**.

Trang này mô tả cách phát hiện từng stack và scanner theo stack trích xuất gì. Dùng để:

- Kiểm tra stack có được hỗ trợ.
- Hiểu sự kiện gì scanner sẽ truyền cho Claude trước khi sinh tài liệu.
- Biết kỳ vọng gì trong `claudeos-core/generated/project-analysis.json`.

Nếu cấu trúc dự án bất thường, xem [advanced-config.md](advanced-config.md) cho override `.claudeos-scan.json`.

> Bản gốc tiếng Anh: [docs/stacks.md](../stacks.md). Bản dịch tiếng Việt đồng bộ với bản tiếng Anh.

---

## Phát hiện hoạt động ra sao

Khi `init` chạy, scanner mở các tệp sau ở thư mục gốc dự án theo thứ tự đại khái:

| Tệp | Cho scanner biết gì |
|---|---|
| `package.json` | Dự án Node.js; framework qua `dependencies` |
| `pom.xml` | Dự án Java/Maven |
| `build.gradle` / `build.gradle.kts` | Dự án Java/Kotlin Gradle |
| `pyproject.toml` / `requirements.txt` | Dự án Python; framework qua packages |
| `angular.json` | Dự án Angular |
| `nuxt.config.{ts,js}` | Dự án Vue/Nuxt |
| `next.config.{ts,js}` | Dự án Next.js |
| `vite.config.{ts,js}` | Dự án Vite |

Nếu không khớp tệp nào, `init` dừng với lỗi rõ ràng thay vì đoán. (Không có fallback "nhờ LLM tự suy luận." Thà fail to còn hơn lặng lẽ sinh tài liệu sai.)

Scanner nằm ở `plan-installer/stack-detector.js` nếu muốn đọc logic phát hiện thực tế.

---

## Backend stacks (8)

### Java / Spring Boot

**Phát hiện khi:** `build.gradle` hoặc `pom.xml` chứa `spring-boot-starter`. Java nhận diện riêng với Kotlin qua khối plugin Gradle.

**Phát hiện architecture pattern.** Scanner xếp dự án vào **một trong 5 pattern**:

| Pattern | Cấu trúc ví dụ |
|---|---|
| **A. Layer-first** | `controller/order/`, `service/order/`, `repository/order/` |
| **B. Domain-first** | `order/controller/`, `order/service/`, `order/repository/` |
| **C. Layer-then-domain** | `controller/order/sub1/`, `service/order/sub2/` |
| **D. Domain-then-layer** | `order/sub1/controller/`, `order/sub2/service/` |
| **E. Hexagonal / DDD** | `domain/`, `application/`, `infrastructure/`, `presentation/` |

Pattern thử theo thứ tự (A → B/D → E → C). Scanner còn có hai tinh chỉnh: (1) **root-package detection** chọn prefix package dài nhất phủ ≥80% các tệp có layer (deterministic xuyên các lần chạy lại); (2) **deep-sweep fallback** cho Pattern B/D: khi glob tiêu chuẩn trả về 0 tệp cho một domain đã đăng ký, scanner re-glob `**/${domain}/**/*.java` và đi qua đường dẫn từng tệp để tìm thư mục layer gần nhất, bắt được các layout coupling cross-domain như `core/{otherDomain}/{layer}/{domain}/`.

**Sự kiện trích xuất:**
- Stack, framework version, ORM (JPA / MyBatis / jOOQ)
- Loại DB (Postgres / MySQL / Oracle / MariaDB / H2 — phát hiện H2 dùng regex word-boundary `\bh2\b` để tránh false-positive với `oauth2`, `cache2k`, v.v.)
- Package manager (Gradle / Maven), build tool, logger (Logback / Log4j2)
- Danh sách domain kèm số tệp (controllers, services, mappers, dtos, MyBatis XML mappers)

Scanner ở `plan-installer/scanners/scan-java.js`.

---

### Java / Spring Framework (không dùng Boot) và JVM cũ (v2.5.1+) — biến thể của stack Java ở trên, cùng template

**Nhận diện khi:** build khai báo một JVM plugin, hoặc một dependency có group **đúng bằng** `org.springframework` (hoặc `springframework` với Spring 1.x) — có hay không có Spring Boot. `org.springframework.boot` / `.security` / `.data` / `.cloud` là các project riêng và không bao giờ bị báo là Spring Framework.

| Dạng build | Bằng chứng được đọc |
|---|---|
| Gradle, thời `apply plugin:` | `'java'` / `'java-library'` / `'war'` / `'ear'` / `'application'`; `compile 'org.springframework:spring-webmvc:4.3.30.RELEASE'`; `group: 'org.springframework', name: 'spring-webmvc', version: '3.2.18.RELEASE'`; `org.springframework:spring:2.5.6` (jar đơn thời 2.x) |
| Gradle, `plugins { }` / Kotlin DSL | `id 'java'`, `java` / `war` / `` `java-library` `` viết trần, `apply(plugin = "war")`; `spring-framework-bom` qua `platform()` / `mavenBom`; version catalog `module = "org.springframework:spring-…"` + `version.ref` |
| Gradle, biến | `ext { springVersion = '…' }`, `def` / `val`, **`gradle.properties`** (định nghĩa trong chính file thắng), `${project.x}` / `${rootProject.ext.x}`, map Groovy `${versions.spring}`, buildSrc `${Versions.spring}`, script `apply from:`; Boot 1.x/2.x `buildscript { classpath("…:spring-boot-gradle-plugin:1.5.22.RELEASE") }`; `options.release = 17` |
| Spring 1.x | group `springframework` không có `org.` (Maven / Gradle / Ivy) — `springframework:spring:1.2.9` |
| Maven | `<packaging>`; dependency có `<groupId>org.springframework</groupId>` (đã bỏ comment); import `spring-framework-bom`; property `<spring.version>` / `<spring.maven.version>`; `<version>` của `spring-boot-starter-parent`; BOM `spring-boot-dependencies`; `<maven.compiler.release>`; `<source>1.5</source>` trong `maven-compiler-plugin` thời Maven 2; **multi-module**: các con của `<modules>` (≤30) |
| Hình dạng repository | root chỉ có `settings.gradle`; root không có build file nhưng có các project anh em `*/pom.xml` (độ sâu 1, ≤30) |
| Metadata của IDE | compliance trong `.settings/org.eclipse.jdt.core.prefs`; tên JRE trong `.classpath` (`jdk1.6.0_45`) và đường dẫn jar `kind="lib"/"var"` (jar không cần được commit); `languageLevel` trong `.idea/misc.xml`; `nbproject/project.properties` |
| Ant / Ivy | `build.xml` (`<javac source="1.6">`), `ivy.xml` (`org="org.springframework"` khớp chính xác, `rev="…"`) |
| Eclipse WTP / không build tool | JRE container trong `.classpath` (`JavaSE-1.7`), `javanature` trong `.project`; tên jar từ `**/{WEB-INF/lib,lib,libs}/**/*.jar` → version Spring (`spring-webmvc-3.0.5.RELEASE.jar`), driver JDBC (`ojdbc*`, `mysql-connector`, `mariadb-java-client`, `postgresql-`, `h2-`, `sqlite-jdbc`, `mssql-jdbc` / `jtds`, `db2jcc`, Tibero / Altibase / Cubrid), ORM (`ibatis-*`, `mybatis-*`, `hibernate-*`) — chỉ khi có source `*.java` bên cạnh |
| Deployment descriptor | `WEB-INF/web.xml` — `DispatcherServlet` / `ContextLoaderListener` (Spring MVC, `war`), filter Struts (nhãn), `<web-app version>`; XML của Spring `spring-*-3.0.xsd` → version major.minor, ưu tiên thấp nhất |
| eGovFrame | toạ độ `egovframework.rte[.*]` → `spring-framework` kèm nhãn `egovframe <version>` trong `detected` |

**Dữ kiện trích ra (ngoài danh sách Spring Boot ở trên):** `framework: "spring-framework"` cùng `frameworkVersion`, `packaging` (`war` / `ear` / `jar` / `pom` — chỉ khi được khai báo), `springFrameworkVersion` (cũng được điền cho project Boot ghim version Framework một cách tường minh), `sourceLayout: "legacy"` khi gốc source không phải `src/main/java`.

**Nguyên tắc về version.** Mọi chuỗi version đều là một chuỗi con của file build, tên jar, hoặc biến/property định nghĩa trong chính project đó. `${var}` không phân giải được cho ra `null` chứ không phải chuỗi nguyên văn; `spring.jar` thời Spring 2.0 không có version trong tên chỉ báo framework với `frameworkVersion: null`. Không giá trị nào lấy từ mặc định của framework.

**Thứ tự ưu tiên.** Trước hết là file build (Gradle / Maven), rồi tới manifest của Node / Python, cuối cùng mới tới các bằng chứng cũ ở trên. Chúng chỉ có thể điền vào một ngôn ngữ chưa ai nhận, hoặc lấy lại một ngôn ngữ Node *tạm thời* (`package.json` ở root không phát hiện framework lẫn framework frontend — tức là công cụ xử lý asset), và chỉ khi có bằng chứng mạnh: `build.xml`, `.project` có javanature, một build file anh em, hoặc `WEB-INF/web.xml`. Project Next.js hay Django không bao giờ bị lật sang Java vì một `.idea/` lạc hay một jar vendor; thư mục jar không có source `*.java` thì không nhận gì cả.

**Chống nhận nhầm.** Project JVM hoàn toàn không có Spring (`java-library`, `application`, `war` chỉ dùng servlet, Struts 1/2 đứng riêng) được báo là Java với `framework: null`. `com.android.application` không phải plugin `application` của JVM. Project Kotlin dùng Spring Framework vẫn giữ `language: kotlin`.

**Gốc source.** `scan-java` viết lại các pattern `src/main/java` / `src/main/resources` theo gốc tìm được. Nếu tồn tại bất kỳ `[<module>/]src/main/java` nào thì chỉ dùng chúng. Nếu không, theo thứ tự: các mục `kind="src"` trong `.classpath` (loại trừ thư mục test), `<javac srcdir>` trong `build.xml` (có phân giải `<property>`), rồi `src/java`, `src`, `JavaSource`, `java`, `WebContent/WEB-INF/src` nếu chứa `*.java`. Sau đó vẫn là năm domain pattern như cũ, nên `src/com/acme/erp/controller/*.java` là Pattern C y hệt như khi nằm dưới `src/main/java`.

**Giới hạn đã biết.** File Gradle không được bóc comment (một toạ độ bị `//` vẫn được tính — với Boot xưa nay vẫn vậy). Không phân giải kế thừa từ pom cha nằm ngoài repository. Từ v2.5.2, `web/` được nhận là lớp HTTP, nhưng chỉ với project không có thư mục `controller/` ở bất cứ đâu; trong cây trộn cả hai quy ước giữa các module, những module dùng `web/` vẫn giữ hành vi cũ (`controllers: 0`).

Các helper nằm trong `plan-installer/jvm-detect.js` (hàm xử lý văn bản thuần, có unit test riêng).

---

### Kotlin / Spring Boot

**Phát hiện khi:** `build.gradle.kts` hiện diện và Kotlin plugin áp dụng cùng Spring Boot. Code path hoàn toàn riêng với Java, không tái sử dụng pattern Java.

**Phát hiện cụ thể:**
- **CQRS**: package command/query tách riêng
- **BFF**: pattern backend-for-frontend
- **Multi-module Gradle**: `settings.gradle.kts` với `include(":module")`
- **Domain query dùng chung giữa các module**: `resolveSharedQueryDomains()` phân phối lại tệp module query dùng chung qua phân tích package/class-name

**ORM hỗ trợ:** Exposed, jOOQ, JPA (Hibernate), R2DBC.

**Vì sao Kotlin có scanner riêng:** pattern Java không hợp với codebase Kotlin. Dự án Kotlin có xu hướng theo CQRS và multi-module, mà cách phân loại pattern A đến E của Java không biểu đạt gọn ghẽ được.

Scanner ở `plan-installer/scanners/scan-kotlin.js`.

---

### Node / Express

**Phát hiện khi:** `express` có trong `dependencies` của `package.json`.

**Stack detector nhận diện:** ORM (Prisma / TypeORM / Sequelize / Drizzle / Knex / Mongoose), loại DB, package manager (npm / yarn / pnpm), có dùng TypeScript hay không.

**Khám phá domain:** scanner Node.js dùng chung (`plan-installer/scanners/scan-node.js`) đi qua `src/*/` (hoặc `src/modules/*/` nếu có module kiểu NestJS), đếm các tệp khớp `controller|router|route|handler`, `service`, `dto|schema|type`, và pattern entity/module/guard/pipe/interceptor. Cùng code path scanner dùng cho Express, Fastify và NestJS: tên framework quyết định chọn prompt Pass 1 nào, không phải scanner nào chạy.

---

### Node / Fastify

**Phát hiện khi:** `fastify` có trong dependencies.

Khám phá domain dùng cùng scanner `scan-node.js` mô tả ở trên. Pass 1 dùng template prompt riêng cho Fastify, yêu cầu Claude tìm pattern plugin và route schema của Fastify.

---

### Node / NestJS

**Phát hiện khi:** `@nestjs/core` có trong dependencies.

Khám phá domain dùng cùng scanner `scan-node.js`. Layout chuẩn `src/modules/<module>/` của NestJS tự động phát hiện (ưu tiên hơn `src/*/` khi cả hai cùng tồn tại) và mỗi module trở thành một domain. Pass 1 dùng template prompt riêng cho NestJS.

---

### Python / Django

**Phát hiện khi:** chuỗi con `django` (chữ thường) xuất hiện trong `requirements.txt` hoặc `pyproject.toml`. Khai báo package manager chuẩn dùng chữ thường, nên khớp hầu hết dự án.

**Khám phá domain:** scanner đi qua `**/models.py` và coi mỗi thư mục chứa `models.py` là một app/domain Django. (Không parse `INSTALLED_APPS` từ `settings.py`: chính `models.py` trên đĩa là tín hiệu.)

**Stats theo domain:** đếm tệp khớp `views`, `models`, `serializers`, `admin`, `forms`, `urls`, `tasks`.

---

### Python / FastAPI

**Phát hiện khi:** `fastapi` có trong dependencies.

**Khám phá domain:** glob `**/{router,routes,endpoints}*.py`, mỗi thư mục cha duy nhất thành một domain. Scanner không parse các lời gọi `APIRouter(...)`; tên tệp là tín hiệu.

**ORM mà stack-detector phát hiện:** SQLAlchemy, Tortoise ORM.

---

### Python / Flask

**Phát hiện khi:** `flask` có trong dependencies.

**Khám phá domain:** dùng cùng glob `**/{router,routes,endpoints}*.py` y như FastAPI. Nếu không trả gì, scanner fallback sang thư mục `{app,src/app}/*/`.

**Flat-project fallback (v1.7.1):** Nếu không tìm thấy ứng viên domain nào, scanner tìm `{main,app}.py` ở thư mục gốc dự án và xử lý dự án như một "app" single-domain.

---

## Frontend stacks (4)

### Node / Next.js

**Phát hiện khi:** `next.config.{ts,js}` tồn tại, HOẶC `next` có trong `dependencies` của `package.json`.

**Phát hiện routing convention:**

- **App Router** (Next.js 13+): thư mục `app/` với `page.tsx`/`layout.tsx`
- **Pages Router** (legacy): thư mục `pages/`
- **FSD (Feature-Sliced Design)**: `src/features/`, `src/widgets/`, `src/entities/`

**Scanner trích xuất:**
- Routing mode (App Router / Pages Router / FSD)
- Số RSC vs Client component (Next.js App Router — đếm tệp có tên chứa `client.` như `client.tsx`, không parse chỉ thị `"use client"` bên trong nguồn)
- Danh sách domain từ `app/` hoặc `pages/` (và `src/features/` v.v. cho FSD)

State management, styling và data-fetching không phát hiện ở mức scanner. Prompt Pass 1 yêu cầu Claude tìm các pattern đó trong mã nguồn thay thế.

---

### Node / Vite

**Phát hiện khi:** `vite.config.{ts,js}` tồn tại, HOẶC `vite` có trong dependencies.

Port mặc định là `5173` (quy ước Vite), áp dụng như fallback cuối. Scanner không parse `vite.config` cho `server.port`; nếu dự án khai báo port trong `.env*`, env-parser sẽ nhặt được trước.

Stack detector nhận diện chính Vite. UI framework bên dưới (khi không phải React, fallback mặc định) do LLM nhận diện ở Pass 1 từ mã nguồn, không phải scanner.

---

### Angular

**Phát hiện khi:** `angular.json` hiện diện, HOẶC `@angular/core` có trong dependencies.

**Phát hiện:**
- Cấu trúc **Feature module**: `src/app/<feature>/`
- **Monorepo workspaces**: pattern chung `apps/*/src/app/*/` và `packages/*/src/app/*/` (chạy được cho layout NX dù `nx.json` không phải tín hiệu phát hiện rõ ràng)

Port mặc định là `4200` (quy ước Angular), áp dụng như fallback cuối. Scanner đọc `angular.json` chỉ để phát hiện stack, không trích port; nếu dự án khai báo port trong tệp `.env*`, env-parser nhặt được trước.

---

### Vue / Nuxt

**Phát hiện khi:** `nuxt.config.{ts,js}` tồn tại cho Nuxt, HOẶC `vue` có trong dependencies cho Vue thuần.

Scanner nhận diện framework và chạy trích xuất domain frontend (pattern App/Pages/FSD/components). Nhận diện phiên bản Nuxt và phát hiện module (Pinia, VueUse, v.v.) ủy thác cho Pass 1: Claude đọc nguồn và xác định cái gì được dùng, thay vì để scanner pattern-match `package.json`.

---

## Dự án multi-stack

Một dự án có cả backend và frontend (ví dụ Spring Boot trong `backend/` + Next.js trong `frontend/`) hỗ trợ trọn vẹn.

Mỗi stack chạy **scanner riêng** với **prompt phân tích riêng**. Output Pass 2 đã merge phủ cả hai stack. Pass 3 sinh các tệp rule và standard riêng cho từng stack, tổ chức như sau:

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

Phân loại `70.domains/{type}/` **luôn bật**: ngay cả khi dự án single-stack, layout vẫn dùng `70.domains/backend/` (hoặc `frontend/`). Cách này giữ quy ước đồng nhất: nếu một dự án single-stack sau này thêm stack thứ hai, khỏi cần migration.

**Phát hiện multi-stack** nhận:
- Một manifest monorepo ở thư mục gốc dự án: `turbo.json`, `pnpm-workspace.yaml`, `lerna.json`
- Một `package.json` ở gốc với trường `workspaces`

Khi phát hiện monorepo, scanner đi qua `apps/*/package.json` và `packages/*/package.json` (cộng các glob workspace tùy chỉnh từ manifest), merge danh sách dependency, và chạy cả scanner backend lẫn frontend nếu cần.

---

## Phát hiện platform-split frontend

Một số dự án frontend tổ chức theo platform (PC, mobile, admin) ở cấp cao nhất:

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

Scanner phát hiện `src/{platform}/{subapp}/` và tách mỗi `{platform}-{subapp}` thành một domain riêng. Từ khóa platform mặc định:

- **Device / target environment:** `desktop`, `pc`, `web`, `mobile`, `mc`, `mo`, `sp`, `tablet`, `tab`, `pwa`, `tv`, `ctv`, `ott`, `watch`, `wear`
- **Access tier / audience:** `admin`, `cms`, `backoffice`, `back-office`, `portal`

Thêm từ khóa tùy chỉnh qua `frontendScan.platformKeywords` trong `.claudeos-scan.json` (xem [advanced-config.md](advanced-config.md)).

**Quy tắc skip single-SPA (v2.3.0):** Nếu chỉ MỘT từ khóa platform khớp trong toàn cây dự án (ví dụ dự án có `src/admin/api/`, `src/admin/dto/`, `src/admin/routers/` mà không có platform khác), scanner bỏ qua khâu tách subapp. Nếu không, các layer kiến trúc (`api`, `dto`, `routers`) sẽ bị nhận nhầm thành domain feature.

Để buộc tách subapp, đặt `frontendScan.forceSubappSplit: true` trong `.claudeos-scan.json`. Xem [advanced-config.md](advanced-config.md).

---

## Trích xuất `.env` (v2.2.0+)

Scanner đọc tệp `.env*` lấy cấu hình runtime, để tài liệu sinh ra phản ánh đúng port, host, DB URL thật.

**Thứ tự tìm kiếm** (khớp đầu tiên thắng):

1. `.env.example` (canonical, được commit)
2. `.env.local.example`
3. `.env.development.example`
4. `.env.sample`
5. `.env.template`
6. `.env`
7. `.env.local`
8. `.env.development`

**Redact biến nhạy cảm:** key khớp `PASSWORD`, `PASS`, `PW`, `PASSPHRASE`, `SECRET`, `TOKEN`, `API_KEY`, `CREDENTIAL`, `PRIVATE_KEY`, `JWT_SECRET`, `SSH_KEY`, `MASTER_KEY`, `SERVICE_ACCOUNT`, v.v. tự động redact thành `***REDACTED***` trước khi sao vào `project-analysis.json`. Mọi giá trị dạng URL khác (`DATABASE_URL`, `REDIS_URL`, `MONGO_URI`, `jdbc:postgresql://…`) được che phần thông tin đăng nhập thành `***:***`, còn scheme, host, port và path giữ nguyên (`postgres://***:***@db.internal:5432/app`): vẫn nhận ra được loại DB, còn mật khẩu không bao giờ vào tệp. Phần phát hiện loại DB của chính scanner đọc trực tiếp văn bản `.env` gốc nên không bị ảnh hưởng. Nếu mật khẩu chứa `/`, `?` hoặc `#` thô (mật khẩu sinh bằng base64 rất hay gặp), phần authority của URL trở nên nhập nhằng, nên từ v2.5.2 giá trị như vậy bị bỏ nguyên (`***REDACTED***`) thay vì chỉ che một phần. Host mất theo, và `init` nêu tên các key bị ảnh hưởng trong tóm tắt Phase 1 (`envInfo.credentialWarnings`, chỉ tên key). Hãy percent-encode mật khẩu (`/` thành `%2F`) để giữ lại host.

**Thứ tự ưu tiên xác định port:**
1. `server.port` của Spring Boot `application.yml`
2. Key port trong `.env` (kiểm 16+ key quy ước, sắp xếp theo độ cụ thể: Vite-specific trước, `PORT` chung cuối)
3. Mặc định stack (FastAPI/Django=8000, Flask=5000, Vite=5173, Express/NestJS/Fastify=3000, mặc định=8080)

Parser ở `lib/env-parser.js`. Test ở `tests/env-parser.test.js`.

---

## Scanner sản sinh gì — `project-analysis.json`

Sau khi Step A xong, sẽ thấy tệp này ở `claudeos-core/generated/project-analysis.json`. Top-level key (tùy stack):

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
    "envInfo": { "source": ".env.example", "vars": {...}, "portVars": {...}, "credentialWarnings": [], "port": 8080, "host": "localhost", "apiTarget": null },
    "detected": ["spring-boot", "mybatis", "postgres", "gradle", "logback"]
  },
  "domains": ["order", "customer", "product", ...],
  "domainStats": { "order": { "controllers": 1, "services": 2, "mappers": 1, "dtos": 4, "xmlMappers": 1 }, ... },
  "architecturePattern": "B",  // for Java
  "monorepo": null,  // hoặc { "type": "turborepo", "workspaces": [...] }
  "frontend": null   // hoặc { "framework": "next.js", "routingMode": "app-router", ... }
}
```

Có thể đọc trực tiếp tệp này để xem chính xác scanner đã trích gì từ dự án.

---

## Thêm stack mới

Kiến trúc scanner có tính module. Thêm stack mới cần:

1. Một tệp `plan-installer/scanners/scan-<stack>.js` (logic trích xuất domain).
2. Ba template prompt Claude: `pass1.md`, `pass2.md`, `pass3.md` dưới `pass-prompts/templates/<stack>/`.
3. Quy tắc phát hiện stack thêm vào `plan-installer/stack-detector.js`.
4. Routing vào dispatcher trong `bin/commands/init.js`.
5. Test với dự án fixture dưới `tests/fixtures/<stack>/`.

Xem [CONTRIBUTING.md](../../CONTRIBUTING.md) cho hướng dẫn đầy đủ và implementation tham chiếu để sao chép.

---

## Override hành vi scanner

Nếu dự án có cấu trúc bất thường hoặc auto-detect chọn nhầm stack, đặt tệp `.claudeos-scan.json` vào thư mục gốc dự án.

Các trường override khả dụng xem [advanced-config.md](advanced-config.md).
