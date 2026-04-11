# ClaudeOS-Core

**Das einzige Tool, das zuerst Ihren Quellcode liest, Stack und Patterns mit deterministischer Analyse bestätigt und dann Claude Code Regeln generiert, die exakt auf Ihr Projekt zugeschnitten sind.**

```bash
npx claudeos-core init
```

ClaudeOS-Core liest Ihre Codebasis, extrahiert jedes Muster und generiert einen vollständigen Satz von Standards, Rules, Skills und Guides, die auf _Ihr_ Projekt zugeschnitten sind. Danach, wenn Sie Claude Code sagen „Erstelle ein CRUD für Bestellungen", erzeugt es Code, der exakt Ihren bestehenden Mustern entspricht.

[🇺🇸 English](./README.md) · [🇰🇷 한국어](./README.ko.md) · [🇨🇳 中文](./README.zh-CN.md) · [🇯🇵 日本語](./README.ja.md) · [🇪🇸 Español](./README.es.md) · [🇻🇳 Tiếng Việt](./README.vi.md) · [🇮🇳 हिन्दी](./README.hi.md) · [🇷🇺 Русский](./README.ru.md) · [🇫🇷 Français](./README.fr.md)

---

## Warum ClaudeOS-Core?

> Mensch beschreibt das Projekt → LLM generiert Dokumentation

ClaudeOS-Core:

> Code analysiert Quellcode → Code baut maßgeschneiderten Prompt → LLM generiert Dokumentation → Code verifiziert Output

### Das Kernproblem: LLMs raten. Code bestätigt.

Wenn Sie Claude bitten, "dieses Projekt zu analysieren", **rät** es Ihren Stack, ORM, Domänenstruktur.

**ClaudeOS-Core rät nicht.** Claude Node.js:

- `build.gradle` / `package.json` / `pyproject.toml` → **confirmed**
- directory scan → **confirmed**
- Java 5 patterns, Kotlin CQRS/BFF, Next.js App Router/FSD → **classified**
- domain groups → **split**
- stack-specific prompt → **assembled**

### Das Ergebnis

Andere Tools erzeugen "allgemein gute" Dokumentation.
ClaudeOS-Core erzeugt Dokumentation, die weiß, dass Ihr Projekt `ApiResponse.ok()` verwendet (nicht `ResponseEntity.success()`), dass Ihre MyBatis XML Mapper in `src/main/resources/mybatis/mappers/` liegen — weil es Ihren tatsächlichen Code gelesen hat.

### Before & After

**Ohne ClaudeOS-Core**:
```
❌ JPA repository (MyBatis)
❌ ResponseEntity.success() (ApiResponse.ok())
❌ order/controller/ (controller/order/)
→ 20 min fix per file
```

**Mit ClaudeOS-Core**:
```
✅ MyBatis mapper + XML (build.gradle)
✅ ApiResponse.ok() (source code)
✅ controller/order/ (Pattern A)
→ immediate match
```

Dieser Unterschied summiert sich. 10 Aufgaben/Tag × 20 Minuten gespart = **über 3 Stunden/Tag**.

---

## Unterstützte Stacks

| Stack | Erkennung | Analysetiefe |
|---|---|---|
| **Java / Spring Boot** | `build.gradle`, `pom.xml`, 5 Paketmuster | 10 Kategorien, 59 Unterpunkte |
| **Kotlin / Spring Boot** | `build.gradle.kts`, kotlin plugin, `settings.gradle.kts`, CQRS/BFF auto-detect | 12 Kategorien, 95 Unterpunkte |
| **Node.js / Express** | `package.json` | 9 Kategorien, 57 Unterpunkte |
| **Node.js / NestJS** | `package.json` (`@nestjs/core`) | 10 Kategorien, 68 Unterpunkte |
| **Next.js / React** | `package.json`, `next.config.*`, FSD-Unterstützung | 9 Kategorien, 55 Unterpunkte |
| **Vue / Nuxt** | `package.json`, `nuxt.config.*`, Composition API | 9 Kategorien, 58 Unterpunkte |
| **Python / Django** | `requirements.txt`, `pyproject.toml` | 10 Kategorien, 55 Unterpunkte |
| **Python / FastAPI** | `requirements.txt`, `pyproject.toml` | 10 Kategorien, 58 Unterpunkte |
| **Node.js / Fastify** | `package.json` | 10 Kategorien, 62 Unterpunkte |
| **Vite / React SPA** | `package.json`, `vite.config.*` | 9 Kategorien, 55 Unterpunkte |
| **Angular** | `package.json`, `angular.json` | 12 Kategorien, 78 Unterpunkte |

