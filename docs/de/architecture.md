# Architecture — Die 4-Pass-Pipeline

Dieses Dokument erklärt von Anfang bis Ende, wie `claudeos-core init` tatsächlich funktioniert. Wenn Sie das Tool nur nutzen wollen, reicht der [Haupt-README](../../README.de.md) — dieses Dokument hilft zu verstehen, _warum_ das Design so aussieht, wie es aussieht.

Wenn Sie das Tool noch nie ausgeführt haben, [führen Sie es zuerst einmal aus](../../README.de.md#quick-start). Die Konzepte unten sind nach einer einmal gesehenen Ausgabe deutlich greifbarer.

> Englisches Original: [docs/architecture.md](../architecture.md). Die deutsche Übersetzung wird mit der englischen Version synchron gehalten.

---

## Die Kernidee — „Code bestätigt, Claude erstellt"

Die meisten Tools, die Claude-Code-Dokumentation generieren, arbeiten in einem Schritt:

```
Ihre Beschreibung  →  Claude  →  CLAUDE.md / rules / standards
```

Claude muss Ihren Stack, Ihre Konventionen, Ihre Domänenstruktur erraten. Es rät gut, aber es rät. ClaudeOS-Core kehrt das um:

```
Ihr Quellcode
       ↓
[Schritt A: Code liest]    ← Node.js-Scanner, deterministisch, keine KI
       ↓
project-analysis.json      ← bestätigte Fakten: Stack, Domains, Pfade
       ↓
[Schritt B: Claude schreibt] ← 4-Pass-LLM-Pipeline, eingeschränkt durch Fakten
       ↓
[Schritt C: Code verifiziert] ← 5 Validatoren, automatisch ausgeführt
       ↓
.claude/rules/  +  claudeos-core/{standard,skills,guide,...}
```

**Code übernimmt die Teile, die exakt sein müssen** (Ihr Stack, Ihre Dateipfade, Ihre Domänenstruktur).
**Claude übernimmt die Teile, die ausdrucksstark sein müssen** (Erklärungen, Konventionen, Prosa).
Sie überschneiden sich nicht und stellen sich nicht gegenseitig in Frage.

Warum das wichtig ist: Ein LLM kann keine Pfade oder Frameworks erfinden, die in Ihrem Code nicht tatsächlich vorhanden sind. Der Pass-3-Prompt übergibt Claude explizit die Allowlist der Quellpfade aus dem Scanner. Versucht Claude, einen Pfad zu zitieren, der nicht auf der Liste steht, markiert der nachgelagerte `content-validator` ihn.

---

## Schritt A — Der Scanner (deterministisch)

Bevor Claude überhaupt aufgerufen wird, durchläuft ein Node.js-Prozess Ihr Projekt und schreibt `claudeos-core/generated/project-analysis.json`. Diese Datei ist die einzige Quelle der Wahrheit für alles Folgende.

### Was der Scanner liest

Der Scanner sammelt Signale aus diesen Dateien im Projekt-Root:

| Datei | Was sie dem Scanner mitteilt |
|---|---|
| `package.json` | Node.js-Projekt; Framework über `dependencies` |
| `pom.xml` | Java/Maven-Projekt |
| `build.gradle` / `build.gradle.kts` | Java/Kotlin-Gradle-Projekt |
| `pyproject.toml` / `requirements.txt` | Python-Projekt; Framework über Pakete |
| `angular.json` | Angular-Projekt |
| `nuxt.config.{ts,js}` | Nuxt-Projekt |
| `next.config.{ts,js}` | Next.js-Projekt |
| `vite.config.{ts,js}` | Vite-Projekt |
| `.env*`-Dateien | Laufzeitkonfiguration (port, host, DB URL — siehe unten) |

Trifft keine zu, bricht `init` mit einer klaren Fehlermeldung ab, statt zu raten.

### Was der Scanner in `project-analysis.json` schreibt

- **Stack-Metadaten** — language, framework, ORM, DB, Package Manager, Build-Tool, Logger.
- **Architekturmuster** — für Java eines von 5 Mustern (layer-first / domain-first / layer-then-domain / domain-then-layer / hexagonal). Für Kotlin Erkennung von CQRS / BFF / Multi-Module. Für Frontend App Router / Pages Router / FSD-Layouts plus `components/*/`-Muster mit mehrstufigen Fallbacks.
- **Domain-Liste** — durch Begehen des Verzeichnisbaums entdeckt, mit Dateizahl pro Domäne. Der Scanner wählt ein bis zwei repräsentative Dateien pro Domäne aus, die Pass 1 lesen wird.
- **Quellpfad-Allowlist** — jeder Quelldatei-Pfad, der in Ihrem Projekt existiert. Pass-3-Prompts enthalten diese Liste explizit, damit Claude nichts erraten muss.
- **Monorepo-Struktur** — Turborepo (`turbo.json`), pnpm-Workspaces (`pnpm-workspace.yaml`), Lerna (`lerna.json`) und npm/yarn-Workspaces (`package.json#workspaces`), wenn vorhanden. NX wird nicht spezifisch automatisch erkannt; die generischen Muster `apps/*/` und `packages/*/` werden trotzdem von den stackspezifischen Scannern erfasst.
- **`.env`-Snapshot** — port, host, API-Target, sensible Variablen redigiert. Suchreihenfolge siehe [stacks.md](stacks.md).

Der Scanner hat **keine LLM-Aufrufe**. Gleiches Projekt + gleicher Code = jedes Mal dieselbe `project-analysis.json`.

Stackspezifische Details (was jeder Scanner extrahiert und wie) finden Sie in [stacks.md](stacks.md).

---

## Schritt B — Die 4-Pass-Claude-Pipeline

Jeder Pass hat eine spezifische Aufgabe. Sie laufen sequentiell, wobei Pass N die Ausgabe von Pass (N-1) als kleine strukturierte Datei liest (nicht die vollständige Ausgabe aller vorherigen Passes).

### Pass 1 — Tiefenanalyse pro Domäne

**Eingabe:** `project-analysis.json` + eine repräsentative Datei je Domäne.

**Aufgabe:** Liest die repräsentativen Dateien und extrahiert Muster über Dutzende von Analysekategorien je Stack hinweg (typischerweise 50 bis 100+ Punkte auf Bullet-Ebene, je nach Stack — das CQRS-fähige Kotlin/Spring-Template ist am dichtesten, die schlanken Node.js-Templates am kompaktesten). Beispiel: „Verwendet dieser Controller `@RestController` oder `@Controller`? Welcher Response-Wrapper kommt zum Einsatz? Welche Logging-Library?"

**Ausgabe:** `pass1-<group-N>.json` — eine Datei pro Domain-Gruppe.

Bei großen Projekten läuft Pass 1 mehrfach — eine Invocation je Domain-Gruppe. Die Gruppierungsregel lautet **höchstens 4 Domains und 40 Dateien pro Gruppe** und wird automatisch in `plan-installer/domain-grouper.js` angewendet. Ein 12-Domain-Projekt würde Pass 1 dreimal ausführen.

Diese Aufteilung existiert, weil Claudes Kontextfenster endlich ist. Versucht man, 12 Domänen Quellcode in einen einzigen Prompt zu packen, läuft entweder der Kontext über oder das LLM überfliegt nur. Die Aufteilung hält jeden Pass fokussiert.

### Pass 2 — Domänenübergreifender Merge

**Eingabe:** Alle `pass1-*.json`-Dateien.

**Aufgabe:** Verschmilzt sie zu einem projektweiten Bild. Wenn zwei Domänen nicht übereinstimmen (z. B. die eine sagt, der Response-Wrapper sei `success()`, die andere `ok()`), wählt Pass 2 die dominante Konvention und vermerkt die Diskrepanz.

**Ausgabe:** `pass2-merged.json` — typischerweise 100–400 KB.

### Pass 3 — Doku-Generierung (Split-Modus)

**Eingabe:** `pass2-merged.json`.

**Aufgabe:** Schreibt die eigentliche Dokumentation. Das ist der schwere Pass — er erzeugt etwa 40–50 Markdown-Dateien quer über CLAUDE.md, `.claude/rules/`, `claudeos-core/standard/`, `claudeos-core/skills/`, `claudeos-core/guide/`, `claudeos-core/database/` und `claudeos-core/mcp-guide/`.

**Ausgabe:** Alle benutzerseitigen Dateien, organisiert in der Verzeichnisstruktur, die im [Haupt-README](../../README.de.md#quick-start) gezeigt wird.

Damit jede Stage ihre Ausgabe innerhalb von Claudes Kontextfenster halten kann (die zusammengeführte Pass-2-Eingabe ist groß, und die generierte Ausgabe ist noch größer), **wird Pass 3 immer in Stages aufgeteilt** — auch bei kleinen Projekten. Die Aufteilung wird unbedingt angewendet; kleine Projekte haben einfach weniger Pro-Domäne-Batches:

| Stage | Was sie schreibt |
|---|---|
| **3a** | Eine kleine „Faktentabelle" (`pass3a-facts.md`), aus `pass2-merged.json` extrahiert. Dient als komprimierte Eingabe für die späteren Stages, sodass diese die große Merge-Datei nicht erneut lesen müssen. |
| **3b-core** | Erzeugt `CLAUDE.md` (den Index, den Claude Code zuerst liest) + den Hauptteil von `claudeos-core/standard/`. |
| **3b-N** | Pro-Domain-Rule- und Standard-Dateien (eine Stage je Gruppe von ≤15 Domains). |
| **3c-core** | Erzeugt `claudeos-core/skills/`-Orchestrator-Dateien + `claudeos-core/guide/`. |
| **3c-N** | Pro-Domain-Skill-Dateien. |
| **3d-aux** | Erzeugt Hilfs-Inhalte unter `claudeos-core/database/` und `claudeos-core/mcp-guide/`. |

Bei sehr großen Projekten (≥16 Domains) werden 3b und 3c in weitere Batches unterteilt. Jeder Batch erhält ein frisches Kontextfenster.

Nach erfolgreichem Abschluss aller Stages wird `pass3-complete.json` als Marker geschrieben. Wird `init` mittendrin unterbrochen, liest der nächste Lauf den Marker und setzt von der nächsten unbegonnenen Stage aus fort — bereits abgeschlossene Stages werden nicht neu ausgeführt.

### Pass 4 — Memory-Schicht-Scaffolding

**Eingabe:** `project-analysis.json`, `pass2-merged.json`, `pass3a-facts.md`.

**Aufgabe:** Erzeugt die L4-Memory-Schicht plus die universellen Scaffold-Regeln. Alle Scaffold-Schreibvorgänge sind **skip-if-exists**, daher überschreibt ein erneuter Pass-4-Lauf nichts.

- `claudeos-core/memory/` — 4 Markdown-Dateien (`decision-log.md`, `failure-patterns.md`, `compaction.md`, `auto-rule-update.md`)
- `.claude/rules/60.memory/` — 4 Rule-Dateien (`01.decision-log.md`, `02.failure-patterns.md`, `03.compaction.md`, `04.auto-rule-update.md`), die die Memory-Dateien automatisch laden, wenn Claude Code in relevanten Bereichen arbeitet
- `.claude/rules/00.core/51.doc-writing-rules.md` und `52.ai-work-rules.md` — universelle generische Regeln (Pass 3 erzeugt projektspezifische `00.core`-Regeln wie `00.standard-reference.md`; Pass 4 ergänzt diese beiden reservierten Slots, falls sie nicht schon existieren)
- `claudeos-core/standard/00.core/<NN>.doc-writing-guide.md` — Meta-Guide zum Schreiben zusätzlicher Regeln. Das Zahlen-Präfix wird automatisch auf `Math.max(existing-numbers) + 1` gesetzt, also typischerweise `04` oder `05`, je nachdem, was Pass 3 dort schon geschrieben hat.

**Ausgabe:** Memory-Dateien + `pass4-memory.json`-Marker.

Wichtig: **Pass 4 modifiziert `CLAUDE.md` nicht.** Pass 3 hat Section 8 (in der die Memory-Dateien referenziert werden) bereits verfasst. CLAUDE.md hier erneut zu modifizieren würde Section-8-Inhalte erneut deklarieren und Validator-Fehler auslösen. Diese Regel wird vom Prompt erzwungen und durch `tests/pass4-claude-md-untouched.test.js` verifiziert.

Details zu jeder Memory-Datei und ihrem Lebenszyklus finden Sie in [memory-layer.md](memory-layer.md).

---

## Schritt C — Verifikation (deterministisch, post-Claude)

Nachdem Claude fertig ist, verifiziert Node.js-Code die Ausgabe mit 5 Validatoren. **Keiner ruft ein LLM auf** — alle Prüfungen sind deterministisch.

| Validator | Was er prüft |
|---|---|
| `claude-md-validator` | Strukturelle Prüfungen an `CLAUDE.md` (Anzahl Top-Level-Sektionen, H3/H4-Anzahl pro Sektion, Eindeutigkeit/Scope der Memory-Datei-Tabellenzeilen, T1-Canonical-Heading-Tokens). Sprachunabhängig — dieselben Prüfungen bestehen für alle 10 Ausgabesprachen. |
| `content-validator` | 10 inhaltliche Prüfungen: erforderliche Dateien existieren, in Standards/Skills zitierte Pfade sind real, MANIFEST ist konsistent. |
| `pass-json-validator` | Pass-1/2/3/4-JSON-Ausgaben sind wohlgeformt und enthalten die erwarteten Schlüssel. |
| `plan-validator` | (Legacy) Vergleicht gespeicherte Plan-Dateien mit der Festplatte. Master-Plan-Generierung wurde in v2.1.0 entfernt, daher überwiegend No-op — wird aus Rückwärtskompatibilität beibehalten. |
| `sync-checker` | Festplattendateien in den verfolgten Verzeichnissen stimmen mit den `sync-map.json`-Registrierungen überein (orphaned vs. unregistered). |

Sie haben **3 Schweregrad-Stufen**:

- **fail** — Blockiert die Fertigstellung, beendet sich in CI mit Non-Zero. Etwas ist strukturell kaputt.
- **warn** — Erscheint in der Ausgabe, blockiert aber nicht. Wert, untersucht zu werden.
- **advisory** — Später prüfen. Häufig False Positives in ungewöhnlichen Projektlayouts (z. B. gitignorierte Dateien, die als „missing" markiert werden).

Die vollständige Prüfungsliste pro Validator finden Sie in [verification.md](verification.md).

Die Validatoren werden auf zwei Wegen orchestriert:

1. **`claudeos-core lint`** — führt nur `claude-md-validator` aus. Schnell, rein strukturell. Nach manueller Bearbeitung von CLAUDE.md verwenden.
2. **`claudeos-core health`** — führt die übrigen 4 Validatoren aus (claude-md-validator ist bewusst getrennt, da strukturelle Drift in CLAUDE.md ein Re-init-Signal ist und keine weiche Warnung). In CI empfohlen.

---

## Warum diese Architektur wichtig ist

### Faktengestützte Prompts verhindern Halluzinationen

Wenn Pass 3 läuft, sieht der Prompt grob so aus (vereinfacht):

```
Stack: java-spring-boot
ORM: mybatis
Architecture pattern: layer-first

Allowed source paths (you may only cite these):
- src/main/java/com/example/order/controller/OrderController.java
- src/main/java/com/example/order/service/OrderService.java
- ... [497 more]

DO NOT cite paths outside this list.

Now, for each domain, write a "Skill" that explains the domain's
conventions...
```

Claude hat keine Möglichkeit, Pfade zu erfinden. Die Einschränkung ist **positiv** (Whitelist), nicht negativ („erfinde keine Dinge") — der Unterschied zählt, weil LLMs konkreten positiven Einschränkungen besser folgen als abstrakten negativen.

Sollte Claude trotzdem einen erfundenen Pfad zitieren, markiert der `content-validator [10/10]`-Check am Ende ihn als `STALE_PATH`. Der Nutzer sieht die Warnung, bevor die Docs ausgeliefert werden.

### Resume-sicher über Marker

Jeder Pass schreibt nach erfolgreichem Abschluss eine Marker-Datei (`pass1-<N>.json`, `pass2-merged.json`, `pass3-complete.json`, `pass4-memory.json`). Wird `init` unterbrochen (Netzwerk-Aussetzer, Timeout, Strg-C), liest der nächste Lauf die Marker und setzt dort fort, wo der letzte aufgehört hat. Es geht keine Arbeit verloren.

Pass 3s Marker erfasst zudem, **welche Sub-Stages** abgeschlossen sind, sodass ein partielles Pass 3 (z. B. 3b fertig, 3c mitten in der Stage abgestürzt) ab der nächsten Stage fortsetzt, nicht ab 3a.

### Idempotente erneute Läufe

`init` auf einem Projekt mit bestehenden Regeln zu starten überschreibt manuelle Änderungen **nicht stillschweigend**.

Der Mechanismus: Das Berechtigungssystem von Claude Code blockiert Subprozess-Schreibvorgänge nach `.claude/`, sogar mit `--dangerously-skip-permissions`. Daher werden Pass 3/4 angewiesen, Rule-Dateien stattdessen in `claudeos-core/generated/.staged-rules/` zu schreiben. Nach jedem Pass verschiebt der Node.js-Orchestrator (der nicht der Berechtigungspolicy von Claude Code unterliegt) die gestageten Dateien unter Erhalt der Sub-Pfade in `.claude/rules/`.

In der Praxis bedeutet das: **In einem frischen Projekt erzeugt der erneute Lauf alles neu. In einem Projekt, in dem Sie Regeln manuell bearbeitet haben, regeneriert ein erneuter Lauf mit `--force` von Grund auf (Ihre Änderungen gehen verloren — genau das bedeutet `--force`). Ohne `--force` greift der Resume-Mechanismus und nur unvollendete Passes laufen.**

Die vollständige Bewahrungs-Story finden Sie in [safety.md](safety.md).

### Sprachunabhängige Verifikation

Die Validatoren matchen keinen übersetzten Heading-Text. Sie matchen die **strukturelle Form** (Heading-Level, Anzahl, Reihenfolge). Das bedeutet, derselbe `claude-md-validator` produziert byte-genau identische Verdikte auf einer CLAUDE.md, die in irgendeiner der 10 unterstützten Sprachen generiert wurde. Keine sprachspezifischen Wörterbücher. Keine Wartungslast beim Hinzufügen einer neuen Sprache.

---

## Performance — was zu erwarten ist

Konkrete Zeiten hängen stark ab von:
- Projektgröße (Anzahl Quelldateien, Anzahl Domains)
- Netzwerklatenz zur Anthropic-API
- Welches Claude-Modell in Ihrer Claude-Code-Konfiguration ausgewählt ist

Grobe Orientierung:

| Schritt | Zeit bei kleinem Projekt (<200 Dateien) | Zeit bei mittlerem Projekt (~1000 Dateien) |
|---|---|---|
| Schritt A (Scanner) | < 5 Sekunden | 10–30 Sekunden |
| Schritt B (4 Claude-Passes) | wenige Minuten | 10–30 Minuten |
| Schritt C (Validatoren) | < 5 Sekunden | 10–20 Sekunden |

Bei großen Projekten dominiert Pass 1 die Wanduhr, weil er einmal pro Domain-Gruppe läuft. Ein 24-Domain-Projekt = 6 Pass-1-Invocations (24 / 4 Domains pro Gruppe).

Wenn Sie eine genaue Zahl wollen, führen Sie es einmal in Ihrem Projekt aus — das ist die einzige ehrliche Antwort.

---

## Wo der Code für jeden Schritt liegt

| Schritt | Datei |
|---|---|
| Scanner-Orchestrator | `plan-installer/index.js` |
| Stack-Erkennung | `plan-installer/stack-detector.js` |
| Stackspezifische Scanner | `plan-installer/scanners/scan-{java,kotlin,node,python,frontend}.js` |
| Domain-Gruppierung | `plan-installer/domain-grouper.js` |
| Prompt-Zusammenstellung | `plan-installer/prompt-generator.js` |
| Init-Orchestrator | `bin/commands/init.js` |
| Pass-Templates | `pass-prompts/templates/<stack>/pass{1,2,3}.md` pro Stack; `pass-prompts/templates/common/pass4.md` stackübergreifend gemeinsam |
| Memory-Scaffolding | `lib/memory-scaffold.js` |
| Validatoren | `claude-md-validator/`, `content-validator/`, `pass-json-validator/`, `plan-validator/`, `sync-checker/` |
| Verifikations-Orchestrator | `health-checker/index.js` |

---

## Weiterführende Lektüre

- [stacks.md](stacks.md) — was jeder Scanner pro Stack extrahiert
- [memory-layer.md](memory-layer.md) — Pass 4 im Detail
- [verification.md](verification.md) — alle 5 Validatoren
- [diagrams.md](diagrams.md) — dieselbe Architektur als Mermaid-Bilder
- [comparison.md](comparison.md) — wie sich das von anderen Claude-Code-Tools unterscheidet
