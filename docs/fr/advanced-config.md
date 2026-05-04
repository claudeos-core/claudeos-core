# Configuration avancée — `.claudeos-scan.json`

Pour les layouts de projet inhabituels, on peut override le comportement du scanner frontend via un fichier `.claudeos-scan.json` à la racine du projet.

Réservé aux utilisateurs avancés. La plupart des projets n'en ont pas besoin : l'auto-détection est conçue pour fonctionner sans configuration.

> Original anglais : [docs/advanced-config.md](../advanced-config.md). La traduction française est maintenue synchronisée avec l'anglais.

---

## Ce que `.claudeos-scan.json` fait (et ne fait pas)

**Ce qu'il fait :**
- Étend la reconnaissance platform/subapp du scanner frontend avec des mots-clés ou skip names supplémentaires.
- Ajuste le seuil de ce qui compte comme un vrai subapp.
- Force l'émission de subapp dans les projets single-platform.

**Ce qu'il ne fait PAS :**
- Forcer un stack spécifique (la détection de stack du scanner s'exécute en premier et n'est pas configurable).
- Ajouter des défauts custom de langue de sortie.
- Configurer des paths ignorés globalement (le scanner frontend a sa propre liste d'ignore intégrée).
- Configurer les scanners backend (Java, Kotlin, Python, etc. ne lisent pas ce fichier).
- Marquer des fichiers comme « préservés » (pas de mécanisme de ce type).

Si une vieille doc mentionne des champs comme `stack`, `ignorePaths`, `preserve`, `defaultPort`, `language`, ou `subapps` : non implémentés. L'ensemble réel de champs supportés est petit et vit entièrement sous `frontendScan`.

---

## Format de fichier

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

Les quatre champs sont optionnels. Le scanner lit le fichier via `JSON.parse`. Fichier manquant ou JSON invalide : le scan retombe silencieusement sur les défauts.

---

## Référence des champs (scanner frontend)

### `frontendScan.platformKeywords` — mots-clés platform additionnels (string array)

Le scanner frontend détecte les layouts `src/{platform}/{subapp}/` où `{platform}` matche l'un de ces défauts :

```
desktop, pc, web,
mobile, mc, mo, sp,
tablet, tab, pwa,
tv, ctv, ott,
watch, wear,
admin, cms, backoffice, back-office, portal
```

`platformKeywords` étend (sans remplacer) cette liste par défaut :

```json
{
  "frontendScan": {
    "platformKeywords": ["kiosk", "embedded", "internal"]
  }
}
```

Après cet override, `src/kiosk/checkout/` est reconnu comme paire platform-subapp et émis comme domaine `kiosk-checkout`.

**Note :** l'abréviation `adm` est délibérément exclue des défauts (trop ambiguë en isolation). Si le projet utilise `src/adm/` comme racine de tier admin, soit renommez en `admin`, soit ajoutez `"adm"` à `platformKeywords`.

### `frontendScan.skipSubappNames` — noms additionnels à skipper (string array)

Le scanner saute les noms de répertoires connus comme infrastructure / structurels au niveau subapp, pour ne pas les émettre comme domaines :

```
assets, common, shared, utils, util,
lib, libs, config, constants, helpers, types,
test, tests, __mocks__, mocks, __tests__,
components, hooks, layouts, layout,
widgets, features, entities,
app, pages, routes, views, screens, containers,
modules, domains
```

`skipSubappNames` étend la skip list :

```json
{
  "frontendScan": {
    "skipSubappNames": ["legacy-admin", "deprecated-api", "vendor"]
  }
}
```

Après cet override, les répertoires matchant ces noms sont ignorés pendant le scan de subapp.

### `frontendScan.minSubappFiles` — nombre min de fichiers pour qualifier un subapp (number, default 2)

Un répertoire à fichier unique sous une racine platform est généralement un fixture accidentel ou un placeholder, pas un vrai subapp. Le minimum par défaut est 2 fichiers. Override si la structure du projet diffère :

```json
{
  "frontendScan": {
    "minSubappFiles": 3
  }
}
```

Mettre à `1` émettrait des subapps à 1 fichier (probablement bruyant dans le group plan de Pass 1).

### `frontendScan.forceSubappSplit` — opt out du single-SPA skip (boolean, default false)

Le scanner a une **single-SPA skip rule** : quand un seul mot-clé platform distinct matche dans tout le projet (par ex. le projet a `src/admin/api/`, `src/admin/dto/`, `src/admin/routers/` mais aucune autre platform), l'émission de subapp est sautée pour éviter de fragmenter des couches architecturales.

Ce défaut est correct pour les SPAs single-platform mais faux pour les projets qui utilisent intentionnellement les enfants d'une platform unique comme feature domains. Pour opt out :

```json
{
  "frontendScan": {
    "forceSubappSplit": true
  }
}
```

À utiliser uniquement si vous êtes sûr que les enfants de la racine platform unique sont vraiment des feature subapps indépendants.

---

## Exemples

### Ajouter des mots-clés platform custom

```json
{
  "frontendScan": {
    "platformKeywords": ["embedded", "kiosk"]
  }
}
```

Un projet avec `src/embedded/dashboard/` émettra désormais `embedded-dashboard` comme domaine.

### Skipper des répertoires vendorés ou legacy

```json
{
  "frontendScan": {
    "skipSubappNames": ["legacy-admin", "vendor", "old-portal"]
  }
}
```

Les répertoires portant ces noms sont ignorés pendant le scan, même sous une racine platform.

### Projet single-platform qui veut quand même l'émission de subapp

```json
{
  "frontendScan": {
    "forceSubappSplit": true,
    "minSubappFiles": 3
  }
}
```

Bypasse la single-SPA skip rule. Combinez à un `minSubappFiles` élevé pour filtrer le bruit.

### Monorepo NX Angular skippant des apps legacy

```json
{
  "frontendScan": {
    "skipSubappNames": ["legacy-admin", "old-portal"]
  }
}
```

Le scanner Angular gère déjà les monorepos NX automatiquement. La skip list écarte des apps legacy nommées de la domain list.

---

## Ce qui vit dans ce fichier vs ce qui n'y vit pas

Une vieille doc décrit des champs absents de cette liste ? Ces champs n'existent pas. Le code réel qui lit `.claudeos-scan.json` est dans :

- `plan-installer/scanners/scan-frontend.js` : `loadScanOverrides()`

Seul endroit. Les scanners backend et l'orchestrator ne lisent pas ce fichier.

Besoin d'une option de configuration qui n'existe pas ? [Ouvrez une issue](https://github.com/claudeos-core/claudeos-core/issues) décrivant la structure du projet et le comportement souhaité.

---

## Voir aussi

- [stacks.md](stacks.md) : ce que l'auto-détection capte par défaut
- [troubleshooting.md](troubleshooting.md) : quand la détection du scanner se trompe
