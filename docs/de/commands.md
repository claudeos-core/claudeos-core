# CLI-Befehle

Jeder Befehl, jedes Flag, jeder Exit-Code, den ClaudeOS-Core tatsächlich unterstützt.

Diese Seite ist eine Referenz. Wenn Sie neu sind, lesen Sie zuerst den [Quick Start im Haupt-README](../../README.de.md#quick-start).

Alle Befehle werden über `npx claudeos-core <command>` ausgeführt (oder `claudeos-core <command>`, falls global installiert — siehe [manual-installation.md](manual-installation.md)).

> Englisches Original: [docs/commands.md](../commands.md). Die deutsche Übersetzung wird mit der englischen Version synchron gehalten.

---

## Globale Flags

Diese funktionieren bei jedem Befehl:

| Flag | Wirkung |
|---|---|
| `--help` / `-h` | Hilfe anzeigen. Hinter einem Befehl platziert (z. B. `memory --help`), übernimmt der Sub-Befehl seine eigene Hilfe. |
| `--version` / `-v` | Installierte Version ausgeben. |
| `--lang <code>` | Ausgabesprache. Eine von: `en`, `ko`, `ja`, `zh-CN`, `es`, `vi`, `hi`, `ru`, `fr`, `de`. Default: `en`. Aktuell nur von `init` ausgewertet. |
| `--force` / `-f` | Resume-Prompt überspringen; vorherige Ergebnisse löschen. Aktuell nur von `init` ausgewertet. |

Das ist die vollständige Liste der CLI-Flags. **Kein `--json`, `--strict`, `--quiet`, `--verbose`, `--dry-run` etc.** Wenn Sie diese in älteren Docs gesehen haben, sind sie nicht real — `bin/cli.js` parst nur die vier obigen Flags.

---

## Schnellreferenz

| Befehl | Verwenden, wenn |
|---|---|
| `init` | Erstmaliger Aufruf in einem Projekt. Generiert alles. |
| `lint` | Nach manueller Bearbeitung von `CLAUDE.md`. Führt strukturelle Validierung aus. |
| `health` | Vor Commits oder in CI. Führt die vier Inhalts-/Pfad-Validatoren aus. |
| `restore` | Gespeicherter Plan → Festplatte. (Seit v2.1.0 weitgehend No-op; aus Rückwärtskompatibilität beibehalten.) |
| `refresh` | Festplatte → gespeicherter Plan. (Seit v2.1.0 weitgehend No-op; aus Rückwärtskompatibilität beibehalten.) |
| `validate` | Führt den `--check`-Modus von plan-validator aus. (Seit v2.1.0 weitgehend No-op.) |
| `memory <sub>` | Memory-Schicht-Wartung: `compact`, `score`, `propose-rules`. |

`restore` / `refresh` / `validate` werden beibehalten, weil sie in Projekten ohne die Legacy-Plan-Dateien harmlos sind. Existiert `plan/` nicht (der v2.1.0+-Default), überspringen alle drei mit informativen Meldungen.

---

## `init` — Den Doku-Set generieren

```bash
npx claudeos-core init [--lang <code>] [--force]
```

Der Hauptbefehl. Führt die [4-Pass-Pipeline](architecture.md) von Anfang bis Ende aus:

1. Scanner produziert `project-analysis.json`.
2. Pass 1 analysiert jede Domain-Gruppe.
3. Pass 2 verschmilzt Domains zu einem projektweiten Bild.
4. Pass 3 erzeugt CLAUDE.md, rules, standards, skills, guides.
5. Pass 4 baut das Memory-Schicht-Scaffolding auf.

**Beispiele:**

```bash
# Erstmalig, englische Ausgabe
npx claudeos-core init

# Erstmalig, koreanische Ausgabe
npx claudeos-core init --lang ko

# Alles von Grund auf neu generieren
npx claudeos-core init --force
```

### Resume-Sicherheit

`init` ist **resume-sicher**. Bei Unterbrechung (Netzwerk-Aussetzer, Timeout, Strg-C) setzt der nächste Lauf am letzten abgeschlossenen Pass-Marker an. Marker liegen in `claudeos-core/generated/`:

- `pass1-<group>.json` — Pass-1-Ausgabe je Domain
- `pass2-merged.json` — Pass-2-Ausgabe
- `pass3-complete.json` — Pass-3-Marker (verfolgt zudem, welche Sub-Stages des Split-Modus abgeschlossen sind)
- `pass4-memory.json` — Pass-4-Marker

Ist ein Marker fehlerhaft (z. B. ein während des Schreibens abgestürzter Lauf hinterließ `{"error":"timeout"}`), lehnt der Validator ihn ab und der Pass wird neu ausgeführt.

Bei einem partiellen Pass 3 (Split-Modus zwischen Stages unterbrochen) inspiziert der Resume-Mechanismus den Marker-Body — ist `mode === "split"` und `completedAt` fehlt, wird Pass 3 erneut aufgerufen und setzt von der nächsten unbegonnenen Stage fort.

### Was `--force` tut

`--force` löscht:
- Jede `.json`- und `.md`-Datei unter `claudeos-core/generated/` (inkl. aller vier Pass-Marker)
- Das übriggebliebene Verzeichnis `claudeos-core/generated/.staged-rules/`, falls ein vorheriger Lauf mitten im Move abgestürzt ist
- Alles unter `.claude/rules/` (damit Pass 3s „zero-rules detection" nicht durch veraltete Regeln false-negativ ausfällt)

`--force` löscht **nicht**:
- `claudeos-core/memory/`-Dateien (Ihr Decision Log und Failure Patterns bleiben erhalten)
- Dateien außerhalb von `claudeos-core/` und `.claude/`

**Manuelle Änderungen an Regeln gehen unter `--force` verloren.** Das ist der Trade-off — `--force` existiert für „Ich will eine saubere Tafel". Wenn Sie Änderungen erhalten wollen, einfach ohne `--force` neu starten.

### Interaktiv vs. nicht-interaktiv

Ohne `--lang` zeigt `init` einen interaktiven Sprachselektor (10 Optionen, Pfeiltasten oder Zifferneingabe). In Nicht-TTY-Umgebungen (CI, Pipe) fällt der Selektor auf readline zurück und schließlich auf einen nicht-interaktiven Default, falls keine Eingabe kommt.

Ohne `--force` zeigt `init` einen Continue/Fresh-Prompt, sofern bestehende Pass-Marker erkannt werden. Mit `--force` wird dieser Prompt vollständig übersprungen.

---

## `lint` — `CLAUDE.md`-Struktur validieren

```bash
npx claudeos-core lint
```

Führt `claude-md-validator` gegen die `CLAUDE.md` Ihres Projekts aus. Schnell — keine LLM-Aufrufe, nur strukturelle Prüfungen.

**Exit-Codes:**
- `0` — Pass.
- `1` — Fail. Mindestens ein strukturelles Problem.

**Was er prüft** (siehe [verification.md](verification.md) für die vollständige Liste der Check-IDs):

- Section-Anzahl muss genau 8 sein.
- Section 4 muss 3 oder 4 H3-Sub-Sections haben.
- Section 6 muss genau 3 H3-Sub-Sections haben.
- Section 8 muss genau 2 H3-Sub-Sections (Common Rules + L4 Memory) UND genau 2 H4-Sub-Sub-Sections (L4 Memory Files + Memory Workflow) haben.
- Jedes kanonische Section-Heading muss seinen englischen Token enthalten (z. B. `Role Definition`, `Memory`), damit Multi-Repo-Grep unabhängig von `--lang` funktioniert.
- Jede der 4 Memory-Dateien erscheint in genau EINER Markdown-Tabellenzeile, beschränkt auf Section 8.

Der Validator ist **sprachunabhängig**: Dieselben Prüfungen funktionieren auf einer mit `--lang ko`, `--lang ja` oder einer beliebigen anderen unterstützten Sprache generierten CLAUDE.md.

Geeignet für Pre-Commit-Hooks und CI.

---

## `health` — Verifikations-Suite ausführen

```bash
npx claudeos-core health
```

Orchestriert **4 Validatoren** (claude-md-validator läuft separat über `lint`):

| Reihenfolge | Validator | Stufe | Was bei Fail passiert |
|---|---|---|---|
| 1 | `manifest-generator` (Voraussetzung) | — | Schlägt das fehl, wird `sync-checker` übersprungen. |
| 2 | `plan-validator` | fail | Exit 1. |
| 3 | `sync-checker` | fail | Exit 1 (falls manifest erfolgreich war). |
| 4 | `content-validator` | advisory | Erscheint, blockiert aber nicht. |
| 5 | `pass-json-validator` | warn | Erscheint, blockiert aber nicht. |

**Exit-Codes:**
- `0` — Keine Befunde der Stufe `fail`. Warnungen und Hinweise können vorhanden sein.
- `1` — Mindestens ein Befund der Stufe `fail`.

Die 3-Stufen-Schwere (fail / warn / advisory) wurde hinzugefügt, damit `content-validator`-Befunde (die in ungewöhnlichen Layouts oft False Positives haben) CI-Pipelines nicht blockieren.

Details zu den Prüfungen jedes Validators finden Sie in [verification.md](verification.md).

---

## `restore` — Gespeicherten Plan auf die Festplatte anwenden (Legacy)

```bash
npx claudeos-core restore
```

Führt `plan-validator` im `--execute`-Modus aus: Kopiert Inhalte aus `claudeos-core/plan/*.md`-Dateien in die beschriebenen Orte.

**v2.1.0-Status:** Master-Plan-Generierung wurde entfernt. `claudeos-core/plan/` wird nicht mehr automatisch angelegt. Existiert `plan/` nicht, gibt der Befehl eine informative Meldung aus und beendet sich sauber.

Der Befehl wird für Nutzer beibehalten, die Plan-Dateien für ad-hoc-Backup/Restore-Zwecke handpflegen. In v2.1.0+-Projekten harmlos.

Erzeugt ein `.bak`-Backup jeder überschriebenen Datei.

---

## `refresh` — Festplatte mit gespeichertem Plan synchronisieren (Legacy)

```bash
npx claudeos-core refresh
```

Das Gegenteil von `restore`. Führt `plan-validator` im `--refresh`-Modus aus: Liest den aktuellen Stand der Festplattendateien und aktualisiert `claudeos-core/plan/*.md` entsprechend.

**v2.1.0-Status:** Wie bei `restore` — No-op, wenn `plan/` fehlt.

---

## `validate` — Plan-↔-Festplatten-Diff (Legacy)

```bash
npx claudeos-core validate
```

Führt `plan-validator` im `--check`-Modus aus: Meldet Unterschiede zwischen `claudeos-core/plan/*.md` und der Festplatte, modifiziert aber nichts.

**v2.1.0-Status:** No-op, wenn `plan/` fehlt. Die meisten Nutzer sollten stattdessen `health` ausführen, das `plan-validator` zusammen mit den anderen Validatoren aufruft.

---

## `memory <subcommand>` — Memory-Schicht-Wartung

```bash
npx claudeos-core memory <subcommand>
```

Drei Sub-Befehle. Sie operieren auf den `claudeos-core/memory/`-Dateien, die von Pass 4 von `init` geschrieben werden. Fehlen diese Dateien, gibt jeder Sub-Befehl `not found` aus und überspringt sauber (Best-Effort-Tools).

Details zum Memory-Modell finden Sie in [memory-layer.md](memory-layer.md).

### `memory compact`

```bash
npx claudeos-core memory compact
```

Wendet eine 4-stufige Verdichtung über `decision-log.md` und `failure-patterns.md` an:

| Stufe | Trigger | Aktion |
|---|---|---|
| 1 | `lastSeen > 30 days` UND nicht preserved | Body kollabiert auf eine 1-Zeilen-„fix" + Meta |
| 2 | Doppelte Headings | Verschmolzen (Frequenzen summiert, Body = aktuellster) |
| 3 | `importance < 3` UND `lastSeen > 60 days` | Verworfen |
| 4 | Datei > 400 Zeilen | Älteste nicht-preservierten Einträge gekürzt |

Einträge mit `importance >= 7`, `lastSeen < 30 days` oder einem Body, der einen konkreten (nicht-Glob) aktiven Rule-Pfad referenziert, werden automatisch erhalten.

Nach der Verdichtung wird nur die `## Last Compaction`-Section von `compaction.md` ersetzt — alles andere (Ihre manuellen Notizen) bleibt erhalten.

### `memory score`

```bash
npx claudeos-core memory score
```

Berechnet Wichtigkeitswerte für Einträge in `failure-patterns.md` neu:

```
importance = round(frequency × 1.5 + recency × 5), capped at 10
```

Entfernt vor dem Einfügen alle bestehenden Importance-Zeilen (verhindert Duplikat-Zeilen-Regressionen). Der neue Wert wird in den Body des Eintrags zurückgeschrieben.

### `memory propose-rules`

```bash
npx claudeos-core memory propose-rules
```

Liest `failure-patterns.md`, wählt Einträge mit Frequenz ≥ 3 und bittet Claude, vorgeschlagenen `.claude/rules/`-Inhalt für die besten Kandidaten zu entwerfen.

Vertrauen pro Kandidat:
```
evidence    = 1.5 × frequency + 0.5 × importance   (importance defaults to 0; capped at 6 if importance is missing)
confidence  = sigmoid_{k=0.35, x0=8}(evidence) × (anchored ? 1.0 : 0.6)
```

(`anchored` = Eintrag erwähnt einen konkreten Datei-Pfad, der auf der Festplatte existiert.)

Die Ausgabe wird **an `claudeos-core/memory/auto-rule-update.md` angehängt** zur Prüfung. **Sie wird nicht automatisch übernommen** — Sie entscheiden, welche Vorschläge in echte Rule-Dateien kopiert werden.

---

## Umgebungsvariablen

| Variable | Wirkung |
|---|---|
| `CLAUDEOS_SKIP_TRANSLATION=1` | Schließt den Übersetzungspfad des Memory-Scaffolds kurz; wirft, bevor `claude -p` aufgerufen wird. Wird von CI und übersetzungsabhängigen Tests genutzt, damit sie keine reale Claude-CLI-Installation benötigen. Strikte `=== "1"`-Semantik — andere Werte aktivieren es nicht. |
| `CLAUDEOS_ROOT` | Wird automatisch von `bin/cli.js` auf das Projekt-Root des Nutzers gesetzt. Intern — nicht überschreiben. |

Das ist die vollständige Liste. Es gibt kein `CLAUDE_PATH`, `DEBUG=claudeos:*`, `CLAUDEOS_NO_COLOR` etc. — diese existieren nicht.

---

## Exit-Codes

| Code | Bedeutung |
|---|---|
| `0` | Erfolg. |
| `1` | Validierungsfehler (Befund der Stufe `fail`) oder `InitError` (z. B. fehlende Voraussetzung, fehlerhafter Marker, Datei-Lock). |
| Andere | Vom darunterliegenden Node-Prozess oder Sub-Tool weitergereicht — unbehandelte Exceptions, Schreibfehler usw. |

Es gibt keinen speziellen Exit-Code für „unterbrochen" — Strg-C beendet den Prozess. Erneut `init` starten, und der Resume-Mechanismus übernimmt.

---

## Was `npm test` ausführt (für Mitwirkende)

Wenn Sie das Repo geklont haben und die Test-Suite lokal ausführen wollen:

```bash
npm test
```

Das führt `node tests/*.test.js` über 33 Testdateien aus. Die Test-Suite verwendet Nodes eingebauten `node:test`-Runner (kein Jest, kein Mocha) und Nodes `node:assert/strict`.

Für eine einzelne Testdatei:

```bash
node tests/scan-java.test.js
```

CI führt die Suite auf Linux / macOS / Windows × Node 18 / 20 aus. Der CI-Workflow setzt `CLAUDEOS_SKIP_TRANSLATION=1`, sodass übersetzungsabhängige Tests keine `claude`-CLI brauchen.

---

## Siehe auch

- [architecture.md](architecture.md) — was `init` intern tatsächlich tut
- [verification.md](verification.md) — was die Validatoren prüfen
- [memory-layer.md](memory-layer.md) — worauf die `memory`-Sub-Befehle operieren
- [troubleshooting.md](troubleshooting.md) — wenn Befehle scheitern
