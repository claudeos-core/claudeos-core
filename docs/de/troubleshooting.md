# Troubleshooting

Häufige Fehler und ihre Behebung. Wenn Ihr Problem hier nicht steht, [öffnen Sie ein Issue](https://github.com/claudeos-core/claudeos-core/issues) mit Reproduktionsschritten.

> Englisches Original: [docs/troubleshooting.md](../troubleshooting.md). Die deutsche Übersetzung wird mit der englischen Version synchron gehalten.

---

## Installationsprobleme

### „Command not found: claudeos-core"

Sie haben es nicht global installiert oder npms globales bin liegt nicht in Ihrem PATH.

**Option A — `npx` nutzen (empfohlen, ohne Installation):**
```bash
npx claudeos-core init
```

**Option B — Global installieren:**
```bash
npm install -g claudeos-core
claudeos-core init
```

Wenn npm-installiert, aber weiterhin „command not found", PATH prüfen:
```bash
npm config get prefix
# Sicherstellen, dass das bin/-Verzeichnis unter diesem Prefix in Ihrem PATH ist
```

### „Cannot find module 'glob'" oder Ähnliches

Sie führen ClaudeOS-Core außerhalb eines Projekt-Roots aus. Entweder:

1. Zuerst per `cd` ins Projekt wechseln.
2. `npx claudeos-core init` nutzen (funktioniert aus jedem Verzeichnis).

### „Node.js version not supported"

ClaudeOS-Core erfordert Node.js 18+. Ihre Version prüfen:

```bash
node --version
```

Aktualisieren via [nvm](https://github.com/nvm-sh/nvm), [fnm](https://github.com/Schniz/fnm) oder Ihren Betriebssystem-Paketmanager.

---

## Vorab-Prüfungen

### „Claude Code not found"

ClaudeOS-Core nutzt Ihre lokale Claude-Code-Installation. Zuerst installieren:

- [Offizieller Installationsleitfaden](https://docs.anthropic.com/en/docs/claude-code)
- Verifizieren: `claude --version`

Wenn `claude` installiert, aber nicht im PATH ist, korrigieren Sie den PATH Ihrer Shell — es gibt keine Override-Env-Variable.

### „Could not detect stack"

Der Scanner konnte das Framework Ihres Projekts nicht identifizieren. Ursachen:

- Keine `package.json` / `pom.xml` / `build.gradle` / `pyproject.toml` im Projekt-Root.
- Ihr Stack ist nicht in [den 12 unterstützten Stacks](stacks.md).
- Eigenes Layout, das den Auto-Erkennungsregeln nicht entspricht.

**Behebung:** Verifizieren Sie, dass das Projekt-Root eine der erkannten Dateien hat. Wenn Ihr Stack unterstützt ist, aber Ihr Layout ungewöhnlich, siehe [advanced-config.md](advanced-config.md) zu den `.claudeos-scan.json`-Overrides.

### „Authentication test failed"

`init` führt ein schnelles `claude -p "echo ok"` aus, um zu verifizieren, dass Claude Code authentifiziert ist. Schlägt das fehl:

```bash
claude --version           # sollte die Version drucken
claude -p "say hi"         # sollte eine Antwort drucken
```

Liefert `-p` einen Auth-Fehler, folgen Sie dem Auth-Flow von Claude Code. ClaudeOS-Core kann die Claude-Auth nicht für Sie reparieren.

---

## Init-Laufzeitprobleme

### Init hängt oder dauert lange

Pass 1 in einem großen Projekt dauert. Diagnostik:

1. **Funktioniert Claude Code?** `claude --version` in einem anderen Terminal ausführen.
2. **Ist das Netz okay?** Jeder Pass ruft Claude Code auf, das die Anthropic-API ruft.
3. **Ist Ihr Projekt sehr groß?** Domain-Gruppen-Splitting greift automatisch (4 Domains / 40 Dateien pro Gruppe), also läuft ein 24-Domain-Projekt Pass 1 sechsmal.

Wenn es lange ohne Output hängt (kein Fortschrittsticker rückt vor), abbrechen (Strg-C) und resumen:

```bash
npx claudeos-core init   # Setzt am letzten abgeschlossenen Pass-Marker an
```

Der Resume-Mechanismus läuft nur Passes neu, die nicht abgeschlossen wurden.

### „Prompt is too long"-Fehler von Claude

Bedeutet, dass Pass 3 das Kontextfenster überschritten hat. Maßnahmen, die das Tool bereits anwendet:

- **Pass-3-Split-Modus** (3a → 3b-core → 3b-N → 3c-core → 3c-N → 3d-aux) — automatisch.
- **Domain-Gruppen-Splitting** — auto-aktiviert, wenn Domains > 4 oder Dateien > 40 pro Gruppe.
- **Batch-Sub-Division** — bei ≥16 Domains werden 3b/3c in Batches von ≤15 Domains aufgeteilt.

Wenn Sie trotzdem an Kontextlimits stoßen, ist das Projekt außergewöhnlich groß. Aktuelle Optionen:

1. Ihr Projekt in separate Verzeichnisse aufteilen und in jedem `init` ausführen.
2. Aggressive `frontendScan.platformKeywords`-Overrides via `.claudeos-scan.json` hinzufügen, um nicht-essenzielle Subapps zu überspringen.
3. [Ein Issue öffnen](https://github.com/claudeos-core/claudeos-core/issues) — möglicherweise ist ein neues Override für Ihren Fall nötig.

Es gibt kein Flag, um „aggressiveres Splitting" zu erzwingen, das über die bereits automatisch angewandte Logik hinausgeht.

### Init scheitert mittendrin

Das Tool ist **resume-sicher**. Einfach erneut starten:

```bash
npx claudeos-core init
```

Setzt am letzten abgeschlossenen Pass-Marker an. Keine Arbeit verloren.

Wenn Sie eine saubere Tafel wollen (alle Marker löschen und alles neu generieren), `--force` nutzen:

```bash
npx claudeos-core init --force
```

Beachten Sie: `--force` löscht manuelle Änderungen an `.claude/rules/`. Details in [safety.md](safety.md).

### Windows: „EBUSY"- oder Datei-Lock-Fehler

Windows-Dateilocking ist strenger als Unix. Ursachen:

- Antivirus scannt Dateien während des Schreibens.
- Eine IDE hat eine Datei mit exklusivem Lock geöffnet.
- Ein vorheriger `init` ist abgestürzt und hat ein veraltetes Handle hinterlassen.

Behebungen (in dieser Reihenfolge ausprobieren):

1. IDE schließen, neu versuchen.
2. Echtzeit-Scan des Antivirus für den Projektordner deaktivieren (oder den Projektpfad whitelisten).
3. Windows neu starten (löscht veraltete Handles).
4. Bei Persistenz stattdessen aus WSL2 ausführen.

Die Move-Logik in `lib/staged-rules.js` fällt von `renameSync` auf `copyFileSync + unlinkSync` zurück, um die meisten Antivirus-Interferenzen automatisch zu handhaben. Wenn Sie weiterhin Lock-Fehler treffen, bleiben die gestageten Dateien zur Inspektion in `claudeos-core/generated/.staged-rules/` — `init` neu starten, um den Move zu wiederholen.

### Cross-Volume-Rename-Fehler (Linux/macOS)

`init` muss möglicherweise atomar über Mount-Punkte hinweg renamen (z. B. `/tmp` zu Ihrem Projekt auf einer anderen Platte). Das Tool fällt automatisch auf Copy-then-Delete zurück — keine Aktion nötig.

Wenn Sie persistente Move-Fehler sehen, prüfen Sie, ob Sie Schreibzugriff auf sowohl `claudeos-core/generated/.staged-rules/` als auch `.claude/rules/` haben.

---

## Validierungsprobleme

### „STALE_PATH: file does not exist"

Ein in standards/skills/guides erwähnter Pfad löst nicht zu einer realen Datei auf. Ursachen:

- Pass 3 hat einen Pfad halluziniert (z. B. ein aus einem Eltern-Verzeichnis + einem TypeScript-Konstantennamen erfundenes `featureRoutePath.ts`).
- Sie haben eine Datei gelöscht, die Docs referenzieren sie aber noch.
- Die Datei ist gitignoriert, aber die Allowlist des Scanners hatte sie.

**Behebung:**

```bash
npx claudeos-core init --force
```

Generiert Pass 3 / 4 mit frischer Allowlist neu.

Wenn der Pfad absichtlich gitignoriert ist und Sie wollen, dass der Scanner ihn ignoriert, siehe [advanced-config.md](advanced-config.md), was `.claudeos-scan.json` tatsächlich unterstützt (der unterstützte Feldsatz ist klein).

Wenn `--force` es nicht behebt (erneutes Ausführen kann dieselbe Halluzination bei seltenen LLM-Seeds erneut auslösen), bearbeiten Sie die betroffene Datei manuell und entfernen Sie den schlechten Pfad. Der Validator läuft auf der Stufe **advisory**, blockiert also CI nicht — Sie können ausliefern und später fixen.

### „MANIFEST_DRIFT: registered skill not in CLAUDE.md"

Skills, die in `claudeos-core/skills/00.shared/MANIFEST.md` registriert sind, sollten irgendwo in CLAUDE.md erwähnt sein. Der Validator hat eine **Orchestrator/Sub-Skill-Ausnahme** — Sub-Skills gelten als abgedeckt, wenn ihr Orchestrator erwähnt ist.

**Behebung:** Ist der Orchestrator eines Sub-Skills in CLAUDE.md tatsächlich nicht erwähnt, `init --force` ausführen, um neu zu generieren. Ist der Orchestrator ERWÄHNT und der Validator markiert ihn trotzdem, ist das ein Validator-Bug — bitte [ein Issue öffnen](https://github.com/claudeos-core/claudeos-core/issues) mit den Datei-Pfaden.

### „Section 8 has wrong number of H4 sub-sections"

`claude-md-validator` erfordert genau 2 `####`-Headings unter Section 8 (L4 Memory Files / Memory Workflow).

Wahrscheinliche Ursachen:

- Sie haben CLAUDE.md manuell bearbeitet und Section 8s Struktur kaputtgemacht.
- Ein Pre-v2.3.0-Pass-4 ist gelaufen und hat eine Section 9 angehängt.
- Sie aktualisieren von einer Pre-v2.2.0-Version (8-Section-Scaffold noch nicht erzwungen).

**Behebung:**

```bash
npx claudeos-core init --force
```

Generiert CLAUDE.md sauber neu. Memory-Dateien bleiben über `--force` erhalten (nur generierte Dateien werden überschrieben).

### „T1: section heading missing English canonical token"

Jede `## N.`-Section-Heading muss ihren englischen kanonischen Token enthalten (z. B. `## 1. Role Definition` oder `## 1. Rollendefinition (Role Definition)`). Das hält Multi-Repo-Grep unabhängig von `--lang` funktionsfähig.

**Behebung:** Heading bearbeiten, sodass der englische Token in Klammern enthalten ist, oder `init --force` ausführen, um neu zu generieren (das v2.3.0+-Scaffold erzwingt diese Konvention automatisch).

---

## Probleme mit der Memory-Schicht

### „Memory file growing too large"

Verdichtung ausführen:

```bash
npx claudeos-core memory compact
```

Wendet den 4-stufigen Verdichtungsalgorithmus an. Was jede Stufe tut, beschreibt [memory-layer.md](memory-layer.md).

### „propose-rules suggests rules I disagree with"

Die Ausgabe ist ein Entwurf zur Prüfung, nicht automatisch übernommen. Lehnen Sie einfach ab, was Sie nicht wollen:

- `claudeos-core/memory/auto-rule-update.md` direkt bearbeiten und abgelehnte Vorschläge entfernen.
- Oder den Apply-Schritt komplett überspringen — Ihre `.claude/rules/` bleibt unverändert, sofern Sie vorgeschlagenen Inhalt nicht manuell in Rule-Dateien kopieren.

### `memory <subcommand>` sagt „not found"

Memory-Dateien fehlen. Sie werden von Pass 4 von `init` erstellt. Wenn sie gelöscht wurden:

```bash
npx claudeos-core init --force
```

Oder, wenn Sie nur die Memory-Dateien neu erstellen wollen, ohne alles erneut auszuführen — das Tool hat keinen Single-Pass-Replay-Befehl. `--force` ist der Weg.

---

## CI-Probleme

### Tests bestehen lokal, aber scheitern in CI

Die wahrscheinlichsten Gründe:

1. **CI hat `claude` nicht installiert.** Übersetzungsabhängige Tests brechen via `CLAUDEOS_SKIP_TRANSLATION=1` ab. Der offizielle CI-Workflow setzt diese Env-Variable; wenn Ihr Fork das nicht tut, setzen Sie sie.

2. **Path-Normalisierung (Windows).** Die Codebasis normalisiert Windows-Backslashes an vielen Stellen zu Forward-Slashes, aber Tests können an subtilen Unterschieden scheitern. Die offizielle CI läuft auf Windows + Linux + macOS, daher werden die meisten Probleme erkannt — wenn Sie einen Windows-spezifischen Fehlschlag sehen, kann es ein echter Bug sein.

3. **Node-Version.** Tests laufen auf Node 18 + 20. Wenn Sie auf Node 16 oder 22 sind, können Sie auf Inkompatibilitäten stoßen — pinnen Sie auf 18 oder 20 für CI-Parität.

### `health` exitet 0 in CI, ich habe Non-Zero erwartet

`health` exitet nur bei Befunden der Stufe **fail** non-zero. **warn** und **advisory** drucken, blockieren aber nicht.

Wenn Sie bei Hinweisen scheitern wollen (z. B. um bei `STALE_PATH` strikt zu sein), gibt es kein eingebautes Flag — Sie müssten die Ausgabe greppen und entsprechend exiten:

```bash
npx claudeos-core health > health.log
if grep -q "advisory" health.log; then exit 1; fi
```

---

## Hilfe bekommen

Wenn nichts davon passt:

1. **Die exakte Fehlermeldung erfassen.** ClaudeOS-Core-Fehler enthalten Datei-Pfade und Identifikatoren — die helfen bei der Reproduktion.
2. **Issue-Tracker prüfen:** [GitHub Issues](https://github.com/claudeos-core/claudeos-core/issues) — Ihr Problem ist möglicherweise schon gemeldet.
3. **Ein neues Issue öffnen** mit: OS, Node-Version, Claude-Code-Version (`claude --version`), Projekt-Stack und Fehlerausgabe. Wenn möglich, `claudeos-core/generated/project-analysis.json` beilegen (sensible Variablen werden automatisch redigiert).

Für Sicherheitsprobleme siehe [SECURITY.md](../../SECURITY.md) — bitte keine öffentlichen Issues für Schwachstellen öffnen.

---

## Siehe auch

- [safety.md](safety.md) — was `--force` tut und was es erhält
- [verification.md](verification.md) — was die Validator-Befunde bedeuten
- [advanced-config.md](advanced-config.md) — `.claudeos-scan.json`-Overrides
