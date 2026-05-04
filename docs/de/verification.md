# Verification

Nachdem Claude die Dokumentation generiert hat, prüft Code die Ausgabe mit **5 separaten Validatoren**. Kein LLM ist beteiligt, alle Prüfungen laufen deterministisch.

Diese Seite zeigt, was jeder Validator prüft, wie die Schweregrad-Stufen funktionieren und wie die Ausgabe zu lesen ist.

> Englisches Original: [docs/verification.md](../verification.md). Die deutsche Übersetzung wird mit der englischen Version synchron gehalten.

---

## Warum Verifikation nach der Generierung

LLMs sind nicht-deterministisch. Selbst mit faktengestützten Prompts (der [Allowlist der Quellpfade](architecture.md#faktengestützte-prompts-verhindern-halluzinationen)) kann Claude immer noch:

- Eine erforderliche Sektion unter Kontextdruck überspringen.
- Einen Pfad zitieren, der die Allowlist fast, aber nicht ganz, matcht. Beispiel: ein aus Eltern-Verzeichnis plus TypeScript-Konstantennamen erfundenes `src/feature/routers/featureRoutePath.ts`.
- Inkonsistente Querverweise zwischen Standards und Rules erzeugen.
- Section-8-Inhalte an anderer Stelle in CLAUDE.md erneut deklarieren.

Die Validatoren fangen solche still-schlechten Ausgaben ab, bevor die Docs ausgeliefert werden.

---

## Die 5 Validatoren

### 1. `claude-md-validator` — strukturelle Invarianten

Prüft `CLAUDE.md` gegen einen Satz struktureller Checks (die Tabelle unten listet die Check-ID-Familien. Die genaue Zahl einzelner berichtbarer IDs schwankt, weil `checkSectionsHaveContent` und `checkCanonicalHeadings` je Sektion eine ausgeben). Liegt unter `claude-md-validator/`.

**Aufruf:**
```bash
npx claudeos-core lint
```

(`health` startet das nicht; siehe [Warum zwei Einstiegspunkte](#warum-zwei-einstiegspunkte-lint-vs-health) unten.)

**Was geprüft wird:**

| Check-ID | Was sie erzwingt |
|---|---|
| `S1` | Section-Anzahl ist genau 8 |
| `S2-N` | Jede Section hat mindestens 2 nicht-leere Body-Zeilen |
| `S-H3-4` | Section 4 hat 3 oder 4 H3-Sub-Sections |
| `S-H3-6` | Section 6 hat genau 3 H3-Sub-Sections |
| `S-H3-8` | Section 8 hat genau 2 H3-Sub-Sections |
| `S-H4-8` | Section 8 hat genau 2 H4-Headings (L4 Memory Files / Memory Workflow) |
| `M-<file>` | Jede der 4 Memory-Dateien (`decision-log.md`, `failure-patterns.md`, `compaction.md`, `auto-rule-update.md`) taucht in genau EINER Markdown-Tabellenzeile auf |
| `F2-<file>` | Memory-Datei-Tabellenzeilen bleiben auf Section 8 beschränkt |
| `T1-1` bis `T1-8` | Jede `## N.`-Section-Heading enthält ihren englischen kanonischen Token (`Role Definition`, `Project Overview`, `Build`, `Core Architecture`, `Directory Structure`, `Standard`, `DO NOT Read`, `Memory`); Substring-Match ohne Beachtung der Groß-/Kleinschreibung |

**Warum sprachunabhängig:** Der Validator matcht niemals übersetzte Heading-Prosa, sondern nur Markdown-Struktur (Heading-Level, Anzahl, Reihenfolge) und englische kanonische Tokens. Dieselben Checks bestehen bei einer CLAUDE.md in jeder der 10 unterstützten Sprachen.

**Warum das in der Praxis zählt:** Eine mit `--lang ja` erzeugte CLAUDE.md sieht für Menschen ganz anders aus als eine mit `--lang en`. `claude-md-validator` liefert trotzdem byte-genau identische Pass/Fail-Verdikte. Keine sprachspezifische Wörterbuchpflege.

### 2. `content-validator` — Pfad- und Manifest-Prüfungen

Prüft den **Inhalt** der generierten Dateien (nicht die Struktur von CLAUDE.md). Liegt unter `content-validator/`.

**10 Prüfungen** (die ersten 9 erscheinen in der Konsolenausgabe als `[N/9]`. Die 10. kam später dazu und ist als `[10/10]` markiert. Diese Asymmetrie bleibt im Code, damit bestehende CI-Greps weiter matchen):

| Prüfung | Was sie erzwingt |
|---|---|
| `[1/9]` | CLAUDE.md existiert, ≥100 Zeichen, enthält die geforderten Section-Schlüsselwörter (10-Sprachen-fähig) |
| `[2/9]` | `.claude/rules/**/*.md`-Dateien haben YAML-Frontmatter mit `paths:`-Schlüssel, keine leeren Dateien |
| `[3/9]` | `claudeos-core/standard/**/*.md`-Dateien sind ≥200 Zeichen und enthalten ✅/❌-Beispiele plus eine Markdown-Tabelle (Kotlin-Standards prüfen zusätzlich auf ` ```kotlin `-Blöcke) |
| `[4/9]` | `claudeos-core/skills/**/*.md`-Dateien sind nicht-leer, orchestrator und MANIFEST vorhanden |
| `[5/9]` | `claudeos-core/guide/` hat alle 9 erwarteten Dateien, jede nicht-leer (BOM-bewusste Leere-Prüfung) |
| `[6/9]` | `claudeos-core/plan/`-Dateien nicht-leer (informativ seit v2.1.2, weil `plan/` nicht mehr automatisch angelegt wird) |
| `[7/9]` | `claudeos-core/database/`-Dateien existieren (Warnung, falls fehlend) |
| `[8/9]` | `claudeos-core/mcp-guide/`-Dateien existieren (Warnung, falls fehlend) |
| `[9/9]` | `claudeos-core/memory/` 4 Dateien existieren plus strukturelle Validierung (decision-log ISO-Datum, failure-pattern Pflichtfelder, compaction `## Last Compaction`-Marker) |
| `[10/10]` | Pfadbehauptungs-Verifikation und MANIFEST-Drift (3 Unterklassen, siehe unten) |

**Unterklassen von Prüfung `[10/10]`:**

| Klasse | Was sie aufdeckt |
|---|---|
| `STALE_PATH` | Jede `src/...\.(ts|tsx|js|jsx)`-Referenz in `.claude/rules/**` oder `claudeos-core/standard/**` muss auf eine reale Datei zeigen. Code-Fenced-Blöcke und Platzhalter-Pfade (`src/{domain}/feature.ts`) bleiben außen vor. |
| `STALE_SKILL_ENTRY` | Jeder in `claudeos-core/skills/00.shared/MANIFEST.md` registrierte Skill-Pfad muss auf der Festplatte liegen. |
| `MANIFEST_DRIFT` | Jeder registrierte Skill muss in `CLAUDE.md` auftauchen (mit **Orchestrator/Sub-Skill-Ausnahme**: Pass 3b schreibt Section 6, bevor Pass 3c die Sub-Skills erzeugt. Strukturell ist es also unmöglich, jeden Sub-Skill zu listen). |

Die Orchestrator/Sub-Skill-Ausnahme: Ein registrierter Sub-Skill unter `{category}/{parent-stem}/{NN}.{name}.md` gilt als abgedeckt, sobald ein Orchestrator unter `{category}/*{parent-stem}*.md` in CLAUDE.md auftaucht.

**Schweregrad:** content-validator läuft auf der Stufe **advisory**. Erscheint in der Ausgabe, blockiert die CI aber nicht. Begründung: Ein erneutes Pass 3 behebt LLM-Halluzinationen nicht garantiert. Würde der Validator blockieren, säßen Nutzer in `--force`-Schleifen fest. Das Erkennungssignal (Non-Zero-Exit plus `stale-report`-Eintrag) genügt für CI-Pipelines und menschliche Triage.

### 3. `pass-json-validator` — Pass-Output-Wohlgeformtheit

Prüft, ob die von jedem Pass geschriebenen JSON-Dateien wohlgeformt sind und die erwarteten Schlüssel enthalten. Liegt unter `pass-json-validator/`.

**Geprüfte Dateien:**

| Datei | Erforderliche Schlüssel |
|---|---|
| `project-analysis.json` | 5 erforderliche Schlüssel (stack, domains usw.) |
| `domain-groups.json` | 4 erforderliche Schlüssel |
| `pass1-*.json` | 4 erforderliche Schlüssel plus `analysisPerDomain`-Objekt |
| `pass2-merged.json` | 10 gemeinsame Sektionen (immer) plus 2 Backend-Sektionen (bei Backend-Stack), 1 Kotlin-Basissektion, 2 Kotlin-CQRS-Sektionen (falls zutreffend). Fuzzy-Match mit semantischer Alias-Map. Top-Level-Key-Anzahl <5 = ERROR, <9 = WARNING. Erkennt leere Werte. |
| `pass3-complete.json` | Marker-Vorhandensein und Struktur |
| `pass4-memory.json` | Marker-Struktur: Objekt, `passNum === 4`, nicht-leeres `memoryFiles`-Array |

Die pass2-Prüfung ist **stack-bewusst**: Sie liest `project-analysis.json`, ermittelt backend/kotlin/cqrs und passt an, welche Sektionen sie erwartet.

**Schweregrad:** läuft auf der Stufe **warn-only**. Meldet Probleme, blockiert die CI aber nicht.

### 4. `plan-validator` — Plan-↔-Festplatten-Konsistenz (Legacy)

Vergleicht `claudeos-core/plan/*.md`-Dateien mit der Festplatte. Liegt unter `plan-validator/`.

**3 Modi:**
- `--check` (Default): nur Drift erkennen
- `--refresh`: Plan-Dateien aus der Festplatte aktualisieren
- `--execute`: Plan-Inhalt auf die Festplatte anwenden (legt `.bak`-Backups an)

**v2.1.0-Status:** Die Master-Plan-Generierung ist in v2.1.0 entfallen. `claudeos-core/plan/` legt `init` nicht mehr automatisch an. Fehlt `plan/`, überspringt der Validator mit informativen Meldungen.

Bleibt in der Validator-Suite für alle, die Plan-Dateien zu ad-hoc-Backup-Zwecken pflegen.

**Sicherheit:** Path-Traversal blockiert. `isWithinRoot(absPath)` weist Pfade zurück, die das Projekt-Root via `../` verlassen.

**Schweregrad:** läuft auf der Stufe **fail**, wenn echte Drift erkannt wird. No-op, wenn `plan/` fehlt.

### 5. `sync-checker` — Festplatten-↔-Master-Plan-Konsistenz

Prüft, ob die in `sync-map.json` registrierten Dateien (vom `manifest-generator` geschrieben) zu den real vorhandenen Dateien passen. Bidirektionale Prüfung über die 7 verfolgten Verzeichnisse. Liegt unter `sync-checker/`.

**Zweistufige Prüfung:**

1. **Festplatte → Plan:** Läuft die 7 verfolgten Verzeichnisse (`.claude/rules`, `standard`, `skills`, `guide`, `database`, `mcp-guide`, `memory`) plus `CLAUDE.md` ab. Meldet Dateien, die auf der Festplatte existieren, aber nicht in `sync-map.json` stehen.
2. **Plan → Festplatte:** Meldet in `sync-map.json` registrierte Pfade, die auf der Festplatte fehlen (orphaned).

**Exit-Code:** Nur orphaned Dateien führen zu Exit 1. Unregistrierte Dateien sind informativ (ein v2.1.0+-Projekt hat per Default null registrierte Pfade, das ist der Standardfall).

**Schweregrad:** Stufe **fail** für orphaned Dateien. Wird sauber übersprungen, wenn `sync-map.json` keine Mappings hat.

---

## Schweregrad-Stufen

Nicht jeder fehlgeschlagene Check wiegt gleich schwer. Der `health-checker` orchestriert die Laufzeit-Validatoren in drei Schweregrad-Stufen:

| Stufe | Symbol | Verhalten |
|---|---|---|
| **fail** | `❌` | Blockiert die Fertigstellung. CI exitet non-zero. Muss behoben werden. |
| **warn** | `⚠️` | Erscheint in der Ausgabe, blockiert aber nicht. Lohnt einen Blick. |
| **advisory** | `ℹ️` | Später prüfen. In ungewöhnlichen Projektlayouts oft False Positives. |

**Beispiele je Stufe:**

- **fail:** plan-validator erkennt echte Drift, sync-checker findet orphaned Dateien, eine erforderliche Guide-Datei fehlt.
- **warn:** pass-json-validator findet eine nicht-kritische Schema-Lücke.
- **advisory:** `STALE_PATH` aus content-validator markiert einen Pfad, der existiert, aber gitignoriert ist (in manchen Projekten ein False Positive).

Das 3-Stufen-System kam hinzu, damit `content-validator`-Befunde (in ungewöhnlichen Layouts oft False Positives) CI-Pipelines nicht blockieren. Ohne diese Stufung würde jeder Hinweis blockieren, und ein erneutes `init` behebt LLM-Halluzinationen nicht zuverlässig.

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

`claude-md-validator` findet **strukturelle** Probleme: falsche Section-Anzahl, doppelt deklarierte Memory-Datei-Tabelle, kanonisches Heading ohne englischen Token. Das sind Signale, dass **CLAUDE.md neu generiert werden muss**, keine weichen Warnungen zum Nachhaken. Lösung: `init` erneut starten (notfalls mit `--force`).

Die anderen Validatoren finden **inhaltliche** Probleme: Pfade, Manifest-Einträge, Schema-Lücken. Lassen sich von Hand prüfen und beheben, ohne alles neu zu erzeugen.

`lint` separat zu halten heißt: einsetzbar in Pre-Commit-Hooks (schnell, rein strukturell), ohne die langsameren Inhaltsprüfungen mitzuziehen.

---

## Validierung ausführen

```bash
# Strukturelle Validierung von CLAUDE.md
npx claudeos-core lint

# 4-Validator-Health-Suite
npx claudeos-core health
```

Für CI ist `health` die empfohlene Prüfung. Bleibt schnell (keine LLM-Aufrufe) und deckt alles ab außer den strukturellen CLAUDE.md-Prüfungen, die die meisten CI-Pipelines nicht bei jedem Commit prüfen müssen.

Für Pre-Commit-Hooks ist `lint` schnell genug, um bei jedem Commit zu laufen.

---

## Ausgabeformat

Die Validatoren liefern standardmäßig menschenlesbare Ausgaben:

```
[content-validator]
ℹ advisory  STALE_PATH  src/legacy/oldRoutes.ts → file does not exist
            (cited in claudeos-core/standard/10.backend/03.routing.md:42)

[sync-checker]
✓ pass     0 orphaned files; 0 unregistered files
```

Der `manifest-generator` schreibt maschinenlesbare Artefakte nach `claudeos-core/generated/`:

- `rule-manifest.json`: Datei-Liste plus Frontmatter aus gray-matter plus stat
- `sync-map.json`: registrierte Pfad-Mappings (v2.1.0+: per Default leeres Array)
- `stale-report.json`: konsolidierte Befunde aller Validatoren

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

Der Exit-Code ist nur bei `fail`-Befunden non-zero. `warn` und `advisory` erscheinen im Log, lassen den Build aber nicht scheitern.

Der offizielle CI-Workflow (in `.github/workflows/test.yml`) läuft auf `ubuntu-latest`, `windows-latest`, `macos-latest` × Node 18 / 20.

---

## Wenn ein Validator etwas markiert, das nicht passt

False Positives kommen vor, besonders bei ungewöhnlichen Projektlayouts (etwa gitignorierte generierte Dateien oder eigene Build-Schritte, die in Nicht-Standard-Pfade schreiben).

**Um die Erkennung an einer bestimmten Datei zu unterdrücken:** Siehe [advanced-config.md](advanced-config.md) zu den verfügbaren `.claudeos-scan.json`-Overrides.

**Wenn ein Validator allgemein falsch liegt** (nicht nur im eigenen Projekt): [Issue öffnen](https://github.com/claudeos-core/claudeos-core/issues). Die Prüfungen werden auf Basis realer Berichte angepasst.

---

## Siehe auch

- [architecture.md](architecture.md): wo die Validatoren in der Pipeline sitzen
- [commands.md](commands.md): `lint`- und `health`-Befehlsreferenz
- [troubleshooting.md](troubleshooting.md): was bestimmte Validator-Fehler bedeuten
