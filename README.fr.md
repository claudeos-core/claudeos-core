# ClaudeOS-Core

**Le seul outil qui lit d'abord votre code source, confirme votre stack et vos patterns par une analyse déterministe, puis génère des règles Claude Code adaptées exactement à votre projet.**

```bash
npx claudeos-core init
```

ClaudeOS-Core lit votre codebase, extrait chaque pattern qu'il trouve et génère un ensemble complet de Standards, Rules, Skills et Guides adaptés à _votre_ projet. Ensuite, quand vous dites à Claude Code « Crée un CRUD pour les commandes », il produit du code qui correspond exactement à vos patterns existants.

[🇺🇸 English](./README.md) · [🇰🇷 한국어](./README.ko.md) · [🇨🇳 中文](./README.zh-CN.md) · [🇯🇵 日本語](./README.ja.md) · [🇪🇸 Español](./README.es.md) · [🇻🇳 Tiếng Việt](./README.vi.md) · [🇮🇳 हिन्दी](./README.hi.md) · [🇷🇺 Русский](./README.ru.md) · [🇩🇪 Deutsch](./README.de.md)

---

## Pourquoi ClaudeOS-Core ?

> L'humain décrit le projet → Le LLM génère la documentation

ClaudeOS-Core:

> Le code analyse vos sources → Le code construit un prompt personnalisé → Le LLM génère la documentation → Le code vérifie la sortie

### Le problème fondamental : les LLMs devinent. Le code confirme.

Quand vous demandez à Claude d'« analyser ce projet », il **devine** votre stack, ORM, structure de domaines.

**ClaudeOS-Core ne devine pas.** Claude Node.js:

- `build.gradle` / `package.json` / `pyproject.toml` → **confirmed**
- directory scan → **confirmed**
- Java 5 patterns, Kotlin CQRS/BFF, Next.js App Router/FSD → **classified**
- domain groups → **split**
- stack-specific prompt → **assembled**

### Le résultat

Les autres outils produisent une documentation « généralement bonne ».
ClaudeOS-Core produit une documentation qui sait que votre projet utilise `ApiResponse.ok()` (pas `ResponseEntity.success()`), que vos mappers MyBatis XML sont dans `src/main/resources/mybatis/mappers/` — parce qu'il a lu votre vrai code.

### Before & After

**Sans ClaudeOS-Core**:
```
❌ JPA repository (MyBatis)
❌ ResponseEntity.success() (ApiResponse.ok())
❌ order/controller/ (controller/order/)
→ 20 min fix per file
```

**Avec ClaudeOS-Core**:
```
✅ MyBatis mapper + XML (build.gradle)
✅ ApiResponse.ok() (source code)
✅ controller/order/ (Pattern A)
→ immediate match
```

Cette différence s'accumule. 10 tâches/jour × 20 minutes économisées = **plus de 3 heures/jour**.

---

## Stacks Supportés

| Stack | Détection | Profondeur d'Analyse |
|---|---|---|
| **Java / Spring Boot** | `build.gradle`, `pom.xml`, 5 patterns de paquets | 10 catégories, 59 sous-éléments |
| **Kotlin / Spring Boot** | `build.gradle.kts`, kotlin plugin, `settings.gradle.kts`, CQRS/BFF auto-detect | 12 catégories, 95 sous-éléments |
| **Node.js / Express** | `package.json` | 9 catégories, 57 sous-éléments |
| **Node.js / NestJS** | `package.json` (`@nestjs/core`) | 10 catégories, 68 sous-éléments |
| **Next.js / React** | `package.json`, `next.config.*`, support FSD | 9 catégories, 55 sous-éléments |
| **Vue / Nuxt** | `package.json`, `nuxt.config.*`, Composition API | 9 catégories, 58 sous-éléments |
| **Python / Django** | `requirements.txt`, `pyproject.toml` | 10 catégories, 55 sous-éléments |
| **Python / FastAPI** | `requirements.txt`, `pyproject.toml` | 10 catégories, 58 sous-éléments |
| **Node.js / Fastify** | `package.json` | 10 catégories, 62 sous-éléments |
| **Angular** | `package.json`, `angular.json` | 12 catégories, 78 sous-éléments |

