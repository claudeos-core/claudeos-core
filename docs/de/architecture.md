# Architecture — Die 4-Pass-Pipeline

Dieses Dokument erklärt von vorn bis hinten, wie `claudeos-core init` wirklich arbeitet. Wer das Tool nur einsetzen will, kommt mit dem [Haupt-README](../../README.de.md) aus. Hier geht es darum zu verstehen, _warum_ das Design so aussieht.

Hast du das Tool noch nie laufen lassen, [starte es zuerst einmal](../../README.de.md#schnellstart). Die Konzepte unten werden viel greifbarer, wenn du die Ausgabe einmal gesehen hast.

> Englisches Original: [docs/architecture.md](../architecture.md). Die deutsche Übersetzung wird mit der englischen Version synchron gehalten.

---

## Die Kernidee — „Code bestätigt, Claude erstellt"

Die meisten Tools, die Claude-Code-Doku erzeugen, arbeiten in einem Schritt:

```
Ihre Beschreibung  →  Claude  →  CLAUDE.md / rules / standards
```

Claude muss deinen Stack, deine Konventionen, deine Domänenstruktur erraten. Es rät gut, aber es rät. ClaudeOS-Core dreht das um:

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

**Code übernimmt die Teile, die exakt sein müssen** (dein Stack, deine Dateipfade, deine Domänenstruktur).
**Claude übernimmt die Teile, die ausdrucksstark sein müssen** (Erklärungen, Konventionen, Prosa).
Sie überschneiden sich nicht und stellen sich nicht gegenseitig in Frage.

Warum das zählt: Ein LLM kann keine Pfade oder Frameworks erfinden, die in deinem Code gar nicht vorkommen. Der Pass-3-Prompt reicht Claude explizit die Allowlist der Quellpfade aus dem Scanner. Zitiert Claude trotzdem einen Pfad, der nicht auf der Liste steht, markiert der nachgelagerte `content-validator` ihn.

---

## Schritt A — Der Scanner (deterministisch)

Bevor Claude überhaupt aufgerufen wird, durchläuft ein Node.js-Prozess dein Projekt und schreibt `claudeos-core/generated/project-analysis.json`. Diese Datei ist die einzige Quelle der Wahrheit für alles Weitere.

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
| `.env*`-Dateien | Laufzeitkonfiguration (port, host, DB URL, siehe unten) |

Trifft keine zu, bricht `init` mit einer klaren Fehlermeldung ab, statt zu raten.

### Was der Scanner in `project-analysis.json` schreibt

- **Stack-Metadaten** — language, framework, ORM, DB, Package Manager, Build-Tool, Logger.
- **Architekturmuster.** Für Java eines von 5 Mustern (layer-first / domain-first / layer-then-domain / domain-then-layer / hexagonal). Für Kotlin: CQRS / BFF / Multi-Module. Für Frontend: App Router / Pages Router / FSD-Layouts plus `components/*/`-Muster mit mehrstufigen Fallbacks.
- **Domain-Liste.** Per Walk durch den Verzeichnisbaum entdeckt, mit Dateizahl pro Domäne. Der Scanner pickt ein bis zwei repräsentative Dateien pro Domäne aus, die Pass 1 dann liest.
- **Quellpfad-Allowlist.** Jeder Quelldatei-Pfad, der in deinem Projekt existiert. Pass-3-Prompts hängen diese Liste explizit an, damit Claude nichts raten muss.
- **Monorepo-Struktur.** Turborepo (`turbo.json`), pnpm-Workspaces (`pnpm-workspace.yaml`), Lerna (`lerna.json`) und npm/yarn-Workspaces (`package.json#workspaces`), falls vorhanden. NX wird nicht eigens automatisch erkannt; die generischen Muster `apps/*/` und `packages/*/` greifen aber trotzdem über die stackspezifischen Scanner.
- **`.env`-Snapshot.** Port, host, API-Target, sensible Variablen redigiert. Suchreihenfolge siehe [stacks.md](stacks.md).

Der Scanner macht **keine LLM-Aufrufe**. Gleiches Projekt + gleicher Code = jedes Mal dieselbe `project-analysis.json`.

Stackspezifische Details (was jeder Scanner extrahiert und wie) findest du in [stacks.md](stacks.md).

---

## Schritt B — Die 4-Pass-Claude-Pipeline

Jeder Pass hat eine klare Aufgabe. Sie laufen nacheinander, wobei Pass N die Ausgabe von Pass (N-1) als kleine strukturierte Datei liest, nicht die vollständige Ausgabe aller vorherigen Passes.

### Pass 1 — Tiefenanalyse pro Domäne

**Eingabe:** `project-analysis.json` + eine repräsentative Datei je Domäne.

**Aufgabe:** Liest die repräsentativen Dateien und extrahiert Muster über Dutzende Analysekategorien je Stack hinweg (typisch 50 bis 100+ Bullet-Punkte, je nach Stack). Das CQRS-fähige Kotlin/Spring-Template ist am dichtesten, die schlanken Node.js-Templates am kompaktesten. Beispiel: „Nutzt dieser Controller `@RestController` oder `@Controller`? Welcher Response-Wrapper kommt zum Einsatz? Welche Logging-Library?"

**Ausgabe:** `pass1-<group-N>.json`, eine Datei pro Domain-Gruppe.

Bei großen Projekten läuft Pass 1 mehrfach: eine Invocation je Domain-Gruppe. Die Gruppierungsregel lautet **höchstens 4 Domains und 40 Dateien pro Gruppe** und greift automatisch in `plan-installer/domain-grouper.js`. Ein 12-Domain-Projekt führt Pass 1 also dreimal aus.

Diese Aufteilung gibt es, weil Claudes Kontextfenster endlich ist. Wer 12 Domänen Quellcode in einen einzigen Prompt packt, lässt entweder den Kontext überlaufen oder zwingt das LLM zum Überfliegen. Die Aufteilung hält jeden Pass fokussiert.

### Pass 2 — Domänenübergreifender Merge

**Eingabe:** Alle `pass1-*.json`-Dateien.

**Aufgabe:** Verschmilzt sie zu einem projektweiten Bild. Widersprechen sich zwei Domänen (eine sagt etwa, der Response-Wrapper sei `success()`, die andere `ok()`), wählt Pass 2 die dominante Konvention und vermerkt die Abweichung.

**Ausgabe:** `pass2-merged.json`, typisch 100–400 KB.

### Pass 3 — Doku-Generierung (Split-Modus)

**Eingabe:** `pass2-merged.json`.

**Aufgabe:** Schreibt die eigentliche Dokumentation. Das ist der schwere Pass: Er erzeugt etwa 40–50 Markdown-Dateien quer über CLAUDE.md, `.claude/rules/`, `claudeos-core/standard/`, `claudeos-core/skills/`, `claudeos-core/guide/`, `claudeos-core/database/` und `claudeos-core/mcp-guide/`.

**Ausgabe:** Alle nutzerseitigen Dateien, organisiert in der Verzeichnisstruktur aus dem [Haupt-README](../../README.de.md#schnellstart).

Damit jede Stage ihre Ausgabe in Claudes Kontextfenster hält (die zusammengeführte Pass-2-Eingabe ist groß, die generierte Ausgabe noch größer), **wird Pass 3 immer in Stages zerlegt**, auch bei kleinen Projekten. Die Aufteilung greift bedingungslos. Kleine Projekte haben dann einfach weniger Pro-Domäne-Batches:

| Stage | Was sie schreibt |
|---|---|
| **3a** | Eine kleine „Faktentabelle" (`pass3a-facts.md`), aus `pass2-merged.json` extrahiert. Dient als komprimierte Eingabe für die späteren Stages, sodass diese die große Merge-Datei nicht erneut lesen müssen. |
| **3b-core** | Schreibt `CLAUDE.md` (den Index, den Claude Code zuerst liest) plus den Hauptteil von `claudeos-core/standard/`. |
| **3b-N** | Pro-Domain-Rule- und Standard-Dateien (eine Stage je Gruppe von ≤15 Domains). |
| **3c-core** | Schreibt `claudeos-core/skills/`-Orchestrator-Dateien plus `claudeos-core/guide/`. |
| **3c-N** | Pro-Domain-Skill-Dateien. |
| **3d-aux** | Schreibt Hilfs-Inhalte unter `claudeos-core/database/` und `claudeos-core/mcp-guide/`. |

Bei sehr großen Projekten (≥16 Domains) werden 3b und 3c in weitere Batches zerlegt. Jeder Batch bekommt ein frisches Kontextfenster.

Nach erfolgreichem Abschluss aller Stages landet `pass3-complete.json` als Marker auf der Platte. Bricht `init` mittendrin ab, liest der nächste Lauf den Marker und setzt ab der nächsten unbegonnenen Stage fort. Bereits fertige Stages laufen nicht erneut.

### Pass 4 — Memory-Schicht-Scaffolding

**Eingabe:** `project-analysis.json`, `pass2-merged.json`, `pass3a-facts.md`.

**Aufgabe:** Erzeugt die L4-Memory-Schicht plus die universellen Scaffold-Regeln. Alle Scaffold-Schreibvorgänge sind **skip-if-exists**, ein erneuter Pass-4-Lauf überschreibt also nichts.

- `claudeos-core/memory/`: 4 Markdown-Dateien (`decision-log.md`, `failure-patterns.md`, `compaction.md`, `auto-rule-update.md`)
- `.claude/rules/60.memory/`: 4 Rule-Dateien (`01.decision-log.md`, `02.failure-patterns.md`, `03.compaction.md`, `04.auto-rule-update.md`), die die Memory-Dateien automatisch laden, sobald Claude Code in relevanten Bereichen arbeitet
- `.claude/rules/00.core/51.doc-writing-rules.md` und `52.ai-work-rules.md`: universelle generische Regeln. Pass 3 erzeugt projektspezifische `00.core`-Regeln wie `00.standard-reference.md`; Pass 4 ergänzt diese beiden reservierten Slots, sofern sie noch nicht existieren.
- `claudeos-core/standard/00.core/<NN>.doc-writing-guide.md`: Meta-Guide zum Schreiben weiterer Regeln. Das Zahlen-Präfix landet automatisch bei `Math.max(existing-numbers) + 1`, also typisch `04` oder `05`, je nachdem, was Pass 3 dort schon geschrieben hat.

**Ausgabe:** Memory-Dateien plus `pass4-memory.json`-Marker.

Wichtig: **Pass 4 fasst `CLAUDE.md` nicht an.** Pass 3 hat Section 8 (mit den Memory-Datei-Referenzen) bereits geschrieben. Würde Pass 4 CLAUDE.md erneut anfassen, würde es Section-8-Inhalte ein zweites Mal deklarieren und Validator-Fehler auslösen. Diese Regel kommt aus dem Prompt und wird durch `tests/pass4-claude-md-untouched.test.js` abgesichert.

Details zu jeder Memory-Datei und ihrem Lebenszyklus liefert [memory-layer.md](memory-layer.md).

---

## Schritt C — Verifikation (deterministisch, post-Claude)

Sobald Claude fertig ist, prüft Node.js-Code die Ausgabe mit 5 Validatoren. **Keiner ruft ein LLM auf**, alle Prüfungen sind deterministisch.

| Validator | Was er prüft |
|---|---|
| `claude-md-validator` | Strukturelle Prüfungen an `CLAUDE.md` (Anzahl Top-Level-Sektionen, H3/H4-Anzahl pro Sektion, Eindeutigkeit/Scope der Memory-Datei-Tabellenzeilen, T1-Canonical-Heading-Tokens). Sprachunabhängig: dieselben Prüfungen bestehen in allen 10 Ausgabesprachen. |
| `content-validator` | 10 inhaltliche Prüfungen: erforderliche Dateien existieren, in Standards/Skills zitierte Pfade sind real, MANIFEST ist konsistent. |
| `pass-json-validator` | Pass-1/2/3/4-JSON-Ausgaben sind wohlgeformt und enthalten die erwarteten Schlüssel. |
| `plan-validator` | (Legacy) Vergleicht gespeicherte Plan-Dateien mit der Festplatte. Die Master-Plan-Generierung ist seit v2.1.0 raus, das Modul ist also weitgehend No-op. Bleibt aus Rückwärtskompatibilität erhalten. |
| `sync-checker` | Festplattendateien in den verfolgten Verzeichnissen stimmen mit den `sync-map.json`-Registrierungen überein (orphaned vs. unregistered). |

Sie kennen **3 Schweregrade**:

- **fail**: Blockiert den Abschluss, geht in CI mit Non-Zero raus. Strukturell ist etwas kaputt.
- **warn**: Taucht in der Ausgabe auf, blockiert aber nicht. Lohnt einen Blick.
- **advisory**: Später prüfen. Oft False Positives in ungewöhnlichen Projektlayouts, etwa wenn gitignorierte Dateien als „missing" markiert werden.

Die vollständige Prüfungsliste pro Validator liefert [verification.md](verification.md).

Die Validatoren laufen auf zwei Wegen:

1. **`claudeos-core lint`**: nur `claude-md-validator`. Schnell, rein strukturell. Nutzen, nachdem du CLAUDE.md manuell bearbeitet hast.
2. **`claudeos-core health`**: die übrigen 4 Validatoren. (claude-md-validator ist bewusst getrennt, denn strukturelle Drift in CLAUDE.md ist ein Re-init-Signal, keine weiche Warnung.) Empfohlen in CI.

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

Claude hat keine Möglichkeit, Pfade zu erfinden. Die Einschränkung ist **positiv** (Whitelist), nicht negativ („erfinde keine Dinge"). Der Unterschied zählt, weil LLMs konkreten positiven Einschränkungen besser folgen als abstrakten negativen.

Sollte Claude trotzdem einen erfundenen Pfad zitieren, markiert der `content-validator [10/10]`-Check am Ende ihn als `STALE_PATH`. Der Nutzer sieht die Warnung, bevor die Docs ausgeliefert sind.

### Resume-sicher über Marker

Jeder Pass schreibt nach erfolgreichem Abschluss eine Marker-Datei (`pass1-<N>.json`, `pass2-merged.json`, `pass3-complete.json`, `pass4-memory.json`). Bricht `init` ab (Netzaussetzer, Timeout, Strg-C), liest der nächste Lauf die Marker und setzt dort fort, wo der letzte aufgehört hat. Keine Arbeit geht verloren.

Pass 3s Marker hält außerdem fest, **welche Sub-Stages** fertig sind. So setzt ein angefangenes Pass 3 (etwa 3b fertig, 3c mittendrin abgeschmiert) bei der nächsten Stage fort, nicht bei 3a.

### Idempotente erneute Läufe

`init` auf einem Projekt mit bestehenden Regeln laufen lassen heißt **nicht**, dass manuelle Änderungen stillschweigend überschrieben werden.

Der Mechanismus: Das Berechtigungssystem von Claude Code blockiert Subprozess-Schreibvorgänge nach `.claude/`, sogar mit `--dangerously-skip-permissions`. Pass 3/4 schreiben Rule-Dateien deshalb stattdessen nach `claudeos-core/generated/.staged-rules/`. Nach jedem Pass verschiebt der Node.js-Orchestrator (der nicht unter Claude Codes Berechtigungspolicy fällt) die gestageten Dateien unter Erhalt der Sub-Pfade nach `.claude/rules/`.

In der Praxis heißt das: **In einem frischen Projekt erzeugt der erneute Lauf alles neu. In einem Projekt, in dem du Regeln manuell bearbeitet hast, regeneriert ein erneuter Lauf mit `--force` von Grund auf (deine Änderungen gehen verloren, genau das bedeutet `--force`). Ohne `--force` greift der Resume-Mechanismus und nur unvollendete Passes laufen.**

Was alles erhalten bleibt, steht in [safety.md](safety.md).

### Sprachunabhängige Verifikation

Die Validatoren matchen keinen übersetzten Heading-Text. Sie matchen die **strukturelle Form** (Heading-Level, Anzahl, Reihenfolge). Heißt: Derselbe `claude-md-validator` liefert byte-genau identische Verdikte auf einer CLAUDE.md, egal in welcher der 10 unterstützten Sprachen sie erzeugt wurde. Keine sprachspezifischen Wörterbücher, keine Wartungslast beim Hinzufügen einer neuen Sprache.

---

## Performance — was zu erwarten ist

Konkrete Zeiten hängen stark ab von:
- Projektgröße (Anzahl Quelldateien, Anzahl Domains)
- Netzlatenz zur Anthropic-API
- welches Claude-Modell deine Claude-Code-Konfiguration wählt

Grobe Orientierung:

| Schritt | Zeit bei kleinem Projekt (<200 Dateien) | Zeit bei mittlerem Projekt (~1000 Dateien) |
|---|---|---|
| Schritt A (Scanner) | < 5 Sekunden | 10–30 Sekunden |
| Schritt B (4 Claude-Passes) | wenige Minuten | 10–30 Minuten |
| Schritt C (Validatoren) | < 5 Sekunden | 10–20 Sekunden |

Bei großen Projekten dominiert Pass 1 die Wanduhr, weil er einmal pro Domain-Gruppe läuft. Ein 24-Domain-Projekt = 6 Pass-1-Invocations (24 / 4 Domains pro Gruppe).

Wer eine genaue Zahl will: einmal im eigenen Projekt laufen lassen. Das ist die einzige ehrliche Antwort.

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

- [stacks.md](stacks.md): was jeder Scanner pro Stack extrahiert
- [memory-layer.md](memory-layer.md): Pass 4 im Detail
- [verification.md](verification.md): alle 5 Validatoren
- [diagrams.md](diagrams.md): dieselbe Architektur als Mermaid-Bilder
- [comparison.md](comparison.md): worin sich das von anderen Claude-Code-Tools unterscheidet
