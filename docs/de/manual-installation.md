# Manuelle Installation

Falls `npx` ausfällt (Corporate-Firewall, Air-Gapped-Umgebung, abgeschottete CI): So installierst und startest du ClaudeOS-Core manuell.

Für die meisten reicht `npx claudeos-core init`. Diese Seite ist dann nicht nötig.

> Englisches Original: [docs/manual-installation.md](../manual-installation.md). Die deutsche Übersetzung wird mit der englischen Version synchron gehalten.

---

## Voraussetzungen (unabhängig von der Installationsmethode)

- **Node.js 18+**: mit `node --version` prüfen. Bei älteren Versionen via [nvm](https://github.com/nvm-sh/nvm), [fnm](https://github.com/Schniz/fnm) oder den OS-Paketmanager aktualisieren.
- **Claude Code**: installiert und authentifiziert. Mit `claude --version` prüfen. Siehe [Anthropics offizieller Installationsleitfaden](https://docs.anthropic.com/en/docs/claude-code).
- **Git-Repo (bevorzugt)**: `init` prüft auf `.git/` plus mindestens eine von `package.json`, `build.gradle`, `pom.xml`, `pyproject.toml` im Projekt-Root.

---

## Option 1 — Globale npm-Installation

```bash
npm install -g claudeos-core
```

Prüfen:

```bash
claudeos-core --version
```

Dann ohne `npx` benutzen:

```bash
claudeos-core init
```

**Vorteile:** Standard, läuft auf den meisten Setups.
**Nachteile:** Braucht npm und Schreibzugriff auf das globale `node_modules`.

Später aktualisieren:

```bash
npm install -g claudeos-core@latest
```

Deinstallieren:

```bash
npm uninstall -g claudeos-core
```

---

## Option 2 — Pro-Projekt-DevDependency

In die `package.json` des Projekts einfügen:

```json
{
  "devDependencies": {
    "claudeos-core": "^2.4.4"
  }
}
```

Installieren:

```bash
npm install
```

Über npm-Skripte nutzen:

```json
{
  "scripts": {
    "claudeos:init": "claudeos-core init",
    "claudeos:health": "claudeos-core health",
    "claudeos:lint": "claudeos-core lint"
  }
}
```

Dann:

```bash
npm run claudeos:init
```

**Vorteile:** Pro-Projekt gepinnte Version, CI-freundlich, keine globale Verschmutzung.
**Nachteile:** Bläht `node_modules` etwas auf. Die Dependencies bleiben aber minimal (nur `glob` und `gray-matter`).

Aus einem Projekt entfernen:

```bash
npm uninstall claudeos-core
```

---

## Option 3 — Klonen und linken (für Mitwirkende)

Für Entwicklung oder Contributions:

```bash
git clone https://github.com/claudeos-core/claudeos-core.git
cd claudeos-core
npm install
npm link
```

Jetzt liegt `claudeos-core` global im PATH und zeigt auf den geklonten Repo.

Einen lokalen Klon in einem anderen Projekt verwenden:

```bash
cd /path/to/your/other/project
npm link claudeos-core
```

**Vorteile:** Tool-Quellcode bearbeiten und Änderungen sofort testen.
**Nachteile:** Nur für Mitwirkende sinnvoll. Der Link bricht, sobald der geklonte Repo verschoben wird.

---

## Option 4 — Vendored / Air-Gapped

Für Umgebungen ohne Internetzugang:

**Auf einer verbundenen Maschine:**

```bash
npm pack claudeos-core
# Erzeugt claudeos-core-2.4.4.tgz
```

**Das `.tgz` in die Air-Gapped-Umgebung übertragen.**

**Aus der lokalen Datei installieren:**

```bash
npm install -g ./claudeos-core-2.4.4.tgz
```

Außerdem nötig:
- Node.js 18+ bereits in der Air-Gapped-Umgebung installiert.
- Claude Code bereits installiert und authentifiziert.
- Die npm-Pakete `glob` und `gray-matter` im Offline-npm-Cache (oder separat per `npm pack` als Vendored-Pakete).

Um alle transitiven Dependencies gebündelt zu bekommen, hilft `npm install --omit=dev` in einer entpackten Kopie des Tarballs, bevor du überträgst.

---

## Installation prüfen

Nach jeder Installationsmethode alle vier Voraussetzungen prüfen:

```bash
# Sollte die Version drucken (z. B. 2.4.4)
claudeos-core --version

# Sollte die Claude-Code-Version drucken
claude --version

# Sollte die Node-Version drucken (muss 18+ sein)
node --version

# Sollte den Hilfetext drucken
claudeos-core --help
```

Klappen alle vier, kann `claudeos-core init` in einem Projekt loslegen.

---

## Deinstallieren

```bash
# Falls global installiert
npm uninstall -g claudeos-core

# Falls pro-Projekt installiert
npm uninstall claudeos-core
```

Um zusätzlich die generierten Inhalte aus einem Projekt zu entfernen:

```bash
rm -rf claudeos-core/ .claude/rules/ CLAUDE.md
```

ClaudeOS-Core schreibt nur nach `claudeos-core/`, `.claude/rules/` und `CLAUDE.md`. Diese drei zu löschen reicht, um die generierten Inhalte komplett aus einem Projekt zu tilgen.

---

## CI-Integration

Für GitHub Actions setzt der offizielle Workflow auf `npx`:

```yaml
- uses: actions/setup-node@v5
  with:
    node-version: '20'

- run: npx claudeos-core health
```

Das genügt für die meisten CI-Fälle. `npx` lädt das Paket bei Bedarf herunter und cached es.

Bei air-gapped CI oder gepinnter Version: Option 2 (Pro-Projekt-DevDependency) plus:

```yaml
- uses: actions/setup-node@v5
  with:
    node-version: '20'
    cache: 'npm'

- run: npm ci
- run: npm run claudeos:health
```

Bei anderen CI-Systemen (GitLab, CircleCI, Jenkins usw.) bleibt das Muster gleich: Node installieren, Claude Code installieren, authentifizieren, `npx claudeos-core <command>` starten.

**`health` ist die empfohlene CI-Prüfung.** Schnell (keine LLM-Aufrufe) und deckt die vier Laufzeit-Validatoren ab. Für die strukturelle Validierung zusätzlich `claudeos-core lint` aufrufen.

---

## Troubleshooting der Installation

### „Command not found: claudeos-core"

Entweder ist das Tool nicht global installiert, oder der PATH enthält das globale npm-bin nicht.

```bash
npm config get prefix
# Sicherstellen, dass das bin/-Verzeichnis unter diesem Pfad im PATH liegt
```

Oder einfach `npx`:

```bash
npx claudeos-core <command>
```

### „Cannot find module 'glob'"

ClaudeOS-Core läuft aus einem Verzeichnis, das kein Projekt-Root ist. Entweder `cd` ins Projekt oder `npx` nutzen (funktioniert von überall).

### „Node.js version not supported"

Node 16 oder älter ist installiert. Auf Node 18+ aktualisieren:

```bash
# nvm
nvm install 20 && nvm use 20

# fnm
fnm install 20 && fnm use 20

# OS-Paketmanager: variiert
```

### „Claude Code not found"

ClaudeOS-Core nutzt die lokale Claude-Code-Installation. Erst Claude Code installieren ([offizieller Leitfaden](https://docs.anthropic.com/en/docs/claude-code)) und mit `claude --version` prüfen.

Wenn `claude` installiert ist, aber nicht im PATH liegt, den PATH korrigieren. Eine Override-Env-Variable gibt es nicht.

---

## Siehe auch

- [commands.md](commands.md): was nach der Installation läuft
- [troubleshooting.md](troubleshooting.md): Laufzeitfehler während `init`
