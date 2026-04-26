# Vergleich mit ähnlichen Tools

Diese Seite vergleicht ClaudeOS-Core mit anderen Claude-Code-Tools, die im selben allgemeinen Bereich arbeiten (projektbezogene Claude-Code-Konfiguration).

**Das ist ein Scope-Vergleich, kein Qualitätsurteil.** Die meisten der unten genannten Tools sind exzellent in dem, was sie tun. Der Punkt ist, Ihnen zu helfen zu verstehen, ob ClaudeOS-Core zu Ihrem Problem passt — oder ob ein anderes Tool besser passt.

> Englisches Original: [docs/comparison.md](../comparison.md). Die deutsche Übersetzung wird mit der englischen Version synchron gehalten.

---

## TL;DR

Wenn Sie **automatisch `.claude/rules/` basierend auf dem generieren wollen, was tatsächlich in Ihrem Code steht**, ist das die Spezialität von ClaudeOS-Core.

Wenn Sie etwas anderes wollen (breite Preset-Bundles, Planungs-Workflows, Agent-Orchestrierung, Multi-Tool-Konfigurationssync), passen andere Tools im Claude-Code-Ökosystem wahrscheinlich besser.

---

## Wie ClaudeOS-Core sich von anderen Tools unterscheidet

Definierende Eigenschaften von ClaudeOS-Core:

- **Liest Ihren tatsächlichen Quellcode** (deterministischer Node.js-Scanner — kein LLM-Erraten des Stacks).
- **4-Pass-Claude-Pipeline** mit faktengestützten Prompts (Pfade/Konventionen werden einmal extrahiert und wiederverwendet).
- **5 Validatoren nach der Generierung** (`claude-md-validator` für Struktur, `content-validator` für Pfadbehauptungen und Inhalt, `pass-json-validator` für Zwischen-JSON, `plan-validator` für Legacy-Plan-Dateien, `sync-checker` für Festplatten-↔-Sync-Map-Konsistenz).
- **10 Ausgabesprachen** mit sprachunabhängiger Validierung.
- **Pro-Projekt-Ausgabe**: CLAUDE.md, `.claude/rules/`, Standards, Skills, Guides, Memory-Schicht — alles aus Ihrem Code abgeleitet, nicht aus einem Preset-Bundle.

Andere Claude-Code-Tools in diesem allgemeinen Bereich (Sie können sie schichten oder ein anderes wählen, je nach Bedarf):

- **Claude `/init`** — in Claude Code eingebaut; schreibt eine einzelne `CLAUDE.md` in einem LLM-Aufruf. Am besten für schnelle Ein-Datei-Setups bei kleinen Projekten.
- **Preset-/Bundle-Tools** — verteilen kuratierte Agents, Skills oder Rules, die für „die meisten Projekte" funktionieren. Am besten, wenn Ihre Konventionen den Bundle-Defaults entsprechen.
- **Planungs-/Workflow-Tools** — bieten strukturierte Methodiken für Feature-Entwicklung (Specs, Phasen usw.). Am besten, wenn Sie eine Prozessebene über Claude Code wollen.
- **Hook-/DX-Tools** — ergänzen Auto-Save, Code-Quality-Hooks oder Developer-Experience-Verbesserungen für Claude-Code-Sessions.
- **Cross-Agent-Rule-Konverter** — halten Ihre Regeln über Claude Code, Cursor usw. synchron.

Diese Tools sind meist **komplementär, nicht konkurrierend**. ClaudeOS-Core übernimmt die Aufgabe „pro-projekt-Regeln aus Ihrem Code generieren"; die anderen erledigen andere Aufgaben. Die meisten lassen sich zusammen verwenden.

---

## Wann ClaudeOS-Core passt

✅ Sie wollen, dass Claude Code den Konventionen IHRES Projekts folgt, nicht generischen.
✅ Sie starten ein neues Projekt (oder onboarden ein Team) und wollen schnellen Setup.
✅ Sie haben es satt, `.claude/rules/` mit dem wachsenden Codebase manuell zu pflegen.
✅ Sie arbeiten in einem der [12 unterstützten Stacks](stacks.md).
✅ Sie wollen deterministischen, reproduzierbaren Output (gleicher Code → jedes Mal gleiche Regeln).
✅ Sie brauchen Output in einer nicht-englischen Sprache (10 Sprachen eingebaut).

## Wann ClaudeOS-Core NICHT passt

❌ Sie wollen ein kuratiertes Preset-Bundle aus Agents/Skills/Rules, das ohne Scan-Schritt am ersten Tag funktioniert.
❌ Ihr Stack wird nicht unterstützt und Sie sind nicht daran interessiert, einen beizutragen.
❌ Sie wollen Agent-Orchestrierung, Planungs-Workflows oder Coding-Methodik — verwenden Sie ein darauf spezialisiertes Tool.
❌ Sie brauchen nur eine einzelne `CLAUDE.md`, nicht den vollen Standards-/Rules-/Skills-Satz — `claude /init` reicht.

---

## Was im Scope schmaler bzw. breiter ist

ClaudeOS-Core ist **schmaler** als breit aufgestellte Bundles (es liefert keine Preset-Agents, Hooks oder Methodiken — nur die Regeln Ihres Projekts). Es ist **breiter** als Tools, die sich auf ein einzelnes Artefakt fokussieren (es generiert CLAUDE.md plus einen Multi-Verzeichnis-Baum aus Standards, Skills, Guides und Memory). Wählen Sie nach der Achse, die für Ihr Projekt zählt.

