# ClaudeOS-Core

[![npm version](https://img.shields.io/npm/v/claudeos-core.svg?logo=npm&label=npm)](https://www.npmjs.com/package/claudeos-core)
[![CI](https://img.shields.io/github/actions/workflow/status/claudeos-core/claudeos-core/test.yml?branch=master&logo=github&label=CI)](https://github.com/claudeos-core/claudeos-core/actions/workflows/test.yml)
[![tests](https://img.shields.io/badge/tests-736%20passing-brightgreen?logo=node.js&logoColor=white)](https://github.com/claudeos-core/claudeos-core/actions/workflows/test.yml)
[![node](https://img.shields.io/node/v/claudeos-core.svg?logo=node.js&logoColor=white&label=node)](https://nodejs.org/)
[![license](https://img.shields.io/npm/l/claudeos-core.svg?color=blue)](LICENSE)
[![downloads](https://img.shields.io/npm/dm/claudeos-core.svg?logo=npm&color=blue&label=downloads)](https://www.npmjs.com/package/claudeos-core)

**Generieren Sie Claude-Code-Dokumentation automatisch aus Ihrem tatsächlichen Quellcode.** Ein CLI-Tool, das Ihr Projekt statisch analysiert und anschließend eine 4-Pass-Claude-Pipeline ausführt, um `.claude/rules/`, Standards, Skills und Guides zu generieren — damit Claude Code den Konventionen _Ihres_ Projekts folgt, nicht generischen.

```bash
npx claudeos-core init
```

[🇺🇸 English](README.md) · [🇰🇷 한국어](README.ko.md) · [🇨🇳 中文](README.zh-CN.md) · [🇯🇵 日本語](README.ja.md) · [🇪🇸 Español](README.es.md) · [🇻🇳 Tiếng Việt](README.vi.md) · [🇮🇳 हिन्दी](README.hi.md) · [🇷🇺 Русский](README.ru.md) · [🇫🇷 Français](README.fr.md)

---

## Worum geht es?

Sie nutzen Claude Code. Das Tool ist clever, kennt aber **die Konventionen Ihres Projekts** nicht:
- Ihr Team verwendet MyBatis, aber Claude generiert JPA-Code.
- Ihr Wrapper heißt `ApiResponse.ok()`, aber Claude schreibt `ResponseEntity.success()`.
- Ihre Pakete sind `controller/order/`, aber Claude erstellt `order/controller/`.

So verbringen Sie viel Zeit damit, jede generierte Datei nachzubessern.

**ClaudeOS-Core löst das.** Es scannt Ihren tatsächlichen Quellcode, ermittelt Ihre Konventionen und schreibt einen vollständigen Satz an Regeln in `.claude/rules/` — das Verzeichnis, das Claude Code automatisch liest. Wenn Sie das nächste Mal _„Erstelle ein CRUD für Bestellungen"_ sagen, befolgt Claude Ihre Konventionen schon beim ersten Versuch.

```
Vorher:  Sie → Claude Code → "allgemein guter" Code → manuelle Korrekturen
Nachher: Sie → Claude Code → Code, der zu Ihrem Projekt passt → einsetzbar
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
<summary><strong>📄 Was in Ihrer <code>CLAUDE.md</code> landet (echter Auszug)</strong></summary>

```markdown
## 4. Core Architecture

### Core Patterns

- **Hexagonal ports & adapters**: domain ports live in `io.spring.core.{aggregate}`
  and are implemented by `io.spring.infrastructure.repository.MyBatis{Aggregate}Repository`.
  The domain layer has zero MyBatis imports.
- **CQRS-lite read/write split (same DB)**: write side goes through repository ports
  + entities; read side is a separate `readservice` package whose `@Mapper`
  interfaces return `*Data` DTOs directly (no entity hydration).
- **No aggregator/orchestrator layer**: multi-source orchestration happens inside
  application services (e.g., `ArticleQueryService`); there is no `*Aggregator`
  class in the codebase.
- **Application-supplied UUIDs**: entity constructors assign their own UUID; PK is
  passed via `#{user.id}` on INSERT. The global
  `mybatis.configuration.use-generated-keys=true` flag is dead config
  (auto-increment is unused).
- **JWT HS512 authentication**: `io.spring.infrastructure.service.DefaultJwtService`
  is the sole token subject in/out; `io.spring.api.security.JwtTokenFilter`
  extracts the token at the servlet layer.
```

Hinweis: Jede der obigen Aussagen basiert auf dem tatsächlichen Quellcode — Klassennamen, Paketpfade, Konfigurationsschlüssel und auch das Dead-Config-Flag werden vom Scanner extrahiert, bevor Claude die Datei schreibt.

</details>

<details>
<summary><strong>🛡️ Eine real automatisch geladene Regel (<code>.claude/rules/10.backend/03.data-access-rules.md</code>)</strong></summary>

````markdown
---
paths:
  - "**/*"
---

# Data Access Rules

## XML-only SQL
- Every SQL statement lives in `src/main/resources/mapper/*.xml`.
  NO `@Select` / `@Insert` / `@Update` / `@Delete` annotations on `@Mapper` methods.
- Each `@Mapper` interface has exactly one XML file at
  `src/main/resources/mapper/{InterfaceName}.xml`.
- `<mapper namespace="...">` MUST be the fully qualified Java interface name.
  The single existing exception is `TransferData.xml` (free-form `transfer.data`).

## Dynamic SQL
- `<if>` predicates MUST guard both null and empty:
  `<if test="X != null and X != ''">`. Empty-only is the existing HIGH-severity bug pattern.
- Prefer `LIMIT n OFFSET m` over MySQL-style `LIMIT m, n`.

## Examples

✅ Correct:
```xml
<update id="update">
  UPDATE articles
  <set>
    <if test="article.title != null and article.title != ''">title = #{article.title},</if>
    updated_at = #{article.updatedAt}
  </set>
  WHERE id = #{article.id}
</update>
```

❌ Incorrect:
```xml
<mapper namespace="article.mapper">          <!-- NO — namespace MUST be FQCN -->
```
````

Der Glob `paths: ["**/*"]` bedeutet, dass Claude Code diese Regel automatisch lädt, sobald Sie eine beliebige Datei im Projekt bearbeiten. Die ✅/❌-Beispiele stammen direkt aus den tatsächlichen Konventionen und bestehenden Bug-Mustern dieser Codebasis.

</details>

<details>
<summary><strong>🧠 Ein automatisch generierter <code>decision-log.md</code>-Seed (echter Auszug)</strong></summary>

```markdown
## 2026-04-26 — CQRS-lite read/write split inside the persistence layer

- **Context:** Writes go through `core.*Repository` port → `MyBatis*Repository`
  adapter → `io.spring.infrastructure.mybatis.mapper.{Aggregate}Mapper`.
  Reads bypass the domain port: application service →
  `io.spring.infrastructure.mybatis.readservice.{Concept}ReadService` directly,
  returning flat `*Data` DTOs from `io.spring.application.data.*`.
- **Options considered:** Single repository surface returning hydrated entities
  for both reads and writes.
- **Decision:** Same database, two `@Mapper` packages — `mapper/` (write side,
  operates on core entities) and `readservice/` (read side, returns `*Data` DTOs).
  Read DTOs avoid entity hydration overhead.
- **Consequences:** Reads are NOT routed through the domain port — this is
  intentional, not a bug. Application services may inject both a `*Repository`
  (writes) and one or more `*ReadService` interfaces (reads) at the same time.
  Do NOT add hydrate-then-map glue in the read path.
```

Pass 4 befüllt `decision-log.md` mit den aus `pass2-merged.json` extrahierten Architekturentscheidungen, damit zukünftige Sessions sich daran erinnern, _warum_ die Codebasis so aussieht, wie sie aussieht — nicht nur _wie_ sie aussieht.

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

| Sie sind... | Das hilft Ihnen dabei... |
|---|---|
| **Solo-Entwickler**, der ein neues Projekt mit Claude Code beginnt | Die Phase „Claude meine Konventionen beibringen" komplett überspringen |
| **Team-Lead**, der gemeinsame Standards pflegt | Die mühsame Arbeit, `.claude/rules/` aktuell zu halten, automatisieren |
| **Bereits ein Claude-Code-Nutzer**, der das Korrigieren generierten Codes leid ist | Claude IHRE Muster befolgen lassen, nicht „allgemein gute" |

**Nicht passend, wenn:** Sie ein One-Size-Fits-All-Preset-Bundle aus Agents/Skills/Rules wollen, das ohne Scan-Schritt am ersten Tag funktioniert (siehe [docs/de/comparison.md](docs/de/comparison.md), wo was hinpasst), oder Ihr Projekt noch nicht zu einem der [unterstützten Stacks](#supported-stacks) passt.

---

## Wie funktioniert das?

ClaudeOS-Core kehrt den üblichen Claude-Code-Workflow um:

```
Üblich:    Sie beschreiben das Projekt → Claude rät den Stack → Claude schreibt Docs
Hier:      Code liest Ihren Stack → Code übergibt bestätigte Fakten an Claude → Claude schreibt Docs aus Fakten
```

Die Kernidee: **Ein Node.js-Scanner liest zuerst Ihren Quellcode** (deterministisch, ohne KI), danach schreibt eine 4-Pass-Claude-Pipeline die Dokumentation, eingeschränkt durch das, was der Scanner gefunden hat. Claude kann keine Pfade oder Frameworks erfinden, die in Ihrem Code nicht tatsächlich existieren.

Die vollständige Architektur finden Sie in [docs/de/architecture.md](docs/de/architecture.md).

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
