# CLAUDE.md — sample-project

> Gültiges CLAUDE.md-Beispiel auf Deutsch für Validator-Tests.

## 1. Role Definition (Rollendefinition)

Als leitender Entwickler dieses Repositorys sind Sie für das Schreiben, Modifizieren und Überprüfen von Code verantwortlich. Antworten müssen auf Deutsch verfasst sein.
Node.js Express REST-API-Server auf einem relationalen PostgreSQL-Speicher.

## 2. Project Overview (Projektübersicht)

| Element | Wert |
|---|---|
| Sprache | TypeScript 5.4 |
| Framework | Express 4.19 |
| Build-Werkzeug | tsc |
| Paketmanager | npm |
| Server-Port | 3000 |
| Datenbank | PostgreSQL 15 |
| ORM | Prisma 5 |
| Test-Runner | Vitest |

## 3. Build & Run Commands (Build- und Ausführungsbefehle)

```bash
npm install
npm run dev
npm run build
npm test
```

Behandeln Sie die Scripts von `package.json` als einzige Quelle der Wahrheit.

## 4. Core Architecture (Kernarchitektur)

### Gesamtstruktur

```
Client → Express Router → Service → Prisma → PostgreSQL
```

### Datenfluss

1. Anfrage erreicht den Router.
2. Middleware validiert die Authentifizierung.
3. Service führt die Geschäftslogik aus.
4. Prisma liest/schreibt die DB.
5. Antwort wird serialisiert.

### Kernmuster

- **Schichtenweise**: router → service → repository.
- **DTO-Validierung**: zod-Schemas an der Router-Grenze.
- **Fehler-Middleware**: zentrale Fehlerbehandlung.

## 5. Directory Structure (Verzeichnisstruktur)

```
sample-project/
├─ src/
└─ tests/
```

**Automatisch generiert**: keine.
**Testumfang**: `tests/` spiegelt `src/` wider.
**Build-Ausgabe**: `dist/`.

## 6. Standard / Rules / Skills Reference (Standard / Rules / Skills Referenz)

### Standard (Einzige Quelle der Wahrheit)

| Pfad | Beschreibung |
|---|---|
| `claudeos-core/standard/00.core/01.project-overview.md` | Projektübersicht |
| `claudeos-core/standard/00.core/04.doc-writing-guide.md` | Dokument-Schreibanleitung |

### Rules (Automatisch geladene Leitplanken)

| Pfad | Beschreibung |
|---|---|
| `.claude/rules/00.core/*` | Kernregeln |
| `.claude/rules/60.memory/*` | L4-Speicher-Leitplanken |

### Skills (Automatisierte Verfahren)

- `claudeos-core/skills/00.shared/MANIFEST.md`

## 7. DO NOT Read (NICHT lesen)

| Pfad | Grund |
|---|---|
| `claudeos-core/guide/` | Dokumentation für Menschen |
| `dist/` | Build-Ausgabe |
| `node_modules/` | Abhängigkeiten |

## 8. Common Rules & Memory (L4) (Allgemeine Regeln und Speicher (L4))

### Allgemeine Regeln (bei jeder Bearbeitung automatisch geladen)

| Regeldatei | Rolle | Kerndurchsetzung |
|---|---|---|
| `.claude/rules/00.core/51.doc-writing-rules.md` | Dokument-Schreibregeln | paths erforderlich, kein Hardcoding |
| `.claude/rules/00.core/52.ai-work-rules.md` | KI-Arbeitsregeln | fakten-basiert, Read vor Bearbeitung |

Für detaillierte Anleitung lesen Sie `claudeos-core/standard/00.core/04.doc-writing-guide.md`.

### L4-Speicher (On-Demand-Referenz)

Langfristiger Kontext (Entscheidungen · Fehler · Verdichtung · Auto-Vorschläge) wird in `claudeos-core/memory/` gespeichert.
Im Gegensatz zu Regeln, die über `paths`-Glob automatisch geladen werden, wird diese Schicht **bei Bedarf** referenziert.

#### L4-Speicherdateien

| Datei | Zweck | Verhalten |
|---|---|---|
| `claudeos-core/memory/decision-log.md` | Warum hinter Designentscheidungen | Nur-Anhängen. Zu Sitzungsbeginn überfliegen. |
| `claudeos-core/memory/failure-patterns.md` | Wiederholte Fehler | Zu Sitzungsbeginn suchen. |
| `claudeos-core/memory/compaction.md` | 4-stufige Verdichtungsrichtlinie | Nur bei Richtlinienänderung ändern. |
| `claudeos-core/memory/auto-rule-update.md` | Regeländerungsvorschläge | Überprüfen und akzeptieren. |

#### Speicher-Arbeitsablauf

1. failure-patterns zu Sitzungsbeginn scannen.
2. Aktuelle Entscheidungen überfliegen.
3. Neue Entscheidungen als Anhang erfassen.
4. Wiederholte Fehler mit pattern-id registrieren.
5. compact ausführen, wenn Dateien 400 Zeilen nähern.
6. rule-update-Vorschläge überprüfen.
