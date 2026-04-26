# Supported Stacks

12 Stacks, alle automatisch aus Ihren Projektdateien erkannt. **8 Backend** + **4 Frontend**.

Diese Seite beschreibt, wie jeder Stack erkannt wird und was der jeweilige Scanner extrahiert. Verwenden Sie sie, um:

- zu prüfen, ob Ihr Stack unterstützt wird;
- zu verstehen, welche Fakten der Scanner an Claude vor der Doku-Generierung übergibt;
- zu sehen, was Sie in `claudeos-core/generated/project-analysis.json` erwarten können.

Wenn Ihre Projektstruktur ungewöhnlich ist, siehe [advanced-config.md](advanced-config.md) zu den `.claudeos-scan.json`-Overrides.

> Englisches Original: [docs/stacks.md](../stacks.md). Die deutsche Übersetzung wird mit der englischen Version synchron gehalten.

---

## Wie die Erkennung funktioniert

Wenn `init` läuft, öffnet der Scanner diese Dateien im Projekt-Root grob in dieser Reihenfolge:

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

Trifft keine zu, bricht `init` mit einer klaren Fehlermeldung ab, statt zu raten. (Kein Fallback auf „LLM bitten, das herauszufinden". Lieber laut scheitern als stillschweigend falsche Docs zu produzieren.)

Der Scanner liegt in `plan-installer/stack-detector.js`, falls Sie die tatsächliche Erkennungslogik nachlesen möchten.

---

## Backend-Stacks (8)

### Java / Spring Boot

**Erkannt, wenn:** `build.gradle` oder `pom.xml` `spring-boot-starter` enthält. Java wird über den Gradle-Plugin-Block separat von Kotlin identifiziert.

**Erkennung des Architekturmusters.** Der Scanner klassifiziert Ihr Projekt in **eines von 5 Mustern**:

| Muster | Beispielstruktur |
|---|---|
| **A. Layer-first** | `controller/order/`, `service/order/`, `repository/order/` |
| **B. Domain-first** | `order/controller/`, `order/service/`, `order/repository/` |
| **C. Layer-then-domain** | `controller/order/sub1/`, `service/order/sub2/` |
| **D. Domain-then-layer** | `order/sub1/controller/`, `order/sub2/service/` |
| **E. Hexagonal / DDD** | `domain/`, `application/`, `infrastructure/`, `presentation/` |

Muster werden in der Reihenfolge A → B/D → E → C ausprobiert. Der Scanner hat zudem zwei Verfeinerungen: (1) **Root-Package-Erkennung** wählt das längste Paket-Präfix, das ≥80 % der layer-tragenden Dateien abdeckt (deterministisch über Re-Runs); (2) **Deep-Sweep-Fallback** für Muster B/D — wenn Standard-Globs für eine registrierte Domäne null Dateien zurückgeben, globbt der Scanner erneut `**/${domain}/**/*.java` und läuft jeden Datei-Pfad ab, um das nächste Layer-Verzeichnis zu finden, was Cross-Domain-Coupling-Layouts wie `core/{otherDomain}/{layer}/{domain}/` aufdeckt.

**Extrahierte Fakten:**
- Stack, Framework-Version, ORM (JPA / MyBatis / jOOQ)
- DB-Typ (Postgres / MySQL / Oracle / MariaDB / H2 — H2-Erkennung nutzt eine `\bh2\b`-Wortgrenzen-Regex, um False-Positives auf `oauth2`, `cache2k` etc. zu vermeiden)
- Package Manager (Gradle / Maven), Build-Tool, Logger (Logback / Log4j2)
- Domain-Liste mit Dateizahlen (controllers, services, mappers, dtos, MyBatis-XML-Mapper)

Der Scanner liegt in `plan-installer/scanners/scan-java.js`.

---

### Kotlin / Spring Boot

**Erkannt, wenn:** `build.gradle.kts` vorhanden ist und das Kotlin-Plugin neben Spring Boot angewendet wird. Hat einen vollständig getrennten Code-Pfad gegenüber Java — wiederverwendet keine Java-Muster.

**Erkennt insbesondere:**
- **CQRS** — getrennte Command-/Query-Pakete
- **BFF** — Backend-for-Frontend-Muster
- **Multi-Module-Gradle** — `settings.gradle.kts` mit `include(":module")`
- **Geteilte Query-Domains zwischen Modulen** — `resolveSharedQueryDomains()` verteilt Dateien aus geteilten Query-Modulen via Paket-/Klassennamen-Zerlegung um

**Unterstützte ORMs:** Exposed, jOOQ, JPA (Hibernate), R2DBC.

**Warum Kotlin einen eigenen Scanner bekommt:** Die Java-Muster passen schlecht zu Kotlin-Codebasen. Kotlin-Projekte tendieren zu CQRS- und Multi-Module-Setups, die Javas Klassifizierung nach Mustern A bis E nicht sauber abbilden kann.

Der Scanner liegt in `plan-installer/scanners/scan-kotlin.js`.

---

### Node / Express

**Erkannt, wenn:** `express` in den `package.json`-Dependencies steht.

**Stack-Detector identifiziert:** ORM (Prisma / TypeORM / Sequelize / Drizzle / Knex / Mongoose), DB-Typ, Package Manager (npm / yarn / pnpm), TypeScript-Nutzung.

**Domain-Erkennung:** Der gemeinsame Node.js-Scanner (`plan-installer/scanners/scan-node.js`) durchläuft `src/*/` (oder `src/modules/*/`, falls NestJS-Style-Module existieren), zählt Dateien, die `controller|router|route|handler`, `service`, `dto|schema|type` sowie Entity-/Module-/Guard-/Pipe-/Interceptor-Mustern entsprechen. Derselbe Scanner-Code wird für Express, Fastify und NestJS verwendet — der Framework-Name bestimmt nur, welches Pass-1-Prompt geladen wird, nicht welcher Scanner läuft.

---

### Node / Fastify

**Erkannt, wenn:** `fastify` in den Dependencies steht.

Domain-Erkennung nutzt denselben gemeinsamen `scan-node.js`-Scanner wie oben beschrieben. Pass 1 verwendet ein Fastify-spezifisches Prompt-Template, das Claude bittet, nach Fastifys Plugin-Mustern und Route-Schemas zu suchen.

---

### Node / NestJS

**Erkannt, wenn:** `@nestjs/core` in den Dependencies steht.

Domain-Erkennung nutzt den gemeinsamen `scan-node.js`-Scanner. NestJS' Standard-Layout `src/modules/<module>/` wird automatisch erkannt (bevorzugt gegenüber `src/*/`, falls beide existieren) und jedes Modul wird zu einer Domäne. Pass 1 verwendet ein NestJS-spezifisches Prompt-Template.

---

### Python / Django

**Erkannt, wenn:** Der Substring `django` (Kleinschreibung) in `requirements.txt` oder `pyproject.toml` auftaucht. Standard-Paket-Manager-Deklarationen verwenden Kleinschreibung, daher matcht das in typischen Projekten.

**Domain-Erkennung:** Der Scanner durchläuft `**/models.py` und behandelt jedes Verzeichnis, das `models.py` enthält, als Django-App/Domäne. (Er parst keine `INSTALLED_APPS` aus `settings.py` — die Anwesenheit von `models.py` auf der Festplatte ist das Signal.)

**Pro-Domain-Statistiken:** Zählt Dateien, die `views`, `models`, `serializers`, `admin`, `forms`, `urls`, `tasks` matchen.

---

### Python / FastAPI

**Erkannt, wenn:** `fastapi` in den Dependencies steht.

**Domain-Erkennung:** Glob `**/{router,routes,endpoints}*.py` — jedes eindeutige Eltern-Verzeichnis wird zur Domäne. Der Scanner parst keine `APIRouter(...)`-Aufrufe; der Dateiname ist das Signal.

**Vom Stack-Detector erkannte ORMs:** SQLAlchemy, Tortoise ORM.

---

### Python / Flask

**Erkannt, wenn:** `flask` in den Dependencies steht.

**Domain-Erkennung:** Verwendet denselben Glob `**/{router,routes,endpoints}*.py` wie FastAPI. Liefert das nichts, fällt der Scanner auf `{app,src/app}/*/`-Verzeichnisse zurück.

**Flat-Project-Fallback (v1.7.1):** Werden keine Domain-Kandidaten gefunden, sucht der Scanner `{main,app}.py` im Projekt-Root und behandelt das Projekt als Single-Domain-„App".

---

## Frontend-Stacks (4)

### Node / Next.js

**Erkannt, wenn:** `next.config.{ts,js}` vorhanden ist ODER `next` in den `package.json`-Dependencies steht.

**Erkennt die Routing-Konvention:**

- **App Router** (Next.js 13+) — `app/`-Verzeichnis mit `page.tsx`/`layout.tsx`
- **Pages Router** (Legacy) — `pages/`-Verzeichnis
- **FSD (Feature-Sliced Design)** — `src/features/`, `src/widgets/`, `src/entities/`

**Scanner extrahiert:**
- Routing-Modus (App Router / Pages Router / FSD)
- RSC- vs. Client-Component-Anzahl (Next.js App Router — durch Zählen von Dateien, deren Name `client.` enthält, etwa `client.tsx`; nicht durch Parsen von `"use client"`-Direktiven im Quellcode)
- Domain-Liste aus `app/` oder `pages/` (und `src/features/` etc. für FSD)

State Management, Styling- und Data-Fetching-Bibliotheken werden auf Scanner-Ebene nicht erkannt. Pass-1-Prompts bitten Claude, diese Muster stattdessen im Quellcode zu suchen.

---

### Node / Vite

**Erkannt, wenn:** `vite.config.{ts,js}` vorhanden ist ODER `vite` in den Dependencies steht.

Standardport ist `5173` (Vite-Konvention) — wird als Last-Resort-Fallback angewendet. Der Scanner parst `vite.config` nicht nach `server.port`; deklariert Ihr Projekt einen Port in `.env*`, greift der env-parser zuerst.

Der Stack-Detector identifiziert Vite selbst; das darunter liegende UI-Framework — sofern nicht React (der Default-Fallback) — wird in Pass 1 vom LLM aus dem Quellcode identifiziert, nicht vom Scanner.

---

### Angular

**Erkannt, wenn:** `angular.json` vorhanden ist ODER `@angular/core` in den Dependencies steht.

**Erkennt:**
- **Feature-Module-Struktur** — `src/app/<feature>/`
- **Monorepo-Workspaces** — generische Muster `apps/*/src/app/*/` und `packages/*/src/app/*/` (funktioniert für NX-Layouts, auch wenn `nx.json` selbst kein explizites Erkennungssignal ist)

Standardport ist `4200` (Angular-Konvention) — wird als Last-Resort-Fallback angewendet. Der Scanner liest `angular.json` nur zur Stack-Erkennung, nicht zur Port-Extraktion; deklariert Ihr Projekt den Port in einer `.env*`-Datei, greift der env-parser zuerst.

---

### Vue / Nuxt

**Erkannt, wenn:** `nuxt.config.{ts,js}` für Nuxt vorhanden ist ODER `vue` in den Dependencies für reines Vue steht.

Der Scanner identifiziert das Framework und führt die Frontend-Domain-Extraktion aus (App/Pages/FSD/components-Muster). Nuxt-Version und Modul-Erkennung (Pinia, VueUse usw.) werden an Pass 1 delegiert — Claude liest den Quellcode und identifiziert das Verwendete, statt dass der Scanner ein Pattern-Matching auf `package.json` vornimmt.

---

## Multi-Stack-Projekte

Ein Projekt mit Backend und Frontend (z. B. Spring Boot in `backend/` + Next.js in `frontend/`) wird vollständig unterstützt.

Jeder Stack führt seinen **eigenen Scanner** mit seinem **eigenen Analyse-Prompt** aus. Die zusammengeführte Pass-2-Ausgabe deckt beide Stacks ab. Pass 3 erzeugt für jeden separate Rule- und Standard-Dateien, organisiert in:

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

Die `70.domains/{type}/`-Typisierung ist **immer aktiv** — selbst wenn Ihr Projekt single-stack ist, verwendet das Layout `70.domains/backend/` (oder `frontend/`). So bleibt die Konvention einheitlich: Ergänzt ein Single-Stack-Projekt später einen zweiten Stack, ist keine Migration nötig.

**Multi-Stack-Erkennung** registriert:
- Ein Monorepo-Manifest im Projekt-Root: `turbo.json`, `pnpm-workspace.yaml`, `lerna.json`
- Eine Root-`package.json` mit einem `workspaces`-Feld

Wird ein Monorepo erkannt, durchläuft der Scanner `apps/*/package.json` und `packages/*/package.json` (plus alle benutzerdefinierten Workspace-Globs aus dem Manifest), führt die Dependency-Listen zusammen und führt nach Bedarf sowohl Backend- als auch Frontend-Scanner aus.

---

## Frontend-Plattform-Split-Erkennung

Manche Frontend-Projekte organisieren sich auf der obersten Ebene nach Plattform (PC, mobile, admin):

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

Der Scanner erkennt `src/{platform}/{subapp}/` und gibt jedes `{platform}-{subapp}` als separate Domäne aus. Standard-Plattform-Schlüsselwörter:

- **Gerät / Zielumgebung:** `desktop`, `pc`, `web`, `mobile`, `mc`, `mo`, `sp`, `tablet`, `tab`, `pwa`, `tv`, `ctv`, `ott`, `watch`, `wear`
- **Zugriffstier / Zielgruppe:** `admin`, `cms`, `backoffice`, `back-office`, `portal`

Eigene Schlüsselwörter ergänzen Sie über `frontendScan.platformKeywords` in `.claudeos-scan.json` (siehe [advanced-config.md](advanced-config.md)).

**Single-SPA-Skip-Regel (v2.3.0):** Matcht im Projekt-Tree nur EIN Plattform-Schlüsselwort (z. B. das Projekt hat `src/admin/api/`, `src/admin/dto/`, `src/admin/routers/` ohne weitere Plattformen), wird die Subapp-Emission übersprungen. Andernfalls würden Architektur-Layer (`api`, `dto`, `routers`) fälschlich als Feature-Domains ausgegeben.

Um die Subapp-Emission trotzdem zu erzwingen, setzen Sie `frontendScan.forceSubappSplit: true` in `.claudeos-scan.json`. Siehe [advanced-config.md](advanced-config.md).

---

## `.env`-Extraktion (v2.2.0+)

Der Scanner liest `.env*`-Dateien für die Laufzeitkonfiguration, damit die generierten Docs Ihren echten Port, Host und DB-URL widerspiegeln.

**Suchreihenfolge** (erster Treffer gewinnt):

1. `.env.example` (kanonisch, eingecheckt)
2. `.env.local.example`
3. `.env.development.example`
4. `.env.sample`
5. `.env.template`
6. `.env`
7. `.env.local`
8. `.env.development`

**Redigieren sensibler Variablen:** Schlüssel, die `PASSWORD`, `SECRET`, `TOKEN`, `API_KEY`, `CREDENTIAL`, `PRIVATE_KEY`, `JWT_SECRET` etc. matchen, werden vor dem Kopieren in `project-analysis.json` automatisch zu `***REDACTED***` redigiert. **Ausnahme:** `DATABASE_URL` ist auf der Whitelist, weil der Scanner das Protokoll braucht, um den DB-Typ zu erkennen.

**Port-Auflösungs-Vorrang:**
1. Spring-Boot-`application.yml` `server.port`
2. `.env`-Port-Schlüssel (16+ Konventionsschlüssel werden geprüft, geordnet nach Spezifität — Vite-spezifisch zuerst, generisches `PORT` zuletzt)
3. Stack-Default (FastAPI/Django=8000, Flask=5000, Vite=5173, Express/NestJS/Fastify=3000, Default=8080)

Der Parser liegt in `lib/env-parser.js`. Tests in `tests/env-parser.test.js`.

---

## Was der Scanner produziert — `project-analysis.json`

Nachdem Schritt A fertig ist, finden Sie diese Datei unter `claudeos-core/generated/project-analysis.json`. Top-Level-Schlüssel (variieren je Stack):

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

Sie können diese Datei direkt lesen, um exakt zu sehen, was der Scanner aus Ihrem Projekt extrahiert hat.

---

## Einen neuen Stack hinzufügen

Die Scanner-Architektur ist modular. Einen neuen Stack hinzuzufügen erfordert:

1. Eine `plan-installer/scanners/scan-<stack>.js`-Datei (Domain-Extraktionslogik).
2. Drei Claude-Prompt-Templates: `pass1.md`, `pass2.md`, `pass3.md` unter `pass-prompts/templates/<stack>/`.
3. Stack-Erkennungsregeln in `plan-installer/stack-detector.js` ergänzen.
4. Routing in den Dispatcher in `bin/commands/init.js`.
5. Tests mit einem Fixture-Projekt unter `tests/fixtures/<stack>/`.

Den vollständigen Leitfaden und Referenzimplementierungen zum Kopieren finden Sie in [CONTRIBUTING.md](../../CONTRIBUTING.md).

---

## Scanner-Verhalten überschreiben

Wenn Ihr Projekt eine ungewöhnliche Struktur hat oder die Auto-Erkennung den falschen Stack wählt, legen Sie eine `.claudeos-scan.json`-Datei in den Projekt-Root.

Die verfügbaren Override-Felder finden Sie in [advanced-config.md](advanced-config.md).