Automatisch erkannt: Sprache und Version, Framework und Version (einschließlich Vite als SPA-Framework), ORM (MyBatis, JPA, Exposed, Prisma, TypeORM, SQLAlchemy usw.), Datenbank (PostgreSQL, MySQL, Oracle, MongoDB, SQLite), Paketmanager (Gradle, Maven, npm, yarn, pnpm, pip, poetry), Architektur (CQRS, BFF — aus Modulnamen erkannt), Multi-Modul-Struktur (aus settings.gradle), Monorepo (Turborepo, pnpm-workspace, Lerna, npm/yarn workspaces).

**Sie müssen nichts angeben. Alles wird automatisch erkannt.**


### Java-Domain-Erkennung (5 Muster mit Fallback)

| Priorität | Muster | Struktur | Beispiel |
|---|---|---|---|
| A | Layer-first | `controller/{domain}/` | `controller/user/UserController.java` |
| B | Domain-first | `{domain}/controller/` | `user/controller/UserController.java` |
| D | Modul-Präfix | `{module}/{domain}/controller/` | `front/member/controller/MemberController.java` |
| E | DDD/Hexagonal | `{domain}/adapter/in/web/` | `user/adapter/in/web/UserController.java` |
| C | Flach | `controller/*.java` | `controller/UserController.java` → extrahiert `user` aus Klassenname |

Domains nur mit Services (ohne Controller) werden ebenfalls über die Verzeichnisse `service/`, `dao/`, `aggregator/`, `facade/`, `usecase/`, `orchestrator/`, `mapper/`, `repository/` erkannt. Übersprungen: `common`, `config`, `util`, `core`, `front`, `admin`, `v1`, `v2` usw.


### Kotlin Multi-Modul Domain-Erkennung

Für Kotlin-Projekte mit Gradle-Multi-Modul-Struktur (z.B. CQRS-Monorepo):

| Schritt | Aktion | Beispiel |
|---|---|---|
| 1 | `settings.gradle.kts` nach `include()` scannen | 14 Module gefunden |
| 2 | Modultyp aus Name erkennen | `reservation-command-server` → Typ: `command` |
| 3 | Domain aus Modulname extrahieren | `reservation-command-server` → Domain: `reservation` |
| 4 | Gleiche Domain über Module gruppieren | `reservation-command-server` + `common-query-server` → 1 Domain |
| 5 | Architektur erkennen | Hat `command` + `query` Module → CQRS |

Unterstützte Modultypen: `command`, `query`, `bff`, `integration`, `standalone`, `library`. Gemeinsame Bibliotheken (`shared-lib`, `integration-lib`) werden als spezielle Domains erkannt.

### Frontend-Domain-Erkennung

- **App Router**: `app/{domain}/page.tsx` (Next.js)
- **Pages Router**: `pages/{domain}/index.tsx`
- **FSD (Feature-Sliced Design)**: `features/*/`, `widgets/*/`, `entities/*/`
- **RSC/Client-Split**: Erkennt `client.tsx`-Muster, verfolgt Server/Client-Trennung
- **Nicht-standardmäßige verschachtelte Pfade**: Erkennung von Seiten, Komponenten und FSD-Layern unter `src/*/pages/`, `src/*/components/`, `src/*/features/` (z.B. `src/admin/pages/dashboard/`)
- **Config-Fallback**: Erkennt Next.js/Vite/Nuxt aus Config-Dateien (Monorepo-Unterstützung)
- **Tiefe Verzeichnis-Fallback**: Für React/CRA/Vite/Vue/RN-Projekte scannt `**/components/*/`, `**/views/*/`, `**/screens/*/`, `**/containers/*/`, `**/pages/*/`, `**/routes/*/`, `**/modules/*/`, `**/domains/*/` in beliebiger Tiefe

---

## Schnellstart

### Voraussetzungen

- **Node.js** v18+
- **Claude Code CLI** (installiert und authentifiziert)

### Installation

```bash
cd /your/project/root

# Option A: npx (empfohlen — keine Installation nötig)
npx claudeos-core init

# Option B: globale Installation
npm install -g claudeos-core
claudeos-core init

# Option C: Projekt devDependency
npm install --save-dev claudeos-core
npx claudeos-core init

# Option D: git clone (für Entwicklung/Beiträge)
git clone https://github.com/claudeos-core/claudeos-core.git claudeos-core-tools

# Plattformübergreifend (PowerShell, CMD, Bash, Zsh — jedes Terminal)
node claudeos-core-tools/bin/cli.js init

# Nur Linux/macOS (nur Bash)
bash claudeos-core-tools/bootstrap.sh
```

### Ausgabesprache (10 Sprachen)

Wenn Sie `init` ohne `--lang` ausführen, erscheint ein interaktiver Selektor (Pfeiltasten oder Zifferntasten):

```
╔══════════════════════════════════════════════════╗
║  Select generated document language (required)   ║
╚══════════════════════════════════════════════════╝

  Die generierten Dateien (CLAUDE.md, Standards, Rules,
  Skills, Guides) werden auf Deutsch verfasst.

     1. en     — English
     ...
  ❯ 10. de     — Deutsch (German)

  ↑↓ Move  1-0 Jump  Enter Select  ESC Cancel
```

