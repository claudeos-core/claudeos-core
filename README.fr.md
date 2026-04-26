# ClaudeOS-Core

[![npm version](https://img.shields.io/npm/v/claudeos-core.svg?logo=npm&label=npm)](https://www.npmjs.com/package/claudeos-core)
[![CI](https://img.shields.io/github/actions/workflow/status/claudeos-core/claudeos-core/test.yml?branch=master&logo=github&label=CI)](https://github.com/claudeos-core/claudeos-core/actions/workflows/test.yml)
[![tests](https://img.shields.io/badge/tests-736%20passing-brightgreen?logo=node.js&logoColor=white)](https://github.com/claudeos-core/claudeos-core/actions/workflows/test.yml)
[![node](https://img.shields.io/node/v/claudeos-core.svg?logo=node.js&logoColor=white&label=node)](https://nodejs.org/)
[![license](https://img.shields.io/npm/l/claudeos-core.svg?color=blue)](LICENSE)
[![downloads](https://img.shields.io/npm/dm/claudeos-core.svg?logo=npm&color=blue&label=downloads)](https://www.npmjs.com/package/claudeos-core)

**Une CLI deterministic qui auto-génère `CLAUDE.md` + `.claude/rules/` à partir de votre code source réel — Node.js scanner + pipeline Claude 4-pass + 5 validators. 12 stacks, 10 langues, aucun chemin inventé.**

```bash
npx claudeos-core init
```

Fonctionne sur [**12 stacks**](#supported-stacks) (monorepos inclus) — une seule commande, aucune configuration, resume-safe, idempotent.

[🇺🇸 English](README.md) · [🇰🇷 한국어](README.ko.md) · [🇨🇳 中文](README.zh-CN.md) · [🇯🇵 日本語](README.ja.md) · [🇪🇸 Español](README.es.md) · [🇻🇳 Tiếng Việt](README.vi.md) · [🇮🇳 हिन्दी](README.hi.md) · [🇷🇺 Русский](README.ru.md) · [🇩🇪 Deutsch](README.de.md)

---

## C'est quoi ?

Claude Code retombe sur les valeurs par défaut du framework à chaque session. Votre équipe utilise **MyBatis**, mais Claude écrit du JPA. Votre wrapper est `ApiResponse.ok()`, mais Claude écrit `ResponseEntity.success()`. Vos paquets sont layer-first, mais Claude génère du domain-first. Écrire `.claude/rules/` à la main pour chaque repo règle le problème — jusqu'à ce que le code évolue et que vos rules drift.

**ClaudeOS-Core les régénère de manière deterministic, à partir de votre code source réel.** Un Node.js scanner lit d'abord (stack, ORM, layout des paquets, chemins de fichiers). Un pipeline Claude 4-pass écrit ensuite l'ensemble complet — `CLAUDE.md` + `.claude/rules/` auto-chargés + standards + skills — contraint par une allowlist explicite de chemins dont le LLM ne peut pas s'échapper. Cinq validators vérifient la sortie avant qu'elle ne parte en production.

Le résultat : même entrée → sortie byte-identical, dans n'importe laquelle des 10 langues, sans chemin inventé. (Détails dans [Ce qui le rend différent](#ce-qui-le-rend-différent) ci-dessous.)

Un [Memory Layer](#memory-layer-optionnel-pour-les-projets-longue-durée) séparé est initialisé pour les projets longue durée.

---

## Voir sur un vrai projet

Exécution sur [`spring-boot-realworld-example-app`](https://github.com/gothinkster/spring-boot-realworld-example-app) — Java 11 · Spring Boot 2.6 · MyBatis · SQLite · 187 fichiers source. Sortie : **75 fichiers générés**, durée totale **53 minutes**, tous les validators ✅.

<p align="center">
  <img src="docs/assets/spring-boot-realworld-demo.gif" alt="ClaudeOS-Core init running on spring-boot-realworld-example-app — stack detection, 4-pass pipeline, validators, completion summary" width="769">
</p>

<details>
<summary><strong>Sortie terminal (version texte, pour recherche et copie)</strong></summary>

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
<summary><strong>Ce qui finit dans votre <code>CLAUDE.md</code> (extrait réel — Section 1 + 2)</strong></summary>

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

Chaque valeur ci-dessus — coordonnées exactes des dependencies, le nom de fichier `dev.db`, le nom de migration `V1__create_tables.sql`, « no JPA » — est extraite par le scanner depuis `build.gradle` / `application.properties` / l'arbre source avant que Claude n'écrive le fichier. Rien n'est deviné.

</details>

<details>
<summary><strong>Une rule auto-chargée réelle (<code>.claude/rules/10.backend/01.controller-rules.md</code>)</strong></summary>

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

Le glob `paths: ["**/*"]` signifie que Claude Code charge automatiquement cette rule chaque fois que vous éditez un fichier du projet. Chaque nom de classe, chemin de paquet et exception handler de la rule provient directement du source scanné — y compris les `CustomizeExceptionHandler` et `JacksonCustomizations` réels du projet.

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

Pass 4 initialise `decision-log.md` avec les décisions architecturales extraites de `pass2-merged.json` afin que les sessions futures se rappellent *pourquoi* la base de code ressemble à ce qu'elle est — pas seulement *à quoi* elle ressemble. Chaque option (« JPA/Hibernate », « MyBatis-Plus ») et chaque conséquence est ancrée dans le bloc dependencies réel de `build.gradle`.

</details>

---

## Testé sur

ClaudeOS-Core est livré avec des benchmarks de référence sur de vrais projets OSS. Si vous l'avez utilisé sur un repo public, n'hésitez pas à [ouvrir une issue](https://github.com/claudeos-core/claudeos-core/issues) — nous l'ajouterons à ce tableau.

| Projet | Stack | Scanné → Généré | Statut |
|---|---|---|---|
| [`spring-boot-realworld-example-app`](https://github.com/gothinkster/spring-boot-realworld-example-app) | Java 11 · Spring Boot 2.6 · MyBatis · SQLite | 187 → 75 fichiers | ✅ tous les 5 validators OK |

---

## Démarrage rapide

**Prérequis :** Node.js 18+, [Claude Code](https://docs.anthropic.com/en/docs/claude-code) installé et authentifié.

```bash
# 1. Allez à la racine de votre projet
cd my-spring-boot-project

# 2. Lancez init (cela analyse votre code et demande à Claude d'écrire les rules)
npx claudeos-core init

# 3. Terminé. Ouvrez Claude Code et commencez à coder — vos rules sont déjà chargées.
```

**Ce que vous obtenez** une fois `init` terminé :

```
your-project/
├── .claude/
│   └── rules/                    ← Auto-chargé par Claude Code
│       ├── 00.core/              (rules générales — naming, architecture)
│       ├── 10.backend/           (rules stack backend, le cas échéant)
│       ├── 20.frontend/           (rules stack frontend, le cas échéant)
│       ├── 30.security-db/       (conventions sécurité & DB)
│       ├── 40.infra/             (env, logging, CI/CD)
│       ├── 50.sync/              (rappels de sync doc — rules only)
│       ├── 60.memory/            (rules memory — Pass 4, rules only)
│       ├── 70.domains/{type}/    (rules par domaine, type = backend|frontend)
│       └── 80.verification/      (stratégie de tests + rappels de vérif build)
├── claudeos-core/
│   ├── standard/                 ← Docs de référence (miroir des catégories)
│   │   ├── 00.core/              (vue d'ensemble projet, architecture, naming)
│   │   ├── 10.backend/           (référence backend — si stack backend)
│   │   ├── 20.frontend/          (référence frontend — si stack frontend)
│   │   ├── 30.security-db/       (référence sécurité & DB)
│   │   ├── 40.infra/             (référence env / logging / CI-CD)
│   │   ├── 70.domains/{type}/    (référence par domaine)
│   │   ├── 80.verification/      (référence build / startup / tests — standard only)
│   │   └── 90.optional/          (extras propres au stack — standard only)
│   ├── skills/                   (patterns réutilisables que Claude peut appliquer)
│   ├── guide/                    (guides how-to pour les tâches courantes)
│   ├── database/                 (vue d'ensemble du schéma, guide migration)
│   ├── mcp-guide/                (notes d'intégration MCP)
│   └── memory/                   (decision log, failure patterns, compaction)
└── CLAUDE.md                     (l'index que Claude lit en premier)
```

Les catégories partageant le même préfixe numérique entre `rules/` et `standard/` représentent la même zone conceptuelle (ex. : `10.backend` rules ↔ `10.backend` standards). Catégories rules-only : `50.sync` (rappels de sync doc) et `60.memory` (memory Pass 4). Catégorie standard-only : `90.optional` (extras propres au stack sans enforcement). Tous les autres préfixes (`00`, `10`, `20`, `30`, `40`, `70`, `80`) apparaissent dans `rules/` ET `standard/`. Claude Code connaît désormais votre projet.

---

## À qui s'adresse-t-il ?

| Vous êtes... | La douleur que cela supprime |
|---|---|
| **Un dev solo** démarrant un nouveau projet avec Claude Code | « Apprendre mes conventions à Claude à chaque session » — terminé. `CLAUDE.md` + `.claude/rules/` à 8 catégories générés en une seule passe. |
| **Un team lead** maintenant des standards partagés entre repos | Drift de `.claude/rules/` quand les gens renomment des paquets, changent d'ORM ou changent de response wrapper. ClaudeOS-Core resync de manière deterministic — même entrée, sortie byte-identical, pas de bruit dans les diffs. |
| **Déjà utilisateur de Claude Code** mais fatigué de corriger le code généré | Mauvais response wrapper, mauvais layout de paquet, JPA quand vous utilisez MyBatis, `try/catch` dispersés alors que votre projet utilise un middleware centralisé. Le scanner extrait vos vraies conventions ; chaque pass Claude tourne contre une allowlist explicite de chemins. |
| **Onboarding sur un nouveau repo** (projet existant, intégration d'équipe) | Lancez `init` sur le repo, obtenez une carte d'architecture vivante : tableau de stack dans CLAUDE.md, rules par couche avec exemples ✅/❌, decision log initialisé avec le « pourquoi » des choix majeurs (JPA vs MyBatis, REST vs GraphQL, etc.). Lire 5 fichiers vaut mieux que lire 5 000 fichiers source. |
| **Travaillant en coréen / japonais / chinois / 7 autres langues** | La plupart des générateurs de rules Claude Code sont anglais uniquement. ClaudeOS-Core écrit l'ensemble complet dans **10 langues** (`en/ko/ja/zh-CN/es/vi/hi/ru/fr/de`) avec **validation structurelle byte-identical** — même verdict `claude-md-validator` quelle que soit la langue de sortie. |
| **Travaillant sur un monorepo** (Turborepo, pnpm/yarn workspaces, Lerna) | Domaines backend + frontend analysés en une seule exécution avec des prompts séparés ; `apps/*/` et `packages/*/` parcourus automatiquement ; rules par stack émises sous `70.domains/{type}/`. |
| **Contribuant à de l'OSS ou expérimentant** | La sortie est gitignore-friendly — `claudeos-core/` est votre dir local, seuls `CLAUDE.md` + `.claude/` doivent être livrés. Resume-safe en cas d'interruption ; idempotent en re-runs (vos éditions manuelles aux rules survivent sans `--force`). |

**Pas adapté si :** vous voulez un bundle preset one-size-fits-all d'agents/skills/rules qui marche dès le premier jour sans étape de scan (voir [docs/fr/comparison.md](docs/fr/comparison.md) pour ce qui correspond à quoi), votre projet ne correspond pas encore à l'un des [stacks supportés](#supported-stacks), ou vous n'avez besoin que d'un seul `CLAUDE.md` (le `claude /init` intégré suffit — pas besoin d'installer un autre outil).

---

## Comment ça marche ?

ClaudeOS-Core inverse le workflow Claude Code habituel :

```
Habituel : Vous décrivez le projet → Claude devine votre stack → Claude écrit la doc
Ici :      Le code lit votre stack → Le code passe les faits confirmés à Claude → Claude écrit la doc à partir des faits
```

Le pipeline tourne en **trois étapes**, avec du code des deux côtés de l'appel LLM :

**1. Step A — Scanner (deterministic, sans LLM).** Un Node.js scanner parcourt la racine de votre projet, lit `package.json` / `build.gradle` / `pom.xml` / `pyproject.toml`, parse les fichiers `.env*` (avec redaction des variables sensibles `PASSWORD/SECRET/TOKEN/JWT_SECRET/...`), classifie votre pattern d'architecture (les 5 patterns Java A/B/C/D/E, Kotlin CQRS / multi-module, Next.js App vs Pages Router, FSD, components-pattern), découvre les domaines, et construit une allowlist explicite de chaque chemin de fichier source qui existe. Sortie : `project-analysis.json` — la single source of truth pour la suite.

**2. Step B — Pipeline Claude 4-pass (contraint par les faits du Step A).**
- **Pass 1** lit des fichiers représentatifs par groupe de domaines et extrait ~50–100 conventions par domaine — response wrappers, bibliothèques de logging, error handling, conventions de naming, patterns de tests. Tourne une fois par groupe de domaines (`max 4 domains, 40 files per group`) pour que le contexte ne déborde jamais.
- **Pass 2** fusionne toutes les analyses par domaine en une image projet entière et résout les désaccords en choisissant la convention dominante.
- **Pass 3** écrit `CLAUDE.md` + `.claude/rules/` + `claudeos-core/standard/` + skills + guides — découpé en stages (`3a` facts → `3b-core/3b-N` rules+standards → `3c-core/3c-N` skills+guides → `3d-aux` database+mcp-guide) afin que le prompt de chaque stage tienne dans la fenêtre de contexte du LLM même quand `pass2-merged.json` est gros. Sub-divise 3b/3c en batches ≤15 domaines pour les projets ≥16 domaines.
- **Pass 4** initialise la couche memory L4 (`decision-log.md`, `failure-patterns.md`, `compaction.md`, `auto-rule-update.md`) et ajoute les rules de scaffold universelles. Pass 4 est **interdit de modifier `CLAUDE.md`** — la Section 8 du Pass 3 fait autorité.

**3. Step C — Vérification (deterministic, sans LLM).** Cinq validators vérifient la sortie :
- `claude-md-validator` — 25 vérifications structurelles sur `CLAUDE.md` (8 sections, comptes H3/H4, unicité des fichiers memory, invariant T1 de canonical heading). Language-invariant : même verdict quel que soit `--lang`.
- `content-validator` — 10 vérifications de contenu, dont la vérification path-claim (`STALE_PATH` attrape les références `src/...` inventées) et la détection de drift MANIFEST.
- `pass-json-validator` — well-formedness JSON des Pass 1/2/3/4 + comptage de sections stack-aware.
- `plan-validator` — cohérence plan ↔ disque (legacy, principalement no-op depuis v2.1.0).
- `sync-checker` — cohérence d'enregistrement disque ↔ `sync-map.json` à travers 7 dirs trackés.

Trois niveaux de severity (`fail` / `warn` / `advisory`) afin que les warnings ne bloquent jamais la CI sur des hallucinations LLM que l'utilisateur peut corriger manuellement.

L'invariant qui lie le tout : **Claude ne peut citer que les chemins qui existent réellement dans votre code**, parce que le Step A lui remet une allowlist finie. Si le LLM tente quand même d'inventer quelque chose (rare mais cela arrive sur certains seeds), le Step C l'attrape avant que la doc ne parte.

Pour les détails par pass, le resume basé sur markers, le contournement staged-rules pour le block sensitive-path `.claude/` de Claude Code, et les internals de la stack detection, voir [docs/fr/architecture.md](docs/fr/architecture.md).

---

## Supported Stacks

12 stacks, auto-détectés depuis les fichiers de votre projet :

**Backend :** Java/Spring Boot · Kotlin/Spring Boot · Node/Express · Node/Fastify · Node/NestJS · Python/Django · Python/FastAPI · Python/Flask

**Frontend :** Node/Next.js · Node/Vite · Angular · Vue/Nuxt

Les projets multi-stack (ex. : Spring Boot backend + Next.js frontend) fonctionnent out of the box.

Pour les règles de détection et ce que chaque scanner extrait, voir [docs/fr/stacks.md](docs/fr/stacks.md).

---

## Flux de travail quotidien

Trois commandes couvrent ~95% des usages :

```bash
# Première fois sur un projet
npx claudeos-core init

# Après avoir édité manuellement les standards ou rules
npx claudeos-core lint

# Health check (avant les commits, ou en CI)
npx claudeos-core health
```

Pour les options complètes de chaque commande, voir [docs/fr/commands.md](docs/fr/commands.md). Les commandes du memory layer (`memory compact`, `memory propose-rules`) sont documentées dans la section [Memory Layer](#memory-layer-optionnel-pour-les-projets-longue-durée) ci-dessous.

---

## Ce qui le rend différent

La plupart des outils de documentation Claude Code génèrent depuis une description (vous parlez à l'outil, l'outil parle à Claude). ClaudeOS-Core génère depuis votre code source réel (l'outil lit, l'outil dit à Claude ce qui est confirmé, Claude n'écrit que ce qui est confirmé).

Trois conséquences concrètes :

1. **Stack detection deterministic.** Même projet + même code = même sortie. Pas de « Claude a roulé différemment cette fois ».
2. **Aucun chemin inventé.** Le prompt du Pass 3 liste explicitement chaque chemin source autorisé ; Claude ne peut pas citer de chemins qui n'existent pas.
3. **Multi-stack aware.** Domaines backend et frontend utilisent des prompts d'analyse différents dans la même exécution.

Pour une comparaison côte-à-côte de scope avec d'autres outils, voir [docs/fr/comparison.md](docs/fr/comparison.md). La comparaison concerne **ce que fait chaque outil**, pas **lequel est meilleur** — la plupart sont complémentaires.

---

## Vérification (post-génération)

Après que Claude a écrit la doc, le code la vérifie. Cinq validators distincts :

| Validator | Ce qu'il vérifie | Lancé par |
|---|---|---|
| `claude-md-validator` | Invariants structurels CLAUDE.md (8 sections, language-invariant) | `claudeos-core lint` |
| `content-validator` | Les chemins cités existent vraiment ; cohérence du manifest | `health` (advisory) |
| `pass-json-validator` | Sorties Pass 1 / 2 / 3 / 4 well-formed JSON | `health` (warn) |
| `plan-validator` | Le plan sauvegardé correspond au disque | `health` (fail-on-error) |
| `sync-checker` | Les fichiers disque correspondent aux entrées `sync-map.json` (détection orphaned/unregistered) | `health` (fail-on-error) |

Un `health-checker` orchestre les quatre validators runtime avec trois niveaux de severity (fail / warn / advisory) et sort avec le code approprié pour la CI. `claude-md-validator` tourne séparément via la commande `lint` puisque le drift structurel est un signal de re-init, pas un soft warning. Lançable n'importe quand :

```bash
npx claudeos-core health
```

Pour les vérifications de chaque validator en détail, voir [docs/fr/verification.md](docs/fr/verification.md).

---

## Memory Layer (optionnel, pour les projets longue durée)

Au-delà du pipeline de scaffolding ci-dessus, ClaudeOS-Core initialise un dossier `claudeos-core/memory/` pour les projets dont le contexte dépasse une seule session. C'est optionnel — vous pouvez l'ignorer si tout ce que vous voulez c'est `CLAUDE.md` + rules.

Quatre fichiers, tous écrits par Pass 4 :

- `decision-log.md` — append-only « pourquoi nous avons choisi X plutôt que Y », initialisé depuis `pass2-merged.json`
- `failure-patterns.md` — erreurs récurrentes avec scores frequency/importance
- `compaction.md` — comment la memory est auto-compactée au fil du temps
- `auto-rule-update.md` — patterns qui devraient devenir de nouvelles rules

Deux commandes maintiennent cette couche dans le temps :

```bash
# Compacter le log failure-patterns (lancer périodiquement)
npx claudeos-core memory compact

# Promouvoir les failure patterns fréquents en rules proposées
npx claudeos-core memory propose-rules
```

Pour le modèle memory et son cycle de vie, voir [docs/fr/memory-layer.md](docs/fr/memory-layer.md).

---

## FAQ

**Q : Ai-je besoin d'une clé API Claude ?**
R : Non. ClaudeOS-Core utilise votre installation Claude Code existante — il pipe les prompts vers `claude -p` sur votre machine. Aucun compte supplémentaire.

**Q : Cela écrasera-t-il mon CLAUDE.md ou `.claude/rules/` existant ?**
R : Premier run sur un projet vierge : il les crée. Re-run sans `--force` préserve vos éditions — les pass markers du run précédent sont détectés et les passes sont sautées. Re-run avec `--force` efface et régénère tout (vos éditions sont perdues — c'est ce que `--force` veut dire). Voir [docs/fr/safety.md](docs/fr/safety.md).

**Q : Mon stack n'est pas supporté. Puis-je en ajouter un ?**
R : Oui. Les nouveaux stacks demandent ~3 templates de prompts + un domain scanner. Voir [CONTRIBUTING.md](CONTRIBUTING.md) pour le guide en 8 étapes.

**Q : Comment générer la doc en coréen (ou une autre langue) ?**
R : `npx claudeos-core init --lang ko`. 10 langues supportées : en, ko, ja, zh-CN, es, vi, hi, ru, fr, de.

**Q : Cela fonctionne-t-il avec les monorepos ?**
R : Oui — Turborepo (`turbo.json`), pnpm workspaces (`pnpm-workspace.yaml`), Lerna (`lerna.json`), et npm/yarn workspaces (`package.json#workspaces`) sont détectés par le stack-detector. Chaque app reçoit sa propre analyse. D'autres layouts monorepo (ex. : NX) ne sont pas détectés spécifiquement, mais les patterns génériques `apps/*/` et `packages/*/` sont quand même captés par les scanners par stack.

**Q : Que faire si Claude Code génère des rules avec lesquelles je suis en désaccord ?**
R : Éditez-les directement. Ensuite lancez `npx claudeos-core lint` pour vérifier que CLAUDE.md est toujours structurellement valide. Vos éditions sont préservées lors des runs `init` suivants (sans `--force`) — le mécanisme de resume saute les passes dont les markers existent.

**Q : Où signaler les bugs ?**
R : [GitHub Issues](https://github.com/claudeos-core/claudeos-core/issues). Pour les problèmes de sécurité, voir [SECURITY.md](SECURITY.md).

---

## Si cela vous a fait gagner du temps

Une ⭐ sur GitHub garde le projet visible et aide d'autres à le trouver. Issues, PRs et contributions de templates de stack sont bienvenues — voir [CONTRIBUTING.md](CONTRIBUTING.md).

---

## Documentation

| Sujet | À lire |
|---|---|
| Comment fonctionne le pipeline 4-pass (plus profond que le diagramme) | [docs/fr/architecture.md](docs/fr/architecture.md) |
| Diagrammes visuels (Mermaid) de l'architecture | [docs/fr/diagrams.md](docs/fr/diagrams.md) |
| Stack detection — ce que chaque scanner cherche | [docs/fr/stacks.md](docs/fr/stacks.md) |
| Memory layer — decision logs et failure patterns | [docs/fr/memory-layer.md](docs/fr/memory-layer.md) |
| Tous les 5 validators en détail | [docs/fr/verification.md](docs/fr/verification.md) |
| Chaque commande CLI et option | [docs/fr/commands.md](docs/fr/commands.md) |
| Installation manuelle (sans `npx`) | [docs/fr/manual-installation.md](docs/fr/manual-installation.md) |
| Overrides du scanner — `.claudeos-scan.json` | [docs/fr/advanced-config.md](docs/fr/advanced-config.md) |
| Sécurité : ce qui est préservé en re-init | [docs/fr/safety.md](docs/fr/safety.md) |
| Comparaison avec des outils similaires (scope, pas qualité) | [docs/fr/comparison.md](docs/fr/comparison.md) |
| Erreurs et récupération | [docs/fr/troubleshooting.md](docs/fr/troubleshooting.md) |

---

## Contribuer

Les contributions sont bienvenues — ajout de support de stack, amélioration des prompts, correction de bugs. Voir [CONTRIBUTING.md](CONTRIBUTING.md).

Pour le Code de Conduite et la politique de sécurité, voir [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) et [SECURITY.md](SECURITY.md).

## Licence

[ISC License](LICENSE). Libre pour tout usage, y compris commercial. © 2025–2026 ClaudeOS-Core contributors.

---

<sub>Maintenu par l'équipe [claudeos-core](https://github.com/claudeos-core). Issues et PRs sur <https://github.com/claudeos-core/claudeos-core>.</sub>
