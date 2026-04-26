# ClaudeOS-Core

[![npm version](https://img.shields.io/npm/v/claudeos-core.svg?logo=npm&label=npm)](https://www.npmjs.com/package/claudeos-core)
[![CI](https://img.shields.io/github/actions/workflow/status/claudeos-core/claudeos-core/test.yml?branch=master&logo=github&label=CI)](https://github.com/claudeos-core/claudeos-core/actions/workflows/test.yml)
[![tests](https://img.shields.io/badge/tests-736%20passing-brightgreen?logo=node.js&logoColor=white)](https://github.com/claudeos-core/claudeos-core/actions/workflows/test.yml)
[![node](https://img.shields.io/node/v/claudeos-core.svg?logo=node.js&logoColor=white&label=node)](https://nodejs.org/)
[![license](https://img.shields.io/npm/l/claudeos-core.svg?color=blue)](LICENSE)
[![downloads](https://img.shields.io/npm/dm/claudeos-core.svg?logo=npm&color=blue&label=downloads)](https://www.npmjs.com/package/claudeos-core)

**Générez automatiquement la documentation Claude Code à partir de votre code source réel.** Un outil CLI qui analyse statiquement votre projet, puis exécute un pipeline Claude en 4 passes pour générer `.claude/rules/`, standards, skills et guides — afin que Claude Code suive les conventions de **votre** projet, pas des conventions génériques.

```bash
npx claudeos-core init
```

[🇺🇸 English](README.md) · [🇰🇷 한국어](README.ko.md) · [🇨🇳 中文](README.zh-CN.md) · [🇯🇵 日本語](README.ja.md) · [🇪🇸 Español](README.es.md) · [🇻🇳 Tiếng Việt](README.vi.md) · [🇮🇳 हिन्दी](README.hi.md) · [🇷🇺 Русский](README.ru.md) · [🇩🇪 Deutsch](README.de.md)

---

## C'est quoi cet outil ?

Vous utilisez Claude Code. Il est intelligent, mais il ne connaît pas **les conventions de votre projet** :
- Votre équipe utilise MyBatis, mais Claude génère du code JPA.
- Votre wrapper est `ApiResponse.ok()`, mais Claude écrit `ResponseEntity.success()`.
- Vos packages sont `controller/order/`, mais Claude crée `order/controller/`.

Du coup, vous passez un temps non négligeable à corriger chaque fichier généré.

**ClaudeOS-Core résout ce problème.** Il scanne votre code source réel, identifie vos conventions, et écrit un ensemble complet de règles dans `.claude/rules/` — le répertoire que Claude Code lit automatiquement. La prochaine fois que vous direz *« Crée un CRUD pour les commandes »*, Claude suit vos conventions du premier coup.

```
Avant :   Vous → Claude Code → code « globalement bon » → corrections manuelles
Après :   Vous → Claude Code → code qui colle à votre projet → on expédie
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
<summary><strong>📄 Ce qui se retrouve dans votre <code>CLAUDE.md</code> (extrait réel)</strong></summary>

```markdown
## 4. Core Architecture

### Core Patterns

- **Hexagonal ports & adapters**: domain ports live in `io.spring.core.{aggregate}`
  and are implemented by `io.spring.infrastructure.repository.MyBatis{Aggregate}Repository`.
  The domain layer has zero MyBatis imports.
- **CQRS-lite read/write split (same DB)**: write side goes through repository ports
  + entities; read side is a separate `readservice` package whose `@Mapper`
  interfaces return `*Data` DTOs directly (no entity hydration).
- **No aggregator/orchestrator layer**: multi-source orchestration happens inside
  application services (e.g., `ArticleQueryService`); there is no `*Aggregator`
  class in the codebase.
- **Application-supplied UUIDs**: entity constructors assign their own UUID; PK is
  passed via `#{user.id}` on INSERT. The global
  `mybatis.configuration.use-generated-keys=true` flag is dead config
  (auto-increment is unused).
- **JWT HS512 authentication**: `io.spring.infrastructure.service.DefaultJwtService`
  is the sole token subject in/out; `io.spring.api.security.JwtTokenFilter`
  extracts the token at the servlet layer.
```

Note : chaque affirmation ci-dessus est ancrée dans le code source réel — noms de classes, chemins de packages, clés de configuration et le flag dead-config sont tous extraits par le scanner avant que Claude n'écrive le fichier.

</details>

<details>
<summary><strong>🛡️ Une rule réelle auto-chargée (<code>.claude/rules/10.backend/03.data-access-rules.md</code>)</strong></summary>

````markdown
---
paths:
  - "**/*"
---

# Data Access Rules

## XML-only SQL
- Every SQL statement lives in `src/main/resources/mapper/*.xml`.
  NO `@Select` / `@Insert` / `@Update` / `@Delete` annotations on `@Mapper` methods.
- Each `@Mapper` interface has exactly one XML file at
  `src/main/resources/mapper/{InterfaceName}.xml`.
- `<mapper namespace="...">` MUST be the fully qualified Java interface name.
  The single existing exception is `TransferData.xml` (free-form `transfer.data`).

## Dynamic SQL
- `<if>` predicates MUST guard both null and empty:
  `<if test="X != null and X != ''">`. Empty-only is the existing HIGH-severity bug pattern.
- Prefer `LIMIT n OFFSET m` over MySQL-style `LIMIT m, n`.

## Examples

✅ Correct:
```xml
<update id="update">
  UPDATE articles
  <set>
    <if test="article.title != null and article.title != ''">title = #{article.title},</if>
    updated_at = #{article.updatedAt}
  </set>
  WHERE id = #{article.id}
</update>
```

❌ Incorrect:
```xml
<mapper namespace="article.mapper">          <!-- NO — namespace MUST be FQCN -->
```
````

Le glob `paths: ["**/*"]` signifie que Claude Code charge automatiquement cette rule chaque fois que vous éditez un fichier du projet. Les exemples ✅/❌ proviennent directement des conventions réelles et patterns de bugs existants de cette codebase.

</details>

<details>
<summary><strong>🧠 Un seed <code>decision-log.md</code> auto-généré (extrait réel)</strong></summary>

```markdown
## 2026-04-26 — CQRS-lite read/write split inside the persistence layer

- **Context:** Writes go through `core.*Repository` port → `MyBatis*Repository`
  adapter → `io.spring.infrastructure.mybatis.mapper.{Aggregate}Mapper`.
  Reads bypass the domain port: application service →
  `io.spring.infrastructure.mybatis.readservice.{Concept}ReadService` directly,
  returning flat `*Data` DTOs from `io.spring.application.data.*`.
- **Options considered:** Single repository surface returning hydrated entities
  for both reads and writes.
- **Decision:** Same database, two `@Mapper` packages — `mapper/` (write side,
  operates on core entities) and `readservice/` (read side, returns `*Data` DTOs).
  Read DTOs avoid entity hydration overhead.
- **Consequences:** Reads are NOT routed through the domain port — this is
  intentional, not a bug. Application services may inject both a `*Repository`
  (writes) and one or more `*ReadService` interfaces (reads) at the same time.
  Do NOT add hydrate-then-map glue in the read path.
```

Pass 4 ensemence `decision-log.md` avec les décisions architecturales extraites de `pass2-merged.json` afin que les sessions futures se souviennent du *pourquoi* la codebase ressemble à ce qu'elle est — pas seulement *à quoi* elle ressemble.

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

| Vous êtes... | Cet outil vous aide à... |
|---|---|
| **Un développeur solo** qui démarre un nouveau projet avec Claude Code | Sauter entièrement la phase « apprendre mes conventions à Claude » |
| **Un team lead** qui maintient des standards partagés | Automatiser la corvée de garder `.claude/rules/` à jour |
| **Déjà utilisateur de Claude Code** mais fatigué de corriger le code généré | Faire en sorte que Claude suive VOS patterns, pas les patterns « globalement bons » |

**Pas adapté si :** vous voulez un bundle preset universel d'agents/skills/rules qui fonctionne dès le premier jour sans étape de scan (voir [docs/fr/comparison.md](docs/fr/comparison.md) pour ce qui convient où), ou si votre projet n'entre pas encore dans l'un des [stacks supportés](#supported-stacks).

---

## Comment ça marche ?

ClaudeOS-Core inverse le workflow Claude Code habituel :

```
Habituel : Vous décrivez le projet → Claude devine votre stack → Claude écrit la doc
Ici :      Le code lit votre stack → Le code transmet les faits confirmés à Claude → Claude écrit à partir des faits
```

L'idée clé : **un scanner Node.js lit d'abord votre code source** (déterministe, sans IA), puis un pipeline Claude en 4 passes écrit la documentation, contrainte par ce que le scanner a trouvé. Claude ne peut pas inventer de chemins ou de frameworks qui ne sont pas réellement dans votre code.

Pour l'architecture complète, voir [docs/fr/architecture.md](docs/fr/architecture.md).

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
