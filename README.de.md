# ClaudeOS-Core

[![npm version](https://img.shields.io/npm/v/claudeos-core.svg?logo=npm&label=npm)](https://www.npmjs.com/package/claudeos-core)
[![CI](https://img.shields.io/github/actions/workflow/status/claudeos-core/claudeos-core/test.yml?branch=master&logo=github&label=CI)](https://github.com/claudeos-core/claudeos-core/actions/workflows/test.yml)
[![tests](https://img.shields.io/badge/tests-736%20passing-brightgreen?logo=node.js&logoColor=white)](https://github.com/claudeos-core/claudeos-core/actions/workflows/test.yml)
[![node](https://img.shields.io/node/v/claudeos-core.svg?logo=node.js&logoColor=white&label=node)](https://nodejs.org/)
[![license](https://img.shields.io/npm/l/claudeos-core.svg?color=blue)](LICENSE)
[![downloads](https://img.shields.io/npm/dm/claudeos-core.svg?logo=npm&color=blue&label=downloads)](https://www.npmjs.com/package/claudeos-core)

**Eine deterministische CLI, die `CLAUDE.md` + `.claude/rules/` aus Ihrem tatsächlichen Quellcode automatisch generiert — Node.js scanner + 4-pass Claude Pipeline + 5 validators. 12 stacks, 10 Sprachen, keine erfundenen Pfade.**

```bash
npx claudeos-core init
```

Funktioniert auf [**12 stacks**](#supported-stacks) (monorepos inklusive) — ein Befehl, keine Konfiguration, resume-safe, idempotent.

[🇺🇸 English](README.md) · [🇰🇷 한국어](README.ko.md) · [🇨🇳 中文](README.zh-CN.md) · [🇯🇵 日本語](README.ja.md) · [🇪🇸 Español](README.es.md) · [🇻🇳 Tiếng Việt](README.vi.md) · [🇮🇳 हिन्दी](README.hi.md) · [🇷🇺 Русский](README.ru.md) · [🇫🇷 Français](README.fr.md)

---

## Was ist das?

Claude Code fällt in jeder Session auf framework-Standardwerte zurück. Ihr Team verwendet **MyBatis**, aber Claude schreibt JPA. Ihr wrapper ist `ApiResponse.ok()`, aber Claude schreibt `ResponseEntity.success()`. Ihre Pakete sind layer-first, aber Claude generiert domain-first. `.claude/rules/` für jedes Repo per Hand zu schreiben löst das — bis sich der Code weiterentwickelt und Ihre rules driften.

**ClaudeOS-Core regeneriert sie deterministisch, aus Ihrem tatsächlichen Quellcode.** Ein Node.js scanner liest zuerst (stack, ORM, Paket-Layout, Dateipfade). Eine 4-pass Claude Pipeline schreibt dann das vollständige Set — `CLAUDE.md` + automatisch geladene `.claude/rules/` + standards + skills — eingeschränkt durch eine explizite path allowlist, der das LLM nicht entkommen kann. Fünf validators verifizieren die Ausgabe vor Auslieferung.

Das Ergebnis: gleiche Eingabe → byte-identische Ausgabe, in jeder der 10 Sprachen, ohne erfundene Pfade. (Details unten in [Was es anders macht](#was-es-anders-macht).)

Ein separater [Memory Layer](#memory-layer-optional-für-langlebige-projekte) wird für langlebige Projekte gesetzt.

---

## Auf einem echten Projekt sehen

Ausgeführt auf [`spring-boot-realworld-example-app`](https://github.com/gothinkster/spring-boot-realworld-example-app) — Java 11 · Spring Boot 2.6 · MyBatis · SQLite · 187 source files. Ergebnis: **75 generated files**, Gesamtzeit **53 Minuten**, alle validators ✅.

<p align="center">
  <img src="docs/assets/spring-boot-realworld-demo.gif" alt="ClaudeOS-Core init running on spring-boot-realworld-example-app — stack detection, 4-pass pipeline, validators, completion summary" width="769">
</p>

<details>
<summary><strong>Terminal-Ausgabe (Textversion, zum Suchen & Kopieren)</strong></summary>

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
<summary><strong>Was in Ihrer <code>CLAUDE.md</code> landet (echter Auszug — Section 1 + 2)</strong></summary>

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

Jeder Wert oben — exakte dependency-Koordinaten, der `dev.db`-Dateiname, der `V1__create_tables.sql`-Migrationsname, "no JPA" — wird vom scanner aus `build.gradle` / `application.properties` / Source-Tree extrahiert, bevor Claude die Datei schreibt. Nichts wird geraten.

</details>

<details>
<summary><strong>Eine echte automatisch geladene rule (<code>.claude/rules/10.backend/01.controller-rules.md</code>)</strong></summary>

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

Das `paths: ["**/*"]`-glob bedeutet, dass Claude Code diese rule automatisch lädt, sobald Sie eine beliebige Datei im Projekt bearbeiten. Jeder Klassenname, Paketpfad und exception handler in der rule kommt direkt aus dem gescannten Quellcode — einschließlich des tatsächlichen `CustomizeExceptionHandler` und `JacksonCustomizations` des Projekts.

</details>

<details>
<summary><strong>Ein automatisch generierter <code>decision-log.md</code>-Seed (echter Auszug)</strong></summary>

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

Pass 4 seedet `decision-log.md` mit den architektonischen Entscheidungen, die aus `pass2-merged.json` extrahiert wurden, damit zukünftige Sessions sich erinnern, *warum* die Codebasis so aussieht, wie sie aussieht — nicht nur *wie* sie aussieht. Jede option ("JPA/Hibernate", "MyBatis-Plus") und jede Konsequenz ist im tatsächlichen `build.gradle`-dependency-Block verankert.

</details>

---

## Getestet auf

ClaudeOS-Core wird mit Referenz-Benchmarks auf echten OSS-Projekten ausgeliefert. Wenn Sie es auf einem öffentlichen Repo verwendet haben, [öffnen Sie bitte ein Issue](https://github.com/claudeos-core/claudeos-core/issues) — wir nehmen es in diese Tabelle auf.

| Projekt | Stack | Scanned → Generated | Status |
|---|---|---|---|
| [`spring-boot-realworld-example-app`](https://github.com/gothinkster/spring-boot-realworld-example-app) | Java 11 · Spring Boot 2.6 · MyBatis · SQLite | 187 → 75 files | ✅ alle 5 validators bestanden |

---

## Schnellstart

**Voraussetzungen:** Node.js 18+, [Claude Code](https://docs.anthropic.com/en/docs/claude-code) installiert und authentifiziert.

```bash
# 1. In den Projekt-Root wechseln
cd my-spring-boot-project

# 2. init ausführen (analysiert Ihren Code und bittet Claude, die rules zu schreiben)
npx claudeos-core init

# 3. Fertig. Öffnen Sie Claude Code und beginnen Sie zu coden — Ihre rules sind bereits geladen.
```

**Was Sie erhalten**, nachdem `init` fertig ist:

```
your-project/
├── .claude/
│   └── rules/                    ← Auto-loaded by Claude Code
│       ├── 00.core/              (allgemeine rules — naming, Architektur)
│       ├── 10.backend/           (backend stack rules, falls vorhanden)
│       ├── 20.frontend/          (frontend stack rules, falls vorhanden)
│       ├── 30.security-db/       (Security- & DB-Konventionen)
│       ├── 40.infra/             (env, logging, CI/CD)
│       ├── 50.sync/              (doc-sync-Hinweise — rules only)
│       ├── 60.memory/            (memory rules — Pass 4, rules only)
│       ├── 70.domains/{type}/    (per-domain rules, type = backend|frontend)
│       └── 80.verification/      (Teststrategie + Build-Verifikationshinweise)
├── claudeos-core/
│   ├── standard/                 ← Referenzdokumente (spiegeln Kategoriestruktur)
│   │   ├── 00.core/              (Projektübersicht, Architektur, naming)
│   │   ├── 10.backend/           (backend reference — bei backend stack)
│   │   ├── 20.frontend/          (frontend reference — bei frontend stack)
│   │   ├── 30.security-db/       (Security- & DB-reference)
│   │   ├── 40.infra/             (env / logging / CI-CD reference)
│   │   ├── 70.domains/{type}/    (per-domain reference)
│   │   ├── 80.verification/      (Build- / Startup- / Test-reference — standard only)
│   │   └── 90.optional/          (stack-spezifische Extras — standard only)
│   ├── skills/                   (wiederverwendbare Patterns, die Claude anwenden kann)
│   ├── guide/                    (How-to-guides für gängige Aufgaben)
│   ├── database/                 (Schema-Übersicht, Migrationsguide)
│   ├── mcp-guide/                (MCP-Integrationsnotizen)
│   └── memory/                   (decision log, failure patterns, compaction)
└── CLAUDE.md                     (der Index, den Claude zuerst liest)
```

Kategorien, die dasselbe Nummern-prefix zwischen `rules/` und `standard/` teilen, repräsentieren denselben konzeptionellen Bereich (z. B. `10.backend` rules ↔ `10.backend` standards). Rules-only-Kategorien: `50.sync` (doc-sync-Hinweise) und `60.memory` (Pass 4 memory). Standard-only-Kategorie: `90.optional` (stack-spezifische Extras ohne Enforcement). Alle anderen prefixes (`00`, `10`, `20`, `30`, `40`, `70`, `80`) erscheinen in BEIDEN, `rules/` und `standard/`. Claude Code kennt nun Ihr Projekt.

---

## Für wen ist das?

| Sie sind... | Den Pain, den das beseitigt |
|---|---|
| **Solo-Developer**, der ein neues Projekt mit Claude Code beginnt | "Claude meine Konventionen in jeder Session beibringen" — weg. `CLAUDE.md` + 8-Kategorien-`.claude/rules/` in einem Durchlauf generiert. |
| **Team Lead**, der gemeinsame Standards über Repos hinweg pflegt | `.claude/rules/`-drift, wenn Leute Pakete umbenennen, ORMs wechseln oder response wrappers ändern. ClaudeOS-Core synchronisiert deterministisch — gleiche Eingabe, byte-identische Ausgabe, kein diff-Lärm. |
| **Verwendet bereits Claude Code**, aber müde davon, generierten Code zu reparieren | Falscher response wrapper, falsches Paket-Layout, JPA wenn Sie MyBatis verwenden, `try/catch` verstreut wenn Ihr Projekt zentralisiertes middleware nutzt. Der scanner extrahiert Ihre echten Konventionen; jeder Claude-pass läuft gegen eine explizite path allowlist. |
| **Onboarding in ein neues Repo** (bestehendes Projekt, Team-Beitritt) | Führen Sie `init` auf dem Repo aus, erhalten Sie eine lebende Architektur-Map: stack-Tabelle in CLAUDE.md, layer-spezifische rules mit ✅/❌-Beispielen, decision log mit dem "Warum" hinter Hauptentscheidungen geseedet (JPA vs MyBatis, REST vs GraphQL etc.). 5 Dateien lesen schlägt 5.000 Quelldateien lesen. |
| **Arbeiten in Koreanisch / Japanisch / Chinesisch / 7 weiteren Sprachen** | Die meisten Claude Code rule-Generatoren sind nur Englisch. ClaudeOS-Core schreibt das vollständige Set in **10 Sprachen** (`en/ko/ja/zh-CN/es/vi/hi/ru/fr/de`) mit **byte-identischer struktureller Validierung** — gleicher `claude-md-validator`-Verdict unabhängig von der Ausgabesprache. |
| **Auf einem monorepo arbeitend** (Turborepo, pnpm/yarn workspaces, Lerna) | Backend- + Frontend-Domänen werden in einem Lauf mit separaten prompts analysiert; `apps/*/` und `packages/*/` werden automatisch durchlaufen; per-stack rules werden unter `70.domains/{type}/` emittiert. |
| **Beitrag zu OSS oder Experimentieren** | Ausgabe ist gitignore-freundlich — `claudeos-core/` ist Ihr lokales Arbeitsverzeichnis, nur `CLAUDE.md` + `.claude/` müssen ausgeliefert werden. Resume-safe bei Unterbrechung; idempotent bei Re-runs (Ihre manuellen rule-Edits überleben ohne `--force`). |

**Nicht passend, wenn:** Sie ein One-size-fits-all preset bundle aus agents/skills/rules wollen, das ohne Scan-Schritt am ersten Tag funktioniert (siehe [docs/de/comparison.md](docs/de/comparison.md) dafür, was wo passt), Ihr Projekt noch nicht zu einem der [supported stacks](#supported-stacks) passt, oder Sie nur eine einzelne `CLAUDE.md` brauchen (das eingebaute `claude /init` reicht — kein Bedarf, ein weiteres Tool zu installieren).

---

## Wie funktioniert es?

ClaudeOS-Core kehrt den üblichen Claude Code Workflow um:

```
Üblich:   Sie beschreiben das Projekt → Claude rät Ihren stack → Claude schreibt docs
Hier:     Code liest Ihren stack → Code übergibt bestätigte Fakten an Claude → Claude schreibt docs aus Fakten
```

Die Pipeline läuft in **drei Phasen**, mit Code auf beiden Seiten des LLM-Aufrufs:

**1. Step A — Scanner (deterministisch, kein LLM).** Ein Node.js scanner durchläuft Ihren Projekt-Root, liest `package.json` / `build.gradle` / `pom.xml` / `pyproject.toml`, parst `.env*`-Dateien (mit Redaction für sensitive Variablen wie `PASSWORD/SECRET/TOKEN/JWT_SECRET/...`), klassifiziert Ihr Architekturmuster (Javas 5 Patterns A/B/C/D/E, Kotlin CQRS / multi-module, Next.js App vs. Pages Router, FSD, components-pattern), entdeckt Domänen und baut eine explizite allowlist jedes existierenden Quelldateipfads. Ausgabe: `project-analysis.json` — die einzige source of truth für das, was folgt.

**2. Step B — 4-Pass Claude Pipeline (eingeschränkt durch die Fakten von Step A).**
- **Pass 1** liest repräsentative Dateien pro domain group und extrahiert ~50–100 Konventionen pro Domäne — response wrappers, logging libraries, error handling, naming-Konventionen, Test-Patterns. Läuft einmal pro domain group (`max 4 domains, 40 files per group`), sodass der Kontext nie überläuft.
- **Pass 2** mergt alle per-domain-Analysen zu einem projektweiten Bild und löst Widersprüche, indem die dominante Konvention gewählt wird.
- **Pass 3** schreibt `CLAUDE.md` + `.claude/rules/` + `claudeos-core/standard/` + skills + guides — geteilt in Stages (`3a` facts → `3b-core/3b-N` rules+standards → `3c-core/3c-N` skills+guides → `3d-aux` database+mcp-guide), sodass jeder Stage-prompt in das Kontextfenster des LLM passt, selbst wenn `pass2-merged.json` groß ist. Unterteilt 3b/3c bei ≥16-Domain-Projekten in ≤15-Domain-Batches.
- **Pass 4** seedet den L4 memory layer (`decision-log.md`, `failure-patterns.md`, `compaction.md`, `auto-rule-update.md`) und fügt universelle scaffold rules hinzu. Pass 4 ist es **untersagt, `CLAUDE.md` zu modifizieren** — Section 8 von Pass 3 ist autoritativ.

**3. Step C — Verifikation (deterministisch, kein LLM).** Fünf validators prüfen die Ausgabe:
- `claude-md-validator` — 25 strukturelle Checks auf `CLAUDE.md` (8 sections, H3/H4-Counts, memory file uniqueness, T1 canonical heading invariant). Sprach-invariant: gleiches Verdict unabhängig von `--lang`.
- `content-validator` — 10 content-Checks inklusive path-claim-Verifikation (`STALE_PATH` fängt erfundene `src/...`-Referenzen ab) und MANIFEST-drift-Erkennung.
- `pass-json-validator` — Pass 1/2/3/4 JSON well-formedness + stack-aware section count.
- `plan-validator` — plan ↔ disk Konsistenz (legacy, seit v2.1.0 meist no-op).
- `sync-checker` — disk ↔ `sync-map.json` Registrierungskonsistenz über 7 getrackte Verzeichnisse.

Drei Severity-Tiers (`fail` / `warn` / `advisory`), sodass warnings CI nie wegen LLM-hallucinations blockieren, die der Nutzer manuell beheben kann.

Die Invariante, die alles zusammenbindet: **Claude kann nur Pfade zitieren, die tatsächlich in Ihrem Code existieren**, weil Step A ihm eine endliche allowlist übergibt. Falls das LLM trotzdem versucht, etwas zu erfinden (selten, kommt aber bei bestimmten seeds vor), fängt Step C es ab, bevor die docs ausgeliefert werden.

Für per-pass-Details, marker-basiertes resume, den staged-rules-Workaround für Claude Codes `.claude/`-sensitive-path-block und stack-detection-Internals siehe [docs/de/architecture.md](docs/de/architecture.md).

---

## Supported Stacks

12 stacks, automatisch aus Ihren Projektdateien erkannt:

**Backend:** Java/Spring Boot · Kotlin/Spring Boot · Node/Express · Node/Fastify · Node/NestJS · Python/Django · Python/FastAPI · Python/Flask

**Frontend:** Node/Next.js · Node/Vite · Angular · Vue/Nuxt

Multi-stack-Projekte (z. B. Spring Boot backend + Next.js frontend) funktionieren out of the box.

Für Erkennungsregeln und was jeder scanner extrahiert, siehe [docs/de/stacks.md](docs/de/stacks.md).

---

## Täglicher Workflow

Drei Befehle decken ~95 % der Nutzung ab:

```bash
# Erstmals auf einem Projekt
npx claudeos-core init

# Nachdem Sie standards oder rules manuell editiert haben
npx claudeos-core lint

# Health-Check (vor commits oder in CI ausführen)
npx claudeos-core health
```

Für die vollständigen Optionen jedes Befehls siehe [docs/de/commands.md](docs/de/commands.md). Memory-layer-Befehle (`memory compact`, `memory propose-rules`) sind im Abschnitt [Memory Layer](#memory-layer-optional-für-langlebige-projekte) unten dokumentiert.

---

## Was es anders macht

Die meisten Claude Code Documentation-Tools generieren aus einer Beschreibung (Sie sagen es dem Tool, das Tool sagt es Claude). ClaudeOS-Core generiert aus Ihrem tatsächlichen Quellcode (das Tool liest, das Tool sagt Claude, was bestätigt ist, Claude schreibt nur, was bestätigt ist).

Drei konkrete Konsequenzen:

1. **Deterministische stack-detection.** Gleiches Projekt + gleicher Code = gleiche Ausgabe. Kein "Claude hat dieses Mal anders gewürfelt."
2. **Keine erfundenen Pfade.** Der Pass 3 prompt listet explizit jeden erlaubten Quellpfad auf; Claude kann keine Pfade zitieren, die nicht existieren.
3. **Multi-stack-aware.** Backend- und Frontend-Domänen verwenden verschiedene Analyse-prompts im selben Lauf.

Für einen Side-by-Side-Scope-Vergleich mit anderen Tools siehe [docs/de/comparison.md](docs/de/comparison.md). Der Vergleich dreht sich um **was jedes Tool tut**, nicht **welches besser ist** — die meisten sind komplementär.

---

## Verifikation (nach Generierung)

Nachdem Claude die docs geschrieben hat, verifiziert Code sie. Fünf separate validators:

| Validator | Was es prüft | Ausgeführt von |
|---|---|---|
| `claude-md-validator` | CLAUDE.md strukturelle Invarianten (8 sections, sprach-invariant) | `claudeos-core lint` |
| `content-validator` | path-claims existieren tatsächlich; manifest-Konsistenz | `health` (advisory) |
| `pass-json-validator` | Pass 1 / 2 / 3 / 4 Ausgaben sind well-formed JSON | `health` (warn) |
| `plan-validator` | Gespeicherter plan stimmt mit dem auf der Disk überein | `health` (fail-on-error) |
| `sync-checker` | Disk-Dateien stimmen mit `sync-map.json`-Registrierungen überein (orphaned/unregistered Detection) | `health` (fail-on-error) |

Ein `health-checker` orchestriert die vier Runtime-validators mit drei-stufiger Severity (fail / warn / advisory) und beendet sich mit dem passenden Code für CI. `claude-md-validator` läuft separat über den `lint`-Befehl, da struktureller drift ein re-init-Signal ist, keine soft warning. Jederzeit ausführen:

```bash
npx claudeos-core health
```

Für die Checks jedes validators im Detail siehe [docs/de/verification.md](docs/de/verification.md).

---

## Memory Layer (optional, für langlebige Projekte)

Über die obige scaffolding-Pipeline hinaus seedet ClaudeOS-Core einen `claudeos-core/memory/`-Ordner für Projekte, bei denen der Kontext eine einzelne Session überdauert. Es ist optional — Sie können es ignorieren, wenn Sie nur `CLAUDE.md` + rules wollen.

Vier Dateien, alle von Pass 4 geschrieben:

- `decision-log.md` — append-only "warum wir X über Y gewählt haben", aus `pass2-merged.json` geseedet
- `failure-patterns.md` — wiederkehrende Fehler mit frequency/importance-Scores
- `compaction.md` — wie memory im Laufe der Zeit automatisch komprimiert wird
- `auto-rule-update.md` — Patterns, die zu neuen rules werden sollten

Zwei Befehle pflegen diesen Layer über die Zeit:

```bash
# failure-patterns-Log komprimieren (regelmäßig ausführen)
npx claudeos-core memory compact

# Häufige failure-Patterns zu vorgeschlagenen rules promoten
npx claudeos-core memory propose-rules
```

Für das memory-Modell und den Lifecycle siehe [docs/de/memory-layer.md](docs/de/memory-layer.md).

---

## FAQ

**F: Brauche ich einen Claude API-Key?**
A: Nein. ClaudeOS-Core verwendet Ihre bestehende Claude Code Installation — es leitet prompts an `claude -p` auf Ihrer Maschine. Keine zusätzlichen Accounts.

**F: Überschreibt das meine bestehende CLAUDE.md oder `.claude/rules/`?**
A: Erstlauf auf einem frischen Projekt: erstellt sie. Re-run ohne `--force` bewahrt Ihre Edits — pass-marker des vorherigen Laufs werden erkannt und die passes übersprungen. Re-run mit `--force` löscht und regeneriert alles (Ihre Edits gehen verloren — das ist die Bedeutung von `--force`). Siehe [docs/de/safety.md](docs/de/safety.md).

**F: Mein stack wird nicht unterstützt. Kann ich einen hinzufügen?**
A: Ja. Neue stacks brauchen ~3 prompt-templates + einen domain scanner. Siehe [CONTRIBUTING.md](CONTRIBUTING.md) für den 8-Schritt-Guide.

**F: Wie generiere ich docs auf Koreanisch (oder einer anderen Sprache)?**
A: `npx claudeos-core init --lang ko`. 10 Sprachen unterstützt: en, ko, ja, zh-CN, es, vi, hi, ru, fr, de.

**F: Funktioniert das mit monorepos?**
A: Ja — Turborepo (`turbo.json`), pnpm workspaces (`pnpm-workspace.yaml`), Lerna (`lerna.json`) und npm/yarn workspaces (`package.json#workspaces`) werden vom stack-detector erkannt. Jede App erhält ihre eigene Analyse. Andere monorepo-Layouts (z. B. NX) werden nicht spezifisch erkannt, aber generische `apps/*/`- und `packages/*/`-Patterns werden trotzdem von den per-stack-scannern aufgegriffen.

**F: Was, wenn Claude Code rules generiert, mit denen ich nicht einverstanden bin?**
A: Editieren Sie sie direkt. Führen Sie dann `npx claudeos-core lint` aus, um zu verifizieren, dass CLAUDE.md weiterhin strukturell gültig ist. Ihre Edits bleiben bei nachfolgenden `init`-Läufen erhalten (ohne `--force`) — der resume-Mechanismus überspringt passes, deren marker existieren.

**F: Wo melde ich Bugs?**
A: [GitHub Issues](https://github.com/claudeos-core/claudeos-core/issues). Für Sicherheitsprobleme siehe [SECURITY.md](SECURITY.md).

---

## Wenn das Zeit gespart hat

Ein ⭐ auf GitHub hält das Projekt sichtbar und hilft anderen, es zu finden. Issues, PRs und stack-template-Beiträge sind alle willkommen — siehe [CONTRIBUTING.md](CONTRIBUTING.md).

---

## Dokumentation

| Thema | Lesen Sie hier |
|---|---|
| Wie die 4-pass-Pipeline funktioniert (tiefer als das Diagramm) | [docs/de/architecture.md](docs/de/architecture.md) |
| Visuelle Diagramme (Mermaid) der Architektur | [docs/de/diagrams.md](docs/de/diagrams.md) |
| Stack-detection — wonach jeder scanner sucht | [docs/de/stacks.md](docs/de/stacks.md) |
| Memory Layer — decision logs und failure patterns | [docs/de/memory-layer.md](docs/de/memory-layer.md) |
| Alle 5 validators im Detail | [docs/de/verification.md](docs/de/verification.md) |
| Jeder CLI-Befehl und jede Option | [docs/de/commands.md](docs/de/commands.md) |
| Manuelle Installation (ohne `npx`) | [docs/de/manual-installation.md](docs/de/manual-installation.md) |
| Scanner-Overrides — `.claudeos-scan.json` | [docs/de/advanced-config.md](docs/de/advanced-config.md) |
| Sicherheit: was bei re-init erhalten bleibt | [docs/de/safety.md](docs/de/safety.md) |
| Vergleich mit ähnlichen Tools (scope, nicht Qualität) | [docs/de/comparison.md](docs/de/comparison.md) |
| Fehler und Recovery | [docs/de/troubleshooting.md](docs/de/troubleshooting.md) |

---

## Mitwirken

Beiträge willkommen — stack-Support hinzufügen, prompts verbessern, Bugs beheben. Siehe [CONTRIBUTING.md](CONTRIBUTING.md).

Für Verhaltenskodex und Sicherheitsrichtlinie siehe [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) und [SECURITY.md](SECURITY.md).

## Lizenz

[ISC License](LICENSE). Frei für jeden Gebrauch, einschließlich kommerziell. © 2025–2026 ClaudeOS-Core contributors.

---

<sub>Gepflegt vom [claudeos-core](https://github.com/claudeos-core)-Team. Issues und PRs unter <https://github.com/claudeos-core/claudeos-core>.</sub>
