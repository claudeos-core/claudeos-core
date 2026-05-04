# Stacks supportés

12 stacks, tous auto-détectés depuis tes fichiers projet. **8 backend** + **4 frontend**.

Cette page décrit comment chaque stack est détecté et ce que le scanner par stack extrait. Pratique pour :

- Vérifier si ton stack est supporté.
- Comprendre quels faits le scanner remontera à Claude avant de générer la doc.
- Voir à quoi s'attendre dans `claudeos-core/generated/project-analysis.json`.

Si ta structure de projet sort de l'ordinaire, voir [advanced-config.md](advanced-config.md) pour les overrides `.claudeos-scan.json`.

> Original anglais : [docs/stacks.md](../stacks.md). La traduction française est maintenue synchronisée avec l'anglais.

---

## Comment marche la détection

Quand `init` tourne, le scanner ouvre ces fichiers à la racine du projet à peu près dans cet ordre :

| Fichier | Ce qu'il dit au scanner |
|---|---|
| `package.json` | Projet Node.js ; framework via `dependencies` |
| `pom.xml` | Projet Java/Maven |
| `build.gradle` / `build.gradle.kts` | Projet Java/Kotlin Gradle |
| `pyproject.toml` / `requirements.txt` | Projet Python ; framework via packages |
| `angular.json` | Projet Angular |
| `nuxt.config.{ts,js}` | Projet Vue/Nuxt |
| `next.config.{ts,js}` | Projet Next.js |
| `vite.config.{ts,js}` | Projet Vite |

Si rien ne matche, `init` s'arrête sur une erreur claire plutôt que de deviner. (Pas de fallback prompt-the-LLM-to-figure-it-out. Mieux vaut échouer bruyamment que produire silencieusement une doc incorrecte.)

Le scanner est dans `plan-installer/stack-detector.js` si tu veux lire la logique de détection réelle.

---

## Backend stacks (8)

### Java / Spring Boot

**Détecté quand :** `build.gradle` ou `pom.xml` contient `spring-boot-starter`. Java est identifié à part de Kotlin via le bloc plugin Gradle.

**Détection du pattern d'architecture.** Le scanner classe ton projet dans **un des 5 patterns** :

| Pattern | Exemple de structure |
|---|---|
| **A. Layer-first** | `controller/order/`, `service/order/`, `repository/order/` |
| **B. Domain-first** | `order/controller/`, `order/service/`, `order/repository/` |
| **C. Layer-then-domain** | `controller/order/sub1/`, `service/order/sub2/` |
| **D. Domain-then-layer** | `order/sub1/controller/`, `order/sub2/service/` |
| **E. Hexagonal / DDD** | `domain/`, `application/`, `infrastructure/`, `presentation/` |

Les patterns sont essayés dans l'ordre (A → B/D → E → C). Le scanner ajoute deux raffinements : (1) **détection du root-package** prend le préfixe de package le plus long qui couvre ≥80 % des fichiers porteurs de couche (déterministe entre les réexécutions) ; (2) **deep-sweep fallback** pour Pattern B/D : quand les globs standard renvoient zéro fichier pour un domaine enregistré, le scanner re-globalise `**/${domain}/**/*.java` et parcourt le path de chaque fichier pour trouver le répertoire de couche le plus proche, attrapant les layouts à couplage cross-domaine comme `core/{otherDomain}/{layer}/{domain}/`.

**Faits extraits :**
- Stack, version du framework, ORM (JPA / MyBatis / jOOQ)
- Type de DB (Postgres / MySQL / Oracle / MariaDB / H2 ; la détection H2 utilise une regex word-boundary `\bh2\b` pour éviter les faux-positifs sur `oauth2`, `cache2k`, etc.)
- Package manager (Gradle / Maven), build tool, logger (Logback / Log4j2)
- Domain list avec compte de fichiers (controllers, services, mappers, dtos, MyBatis XML mappers)

Le scanner est dans `plan-installer/scanners/scan-java.js`.

---

### Kotlin / Spring Boot

**Détecté quand :** `build.gradle.kts` est présent et le plugin Kotlin est appliqué aux côtés de Spring Boot. Chemin de code totalement séparé de Java, sans réutilisation des patterns Java.