Die Beschreibung wechselt beim Navigieren in die entsprechende Sprache. Um den Selektor zu überspringen:

```bash
npx claudeos-core init --lang de    # Deutsch
npx claudeos-core init --lang en    # English
npx claudeos-core init --lang ko    # 한국어
```

> **Hinweis:** Dies ändert nur die Sprache der generierten Dokumentationsdateien. Die Codeanalyse (Pass 1–2) läuft immer auf Englisch; nur das generierte Ergebnis (Pass 3) wird in der gewählten Sprache geschrieben.

Das war's. Nach 5–18 Minuten ist die gesamte Dokumentation generiert und einsatzbereit. Die CLI zeigt einen Fortschrittsbalken mit Prozent, verstrichener Zeit und geschätzter Restzeit für jeden Pass an.

### Manuelle Schritt-für-Schritt-Installation

Wenn Sie volle Kontrolle über jede Phase wünschen — oder wenn die automatisierte Pipeline bei einem Schritt fehlschlägt — können Sie jede Stufe manuell ausführen. Dies ist auch nützlich, um die interne Funktionsweise von ClaudeOS-Core zu verstehen.

#### Step 1: Klonen und Abhängigkeiten installieren

```bash
cd /your/project/root

git clone https://github.com/claudeos-core/claudeos-core.git claudeos-core-tools
cd claudeos-core-tools && npm install && cd ..
```

#### Step 2: Verzeichnisstruktur erstellen

```bash
# Rules
mkdir -p .claude/rules/{00.core,10.backend,20.frontend,30.security-db,40.infra,50.sync}

# Standards
mkdir -p claudeos-core/standard/{00.core,10.backend-api,20.frontend-ui,30.security-db,40.infra,50.verification,90.optional}

# Skills
mkdir -p claudeos-core/skills/{00.shared,10.backend-crud/scaffold-crud-feature,20.frontend-page/scaffold-page-feature,50.testing,90.experimental}

# Guide, Plan, Database, MCP, Generated
mkdir -p claudeos-core/guide/{01.onboarding,02.usage,03.troubleshooting,04.architecture}
mkdir -p claudeos-core/{plan,database,mcp-guide,generated}
```

#### Step 3: plan-installer ausführen (Projektanalyse)

Scannt Ihr Projekt, erkennt den Stack, findet Domains, teilt sie in Gruppen auf und generiert Prompts.

```bash
node claudeos-core-tools/plan-installer/index.js
```

**Ausgabe (`claudeos-core/generated/`):**
- `project-analysis.json` — erkannter Stack, Domains, Frontend-Info
- `domain-groups.json` — Domain-Gruppen für Pass 1
- `pass1-backend-prompt.md` / `pass1-frontend-prompt.md` — Analyse-Prompts
- `pass2-prompt.md` — Merge-Prompt
- `pass3-prompt.md` — Generierungs-Prompt

Sie können diese Dateien inspizieren, um die Erkennungsgenauigkeit zu überprüfen, bevor Sie fortfahren.

#### Step 4: Pass 1 — Tiefgehende Code-Analyse pro Domain-Gruppe

Führen Sie Pass 1 für jede Domain-Gruppe aus. Prüfen Sie `domain-groups.json` für die Anzahl der Gruppen.

```bash
# Check groups
cat claudeos-core/generated/domain-groups.json | node -e "
  const g = JSON.parse(require('fs').readFileSync('/dev/stdin','utf-8'));
  g.groups.forEach((g,i) => console.log('Group '+(i+1)+': ['+g.domains.join(', ')+'] ('+g.type+', ~'+g.estimatedFiles+' files)'));
"

# Run Pass 1 for group 1:
cp claudeos-core/generated/pass1-backend-prompt.md /tmp/_pass1.md
DOMAIN_LIST="user, order, product" PASS_NUM=1 \
  perl -pi -e 's/\{\{DOMAIN_GROUP\}\}/$ENV{DOMAIN_LIST}/g; s/\{\{PASS_NUM\}\}/$ENV{PASS_NUM}/g' /tmp/_pass1.md
cat /tmp/_pass1.md | claude -p --dangerously-skip-permissions

# Für Frontend-Gruppen verwenden Sie pass1-frontend-prompt.md
```

**Prüfen:** `ls claudeos-core/generated/pass1-*.json` sollte pro Gruppe eine JSON zeigen.

#### Step 5: Pass 2 — Analyseergebnisse zusammenführen

```bash
cat claudeos-core/generated/pass2-prompt.md \
  | claude -p --dangerously-skip-permissions
```

**Prüfen:** `claudeos-core/generated/pass2-merged.json` sollte existieren mit 9+ Top-Level-Schlüsseln.

#### Step 6: Pass 3 — Gesamte Dokumentation generieren

