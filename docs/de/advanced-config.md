# Erweiterte Konfiguration — `.claudeos-scan.json`

Bei ungewöhnlichen Projektlayouts lässt sich das Verhalten des Frontend-Scanners über eine `.claudeos-scan.json`-Datei im Projekt-Root überschreiben.

Das ist Stoff für fortgeschrittene Nutzer. Die meisten Projekte brauchen das nicht. Die Auto-Erkennung läuft ohne Konfiguration.

> Englisches Original: [docs/advanced-config.md](../advanced-config.md). Die deutsche Übersetzung wird mit der englischen Version synchron gehalten.

---

## Was `.claudeos-scan.json` tut (und nicht tut)

**Tut:**
- Erweitert die Plattform-/Subapp-Erkennung des Frontend-Scanners um zusätzliche Schlüsselwörter oder Skip-Namen.
- Passt den Schwellenwert dafür an, was als echter Subapp zählt.
- Erzwingt Subapp-Emission in Single-Plattform-Projekten.

**Tut NICHT:**
- Einen bestimmten Stack erzwingen (die Stack-Erkennung läuft vorher und ist nicht konfigurierbar).
- Eigene Standardausgabesprachen einführen.
- Global ignorierte Pfade konfigurieren (der Frontend-Scanner hat seine eigene eingebaute Ignore-Liste).
- Backend-Scanner konfigurieren (Java, Kotlin, Python usw. lesen diese Datei nicht).
- Dateien als „preserved" markieren (diesen Mechanismus gibt es nicht).

Falls in älteren Docs Felder wie `stack`, `ignorePaths`, `preserve`, `defaultPort`, `language` oder `subapps` auftauchen: nicht implementiert. Der wirklich unterstützte Feldsatz ist klein und liegt komplett unter `frontendScan`.

---

## Dateiformat

```json
{
  "frontendScan": {
    "platformKeywords": ["custom-platform"],
    "skipSubappNames": ["legacy-app"],
    "minSubappFiles": 3,
    "forceSubappSplit": false
  }
}
```

Alle vier Felder sind optional. Der Scanner liest die Datei via `JSON.parse`. Fehlt die Datei oder ist das JSON ungültig, fällt das Scannen still auf Defaults zurück.

---

## Feldreferenz (Frontend-Scanner)

### `frontendScan.platformKeywords` — zusätzliche Plattform-Schlüsselwörter (String-Array)

Der Frontend-Scanner erkennt Layouts der Form `src/{platform}/{subapp}/`, wobei `{platform}` einem dieser Defaults entspricht:

```
desktop, pc, web,
mobile, mc, mo, sp,
tablet, tab, pwa,
tv, ctv, ott,
watch, wear,
admin, cms, backoffice, back-office, portal
```

Mit `platformKeywords` lässt sich diese Default-Liste erweitern (nicht ersetzen):

```json
{
  "frontendScan": {
    "platformKeywords": ["kiosk", "embedded", "internal"]
  }
}
```

Nach diesem Override gilt `src/kiosk/checkout/` als Plattform-Subapp-Paar und landet als Domäne `kiosk-checkout` in der Ausgabe.

**Hinweis:** Die Abkürzung `adm` bleibt absichtlich aus den Defaults raus (isoliert zu mehrdeutig). Wenn ein Projekt `src/adm/` als Admin-Tier-Root nutzt: entweder in `admin` umbenennen oder `"adm"` zu `platformKeywords` hinzufügen.

### `frontendScan.skipSubappNames` — zusätzlich zu überspringende Namen (String-Array)

Der Scanner überspringt bekannte Infrastruktur- und Strukturverzeichnisnamen auf Subapp-Ebene, damit sie nicht als Domänen ausgegeben werden:

```
assets, common, shared, utils, util,
lib, libs, config, constants, helpers, types,
test, tests, __mocks__, mocks, __tests__,
components, hooks, layouts, layout,
widgets, features, entities,
app, pages, routes, views, screens, containers,
modules, domains
```

Mit `skipSubappNames` lässt sich die Skip-Liste erweitern:

