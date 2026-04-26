# Vérification

Une fois que Claude a fini de générer la documentation, le code vérifie la sortie via **5 validators distincts**. Aucun n'appelle un LLM — toutes les vérifications sont déterministes.

Cette page couvre ce que vérifie chaque validator, comment fonctionnent les niveaux de sévérité, et comment lire la sortie.

> Original anglais : [docs/verification.md](../verification.md). La traduction française est maintenue synchronisée avec l'anglais.

---

## Pourquoi une vérification post-génération

Les LLMs sont non déterministes. Même avec des prompts à injection de faits (l'[allowlist de paths source](architecture.md#les-prompts-à-injection-de-faits-empêchent-les-hallucinations)), Claude peut quand même :

- Sauter une section requise sous pression de contexte.
- Citer un path qui matche presque-mais-pas-tout-à-fait l'allowlist (par ex. `src/feature/routers/featureRoutePath.ts` inventé depuis un répertoire parent + un nom de constante TypeScript).
- Générer des cross-references incohérentes entre standards et rules.
- Redéclarer le contenu de la Section 8 ailleurs dans CLAUDE.md.

Les validators attrapent ces sorties silencieusement-mauvaises avant que la doc ne parte.

---

## Les 5 validators

### 1. `claude-md-validator` — invariants structurels

Valide `CLAUDE.md` contre un ensemble de checks structurels (la table ci-dessous liste les familles d'IDs de check — le total individuel d'IDs reportables varie car `checkSectionsHaveContent` et `checkCanonicalHeadings` en émettent un par section, etc.). Vit dans `claude-md-validator/`.

**Lancé via :**
```bash
npx claudeos-core lint
```

(Pas exécuté par `health` — voir [Pourquoi deux entry points](#pourquoi-deux-entry-points--lint-vs-health) plus bas.)

**Ce qu'il vérifie :**

| Check ID | Ce qu'il impose |
|---|---|
| `S1` | Le compte de sections vaut exactement 8 |
| `S2-N` | Chaque section a au moins 2 lignes de body non-vides |
| `S-H3-4` | La Section 4 a 3 ou 4 sub-sections H3 |
| `S-H3-6` | La Section 6 a exactement 3 sub-sections H3 |
| `S-H3-8` | La Section 8 a exactement 2 sub-sections H3 |
| `S-H4-8` | La Section 8 a exactement 2 headings H4 (L4 Memory Files / Memory Workflow) |
| `M-<file>` | Chacun des 4 fichiers memory (`decision-log.md`, `failure-patterns.md`, `compaction.md`, `auto-rule-update.md`) apparaît dans exactement UNE table-row markdown |
| `F2-<file>` | Les table-rows de fichier memory sont confinées à la Section 8 |
| `T1-1` à `T1-8` | Chaque heading de section `## N.` contient son token canonique anglais (`Role Definition`, `Project Overview`, `Build`, `Core Architecture`, `Directory Structure`, `Standard`, `DO NOT Read`, `Memory`) — match de sous-chaîne case-insensitive |

**Pourquoi language-invariant :** le validator ne matche jamais la prose des headings traduits. Il ne matche que la structure markdown (niveaux de heading, comptes, ordre) et les tokens canoniques anglais. Les mêmes checks passent sur un CLAUDE.md généré dans n'importe laquelle des 10 langues supportées.

**Pourquoi cela compte en pratique :** un CLAUDE.md généré avec `--lang ja` et un généré avec `--lang en` paraissent complètement différents pour un humain, mais `claude-md-validator` produit des verdicts pass/fail byte-for-byte identiques sur les deux. Pas de maintenance de dictionnaire par langue.

### 2. `content-validator` — checks de paths & manifest

Valide le **contenu** des fichiers générés (pas la structure de CLAUDE.md). Vit dans `content-validator/`.

**10 checks** (les 9 premiers sont labellisés `[N/9]` dans la sortie console ; le 10e a été ajouté plus tard et labellisé `[10/10]` — cette asymétrie est préservée dans le code pour que les greps CI existants matchent toujours) :

| Check | Ce qu'il impose |
|---|---|
| `[1/9]` CLAUDE.md existe, ≥100 chars, contient les mots-clés de section requis (10-language aware) |
| `[2/9]` Les fichiers `.claude/rules/**/*.md` ont un frontmatter YAML avec clé `paths:`, pas de fichiers vides |
| `[3/9]` Les fichiers `claudeos-core/standard/**/*.md` font ≥200 chars et contiennent des exemples ✅/❌ + une table markdown (les standards Kotlin vérifient aussi les blocs ` ```kotlin `) |
| `[4/9]` Les fichiers `claudeos-core/skills/**/*.md` sont non-vides ; orchestrator + MANIFEST présents |
| `[5/9]` `claudeos-core/guide/` a les 9 fichiers attendus, chacun non-vide (check d'emptiness BOM-aware) |
| `[6/9]` Fichiers `claudeos-core/plan/` non-vides (informational depuis v2.1.2 — `plan/` n'est plus auto-créé) |
| `[7/9]` Fichiers `claudeos-core/database/` existent (warning si manquant) |
| `[8/9]` Fichiers `claudeos-core/mcp-guide/` existent (warning si manquant) |
| `[9/9]` `claudeos-core/memory/` 4 fichiers existent + validation structurelle (decision-log date ISO, failure-pattern champs requis, compaction marker `## Last Compaction`) |
| `[10/10]` Vérification de path-claim + drift MANIFEST (3 sub-classes — voir ci-dessous) |

**Sub-classes du check `[10/10]` :**

| Classe | Ce qu'elle attrape |
|---|---|
| `STALE_PATH` | Toute référence `src/...\.(ts|tsx|js|jsx)` dans `.claude/rules/**` ou `claudeos-core/standard/**` doit résoudre à un fichier réel. Les blocs de code fence et les paths placeholder (`src/{domain}/feature.ts`) sont exclus. |
| `STALE_SKILL_ENTRY` | Chaque path skill enregistré dans `claudeos-core/skills/00.shared/MANIFEST.md` doit exister sur disque. |
| `MANIFEST_DRIFT` | Chaque skill enregistrée doit être mentionnée dans `CLAUDE.md` (avec **exception orchestrator/sub-skill** — Pass 3b écrit la Section 6 avant que Pass 3c ne crée les sub-skills, donc lister chaque sub-skill est structurellement impossible). |

L'exception orchestrator/sub-skill : une sub-skill enregistrée à `{category}/{parent-stem}/{NN}.{name}.md` est considérée couverte quand un orchestrator à `{category}/*{parent-stem}*.md` est mentionné dans CLAUDE.md.

**Sévérité :** content-validator s'exécute au tier **advisory** — apparaît dans la sortie mais ne bloque pas la CI. Le raisonnement : réexécuter Pass 3 n'est pas garanti de fixer les hallucinations LLM, donc bloquer ferait deadlock les utilisateurs dans des boucles `--force`. Le signal de détection (exit non-zero + entrée `stale-report`) suffit aux pipelines CI et au triage humain.

### 3. `pass-json-validator` — bonne formation des sorties Pass

Valide que les fichiers JSON écrits par chaque pass sont bien formés et contiennent les clés attendues. Vit dans `pass-json-validator/`.

**Fichiers validés :**

| Fichier | Clés requises |
|---|---|
| `project-analysis.json` | 5 clés requises (stack, domains, etc.) |
| `domain-groups.json` | 4 clés requises |
| `pass1-*.json` | 4 clés requises + objet `analysisPerDomain` |
| `pass2-merged.json` | 10 sections communes (toujours) + 2 sections backend (quand stack backend) + 1 section base kotlin + 2 sections kotlin CQRS (le cas échéant). Match flou avec map d'alias sémantiques ; compte de clés top-level <5 = ERROR, <9 = WARNING ; détection de valeur vide. |
| `pass3-complete.json` | Présence + structure du marker |
| `pass4-memory.json` | Structure du marker : objet, `passNum === 4`, array `memoryFiles` non-vide |

Le check pass2 est **stack-aware** : il lit `project-analysis.json` pour déterminer backend/kotlin/cqrs et ajuste quelles sections il attend.

**Sévérité :** s'exécute au tier **warn-only** — fait remonter des problèmes mais ne bloque pas la CI.

### 4. `plan-validator` — Cohérence Plan ↔ disque (legacy)

Compare les fichiers `claudeos-core/plan/*.md` au disque. Vit dans `plan-validator/`.

**3 modes :**
- `--check` (défaut) : détecte le drift seulement
- `--refresh` : met à jour les fichiers plan depuis le disque
- `--execute` : applique le contenu plan au disque (crée des backups `.bak`)

**Statut v2.1.0 :** La génération du master plan a été supprimée en v2.1.0. `claudeos-core/plan/` n'est plus auto-créé par `init`. Quand `plan/` est absent, ce validator passe avec des messages informationnels.

Il est gardé dans la suite de validators pour les utilisateurs qui maintiennent à la main des fichiers plan à des fins de backup ad hoc.

**Sécurité :** la traversée de path est bloquée — `isWithinRoot(absPath)` rejette les paths qui s'échappent de la racine projet via `../`.

**Sévérité :** s'exécute au tier **fail** quand un drift réel est détecté. No-ops quand `plan/` est absent.

### 5. `sync-checker` — Cohérence Disque ↔ Master Plan

Vérifie que les fichiers enregistrés dans `sync-map.json` (écrit par `manifest-generator`) matchent les fichiers réellement sur disque. Check bidirectionnel à travers les 7 répertoires trackés. Vit dans `sync-checker/`.

**Check en deux étapes :**

1. **Disk → Plan :** Parcourt 7 répertoires trackés (`.claude/rules`, `standard`, `skills`, `guide`, `database`, `mcp-guide`, `memory`) + `CLAUDE.md`. Reporte les fichiers qui existent sur disque mais ne sont pas enregistrés dans `sync-map.json`.
2. **Plan → Disk :** Reporte les paths enregistrés dans `sync-map.json` qui n'existent plus sur disque (orphaned).

**Exit code :** Seuls les fichiers orphaned causent exit 1. Les fichiers unregistered sont informationnels (un projet v2.1.0+ a zéro paths enregistrés par défaut, donc c'est le cas commun).

**Sévérité :** s'exécute au tier **fail** pour les fichiers orphaned. Skip propre quand `sync-map.json` n'a pas de mappings.

---

## Niveaux de sévérité

Tous les checks échoués ne sont pas aussi sérieux. Le `health-checker` orchestre les validators d'exécution avec une sévérité à trois niveaux :

| Tier | Symbole | Comportement |
|---|---|---|
| **fail** | `❌` | Bloque la complétion. La CI sort non-zero. Doit être corrigé. |
| **warn** | `⚠️` | Apparaît dans la sortie mais ne bloque pas. Mérite enquête. |
| **advisory** | `ℹ️` | À examiner plus tard. Souvent des faux-positifs sur des layouts inhabituels. |

**Exemples par tier :**

- **fail :** plan-validator détecte un drift réel ; sync-checker trouve des fichiers orphaned ; fichier guide requis manquant.
- **warn :** pass-json-validator trouve un trou de schéma non-critique.
- **advisory :** le `STALE_PATH` du content-validator signale un path qui existe mais est gitignored (faux-positif sur certains projets).

Le système 3-tier a été ajouté pour que les findings du `content-validator` (qui peut avoir des faux-positifs sur des layouts inhabituels) ne fassent pas deadlock les pipelines CI. Sans cela, chaque advisory bloquerait — et réexécuter `init` ne fixe pas fiablement les hallucinations LLM.

La ligne de résumé montre la répartition :
```
All systems operational (1 advisory, 1 warning)
```

---

## Pourquoi deux entry points : `lint` vs `health`

```bash
npx claudeos-core lint     # claude-md-validator only
npx claudeos-core health   # 4 other validators
```

**Pourquoi cette séparation ?**

`claude-md-validator` trouve des problèmes **structurels** — compte de sections faux, table de fichier memory redéclarée, heading canonique sans le token anglais. Ce sont des signaux que **CLAUDE.md doit être régénéré**, pas des soft warnings à examiner. Réexécuter `init` (avec `--force` au besoin) est le fix.

Les autres validators trouvent des problèmes de **contenu** — paths, entrées manifest, trous de schéma. Ils peuvent être examinés et corrigés à la main sans tout régénérer.

Garder `lint` séparé permet de l'utiliser dans des hooks pre-commit (rapide, structurel uniquement) sans entraîner les checks de contenu plus lents.

---

## Lancer la validation

```bash
# Lance la validation structurelle sur CLAUDE.md
npx claudeos-core lint

# Lance la suite health à 4 validators
npx claudeos-core health
```

Pour la CI, `health` est le check recommandé. Il est toujours rapide (pas d'appels LLM) et couvre tout sauf les checks structurels CLAUDE.md, que la plupart des pipelines CI n'ont pas besoin de vérifier à chaque commit.

Pour les hooks pre-commit, `lint` est suffisamment rapide pour s'exécuter à chaque commit.

---

## Format de sortie

Les validators produisent une sortie human-readable par défaut :

```
[content-validator]
ℹ advisory  STALE_PATH  src/legacy/oldRoutes.ts → file does not exist
            (cited in claudeos-core/standard/10.backend/03.routing.md:42)

[sync-checker]
✓ pass     0 orphaned files; 0 unregistered files
```

Le `manifest-generator` écrit des artefacts machine-readable dans `claudeos-core/generated/` :

- `rule-manifest.json` — liste de fichiers + frontmatter depuis gray-matter + stat
- `sync-map.json` — mappings de paths enregistrés (v2.1.0+ : array vide par défaut)
- `stale-report.json` — findings consolidés de tous les validators

---

## Intégration CI

Un exemple GitHub Actions minimal :

```yaml
name: ClaudeOS Health
on: [push, pull_request]
jobs:
  health:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v5
        with:
          node-version: '20'
      - run: npx claudeos-core health
```

L'exit code est non-zero uniquement pour les findings de tier `fail`. `warn` et `advisory` impriment mais ne font pas échouer le build.

Le workflow CI officiel (dans `.github/workflows/test.yml`) tourne sur `ubuntu-latest`, `windows-latest`, `macos-latest` × Node 18 / 20.

---

## Quand un validator signale quelque chose avec lequel vous êtes en désaccord

Les faux-positifs arrivent, surtout sur des layouts de projet inhabituels (par ex. fichiers générés gitignored, étapes de build personnalisées qui émettent dans des paths non-standards).

**Pour supprimer la détection sur un fichier spécifique**, voir [advanced-config.md](advanced-config.md) pour les overrides `.claudeos-scan.json` disponibles.

**Si un validator a tort à un niveau général** (pas seulement sur votre projet), [ouvrez une issue](https://github.com/claudeos-core/claudeos-core/issues) — ces checks sont ajustés au fil du temps sur la base de vrais reports.

---

## Voir aussi

- [architecture.md](architecture.md) — où vivent les validators dans le pipeline
- [commands.md](commands.md) — référence des commandes `lint` et `health`
- [troubleshooting.md](troubleshooting.md) — ce que veulent dire des erreurs de validator spécifiques
