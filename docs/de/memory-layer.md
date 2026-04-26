# Memory Layer (L4)

Seit v2.0 schreibt ClaudeOS-Core neben der regulären Dokumentation eine persistente Memory-Schicht. Sie ist für lang laufende Projekte, in denen Claude Code:

1. Architekturentscheidungen und ihre Begründung erinnern soll.
2. Aus wiederkehrenden Fehlern lernen soll.
3. Häufige Failure-Patterns automatisch zu permanenten Regeln befördern soll.

Wenn Sie ClaudeOS-Core nur für eine einmalige Generierung nutzen, können Sie diese Schicht komplett ignorieren. Die Memory-Dateien werden geschrieben, wachsen aber nicht, wenn Sie sie nicht aktualisieren.

> Englisches Original: [docs/memory-layer.md](../memory-layer.md). Die deutsche Übersetzung wird mit der englischen Version synchron gehalten.

---

## Was geschrieben wird

Nach Abschluss von Pass 4 besteht die Memory-Schicht aus:

```
claudeos-core/
└── memory/
    ├── decision-log.md          (append-only "why we chose X over Y")
    ├── failure-patterns.md      (recurring errors, with frequency + importance)
    ├── compaction.md            (how memory is compacted over time)
    └── auto-rule-update.md      (patterns that should become new rules)

.claude/
└── rules/
    └── 60.memory/
        ├── 01.decision-log.md       (rule that auto-loads decision-log.md)
        ├── 02.failure-patterns.md   (rule that auto-loads failure-patterns.md)
        ├── 03.compaction.md         (rule that auto-loads compaction.md)
        └── 04.auto-rule-update.md   (rule that auto-loads auto-rule-update.md)
```

Die `60.memory/`-Rule-Dateien haben `paths:`-Globs, die die Projektdateien matchen, in denen das Memory geladen werden soll. Wenn Claude Code eine Datei bearbeitet, die einen Glob matcht, wird die zugehörige Memory-Datei in den Kontext geladen.

Das ist **On-Demand-Laden** — Memory ist nicht immer im Kontext, nur wenn relevant. Das hält Claudes Arbeitskontext schlank.

---

## Die vier Memory-Dateien

### `decision-log.md` — append-only Architekturentscheidungen

Wenn Sie eine nicht-offensichtliche technische Entscheidung treffen, hängen Sie (oder Claude, von Ihnen aufgefordert) einen Block an:

```markdown
## 2026-04-15 — Use UTC for all stored timestamps

**Why:** Frontend users span 12+ time zones. Storing local time meant scheduling
bugs whenever a user traveled. UTC at the database level + per-user TZ at the
display layer cleanly separates concerns.

**Considered alternatives:**
- Per-row timezone column — rejected: query complexity.
- Browser-local time — rejected: server-side scheduling needs absolute times.
```

Diese Datei **wächst über die Zeit**. Sie wird nicht automatisch gelöscht. Alte Entscheidungen bleiben wertvoller Kontext.

Die automatisch geladene Regel (`60.memory/01.decision-log.md`) weist Claude Code an, diese Datei vor Antworten auf Fragen wie „Warum haben wir X so strukturiert?" zu konsultieren.

### `failure-patterns.md` — wiederkehrende Fehler