```json
{
  "frontendScan": {
    "skipSubappNames": ["legacy-admin", "deprecated-api", "vendor"]
  }
}
```

Nach diesem Override ignoriert der Scanner Verzeichnisse mit diesen Namen beim Subapp-Scan.

### `frontendScan.minSubappFiles` — Mindestanzahl Dateien für eine Subapp (Zahl, Default 2)

Ein Verzeichnis mit nur einer Datei unter einer Plattform-Wurzel ist meist eine versehentliche Fixture oder ein Platzhalter, kein echter Subapp. Der Default-Mindestwert ist 2. Override, falls die Projektstruktur abweicht:

```json
{
  "frontendScan": {
    "minSubappFiles": 3
  }
}
```

Den Wert auf `1` zu setzen würde 1-Datei-Subapps ausgeben (im Pass-1-Gruppenplan vermutlich rauschig).

### `frontendScan.forceSubappSplit` — Single-SPA-Skip ausschalten (Boolean, Default false)

Der Scanner hat eine **Single-SPA-Skip-Regel**: Matcht im Projekt-Tree nur EIN Plattform-Schlüsselwort (etwa `src/admin/api/`, `src/admin/dto/`, `src/admin/routers/`, aber keine weiteren Plattformen), entfällt die Subapp-Emission. Das verhindert, dass Architektur-Layer fragmentiert werden.

Dieser Default passt für Single-Plattform-SPAs, ist aber falsch für Projekte, die die Unterordner einer einzigen Plattform bewusst als Feature-Domains nutzen. Zum Ausschalten:

```json
{
  "frontendScan": {
    "forceSubappSplit": true
  }
}
```

Nur einsetzen, wenn die Unterordner der einzigen Plattform-Wurzel wirklich unabhängige Feature-Subapps sind.

---

## Beispiele

### Eigene Plattform-Schlüsselwörter ergänzen

```json
{
  "frontendScan": {
    "platformKeywords": ["embedded", "kiosk"]
  }
}
```

Ein Projekt mit `src/embedded/dashboard/` liefert jetzt `embedded-dashboard` als Domäne.

### Vendored- oder Legacy-Verzeichnisse überspringen

```json
{
  "frontendScan": {
    "skipSubappNames": ["legacy-admin", "vendor", "old-portal"]
  }
}
```

Verzeichnisse mit diesen Namen ignoriert der Scanner, selbst wenn sie unter einer Plattform-Wurzel liegen.

### Single-Plattform-Projekt, das trotzdem Subapp-Emission will

```json
{
  "frontendScan": {
    "forceSubappSplit": true,
    "minSubappFiles": 3
  }
}
```

Umgeht die Single-SPA-Skip-Regel. In Kombination mit hohem `minSubappFiles` filtert das Rauschen heraus.

### NX-Angular-Monorepo mit übersprungenen Legacy-Apps

```json
{
  "frontendScan": {
    "skipSubappNames": ["legacy-admin", "old-portal"]
  }
}
```

Der Angular-Scanner kümmert sich automatisch um NX-Monorepos. Die Skip-Liste hält die genannten Legacy-Apps aus der Domain-Liste.

---

## Was in dieser Datei lebt, was nicht

Falls ein älteres Dokument Felder beschreibt, die hier fehlen: Diese Felder existieren nicht. Der Code, der `.claudeos-scan.json` liest, liegt in:

- `plan-installer/scanners/scan-frontend.js`: `loadScanOverrides()`

Das ist der einzige Ort. Backend-Scanner und Orchestrator lesen die Datei nicht.

Wer eine Konfigurationsoption braucht, die nicht existiert: [Issue öffnen](https://github.com/claudeos-core/claudeos-core/issues) und Projektstruktur plus gewünschtes Tool-Verhalten beschreiben.

---

## Siehe auch

- [stacks.md](stacks.md): was die Auto-Erkennung per Default abdeckt
- [troubleshooting.md](troubleshooting.md): wenn die Scanner-Erkennung danebengreift
