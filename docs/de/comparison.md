# Vergleich mit ähnlichen Tools

Diese Seite vergleicht ClaudeOS-Core mit anderen Claude-Code-Tools im selben Umfeld (projektbezogene Claude-Code-Konfiguration).

**Das ist ein Scope-Vergleich, kein Qualitätsurteil.** Die meisten Tools unten leisten in ihrem Bereich Hervorragendes. Der Punkt: Sie sollen einschätzen können, ob ClaudeOS-Core zu Ihrem Problem passt oder ob ein anderes Tool besser geeignet ist.

> Englisches Original: [docs/comparison.md](../comparison.md). Die deutsche Übersetzung wird mit der englischen Version synchron gehalten.

---

## TL;DR

Sie wollen **automatisch `.claude/rules/` aus dem generieren, was tatsächlich in Ihrem Code steht**? Das ist die Spezialität von ClaudeOS-Core.

Sie wollen etwas anderes (breite Preset-Bundles, Planungs-Workflows, Agent-Orchestrierung, Multi-Tool-Konfigurationssync)? Dann passen andere Tools im Claude-Code-Ökosystem wahrscheinlich besser.

---

## Wie ClaudeOS-Core sich von anderen Tools unterscheidet

Definierende Eigenschaften von ClaudeOS-Core:

- **Liest Ihren tatsächlichen Quellcode** (deterministischer Node.js-Scanner, kein LLM-Erraten des Stacks).
- **4-Pass-Claude-Pipeline** mit faktengestützten Prompts. Pfade und Konventionen werden einmal extrahiert und wiederverwendet.
- **5 Validatoren nach der Generierung**: `claude-md-validator` für Struktur, `content-validator` für Pfadbehauptungen und Inhalt, `pass-json-validator` für Zwischen-JSON, `plan-validator` für Legacy-Plan-Dateien, `sync-checker` für Festplatten-↔-Sync-Map-Konsistenz.
- **10 Ausgabesprachen** mit sprachunabhängiger Validierung.
- **Pro-Projekt-Ausgabe**: CLAUDE.md, `.claude/rules/`, Standards, Skills, Guides, Memory-Schicht. Alles aus Ihrem Code abgeleitet, nicht aus einem Preset-Bundle.

Andere Claude-Code-Tools in diesem Umfeld (Sie können sie schichten oder je nach Bedarf eines auswählen):

- **Claude `/init`**: in Claude Code eingebaut, schreibt eine einzelne `CLAUDE.md` in einem LLM-Aufruf. Passt für schnelle Ein-Datei-Setups bei kleinen Projekten.
- **Preset-/Bundle-Tools**: verteilen kuratierte Agents, Skills oder Rules, die für „die meisten Projekte" funktionieren. Passt, wenn Ihre Konventionen den Bundle-Defaults entsprechen.
- **Planungs-/Workflow-Tools**: bieten strukturierte Methodiken für Feature-Entwicklung (Specs, Phasen usw.). Passt, wenn Sie eine Prozessebene über Claude Code wollen.
- **Hook-/DX-Tools**: ergänzen Auto-Save, Code-Quality-Hooks oder DX-Verbesserungen für Claude-Code-Sessions.
- **Cross-Agent-Rule-Konverter**: halten Ihre Regeln über Claude Code, Cursor usw. synchron.

Diese Tools sind meist **komplementär, nicht konkurrierend**. ClaudeOS-Core übernimmt die Aufgabe „pro-projekt-Regeln aus Ihrem Code generieren". Die anderen erledigen andere Aufgaben. Die meisten lassen sich kombinieren.

---

## Wann ClaudeOS-Core passt

✅ Claude Code soll den Konventionen IHRES Projekts folgen, nicht generischen.
✅ Sie starten ein neues Projekt (oder onboarden ein Team) und brauchen schnelles Setup.
✅ Sie haben es satt, `.claude/rules/` mit dem wachsenden Codebase manuell zu pflegen.
✅ Sie arbeiten in einem der [12 unterstützten Stacks](stacks.md).
✅ Sie brauchen deterministischen, reproduzierbaren Output: gleicher Code, jedes Mal gleiche Regeln.
✅ Sie brauchen Output in einer nicht-englischen Sprache (10 Sprachen eingebaut).

## Wann ClaudeOS-Core NICHT passt

❌ Sie wollen ein kuratiertes Preset-Bundle aus Agents/Skills/Rules, das ohne Scan-Schritt am ersten Tag funktioniert.
❌ Ihr Stack wird nicht unterstützt und Sie wollen auch keinen beitragen.
❌ Sie brauchen Agent-Orchestrierung, Planungs-Workflows oder Coding-Methodik. Dafür gibt es spezialisierte Tools.
❌ Sie brauchen nur eine einzelne `CLAUDE.md`, nicht den vollen Standards-/Rules-/Skills-Satz. Dann reicht `claude /init`.

---

## Was im Scope schmaler bzw. breiter ist

ClaudeOS-Core ist **schmaler** als breit aufgestellte Bundles: keine Preset-Agents, keine Hooks, keine Methodiken, nur die Regeln Ihres Projekts. Es ist **breiter** als Tools, die sich auf ein einzelnes Artefakt fokussieren: es generiert CLAUDE.md plus einen Multi-Verzeichnis-Baum aus Standards, Skills, Guides und Memory. Wählen Sie nach der Achse, die für Ihr Projekt zählt.

