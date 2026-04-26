# ClaudeOS-Core

[![npm version](https://img.shields.io/npm/v/claudeos-core.svg?logo=npm&label=npm)](https://www.npmjs.com/package/claudeos-core)
[![CI](https://img.shields.io/github/actions/workflow/status/claudeos-core/claudeos-core/test.yml?branch=master&logo=github&label=CI)](https://github.com/claudeos-core/claudeos-core/actions/workflows/test.yml)
[![tests](https://img.shields.io/badge/tests-736%20passing-brightgreen?logo=node.js&logoColor=white)](https://github.com/claudeos-core/claudeos-core/actions/workflows/test.yml)
[![node](https://img.shields.io/node/v/claudeos-core.svg?logo=node.js&logoColor=white&label=node)](https://nodejs.org/)
[![license](https://img.shields.io/npm/l/claudeos-core.svg?color=blue)](LICENSE)
[![downloads](https://img.shields.io/npm/dm/claudeos-core.svg?logo=npm&color=blue&label=downloads)](https://www.npmjs.com/package/claudeos-core)

**Faites suivre à Claude Code les conventions de VOTRE projet dès la première tentative — pas des valeurs par défaut génériques.**

Un scanner Node.js déterministe lit d'abord votre code ; un pipeline Claude en 4 passes écrit ensuite l'ensemble complet — `CLAUDE.md` + `.claude/rules/` auto-chargé + standards + skills + L4 memory. 10 langues de sortie, 5 validators post-génération, et une path allowlist explicite qui empêche le LLM d'inventer des fichiers ou frameworks absents de votre code.

Fonctionne sur [**12 stacks**](#supported-stacks) (monorepos inclus) — une seule commande `npx`, sans config, resume-safe, idempotent.

```bash
npx claudeos-core init
```

[🇺🇸 English](README.md) · [🇰🇷 한국어](README.ko.md) · [🇨🇳 中文](README.zh-CN.md) · [🇯🇵 日本語](README.ja.md) · [🇪🇸 Español](README.es.md) · [🇻🇳 Tiếng Việt](README.vi.md) · [🇮🇳 हिन्दी](README.hi.md) · [🇷🇺 Русский](README.ru.md) · [🇩🇪 Deutsch](README.de.md)

---

## C'est quoi cet outil ?

Vous utilisez Claude Code. Il est puissant, mais chaque session démarre à zéro — il n'a aucun souvenir de la façon dont _votre_ projet est structuré. Du coup, il retombe sur des valeurs par défaut « globalement bonnes » qui correspondent rarement à ce que votre équipe fait réellement :

- Votre équipe utilise **MyBatis**, mais Claude génère des repositories JPA.
- Votre wrapper de réponse est `ApiResponse.ok()`, mais Claude écrit `ResponseEntity.success()`.
- Vos packages sont organisés par couche (`controller/order/`), mais Claude crée par domaine (`order/controller/`).
- Vos erreurs passent par un middleware centralisé, mais Claude éparpille des `try/catch` dans chaque endpoint.

Vous voudriez un jeu de `.claude/rules/` par projet — Claude Code le charge automatiquement à chaque session — mais écrire ces rules à la main pour chaque nouveau repo prend des heures, et elles dérivent à mesure que le code évolue.

**ClaudeOS-Core les écrit pour vous, à partir de votre code source réel.** Un scanner Node.js déterministe lit d'abord votre projet (stack, ORM, layout des packages, conventions, chemins de fichiers). Puis un pipeline Claude en 4 passes transforme les faits extraits en un ensemble documentaire complet :

- **`CLAUDE.md`** — l'index projet que Claude lit à chaque session
- **`.claude/rules/`** — rules auto-chargées par catégorie (`00.core` / `10.backend` / `20.frontend` / `30.security-db` / `40.infra` / `60.memory` / `70.domains` / `80.verification`)
- **`claudeos-core/standard/`** — documents de référence (le « pourquoi » derrière chaque rule)
- **`claudeos-core/skills/`** — patterns réutilisables (CRUD scaffolding, templates de pages)
- **`claudeos-core/memory/`** — decision log + failure patterns qui grandissent avec le projet

Parce que le scanner remet à Claude une path allowlist explicite, le LLM **ne peut pas inventer de fichiers ou frameworks qui ne sont pas dans votre code**. Cinq validators post-génération (`claude-md-validator`, `content-validator`, `pass-json-validator`, `plan-validator`, `sync-checker`) vérifient la sortie avant qu'elle ne soit publiée — language-invariant, donc les mêmes règles s'appliquent que vous génériez en anglais, en coréen ou dans l'une des 8 autres langues.

```
Avant :   Vous → Claude Code → code « globalement bon » → corrections manuelles à chaque fois
Après :   Vous → Claude Code → code qui colle à VOTRE projet → on expédie
```

---

## Démo sur un projet réel

Exécution sur [`spring-boot-realworld-example-app`](https://github.com/gothinkster/spring-boot-realworld-example-app) — Java 11 · Spring Boot 2.6 · MyBatis · SQLite · 187 source files. Résultat : **75 generated files**, durée totale **53 minutes**, tous les validators ✅.

<p align="center">
  <img src="docs/assets/spring-boot-realworld-demo.gif" alt="ClaudeOS-Core init running on spring-boot-realworld-example-app — stack detection, 4-pass pipeline, validators, completion summary" width="769">
</p>

<details>
<summary><strong>📺 Sortie terminal (version texte, pour recherche et copie)</strong></summary>

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
    🚀 Pass 3 split mode (3a → 3b → 3c → 3d-aux)
    ✅ 3a complete (2m 57s)            — pass3a-facts.md (187-path allowlist)
    ✅ 3b complete (18m 49s)           — CLAUDE.md + 19 standards + 20 rules
    ✅ 3c complete (12m 35s)           — 13 skills + 9 guides
    ✅ 3d-aux complete (3m 18s)        — database/ + mcp-guide/
    🎉 Pass 3 split complete: 4/4 stages successful
    [███████████████░░░░░] 75% (3/4)

[7] Pass 4 — Memory scaffolding...
    📦 Pass 4 staged-rules: 6 rule files moved to .claude/rules/
    ✅ Pass 4 complete (5m)
       📋 Gap-fill: all 12 expected files already present
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
<summary><strong>📄 Ce qui se retrouve dans votre <code>CLAUDE.md</code> (extrait réel — Section 1 + 2)</strong></summary>

```markdown
# CLAUDE.md — spring-boot-realworld-example-app

> Reference implementation of the RealWorld backend specification on
> Java 11 + Spring Boot 2.6, exposing both REST and GraphQL endpoints
> over a hexagonal MyBatis persistence layer.

## 1. Role Definition

As the senior developer for this repository, you are responsible for
writing, modifying, and reviewing code. Responses must be written in English.
A Java Spring Boot REST + GraphQL API server organized around a hexagonal
(ports & adapters) architecture, with a CQRS-lite read/write split inside
an XML-driven MyBatis persistence layer and JWT-based authentication.

## 2. Project Overview

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

Chaque valeur ci-dessus — coordonnées exactes des dépendances, le nom de fichier `dev.db`, le nom de migration `V1__create_tables.sql`, « no JPA » — est extraite par le scanner depuis `build.gradle` / `application.properties` / l'arbre source avant que Claude n'écrive le fichier. Rien n'est deviné.

</details>

<details>
<summary><strong>🛡️ Une rule réelle auto-chargée (<code>.claude/rules/10.backend/01.controller-rules.md</code>)</strong></summary>

````markdown
---
paths:
  - "**/*"
---

# Controller Rules

## REST (`io.spring.api.*`)

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

## GraphQL (`io.spring.graphql.*`)

- DGS components (`@DgsComponent`) are the sole GraphQL response wrappers.
  Use `@DgsQuery` / `@DgsData` / `@DgsMutation`.
- Resolve the current user via `io.spring.graphql.SecurityUtil.getCurrentUser()`.

## Examples

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

Le glob `paths: ["**/*"]` signifie que Claude Code charge automatiquement cette rule chaque fois que vous éditez un fichier du projet. Chaque nom de classe, chemin de package et exception handler dans la rule provient directement du source scanné — y compris les `CustomizeExceptionHandler` et `JacksonCustomizations` réels du projet.

</details>

<details>
<summary><strong>🧠 Un seed <code>decision-log.md</code> auto-généré (extrait réel)</strong></summary>

```markdown
## 2026-04-26 — Hexagonal ports & adapters with MyBatis-only persistence

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

Pass 4 ensemence `decision-log.md` avec les décisions architecturales extraites de `pass2-merged.json` afin que les sessions futures se souviennent du *pourquoi* la codebase ressemble à ce qu'elle est — pas seulement *à quoi* elle ressemble. Chaque option (« JPA/Hibernate », « MyBatis-Plus ») et chaque conséquence sont ancrées dans le bloc de dépendances réel de `build.gradle`.

</details>

---

## Quick Start

**Prérequis :** Node.js 18+, [Claude Code](https://docs.anthropic.com/en/docs/claude-code) installé et authentifié.

```bash
# 1. Aller à la racine du projet
cd my-spring-boot-project

# 2. Lancer init (analyse votre code et demande à Claude d'écrire les rules)
npx claudeos-core init

# 3. Terminé. Ouvrez Claude Code et codez — vos rules sont déjà chargées.
```

**Ce que vous obtenez** une fois `init` terminé :

```
your-project/
├── .claude/
│   └── rules/                    ← Auto-chargé par Claude Code
│       ├── 00.core/              (rules générales — naming, architecture)
│       ├── 10.backend/           (rules de stack backend, le cas échéant)
│       ├── 20.frontend/          (rules de stack frontend, le cas échéant)
│       ├── 30.security-db/       (sécurité & conventions DB)
│       ├── 40.infra/             (env, logging, CI/CD)
│       ├── 50.sync/              (rappels de doc-sync — rules only)
│       ├── 60.memory/            (memory rules — Pass 4, rules only)
│       ├── 70.domains/{type}/    (rules par domaine, type = backend|frontend)
│       └── 80.verification/      (stratégie de tests + rappels de vérification du build)
├── claudeos-core/
│   ├── standard/                 ← Documents de référence (miroir de la structure des catégories)
│   │   ├── 00.core/              (vue d'ensemble du projet, architecture, naming)
│   │   ├── 10.backend/           (référence backend — si stack backend)
│   │   ├── 20.frontend/          (référence frontend — si stack frontend)
│   │   ├── 30.security-db/       (référence sécurité & DB)
│   │   ├── 40.infra/             (référence env / logging / CI-CD)
│   │   ├── 70.domains/{type}/    (référence par domaine)
│   │   ├── 80.verification/      (référence build / startup / tests — standard only)
│   │   └── 90.optional/          (extras spécifiques au stack — standard only)
│   ├── skills/                   (patterns réutilisables que Claude peut appliquer)
│   ├── guide/                    (how-to guides pour les tâches courantes)
│   ├── database/                 (vue d'ensemble du schéma, guide de migration)
│   ├── mcp-guide/                (notes d'intégration MCP)
│   └── memory/                   (decision log, failure patterns, compaction)
└── CLAUDE.md                     (l'index que Claude lit en premier)
```

Les catégories partageant le même préfixe numérique entre `rules/` et `standard/` représentent la même zone conceptuelle (par ex. `10.backend` rules ↔ `10.backend` standards). Catégories rules-only : `50.sync` (rappels de sync de docs) et `60.memory` (Pass 4 memory). Catégorie standard-only : `90.optional` (extras spécifiques au stack sans application). Tous les autres préfixes (`00`, `10`, `20`, `30`, `40`, `70`, `80`) apparaissent à la fois dans `rules/` et `standard/`. Désormais, Claude Code connaît votre projet.

---

## À qui s'adresse cet outil ?

| Vous êtes... | La douleur que ça enlève |
|---|---|
| **Un développeur solo** qui démarre un nouveau projet avec Claude Code | « Apprendre mes conventions à Claude à chaque session » — fini. `CLAUDE.md` + `.claude/rules/` à 8 catégories générés en une seule passe. |
| **Un team lead** qui maintient des standards partagés sur plusieurs repos | `.claude/rules/` qui dérive quand on renomme des packages, change d'ORM ou de wrapper de réponse. ClaudeOS-Core resynchronise de façon déterministe — même entrée, sortie byte-identique, aucun bruit dans les diffs. |
| **Déjà utilisateur de Claude Code** mais fatigué de corriger le code généré | Mauvais wrapper de réponse, mauvais layout de packages, JPA quand vous utilisez MyBatis, `try/catch` éparpillés alors que votre projet utilise un middleware centralisé. Le scanner extrait vos vraies conventions ; chaque passe Claude tourne contre une path allowlist explicite. |
| **En cours d'onboarding sur un nouveau repo** (projet existant, intégration d'équipe) | Lancez `init` sur le repo, obtenez une carte d'architecture vivante : table de stack dans CLAUDE.md, rules par couche avec exemples ✅/❌, decision log ensemencé avec le « pourquoi » des choix majeurs (JPA vs MyBatis, REST vs GraphQL, etc.). Lire 5 fichiers vaut mieux que lire 5 000 fichiers source. |
| **Travaillant en coréen / japonais / chinois / 7 autres langues** | La plupart des générateurs de rules Claude Code sont en anglais uniquement. ClaudeOS-Core écrit l'ensemble complet en **10 langues** (`en/ko/ja/zh-CN/es/vi/hi/ru/fr/de`) avec **validation structurelle byte-identique** — même verdict `claude-md-validator` quelle que soit la langue de sortie. |
| **Sur un monorepo** (Turborepo, pnpm/yarn workspaces, Lerna) | Domaines backend + frontend analysés en une seule exécution avec des prompts séparés ; `apps/*/` et `packages/*/` parcourus automatiquement ; rules par stack émises sous `70.domains/{type}/`. |
| **Contributeur OSS ou expérimentation** | Sortie gitignore-friendly — `claudeos-core/` est votre dir de travail local, seuls `CLAUDE.md` + `.claude/` doivent être expédiés. Resume-safe en cas d'interruption ; idempotent à la réexécution (vos éditions manuelles de rules survivent sans `--force`). |

**Pas adapté si :** vous voulez un bundle preset universel d'agents/skills/rules qui fonctionne dès le premier jour sans étape de scan (voir [docs/fr/comparison.md](docs/fr/comparison.md) pour ce qui convient où), votre projet n'entre pas encore dans l'un des [stacks supportés](#supported-stacks), ou vous n'avez besoin que d'un seul `CLAUDE.md` (le `claude /init` intégré suffit — pas besoin d'installer un autre outil).

---

## Comment ça marche ?

ClaudeOS-Core inverse le workflow Claude Code habituel :

```
Habituel : Vous décrivez le projet → Claude devine votre stack → Claude écrit la doc
Ici :      Le code lit votre stack → Le code transmet les faits confirmés à Claude → Claude écrit à partir des faits
```

Le pipeline tourne en **trois étapes**, avec du code des deux côtés de l'appel LLM :

**1. Step A — Scanner (déterministe, sans LLM).** Un scanner Node.js parcourt la racine de votre projet, lit `package.json` / `build.gradle` / `pom.xml` / `pyproject.toml`, parse les fichiers `.env*` (avec redaction des variables sensibles pour `PASSWORD/SECRET/TOKEN/JWT_SECRET/...`), classifie votre pattern d'architecture (5 patterns Java A/B/C/D/E, Kotlin CQRS / multi-module, Next.js App vs Pages Router, FSD, components-pattern), découvre les domaines, et construit une allowlist explicite de chaque chemin de fichier source qui existe. Sortie : `project-analysis.json` — la source de vérité unique pour ce qui suit.

**2. Step B — pipeline Claude en 4 passes (contraint par les faits de Step A).**
- **Pass 1** lit les fichiers représentatifs par groupe de domaines et extrait ~50–100 conventions par domaine — wrappers de réponse, libraries de logging, error handling, conventions de naming, patterns de tests. Tourne une fois par groupe de domaines (`max 4 domains, 40 files per group`) afin que le contexte ne déborde jamais.
- **Pass 2** fusionne toutes les analyses par domaine en une vue projet globale et résout les désaccords en choisissant la convention dominante.
- **Pass 3** écrit `CLAUDE.md` + `.claude/rules/` + `claudeos-core/standard/` + skills + guides — divisé en stages (`3a` faits → `3b-core/3b-N` rules+standards → `3c-core/3c-N` skills+guides → `3d-aux` database+mcp-guide) afin que le prompt de chaque stage tienne dans la fenêtre de contexte du LLM même quand `pass2-merged.json` est gros. Sub-divise 3b/3c en batches ≤15 domaines pour les projets ≥16 domaines.
- **Pass 4** ensemence le L4 memory layer (`decision-log.md`, `failure-patterns.md`, `compaction.md`, `auto-rule-update.md`) et ajoute les rules de scaffold universelles. Pass 4 a **interdiction de modifier `CLAUDE.md`** — la Section 8 de Pass 3 fait autorité.

**3. Step C — Verification (déterministe, sans LLM).** Cinq validators vérifient la sortie :
- `claude-md-validator` — 25 checks structurels sur `CLAUDE.md` (8 sections, comptes H3/H4, unicité des fichiers de mémoire, T1 canonical heading invariant). Language-invariant : même verdict quel que soit `--lang`.
- `content-validator` — 10 checks de contenu dont la vérification des path claims (`STALE_PATH` attrape les références fabriquées `src/...`) et la détection de drift du MANIFEST.
- `pass-json-validator` — Pass 1/2/3/4 JSON well-formedness + comptage de sections stack-aware.
- `plan-validator` — cohérence plan ↔ disque (legacy, principalement no-op depuis v2.1.0).
- `sync-checker` — cohérence d'enregistrement disque ↔ `sync-map.json` à travers 7 répertoires suivis.

Trois niveaux de sévérité (`fail` / `warn` / `advisory`) pour que les warnings ne bloquent jamais la CI sur des hallucinations LLM que l'utilisateur peut corriger manuellement.

L'invariant qui lie le tout : **Claude ne peut citer que des chemins qui existent réellement dans votre code**, parce que Step A lui remet une allowlist finie. Si le LLM essaie quand même d'inventer (rare mais arrive sur certains seeds), Step C l'attrape avant que la doc ne soit expédiée.

Pour les détails par passe, le resume basé sur markers, le contournement staged-rules pour le sensitive-path block `.claude/` de Claude Code, et les internals de la détection de stack, voir [docs/fr/architecture.md](docs/fr/architecture.md).

---

## Supported Stacks

12 stacks, auto-détectés depuis vos fichiers projet :

**Backend :** Java/Spring Boot · Kotlin/Spring Boot · Node/Express · Node/Fastify · Node/NestJS · Python/Django · Python/FastAPI · Python/Flask

**Frontend :** Node/Next.js · Node/Vite · Angular · Vue/Nuxt

Les projets multi-stack (par ex. backend Spring Boot + frontend Next.js) fonctionnent d'emblée.

Pour les règles de détection et ce que chaque scanner extrait, voir [docs/fr/stacks.md](docs/fr/stacks.md).

---

## Workflow quotidien

Trois commandes couvrent ~95 % de l'usage :

```bash
# Première fois sur un projet
npx claudeos-core init

# Après avoir édité manuellement les standards ou rules
npx claudeos-core lint

# Health check (avant les commits, ou en CI)
npx claudeos-core health
```

Deux autres pour la maintenance du memory layer :

```bash
# Compacter le log failure-patterns (à exécuter périodiquement)
npx claudeos-core memory compact

# Promouvoir des failure patterns fréquents en rules proposées
npx claudeos-core memory propose-rules
```

Pour toutes les options de chaque commande, voir [docs/fr/commands.md](docs/fr/commands.md).

---

## Ce qui distingue cet outil

La plupart des outils de documentation Claude Code génèrent à partir d'une description (vous expliquez à l'outil, l'outil explique à Claude). ClaudeOS-Core génère à partir de votre code source réel (l'outil lit, l'outil dit à Claude ce qui est confirmé, Claude n'écrit que ce qui est confirmé).

Trois conséquences concrètes :

1. **Détection de stack déterministe.** Même projet + même code = même sortie. Pas de « Claude a tiré différemment cette fois-ci ».
2. **Aucun chemin inventé.** Le prompt de Pass 3 liste explicitement chaque chemin source autorisé ; Claude ne peut pas citer de chemins qui n'existent pas.
3. **Conscience multi-stack.** Backend et frontend domains utilisent des prompts d'analyse différents dans la même exécution.

Pour une comparaison côte-à-côte de scope avec d'autres outils, voir [docs/fr/comparison.md](docs/fr/comparison.md). La comparaison porte sur **ce que fait chaque outil**, pas **lequel est le meilleur** — la plupart sont complémentaires.

---

## Vérification (post-génération)

Une fois la doc écrite par Claude, le code la vérifie. Cinq validators distincts :

| Validator | Ce qu'il vérifie | Lancé par |
|---|---|---|
| `claude-md-validator` | Invariants structurels de CLAUDE.md (8 sections, language-invariant) | `claudeos-core lint` |
| `content-validator` | Les chemins cités existent vraiment ; cohérence du manifest | `health` (advisory) |
| `pass-json-validator` | Sorties Pass 1 / 2 / 3 / 4 bien formées en JSON | `health` (warn) |
| `plan-validator` | Le plan sauvegardé correspond au disque | `health` (fail-on-error) |
| `sync-checker` | Les fichiers du disque correspondent aux enregistrements `sync-map.json` (détection orphaned/unregistered) | `health` (fail-on-error) |

Un `health-checker` orchestre les quatre validators d'exécution avec une sévérité à trois niveaux (fail / warn / advisory) et sort avec le code approprié pour la CI. `claude-md-validator` est lancé séparément via la commande `lint` car le drift structurel est un signal de re-init, pas un soft warning. À exécuter à tout moment :

```bash
npx claudeos-core health
```

Pour le détail des checks de chaque validator, voir [docs/fr/verification.md](docs/fr/verification.md).

---

## Memory Layer (optionnel, pour les projets longs)

Depuis v2.0, ClaudeOS-Core écrit un dossier `claudeos-core/memory/` contenant quatre fichiers :

- `decision-log.md` — append-only « pourquoi nous avons choisi X plutôt que Y »
- `failure-patterns.md` — erreurs récurrentes avec scores frequency/importance
- `compaction.md` — comment la memory est auto-compactée au fil du temps
- `auto-rule-update.md` — patterns qui devraient devenir de nouvelles rules

Vous pouvez exécuter `npx claudeos-core memory propose-rules` pour demander à Claude d'examiner les failure patterns récents et de suggérer de nouvelles rules à ajouter.

Pour le modèle memory et son cycle de vie, voir [docs/fr/memory-layer.md](docs/fr/memory-layer.md).

---

## FAQ

**Q : Ai-je besoin d'une clé API Claude ?**
R : Non. ClaudeOS-Core utilise votre installation Claude Code existante — il pipe les prompts vers `claude -p` sur votre machine. Pas de comptes supplémentaires.

**Q : Cela écrasera-t-il mon CLAUDE.md ou `.claude/rules/` existants ?**
R : Première exécution sur un projet vierge : ils sont créés. Réexécution sans `--force` : vos éditions sont préservées — les markers de pass de l'exécution précédente sont détectés et les passes sont sautées. Réexécution avec `--force` : tout est wipé et régénéré (vos éditions sont perdues — c'est ce que `--force` veut dire). Voir [docs/fr/safety.md](docs/fr/safety.md).

**Q : Mon stack n'est pas supporté. Puis-je en ajouter un ?**
R : Oui. Un nouveau stack nécessite ~3 templates de prompt + un domain scanner. Voir [CONTRIBUTING.md](CONTRIBUTING.md) pour le guide en 8 étapes.

**Q : Comment générer la doc en français (ou dans une autre langue) ?**
R : `npx claudeos-core init --lang fr`. 10 langues supportées : en, ko, ja, zh-CN, es, vi, hi, ru, fr, de.

**Q : Cela fonctionne-t-il avec les monorepos ?**
R : Oui — Turborepo (`turbo.json`), pnpm workspaces (`pnpm-workspace.yaml`), Lerna (`lerna.json`) et npm/yarn workspaces (`package.json#workspaces`) sont détectés par le stack-detector. Chaque app a sa propre analyse. Les autres layouts de monorepo (par ex. NX) ne sont pas spécifiquement détectés, mais les patterns génériques `apps/*/` et `packages/*/` sont quand même pris en compte par les scanners par stack.

**Q : Et si Claude Code génère des rules avec lesquelles je suis en désaccord ?**
R : Éditez-les directement. Puis exécutez `npx claudeos-core lint` pour vérifier que CLAUDE.md est toujours structurellement valide. Vos éditions sont préservées sur les exécutions `init` suivantes (sans `--force`) — le mécanisme de resume saute les passes dont les markers existent.

**Q : Où signaler les bugs ?**
R : [GitHub Issues](https://github.com/claudeos-core/claudeos-core/issues). Pour les problèmes de sécurité, voir [SECURITY.md](SECURITY.md).

---

## Documentation

| Sujet | À lire |
|---|---|
| Comment fonctionne le pipeline 4-pass (plus en profondeur que le diagramme) | [docs/fr/architecture.md](docs/fr/architecture.md) |
| Diagrammes visuels (Mermaid) de l'architecture | [docs/fr/diagrams.md](docs/fr/diagrams.md) |
| Détection de stack — ce que chaque scanner cherche | [docs/fr/stacks.md](docs/fr/stacks.md) |
| Memory layer — decision logs et failure patterns | [docs/fr/memory-layer.md](docs/fr/memory-layer.md) |
| Les 5 validators en détail | [docs/fr/verification.md](docs/fr/verification.md) |
| Toutes les commandes CLI et options | [docs/fr/commands.md](docs/fr/commands.md) |
| Installation manuelle (sans `npx`) | [docs/fr/manual-installation.md](docs/fr/manual-installation.md) |
| Overrides de scanner — `.claudeos-scan.json` | [docs/fr/advanced-config.md](docs/fr/advanced-config.md) |
| Sécurité : ce qui est préservé lors d'un re-init | [docs/fr/safety.md](docs/fr/safety.md) |
| Comparaison avec des outils similaires (scope, pas qualité) | [docs/fr/comparison.md](docs/fr/comparison.md) |
| Erreurs et récupération | [docs/fr/troubleshooting.md](docs/fr/troubleshooting.md) |

---

## Contribuer

Les contributions sont les bienvenues — ajout de support pour un stack, amélioration des prompts, correction de bugs. Voir [CONTRIBUTING.md](CONTRIBUTING.md).

Pour le Code of Conduct et la politique de sécurité, voir [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) et [SECURITY.md](SECURITY.md).

## Licence

[ISC](LICENSE) — gratuit pour tout usage, y compris commercial.

---

<sub>Construit avec soin par [@claudeos-core](https://github.com/claudeos-core). Si cela vous a fait gagner du temps, une ⭐ sur GitHub aide à garder le projet visible.</sub>