**Détecte spécifiquement :**
- **CQRS** : packages command/query séparés
- **BFF** : pattern backend-for-frontend
- **Multi-module Gradle** : `settings.gradle.kts` avec `include(":module")`
- **Domains query partagés entre modules** : `resolveSharedQueryDomains()` redistribue les fichiers du module query partagé via décomposition package/class-name

**ORMs supportés :** Exposed, jOOQ, JPA (Hibernate), R2DBC.

**Pourquoi Kotlin a son propre scanner :** les patterns Java collent mal aux codebases Kotlin. Les projets Kotlin tendent vers des configurations CQRS et multi-module que la classification A-à-E de Java ne sait pas représenter proprement.

Le scanner est dans `plan-installer/scanners/scan-kotlin.js`.

---

### Node / Express

**Détecté quand :** `express` est dans les dependencies de `package.json`.

**Le stack detector identifie :** ORM (Prisma / TypeORM / Sequelize / Drizzle / Knex / Mongoose), type de DB, package manager (npm / yarn / pnpm), usage de TypeScript.

**Domain discovery :** le scanner Node.js partagé (`plan-installer/scanners/scan-node.js`) parcourt `src/*/` (ou `src/modules/*/` si des modules style NestJS existent), compte les fichiers matchant `controller|router|route|handler`, `service`, `dto|schema|type` et les patterns entity/module/guard/pipe/interceptor. Le même chemin de code de scanner sert pour Express, Fastify et NestJS. Le nom du framework détermine quel prompt Pass 1 est sélectionné, pas quel scanner tourne.

---

### Node / Fastify

**Détecté quand :** `fastify` est dans les dependencies.

Le domain discovery passe par le même scanner partagé `scan-node.js` décrit ci-dessus. Pass 1 utilise un template de prompt spécifique à Fastify qui demande à Claude de chercher les patterns plugin et schemas de routes de Fastify.

---

### Node / NestJS

**Détecté quand :** `@nestjs/core` est dans les dependencies.

Le domain discovery passe par le scanner partagé `scan-node.js`. Le layout standard NestJS `src/modules/<module>/` est détecté automatiquement (préféré à `src/*/` quand les deux existent) et chaque module devient un domaine. Pass 1 utilise un template de prompt spécifique à NestJS.

---

### Python / Django

**Détecté quand :** la sous-chaîne `django` (lowercase) apparaît dans `requirements.txt` ou `pyproject.toml`. Les déclarations standard de package-manager utilisent lowercase, donc ça matche les projets typiques.

**Domain discovery :** le scanner parcourt `**/models.py` et traite chaque répertoire contenant `models.py` comme une app/domaine Django. (Il ne parse pas `INSTALLED_APPS` depuis `settings.py` ; la présence de `models.py` sur disque est le signal.)

**Stats par domaine :** compte les fichiers matchant `views`, `models`, `serializers`, `admin`, `forms`, `urls`, `tasks`.

---

### Python / FastAPI

**Détecté quand :** `fastapi` est dans les dependencies.

**Domain discovery :** glob `**/{router,routes,endpoints}*.py` ; chaque répertoire parent unique devient un domaine. Le scanner ne parse pas les appels `APIRouter(...)`, le nom de fichier suffit comme signal.

**ORMs détectés par stack-detector :** SQLAlchemy, Tortoise ORM.

---

### Python / Flask

**Détecté quand :** `flask` est dans les dependencies.

**Domain discovery :** même glob `**/{router,routes,endpoints}*.py` que FastAPI. Si ça ne donne rien, le scanner retombe sur les répertoires `{app,src/app}/*/`.

**Flat-project fallback (v1.7.1) :** sans candidat de domaine, le scanner cherche `{main,app}.py` à la racine du projet et traite le projet comme une « app » à domaine unique.

---

## Frontend stacks (4)

### Node / Next.js

**Détecté quand :** `next.config.{ts,js}` existe, OU `next` est dans les dependencies de `package.json`.

**Détecte la convention de routing :**

- **App Router** (Next.js 13+) : répertoire `app/` avec `page.tsx`/`layout.tsx`
- **Pages Router** (legacy) : répertoire `pages/`
- **FSD (Feature-Sliced Design)** : `src/features/`, `src/widgets/`, `src/entities/`

