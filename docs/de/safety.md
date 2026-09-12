# Sicherheit: Was bei Re-init erhalten bleibt — und was Ihre `.env` nie verlässt

Eine häufige Sorge: _„Ich habe meine `.claude/rules/` angepasst. Wenn ich `npx claudeos-core init` erneut ausführe, gehen meine Änderungen dann verloren?"_

**Kurz gesagt:** Es kommt darauf an, ob Sie `--force` nutzen.

Diese Seite erklärt exakt, was beim erneuten Lauf passiert, was angefasst wird und was nicht.

> Englisches Original: [docs/safety.md](../safety.md). Die deutsche Übersetzung wird mit der englischen Version synchron gehalten.

---

## Die zwei Pfade durch Re-init

Führen Sie `init` in einem Projekt erneut aus, das bereits eine Ausgabe hat, passiert eines von zwei Dingen:

### Pfad 1 — Resume (Default, ohne `--force`)

`init` liest bestehende Pass-Marker (`pass1-*.json`, `pass2-merged.json`, `pass3-complete.json`, `pass4-memory.json`) in `claudeos-core/generated/`.

Existiert der Marker eines Passes und ist strukturell gültig, wird der Pass **übersprungen**. Sind alle vier Marker gültig, beendet sich `init` früh, weil es nichts zu tun gibt.

**Wirkung auf Ihre Änderungen:** Alles, was Sie manuell bearbeitet haben, bleibt unangetastet. Keine Passes laufen, keine Dateien werden geschrieben.

Das ist der empfohlene Pfad für die meisten „Ich prüfe nur kurz nach"-Workflows.

### Pfad 2 — Frischer Start (`--force`)

```bash
npx claudeos-core init --force
```

`--force` löscht Pass-Marker und Regeln, dann läuft die volle 4-Pass-Pipeline von Grund auf neu. **Manuelle Änderungen an Regeln gehen verloren.** Das ist Absicht: `--force` ist die Notluke für „Ich will eine saubere Neugenerierung."

Was `--force` löscht:
- Alle `.json`- und `.md`-Dateien unter `claudeos-core/generated/` (die vier Pass-Marker plus Scanner-Ausgabe)
- Das übriggebliebene Verzeichnis `claudeos-core/generated/.staged-rules/`, falls ein vorheriger Lauf mitten im Move abgestürzt ist
- Die von claudeos-core verwalteten Kategorien unter `.claude/rules/`, also jeden Eintrag mit `NN.`-Präfix (`00.core/`, `10.backend/`, … `90.optional/`). Dateien oder Ordner, die Sie dort selbst ohne dieses Präfix abgelegt haben (z. B. `.claude/rules/my-team-conventions.md`), bleiben **unangetastet**, denn die hat dieses Tool nie erzeugt.

Was `--force` **nicht** löscht:
- `claudeos-core/memory/`-Dateien (Ihr Decision Log und Failure Patterns bleiben erhalten)
- `claudeos-core/standard/`, `claudeos-core/skills/`, `claudeos-core/guide/` etc. Pass 3 überschreibt sie, löscht aber nicht vorab. Alles, was Pass 3 nicht regeneriert, bleibt.
- Dateien außerhalb von `claudeos-core/` und `.claude/`
- Ihre CLAUDE.md (Pass 3 überschreibt sie als Teil der normalen Generierung)

**Warum die verwalteten `.claude/rules/NN.*`-Kategorien unter `--force` gewischt werden, andere Verzeichnisse aber nicht:** Pass 3 hat einen „zero-rules detection"-Guard, der greift, wenn `.claude/rules/` leer ist, und der mitentscheidet, ob die Pro-Domain-Rule-Stage übersprungen wird. Sind veraltete Regeln aus einem früheren Lauf vorhanden, würde der Guard false-negativ auslösen und die neuen Regeln nicht generieren.

---

## Warum `.claude/rules/` überhaupt existiert (der Staging-Mechanismus)

Das ist die meistgestellte Frage und bekommt einen eigenen Abschnitt.

Claude Code hat eine **Sensitive-Path-Policy**, die Subprozess-Schreibvorgänge nach `.claude/` blockiert, selbst wenn der Subprozess mit `--dangerously-skip-permissions` läuft. Das ist eine bewusste Sicherheitsgrenze in Claude Code selbst.