Détection automatique : langage et version, framework et version, ORM (MyBatis, JPA, Exposed, Prisma, TypeORM, SQLAlchemy, etc.), base de données (PostgreSQL, MySQL, Oracle, MongoDB, SQLite), gestionnaire de paquets (Gradle, Maven, npm, yarn, pnpm, pip, poetry), architecture (CQRS, BFF — détecté à partir des noms de modules), structure multi-module (depuis settings.gradle), monorepo (Turborepo, pnpm-workspace, Lerna, npm/yarn workspaces).

**Vous n'avez rien à spécifier. Tout est détecté automatiquement.**


### Détection des Domaines Java (5 patterns avec fallback)

| Priorité | Pattern | Structure | Exemple |
|---|---|---|---|
| A | Couche d'abord | `controller/{domain}/` | `controller/user/UserController.java` |
| B | Domaine d'abord | `{domain}/controller/` | `user/controller/UserController.java` |
| D | Préfixe module | `{module}/{domain}/controller/` | `front/member/controller/MemberController.java` |
| E | DDD/Hexagonal | `{domain}/adapter/in/web/` | `user/adapter/in/web/UserController.java` |
| C | Plat | `controller/*.java` | `controller/UserController.java` → extrait `user` du nom de classe |

Les domaines sans contrôleurs (service uniquement) sont aussi détectés via les répertoires `service/`, `dao/`, `aggregator/`, `facade/`, `usecase/`, `orchestrator/`, `mapper/`, `repository/`. Ignorés : `common`, `config`, `util`, `core`, `front`, `admin`, `v1`, `v2`, etc.


### Détection des domaines Kotlin multi-modules

Pour les projets Kotlin avec structure Gradle multi-modules (ex : monorepo CQRS) :

| Étape | Action | Exemple |
|---|---|---|
| 1 | Scanner `settings.gradle.kts` pour les `include()` | 14 modules trouvés |
| 2 | Détecter le type de module par son nom | `reservation-command-server` → type : `command` |
| 3 | Extraire le domaine du nom du module | `reservation-command-server` → domaine : `reservation` |
| 4 | Regrouper le même domaine entre modules | `reservation-command-server` + `common-query-server` → 1 domaine |
| 5 | Détecter l'architecture | Modules `command` + `query` présents → CQRS |

Types de modules supportés : `command`, `query`, `bff`, `integration`, `standalone`, `library`. Les bibliothèques partagées (`shared-lib`, `integration-lib`) sont détectées comme domaines spéciaux.

### Détection des Domaines Frontend

- **App Router** : `app/{domain}/page.tsx` (Next.js)
- **Pages Router** : `pages/{domain}/index.tsx`
- **FSD (Feature-Sliced Design)** : `features/*/`, `widgets/*/`, `entities/*/`
- **RSC/Client split** : Détecte le pattern `client.tsx`, suit la séparation Server/Client
- **Fallback config** : Détecte Next.js/Vite/Nuxt depuis les fichiers de config (support monorepo)
- **Fallback répertoires profonds** : Pour les projets React/CRA/Vite/Vue/RN, scanne `**/components/*/`, `**/views/*/`, `**/screens/*/`, `**/containers/*/`, `**/pages/*/`, `**/routes/*/`, `**/modules/*/`, `**/domains/*/` à toute profondeur

---

## Démarrage Rapide

### Prérequis

- **Node.js** v18+
- **Claude Code CLI** (installé et authentifié)

### Installation

```bash
cd /your/project/root

# Option A : npx (recommandé — aucune installation requise)
npx claudeos-core init

# Option B : installation globale
npm install -g claudeos-core
claudeos-core init

# Option C : devDependency du projet
npm install --save-dev claudeos-core
npx claudeos-core init

# Option D : git clone (pour développement/contribution)
git clone https://github.com/claudeos-core/claudeos-core.git claudeos-core-tools

# Multiplateforme (PowerShell, CMD, Bash, Zsh — tout terminal)
node claudeos-core-tools/bin/cli.js init

# Linux/macOS uniquement (Bash uniquement)
bash claudeos-core-tools/bootstrap.sh
```

### Langue de sortie (10 langues)

En exécutant `init` sans `--lang`, un sélecteur interactif apparaît (touches fléchées ou touches numériques) :

```
╔══════════════════════════════════════════════════╗
║  Select generated document language (required)   ║
╚══════════════════════════════════════════════════╝

  Les fichiers générés (CLAUDE.md, Standards, Rules,
  Skills, Guides) seront rédigés en français.

     1. en     — English
     ...
  ❯  9. fr     — Français (French)
     ...

  ↑↓ Move  1-0 Jump  Enter Select  ESC Cancel
```

