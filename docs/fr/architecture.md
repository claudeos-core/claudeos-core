# Architecture — Le pipeline 4-Pass

Ce document raconte comment `claudeos-core init` marche vraiment, de bout en bout. Si tu veux juste utiliser l'outil, le [README principal](../../README.fr.md) suffit. Ce document sert à comprendre *pourquoi* le design est ce qu'il est.

Si tu n'as jamais lancé l'outil, [fais-le tourner une fois d'abord](../../README.fr.md#démarrage-rapide). Les concepts ci-dessous tomberont en place beaucoup plus vite une fois la sortie sous les yeux.

> Original anglais : [docs/architecture.md](../architecture.md). La traduction française est maintenue synchronisée avec l'anglais.

---

## L'idée centrale : « Le code confirme, Claude crée »

La plupart des outils qui génèrent de la documentation Claude Code marchent en une étape :

```
Votre description  →  Claude  →  CLAUDE.md / rules / standards
```

Claude doit deviner ton stack, tes conventions, ta structure de domaines. Il devine bien, mais il devine. ClaudeOS-Core inverse ce schéma :

```
Votre code source
       ↓
[Step A: Code lit]        ← Scanner Node.js, déterministe, sans IA
       ↓
project-analysis.json     ← faits confirmés : stack, domains, paths
       ↓
[Step B: Claude écrit]    ← pipeline LLM 4-pass, contraint par les faits
       ↓
[Step C: Code vérifie]    ← 5 validators, exécutés automatiquement
       ↓
.claude/rules/  +  claudeos-core/{standard,skills,guide,...}
```

**Le code prend les parties qui doivent être exactes** (ton stack, tes chemins de fichiers, ta structure de domaines).
**Claude prend les parties qui doivent être expressives** (explications, conventions, prose).
Les deux ne se chevauchent pas et ne se contredisent pas.

Pourquoi ça compte : un LLM ne peut pas inventer de chemins ou de frameworks absents de ton code. Le prompt de Pass 3 fournit explicitement à Claude l'allowlist de chemins source produite par le scanner. Si Claude tente de citer un chemin hors liste, le `content-validator` post-génération le signale.

---

## Step A : le scanner (déterministe)

Avant tout appel Claude, un processus Node.js parcourt ton projet et écrit `claudeos-core/generated/project-analysis.json`. Ce fichier devient l'unique source de vérité pour la suite.

### Ce que le scanner lit

Le scanner capte des signaux depuis ces fichiers à la racine du projet :

| Fichier | Ce qu'il dit au scanner |
|---|---|
| `package.json` | Projet Node.js ; framework via `dependencies` |
| `pom.xml` | Projet Java/Maven |
| `build.gradle` / `build.gradle.kts` | Projet Java/Kotlin Gradle |
| `pyproject.toml` / `requirements.txt` | Projet Python ; framework via packages |
| `angular.json` | Projet Angular |
| `nuxt.config.{ts,js}` | Projet Nuxt |
| `next.config.{ts,js}` | Projet Next.js |
| `vite.config.{ts,js}` | Projet Vite |
| Fichiers `.env*` | Config runtime (port, host, DB URL, voir plus bas) |

Si rien ne matche, `init` s'arrête sur une erreur claire plutôt que de deviner.

### Ce que le scanner écrit dans `project-analysis.json`

- **Stack metadata** : language, framework, ORM, DB, package manager, build tool, logger.
- **Architecture pattern** : pour Java, un des 5 patterns (layer-first / domain-first / layer-then-domain / domain-then-layer / hexagonal). Pour Kotlin, détection CQRS / BFF / multi-module. Pour le frontend, layouts App Router / Pages Router / FSD plus patterns `components/*/`, avec fallbacks multi-stage.
- **Domain list** : découverts en parcourant l'arborescence, avec un compte de fichiers par domaine. Le scanner choisit un ou deux fichiers représentatifs par domaine pour que Pass 1 les lise.
- **Source path allowlist** : chaque chemin de fichier source réellement présent dans ton projet. Les prompts de Pass 3 incluent cette liste explicitement pour que Claude n'ait rien à deviner.
- **Structure monorepo** : Turborepo (`turbo.json`), pnpm workspaces (`pnpm-workspace.yaml`), Lerna (`lerna.json`) et npm/yarn workspaces (`package.json#workspaces`), si présents. NX n'est pas auto-détecté en tant que tel. Les patterns génériques `apps/*/` et `packages/*/` restent quand même pris en compte par les scanners par stack.
- **Snapshot `.env`** : port, host, API target, vars sensibles redacted. Voir [stacks.md](stacks.md) pour l'ordre de recherche.

Le scanner n'a **aucun appel LLM**. Même projet + même code = même `project-analysis.json`, à chaque fois.

Pour les détails par stack (ce que chaque scanner extrait et comment), voir [stacks.md](stacks.md).

---

## Step B : le pipeline Claude 4-pass

Chaque pass a un job précis. Elles tournent en séquence : Pass N lit la sortie de Pass (N-1) sous forme d'un petit fichier structuré, pas la sortie complète de toutes les passes précédentes.

### Pass 1 : analyse approfondie par domaine

**Input :** `project-analysis.json` + un fichier représentatif de chaque domaine.

**Ce qu'il fait :** lit les fichiers représentatifs et extrait des patterns sur des dizaines de catégories d'analyse par stack (typiquement 50 à 100+ items au niveau bullet, variable selon le stack : le template CQRS-aware Kotlin/Spring est le plus dense, les templates Node.js légers sont les plus compacts). Par exemple : « Ce controller utilise `@RestController` ou `@Controller` ? Quel response wrapper ? Quelle library de logging ? »

**Output :** `pass1-<group-N>.json`, un fichier par groupe de domaines.

Pour les gros projets, Pass 1 tourne plusieurs fois, une invocation par groupe de domaines. La règle de groupement : **au plus 4 domaines et 40 fichiers par groupe**, auto-appliquée dans `plan-installer/domain-grouper.js`. Un projet à 12 domaines déclenche Pass 1 trois fois.

Cette division existe parce que la context window de Claude est finie. Tenter de caser 12 domaines de fichiers source dans un seul prompt ferait soit déborder le contexte, soit forcerait le LLM à lire trop vite. La division garde chaque pass focalisée.

### Pass 2 : cross-domain merge

**Input :** tous les fichiers `pass1-*.json`.

**Ce qu'il fait :** les fusionne en une seule image projet-wide. Quand deux domaines divergent (l'un dit que le response wrapper est `success()`, l'autre dit `ok()`), Pass 2 choisit la convention dominante et note le désaccord.

**Output :** `pass2-merged.json`, typiquement 100 à 400 KB.

### Pass 3 : génération de documentation (split mode)

**Input :** `pass2-merged.json`.

**Ce qu'il fait :** écrit la documentation réelle. C'est la pass lourde, qui produit ~40 à 50 fichiers markdown répartis sur CLAUDE.md, `.claude/rules/`, `claudeos-core/standard/`, `claudeos-core/skills/`, `claudeos-core/guide/`, `claudeos-core/database/` et `claudeos-core/mcp-guide/`.

**Output :** tous les fichiers visibles côté utilisateur, organisés selon la structure de répertoires montrée dans le [README principal](../../README.fr.md#démarrage-rapide).

Pour garder la sortie de chaque stage dans la context window de Claude (l'input Pass 2 fusionné est gros, la sortie générée l'est encore plus), Pass 3 **se découpe toujours en stages**, y compris sur les petits projets. Le découpage s'applique inconditionnellement. Les petits projets ont juste moins de batches par domaine :

| Stage | Ce qu'il écrit |
|---|---|
| **3a** | Une petite « facts table » (`pass3a-facts.md`) extraite de `pass2-merged.json`. Sert d'input compressé aux stages suivants pour leur éviter de relire le gros fichier merged. |
| **3b-core** | Génère `CLAUDE.md` (l'index que Claude Code lit en premier) plus le gros de `claudeos-core/standard/`. |
| **3b-N** | Fichiers rule et standard par domaine (un stage par groupe de ≤15 domaines). |
| **3c-core** | Génère les fichiers orchestrator de `claudeos-core/skills/` plus `claudeos-core/guide/`. |
| **3c-N** | Fichiers skill par domaine. |
| **3d-aux** | Génère le contenu auxiliaire sous `claudeos-core/database/` et `claudeos-core/mcp-guide/`. |

Pour les très gros projets (≥16 domaines), 3b et 3c se subdivisent encore en batches. Chaque batch reçoit une context window fraîche.

Une fois tous les stages terminés avec succès, `pass3-complete.json` est écrit comme marker. Si `init` est interrompu en cours de route, la prochaine exécution lit le marker et reprend au prochain stage non démarré. Les stages terminés ne repassent pas.

### Pass 4 : scaffolding du memory layer

**Input :** `project-analysis.json`, `pass2-merged.json`, `pass3a-facts.md`.

**Ce qu'il fait :** génère le memory layer L4 plus les rules de scaffold universelles. Toutes les écritures de scaffold sont **skip-if-exists**, donc réexécuter Pass 4 n'écrase rien.

- `claudeos-core/memory/` : 4 fichiers markdown (`decision-log.md`, `failure-patterns.md`, `compaction.md`, `auto-rule-update.md`)
- `.claude/rules/60.memory/` : 4 fichiers rule (`01.decision-log.md`, `02.failure-patterns.md`, `03.compaction.md`, `04.auto-rule-update.md`) qui auto-chargent les fichiers memory quand Claude Code édite des zones pertinentes
- `.claude/rules/00.core/51.doc-writing-rules.md` et `52.ai-work-rules.md` : rules génériques universelles (Pass 3 génère les rules `00.core` spécifiques au projet comme `00.standard-reference.md` ; Pass 4 ajoute ces deux fichiers dans des slots réservés s'ils manquent)
- `claudeos-core/standard/00.core/<NN>.doc-writing-guide.md` : meta-guide sur l'écriture de rules supplémentaires. Le préfixe numérique est auto-attribué à `Math.max(existing-numbers) + 1`, donc typiquement `04` ou `05` selon ce que Pass 3 a déjà écrit.

**Output :** fichiers memory plus marker `pass4-memory.json`.

Important : **Pass 4 ne touche pas à `CLAUDE.md`.** Pass 3 a déjà rédigé la Section 8 (qui référence les fichiers memory). Modifier CLAUDE.md ici redéclarerait le contenu de la Section 8 et déclencherait des erreurs de validator. Le prompt l'impose et `tests/pass4-claude-md-untouched.test.js` le vérifie.

Pour les détails sur ce que fait chaque fichier memory et le cycle de vie, voir [memory-layer.md](memory-layer.md).

---

## Step C : vérification (déterministe, post-Claude)

Une fois Claude terminé, le code Node.js vérifie la sortie via 5 validators. **Aucun n'appelle de LLM**, toutes les vérifications sont déterministes.

| Validator | Ce qu'il vérifie |
|---|---|
| `claude-md-validator` | Vérifications structurelles sur `CLAUDE.md` (compte de sections top-level, comptes H3/H4 par section, unicité/scope des table-rows de fichier memory, tokens canoniques T1 des headings). Language-invariant : les mêmes checks passent pour les 10 langues de sortie. |
| `content-validator` | 10 vérifications au niveau du contenu : fichiers requis existants, paths cités dans les standards/skills réels, cohérence du MANIFEST. |
| `pass-json-validator` | Sorties JSON Pass 1 / 2 / 3 / 4 bien formées et contenant les clés attendues. |
| `plan-validator` | (Legacy) Compare les fichiers plan sauvegardés au disque. La génération du master plan a sauté en v2.1.0, donc c'est quasi un no-op aujourd'hui. Gardé pour rétrocompat. |
| `sync-checker` | Les fichiers du disque sous les répertoires trackés correspondent aux enregistrements `sync-map.json` (orphaned vs unregistered). |

Trois niveaux de sévérité :

- **fail** : bloque la complétion, sort non-zero en CI. Un truc est structurellement cassé.
- **warn** : apparaît dans la sortie sans bloquer. Mérite enquête.
- **advisory** : à examiner plus tard. Souvent des faux-positifs sur des layouts de projet inhabituels (par ex. fichiers gitignored signalés comme « manquants »).

Pour la liste complète des checks par validator, voir [verification.md](verification.md).

Les validators sont orchestrés de deux façons :

1. **`claudeos-core lint`** : n'exécute que `claude-md-validator`. Rapide, structurel uniquement. À utiliser après une édition manuelle de CLAUDE.md.
2. **`claudeos-core health`** : exécute les 4 autres validators (claude-md-validator est volontairement séparé, puisqu'un drift structurel dans CLAUDE.md est un signal de re-init, pas un soft warning). Recommandé en CI.

---

## Pourquoi cette architecture compte

### Les prompts à injection de faits coupent les hallucinations

Quand Pass 3 tourne, le prompt ressemble à peu près à ça (simplifié) :

```
Stack: java-spring-boot
ORM: mybatis
Architecture pattern: layer-first

Allowed source paths (you may only cite these):
- src/main/java/com/example/order/controller/OrderController.java
- src/main/java/com/example/order/service/OrderService.java
- ... [497 more]

DO NOT cite paths outside this list.

Now, for each domain, write a "Skill" that explains the domain's
conventions...
```

Claude n'a aucune ouverture pour inventer des paths. La contrainte est **positive** (whitelist), pas négative (« n'invente rien »). La différence compte : les LLMs respectent mieux les contraintes positives concrètes que les contraintes négatives abstraites.

Si malgré ça Claude cite quand même un path fabriqué, le check `content-validator [10/10]` final le signale comme `STALE_PATH`. L'utilisateur voit l'avertissement avant que la doc ne parte.

### Resume-safe via markers

Chaque pass écrit un fichier marker (`pass1-<N>.json`, `pass2-merged.json`, `pass3-complete.json`, `pass4-memory.json`) à la fin réussie. Si `init` est interrompu (coupure réseau, timeout, Ctrl-C), la prochaine exécution lit les markers et repart d'où ça s'est arrêté. Aucun travail perdu.

Le marker de Pass 3 trace aussi **quels sub-stages** ont fini, donc une Pass 3 partielle (3b terminé, 3c crashé en milieu de stage) reprend du prochain stage, pas de 3a.

### Réexécutions idempotentes

Lancer `init` sur un projet qui a déjà des rules **n'écrase pas** silencieusement les éditions manuelles.

Le mécanisme : le système de permissions de Claude Code bloque les écritures subprocess vers `.claude/`, même avec `--dangerously-skip-permissions`. Pass 3/4 sont donc instruits d'écrire les fichiers rule dans `claudeos-core/generated/.staged-rules/` à la place. Après chaque pass, l'orchestrator Node.js (hors policy de permissions de Claude Code) déplace les fichiers stagés vers `.claude/rules/`.

En pratique : **sur un projet vierge, réexécuter crée tout à neuf. Sur un projet aux rules éditées manuellement, réexécuter avec `--force` régénère depuis zéro (les éditions sont perdues, c'est le sens de `--force`). Sans `--force`, le mécanisme de resume entre en jeu et seules les passes non terminées tournent.**

Pour la story complète de préservation, voir [safety.md](safety.md).

### Vérification language-invariant

Les validators ne matchent pas le texte des headings traduits. Ils matchent **la forme structurelle** (niveaux de heading, comptes, ordre). Du coup, le même `claude-md-validator` rend des verdicts byte-for-byte identiques sur un CLAUDE.md généré dans n'importe laquelle des 10 langues supportées. Pas de dictionnaires par langue. Aucune charge de maintenance à l'ajout d'une nouvelle langue.

---

## Performance : à quoi s'attendre

Les durées concrètes dépendent fortement de :
- La taille du projet (nombre de fichiers source, nombre de domaines)
- La latence réseau vers l'API Anthropic
- Le modèle Claude sélectionné dans ta config Claude Code

Indication grossière :

| Étape | Temps sur un petit projet (<200 fichiers) | Temps sur un projet moyen (~1000 fichiers) |
|---|---|---|
| Step A (scanner) | < 5 secondes | 10–30 secondes |
| Step B (4 passes Claude) | Quelques minutes | 10–30 minutes |
| Step C (validators) | < 5 secondes | 10 à 20 secondes |

Pass 1 domine le wall clock sur les gros projets parce qu'il tourne une fois par groupe de domaines. Un projet à 24 domaines = 6 invocations Pass 1 (24 / 4 domaines par groupe).

Si tu veux un chiffre précis, lance-le une fois sur ton projet. C'est la seule réponse honnête.

---

## Où vit le code de chaque étape

| Étape | Fichier |
|---|---|
| Scanner orchestrator | `plan-installer/index.js` |
| Stack detection | `plan-installer/stack-detector.js` |
| Scanners par stack | `plan-installer/scanners/scan-{java,kotlin,node,python,frontend}.js` |
| Domain grouping | `plan-installer/domain-grouper.js` |
| Prompt assembly | `plan-installer/prompt-generator.js` |
| Init orchestrator | `bin/commands/init.js` |
| Pass templates | `pass-prompts/templates/<stack>/pass{1,2,3}.md` par stack ; `pass-prompts/templates/common/pass4.md` partagé entre stacks |
| Memory scaffolding | `lib/memory-scaffold.js` |
| Validators | `claude-md-validator/`, `content-validator/`, `pass-json-validator/`, `plan-validator/`, `sync-checker/` |
| Verification orchestrator | `health-checker/index.js` |

---

## Pour aller plus loin

- [stacks.md](stacks.md) : ce que chaque scanner extrait par stack
- [memory-layer.md](memory-layer.md) : Pass 4 en détail
- [verification.md](verification.md) : les 5 validators
- [diagrams.md](diagrams.md) : la même architecture en diagrammes Mermaid
- [comparison.md](comparison.md) : ce qui diffère des autres outils Claude Code
