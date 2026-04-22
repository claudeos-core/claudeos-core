# ClaudeOS-Core

**Le seul outil qui lit d'abord votre code source, confirme votre stack et vos patterns par une analyse déterministe, puis génère des règles Claude Code adaptées exactement à votre projet.**

```bash
npx claudeos-core init
```

ClaudeOS-Core lit votre codebase, extrait chaque pattern qu'il y trouve et génère un ensemble complet de Standards, Rules, Skills et Guides adaptés à _votre_ projet. Ensuite, quand vous dites à Claude Code « Crée un CRUD pour les commandes », il produit du code qui correspond exactement à vos patterns existants.

[🇺🇸 English](./README.md) · [🇰🇷 한국어](./README.ko.md) · [🇨🇳 中文](./README.zh-CN.md) · [🇯🇵 日本語](./README.ja.md) · [🇪🇸 Español](./README.es.md) · [🇻🇳 Tiếng Việt](./README.vi.md) · [🇮🇳 हिन्दी](./README.hi.md) · [🇷🇺 Русский](./README.ru.md) · [🇩🇪 Deutsch](./README.de.md)

---

## Pourquoi ClaudeOS-Core ?

Tous les autres outils Claude Code fonctionnent ainsi :

> **Un humain décrit le projet → le LLM génère la documentation**

ClaudeOS-Core fonctionne ainsi :

> **Le code analyse vos sources → le code construit un prompt sur mesure → le LLM génère la documentation → le code vérifie la sortie**

Ce n'est pas une petite différence. Voici pourquoi c'est important :

### Le problème fondamental : les LLMs devinent. Le code, non.

Quand vous demandez à Claude d'« analyser ce projet », il **devine** votre stack, votre ORM, votre structure de domaines.
Il peut voir `spring-boot` dans votre `build.gradle` mais ne pas réaliser que vous utilisez MyBatis (et non JPA).
Il peut détecter un répertoire `user/` sans comprendre que votre projet utilise le packaging layer-first (Pattern A), pas domain-first (Pattern B).

**ClaudeOS-Core ne devine pas.** Avant même que Claude ne voie votre projet, le code Node.js a déjà :

- Parsé `build.gradle` / `package.json` / `pyproject.toml` et **confirmé** votre stack, ORM, BD et gestionnaire de paquets
- Scanné votre structure de répertoires et **confirmé** votre liste de domaines avec le nombre de fichiers
- Classifié la structure de votre projet selon l'un des 5 patterns Java, Kotlin CQRS/BFF, ou Next.js App Router/FSD
- Divisé les domaines en groupes de taille optimale qui rentrent dans la fenêtre de contexte de Claude
- Assemblé un prompt spécifique au stack avec tous les faits confirmés injectés

Au moment où Claude reçoit le prompt, il n'y a plus rien à deviner. Le stack est confirmé. Les domaines sont confirmés. Le pattern structurel est confirmé. Le seul travail de Claude est de générer une documentation qui correspond à ces **faits confirmés**.

### Le résultat

Les autres outils produisent une documentation « globalement correcte ».
ClaudeOS-Core produit une documentation qui sait que votre projet utilise `ApiResponse.ok()` (pas `ResponseEntity.success()`), que vos mappers MyBatis XML vivent dans `src/main/resources/mybatis/mappers/`, et que votre structure de packages est `com.company.module.{domain}.controller` — parce qu'il a lu votre code réel.

### Avant et après

**Sans ClaudeOS-Core** — vous demandez à Claude Code de créer un CRUD Order :
```
❌ Utilise un repository style JPA (votre projet utilise MyBatis)
❌ Crée ResponseEntity.success() (votre wrapper est ApiResponse.ok())
❌ Place les fichiers dans order/controller/ (votre projet utilise controller/order/)
❌ Génère des commentaires en anglais (votre équipe écrit des commentaires en français)
→ Vous passez 20 minutes à corriger chaque fichier généré
```

**Avec ClaudeOS-Core** — `.claude/rules/` contient déjà vos patterns confirmés :
```
✅ Génère un mapper MyBatis + XML (détecté depuis build.gradle)
✅ Utilise ApiResponse.ok() (extrait de votre vraie source)
✅ Place les fichiers dans controller/order/ (Pattern A confirmé par le scan structurel)
✅ Commentaires en français (--lang fr appliqué)
→ Le code généré correspond immédiatement aux conventions de votre projet
```

Cette différence se cumule. 10 tâches/jour × 20 minutes économisées = **plus de 3 heures/jour**.

---

## Assurance qualité post-génération (v2.3.0)

La génération n'est que la moitié du problème. L'autre moitié est **savoir que la sortie est correcte** — à travers 10 langues de sortie, 11 templates de stack et des projets de toute taille. v2.3.0 ajoute deux validateurs déterministes qui s'exécutent après la génération et qui ne dépendent pas d'auto-vérifications du LLM.

### `claude-md-validator` — invariants structurels

Chaque `CLAUDE.md` généré est vérifié par rapport à 25 invariants structurels qui n'utilisent que des signaux indépendants de la langue : syntaxe markdown (`^## `, `^### `), noms de fichiers littéraux (`decision-log.md`, `failure-patterns.md` — jamais traduits), nombre de sections, nombre de sous-sections par section, nombre de lignes de table. Le même validateur, octet pour octet, produit des verdicts identiques sur un `CLAUDE.md` généré en anglais, coréen, japonais, vietnamien, hindi, russe, espagnol, chinois, français ou allemand.

La garantie cross-langue est vérifiée par des fixtures de test dans les 10 langues, y compris des fixtures bad-case dans 6 de ces langues qui produisent des signatures d'erreur identiques. Lorsqu'un invariant échoue sur un projet en vietnamien, la correction est la même que lorsqu'il échoue sur un projet en allemand.

### `content-validator [10/10]` — vérification des revendications de chemin et cohérence MANIFEST

Lit chaque référence de chemin entre backticks (`src/...`, `.claude/rules/...`, `claudeos-core/skills/...`) dans tous les fichiers `.md` générés et les vérifie contre le vrai système de fichiers. Attrape deux classes d'échecs LLM que aucun outil ne détectait auparavant :

- **`STALE_PATH`** — quand Pass 3 ou Pass 4 fabrique un chemin plausible mais inexistant. Cas typiques : déduire `featureRoutePath.ts` d'une constante TypeScript nommée `FEATURE_ROUTE_PATH` alors que le fichier réel est `routePath.ts` ; supposer `src/main.tsx` par convention Vite dans un projet multi-entry ; supposer `src/__mocks__/handlers.ts` d'après la documentation MSW même quand le projet n'a aucun test.
- **`MANIFEST_DRIFT`** — quand `claudeos-core/skills/00.shared/MANIFEST.md` enregistre un skill que `CLAUDE.md §6` ne mentionne pas (ou inversement). Reconnaît le layout courant orchestrator + sub-skills où `CLAUDE.md §6` est un point d'entrée et `MANIFEST.md` est le registre complet — les sub-skills sont considérés couverts via leur orchestrator parent.

Le validateur est couplé à une prévention au moment du prompt dans `pass3-footer.md` et `pass4.md` : des blocs anti-pattern documentant les classes spécifiques d'hallucination (préfixe de répertoire parent, conventions de bibliothèques Vite/MSW/Vitest/Jest/RTL) et une guidance positive explicite pour scope les règles par répertoire quand un nom de fichier concret n'est pas dans `pass3a-facts.md`.

### Exécuter la validation sur n'importe quel projet

```bash
npx claudeos-core health     # tous les validateurs — verdict go/no-go unique
npx claudeos-core lint       # uniquement les invariants structurels de CLAUDE.md (n'importe quelle langue)
```

### Vérification en conditions réelles

v2.3.0 a été validé end-to-end avant la release sur deux projets frères coréens réels : un frontend single-SPA Vite + React 19 avec 14 domaines et un orchestrator `scaffold-page-feature` à 8 sub-skills, et un backend Spring Boot + MyBatis avec 8 domaines et un orchestrator `scaffold-crud-feature` à 8 sub-skills en pleine migration PostgreSQL → MariaDB. Les deux se sont stabilisés à **0 erreurs, 0 avertissements** sur le health check complet — `STALE_PATH` 0, `MANIFEST_DRIFT` 0, 25/25 invariants structurels passent — sans aucune édition manuelle de la sortie générée.

---

## Stacks Supportés

| Stack | Détection | Profondeur d'analyse |
|---|---|---|
| **Java / Spring Boot** | `build.gradle`, `pom.xml`, 5 patterns de package | 10 catégories, 59 sous-éléments |
| **Kotlin / Spring Boot** | `build.gradle.kts`, kotlin plugin, `settings.gradle.kts`, auto-détection CQRS/BFF | 12 catégories, 95 sous-éléments |
| **Node.js / Express** | `package.json` | 9 catégories, 57 sous-éléments |
| **Node.js / NestJS** | `package.json` (`@nestjs/core`) | 10 catégories, 68 sous-éléments |
| **Next.js / React** | `package.json`, `next.config.*`, support FSD | 9 catégories, 55 sous-éléments |
| **Vue / Nuxt** | `package.json`, `nuxt.config.*`, Composition API | 9 catégories, 58 sous-éléments |
| **Python / Django** | `requirements.txt`, `pyproject.toml` | 10 catégories, 55 sous-éléments |
| **Python / FastAPI** | `requirements.txt`, `pyproject.toml` | 10 catégories, 58 sous-éléments |
| **Node.js / Fastify** | `package.json` | 10 catégories, 62 sous-éléments |
| **Vite / React SPA** | `package.json`, `vite.config.*` | 9 catégories, 55 sous-éléments |
| **Angular** | `package.json`, `angular.json` | 12 catégories, 78 sous-éléments |

Auto-détecté : langage et version, framework et version (y compris Vite en tant que framework SPA), ORM (MyBatis, JPA, Exposed, Prisma, TypeORM, SQLAlchemy, etc.), base de données (PostgreSQL, MySQL, Oracle, MongoDB, SQLite), gestionnaire de paquets (Gradle, Maven, npm, yarn, pnpm, pip, poetry), architecture (CQRS, BFF — à partir des noms de modules), structure multi-module (depuis settings.gradle), monorepo (Turborepo, pnpm-workspace, Lerna, npm/yarn workspaces), **configuration runtime depuis `.env.example`** (v2.2.0 — extraction de port/host/API-target à partir de plus de 16 noms de variables conventionnelles parmi les frameworks Vite · Next.js · Nuxt · Angular · Node · Python).

**Vous n'avez rien à spécifier. Tout est détecté automatiquement.**

### Configuration runtime pilotée par `.env` (v2.2.0)

v2.2.0 ajoute `lib/env-parser.js` pour que le `CLAUDE.md` généré reflète ce que le projet déclare réellement plutôt que les defaults framework.