La description change dans la langue correspondante lors de la navigation. Pour passer le sélecteur :

```bash
npx claudeos-core init --lang fr    # Français
npx claudeos-core init --lang en    # English
npx claudeos-core init --lang ko    # 한국어
```

> **Note :** Ceci ne change que la langue des fichiers de documentation générés. L'analyse du code (Pass 1–2) s'exécute toujours en anglais ; seul le résultat généré (Pass 3) est écrit dans la langue choisie.

C'est tout. Après 5–18 minutes, toute la documentation est générée et prête à l'emploi.
Le CLI affiche le temps écoulé par Pass et le temps total dans la bannière de fin.

### Installation Manuelle Étape par Étape

Si vous souhaitez un contrôle total sur chaque phase — ou si le pipeline automatisé échoue à une étape — vous pouvez exécuter chaque étape manuellement. C'est également utile pour comprendre le fonctionnement interne de ClaudeOS-Core.

#### Step 1 : Cloner et installer les dépendances

```bash
cd /your/project/root

git clone https://github.com/claudeos-core/claudeos-core.git claudeos-core-tools
cd claudeos-core-tools && npm install && cd ..
```

#### Step 2 : Créer la structure des répertoires

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

#### Step 3 : Exécuter plan-installer (analyse du projet)

Scanne votre projet, détecte le stack, trouve les domaines, les divise en groupes et génère les prompts.

```bash
node claudeos-core-tools/plan-installer/index.js
```

**Sortie (`claudeos-core/generated/`) :**
- `project-analysis.json` — stack détecté, domaines, info frontend
- `domain-groups.json` — groupes de domaines pour le Pass 1
- `pass1-backend-prompt.md` / `pass1-frontend-prompt.md` — prompts d'analyse
- `pass2-prompt.md` — prompt de fusion
- `pass3-prompt.md` — prompt de génération

Vous pouvez inspecter ces fichiers pour vérifier la précision de la détection avant de continuer.

#### Step 4 : Pass 1 — Analyse approfondie du code par groupe de domaines

Exécutez Pass 1 pour chaque groupe de domaines. Vérifiez `domain-groups.json` pour le nombre de groupes.

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

# Pour les groupes frontend, utilisez pass1-frontend-prompt.md
```

**Vérifier :** `ls claudeos-core/generated/pass1-*.json` doit afficher un JSON par groupe.

#### Step 5 : Pass 2 — Fusion des résultats d'analyse

```bash
cat claudeos-core/generated/pass2-prompt.md \
  | claude -p --dangerously-skip-permissions
```

**Vérifier :** `claudeos-core/generated/pass2-merged.json` doit exister avec 9+ clés de niveau supérieur.

#### Step 6 : Pass 3 — Générer toute la documentation

```bash
cat claudeos-core/generated/pass3-prompt.md \
  | claude -p --dangerously-skip-permissions
```

**Vérifier :** `CLAUDE.md` doit exister à la racine du projet.

#### Step 7 : Exécuter les outils de vérification

```bash
# Générer les métadonnées (requis avant les autres vérifications)
node claudeos-core-tools/manifest-generator/index.js

# Exécuter toutes les vérifications
node claudeos-core-tools/health-checker/index.js