ClaudeOS-Cores Pass 3 und Pass 4 sind Subprozess-Invocations von `claude -p`, können also nicht direkt nach `.claude/rules/` schreiben. Der Workaround:

1. Der Pass-Prompt weist Claude an, alle Rule-Dateien stattdessen nach `claudeos-core/generated/.staged-rules/` zu schreiben.
2. Nach dem Pass durchläuft der **Node.js-Orchestrator** (der *nicht* der Berechtigungspolicy von Claude Code unterliegt) den Staging-Baum und verschiebt jede Datei unter Erhalt der Sub-Pfade nach `.claude/rules/`.
3. Bei vollem Erfolg wird das Staging-Verzeichnis entfernt.
4. Bei partiellem Fehlschlag (Datei-Lock oder Cross-Volume-Rename-Fehler) bleibt das Staging-Verzeichnis **erhalten**, damit Sie prüfen können, was nicht hinüberkam. Der nächste `init`-Lauf versucht es erneut.

Der Mover liegt in `lib/staged-rules.js`. Er nutzt zuerst `fs.renameSync` und fällt bei Windows-Cross-Volume-/Antivirus-Datei-Lock-Fehlern auf `fs.copyFileSync + fs.unlinkSync` zurück.

**Was Sie tatsächlich sehen:** Im normalen Fluss wird `.staged-rules/` innerhalb eines einzigen `init`-Laufs erstellt und geleert. Sie bemerken es vielleicht nie. Stürzt ein Lauf mitten in einer Stage ab, finden Sie beim nächsten `init` Dateien dort, und `--force` räumt sie auf.

---

## Was wann erhalten bleibt

| Datei-Kategorie | Ohne `--force` | Mit `--force` |
|---|---|---|
| Manuelle Änderungen an generierten `.claude/rules/NN.*/`-Dateien | ✅ Erhalten (keine Passes laufen) | ❌ Verloren (verwaltete Kategorien gelöscht) |
| Eigene Dateien unter `.claude/rules/` ohne `NN.`-Präfix | ✅ Erhalten | ✅ Erhalten (nie angefasst) |
| Manuelle Änderungen an `claudeos-core/standard/` | ✅ Erhalten (keine Passes laufen) | ❌ Von Pass 3 überschrieben, falls dieselben Dateien neu generiert |
| Manuelle Änderungen an `claudeos-core/skills/` | ✅ Erhalten | ❌ Von Pass 3 überschrieben |
| Manuelle Änderungen an `claudeos-core/guide/` | ✅ Erhalten | ❌ Von Pass 3 überschrieben |
| Manuelle Änderungen an `CLAUDE.md` | ✅ Erhalten | ❌ Von Pass 3 überschrieben |
| `claudeos-core/memory/`-Dateien | ✅ Erhalten | ✅ Erhalten (`--force` löscht Memory nicht) |
| Dateien außerhalb von `claudeos-core/` und `.claude/` | ✅ Niemals angefasst | ✅ Niemals angefasst |
| Pass-Marker (`generated/*.json`) | ✅ Erhalten (für Resume genutzt) | ❌ Gelöscht (erzwingt vollen erneuten Lauf) |

**Die ehrliche Zusammenfassung:** ClaudeOS-Core hat keine Diff-und-Merge-Schicht. Es gibt keinen „Änderungen vor dem Anwenden prüfen"-Prompt. Das Erhalten von Änderungen ist binär: entweder nur das erneut laufen lassen, was fehlt (Default), oder löschen und neu generieren (`--force`).

Haben Sie umfangreiche manuelle Änderungen vorgenommen und müssen neue tool-generierte Inhalte integrieren, ist der empfohlene Workflow:

1. Ihre Änderungen zuerst in git committen.
2. `npx claudeos-core init --force` auf einem separaten Branch ausführen.
3. Mit `git diff` prüfen, was sich geändert hat.
4. Manuell zusammenführen, was Sie von jeder Seite übernehmen wollen.

Das ist absichtlich ein klobiger Workflow. Das Tool versucht bewusst kein Auto-Merge: ein Fehler hier würde Regeln auf subtile Weise still zerstören.

