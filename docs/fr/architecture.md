# Architecture — Le pipeline 4-Pass

Ce document explique comment `claudeos-core init` fonctionne réellement, de bout en bout. Si vous voulez juste utiliser l'outil, le [README principal](../../README.fr.md) suffit — ce document est pour comprendre *pourquoi* le design est ce qu'il est.

Si vous n'avez jamais utilisé l'outil, [exécutez-le une fois d'abord](../../README.fr.md#quick-start). Les concepts ci-dessous se mettront en place beaucoup plus vite après que vous aurez vu la sortie.

> Original anglais : [docs/architecture.md](../architecture.md). La traduction française est maintenue synchronisée avec l'anglais.

---

## L'idée centrale — « Le code confirme, Claude crée »

La plupart des outils qui génèrent de la documentation Claude Code fonctionnent en une étape :

```
Votre description  →  Claude  →  CLAUDE.md / rules / standards
```

Claude doit deviner votre stack, vos conventions, votre structure de domaines. Il devine bien, mais il devine. ClaudeOS-Core inverse ce schéma :

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

**Le code fait les parties qui doivent être exactes** (votre stack, vos chemins de fichiers, votre structure de domaines).
**Claude fait les parties qui doivent être expressives** (explications, conventions, prose).
Ils ne se chevauchent pas, et ne se remettent pas en cause l'un l'autre.

Pourquoi c'est important : un LLM ne peut pas inventer de chemins ou de frameworks qui ne sont pas réellement dans votre code. Le prompt de Pass 3 remet explicitement à Claude l'allowlist de chemins source du scanner. Si Claude essaie de citer un chemin qui n'est pas dans la liste, le `content-validator` post-génération le signale.

---

## Step A — Le scanner (déterministe)

Avant que Claude ne soit invoqué du tout, un processus Node.js parcourt votre projet et écrit `claudeos-core/generated/project-analysis.json`. Ce fichier est l'unique source de vérité pour tout ce qui suit.

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
| Fichiers `.env*` | Config runtime (port, host, DB URL — voir plus bas) |

Si rien ne matche, `init` s'arrête avec une erreur claire plutôt que de deviner.

### Ce que le scanner écrit dans `project-analysis.json`

- **Stack metadata** — language, framework, ORM, DB, package manager, build tool, logger.
- **Architecture pattern** — pour Java, l'un des 5 patterns (layer-first / domain-first / layer-then-domain / domain-then-layer / hexagonal). Pour Kotlin, détection CQRS / BFF / multi-module. Pour le frontend, layouts App Router / Pages Router / FSD plus patterns `components/*/`, avec fallbacks multi-stage.
- **Domain list** — découverts en parcourant l'arborescence, avec un compte de fichiers par domaine. Le scanner choisit un ou deux fichiers représentatifs par domaine pour que Pass 1 les lise.
- **Source path allowlist** — chaque chemin de fichier source qui existe dans votre projet. Les prompts de Pass 3 incluent cette liste explicitement pour que Claude n'ait rien à deviner.
- **Structure monorepo** — Turborepo (`turbo.json`), pnpm workspaces (`pnpm-workspace.yaml`), Lerna (`lerna.json`) et npm/yarn workspaces (`package.json#workspaces`), si présents. NX n'est pas auto-détecté spécifiquement ; les patterns génériques `apps/*/` et `packages/*/` sont quand même pris en compte par les scanners par stack.
- **Snapshot `.env`** — port, host, API target, vars sensibles redacted. Voir [stacks.md](stacks.md) pour l'ordre de recherche.

Le scanner n'a **aucun appel LLM**. Même projet + même code = même `project-analysis.json`, à chaque fois.

Pour les détails par stack (ce que chaque scanner extrait et comment), voir [stacks.md](stacks.md).

---

## Step B — Le pipeline Claude 4-pass

Chaque pass a un job précis. Elles s'exécutent en séquence, avec Pass N qui lit la sortie de Pass (N-1) sous forme d'un petit fichier structuré (pas la sortie complète de toutes les passes précédentes).

### Pass 1 — Analyse approfondie par domaine

**Input :** `project-analysis.json` + un fichier représentatif de chaque domaine.

**Ce qu'il fait :** Lit les fichiers représentatifs et extrait des patterns à travers des dizaines de catégories d'analyse par stack (typiquement 50 à 100+ items au niveau bullet, variant selon le stack — le template CQRS-aware Kotlin/Spring est le plus dense, les templates Node.js légers sont les plus compacts). Par exemple : « Ce controller utilise-t-il `@RestController` ou `@Controller` ? Quel response wrapper est utilisé ? Quelle library de logging ? »

**Output :** `pass1-<group-N>.json` — un fichier par groupe de domaines.

Pour les gros projets, Pass 1 s'exécute plusieurs fois — une invocation par groupe de domaines. La règle de groupement est **au plus 4 domaines et 40 fichiers par groupe**, auto-appliquée dans `plan-installer/domain-grouper.js`. Un projet à 12 domaines exécuterait Pass 1 trois fois.

Cette division existe parce que la context window de Claude est finie. Essayer de faire tenir l'équivalent de 12 domaines de fichiers source dans un seul prompt ferait soit déborder le contexte, soit forcerait le LLM à lire trop vite. La division garde chaque pass focalisée.

### Pass 2 — Cross-domain merge

**Input :** Tous les fichiers `pass1-*.json`.

**Ce qu'il fait :** Les fusionne en une seule image projet-wide. Quand deux domaines sont en désaccord (par ex. l'un dit que le response wrapper est `success()`, l'autre dit `ok()`), Pass 2 choisit la convention dominante et note le désaccord.

**Output :** `pass2-merged.json` — typiquement 100–400 KB.

### Pass 3 — Génération de documentation (split mode)

**Input :** `pass2-merged.json`.

**Ce qu'il fait :** Écrit la documentation réelle. C'est la pass lourde — elle produit ~40–50 fichiers markdown répartis sur CLAUDE.md, `.claude/rules/`, `claudeos-core/standard/`, `claudeos-core/skills/`, `claudeos-core/guide/`, `claudeos-core/database/` et `claudeos-core/mcp-guide/`.

**Output :** Tous les fichiers visibles par l'utilisateur, organisés selon la structure de répertoires montrée dans le [README principal](../../README.fr.md#quick-start).

Pour garder la sortie de chaque stage dans la context window de Claude (l'input Pass 2 fusionné est gros, et la sortie générée l'est encore plus), Pass 3 **se divise toujours en stages** — même pour les petits projets. La division s'applique inconditionnellement ; les petits projets ont juste moins de batches par domaine :

| Stage | Ce qu'il écrit |
|---|---|
| **3a** | Une petite « facts table » (`pass3a-facts.md`) extraite de `pass2-merged.json`. Sert d'input compressé pour les stages suivants pour qu'ils n'aient pas à relire le gros fichier merged. |
| **3b-core** | Génère `CLAUDE.md` (l'index que Claude Code lit en premier) + le gros de `claudeos-core/standard/`. |
| **3b-N** | Fichiers rule et standard par domaine (un stage par groupe de ≤15 domaines). |
| **3c-core** | Génère les fichiers orchestrator de `claudeos-core/skills/` + `claudeos-core/guide/`. |
| **3c-N** | Fichiers skill par domaine. |
| **3d-aux** | Génère le contenu auxiliaire sous `claudeos-core/database/` et `claudeos-core/mcp-guide/`. |

Pour les très gros projets (≥16 domaines), 3b et 3c se subdivisent encore en batches. Chaque batch reçoit une context window fraîche.

Une fois tous les stages terminés avec succès, `pass3-complete.json` est écrit comme marker. Si `init` est interrompu en cours de route, la prochaine exécution lit le marker et reprend au prochain stage non démarré — les stages terminés ne sont pas réexécutés.

### Pass 4 — Scaffolding du memory layer

**Input :** `project-analysis.json`, `pass2-merged.json`, `pass3a-facts.md`.

**Ce qu'il fait :** Génère le memory layer L4 plus les rules de scaffold universelles. Toutes les écritures de scaffold sont **skip-if-exists**, donc réexécuter Pass 4 n'écrase rien.

- `claudeos-core/memory/` — 4 fichiers markdown (`decision-log.md`, `failure-patterns.md`, `compaction.md`, `auto-rule-update.md`)
- `.claude/rules/60.memory/` — 4 fichiers rule (`01.decision-log.md`, `02.failure-patterns.md`, `03.compaction.md`, `04.auto-rule-update.md`) qui auto-chargent les fichiers memory quand Claude Code édite des zones pertinentes
- `.claude/rules/00.core/51.doc-writing-rules.md` et `52.ai-work-rules.md` — rules génériques universelles (Pass 3 génère les rules `00.core` spécifiques au projet comme `00.standard-reference.md` ; Pass 4 ajoute ces deux fichiers à slot réservé s'ils n'existent pas déjà)
- `claudeos-core/standard/00.core/<NN>.doc-writing-guide.md` — meta-guide sur l'écriture de rules supplémentaires. Le préfixe numérique est auto-attribué à `Math.max(existing-numbers) + 1`, donc typiquement `04` ou `05` selon ce que Pass 3 a déjà écrit.

**Output :** Fichiers memory + marker `pass4-memory.json`.

Important : **Pass 4 ne modifie pas `CLAUDE.md`.** Pass 3 a déjà rédigé la Section 8 (qui référence les fichiers memory). Modifier CLAUDE.md à nouveau ici redéclarerait le contenu de la Section 8 et déclencherait des erreurs de validator. C'est imposé par le prompt et vérifié par `tests/pass4-claude-md-untouched.test.js`.

Pour les détails sur ce que fait chaque fichier memory et le cycle de vie, voir [memory-layer.md](memory-layer.md).

---

## Step C — Vérification (déterministe, post-Claude)

Une fois Claude terminé, le code Node.js vérifie la sortie via 5 validators. **Aucun n'appelle un LLM** — toutes les vérifications sont déterministes.

| Validator | Ce qu'il vérifie |
|---|---|
| `claude-md-validator` | Vérifications structurelles sur `CLAUDE.md` (compte de sections top-level, comptes H3/H4 par section, unicité/scope des table-rows de fichier memory, tokens canoniques T1 des headings). Language-invariant — les mêmes checks passent pour les 10 langues de sortie. |
| `content-validator` | 10 vérifications au niveau du contenu : fichiers requis existants, paths cités dans les standards/skills réels, cohérence du MANIFEST. |
| `pass-json-validator` | Sorties JSON Pass 1 / 2 / 3 / 4 bien formées et contenant les clés attendues. |
| `plan-validator` | (Legacy) Compare les fichiers plan sauvegardés au disque. La génération du master plan a été supprimée en v2.1.0, donc c'est essentiellement un no-op maintenant — gardé pour rétrocompat. |
| `sync-checker` | Les fichiers du disque sous les répertoires trackés correspondent aux enregistrements `sync-map.json` (orphaned vs unregistered). |

Ils ont **3 niveaux de sévérité** :

- **fail** — Bloque la complétion, sort non-zero en CI. Quelque chose est structurellement cassé.
- **warn** — Apparaît dans la sortie, mais ne bloque pas. Mérite enquête.
- **advisory** — À examiner plus tard. Souvent des faux-positifs sur des layouts de projet inhabituels (par ex. fichiers gitignored signalés comme « manquants »).

Pour la liste complète des checks par validator, voir [verification.md](verification.md).

Les validators sont orchestrés de deux façons :

1. **`claudeos-core lint`** — n'exécute que `claude-md-validator`. Rapide, structurel uniquement. À utiliser après une édition manuelle de CLAUDE.md.
2. **`claudeos-core health`** — exécute les 4 autres validators (claude-md-validator est volontairement séparé, puisque le drift structurel dans CLAUDE.md est un signal de re-init, pas un soft warning). Recommandé en CI.

---

## Pourquoi cette architecture compte

### Les prompts à injection de faits empêchent les hallucinations

Quand Pass 3 s'exécute, le prompt ressemble à peu près à ceci (simplifié) :

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

Claude n'a aucune ouverture pour inventer des paths. La contrainte est **positive** (whitelist), pas négative (« n'invente rien ») — la différence compte parce que les LLMs respectent mieux les contraintes positives concrètes que les contraintes négatives abstraites.

Si malgré ça Claude cite quand même un path fabriqué, le check `content-validator [10/10]` à la fin le signale comme `STALE_PATH`. L'utilisateur voit l'avertissement avant que la doc ne parte.

### Resume-safe via markers

Chaque pass écrit un fichier marker (`pass1-<N>.json`, `pass2-merged.json`, `pass3-complete.json`, `pass4-memory.json`) quand elle se termine avec succès. Si `init` est interrompu (coupure réseau, timeout, vous faites Ctrl-C), la prochaine exécution lit les markers et reprend là où la dernière s'est arrêtée. Vous ne perdez pas de travail.

Le marker de Pass 3 trace aussi **quels sub-stages** ont été complétés, donc une Pass 3 partielle (par ex. 3b terminé, 3c crashé en milieu de stage) reprend du prochain stage, pas de 3a.

### Réexécutions idempotentes

Exécuter `init` sur un projet qui a déjà des rules **n'écrase pas** silencieusement les éditions manuelles.

Le mécanisme : le système de permissions de Claude Code bloque les écritures subprocess vers `.claude/`, même avec `--dangerously-skip-permissions`. Donc Pass 3/4 sont instruits d'écrire les fichiers rule dans `claudeos-core/generated/.staged-rules/` à la place. Après chaque pass, l'orchestrator Node.js (qui n'est pas soumis à la policy de permissions de Claude Code) déplace les fichiers stagés vers `.claude/rules/`.

En pratique cela signifie : **sur un projet vierge, réexécuter crée tout à neuf. Sur un projet où vous avez édité manuellement les rules, réexécuter avec `--force` régénère depuis zéro (vos éditions sont perdues — c'est ce que `--force` veut dire). Sans `--force`, le mécanisme de resume entre en jeu et seules les passes non terminées s'exécutent.**

Pour la story complète de préservation, voir [safety.md](safety.md).

### Vérification language-invariant

Les validators ne matchent pas le texte des headings traduits. Ils matchent **la forme structurelle** (niveaux de heading, comptes, ordre). Cela signifie que le même `claude-md-validator` produit des verdicts byte-for-byte identiques sur un CLAUDE.md généré dans n'importe laquelle des 10 langues supportées. Pas de dictionnaires par langue. Pas de charge de maintenance lors de l'ajout d'une nouvelle langue.

---

## Performance — à quoi s'attendre

Les durées concrètes dépendent fortement de :
- La taille du projet (nombre de fichiers source, nombre de domaines)
- La latence réseau vers l'API Anthropic
- Quel modèle Claude est sélectionné dans votre config Claude Code

Indication grossière :

| Étape | Temps sur un petit projet (<200 fichiers) | Temps sur un projet moyen (~1000 fichiers) |
|---|---|---|
| Step A (scanner) | < 5 secondes | 10–30 secondes |
| Step B (4 passes Claude) | Quelques minutes | 10–30 minutes |
| Step C (validators) | < 5 secondes | 10–20 secondes |

Pass 1 domine le wall clock sur les gros projets parce qu'il s'exécute une fois par groupe de domaines. Un projet à 24 domaines = 6 invocations Pass 1 (24 / 4 domaines par groupe).

Si vous voulez un nombre précis, exécutez-le une fois sur votre projet — c'est la seule réponse honnête.

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

- [stacks.md](stacks.md) — ce que chaque scanner extrait par stack
- [memory-layer.md](memory-layer.md) — Pass 4 en détail
- [verification.md](verification.md) — les 5 validators
- [diagrams.md](diagrams.md) — la même architecture en diagrammes Mermaid
- [comparison.md](comparison.md) — comment cela diffère des autres outils Claude Code
