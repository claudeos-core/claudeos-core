# Supported Stacks

12 Stacks, alle automatisch aus deinen Projektdateien erkannt. **8 Backend** + **4 Frontend**.

Diese Seite beschreibt, wie jeder Stack erkannt wird und was der jeweilige Scanner extrahiert. Nutze sie, um:

- zu prüfen, ob dein Stack unterstützt wird;
- zu verstehen, welche Fakten der Scanner vor der Doku-Generierung an Claude reicht;
- zu sehen, was dich in `claudeos-core/generated/project-analysis.json` erwartet.

Hat dein Projekt eine ungewöhnliche Struktur, siehe [advanced-config.md](advanced-config.md) zu den `.claudeos-scan.json`-Overrides.

> Englisches Original: [docs/stacks.md](../stacks.md). Die deutsche Übersetzung wird mit der englischen Version synchron gehalten.

---

## Wie die Erkennung funktioniert

Beim `init`-Lauf öffnet der Scanner diese Dateien im Projekt-Root grob in dieser Reihenfolge:

| Datei | Was sie dem Scanner mitteilt |
|---|---|
| `package.json` | Node.js-Projekt; Framework über `dependencies` |
| `pom.xml` | Java/Maven-Projekt |
| `build.gradle` / `build.gradle.kts` | Java/Kotlin-Gradle-Projekt |
| `pyproject.toml` / `requirements.txt` | Python-Projekt; Framework über Pakete |
| `angular.json` | Angular-Projekt |
| `nuxt.config.{ts,js}` | Vue/Nuxt-Projekt |
| `next.config.{ts,js}` | Next.js-Projekt |
| `vite.config.{ts,js}` | Vite-Projekt |

