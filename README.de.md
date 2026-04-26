# ClaudeOS-Core

[![npm version](https://img.shields.io/npm/v/claudeos-core.svg?logo=npm&label=npm)](https://www.npmjs.com/package/claudeos-core)
[![CI](https://img.shields.io/github/actions/workflow/status/claudeos-core/claudeos-core/test.yml?branch=master&logo=github&label=CI)](https://github.com/claudeos-core/claudeos-core/actions/workflows/test.yml)
[![tests](https://img.shields.io/badge/tests-736%20passing-brightgreen?logo=node.js&logoColor=white)](https://github.com/claudeos-core/claudeos-core/actions/workflows/test.yml)
[![node](https://img.shields.io/node/v/claudeos-core.svg?logo=node.js&logoColor=white&label=node)](https://nodejs.org/)
[![license](https://img.shields.io/npm/l/claudeos-core.svg?color=blue)](LICENSE)
[![downloads](https://img.shields.io/npm/dm/claudeos-core.svg?logo=npm&color=blue&label=downloads)](https://www.npmjs.com/package/claudeos-core)

**Sorgen Sie dafür, dass Claude Code beim ersten Versuch den Konventionen IHRES Projekts folgt — nicht generischen Defaults.**

Ein deterministischer Node.js-Scanner liest zuerst Ihren Code; eine 4-Pass-Claude-Pipeline schreibt anschließend den vollständigen Satz — `CLAUDE.md` + automatisch geladenes `.claude/rules/` + Standards + Skills + L4-Memory. 10 Ausgabesprachen, 5 Post-Generation-Validatoren und eine explizite Pfad-Allowlist, die das LLM daran hindert, Dateien oder Frameworks zu erfinden, die nicht in Ihrem Code stehen.

Funktioniert auf [**12 Stacks**](#supported-stacks) (inklusive Monorepos) — ein einziger `npx`-Befehl, ohne Konfiguration, resume-sicher, idempotent.

```bash
npx claudeos-core init
```

[🇺🇸 English](README.md) · [🇰🇷 한국어](README.ko.md) · [🇨🇳 中文](README.zh-CN.md) · [🇯🇵 日本語](README.ja.md) · [🇪🇸 Español](README.es.md) · [🇻🇳 Tiếng Việt](README.vi.md) · [🇮🇳 हिन्दी](README.hi.md) · [🇷🇺 Русский](README.ru.md) · [🇫🇷 Français](README.fr.md)

---

## Worum geht es?

Sie nutzen Claude Code. Es ist mächtig, aber jede Sitzung beginnt von vorn — es hat keine Erinnerung daran, wie _Ihr_ Projekt aufgebaut ist. Also fällt es auf „allgemein gute" Defaults zurück, die selten zu dem passen, was Ihr Team tatsächlich tut:

- Ihr Team verwendet **MyBatis**, aber Claude generiert JPA-Repositories.
- Ihr Response-Wrapper ist `ApiResponse.ok()`, aber Claude schreibt `ResponseEntity.success()`.
- Ihre Pakete sind layer-first (`controller/order/`), aber Claude erstellt domain-first (`order/controller/`).
- Ihre Fehler laufen durch zentrale Middleware, aber Claude verstreut `try/catch` in jedem Endpoint.

Sie hätten gerne pro Projekt einen `.claude/rules/`-Satz — Claude Code lädt ihn automatisch in jeder Sitzung — aber diese Regeln für jedes neue Repo per Hand zu schreiben dauert Stunden, und sie driften, sobald sich der Code weiterentwickelt.

**ClaudeOS-Core schreibt sie für Sie, aus Ihrem tatsächlichen Quellcode.** Ein deterministischer Node.js-Scanner liest zuerst Ihr Projekt (Stack, ORM, Paket-Layout, Konventionen, Dateipfade). Anschließend verwandelt eine 4-Pass-Claude-Pipeline die extrahierten Fakten in einen vollständigen Dokumentationssatz:

- **`CLAUDE.md`** — der Projekt-Index, den Claude in jeder Sitzung liest
- **`.claude/rules/`** — automatisch geladene Regeln pro Kategorie (`00.core` / `10.backend` / `20.frontend` / `30.security-db` / `40.infra` / `60.memory` / `70.domains` / `80.verification`)
- **`claudeos-core/standard/`** — Referenz-Dokumente (das „Warum" hinter jeder Regel)
- **`claudeos-core/skills/`** — wiederverwendbare Muster (CRUD-Scaffolding, Seitentemplates)
- **`claudeos-core/memory/`** — Decision-Log + Failure-Patterns, die mit dem Projekt mitwachsen

Weil der Scanner Claude eine explizite Pfad-Allowlist übergibt, **kann das LLM keine Dateien oder Frameworks erfinden, die nicht in Ihrem Code stehen**. Fünf Post-Generation-Validatoren (`claude-md-validator`, `content-validator`, `pass-json-validator`, `plan-validator`, `sync-checker`) verifizieren die Ausgabe, bevor sie ausgeliefert wird — sprachunabhängig, sodass dieselben Regeln gelten, ob Sie auf Englisch, Deutsch oder in einer von 8 weiteren Sprachen generieren.

```
Vorher:  Sie → Claude Code → "allgemein guter" Code → manuelle Korrekturen
Nachher: Sie → Claude Code → Code, der zu IHREM Projekt passt → einsetzbar
```

---

## In einem realen Projekt sehen

Ausgeführt auf [`spring-boot-realworld-example-app`](https://github.com/gothinkster/spring-boot-realworld-example-app) — Java 11 · Spring Boot 2.6 · MyBatis · SQLite · 187 source files. Ergebnis: **75 generated files**, Gesamtdauer **53 Minuten**, alle Validatoren ✅.

<p align="center">
  <img src="docs/assets/spring-boot-realworld-demo.gif" alt="ClaudeOS-Core init running on spring-boot-realworld-example-app — stack detection, 4-pass pipeline, validators, completion summary" width="769">
</p>

<details>
<summary><strong>📺 Terminal-Ausgabe (Textversion, zum Suchen & Kopieren)</strong></summary>

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
    🚀 Pass 3 split mode (3a → 3b → 3c → 3d-aux)
    ✅ 3a complete (2m 57s)            — pass3a-facts.md (187-path allowlist)
    ✅ 3b complete (18m 49s)           — CLAUDE.md + 19 standards + 20 rules
    ✅ 3c complete (12m 35s)           — 13 skills + 9 guides
    ✅ 3d-aux complete (3m 18s)        — database/ + mcp-guide/
    🎉 Pass 3 split complete: 4/4 stages successful
    [███████████████░░░░░] 75% (3/4)

[7] Pass 4 — Memory scaffolding...
    📦 Pass 4 staged-rules: 6 rule files moved to .claude/rules/
    ✅ Pass 4 complete (5m)
       📋 Gap-fill: all 12 expected files already present
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
<summary><strong>📄 Was in Ihrer <code>CLAUDE.md</code> landet (echter Auszug — Section 1 + 2)</strong></summary>

```markdown
# CLAUDE.md — spring-boot-realworld-example-app

> Reference implementation of the RealWorld backend specification on
> Java 11 + Spring Boot 2.6, exposing both REST and GraphQL endpoints
> over a hexagonal MyBatis persistence layer.

## 1. Role Definition

As the senior developer for this repository, you are responsible for
writing, modifying, and reviewing code. Responses must be written in English.
A Java Spring Boot REST + GraphQL API server organized around a hexagonal
(ports & adapters) architecture, with a CQRS-lite read/write split inside
an XML-driven MyBatis persistence layer and JWT-based authentication.

## 2. Project Overview

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

Jeder Wert oben — die genauen Dependency-Koordinaten, der Dateiname `dev.db`, der Migrationsname `V1__create_tables.sql`, „no JPA" — wird vom Scanner aus `build.gradle` / `application.properties` / dem Quellbaum extrahiert, bevor Claude die Datei schreibt. Nichts wird geraten.

</details>

<details>
<summary><strong>🛡️ Eine real automatisch geladene Regel (<code>.claude/rules/10.backend/01.controller-rules.md</code>)</strong></summary>

````markdown
---
paths:
  - "**/*"
---

# Controller Rules

## REST (`io.spring.api.*`)

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

## GraphQL (`io.spring.graphql.*`)

- DGS components (`@DgsComponent`) are the sole GraphQL response wrappers.
  Use `@DgsQuery` / `@DgsData` / `@DgsMutation`.
- Resolve the current user via `io.spring.graphql.SecurityUtil.getCurrentUser()`.

## Examples

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

Der Glob `paths: ["**/*"]` bedeutet, dass Claude Code diese Regel automatisch lädt, sobald Sie eine beliebige Datei im Projekt bearbeiten. Jeder Klassenname, Paketpfad und Exception-Handler in der Regel stammt direkt aus dem gescannten Quellcode — einschließlich des tatsächlichen `CustomizeExceptionHandler` und `JacksonCustomizations` des Projekts.

</details>

<details>
<summary><strong>🧠 Ein automatisch generierter <code>decision-log.md</code>-Seed (echter Auszug)</strong></summary>

```markdown
## 2026-04-26 — Hexagonal ports & adapters with MyBatis-only persistence

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

Pass 4 befüllt `decision-log.md` mit den aus `pass2-merged.json` extrahierten Architekturentscheidungen, damit zukünftige Sitzungen sich daran erinnern, _warum_ die Codebasis so aussieht, wie sie aussieht — nicht nur _wie_ sie aussieht. Jede Option („JPA/Hibernate", „MyBatis-Plus") und jede Konsequenz ist im tatsächlichen Dependency-Block der `build.gradle` verankert.

</details>

---

## Quick Start

**Voraussetzungen:** Node.js 18+, [Claude Code](https://docs.anthropic.com/en/docs/claude-code) installiert und authentifiziert.

```bash
# 1. In das Projekt-Root wechseln
cd my-spring-boot-project

# 2. init ausführen (analysiert den Code und bittet Claude, die Regeln zu schreiben)
npx claudeos-core init

# 3. Fertig. Claude Code öffnen und loslegen — Ihre Regeln sind bereits geladen.
```

**Was Sie nach Abschluss von `init` erhalten:**

```
your-project/
├── .claude/
│   └── rules/                    ← Auto-loaded by Claude Code
│       ├── 00.core/              (general rules — naming, architecture)
│       ├── 10.backend/           (backend stack rules, if any)
│       ├── 20.frontend/          (frontend stack rules, if any)
│       ├── 30.security-db/       (security & DB conventions)
│       ├── 40.infra/             (env, logging, CI/CD)
│       ├── 50.sync/              (doc-sync reminders — rules only)
│       ├── 60.memory/            (memory rules — Pass 4, rules only)
│       ├── 70.domains/{type}/    (per-domain rules, type = backend|frontend)
│       └── 80.verification/      (testing strategy + build verification reminders)
├── claudeos-core/
│   ├── standard/                 ← Reference docs (mirror category structure)
│   │   ├── 00.core/              (project overview, architecture, naming)
│   │   ├── 10.backend/           (backend reference — if backend stack)
│   │   ├── 20.frontend/          (frontend reference — if frontend stack)
│   │   ├── 30.security-db/       (security & DB reference)
│   │   ├── 40.infra/             (env / logging / CI-CD reference)
│   │   ├── 70.domains/{type}/    (per-domain reference)
│   │   ├── 80.verification/      (build / startup / testing reference — standard only)
│   │   └── 90.optional/          (stack-specific extras — standard only)
│   ├── skills/                   (reusable patterns Claude can apply)
│   ├── guide/                    (how-to guides for common tasks)
│   ├── database/                 (schema overview, migration guide)
│   ├── mcp-guide/                (MCP integration notes)
│   └── memory/                   (decision log, failure patterns, compaction)
└── CLAUDE.md                     (the index Claude reads first)
```

Kategorien, die zwischen `rules/` und `standard/` denselben Zahlen-Präfix teilen, repräsentieren denselben konzeptuellen Bereich (z. B. `10.backend` rules ↔ `10.backend` standards). Nur in `rules/` vorhandene Kategorien: `50.sync` (Doc-Sync-Erinnerungen) und `60.memory` (Pass 4 Memory). Nur in `standard/` vorhandene Kategorie: `90.optional` (stackspezifische Ergänzungen ohne Durchsetzung). Alle übrigen Präfixe (`00`, `10`, `20`, `30`, `40`, `70`, `80`) tauchen sowohl in `rules/` als auch in `standard/` auf. Claude Code kennt jetzt Ihr Projekt.

---

## Für wen ist das?

| Sie sind... | Der Schmerzpunkt, den das Tool beseitigt |
|---|---|
| **Solo-Entwickler**, der ein neues Projekt mit Claude Code beginnt | „Claude in jeder Sitzung meine Konventionen beibringen" — vorbei. `CLAUDE.md` + 8-Kategorien-`.claude/rules/` in einem einzigen Lauf generiert. |
| **Team-Lead**, der gemeinsame Standards über mehrere Repos hinweg pflegt | `.claude/rules/` driften, wenn Leute Pakete umbenennen, ORMs wechseln oder Response-Wrapper ändern. ClaudeOS-Core synchronisiert deterministisch — gleicher Input, byte-identische Ausgabe, kein Diff-Rauschen. |
| **Bereits Claude-Code-Nutzer**, aber das Korrigieren generierten Codes leid | Falscher Response-Wrapper, falsches Paket-Layout, JPA wo Sie MyBatis nutzen, verstreutes `try/catch` während Ihr Projekt zentrale Middleware verwendet. Der Scanner extrahiert Ihre echten Konventionen; jeder Claude-Pass läuft gegen eine explizite Pfad-Allowlist. |
| **Onboarding in ein neues Repo** (bestehendes Projekt, Team-Beitritt) | `init` auf dem Repo ausführen und eine lebendige Architekturkarte erhalten: Stack-Tabelle in CLAUDE.md, schichtenweise Regeln mit ✅/❌-Beispielen, Decision-Log mit dem „Warum" hinter wesentlichen Entscheidungen (JPA vs. MyBatis, REST vs. GraphQL etc.). 5 Dateien lesen schlägt 5.000 Quelldateien lesen. |
| **Arbeiten auf Koreanisch / Japanisch / Chinesisch / 7 weiteren Sprachen** | Die meisten Claude-Code-Regelgeneratoren sind Englisch-only. ClaudeOS-Core schreibt den vollständigen Satz in **10 Sprachen** (`en/ko/ja/zh-CN/es/vi/hi/ru/fr/de`) mit **byte-identischer struktureller Validierung** — gleiches `claude-md-validator`-Verdikt unabhängig von der Ausgabesprache. |
| **Auf einem Monorepo arbeiten** (Turborepo, pnpm/yarn-Workspaces, Lerna) | Backend- und Frontend-Domänen werden in einem Lauf mit separaten Prompts analysiert; `apps/*/` und `packages/*/` werden automatisch durchlaufen; stackspezifische Regeln werden unter `70.domains/{type}/` emittiert. |
| **OSS-Beitrag oder Experimente** | Die Ausgabe ist gitignore-freundlich — `claudeos-core/` ist Ihr lokales Arbeitsverzeichnis, nur `CLAUDE.md` + `.claude/` müssen ausgeliefert werden. Resume-sicher bei Unterbrechungen; idempotent bei erneutem Aufruf (Ihre manuellen Regeländerungen überleben ohne `--force`). |

**Nicht passend, wenn:** Sie ein One-Size-Fits-All-Preset-Bundle aus Agents/Skills/Rules wollen, das ohne Scan-Schritt am ersten Tag funktioniert (siehe [docs/de/comparison.md](docs/de/comparison.md), wo was hinpasst), Ihr Projekt noch nicht zu einem der [unterstützten Stacks](#supported-stacks) passt, oder Sie nur eine einzelne `CLAUDE.md` benötigen (das eingebaute `claude /init` reicht — keine Notwendigkeit, ein weiteres Tool zu installieren).

---

## Wie funktioniert das?

ClaudeOS-Core kehrt den üblichen Claude-Code-Workflow um:

```
Üblich:    Sie beschreiben das Projekt → Claude rät den Stack → Claude schreibt Docs
Hier:      Code liest Ihren Stack → Code übergibt bestätigte Fakten an Claude → Claude schreibt Docs aus Fakten
```

Die Pipeline läuft in **drei Stufen**, mit Code auf beiden Seiten des LLM-Aufrufs:

**1. Schritt A — Scanner (deterministisch, kein LLM).** Ein Node.js-Scanner durchläuft Ihr Projekt-Root, liest `package.json` / `build.gradle` / `pom.xml` / `pyproject.toml`, parst `.env*`-Dateien (mit Sensitive-Variable-Redaction für `PASSWORD/SECRET/TOKEN/JWT_SECRET/...`), klassifiziert Ihr Architekturmuster (Javas 5 Muster A/B/C/D/E, Kotlin CQRS / Multi-Module, Next.js App- vs. Pages-Router, FSD, Components-Pattern), entdeckt Domänen und baut eine explizite Allowlist jedes existierenden Quelldateipfads. Ausgabe: `project-analysis.json` — die einzige Quelle der Wahrheit für alles, was folgt.

**2. Schritt B — 4-Pass-Claude-Pipeline (eingeschränkt durch die Fakten aus Schritt A).**
- **Pass 1** liest repräsentative Dateien pro Domänengruppe und extrahiert ~50–100 Konventionen pro Domäne — Response-Wrapper, Logging-Bibliotheken, Error-Handling, Naming-Konventionen, Test-Pattern. Läuft einmal pro Domänengruppe (`max 4 domains, 40 files per group`), sodass der Kontext nie überläuft.
- **Pass 2** führt alle domänenspezifischen Analysen zu einem projektweiten Bild zusammen und löst Widersprüche durch Wahl der dominanten Konvention auf.
- **Pass 3** schreibt `CLAUDE.md` + `.claude/rules/` + `claudeos-core/standard/` + Skills + Guides — aufgeteilt in Stages (`3a` Facts → `3b-core/3b-N` Rules+Standards → `3c-core/3c-N` Skills+Guides → `3d-aux` Database+MCP-Guide), sodass jeder Stage-Prompt ins LLM-Context-Window passt, selbst wenn `pass2-merged.json` groß ist. Bei ≥16-Domänen-Projekten werden 3b/3c in Batches von ≤15 Domänen unterteilt.
- **Pass 4** seedet die L4-Memory-Schicht (`decision-log.md`, `failure-patterns.md`, `compaction.md`, `auto-rule-update.md`) und ergänzt universelle Scaffold-Regeln. Pass 4 ist es **untersagt, `CLAUDE.md` zu modifizieren** — Section 8 von Pass 3 ist autoritativ.

**3. Schritt C — Verifikation (deterministisch, kein LLM).** Fünf Validatoren prüfen die Ausgabe:
- `claude-md-validator` — 25 strukturelle Prüfungen auf `CLAUDE.md` (8 Sections, H3/H4-Counts, Memory-File-Eindeutigkeit, T1-Canonical-Heading-Invariante). Sprachunabhängig: gleiches Verdikt unabhängig von `--lang`.
- `content-validator` — 10 Content-Prüfungen, einschließlich Path-Claim-Verifikation (`STALE_PATH` fängt fabrizierte `src/...`-Referenzen ab) und MANIFEST-Drift-Erkennung.
- `pass-json-validator` — Pass-1/2/3/4-JSON-Wohlgeformtheit + stack-bewusste Section-Counts.
- `plan-validator` — Plan-↔-Disk-Konsistenz (Legacy, seit v2.1.0 weitgehend No-Op).
- `sync-checker` — Disk-↔-`sync-map.json`-Registrierungskonsistenz über 7 nachverfolgte Verzeichnisse hinweg.

Drei Schweregrad-Stufen (`fail` / `warn` / `advisory`), damit Warnungen CI niemals wegen LLM-Halluzinationen blockieren, die der Nutzer manuell beheben kann.

Die Invariante, die alles zusammenhält: **Claude darf nur Pfade zitieren, die tatsächlich in Ihrem Code existieren**, weil Schritt A eine endliche Allowlist übergibt. Versucht das LLM trotzdem etwas zu erfinden (selten, aber bei bestimmten Seeds möglich), fängt Schritt C es ab, bevor die Docs ausgeliefert werden.

Pass-Details, Marker-basiertes Resume, der Staged-Rules-Workaround für den Sensitive-Path-Block von Claude Codes `.claude/` und Stack-Erkennungs-Internals finden Sie in [docs/de/architecture.md](docs/de/architecture.md).

---

## Supported Stacks

12 Stacks, die automatisch aus Ihren Projektdateien erkannt werden:

**Backend:** Java/Spring Boot · Kotlin/Spring Boot · Node/Express · Node/Fastify · Node/NestJS · Python/Django · Python/FastAPI · Python/Flask

**Frontend:** Node/Next.js · Node/Vite · Angular · Vue/Nuxt

Multi-Stack-Projekte (z. B. Spring-Boot-Backend + Next.js-Frontend) funktionieren ohne weitere Konfiguration.

Erkennungsregeln und welche Fakten jeder Scanner extrahiert, finden Sie in [docs/de/stacks.md](docs/de/stacks.md).

---

## Täglicher Workflow

Drei Befehle decken etwa 95 % der Nutzung ab:

```bash
# Erstmaliger Aufruf in einem Projekt
npx claudeos-core init

# Nachdem Sie Standards oder Rules manuell bearbeitet haben
npx claudeos-core lint

# Health-Check (vor Commits oder in CI ausführen)
npx claudeos-core health
```

Zwei weitere für die Wartung der Memory-Schicht:

```bash
# Failure-Patterns-Log verdichten (regelmäßig ausführen)
npx claudeos-core memory compact

# Häufige Failure-Patterns zu Vorschlagsregeln hochstufen
npx claudeos-core memory propose-rules
```

Die vollständigen Optionen jedes Befehls finden Sie in [docs/de/commands.md](docs/de/commands.md).

---

## Was unterscheidet das hier

Die meisten Claude-Code-Dokumentationstools generieren aus einer Beschreibung (Sie sagen es dem Tool, das Tool sagt es Claude). ClaudeOS-Core generiert aus Ihrem tatsächlichen Quellcode (das Tool liest, das Tool sagt Claude, was bestätigt ist, Claude schreibt nur das Bestätigte).

Drei konkrete Konsequenzen:

1. **Deterministische Stack-Erkennung.** Gleiches Projekt + gleicher Code = gleiche Ausgabe. Kein „Claude hat dieses Mal anders gewürfelt."
2. **Keine erfundenen Pfade.** Der Pass-3-Prompt nennt explizit jeden zulässigen Quellpfad; Claude kann keine Pfade zitieren, die nicht existieren.
3. **Multi-Stack-fähig.** Backend- und Frontend-Domänen verwenden im selben Lauf unterschiedliche Analyse-Prompts.

Einen seitlichen Scope-Vergleich mit anderen Tools finden Sie in [docs/de/comparison.md](docs/de/comparison.md). Der Vergleich beschreibt **was jedes Tool tut**, nicht **welches besser ist** — die meisten ergänzen sich.

---

## Verifikation (nach der Generierung)

Nachdem Claude die Docs geschrieben hat, verifiziert Code sie. Fünf separate Validatoren:

| Validator | Was er prüft | Aufruf durch |
|---|---|---|
| `claude-md-validator` | Strukturelle Invarianten von CLAUDE.md (8 Sektionen, sprachunabhängig) | `claudeos-core lint` |
| `content-validator` | Behauptete Pfade existieren wirklich; Manifest-Konsistenz | `health` (advisory) |
| `pass-json-validator` | Pass-1/2/3/4-Ausgaben sind wohlgeformtes JSON | `health` (warn) |
| `plan-validator` | Gespeicherter Plan stimmt mit der Festplatte überein | `health` (fail-on-error) |
| `sync-checker` | Festplattendateien stimmen mit `sync-map.json`-Registrierungen überein (Erkennung verwaister/nicht registrierter Einträge) | `health` (fail-on-error) |

Ein `health-checker` orchestriert die vier Laufzeit-Validatoren mit drei Schweregrad-Stufen (fail / warn / advisory) und beendet sich mit dem passenden Code für CI. `claude-md-validator` läuft separat über den `lint`-Befehl, weil strukturelle Drift ein Re-init-Signal ist und keine weiche Warnung. Jederzeit ausführbar:

```bash
npx claudeos-core health
```

Die Prüfungen jedes Validators im Detail finden Sie in [docs/de/verification.md](docs/de/verification.md).

---

## Memory Layer (optional, für lang laufende Projekte)

Seit v2.0 schreibt ClaudeOS-Core einen `claudeos-core/memory/`-Ordner mit vier Dateien:

- `decision-log.md` — append-only-Historie „warum wir X statt Y gewählt haben"
- `failure-patterns.md` — wiederkehrende Fehler mit Frequenz-/Wichtigkeitswerten
- `compaction.md` — wie Memory mit der Zeit automatisch verdichtet wird
- `auto-rule-update.md` — Muster, die zu neuen Regeln werden sollten

Sie können `npx claudeos-core memory propose-rules` ausführen, um Claude die jüngsten Failure-Patterns prüfen und neue Regeln vorschlagen zu lassen.

Das Memory-Modell und seinen Lebenszyklus beschreibt [docs/de/memory-layer.md](docs/de/memory-layer.md).

---

## FAQ

**F: Brauche ich einen Claude-API-Key?**
A: Nein. ClaudeOS-Core nutzt Ihre vorhandene Claude-Code-Installation — es leitet Prompts an `claude -p` auf Ihrem Rechner weiter. Keine zusätzlichen Konten.

**F: Überschreibt das meine bestehende CLAUDE.md oder `.claude/rules/`?**
A: Erstaufruf in einem frischen Projekt: Es legt sie an. Wiederaufruf ohne `--force` bewahrt Ihre Änderungen — Pass-Marker des vorherigen Laufs werden erkannt und die Passes übersprungen. Wiederaufruf mit `--force` löscht alles und generiert neu (Ihre Änderungen gehen verloren — genau das bedeutet `--force`). Siehe [docs/de/safety.md](docs/de/safety.md).

**F: Mein Stack wird nicht unterstützt. Kann ich einen hinzufügen?**
A: Ja. Neue Stacks brauchen ~3 Prompt-Templates und einen Domain-Scanner. Den 8-Schritte-Leitfaden finden Sie in [CONTRIBUTING.md](CONTRIBUTING.md).

**F: Wie generiere ich Docs auf Deutsch (oder einer anderen Sprache)?**
A: `npx claudeos-core init --lang de`. 10 Sprachen werden unterstützt: en, ko, ja, zh-CN, es, vi, hi, ru, fr, de.

**F: Funktioniert das mit Monorepos?**
A: Ja — Turborepo (`turbo.json`), pnpm-Workspaces (`pnpm-workspace.yaml`), Lerna (`lerna.json`) und npm/yarn-Workspaces (`package.json#workspaces`) werden vom Stack-Detector erkannt. Jede App erhält ihre eigene Analyse. Andere Monorepo-Layouts (z. B. NX) werden nicht spezifisch erkannt, aber die generischen Muster `apps/*/` und `packages/*/` werden trotzdem von den stackspezifischen Scannern erfasst.

**F: Was, wenn Claude Code Regeln generiert, mit denen ich nicht einverstanden bin?**
A: Bearbeiten Sie sie direkt. Führen Sie dann `npx claudeos-core lint` aus, um zu prüfen, ob CLAUDE.md noch strukturell gültig ist. Ihre Änderungen bleiben bei späteren `init`-Aufrufen (ohne `--force`) erhalten — der Resume-Mechanismus überspringt Passes, deren Marker existieren.

**F: Wo melde ich Bugs?**
A: [GitHub Issues](https://github.com/claudeos-core/claudeos-core/issues). Sicherheitsprobleme bitte in [SECURITY.md](SECURITY.md) nachlesen.

---

## Documentation

| Thema | Lesen Sie |
|---|---|
| Wie die 4-Pass-Pipeline funktioniert (tiefer als das Diagramm) | [docs/de/architecture.md](docs/de/architecture.md) |
| Visuelle Diagramme (Mermaid) der Architektur | [docs/de/diagrams.md](docs/de/diagrams.md) |
| Stack-Erkennung — wonach jeder Scanner sucht | [docs/de/stacks.md](docs/de/stacks.md) |
| Memory Layer — Decision Logs und Failure Patterns | [docs/de/memory-layer.md](docs/de/memory-layer.md) |
| Alle 5 Validatoren im Detail | [docs/de/verification.md](docs/de/verification.md) |
| Jeder CLI-Befehl und jede Option | [docs/de/commands.md](docs/de/commands.md) |
| Manuelle Installation (ohne `npx`) | [docs/de/manual-installation.md](docs/de/manual-installation.md) |
| Scanner-Overrides — `.claudeos-scan.json` | [docs/de/advanced-config.md](docs/de/advanced-config.md) |
| Sicherheit: Was bei Re-init erhalten bleibt | [docs/de/safety.md](docs/de/safety.md) |
| Vergleich mit ähnlichen Tools (Scope, nicht Qualität) | [docs/de/comparison.md](docs/de/comparison.md) |
| Fehler und Wiederherstellung | [docs/de/troubleshooting.md](docs/de/troubleshooting.md) |

---

## Mitwirken

Beiträge willkommen — Stack-Unterstützung hinzufügen, Prompts verbessern, Bugs beheben. Siehe [CONTRIBUTING.md](CONTRIBUTING.md).

Verhaltenskodex und Sicherheitsrichtlinie finden Sie in [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) und [SECURITY.md](SECURITY.md).

## License

[ISC](LICENSE) — frei für jede Nutzung, einschließlich kommerziell.

---

<sub>Mit Sorgfalt gebaut von [@claudeos-core](https://github.com/claudeos-core). Wenn Ihnen das Tool Zeit gespart hat, hält ein ⭐ auf GitHub die Sichtbarkeit aufrecht.</sub>