- **Ordre de recherche** : `.env.example` (canonique, commité) → `.env.local.example` → `.env.sample` → `.env.template` → `.env` → `.env.local` → `.env.development`. La variante `.example` l'emporte parce qu'elle est la shape-of-truth neutre côté développeur, et non les overrides locaux d'un contributeur particulier.
- **Conventions de variables de port reconnues** : `VITE_PORT` / `VITE_DEV_PORT` / `VITE_DESKTOP_PORT` / `NEXT_PUBLIC_PORT` / `NUXT_PORT` / `NG_PORT` / `APP_PORT` / `SERVER_PORT` / `HTTP_PORT` / `DEV_PORT` / `FLASK_RUN_PORT` / `UVICORN_PORT` / `DJANGO_PORT` / `PORT` générique. Les noms spécifiques au framework l'emportent sur le `PORT` générique quand les deux sont présents.
- **Host & API target** : `VITE_DEV_HOST` / `VITE_API_TARGET` / `NEXT_PUBLIC_API_URL` / `NUXT_PUBLIC_API_BASE` / `BACKEND_URL` / `PROXY_TARGET`, etc.
- **Priorité** : le `server.port` de `application.yml` Spring Boot gagne toujours (config framework-native), puis le port déclaré dans `.env`, puis le default framework (Vite 5173, Next.js 3000, Django 8000, etc.) en dernier recours.
- **Redaction des variables sensibles** : les valeurs des variables correspondant aux patterns `PASSWORD` / `SECRET` / `TOKEN` / `API_KEY` / `ACCESS_KEY` / `PRIVATE_KEY` / `CREDENTIAL` / `JWT_SECRET` / `CLIENT_SECRET` / `SESSION_SECRET` / `BEARER` / `SALT` sont remplacées par `***REDACTED***` avant d'atteindre n'importe quel générateur en aval. Defense-in-depth contre les secrets accidentellement commités dans `.env.example`. `DATABASE_URL` est explicitement whitelisté pour la back-compat d'identification BD du stack-detector.

### Détection des Domaines Java (5 patterns avec fallback)

| Priorité | Pattern | Structure | Exemple |
|---|---|---|---|
| A | Layer d'abord | `controller/{domain}/` | `controller/user/UserController.java` |
| B | Domaine d'abord | `{domain}/controller/` | `user/controller/UserController.java` |
| D | Préfixe de module | `{module}/{domain}/controller/` | `front/member/controller/MemberController.java` |
| E | DDD/Hexagonal | `{domain}/adapter/in/web/` | `user/adapter/in/web/UserController.java` |
| C | Plat | `controller/*.java` | `controller/UserController.java` → extrait `user` du nom de classe |

Les domaines uniquement service (sans contrôleurs) sont également détectés via les répertoires `service/`, `dao/`, `aggregator/`, `facade/`, `usecase/`, `orchestrator/`, `mapper/`, `repository/`. Ignorés : `common`, `config`, `util`, `core`, `front`, `admin`, `v1`, `v2`, etc.

### Détection des Domaines Kotlin Multi-Module

Pour les projets Kotlin avec structure Gradle multi-module (ex : monorepo CQRS) :

| Étape | Ce que fait l'outil | Exemple |
|---|---|---|
| 1 | Scanne `settings.gradle.kts` pour trouver les `include()` | Trouve 14 modules |
| 2 | Détecte le type de module depuis le nom | `reservation-command-server` → type : `command` |
| 3 | Extrait le domaine du nom de module | `reservation-command-server` → domaine : `reservation` |
| 4 | Regroupe le même domaine à travers les modules | `reservation-command-server` + `common-query-server` → 1 domaine |
| 5 | Détecte l'architecture | Contient modules `command` + `query` → CQRS |

Types de module supportés : `command`, `query`, `bff`, `integration`, `standalone`, `library`. Les bibliothèques partagées (`shared-lib`, `integration-lib`) sont détectées comme domaines spéciaux.

### Détection des Domaines Frontend

- **App Router** : `app/{domain}/page.tsx` (Next.js)
- **Pages Router** : `pages/{domain}/index.tsx`
- **FSD (Feature-Sliced Design)** : `features/*/`, `widgets/*/`, `entities/*/`
- **Split RSC/Client** : Détecte le pattern `client.tsx`, suit la séparation Server/Client des composants
- **Chemins imbriqués non standards** : Détecte pages, components et couches FSD sous les chemins `src/*/` (ex : `src/admin/pages/dashboard/`, `src/admin/components/form/`, `src/admin/features/billing/`)
- **Détection platform/tier-split (v2.0.0)** : Reconnaît les layouts `src/{platform}/{subapp}/` — `{platform}` peut être un mot-clé de device/cible (`desktop`, `pc`, `web`, `mobile`, `mc`, `mo`, `sp`, `tablet`, `tab`, `pwa`, `tv`, `ctv`, `ott`, `watch`, `wear`) ou un mot-clé de niveau d'accès (`admin`, `cms`, `backoffice`, `back-office`, `portal`). Émet un domaine par paire `(platform, subapp)` nommé `{platform}-{subapp}` avec des compteurs par domaine pour routes/components/layouts/hooks. Tourne simultanément sur Angular, Next.js, React et Vue (glob multi-extensions `{tsx,jsx,ts,js,vue}`). Nécessite ≥2 fichiers source par subapp pour éviter des domaines bruyants à 1 seul fichier.
- **Split plateforme en monorepo (v2.0.0)** : Le scan de plateforme matche aussi `{apps,packages}/*/src/{platform}/{subapp}/` (Turborepo/pnpm workspace avec `src/`) et `{apps,packages}/{platform}/{subapp}/` (workspaces sans wrapper `src/`).
- **Fallback E — fichier de routes (v2.0.0)** : Quand les scanners primaires + Fallbacks A–D renvoient tous 0, glob `**/routes/*.{tsx,jsx,ts,js,vue}` et regroupe par le nom du répertoire parent de `routes`. Capture les projets à routage par fichiers React Router (CRA/Vite + `react-router`) qui ne matchent ni `page.tsx` de Next.js ni les layouts FSD. Les noms de parent génériques (`src`, `app`, `pages`) sont filtrés.
- **Fallback de config** : Détecte Next.js/Vite/Nuxt depuis les fichiers de config quand ils ne sont pas dans `package.json` (support monorepo)
- **Fallback répertoire profond** : Pour les projets React/CRA/Vite/Vue/RN, scanne `**/components/*/`, `**/views/*/`, `**/screens/*/`, `**/containers/*/`, `**/pages/*/`, `**/routes/*/`, `**/modules/*/`, `**/domains/*/` à n'importe quelle profondeur
- **Listes d'ignore partagées (v2.0.0)** : Tous les scanners partagent `BUILD_IGNORE_DIRS` (`node_modules`, `build`, `dist`, `out`, `.next`, `.nuxt`, `.svelte-kit`, `.angular`, `.turbo`, `.cache`, `.parcel-cache`, `coverage`, `storybook-static`, `.vercel`, `.netlify`) et `TEST_FILE_IGNORE` (spec/test/stories/e2e/cy + `__snapshots__`/`__tests__`) pour que les sorties de build et les fixtures de test ne gonflent pas les compteurs par domaine.

### Overrides de scanner (v2.0.0)

Déposez un `.claudeos-scan.json` optionnel à la racine de votre projet pour étendre les valeurs par défaut du scanner sans modifier le toolkit. Tous les champs sont **additifs** — les entrées utilisateur étendent les valeurs par défaut, ne les remplacent jamais :

```json
{
  "frontendScan": {
    "platformKeywords": ["kiosk"],
    "skipSubappNames": ["legacy"],
    "minSubappFiles": 3
  }
}
```

| Champ | Par défaut | But |
|---|---|---|
| `platformKeywords` | liste intégrée ci-dessus | Mots-clés `{platform}` supplémentaires pour le scan de plateforme (ex : `kiosk`, `vr`, `embedded`) |
| `skipSubappNames` | répertoires structurels uniquement | Noms de subapp supplémentaires à exclure de l'émission de domaines du scan de plateforme |
| `minSubappFiles` | `2` | Remplace le nombre minimum de fichiers requis avant qu'un subapp ne devienne un domaine |

Fichier manquant ou JSON mal formé → retombe silencieusement aux valeurs par défaut (pas de crash). Usage typique : activer une abréviation courte (`adm`, `bo`) que la liste intégrée exclut comme trop ambiguë, ou augmenter `minSubappFiles` pour des monorepos bruyants.

---

## Démarrage Rapide

### Prérequis

- **Node.js** v18+
- **CLI Claude Code** (installée et authentifiée)

### Installation

```bash
cd /your/project/root

# Option A : npx (recommandé — pas d'installation nécessaire)
npx claudeos-core init

# Option B : installation globale
npm install -g claudeos-core
claudeos-core init

# Option C : devDependency du projet
npm install --save-dev claudeos-core
npx claudeos-core init

# Option D : git clone (pour développement/contribution)
git clone https://github.com/claudeos-core/claudeos-core.git claudeos-core-tools

# Cross-plateforme (PowerShell, CMD, Bash, Zsh — n'importe quel terminal)
node claudeos-core-tools/bin/cli.js init

# Linux/macOS (Bash uniquement)
bash claudeos-core-tools/bootstrap.sh
```

### Langue de sortie (10 langues)

Quand vous lancez `init` sans `--lang`, un sélecteur interactif apparaît — utilisez les flèches ou les touches numériques pour choisir :

```
╔══════════════════════════════════════════════════╗
║  Select generated document language (required)   ║
╚══════════════════════════════════════════════════╝

  Les fichiers générés (CLAUDE.md, Standards, Rules,
  Skills, Guides) seront écrits en français.

     1. en     — English
     2. ko     — 한국어 (Korean)
     3. zh-CN  — 简体中文 (Chinese Simplified)
     4. ja     — 日本語 (Japanese)
     5. es     — Español (Spanish)
     6. vi     — Tiếng Việt (Vietnamese)
     7. hi     — हिन्दी (Hindi)
     8. ru     — Русский (Russian)
  ❯  9. fr     — Français (French)
    10. de     — Deutsch (German)

  ↑↓ Move  1-0 Jump  Enter Select  ESC Cancel
```

La description change vers la langue sélectionnée au fur et à mesure que vous naviguez. Pour sauter le sélecteur, passez directement `--lang` :

```bash
npx claudeos-core init --lang ko    # Coréen
npx claudeos-core init --lang ja    # Japonais
npx claudeos-core init --lang en    # Anglais (par défaut)
```

> **Remarque :** Cela définit la langue uniquement pour les fichiers de documentation générés. L'analyse du code (Pass 1–2) tourne toujours en anglais ; la sortie générée (Pass 3) est écrite dans la langue choisie. Les exemples de code à l'intérieur des fichiers générés gardent la syntaxe de leur langage de programmation d'origine.