```bash
cat claudeos-core/generated/pass3-prompt.md \
  | claude -p --dangerously-skip-permissions
```

**Prüfen:** `CLAUDE.md` sollte im Projekt-Root existieren.

#### Step 7: Verifizierungstools ausführen

```bash
# Metadaten generieren (vor anderen Prüfungen erforderlich)
node claudeos-core-tools/manifest-generator/index.js

# Alle Prüfungen ausführen
node claudeos-core-tools/health-checker/index.js

# Oder einzelne Prüfungen ausführen:
node claudeos-core-tools/plan-validator/index.js --check # Plan ↔ disk
node claudeos-core-tools/sync-checker/index.js          # Sync status
node claudeos-core-tools/content-validator/index.js     # Content quality
node claudeos-core-tools/pass-json-validator/index.js   # JSON format
```

#### Step 8: Ergebnisse überprüfen

```bash
find .claude claudeos-core -type f | grep -v node_modules | grep -v '/generated/' | wc -l
head -30 CLAUDE.md
ls .claude/rules/*/
```

> **Tipp:** Wenn ein Schritt fehlschlägt, können Sie nur diesen Schritt erneut ausführen. Pass 1/2-Ergebnisse werden gecacht — wenn `pass1-N.json` oder `pass2-merged.json` bereits existiert, überspringt die automatisierte Pipeline sie. Verwenden Sie `npx claudeos-core init --force`, um vorherige Ergebnisse zu löschen und neu zu starten.

### Nutzung starten

```
# In Claude Code — einfach natürlich sprechen:
"Erstelle ein CRUD für die Bestell-Domäne"
"Füge eine Benutzer-Authentifizierungs-API hinzu"
"Refaktoriere diesen Code nach den Projektmustern"

# Claude Code referenziert automatisch Ihre generierten Standards, Rules und Skills.
```

---

## Funktionsweise — 3-Pass-Pipeline

```
npx claudeos-core init
    │
    ├── [1] npm install                    ← Abhängigkeiten (~10s)
    ├── [2] Verzeichnisstruktur            ← Ordner erstellen (~1s)
    ├── [3] plan-installer (Node.js)       ← Projekt-Scan (~5s)
    │       ├── Automatische Stack-Erkennung (Multi-Stack)
    │       ├── Domänenliste extrahieren (Tags: backend/frontend)
    │       ├── Aufteilung in Domänengruppen (nach Typ)
    │       └── Stack-spezifische Prompts auswählen (nach Typ)
    │
    ├── [4] Pass 1 × N  (claude -p)       ← Tiefgehende Code-Analyse (~2-8 Min)
    │       ├── ⚙️ Backend-Gruppen → Backend-Analyse-Prompt
    │       └── 🎨 Frontend-Gruppen → Frontend-Analyse-Prompt
    │
    ├── [5] Pass 2 × 1  (claude -p)       ← Analyse zusammenführen (~1 Min)
    │       └── ALLE Pass-1-Ergebnisse konsolidieren (Backend + Frontend)
    │
    ├── [6] Pass 3 × 1  (claude -p)       ← Alles generieren (~3-5 Min)
    │       └── Kombinierter Prompt (Backend- + Frontend-Ziele)
    │
    └── [7] Verifizierung                  ← Health Checker automatisch ausführen
```

### Warum 3 Passes?

**Pass 1** ist der einzige Pass, der Ihren Quellcode liest. Er wählt repräsentative Dateien pro Domäne aus und extrahiert Muster über 55–95 Analysekategorien (pro Stack). Bei großen Projekten wird Pass 1 mehrfach ausgeführt — einmal pro Domänengruppe. In Multi-Stack-Projekten (z.B. Java-Backend + React-Frontend) verwenden Backend und Frontend **unterschiedliche Analyse-Prompts**, die auf jeden Stack zugeschnitten sind.

**Pass 2** führt alle Pass-1-Ergebnisse zu einer einheitlichen Analyse zusammen: gemeinsame Muster (100% geteilt), Mehrheitsmuster (50%+ geteilt), domänenspezifische Muster, Anti-Muster nach Schweregrad und Querschnittsthemen (Benennung, Sicherheit, DB, Tests, Logging, Performance).

**Pass 3** nimmt die zusammengeführte Analyse und generiert das gesamte Datei-Ökosystem. Er liest niemals Quellcode — nur das Analyse-JSON. Im Multi-Stack-Modus kombiniert der Generierungs-Prompt Backend- und Frontend-Ziele, sodass beide Standardsätze in einem einzigen Pass generiert werden.

---

## Generierte Dateistruktur