# Ou exécuter les vérifications individuellement :
node claudeos-core-tools/plan-validator/index.js --check # Plan ↔ disk
node claudeos-core-tools/sync-checker/index.js          # Sync status
node claudeos-core-tools/content-validator/index.js     # Content quality
node claudeos-core-tools/pass-json-validator/index.js   # JSON format
```

#### Step 8 : Vérifier les résultats

```bash
find .claude claudeos-core -type f | grep -v node_modules | grep -v '/generated/' | wc -l
head -30 CLAUDE.md
ls .claude/rules/*/
```

> **Conseil :** Si une étape échoue, vous pouvez relancer uniquement cette étape. Les résultats Pass 1/2 sont mis en cache — si `pass1-N.json` ou `pass2-merged.json` existe déjà, le pipeline automatisé les ignore. Utilisez `npx claudeos-core init --force` pour supprimer les résultats précédents et repartir de zéro.

### Commencez à Utiliser

```
# Dans Claude Code — parlez simplement de manière naturelle :
"Crée un CRUD pour le domaine commandes"
"Ajoute une API d'authentification utilisateur"
"Refactorise ce code selon les patterns du projet"

# Claude Code référence automatiquement vos Standards, Rules et Skills générés.
```

---

## Comment ça Marche — Pipeline 3-Pass

```
npx claudeos-core init
    │
    ├── [1] npm install                    ← Dépendances (~10s)
    ├── [2] Structure des répertoires      ← Création des dossiers (~1s)
    ├── [3] plan-installer (Node.js)       ← Scan du projet (~5s)
    │       ├── Auto-détection du stack (multi-stack)
    │       ├── Extraction de la liste des domaines (tags : backend/frontend)
    │       ├── Division en groupes de domaines (par type)
    │       └── Sélection des prompts spécifiques au stack (par type)
    │
    ├── [4] Pass 1 × N  (claude -p)       ← Analyse approfondie du code (~2-8 min)
    │       ├── ⚙️ Groupes backend → prompt d'analyse backend
    │       └── 🎨 Groupes frontend → prompt d'analyse frontend
    │
    ├── [5] Pass 2 × 1  (claude -p)       ← Fusion de l'analyse (~1 min)
    │       └── Consolidation de TOUS les résultats Pass 1 (backend + frontend)
    │
    ├── [6] Pass 3 × 1  (claude -p)       ← Génération complète (~3-5 min)
    │       └── Prompt combiné (cibles backend + frontend)
    │
    └── [7] Vérification                   ← Exécution auto du health checker
```

### Pourquoi 3 Pass ?

**Pass 1** est le seul pass qui lit votre code source. Il sélectionne des fichiers représentatifs par domaine et extrait les patterns sur 55–95 catégories d'analyse (par stack). Pour les grands projets, Pass 1 s'exécute plusieurs fois — une par groupe de domaines. Dans les projets multi-stack (ex : backend Java + frontend React), backend et frontend utilisent **des prompts d'analyse différents** adaptés à chaque stack.

**Pass 2** fusionne tous les résultats de Pass 1 en une analyse unifiée : patterns communs (100% partagés), patterns majoritaires (50%+ partagés), patterns spécifiques au domaine, anti-patterns par sévérité et préoccupations transversales (nommage, sécurité, BD, tests, journalisation, performance).

**Pass 3** prend l'analyse fusionnée et génère tout l'écosystème de fichiers. Il ne lit jamais le code source — uniquement le JSON d'analyse. En mode multi-stack, le prompt de génération combine les cibles backend et frontend pour générer les deux ensembles de standards en un seul pass.

---

## Structure des Fichiers Générés

```
your-project/
│
├── CLAUDE.md                          ← Point d'entrée Claude Code
│
├── .claude/
│   └── rules/                         ← Règles déclenchées par Glob
│       ├── 00.core/
│       ├── 10.backend/
│       ├── 20.frontend/
│       ├── 30.security-db/
│       ├── 40.infra/
│       └── 50.sync/                   ← Règles de rappel de synchronisation
│
├── claudeos-core/                     ← Répertoire principal de sortie
│   ├── generated/                     ← JSON d'analyse + prompts dynamiques
│   ├── standard/                      ← Standards de code (15-19 fichiers)
│   ├── skills/                        ← Skills de scaffolding CRUD
│   ├── guide/                         ← Onboarding, FAQ, dépannage (9 fichiers)
│   ├── plan/                          ← Master Plans (sauvegarde/restauration)
│   ├── database/                      ← Schéma BD, guide de migration
│   └── mcp-guide/                     ← Guide d'intégration serveur MCP
│
└── claudeos-core-tools/               ← Ce toolkit (ne pas modifier)
```

Chaque fichier de standard inclut des exemples ✅ corrects, des exemples ❌ incorrects et un tableau récapitulatif des règles — le tout dérivé de vos patterns de code réels, pas de templates génériques.

---

## Auto-dimensionnement par Taille de Projet

| Taille | Domaines | Exécutions Pass 1 | Total `claude -p` | Temps Estimé |
|---|---|---|---|---|
| Petit | 1–4 | 1 | 3 | ~5 min |
| Moyen | 5–8 | 2 | 4 | ~8 min |
| Grand | 9–16 | 3–4 | 5–6 | ~12 min |
| Très Grand | 17+ | 5+ | 7+ | ~18 min+ |

Pour les projets multi-stack (ex : Java + React), les domaines backend et frontend sont comptés ensemble. 6 backend + 4 frontend = 10 domaines, dimensionné comme « Grand ».

---

## Outils de Vérification

ClaudeOS-Core inclut 5 outils de vérification intégrés, exécutés automatiquement après la génération :

```bash
# Exécuter toutes les vérifications (recommandé)
npx claudeos-core health

# Commandes individuelles
npx claudeos-core validate     # Comparaison Plan ↔ disque
npx claudeos-core refresh      # Synchronisation Disque → Plan
npx claudeos-core restore      # Restauration Plan → Disque
```

| Outil | Fonction |
|---|---|
| **manifest-generator** | Construit les JSON de métadonnées (rule-manifest, sync-map, plan-manifest) |
| **plan-validator** | Compare les blocs `<file>` du Master Plan avec le disque — 3 modes : check, refresh, restore |
| **sync-checker** | Détecte les fichiers non enregistrés (sur disque mais pas dans le plan) et les entrées orphelines |
| **content-validator** | Valide la qualité des fichiers — fichiers vides, exemples ✅/❌ manquants, sections requises |
| **pass-json-validator** | Valide la structure JSON des Pass 1–3, clés requises et complétude des sections |

---

## Comment Claude Code Utilise Votre Documentation

Voici comment Claude Code lit effectivement la documentation générée par ClaudeOS-Core :

### Fichiers lus automatiquement

| Fichier | Quand | Garanti |
|---|---|---|
| `CLAUDE.md` | Au début de chaque conversation | Toujours |
| `.claude/rules/00.core/*` | Lors de l'édition de fichiers (`paths: ["**/*"]`) | Toujours |
| `.claude/rules/10.backend/*` | Lors de l'édition de fichiers (`paths: ["**/*"]`) | Toujours |
| `.claude/rules/30.security-db/*` | Lors de l'édition de fichiers (`paths: ["**/*"]`) | Toujours |
| `.claude/rules/40.infra/*` | Uniquement pour les fichiers config/infra (paths scopés) | Conditionnel |
| `.claude/rules/50.sync/*` | Uniquement pour les fichiers claudeos-core (paths scopés) | Conditionnel |