---

## Pre-v2.2.0-Upgrade-Erkennung

Führen Sie `init` in einem Projekt aus, dessen CLAUDE.md von einer älteren Version stammt (vor v2.2.0, bevor das 8-Section-Scaffold erzwungen wurde), erkennt das Tool das via Heading-Anzahl (`^## `-Heading-Anzahl ≠ 8, sprachunabhängige Heuristik) und gibt eine Warnung aus:

```
⚠️  v2.2.0 upgrade detected
─────────────────────────
Your existing CLAUDE.md was generated with an older claudeos-core version.
v2.2.0 introduces structural changes that the default 'resume' mode
CANNOT apply because existing files are preserved under Rule B (idempotency).

To fully adopt v2.2.0, choose one of:
  1. Rerun with --force:   npx claudeos-core init --force
     (overwrites generated files; your memory/ content is preserved)
  2. Choose 'fresh' below  (equivalent to --force)
```

Die Warnung ist informativ. Das Tool macht normal weiter. Sie können sie ignorieren, wenn Sie das ältere Format behalten wollen. Unter `--force` greift dann das strukturelle Upgrade und `claude-md-validator` besteht.

**Memory-Dateien bleiben über `--force`-Upgrades erhalten.** Nur generierte Dateien werden überschrieben.

---

## Pass-4-Unveränderlichkeit (v2.3.0+)

Eine bestimmte Feinheit: **Pass 4 fasst `CLAUDE.md` nicht an.** Pass 3s Section 8 verfasst bereits alle erforderlichen L4-Memory-Datei-Referenzen. Würde Pass 4 ebenfalls in CLAUDE.md schreiben, würde er Section-8-Inhalte erneut deklarieren und die Validator-Fehler `[S1]`/`[M-*]`/`[F2-*]` erzeugen.

Das wird auf zwei Wegen erzwungen:
- Der Pass-4-Prompt sagt explizit „CLAUDE.md MUST NOT BE MODIFIED."
- Die Funktion `appendClaudeMdL4Memory()` in `lib/memory-scaffold.js` ist eine 3-zeilige No-op (gibt unbedingt true zurück, schreibt nichts).
- Der Regressionstest `tests/pass4-claude-md-untouched.test.js` erzwingt diesen Vertrag.

**Was Sie als Nutzer wissen sollten:** Führen Sie ein Pre-v2.3.0-Projekt erneut aus, in dem das alte Pass 4 eine Section 9 an CLAUDE.md angehängt hat, sehen Sie `claude-md-validator`-Fehler. Führen Sie `npx claudeos-core init --force` aus, um sauber neu zu generieren.

---

## Was der `restore`-Befehl tut

```bash
npx claudeos-core restore
```

`restore` führt `plan-validator` im `--execute`-Modus aus. Historisch kopierte er Inhalt aus `claudeos-core/plan/*.md`-Dateien in die beschriebenen Orte.

**v2.1.0-Status:** Master-Plan-Generierung wurde in v2.1.0 entfernt. `init` legt `claudeos-core/plan/` nicht mehr automatisch an. Ohne `plan/`-Dateien ist `restore` ein No-op: gibt eine informative Meldung aus und beendet sich sauber.

Der Befehl bleibt für Nutzer erhalten, die Plan-Dateien für ad-hoc-Backup/Restore handpflegen. Wollen Sie ein echtes Backup, nutzen Sie git.

---

## Wiederherstellungsmuster

### „Ich habe Dateien außerhalb des ClaudeOS-Workflows gelöscht"

```bash
npx claudeos-core init --force
```

Lässt Pass 3 / Pass 4 von Grund auf neu laufen. Die gelöschten Dateien werden regeneriert. Ihre manuellen Änderungen an anderen Dateien gehen verloren (wegen `--force`). Kombinieren Sie es mit git zur Sicherheit.

### „Ich will eine bestimmte Regel entfernen"

Datei einfach löschen. Das nächste `init` (ohne `--force`) erstellt sie nicht neu, weil Pass 3s Resume-Marker den ganzen Pass überspringt.

Wollen Sie die Regel beim nächsten `init --force` neu erstellt haben, müssen Sie nichts tun. Die Regenerierung läuft automatisch.