**Le scanner extrait :**
- Mode de routing (App Router / Pages Router / FSD)
- Comptes RSC vs Client component (Next.js App Router : en comptant les fichiers dont le nom contient `client.` comme `client.tsx`, pas en parsant les directives `"use client"` à l'intérieur du source)
- Domain list depuis `app/` ou `pages/` (et `src/features/` etc. pour FSD)

State management, styling et data-fetching libraries ne sont pas détectés au niveau du scanner. Les prompts Pass 1 demandent à Claude de chercher ces patterns dans le code source à la place.

---

### Node / Vite

**Détecté quand :** `vite.config.{ts,js}` existe, OU `vite` est dans les dependencies.

Le port par défaut est `5173` (convention Vite), appliqué en fallback de dernier recours. Le scanner ne parse pas `vite.config` pour `server.port` ; si ton projet déclare un port dans `.env*`, l'env-parser le récupère en premier.

Le stack detector identifie Vite lui-même. Le framework UI sous-jacent (quand ce n'est pas React, le fallback par défaut) est identifié par le LLM en Pass 1 depuis le code source, pas par le scanner.

---

### Angular

**Détecté quand :** `angular.json` est présent, OU `@angular/core` est dans les dependencies.

**Détecte :**
- Structure **feature module** : `src/app/<feature>/`
- **Monorepo workspaces** : patterns génériques `apps/*/src/app/*/` et `packages/*/src/app/*/` (fonctionne pour les layouts NX même si `nx.json` n'est pas un signal de détection explicite)

Le port par défaut est `4200` (convention Angular), appliqué en fallback de dernier recours. Le scanner lit `angular.json` uniquement pour la détection de stack, pas pour l'extraction de port ; si ton projet déclare le port dans un fichier `.env*`, l'env-parser le récupère en premier.

---

### Vue / Nuxt

**Détecté quand :** `nuxt.config.{ts,js}` existe pour Nuxt, OU `vue` est dans les dependencies pour du Vue simple.

Le scanner identifie le framework et fait tourner l'extraction de domaines frontend (patterns App/Pages/FSD/components). La version Nuxt et la détection de modules (Pinia, VueUse, etc.) sont déléguées à Pass 1 : Claude lit le source et identifie ce qui est utilisé, plutôt que le scanner pattern-matche `package.json`.

---

## Projets multi-stack

Un projet avec backend et frontend (par ex. Spring Boot dans `backend/` + Next.js dans `frontend/`) est totalement supporté.

Chaque stack a son **propre scanner** avec son **propre prompt d'analyse**. La sortie Pass 2 fusionnée couvre les deux stacks. Pass 3 génère des fichiers rule et standard séparés pour chacun, organisés ainsi :

```
.claude/rules/
├── 10.backend/                  ← rules Spring Boot
├── 20.frontend/                 ← rules Next.js
└── 70.domains/
    ├── backend/                 ← par domaine backend
    └── frontend/                ← par domaine frontend

claudeos-core/standard/
├── 10.backend/
├── 20.frontend/
└── 70.domains/
    ├── backend/
    └── frontend/
```

Le typage `70.domains/{type}/` est **toujours actif** : même sur un projet mono-stack, le layout utilise `70.domains/backend/` (ou `frontend/`). Convention uniforme oblige : quand un projet mono-stack ajoute plus tard un second stack, aucune migration nécessaire.

**La détection multi-stack** capte :
- Un manifest monorepo à la racine du projet : `turbo.json`, `pnpm-workspace.yaml`, `lerna.json`
- Un `package.json` racine avec un champ `workspaces`

Quand un monorepo est détecté, le scanner parcourt `apps/*/package.json` et `packages/*/package.json` (plus tous les globs de workspace personnalisés du manifest), fusionne les listes de dépendances et fait tourner les scanners backend et frontend selon les besoins.

---

## Détection platform-split frontend

Certains projets frontend s'organisent par plateforme (PC, mobile, admin) au top level :

```
src/
├── pc/
│   ├── home/
│   └── product/
├── mobile/
│   ├── home/
│   └── checkout/
└── admin/
    ├── users/
    └── reports/
```

Le scanner détecte `src/{platform}/{subapp}/` et émet chaque `{platform}-{subapp}` comme un domaine séparé. Mots-clés platform par défaut :

- **Device / target environment :** `desktop`, `pc`, `web`, `mobile`, `mc`, `mo`, `sp`, `tablet`, `tab`, `pwa`, `tv`, `ctv`, `ott`, `watch`, `wear`
- **Access tier / audience :** `admin`, `cms`, `backoffice`, `back-office`, `portal`

Ajoute des mots-clés personnalisés via `frontendScan.platformKeywords` dans `.claudeos-scan.json` (voir [advanced-config.md](advanced-config.md)).

**Single-SPA skip rule (v2.3.0) :** si UN seul mot-clé platform matche dans tout l'arbre projet (le projet a `src/admin/api/`, `src/admin/dto/`, `src/admin/routers/` sans autres platforms), l'émission de subapp saute. Sinon, des couches architecturales (`api`, `dto`, `routers`) sortiraient à tort comme feature domains.

Pour forcer quand même l'émission de subapp, mets `frontendScan.forceSubappSplit: true` dans `.claudeos-scan.json`. Voir [advanced-config.md](advanced-config.md).

---

## Extraction `.env` (v2.2.0+)

Le scanner lit les fichiers `.env*` pour la configuration runtime, histoire que la doc générée reflète tes vrais port, host et DB URL.

**Ordre de recherche** (premier match gagne) :

1. `.env.example` (canonique, committed)
2. `.env.local.example`
3. `.env.development.example`
4. `.env.sample`
5. `.env.template`
6. `.env`
7. `.env.local`
8. `.env.development`

**Redaction des variables sensibles :** les clés matchant `PASSWORD`, `SECRET`, `TOKEN`, `API_KEY`, `CREDENTIAL`, `PRIVATE_KEY`, `JWT_SECRET`, etc. sont auto-redacted en `***REDACTED***` avant copie dans `project-analysis.json`. **Exception :** `DATABASE_URL` est whitelisté car le scanner a besoin du protocole pour détecter le type de DB.

**Précédence de résolution du port :**
1. `server.port` de `application.yml` Spring Boot
2. Clés port de `.env` (16+ clés de convention vérifiées, ordonnées par spécificité : Vite-spécifique en premier, `PORT` générique en dernier)
3. Stack default (FastAPI/Django=8000, Flask=5000, Vite=5173, Express/NestJS/Fastify=3000, default=8080)

Le parser est dans `lib/env-parser.js`. Les tests sont dans `tests/env-parser.test.js`.

---

## Ce que le scanner produit : `project-analysis.json`

Une fois Step A terminé, ce fichier se trouve à `claudeos-core/generated/project-analysis.json`. Clés top-level (varie selon le stack) :

```json
{
  "stack": {
    "language": "java",
    "framework": "spring-boot",
    "frameworkVersion": "3.2.0",
    "orm": "mybatis",
    "database": "postgres",
    "packageManager": "gradle",
    "buildTool": "gradle",
    "logger": "logback",
    "port": 8080,
    "envInfo": { "source": ".env.example", "vars": {...}, "port": 8080, "host": "localhost", "apiTarget": null },
    "detected": ["spring-boot", "mybatis", "postgres", "gradle", "logback"]
  },
  "domains": ["order", "customer", "product", ...],
  "domainStats": { "order": { "controllers": 1, "services": 2, "mappers": 1, "dtos": 4, "xmlMappers": 1 }, ... },
  "architecturePattern": "B",  // for Java
  "monorepo": null,  // or { "type": "turborepo", "workspaces": [...] }
  "frontend": null   // or { "framework": "next.js", "routingMode": "app-router", ... }
}
```

Tu peux lire ce fichier directement pour voir exactement ce que le scanner a extrait de ton projet.

---

## Ajouter un nouveau stack

L'architecture du scanner est modulaire. Ajouter un nouveau stack demande :

1. Un fichier `plan-installer/scanners/scan-<stack>.js` (logique d'extraction de domaines).
2. Trois templates de prompt Claude : `pass1.md`, `pass2.md`, `pass3.md` sous `pass-prompts/templates/<stack>/`.
3. Règles de détection de stack ajoutées à `plan-installer/stack-detector.js`.
4. Routing dans le dispatcher de `bin/commands/init.js`.
5. Tests avec un fixture project sous `tests/fixtures/<stack>/`.

Voir [CONTRIBUTING.md](../../CONTRIBUTING.md) pour le guide complet et les implémentations de référence à copier.

---

## Override du comportement du scanner

Si ton projet a une structure inhabituelle ou si l'auto-détection choisit le mauvais stack, dépose un fichier `.claudeos-scan.json` à la racine de ton projet.

Voir [advanced-config.md](advanced-config.md) pour les champs d'override disponibles.