### Fichiers lus à la demande via les références des règles

Chaque fichier de règle lie son standard correspondant dans la section `## Reference`. Claude ne lit que le standard pertinent pour la tâche en cours :

- `claudeos-core/standard/**` — Patterns de code, exemples ✅/❌, conventions de nommage
- `claudeos-core/database/**` — Schéma DB (pour requêtes, mappers, migrations)

`00.standard-reference.md` sert de répertoire pour découvrir les standards sans règle correspondante.

### Fichiers NON lus (économie de contexte)

Explicitement exclus par la section `DO NOT Read` de la règle standard-reference :

| Dossier | Raison d'exclusion |
|---|---|
| `claudeos-core/plan/` | Sauvegardes Master Plan (~340Ko). Utilisez `npx claudeos-core refresh` pour synchroniser. |
| `claudeos-core/generated/` | JSON de métadonnées build. Pas une référence de code. |
| `claudeos-core/guide/` | Guides d'onboarding pour humains. |
| `claudeos-core/mcp-guide/` | Docs serveur MCP. Pas une référence de code. |

---

## Flux de Travail Quotidien

### Après l'Installation

```
# Utilisez Claude Code normalement — il référence vos standards automatiquement :
"Crée un CRUD pour le domaine commandes"
"Ajoute une API de mise à jour du profil utilisateur"
"Refactorise ce code selon les patterns du projet"
```

### Après Modification Manuelle des Standards

```bash
# Après avoir édité des fichiers standard ou rules :
npx claudeos-core refresh

# Vérifier la cohérence
npx claudeos-core health
```

### Quand les Docs sont Corrompus

```bash
# Tout restaurer depuis le Master Plan
npx claudeos-core restore
```

### Intégration CI/CD

```yaml
# Exemple GitHub Actions
- run: npx claudeos-core validate
# Code de sortie 1 bloque la PR
```

---

## Quelle Différence ?

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

**Q : Est-ce que ça modifie mon code source ?**
Non. Seuls `CLAUDE.md`, `.claude/rules/` et `claudeos-core/` sont créés. Votre code existant n'est jamais modifié.

