# Verification

Nachdem Claude die Dokumentation generiert hat, verifiziert Code die Ausgabe mit **5 separaten Validatoren**. Keiner von ihnen ruft ein LLM auf — alle Prüfungen sind deterministisch.

Diese Seite behandelt, was jeder Validator prüft, wie die Schweregrad-Stufen funktionieren und wie die Ausgabe zu lesen ist.

> Englisches Original: [docs/verification.md](../verification.md). Die deutsche Übersetzung wird mit der englischen Version synchron gehalten.

---

## Warum Verifikation nach der Generierung

LLMs sind nicht-deterministisch. Selbst mit faktengestützten Prompts (der [Allowlist der Quellpfade](architecture.md#faktengestützte-prompts-verhindern-halluzinationen)) kann Claude immer noch:

- Eine erforderliche Sektion unter Kontextdruck überspringen.
- Einen Pfad zitieren, der die Allowlist fast — aber nicht ganz — matcht (z. B. ein aus einem Eltern-Verzeichnis + einem TypeScript-Konstantennamen erfundenes `src/feature/routers/featureRoutePath.ts`).
- Inkonsistente Querverweise zwischen Standards und Rules generieren.
- Section-8-Inhalte an einer anderen Stelle in CLAUDE.md erneut deklarieren.

Validatoren fangen diese still-schlechten Ausgaben ab, bevor die Docs ausgeliefert werden.

---

## Die 5 Validatoren

### 1. `claude-md-validator` — strukturelle Invarianten

Validiert `CLAUDE.md` gegen einen Satz struktureller Prüfungen (die Tabelle unten listet die Check-ID-Familien — die genaue Anzahl einzelner berichtbarer IDs variiert, da `checkSectionsHaveContent` und `checkCanonicalHeadings` je Sektion eine ausgeben usw.). Liegt unter `claude-md-validator/`.

**Aufruf:**
```bash
npx claudeos-core lint
```

(Wird nicht von `health` ausgeführt — siehe [Warum zwei Einstiegspunkte](#warum-zwei-einstiegspunkte-lint-vs-health) unten.)

**Was er prüft:**

| Check-ID | Was er erzwingt |
|---|---|
| `S1` | Section-Anzahl ist genau 8 |
| `S2-N` | Jede Section hat mindestens 2 nicht-leere Body-Zeilen |
| `S-H3-4` | Section 4 hat 3 oder 4 H3-Sub-Sections |
| `S-H3-6` | Section 6 hat genau 3 H3-Sub-Sections |
| `S-H3-8` | Section 8 hat genau 2 H3-Sub-Sections |
| `S-H4-8` | Section 8 hat genau 2 H4-Headings (L4 Memory Files / Memory Workflow) |
| `M-<file>` | Jede der 4 Memory-Dateien (`decision-log.md`, `failure-patterns.md`, `compaction.md`, `auto-rule-update.md`) erscheint in genau EINER Markdown-Tabellenzeile |
| `F2-<file>` | Memory-Datei-Tabellenzeilen sind auf Section 8 beschränkt |
| `T1-1` bis `T1-8` | Jede `## N.`-Section-Heading enthält ihren englischen kanonischen Token (`Role Definition`, `Project Overview`, `Build`, `Core Architecture`, `Directory Structure`, `Standard`, `DO NOT Read`, `Memory`) — Substring-Match ohne Beachtung der Groß-/Kleinschreibung |

**Warum sprachunabhängig:** Der Validator matcht niemals übersetzte Heading-Prosa. Er matcht nur Markdown-Struktur (Heading-Level, Anzahl, Reihenfolge) und englische kanonische Tokens. Dieselben Prüfungen bestehen bei einer CLAUDE.md, die in irgendeiner der 10 unterstützten Sprachen generiert wurde.

**Warum das in der Praxis zählt:** Eine mit `--lang ja` generierte CLAUDE.md sieht für Menschen völlig anders aus als eine mit `--lang en` generierte, aber `claude-md-validator` produziert auf beiden byte-genau identische Pass/Fail-Verdikte. Keine sprachspezifische Wörterbuchpflege.

### 2. `content-validator` — Pfad- & Manifest-Prüfungen

Validiert den **Inhalt** der generierten Dateien (nicht die Struktur von CLAUDE.md). Liegt unter `content-validator/`.

**10 Prüfungen** (die ersten 9 werden in der Konsolenausgabe als `[N/9]` bezeichnet; die 10. wurde später hinzugefügt und als `[10/10]` gekennzeichnet — diese Asymmetrie wird im Code beibehalten, damit bestehende CI-Greps weiter matchen):

| Prüfung | Was sie erzwingt |
|---|---|
| `[1/9]` | CLAUDE.md existiert, ≥100 Zeichen, enthält erforderliche Section-Schlüsselwörter (10-Sprachen-fähig) |
| `[2/9]` | `.claude/rules/**/*.md`-Dateien haben YAML-Frontmatter mit `paths:`-Schlüssel, keine leeren Dateien |
| `[3/9]` | `claudeos-core/standard/**/*.md`-Dateien sind ≥200 Zeichen und enthalten ✅/❌-Beispiele + eine Markdown-Tabelle (Kotlin-Standards prüfen zudem auf ` ```kotlin `-Blöcke) |
| `[4/9]` | `claudeos-core/skills/**/*.md`-Dateien sind nicht-leer; orchestrator + MANIFEST vorhanden |
| `[5/9]` | `claudeos-core/guide/` hat alle 9 erwarteten Dateien, jede nicht-leer (BOM-bewusste Leere-Prüfung) |
| `[6/9]` | `claudeos-core/plan/`-Dateien nicht-leer (informativ seit v2.1.2 — `plan/` wird nicht mehr automatisch angelegt) |
| `[7/9]` | `claudeos-core/database/`-Dateien existieren (Warnung, falls fehlend) |
| `[8/9]` | `claudeos-core/mcp-guide/`-Dateien existieren (Warnung, falls fehlend) |
| `[9/9]` | `claudeos-core/memory/` 4 Dateien existieren + strukturelle Validierung (decision-log ISO-Datum, failure-pattern erforderliche Felder, compaction `## Last Compaction`-Marker) |
| `[10/10]` | Pfadbehauptungs-Verifikation + MANIFEST-Drift (3 Unterklassen — siehe unten) |

**Unterklassen von Prüfung `[10/10]`:**

| Klasse | Was sie aufdeckt |
|---|---|
| `STALE_PATH` | Jede `src/...\.(ts|tsx|js|jsx)`-Referenz in `.claude/rules/**` oder `claudeos-core/standard/**` muss zu einer realen Datei auflösen. Code-Fenced-Blöcke und Platzhalter-Pfade (`src/{domain}/feature.ts`) werden ausgeschlossen. |
| `STALE_SKILL_ENTRY` | Jeder in `claudeos-core/skills/00.shared/MANIFEST.md` registrierte Skill-Pfad muss auf der Festplatte existieren. |
| `MANIFEST_DRIFT` | Jeder registrierte Skill muss in `CLAUDE.md` erwähnt werden (mit **Orchestrator/Sub-Skill-Ausnahme** — Pass 3b schreibt Section 6, bevor Pass 3c die Sub-Skills erzeugt, also ist es strukturell unmöglich, jeden Sub-Skill zu listen). |

Die Orchestrator/Sub-Skill-Ausnahme: Ein registrierter Sub-Skill unter `{category}/{parent-stem}/{NN}.{name}.md` gilt als abgedeckt, wenn ein Orchestrator unter `{category}/*{parent-stem}*.md` in CLAUDE.md erwähnt ist.

**Schweregrad:** content-validator läuft auf der Stufe **advisory** — erscheint in der Ausgabe, blockiert CI aber nicht. Die Begründung: Ein erneutes Pass 3 ist nicht garantiert, LLM-Halluzinationen zu beheben, sodass Blockieren Nutzer in `--force`-Schleifen blockieren würde. Das Erkennungssignal (Non-Zero-Exit + `stale-report`-Eintrag) reicht für CI-Pipelines und menschliche Triage.

### 3. `pass-json-validator` — Pass-Output-Wohlgeformtheit

Validiert, dass die von jedem Pass geschriebenen JSON-Dateien wohlgeformt sind und erwartete Schlüssel enthalten. Liegt unter `pass-json-validator/`.

**Validierte Dateien:**

| Datei | Erforderliche Schlüssel |
|---|---|
| `project-analysis.json` | 5 erforderliche Schlüssel (stack, domains usw.) |
| `domain-groups.json` | 4 erforderliche Schlüssel |
| `pass1-*.json` | 4 erforderliche Schlüssel + `analysisPerDomain`-Objekt |
| `pass2-merged.json` | 10 gemeinsame Sektionen (immer) + 2 Backend-Sektionen (bei Backend-Stack) + 1 Kotlin-Basissektion + 2 Kotlin-CQRS-Sektionen (sofern zutreffend). Fuzzy-Match mit semantischer Alias-Map; Top-Level-Key-Anzahl <5 = ERROR, <9 = WARNING; Erkennung leerer Werte. |
| `pass3-complete.json` | Marker-Vorhandensein + Struktur |
| `pass4-memory.json` | Marker-Struktur: Objekt, `passNum === 4`, nicht-leeres `memoryFiles`-Array |

Die pass2-Prüfung ist **stack-bewusst**: Sie liest `project-analysis.json`, um backend/kotlin/cqrs zu bestimmen, und passt an, welche Sektionen sie erwartet.

**Schweregrad:** läuft auf der Stufe **warn-only** — meldet Probleme, blockiert CI aber nicht.

### 4. `plan-validator` — Plan-↔-Festplatten-Konsistenz (Legacy)

Vergleicht `claudeos-core/plan/*.md`-Dateien mit der Festplatte. Liegt unter `plan-validator/`.

**3 Modi:**
- `--check` (Default): nur Drift erkennen
- `--refresh`: Plan-Dateien aus der Festplatte aktualisieren
- `--execute`: Plan-Inhalt auf die Festplatte anwenden (erzeugt `.bak`-Backups)

**v2.1.0-Status:** Master-Plan-Generierung wurde in v2.1.0 entfernt. `claudeos-core/plan/` wird von `init` nicht mehr automatisch angelegt. Fehlt `plan/`, überspringt dieser Validator mit informativen Meldungen.

Wird in der Validator-Suite für Nutzer beibehalten, die Plan-Dateien für ad-hoc-Backup-Zwecke handpflegen.

**Sicherheit:** Path-Traversal wird blockiert — `isWithinRoot(absPath)` lehnt Pfade ab, die das Projekt-Root via `../` verlassen.

**Schweregrad:** läuft auf der Stufe **fail**, wenn echte Drift erkannt wird. No-op, wenn `plan/` fehlt.

### 5. `sync-checker` — Festplatten-↔-Master-Plan-Konsistenz

Verifiziert, dass die in `sync-map.json` registrierten Dateien (vom `manifest-generator` geschrieben) zu den tatsächlich auf der Festplatte vorhandenen Dateien passen. Bidirektionale Prüfung über die 7 verfolgten Verzeichnisse. Liegt unter `sync-checker/`.

**Zweistufige Prüfung:**

1. **Festplatte → Plan:** Durchläuft die 7 verfolgten Verzeichnisse (`.claude/rules`, `standard`, `skills`, `guide`, `database`, `mcp-guide`, `memory`) + `CLAUDE.md`. Meldet Dateien, die auf der Festplatte existieren, aber nicht in `sync-map.json` registriert sind.
2. **Plan → Festplatte:** Meldet in `sync-map.json` registrierte Pfade, die nicht mehr auf der Festplatte existieren (orphaned).

**Exit-Code:** Nur orphaned Dateien führen zu Exit 1. Unregistrierte Dateien sind informativ (ein v2.1.0+-Projekt hat per Default null registrierte Pfade, also der häufige Fall).

**Schweregrad:** läuft auf der Stufe **fail** für orphaned Dateien. Sauberer Skip, wenn `sync-map.json` keine Mappings hat.

---

## Schweregrad-Stufen

Nicht jede fehlgeschlagene Prüfung ist gleich schwerwiegend. Der `health-checker` orchestriert die Laufzeit-Validatoren mit drei Schweregrad-Stufen:

| Stufe | Symbol | Verhalten |
|---|---|---|
| **fail** | `❌` | Blockiert die Fertigstellung. CI exitet non-zero. Muss behoben werden. |
| **warn** | `⚠️` | Erscheint in der Ausgabe, blockiert aber nicht. Wert, untersucht zu werden. |
| **advisory** | `ℹ️` | Später prüfen. Häufig False Positives in ungewöhnlichen Projektlayouts. |

**Beispiele je Stufe:**

- **fail:** plan-validator erkennt echte Drift; sync-checker findet orphaned Dateien; erforderliche Guide-Datei fehlt.
- **warn:** pass-json-validator findet eine nicht-kritische Schema-Lücke.
- **advisory:** content-validators `STALE_PATH` markiert einen Pfad, der existiert, aber gitignoriert ist (False Positive in manchen Projekten).

Das 3-Stufen-System wurde hinzugefügt, damit `content-validator`-Befunde (die in ungewöhnlichen Layouts False Positives haben können) CI-Pipelines nicht blockieren. Ohne dieses System würde jeder Hinweis blockieren — und ein erneutes `init` behebt LLM-Halluzinationen nicht zuverlässig.

Die Zusammenfassungszeile zeigt die Aufschlüsselung:
```
All systems operational (1 advisory, 1 warning)
```

---

## Warum zwei Einstiegspunkte: `lint` vs `health`

```bash
npx claudeos-core lint     # nur claude-md-validator
npx claudeos-core health   # 4 weitere Validatoren
```

**Warum die Trennung?**

`claude-md-validator` findet **strukturelle** Probleme — Section-Anzahl falsch, Memory-Datei-Tabelle erneut deklariert, kanonisches Heading ohne englischen Token. Das sind Signale, dass **CLAUDE.md neu generiert werden muss**, keine weichen Warnungen zur Untersuchung. Erneutes `init` (mit `--force`, falls nötig) ist die Lösung.

Die anderen Validatoren finden **inhaltliche** Probleme — Pfade, Manifest-Einträge, Schema-Lücken. Diese können von Hand geprüft und behoben werden, ohne alles neu zu generieren.

`lint` separat zu halten bedeutet, dass es in Pre-Commit-Hooks verwendet werden kann (schnell, rein strukturell), ohne die langsameren Inhaltsprüfungen mitzuziehen.

---

## Validierung ausführen

```bash
# Strukturelle Validierung von CLAUDE.md
npx claudeos-core lint

# 4-Validator-Health-Suite
npx claudeos-core health
```

Für CI ist `health` die empfohlene Prüfung. Sie ist weiterhin schnell (keine LLM-Aufrufe) und deckt alles außer den strukturellen CLAUDE.md-Prüfungen ab, die die meisten CI-Pipelines nicht bei jedem Commit verifizieren müssen.

Für Pre-Commit-Hooks ist `lint` schnell genug, um bei jedem Commit zu laufen.

---

## Ausgabeformat

Validatoren produzieren standardmäßig menschenlesbare Ausgaben:

```
[content-validator]
ℹ advisory  STALE_PATH  src/legacy/oldRoutes.ts → file does not exist
            (cited in claudeos-core/standard/10.backend/03.routing.md:42)

[sync-checker]
✓ pass     0 orphaned files; 0 unregistered files
```

Der `manifest-generator` schreibt maschinenlesbare Artefakte nach `claudeos-core/generated/`:

- `rule-manifest.json` — Datei-Liste + Frontmatter aus gray-matter + stat
- `sync-map.json` — registrierte Pfad-Mappings (v2.1.0+: per Default leeres Array)
- `stale-report.json` — konsolidierte Befunde aller Validatoren

---

## CI-Integration

Ein minimales GitHub-Actions-Beispiel:

```yaml
name: ClaudeOS Health
on: [push, pull_request]
jobs:
  health:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v5
        with:
          node-version: '20'
      - run: npx claudeos-core health
```

Der Exit-Code ist nur bei `fail`-Stufen-Befunden non-zero. `warn` und `advisory` werden gedruckt, lassen den Build aber nicht scheitern.

Der offizielle CI-Workflow (in `.github/workflows/test.yml`) läuft auf `ubuntu-latest`, `windows-latest`, `macos-latest` × Node 18 / 20.

---

## Wenn Validatoren etwas markieren, mit dem Sie nicht einverstanden sind

False Positives kommen vor, besonders in ungewöhnlichen Projektlayouts (z. B. gitignorierte generierte Dateien, eigene Build-Schritte, die in Nicht-Standard-Pfade schreiben).

**Um die Erkennung an einer bestimmten Datei zu unterdrücken**, siehe [advanced-config.md](advanced-config.md) zu den verfügbaren `.claudeos-scan.json`-Overrides.

**Wenn ein Validator allgemein falsch liegt** (nicht nur in Ihrem Projekt), [öffnen Sie ein Issue](https://github.com/claudeos-core/claudeos-core/issues) — diese Prüfungen werden über die Zeit anhand realer Berichte angepasst.

---

## Siehe auch

- [architecture.md](architecture.md) — wo die Validatoren in der Pipeline sitzen
- [commands.md](commands.md) — `lint`- und `health`-Befehlsreferenz
- [troubleshooting.md](troubleshooting.md) — was bestimmte Validator-Fehler bedeuten
