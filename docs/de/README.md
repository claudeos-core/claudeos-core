# Documentation (Deutsch)

Willkommen. Dieser Ordner ist für die Tiefe gedacht, die der [Haupt-README](../../README.de.md) nicht abdeckt.

Wenn Sie nur etwas ausprobieren wollen, reicht der Haupt-README — kommen Sie hierher zurück, wenn Sie wissen wollen, _wie_ etwas funktioniert, und nicht nur _dass_ es funktioniert.

> Englisches Original: [docs/README.md](../README.md). Die deutsche Übersetzung wird mit der englischen Version synchron gehalten.

---

## Ich bin neu — wo fange ich an?

Lesen Sie diese in der angegebenen Reihenfolge. Jedes Dokument geht davon aus, dass Sie das vorherige gelesen haben.

1. **[Architecture](architecture.md)** — Wie `init` unter der Haube tatsächlich arbeitet. Die 4-Pass-Pipeline, warum sie in Passes aufgeteilt ist, was der Scanner tut, bevor irgendein LLM ins Spiel kommt. Hier beginnt das konzeptuelle Modell.

2. **[Diagrams](diagrams.md)** — Dieselbe Architektur, erklärt mit Mermaid-Bildern. Parallel zum Architecture-Dokument überfliegen.

3. **[Stacks](stacks.md)** — Die 12 unterstützten Stacks (8 Backend + 4 Frontend), wie jeder erkannt wird, welche Fakten der jeweilige Scanner extrahiert.

4. **[Verification](verification.md)** — Die 5 Validatoren, die nach der Doku-Generierung durch Claude laufen. Was sie prüfen, warum es sie gibt, wie ihre Ausgabe zu lesen ist.

5. **[Commands](commands.md)** — Jeder CLI-Befehl und seine Wirkung. Verwenden Sie ihn als Referenz, sobald Sie die Grundlagen kennen.

Nach Schritt 5 haben Sie das mentale Modell. Alles andere in diesem Ordner ist für spezifische Situationen.

---

## Ich habe eine konkrete Frage

| Frage | Lesen |
|---|---|
| „Wie installiere ich ohne `npx`?" | [Manual Installation](manual-installation.md) |
| „Wird meine Projektstruktur unterstützt?" | [Stacks](stacks.md), [Advanced Config](advanced-config.md) |
| „Werden meine Änderungen beim erneuten Lauf überschrieben?" | [Safety](safety.md) |
| „Etwas ist kaputtgegangen — wie stelle ich wieder her?" | [Troubleshooting](troubleshooting.md) |
| „Warum dieses Tool statt Tool X?" | [Comparison](comparison.md) |
| „Wofür ist die Memory-Schicht da?" | [Memory Layer](memory-layer.md) |
| „Wie passe ich den Scanner an?" | [Advanced Config](advanced-config.md) |

---

## Alle Dokumente

| Datei | Thema |
|---|---|
| [architecture.md](architecture.md) | Die 4-Pass-Pipeline + Scanner + Validatoren von Anfang bis Ende |
| [diagrams.md](diagrams.md) | Mermaid-Diagramme desselben Ablaufs |
| [stacks.md](stacks.md) | Die 12 unterstützten Stacks im Detail |
| [memory-layer.md](memory-layer.md) | L4 Memory: decision-log, failure-patterns, compaction |
| [verification.md](verification.md) | Die 5 Validatoren nach der Generierung |
| [commands.md](commands.md) | Jeder CLI-Befehl, jedes Flag, Exit-Codes |
| [manual-installation.md](manual-installation.md) | Installation ohne `npx` (Corp / Air-Gapped / CI) |
| [advanced-config.md](advanced-config.md) | `.claudeos-scan.json`-Overrides |
| [safety.md](safety.md) | Was bei Re-init erhalten bleibt |
| [comparison.md](comparison.md) | Scope-Vergleich mit ähnlichen Tools |
| [troubleshooting.md](troubleshooting.md) | Fehler und Wiederherstellung |

---

## Wie dieser Ordner zu lesen ist

Jedes Dokument ist so geschrieben, dass es **eigenständig lesbar** ist — Sie müssen sie nicht in einer bestimmten Reihenfolge lesen, außer Sie folgen dem Neueinsteiger-Pfad oben. Querverweise gibt es dort, wo ein Konzept auf einem anderen aufbaut.

In diesen Docs verwendete Konventionen:

- **Codeblöcke** zeigen, was Sie tatsächlich eingeben würden oder was Dateien tatsächlich enthalten. Sie sind nicht abgekürzt, sofern nicht ausdrücklich vermerkt.
- **`✅` / `❌`** bedeuten in Tabellen schlicht „ja" / „nein", nichts darüber Hinausgehendes.
- **Dateipfade** wie `claudeos-core/standard/00.core/01.project-overview.md` sind absolut, ausgehend vom Projekt-Root.
- **Versionsmarker** wie *(v2.4.0)* an einem Feature bedeuten „in dieser Version hinzugefügt" — frühere Versionen haben es nicht.

Wenn ein Dokument behauptet, etwas sei wahr, und Sie Beweise für das Gegenteil finden, ist das ein Dokumentationsbug — bitte [öffnen Sie ein Issue](https://github.com/claudeos-core/claudeos-core/issues).

---

## Etwas unklar?

PRs sind willkommen für jedes Dokument. Die Docs folgen diesen Konventionen:

- **Klare Sprache statt Fachjargon.** Die meisten Leser nutzen ClaudeOS-Core zum ersten Mal.
- **Beispiele statt Abstraktionen.** Echten Code, Dateipfade und Befehlsausgaben zeigen.
- **Ehrlich zu Grenzen.** Wenn etwas nicht funktioniert oder Einschränkungen hat, das auch sagen.
- **Gegen den Quellcode verifiziert.** Keine Dokumentation von Features, die es nicht gibt.

Den Beitragsfluss beschreibt [CONTRIBUTING.md](../../CONTRIBUTING.md).