Wenn Claude Code einen wiederkehrenden Fehler macht (z. B. „Claude erzeugt immer wieder JPA, obwohl unser Projekt MyBatis nutzt"), kommt ein Eintrag hierher:

```markdown
### Generates JPA repositories instead of MyBatis mappers
- frequency: 7
- importance: 4
- last seen: 2026-04-22
- context: Pattern recurs when generating Order/Product/Customer CRUD modules.

**Fix:** Always check `build.gradle` for `mybatis-spring-boot-starter` before
generating repositories. Use `<Domain>Mapper.java` + `<Domain>.xml`, not
`<Domain>Repository.java extends JpaRepository`.
```

Die Felder `frequency` / `importance` / `last seen` treiben automatisierte Entscheidungen:

- **Verdichtung:** Einträge mit `lastSeen > 60 days` UND `importance < 3` werden verworfen.
- **Regel-Beförderung:** Einträge mit `frequency >= 3` werden via `memory propose-rules` als Kandidaten für neue `.claude/rules/`-Einträge ausgewiesen. (Importance ist kein Filter — sie beeinflusst nur den Confidence-Score jedes Vorschlags.)

Die Metadatenfelder werden von den `memory`-Sub-Befehlen mit verankerter Regex (`^[\s*-]+\*{0,2}\s*key\s*\*{0,2}\s*[:=]`) geparst, sodass die Feld-Zeilen ungefähr wie das obige Beispiel aussehen müssen. Eingerückte oder kursive Variationen werden toleriert.

### `compaction.md` — Verdichtungsprotokoll

Diese Datei verfolgt die Verdichtungs-Historie:

```markdown
## Last Compaction
- timestamp: 2026-04-26T03:14:00Z
- entries-summarized: 3
- entries-merged: 1
- entries-dropped: 2
- file-trimmed: false
```

Bei jedem `memory compact`-Lauf wird nur die `## Last Compaction`-Section überschrieben. Alles, was Sie an anderer Stelle in der Datei ergänzen, bleibt erhalten.

### `auto-rule-update.md` — Vorschlagsregel-Warteschlange

Wenn Sie `memory propose-rules` ausführen, liest Claude `failure-patterns.md` und hängt vorgeschlagenen Regel-Inhalt hier an:

```markdown
## Proposed: Use MyBatis mappers, not JPA repositories
- confidence: 0.83
- evidence:
  - failure-patterns.md: "Generates JPA repositories instead of MyBatis mappers" (frequency 7, importance 4)
- proposed-rule-path: .claude/rules/00.core/orm-mybatis.md
- proposed-rule-content: |
    Always use `<Domain>Mapper.java` + `<Domain>.xml` for data access.
    Project uses `mybatis-spring-boot-starter` (see build.gradle).
    Do NOT generate JpaRepository subclasses.
```

Sie prüfen die Vorschläge und kopieren die gewünschten in echte Rule-Dateien. **Der propose-rules-Befehl übernimmt nicht automatisch** — das ist Absicht, da LLM-entworfene Regeln menschliche Prüfung brauchen.

---

## Verdichtungsalgorithmus

Das Memory wächst, läuft aber nicht aus dem Ruder. Eine vierstufige Verdichtung läuft, wenn Sie aufrufen:

```bash
npx claudeos-core memory compact
```

| Stufe | Trigger | Aktion |
|---|---|---|
| 1 | `lastSeen > 30 days` UND nicht preserved | Body kollabiert auf eine 1-Zeilen-„fix" + Meta |
| 2 | Doppelte Headings | Verschmolzen (Frequenzen summiert, Body = aktuellster) |
| 3 | `importance < 3` UND `lastSeen > 60 days` | Verworfen |
| 4 | Datei > 400 Zeilen | Älteste nicht-preservierten Einträge gekürzt |

**„Preservierte" Einträge** überleben alle Stufen. Ein Eintrag ist preserved, wenn eines zutrifft:

- `importance >= 7`
- `lastSeen < 30 days`
- Der Body enthält einen konkreten (nicht-Glob) aktiven Rule-Pfad (z. B. `.claude/rules/10.backend/orm-rules.md`)

Die „Active-Rule-Path"-Prüfung ist interessant: Wenn ein Memory-Eintrag eine reale, aktuell existierende Rule-Datei referenziert, ist der Eintrag an den Lebenszyklus dieser Regel gekoppelt. Solange die Regel existiert, bleibt das Memory.

Der Verdichtungsalgorithmus ist eine bewusste Nachahmung menschlicher Vergessenskurven — häufige, aktuelle, wichtige Dinge bleiben; seltene, alte, unwichtige verblassen.

Den Verdichtungs-Code finden Sie in `bin/commands/memory.js` (Funktion `compactFile()`).

---

## Wichtigkeits-Scoring

Aufruf:

```bash
npx claudeos-core memory score
```

Berechnet Wichtigkeitswerte für Einträge in `failure-patterns.md` neu:

```
importance = round(frequency × 1.5 + recency × 5), capped at 10
```

Wobei `recency = max(0, 1 - daysSince(lastSeen) / 90)` (linearer Abfall über 90 Tage).

Effekte:
- Ein Eintrag mit `frequency = 3` und `lastSeen = today` → `round(3 × 1.5 + 1.0 × 5) = round(9.5) = 10`
- Ein Eintrag mit `frequency = 3` und `lastSeen = 90+ Tage her` → `round(3 × 1.5 + 0 × 5) = 5`

**Der score-Befehl entfernt vor dem Einfügen ALLE bestehenden Importance-Zeilen.** Das verhindert Duplikat-Zeilen-Regressionen, wenn score mehrfach läuft.

---

## Regel-Beförderung: `propose-rules`

Aufruf:

```bash
npx claudeos-core memory propose-rules
```

Das tut:

1. Liest `failure-patterns.md`.
2. Filtert Einträge mit `frequency >= 3`.
3. Bittet Claude, vorgeschlagenen Regel-Inhalt für jeden Kandidaten zu entwerfen.
4. Berechnet die Confidence:
   ```
   evidence    = 1.5 × frequency + 0.5 × importance   (importance defaults to 0; capped at 6 if importance is missing)
   confidence  = sigmoid_{k=0.35, x0=8}(evidence) × (anchored ? 1.0 : 0.6)
   ```
   wobei `anchored` bedeutet, dass der Eintrag einen realen Datei-Pfad auf der Festplatte referenziert.
5. Schreibt die Vorschläge in `auto-rule-update.md` zur menschlichen Prüfung.

**Der Evidence-Wert wird auf 6 gekappt, wenn die Importance fehlt** — ohne Importance-Score sollte Frequenz allein nicht ausreichen, das Sigmoid in Richtung hoher Confidence zu schieben. (Das kappt die Eingabe ins Sigmoid, nicht die Anzahl der Vorschläge.)

---

## Typischer Workflow

Bei einem lang laufenden Projekt sieht der Rhythmus so aus:

1. **`init` einmal ausführen**, um die Memory-Dateien zusammen mit allem anderen einzurichten.

2. **Claude Code einige Wochen normal nutzen.** Wiederkehrende Fehler bemerken (z. B. Claude verwendet immer wieder den falschen Response-Wrapper). Einträge in `failure-patterns.md` anhängen — entweder manuell oder indem Sie Claude darum bitten (die Regel in `60.memory/02.failure-patterns.md` weist Claude an, wann anzuhängen ist).

3. **Periodisch `memory score` ausführen**, um Wichtigkeitswerte zu aktualisieren. Das ist schnell und idempotent.

4. **Wenn Sie ~5+ hochwertige Patterns haben**, `memory propose-rules` ausführen, um Regel-Entwürfe zu erhalten.

5. **Vorschläge in `auto-rule-update.md` prüfen.** Für jeden, den Sie wollen, den Inhalt in eine permanente Rule-Datei unter `.claude/rules/` kopieren.

6. **`memory compact` periodisch ausführen** (einmal pro Monat oder in geplanter CI), um `failure-patterns.md` begrenzt zu halten.

Dieser Rhythmus ist das, wofür die vier Dateien gedacht sind. Einen Schritt zu überspringen ist okay — die Memory-Schicht ist opt-in, ungenutzte Dateien stehen Ihnen nicht im Weg.

---

## Session-Kontinuität

CLAUDE.md wird von Claude Code in jeder Session automatisch geladen. Die Memory-Dateien werden **per Default nicht automatisch geladen** — sie werden bei Bedarf von den `60.memory/`-Regeln geladen, wenn deren `paths:`-Glob die aktuell von Claude bearbeitete Datei matcht.

Das bedeutet: In einer frischen Claude-Code-Session ist Memory unsichtbar, bis Sie an einer relevanten Datei arbeiten.

Nachdem Claude Codes Auto-Verdichtung läuft (etwa bei 85 % des Kontexts), verliert Claude das Bewusstsein für Memory-Dateien, selbst wenn sie zuvor geladen waren. Section 8 von CLAUDE.md enthält einen **Session Resume Protocol**-Prosa-Block, der Claude erinnert:

- `failure-patterns.md` nach relevanten Einträgen erneut zu scannen.
- Die jüngsten Einträge von `decision-log.md` erneut zu lesen.
- Die `60.memory/`-Regeln gegen aktuell offene Dateien neu zu matchen.

Das ist **Prosa, nicht erzwungen** — aber die Prosa ist so strukturiert, dass Claude ihr tendenziell folgt. Das Session Resume Protocol ist Teil des kanonischen Scaffolds ab v2.3.2+ und bleibt über alle 10 Ausgabesprachen erhalten.

---

## Wann die Memory-Schicht zu überspringen ist

Die Memory-Schicht bringt Mehrwert für:

- **Lang lebende Projekte** (Monate oder länger).
- **Teams** — `decision-log.md` wird zu einem geteilten institutionellen Gedächtnis und Onboarding-Werkzeug.
- **Projekte, in denen Claude Code ≥10×/Tag aufgerufen wird** — Failure-Patterns sammeln sich schnell genug, um nützlich zu sein.

Übertrieben für:

- Einmalige Skripte, die Sie in einer Woche wegwerfen.
- Spike- oder Prototyp-Projekte.
- Tutorials oder Demos.

Die Memory-Dateien werden weiterhin von Pass 4 geschrieben, aber wenn Sie sie nicht aktualisieren, wachsen sie nicht. Es gibt keine Wartungslast, wenn Sie sie nicht nutzen.

Wenn Sie aktiv nicht wollen, dass die Memory-Regeln etwas automatisch laden (aus Kontextkostengründen), können Sie:

- Die `60.memory/`-Regeln löschen — Pass 4 erzeugt sie beim Resume nicht neu, nur unter `--force`.
- Oder die `paths:`-Globs in jeder Regel so eng setzen, dass sie nichts matchen.

---

## Siehe auch

- [architecture.md](architecture.md) — Pass 4 im Pipeline-Kontext
- [commands.md](commands.md) — Referenz zu `memory compact` / `memory score` / `memory propose-rules`
- [verification.md](verification.md) — `[9/9]`-Memory-Prüfungen des content-validator