```
your-project/
│
├── CLAUDE.md                          ← Claude Code Einstiegspunkt
│
├── .claude/
│   └── rules/                         ← Glob-getriggerte Regeln
│       ├── 00.core/
│       ├── 10.backend/
│       ├── 20.frontend/
│       ├── 30.security-db/
│       ├── 40.infra/
│       └── 50.sync/                   ← Sync-Erinnerungsregeln
│
├── claudeos-core/                     ← Hauptausgabeverzeichnis
│   ├── generated/                     ← Analyse-JSON + dynamische Prompts
│   ├── standard/                      ← Code-Standards (15-19 Dateien)
│   ├── skills/                        ← CRUD-Scaffolding-Skills
│   ├── guide/                         ← Onboarding, FAQ, Fehlerbehebung (9 Dateien)
│   ├── plan/                          ← Master Plans (Backup/Wiederherstellung)
│   ├── database/                      ← DB-Schema, Migrationsanleitung
│   └── mcp-guide/                     ← MCP-Server-Integrationsleitfaden
│
└── claudeos-core-tools/               ← Dieses Toolkit (nicht ändern)
```

Jede Standard-Datei enthält ✅ korrekte Beispiele, ❌ falsche Beispiele und eine Regelzusammenfassungstabelle — alles abgeleitet aus Ihren tatsächlichen Code-Mustern, nicht aus generischen Vorlagen.

---

## Automatische Skalierung nach Projektgröße

| Größe | Domänen | Pass-1-Durchläufe | Gesamt `claude -p` | Geschätzte Zeit |
|---|---|---|---|---|
| Klein | 1–4 | 1 | 3 | ~5 Min |
| Mittel | 5–8 | 2 | 4 | ~8 Min |
| Groß | 9–16 | 3–4 | 5–6 | ~12 Min |
| Sehr Groß | 17+ | 5+ | 7+ | ~18 Min+ |

Bei Multi-Stack-Projekten (z.B. Java + React) werden Backend- und Frontend-Domänen zusammen gezählt. 6 Backend + 4 Frontend = 10 Domänen, skaliert als „Groß".

---

## Verifizierungstools

ClaudeOS-Core enthält 5 integrierte Verifizierungstools, die nach der Generierung automatisch ausgeführt werden:

```bash
# Alle Prüfungen auf einmal ausführen (empfohlen)
npx claudeos-core health

# Einzelne Befehle
npx claudeos-core validate     # Plan ↔ Festplatte Vergleich
npx claudeos-core refresh      # Festplatte → Plan Synchronisation
npx claudeos-core restore      # Plan → Festplatte Wiederherstellung
```

| Tool | Funktion |
|---|---|
| **manifest-generator** | Erstellt Metadaten-JSON (rule-manifest, sync-map, plan-manifest) |
| **plan-validator** | Vergleicht `<file>`-Blöcke des Master Plans mit der Festplatte — 3 Modi: check, refresh, restore |
| **sync-checker** | Erkennt nicht registrierte Dateien (auf Festplatte, aber nicht im Plan) und verwaiste Einträge |
| **content-validator** | Validiert Dateiqualität — leere Dateien, fehlende ✅/❌ Beispiele, erforderliche Abschnitte |
| **pass-json-validator** | Validiert Pass-1–3-JSON-Struktur, erforderliche Schlüssel und Abschnittsvollständigkeit |

---

## Wie Claude Code Ihre Dokumentation Nutzt

So liest Claude Code die von ClaudeOS-Core generierte Dokumentation tatsächlich:

### Automatisch gelesene Dateien

| Datei | Wann | Garantiert |
|---|---|---|
| `CLAUDE.md` | Bei jedem Gesprächsstart | Immer |
| `.claude/rules/00.core/*` | Beim Bearbeiten von Dateien (`paths: ["**/*"]`) | Immer |
| `.claude/rules/10.backend/*` | Beim Bearbeiten von Dateien (`paths: ["**/*"]`) | Immer |
| `.claude/rules/30.security-db/*` | Beim Bearbeiten von Dateien (`paths: ["**/*"]`) | Immer |
| `.claude/rules/40.infra/*` | Nur bei Config/Infra-Dateien (eingeschränkte Paths) | Bedingt |
| `.claude/rules/50.sync/*` | Nur bei claudeos-core-Dateien (eingeschränkte Paths) | Bedingt |

### Dateien, die on-demand über Regel-Referenzen gelesen werden

Jede Regel-Datei verlinkt im `## Reference`-Abschnitt auf den entsprechenden Standard. Claude liest nur den für die aktuelle Aufgabe relevanten Standard:

- `claudeos-core/standard/**` — Coding-Patterns, ✅/❌ Beispiele, Namenskonventionen
- `claudeos-core/database/**` — DB-Schema (für Queries, Mapper, Migrationen)

`00.standard-reference.md` dient als Verzeichnis zum Entdecken von Standards ohne entsprechende Regel.

### Dateien, die NICHT gelesen werden (Kontexteinsparung)

Explizit durch den `DO NOT Read`-Abschnitt der standard-reference Regel ausgeschlossen:

| Ordner | Ausschlussgrund |
|---|---|
| `claudeos-core/plan/` | Master Plan Backups (~340KB). Verwenden Sie `npx claudeos-core refresh` zur Synchronisation. |
| `claudeos-core/generated/` | Build-Metadaten JSON. Keine Coding-Referenz. |
| `claudeos-core/guide/` | Onboarding-Guides für Menschen. |
| `claudeos-core/mcp-guide/` | MCP Server Dokumentation. Keine Coding-Referenz. |

---

## Täglicher Arbeitsablauf

### Nach der Installation

```
# Verwenden Sie Claude Code wie gewohnt — es referenziert Ihre Standards automatisch:
"Erstelle ein CRUD für die Bestell-Domäne"
"Füge eine API zur Benutzerprofil-Aktualisierung hinzu"
"Refaktoriere diesen Code nach den Projektmustern"
```

### Nach manueller Bearbeitung der Standards

```bash
# Nach dem Bearbeiten von Standard- oder Rules-Dateien:
npx claudeos-core refresh

# Konsistenz überprüfen
npx claudeos-core health
```

### Wenn Dokumente beschädigt sind

```bash
# Alles aus dem Master Plan wiederherstellen
npx claudeos-core restore
```

### CI/CD-Integration

```yaml
# GitHub Actions Beispiel
- run: npx claudeos-core validate
# Exit-Code 1 blockiert den PR
```

---

## Was ist anders?

| | ClaudeOS-Core | Everything Claude Code (50K+ ⭐) | Harness | specs-generator | Claude `/init` |
|---|---|---|---|---|---|
| **Approach** | Code analyzes first, then LLM generates | Pre-built config presets | LLM designs agent teams | LLM generates spec docs | LLM writes CLAUDE.md |
| **Reads your source code** | ✅ Deterministic static analysis | ❌ | ❌ | ❌ (LLM reads) | ❌ (LLM reads) |
| **Stack detection** | Code confirms (ORM, DB, build tool, pkg manager) | N/A (stack-agnostic) | LLM guesses | LLM guesses | LLM guesses |
| **Domain detection** | Code confirms (Java 5 patterns, Kotlin CQRS, Next.js FSD) | N/A | LLM guesses | N/A | N/A |
| **Same project → Same result** | ✅ Deterministic analysis | ✅ (static files) | ❌ (LLM varies) | ❌ (LLM varies) | ❌ (LLM varies) |
| **Large project handling** | Domain group splitting (4 domains / 40 files per group) | N/A | No splitting | No splitting | Context window limit |
| **Output** | CLAUDE.md + Rules + Standards + Skills + Guides + Plans (40-50+ files) | Agents + Skills + Commands + Hooks | Agents + Skills | 6 spec documents | CLAUDE.md (1 file) |
| **Output location** | `.claude/rules/` (auto-loaded by Claude Code) | `.claude/` various | `.claude/agents/` + `.claude/skills/` | `.claude/steering/` + `specs/` | `CLAUDE.md` |
| **Post-generation verification** | ✅ 5 automated validators | ❌ | ❌ | ❌ | ❌ |
| **Multi-language output** | ✅ 10 languages | ❌ | ❌ | ❌ | ❌ |
| **Multi-stack** | ✅ Backend + Frontend simultaneous | ❌ Stack-agnostic | ❌ | ❌ | Partial |
| **Agent orchestration** | ❌ | ✅ 28 agents | ✅ 6 patterns | ❌ | ❌ |

### Key difference

**Other tools give Claude "generally good instructions." ClaudeOS-Core gives Claude "instructions extracted from your actual code."**

### Complementary, not competing

ClaudeOS-Core: **project-specific rules**. Other tools: **agent orchestration**.
Use both together.

---
## FAQ

**F: Ändert es meinen Quellcode?**
Nein. Es werden nur `CLAUDE.md`, `.claude/rules/` und `claudeos-core/` erstellt. Ihr bestehender Code wird niemals geändert.

**F: Was kostet es?**
Ruft `claude -p` 3–7 Mal auf. Das liegt im normalen Claude Code Nutzungsbereich.

**F: Sollte man die generierten Dateien in Git committen?**
Empfohlen. Ihr Team kann die gleichen Claude Code Standards teilen. Erwägen Sie, `claudeos-core/generated/` zu `.gitignore` hinzuzufügen (Analyse-JSON ist regenerierbar).

**F: Was ist mit Mixed-Stack-Projekten (z.B. Java-Backend + React-Frontend)?**
Vollständig unterstützt. ClaudeOS-Core erkennt automatisch beide Stacks, taggt Domänen als `backend` oder `frontend` und verwendet stackspezifische Analyse-Prompts für jeden. Pass 2 führt alles zusammen, und Pass 3 generiert Backend- und Frontend-Standards in einem einzigen Pass.