**Q : Combien ça coûte ?**
Appelle `claude -p` 3–7 fois. C'est dans les limites d'utilisation normale de Claude Code.

**Q : Faut-il commiter les fichiers générés dans Git ?**
Recommandé. Votre équipe peut partager les mêmes standards Claude Code. Envisagez d'ajouter `claudeos-core/generated/` au `.gitignore` (le JSON d'analyse est regénérable).

**Q : Qu'en est-il des projets multi-stack (ex : backend Java + frontend React) ?**
Entièrement supporté. ClaudeOS-Core auto-détecte les deux stacks, étiquette les domaines comme `backend` ou `frontend`, et utilise des prompts d'analyse spécifiques pour chacun. Pass 2 fusionne tout, et Pass 3 génère les standards backend et frontend en un seul pass.

**Q : Fonctionne-t-il avec Turborepo / pnpm workspaces / Lerna ?**
Oui. ClaudeOS-Core détecte `turbo.json`, `pnpm-workspace.yaml`, `lerna.json` ou `package.json#workspaces` et scanne automatiquement les `package.json` des sous-packages pour les dépendances framework/ORM/BD. Le scan de domaines couvre les patterns `apps/*/src/` et `packages/*/src/`. Exécutez depuis la racine du monorepo.

**Q : Que se passe-t-il lors d'une ré-exécution ?**
Si des résultats Pass 1/2 précédents existent, un prompt interactif vous permet de choisir : **Continue** (reprendre là où ça s'est arrêté) ou **Fresh** (tout supprimer et repartir de zéro). Utilisez `--force` pour ignorer le prompt et toujours repartir de zéro. Pass 3 est toujours ré-exécuté. Les versions précédentes peuvent être restaurées depuis les Master Plans.

**Q : NestJS a-t-il son propre template ou utilise-t-il celui d'Express ?**
NestJS utilise un template dédié `node-nestjs` avec des catégories d'analyse spécifiques à NestJS : décorateurs `@Module`, `@Injectable`, `@Controller`, Guards, Pipes, Interceptors, conteneur DI, patterns CQRS et `Test.createTestingModule`. Les projets Express utilisent le template séparé `node-express`.

**Q : Qu'en est-il des projets Vue / Nuxt ?**
Vue/Nuxt utilise un template dédié `vue-nuxt` couvrant la Composition API, `<script setup>`, defineProps/defineEmits, les stores Pinia, `useFetch`/`useAsyncData`, les routes serveur Nitro et `@nuxt/test-utils`. Les projets Next.js/React utilisent le template `node-nextjs`.

**Q : Kotlin est-il supporté ?**
Oui. ClaudeOS-Core détecte automatiquement Kotlin à partir de `build.gradle.kts` ou du plugin kotlin dans `build.gradle`. Il utilise un template dédié `kotlin-spring` avec une analyse spécifique à Kotlin (data classes, sealed classes, coroutines, fonctions d'extension, MockK, etc.).

**Q : Qu'en est-il de l'architecture CQRS / BFF ?**
Entièrement supporté pour les projets Kotlin multi-modules. ClaudeOS-Core lit `settings.gradle.kts`, détecte les types de modules (command, query, bff, integration) à partir de leurs noms, et regroupe le même domaine à travers les modules Command/Query. Les standards générés incluent des règles séparées pour les command controllers vs query controllers, les patterns BFF/Feign et les conventions de communication inter-modules.

**Q : Qu'en est-il des monorepos multi-modules Gradle ?**
ClaudeOS-Core analyse tous les sous-modules (`**/src/main/kotlin/**/*.kt`) quelle que soit la profondeur d'imbrication. Les types de modules sont déduits des conventions de nommage (ex : `reservation-command-server` → domaine : `reservation`, type : `command`). Les bibliothèques partagées (`shared-lib`, `integration-lib`) sont également détectées.

---

## Structure des Templates

```
pass-prompts/templates/
├── common/                  # En-tête/pied de page partagés
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

`plan-installer` auto-détecte votre/vos stack(s) puis assemble des prompts spécifiques au type. NestJS et Vue/Nuxt utilisent des templates dédiés avec des catégories d'analyse spécifiques au framework (ex : `@Module`/`@Injectable`/Guards pour NestJS, `<script setup>`/Pinia/useFetch pour Vue). Pour les projets multi-stack, `pass1-backend-prompt.md` et `pass1-frontend-prompt.md` sont générés séparément, tandis que `pass3-prompt.md` combine les cibles de génération des deux stacks.

---

## Support Monorepo

ClaudeOS-Core détecte automatiquement les configurations monorepo JS/TS et scanne les sous-packages pour les dépendances.

**Marqueurs monorepo supportés** (auto-détectés) :
- `turbo.json` (Turborepo)
- `pnpm-workspace.yaml` (pnpm workspaces)
- `lerna.json` (Lerna)
- `package.json#workspaces` (npm/yarn workspaces)

**Exécutez depuis la racine du monorepo** — ClaudeOS-Core lit `apps/*/package.json` et `packages/*/package.json` pour découvrir les dépendances framework/ORM/BD dans les sous-packages :

```bash
cd my-monorepo
npx claudeos-core init
```

**Ce qui est détecté :**
- Dépendances de `apps/web/package.json` (ex : `next`, `react`) → stack frontend
- Dépendances de `apps/api/package.json` (ex : `express`, `prisma`) → stack backend
- Dépendances de `packages/db/package.json` (ex : `drizzle-orm`) → ORM/BD
- Chemins de workspace personnalisés depuis `pnpm-workspace.yaml` (ex : `services/*`)

**Le scan de domaines couvre aussi les structures monorepo :**
- `apps/api/src/modules/*/` et `apps/api/src/*/` pour les domaines backend
- `apps/web/app/*/`, `apps/web/src/app/*/`, `apps/web/pages/*/` pour les domaines frontend
- `packages/*/src/*/` pour les domaines des packages partagés

```
my-monorepo/                    ← Exécuter ici : npx claudeos-core init
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

> **Note :** Pour les monorepos Kotlin/Java, la détection multi-modules utilise `settings.gradle.kts` (voir [Détection des domaines Kotlin multi-modules](#détection-des-domaines-kotlin-multi-modules) ci-dessus) et ne nécessite pas de marqueurs monorepo JS.

## Dépannage

**"claude: command not found"** — Claude Code CLI n'est pas installé ou pas dans le PATH. Voir la [documentation Claude Code](https://code.claude.com/docs/en/overview).

**"npm install failed"** — La version de Node.js peut être trop ancienne. v18+ requis.

**"0 domains detected"** — La structure de votre projet peut être non standard. Consultez les patterns de détection dans la [documentation coréenne](./README.ko.md#트러블슈팅) pour votre stack.

**« 0 domaines détectés » sur un projet Kotlin** — Vérifiez que `build.gradle.kts` (ou `build.gradle` avec le plugin kotlin) existe à la racine, et que les fichiers source sont sous `**/src/main/kotlin/`. Pour les projets multi-modules, `settings.gradle.kts` doit contenir des instructions `include()`. Les projets Kotlin mono-module (sans `settings.gradle`) sont également pris en charge — les domaines sont extraits de la structure des packages/classes sous `src/main/kotlin/`.

**« Langage détecté comme java au lieu de kotlin »** — ClaudeOS-Core vérifie d'abord le `build.gradle(.kts)` racine, puis les fichiers build des sous-modules. Assurez-vous qu'au moins un contient `kotlin("jvm")` ou `org.jetbrains.kotlin`.

**« CQRS non détecté »** — La détection d'architecture repose sur la présence des mots-clés `command` et `query` dans les noms de modules. Si vos modules utilisent des noms différents, vous pouvez ajuster manuellement les prompts générés.

---

## Contribuer

Les contributions sont les bienvenues ! Domaines où l'aide est la plus nécessaire :

- **Nouveaux templates de stack** — Ruby/Rails, Go/Gin, PHP/Laravel, Rust/Axum
- **Support approfondi monorepo** — Racines de sous-projets séparées, détection de workspaces
- **Couverture de tests** — Suite de tests en expansion (actuellement 256 tests couvrant tous les scanners, la détection de stack, le groupement de domaines, le parsing de plans, la génération de prompts, les sélecteurs CLI, la détection de monorepos et les outils de vérification)

---

## Auteur

Créé par **claudeos-core** — [GitHub](https://github.com/claudeos-core) · [Email](mailto:claudeoscore@gmail.com)

## Licence

ISC
