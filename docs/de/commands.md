# CLI-Befehle

Jeder Befehl, jedes Flag, jeder Exit-Code, den ClaudeOS-Core wirklich unterstützt.

Diese Seite ist eine Referenz. Wer neu einsteigt, liest zuerst den [Schnellstart im Haupt-README](../../README.de.md#schnellstart).

Alle Befehle laufen über `npx claudeos-core <command>` (oder `claudeos-core <command>`, falls global installiert; siehe [manual-installation.md](manual-installation.md)).

> Englisches Original: [docs/commands.md](../commands.md). Die deutsche Übersetzung wird mit der englischen Version synchron gehalten.

---

## Globale Flags

Diese funktionieren bei jedem Befehl:

| Flag | Wirkung |
|---|---|
| `--help` / `-h` | Hilfe anzeigen. Hinter einem Befehl platziert (z. B. `memory --help`), liefert der Sub-Befehl seine eigene Hilfe. |
| `--version` / `-v` | Installierte Version ausgeben. |
| `--lang <code>` | Ausgabesprache. Eine von: `en`, `ko`, `ja`, `zh-CN`, `es`, `vi`, `hi`, `ru`, `fr`, `de`. Default: `en`. Aktuell wertet nur `init` das Flag aus. |
| `--force` / `-f` | Resume-Prompt überspringen, vorherige Ergebnisse löschen. Aktuell wertet nur `init` das Flag aus. |

Das ist die komplette Liste der CLI-Flags. **Kein `--json`, `--strict`, `--quiet`, `--verbose`, `--dry-run` usw.** Falls solche Flags in älteren Docs auftauchen: Die existieren nicht. `bin/cli.js` parst nur die vier oben.

---

## Schnellreferenz

| Befehl | Verwenden, wenn |
|---|---|
| `init` | Erster Aufruf in einem Projekt. Generiert alles. |
| `lint` | Nach manueller Bearbeitung von `CLAUDE.md`. Strukturelle Validierung. |
| `health` | Vor Commits oder in CI. Führt die vier Inhalts- und Pfad-Validatoren aus. |
| `restore` | Gespeicherter Plan zurück auf die Festplatte. (Seit v2.1.0 weitgehend No-op, bleibt aus Rückwärtskompatibilität.) |
| `refresh` | Festplatte zurück in den gespeicherten Plan. (Seit v2.1.0 weitgehend No-op, bleibt aus Rückwärtskompatibilität.) |
| `validate` | Startet plan-validator im `--check`-Modus. (Seit v2.1.0 weitgehend No-op.) |
| `memory <sub>` | Wartung der Memory-Schicht: `compact`, `score`, `propose-rules`. |

`restore`, `refresh` und `validate` bleiben erhalten, weil sie in Projekten ohne Legacy-Plan-Dateien harmlos sind. Fehlt `plan/` (der v2.1.0+-Default), überspringen alle drei mit informativen Meldungen.

---

## `init` — Den Doku-Set generieren

```bash
npx claudeos-core init [--lang <code>] [--force]
```

Der Hauptbefehl. Fährt die [4-Pass-Pipeline](architecture.md) von Anfang bis Ende:

1. Der Scanner schreibt `project-analysis.json`.
2. Pass 1 analysiert jede Domain-Gruppe.
3. Pass 2 fasst die Domains zu einem projektweiten Bild zusammen.
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

`init` ist **resume-sicher**. Bricht der Lauf ab (Netzwerk-Aussetzer, Timeout, Strg-C), setzt der nächste Aufruf beim letzten abgeschlossenen Pass-Marker an. Marker liegen in `claudeos-core/generated/`:

- `pass1-<group>.json`: Pass-1-Ausgabe je Domain
- `pass2-merged.json`: Pass-2-Ausgabe
- `pass3-complete.json`: Pass-3-Marker (hält außerdem fest, welche Sub-Stages im Split-Modus fertig sind)
- `pass4-memory.json`: Pass-4-Marker

Ist ein Marker kaputt (etwa weil ein Lauf mitten beim Schreiben abstürzte und `{"error":"timeout"}` zurückließ), lehnt der Validator ihn ab und der Pass läuft neu.

Bei partiell ausgeführtem Pass 3 (Split-Modus zwischen zwei Stages unterbrochen) prüft der Resume-Mechanismus den Marker-Body. Steht dort `mode === "split"` ohne `completedAt`, ruft `init` Pass 3 erneut auf und setzt bei der nächsten unbegonnenen Stage fort.

### Was `--force` tut

`--force` löscht:
- Jede `.json`- und `.md`-Datei unter `claudeos-core/generated/` (inklusive aller vier Pass-Marker)
- Das übriggebliebene Verzeichnis `claudeos-core/generated/.staged-rules/`, falls ein vorheriger Lauf beim Move abgestürzt ist
- Alles unter `.claude/rules/` (damit die „zero-rules detection" in Pass 3 nicht wegen veralteter Regeln false-negative ausfällt)

`--force` löscht **nicht**:
- Dateien in `claudeos-core/memory/` (Decision Log und Failure Patterns bleiben erhalten)
- Dateien außerhalb von `claudeos-core/` und `.claude/`

**Manuelle Änderungen an Regeln gehen unter `--force` verloren.** Das ist der Trade-off: `--force` existiert für den Fall „saubere Tafel". Wer Änderungen erhalten will, startet einfach ohne `--force` neu.

### Interaktiv vs. nicht-interaktiv

Ohne `--lang` zeigt `init` einen interaktiven Sprachselektor mit 10 Optionen (Pfeiltasten oder Zifferneingabe). In Nicht-TTY-Umgebungen (CI, Pipe) fällt der Selektor auf readline zurück und schließlich auf einen nicht-interaktiven Default, wenn keine Eingabe kommt.

Ohne `--force` zeigt `init` bei vorhandenen Pass-Markern einen Continue/Fresh-Prompt. Mit `--force` entfällt dieser Prompt komplett.

---

## `lint` — `CLAUDE.md`-Struktur validieren

```bash
npx claudeos-core lint
```

Lässt `claude-md-validator` gegen die `CLAUDE.md` des Projekts laufen. Schnell, keine LLM-Aufrufe, nur strukturelle Prüfungen.

**Exit-Codes:**
- `0`: Pass.
- `1`: Fail, mindestens ein strukturelles Problem.

**Was geprüft wird** (vollständige Liste der Check-IDs in [verification.md](verification.md)):

- Anzahl der Sections muss genau 8 sein.
- Section 4 muss 3 oder 4 H3-Sub-Sections haben.
- Section 6 muss genau 3 H3-Sub-Sections haben.
- Section 8 muss genau 2 H3-Sub-Sections (Common Rules + L4 Memory) UND genau 2 H4-Sub-Sub-Sections (L4 Memory Files + Memory Workflow) haben.
- Jedes kanonische Section-Heading muss seinen englischen Token enthalten (etwa `Role Definition`, `Memory`), damit Multi-Repo-Grep unabhängig von `--lang` funktioniert.
- Jede der 4 Memory-Dateien erscheint in genau EINER Markdown-Tabellenzeile, ausschließlich in Section 8.

Der Validator ist **sprachunabhängig**: Dieselben Prüfungen greifen bei einer CLAUDE.md, die mit `--lang ko`, `--lang ja` oder einer beliebigen anderen unterstützten Sprache erzeugt wurde.

Passt gut in Pre-Commit-Hooks und CI.

---

## `health` — Verifikations-Suite ausführen

```bash
npx claudeos-core health
```

Orchestriert **4 Validatoren** (claude-md-validator läuft separat über `lint`):

| Reihenfolge | Validator | Stufe | Was bei Fail passiert |
|---|---|---|---|
| 1 | `manifest-generator` (Voraussetzung) | — | Schlägt das fehl, entfällt `sync-checker`. |
| 2 | `plan-validator` | fail | Exit 1. |
| 3 | `sync-checker` | fail | Exit 1 (sofern manifest erfolgreich war). |
| 4 | `content-validator` | advisory | Erscheint, blockiert aber nicht. |
| 5 | `pass-json-validator` | warn | Erscheint, blockiert aber nicht. |

**Exit-Codes:**
- `0`: Keine Befunde der Stufe `fail`. Warnungen und Hinweise sind möglich.
- `1`: Mindestens ein Befund der Stufe `fail`.

Das 3-Stufen-Modell (fail / warn / advisory) kam dazu, damit `content-validator`-Befunde (in ungewöhnlichen Layouts häufig False Positives) CI-Pipelines nicht blockieren.

Details zu den Prüfungen pro Validator stehen in [verification.md](verification.md).

---

## `restore` — Gespeicherten Plan auf die Festplatte anwenden (Legacy)

```bash
npx claudeos-core restore
```

Startet `plan-validator` im `--execute`-Modus: Kopiert Inhalte aus `claudeos-core/plan/*.md` an die beschriebenen Orte.

**v2.1.0-Status:** Die Master-Plan-Generierung ist entfernt. `claudeos-core/plan/` wird nicht mehr automatisch angelegt. Fehlt `plan/`, gibt der Befehl eine informative Meldung aus und beendet sich sauber.

Der Befehl bleibt für alle, die Plan-Dateien zu ad-hoc-Backup-/Restore-Zwecken pflegen. In v2.1.0+-Projekten harmlos.

Legt zu jeder überschriebenen Datei ein `.bak`-Backup an.

---

## `refresh` — Festplatte mit gespeichertem Plan synchronisieren (Legacy)

```bash
npx claudeos-core refresh
```

Das Gegenstück zu `restore`. Startet `plan-validator` im `--refresh`-Modus: Liest den aktuellen Stand der Festplatten-Dateien und aktualisiert `claudeos-core/plan/*.md` entsprechend.

**v2.1.0-Status:** Wie bei `restore`, No-op, wenn `plan/` fehlt.

---

## `validate` — Plan-↔-Festplatten-Diff (Legacy)

```bash
npx claudeos-core validate
```

Startet `plan-validator` im `--check`-Modus: Meldet Unterschiede zwischen `claudeos-core/plan/*.md` und der Festplatte, ohne etwas zu ändern.

**v2.1.0-Status:** No-op, wenn `plan/` fehlt. Sinnvoller ist meist `health`, das `plan-validator` zusammen mit den übrigen Validatoren aufruft.

---

## `memory <subcommand>` — Memory-Schicht-Wartung

```bash
npx claudeos-core memory <subcommand>
```

Drei Sub-Befehle. Sie arbeiten auf den `claudeos-core/memory/`-Dateien, die Pass 4 von `init` schreibt. Fehlen diese Dateien, gibt jeder Sub-Befehl `not found` aus und beendet sich sauber (Best-Effort-Tools).

Details zum Memory-Modell stehen in [memory-layer.md](memory-layer.md).

### `memory compact`

```bash
npx claudeos-core memory compact
```

Verdichtet `decision-log.md` und `failure-patterns.md` in vier Stufen:

| Stufe | Trigger | Aktion |
|---|---|---|
| 1 | `lastSeen > 30 days` UND nicht preserved | Body fällt auf eine 1-Zeilen-„fix" plus Meta zusammen |
| 2 | Doppelte Headings | Verschmolzen (Frequenzen summiert, Body = aktuellster) |
| 3 | `importance < 3` UND `lastSeen > 60 days` | Verworfen |
| 4 | Datei > 400 Zeilen | Älteste nicht-preservierten Einträge gekürzt |

Einträge mit `importance >= 7`, `lastSeen < 30 days` oder einem Body, der einen konkreten (nicht-Glob) aktiven Rule-Pfad referenziert, bleiben automatisch erhalten.

Nach der Verdichtung wird nur die `## Last Compaction`-Section von `compaction.md` ersetzt. Alles andere (manuelle Notizen) bleibt unangetastet.

### `memory score`

```bash
npx claudeos-core memory score
```

Berechnet Wichtigkeitswerte für Einträge in `failure-patterns.md` neu:

```
importance = round(frequency × 1.5 + recency × 5), capped at 10
```

Vor dem Einfügen entfernt der Befehl alle bestehenden Importance-Zeilen (verhindert Duplikat-Zeilen-Regressionen). Der neue Wert wandert dann in den Body des Eintrags.

### `memory propose-rules`

```bash
npx claudeos-core memory propose-rules
```

Liest `failure-patterns.md`, wählt Einträge mit Frequenz ≥ 3 und bittet Claude, für die besten Kandidaten Vorschläge für `.claude/rules/`-Inhalte zu entwerfen.

Vertrauen pro Kandidat:
```
evidence    = 1.5 × frequency + 0.5 × importance   (importance defaults to 0; capped at 6 if importance is missing)
confidence  = sigmoid_{k=0.35, x0=8}(evidence) × (anchored ? 1.0 : 0.6)
```

(`anchored` = Eintrag erwähnt einen konkreten Datei-Pfad, der real existiert.)

Die Ausgabe wandert **angehängt an `claudeos-core/memory/auto-rule-update.md`** zur Prüfung. **Automatisch übernommen wird nichts.** Du entscheidest, welche Vorschläge in echte Rule-Dateien einfließen.

---

## Umgebungsvariablen

| Variable | Wirkung |
|---|---|
| `CLAUDEOS_SKIP_TRANSLATION=1` | Schließt den Übersetzungspfad des Memory-Scaffolds kurz und wirft eine Exception, bevor `claude -p` aufgerufen wird. CI und übersetzungsabhängige Tests nutzen das, um ohne reale Claude-CLI-Installation auszukommen. Strikte `=== "1"`-Semantik, andere Werte aktivieren das Flag nicht. |
| `CLAUDEOS_ROOT` | Wird automatisch von `bin/cli.js` auf das Projekt-Root gesetzt. Intern, nicht überschreiben. |

Das ist die komplette Liste. Es gibt kein `CLAUDE_PATH`, `DEBUG=claudeos:*`, `CLAUDEOS_NO_COLOR` usw. Diese Variablen existieren nicht.

---

## Exit-Codes

| Code | Bedeutung |
|---|---|
| `0` | Erfolg. |
| `1` | Validierungsfehler (Befund der Stufe `fail`) oder `InitError` (etwa fehlende Voraussetzung, kaputter Marker, Datei-Lock). |
| Andere | Vom zugrunde liegenden Node-Prozess oder Sub-Tool weitergereicht: unbehandelte Exceptions, Schreibfehler usw. |

Einen eigenen Exit-Code für „unterbrochen" gibt es nicht. Strg-C beendet den Prozess. Beim nächsten `init` übernimmt der Resume-Mechanismus.

---

## Was `npm test` ausführt (für Mitwirkende)

Wer das Repo geklont hat und die Test-Suite lokal laufen lassen möchte:

```bash
npm test
```

Das ruft `node tests/*.test.js` über 33 Testdateien auf. Die Suite nutzt Nodes eingebauten `node:test`-Runner (kein Jest, kein Mocha) und `node:assert/strict`.

Eine einzelne Testdatei:

```bash
node tests/scan-java.test.js
```

CI fährt die Suite auf Linux / macOS / Windows × Node 18 / 20. Der CI-Workflow setzt `CLAUDEOS_SKIP_TRANSLATION=1`, sodass übersetzungsabhängige Tests keine `claude`-CLI brauchen.

---

## Siehe auch

- [architecture.md](architecture.md): was `init` intern wirklich tut
- [verification.md](verification.md): was die Validatoren prüfen
- [memory-layer.md](memory-layer.md): worauf die `memory`-Sub-Befehle arbeiten
- [troubleshooting.md](troubleshooting.md): wenn Befehle scheitern
