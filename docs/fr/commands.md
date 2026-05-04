# Commandes CLI

Toutes les commandes, tous les flags, tous les exit codes réellement supportés par ClaudeOS-Core.

Page de référence. Si vous débutez, lisez d'abord le [Démarrage rapide du README principal](../../README.fr.md#démarrage-rapide).

Toutes les commandes se lancent via `npx claudeos-core <command>` (ou `claudeos-core <command>` en install globale, voir [manual-installation.md](manual-installation.md)).

> Original anglais : [docs/commands.md](../commands.md). La traduction française est maintenue synchronisée avec l'anglais.

---

## Flags globaux

Valables sur toutes les commandes :

| Flag | Effet |
|---|---|
| `--help` / `-h` | Affiche l'aide. Placé après une commande (par ex. `memory --help`), la sub-command gère sa propre aide. |
| `--version` / `-v` | Affiche la version installée. |
| `--lang <code>` | Langue de sortie. Au choix : `en`, `ko`, `ja`, `zh-CN`, `es`, `vi`, `hi`, `ru`, `fr`, `de`. Défaut : `en`. Actuellement consommé uniquement par `init`. |
| `--force` / `-f` | Saute le prompt de resume, supprime les résultats précédents. Actuellement consommé uniquement par `init`. |

Liste complète des flags CLI. **Pas de `--json`, `--strict`, `--quiet`, `--verbose`, `--dry-run`, etc.** Si vous les avez vus dans une vieille doc, ils n'existent pas : `bin/cli.js` ne parse que les quatre flags ci-dessus.

---

## Référence rapide

| Commande | Quand l'utiliser |
|---|---|
| `init` | Première fois sur un projet. Génère tout. |
| `lint` | Après édition manuelle de `CLAUDE.md`. Lance la validation structurelle. |
| `health` | Avant un commit, ou en CI. Lance les quatre validators de contenu/path. |
| `restore` | Plan sauvegardé → disque. (Quasi no-op depuis v2.1.0, gardé pour rétrocompat.) |
| `refresh` | Disque → plan sauvegardé. (Quasi no-op depuis v2.1.0, gardé pour rétrocompat.) |
| `validate` | Lance le mode `--check` du plan-validator. (Quasi no-op depuis v2.1.0.) |
| `memory <sub>` | Maintenance du memory layer : `compact`, `score`, `propose-rules`. |

`restore` / `refresh` / `validate` restent inoffensifs sur les projets qui n'utilisent pas les vieux fichiers plan. Si `plan/` n'existe pas (défaut v2.1.0+), ils passent tous avec des messages informationnels.

---

## `init` — Générer le set de documentation

```bash
npx claudeos-core init [--lang <code>] [--force]
```

Commande principale. Lance le [pipeline 4-pass](architecture.md) de bout en bout :

1. Le scanner produit `project-analysis.json`.
2. Pass 1 analyse chaque groupe de domaines.
3. Pass 2 fusionne les domaines en une image projet-wide.
4. Pass 3 génère CLAUDE.md, rules, standards, skills, guides.
5. Pass 4 scaffolde le memory layer.

**Exemples :**

```bash
# Première fois, sortie en anglais
npx claudeos-core init

# Première fois, sortie en français
npx claudeos-core init --lang fr

# Tout refaire depuis zéro
npx claudeos-core init --force
```

### Resume safety

`init` est **resume-safe**. En cas d'interruption (coupure réseau, timeout, Ctrl-C), l'exécution suivante reprend au dernier marker de pass complété. Les markers vivent dans `claudeos-core/generated/` :

- `pass1-<group>.json` : sortie Pass 1 par domaine
- `pass2-merged.json` : sortie Pass 2
- `pass3-complete.json` : marker Pass 3 (trace aussi quels sub-stages du split mode sont complétés)
- `pass4-memory.json` : marker Pass 4

