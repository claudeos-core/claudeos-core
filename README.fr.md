# ClaudeOS-Core

[![npm version](https://img.shields.io/npm/v/claudeos-core.svg?logo=npm&label=npm)](https://www.npmjs.com/package/claudeos-core)
[![CI](https://img.shields.io/github/actions/workflow/status/claudeos-core/claudeos-core/test.yml?branch=master&logo=github&label=CI)](https://github.com/claudeos-core/claudeos-core/actions/workflows/test.yml)
[![tests](https://img.shields.io/badge/tests-736%20passing-brightgreen?logo=node.js&logoColor=white)](https://github.com/claudeos-core/claudeos-core/actions/workflows/test.yml)
[![node](https://img.shields.io/node/v/claudeos-core.svg?logo=node.js&logoColor=white&label=node)](https://nodejs.org/)
[![license](https://img.shields.io/npm/l/claudeos-core.svg?color=blue)](LICENSE)
[![downloads](https://img.shields.io/npm/dm/claudeos-core.svg?logo=npm&color=blue&label=downloads)](https://www.npmjs.com/package/claudeos-core)

**Une CLI qui produit `CLAUDE.md` et `.claude/rules/` à partir du code source réel du projet, et qui renvoie toujours le même résultat pour les mêmes entrées. Elle s'appuie sur un scanner Node.js, un pipeline Claude en 4 passes, et 5 validateurs. 12 stacks, 10 langues pris en charge, et aucun chemin fabriqué hors du code.**

```bash
npx claudeos-core init
```

Compatible avec [**12 stacks**](#supported-stacks), monorepos compris. Une seule commande, sans configuration, reprenant après une interruption, et sans risque à la ré-exécution.

[🇺🇸 English](README.md) · [🇰🇷 한국어](README.ko.md) · [🇨🇳 中文](README.zh-CN.md) · [🇯🇵 日本語](README.ja.md) · [🇪🇸 Español](README.es.md) · [🇻🇳 Tiếng Việt](README.vi.md) · [🇮🇳 हिन्दी](README.hi.md) · [🇷🇺 Русский](README.ru.md) · [🇩🇪 Deutsch](README.de.md)

---

## C'est quoi ?

À chaque nouvelle session, Claude Code retombe sur les valeurs par défaut génériques du framework. L'équipe travaille avec **MyBatis** ? Claude écrit du JPA. Le wrapper de réponse s'appelle `ApiResponse.ok()` ? Claude utilise `ResponseEntity.success()`. Les paquets sont organisés par couches ? La génération propose une architecture orientée domaine. Écrire `.claude/rules/` à la main pour chaque dépôt règle le problème, jusqu'au jour où le code évolue et où les règles se mettent à dériver.

**ClaudeOS-Core régénère ces règles de façon reproductible, à partir du code source réel.** Un scanner Node.js commence par lire le projet : stack, ORM, organisation des paquets, chemins de fichiers. Un pipeline Claude en 4 passes prend ensuite le relais et produit l'ensemble complet : `CLAUDE.md`, les fichiers `.claude/rules/` chargés automatiquement, les standards et les skills. Tout reste cantonné à une liste blanche de chemins explicite, hors de laquelle le LLM ne peut pas sortir. Cinq validateurs contrôlent le résultat avant le rendu final.

Conséquence : pour une même entrée, la sortie est rigoureusement identique au bit près, dans n'importe laquelle des 10 langues, et aucun chemin n'est fabriqué. (Le détail se trouve plus bas, dans [Ce qui le rend différent](#ce-qui-le-rend-différent).)

Pour les projets qui durent dans le temps, un [Memory Layer](#memory-layer-optionnel-pour-les-projets-longue-durée) distinct est également initialisé.

---

## Voir sur un vrai projet

Exécution sur [`spring-boot-realworld-example-app`](https://github.com/gothinkster/spring-boot-realworld-example-app), un projet Java 11 · Spring Boot 2.6 · MyBatis · SQLite, 187 fichiers source. Résultat obtenu : **75 fichiers générés**, durée totale **53 minutes**, tous les validateurs au vert.

<p align="center">
  <img src="docs/assets/spring-boot-realworld-demo.gif" alt="ClaudeOS-Core init running on spring-boot-realworld-example-app — stack detection, 4-pass pipeline, validators, completion summary" width="769">
</p>

<details>
<summary><strong>Sortie terminal (version texte, pour la recherche et la copie)</strong></summary>

```text
╔════════════════════════════════════════════════════╗
║       ClaudeOS-Core — Bootstrap (4-Pass)          ║
╚════════════════════════════════════════════════════╝
    Project root: spring-boot-realworld-example-app
    Language:     English (en)

  [Phase 1] Detecting stack...
    Language:    java 11
    Framework:   spring-boot 2.6.3
    Database:    sqlite
    ORM:         mybatis
    PackageMgr:  gradle

  [Phase 2] Scanning structure...
    Backend:     2 domains
    Total:       2 domains
    Package:     io.spring.infrastructure

  [Phase 5] Active domains...
    ✅ 00.core   ✅ 10.backend   ⏭️ 20.frontend
    ✅ 30.security-db   ✅ 40.infra
    ✅ 80.verification  ✅ 90.optional

[4] Pass 1 — Deep analysis per domain group...
    ✅ pass1-1.json created (5m 34s)
    [█████░░░░░░░░░░░░░░░] 25% (1/4)

[5] Pass 2 — Merging analysis results...
    ✅ pass2-merged.json created (4m 22s)
    [██████████░░░░░░░░░░] 50% (2/4)

[6] Pass 3 — Generating all files...
    Pass 3 split mode (3a → 3b → 3c → 3d-aux)
    ✅ 3a complete (2m 57s)            — pass3a-facts.md (187-path allowlist)
    ✅ 3b complete (18m 49s)           — CLAUDE.md + 19 standards + 20 rules
    ✅ 3c complete (12m 35s)           — 13 skills + 9 guides
    ✅ 3d-aux complete (3m 18s)        — database/ + mcp-guide/
    Pass 3 split complete: 4/4 stages successful
    [███████████████░░░░░] 75% (3/4)

[7] Pass 4 — Memory scaffolding...
    Pass 4 staged-rules: 6 rule files moved to .claude/rules/
    ✅ Pass 4 complete (5m)
       Gap-fill: all 12 expected files already present
    [████████████████████] 100% (4/4)

╔═══════════════════════════════════════╗
║  ClaudeOS-Core — Health Checker       ║
╚═══════════════════════════════════════╝
  ✅ plan-validator         pass
  ✅ sync-checker           pass
  ✅ content-validator      pass
  ✅ pass-json-validator    pass
  ✅ All systems operational

  [Lint] ✅ CLAUDE.md structure valid (25 checks)
  [Content] ✅ All content validation passed
            Total: 0 advisories, 0 notes

╔════════════════════════════════════════════════════╗
║  ✅ ClaudeOS-Core — Complete                       ║
║   Files created:     75                           ║
║   Domains analyzed:  1 group                      ║
║   L4 scaffolded:     memory + rules               ║
║   Output language:   English                      ║
║   Total time:        53m 8s                       ║
╚════════════════════════════════════════════════════╝
```

</details>

<details>
<summary><strong>Ce qui finit dans votre <code>CLAUDE.md</code> (extrait réel, sections 1 et 2)</strong></summary>

```markdown
# CLAUDE.md — spring-boot-realworld-example-app

> Reference implementation of the RealWorld backend specification on
> Java 11 + Spring Boot 2.6, exposing both REST and GraphQL endpoints
> over a hexagonal MyBatis persistence layer.

#### 1. Role Definition

As the senior developer for this repository, you are responsible for
writing, modifying, and reviewing code. Responses must be written in English.
A Java Spring Boot REST + GraphQL API server organized around a hexagonal
(ports & adapters) architecture, with a CQRS-lite read/write split inside
an XML-driven MyBatis persistence layer and JWT-based authentication.

#### 2. Project Overview

| Item | Value |
|---|---|
| Language | Java 11 |
| Framework | Spring Boot 2.6.3 |
| Build Tool | Gradle (Groovy DSL) |
| Persistence | MyBatis 3 via `mybatis-spring-boot-starter:2.2.2` (no JPA) |
| Database | SQLite (`org.xerial:sqlite-jdbc:3.36.0.3`) — `dev.db` (default), `:memory:` (test) |
| Migration | Flyway — single baseline `V1__create_tables.sql` |
| API Style | REST (`io.spring.api.*`) + GraphQL via Netflix DGS `:4.9.21` |
| Authentication | JWT HS512 (`jjwt-api:0.11.2`) + Spring Security `PasswordEncoder` |
| Server Port | 8080 (default) |
| Test Stack | JUnit Jupiter 5, Mockito, AssertJ, rest-assured, spring-mock-mvc |
```

Toutes les valeurs ci-dessus, des coordonnées exactes des dépendances au nom de fichier `dev.db`, en passant par la migration `V1__create_tables.sql` et la mention « no JPA », sont extraites par le scanner depuis `build.gradle`, `application.properties` et l'arborescence source, avant même que Claude n'écrive la moindre ligne. Rien n'est deviné.

</details>

<details>
<summary><strong>Une rule chargée automatiquement (<code>.claude/rules/10.backend/01.controller-rules.md</code>)</strong></summary>

````markdown
---
paths:
  - "**/*"
---

#### Controller Rules

##### REST (`io.spring.api.*`)

- Controllers are the SOLE response wrapper for HTTP — no aggregator/facade above them.
  Return `ResponseEntity<?>` or a body Spring serializes via `JacksonCustomizations`.
- Each controller method calls exactly ONE application service method. Multi-source
  composition lives in the application service.
- Controllers MUST NOT import `io.spring.infrastructure.*`. No direct `@Mapper` access.
- Validate command-param arguments with `@Valid`. Custom JSR-303 constraints live under
  `io.spring.application.{aggregate}.*`.
- Resolve the current user via `@AuthenticationPrincipal User`.
- Let exceptions propagate to `io.spring.api.exception.CustomizeExceptionHandler`
  (`@ControllerAdvice`). Do NOT `try/catch` business exceptions inside the controller.

##### GraphQL (`io.spring.graphql.*`)

- DGS components (`@DgsComponent`) are the sole GraphQL response wrappers.
  Use `@DgsQuery` / `@DgsData` / `@DgsMutation`.
- Resolve the current user via `io.spring.graphql.SecurityUtil.getCurrentUser()`.

##### Examples

✅ Correct:
```java
@PostMapping
public ResponseEntity<?> createArticle(@AuthenticationPrincipal User user,
                                       @Valid @RequestBody NewArticleParam param) {
    Article article = articleCommandService.createArticle(param, user);
    ArticleData data = articleQueryService.findById(article.getId(), user)
        .orElseThrow(ResourceNotFoundException::new);
    return ResponseEntity.ok(Map.of("article", data));
}
```

❌ Incorrect:
```java
@PostMapping
public ResponseEntity<?> create(@RequestBody NewArticleParam p) {
    try {
        articleCommandService.createArticle(p, currentUser);
    } catch (Exception e) {                                      // NO — let CustomizeExceptionHandler handle it
        return ResponseEntity.status(500).body(e.getMessage());  // NO — leaks raw message
    }
    return ResponseEntity.ok().build();
}
```
````

Le glob `paths: ["**/*"]` indique à Claude Code de charger automatiquement cette rule dès qu'un fichier du projet est édité. Tous les noms de classe, chemins de paquet et exception handlers proviennent du code scanné, y compris les véritables `CustomizeExceptionHandler` et `JacksonCustomizations` du projet.

</details>

<details>
<summary><strong>Un seed <code>decision-log.md</code> auto-généré (extrait réel)</strong></summary>

```markdown
#### 2026-04-26 — Hexagonal ports & adapters with MyBatis-only persistence

- **Context:** `io.spring.core.*` exposes `*Repository` ports (e.g.,
  `io.spring.core.article.ArticleRepository`) implemented by
  `io.spring.infrastructure.repository.MyBatis*Repository` adapters.
  The domain layer has zero `org.springframework.*` /
  `org.apache.ibatis.*` / `io.spring.infrastructure.*` imports.
- **Options considered:** JPA/Hibernate, Spring Data, MyBatis-Plus
  `BaseMapper`. None adopted.
- **Decision:** MyBatis 3 (`mybatis-spring-boot-starter:2.2.2`) with
  hand-written XML statements under `src/main/resources/mapper/*.xml`.
  Hexagonal port/adapter wiring keeps the domain framework-free.
- **Consequences:** Every SQL lives in XML — `@Select`/`@Insert`/`@Update`/`@Delete`
  annotations are forbidden. New aggregates require both a
  `core.{aggregate}.{Aggregate}Repository` port AND a
  `MyBatis{Aggregate}Repository` adapter; introducing a JPA repository would
  split the persistence model.
```

La passe 4 alimente `decision-log.md` avec les décisions architecturales tirées de `pass2-merged.json`. Les sessions futures gardent ainsi en mémoire le *pourquoi* derrière la base de code, et pas seulement le *à quoi ça ressemble*. Chaque option (« JPA/Hibernate », « MyBatis-Plus ») comme chaque conséquence s'ancre directement dans le bloc de dépendances réel de `build.gradle`.

</details>

---

## Testé sur

ClaudeOS-Core est livré avec des benchmarks de référence mesurés sur de vrais projets open source. Si vous l'avez essayé sur un dépôt public, [ouvrez une issue](https://github.com/claudeos-core/claudeos-core/issues) et le projet rejoindra le tableau.

| Projet | Stack | Scanné → Généré | Statut |
|---|---|---|---|
| [`spring-boot-realworld-example-app`](https://github.com/gothinkster/spring-boot-realworld-example-app) | Java 11 · Spring Boot 2.6 · MyBatis · SQLite | 187 → 75 fichiers | ✅ 5 validateurs au vert |

---

## Démarrage rapide

**Prérequis :** Node.js 18+, [Claude Code](https://docs.anthropic.com/en/docs/claude-code) installé et authentifié.

```bash
# 1. Se placer à la racine du projet
cd my-spring-boot-project

# 2. Lancer init (le code est analysé, puis Claude rédige les rules)
npx claudeos-core init

# 3. Terminé. Ouvrez Claude Code et commencez à coder, les rules sont déjà chargées.
```

Une fois `init` terminé, voici l'arborescence obtenue :

```
your-project/
├── .claude/
│   └── rules/                    ← Chargé automatiquement par Claude Code
│       ├── 00.core/              (rules générales : naming, architecture)
│       ├── 10.backend/           (rules backend, le cas échéant)
│       ├── 20.frontend/          (rules frontend, le cas échéant)
│       ├── 30.security-db/       (conventions sécurité et BD)
│       ├── 40.infra/             (env, logging, CI/CD)
│       ├── 50.sync/              (rappels de synchro doc — rules uniquement)
│       ├── 60.memory/            (rules memory — Pass 4, rules uniquement)
│       ├── 70.domains/{type}/    (rules par domaine, type = backend|frontend)
│       └── 80.verification/      (stratégie de tests et rappels de vérif build)
├── claudeos-core/
│   ├── standard/                 ← Documentation de référence (miroir des catégories)
│   │   ├── 00.core/              (présentation projet, architecture, naming)
│   │   ├── 10.backend/           (référence backend — si stack backend)
│   │   ├── 20.frontend/          (référence frontend — si stack frontend)
│   │   ├── 30.security-db/       (référence sécurité et BD)
│   │   ├── 40.infra/             (référence env / logging / CI-CD)
│   │   ├── 70.domains/{type}/    (référence par domaine)
│   │   ├── 80.verification/      (référence build / startup / tests — standard uniquement)
│   │   └── 90.optional/          (extras spécifiques au stack — standard uniquement)
│   ├── skills/                   (patterns réutilisables que Claude peut appliquer)
│   ├── guide/                    (guides pratiques pour les tâches fréquentes)
│   ├── database/                 (panorama du schéma, guide de migration)
│   ├── mcp-guide/                (notes d'intégration MCP)
│   └── memory/                   (decision log, failure patterns, compaction)
└── CLAUDE.md                     (l'index que Claude lit en premier)
```

Lorsque `rules/` et `standard/` partagent le même préfixe numérique, ils couvrent la même zone conceptuelle : les rules `10.backend` répondent aux standards `10.backend`, par exemple. Deux catégories existent uniquement côté rules : `50.sync` (rappels de synchro doc) et `60.memory` (mémoire issue de la passe 4). Une seule existe uniquement côté standard : `90.optional` (extras spécifiques au stack, sans contrainte d'application). Tous les autres préfixes (`00`, `10`, `20`, `30`, `40`, `70`, `80`) figurent dans les deux. Claude Code connaît désormais le projet.

---

## À qui s'adresse-t-il ?

| Profil | Le problème qui disparaît |
|---|---|
| **Développeur solo** qui démarre un nouveau projet avec Claude Code | « Réexpliquer les conventions à Claude à chaque session » : terminé. `CLAUDE.md` et les `.claude/rules/` répartis en 8 catégories sont générés en une seule passe. |
| **Tech lead** qui maintient des standards communs entre plusieurs dépôts | Les `.claude/rules/` qui dérivent à mesure que les paquets sont renommés, que l'ORM change ou que le wrapper de réponse évolue. ClaudeOS-Core resynchronise tout de façon reproductible : même entrée, même sortie au bit près, donc zéro bruit dans les diffs. |
| **Utilisateur de Claude Code** lassé de corriger le code généré | Mauvais wrapper de réponse, paquets mal organisés, JPA alors que le projet utilise MyBatis, `try/catch` éparpillés alors qu'un middleware centralisé existe. Le scanner extrait les vraies conventions du projet, et chaque passe Claude opère sur une liste blanche de chemins explicite. |
| **Onboarding sur un nouveau dépôt** (projet existant, intégration en équipe) | Un simple `init` suffit pour obtenir une carte d'architecture vivante : tableau de stack dans CLAUDE.md, rules par couche avec exemples ✅/❌, decision log initialisé avec le « pourquoi » des choix structurants (JPA ou MyBatis, REST ou GraphQL, etc.). Lire 5 fichiers vaut mieux qu'éplucher 5 000 fichiers source. |
| **Travail en coréen, japonais, chinois ou 7 autres langues** | La plupart des générateurs de rules pour Claude Code se cantonnent à l'anglais. ClaudeOS-Core produit l'ensemble complet dans **10 langues** (`en/ko/ja/zh-CN/es/vi/hi/ru/fr/de`), avec une **validation structurelle identique au bit près**. Le verdict de `claude-md-validator` reste le même quelle que soit la langue de sortie. |
| **Projet en monorepo** (Turborepo, pnpm/yarn workspaces, Lerna) | Domaines backend et frontend analysés dans la même exécution, avec des prompts distincts. Les répertoires `apps/*/` et `packages/*/` sont parcourus automatiquement, et les rules par stack atterrissent dans `70.domains/{type}/`. |
| **Contribution OSS ou expérimentation** | La sortie reste compatible avec `.gitignore` : `claudeos-core/` est un répertoire de travail local, seuls `CLAUDE.md` et `.claude/` ont vocation à être livrés. La reprise est sûre après interruption et la commande est idempotente. Les éditions manuelles des rules survivent tant que `--force` n'est pas utilisé. |

**Pas adapté si :** vous cherchez un preset universel d'agents, skills et rules qui fonctionne dès le premier jour sans étape de scan (voir [docs/fr/comparison.md](docs/fr/comparison.md) pour situer chaque outil) ; votre projet ne correspond pas encore à l'un des [stacks pris en charge](#supported-stacks) ; ou un simple `CLAUDE.md` vous suffit (dans ce cas, le `claude /init` intégré fait déjà l'affaire, inutile d'installer un outil de plus).

---

## Comment ça marche ?

ClaudeOS-Core inverse le flux Claude Code habituel :

```
Habituel : Vous décrivez le projet → Claude devine votre stack → Claude écrit la doc
Ici :      Le code lit votre stack → Le code passe les faits confirmés à Claude → Claude écrit la doc à partir de ces faits
```

Le pipeline se déroule en **trois étapes**, avec du code de part et d'autre de l'appel LLM.

**1. Étape A — Scanner (reproductible, sans LLM).** Un scanner Node.js parcourt la racine du projet, lit `package.json`, `build.gradle`, `pom.xml` ou `pyproject.toml`, et analyse les fichiers `.env*`. Les variables sensibles (`PASSWORD/SECRET/TOKEN/JWT_SECRET/...`) sont automatiquement masquées. Le scanner classe ensuite le pattern d'architecture (5 patterns Java A/B/C/D/E, Kotlin CQRS ou multi-module, Next.js App ou Pages Router, FSD, components-pattern), identifie les domaines et construit une liste blanche explicite qui recense chaque chemin de fichier source réellement présent. Le tout finit dans `project-analysis.json`, source unique de vérité pour la suite.

**2. Étape B — Pipeline Claude en 4 passes (contraint par les faits de l'étape A).**
- **Pass 1** lit des fichiers représentatifs par groupe de domaines et en extrait 50 à 100 conventions par domaine : wrappers de réponse, bibliothèques de logging, gestion des erreurs, conventions de naming, patterns de tests. La passe tourne une fois par groupe de domaines (`max 4 domains, 40 files per group`), si bien que le contexte ne déborde jamais.
- **Pass 2** fusionne toutes les analyses par domaine en une vue projet globale et tranche les désaccords en retenant la convention dominante.
- **Pass 3** rédige `CLAUDE.md`, `.claude/rules/`, `claudeos-core/standard/`, les skills et les guides. Le travail est découpé en stages (`3a` facts, puis `3b-core/3b-N` rules+standards, puis `3c-core/3c-N` skills+guides, enfin `3d-aux` database+mcp-guide) afin que le prompt de chaque stage tienne dans la fenêtre de contexte du LLM, même lorsque `pass2-merged.json` devient volumineux. Pour les projets de 16 domaines ou plus, 3b et 3c sont à nouveau découpés en lots de 15 domaines maximum.
- **Pass 4** initialise la couche memory L4 (`decision-log.md`, `failure-patterns.md`, `compaction.md`, `auto-rule-update.md`) et ajoute les rules de scaffold universelles. Cette passe a **interdiction de toucher à `CLAUDE.md`** : la section 8 produite par la passe 3 fait autorité.

**3. Étape C — Vérification (reproductible, sans LLM).** Cinq validateurs contrôlent le résultat.
- `claude-md-validator` : 25 vérifications structurelles sur `CLAUDE.md` (8 sections, comptage H3/H4, unicité des fichiers memory, invariant T1 sur les canonical headings). Indépendant de la langue : le verdict reste identique quel que soit `--lang`.
- `content-validator` : 10 vérifications de contenu, dont la vérification des chemins cités (`STALE_PATH` repère les références `src/...` absentes du code) et la détection de drift dans le MANIFEST.
- `pass-json-validator` : bonne forme JSON pour les passes 1/2/3/4 et comptage des sections en fonction du stack.
- `plan-validator` : cohérence plan ↔ disque (legacy, principalement no-op depuis la v2.1.0).
- `sync-checker` : cohérence d'enregistrement disque ↔ `sync-map.json` sur 7 répertoires suivis.

Trois niveaux de sévérité (`fail`, `warn`, `advisory`) cohabitent : ainsi, les warnings ne bloquent jamais la CI pour une hallucination LLM que l'on peut corriger à la main.

L'invariant qui tient tout l'édifice est simple : **Claude ne peut citer que des chemins réellement présents dans le code**, puisque l'étape A lui remet une liste blanche finie. Si le LLM tente malgré tout d'inventer quelque chose (cas rare, mais cela arrive sur certains seeds), l'étape C l'attrape avant la livraison.

Pour les détails par passe, le mécanisme de reprise par marker, le contournement staged-rules face au blocage `.claude/` de Claude Code, et le fonctionnement interne de la stack detection, voir [docs/fr/architecture.md](docs/fr/architecture.md).

---

## Supported Stacks

12 stacks, détectés automatiquement à partir des fichiers de votre projet.

**Backend :** Java/Spring Boot · Kotlin/Spring Boot · Node/Express · Node/Fastify · Node/NestJS · Python/Django · Python/FastAPI · Python/Flask

**Frontend :** Node/Next.js · Node/Vite · Angular · Vue/Nuxt

Les projets multi-stack (par exemple un backend Spring Boot couplé à un frontend Next.js) fonctionnent sans configuration particulière.

Pour les règles de détection et le contenu extrait par chaque scanner, voir [docs/fr/stacks.md](docs/fr/stacks.md).

---

## Flux de travail quotidien

Trois commandes couvrent environ 95 % des usages :

```bash
# Première utilisation sur un projet
npx claudeos-core init

# Après avoir édité manuellement les standards ou les rules
npx claudeos-core lint

# Health check (avant un commit, ou en CI)
npx claudeos-core health
```

Pour les options complètes de chaque commande, voir [docs/fr/commands.md](docs/fr/commands.md). Les commandes du memory layer (`memory compact`, `memory propose-rules`) sont documentées dans la section [Memory Layer](#memory-layer-optionnel-pour-les-projets-longue-durée) ci-dessous.

---

## Ce qui le rend différent

La plupart des outils de documentation pour Claude Code génèrent à partir d'une description : l'utilisateur explique à l'outil, qui transmet ensuite à Claude. ClaudeOS-Core, lui, génère à partir du code source réel : l'outil lit le code, transmet à Claude ce qui est confirmé, et Claude n'écrit que ce qui est confirmé.

Trois conséquences concrètes en découlent.

1. **Détection de stack reproductible.** À projet et code identiques, sortie identique. Plus de « cette fois Claude est parti sur autre chose ».
2. **Aucun chemin fabriqué.** Le prompt de la passe 3 énumère noir sur blanc chaque chemin source autorisé : Claude ne peut donc pas citer un chemin qui n'existe pas.
3. **Pensé multi-stack.** Backend et frontend s'appuient sur des prompts d'analyse distincts, dans une même exécution.

Pour une comparaison de scope côte à côte avec d'autres outils, voir [docs/fr/comparison.md](docs/fr/comparison.md). Cette comparaison décrit **ce que chaque outil fait**, pas **lequel est meilleur** : la plupart sont en réalité complémentaires.

---

## Vérification (post-génération)

Une fois la documentation rédigée par Claude, le code prend le relais pour la valider. Cinq validateurs distincts entrent en jeu.

| Validateur | Ce qu'il vérifie | Lancé par |
|---|---|---|
| `claude-md-validator` | Invariants structurels de CLAUDE.md (8 sections, indépendant de la langue) | `claudeos-core lint` |
| `content-validator` | Existence réelle des chemins cités, cohérence du manifest | `health` (advisory) |
| `pass-json-validator` | Bonne forme JSON des sorties Pass 1 / 2 / 3 / 4 | `health` (warn) |
| `plan-validator` | Correspondance entre le plan sauvegardé et le disque | `health` (fail-on-error) |
| `sync-checker` | Correspondance entre les fichiers sur disque et les entrées de `sync-map.json` (détection orphaned/unregistered) | `health` (fail-on-error) |

Un `health-checker` orchestre les quatre validateurs runtime selon les trois niveaux de sévérité (fail / warn / advisory) et sort avec le code adapté à la CI. `claude-md-validator`, en revanche, se lance séparément via la commande `lint` : un drift structurel n'est pas un simple warning, c'est le signal qu'il faut relancer `init`. Exécution possible à tout moment :

```bash
npx claudeos-core health
```

Pour le détail des contrôles de chaque validateur, voir [docs/fr/verification.md](docs/fr/verification.md).

---

## Memory Layer (optionnel, pour les projets longue durée)

Au-delà du pipeline de scaffolding décrit plus haut, ClaudeOS-Core initialise un dossier `claudeos-core/memory/` pour les projets dont le contexte dépasse une seule session. La couche est optionnelle : on peut tout à fait l'ignorer si seuls `CLAUDE.md` et les rules sont nécessaires.

Quatre fichiers, tous écrits par la passe 4 :

- `decision-log.md` : journal append-only du « pourquoi avoir choisi X plutôt que Y », initialisé depuis `pass2-merged.json`.
- `failure-patterns.md` : erreurs récurrentes, accompagnées de scores frequency / importance.
- `compaction.md` : description de la compaction automatique de la mémoire au fil du temps.
- `auto-rule-update.md` : patterns qui devraient être promus au rang de nouvelles rules.

Deux commandes assurent la maintenance de cette couche dans la durée :

```bash
# Compacter le log failure-patterns (à lancer périodiquement)
npx claudeos-core memory compact

# Promouvoir les failure patterns fréquents en rules proposées
npx claudeos-core memory propose-rules
```

Pour le modèle de mémoire et son cycle de vie, voir [docs/fr/memory-layer.md](docs/fr/memory-layer.md).

---

## FAQ

**Q : Faut-il une clé API Claude ?**
R : Non. ClaudeOS-Core s'appuie sur l'installation Claude Code déjà présente sur le poste et envoie les prompts à `claude -p` en local. Aucun compte supplémentaire n'est requis.

**Q : Mes CLAUDE.md ou `.claude/rules/` existants seront-ils écrasés ?**
R : Sur un projet vierge, ils sont créés. En réexécution sans `--force`, les éditions sont préservées : les pass markers du run précédent sont détectés et les passes correspondantes sont sautées. Avec `--force`, tout est effacé et régénéré depuis zéro : les éditions sont alors perdues, et c'est précisément le rôle de `--force`. Voir [docs/fr/safety.md](docs/fr/safety.md).

**Q : Mon stack n'est pas pris en charge. Puis-je l'ajouter ?**
R : Oui. Compter environ 3 templates de prompts et un domain scanner pour un nouveau stack. Voir [CONTRIBUTING.md](CONTRIBUTING.md) pour le guide en 8 étapes.

**Q : Comment générer la documentation en coréen (ou dans une autre langue) ?**
R : `npx claudeos-core init --lang ko`. 10 langues prises en charge : en, ko, ja, zh-CN, es, vi, hi, ru, fr, de.

**Q : Cela fonctionne-t-il avec les monorepos ?**
R : Oui. Turborepo (`turbo.json`), pnpm workspaces (`pnpm-workspace.yaml`), Lerna (`lerna.json`) et les npm/yarn workspaces (`package.json#workspaces`) sont reconnus par le stack-detector, et chaque app obtient sa propre analyse. D'autres layouts (NX, par exemple) ne sont pas détectés explicitement, mais les patterns génériques `apps/*/` et `packages/*/` restent captés par les scanners par stack.

**Q : Et si Claude Code génère des rules avec lesquelles je ne suis pas d'accord ?**
R : Éditez-les directement, puis lancez `npx claudeos-core lint` pour vérifier que CLAUDE.md reste structurellement valide. Les éditions sont préservées lors des prochains `init` (sans `--force`), car le mécanisme de reprise saute les passes dont les markers existent déjà.

**Q : Où signaler les bugs ?**
R : Sur les [GitHub Issues](https://github.com/claudeos-core/claudeos-core/issues). Pour les problèmes de sécurité, voir [SECURITY.md](SECURITY.md).

---

## Si cela vous a fait gagner du temps

Une ⭐ sur GitHub aide à garder le projet visible et à le faire découvrir. Les issues, les PR et les contributions de templates de stack sont les bienvenues. Voir [CONTRIBUTING.md](CONTRIBUTING.md).

---

## Documentation

| Sujet | À lire |
|---|---|
| Fonctionnement du pipeline 4-pass (plus en profondeur que le diagramme) | [docs/fr/architecture.md](docs/fr/architecture.md) |
| Diagrammes visuels (Mermaid) de l'architecture | [docs/fr/diagrams.md](docs/fr/diagrams.md) |
| Stack detection : ce que chaque scanner cherche | [docs/fr/stacks.md](docs/fr/stacks.md) |
| Memory layer : decision logs et failure patterns | [docs/fr/memory-layer.md](docs/fr/memory-layer.md) |
| Les 5 validateurs en détail | [docs/fr/verification.md](docs/fr/verification.md) |
| Toutes les commandes CLI et leurs options | [docs/fr/commands.md](docs/fr/commands.md) |
| Installation manuelle (sans `npx`) | [docs/fr/manual-installation.md](docs/fr/manual-installation.md) |
| Overrides du scanner : `.claudeos-scan.json` | [docs/fr/advanced-config.md](docs/fr/advanced-config.md) |
| Sécurité : ce qui est préservé en cas de re-init | [docs/fr/safety.md](docs/fr/safety.md) |
| Comparaison avec des outils similaires (scope, pas qualité) | [docs/fr/comparison.md](docs/fr/comparison.md) |
| Erreurs et récupération | [docs/fr/troubleshooting.md](docs/fr/troubleshooting.md) |

---

## Contribuer

Les contributions sont bienvenues : ajout de support de stack, amélioration des prompts, corrections de bugs. Voir [CONTRIBUTING.md](CONTRIBUTING.md).

Pour le code de conduite et la politique de sécurité, voir [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) et [SECURITY.md](SECURITY.md).

## Licence

[ISC License](LICENSE). Libre pour tout usage, y compris commercial. © 2025–2026 ClaudeOS-Core contributors.

---

<sub>Maintenu par l'équipe [claudeos-core](https://github.com/claudeos-core). Issues et PR sur <https://github.com/claudeos-core/claudeos-core>.</sub>
