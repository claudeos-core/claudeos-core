# Configuración avanzada — `.claudeos-scan.json`

Para layouts de proyecto inusuales, puedes anular el comportamiento del scanner frontend con un archivo `.claudeos-scan.json` en la raíz de tu proyecto.

Esto es para usuarios avanzados. Casi ningún proyecto lo necesita: la auto-detección está pensada para funcionar sin configuración.

> Original en inglés: [docs/advanced-config.md](../advanced-config.md). La traducción al español se mantiene sincronizada con el inglés.

---

## Lo que `.claudeos-scan.json` hace (y no hace)

**Hace:**
- Extiende el reconocimiento de plataforma/subapp del scanner frontend con palabras clave o nombres de skip adicionales.
- Ajusta el umbral de lo que cuenta como subapp real.
- Fuerza emisión de subapp en proyectos de plataforma única.

**NO hace:**
- Forzar un stack específico (la detección de stack del scanner corre primero y no es configurable).
- Agregar defaults personalizados de idioma de salida.
- Configurar paths ignorados globalmente (el scanner frontend tiene su propia ignore list built-in).
- Configurar scanners backend (Java, Kotlin, Python, etc. no leen este archivo).
- Marcar archivos como "preservados" (no existe ese mecanismo).

Si viste docs antiguos describiendo campos como `stack`, `ignorePaths`, `preserve`, `defaultPort`, `language` o `subapps`, ninguno está implementado. El conjunto real de campos soportados es pequeño y vive entero bajo `frontendScan`.

---

## Formato del archivo

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

Los cuatro campos son opcionales. El scanner lee el archivo con `JSON.parse`; si el archivo falta o es JSON inválido, el escaneo cae en silencio a defaults.

---

## Referencia de campos (scanner frontend)

### `frontendScan.platformKeywords` — palabras clave de plataforma adicionales (string array)

El scanner frontend detecta layouts `src/{platform}/{subapp}/` donde `{platform}` matchea con uno de estos defaults:

```
desktop, pc, web,
mobile, mc, mo, sp,
tablet, tab, pwa,
tv, ctv, ott,
watch, wear,
admin, cms, backoffice, back-office, portal
```

Usa `platformKeywords` para extender (no reemplazar) esta lista default:

```json
{
  "frontendScan": {
    "platformKeywords": ["kiosk", "embedded", "internal"]
  }
}
```

Tras este override, `src/kiosk/checkout/` queda reconocido como par platform-subapp y se emite como el dominio `kiosk-checkout`.

**Nota:** la abreviación `adm` se excluye a propósito de los defaults (demasiado ambigua aislada). Si tu proyecto usa `src/adm/` como root de tier admin, o lo renombras a `admin`, o agregas `"adm"` a `platformKeywords`.

### `frontendScan.skipSubappNames` — nombres adicionales para saltar (string array)

El scanner se salta nombres conocidos de directorios de infraestructura o estructurales a nivel subapp para que no se emitan como dominios:

```
assets, common, shared, utils, util,
lib, libs, config, constants, helpers, types,
test, tests, __mocks__, mocks, __tests__,
components, hooks, layouts, layout,
widgets, features, entities,
app, pages, routes, views, screens, containers,
modules, domains
```

Usa `skipSubappNames` para extender la lista de skip:

```json
{
  "frontendScan": {
    "skipSubappNames": ["legacy-admin", "deprecated-api", "vendor"]
  }
}
```

Tras este override, los directorios que matcheen esos nombres se ignoran durante el escaneo de subapp.

### `frontendScan.minSubappFiles` — archivos mínimos para calificar como subapp (number, default 2)

Un directorio de un solo archivo bajo un root de plataforma suele ser un fixture o placeholder accidental, no un subapp real. El mínimo default es 2 archivos. Override si la estructura de tu proyecto difiere:

```json
{
  "frontendScan": {
    "minSubappFiles": 3
  }
}
```

Ponerlo en `1` emitiría subapps de 1 archivo (probablemente ruidoso en el plan de grupo de Pass 1).

### `frontendScan.forceSubappSplit` — opt out del single-SPA skip (boolean, default false)

El scanner tiene una **regla single-SPA skip**: cuando solo UNA palabra clave distinta de plataforma matchea en el proyecto (por ejemplo, tiene `src/admin/api/`, `src/admin/dto/`, `src/admin/routers/` pero ninguna otra plataforma), la emisión de subapp se salta para evitar fragmentar la capa arquitectónica.

Este default es correcto para SPAs de plataforma única, pero equivocado en proyectos que a propósito usan los hijos de una sola plataforma como dominios feature. Para optar por desactivarlo:

```json
{
  "frontendScan": {
    "forceSubappSplit": true
  }
}
```

Usa esto solo cuando estés seguro de que los hijos de tu único root de plataforma realmente son subapps feature independientes.

---

## Ejemplos

### Agregar palabras clave de plataforma personalizadas

```json
{
  "frontendScan": {
    "platformKeywords": ["embedded", "kiosk"]
  }
}
```

Un proyecto con `src/embedded/dashboard/` ahora emite `embedded-dashboard` como dominio.

### Saltar directorios vendored o legacy

```json
{
  "frontendScan": {
    "skipSubappNames": ["legacy-admin", "vendor", "old-portal"]
  }
}
```

Los directorios con esos nombres se ignoran durante el escaneo, incluso si están bajo un root de plataforma.

### Proyecto de plataforma única que igualmente quiere emisión de subapp

```json
{
  "frontendScan": {
    "forceSubappSplit": true,
    "minSubappFiles": 3
  }
}
```

Saltea la regla single-SPA skip. Combínalo con un `minSubappFiles` alto para filtrar ruido.

### Monorepo NX Angular saltando apps legacy

```json
{
  "frontendScan": {
    "skipSubappNames": ["legacy-admin", "old-portal"]
  }
}
```

El scanner Angular ya maneja monorepos NX de forma automática. La skip list deja las apps legacy nombradas fuera de la lista de dominios.

---

## Lo que vive en este archivo vs. lo que no

Si encontraste un doc más antiguo describiendo campos que no están en esta lista, esos campos no existen. El código real que lee `.claudeos-scan.json` está en:

- `plan-installer/scanners/scan-frontend.js`: `loadScanOverrides()`

Ese es el único lugar. Los scanners backend y el orquestador no leen este archivo.

Si necesitas una opción de configuración que no existe, [abre un issue](https://github.com/claudeos-core/claudeos-core/issues) describiendo la estructura del proyecto y qué quieres que la herramienta haga.

---

## Ver también

- [stacks.md](stacks.md): qué recoge la auto-detección por defecto
- [troubleshooting.md](troubleshooting.md): cuando la detección del scanner falla
