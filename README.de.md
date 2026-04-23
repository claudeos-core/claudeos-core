# ClaudeOS-Core

**Das einzige Tool, das zuerst Ihren Quellcode liest, Ihren Stack und Ihre Muster mit deterministischer Analyse bestätigt und dann Claude-Code-Regeln generiert, die exakt auf Ihr Projekt zugeschnitten sind.**

```bash
npx claudeos-core init
```

ClaudeOS-Core liest Ihre Codebasis, extrahiert jedes Muster, das es findet, und generiert einen vollständigen Satz von Standards, Rules, Skills und Guides, die auf _Ihr_ Projekt zugeschnitten sind. Wenn Sie danach Claude Code sagen „Erstelle ein CRUD für Bestellungen", erzeugt er Code, der exakt Ihren bestehenden Mustern entspricht.

[🇺🇸 English](./README.md) · [🇰🇷 한국어](./README.ko.md) · [🇨🇳 中文](./README.zh-CN.md) · [🇯🇵 日本語](./README.ja.md) · [🇪🇸 Español](./README.es.md) · [🇻🇳 Tiếng Việt](./README.vi.md) · [🇮🇳 हिन्दी](./README.hi.md) · [🇷🇺 Русский](./README.ru.md) · [🇫🇷 Français](./README.fr.md)

---

## Warum ClaudeOS-Core?

Jedes andere Claude-Code-Tool funktioniert so:

> **Mensch beschreibt das Projekt → LLM generiert Dokumentation**

ClaudeOS-Core funktioniert so:

> **Code analysiert Ihren Quellcode → Code erstellt einen maßgeschneiderten Prompt → LLM generiert Dokumentation → Code verifiziert den Output**

Das ist kein kleiner Unterschied. Hier ist, warum das wichtig ist:

### Das Kernproblem: LLMs raten. Code rät nicht.

Wenn Sie Claude bitten, „dieses Projekt zu analysieren", **rät** er Ihren Stack, Ihr ORM, Ihre Domain-Struktur.
Er sieht möglicherweise `spring-boot` in Ihrer `build.gradle`, übersieht aber, dass Sie MyBatis verwenden (nicht JPA).
Er erkennt vielleicht ein `user/`-Verzeichnis, bemerkt aber nicht, dass Ihr Projekt layer-first-Paketierung (Pattern A) verwendet, nicht domain-first (Pattern B).

**ClaudeOS-Core rät nicht.** Bevor Claude Ihr Projekt überhaupt sieht, hat Node.js-Code bereits:

- `build.gradle` / `package.json` / `pyproject.toml` geparst und Ihren Stack, ORM, DB und Paketmanager **bestätigt**
- Ihre Verzeichnisstruktur gescannt und Ihre Domain-Liste mit Dateianzahl **bestätigt**
- Ihre Projektstruktur in eines der 5 Java-Muster, Kotlin CQRS/BFF oder Next.js App Router/FSD klassifiziert
- Domains in optimal dimensionierte Gruppen aufgeteilt, die in Claudes Context-Fenster passen
- Einen stack-spezifischen Prompt mit allen bestätigten Fakten zusammengestellt

Wenn Claude den Prompt erhält, bleibt nichts mehr zu raten. Der Stack ist bestätigt. Die Domains sind bestätigt. Das Strukturmuster ist bestätigt. Claudes einzige Aufgabe besteht darin, Dokumentation zu generieren, die diesen **bestätigten Fakten** entspricht.

### Das Ergebnis

Andere Tools produzieren „allgemein gute" Dokumentation.
ClaudeOS-Core produziert Dokumentation, die weiß, dass Ihr Projekt `ApiResponse.ok()` verwendet (nicht `ResponseEntity.success()`), dass Ihre MyBatis-XML-Mapper in `src/main/resources/mybatis/mappers/` liegen und dass Ihre Paketstruktur `com.company.module.{domain}.controller` lautet — weil es Ihren tatsächlichen Code gelesen hat.

### Vorher & Nachher

**Ohne ClaudeOS-Core** — Sie bitten Claude Code, ein Order-CRUD zu erstellen:
```
❌ Verwendet JPA-Style-Repository (Ihr Projekt verwendet MyBatis)
❌ Erstellt ResponseEntity.success() (Ihr Wrapper ist ApiResponse.ok())
❌ Platziert Dateien in order/controller/ (Ihr Projekt nutzt controller/order/)
❌ Generiert englische Kommentare (Ihr Team schreibt deutsche Kommentare)
→ Sie verbringen 20 Minuten damit, jede generierte Datei zu korrigieren
```

**Mit ClaudeOS-Core** — `.claude/rules/` enthält bereits Ihre bestätigten Muster:
```
✅ Generiert MyBatis-Mapper + XML (aus build.gradle erkannt)
✅ Verwendet ApiResponse.ok() (aus Ihrem tatsächlichen Quellcode extrahiert)
✅ Platziert Dateien in controller/order/ (Pattern A durch Struktur-Scan bestätigt)
✅ Deutsche Kommentare (--lang de angewendet)
→ Der generierte Code entspricht sofort Ihren Projektkonventionen
```

Dieser Unterschied summiert sich. 10 Aufgaben/Tag × 20 Minuten gespart = **über 3 Stunden/Tag**.

---

## Qualitätssicherung nach der Generierung (v2.3.0)

Die Generierung ist nur die halbe Miete. Die andere Hälfte besteht darin, **zu wissen, dass die Ausgabe korrekt ist** — über 10 Ausgabesprachen, 11 Stack-Templates und Projekte jeder Größe hinweg. v2.3.0 fügt zwei deterministische Validatoren hinzu, die nach der Generierung laufen und nicht auf LLM-Selbstprüfungen angewiesen sind.

### `claude-md-validator` — strukturelle Invarianten

Jede generierte `CLAUDE.md` wird gegen 25 strukturelle Invarianten geprüft, die nur sprachinvariante Signale verwenden: Markdown-Syntax (`^## `, `^### `), literale Dateinamen (`decision-log.md`, `failure-patterns.md` — werden nie übersetzt), Anzahl der Abschnitte, Anzahl der Unterabschnitte pro Abschnitt und Anzahl der Tabellenzeilen. Derselbe Validator liefert Byte für Byte identische Urteile für eine `CLAUDE.md`, die in Englisch, Koreanisch, Japanisch, Vietnamesisch, Hindi, Russisch, Spanisch, Chinesisch, Französisch oder Deutsch generiert wurde.

Die sprachübergreifende Garantie wird durch Test-Fixtures in allen 10 Sprachen verifiziert, einschließlich Bad-Case-Fixtures in 6 dieser Sprachen, die identische Fehlersignaturen erzeugen. Wenn eine Invariante bei einem vietnamesischen Projekt fehlschlägt, ist die Lösung dieselbe wie bei einem deutschen Projekt.

### `content-validator [10/10]` — Prüfung von Pfadangaben und MANIFEST-Konsistenz

Liest jede in Backticks eingefasste Pfadreferenz (`src/...`, `.claude/rules/...`, `claudeos-core/skills/...`) aus allen generierten `.md`-Dateien und verifiziert sie gegen das tatsächliche Dateisystem. Fängt zwei Klassen von LLM-Fehlern ab, die bisher kein Tool erkannt hat:

- **`STALE_PATH`** — wenn Pass 3 oder Pass 4 einen plausiblen, aber nicht existierenden Pfad erfindet. Drei kanonische Klassen: (1) **Bezeichner-zu-Dateiname-Renormalisierung** — Ableiten eines Dateinamens aus einer TypeScript-Konstante in ALL_CAPS oder einer Java-Annotation, obwohl die tatsächliche Datei einer anderen Namenskonvention folgt; (2) **Framework-konventionelle Entry-Point-Erfindung** — Annahme einer Standard-Einstiegsdatei (Vites main-Modul, Next.js app-router providers usw.) in einem Projekt, das ein anderes Layout gewählt hat; (3) **Erfindung eines plausibel benannten Utility** — Zitieren eines konkreten Dateinamens für einen Helper, der „natürlich" unter einem sichtbaren Verzeichnis existieren würde.
- **`MANIFEST_DRIFT`** — wenn `claudeos-core/skills/00.shared/MANIFEST.md` einen Skill registriert, den `CLAUDE.md §6` nicht erwähnt (oder umgekehrt). Erkennt das häufige Orchestrator-plus-Sub-Skills-Layout, bei dem `CLAUDE.md §6` ein Einstiegspunkt und `MANIFEST.md` das vollständige Register ist — Sub-Skills werden als über ihren übergeordneten Orchestrator abgedeckt betrachtet.

Der Validator ist gepaart mit Prompt-Time-Prävention in `pass3-footer.md` und `pass4.md`: Anti-Pattern-Blöcke dokumentieren die spezifischen Halluzinationsklassen (Parent-Directory-Präfix, Vite/MSW/Vitest/Jest/RTL-Bibliothekskonventionen), und explizite positive Guidance weist an, Regeln nach Verzeichnis zu scopen, wenn ein konkreter Dateiname nicht in `pass3a-facts.md` steht.

### Validierung auf beliebigem Projekt ausführen

```bash
npx claudeos-core health     # alle Validatoren — einzelnes Go/No-Go-Urteil
npx claudeos-core lint       # nur strukturelle Invarianten von CLAUDE.md (beliebige Sprache)
```

---

## Unterstützte Stacks

| Stack | Erkennung | Analysetiefe |
|---|---|---|
| **Java / Spring Boot** | `build.gradle`, `pom.xml`, 5 Paketmuster | 10 Kategorien, 59 Unterpunkte |
| **Kotlin / Spring Boot** | `build.gradle.kts`, kotlin plugin, `settings.gradle.kts`, CQRS/BFF Auto-Erkennung | 12 Kategorien, 95 Unterpunkte |
| **Node.js / Express** | `package.json` | 9 Kategorien, 57 Unterpunkte |
| **Node.js / NestJS** | `package.json` (`@nestjs/core`) | 10 Kategorien, 68 Unterpunkte |
| **Next.js / React** | `package.json`, `next.config.*`, FSD-Unterstützung | 9 Kategorien, 55 Unterpunkte |
| **Vue / Nuxt** | `package.json`, `nuxt.config.*`, Composition API | 9 Kategorien, 58 Unterpunkte |
| **Python / Django** | `requirements.txt`, `pyproject.toml` | 10 Kategorien, 55 Unterpunkte |
| **Python / FastAPI** | `requirements.txt`, `pyproject.toml` | 10 Kategorien, 58 Unterpunkte |
| **Node.js / Fastify** | `package.json` | 10 Kategorien, 62 Unterpunkte |
| **Vite / React SPA** | `package.json`, `vite.config.*` | 9 Kategorien, 55 Unterpunkte |
| **Angular** | `package.json`, `angular.json` | 12 Kategorien, 78 Unterpunkte |

Automatisch erkannt: Sprache und Version, Framework und Version (einschließlich Vite als SPA-Framework), ORM (MyBatis, JPA, Exposed, Prisma, TypeORM, SQLAlchemy usw.), Datenbank (PostgreSQL, MySQL, Oracle, MongoDB, SQLite), Paketmanager (Gradle, Maven, npm, yarn, pnpm, pip, poetry), Architektur (CQRS, BFF — aus Modulnamen), Multi-Modul-Struktur (aus settings.gradle), Monorepo (Turborepo, pnpm-workspace, Lerna, npm/yarn workspaces), **Laufzeitkonfiguration aus `.env.example`** (v2.2.0 — extrahiert port/host/API-target aus über 16 Konventions-Variablennamen in den Frameworks Vite · Next.js · Nuxt · Angular · Node · Python).

**Sie geben nichts an. Alles wird automatisch erkannt.**

### `.env`-basierte Laufzeitkonfiguration (v2.2.0)

v2.2.0 fügt `lib/env-parser.js` hinzu, damit die generierte `CLAUDE.md` widerspiegelt, was das Projekt tatsächlich deklariert, statt Framework-Defaults.