**F: Was passiert bei erneutem Ausführen?**
Wenn vorherige Pass 1/2-Ergebnisse existieren, können Sie über einen interaktiven Prompt wählen: **Continue** (dort fortfahren, wo es aufgehört hat) oder **Fresh** (alles löschen und neu starten). Verwenden Sie `--force`, um den Prompt zu überspringen und immer neu zu starten. Pass 3 wird immer erneut ausgeführt. Frühere Versionen können aus Master Plans wiederhergestellt werden.

**F: Funktioniert es mit Turborepo / pnpm Workspaces / Lerna Monorepos?**
Ja. ClaudeOS-Core erkennt `turbo.json`, `pnpm-workspace.yaml`, `lerna.json` oder `package.json#workspaces` und scannt automatisch die `package.json`-Dateien der Unterpakete nach Framework-/ORM-/DB-Abhängigkeiten. Domain-Scanning deckt `apps/*/src/`- und `packages/*/src/`-Muster ab. Führen Sie es vom Monorepo-Root aus.

**F: Bekommt NestJS ein eigenes Template oder nutzt es das Express-Template?**
NestJS verwendet ein dediziertes `node-nestjs`-Template mit NestJS-spezifischen Analysekategorien: `@Module`, `@Injectable`, `@Controller`-Dekoratoren, Guards, Pipes, Interceptors, DI-Container, CQRS-Patterns und `Test.createTestingModule`. Express-Projekte verwenden das separate `node-express`-Template.

**F: Was ist mit Vue / Nuxt-Projekten?**
Vue/Nuxt verwendet ein dediziertes `vue-nuxt`-Template, das Composition API, `<script setup>`, defineProps/defineEmits, Pinia Stores, `useFetch`/`useAsyncData`, Nitro Server Routes und `@nuxt/test-utils` abdeckt. Next.js/React-Projekte verwenden das `node-nextjs`-Template.

**F: Wird Kotlin unterstützt?**
Ja. ClaudeOS-Core erkennt Kotlin automatisch aus `build.gradle.kts` oder dem Kotlin-Plugin in `build.gradle`. Es verwendet ein dediziertes `kotlin-spring`-Template mit Kotlin-spezifischer Analyse (Data Classes, Sealed Classes, Coroutines, Extension Functions, MockK usw.).

**F: Was ist mit CQRS / BFF-Architektur?**
Vollständig unterstützt für Kotlin-Multi-Modul-Projekte. ClaudeOS-Core liest `settings.gradle.kts`, erkennt Modultypen (command, query, bff, integration) aus den Modulnamen und gruppiert dieselbe Domäne über Command/Query-Module. Die generierten Standards enthalten separate Regeln für Command-Controller vs. Query-Controller, BFF/Feign-Patterns und Inter-Modul-Kommunikationskonventionen.

**F: Was ist mit Gradle-Multi-Modul-Monorepos?**
ClaudeOS-Core scannt alle Submodule (`**/src/main/kotlin/**/*.kt`) unabhängig von der Verschachtelungstiefe. Modultypen werden aus Namenskonventionen abgeleitet (z.B. `reservation-command-server` → Domäne: `reservation`, Typ: `command`). Gemeinsame Bibliotheken (`shared-lib`, `integration-lib`) werden ebenfalls erkannt.

---

## Template-Struktur

```
pass-prompts/templates/
├── common/                  # Gemeinsamer Header/Footer
├── java-spring/             # Java / Spring Boot
├── kotlin-spring/           # Kotlin / Spring Boot (CQRS, BFF, multi-module)
├── node-express/            # Node.js / Express
├── node-nestjs/             # Node.js / NestJS (Module, DI, Guard, Pipe, Interceptor)
├── node-fastify/            # Node.js / Fastify
├── node-nextjs/             # Next.js / React
├── vue-nuxt/                # Vue / Nuxt (Composition API, Pinia, Nitro)
├── angular/                 # Angular
├── python-django/           # Python / Django (DRF)
└── python-fastapi/          # Python / FastAPI
```

`plan-installer` erkennt automatisch Ihren Stack / Ihre Stacks und stellt typspezifische Prompts zusammen. NestJS und Vue/Nuxt verwenden dedizierte Templates mit frameworkspezifischen Analysekategorien (z.B. `@Module`/`@Injectable`/Guards für NestJS, `<script setup>`/Pinia/useFetch für Vue). Für Multi-Stack-Projekte werden `pass1-backend-prompt.md` und `pass1-frontend-prompt.md` separat generiert, während `pass3-prompt.md` die Generierungsziele beider Stacks kombiniert.

---

## Monorepo-Unterstützung

ClaudeOS-Core erkennt automatisch JS/TS-Monorepo-Setups und scannt Unterpakete nach Abhängigkeiten.

**Unterstützte Monorepo-Marker** (automatisch erkannt):
- `turbo.json` (Turborepo)
- `pnpm-workspace.yaml` (pnpm Workspaces)
- `lerna.json` (Lerna)
- `package.json#workspaces` (npm/yarn Workspaces)