Wollen Sie sie permanent gelöscht haben (nie regeneriert), müssen Sie den aktuellen Stand des Projekts einfrieren und `--force` nicht erneut ausführen. Es gibt keinen eingebauten „Diese Datei nicht regenerieren"-Mechanismus.

### „Ich will eine generierte Datei dauerhaft anpassen"

Das Tool hat keine HTML-Style-Begin/End-Marker für Custom-Regionen. Zwei Optionen:

1. **`--force` in diesem Projekt nicht ausführen.** Ihre Änderungen bleiben unter Default-Resume unbegrenzt erhalten.
2. **Das Prompt-Template forken.** `pass-prompts/templates/<stack>/pass3.md` in Ihrer eigenen Kopie des Tools anpassen, Ihren Fork installieren, und die regenerierte Datei spiegelt Ihre Anpassungen wider.

Für einfache projektspezifische Overrides reicht meist Option 1.

---

## Was die Validatoren prüfen (nach Re-init)

Nachdem `init` fertig ist (ob resumed oder `--force`), laufen die Validatoren automatisch:

- `claude-md-validator`: läuft separat über `lint`
- `health-checker`: führt die vier Inhalts-/Pfad-Validatoren aus

Stimmt etwas nicht (fehlende Dateien, gebrochene Querverweise, erfundene Pfade), sehen Sie die Validator-Ausgabe. Die Prüfungsliste finden Sie in [verification.md](verification.md).

Die Validatoren reparieren nichts, sie melden. Sie lesen den Bericht, dann entscheiden Sie, ob Sie `init` erneut starten oder manuell beheben.

---

## Vertrauen durch Tests

Der Pfad „Nutzer-Änderungen erhalten" (Resume ohne `--force`) wird durch Integrationstests unter `tests/init-command.test.js` und `tests/pass3-marker.test.js` ausgeübt.

Die CI läuft auf Linux / macOS / Windows × Node 18 / 20.

