# Manuelle Installation

Wenn Sie `npx` nicht nutzen können (Corporate-Firewall, Air-Gapped-Umgebung, abgeschottete CI), so installieren und führen Sie ClaudeOS-Core manuell aus.

Für die meisten Nutzer reicht `npx claudeos-core init` — Sie müssen diese Seite nicht lesen.

> Englisches Original: [docs/manual-installation.md](../manual-installation.md). Die deutsche Übersetzung wird mit der englischen Version synchron gehalten.

---

## Voraussetzungen (unabhängig von der Installationsmethode)

- **Node.js 18+** — mit `node --version` prüfen. Falls älter, via [nvm](https://github.com/nvm-sh/nvm), [fnm](https://github.com/Schniz/fnm) oder Ihren Betriebssystem-Paketmanager aktualisieren.
- **Claude Code** — installiert und authentifiziert. Mit `claude --version` prüfen. Siehe [Anthropics offizieller Installationsleitfaden](https://docs.anthropic.com/en/docs/claude-code).
- **Git-Repo (bevorzugt)** — `init` prüft auf `.git/` und mindestens eine von `package.json`, `build.gradle`, `pom.xml`, `pyproject.toml` im Projekt-Root.

---

## Option 1 — Globale npm-Installation

```bash
npm install -g claudeos-core
```

Verifizieren:

```bash
claudeos-core --version
```

Dann ohne `npx` nutzen:

```bash
claudeos-core init
```

**Vorteile:** Standard, funktioniert auf den meisten Setups.
**Nachteile:** Braucht npm + Schreibzugriff auf das globale `node_modules`.

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

In die `package.json` Ihres Projekts einfügen:

```json
{
  "devDependencies": {
    "claudeos-core": "^2.4.3"
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

**Vorteile:** Pro-Projekt gepinnte Version; CI-freundlich; keine globale Verschmutzung.
**Nachteile:** Bläht `node_modules` auf — die Dependencies sind aber minimal (nur `glob` und `gray-matter`).

Aus einem Projekt entfernen:

```bash
npm uninstall claudeos-core
```

---

## Option 3 — Klonen & linken (für Mitwirkende)

Für Entwicklung oder zum Beitragen:

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
**Nachteile:** Nur für Mitwirkende sinnvoll. Der Link bricht, wenn Sie den geklonten Repo verschieben.

---

## Option 4 — Vendored / Air-Gapped

Für Umgebungen ohne Internetzugang:

**Auf einer verbundenen Maschine:**

```bash
npm pack claudeos-core
# Erzeugt claudeos-core-2.4.3.tgz
```

**Übertragen Sie das `.tgz` in Ihre Air-Gapped-Umgebung.**

**Aus der lokalen Datei installieren:**

```bash
npm install -g ./claudeos-core-2.4.3.tgz
```

Sie brauchen außerdem:
- Node.js 18+ bereits in der Air-Gapped-Umgebung installiert.
- Claude Code bereits installiert und authentifiziert.
- Die npm-Pakete `glob` und `gray-matter` im Offline-npm-Cache (oder separat per `npm pack` als Vendored-Pakete).

Um alle transitiven Dependencies gebündelt zu bekommen, können Sie `npm install --omit=dev` in einer entpackten Kopie des Tarballs ausführen, bevor Sie übertragen.

---

## Installation verifizieren

Nach jeder Installationsmethode alle vier Voraussetzungen verifizieren:

```bash
# Sollte die Version drucken (z. B. 2.4.3)
claudeos-core --version

# Sollte Claude-Code-Version drucken
claude --version

# Sollte Node-Version drucken (muss 18+ sein)
node --version

# Sollte Hilfetext drucken
claudeos-core --help
```

Wenn alle vier funktionieren, sind Sie bereit, `claudeos-core init` in einem Projekt auszuführen.

---

## Deinstallieren

```bash
# Falls global installiert
npm uninstall -g claudeos-core

# Falls pro-Projekt installiert
npm uninstall claudeos-core
```

Um zudem die generierten Inhalte aus einem Projekt zu entfernen:

```bash
rm -rf claudeos-core/ .claude/rules/ CLAUDE.md
```

ClaudeOS-Core schreibt nur nach `claudeos-core/`, `.claude/rules/` und `CLAUDE.md`. Diese drei zu entfernen reicht, um die generierten Inhalte vollständig aus einem Projekt zu entfernen.

---

## CI-Integration

Für GitHub Actions nutzt der offizielle Workflow `npx`:

```yaml
- uses: actions/setup-node@v5
  with:
    node-version: '20'

- run: npx claudeos-core health
```

Das genügt für die meisten CI-Anwendungsfälle — `npx` lädt das Paket bei Bedarf herunter und cached es.

Wenn Ihre CI air-gapped ist oder Sie eine gepinnte Version wollen, nutzen Sie Option 2 (Pro-Projekt-DevDependency) und:

```yaml
- uses: actions/setup-node@v5
  with:
    node-version: '20'
    cache: 'npm'

- run: npm ci
- run: npm run claudeos:health
```

Für andere CI-Systeme (GitLab, CircleCI, Jenkins usw.) ist das Muster dasselbe: Node installieren, Claude Code installieren, authentifizieren, `npx claudeos-core <command>` ausführen.

**`health` ist die empfohlene CI-Prüfung** — sie ist schnell (keine LLM-Aufrufe) und deckt die vier Laufzeit-Validatoren ab. Für die strukturelle Validierung zusätzlich `claudeos-core lint` ausführen.

---

## Troubleshooting der Installation

### „Command not found: claudeos-core"

Entweder ist es nicht global installiert, oder Ihr PATH enthält das globale npm-bin nicht.

```bash
npm config get prefix
# Stellen Sie sicher, dass das bin/-Verzeichnis unter diesem Pfad in Ihrem PATH ist
```

Oder verwenden Sie stattdessen `npx`:

```bash
npx claudeos-core <command>
```

### „Cannot find module 'glob'"

Sie führen ClaudeOS-Core aus einem Verzeichnis aus, das kein Projekt-Root ist. Entweder `cd` in Ihr Projekt, oder `npx` nutzen (funktioniert von überall).

### „Node.js version not supported"

Sie haben Node 16 oder älter. Auf Node 18+ aktualisieren:

```bash
# nvm
nvm install 20 && nvm use 20

# fnm
fnm install 20 && fnm use 20

# OS-Paketmanager — variiert
```

### „Claude Code not found"

ClaudeOS-Core nutzt Ihre lokale Claude-Code-Installation. Installieren Sie Claude Code zuerst ([offizieller Leitfaden](https://docs.anthropic.com/en/docs/claude-code)) und verifizieren Sie mit `claude --version`.

Wenn `claude` installiert, aber nicht im PATH ist, korrigieren Sie Ihren PATH — es gibt keine Override-Env-Variable.

---

## Siehe auch

- [commands.md](commands.md) — was nach der Installation auszuführen ist
- [troubleshooting.md](troubleshooting.md) — Laufzeitfehler während `init`