Marker mal formé (par ex. crash en milieu d'écriture qui a laissé `{"error":"timeout"}`) : le validator le rejette et la pass se réexécute.

Pass 3 partielle (split mode interrompu entre stages) : le mécanisme de resume inspecte le body du marker. Si `mode === "split"` et `completedAt` manque, Pass 3 est réinvoquée et reprend au prochain stage non démarré.

### Ce que fait `--force`

`--force` supprime :
- Tous les fichiers `.json` et `.md` sous `claudeos-core/generated/` (les quatre pass markers inclus)
- Le répertoire résiduel `claudeos-core/generated/.staged-rules/` si une exécution antérieure a crashé en milieu de move
- Tout sous `.claude/rules/` (pour éviter qu'un faux négatif de la « zero-rules detection » de Pass 3 ne soit causé par des stale rules)

`--force` ne supprime **pas** :
- Les fichiers `claudeos-core/memory/` (decision log et failure patterns préservés)
- Les fichiers hors de `claudeos-core/` et `.claude/`

**Les éditions manuelles de rules sont perdues sous `--force`.** C'est le compromis : `--force` existe pour « je veux une ardoise propre ». Pour préserver les éditions, relancez simplement sans `--force`.

### Interactif vs non-interactif

Sans `--lang`, `init` affiche un sélecteur de langue interactif (10 options, flèches ou entrée numérique). En environnement non-TTY (CI, input pipé), le sélecteur retombe sur readline, puis sur un défaut non-interactif sans input.

Sans `--force`, si des markers de pass existants sont détectés, `init` affiche un prompt Continue / Fresh. Passer `--force` saute entièrement ce prompt.

---

## `lint` — Valider la structure de `CLAUDE.md`

```bash
npx claudeos-core lint
```

Lance `claude-md-validator` contre le `CLAUDE.md` du projet. Rapide : pas d'appels LLM, juste des checks structurels.

**Exit codes :**
- `0` : Pass.
- `1` : Fail. Au moins un problème structurel.

**Ce qu'il vérifie** (voir [verification.md](verification.md) pour la liste complète des IDs de check) :

- Le compte de sections vaut exactement 8.
- La Section 4 a 3 ou 4 sub-sections H3.
- La Section 6 a exactement 3 sub-sections H3.
- La Section 8 a exactement 2 sub-sections H3 (Common Rules + L4 Memory) ET exactement 2 sub-sub-sections H4 (L4 Memory Files + Memory Workflow).
- Chaque heading de section canonique contient son token anglais (par ex. `Role Definition`, `Memory`) pour que le grep multi-repo fonctionne quelle que soit la `--lang`.
- Chacun des 4 fichiers memory apparaît dans exactement UNE table-row markdown, confinée à la Section 8.

Le validator est **language-invariant** : les mêmes checks fonctionnent sur un CLAUDE.md généré avec `--lang ko`, `--lang ja`, ou toute autre langue supportée.

Adapté aux hooks pre-commit et à la CI.

---

## `health` — Lancer la suite de vérification

```bash
npx claudeos-core health
```

Orchestre **4 validators** (claude-md-validator s'exécute séparément via `lint`) :

| Ordre | Validator | Tier | En cas d'échec |
|---|---|---|---|
| 1 | `manifest-generator` (prerequisite) | — | En cas d'échec, `sync-checker` est sauté. |
| 2 | `plan-validator` | fail | Exit 1. |
| 3 | `sync-checker` | fail | Exit 1 (si manifest a réussi). |
| 4 | `content-validator` | advisory | Apparaît mais ne bloque pas. |
| 5 | `pass-json-validator` | warn | Apparaît mais ne bloque pas. |

**Exit codes :**
- `0` : aucun finding de tier `fail`. Des warnings et advisories peuvent apparaître.
- `1` : au moins un finding de tier `fail`.

La sévérité 3-tier (fail / warn / advisory) a été ajoutée pour que les findings du `content-validator` (souvent des faux-positifs sur des layouts inhabituels) ne bloquent pas les pipelines CI.

Pour le détail des checks de chaque validator, voir [verification.md](verification.md).

---

## `restore` — Appliquer le plan sauvegardé au disque (legacy)

```bash
npx claudeos-core restore
```

Lance `plan-validator` en mode `--execute` : copie le contenu des fichiers `claudeos-core/plan/*.md` aux emplacements décrits.

**Statut v2.1.0 :** la génération du master plan a été supprimée. `claudeos-core/plan/` n'est plus auto-créé. Si `plan/` n'existe pas, cette commande log un message informationnel et sort proprement.

Commande gardée pour les utilisateurs qui maintiennent à la main des fichiers plan pour du backup/restore ad hoc. Inoffensive sur un projet v2.1.0+.

Crée un backup `.bak` de tout fichier qu'elle écrase.

---

## `refresh` — Sync disque vers plan sauvegardé (legacy)

```bash
npx claudeos-core refresh
```

L'inverse de `restore`. Lance `plan-validator` en mode `--refresh` : lit l'état actuel des fichiers disque et met à jour `claudeos-core/plan/*.md` pour matcher.

**Statut v2.1.0 :** idem que `restore`, no-op quand `plan/` est absent.

---

## `validate` — Diff Plan ↔ disque (legacy)

```bash
npx claudeos-core validate
```

Lance `plan-validator` en mode `--check` : reporte les différences entre `claudeos-core/plan/*.md` et le disque, sans rien modifier.

**Statut v2.1.0 :** no-op quand `plan/` est absent. Lancez plutôt `health`, qui appelle `plan-validator` avec les autres validators.

---

## `memory <subcommand>` — Maintenance du memory layer

```bash
npx claudeos-core memory <subcommand>
```

Trois sub-commands. Elles opèrent sur les fichiers `claudeos-core/memory/` écrits par Pass 4 de `init`. Si ces fichiers manquent, chaque sub-command log `not found` et passe gracieusement (outils best-effort).

Pour le détail du modèle memory, voir [memory-layer.md](memory-layer.md).

### `memory compact`

```bash
npx claudeos-core memory compact
```

Applique une compaction en 4 stages sur `decision-log.md` et `failure-patterns.md` :

| Stage | Trigger | Action |
|---|---|---|
| 1 | `lastSeen > 30 days` ET non préservé | Body collapsé en un « fix » 1-ligne + meta |
| 2 | Headings dupliqués | Fusion (frequencies sommées, body = la plus récente) |
| 3 | `importance < 3` ET `lastSeen > 60 days` | Droppé |
| 4 | Fichier > 400 lignes | Trim les entrées non préservées les plus anciennes |

Les entrées avec `importance >= 7`, `lastSeen < 30 days`, ou un body référençant un path concret (non-glob) de rule active sont auto-préservées.

Après compaction, seule la section `## Last Compaction` de `compaction.md` est remplacée. Tout le reste (vos notes manuelles) est préservé.

### `memory score`

```bash
npx claudeos-core memory score
```

Recalcule les scores d'importance pour les entrées de `failure-patterns.md` :

```
importance = round(frequency × 1.5 + recency × 5), capped at 10
```

Strip toutes les lignes d'importance existantes avant insertion (évite les régressions de duplicate-line). Le nouveau score est réécrit dans le body de l'entrée.

### `memory propose-rules`

```bash
npx claudeos-core memory propose-rules
```

Lit `failure-patterns.md`, prend les entrées avec `frequency >= 3`, et demande à Claude de drafter du contenu de rule pour les top candidats.

Confidence par candidat :
```
evidence    = 1.5 × frequency + 0.5 × importance   (importance defaults to 0; capped at 6 if importance is missing)
confidence  = sigmoid_{k=0.35, x0=8}(evidence) × (anchored ? 1.0 : 0.6)
```

(`anchored` = l'entrée mentionne un path de fichier concret existant sur disque.)

La sortie est **appendée à `claudeos-core/memory/auto-rule-update.md`** pour review. **Pas d'application automatique** : à vous de choisir quelles suggestions copier dans de vrais fichiers rule.

---

## Variables d'environnement

| Variable | Effet |
|---|---|
| `CLAUDEOS_SKIP_TRANSLATION=1` | Court-circuite le path de traduction du memory-scaffold, throw avant d'invoquer `claude -p`. Utilisé par la CI et les tests dépendants de la traduction pour éviter une vraie installation Claude CLI. Sémantique stricte `=== "1"` : aucune autre valeur ne l'active. |
| `CLAUDEOS_ROOT` | Posé automatiquement par `bin/cli.js` à la racine projet de l'utilisateur. Interne, ne pas override. |

Liste complète. Pas de `CLAUDE_PATH`, `DEBUG=claudeos:*`, `CLAUDEOS_NO_COLOR`, etc. : ces variables n'existent pas.

---

## Exit codes

| Code | Signification |
|---|---|
| `0` | Succès. |
| `1` | Échec de validation (finding de tier `fail`) ou `InitError` (par ex. prerequisite manquant, marker mal formé, file lock). |
| Autre | Remonté du processus Node sous-jacent ou du sub-tool : exceptions non attrapées, erreurs d'écriture, etc. |

Pas d'exit code spécial pour « interrompu » : Ctrl-C termine simplement le processus. Relancez `init` et le mécanisme de resume prend le relais.

---

## Ce que `npm test` lance (pour les contributeurs)

Repo cloné, suite de tests à lancer en local :

```bash
npm test
```

Lance `node tests/*.test.js` sur 33 fichiers de test. La suite utilise le runner `node:test` intégré (pas de Jest, pas de Mocha) et `node:assert/strict`.

Un seul fichier de test :

```bash
node tests/scan-java.test.js
```

La CI lance la suite sur Linux / macOS / Windows × Node 18 / 20. Le workflow CI pose `CLAUDEOS_SKIP_TRANSLATION=1` pour que les tests dépendants de la traduction n'aient pas besoin d'un CLI `claude`.

---

## Voir aussi

- [architecture.md](architecture.md) : ce que `init` fait réellement en interne
- [verification.md](verification.md) : ce que vérifient les validators
- [memory-layer.md](memory-layer.md) : sur quoi opèrent les sub-commands `memory`
- [troubleshooting.md](troubleshooting.md) : quand les commandes échouent