Trifft keine zu, bricht `init` mit einer klaren Fehlermeldung ab, statt zu raten. (Kein Fallback auf „LLM bitten, das herauszufinden". Lieber laut scheitern als still falsche Docs liefern.)

Der Scanner liegt in `plan-installer/stack-detector.js`, falls du die echte Erkennungslogik nachlesen willst.

---

## Backend-Stacks (8)

### Java / Spring Boot

**Erkannt, wenn:** `build.gradle` oder `pom.xml` `spring-boot-starter` enthält. Java wird über den Gradle-Plugin-Block getrennt von Kotlin identifiziert.

**Erkennung des Architekturmusters.** Der Scanner klassifiziert dein Projekt in **eines von 5 Mustern**:

| Muster | Beispielstruktur |
|---|---|
| **A. Layer-first** | `controller/order/`, `service/order/`, `repository/order/` |
| **B. Domain-first** | `order/controller/`, `order/service/`, `order/repository/` |
| **C. Layer-then-domain** | `controller/order/sub1/`, `service/order/sub2/` |
| **D. Domain-then-layer** | `order/sub1/controller/`, `order/sub2/service/` |
| **E. Hexagonal / DDD** | `domain/`, `application/`, `infrastructure/`, `presentation/` |

Muster werden in der Reihenfolge A → B/D → E → C probiert. Dazu kommen zwei Verfeinerungen: (1) **Root-Package-Erkennung** wählt das längste Paket-Präfix, das ≥80 % der layer-tragenden Dateien abdeckt (deterministisch über Re-Runs). (2) **Deep-Sweep-Fallback** für Muster B/D: Liefern die Standard-Globs für eine registrierte Domäne null Dateien, globbt der Scanner erneut `**/${domain}/**/*.java` und geht jeden Datei-Pfad durch, um das nächste Layer-Verzeichnis zu finden. Das deckt Cross-Domain-Coupling-Layouts wie `core/{otherDomain}/{layer}/{domain}/` auf.

**Extrahierte Fakten:**
- Stack, Framework-Version, ORM (JPA / MyBatis / jOOQ)
- DB-Typ (Postgres / MySQL / Oracle / MariaDB / H2). Die H2-Erkennung nutzt eine `\bh2\b`-Wortgrenzen-Regex, um False-Positives bei `oauth2`, `cache2k` etc. auszuschließen.
- Package Manager (Gradle / Maven), Build-Tool, Logger (Logback / Log4j2)
- Domain-Liste mit Dateizahlen (controllers, services, mappers, dtos, MyBatis-XML-Mapper)

Der Scanner liegt in `plan-installer/scanners/scan-java.js`.

---

### Kotlin / Spring Boot

**Erkannt, wenn:** `build.gradle.kts` vorhanden ist und das Kotlin-Plugin neben Spring Boot greift. Hat einen vollständig eigenen Code-Pfad gegenüber Java, nutzt keine Java-Muster wieder.

**Erkennt insbesondere:**
- **CQRS**: getrennte Command-/Query-Pakete
- **BFF**: Backend-for-Frontend-Muster
- **Multi-Module-Gradle**: `settings.gradle.kts` mit `include(":module")`
- **Geteilte Query-Domains zwischen Modulen**: `resolveSharedQueryDomains()` verteilt Dateien aus geteilten Query-Modulen per Paket-/Klassennamen-Zerlegung um

**Unterstützte ORMs:** Exposed, jOOQ, JPA (Hibernate), R2DBC.

**Warum Kotlin einen eigenen Scanner bekommt:** Die Java-Muster passen schlecht auf Kotlin-Codebasen. Kotlin-Projekte tendieren zu CQRS- und Multi-Module-Setups, und Javas Klassifizierung nach Mustern A bis E bildet die nicht sauber ab.

Der Scanner liegt in `plan-installer/scanners/scan-kotlin.js`.

---

### Node / Express

**Erkannt, wenn:** `express` in den `package.json`-Dependencies steht.

**Stack-Detector identifiziert:** ORM (Prisma / TypeORM / Sequelize / Drizzle / Knex / Mongoose), DB-Typ, Package Manager (npm / yarn / pnpm), TypeScript-Nutzung.

**Domain-Erkennung:** Der gemeinsame Node.js-Scanner (`plan-installer/scanners/scan-node.js`) läuft durch `src/*/` (oder `src/modules/*/`, falls NestJS-Style-Module existieren) und zählt Dateien, die `controller|router|route|handler`, `service`, `dto|schema|type` sowie Entity-/Module-/Guard-/Pipe-/Interceptor-Mustern entsprechen. Derselbe Scanner-Code dient Express, Fastify und NestJS. Der Framework-Name entscheidet nur, welches Pass-1-Prompt geladen wird, nicht welcher Scanner läuft.

---

### Node / Fastify

**Erkannt, wenn:** `fastify` in den Dependencies steht.

Domain-Erkennung läuft über denselben gemeinsamen `scan-node.js`-Scanner wie oben. Pass 1 nutzt ein Fastify-spezifisches Prompt-Template, das Claude bittet, nach Fastifys Plugin-Mustern und Route-Schemas zu suchen.

---

### Node / NestJS

**Erkannt, wenn:** `@nestjs/core` in den Dependencies steht.

Domain-Erkennung läuft über den gemeinsamen `scan-node.js`-Scanner. NestJS' Standard-Layout `src/modules/<module>/` wird automatisch erkannt (bevorzugt gegenüber `src/*/`, falls beide existieren), und jedes Modul wird zu einer Domäne. Pass 1 nutzt ein NestJS-spezifisches Prompt-Template.

---

### Python / Django

**Erkannt, wenn:** der Substring `django` (kleingeschrieben) in `requirements.txt` oder `pyproject.toml` auftaucht. Standard-Paket-Manager-Deklarationen schreiben klein, das matcht also in typischen Projekten.

**Domain-Erkennung:** Der Scanner geht `**/models.py` durch und behandelt jedes Verzeichnis mit `models.py` als Django-App/Domäne. (Er parst keine `INSTALLED_APPS` aus `settings.py`. Das Vorhandensein von `models.py` auf der Festplatte ist das Signal.)

**Pro-Domain-Statistiken:** Zählt Dateien, die `views`, `models`, `serializers`, `admin`, `forms`, `urls`, `tasks` matchen.

---

### Python / FastAPI

**Erkannt, wenn:** `fastapi` in den Dependencies steht.

**Domain-Erkennung:** Glob `**/{router,routes,endpoints}*.py`. Jedes eindeutige Eltern-Verzeichnis wird zur Domäne. Der Scanner parst keine `APIRouter(...)`-Aufrufe; der Dateiname liefert das Signal.

**Vom Stack-Detector erkannte ORMs:** SQLAlchemy, Tortoise ORM.

---

### Python / Flask

**Erkannt, wenn:** `flask` in den Dependencies steht.

**Domain-Erkennung:** nutzt denselben Glob `**/{router,routes,endpoints}*.py` wie FastAPI. Liefert das nichts, fällt der Scanner auf `{app,src/app}/*/`-Verzeichnisse zurück.

**Flat-Project-Fallback (v1.7.1):** Findet sich kein Domain-Kandidat, sucht der Scanner `{main,app}.py` im Projekt-Root und behandelt das Projekt als Single-Domain-„App".

---

## Frontend-Stacks (4)

### Node / Next.js

**Erkannt, wenn:** `next.config.{ts,js}` vorhanden ist ODER `next` in den `package.json`-Dependencies steht.

**Erkennt die Routing-Konvention:**

- **App Router** (Next.js 13+): `app/`-Verzeichnis mit `page.tsx`/`layout.tsx`
- **Pages Router** (Legacy): `pages/`-Verzeichnis
- **FSD (Feature-Sliced Design)**: `src/features/`, `src/widgets/`, `src/entities/`

**Scanner extrahiert:**
- Routing-Modus (App Router / Pages Router / FSD)
- RSC- vs. Client-Component-Zahl (Next.js App Router): zählt Dateien mit `client.` im Namen, etwa `client.tsx`. Es wird nicht nach `"use client"`-Direktiven im Quellcode geparst.
- Domain-Liste aus `app/` oder `pages/` (sowie `src/features/` etc. für FSD)

State-Management, Styling- und Data-Fetching-Bibliotheken erkennt der Scanner nicht. Pass-1-Prompts bitten Claude, diese Muster stattdessen im Quellcode zu finden.

---

### Node / Vite

**Erkannt, wenn:** `vite.config.{ts,js}` vorhanden ist ODER `vite` in den Dependencies steht.

Standardport ist `5173` (Vite-Konvention) und greift als Last-Resort-Fallback. Der Scanner parst `vite.config` nicht nach `server.port`. Deklariert dein Projekt einen Port in `.env*`, kommt der env-parser zuerst zum Zug.

Der Stack-Detector identifiziert Vite selbst. Das zugrunde liegende UI-Framework, sofern nicht React (der Default-Fallback), erkennt in Pass 1 das LLM aus dem Quellcode, nicht der Scanner.

---

### Angular

**Erkannt, wenn:** `angular.json` vorhanden ist ODER `@angular/core` in den Dependencies steht.

**Erkennt:**
- **Feature-Module-Struktur**: `src/app/<feature>/`
- **Monorepo-Workspaces**: generische Muster `apps/*/src/app/*/` und `packages/*/src/app/*/` (funktioniert auch für NX-Layouts, selbst wenn `nx.json` selbst kein explizites Erkennungssignal ist)

Standardport ist `4200` (Angular-Konvention) und greift als Last-Resort-Fallback. Der Scanner liest `angular.json` nur für die Stack-Erkennung, nicht für die Port-Extraktion. Deklariert dein Projekt den Port in einer `.env*`-Datei, greift der env-parser zuerst.

---

### Vue / Nuxt

**Erkannt, wenn:** `nuxt.config.{ts,js}` für Nuxt vorhanden ist ODER `vue` in den Dependencies für reines Vue steht.

Der Scanner identifiziert das Framework und macht die Frontend-Domain-Extraktion (App/Pages/FSD/components-Muster). Nuxt-Version und Modul-Erkennung (Pinia, VueUse usw.) gehen an Pass 1. Claude liest den Quellcode und erkennt, was tatsächlich eingesetzt wird, statt dass der Scanner ein Pattern-Matching auf `package.json` macht.

---

## Multi-Stack-Projekte

Ein Projekt mit Backend und Frontend (etwa Spring Boot in `backend/` plus Next.js in `frontend/`) wird vollständig unterstützt.

Jeder Stack fährt seinen **eigenen Scanner** mit seinem **eigenen Analyse-Prompt**. Die zusammengeführte Pass-2-Ausgabe deckt beide Stacks ab. Pass 3 erzeugt für jeden eigene Rule- und Standard-Dateien, organisiert in:

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

Die `70.domains/{type}/`-Typisierung ist **immer aktiv**. Selbst wenn dein Projekt single-stack ist, nutzt das Layout `70.domains/backend/` (oder `frontend/`). So bleibt die Konvention einheitlich: Ergänzt ein Single-Stack-Projekt später einen zweiten Stack, ist keine Migration nötig.

**Multi-Stack-Erkennung** registriert:
- ein Monorepo-Manifest im Projekt-Root: `turbo.json`, `pnpm-workspace.yaml`, `lerna.json`
- eine Root-`package.json` mit einem `workspaces`-Feld

Wird ein Monorepo erkannt, geht der Scanner `apps/*/package.json` und `packages/*/package.json` durch (plus alle eigenen Workspace-Globs aus dem Manifest), führt die Dependency-Listen zusammen und startet nach Bedarf sowohl Backend- als auch Frontend-Scanner.

---

## Frontend-Plattform-Split-Erkennung

Manche Frontend-Projekte gliedern sich auf der obersten Ebene nach Plattform (PC, mobile, admin):

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

Der Scanner erkennt `src/{platform}/{subapp}/` und gibt jedes `{platform}-{subapp}` als eigene Domäne aus. Standard-Plattform-Schlüsselwörter:

- **Gerät / Zielumgebung:** `desktop`, `pc`, `web`, `mobile`, `mc`, `mo`, `sp`, `tablet`, `tab`, `pwa`, `tv`, `ctv`, `ott`, `watch`, `wear`
- **Zugriffstier / Zielgruppe:** `admin`, `cms`, `backoffice`, `back-office`, `portal`

Eigene Schlüsselwörter ergänzt du über `frontendScan.platformKeywords` in `.claudeos-scan.json` (siehe [advanced-config.md](advanced-config.md)).

**Single-SPA-Skip-Regel (v2.3.0):** Matcht im Projekt-Tree nur EIN Plattform-Schlüsselwort (etwa: das Projekt hat `src/admin/api/`, `src/admin/dto/`, `src/admin/routers/` ohne weitere Plattformen), überspringt der Scanner die Subapp-Emission. Sonst würden Architektur-Layer (`api`, `dto`, `routers`) fälschlich als Feature-Domains ausgegeben.

Willst du die Subapp-Emission trotzdem erzwingen, setze `frontendScan.forceSubappSplit: true` in `.claudeos-scan.json`. Siehe [advanced-config.md](advanced-config.md).

---

## `.env`-Extraktion (v2.2.0+)

Der Scanner liest `.env*`-Dateien für die Laufzeitkonfiguration, damit die generierten Docs deinen echten Port, Host und DB-URL widerspiegeln.

**Suchreihenfolge** (erster Treffer gewinnt):

1. `.env.example` (kanonisch, eingecheckt)
2. `.env.local.example`
3. `.env.development.example`
4. `.env.sample`
5. `.env.template`
6. `.env`
7. `.env.local`
8. `.env.development`

**Redigieren sensibler Variablen:** Schlüssel, die `PASSWORD`, `SECRET`, `TOKEN`, `API_KEY`, `CREDENTIAL`, `PRIVATE_KEY`, `JWT_SECRET` etc. matchen, landen vor dem Kopieren in `project-analysis.json` automatisch als `***REDACTED***`. **Ausnahme:** `DATABASE_URL` steht auf der Whitelist, weil der Scanner das Protokoll für die DB-Typ-Erkennung braucht.

**Port-Auflösungs-Vorrang:**
1. Spring-Boot-`application.yml` `server.port`
2. `.env`-Port-Schlüssel (16+ Konventionsschlüssel werden geprüft, geordnet nach Spezifität: Vite-spezifisch zuerst, generisches `PORT` zuletzt)
3. Stack-Default (FastAPI/Django=8000, Flask=5000, Vite=5173, Express/NestJS/Fastify=3000, Default=8080)

Der Parser liegt in `lib/env-parser.js`. Tests in `tests/env-parser.test.js`.

---

## Was der Scanner produziert — `project-analysis.json`

Sobald Schritt A fertig ist, findest du diese Datei unter `claudeos-core/generated/project-analysis.json`. Top-Level-Schlüssel (variieren je Stack):

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

Du kannst diese Datei direkt lesen, um genau zu sehen, was der Scanner aus deinem Projekt extrahiert hat.

---

## Einen neuen Stack hinzufügen

Die Scanner-Architektur ist modular. Einen neuen Stack hinzufügen heißt:

1. eine `plan-installer/scanners/scan-<stack>.js`-Datei (Domain-Extraktionslogik) anlegen.
2. drei Claude-Prompt-Templates schreiben: `pass1.md`, `pass2.md`, `pass3.md` unter `pass-prompts/templates/<stack>/`.
3. Stack-Erkennungsregeln in `plan-installer/stack-detector.js` ergänzen.
4. Routing in den Dispatcher in `bin/commands/init.js` einhängen.
5. Tests mit einem Fixture-Projekt unter `tests/fixtures/<stack>/` schreiben.

Den vollständigen Leitfaden und Referenzimplementierungen zum Kopieren findest du in [CONTRIBUTING.md](../../CONTRIBUTING.md).

---

## Scanner-Verhalten überschreiben

Hat dein Projekt eine ungewöhnliche Struktur oder wählt die Auto-Erkennung den falschen Stack, legst du eine `.claudeos-scan.json`-Datei in den Projekt-Root.

Die verfügbaren Override-Felder findest du in [advanced-config.md](advanced-config.md).