- **Suchreihenfolge**: `.env.example` (kanonisch, committet) → `.env.local.example` → `.env.sample` → `.env.template` → `.env` → `.env.local` → `.env.development`. Die `.example`-Variante gewinnt, weil sie die entwickler-neutrale Shape-of-Truth ist, nicht die lokalen Overrides eines einzelnen Contributors.
- **Erkannte Port-Variablen-Konventionen**: `VITE_PORT` / `VITE_DEV_PORT` / `VITE_DESKTOP_PORT` / `NEXT_PUBLIC_PORT` / `NUXT_PORT` / `NG_PORT` / `APP_PORT` / `SERVER_PORT` / `HTTP_PORT` / `DEV_PORT` / `FLASK_RUN_PORT` / `UVICORN_PORT` / `DJANGO_PORT` / generisches `PORT`. Framework-spezifische Namen gewinnen gegenüber dem generischen `PORT`, wenn beide vorhanden sind.
- **Host & API-Target**: `VITE_DEV_HOST` / `VITE_API_TARGET` / `NEXT_PUBLIC_API_URL` / `NUXT_PUBLIC_API_BASE` / `BACKEND_URL` / `PROXY_TARGET` usw.
- **Priorität**: Spring Boots `application.yml` `server.port` gewinnt weiterhin (framework-native Config), dann der in `.env` deklarierte Port, dann der Framework-Default (Vite 5173, Next.js 3000, Django 8000 usw.) als letzte Rückfall-Option.
- **Redaction sensibler Variablen**: Werte von Variablen, die den Mustern `PASSWORD` / `SECRET` / `TOKEN` / `API_KEY` / `ACCESS_KEY` / `PRIVATE_KEY` / `CREDENTIAL` / `JWT_SECRET` / `CLIENT_SECRET` / `SESSION_SECRET` / `BEARER` / `SALT` entsprechen, werden durch `***REDACTED***` ersetzt, bevor sie einen nachgelagerten Generator erreichen. Defense-in-Depth gegen versehentlich committed Secrets in `.env.example`. `DATABASE_URL` ist explizit auf der Allowlist für die Stack-Detector-DB-Identifikations-Back-Compat.

### Java-Domain-Erkennung (5 Muster mit Fallback)

| Priorität | Muster | Struktur | Beispiel |
|---|---|---|---|
| A | Layer-first | `controller/{domain}/` | `controller/user/UserController.java` |
| B | Domain-first | `{domain}/controller/` | `user/controller/UserController.java` |
| D | Modul-Präfix | `{module}/{domain}/controller/` | `front/member/controller/MemberController.java` |
| E | DDD/Hexagonal | `{domain}/adapter/in/web/` | `user/adapter/in/web/UserController.java` |
| C | Flach | `controller/*.java` | `controller/UserController.java` → extrahiert `user` aus Klassenname |

Service-only-Domains (ohne Controller) werden ebenfalls über die Verzeichnisse `service/`, `dao/`, `aggregator/`, `facade/`, `usecase/`, `orchestrator/`, `mapper/`, `repository/` erkannt. Übersprungen: `common`, `config`, `util`, `core`, `front`, `admin`, `v1`, `v2` usw.

### Kotlin Multi-Modul Domain-Erkennung

Für Kotlin-Projekte mit Gradle-Multi-Modul-Struktur (z. B. CQRS-Monorepo):

| Schritt | Aktion | Beispiel |
|---|---|---|
| 1 | Scan von `settings.gradle.kts` nach `include()` | Findet 14 Module |
| 2 | Modultyp aus dem Namen ableiten | `reservation-command-server` → Typ: `command` |
| 3 | Domain aus dem Modulnamen extrahieren | `reservation-command-server` → Domain: `reservation` |
| 4 | Gleiche Domain über Module gruppieren | `reservation-command-server` + `common-query-server` → 1 Domain |
| 5 | Architektur erkennen | Besitzt `command`- + `query`-Module → CQRS |

Unterstützte Modultypen: `command`, `query`, `bff`, `integration`, `standalone`, `library`. Geteilte Bibliotheken (`shared-lib`, `integration-lib`) werden als spezielle Domains erkannt.

### Frontend-Domain-Erkennung

- **App Router**: `app/{domain}/page.tsx` (Next.js)
- **Pages Router**: `pages/{domain}/index.tsx`
- **FSD (Feature-Sliced Design)**: `features/*/`, `widgets/*/`, `entities/*/`
- **RSC/Client-Split**: Erkennt das `client.tsx`-Muster, verfolgt die Trennung von Server-/Client-Komponenten
- **Nicht-standardisierte verschachtelte Pfade**: Erkennt Pages, Components und FSD-Layer unter `src/*/`-Pfaden (z. B. `src/admin/pages/dashboard/`, `src/admin/components/form/`, `src/admin/features/billing/`)
- **Plattform-/Tier-Split-Erkennung (v2.0.0)**: Erkennt `src/{platform}/{subapp}/`-Layouts — `{platform}` kann ein Device-/Target-Keyword sein (`desktop`, `pc`, `web`, `mobile`, `mc`, `mo`, `sp`, `tablet`, `tab`, `pwa`, `tv`, `ctv`, `ott`, `watch`, `wear`) oder ein Zugriffsebenen-Keyword (`admin`, `cms`, `backoffice`, `back-office`, `portal`). Liefert pro `(platform, subapp)`-Paar eine Domain mit dem Namen `{platform}-{subapp}` und pro Domain Zählungen für Routes/Components/Layouts/Hooks. Läuft parallel für Angular, Next.js, React und Vue (Multi-Extension-Glob `{tsx,jsx,ts,js,vue}`). Erfordert ≥2 Quelldateien pro Subapp, um rauschende 1-Datei-Domains zu vermeiden.
- **Monorepo-Plattform-Split (v2.0.0)**: Der Plattform-Scan matched zusätzlich `{apps,packages}/*/src/{platform}/{subapp}/` (Turborepo/pnpm-Workspace mit `src/`) und `{apps,packages}/{platform}/{subapp}/` (Workspaces ohne `src/`-Wrapper).
- **Fallback E — routes-Datei (v2.0.0)**: Wenn primäre Scanner + Fallbacks A–D alle 0 zurückgeben, wird `**/routes/*.{tsx,jsx,ts,js,vue}` geglobbt und nach dem Parent-of-`routes`-Verzeichnisnamen gruppiert. Erfasst React-Router-File-Routing-Projekte (CRA/Vite + `react-router`), die weder Next.js-`page.tsx` noch FSD-Layouts entsprechen. Generische Parent-Namen (`src`, `app`, `pages`) werden herausgefiltert.
- **Config-Fallback**: Erkennt Next.js/Vite/Nuxt aus Config-Dateien, wenn nicht in `package.json` (Monorepo-Unterstützung)
- **Deep-Directory-Fallback**: Für React-/CRA-/Vite-/Vue-/RN-Projekte scannt `**/components/*/`, `**/views/*/`, `**/screens/*/`, `**/containers/*/`, `**/pages/*/`, `**/routes/*/`, `**/modules/*/`, `**/domains/*/` in beliebiger Tiefe
- **Geteilte Ignore-Listen (v2.0.0)**: Alle Scanner teilen sich `BUILD_IGNORE_DIRS` (`node_modules`, `build`, `dist`, `out`, `.next`, `.nuxt`, `.svelte-kit`, `.angular`, `.turbo`, `.cache`, `.parcel-cache`, `coverage`, `storybook-static`, `.vercel`, `.netlify`) und `TEST_FILE_IGNORE` (spec/test/stories/e2e/cy + `__snapshots__`/`__tests__`), damit Build-Outputs und Test-Fixtures die Datei-Zähler pro Domain nicht aufblähen.

### Scanner-Overrides (v2.0.0)

Legen Sie optional eine `.claudeos-scan.json` im Projekt-Root ab, um Scanner-Defaults zu erweitern, ohne das Toolkit zu editieren. Alle Felder sind **additiv** — User-Einträge erweitern die Defaults, ersetzen sie niemals:

```json
{
  "frontendScan": {
    "platformKeywords": ["kiosk"],
    "skipSubappNames": ["legacy"],
    "minSubappFiles": 3
  }
}
```

| Feld | Default | Zweck |
|---|---|---|
| `platformKeywords` | eingebaute Liste oben | Zusätzliche `{platform}`-Keywords für den Platform-Scan (z. B. `kiosk`, `vr`, `embedded`) |
| `skipSubappNames` | nur strukturelle Dirs | Zusätzliche Subapp-Namen, die von der Platform-Scan-Domain-Emission ausgeschlossen werden |
| `minSubappFiles` | `2` | Überschreibt die Mindestdateianzahl, bevor eine Subapp zur Domain wird |

Fehlende Datei oder fehlerhaftes JSON → fällt stillschweigend auf Defaults zurück (kein Crash). Typischer Einsatz: Opt-in für eine kurze Abkürzung (`adm`, `bo`), die die eingebaute Liste als zu mehrdeutig ausschließt, oder Erhöhung von `minSubappFiles` für rauschende Monorepos.

---

## Schnellstart

### Voraussetzungen

- **Node.js** v18+
- **Claude Code CLI** (installiert & authentifiziert)

### Installation

```bash
cd /your/project/root

# Option A: npx (empfohlen — keine Installation nötig)
npx claudeos-core init

# Option B: globale Installation
npm install -g claudeos-core
claudeos-core init

# Option C: Projekt-devDependency
npm install --save-dev claudeos-core
npx claudeos-core init

# Option D: git clone (für Entwicklung/Beiträge)
git clone https://github.com/claudeos-core/claudeos-core.git claudeos-core-tools

# Cross-Platform (PowerShell, CMD, Bash, Zsh — beliebiges Terminal)
node claudeos-core-tools/bin/cli.js init

# Linux/macOS (nur Bash)
bash claudeos-core-tools/bootstrap.sh
```

### Ausgabesprache (10 Sprachen)

Wenn Sie `init` ohne `--lang` ausführen, erscheint ein interaktiver Selector — verwenden Sie Pfeiltasten oder Zahlentasten zur Auswahl:

```
╔══════════════════════════════════════════════════╗
║  Sprache der generierten Dokumente wählen        ║
╚══════════════════════════════════════════════════╝

  Generierte Dateien (CLAUDE.md, Standards, Rules,
  Skills, Guides) werden auf Deutsch geschrieben.

     1. en     — English
     2. ko     — 한국어 (Korean)
     3. zh-CN  — 简体中文 (Chinese Simplified)
     4. ja     — 日本語 (Japanese)
     5. es     — Español (Spanish)
     6. vi     — Tiếng Việt (Vietnamese)
     7. hi     — हिन्दी (Hindi)
     8. ru     — Русский (Russian)
     9. fr     — Français (French)
  ❯ 10. de     — Deutsch (German)

  ↑↓ Bewegen  1-0 Springen  Enter Auswählen  ESC Abbrechen
```

Die Beschreibung ändert sich je nach Navigation zur ausgewählten Sprache. Um den Selector zu überspringen, übergeben Sie `--lang` direkt:

```bash
npx claudeos-core init --lang ko    # Koreanisch
npx claudeos-core init --lang ja    # Japanisch
npx claudeos-core init --lang en    # Englisch (Default)
```

> **Hinweis:** Dies setzt die Sprache nur für die generierten Dokumentationsdateien. Die Code-Analyse (Pass 1–2) läuft immer auf Englisch; der generierte Output (Pass 3) wird in Ihrer gewählten Sprache geschrieben. Code-Beispiele in den generierten Dateien behalten ihre ursprüngliche Programmiersprachen-Syntax.

Das war's. Nach 10 Minuten (kleines Projekt) bis 2 Stunden (60+-Domain-Monorepo) ist die gesamte Dokumentation generiert und einsatzbereit. Die CLI zeigt einen Fortschrittsbalken mit Prozentwert, verstrichener Zeit und ETA für jeden Pass. Siehe [Auto-Scaling nach Projektgröße](#auto-scaling-nach-projektgröße) für detaillierte Zeiten je nach Projektgröße.

### Manuelle Schritt-für-Schritt-Installation

Wenn Sie volle Kontrolle über jede Phase wünschen — oder wenn die automatisierte Pipeline an einem Schritt scheitert — können Sie jede Phase manuell ausführen. Dies ist auch nützlich, um zu verstehen, wie ClaudeOS-Core intern funktioniert.

#### Schritt 1: Klonen und Abhängigkeiten installieren

```bash
cd /your/project/root

git clone https://github.com/claudeos-core/claudeos-core.git claudeos-core-tools
cd claudeos-core-tools && npm install && cd ..
```

#### Schritt 2: Verzeichnisstruktur erstellen

```bash
# Rules (v2.0.0: 60.memory hinzugefügt)
mkdir -p .claude/rules/{00.core,10.backend,20.frontend,30.security-db,40.infra,50.sync,60.memory}

# Standards
mkdir -p claudeos-core/standard/{00.core,10.backend-api,20.frontend-ui,30.security-db,40.infra,50.verification,90.optional}

# Skills
mkdir -p claudeos-core/skills/{00.shared,10.backend-crud/scaffold-crud-feature,20.frontend-page/scaffold-page-feature,50.testing,90.experimental}

# Guide, Database, MCP, Generated, Memory (v2.0.0: memory hinzugefügt; v2.1.0: plan entfernt)
mkdir -p claudeos-core/guide/{01.onboarding,02.usage,03.troubleshooting,04.architecture}
mkdir -p claudeos-core/{database,mcp-guide,generated,memory}
```

> **Hinweis zu v2.1.0:** Das Verzeichnis `claudeos-core/plan/` wird nicht mehr angelegt. Die Master-Plan-Generierung wurde entfernt, weil Master Plans ein internes Backup waren, das Claude Code zur Laufzeit nie liest, und ihre Aggregation `Prompt is too long`-Fehler auslöste. Verwenden Sie `git` für Backup/Restore.

#### Schritt 3: plan-installer ausführen (Projektanalyse)