---

## „Warum nicht einfach Claude `/init` nutzen?"

Faire Frage. `claude /init` ist in Claude Code eingebaut und schreibt eine einzelne `CLAUDE.md` in einem LLM-Aufruf. Es ist schnell und ohne Konfiguration.

**Es funktioniert gut, wenn:**

- Ihr Projekt klein ist (≤30 Dateien).
- Sie damit einverstanden sind, dass Claude Ihren Stack aus einem schnellen Datei-Tree-Blick errät.
- Sie nur eine `CLAUDE.md` brauchen, nicht einen vollständigen `.claude/rules/`-Satz.

**Es scheitert, wenn:**

- Ihr Projekt eine eigene Konvention hat, die Claude beim schnellen Blick nicht erkennt (z. B. MyBatis statt JPA, eigener Response-Wrapper, ungewöhnliches Paket-Layout).
- Sie Output wollen, der über Teammitglieder hinweg reproduzierbar ist.
- Ihr Projekt groß genug ist, dass ein Claude-Aufruf das Kontextfenster trifft, bevor die Analyse fertig ist.

ClaudeOS-Core ist für genau die Fälle gebaut, in denen `/init` scheitert. Wenn `/init` für Sie funktioniert, brauchen Sie ClaudeOS-Core wahrscheinlich nicht.

---

## „Warum nicht die Regeln einfach manuell schreiben?"

Auch fair. `.claude/rules/` von Hand zu schreiben ist die genaueste Option — Sie kennen Ihr Projekt am besten.

**Es funktioniert gut, wenn:**

- Sie ein Projekt, allein als Entwickler, und es ist okay, viel Zeit ins Schreiben von Regeln aus dem Nichts zu stecken.
- Ihre Konventionen stabil und gut dokumentiert sind.

**Es scheitert, wenn:**

- Sie häufig neue Projekte starten (jedes braucht die Regelschreibzeit).
- Ihr Team wächst und Leute vergessen, was in den Regeln steht.
- Ihre Konventionen sich entwickeln und die Regeln hinterherhinken.

ClaudeOS-Core bringt Sie den größten Teil des Wegs zu einem brauchbaren Regelsatz in einem einzigen Lauf. Der Rest ist Handfeinschliff — und viele Nutzer empfinden das als bessere Zeitnutzung als von einer leeren Datei zu starten.

---

## „Was ist der Unterschied zu einem Preset-Bundle?"

Bundles wie Everything Claude Code geben Ihnen einen kuratierten Satz aus Rules / Skills / Agents, der für „die meisten Projekte" funktioniert. Sie sind großartig für schnelle Adoption, wenn Ihr Projekt zu den Annahmen des Bundles passt.

**Bundles funktionieren gut, wenn:**

- Die Konventionen Ihres Projekts den Bundle-Defaults entsprechen (z. B. Standard Spring Boot oder Standard Next.js).
- Sie keine ungewöhnlichen Stack-Entscheidungen haben (z. B. MyBatis statt JPA).
- Sie einen Startpunkt wollen und damit einverstanden sind, von dort an anzupassen.

**Bundles scheitern, wenn:**

- Ihr Stack nicht-Default-Tooling verwendet (die „Spring Boot"-Regeln des Bundles gehen von JPA aus).
- Sie eine starke projektspezifische Konvention haben, die das Bundle nicht kennt.
- Sie wollen, dass die Regeln sich mit dem Code entwickeln.

ClaudeOS-Core kann Bundles ergänzen: ClaudeOS-Core für projektspezifische Regeln nutzen; ein Bundle für allgemeine Workflow-Regeln darüberlegen.

---

## Auswahl zwischen ähnlichen Tools

Wenn Sie zwischen ClaudeOS-Core und einem anderen projektbezogenen Claude-Code-Tool wählen, fragen Sie sich:

1. **Soll das Tool meinen Code lesen, oder will ich mein Projekt beschreiben?**
   Code-lesend → ClaudeOS-Core. Beschreibung → die meisten anderen.

2. **Brauche ich jedes Mal denselben Output?**
   Ja → ClaudeOS-Core (deterministisch). Nein → jedes von ihnen.

3. **Will ich vollständige Standards/Rules/Skills/Guides oder nur eine CLAUDE.md?**
   Vollständigen Satz → ClaudeOS-Core. Nur CLAUDE.md → Claude `/init`.

4. **Ist meine Ausgabesprache Englisch oder eine andere?**
   Nur Englisch → viele Tools passen. Andere Sprachen → ClaudeOS-Core (10 Sprachen eingebaut).

5. **Brauche ich Agent-Orchestrierung, Planungs-Workflows oder Hooks?**
   Ja → das passende dedizierte Tool nutzen. ClaudeOS-Core macht das nicht.

Wenn Sie ClaudeOS-Core und ein anderes Tool nebeneinander genutzt haben, [öffnen Sie ein Issue](https://github.com/claudeos-core/claudeos-core/issues) mit Ihrer Erfahrung — das hilft, diesen Vergleich genauer zu machen.

---

## Siehe auch

- [architecture.md](architecture.md) — was ClaudeOS-Core deterministisch macht
- [stacks.md](stacks.md) — die 12 von ClaudeOS-Core unterstützten Stacks
- [verification.md](verification.md) — das Sicherheitsnetz nach der Generierung, das andere Tools nicht haben
