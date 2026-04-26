# Erweiterte Konfiguration — `.claudeos-scan.json`

Bei ungewöhnlichen Projektlayouts können Sie das Verhalten des Frontend-Scanners über eine `.claudeos-scan.json`-Datei im Projekt-Root überschreiben.

Das ist für fortgeschrittene Nutzer. Die meisten Projekte brauchen es nicht — die Auto-Erkennung ist so ausgelegt, dass sie ohne Konfiguration funktioniert.

> Englisches Original: [docs/advanced-config.md](../advanced-config.md). Die deutsche Übersetzung wird mit der englischen Version synchron gehalten.

---

## Was `.claudeos-scan.json` tut (und nicht tut)

**Tut:**
- Erweitert die Plattform-/Subapp-Erkennung des Frontend-Scanners um zusätzliche Schlüsselwörter oder Skip-Namen.
- Passt den Schwellenwert dafür an, was als echter Subapp gilt.
- Erzwingt die Subapp-Emission in Single-Plattform-Projekten.

**Tut NICHT:**
- Einen bestimmten Stack erzwingen (die Stack-Erkennung des Scanners läuft zuerst und ist nicht konfigurierbar).
- Eigene Standardausgabesprachen hinzufügen.
- Global ignorierte Pfade konfigurieren (der Frontend-Scanner hat seine eigene eingebaute Ignore-Liste).
- Backend-Scanner konfigurieren (Java, Kotlin, Python usw. lesen diese Datei nicht).
- Dateien als „preserved" markieren (so einen Mechanismus gibt es nicht).

Wenn Sie ältere Docs gesehen haben, die Felder wie `stack`, `ignorePaths`, `preserve`, `defaultPort`, `language` oder `subapps` beschreiben — die sind nicht implementiert. Der tatsächlich unterstützte Feldsatz ist klein und liegt vollständig unter `frontendScan`.

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

Alle vier Felder sind optional. Der Scanner liest die Datei via `JSON.parse`; ist die Datei nicht vorhanden oder ungültiges JSON, fällt das Scannen still auf Defaults zurück.

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

Verwenden Sie `platformKeywords`, um diese Default-Liste zu erweitern (nicht zu ersetzen):

```json
{
  "frontendScan": {
    "platformKeywords": ["kiosk", "embedded", "internal"]
  }
}
```

Nach diesem Override wird `src/kiosk/checkout/` als Plattform-Subapp-Paar erkannt und als Domäne `kiosk-checkout` ausgegeben.

**Hinweis:** Die Abkürzung `adm` ist absichtlich aus den Defaults ausgeschlossen (zu mehrdeutig isoliert). Wenn Ihr Projekt `src/adm/` als Admin-Tier-Root nutzt, benennen Sie entweder in `admin` um oder fügen Sie `"adm"` zu `platformKeywords` hinzu.

### `frontendScan.skipSubappNames` — zusätzlich zu überspringende Namen (String-Array)

Der Scanner überspringt bekannte Infrastruktur-/Strukturverzeichnisnamen auf Subapp-Ebene, damit sie nicht als Domänen ausgegeben werden:

```
assets, common, shared, utils, util,
lib, libs, config, constants, helpers, types,
test, tests, __mocks__, mocks, __tests__,
components, hooks, layouts, layout,
widgets, features, entities,
app, pages, routes, views, screens, containers,
modules, domains
```

Verwenden Sie `skipSubappNames`, um die Skip-Liste zu erweitern:

```json
{
  "frontendScan": {
    "skipSubappNames": ["legacy-admin", "deprecated-api", "vendor"]
  }
}
```

Nach diesem Override werden Verzeichnisse mit diesen Namen während des Subapp-Scannens ignoriert.

### `frontendScan.minSubappFiles` — Mindestanzahl Dateien, um als Subapp zu zählen (Zahl, Default 2)

Ein Verzeichnis mit nur einer Datei unter einer Plattform-Wurzel ist meist eine versehentliche Fixture oder ein Platzhalter, kein echter Subapp. Der Default-Mindestwert ist 2. Override, falls Ihre Projektstruktur abweicht:

```json
{
  "frontendScan": {
    "minSubappFiles": 3
  }
}
```

Den Wert auf `1` zu setzen würde 1-Datei-Subapps ausgeben (im Pass-1-Gruppenplan vermutlich rauschig).

### `frontendScan.forceSubappSplit` — Single-SPA-Skip ausschalten (Boolean, Default false)

Der Scanner hat eine **Single-SPA-Skip-Regel**: Matcht im Projekt-Tree nur EIN Plattform-Schlüsselwort (z. B. das Projekt hat `src/admin/api/`, `src/admin/dto/`, `src/admin/routers/`, aber keine weiteren Plattformen), wird die Subapp-Emission übersprungen, um Architektur-Layer-Fragmentierung zu vermeiden.

Dieser Default ist für Single-Plattform-SPAs korrekt, aber falsch für Projekte, die die Kinder einer einzigen Plattform absichtlich als Feature-Domains nutzen. Zum Ausschalten:

```json
{
  "frontendScan": {
    "forceSubappSplit": true
  }
}
```

Verwenden Sie das nur, wenn Sie sicher sind, dass die Kinder Ihrer einzigen Plattform-Wurzel wirklich unabhängige Feature-Subapps sind.

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

Ein Projekt mit `src/embedded/dashboard/` gibt jetzt `embedded-dashboard` als Domäne aus.

### Vendored- oder Legacy-Verzeichnisse überspringen

```json
{
  "frontendScan": {
    "skipSubappNames": ["legacy-admin", "vendor", "old-portal"]
  }
}
```

Verzeichnisse mit diesen Namen werden beim Scannen ignoriert, selbst wenn sie unter einer Plattform-Wurzel liegen.

### Single-Plattform-Projekt, das trotzdem Subapp-Emission will

```json
{
  "frontendScan": {
    "forceSubappSplit": true,
    "minSubappFiles": 3
  }
}
```

Umgeht die Single-SPA-Skip-Regel. Mit hohem `minSubappFiles` kombinieren, um Rauschen herauszufiltern.

### NX-Angular-Monorepo, das Legacy-Apps überspringt

```json
{
  "frontendScan": {
    "skipSubappNames": ["legacy-admin", "old-portal"]
  }
}
```

Der Angular-Scanner kümmert sich automatisch um NX-Monorepos. Die Skip-Liste hält benannte Legacy-Apps aus der Domain-Liste.

---

## Was in dieser Datei lebt — und was nicht

Wenn Sie ein älteres Dokument gefunden haben, das Felder beschreibt, die nicht in dieser Liste stehen, existieren diese Felder nicht. Der eigentliche Code, der `.claudeos-scan.json` liest, liegt in:

- `plan-installer/scanners/scan-frontend.js` — `loadScanOverrides()`

Das ist der einzige Ort. Backend-Scanner und der Orchestrator lesen diese Datei nicht.

Wenn Sie eine Konfigurationsoption brauchen, die nicht existiert, [öffnen Sie ein Issue](https://github.com/claudeos-core/claudeos-core/issues), das die Projektstruktur und das gewünschte Tool-Verhalten beschreibt.

---

## Siehe auch

- [stacks.md](stacks.md) — was die Auto-Erkennung per Default abdeckt
- [troubleshooting.md](troubleshooting.md) — wenn die Scanner-Erkennung danebengreift