Dies scannt Ihr Projekt, erkennt den Stack, findet Domains, teilt sie in Gruppen auf und generiert Prompts.

```bash
node claudeos-core-tools/plan-installer/index.js
```

**Output (in `claudeos-core/generated/`):**
- `project-analysis.json` — erkannter Stack, Domains, Frontend-Infos
- `domain-groups.json` — Domain-Gruppen für Pass 1
- `pass1-backend-prompt.md` / `pass1-frontend-prompt.md` — Analyse-Prompts
- `pass2-prompt.md` — Merge-Prompt
- `pass3-prompt.md` — Pass-3-Prompt-Template mit vorangestelltem Phase-1-Block „Read Once, Extract Facts" (Rules A–E). Die automatisierte Pipeline teilt Pass 3 zur Laufzeit in mehrere Stages auf; dieses Template wird jeder Stage zugeführt.
- `pass3-context.json` — schlanke Projekt-Zusammenfassung (< 5 KB, nach Pass 2 erstellt), die Pass-3-Prompts gegenüber der vollen `pass2-merged.json` bevorzugen (v2.1.0)
- `pass4-prompt.md` — L4-Memory-Scaffolding-Prompt (v2.0.0; verwendet dasselbe `staging-override.md` für `60.memory/`-Rule-Schreibvorgänge)

Sie können diese Dateien inspizieren, um die Erkennungsgenauigkeit zu überprüfen, bevor Sie fortfahren.

#### Schritt 4: Pass 1 — Tiefe Code-Analyse (pro Domain-Gruppe)

Führen Sie Pass 1 für jede Domain-Gruppe aus. Prüfen Sie `domain-groups.json` für die Anzahl der Gruppen.

```bash
# Anzahl der Gruppen prüfen
cat claudeos-core/generated/domain-groups.json | node -e "
  const g = JSON.parse(require('fs').readFileSync('/dev/stdin','utf-8'));
  g.groups.forEach((g,i) => console.log('Group '+(i+1)+': ['+g.domains.join(', ')+'] ('+g.type+', ~'+g.estimatedFiles+' files)'));
"

# Pass 1 für jede Gruppe ausführen (Domains und Gruppennummer ersetzen)
# Hinweis: v1.6.1+ verwendet Node.js String.replace() statt perl — perl
# wird nicht mehr benötigt, und die Replacement-Function-Semantik verhindert
# Regex-Injection durch $/&/$1-Zeichen, die in Domain-Namen auftauchen können.
#
# Für Gruppe 1:
DOMAIN_LIST="user, order, product" PASS_NUM=1 node -e "
  const fs = require('fs');
  const tpl = fs.readFileSync('claudeos-core/generated/pass1-backend-prompt.md','utf-8');
  const out = tpl
    .replace(/\{\{DOMAIN_GROUP\}\}/g, () => process.env.DOMAIN_LIST)
    .replace(/\{\{PASS_NUM\}\}/g, () => process.env.PASS_NUM);
  process.stdout.write(out);
" | claude -p --dangerously-skip-permissions

# Für Gruppe 2 (falls vorhanden):
DOMAIN_LIST="payment, system, delivery" PASS_NUM=2 node -e "
  const fs = require('fs');
  const tpl = fs.readFileSync('claudeos-core/generated/pass1-backend-prompt.md','utf-8');
  const out = tpl
    .replace(/\{\{DOMAIN_GROUP\}\}/g, () => process.env.DOMAIN_LIST)
    .replace(/\{\{PASS_NUM\}\}/g, () => process.env.PASS_NUM);
  process.stdout.write(out);
" | claude -p --dangerously-skip-permissions

# Für Frontend-Gruppen pass1-backend-prompt.md → pass1-frontend-prompt.md tauschen
```

**Verifikation:** `ls claudeos-core/generated/pass1-*.json` sollte eine JSON-Datei pro Gruppe zeigen.

#### Schritt 5: Pass 2 — Analyseergebnisse zusammenführen

```bash
cat claudeos-core/generated/pass2-prompt.md \
  | claude -p --dangerously-skip-permissions
```

**Verifikation:** `claudeos-core/generated/pass2-merged.json` sollte existieren und 9+ Top-Level-Keys enthalten.

#### Schritt 6: Pass 3 — Gesamte Dokumentation generieren (aufgeteilt in mehrere Stages)

**Hinweis zu v2.1.0:** Pass 3 wird von der automatisierten Pipeline **immer im Split-Mode** ausgeführt. Jede Stage ist ein separater `claude -p`-Aufruf mit frischem Context-Fenster, sodass Output-Akkumulations-Overflows unabhängig von der Projektgröße strukturell unmöglich sind. Das `pass3-prompt.md`-Template wird pro Stage mit einer `STAGE:`-Direktive assembliert, die Claude anweist, welche Teilmenge der Dateien zu emittieren ist. Für den manuellen Modus ist der einfachste Weg immer noch, das volle Template zuzuführen und Claude alles in einem Aufruf generieren zu lassen — aber das ist nur für kleine Projekte (≤5 Domains) zuverlässig. Für größere Projekte verwenden Sie `npx claudeos-core init`, damit der Split-Runner die Stage-Orchestrierung übernimmt.

**Single-Call-Modus (nur kleine Projekte, ≤5 Domains):**

```bash
cat claudeos-core/generated/pass3-prompt.md \
  | claude -p --dangerously-skip-permissions
```

**Stage-für-Stage-Modus (empfohlen für alle Projektgrößen):**

Die automatisierte Pipeline führt diese Stages aus. Die Stage-Liste lautet:

| Stage | Schreibt | Anmerkungen |
|---|---|---|
| `3a` | `pass3a-facts.md` (5–10 KB destillierte Fact Sheet) | Liest `pass2-merged.json` einmal; spätere Stages referenzieren diese Datei |
| `3b-core` | `CLAUDE.md`, gemeinsame `standard/`, gemeinsame `.claude/rules/` | Projektübergreifende Dateien; kein domain-spezifischer Output |
| `3b-1..N` | Domain-spezifische `standard/60.domains/*.md` + Domain-Rules | Batch von ≤15 Domains pro Stage (automatisch geteilt ab 16 Domains) |
| `3c-core` | `guide/` (9 Dateien), `skills/00.shared/MANIFEST.md`, `skills/*/`-Orchestratoren | Geteilte Skills und alle nutzerorientierten Guides |
| `3c-1..N` | Domain-Sub-Skills unter `skills/20.frontend-page/scaffold-page-feature/` | Batch von ≤15 Domains pro Stage |
| `3d-aux` | `database/`, `mcp-guide/` | Fixe Größe, unabhängig von der Domain-Anzahl |