**Führen Sie ClaudeOS-Core vom Monorepo-Root aus** — ClaudeOS-Core liest `apps/*/package.json` und `packages/*/package.json`, um Framework-/ORM-/DB-Abhängigkeiten über Unterpakete hinweg zu erkennen:

```bash
cd my-monorepo
npx claudeos-core init
```

**Was erkannt wird:**
- Abhängigkeiten aus `apps/web/package.json` (z.B. `next`, `react`) → Frontend-Stack
- Abhängigkeiten aus `apps/api/package.json` (z.B. `express`, `prisma`) → Backend-Stack
- Abhängigkeiten aus `packages/db/package.json` (z.B. `drizzle-orm`) → ORM/DB
- Benutzerdefinierte Workspace-Pfade aus `pnpm-workspace.yaml` (z.B. `services/*`)

**Domain-Scanning deckt auch Monorepo-Layouts ab:**
- `apps/api/src/modules/*/` und `apps/api/src/*/` für Backend-Domains
- `apps/web/app/*/`, `apps/web/src/app/*/`, `apps/web/pages/*/` für Frontend-Domains
- `packages/*/src/*/` für gemeinsame Paket-Domains

```
my-monorepo/                    ← Hier ausführen: npx claudeos-core init
├── turbo.json                  ← Automatisch als Turborepo erkannt
├── apps/
│   ├── web/                    ← Next.js erkannt aus apps/web/package.json
│   │   ├── app/dashboard/      ← Frontend-Domain erkannt
│   │   └── package.json        ← { "dependencies": { "next": "^14" } }
│   └── api/                    ← Express erkannt aus apps/api/package.json
│       ├── src/modules/users/  ← Backend-Domain erkannt
│       └── package.json        ← { "dependencies": { "express": "^4" } }
├── packages/
│   ├── db/                     ← Drizzle erkannt aus packages/db/package.json
│   └── ui/
└── package.json                ← { "workspaces": ["apps/*", "packages/*"] }
```

> **Hinweis:** Für Kotlin/Java-Monorepos verwendet die Multi-Modul-Erkennung `settings.gradle.kts` (siehe [Kotlin Multi-Modul Domain-Erkennung](#kotlin-multi-modul-domain-erkennung) oben) und erfordert keine JS-Monorepo-Marker.

## Fehlerbehebung

**"claude: command not found"** — Claude Code CLI ist nicht installiert oder nicht im PATH. Siehe [Claude Code Dokumentation](https://code.claude.com/docs/en/overview).

**"npm install failed"** — Node.js-Version könnte zu niedrig sein. v18+ erforderlich.

**"0 domains detected"** — Ihre Projektstruktur könnte nicht standardmäßig sein. Siehe die Erkennungsmuster in der [koreanischen Dokumentation](./README.ko.md#트러블슈팅) für Ihren Stack.

**„0 Domains erkannt" bei Kotlin-Projekt** — Stellen Sie sicher, dass `build.gradle.kts` (oder `build.gradle` mit Kotlin-Plugin) im Projektstamm existiert und Quelldateien unter `**/src/main/kotlin/` liegen. Bei Multi-Modul-Projekten muss `settings.gradle.kts` `include()`-Anweisungen enthalten. Einzelmodul-Kotlin-Projekte (ohne `settings.gradle`) werden ebenfalls unterstützt — Domänen werden aus der Paket-/Klassenstruktur unter `src/main/kotlin/` extrahiert.

**„Sprache als java statt kotlin erkannt"** — ClaudeOS-Core prüft zuerst die Root-`build.gradle(.kts)`, dann Submodul-Build-Dateien. Stellen Sie sicher, dass mindestens eine `kotlin("jvm")` oder `org.jetbrains.kotlin` enthält.

**„CQRS nicht erkannt"** — Die Architekturerkennung basiert auf den Schlüsselwörtern `command` und `query` in Modulnamen. Wenn Ihre Module andere Bezeichnungen verwenden, können Sie die generierten Prompts nach dem plan-installer manuell anpassen.

---

## Mitwirken

Beiträge sind willkommen! Bereiche, in denen am meisten Hilfe benötigt wird:

- **Neue Stack-Templates** — Ruby/Rails, Go/Gin, PHP/Laravel, Rust/Axum
- **Tiefe Monorepo-Unterstützung** — Separate Unterprojekt-Roots, Workspace-Erkennung
- **Testabdeckung** — Wachsende Testsuite (derzeit 269 Tests für alle Scanner, Stack-Erkennung, Domain-Gruppierung, Plan-Parsing, Prompt-Generierung, CLI-Selektoren, Monorepo-Erkennung, Verifizierungstools und Vite SPA-Erkennung)

---

## Autor

Erstellt von **claudeos-core** — [GitHub](https://github.com/claudeos-core) · [Email](mailto:claudeoscore@gmail.com)

## Lizenz

ISC