---

## „Warum nicht einfach Claude `/init` nutzen?"

Berechtigte Frage. `claude /init` ist in Claude Code eingebaut und schreibt eine einzelne `CLAUDE.md` in einem LLM-Aufruf. Schnell und ohne Konfiguration.

**Es funktioniert gut, wenn:**

- Ihr Projekt klein ist (≤30 Dateien).
- Sie damit einverstanden sind, dass Claude Ihren Stack aus einem schnellen Blick auf den Datei-Tree errät.
- Sie nur eine `CLAUDE.md` brauchen, nicht einen vollständigen `.claude/rules/`-Satz.

**Es scheitert, wenn:**

- Ihr Projekt eine eigene Konvention hat, die Claude beim schnellen Blick nicht erkennt: MyBatis statt JPA, eigener Response-Wrapper, ungewöhnliches Paket-Layout.
- Sie Output brauchen, der über Teammitglieder hinweg reproduzierbar ist.
- Ihr Projekt groß genug ist, dass ein Claude-Aufruf das Kontextfenster trifft, bevor die Analyse fertig ist.

ClaudeOS-Core ist für genau die Fälle gebaut, in denen `/init` scheitert. Wenn `/init` bei Ihnen funktioniert, brauchen Sie ClaudeOS-Core wahrscheinlich nicht.

---

## „Warum nicht die Regeln einfach manuell schreiben?"

Auch eine berechtigte Frage. `.claude/rules/` von Hand zu schreiben ist die genaueste Option, denn Sie kennen Ihr Projekt am besten.

**Es funktioniert gut, wenn:**

- Sie als Solo-Entwickler arbeiten und genug Zeit haben, Regeln von Grund auf zu schreiben.
- Ihre Konventionen stabil und gut dokumentiert sind.

**Es scheitert, wenn:**

- Sie häufig neue Projekte starten (jedes braucht die Regelschreibzeit).
- Ihr Team wächst und Leute vergessen, was in den Regeln steht.
- Ihre Konventionen sich entwickeln und die Regeln hinterherhinken.

ClaudeOS-Core liefert in einem einzigen Lauf bereits den Großteil eines brauchbaren Regelsatzes. Der Rest ist Handfeinschliff. Viele Nutzer empfinden das als bessere Zeitnutzung als bei einer leeren Datei zu starten.

---

## „Was ist der Unterschied zu einem Preset-Bundle?"

Bundles wie Everything Claude Code geben Ihnen einen kuratierten Satz aus Rules / Skills / Agents, der für „die meisten Projekte" funktioniert. Hervorragend für einen schnellen Einstieg, wenn Ihr Projekt zu den Annahmen des Bundles passt.

**Bundles funktionieren gut, wenn:**

- Die Konventionen Ihres Projekts den Bundle-Defaults entsprechen, etwa Standard Spring Boot oder Standard Next.js.
- Sie keine ungewöhnlichen Stack-Entscheidungen haben (z. B. MyBatis statt JPA).
- Sie einen Startpunkt brauchen und damit einverstanden sind, von dort aus anzupassen.

**Bundles scheitern, wenn:**

- Ihr Stack nicht-Default-Tooling nutzt (die „Spring Boot"-Regeln des Bundles gehen von JPA aus).
- Sie eine starke projektspezifische Konvention haben, die das Bundle nicht kennt.
- Die Regeln sollen sich mit dem Code entwickeln.

ClaudeOS-Core lässt sich mit Bundles kombinieren: ClaudeOS-Core für projektspezifische Regeln, ein Bundle obendrauf für allgemeine Workflow-Regeln.

---

## Auswahl zwischen ähnlichen Tools

Wenn Sie zwischen ClaudeOS-Core und einem anderen projektbezogenen Claude-Code-Tool wählen, fragen Sie sich:

1. **Soll das Tool meinen Code lesen, oder will ich mein Projekt beschreiben?**
   Code-lesend → ClaudeOS-Core. Beschreibung → die meisten anderen.

2. **Brauche ich jedes Mal denselben Output?**
   Ja → ClaudeOS-Core (deterministisch). Nein → jedes der anderen Tools passt.

3. **Will ich vollständige Standards/Rules/Skills/Guides oder nur eine CLAUDE.md?**
   Vollständigen Satz → ClaudeOS-Core. Nur CLAUDE.md → Claude `/init`.

4. **Ist meine Ausgabesprache Englisch oder eine andere?**
   Nur Englisch → viele Tools passen. Andere Sprachen → ClaudeOS-Core (10 Sprachen eingebaut).

5. **Brauche ich Agent-Orchestrierung, Planungs-Workflows oder Hooks?**
   Ja → das passende dedizierte Tool. ClaudeOS-Core macht das nicht.

Haben Sie ClaudeOS-Core und ein anderes Tool nebeneinander genutzt? Dann [öffnen Sie ein Issue](https://github.com/claudeos-core/claudeos-core/issues) mit Ihrer Erfahrung. Das hilft, diesen Vergleich genauer zu machen.

---

## Siehe auch

- [architecture.md](architecture.md): was ClaudeOS-Core deterministisch macht
- [stacks.md](stacks.md): die 12 von ClaudeOS-Core unterstützten Stacks
- [verification.md](verification.md): das Sicherheitsnetz nach der Generierung, das andere Tools nicht haben