Für ein 1–15-Domain-Projekt expandiert das zu 4 Stages (`3a`, `3b-core`, `3c-core`, `3d-aux` — keine Batch-Unterteilung). Für 16–30 Domains sind es 8 Stages (`3b` und `3c` jeweils in 2 Batches unterteilt). Siehe [Auto-Scaling nach Projektgröße](#auto-scaling-nach-projektgröße) für die vollständige Tabelle.

**Verifikation:** `CLAUDE.md` sollte im Projekt-Root existieren, und der Marker `claudeos-core/generated/pass3-complete.json` sollte geschrieben sein. Im Split-Mode enthält der Marker `mode: "split"` und ein `groupsCompleted`-Array, das jede abgeschlossene Stage auflistet — die Partial-Marker-Logik verwendet das, um nach einem Crash von der richtigen Stage aus fortzusetzen, anstatt von `3a` neu zu starten (was die Token-Kosten verdoppeln würde).

> **Staging-Hinweis:** Pass 3 schreibt Rule-Dateien zuerst in `claudeos-core/generated/.staged-rules/`, weil die Sensitive-Path-Policy von Claude Code direkte Schreibzugriffe auf `.claude/` blockiert. Die automatisierte Pipeline übernimmt das Verschieben nach jeder Stage automatisch. Wenn Sie eine Stage manuell ausführen, müssen Sie den Staging-Baum selbst verschieben: `mv claudeos-core/generated/.staged-rules/* .claude/rules/` (Unterpfade erhalten).

#### Schritt 7: Pass 4 — Memory-Scaffolding

```bash
cat claudeos-core/generated/pass4-prompt.md \
  | claude -p --dangerously-skip-permissions
```

**Verifikation:** `claudeos-core/memory/` sollte 4 Dateien enthalten (`decision-log.md`, `failure-patterns.md`, `compaction.md`, `auto-rule-update.md`), `.claude/rules/60.memory/` sollte 4 Rule-Dateien enthalten, und `CLAUDE.md` sollte einen angehängten Abschnitt `## Memory (L4)` haben. Marker: `claudeos-core/generated/pass4-memory.json`.

> **v2.1.0 Gap-Fill:** Pass 4 stellt zudem sicher, dass `claudeos-core/skills/00.shared/MANIFEST.md` existiert. Wenn Pass 3c die Datei ausgelassen hat (möglich bei skill-spärlichen Projekten, weil die Stack-`pass3.md`-Templates `MANIFEST.md` unter den Generierungszielen listen, aber nicht als REQUIRED markieren), erzeugt das Gap-Fill einen minimalen Stub, damit `.claude/rules/50.sync/02.skills-sync.md` (v2.2.0-Pfad — die Anzahl der Sync-Regeln wurde von 3 auf 2 reduziert, was `03` war, ist jetzt `02`) stets ein gültiges Referenzziel hat. Idempotent: wird übersprungen, wenn die Datei bereits echten Inhalt hat (>20 Zeichen).

> **Hinweis:** Wenn `claude -p` fehlschlägt oder `pass4-prompt.md` fehlt, fällt die automatisierte Pipeline auf ein statisches Scaffold über `lib/memory-scaffold.js` zurück (mit Claude-getriebener Übersetzung, wenn `--lang` nicht-englisch ist). Der statische Fallback läuft nur innerhalb von `npx claudeos-core init` — der manuelle Modus erfordert, dass Pass 4 erfolgreich ist.

#### Schritt 8: Verifikations-Tools ausführen

```bash
# Metadaten generieren (vor anderen Checks erforderlich)
node claudeos-core-tools/manifest-generator/index.js

# Alle Checks ausführen
node claudeos-core-tools/health-checker/index.js

# Oder einzelne Checks ausführen:
node claudeos-core-tools/plan-validator/index.js --check # Plan ↔ Disk-Konsistenz
node claudeos-core-tools/sync-checker/index.js          # Nicht registrierte/verwaiste Dateien
node claudeos-core-tools/content-validator/index.js     # Dateiqualitäts-Checks (inkl. memory/-Sektion [9/9])
node claudeos-core-tools/pass-json-validator/index.js   # Pass-1–4-JSON + Completion-Marker-Checks
```

#### Schritt 9: Ergebnisse überprüfen

```bash
# Generierte Dateien zählen
find .claude claudeos-core -type f | grep -v node_modules | grep -v '/generated/' | wc -l

# CLAUDE.md prüfen
head -30 CLAUDE.md

# Eine Standard-Datei prüfen
cat claudeos-core/standard/00.core/01.project-overview.md | head -20

# Rules prüfen
ls .claude/rules/*/
```

> **Tipp:** Wenn ein Schritt fehlschlägt, können Sie das Problem beheben und nur diesen Schritt erneut ausführen. Pass-1/2-Ergebnisse sind gecacht — wenn `pass1-N.json` oder `pass2-merged.json` bereits existiert, überspringt die automatisierte Pipeline diese. Verwenden Sie `npx claudeos-core init --force`, um vorherige Ergebnisse zu löschen und neu zu beginnen.

### Nutzung beginnen

```
# In Claude Code — einfach natürlich fragen:
"Erstelle ein CRUD für die order-Domain"
"Füge eine User-Authentifizierungs-API hinzu"
"Refactore diesen Code, um den Projektmustern zu entsprechen"

# Claude Code referenziert automatisch Ihre generierten Standards, Rules und Skills.
```

---

## Wie es funktioniert — 4-Pass-Pipeline

```
npx claudeos-core init
    │
    ├── [1] npm install                        ← Abhängigkeiten (~10s)
    ├── [2] Verzeichnisstruktur                ← Ordner erstellen (~1s)
    ├── [3] plan-installer (Node.js)           ← Projekt-Scan (~5s)
    │       ├── Auto-Erkennung des Stacks (multi-stack-fähig)
    │       ├── Domain-Liste extrahieren (getaggt: backend/frontend)
    │       ├── In Domain-Gruppen aufteilen (pro Typ)
    │       ├── pass3-context.json erstellen (schlanke Zusammenfassung, v2.1.0)
    │       └── Stack-spezifische Prompts wählen (pro Typ)
    │
    ├── [4] Pass 1 × N  (claude -p)            ← Tiefe Code-Analyse (~2-8min)
    │       ├── ⚙️ Backend-Gruppen → backend-spezifischer Prompt
    │       └── 🎨 Frontend-Gruppen → frontend-spezifischer Prompt
    │
    ├── [5] Pass 2 × 1  (claude -p)            ← Analyse-Merge (~1min)
    │       └── Konsolidiert ALLE Pass-1-Ergebnisse zu pass2-merged.json
    │
    ├── [6] Pass 3 (Split-Mode, v2.1.0)        ← Alles generieren
    │       │
    │       ├── 3a     × 1  (claude -p)        ← Fakten-Extraktion (~5-10min)
    │       │       └── pass2-merged.json einmal lesen → pass3a-facts.md
    │       │
    │       ├── 3b-core × 1  (claude -p)       ← CLAUDE.md + gemeinsame standard/rules
    │       ├── 3b-1..N × N  (claude -p)       ← Domain-Standards/-Rules (≤15 Domains/Batch)
    │       │
    │       ├── 3c-core × 1  (claude -p)       ← Guides + geteilte Skills + MANIFEST.md
    │       ├── 3c-1..N × N  (claude -p)       ← Domain-Sub-Skills (≤15 Domains/Batch)
    │       │
    │       └── 3d-aux  × 1  (claude -p)       ← database/ + mcp-guide/-Stubs
    │
    ├── [7] Pass 4 × 1  (claude -p)            ← Memory-Scaffolding (~30s-5min)
    │       ├── Seeding von memory/ (decision-log, failure-patterns, …)
    │       ├── 60.memory/-Regeln generieren
    │       ├── "Memory (L4)"-Sektion an CLAUDE.md anhängen
    │       └── Gap-Fill: skills/00.shared/MANIFEST.md sicherstellen (v2.1.0)
    │
    └── [8] Verifikation                       ← Health-Checker läuft automatisch
```

### Warum 4 Passes?

**Pass 1** ist der einzige Pass, der Ihren Quellcode liest. Er wählt repräsentative Dateien pro Domain und extrahiert Muster über 55–95 Analyse-Kategorien (pro Stack). Bei großen Projekten läuft Pass 1 mehrfach — einmal pro Domain-Gruppe. In Multi-Stack-Projekten (z. B. Java-Backend + React-Frontend) verwenden Backend- und Frontend-Domains **unterschiedliche Analyse-Prompts**, die auf jeden Stack zugeschnitten sind.

**Pass 2** führt alle Pass-1-Ergebnisse zu einer einheitlichen Analyse zusammen: gemeinsame Muster (100 % geteilt), Mehrheitsmuster (50 %+ geteilt), domain-spezifische Muster, Anti-Patterns nach Schweregrad und Cross-Cutting-Concerns (Naming, Security, DB, Testing, Logging, Performance). Backend- und Frontend-Ergebnisse werden zusammengeführt.

**Pass 3** (Split-Mode, v2.1.0) nimmt die zusammengeführte Analyse und generiert das gesamte Datei-Ökosystem (CLAUDE.md, Rules, Standards, Skills, Guides) über mehrere sequenzielle `claude -p`-Aufrufe. Die zentrale Einsicht: Output-Akkumulations-Overflow ist nicht aus der Input-Größe vorhersagbar — Single-Call-Pass-3 funktionierte auf 2-Domain-Projekten einwandfrei und scheiterte bei ca. 5 Domains zuverlässig, wobei die Fehler-Grenze davon abhing, wie ausführlich jede Datei ausfiel. Split-Mode umgeht das strukturell — jede Stage startet mit einem frischen Context-Fenster und schreibt eine beschränkte Teilmenge von Dateien. Datei-übergreifende Konsistenz (der Hauptvorteil des Single-Call-Ansatzes) bleibt durch `pass3a-facts.md` erhalten, eine 5–10 KB große destillierte Fact Sheet, die jede spätere Stage referenziert.

Das Pass-3-Prompt-Template enthält zudem einen **Phase-1-Block „Read Once, Extract Facts"** mit fünf Regeln, die den Output weiter begrenzen:

- **Rule A** — Referenziere die Fact-Tabelle; lies `pass2-merged.json` nicht erneut.
- **Rule B** — Idempotentes Datei-Schreiben (überspringe, wenn das Ziel mit echtem Inhalt existiert), macht Pass 3 nach Unterbrechungen sicher wiederausführbar.
- **Rule C** — Datei-übergreifende Konsistenz über die Fact-Tabelle als Single Source of Truth erzwungen.
- **Rule D** — Output-Knappheit: eine Zeile (`[WRITE]`/`[SKIP]`) zwischen Datei-Schreibvorgängen, keine Wiederholung der Fact-Tabelle, kein Echoing des Datei-Inhalts.
- **Rule E** — Batch-Idempotenz-Prüfung: ein `Glob` zu PHASE-2-Beginn statt Per-Target-`Read`-Aufrufe.

In **v2.2.0** bettet Pass 3 zusätzlich ein deterministisches CLAUDE.md-Scaffold (`pass-prompts/templates/common/claude-md-scaffold.md`) inline in den Prompt ein. Dies fixiert die Titel und die Reihenfolge der 8 obersten Abschnitte, sodass die generierte `CLAUDE.md` nicht mehr zwischen Projekten drifted, während der Inhalt jedes Abschnitts sich weiterhin an jedes Projekt anpasst. Der neue `.env`-Parser des Stack-Detectors (`lib/env-parser.js`) liefert `stack.envInfo` an den Prompt, sodass Port/Host/API-Target-Zeilen mit dem übereinstimmen, was das Projekt tatsächlich deklariert, statt mit Framework-Defaults.

**Pass 4** baut die L4-Memory-Schicht auf: persistente Team-Wissensdateien (decision-log, failure-patterns, Compaction-Policy, auto-rule-update) plus die `60.memory/`-Regeln, die zukünftigen Sessions mitteilen, wann und wie diese Dateien gelesen/geschrieben werden sollen. Die Memory-Schicht ist das, was Claude Code erlaubt, Lehren über Sessions hinweg anzusammeln, anstatt sie jedes Mal neu zu entdecken. Wenn `--lang` nicht-englisch ist, wird der statische Fallback-Inhalt über Claude übersetzt, bevor er geschrieben wird. v2.1.0 fügt ein Gap-Fill für `skills/00.shared/MANIFEST.md` hinzu, falls Pass 3c es ausgelassen hat.

---

## Struktur der generierten Dateien

```
your-project/
│
├── CLAUDE.md                          ← Claude-Code-Einstiegspunkt (deterministische 8-Abschnitt-Struktur, v2.2.0)
│
├── .claude/
│   └── rules/                         ← Glob-getriggerte Regeln
│       ├── 00.core/
│       ├── 10.backend/
│       ├── 20.frontend/
│       ├── 30.security-db/
│       ├── 40.infra/
│       ├── 50.sync/                   ← Sync-Erinnerungs-Regeln
│       └── 60.memory/                 ← L4-Memory-On-Demand-Scope-Regeln (v2.0.0)
│
├── claudeos-core/                     ← Hauptausgabeverzeichnis
│   ├── generated/                     ← Analyse-JSON + dynamische Prompts + Pass-Marker (gitignore)
│   │   ├── project-analysis.json      ← Stack-Infos (multi-stack-fähig)
│   │   ├── domain-groups.json         ← Gruppen mit type: backend/frontend
│   │   ├── pass1-backend-prompt.md    ← Backend-Analyse-Prompt
│   │   ├── pass1-frontend-prompt.md   ← Frontend-Analyse-Prompt (falls erkannt)
│   │   ├── pass2-prompt.md            ← Merge-Prompt
│   │   ├── pass2-merged.json          ← Pass-2-Output (nur von Pass 3a konsumiert)
│   │   ├── pass3-context.json         ← Schlanke Zusammenfassung (< 5 KB) für Pass 3 (v2.1.0)
│   │   ├── pass3-prompt.md            ← Pass-3-Prompt-Template (Phase-1-Block vorangestellt)
│   │   ├── pass3a-facts.md            ← Fact Sheet von Pass 3a geschrieben, von 3b/3c/3d gelesen (v2.1.0)
│   │   ├── pass4-prompt.md            ← Memory-Scaffolding-Prompt (v2.0.0)
│   │   ├── pass3-complete.json        ← Pass-3-Completion-Marker (Split-Mode: enthält groupsCompleted, v2.1.0)
│   │   ├── pass4-memory.json          ← Pass-4-Completion-Marker (beim Resume überspringen)
│   │   ├── rule-manifest.json         ← Datei-Index für Verifikations-Tools
│   │   ├── sync-map.json              ← Plan ↔ Disk-Mapping (in v2.1.0 leer; aus Kompatibilitätsgründen für sync-checker erhalten)
│   │   ├── stale-report.json          ← Konsolidierte Verifikations-Ergebnisse
│   │   ├── .i18n-cache-<lang>.json    ← Übersetzungs-Cache (nicht-englisches `--lang`)
│   │   └── .staged-rules/             ← Transientes Staging-Verzeichnis für `.claude/rules/`-Schreibvorgänge (auto-verschoben + bereinigt)
│   ├── standard/                      ← Coding-Standards (15–19 Dateien + pro Domain unter 60.domains/)
│   │   ├── 00.core/                   ← Overview, Architektur, Naming
│   │   ├── 10.backend-api/            ← API-Muster (stack-spezifisch)
│   │   ├── 20.frontend-ui/            ← Frontend-Muster (falls erkannt)
│   │   ├── 30.security-db/            ← Security, DB-Schema, Utilities
│   │   ├── 40.infra/                  ← Config, Logging, CI/CD
│   │   ├── 50.verification/           ← Build-Verifikation, Testing
│   │   ├── 60.domains/                ← Pro-Domain-Standards (von Pass 3b-N geschrieben, v2.1.0)
│   │   └── 90.optional/               ← Optionale Konventionen (stack-spezifische Extras)
│   ├── skills/                        ← CRUD-/Page-Scaffolding-Skills
│   │   └── 00.shared/MANIFEST.md      ← Single Source of Truth für registrierte Skills
│   ├── guide/                         ← Onboarding, FAQ, Troubleshooting (9 Dateien)
│   ├── database/                      ← DB-Schema, Migration-Guide
│   ├── mcp-guide/                     ← MCP-Server-Integrations-Guide
│   └── memory/                        ← L4: Team-Wissen (4 Dateien) — committen
│       ├── decision-log.md            ← „Warum" hinter Design-Entscheidungen
│       ├── failure-patterns.md        ← Wiederkehrende Fehler & Fixes (Auto-Score — `npx claudeos-core memory score`)
│       ├── compaction.md              ← 4-Stage-Compaction-Strategie (`npx claudeos-core memory compact` ausführen)
│       └── auto-rule-update.md        ← Rule-Verbesserungs-Vorschläge (`npx claudeos-core memory propose-rules`)
│
└── claudeos-core-tools/               ← Dieses Toolkit (nicht ändern)
```

Jede Standard-Datei enthält ✅-korrekte Beispiele, ❌-fehlerhafte Beispiele und eine Regel-Zusammenfassungstabelle — alles aus Ihren tatsächlichen Code-Mustern abgeleitet, nicht aus generischen Templates.

> **Hinweis zu v2.1.0:** `claudeos-core/plan/` wird nicht mehr generiert. Master Plans waren ein internes Backup, das Claude Code zur Laufzeit nicht konsumierte, und ihre Aggregation in Pass 3 war eine primäre Ursache für Output-Akkumulations-Overflows. Verwenden Sie stattdessen `git` für Backup/Restore. Projekte, die von v2.0.x upgraden, können ein bestehendes `claudeos-core/plan/`-Verzeichnis bedenkenlos löschen.

### Gitignore-Empfehlungen

**Committen** (Team-Wissen — zum Teilen gedacht):
- `CLAUDE.md` — Claude-Code-Einstiegspunkt
- `.claude/rules/**` — automatisch geladene Regeln
- `claudeos-core/standard/**`, `skills/**`, `guide/**`, `database/**`, `mcp-guide/**`, `plan/**` — generierte Dokumentation
- `claudeos-core/memory/**` — Entscheidungshistorie, Failure-Patterns, Rule-Vorschläge

**NICHT committen** (regenerierbare Build-Artefakte):

```gitignore
# ClaudeOS-Core — generierte Analyse & Übersetzungs-Cache
claudeos-core/generated/
```

Das `generated/`-Verzeichnis enthält Analyse-JSON (`pass1-*.json`, `pass2-merged.json`), Prompts (`pass1/2/3/4-prompt.md`), Pass-Completion-Marker (`pass3-complete.json`, `pass4-memory.json`), Übersetzungs-Cache (`.i18n-cache-<lang>.json`) und das transiente Staging-Verzeichnis (`.staged-rules/`) — alles durch erneutes Ausführen von `npx claudeos-core init` wiederherstellbar.

---

## Auto-Scaling nach Projektgröße

Der Split-Mode von Pass 3 skaliert die Stage-Anzahl mit der Domain-Anzahl. Die Batch-Unterteilung greift ab 16 Domains, um jede Stage unter ~50 Output-Dateien zu halten — dem empirischen Sicherheitsbereich für `claude -p`, bevor Output-Akkumulations-Overflows einsetzen.

| Projektgröße | Domains | Pass-3-Stages | Gesamt `claude -p` | Gesch. Zeit |
|---|---|---|---|---|
| Klein | 1–4 | 4 (`3a`, `3b-core`, `3c-core`, `3d-aux`) | 7 (Pass 1 + 2 + 4 Stages von Pass 3 + Pass 4) | ~10–15 min |
| Mittel | 5–15 | 4 | 8–9 | ~25–45 min |
| Groß | 16–30 | **8** (3b, 3c jeweils in 2 Batches aufgeteilt) | 11–12 | **~60–105 min** |
| X-Groß | 31–45 | 10 | 13–14 | ~100–150 min |
| XX-Groß | 46–60 | 12 | 15–16 | ~150–200 min |
| XXX-Groß | 61+ | 14+ | 17+ | 200 min+ |

Stage-Anzahl-Formel (bei aktivierter Batch-Teilung): `1 (3a) + 1 (3b-core) + N (3b-1..N) + 1 (3c-core) + N (3c-1..N) + 1 (3d-aux) = 2N + 4`, wobei `N = ceil(totalDomains / 15)`.

Pass 4 (Memory-Scaffolding) fügt je nach Ausführungspfad (Claude-getriebene Generierung oder statischer Fallback) ~30 Sekunden bis 5 Minuten hinzu. Für Multi-Stack-Projekte (z. B. Java + React) werden Backend- und Frontend-Domains zusammen gezählt. Ein Projekt mit 6 Backend- + 4 Frontend-Domains = 10 gesamt = Stufe Mittel.

---

## Verifikations-Tools

ClaudeOS-Core enthält 5 eingebaute Verifikations-Tools, die automatisch nach der Generierung laufen:

```bash
# Alle Checks auf einmal ausführen (empfohlen)
npx claudeos-core health

# Einzelne Befehle
npx claudeos-core validate     # Plan ↔ Disk-Vergleich
npx claudeos-core refresh      # Disk → Plan-Sync
npx claudeos-core restore      # Plan → Disk-Restore

# Oder node direkt verwenden (git-clone-User)
node claudeos-core-tools/health-checker/index.js
node claudeos-core-tools/manifest-generator/index.js
node claudeos-core-tools/plan-validator/index.js --check
node claudeos-core-tools/sync-checker/index.js
```

| Tool | Funktion |
|---|---|
| **manifest-generator** | Baut Metadaten-JSON (`rule-manifest.json`, `sync-map.json`, initialisiert `stale-report.json`); indexiert 7 Verzeichnisse einschließlich `memory/` (`totalMemory` in der Summary). v2.1.0: `plan-manifest.json` wird nicht mehr generiert, da Master Plans entfernt wurden. |
| **plan-validator** | Validiert Master-Plan-`<file>`-Blöcke gegen die Disk für Projekte, die noch ein `claudeos-core/plan/` besitzen (Legacy-Upgrade-Fall). v2.1.0: überspringt die Emission von `plan-sync-status.json`, wenn `plan/` fehlt oder leer ist — `stale-report.json` hält dennoch einen bestandenen No-op fest. |
| **sync-checker** | Erkennt nicht registrierte Dateien (auf Disk, aber nicht im Plan) und verwaiste Einträge — deckt 7 Verzeichnisse ab (in v2.0.0 `memory/` hinzugefügt). Beendet sich sauber, wenn `sync-map.json` keine Mappings hat (v2.1.0-Default-Zustand). |
| **content-validator** | 9-Sektionen-Qualitätscheck — leere Dateien, fehlende ✅/❌-Beispiele, erforderliche Sektionen plus L4-Memory-Scaffold-Integrität (decision-log-Heading-Dates, failure-pattern-Pflichtfelder, fence-aware Parsing) |
| **pass-json-validator** | Validiert Pass-1–4-JSON-Struktur plus die Completion-Marker `pass3-complete.json` (Split-Mode-Shape, v2.1.0) und `pass4-memory.json` |

---

## Wie Claude Code Ihre Dokumentation nutzt

ClaudeOS-Core generiert Dokumentation, die Claude Code tatsächlich liest — hier ist wie:

### Was Claude Code automatisch liest

| Datei | Wann | Garantiert |
|---|---|---|
| `CLAUDE.md` | Bei jedem Gesprächsbeginn | Immer |
| `.claude/rules/00.core/*` | Wenn eine beliebige Datei editiert wird (`paths: ["**/*"]`) | Immer |
| `.claude/rules/10.backend/*` | Wenn eine beliebige Datei editiert wird (`paths: ["**/*"]`) | Immer |
| `.claude/rules/20.frontend/*` | Wenn eine Frontend-Datei editiert wird (eingeschränkt auf Component-/Page-/Style-Pfade) | Bedingt |
| `.claude/rules/30.security-db/*` | Wenn eine beliebige Datei editiert wird (`paths: ["**/*"]`) | Immer |
| `.claude/rules/40.infra/*` | Nur beim Editieren von Config/Infra-Dateien (eingeschränkte Pfade) | Bedingt |
| `.claude/rules/50.sync/*` | Nur beim Editieren von claudeos-core-Dateien (eingeschränkte Pfade) | Bedingt |
| `.claude/rules/60.memory/*` | Wenn `claudeos-core/memory/*` editiert wird (eingeschränkt auf Memory-Pfade) — weist an, **wie** die On-Demand-Memory-Schicht gelesen/geschrieben wird | Bedingt (v2.0.0) |

### Was Claude Code bei Bedarf über Rule-Referenzen liest

Jede Rule-Datei verlinkt über einen `## Reference`-Abschnitt auf den zugehörigen Standard. Claude liest nur den für die aktuelle Aufgabe relevanten Standard:

- `claudeos-core/standard/**` — Coding-Muster, ✅/❌-Beispiele, Naming-Konventionen
- `claudeos-core/database/**` — DB-Schema (für Queries, Mapper, Migrationen)
- `claudeos-core/memory/**` (v2.0.0) — L4-Team-Wissensschicht; **nicht** auto-geladen (wäre bei jedem Gespräch zu rauschend). Stattdessen teilen die `60.memory/*`-Regeln Claude *wann* diese Dateien zu lesen sind: bei Session-Start (aktuelle `decision-log.md` überfliegen + High-Importance-`failure-patterns.md`), und append-on-demand bei Entscheidungen oder wiederkehrenden Fehlern.

Die `00.standard-reference.md` dient als Verzeichnis aller Standard-Dateien, um Standards zu finden, die keine entsprechende Regel haben.

### Was Claude Code NICHT liest (spart Context)

Diese Ordner werden explizit über den `DO NOT Read`-Abschnitt in der Standard-Reference-Rule ausgeschlossen:

| Ordner | Warum ausgeschlossen |
|---|---|
| `claudeos-core/plan/` | Master-Plan-Backups aus Legacy-Projekten (v2.0.x und älter). Wird in v2.1.0 nicht generiert. Falls vorhanden, lädt Claude Code es nicht automatisch — nur Read-on-Demand. |
| `claudeos-core/generated/` | Build-Metadaten-JSON, Prompts, Pass-Marker, Übersetzungs-Cache, `.staged-rules/`. Nicht zum Coden. |
| `claudeos-core/guide/` | Onboarding-Guides für Menschen. |
| `claudeos-core/mcp-guide/` | MCP-Server-Docs. Nicht zum Coden. |
| `claudeos-core/memory/` (Auto-Load) | **Auto-Load deaktiviert** by design — würde den Context bei jedem Gespräch aufblähen. Stattdessen on-demand über die `60.memory/*`-Regeln lesen (z. B. Session-Start-Scan von `failure-patterns.md`). Diese Dateien immer committen. |

---

## Täglicher Workflow

### Nach der Installation

```
# Claude Code einfach wie gewohnt benutzen — er referenziert Ihre Standards automatisch:
"Erstelle ein CRUD für die order-Domain"
"Füge eine User-Profile-Update-API hinzu"
"Refactore diesen Code, um den Projektmustern zu entsprechen"
```

### Nach manueller Bearbeitung von Standards

```bash
# Nach Bearbeitung von Standards- oder Rule-Dateien:
npx claudeos-core refresh

# Verifizieren, dass alles konsistent ist
npx claudeos-core health
```

### Wenn Docs beschädigt werden

```bash
# v2.1.0-Empfehlung: Wiederherstellung über git (da Master Plans nicht
# mehr generiert werden). Committen Sie Ihre generierten Dokumente
# regelmäßig, damit Sie einzelne Dateien zurücksetzen können, ohne
# neu zu generieren:
git checkout HEAD -- .claude/rules/ claudeos-core/

# Legacy (v2.0.x-Projekte mit noch vorhandenem claudeos-core/plan/):
npx claudeos-core restore
```

### Memory-Schicht-Pflege (v2.0.0)

Die L4-Memory-Schicht (`claudeos-core/memory/`) sammelt Team-Wissen über Sessions hinweg. Drei CLI-Subcommands halten sie gesund:

```bash
# Compact: 4-Stage-Compaction-Policy anwenden (regelmäßig — z. B. monatlich)
npx claudeos-core memory compact
#   Stage 1: alte Einträge zusammenfassen (>30 Tage, Body → eine Zeile)
#   Stage 2: doppelte Headings mergen (Frequency summiert, letzter Fix behalten)
#   Stage 3: Low-Importance + alt droppen (importance <3 UND lastSeen >60 Tage)
#   Stage 4: 400-Zeilen-Cap pro Datei erzwingen (ältestes Low-Importance zuerst gedroppt)

# Score: failure-patterns.md-Einträge nach Importance neu ranken
npx claudeos-core memory score
#   importance = round(frequency × 1.5 + recency × 5), bei 10 gecapped
#   Ausführen nach dem Anhängen mehrerer neuer Failure-Patterns

# Propose-rules: Kandidaten für Rule-Ergänzungen aus wiederkehrenden Failures herausarbeiten
npx claudeos-core memory propose-rules
#   Liest failure-patterns.md-Einträge mit frequency ≥ 3
#   Berechnet Confidence (Sigmoid auf gewichteter Evidenz × Anker-Multiplikator)
#   Schreibt Vorschläge nach memory/auto-rule-update.md (NICHT auto-angewendet)
#   Confidence ≥ 0.70 verdient ernsthafte Prüfung; akzeptieren → Rule editieren + Entscheidung loggen

# v2.1.0: `memory --help` leitet jetzt zur Subcommand-Hilfe weiter (zuvor wurde die Top-Level-Hilfe angezeigt)
npx claudeos-core memory --help
```

> **v2.1.0-Fixes:** `memory score` hinterlässt nach dem ersten Lauf keine doppelten `importance`-Zeilen mehr (zuvor wurde die auto-bewertete Zeile oben hinzugefügt, während die ursprüngliche Plain-Zeile darunter stehen blieb). Der Stage-1-Summary-Marker von `memory compact` ist nun ein korrektes Markdown-Listenelement (`- _Summarized on ..._`), sodass er sauber rendert und bei nachfolgenden Compactions korrekt neu geparst wird.

Wann in Memory schreiben (Claude macht das on-demand, aber Sie können auch manuell editieren):
- **`decision-log.md`** — neuen Eintrag anhängen, wenn Sie zwischen konkurrierenden Mustern wählen, eine Bibliothek auswählen, eine Team-Konvention definieren oder entscheiden, etwas NICHT zu tun. Append-only; historische Einträge niemals editieren.
- **`failure-patterns.md`** — beim **zweiten Auftreten** eines wiederkehrenden Fehlers oder einer nicht offensichtlichen Root-Cause anhängen. Erstmalige Fehler brauchen keinen Eintrag.
- `compaction.md` und `auto-rule-update.md` — werden von den CLI-Subcommands oben generiert/verwaltet; nicht von Hand editieren.

### CI/CD-Integration

```yaml
# GitHub-Actions-Beispiel
- run: npx claudeos-core validate
# Exit-Code 1 blockiert den PR

# Optional: monatliches Memory-Housekeeping (separater Cron-Workflow)
- run: npx claudeos-core memory compact
- run: npx claudeos-core memory score
```

---

## Wie unterscheidet sich das?

### vs. andere Claude-Code-Tools

| | ClaudeOS-Core | Everything Claude Code (50K+ ⭐) | Harness | specs-generator | Claude `/init` |
|---|---|---|---|---|---|
| **Ansatz** | Code analysiert zuerst, dann LLM generiert | Vorgefertigte Config-Presets | LLM designt Agent-Teams | LLM generiert Spec-Docs | LLM schreibt CLAUDE.md |
| **Liest Ihren Quellcode** | ✅ Deterministische statische Analyse | ❌ | ❌ | ❌ (LLM liest) | ❌ (LLM liest) |
| **Stack-Erkennung** | Code bestätigt (ORM, DB, Build-Tool, Pkg-Manager) | N/V (stack-agnostisch) | LLM rät | LLM rät | LLM rät |
| **Domain-Erkennung** | Code bestätigt (Java 5 Muster, Kotlin CQRS, Next.js FSD) | N/V | LLM rät | N/V | N/V |
| **Gleiches Projekt → gleiches Ergebnis** | ✅ Deterministische Analyse | ✅ (statische Dateien) | ❌ (LLM variiert) | ❌ (LLM variiert) | ❌ (LLM variiert) |
| **Handhabung großer Projekte** | Domain-Gruppen-Splitting (4 Domains / 40 Dateien pro Gruppe) | N/V | Kein Splitting | Kein Splitting | Context-Window-Limit |
| **Output** | CLAUDE.md + Rules + Standards + Skills + Guides + Plans (40–50+ Dateien) | Agents + Skills + Commands + Hooks | Agents + Skills | 6 Spec-Dokumente | CLAUDE.md (1 Datei) |
| **Output-Ort** | `.claude/rules/` (auto-geladen von Claude Code) | `.claude/` diverse | `.claude/agents/` + `.claude/skills/` | `.claude/steering/` + `specs/` | `CLAUDE.md` |
| **Post-Generierungs-Verifikation** | ✅ 5 automatisierte Validatoren | ❌ | ❌ | ❌ | ❌ |
| **Multi-Language-Output** | ✅ 10 Sprachen | ❌ | ❌ | ❌ | ❌ |
| **Multi-Stack** | ✅ Backend + Frontend simultan | ❌ Stack-agnostisch | ❌ | ❌ | Teilweise |
| **Persistente Memory-Schicht** | ✅ L4 — Decision-Log + Failure-Patterns + auto-bewertete Rule-Vorschläge (v2.0.0) | ❌ | ❌ | ❌ | ❌ |
| **Agent-Orchestrierung** | ❌ | ✅ 28 Agents | ✅ 6 Muster | ❌ | ❌ |

### Der Schlüsselunterschied in einem Satz

**Andere Tools geben Claude „allgemein gute Anweisungen". ClaudeOS-Core gibt Claude „Anweisungen, die aus Ihrem tatsächlichen Code extrahiert wurden".**

Deshalb hört Claude Code auf, JPA-Code in Ihrem MyBatis-Projekt zu generieren,
hört auf, `success()` zu verwenden, wenn Ihre Codebasis `ok()` nutzt,
und hört auf, `user/controller/`-Verzeichnisse zu erstellen, wenn Ihr Projekt `controller/user/` verwendet.

### Ergänzend, nicht konkurrierend

ClaudeOS-Core fokussiert sich auf **projektspezifische Regeln und Standards**.
Andere Tools fokussieren sich auf **Agent-Orchestrierung und Workflows**.

Sie können ClaudeOS-Core verwenden, um Ihre Projekt-Rules zu generieren, und darauf aufbauend ECC oder Harness für Agent-Teams und Workflow-Automatisierung. Sie lösen unterschiedliche Probleme.

---

## FAQ

**F: Modifiziert es meinen Quellcode?**
Nein. Es erstellt nur `CLAUDE.md`, `.claude/rules/` und `claudeos-core/`. Ihr bestehender Code wird niemals modifiziert.

**F: Wie viel kostet es?**
Es ruft `claude -p` mehrfach über die 4 Passes hinweg auf. Im v2.1.0-Split-Mode expandiert allein Pass 3 je nach Projektgröße in 4–14+ Stages (siehe [Auto-Scaling](#auto-scaling-nach-projektgröße)). Ein typisches kleines Projekt (1–15 Domains) verwendet insgesamt 8–9 `claude -p`-Aufrufe; ein 18-Domain-Projekt 11; ein 60-Domain-Projekt 15–17. Jede Stage läuft mit einem frischen Context-Fenster — die Token-Kosten pro Aufruf sind sogar niedriger als beim früheren Single-Call-Pass-3, weil keine Stage den gesamten Datei-Baum in einem Context halten muss. Wenn `--lang` nicht-englisch ist, kann der statische Fallback-Pfad einige zusätzliche `claude -p`-Aufrufe für Übersetzungen auslösen; Ergebnisse werden in `claudeos-core/generated/.i18n-cache-<lang>.json` gecacht, sodass nachfolgende Läufe sie wiederverwenden. Das liegt im Rahmen der normalen Claude-Code-Nutzung.

**F: Was ist der Pass-3-Split-Mode und warum wurde er in v2.1.0 eingeführt?**
Vor v2.1.0 führte Pass 3 einen einzigen `claude -p`-Aufruf aus, der den gesamten generierten Datei-Baum (`CLAUDE.md`, Standards, Rules, Skills, Guides — typischerweise 30–60 Dateien) in einer Antwort ausgeben musste. Das funktionierte bei kleinen Projekten, traf aber bei ca. 5 Domains zuverlässig auf `Prompt is too long`-Output-Akkumulations-Fehler. Der Fehler war nicht aus der Input-Größe vorhersagbar — er hing davon ab, wie ausführlich jede generierte Datei ausfiel, und konnte dasselbe Projekt intermittierend treffen. Der Split-Mode umgeht das Problem strukturell: Pass 3 wird in sequenzielle Stages aufgeteilt (`3a` → `3b-core` → `3b-N` → `3c-core` → `3c-N` → `3d-aux`), jede ein separater `claude -p`-Aufruf mit frischem Context-Fenster. Die Konsistenz über Stages hinweg wird durch `pass3a-facts.md` erhalten, eine 5–10 KB große destillierte Fact Sheet, die jede spätere Stage referenziert, anstatt `pass2-merged.json` erneut zu lesen. Der `pass3-complete.json`-Marker trägt ein `groupsCompleted`-Array, sodass ein Crash während `3c-2` ab `3c-2` fortgesetzt wird (nicht ab `3a`), was doppelte Token-Kosten vermeidet.
**F: Soll ich die generierten Dateien in Git committen?**
Ja, empfohlen. Ihr Team kann dieselben Claude-Code-Standards teilen. Erwägen Sie, `claudeos-core/generated/` in `.gitignore` aufzunehmen (Analyse-JSON ist regenerierbar).

**F: Was ist mit Mixed-Stack-Projekten (z. B. Java-Backend + React-Frontend)?**
Vollständig unterstützt. ClaudeOS-Core erkennt beide Stacks automatisch, taggt Domains als `backend` oder `frontend` und verwendet stack-spezifische Analyse-Prompts für jeden. Pass 2 merged alles, und Pass 3 generiert sowohl Backend- als auch Frontend-Standards über seine Split-Stages hinweg — Backend-Domains landen in manchen 3b/3c-Batches, Frontend-Domains in anderen, wobei alle dieselbe `pass3a-facts.md` für Konsistenz referenzieren.

**F: Funktioniert es mit Turborepo / pnpm-Workspaces / Lerna-Monorepos?**
Ja. ClaudeOS-Core erkennt `turbo.json`, `pnpm-workspace.yaml`, `lerna.json` oder `package.json#workspaces` und scannt automatisch Sub-Package-`package.json`-Dateien nach Framework/ORM/DB-Abhängigkeiten. Das Domain-Scanning deckt `apps/*/src/`- und `packages/*/src/`-Muster ab. Vom Monorepo-Root ausführen.

**F: Was passiert bei einem erneuten Lauf?**
Wenn vorherige Pass-1/2-Ergebnisse existieren, lässt Sie ein interaktiver Prompt wählen: **Continue** (von der Unterbrechungsstelle fortsetzen) oder **Fresh** (alles löschen und neu beginnen). Verwenden Sie `--force`, um den Prompt zu überspringen und immer frisch zu starten. Im v2.1.0-Split-Mode funktioniert der Pass-3-Resume auf Stage-Granularität — wenn der Lauf während `3c-2` crashte, setzt das nächste `init` ab `3c-2` fort, anstatt von `3a` neu zu starten (was die Token-Kosten verdoppeln würde). Der `pass3-complete.json`-Marker hält `mode: "split"` plus ein `groupsCompleted`-Array fest, um diese Logik zu steuern.

**F: Bekommt NestJS ein eigenes Template oder verwendet es das Express-Template?**
NestJS verwendet ein dediziertes `node-nestjs`-Template mit NestJS-spezifischen Analyse-Kategorien: `@Module`-, `@Injectable`-, `@Controller`-Decorators, Guards, Pipes, Interceptors, DI-Container, CQRS-Muster und `Test.createTestingModule`. Express-Projekte verwenden das separate `node-express`-Template.

**F: Was ist mit Vue-/Nuxt-Projekten?**
Vue/Nuxt verwendet ein dediziertes `vue-nuxt`-Template, das Composition API, `<script setup>`, defineProps/defineEmits, Pinia-Stores, `useFetch`/`useAsyncData`, Nitro-Server-Routes und `@nuxt/test-utils` abdeckt. Next.js-/React-Projekte verwenden das `node-nextjs`-Template.

**F: Unterstützt es Kotlin?**
Ja. ClaudeOS-Core erkennt Kotlin automatisch aus `build.gradle.kts` oder dem kotlin-Plugin in `build.gradle`. Es verwendet ein dediziertes `kotlin-spring`-Template mit Kotlin-spezifischer Analyse (Data Classes, Sealed Classes, Coroutines, Extension Functions, MockK usw.).

**F: Was ist mit CQRS- / BFF-Architektur?**
Für Kotlin-Multi-Modul-Projekte vollständig unterstützt. ClaudeOS-Core liest `settings.gradle.kts`, erkennt Modultypen (command, query, bff, integration) aus Modulnamen und gruppiert dieselbe Domain über Command-/Query-Module. Die generierten Standards enthalten separate Regeln für Command-Controller vs. Query-Controller, BFF-/Feign-Muster und Inter-Modul-Kommunikationskonventionen.

**F: Was ist mit Gradle-Multi-Modul-Monorepos?**
ClaudeOS-Core scannt alle Submodule (`**/src/main/kotlin/**/*.kt`) unabhängig von der Verschachtelungstiefe. Modultypen werden aus Naming-Konventionen abgeleitet (z. B. `reservation-command-server` → Domain: `reservation`, Typ: `command`). Geteilte Bibliotheken (`shared-lib`, `integration-lib`) werden ebenfalls erkannt.

**F: Was ist die L4-Memory-Schicht (v2.0.0)? Soll ich `claudeos-core/memory/` committen?**
Ja — `claudeos-core/memory/` **immer committen**. Es ist persistentes Team-Wissen: `decision-log.md` hält das *Warum* hinter architektonischen Entscheidungen fest (append-only), `failure-patterns.md` registriert wiederkehrende Fehler mit Importance-Scores, damit zukünftige Sessions sie vermeiden, `compaction.md` definiert die 4-Stage-Compaction-Policy, und `auto-rule-update.md` sammelt maschinell generierte Rule-Verbesserungs-Vorschläge. Anders als Rules (pfad-basiert auto-geladen) sind Memory-Dateien **on-demand** — Claude liest sie nur, wenn die `60.memory/*`-Regeln ihn dazu auffordern (z. B. Session-Start-Scan von High-Importance-Failures). Das hält Context-Kosten niedrig, während langfristiges Wissen erhalten bleibt.

**F: Was, wenn Pass 4 fehlschlägt?**
Die automatisierte Pipeline (`npx claudeos-core init`) hat einen statischen Fallback: Wenn `claude -p` fehlschlägt oder `pass4-prompt.md` fehlt, wird die Memory-Schicht direkt über `lib/memory-scaffold.js` aufgebaut. Wenn `--lang` nicht-englisch ist, **muss** der statische Fallback über die `claude`-CLI übersetzen — schlägt das ebenfalls fehl, bricht der Lauf mit `InitError` ab (kein stiller englischer Fallback). Erneut ausführen, wenn `claude` authentifiziert ist, oder `--lang en` verwenden, um die Übersetzung zu überspringen. Übersetzungsergebnisse werden in `claudeos-core/generated/.i18n-cache-<lang>.json` gecacht, sodass nachfolgende Läufe sie wiederverwenden.

**F: Was machen `memory compact` / `memory score` / `memory propose-rules`?**
Siehe den Abschnitt [Memory-Schicht-Pflege](#memory-schicht-pflege-v200) oben. Kurzfassung: `compact` führt die 4-Stage-Policy aus (alte zusammenfassen, Duplikate mergen, Low-Importance-alt droppen, 400-Zeilen-Cap erzwingen); `score` ranked `failure-patterns.md` neu nach Importance (frequency × recency); `propose-rules` bringt Kandidaten für Rule-Ergänzungen aus wiederkehrenden Failures in `auto-rule-update.md` (nicht auto-angewendet — manuell prüfen und akzeptieren/ablehnen).

**F: Warum löscht `--force` (oder „fresh"-Resume-Modus) `.claude/rules/`?**
v2.0.0 hat drei Pass-3-Silent-Failure-Guards hinzugefügt (Guard 3 deckt zwei Incomplete-Output-Varianten ab: H2 für `guide/` und H1 für `standard/skills`). Guard 1 („partieller staged-rules-Move") und Guard 3 („unvollständiger Output — fehlende/leere Guide-Dateien oder fehlender Standard-Sentinel / leere Skills") hängen nicht von bestehenden Regeln ab, aber Guard 2 („null Rules erkannt") schon — er feuert, wenn Claude die `staging-override.md`-Direktive ignoriert und direkt nach `.claude/` schreiben wollte (wo Claude Codes Sensitive-Path-Policy das blockiert). Stale-Rules aus einem früheren Lauf würden Guard 2 false-negative machen — daher wipet `--force`/`fresh` `.claude/rules/`, um eine saubere Erkennung sicherzustellen. **Manuelle Edits an Rule-Dateien gehen verloren** bei `--force`/`fresh`; vorher sichern, wenn nötig. (Hinweis zu v2.1.0: Guard 3 H1 prüft `plan/` nicht mehr, da Master Plans nicht mehr generiert werden.)

**F: Was ist `claudeos-core/generated/.staged-rules/` und warum existiert es?**
Claude Codes Sensitive-Path-Policy verweigert direkte Schreibzugriffe auf `.claude/` aus dem `claude -p`-Subprozess (selbst mit `--dangerously-skip-permissions`). v2.0.0 umgeht das, indem Pass-3/4-Prompts alle `.claude/rules/`-Schreibvorgänge auf das Staging-Verzeichnis umleiten; der Node.js-Orchestrator (nicht dieser Policy unterworfen) verschiebt den Staging-Baum dann nach jedem Pass nach `.claude/rules/`. Das ist für den Benutzer transparent — das Verzeichnis wird auto-erstellt, auto-bereinigt und auto-verschoben. Wenn ein vorheriger Lauf mitten im Move crashte, wipet der nächste Lauf das Staging-Dir vor dem Retry. Im v2.1.0-Split-Mode verschiebt der Stage-Runner die staged-rules nach jeder Stage nach `.claude/rules/` (nicht erst am Ende), sodass ein Crash mitten in Pass 3 die bereits abgeschlossenen Stage-Rules an Ort und Stelle belässt.

**F: Kann ich Pass 3 manuell statt über `npx claudeos-core init` ausführen?**
Ja für kleine Projekte (≤5 Domains) — die Single-Call-Manual-Anweisungen in [Schritt 6](#schritt-6-pass-3--gesamte-dokumentation-generieren-aufgeteilt-in-mehrere-stages) funktionieren weiterhin. Für größere Projekte sollten Sie `npx claudeos-core init` verwenden, weil der Split-Runner die Stage-für-Stage-Ausführung mit frischen Contexts orchestriert, die Batch-Unterteilung ab 16 Domains übernimmt, die korrekte `pass3-complete.json`-Marker-Form (`mode: "split"` + `groupsCompleted`) schreibt und staged-rules zwischen Stages verschiebt. Diese Orchestrierung händisch nachzubauen ist möglich, aber mühsam. Wenn Sie einen Grund haben, Stages manuell auszuführen (z. B. Debugging einer bestimmten Stage), können Sie `pass3-prompt.md` mit der passenden `STAGE:`-Direktive templaten und direkt an `claude -p` füttern — denken Sie aber daran, `.staged-rules/` nach jeder Stage zu verschieben und den Marker selbst zu aktualisieren.

**F: Mein Projekt wird von v2.0.x upgegradet und hat ein bestehendes `claudeos-core/plan/`-Verzeichnis. Was soll ich tun?**
Nichts erforderlich — v2.1.0-Tools ignorieren `plan/`, wenn es fehlt oder leer ist, und `plan-validator` handhabt Legacy-Projekte mit gefüllten `plan/`-Verzeichnissen weiterhin aus Abwärtskompatibilitätsgründen. Sie können `claudeos-core/plan/` bedenkenlos löschen, wenn Sie die Master-Plan-Backups nicht brauchen (die Git-History ist ohnehin das bessere Backup). Wenn Sie `plan/` behalten, aktualisiert `npx claudeos-core init` es nicht — neue Inhalte werden in v2.1.0 nicht mehr in Master Plans aggregiert. Die Verifikations-Tools handhaben beide Fälle sauber.

---

## Template-Struktur

```
pass-prompts/templates/
├── common/                  # gemeinsame header/footer + pass4 + staging-override + CLAUDE.md scaffold (v2.2.0)
│   ├── header.md             # Rolle + Ausgabeformat-Direktive (alle Passes)
│   ├── pass3-footer.md       # Post-Pass-3 health-check-Anweisung + 5 CRITICAL Guardrail-Blöcke (v2.2.0)
│   ├── pass3-phase1.md       # „Read Once, Extract Facts"-Block mit Rules A-E (v2.1.0)
│   ├── pass4.md              # Memory-Scaffolding-Prompt (v2.0.0)
│   ├── staging-override.md   # Leitet .claude/rules/**-Schreibvorgänge auf .staged-rules/** um (v2.0.0)
│   ├── claude-md-scaffold.md # Deterministische 8-Abschnitt-CLAUDE.md-Vorlage (v2.2.0)
│   └── lang-instructions.json # Ausgabedirektiven pro Sprache (10 Sprachen)
├── java-spring/             # Java / Spring Boot
├── kotlin-spring/           # Kotlin / Spring Boot (CQRS, BFF, multi-module)
├── node-express/            # Node.js / Express
├── node-nestjs/             # Node.js / NestJS (Module, DI, Guard, Pipe, Interceptor)
├── node-fastify/            # Node.js / Fastify
├── node-nextjs/             # Next.js / React (App Router, RSC)
├── node-vite/               # Vite SPA (React, client-side routing, VITE_ env, Vitest)
├── vue-nuxt/                # Vue / Nuxt (Composition API, Pinia, Nitro)
├── angular/                 # Angular
├── python-django/           # Python / Django (DRF)
├── python-fastapi/          # Python / FastAPI
└── python-flask/            # Python / Flask (Blueprint, app factory, Jinja2)
```

`plan-installer` erkennt Ihren Stack/Ihre Stacks automatisch und setzt dann typ-spezifische Prompts zusammen. NestJS, Vue/Nuxt, Vite SPA und Flask verwenden jeweils dedizierte Templates mit framework-spezifischen Analyse-Kategorien (z. B. `@Module`/`@Injectable`/Guards für NestJS; `<script setup>`/Pinia/useFetch für Vue; Client-Side-Routing/`VITE_`-Env für Vite; Blueprint/`app.factory`/Flask-SQLAlchemy für Flask). Für Multi-Stack-Projekte werden separate `pass1-backend-prompt.md` und `pass1-frontend-prompt.md` generiert, während `pass3-prompt.md` die Generierungsziele beider Stacks kombiniert. In v2.1.0 wird dem Pass-3-Template `common/pass3-phase1.md` (der „Read Once, Extract Facts"-Block mit Rules A–E) vorangestellt, bevor es pro Split-Mode-Stage zugeschnitten wird. Pass 4 verwendet unabhängig vom Stack das gemeinsame `common/pass4.md`-Template (Memory-Scaffolding).

**In v2.2.0** bettet der Pass-3-Prompt zusätzlich `common/claude-md-scaffold.md` (die deterministische 8-Abschnitt-CLAUDE.md-Vorlage) inline zwischen dem phase1-Block und dem stack-spezifischen Körper ein — dies fixiert die Abschnittsstruktur, sodass generierte CLAUDE.md nicht zwischen Projekten abweichen, während der Inhalt weiterhin projektspezifisch angepasst wird. Vorlagen werden **English-first** geschrieben; die Sprachinjektion aus `lang-instructions.json` weist das LLM an, Abschnittstitel und Fließtext zum Emit-Zeitpunkt in die Zielausgabesprache zu übersetzen.

---

## Monorepo-Unterstützung

ClaudeOS-Core erkennt JS/TS-Monorepo-Setups automatisch und scannt Sub-Packages nach Abhängigkeiten.

**Unterstützte Monorepo-Marker** (auto-erkannt):
- `turbo.json` (Turborepo)
- `pnpm-workspace.yaml` (pnpm-Workspaces)
- `lerna.json` (Lerna)
- `package.json#workspaces` (npm-/yarn-Workspaces)

**Vom Monorepo-Root ausführen** — ClaudeOS-Core liest `apps/*/package.json` und `packages/*/package.json`, um Framework-/ORM-/DB-Abhängigkeiten über Sub-Packages hinweg zu entdecken:

```bash
cd my-monorepo
npx claudeos-core init
```

**Was erkannt wird:**
- Abhängigkeiten aus `apps/web/package.json` (z. B. `next`, `react`) → Frontend-Stack
- Abhängigkeiten aus `apps/api/package.json` (z. B. `express`, `prisma`) → Backend-Stack
- Abhängigkeiten aus `packages/db/package.json` (z. B. `drizzle-orm`) → ORM/DB
- Benutzerdefinierte Workspace-Pfade aus `pnpm-workspace.yaml` (z. B. `services/*`)

**Domain-Scanning deckt auch Monorepo-Layouts ab:**
- `apps/api/src/modules/*/` und `apps/api/src/*/` für Backend-Domains
- `apps/web/app/*/`, `apps/web/src/app/*/`, `apps/web/pages/*/` für Frontend-Domains
- `packages/*/src/*/` für Shared-Package-Domains

```
my-monorepo/                    ← Hier ausführen: npx claudeos-core init
├── turbo.json                  ← Als Turborepo auto-erkannt
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

> **Hinweis:** Für Kotlin-/Java-Monorepos verwendet die Multi-Modul-Erkennung `settings.gradle.kts` (siehe [Kotlin-Multi-Modul-Erkennung](#kotlin-multi-modul-domain-erkennung) oben) und benötigt keine JS-Monorepo-Marker.

## Fehlerbehebung

**„claude: command not found"** — Claude Code CLI ist nicht installiert oder nicht im PATH. Siehe [Claude-Code-Docs](https://code.claude.com/docs/en/overview).

**„npm install failed"** — Node.js-Version ist möglicherweise zu niedrig. Erfordert v18+.

**„0 domains detected"** — Ihre Projektstruktur ist möglicherweise nicht-standardisiert. Siehe die Erkennungsmuster oben für Ihren Stack.

**„0 domains detected" bei einem Kotlin-Projekt** — Stellen Sie sicher, dass Ihr Projekt `build.gradle.kts` (oder `build.gradle` mit kotlin-Plugin) im Root hat und dass Quelldateien unter `**/src/main/kotlin/` liegen. Für Multi-Modul-Projekte stellen Sie sicher, dass `settings.gradle.kts` `include()`-Statements enthält. Single-Modul-Kotlin-Projekte (ohne `settings.gradle`) werden ebenfalls unterstützt — Domains werden aus der Package-/Class-Struktur unter `src/main/kotlin/` extrahiert.

**„Language detected as java instead of kotlin"** — ClaudeOS-Core prüft zuerst die Root-`build.gradle(.kts)`, dann Submodul-Build-Dateien. Wenn die Root-Build-Datei das `java`-Plugin ohne `kotlin` verwendet, aber Submodule Kotlin verwenden, prüft das Tool als Fallback bis zu 5 Submodul-Build-Dateien. Wenn immer noch nicht erkannt, stellen Sie sicher, dass mindestens ein `build.gradle.kts` `kotlin("jvm")` oder `org.jetbrains.kotlin` enthält.

**„CQRS not detected"** — Die Architektur-Erkennung verlässt sich auf Modulnamen, die `command`- und `query`-Keywords enthalten. Wenn Ihre Module andere Namen verwenden (z. B. `write-server`, `read-server`), wird die CQRS-Architektur nicht auto-erkannt. Sie können die generierten Prompts nach dem plan-installer-Lauf manuell anpassen.

**„Pass 3 produced 0 rule files under .claude/rules/" (v2.0.0)** — Guard 2 hat ausgelöst: Claude hat die `staging-override.md`-Direktive ignoriert und versucht, direkt nach `.claude/` zu schreiben, wo Claude Codes Sensitive-Path-Policy Schreibvorgänge blockiert. Erneut mit `npx claudeos-core init --force` ausführen. Wenn der Fehler weiterhin auftritt, inspizieren Sie `claudeos-core/generated/pass3-prompt.md`, um zu verifizieren, dass der `staging-override.md`-Block ganz oben steht.

**„Pass 3 finished but N rule file(s) could not be moved from staging" (v2.0.0)** — Guard 1 hat ausgelöst: Der Staging-Move hat einen transienten Datei-Lock getroffen (typischerweise Windows-Antivirus oder ein File-Watcher). Der Marker wird NICHT geschrieben, also wird der nächste `init`-Lauf Pass 3 automatisch erneut versuchen. Einfach `npx claudeos-core init` erneut ausführen.

**„Pass 3 produced CLAUDE.md and rules but N/9 guide files are missing or empty" (v2.0.0)** — Guard 3 (H2) hat ausgelöst: Claude hat mitten in der Antwort abgeschnitten, nachdem CLAUDE.md + Rules geschrieben waren, aber vor dem Beenden (oder Starten) des `claudeos-core/guide/`-Abschnitts (9 Dateien erwartet). Löst auch bei BOM-only- oder Whitespace-only-Dateien aus (Heading wurde geschrieben, aber der Body wurde abgeschnitten). Ohne diesen Guard würde der Completion-Marker trotzdem geschrieben, was `guide/` auf nachfolgenden Läufen dauerhaft leer lassen würde. Der Marker wird hier NICHT geschrieben, also wird der nächste `init`-Lauf Pass 3 mit denselben Pass-2-Ergebnissen erneut versuchen. Wenn es sich weiter wiederholt, mit `npx claudeos-core init --force` erneut ausführen, um von Grund auf neu zu generieren.

**„Pass 3 finished but the following required output(s) are missing or empty" (v2.0.0, aktualisiert v2.1.0)** — Guard 3 (H1) hat ausgelöst: Claude hat NACH `claudeos-core/guide/` abgeschnitten, aber vor (oder während) `claudeos-core/standard/` oder `claudeos-core/skills/`. Anforderungen: (a) `standard/00.core/01.project-overview.md` existiert und ist nicht leer (Sentinel, der vom Pass-3-Prompt jedes Stacks geschrieben wird), (b) `skills/` hat ≥1 nicht-leere `.md`. `database/` und `mcp-guide/` sind bewusst ausgeschlossen (einige Stacks produzieren legitim null Dateien). `plan/` wird ab v2.1.0 nicht mehr geprüft (Master Plans wurden entfernt). Gleicher Recovery-Pfad wie Guard 3 (H2): `init` erneut ausführen, oder `--force`, wenn es weiter auftritt.

**„Pass 3 split stage crashed partway through (v2.1.0)"** — Wenn eine der Split-Stages (z. B. `3b-1`, `3c-2`) mittendrin fehlschlägt, wird der Stage-Level-Marker NICHT geschrieben, aber abgeschlossene Stages SIND in `pass3-complete.json.groupsCompleted` festgehalten. Der nächste `init`-Lauf liest dieses Array und setzt ab der ersten nicht abgeschlossenen Stage fort und überspringt alle früher abgeschlossenen Arbeiten. Sie müssen nichts manuell tun — einfach `npx claudeos-core init` erneut ausführen. Wenn das Resume bei derselben Stage wiederholt fehlschlägt, inspizieren Sie `claudeos-core/generated/pass3-prompt.md` auf fehlerhaften Inhalt, und versuchen Sie dann `--force` für einen vollständigen Neustart. Die `pass3-complete.json`-Form (`mode: "split"`, `groupsCompleted: [...]`) ist stabil; ein fehlender oder fehlerhafter Marker führt dazu, dass das gesamte Pass 3 ab `3a` erneut läuft.

**„Pass 3 stale marker (shape mismatch) — treating as incomplete" (v2.1.0)** — Eine `pass3-complete.json` aus einem pre-v2.1.0-Single-Call-Lauf wird unter den neuen Split-Mode-Regeln interpretiert. Der Form-Check sucht nach `mode: "split"` und einem `groupsCompleted`-Array; fehlt eines von beiden, wird der Marker als partiell behandelt und Pass 3 läuft im Split-Mode erneut. Wenn Sie von v2.0.x upgegradet haben, ist das einmalig zu erwarten — der nächste Lauf schreibt die korrekte Marker-Form. Keine Aktion erforderlich.

**„pass2-merged.json exists but is malformed or incomplete (<5 top-level keys), re-running" (v2.0.0)** — Info-Log, kein Fehler. Beim Resume parsed und validiert `init` nun `pass2-merged.json` (≥5 Top-Level-Keys erforderlich, spiegelt den `INSUFFICIENT_KEYS`-Schwellenwert des `pass-json-validator`). Skelett-`{}` oder fehlerhaftes JSON aus einem vorherigen gecrashten Lauf wird automatisch gelöscht und Pass 2 läuft erneut. Keine manuelle Aktion nötig — die Pipeline heilt sich selbst. Wenn es weiter auftritt, `claudeos-core/generated/pass2-prompt.md` inspizieren und mit `--force` erneut versuchen.

**„Static fallback failed while translating to lang='ko'" (v2.0.0)** — Wenn `--lang` nicht-englisch ist, erfordern Pass 4 / statischer Fallback / Gap-Fill alle die `claude`-CLI zur Übersetzung. Wenn die Übersetzung fehlschlägt (CLI nicht authentifiziert, Netzwerk-Timeout oder strikte Validierung hat den Output abgelehnt: <40 % Länge, kaputte Code-Fences, verlorenes Frontmatter usw.), bricht der Lauf ab, anstatt still Englisch zu schreiben. Fix: Sicherstellen, dass `claude` authentifiziert ist, oder mit `--lang en` erneut ausführen, um die Übersetzung zu überspringen.

**„pass4-memory.json exists but memory/ is empty" (v2.0.0)** — Ein vorheriger Lauf hat den Marker geschrieben, aber der Benutzer (oder ein Cleanup-Skript) hat `claudeos-core/memory/` gelöscht. Die CLI erkennt diesen Stale-Marker automatisch und führt Pass 4 beim nächsten `init` erneut aus. Keine manuelle Aktion nötig.

**„pass4-memory.json exists but is malformed (missing passNum/memoryFiles) — re-running Pass 4" (v2.0.0)** — Info-Log, kein Fehler. Der Pass-4-Marker-Inhalt wird nun validiert (`passNum === 4` + nicht-leeres `memoryFiles`-Array), nicht nur seine Existenz. Ein teilweiser Claude-Fehler, der etwas wie `{"error":"timeout"}` als Marker-Body ausgibt, würde zuvor für immer als Erfolg akzeptiert; jetzt wird der Marker gelöscht und Pass 4 läuft automatisch erneut.

**„Could not delete stale pass3-complete.json / pass4-memory.json" InitError (v2.0.0)** — `init` hat einen Stale-Marker erkannt (Pass 3: CLAUDE.md wurde extern gelöscht; Pass 4: memory/ leer oder Marker-Body fehlerhaft) und versucht, ihn zu entfernen, aber der `unlinkSync`-Aufruf schlug fehl — typischerweise weil Windows-Antivirus oder ein File-Watcher (Editor, IDE-Indexer) das File-Handle hält. Zuvor wurde das still ignoriert, was die Pipeline dazu brachte, den Pass zu überspringen und den Stale-Marker wiederzuverwenden. Jetzt scheitert es laut. Fix: Editor/AV-Scanner schließen, der die Datei möglicherweise offen hält, dann `npx claudeos-core init` erneut ausführen.

**„CLAUDEOS_SKIP_TRANSLATION=1 is set but --lang='ko' requires translation" InitError (v2.0.0)** — Sie haben die Test-only-Env-Var `CLAUDEOS_SKIP_TRANSLATION=1` in Ihrer Shell gesetzt (wahrscheinlich ein Rest aus CI-/Test-Setup) UND eine nicht-englische `--lang` gewählt. Diese Env-Var short-circuit den Übersetzungs-Pfad, von dem Pass 4's statischer Fallback und Gap-Fill für nicht-englischen Output abhängen. `init` erkennt den Konflikt beim Sprachwahl-Zeitpunkt und bricht sofort ab (anstatt mitten in Pass 4 mit einem verwirrenden verschachtelten Fehler zu crashen). Fix: Entweder `unset CLAUDEOS_SKIP_TRANSLATION` vor dem Ausführen oder `npx claudeos-core init --lang en` verwenden.

**Warnung "⚠️ v2.2.0 upgrade detected" (v2.2.0)** — Deine existierende `CLAUDE.md` wurde mit einer Pre-v2.2.0-Version generiert. Die Standard-Resume-Mode-Regeneration wird existierende Dateien unter Rule B idempotency überspringen, daher werden die strukturellen Verbesserungen von v2.2.0 (8-Abschnitt-CLAUDE.md-Scaffold, Per-File-Paths in `40.infra/*`, `.env.example`-basierte Port-Genauigkeit, Section-8-Redesign mit `Common Rules & Memory (L4)` (neu gestaltet mit zwei Unterabschnitten: Common Rules · L4 Memory), `60.memory/*`-Rule-Zeile, forward-referenced `04.doc-writing-guide.md`) NICHT angewendet. Fix: Mit `npx claudeos-core init --force` erneut ausführen. Das überschreibt generierte Dateien (`CLAUDE.md`, `.claude/rules/`, `claudeos-core/standard/`, `claudeos-core/skills/`, `claudeos-core/guide/`) und bewahrt dabei `claudeos-core/memory/` (akkumulierte decision-log-, failure-patterns-Einträge — append-only). Committe das Projekt vorher, wenn du die Überschreibungen vor dem Akzeptieren diff-en möchtest.

**Port in CLAUDE.md weicht von `.env.example` ab (v2.2.0)** — Der neue `.env`-Parser des Stack-Detectors (`lib/env-parser.js`) liest zuerst `.env.example` (kanonisch, committed), dann `.env`-Varianten als Fallback. Erkannte Port-Variablen: `PORT`, `VITE_PORT`, `VITE_DESKTOP_PORT`, `NEXT_PUBLIC_PORT`, `NUXT_PORT`, `DJANGO_PORT` usw. Für Spring Boot hat `server.port` aus `application.yml` weiterhin Vorrang vor `.env` (framework-native Config gewinnt). Wenn dein Projekt einen ungewöhnlichen Env-Variablennamen verwendet, benenne ihn auf eine anerkannte Konvention um oder stelle eine Issue-Anfrage zur Erweiterung von `PORT_VAR_KEYS`. Framework-Defaults (Vite 5173, Next.js 3000, Django 8000) werden nur verwendet, wenn sowohl direkte Detection als auch `.env` still bleiben.

**Secret-Werte als `***REDACTED***` in generierten Docs (v2.2.0)** — Erwartetes Verhalten. Der `.env`-Parser von v2.2.0 redact-iert automatisch Werte von Variablen, die den Mustern `PASSWORD`/`SECRET`/`TOKEN`/`API_KEY`/`CREDENTIAL`/`PRIVATE_KEY` entsprechen, bevor sie irgendeinen Generator erreichen. Das ist Defense-in-Depth gegen versehentlich in `.env.example` committed Secrets. `DATABASE_URL` bleibt unverändert für Stack-Detector-DB-Identifikations-Back-Compat. Wenn du irgendwo in der generierten `CLAUDE.md` `***REDACTED***` siehst, ist das ein Bug — redact-ierte Werte sollten nicht in der Tabelle landen; bitte erstelle eine Issue. Nicht-sensible Runtime-Config (Port, Host, API Target, NODE_ENV usw.) kommt unverändert durch.

---

## Mitwirken

Beiträge sind willkommen! Bereiche, in denen Hilfe am meisten benötigt wird:

- **Neue Stack-Templates** — Ruby/Rails, Go (Gin/Fiber/Echo), PHP (Laravel/Symfony), Rust (Axum/Actix), Svelte/SvelteKit, Remix
- **IDE-Integration** — VS-Code-Extension, IntelliJ-Plugin
- **CI/CD-Templates** — GitLab CI, CircleCI, Jenkins-Beispiele (GitHub Actions bereits ausgeliefert — siehe `.github/workflows/test.yml`)
- **Testabdeckung** — Erweiterung der Test-Suite (derzeit 602 Tests über 30 Test-Dateien, die Scanner, Stack-Erkennung, Domain-Grouping, Plan-Parsing, Prompt-Generierung, CLI-Selectors, Monorepo-Erkennung, Vite-SPA-Erkennung, Verifikations-Tools, L4-Memory-Scaffold, Pass-2-Resume-Validierung, Pass-3-Guards 1/2/3 (H1-Sentinel + H2-BOM-aware-Empty-File + strikter Stale-Marker-Unlink), Pass-3-Split-Mode-Batch-Unterteilung, Pass-3-Partial-Marker-Resume (v2.1.0), Pass-4-Marker-Content-Validierung + Stale-Marker-Unlink-Striktheit + scaffoldSkillsManifest-Gap-Fill (v2.1.0), Translation-Env-Skip-Guard + Early-Fail-Fast + CI-Workflow, staged-rules-Move, lang-aware-Translation-Fallback, Master-Plan-Removal-Regressions-Suite (v2.1.0), Memory-Score/Compact-Formatting-Regression (v2.1.0) und AI-Work-Rules-Template-Struktur und `.env`-Parser Port/Host/API-Target-Extraktion + Redaction sensibler Variablen (v2.2.0) abdecken)

Siehe [`CONTRIBUTING.md`](./CONTRIBUTING.md) für die vollständige Liste der Bereiche, den Code-Style, die Commit-Konvention und die Schritt-für-Schritt-Anleitung zum Hinzufügen eines neuen Stack-Templates.

---

## Autor

Erstellt von **claudeos-core** — [GitHub](https://github.com/claudeos-core) · [E-Mail](mailto:claudeoscore@gmail.com)

## Lizenz

ISC
