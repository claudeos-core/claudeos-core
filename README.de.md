# ClaudeOS-Core

[![npm version](https://img.shields.io/npm/v/claudeos-core.svg?logo=npm&label=npm)](https://www.npmjs.com/package/claudeos-core)
[![CI](https://img.shields.io/github/actions/workflow/status/claudeos-core/claudeos-core/test.yml?branch=master&logo=github&label=CI)](https://github.com/claudeos-core/claudeos-core/actions/workflows/test.yml)
[![tests](https://img.shields.io/badge/tests-736%20passing-brightgreen?logo=node.js&logoColor=white)](https://github.com/claudeos-core/claudeos-core/actions/workflows/test.yml)
[![node](https://img.shields.io/node/v/claudeos-core.svg?logo=node.js&logoColor=white&label=node)](https://nodejs.org/)
[![license](https://img.shields.io/npm/l/claudeos-core.svg?color=blue)](LICENSE)
[![downloads](https://img.shields.io/npm/dm/claudeos-core.svg?logo=npm&color=blue&label=downloads)](https://www.npmjs.com/package/claudeos-core)

**Ein CLI, das `CLAUDE.md` und `.claude/rules/` direkt aus dem Quellcode deines Projekts erzeugt. Bei gleichem Input liefert es immer das gleiche Output. Unter der Haube arbeiten ein Node.js-Scanner, eine 4-Pass-Pipeline mit Claude und fünf Validatoren zusammen. 12 Stacks, 10 Sprachen, und es erfindet keine Pfade, die im Code nicht existieren.**

```bash
npx claudeos-core init
```

Läuft auf [**12 Stacks**](#supported-stacks), inklusive Monorepos. Ein Befehl reicht, ohne Konfiguration. Bricht ein Lauf ab, kannst du nahtlos fortsetzen, und mehrfaches Ausführen bleibt sicher.

[🇺🇸 English](README.md) · [🇰🇷 한국어](README.ko.md) · [🇨🇳 中文](README.zh-CN.md) · [🇯🇵 日本語](README.ja.md) · [🇪🇸 Español](README.es.md) · [🇻🇳 Tiếng Việt](README.vi.md) · [🇮🇳 हिन्दी](README.hi.md) · [🇷🇺 Русский](README.ru.md) · [🇫🇷 Français](README.fr.md)

---

## Was ist das?

Claude Code greift bei jeder neuen Session auf die Standardwerte des jeweiligen Frameworks zurück. Dein Team setzt **MyBatis** ein, Claude schreibt trotzdem JPA. Euer Wrapper heißt `ApiResponse.ok()`, Claude tippt aber `ResponseEntity.success()`. Eure Pakete sind layer-first organisiert, generiert wird trotzdem domain-first. Per Hand geschriebene `.claude/rules/` lösen das Problem zwar, doch sobald sich der Code weiterentwickelt, driften die Regeln davon weg.

**ClaudeOS-Core erzeugt diese Regeln deterministisch neu, direkt aus dem Quellcode.** Zuerst liest ein Node.js-Scanner alles aus: Stack, ORM, Paket-Layout und Dateipfade. Anschließend schreibt eine 4-Pass-Pipeline mit Claude den kompletten Dokumentensatz: `CLAUDE.md`, die automatisch geladenen `.claude/rules/`, dazu Standards und Skills. Eine explizite Pfad-Allowlist hält das LLM dabei in der Spur, aus ihr kann es nicht ausbrechen. Fünf Validatoren prüfen das Ergebnis, bevor es ausgeliefert wird.

Das Resultat: Bei gleichem Input bekommst du byte-identische Ausgabe, in jeder der 10 Sprachen, ohne erfundene Pfade. (Details findest du weiter unten unter [Was es anders macht](#was-es-anders-macht).)

Für langlebige Projekte legt das Tool außerdem einen separaten [Memory Layer](#memory-layer-optional-für-langlebige-projekte) an.

---

## Auf einem echten Projekt sehen

Hier ein Lauf auf [`spring-boot-realworld-example-app`](https://github.com/gothinkster/spring-boot-realworld-example-app): Java 11, Spring Boot 2.6, MyBatis, SQLite und 187 Quelldateien. Ergebnis: **75 generierte Dateien**, Gesamtdauer **53 Minuten**, alle Validatoren grün.

<p align="center">
  <img src="docs/assets/spring-boot-realworld-demo.gif" alt="ClaudeOS-Core init running on spring-boot-realworld-example-app — stack detection, 4-pass pipeline, validators, completion summary" width="769">
</p>

<details>
<summary><strong>Terminalausgabe (Textfassung, zum Suchen und Kopieren)</strong></summary>

```text
╔════════════════════════════════════════════════════╗
║       ClaudeOS-Core — Bootstrap (4-Pass)          ║
╚════════════════════════════════════════════════════╝
    Project root: spring-boot-realworld-example-app
    Language:     English (en)

  [Phase 1] Detecting stack...
    Language:    java 11
    Framework:   spring-boot 2.6.3
    Database:    sqlite
    ORM:         mybatis
    PackageMgr:  gradle

  [Phase 2] Scanning structure...
    Backend:     2 domains
    Total:       2 domains
    Package:     io.spring.infrastructure

  [Phase 5] Active domains...
    ✅ 00.core   ✅ 10.backend   ⏭️ 20.frontend
    ✅ 30.security-db   ✅ 40.infra
    ✅ 80.verification  ✅ 90.optional

[4] Pass 1 — Deep analysis per domain group...
    ✅ pass1-1.json created (5m 34s)
    [█████░░░░░░░░░░░░░░░] 25% (1/4)

[5] Pass 2 — Merging analysis results...
    ✅ pass2-merged.json created (4m 22s)
    [██████████░░░░░░░░░░] 50% (2/4)

[6] Pass 3 — Generating all files...
    Pass 3 split mode (3a → 3b → 3c → 3d-aux)
    ✅ 3a complete (2m 57s)            — pass3a-facts.md (187-path allowlist)
    ✅ 3b complete (18m 49s)           — CLAUDE.md + 19 standards + 20 rules
    ✅ 3c complete (12m 35s)           — 13 skills + 9 guides
    ✅ 3d-aux complete (3m 18s)        — database/ + mcp-guide/
    Pass 3 split complete: 4/4 stages successful
    [███████████████░░░░░] 75% (3/4)

[7] Pass 4 — Memory scaffolding...
    Pass 4 staged-rules: 6 rule files moved to .claude/rules/
    ✅ Pass 4 complete (5m)
       Gap-fill: all 12 expected files already present
    [████████████████████] 100% (4/4)

╔═══════════════════════════════════════╗
║  ClaudeOS-Core — Health Checker       ║
╚═══════════════════════════════════════╝
  ✅ plan-validator         pass
  ✅ sync-checker           pass
  ✅ content-validator      pass
  ✅ pass-json-validator    pass
  ✅ All systems operational

  [Lint] ✅ CLAUDE.md structure valid (25 checks)
  [Content] ✅ All content validation passed
            Total: 0 advisories, 0 notes

╔════════════════════════════════════════════════════╗
║  ✅ ClaudeOS-Core — Complete                       ║
║   Files created:     75                           ║
║   Domains analyzed:  1 group                      ║
║   L4 scaffolded:     memory + rules               ║
║   Output language:   English                      ║
║   Total time:        53m 8s                       ║
╚════════════════════════════════════════════════════╝
```

</details>

<details>
<summary><strong>Was tatsächlich in deiner <code>CLAUDE.md</code> landet (echter Auszug, Section 1 + 2)</strong></summary>

```markdown
# CLAUDE.md — spring-boot-realworld-example-app

> Reference implementation of the RealWorld backend specification on
> Java 11 + Spring Boot 2.6, exposing both REST and GraphQL endpoints
> over a hexagonal MyBatis persistence layer.

#### 1. Role Definition

As the senior developer for this repository, you are responsible for
writing, modifying, and reviewing code. Responses must be written in English.
A Java Spring Boot REST + GraphQL API server organized around a hexagonal
(ports & adapters) architecture, with a CQRS-lite read/write split inside
an XML-driven MyBatis persistence layer and JWT-based authentication.

#### 2. Project Overview

| Item | Value |
|---|---|
| Language | Java 11 |
| Framework | Spring Boot 2.6.3 |
| Build Tool | Gradle (Groovy DSL) |
| Persistence | MyBatis 3 via `mybatis-spring-boot-starter:2.2.2` (no JPA) |
| Database | SQLite (`org.xerial:sqlite-jdbc:3.36.0.3`) — `dev.db` (default), `:memory:` (test) |
| Migration | Flyway — single baseline `V1__create_tables.sql` |
| API Style | REST (`io.spring.api.*`) + GraphQL via Netflix DGS `:4.9.21` |
| Authentication | JWT HS512 (`jjwt-api:0.11.2`) + Spring Security `PasswordEncoder` |
| Server Port | 8080 (default) |
| Test Stack | JUnit Jupiter 5, Mockito, AssertJ, rest-assured, spring-mock-mvc |
```

Sämtliche Werte in dieser Tabelle stammen aus dem Code selbst: die exakten Dependency-Koordinaten, der Dateiname `dev.db`, der Migrationsname `V1__create_tables.sql` und auch das "no JPA". Der Scanner liest sie aus `build.gradle`, `application.properties` und dem Source-Tree, bevor Claude die Datei überhaupt anfasst. Geraten wird hier nichts.

</details>

<details>
<summary><strong>Eine echte, automatisch geladene Rule (<code>.claude/rules/10.backend/01.controller-rules.md</code>)</strong></summary>

````markdown
---
paths:
  - "**/*"
---

#### Controller Rules

##### REST (`io.spring.api.*`)

- Controllers are the SOLE response wrapper for HTTP — no aggregator/facade above them.
  Return `ResponseEntity<?>` or a body Spring serializes via `JacksonCustomizations`.
- Each controller method calls exactly ONE application service method. Multi-source
  composition lives in the application service.
- Controllers MUST NOT import `io.spring.infrastructure.*`. No direct `@Mapper` access.
- Validate command-param arguments with `@Valid`. Custom JSR-303 constraints live under
  `io.spring.application.{aggregate}.*`.
- Resolve the current user via `@AuthenticationPrincipal User`.
- Let exceptions propagate to `io.spring.api.exception.CustomizeExceptionHandler`
  (`@ControllerAdvice`). Do NOT `try/catch` business exceptions inside the controller.

##### GraphQL (`io.spring.graphql.*`)

- DGS components (`@DgsComponent`) are the sole GraphQL response wrappers.
  Use `@DgsQuery` / `@DgsData` / `@DgsMutation`.
- Resolve the current user via `io.spring.graphql.SecurityUtil.getCurrentUser()`.

##### Examples

✅ Correct:
```java
@PostMapping
public ResponseEntity<?> createArticle(@AuthenticationPrincipal User user,
                                       @Valid @RequestBody NewArticleParam param) {
    Article article = articleCommandService.createArticle(param, user);
    ArticleData data = articleQueryService.findById(article.getId(), user)
        .orElseThrow(ResourceNotFoundException::new);
    return ResponseEntity.ok(Map.of("article", data));
}
```

❌ Incorrect:
```java
@PostMapping
public ResponseEntity<?> create(@RequestBody NewArticleParam p) {
    try {
        articleCommandService.createArticle(p, currentUser);
    } catch (Exception e) {                                      // NO — let CustomizeExceptionHandler handle it
        return ResponseEntity.status(500).body(e.getMessage());  // NO — leaks raw message
    }
    return ResponseEntity.ok().build();
}
```
````

Der Glob `paths: ["**/*"]` sorgt dafür, dass Claude Code diese Rule lädt, sobald du irgendeine Datei im Projekt bearbeitest. Jeder Klassenname, jeder Paketpfad und jeder Exception-Handler in der Rule kommt unverändert aus dem gescannten Quellcode. Auch der reale `CustomizeExceptionHandler` und `JacksonCustomizations` des Projekts tauchen genau so auf, wie sie tatsächlich existieren.

</details>

<details>
<summary><strong>Ein automatisch erzeugter Seed für <code>decision-log.md</code> (echter Auszug)</strong></summary>

```markdown
#### 2026-04-26 — Hexagonal ports & adapters with MyBatis-only persistence

- **Context:** `io.spring.core.*` exposes `*Repository` ports (e.g.,
  `io.spring.core.article.ArticleRepository`) implemented by
  `io.spring.infrastructure.repository.MyBatis*Repository` adapters.
  The domain layer has zero `org.springframework.*` /
  `org.apache.ibatis.*` / `io.spring.infrastructure.*` imports.
- **Options considered:** JPA/Hibernate, Spring Data, MyBatis-Plus
  `BaseMapper`. None adopted.
- **Decision:** MyBatis 3 (`mybatis-spring-boot-starter:2.2.2`) with
  hand-written XML statements under `src/main/resources/mapper/*.xml`.
  Hexagonal port/adapter wiring keeps the domain framework-free.
- **Consequences:** Every SQL lives in XML — `@Select`/`@Insert`/`@Update`/`@Delete`
  annotations are forbidden. New aggregates require both a
  `core.{aggregate}.{Aggregate}Repository` port AND a
  `MyBatis{Aggregate}Repository` adapter; introducing a JPA repository would
  split the persistence model.
```

Pass 4 füllt `decision-log.md` mit den Architekturentscheidungen aus `pass2-merged.json`. Spätere Sessions wissen dadurch nicht nur, *wie* die Codebasis aussieht, sondern auch, *warum* sie so aussieht. Jede erwogene Option ("JPA/Hibernate", "MyBatis-Plus") und jede Konsequenz lässt sich direkt im Dependency-Block der `build.gradle` nachvollziehen.

</details>

---

## Getestet auf

ClaudeOS-Core wird mit Referenz-Benchmarks auf realen OSS-Projekten ausgeliefert. Hast du es selbst auf einem öffentlichen Repo laufen lassen, [eröffne gern ein Issue](https://github.com/claudeos-core/claudeos-core/issues). Wir nehmen den Eintrag dann in diese Tabelle auf.

| Projekt | Stack | Scanned → Generated | Status |
|---|---|---|---|
| [`spring-boot-realworld-example-app`](https://github.com/gothinkster/spring-boot-realworld-example-app) | Java 11 · Spring Boot 2.6 · MyBatis · SQLite | 187 → 75 files | ✅ alle 5 Validatoren bestanden |

---

## Schnellstart

**Voraussetzungen:** Node.js 18 oder neuer und ein installiertes, authentifiziertes [Claude Code](https://docs.anthropic.com/en/docs/claude-code).

```bash
# 1. In den Projekt-Root wechseln
cd my-spring-boot-project

# 2. init starten (analysiert deinen Code und lässt Claude die Rules schreiben)
npx claudeos-core init

# 3. Fertig. Öffne Claude Code und leg los — die Rules sind bereits geladen.
```

Nach Abschluss von `init` findest du folgende Struktur vor:

```
your-project/
├── .claude/
│   └── rules/                    ← wird von Claude Code automatisch geladen
│       ├── 00.core/              (allgemeine Rules: Naming, Architektur)
│       ├── 10.backend/           (Backend-Stack-Rules, falls vorhanden)
│       ├── 20.frontend/          (Frontend-Stack-Rules, falls vorhanden)
│       ├── 30.security-db/       (Konventionen für Security und Datenbank)
│       ├── 40.infra/             (env, Logging, CI/CD)
│       ├── 50.sync/              (Hinweise zur Doc-Synchronisation, nur in rules)
│       ├── 60.memory/            (Memory-Rules aus Pass 4, nur in rules)
│       ├── 70.domains/{type}/    (Rules pro Domäne, type = backend|frontend)
│       └── 80.verification/      (Teststrategie und Hinweise zur Build-Verifikation)
├── claudeos-core/
│   ├── standard/                 ← Referenzdokumente, gespiegelt zur Kategoriestruktur
│   │   ├── 00.core/              (Projektübersicht, Architektur, Naming)
│   │   ├── 10.backend/           (Backend-Referenz, sofern Backend-Stack vorhanden)
│   │   ├── 20.frontend/          (Frontend-Referenz, sofern Frontend-Stack vorhanden)
│   │   ├── 30.security-db/       (Referenz für Security und Datenbank)
│   │   ├── 40.infra/             (env / Logging / CI-CD-Referenz)
│   │   ├── 70.domains/{type}/    (Referenz pro Domäne)
│   │   ├── 80.verification/      (Referenz zu Build, Startup, Tests, nur in standard)
│   │   └── 90.optional/          (stack-spezifische Extras, nur in standard)
│   ├── skills/                   (wiederverwendbare Patterns, die Claude anwenden kann)
│   ├── guide/                    (How-to-Guides für gängige Aufgaben)
│   ├── database/                 (Schema-Übersicht, Migrationsleitfaden)
│   ├── mcp-guide/                (Notizen zur MCP-Integration)
│   └── memory/                   (Decision-Log, Failure-Patterns, Compaction)
└── CLAUDE.md                     (der Index, den Claude zuerst liest)
```

Kategorien mit demselben Nummern-Präfix in `rules/` und `standard/` decken denselben Themenbereich ab. So gehören etwa die Rules unter `10.backend` zu den Standards unter `10.backend`. Nur in `rules/` existieren `50.sync` (Hinweise zur Doc-Synchronisation) und `60.memory` (Memory aus Pass 4). Nur in `standard/` liegt `90.optional` (stack-spezifische Extras ohne Enforcement). Alle übrigen Präfixe (`00`, `10`, `20`, `30`, `40`, `70`, `80`) tauchen in BEIDEN Bäumen auf. Damit kennt Claude Code dein Projekt.

---

## Für wen ist das?

| Rolle | Schmerzpunkt, der wegfällt |
|---|---|
| **Solo-Entwickler**, der ein neues Projekt mit Claude Code startet | "Claude in jeder Session die eigenen Konventionen erklären" entfällt komplett. `CLAUDE.md` und die `.claude/rules/` mit acht Kategorien entstehen in einem einzigen Durchlauf. |
| **Team-Lead**, der gemeinsame Standards über mehrere Repos pflegt | `.claude/rules/` driften, sobald jemand Pakete umbenennt, das ORM tauscht oder den Response-Wrapper anpasst. ClaudeOS-Core synchronisiert deterministisch nach. Gleicher Input liefert byte-identisches Output, also kein Diff-Rauschen. |
| **Du nutzt Claude Code bereits**, hast aber genug davon, generierten Code immer wieder zu reparieren | Falscher Response-Wrapper, falsches Paket-Layout, JPA, obwohl ihr MyBatis fahrt, verstreute `try/catch`-Blöcke trotz zentraler Middleware. Der Scanner liest die echten Konventionen aus, und jeder Claude-Pass läuft gegen eine explizite Pfad-Allowlist. |
| **Onboarding in ein neues Repo** (Bestandsprojekt, neues Team) | Einmal `init` im Repo ausführen, und du hast eine lebendige Architekturkarte: Stack-Tabelle in der CLAUDE.md, Rules pro Layer mit ✅/❌-Beispielen, dazu ein Decision-Log mit dem "Warum" hinter den großen Entscheidungen wie JPA gegen MyBatis oder REST gegen GraphQL. Fünf Dateien lesen schlägt 5.000 Quelldateien wälzen. |
| **Du arbeitest auf Koreanisch, Japanisch, Chinesisch oder in 7 weiteren Sprachen** | Die meisten Rule-Generatoren für Claude Code beherrschen nur Englisch. ClaudeOS-Core schreibt das vollständige Set in **10 Sprachen** (`en/ko/ja/zh-CN/es/vi/hi/ru/fr/de`). Die strukturelle Validierung bleibt dabei byte-identisch: Der `claude-md-validator` urteilt unabhängig von der Ausgabesprache gleich. |
| **Du arbeitest in einem Monorepo** (Turborepo, pnpm/yarn-Workspaces, Lerna) | Backend- und Frontend-Domänen werden in einem Lauf mit getrennten Prompts analysiert. `apps/*/` und `packages/*/` durchläuft das Tool automatisch, und die Rules pro Stack landen unter `70.domains/{type}/`. |
| **Beitrag zu OSS oder einfach Experimentieren** | Die Ausgabe ist gitignore-freundlich: `claudeos-core/` ist dein lokales Arbeitsverzeichnis, ausgeliefert werden nur `CLAUDE.md` und `.claude/`. Bricht ein Lauf ab, kannst du fortsetzen. Erneutes Ausführen ist idempotent, und manuelle Edits an Rules überleben ohne `--force`. |

**Nicht passend, wenn** du ein One-size-fits-all-Bundle aus Agents, Skills und Rules erwartest, das ohne Scan-Schritt sofort einsatzfähig ist (welches Tool wozu passt, beleuchtet [docs/de/comparison.md](docs/de/comparison.md)). Ebenfalls unpassend, wenn dein Projekt zu keinem der [unterstützten Stacks](#supported-stacks) gehört oder du nur eine einzelne `CLAUDE.md` brauchst. Im letzten Fall reicht das eingebaute `claude /init`; ein zusätzliches Tool zu installieren lohnt sich nicht.

---

## Wie funktioniert es?

ClaudeOS-Core dreht den üblichen Claude-Code-Workflow um:

```
Üblich:    You describe project → Claude guesses your stack → Claude writes docs
Hier:      Code reads your stack → Code passes confirmed facts to Claude → Claude writes docs from facts
```

Die Pipeline läuft in **drei Phasen**; vor und nach dem LLM-Aufruf übernimmt jeweils Code:

**1. Step A — Scanner (deterministisch, ohne LLM).** Ein Node.js-Scanner durchläuft den Projekt-Root, liest `package.json`, `build.gradle`, `pom.xml` und `pyproject.toml`, parst `.env*`-Dateien und maskiert dabei sensible Variablen wie `PASSWORD/SECRET/TOKEN/JWT_SECRET/...`. Anschließend klassifiziert er das Architekturmuster (5 Java-Patterns A/B/C/D/E, Kotlin CQRS oder Multi-Module, Next.js App- gegenüber Pages-Router, FSD, Components-Pattern), erkennt Domänen und baut eine explizite Allowlist aller tatsächlich existierenden Quellpfade. Das Ergebnis landet in `project-analysis.json`, der Single Source of Truth für alles, was danach kommt.

**2. Step B — 4-Pass-Pipeline mit Claude (gebunden an die Fakten aus Step A).**
- **Pass 1** liest pro Domain-Gruppe repräsentative Dateien und extrahiert dort jeweils etwa 50 bis 100 Konventionen: Response-Wrapper, Logging-Bibliotheken, Error-Handling, Naming-Konventionen, Test-Patterns. Der Pass läuft einmal pro Domain-Gruppe (`max 4 domains, 40 files per group`), dadurch läuft der Kontext nie über.
- **Pass 2** fasst alle Domain-Analysen zu einem projektweiten Bild zusammen. Bei Widersprüchen gewinnt jeweils die dominante Konvention.
- **Pass 3** schreibt `CLAUDE.md`, `.claude/rules/`, `claudeos-core/standard/`, Skills und Guides. Der Pass ist in Stages aufgeteilt (`3a` Facts → `3b-core/3b-N` Rules und Standards → `3c-core/3c-N` Skills und Guides → `3d-aux` Database und MCP-Guide), damit jeder Stage-Prompt ins Kontextfenster des LLM passt, auch bei großer `pass2-merged.json`. Hat ein Projekt mindestens 16 Domänen, werden 3b und 3c zusätzlich in Batches mit höchstens 15 Domänen unterteilt.
- **Pass 4** legt den L4-Memory-Layer an (`decision-log.md`, `failure-patterns.md`, `compaction.md`, `auto-rule-update.md`) und ergänzt die universellen Scaffold-Rules. Pass 4 darf `CLAUDE.md` **unter keinen Umständen verändern**. Maßgeblich bleibt Section 8 aus Pass 3.

**3. Step C — Verifikation (deterministisch, ohne LLM).** Fünf Validatoren prüfen das Ergebnis:
- `claude-md-validator` führt 25 strukturelle Checks an `CLAUDE.md` durch (8 Sections, H3/H4-Counts, Eindeutigkeit der Memory-Dateien, T1-Invariante für die kanonischen Headings). Der Validator ist sprachunabhängig und liefert unabhängig von `--lang` dasselbe Urteil.
- `content-validator` deckt 10 inhaltliche Checks ab. Dazu zählen die Pfad-Verifikation (`STALE_PATH` fängt erfundene `src/...`-Referenzen ab) und die Erkennung von MANIFEST-Drift.
- `pass-json-validator` prüft die JSON-Wohlgeformtheit der Pässe 1, 2, 3 und 4 sowie die stack-abhängige Section-Anzahl.
- `plan-validator` deckt die Konsistenz zwischen Plan und Disk ab. Der Validator ist Legacy und ist seit v2.1.0 weitgehend ein No-op.
- `sync-checker` prüft über sieben getrackte Verzeichnisse hinweg, ob Disk und `sync-map.json` übereinstimmen.

Die drei Severity-Stufen `fail`, `warn` und `advisory` sorgen dafür, dass Warnings die CI nicht wegen LLM-Halluzinationen blockieren, die du selbst beheben kannst.

Die zentrale Invariante, die alles zusammenhält: **Claude darf nur Pfade zitieren, die im Code tatsächlich existieren**, weil Step A eine endliche Allowlist übergibt. Versucht das LLM trotzdem, etwas zu erfinden (selten, aber bei manchen Seeds zu beobachten), fängt Step C es ab, bevor die Docs ausgeliefert werden.

Pro-Pass-Details, Marker-basiertes Resume, der Staged-Rules-Workaround für die `.claude/`-Sperre in Claude Code und die Interna der Stack-Erkennung stehen in [docs/de/architecture.md](docs/de/architecture.md).

---

## Supported Stacks

12 Stacks, automatisch aus deinen Projektdateien erkannt:

**Backend:** Java/Spring Boot · Kotlin/Spring Boot · Node/Express · Node/Fastify · Node/NestJS · Python/Django · Python/FastAPI · Python/Flask

**Frontend:** Node/Next.js · Node/Vite · Angular · Vue/Nuxt

Auch Multi-Stack-Projekte funktionieren ohne Zusatzaufwand, etwa ein Spring-Boot-Backend zusammen mit einem Next.js-Frontend.

Erkennungsregeln und die Felder, die jeder Scanner extrahiert, beschreibt [docs/de/stacks.md](docs/de/stacks.md).

---

## Täglicher Workflow

Drei Befehle decken rund 95 Prozent aller Anwendungsfälle ab:

```bash
# Erstmals auf einem Projekt
npx claudeos-core init

# Nach manuellen Änderungen an Standards oder Rules
npx claudeos-core lint

# Health-Check (vor Commits oder in der CI)
npx claudeos-core health
```

Die vollständigen Optionen pro Befehl listet [docs/de/commands.md](docs/de/commands.md). Die Memory-Layer-Befehle (`memory compact`, `memory propose-rules`) beschreibt der Abschnitt [Memory Layer](#memory-layer-optional-für-langlebige-projekte) weiter unten.

---

## Was es anders macht

Die meisten Documentation-Tools für Claude Code generieren aus einer Beschreibung: Du erzählst dem Tool, was zu tun ist, und das Tool sagt es Claude weiter. ClaudeOS-Core geht direkt vom Quellcode aus. Erst liest das Tool, dann reicht es nur die bestätigten Fakten an Claude durch, und Claude schreibt ausschließlich darüber.

Daraus folgen drei konkrete Effekte:

1. **Deterministische Stack-Erkennung.** Gleiches Projekt plus gleicher Code ergibt gleiche Ausgabe. Es gibt kein "diesmal hat Claude anders gewürfelt".
2. **Keine erfundenen Pfade.** Der Pass-3-Prompt führt jeden erlaubten Quellpfad explizit auf, deshalb kann Claude nichts zitieren, was im Code nicht existiert.
3. **Multi-Stack-fähig.** Backend- und Frontend-Domänen verwenden im selben Lauf jeweils eigene Analyse-Prompts.

Einen Side-by-Side-Vergleich zum Scope anderer Tools liefert [docs/de/comparison.md](docs/de/comparison.md). Es geht dort um **was jedes Tool tut**, nicht um **welches besser ist**. Die meisten ergänzen sich gegenseitig.

---

## Verifikation (nach Generierung)

Sobald Claude die Docs geschrieben hat, übernimmt wieder der Code und prüft sie. Fünf separate Validatoren stehen bereit:

| Validator | Prüfgegenstand | Ausgeführt von |
|---|---|---|
| `claude-md-validator` | strukturelle Invarianten der CLAUDE.md (8 Sections, sprachunabhängig) | `claudeos-core lint` |
| `content-validator` | Pfadangaben existieren tatsächlich; Konsistenz des Manifests | `health` (advisory) |
| `pass-json-validator` | Ausgaben aus Pass 1 / 2 / 3 / 4 sind wohlgeformtes JSON | `health` (warn) |
| `plan-validator` | gespeicherter Plan stimmt mit dem Stand auf der Disk überein | `health` (fail-on-error) |
| `sync-checker` | Dateien auf der Disk passen zu den Einträgen in `sync-map.json` (Erkennung von verwaisten oder unregistrierten Dateien) | `health` (fail-on-error) |

Ein `health-checker` orchestriert die vier Runtime-Validatoren in den drei Severity-Stufen fail, warn und advisory und liefert einen für die CI passenden Exit-Code zurück. Den `claude-md-validator` startest du separat über den `lint`-Befehl, denn struktureller Drift ist keine weiche Warnung, sondern ein Signal für ein Re-Init. Du kannst den Check jederzeit auslösen:

```bash
npx claudeos-core health
```

Was jeder einzelne Validator im Detail prüft, beschreibt [docs/de/verification.md](docs/de/verification.md).

---

## Memory Layer (optional, für langlebige Projekte)

Über die Scaffolding-Pipeline hinaus legt ClaudeOS-Core einen `claudeos-core/memory/`-Ordner an, sobald der Projektkontext über eine einzelne Session hinaus tragen soll. Der Layer ist optional. Wenn dir `CLAUDE.md` plus Rules genügen, kannst du ihn ignorieren.

Vier Dateien, alle von Pass 4 geschrieben:

- `decision-log.md`: Append-only-Log nach dem Muster "warum X statt Y", geseedet aus `pass2-merged.json`.
- `failure-patterns.md`: wiederkehrende Fehler mit Frequenz- und Importance-Scores.
- `compaction.md`: wie der Memory-Bereich im Lauf der Zeit automatisch komprimiert wird.
- `auto-rule-update.md`: Patterns, die später eigene Rules werden sollten.

Zwei Befehle pflegen diesen Layer auf Dauer:

```bash
# Failure-Patterns-Log komprimieren (regelmäßig ausführen)
npx claudeos-core memory compact

# Häufige Failure-Patterns zu Rule-Vorschlägen befördern
npx claudeos-core memory propose-rules
```

Memory-Modell und Lifecycle erläutert [docs/de/memory-layer.md](docs/de/memory-layer.md).

---

## FAQ

**F: Brauche ich einen Claude-API-Key?**
A: Nein. ClaudeOS-Core greift auf deine bestehende Claude-Code-Installation zurück und schickt Prompts an `claude -p` auf deinem Rechner. Zusätzliche Accounts sind nicht nötig.

**F: Überschreibt das Tool meine vorhandene CLAUDE.md oder die `.claude/rules/`?**
A: Beim ersten Lauf auf einem frischen Projekt werden sie angelegt. Ohne `--force` bleiben deine Edits beim erneuten Ausführen erhalten, weil das Tool die Pass-Marker des vorherigen Laufs erkennt und die jeweiligen Pässe überspringt. Mit `--force` wird alles gelöscht und neu erzeugt, deine Änderungen gehen dabei verloren. Genau das ist die Bedeutung von `--force`. Mehr dazu in [docs/de/safety.md](docs/de/safety.md).

**F: Mein Stack wird nicht unterstützt. Kann ich einen ergänzen?**
A: Ja. Für einen neuen Stack brauchst du etwa drei Prompt-Templates und einen Domain-Scanner. Den 8-Schritt-Leitfaden findest du in [CONTRIBUTING.md](CONTRIBUTING.md).

**F: Wie erzeuge ich Docs auf Deutsch (oder in einer anderen Sprache)?**
A: Über `npx claudeos-core init --lang de`. Unterstützt sind 10 Sprachen: en, ko, ja, zh-CN, es, vi, hi, ru, fr, de.

**F: Funktioniert das mit Monorepos?**
A: Ja. Der Stack-Detector erkennt Turborepo (`turbo.json`), pnpm-Workspaces (`pnpm-workspace.yaml`), Lerna (`lerna.json`) sowie npm- und yarn-Workspaces (`package.json#workspaces`). Jede App bekommt ihre eigene Analyse. Andere Monorepo-Layouts wie NX werden nicht eigens erkannt, doch die generischen Patterns `apps/*/` und `packages/*/` greifen die Stack-Scanner trotzdem auf.

**F: Was, wenn Claude Code Rules schreibt, mit denen ich nicht einverstanden bin?**
A: Bearbeite sie direkt. Anschließend lässt du `npx claudeos-core lint` laufen, um zu prüfen, ob die CLAUDE.md weiterhin strukturell gültig ist. Bei späteren `init`-Läufen ohne `--force` bleiben deine Änderungen erhalten, denn der Resume-Mechanismus überspringt jeden Pass, dessen Marker bereits existiert.

**F: Wo melde ich Bugs?**
A: Über die [GitHub Issues](https://github.com/claudeos-core/claudeos-core/issues). Sicherheitsrelevante Themen behandelt [SECURITY.md](SECURITY.md).

---

## Wenn das Zeit gespart hat

Ein ⭐ auf GitHub erhöht die Sichtbarkeit des Projekts und hilft anderen, es zu finden. Issues, PRs und Beiträge zu Stack-Templates sind alle willkommen. Details stehen in [CONTRIBUTING.md](CONTRIBUTING.md).

---

## Dokumentation

| Thema | Hier nachlesen |
|---|---|
| Wie die 4-Pass-Pipeline funktioniert (tiefer als das Diagramm) | [docs/de/architecture.md](docs/de/architecture.md) |
| Visuelle Diagramme der Architektur (Mermaid) | [docs/de/diagrams.md](docs/de/diagrams.md) |
| Stack-Erkennung — wonach jeder Scanner sucht | [docs/de/stacks.md](docs/de/stacks.md) |
| Memory Layer — Decision-Logs und Failure-Patterns | [docs/de/memory-layer.md](docs/de/memory-layer.md) |
| Alle 5 Validatoren im Detail | [docs/de/verification.md](docs/de/verification.md) |
| Sämtliche CLI-Befehle und ihre Optionen | [docs/de/commands.md](docs/de/commands.md) |
| Manuelle Installation (ohne `npx`) | [docs/de/manual-installation.md](docs/de/manual-installation.md) |
| Scanner-Overrides — `.claudeos-scan.json` | [docs/de/advanced-config.md](docs/de/advanced-config.md) |
| Sicherheit: was bei einem Re-Init erhalten bleibt | [docs/de/safety.md](docs/de/safety.md) |
| Vergleich mit ähnlichen Tools (Scope, keine Qualitätsbewertung) | [docs/de/comparison.md](docs/de/comparison.md) |
| Fehler und Recovery | [docs/de/troubleshooting.md](docs/de/troubleshooting.md) |

---

## Mitwirken

Beiträge sind willkommen, sei es durch zusätzliche Stack-Unterstützung, bessere Prompts oder Bugfixes. Details stehen in [CONTRIBUTING.md](CONTRIBUTING.md).

Verhaltenskodex und Sicherheitsrichtlinie liegen in [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) und [SECURITY.md](SECURITY.md).

## Lizenz

[ISC License](LICENSE). Frei für jeden Einsatzzweck, einschließlich kommerzieller Nutzung. © 2025–2026 ClaudeOS-Core contributors.

---

<sub>Gepflegt vom Team [claudeos-core](https://github.com/claudeos-core). Issues und PRs landen unter <https://github.com/claudeos-core/claudeos-core>.</sub>
