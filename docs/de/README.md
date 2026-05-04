# Documentation (Deutsch)

Willkommen. Dieser Ordner liefert die Tiefe, die der [Haupt-README](../../README.de.md) auslässt.

Wer einfach nur etwas ausprobieren will, kommt mit dem Haupt-README aus. Hier landest du, wenn dich nicht nur interessiert, _dass_ etwas funktioniert, sondern _wie_.

> Englisches Original: [docs/README.md](../README.md). Die deutsche Übersetzung wird mit der englischen Version synchron gehalten.

---

## Ich bin neu — wo fange ich an?

In der angegebenen Reihenfolge lesen. Jedes Dokument setzt das vorhergehende voraus.

1. **[Architecture](architecture.md)** — Wie `init` unter der Haube wirklich arbeitet. Die 4-Pass-Pipeline, warum sie in Passes zerlegt ist, was der Scanner macht, bevor überhaupt ein LLM ins Spiel kommt. Hier beginnt das mentale Modell.

2. **[Diagrams](diagrams.md)** — Dieselbe Architektur, aber als Mermaid-Bilder. Parallel zum Architecture-Dokument überfliegen.

3. **[Stacks](stacks.md)** — Die 12 unterstützten Stacks (8 Backend + 4 Frontend), wie jeder erkannt wird, welche Fakten der jeweilige Scanner extrahiert.

4. **[Verification](verification.md)** — Die 5 Validatoren, die nach Claudes Doku-Generierung anlaufen. Was sie prüfen, wofür es sie gibt, wie ihre Ausgabe zu lesen ist.

5. **[Commands](commands.md)** — Jeder CLI-Befehl und was er bewirkt. Als Referenz nutzen, sobald die Grundlagen sitzen.

Nach Schritt 5 steht das mentale Modell. Alles weitere in diesem Ordner ist für konkrete Situationen.

---

## Ich habe eine konkrete Frage

| Frage | Lesen |
|---|---|
| „Wie installiere ich ohne `npx`?" | [Manual Installation](manual-installation.md) |
| „Wird meine Projektstruktur unterstützt?" | [Stacks](stacks.md), [Advanced Config](advanced-config.md) |
| „Werden meine Änderungen bei einem erneuten Lauf überschrieben?" | [Safety](safety.md) |
| „Etwas ist kaputt, wie stelle ich es wieder her?" | [Troubleshooting](troubleshooting.md) |
| „Warum dieses Tool und nicht Tool X?" | [Comparison](comparison.md) |
| „Wofür gibt es die Memory-Schicht?" | [Memory Layer](memory-layer.md) |
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

Jedes Dokument steht **für sich allein**. Eine bestimmte Lesereihenfolge ist nicht nötig, außer du folgst dem Einsteiger-Pfad oben. Querverweise gibt es dort, wo ein Konzept auf einem anderen aufbaut.

Konventionen in diesen Docs:

- **Codeblöcke** zeigen, was du tatsächlich eintippst oder was Dateien wirklich enthalten. Sie sind nicht gekürzt, außer es ist ausdrücklich vermerkt.
- **`✅` / `❌`** bedeuten in Tabellen schlicht „ja" / „nein", mehr nicht.
- **Dateipfade** wie `claudeos-core/standard/00.core/01.project-overview.md` sind absolut, ausgehend vom Projekt-Root.
- **Versionsmarker** wie *(v2.4.0)* an einem Feature bedeuten „in dieser Version hinzugefügt". Frühere Versionen haben es nicht.

Behauptet ein Dokument etwas und du findest Belege fürs Gegenteil, ist das ein Doku-Bug. Bitte [öffne ein Issue](https://github.com/claudeos-core/claudeos-core/issues).

---

## Etwas unklar?

PRs sind für jedes Dokument willkommen. Die Docs halten sich an diese Konventionen:

- **Klare Sprache statt Fachjargon.** Die meisten Leser nutzen ClaudeOS-Core zum ersten Mal.
- **Beispiele statt Abstraktionen.** Echten Code, Dateipfade und Befehlsausgaben zeigen.
- **Ehrlich zu Grenzen.** Wenn etwas nicht funktioniert oder eingeschränkt ist, dann sag das auch.
- **Gegen den Quellcode verifiziert.** Keine Doku zu Features, die es nicht gibt.

Den Beitragsablauf beschreibt [CONTRIBUTING.md](../../CONTRIBUTING.md).