Falls Sie einen Fall finden, in dem ClaudeOS-Core Ihre Änderungen auf eine Weise verloren hat, die diesem Dokument widerspricht, ist das ein Bug. [Bitte melden](https://github.com/claudeos-core/claudeos-core/issues) mit Reproduktionsschritten.

---

## Was nie in die generierten Dateien gelangt: `.env`-Secrets

Alles bisher handelt davon, dass *Ihre Dateien* ClaudeOS überleben. Dieser Abschnitt handelt davon, dass *Ihre Secrets* sie nicht verlassen. Er steht hier, weil „Kopiert dieses Tool meine `.env` in etwas, das ein LLM liest?" eine Sicherheitsfrage ist — und das ist die Seite, die man dafür aufschlägt.

`init` liest eine `.env*`-Datei (Suchreihenfolge in [stacks.md](stacks.md#env-extraktion-v220)), damit die generierte CLAUDE.md den echten Port, Host und die echte Datenbank nennen kann. Die geparsten Variablen landen in `claudeos-core/generated/project-analysis.json`, und die Prompts von Pass 3 / Pass 4 weisen das Modell an, diese Datei zu lesen. Vor dem Schreiben laufen drei Regeln über jeden Wert, in dieser Reihenfolge:

1. **Redaction nach Schlüsselname.** Ein Schlüssel, der auf `PASSWORD`, `PASS`, `PW`, `SECRET`, `TOKEN`, `API_KEY`, `CREDENTIAL`, `PRIVATE_KEY`, `JWT_SECRET`, `SSH_KEY`, `MASTER_KEY`, `SERVICE_ACCOUNT` und Ähnliches passt, wird zu `***REDACTED***`. Der Schlüssel bleibt erhalten, damit „diese Variable existiert" weiterhin eine Aussage ist, die die Doku treffen kann.
2. **Maskierung der Zugangsdaten in Connection-Strings.** Bei Schlüsseln, die Regel 1 nicht erfasst (`DATABASE_URL`, `REDIS_URL`, `MONGO_URI`, `SPRING_DATASOURCE_URL`, …), wird nur der *Zugangsdaten-Teil* umgeschrieben, der Rest bleibt lesbar — DB-Typ, Host, Port und Pfad:
   - URL-Userinfo: `postgres://app:s3cret@db:5432/app` → `postgres://***:***@db:5432/app`
   - Query-/Property-Parameter: `?user=app&password=x` → `?user=app&password=***`
   - Go-/MySQL-DSN: `user:pw@tcp(host:3306)/db` → `***:***@tcp(host:3306)/db`
   - Oracle JDBC (v2.5.3): `jdbc:oracle:thin:scott/tiger@//dbhost:1521/ORCL` → `jdbc:oracle:thin:***/***@//dbhost:1521/ORCL` (ebenso die Formen `@host:port:SID`, `@(DESCRIPTION=…)` und `jdbc:oracle:oci:`)
3. **Kompletter Wertverwurf (v2.5.2).** Wenn Regel 2 die Zugangsdaten nicht sicher umschreiben kann — ein Passwort mit rohem `/`, `?`, `#` oder Leerzeichen, eines, das mit Ziffern beginnt, oder ein Oracle-DSN, dessen User-Segment selbst ein `@` enthält (v2.5.3) — wird der Wert ganz verworfen (`***REDACTED***`) statt teilweise maskiert. Ein verlorener Host ist ein weit billigerer Fehlschlag als ein geleaktes Passwort. `init` nennt die betroffenen Schlüssel in der Phase-1-Zusammenfassung (nur Schlüsselnamen). Percent-encodieren Sie das Passwort (`/` als `%2F`), um den Host sichtbar zu halten.

Zwei aus `.env` abgeleitete Skalarfelder — `envInfo.host` und `envInfo.apiTarget` — werden direkt in CLAUDE.md §3 gerendert; wurde ihr Wert verworfen, sind sie `null` und die Zeile entfällt, sodass der Sentinel nie in einem generierten Dokument auftaucht.

**Was nicht abgedeckt ist.** Ein nicht expandiertes `${VAR}`-Template bleibt unangetastet (es enthält kein echtes Secret). Kommentare und andere Dateien als die eine ausgewählte `.env*` werden nicht gelesen. Die DB-Typ-Erkennung des Scanners liest den rohen `.env`-Text im Speicher und schreibt ihn nie. Wenn Ihr Projekt Zugangsdaten in einer Form hält, die keine der Regeln erkennt, öffnen Sie bitte ein Issue mit der *Form* (niemals dem Wert) — jede hier gelistete Regel ist genau so entstanden.

**Diese Regeln gelten ausschließlich für `.env*`-Dateien.** Zugangsdaten, die in einer Framework-Konfigurationsdatei stehen — `application.yml`, `application.properties`, `appsettings.json`, ein Spring-Profil, eine Django-`settings.py` —, werden **nicht** maskiert: Der Scanner liest solche Dateien nur für Fakten wie den Server-Port und kopiert ihre Werte nie nach `project-analysis.json`. Pass 1 bis Pass 3 lesen Ihren Quellbaum jedoch direkt, sodass ein im Klartext eingechecktes Passwort für das Modell sichtbar ist und in einem generierten Dokument zitiert werden kann. Halten Sie Geheimnisse aus eingechecktem Konfigurationscode heraus. Beachten Sie: Der Schritt **Wie Sie es prüfen** weiter unten findet sie nicht — sie gelangen gar nicht erst in `project-analysis.json`. Grepen Sie stattdessen die generierten *Dokumente*: `CLAUDE.md`, `claudeos-core/**/*.md` und `.claude/rules/**/*.md`.

**Wie Sie es prüfen.** Nach `init`: `grep -i` Ihr Passwort in `claudeos-core/generated/project-analysis.json`. Es darf nicht da sein. Die Maskierungsregeln sind durch Tests in `tests/env-parser.test.js` fixiert, inklusive der Formen, die einmal geleakt sind.

## Siehe auch

- [stacks.md](stacks.md#env-extraktion-v220) — `.env`-Suchreihenfolge und extrahierte Felder
- [architecture.md](architecture.md): der Staging-Mechanismus im Kontext
- [commands.md](commands.md): `--force` und andere Flags
- [troubleshooting.md](troubleshooting.md): Wiederherstellung bei spezifischen Fehlern