C'est tout. Après 10 minutes (petit projet) à 2 heures (monorepo de 60+ domaines), toute la documentation est générée et prête à l'emploi. La CLI affiche une barre de progression avec pourcentage, temps écoulé et ETA pour chaque pass. Voir [Auto-scaling selon la Taille du Projet](#auto-scaling-selon-la-taille-du-projet) pour des timings détaillés par taille de projet.

### Installation Manuelle Pas à Pas

Si vous voulez un contrôle total sur chaque phase — ou si le pipeline automatisé échoue à une étape — vous pouvez exécuter chaque étape manuellement. Cela sert également à comprendre le fonctionnement interne de ClaudeOS-Core.

#### Étape 1 : Cloner et installer les dépendances

```bash
cd /your/project/root

git clone https://github.com/claudeos-core/claudeos-core.git claudeos-core-tools
cd claudeos-core-tools && npm install && cd ..
```

#### Étape 2 : Créer la structure de répertoires

```bash
# Rules (v2.0.0 : ajout de 60.memory)
mkdir -p .claude/rules/{00.core,10.backend,20.frontend,30.security-db,40.infra,50.sync,60.memory}

# Standards
mkdir -p claudeos-core/standard/{00.core,10.backend-api,20.frontend-ui,30.security-db,40.infra,50.verification,90.optional}

# Skills
mkdir -p claudeos-core/skills/{00.shared,10.backend-crud/scaffold-crud-feature,20.frontend-page/scaffold-page-feature,50.testing,90.experimental}

# Guide, Database, MCP, Generated, Memory (v2.0.0 : ajout de memory ; v2.1.0 : suppression de plan)
mkdir -p claudeos-core/guide/{01.onboarding,02.usage,03.troubleshooting,04.architecture}
mkdir -p claudeos-core/{database,mcp-guide,generated,memory}
```

> **Remarque v2.1.0 :** Le répertoire `claudeos-core/plan/` n'est plus créé. La génération de master plan a été supprimée parce que les master plans étaient un backup interne que Claude Code ne lisait jamais à l'exécution, et leur agrégation déclenchait des échecs `Prompt is too long`. Utilisez `git` pour le backup/restore.

#### Étape 3 : Lancer plan-installer (analyse du projet)

Cela scanne votre projet, détecte le stack, trouve les domaines, les divise en groupes et génère les prompts.

```bash
node claudeos-core-tools/plan-installer/index.js
```

**Sortie (dans `claudeos-core/generated/`) :**
- `project-analysis.json` — stack détecté, domaines, info frontend
- `domain-groups.json` — groupes de domaines pour Pass 1
- `pass1-backend-prompt.md` / `pass1-frontend-prompt.md` — prompts d'analyse
- `pass2-prompt.md` — prompt de merge
- `pass3-prompt.md` — template de prompt Pass 3 avec le bloc Phase 1 « Read Once, Extract Facts » préfixé (Règles A–E). Le pipeline automatisé découpe Pass 3 en plusieurs stages à l'exécution ; ce template alimente chaque stage.
- `pass3-context.json` — résumé projet allégé (< 5 Ko, construit après Pass 2) que les prompts Pass 3 préfèrent au `pass2-merged.json` complet (v2.1.0)
- `pass4-prompt.md` — prompt de scaffolding memory L4 (v2.0.0 ; utilise le même `staging-override.md` pour les écritures de règles `60.memory/`)

Vous pouvez inspecter ces fichiers pour vérifier la précision de détection avant de continuer.

#### Étape 4 : Pass 1 — Analyse profonde du code (par groupe de domaines)

Lancez Pass 1 pour chaque groupe de domaines. Consultez `domain-groups.json` pour connaître le nombre de groupes.

```bash
# Vérifier combien de groupes
cat claudeos-core/generated/domain-groups.json | node -e "
  const g = JSON.parse(require('fs').readFileSync('/dev/stdin','utf-8'));
  g.groups.forEach((g,i) => console.log('Group '+(i+1)+': ['+g.domains.join(', ')+'] ('+g.type+', ~'+g.estimatedFiles+' files)'));
"

# Lancer Pass 1 pour chaque groupe (remplacer les domaines et le numéro de groupe)
# Note : v1.6.1+ utilise String.replace() de Node.js au lieu de perl — perl n'est
# plus nécessaire, et la sémantique de fonction de remplacement empêche l'injection
# regex des caractères $/&/$1 susceptibles d'apparaître dans les noms de domaine.
#
# Pour le groupe 1 :
DOMAIN_LIST="user, order, product" PASS_NUM=1 node -e "
  const fs = require('fs');
  const tpl = fs.readFileSync('claudeos-core/generated/pass1-backend-prompt.md','utf-8');
  const out = tpl
    .replace(/\{\{DOMAIN_GROUP\}\}/g, () => process.env.DOMAIN_LIST)
    .replace(/\{\{PASS_NUM\}\}/g, () => process.env.PASS_NUM);
  process.stdout.write(out);
" | claude -p --dangerously-skip-permissions

# Pour le groupe 2 (si présent) :
DOMAIN_LIST="payment, system, delivery" PASS_NUM=2 node -e "
  const fs = require('fs');
  const tpl = fs.readFileSync('claudeos-core/generated/pass1-backend-prompt.md','utf-8');
  const out = tpl
    .replace(/\{\{DOMAIN_GROUP\}\}/g, () => process.env.DOMAIN_LIST)
    .replace(/\{\{PASS_NUM\}\}/g, () => process.env.PASS_NUM);
  process.stdout.write(out);
" | claude -p --dangerously-skip-permissions

# Pour les groupes frontend, remplacez pass1-backend-prompt.md → pass1-frontend-prompt.md
```

**Vérifier :** `ls claudeos-core/generated/pass1-*.json` devrait afficher un JSON par groupe.

#### Étape 5 : Pass 2 — Merger les résultats d'analyse

```bash
cat claudeos-core/generated/pass2-prompt.md \
  | claude -p --dangerously-skip-permissions
```

**Vérifier :** `claudeos-core/generated/pass2-merged.json` doit exister avec 9+ clés de niveau supérieur.

#### Étape 6 : Pass 3 — Générer toute la documentation (divisée en plusieurs stages)

**Remarque v2.1.0 :** Pass 3 est **toujours exécuté en mode split** par le pipeline automatisé. Chaque stage est un appel `claude -p` séparé avec une fenêtre de contexte fraîche, donc l'overflow par accumulation de sortie est structurellement impossible quelle que soit la taille du projet. Le template `pass3-prompt.md` est assemblé par stage avec une directive `STAGE:` qui indique à Claude quel sous-ensemble de fichiers émettre. En mode manuel, le chemin le plus simple reste d'alimenter le template complet et de laisser Claude tout générer en un seul appel — mais cela n'est fiable que sur les petits projets (≤5 domaines). Pour toute taille supérieure, utilisez `npx claudeos-core init` pour que le runner split s'occupe de l'orchestration des stages.

**Mode appel unique (petits projets uniquement, ≤5 domaines) :**

```bash
cat claudeos-core/generated/pass3-prompt.md \
  | claude -p --dangerously-skip-permissions
```

**Mode stage par stage (recommandé pour toutes les tailles de projet) :**

Le pipeline automatisé exécute ces stages. La liste des stages est :

| Stage | Écrit | Notes |
|---|---|---|
| `3a` | `pass3a-facts.md` (fiche de faits distillée 5–10 Ko) | Lit `pass2-merged.json` une seule fois ; les stages suivants référencent ce fichier |
| `3b-core` | `CLAUDE.md`, `standard/` communs, `.claude/rules/` communs | Fichiers inter-projet ; pas de sortie spécifique à un domaine |
| `3b-1..N` | `standard/60.domains/*.md` spécifiques aux domaines + règles de domaine | Batch de ≤15 domaines par stage (auto-divisé à partir de 16 domaines) |
| `3c-core` | `guide/` (9 fichiers), `skills/00.shared/MANIFEST.md`, orchestrateurs `skills/*/` | Skills partagés et tous les guides destinés à l'utilisateur |
| `3c-1..N` | Sous-skills de domaine sous `skills/20.frontend-page/scaffold-page-feature/` | Batch de ≤15 domaines par stage |
| `3d-aux` | `database/`, `mcp-guide/` | Taille fixe, indépendante du nombre de domaines |

Pour un projet de 1 à 15 domaines, cela se développe en 4 stages (`3a`, `3b-core`, `3c-core`, `3d-aux` — pas de sous-division en batches). Pour 16 à 30 domaines, 8 stages (`3b` et `3c` chacun sous-divisés en 2 batches). Voir [Auto-scaling selon la Taille du Projet](#auto-scaling-selon-la-taille-du-projet) pour le tableau complet.

**Vérifier :** `CLAUDE.md` doit exister à la racine de votre projet, et le marqueur `claudeos-core/generated/pass3-complete.json` doit être écrit. En mode split, le marqueur contient `mode: "split"` et un array `groupsCompleted` listant chaque stage terminé — la logique de marqueur partiel s'en sert pour reprendre au bon stage après un crash plutôt que de redémarrer depuis `3a` (qui doublerait le coût en tokens).

> **Remarque staging :** Pass 3 écrit les fichiers de règles d'abord dans `claudeos-core/generated/.staged-rules/` car la politique de chemins sensibles de Claude Code bloque les écritures directes dans `.claude/`. Le pipeline automatisé gère le déplacement automatiquement après chaque stage. Si vous exécutez un stage manuellement, vous devrez déplacer l'arbre staged vous-même : `mv claudeos-core/generated/.staged-rules/* .claude/rules/` (en préservant les sous-chemins).

#### Étape 7 : Pass 4 — Scaffolding memory

```bash
cat claudeos-core/generated/pass4-prompt.md \
  | claude -p --dangerously-skip-permissions
```

**Vérifier :** `claudeos-core/memory/` doit contenir 4 fichiers (`decision-log.md`, `failure-patterns.md`, `compaction.md`, `auto-rule-update.md`), `.claude/rules/60.memory/` doit contenir 4 fichiers de règles, et `CLAUDE.md` doit désormais avoir une section `## Memory (L4)` ajoutée. Marqueur : `claudeos-core/generated/pass4-memory.json`.

> **Gap-fill v2.1.0 :** Pass 4 garantit aussi que `claudeos-core/skills/00.shared/MANIFEST.md` existe. Si Pass 3c l'a omis (possible sur les projets skill-sparse car les templates `pass3.md` par stack listent `MANIFEST.md` parmi les cibles de génération sans le marquer REQUIRED), le gap-fill crée un stub minimal pour que `.claude/rules/50.sync/02.skills-sync.md` (chemin v2.2.0 — le nombre de règles sync est passé de 3 à 2, ce qui était `03` est devenu `02`) ait toujours une cible de référence valide. Idempotent : saute si le fichier a déjà du contenu réel (>20 caractères).

> **Remarque :** Si `claude -p` échoue ou si `pass4-prompt.md` est absent, le pipeline automatisé retombe sur un scaffold statique via `lib/memory-scaffold.js` (avec traduction pilotée par Claude quand `--lang` n'est pas l'anglais). Le fallback statique ne tourne qu'à l'intérieur de `npx claudeos-core init` — le mode manuel exige que Pass 4 réussisse.

#### Étape 8 : Lancer les outils de vérification

```bash
# Générer les métadonnées (requis avant les autres vérifications)
node claudeos-core-tools/manifest-generator/index.js

# Lancer toutes les vérifications
node claudeos-core-tools/health-checker/index.js

# Ou lancer des vérifications individuelles :
node claudeos-core-tools/plan-validator/index.js --check # Cohérence Plan ↔ disque
node claudeos-core-tools/sync-checker/index.js          # Fichiers non enregistrés/orphelins
node claudeos-core-tools/content-validator/index.js     # Vérifications qualité (incl. section memory/ [9/9])
node claudeos-core-tools/pass-json-validator/index.js   # Vérifications JSON Pass 1–4 + marqueur de complétion
```

#### Étape 9 : Vérifier les résultats

```bash
# Compter les fichiers générés
find .claude claudeos-core -type f | grep -v node_modules | grep -v '/generated/' | wc -l

# Regarder CLAUDE.md
head -30 CLAUDE.md

# Regarder un fichier standard
cat claudeos-core/standard/00.core/01.project-overview.md | head -20

# Regarder les règles
ls .claude/rules/*/
```

> **Astuce :** Si une étape échoue, vous pouvez corriger le problème et relancer uniquement cette étape. Les résultats de Pass 1/2 sont cachés — si `pass1-N.json` ou `pass2-merged.json` existe déjà, le pipeline automatisé les saute. Utilisez `npx claudeos-core init --force` pour supprimer les résultats précédents et repartir de zéro.

### Commencer à Utiliser

```
# Dans Claude Code — demandez simplement naturellement :
« Crée un CRUD pour le domaine order »
« Ajoute une API d'authentification utilisateur »
« Refactorise ce code pour qu'il matche les patterns du projet »

# Claude Code référence automatiquement vos Standards, Rules et Skills générés.
```

---

## Comment ça marche — Pipeline à 4 Passes

```
npx claudeos-core init
    │
    ├── [1] npm install                        ← Dépendances (~10s)
    ├── [2] Structure de répertoires           ← Créer les dossiers (~1s)
    ├── [3] plan-installer (Node.js)           ← Scan du projet (~5s)
    │       ├── Auto-détecte le stack (multi-stack aware)
    │       ├── Extrait la liste de domaines (tagged : backend/frontend)
    │       ├── Divise en groupes de domaines (par type)
    │       ├── Construit pass3-context.json (résumé allégé, v2.1.0)
    │       └── Sélectionne des prompts spécifiques au stack (par type)
    │
    ├── [4] Pass 1 × N  (claude -p)            ← Analyse profonde du code (~2-8min)
    │       ├── ⚙️ Groupes backend → prompt spécifique backend
    │       └── 🎨 Groupes frontend → prompt spécifique frontend
    │
    ├── [5] Pass 2 × 1  (claude -p)            ← Merge d'analyse (~1min)
    │       └── Consolide TOUS les résultats de Pass 1 dans pass2-merged.json
    │
    ├── [6] Pass 3 (mode split, v2.1.0)        ← Génère tout
    │       │
    │       ├── 3a     × 1  (claude -p)        ← Extraction de faits (~5-10min)
    │       │       └── Lit pass2-merged.json une fois → pass3a-facts.md
    │       │
    │       ├── 3b-core × 1  (claude -p)       ← CLAUDE.md + standard/rules communs
    │       ├── 3b-1..N × N  (claude -p)       ← Standards/règles de domaine (≤15 domaines/batch)
    │       │
    │       ├── 3c-core × 1  (claude -p)       ← Guides + skills partagés + MANIFEST.md
    │       ├── 3c-1..N × N  (claude -p)       ← Sous-skills de domaine (≤15 domaines/batch)
    │       │
    │       └── 3d-aux  × 1  (claude -p)       ← Stubs database/ + mcp-guide/
    │
    ├── [7] Pass 4 × 1  (claude -p)            ← Memory scaffolding (~30s-5min)
    │       ├── Seed memory/ (decision-log, failure-patterns, …)
    │       ├── Génère les règles 60.memory/
    │       ├── Ajoute la section « Memory (L4) » à CLAUDE.md
    │       └── Gap-fill : garantit skills/00.shared/MANIFEST.md (v2.1.0)
    │
    └── [8] Vérification                       ← Auto-exécute le health checker
```

### Pourquoi 4 Passes ?

**Pass 1** est le seul pass qui lit votre code source. Il sélectionne des fichiers représentatifs par domaine et extrait des patterns à travers 55–95 catégories d'analyse (selon le stack). Pour les gros projets, Pass 1 tourne plusieurs fois — une par groupe de domaines. Dans les projets multi-stack (ex : Java backend + React frontend), les domaines backend et frontend utilisent des **prompts d'analyse différents** adaptés à chaque stack.

**Pass 2** merge tous les résultats de Pass 1 en une analyse unifiée : patterns communs (100% partagés), patterns majoritaires (50%+ partagés), patterns spécifiques à un domaine, anti-patterns par sévérité et préoccupations transverses (naming, sécurité, BD, testing, logging, performance). Les résultats backend et frontend sont mergés ensemble.

**Pass 3** (mode split, v2.1.0) prend l'analyse mergée et génère tout l'écosystème de fichiers (CLAUDE.md, règles, standards, skills, guides) à travers plusieurs appels `claude -p` séquentiels. L'intuition clé est que l'overflow par accumulation de sortie n'est pas prédictible à partir de la taille d'entrée : le Pass 3 en appel unique fonctionnait bien sur les projets à 2 domaines et échouait de façon fiable autour de 5 domaines, et la frontière d'échec bougeait selon la verbosité de chaque fichier. Le mode split contourne cela entièrement — chaque stage démarre avec une fenêtre de contexte fraîche et écrit un sous-ensemble borné de fichiers. La cohérence inter-stages (qui était le principal avantage de l'approche monolithique) est préservée par `pass3a-facts.md`, une fiche de faits distillée de 5 à 10 Ko que tous les stages suivants référencent.

Le template de prompt Pass 3 inclut également un **bloc Phase 1 « Read Once, Extract Facts »** avec cinq règles qui contraignent encore le volume de sortie :

- **Règle A** — Référencer la table de faits ; ne pas relire `pass2-merged.json`.
- **Règle B** — Écriture de fichiers idempotente (skip si la cible existe avec du contenu réel), rendant Pass 3 sûrement rejouable après interruption.
- **Règle C** — Cohérence inter-fichiers imposée via la table de faits comme unique source de vérité.
- **Règle D** — Concision de sortie : une seule ligne (`[WRITE]`/`[SKIP]`) entre chaque écriture de fichier, pas de recopie de la table de faits, pas d'écho du contenu des fichiers.
- **Règle E** — Vérification idempotente par batch : un seul `Glob` au début de PHASE 2 plutôt que des appels `Read` par cible.

En **v2.2.0**, Pass 3 intègre également en ligne un scaffold CLAUDE.md déterministe (`pass-prompts/templates/common/claude-md-scaffold.md`) dans le prompt. Cela fixe les titres et l'ordre des 8 sections de premier niveau afin que le `CLAUDE.md` généré ne dérive plus entre projets, tandis que le contenu de chaque section continue de s'adapter à chaque projet. Le nouveau parser `.env` du stack-detector (`lib/env-parser.js`) fournit `stack.envInfo` au prompt pour que les lignes port/host/API target correspondent à ce que le projet déclare réellement plutôt qu'aux defaults du framework.

**Pass 4** scaffolde la couche Memory L4 : fichiers persistants de connaissance d'équipe (decision-log, failure-patterns, politique de compaction, auto-rule-update) plus les règles `60.memory/` qui indiquent aux futures sessions quand et comment lire/écrire ces fichiers. La couche memory est ce qui permet à Claude Code d'accumuler des leçons entre les sessions au lieu de les redécouvrir à chaque fois. Quand `--lang` n'est pas l'anglais, le contenu statique de fallback est traduit via Claude avant d'être écrit. v2.1.0 ajoute un gap-fill pour `skills/00.shared/MANIFEST.md` au cas où Pass 3c l'aurait omis.

---

## Structure des Fichiers Générés

```
your-project/
│
├── CLAUDE.md                          ← Point d'entrée Claude Code (structure déterministe à 8 sections, v2.2.0)
│
├── .claude/
│   └── rules/                         ← Règles déclenchées par glob
│       ├── 00.core/
│       ├── 10.backend/
│       ├── 20.frontend/
│       ├── 30.security-db/
│       ├── 40.infra/
│       ├── 50.sync/                   ← Règles de rappel de sync
│       └── 60.memory/                 ← Règles de scope on-demand de la memory L4 (v2.0.0)
│
├── claudeos-core/                     ← Répertoire principal de sortie
│   ├── generated/                     ← JSON d'analyse + prompts dynamiques + marqueurs de Pass (mettre en gitignore)
│   │   ├── project-analysis.json      ← Info du stack (multi-stack aware)
│   │   ├── domain-groups.json         ← Groupes avec type : backend/frontend
│   │   ├── pass1-backend-prompt.md    ← Prompt d'analyse backend
│   │   ├── pass1-frontend-prompt.md   ← Prompt d'analyse frontend (si détecté)
│   │   ├── pass2-prompt.md            ← Prompt de merge
│   │   ├── pass2-merged.json          ← Sortie Pass 2 (consommée par Pass 3a uniquement)
│   │   ├── pass3-context.json         ← Résumé allégé (< 5 Ko) pour Pass 3 (v2.1.0)
│   │   ├── pass3-prompt.md            ← Template de prompt Pass 3 (bloc Phase 1 préfixé)
│   │   ├── pass3a-facts.md            ← Fiche de faits écrite par Pass 3a, lue par 3b/3c/3d (v2.1.0)
│   │   ├── pass4-prompt.md            ← Prompt de scaffolding memory (v2.0.0)
│   │   ├── pass3-complete.json        ← Marqueur de complétion Pass 3 (mode split : inclut groupsCompleted, v2.1.0)
│   │   ├── pass4-memory.json          ← Marqueur de complétion Pass 4 (skip au resume)
│   │   ├── rule-manifest.json         ← Index de fichiers pour les outils de vérification
│   │   ├── sync-map.json              ← Mapping Plan ↔ disque (vide en v2.1.0 ; conservé pour compat sync-checker)
│   │   ├── stale-report.json          ← Résultats de vérification consolidés
│   │   ├── .i18n-cache-<lang>.json    ← Cache de traduction (non-anglais `--lang`)
│   │   └── .staged-rules/             ← Répertoire de staging transitoire pour les écritures `.claude/rules/` (auto-déplacé + nettoyé)
│   ├── standard/                      ← Standards de codage (15-19 fichiers + par-domaine dans 60.domains/)
│   │   ├── 00.core/                   ← Vue d'ensemble, architecture, naming
│   │   ├── 10.backend-api/            ← Patterns API (spécifiques au stack)
│   │   ├── 20.frontend-ui/            ← Patterns frontend (si détecté)
│   │   ├── 30.security-db/            ← Sécurité, schéma BD, utilitaires
│   │   ├── 40.infra/                  ← Config, logging, CI/CD
│   │   ├── 50.verification/           ← Vérification de build, testing
│   │   ├── 60.domains/                ← Standards par-domaine (écrits par Pass 3b-N, v2.1.0)
│   │   └── 90.optional/               ← Conventions optionnelles (extras spécifiques au stack)
│   ├── skills/                        ← Skills de scaffolding CRUD/page
│   │   └── 00.shared/MANIFEST.md      ← Source unique de vérité pour les skills enregistrés
│   ├── guide/                         ← Onboarding, FAQ, troubleshooting (9 fichiers)
│   ├── database/                      ← Schéma BD, guide de migration
│   ├── mcp-guide/                     ← Guide d'intégration de serveur MCP
│   └── memory/                        ← L4 : connaissance d'équipe (4 fichiers) — commitez-les
│       ├── decision-log.md            ← Le « pourquoi » derrière les décisions de conception
│       ├── failure-patterns.md        ← Erreurs récurrentes et fixes (auto-scoré — `npx claudeos-core memory score`)
│       ├── compaction.md              ← Stratégie de compaction en 4 étapes (lancez `npx claudeos-core memory compact`)
│       └── auto-rule-update.md        ← Propositions d'amélioration de règles (`npx claudeos-core memory propose-rules`)
│
└── claudeos-core-tools/               ← Ce toolkit (ne pas modifier)
```

Chaque fichier standard inclut ✅ des exemples corrects, ❌ des exemples incorrects et une table récapitulative des règles — tout dérivé des vrais patterns de votre code, pas de templates génériques.

> **Remarque v2.1.0 :** `claudeos-core/plan/` n'est plus généré. Les master plans étaient un backup interne que Claude Code ne consommait pas à l'exécution, et leur agrégation dans Pass 3 était une cause majeure d'overflow par accumulation de sortie. Utilisez `git` pour le backup/restore à la place. Les projets qui migrent depuis la v2.0.x peuvent supprimer sans risque un éventuel répertoire `claudeos-core/plan/` existant.

### Recommandations de gitignore

**À commiter** (connaissance d'équipe — destinée au partage) :
- `CLAUDE.md` — point d'entrée Claude Code
- `.claude/rules/**` — règles auto-chargées
- `claudeos-core/standard/**`, `skills/**`, `guide/**`, `database/**`, `mcp-guide/**`, `plan/**` — documentation générée
- `claudeos-core/memory/**` — historique de décisions, patterns d'échec, propositions de règles

**À NE PAS commiter** (artefacts de build régénérables) :

```gitignore
# ClaudeOS-Core — analyse générée et cache de traduction
claudeos-core/generated/
```

Le répertoire `generated/` contient le JSON d'analyse (`pass1-*.json`, `pass2-merged.json`), les prompts (`pass1/2/3/4-prompt.md`), les marqueurs de complétion de Pass (`pass3-complete.json`, `pass4-memory.json`), le cache de traduction (`.i18n-cache-<lang>.json`) et le répertoire transitoire de staging (`.staged-rules/`) — tout reconstruisible en relançant `npx claudeos-core init`.

---

## Auto-scaling selon la Taille du Projet

Le mode split de Pass 3 adapte le nombre de stages au nombre de domaines. La sous-division en batches se déclenche à 16 domaines pour garder chaque stage sous ~50 fichiers de sortie, qui est la plage empiriquement sûre pour `claude -p` avant que l'overflow par accumulation de sortie ne commence.

| Taille du projet | Domaines | Stages Pass 3 | Total `claude -p` | Temps est. |
|---|---|---|---|---|
| Petit | 1–4 | 4 (`3a`, `3b-core`, `3c-core`, `3d-aux`) | 7 (Pass 1 + 2 + 4 stages de Pass 3 + Pass 4) | ~10–15 min |
| Moyen | 5–15 | 4 | 8–9 | ~25–45 min |
| Grand | 16–30 | **8** (3b, 3c chacun divisé en 2 batches) | 11–12 | **~60–105 min** |
| X-Grand | 31–45 | 10 | 13–14 | ~100–150 min |
| XX-Grand | 46–60 | 12 | 15–16 | ~150–200 min |
| XXX-Grand | 61+ | 14+ | 17+ | 200 min+ |

Formule du nombre de stages (quand batché) : `1 (3a) + 1 (3b-core) + N (3b-1..N) + 1 (3c-core) + N (3c-1..N) + 1 (3d-aux) = 2N + 4`, où `N = ceil(totalDomains / 15)`.

Pass 4 (memory scaffolding) ajoute ~30 secondes à 5 minutes par-dessus selon que la génération pilotée par Claude ou le fallback statique tourne. Pour les projets multi-stack (ex : Java + React), les domaines backend et frontend sont comptés ensemble. Un projet avec 6 domaines backend + 4 frontend = 10 au total = palier Moyen.

---

## Outils de Vérification

ClaudeOS-Core inclut 5 outils de vérification intégrés qui tournent automatiquement après la génération :

```bash
# Lancer toutes les vérifications d'un coup (recommandé)
npx claudeos-core health

# Commandes individuelles
npx claudeos-core validate     # Comparaison Plan ↔ disque
npx claudeos-core refresh      # Sync Disque → Plan
npx claudeos-core restore      # Restore Plan → Disque

# Ou utiliser node directement (utilisateurs git clone)
node claudeos-core-tools/health-checker/index.js
node claudeos-core-tools/manifest-generator/index.js
node claudeos-core-tools/plan-validator/index.js --check
node claudeos-core-tools/sync-checker/index.js
```

| Outil | Ce qu'il fait |
|---|---|
| **manifest-generator** | Construit le JSON de métadonnées (`rule-manifest.json`, `sync-map.json`, initialise `stale-report.json`) ; indexe 7 répertoires dont `memory/` (`totalMemory` dans summary). v2.1.0 : `plan-manifest.json` n'est plus généré puisque les master plans ont été supprimés. |
| **plan-validator** | Valide les blocs `<file>` du master plan par rapport au disque pour les projets qui ont encore `claudeos-core/plan/` (cas de migration legacy). v2.1.0 : saute l'émission de `plan-sync-status.json` quand `plan/` est absent ou vide — `stale-report.json` enregistre quand même un no-op réussi. |
| **sync-checker** | Détecte les fichiers non enregistrés (sur disque mais pas dans le plan) et les entrées orphelines — couvre 7 répertoires (ajout de `memory/` en v2.0.0). Se termine proprement quand `sync-map.json` n'a aucun mapping (état par défaut v2.1.0). |
| **content-validator** | Vérification qualité en 9 sections — fichiers vides, exemples ✅/❌ manquants, sections requises, plus intégrité du scaffold memory L4 (dates de headings de decision-log, champs requis de failure-pattern, parsing fence-aware) |
| **pass-json-validator** | Valide la structure JSON de Pass 1–4 plus les marqueurs de complétion `pass3-complete.json` (forme mode split, v2.1.0) et `pass4-memory.json` |

---

## Comment Claude Code Utilise Votre Documentation

ClaudeOS-Core génère une documentation que Claude Code lit réellement — voici comment :

### Ce que Claude Code lit automatiquement

| Fichier | Quand | Garanti |
|---|---|---|
| `CLAUDE.md` | À chaque début de conversation | Toujours |
| `.claude/rules/00.core/*` | Quand n'importe quel fichier est édité (`paths: ["**/*"]`) | Toujours |
| `.claude/rules/10.backend/*` | Quand n'importe quel fichier est édité (`paths: ["**/*"]`) | Toujours |
| `.claude/rules/20.frontend/*` | Quand un fichier frontend est édité (limité aux chemins component/page/style) | Conditionnel |
| `.claude/rules/30.security-db/*` | Quand n'importe quel fichier est édité (`paths: ["**/*"]`) | Toujours |
| `.claude/rules/40.infra/*` | Uniquement lors de l'édition de fichiers config/infra (chemins limités) | Conditionnel |
| `.claude/rules/50.sync/*` | Uniquement lors de l'édition de fichiers claudeos-core (chemins limités) | Conditionnel |
| `.claude/rules/60.memory/*` | Quand `claudeos-core/memory/*` est édité (limité aux chemins memory) — indique **comment** lire/écrire la couche memory on-demand | Conditionnel (v2.0.0) |

### Ce que Claude Code lit on-demand via les références de règles

Chaque fichier de règle lie à son standard correspondant via une section `## Reference`. Claude lit uniquement le standard pertinent pour la tâche courante :

- `claudeos-core/standard/**` — patterns de codage, exemples ✅/❌, conventions de naming
- `claudeos-core/database/**` — schéma BD (pour queries, mappers, migrations)
- `claudeos-core/memory/**` (v2.0.0) — couche de connaissance d'équipe L4 ; **pas** auto-chargée (serait trop bruyante à chaque conversation). À la place, les règles `60.memory/*` indiquent à Claude *quand* Read ces fichiers : au début de session (skim du `decision-log.md` récent + `failure-patterns.md` à haute importance), et append-on-demand lors de décisions ou d'erreurs récurrentes.

Le `00.standard-reference.md` sert d'annuaire de tous les fichiers standard pour découvrir des standards qui n'ont pas de règle correspondante.

### Ce que Claude Code NE lit PAS (économise du contexte)

Ces dossiers sont explicitement exclus via la section `DO NOT Read` de la règle standard-reference :

| Dossier | Pourquoi exclu |
|---|---|
| `claudeos-core/plan/` | Backups de master plan des projets legacy (v2.0.x et antérieurs). Non généré en v2.1.0. Si présent, Claude Code ne le charge pas automatiquement — lecture on-demand uniquement. |
| `claudeos-core/generated/` | JSON de métadonnées de build, prompts, marqueurs de Pass, cache de traduction, `.staged-rules/`. Pas pour coder. |
| `claudeos-core/guide/` | Guides d'onboarding pour humains. |
| `claudeos-core/mcp-guide/` | Docs de serveur MCP. Pas pour coder. |
| `claudeos-core/memory/` (auto-load) | **Auto-load désactivé** par design — gonflerait le contexte à chaque conversation. Lu on-demand via les règles `60.memory/*` à la place (ex : scan de début de session de `failure-patterns.md`). Commitez toujours ces fichiers. |

---

## Workflow Quotidien

### Après l'installation

```
# Utilisez simplement Claude Code normalement — il référence vos standards automatiquement :
« Crée un CRUD pour le domaine order »
« Ajoute une API de mise à jour de profil utilisateur »
« Refactorise ce code pour qu'il matche les patterns du projet »
```

### Après édition manuelle des Standards

```bash
# Après avoir édité des fichiers de standards ou de règles :
npx claudeos-core refresh

# Vérifiez que tout est cohérent
npx claudeos-core health
```

### Quand les docs sont corrompues

```bash
# Recommandation v2.1.0 : utilisez git pour restaurer (puisque les master plans
# ne sont plus générés). Commitez vos docs générés régulièrement pour pouvoir
# revenir en arrière sur des fichiers spécifiques sans tout régénérer :
git checkout HEAD -- .claude/rules/ claudeos-core/

# Legacy (projets v2.0.x avec claudeos-core/plan/ encore présent) :
npx claudeos-core restore
```

### Maintenance de la couche Memory (v2.0.0)

La couche Memory L4 (`claudeos-core/memory/`) accumule la connaissance d'équipe à travers les sessions. Trois sous-commandes CLI la maintiennent en bonne santé :

```bash
# Compact : applique la politique de compaction en 4 étapes (à lancer périodiquement — ex : mensuellement)
npx claudeos-core memory compact
#   Étape 1 : résume les entrées anciennes (>30 jours, corps → une ligne)
#   Étape 2 : merge les headings dupliqués (fréquence sommée, dernier fix conservé)
#   Étape 3 : drop basse-importance + anciennes (importance <3 ET lastSeen >60 jours)
#   Étape 4 : applique le plafond de 400 lignes par fichier (la plus ancienne basse-importance est supprimée en premier)

# Score : re-classe les entrées de failure-patterns.md par importance
npx claudeos-core memory score
#   importance = round(frequency × 1.5 + recency × 5), plafonné à 10
#   À lancer après avoir ajouté plusieurs nouveaux failure patterns

# Propose-rules : fait remonter des candidats d'ajouts de règles depuis les échecs récurrents
npx claudeos-core memory propose-rules
#   Lit les entrées de failure-patterns.md avec frequency ≥ 3
#   Calcule la confiance (sigmoïde sur evidence pondérée × multiplicateur d'anchor)
#   Écrit les propositions dans memory/auto-rule-update.md (PAS auto-appliqué)
#   Confiance ≥ 0.70 mérite une revue sérieuse ; accepter → éditer la règle + loguer la décision

# v2.1.0 : `memory --help` route désormais vers l'aide des sous-commandes (auparavant top-level)
npx claudeos-core memory --help
```

> **Corrections v2.1.0 :** `memory score` ne laisse plus de lignes `importance` dupliquées après la première exécution (auparavant la ligne auto-scorée était ajoutée au-dessus tandis que la ligne plate d'origine restait en dessous). Le marqueur de résumé de l'Étape 1 de `memory compact` est désormais un vrai item de liste markdown (`- _Summarized on ..._`) pour qu'il s'affiche proprement et soit correctement re-parsé lors des compactions suivantes.

Quand écrire dans memory (Claude le fait on-demand, mais vous pouvez aussi éditer manuellement) :
- **`decision-log.md`** — ajoutez une nouvelle entrée quand vous choisissez entre des patterns concurrents, sélectionnez une bibliothèque, définissez une convention d'équipe ou décidez de NE PAS faire quelque chose. Append-only ; n'éditez jamais les entrées historiques.
- **`failure-patterns.md`** — ajoutez à la **deuxième occurrence** d'une erreur récurrente ou d'une root cause non évidente. Les erreurs de première fois n'ont pas besoin d'entrée.
- `compaction.md` et `auto-rule-update.md` — générés/gérés par les sous-commandes CLI ci-dessus ; ne pas éditer à la main.

### Intégration CI/CD

```yaml
# Exemple GitHub Actions
- run: npx claudeos-core validate
# Exit code 1 bloque la PR

# Optionnel : housekeeping mensuel de memory (workflow cron séparé)
- run: npx claudeos-core memory compact
- run: npx claudeos-core memory score
```

---

## En Quoi Est-ce Différent ?

### vs autres outils Claude Code

| | ClaudeOS-Core | Everything Claude Code (50K+ ⭐) | Harness | specs-generator | Claude `/init` |
|---|---|---|---|---|---|
| **Approche** | Code analyse d'abord, puis LLM génère | Presets de config pré-construits | Le LLM conçoit des équipes d'agents | Le LLM génère des docs de spec | Le LLM écrit CLAUDE.md |
| **Lit votre code source** | ✅ Analyse statique déterministe | ❌ | ❌ | ❌ (le LLM lit) | ❌ (le LLM lit) |
| **Détection de stack** | Le code confirme (ORM, BD, build tool, pkg manager) | N/A (stack-agnostic) | Le LLM devine | Le LLM devine | Le LLM devine |
| **Détection de domaines** | Le code confirme (Java 5 patterns, Kotlin CQRS, Next.js FSD) | N/A | Le LLM devine | N/A | N/A |
| **Même projet → Même résultat** | ✅ Analyse déterministe | ✅ (fichiers statiques) | ❌ (le LLM varie) | ❌ (le LLM varie) | ❌ (le LLM varie) |
| **Gestion des gros projets** | Split en groupes de domaines (4 domaines / 40 fichiers par groupe) | N/A | Pas de split | Pas de split | Limite de fenêtre de contexte |
| **Sortie** | CLAUDE.md + Rules + Standards + Skills + Guides + Plans (40-50+ fichiers) | Agents + Skills + Commands + Hooks | Agents + Skills | 6 documents de spec | CLAUDE.md (1 fichier) |
| **Emplacement de sortie** | `.claude/rules/` (auto-chargé par Claude Code) | `.claude/` divers | `.claude/agents/` + `.claude/skills/` | `.claude/steering/` + `specs/` | `CLAUDE.md` |
| **Vérification post-génération** | ✅ 5 validateurs automatiques | ❌ | ❌ | ❌ | ❌ |
| **Sortie multi-langue** | ✅ 10 langues | ❌ | ❌ | ❌ | ❌ |
| **Multi-stack** | ✅ Backend + Frontend simultanés | ❌ Stack-agnostic | ❌ | ❌ | Partiel |
| **Couche memory persistante** | ✅ L4 — decision log + failure patterns + propositions de règles auto-scorées (v2.0.0) | ❌ | ❌ | ❌ | ❌ |
| **Orchestration d'agents** | ❌ | ✅ 28 agents | ✅ 6 patterns | ❌ | ❌ |

### La différence clé en une phrase

**Les autres outils donnent à Claude « des instructions globalement correctes ». ClaudeOS-Core donne à Claude « des instructions extraites de votre code réel ».**

C'est pourquoi Claude Code arrête de générer du code JPA dans votre projet MyBatis,
arrête d'utiliser `success()` quand votre codebase utilise `ok()`,
et arrête de créer des répertoires `user/controller/` quand votre projet utilise `controller/user/`.

### Complémentaires, pas concurrents

ClaudeOS-Core se concentre sur les **règles et standards spécifiques au projet**.
Les autres outils se concentrent sur **l'orchestration d'agents et les workflows**.

Vous pouvez utiliser ClaudeOS-Core pour générer les règles de votre projet, puis utiliser ECC ou Harness par-dessus pour les équipes d'agents et l'automatisation des workflows. Ils résolvent des problèmes différents.

---

## FAQ

**Q : Est-ce que ça modifie mon code source ?**
Non. Il crée uniquement `CLAUDE.md`, `.claude/rules/` et `claudeos-core/`. Votre code existant n'est jamais modifié.

**Q : Combien ça coûte ?**
Il appelle `claude -p` plusieurs fois à travers les 4 passes. En mode split v2.1.0, Pass 3 seul se développe en 4–14+ stages selon la taille du projet (voir [Auto-scaling](#auto-scaling-selon-la-taille-du-projet)). Un petit projet typique (1–15 domaines) utilise 8–9 appels `claude -p` au total ; un projet de 18 domaines en utilise 11 ; un projet de 60 domaines en utilise 15–17. Chaque stage tourne avec une fenêtre de contexte fraîche — le coût en tokens par appel est en fait plus bas qu'avec le Pass 3 monolithique, parce qu'aucun stage n'a à retenir l'arbre de fichiers entier dans un seul contexte. Quand `--lang` n'est pas l'anglais, le chemin de fallback statique peut invoquer quelques appels supplémentaires à `claude -p` pour traduire ; les résultats sont cachés dans `claudeos-core/generated/.i18n-cache-<lang>.json` pour que les exécutions suivantes les réutilisent. Cela reste dans l'usage normal de Claude Code.

**Q : Qu'est-ce que le mode split de Pass 3 et pourquoi a-t-il été ajouté en v2.1.0 ?**
Avant la v2.1.0, Pass 3 faisait un seul appel `claude -p` qui devait émettre tout l'arbre de fichiers généré (`CLAUDE.md`, standards, règles, skills, guides — typiquement 30–60 fichiers) en une seule réponse. Cela fonctionnait sur les petits projets mais se heurtait de façon fiable à des échecs `Prompt is too long` par accumulation de sortie autour de 5 domaines. L'échec n'était pas prédictible à partir de la taille d'entrée — il dépendait de la verbosité des fichiers générés et pouvait frapper le même projet de façon intermittente. Le mode split contourne le problème structurellement : Pass 3 est découpé en stages séquentiels (`3a` → `3b-core` → `3b-N` → `3c-core` → `3c-N` → `3d-aux`), chacun un appel `claude -p` séparé avec une fenêtre de contexte fraîche. La cohérence inter-stages est préservée par `pass3a-facts.md`, une fiche de faits distillée de 5 à 10 Ko que chaque stage suivant référence au lieu de relire `pass2-merged.json`. Le marqueur `pass3-complete.json` porte un array `groupsCompleted` pour qu'un crash pendant `3c-2` reprenne à `3c-2` (pas à `3a`), évitant de doubler le coût en tokens.
**Q : Dois-je commiter les fichiers générés dans Git ?**
Oui, recommandé. Votre équipe peut partager les mêmes standards Claude Code. Pensez à ajouter `claudeos-core/generated/` à `.gitignore` (le JSON d'analyse est régénérable).

**Q : Qu'en est-il des projets stack mixte (ex : Java backend + React frontend) ?**
Totalement supporté. ClaudeOS-Core auto-détecte les deux stacks, tagge les domaines comme `backend` ou `frontend`, et utilise des prompts d'analyse spécifiques au stack pour chacun. Pass 2 merge tout, et Pass 3 génère les standards backend et frontend à travers ses stages split — les domaines backend vont dans certains batches 3b/3c, les domaines frontend dans d'autres, tous référençant le même `pass3a-facts.md` pour la cohérence.

**Q : Est-ce que ça marche avec les monorepos Turborepo / pnpm workspaces / Lerna ?**
Oui. ClaudeOS-Core détecte `turbo.json`, `pnpm-workspace.yaml`, `lerna.json`, ou `package.json#workspaces` et scanne automatiquement les `package.json` des sous-packages pour les dépendances framework/ORM/BD. Le scan de domaines couvre les patterns `apps/*/src/` et `packages/*/src/`. Lancez depuis la racine du monorepo.

**Q : Que se passe-t-il en cas de re-lancement ?**
Si des résultats précédents de Pass 1/2 existent, un prompt interactif vous laisse choisir : **Continue** (reprendre là où ça s'est arrêté) ou **Fresh** (tout supprimer et repartir de zéro). Utilisez `--force` pour sauter le prompt et toujours repartir de zéro. En mode split v2.1.0, le resume de Pass 3 fonctionne à la granularité du stage — si l'exécution a crashé pendant `3c-2`, le prochain `init` reprend à `3c-2` plutôt que de redémarrer depuis `3a` (ce qui doublerait le coût en tokens). Le marqueur `pass3-complete.json` enregistre `mode: "split"` plus un array `groupsCompleted` pour piloter cette logique.

**Q : NestJS a-t-il son propre template ou utilise-t-il celui d'Express ?**
NestJS utilise un template dédié `node-nestjs` avec des catégories d'analyse spécifiques à NestJS : decorators `@Module`, `@Injectable`, `@Controller`, Guards, Pipes, Interceptors, container DI, patterns CQRS et `Test.createTestingModule`. Les projets Express utilisent le template séparé `node-express`.

**Q : Qu'en est-il des projets Vue / Nuxt ?**
Vue/Nuxt utilise un template dédié `vue-nuxt` couvrant Composition API, `<script setup>`, defineProps/defineEmits, Pinia stores, `useFetch`/`useAsyncData`, routes serveur Nitro et `@nuxt/test-utils`. Les projets Next.js/React utilisent le template `node-nextjs`.

**Q : Supporte-t-il Kotlin ?**
Oui. ClaudeOS-Core auto-détecte Kotlin depuis `build.gradle.kts` ou le plugin kotlin dans `build.gradle`. Il utilise un template dédié `kotlin-spring` avec une analyse spécifique Kotlin (data classes, sealed classes, coroutines, extension functions, MockK, etc.).

**Q : Qu'en est-il de l'architecture CQRS / BFF ?**
Totalement supporté pour les projets Kotlin multi-module. ClaudeOS-Core lit `settings.gradle.kts`, détecte les types de module (command, query, bff, integration) depuis les noms de module, et regroupe le même domaine à travers les modules Command/Query. Les standards générés incluent des règles séparées pour command controllers vs query controllers, patterns BFF/Feign et conventions de communication inter-modules.

**Q : Qu'en est-il des monorepos Gradle multi-module ?**
ClaudeOS-Core scanne tous les sous-modules (`**/src/main/kotlin/**/*.kt`) indépendamment de la profondeur d'imbrication. Les types de module sont inférés des conventions de naming (ex : `reservation-command-server` → domaine : `reservation`, type : `command`). Les bibliothèques partagées (`shared-lib`, `integration-lib`) sont également détectées.

**Q : Qu'est-ce que la couche Memory L4 (v2.0.0) ? Dois-je commiter `claudeos-core/memory/` ?**
Oui — **commitez toujours** `claudeos-core/memory/`. C'est une connaissance d'équipe persistante : `decision-log.md` enregistre le *pourquoi* des choix architecturaux (append-only), `failure-patterns.md` enregistre les erreurs récurrentes avec des scores d'importance pour que les futures sessions les évitent, `compaction.md` définit la politique de compaction en 4 étapes, et `auto-rule-update.md` collecte les propositions d'amélioration de règles générées par la machine. Contrairement aux règles (auto-chargées par chemin), les fichiers memory sont **on-demand** — Claude ne les lit que quand les règles `60.memory/*` le lui indiquent (ex : scan de début de session des échecs à haute importance). Cela maintient le coût de contexte bas tout en préservant la connaissance à long terme.

**Q : Et si Pass 4 échoue ?**
Le pipeline automatisé (`npx claudeos-core init`) a un fallback statique : si `claude -p` échoue ou si `pass4-prompt.md` est absent, il scaffolde la couche memory directement via `lib/memory-scaffold.js`. Quand `--lang` n'est pas l'anglais, le fallback statique **doit** traduire via la CLI `claude` — si ça échoue aussi, l'exécution s'avorte avec `InitError` (pas de fallback silencieux vers l'anglais). Relancez quand `claude` est authentifié, ou utilisez `--lang en` pour sauter la traduction. Les résultats de traduction sont cachés dans `claudeos-core/generated/.i18n-cache-<lang>.json` pour que les exécutions suivantes les réutilisent.

**Q : Que font `memory compact` / `memory score` / `memory propose-rules` ?**
Voir la section [Maintenance de la couche Memory](#maintenance-de-la-couche-memory-v200) ci-dessus. Version courte : `compact` lance la politique en 4 étapes (résumer anciennes, merger duplicats, drop basse-importance anciennes, appliquer plafond 400 lignes) ; `score` re-classe `failure-patterns.md` par importance (fréquence × récence) ; `propose-rules` fait remonter les candidats d'ajouts de règles depuis les échecs récurrents dans `auto-rule-update.md` (pas auto-appliqué — revoyez et acceptez/rejetez manuellement).

**Q : Pourquoi `--force` (ou le mode resume « fresh ») supprime-t-il `.claude/rules/` ?**
v2.0.0 a ajouté trois guards de silent-failure à Pass 3 (Guard 3 couvre deux variantes de sortie incomplète : H2 pour `guide/` et H1 pour `standard/skills`). Guard 1 (« déplacement partiel de staged-rules ») et Guard 3 (« sortie incomplète — fichiers guide manquants/vides ou sentinel standard manquant / skills vide ») ne dépendent pas des règles existantes, mais Guard 2 (« zéro règles détectées ») si — il se déclenche quand Claude a ignoré la directive `staging-override.md` et a tenté d'écrire directement dans `.claude/` (où la politique de chemins sensibles de Claude Code bloque). Des règles obsolètes d'une exécution précédente feraient que Guard 2 produise un faux négatif — donc `--force`/`fresh` efface `.claude/rules/` pour assurer une détection propre. **Les éditions manuelles des fichiers de règles seront perdues** sous `--force`/`fresh` ; sauvegardez d'abord si besoin. (Remarque v2.1.0 : Guard 3 H1 ne vérifie plus `plan/` puisque les master plans ne sont plus générés.)

**Q : Qu'est-ce que `claudeos-core/generated/.staged-rules/` et pourquoi existe-t-il ?**
La politique de chemins sensibles de Claude Code refuse les écritures directes dans `.claude/` depuis le sous-processus `claude -p` (même avec `--dangerously-skip-permissions`). v2.0.0 contourne cela en faisant que les prompts Pass 3/4 redirigent toutes les écritures `.claude/rules/` vers le répertoire de staging ; l'orchestrateur Node.js (qui n'est pas soumis à cette politique) déplace ensuite l'arbre staged dans `.claude/rules/` après chaque pass. C'est transparent pour l'utilisateur — le répertoire est auto-créé, auto-nettoyé et auto-déplacé. Si une exécution précédente a crashé en plein milieu du déplacement, la suivante efface le répertoire de staging avant de réessayer. En mode split v2.1.0, le runner de stage déplace les règles staged dans `.claude/rules/` après chaque stage (pas seulement à la fin), donc un crash en plein Pass 3 laisse en place les règles des stages déjà terminés.

**Q : Puis-je lancer Pass 3 manuellement au lieu de `npx claudeos-core init` ?**
Oui pour les petits projets (≤5 domaines) — les instructions manuelles en appel unique de l'[Étape 6](#étape-6--pass-3--générer-toute-la-documentation-divisée-en-plusieurs-stages) fonctionnent toujours. Pour les projets plus gros vous devriez utiliser `npx claudeos-core init` parce que c'est le runner split qui orchestre l'exécution stage par stage avec des contextes frais, gère la sous-division en batches à partir de 16 domaines, écrit la bonne forme de marqueur `pass3-complete.json` (`mode: "split"` + `groupsCompleted`), et déplace les règles staged entre les stages. Reproduire cette orchestration à la main est possible mais fastidieux. Si vous avez une raison d'exécuter des stages manuellement (ex : débogage d'un stage spécifique), vous pouvez templater `pass3-prompt.md` avec la bonne directive `STAGE:` et l'alimenter à `claude -p` directement — mais pensez à déplacer `.staged-rules/` après chaque stage et à mettre à jour le marqueur vous-même.

**Q : Mon projet est une migration depuis la v2.0.x et a un répertoire `claudeos-core/plan/` existant. Que faire ?**
Rien de requis — les outils v2.1.0 ignorent `plan/` quand il est absent ou vide, et `plan-validator` gère toujours les projets legacy avec des répertoires `plan/` peuplés pour la rétrocompatibilité. Vous pouvez supprimer sans risque `claudeos-core/plan/` si vous n'avez pas besoin des backups de master plan (l'historique git est un meilleur backup de toute façon). Si vous gardez `plan/`, lancer `npx claudeos-core init` ne le mettra pas à jour — le nouveau contenu n'est plus agrégé dans les master plans en v2.1.0. Les outils de vérification gèrent les deux cas proprement.

---

## Structure des Templates

```
pass-prompts/templates/
├── common/                  # header/footer partagés + pass4 + staging-override + CLAUDE.md scaffold (v2.2.0)
│   ├── header.md             # Rôle + directive de format de sortie (toutes les passes)
│   ├── pass3-footer.md       # Instruction health-check post-Pass-3 + 5 blocs CRITICAL de guardrails (v2.2.0)
│   ├── pass3-phase1.md       # Bloc « Read Once, Extract Facts » avec Rules A-E (v2.1.0)
│   ├── pass4.md              # Prompt de scaffolding mémoire (v2.0.0)
│   ├── staging-override.md   # Redirige les écritures .claude/rules/** vers .staged-rules/** (v2.0.0)
│   ├── claude-md-scaffold.md # Template CLAUDE.md déterministe à 8 sections (v2.2.0)
│   └── lang-instructions.json # Directives de sortie par langue (10 langues)
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

`plan-installer` auto-détecte votre(vos) stack(s), puis assemble des prompts spécifiques au type. NestJS, Vue/Nuxt, Vite SPA et Flask utilisent chacun des templates dédiés avec des catégories d'analyse spécifiques au framework (ex : `@Module`/`@Injectable`/Guards pour NestJS ; `<script setup>`/Pinia/useFetch pour Vue ; client-side routing/`VITE_` env pour Vite ; Blueprint/`app.factory`/Flask-SQLAlchemy pour Flask). Pour les projets multi-stack, des `pass1-backend-prompt.md` et `pass1-frontend-prompt.md` séparés sont générés, tandis que `pass3-prompt.md` combine les cibles de génération des deux stacks. En v2.1.0, le template Pass 3 est préfixé par `common/pass3-phase1.md` (le bloc « Read Once, Extract Facts » avec les Règles A–E) avant d'être tranché par stage en mode split. Pass 4 utilise le template partagé `common/pass4.md` (memory scaffolding) quel que soit le stack.

**Dans v2.2.0**, le prompt Pass 3 intègre également en ligne `common/claude-md-scaffold.md` (le template CLAUDE.md déterministe à 8 sections) entre le bloc phase1 et le corps spécifique au stack — cela fixe la structure des sections afin que les CLAUDE.md générés ne dérivent pas entre projets, tout en laissant le contenu s'adapter à chaque projet. Les templates sont écrits **English-first** ; l'injection de langue depuis `lang-instructions.json` demande au LLM de traduire les titres de section et la prose dans la langue de sortie cible au moment de l'émission.

---

## Support Monorepo

ClaudeOS-Core auto-détecte les setups de monorepo JS/TS et scanne les sous-packages à la recherche de dépendances.

**Marqueurs de monorepo supportés** (auto-détectés) :
- `turbo.json` (Turborepo)
- `pnpm-workspace.yaml` (pnpm workspaces)
- `lerna.json` (Lerna)
- `package.json#workspaces` (npm/yarn workspaces)

**Lancez depuis la racine du monorepo** — ClaudeOS-Core lit `apps/*/package.json` et `packages/*/package.json` pour découvrir les dépendances framework/ORM/BD entre sous-packages :

```bash
cd my-monorepo
npx claudeos-core init
```

**Ce qui est détecté :**
- Dépendances de `apps/web/package.json` (ex : `next`, `react`) → stack frontend
- Dépendances de `apps/api/package.json` (ex : `express`, `prisma`) → stack backend
- Dépendances de `packages/db/package.json` (ex : `drizzle-orm`) → ORM/BD
- Chemins de workspace personnalisés depuis `pnpm-workspace.yaml` (ex : `services/*`)

**Le scan de domaines couvre aussi les layouts monorepo :**
- `apps/api/src/modules/*/` et `apps/api/src/*/` pour les domaines backend
- `apps/web/app/*/`, `apps/web/src/app/*/`, `apps/web/pages/*/` pour les domaines frontend
- `packages/*/src/*/` pour les domaines de packages partagés

```
my-monorepo/                    ← Lancez ici : npx claudeos-core init
├── turbo.json                  ← Auto-détecté comme Turborepo
├── apps/
│   ├── web/                    ← Next.js détecté depuis apps/web/package.json
│   │   ├── app/dashboard/      ← Domaine frontend détecté
│   │   └── package.json        ← { "dependencies": { "next": "^14" } }
│   └── api/                    ← Express détecté depuis apps/api/package.json
│       ├── src/modules/users/  ← Domaine backend détecté
│       └── package.json        ← { "dependencies": { "express": "^4" } }
├── packages/
│   ├── db/                     ← Drizzle détecté depuis packages/db/package.json
│   └── ui/
└── package.json                ← { "workspaces": ["apps/*", "packages/*"] }
```

> **Remarque :** Pour les monorepos Kotlin/Java, la détection multi-module utilise `settings.gradle.kts` (voir [Détection des Domaines Kotlin Multi-Module](#détection-des-domaines-kotlin-multi-module) ci-dessus) et ne nécessite pas de marqueurs de monorepo JS.

## Troubleshooting

**« claude: command not found »** — La CLI Claude Code n'est pas installée ou pas dans le PATH. Voir [docs Claude Code](https://code.claude.com/docs/en/overview).

**« npm install failed »** — La version de Node.js est peut-être trop basse. Requiert v18+.

**« 0 domains detected »** — La structure de votre projet peut être non standard. Voir les patterns de détection ci-dessus pour votre stack.

**« 0 domains detected » sur projet Kotlin** — Assurez-vous que votre projet a `build.gradle.kts` (ou `build.gradle` avec plugin kotlin) à la racine, et que les fichiers source sont sous `**/src/main/kotlin/`. Pour les projets multi-module, assurez-vous que `settings.gradle.kts` contient des instructions `include()`. Les projets Kotlin single-module (sans `settings.gradle`) sont aussi supportés — les domaines sont extraits de la structure package/classe sous `src/main/kotlin/`.

**« Language detected as java instead of kotlin »** — ClaudeOS-Core vérifie d'abord le `build.gradle(.kts)` racine, puis les fichiers build des sous-modules. Si le fichier de build racine utilise le plugin `java` sans `kotlin`, mais que les sous-modules utilisent Kotlin, l'outil vérifie jusqu'à 5 fichiers de build de sous-modules en fallback. Si toujours pas détecté, assurez-vous qu'au moins un `build.gradle.kts` contient `kotlin("jvm")` ou `org.jetbrains.kotlin`.

**« CQRS not detected »** — La détection d'architecture dépend du fait que les noms de module contiennent les mots-clés `command` et `query`. Si vos modules utilisent un naming différent (ex : `write-server`, `read-server`), l'architecture CQRS ne sera pas auto-détectée. Vous pouvez ajuster manuellement les prompts générés après l'exécution de plan-installer.

**« Pass 3 produced 0 rule files under .claude/rules/ » (v2.0.0)** — Guard 2 s'est déclenché : Claude a ignoré la directive `staging-override.md` et a essayé d'écrire directement dans `.claude/`, où la politique de chemins sensibles de Claude Code bloque les écritures. Relancez avec `npx claudeos-core init --force`. Si l'erreur persiste, inspectez `claudeos-core/generated/pass3-prompt.md` pour vérifier que le bloc `staging-override.md` est en haut.

**« Pass 3 finished but N rule file(s) could not be moved from staging » (v2.0.0)** — Guard 1 s'est déclenché : le déplacement depuis staging a heurté un file lock transitoire (typiquement antivirus Windows ou file-watcher). Le marqueur n'est PAS écrit, donc l'exécution `init` suivante réessaie Pass 3 automatiquement. Relancez simplement `npx claudeos-core init`.

**« Pass 3 produced CLAUDE.md and rules but N/9 guide files are missing or empty » (v2.0.0)** — Guard 3 (H2) s'est déclenché : Claude a tronqué sa réponse au milieu après avoir écrit CLAUDE.md + règles mais avant de finir (ou de commencer) la section `claudeos-core/guide/` (9 fichiers attendus). Se déclenche aussi sur un fichier uniquement BOM ou uniquement whitespace (le heading a été écrit mais le corps a été tronqué). Sans ce guard, le marqueur de complétion serait quand même écrit, laissant `guide/` vide de façon permanente aux exécutions suivantes. Ici le marqueur n'est PAS écrit, donc l'exécution `init` suivante réessaie Pass 3 à partir des mêmes résultats de Pass 2. Si ça continue de se répéter, relancez avec `npx claudeos-core init --force` pour régénérer depuis zéro.

**« Pass 3 finished but the following required output(s) are missing or empty » (v2.0.0, mis à jour en v2.1.0)** — Guard 3 (H1) s'est déclenché : Claude a tronqué APRÈS `claudeos-core/guide/` mais avant (ou pendant) `claudeos-core/standard/` ou `claudeos-core/skills/`. Exigences : (a) `standard/00.core/01.project-overview.md` existe et n'est pas vide (sentinel écrit par le prompt Pass 3 de chaque stack), (b) `skills/` a ≥1 `.md` non vide. `database/` et `mcp-guide/` sont intentionnellement exclus (certains stacks produisent légitimement zéro fichier). `plan/` n'est plus vérifié depuis la v2.1.0 (les master plans ont été supprimés). Même chemin de récupération que Guard 3 (H2) : relancez `init`, ou `--force` si ça persiste.

**« Pass 3 split stage crashed partway through (v2.1.0) »** — Quand l'un des stages split (ex : `3b-1`, `3c-2`) échoue en cours d'exécution, le marqueur au niveau stage n'est PAS écrit, mais les stages terminés SONT enregistrés dans `pass3-complete.json.groupsCompleted`. L'exécution `init` suivante lit cet array et reprend au premier stage non terminé, sautant tout le travail terminé précédemment. Vous n'avez rien à faire manuellement — relancez simplement `npx claudeos-core init`. Si le resume échoue au même stage de façon répétée, inspectez `claudeos-core/generated/pass3-prompt.md` pour du contenu mal formé, puis essayez `--force` pour un redémarrage complet. La forme de `pass3-complete.json` (`mode: "split"`, `groupsCompleted: [...]`) est stable ; un marqueur manquant ou mal formé fait que tout Pass 3 redémarre depuis `3a`.

**« Pass 3 stale marker (shape mismatch) — treating as incomplete » (v2.1.0)** — Un `pass3-complete.json` d'une exécution monolithique pré-v2.1.0 est interprété sous les nouvelles règles du mode split. Le check de forme cherche `mode: "split"` et un array `groupsCompleted` ; si l'un ou l'autre manque, le marqueur est traité comme partiel et Pass 3 est relancé en mode split. Si vous avez migré depuis la v2.0.x, c'est attendu une fois — l'exécution suivante écrira la bonne forme de marqueur. Aucune action nécessaire.

**« pass2-merged.json exists but is malformed or incomplete (<5 top-level keys), re-running » (v2.0.0)** — Log info, pas une erreur. Au resume, `init` parse et valide désormais `pass2-merged.json` (≥5 clés de niveau supérieur requises, reflétant le seuil `INSUFFICIENT_KEYS` de `pass-json-validator`). Un squelette `{}` ou un JSON mal formé d'une exécution précédente crashée est automatiquement supprimé et Pass 2 est relancé. Pas d'action manuelle nécessaire — le pipeline s'auto-répare. Si ça récurre, inspectez `claudeos-core/generated/pass2-prompt.md` et réessayez avec `--force`.

**« Static fallback failed while translating to lang='ko' » (v2.0.0)** — Quand `--lang` n'est pas l'anglais, Pass 4 / fallback statique / gap-fill requièrent tous la CLI `claude` pour traduire. Si la traduction échoue (CLI non authentifiée, timeout réseau, ou la validation stricte a rejeté la sortie : longueur <40%, code fences cassés, frontmatter perdu, etc.), l'exécution s'avorte plutôt que d'écrire silencieusement en anglais. Fix : assurez-vous que `claude` est authentifié, ou relancez avec `--lang en` pour sauter la traduction.

**« pass4-memory.json exists but memory/ is empty » (v2.0.0)** — Une exécution précédente a écrit le marqueur mais l'utilisateur (ou un script de nettoyage) a supprimé `claudeos-core/memory/`. La CLI auto-détecte ce marqueur obsolète et relance Pass 4 au prochain `init`. Pas d'action manuelle nécessaire.

**« pass4-memory.json exists but is malformed (missing passNum/memoryFiles) — re-running Pass 4 » (v2.0.0)** — Log info, pas une erreur. Le contenu du marqueur de Pass 4 est désormais validé (`passNum === 4` + array `memoryFiles` non vide), pas seulement son existence. Un échec partiel de Claude qui aurait émis quelque chose comme `{"error":"timeout"}` comme corps du marqueur était précédemment accepté comme succès pour toujours ; maintenant le marqueur est supprimé et Pass 4 est relancé automatiquement.

**« Could not delete stale pass3-complete.json / pass4-memory.json » InitError (v2.0.0)** — `init` a détecté un marqueur obsolète (Pass 3 : CLAUDE.md a été supprimé extérieurement ; Pass 4 : memory/ vide ou corps de marqueur mal formé) et a tenté de le supprimer, mais l'appel `unlinkSync` a échoué — typiquement parce qu'un antivirus Windows ou un file-watcher (éditeur, indexeur IDE) retient le handle du fichier. Auparavant ceci était silencieusement ignoré, faisant que le pipeline sautait le pass et réutilisait le marqueur obsolète. Maintenant il échoue bruyamment. Fix : fermez tout éditeur/scanner AV qui pourrait avoir le fichier ouvert, puis relancez `npx claudeos-core init`.

**« CLAUDEOS_SKIP_TRANSLATION=1 is set but --lang='ko' requires translation » InitError (v2.0.0)** — Vous avez la variable d'environnement réservée aux tests `CLAUDEOS_SKIP_TRANSLATION=1` définie dans votre shell (probablement un reste de setup CI/test) ET vous avez choisi un `--lang` non-anglais. Cette variable d'environnement court-circuite le chemin de traduction dont dépendent le fallback statique et le gap-fill de Pass 4 pour la sortie non-anglaise. `init` détecte le conflit au moment de la sélection de langue et s'avorte immédiatement (plutôt que de crasher en plein Pass 4 avec une erreur imbriquée confuse). Fix : soit `unset CLAUDEOS_SKIP_TRANSLATION` avant de lancer, soit utilisez `npx claudeos-core init --lang en`.

**Avertissement "⚠️ v2.2.0 upgrade detected" (v2.2.0)** — Votre `CLAUDE.md` existant a été généré avec une version antérieure à v2.2.0. La régénération par défaut en mode resume ignorera les fichiers existants sous Rule B idempotency, donc les améliorations structurelles de v2.2.0 (scaffold CLAUDE.md à 8 sections, paths par fichier dans `40.infra/*`, précision du port basée sur `.env.example`, redesign de Section 8 `Common Rules & Memory (L4)` (repensée avec deux sous-sections : Common Rules · L4 Memory), ligne de règle `60.memory/*`, `04.doc-writing-guide.md` en forward-reference) NE seront PAS appliquées. Fix : relancez avec `npx claudeos-core init --force`. Cela écrase les fichiers générés (`CLAUDE.md`, `.claude/rules/`, `claudeos-core/standard/`, `claudeos-core/skills/`, `claudeos-core/guide/`) tout en préservant `claudeos-core/memory/` (decision-log, failure-patterns accumulés — append-only). Commitez le projet avant si vous voulez diff les écrasements avant acceptation.

**Le port dans CLAUDE.md diffère de `.env.example` (v2.2.0)** — Le nouveau parser `.env` du stack-detector (`lib/env-parser.js`) lit d'abord `.env.example` (canonique, commité), puis les variantes `.env` en fallback. Variables de port reconnues : `PORT`, `VITE_PORT`, `VITE_DESKTOP_PORT`, `NEXT_PUBLIC_PORT`, `NUXT_PORT`, `DJANGO_PORT`, etc. Pour Spring Boot, `server.port` de `application.yml` a toujours la priorité sur `.env` (config framework-native gagne). Si votre projet utilise un nom de var env inhabituel, renommez-la selon une convention reconnue ou ouvrez une issue pour étendre `PORT_VAR_KEYS`. Les defaults framework (Vite 5173, Next.js 3000, Django 8000) ne sont utilisés que quand la détection directe et `.env` sont tous deux silencieux.

**Valeurs secrètes redactées en `***REDACTED***` dans les docs générés (v2.2.0)** — Comportement attendu. Le parser `.env` v2.2.0 redacte automatiquement les valeurs des variables correspondant aux patterns `PASSWORD`/`SECRET`/`TOKEN`/`API_KEY`/`CREDENTIAL`/`PRIVATE_KEY` avant qu'elles n'atteignent un générateur. C'est du defense-in-depth contre les secrets accidentellement commités dans `.env.example`. `DATABASE_URL` reste tel quel pour la back-compat d'identification DB du stack-detector. Si vous voyez `***REDACTED***` quelque part dans le `CLAUDE.md` généré, c'est un bug — les valeurs redactées ne devraient pas atteindre le tableau ; veuillez ouvrir une issue. La config runtime non sensible (port, host, API target, NODE_ENV, etc.) passe sans modification.

---

## Contribuer

Les contributions sont les bienvenues ! Les domaines où l'aide est la plus nécessaire :

- **Nouveaux templates de stack** — Ruby/Rails, Go (Gin/Fiber/Echo), PHP (Laravel/Symfony), Rust (Axum/Actix), Svelte/SvelteKit, Remix
- **Intégration IDE** — extension VS Code, plugin IntelliJ
- **Templates CI/CD** — GitLab CI, CircleCI, exemples Jenkins (GitHub Actions déjà livré — voir `.github/workflows/test.yml`)
- **Couverture de test** — Étendre la suite de tests (actuellement 602 tests à travers 30 fichiers de test couvrant scanners, stack detection, domain grouping, plan parsing, prompt generation, CLI selectors, monorepo detection, Vite SPA detection, outils de vérification, memory scaffold L4, validation de resume de Pass 2, Pass 3 Guards 1/2/3 (H1 sentinel + H2 BOM-aware empty-file + strict stale-marker unlink), sous-division en batches du mode split Pass 3, resume de marqueur partiel Pass 3 (v2.1.0), validation du contenu du marqueur Pass 4 + rigueur du stale-marker unlink + gap-fill scaffoldSkillsManifest (v2.1.0), guard d'env-skip de traduction + early fail-fast + workflow CI, déplacement de staged-rules, fallback lang-aware de traduction, suite de régression de suppression des master plans (v2.1.0), régression de formatage memory score/compact (v2.1.0), structure du template AI Work Rules, et extraction port/host/API-target du parser `.env` + redaction de variables sensibles (v2.2.0))

Voir [`CONTRIBUTING.md`](./CONTRIBUTING.md) pour la liste complète des domaines, le style de code, la convention de commit et le guide pas à pas pour ajouter un nouveau template de stack.

---

## Auteur

Créé par **claudeos-core** — [GitHub](https://github.com/claudeos-core) · [Email](mailto:claudeoscore@gmail.com)

## Licence

ISC
