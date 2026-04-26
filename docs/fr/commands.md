# Commandes CLI

Toutes les commandes, tous les flags, tous les exit codes que ClaudeOS-Core supporte réellement.

Cette page est une référence. Si vous débutez, lisez d'abord le [Quick Start du README principal](../../README.fr.md#quick-start).

Toutes les commandes se lancent via `npx claudeos-core <command>` (ou `claudeos-core <command>` si installé globalement — voir [manual-installation.md](manual-installation.md)).

> Original anglais : [docs/commands.md](../commands.md). La traduction française est maintenue synchronisée avec l'anglais.

---

## Flags globaux

Ils fonctionnent sur toutes les commandes :

| Flag | Effet |
|---|---|
| `--help` / `-h` | Montre l'aide. Quand placé après une commande (par ex. `memory --help`), la sub-command gère sa propre aide. |
| `--version` / `-v` | Affiche la version installée. |
| `--lang <code>` | Langue de sortie. L'une parmi : `en`, `ko`, `ja`, `zh-CN`, `es`, `vi`, `hi`, `ru`, `fr`, `de`. Défaut : `en`. Actuellement consommé uniquement par `init`. |
| `--force` / `-f` | Saute le prompt de resume ; supprime les résultats précédents. Actuellement consommé uniquement par `init`. |

C'est la liste complète des flags CLI. **Pas de `--json`, `--strict`, `--quiet`, `--verbose`, `--dry-run`, etc.** Si vous les avez vus dans une vieille doc, ils ne sont pas réels — `bin/cli.js` ne parse que les quatre flags ci-dessus.

---

## Référence rapide

| Commande | À utiliser quand |
|---|---|
| `init` | Première fois sur un projet. Génère tout. |
| `lint` | Après une édition manuelle de `CLAUDE.md`. Lance la validation structurelle. |
| `health` | Avant un commit, ou en CI. Lance les quatre validators de contenu/path. |
| `restore` | Plan sauvegardé → disque. (Quasi no-op depuis v2.1.0 ; gardé pour rétrocompat.) |
| `refresh` | Disque → plan sauvegardé. (Quasi no-op depuis v2.1.0 ; gardé pour rétrocompat.) |
| `validate` | Lance le mode `--check` du plan-validator. (Quasi no-op depuis v2.1.0.) |
| `memory <sub>` | Maintenance du memory layer : `compact`, `score`, `propose-rules`. |

`restore` / `refresh` / `validate` sont gardés parce qu'ils sont inoffensifs sur des projets qui n'utilisent pas les vieux fichiers plan. Si `plan/` n'existe pas (le défaut v2.1.0+), ils passent tous avec des messages informationnels.

---

## `init` — Générer le set de documentation

```bash
npx claudeos-core init [--lang <code>] [--force]
```

La commande principale. Lance le [pipeline 4-pass](architecture.md) de bout en bout :

1. Le scanner produit `project-analysis.json`.
2. Pass 1 analyse chaque groupe de domaines.
3. Pass 2 fusionne les domaines en une image projet-wide.
4. Pass 3 génère CLAUDE.md, rules, standards, skills, guides.
5. Pass 4 scaffold le memory layer.

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

`init` est **resume-safe**. S'il est interrompu (coupure réseau, timeout, Ctrl-C), la prochaine exécution reprend au dernier marker de pass complété. Les markers vivent dans `claudeos-core/generated/` :

- `pass1-<group>.json` — sortie Pass 1 par domaine
- `pass2-merged.json` — sortie Pass 2
- `pass3-complete.json` — marker Pass 3 (trace aussi quels sub-stages du split mode ont été complétés)
- `pass4-memory.json` — marker Pass 4

Si un marker est mal formé (par ex. crash en milieu d'écriture a laissé `{"error":"timeout"}`), le validator le rejette et la pass se réexécute.

Pour une Pass 3 partielle (split mode interrompu entre stages), le mécanisme de resume inspecte le body du marker — si `mode === "split"` et `completedAt` est manquant, Pass 3 est réinvoquée et reprend au prochain stage non démarré.

### Ce que fait `--force`

`--force` supprime :
- Tous les fichiers `.json` et `.md` sous `claudeos-core/generated/` (incluant les quatre pass markers)
- Le répertoire résiduel `claudeos-core/generated/.staged-rules/` si une exécution antérieure a crashé en milieu de move
- Tout sous `.claude/rules/` (pour que la « zero-rules detection » de Pass 3 ne puisse pas false-negative sur des stale rules)

`--force` ne supprime **pas** :
- Les fichiers `claudeos-core/memory/` (votre decision log et failure patterns sont préservés)
- Les fichiers en dehors de `claudeos-core/` et `.claude/`

**Les éditions manuelles de rules sont perdues sous `--force`.** C'est le compromis — `--force` existe pour « je veux une ardoise propre ». Si vous voulez préserver les éditions, réexécutez juste sans `--force`.

### Interactif vs non-interactif

Sans `--lang`, `init` montre un sélecteur de langue interactif (10 options, flèches ou entrée numérique). Dans les environnements non-TTY (CI, input pipé), le sélecteur retombe sur readline, puis sur un défaut non-interactif s'il n'y a pas d'input.

Sans `--force`, si des markers de pass existants sont détectés, `init` montre un prompt Continue / Fresh. Passer `--force` saute entièrement ce prompt.

---

## `lint` — Valider la structure de `CLAUDE.md`

```bash
npx claudeos-core lint
```

Lance `claude-md-validator` contre le `CLAUDE.md` de votre projet. Rapide — pas d'appels LLM, juste des checks structurels.

**Exit codes :**
- `0` — Pass.
- `1` — Fail. Au moins un problème structurel.

**Ce qu'il vérifie** (voir [verification.md](verification.md) pour la liste complète des IDs de check) :

- Le compte de sections doit valoir exactement 8.
- La Section 4 doit avoir 3 ou 4 sub-sections H3.
- La Section 6 doit avoir exactement 3 sub-sections H3.
- La Section 8 doit avoir exactement 2 sub-sections H3 (Common Rules + L4 Memory) ET exactement 2 sub-sub-sections H4 (L4 Memory Files + Memory Workflow).
- Chaque heading de section canonique doit contenir son token anglais (par ex. `Role Definition`, `Memory`) pour que le grep multi-repo fonctionne quel que soit `--lang`.
- Chacun des 4 fichiers memory apparaît dans exactement UNE table-row markdown, confinée à la Section 8.

Le validator est **language-invariant** : les mêmes checks fonctionnent sur un CLAUDE.md généré avec `--lang ko`, `--lang ja`, ou n'importe quelle autre langue supportée.

Adapté aux hooks pre-commit et à la CI.

---

## `health` — Lancer la suite de vérification

```bash
npx claudeos-core health
```

Orchestre **4 validators** (claude-md-validator s'exécute séparément via `lint`) :

| Ordre | Validator | Tier | Que se passe-t-il en cas d'échec |
|---|---|---|---|
| 1 | `manifest-generator` (prerequisite) | — | Si ça échoue, `sync-checker` est sauté. |
| 2 | `plan-validator` | fail | Exit 1. |
| 3 | `sync-checker` | fail | Exit 1 (si manifest a réussi). |
| 4 | `content-validator` | advisory | Apparaît mais ne bloque pas. |
| 5 | `pass-json-validator` | warn | Apparaît mais ne bloque pas. |

**Exit codes :**
- `0` — Aucun finding de tier `fail`. Des warnings et advisories peuvent être présents.
- `1` — Au moins un finding de tier `fail`.

La sévérité 3-tier (fail / warn / advisory) a été ajoutée pour que les findings du `content-validator` (qui ont souvent des faux-positifs sur des layouts inhabituels) ne fassent pas deadlock les pipelines CI.

Pour les détails sur les checks de chaque validator, voir [verification.md](verification.md).

---

## `restore` — Appliquer le plan sauvegardé au disque (legacy)

```bash
npx claudeos-core restore
```

Lance `plan-validator` en mode `--execute` : copie le contenu des fichiers `claudeos-core/plan/*.md` dans les emplacements qu'ils décrivent.

**Statut v2.1.0 :** La génération du master plan a été supprimée. `claudeos-core/plan/` n'est plus auto-créé. Si `plan/` n'existe pas, cette commande log un message informationnel et sort proprement.

La commande est gardée pour les utilisateurs qui maintiennent à la main des fichiers plan à des fins de backup/restore ad hoc. C'est inoffensif d'exécuter sur un projet v2.1.0+.

Crée un backup `.bak` de tout fichier qu'elle écrase.

---

## `refresh` — Sync disque vers plan sauvegardé (legacy)

```bash
npx claudeos-core refresh
```

L'inverse de `restore`. Lance `plan-validator` en mode `--refresh` : lit l'état actuel des fichiers disque et met à jour `claudeos-core/plan/*.md` pour matcher.

**Statut v2.1.0 :** Idem que `restore` — no-op quand `plan/` est absent.

---

## `validate` — Diff Plan ↔ disque (legacy)

```bash
npx claudeos-core validate
```

Lance `plan-validator` en mode `--check` : reporte les différences entre `claudeos-core/plan/*.md` et le disque, sans rien modifier.

**Statut v2.1.0 :** No-op quand `plan/` est absent. La plupart des utilisateurs devraient lancer `health` à la place, qui appelle `plan-validator` avec les autres validators.

---

## `memory <subcommand>` — Maintenance du memory layer

```bash
npx claudeos-core memory <subcommand>
```

Trois sub-commands. Les sub-commands opèrent sur les fichiers `claudeos-core/memory/` écrits par Pass 4 de `init`. Si ces fichiers sont manquants, chaque sub-command log `not found` et passe gracieusement (outils best-effort).

Pour les détails sur le modèle memory, voir [memory-layer.md](memory-layer.md).

### `memory compact`

```bash
npx claudeos-core memory compact
```

Applique une compaction en 4 stages sur `decision-log.md` et `failure-patterns.md` :

| Stage | Trigger | Action |
|---|---|---|
| 1 | `lastSeen > 30 days` ET non préservé | Body collapsé en un « fix » 1-ligne + meta |
| 2 | Headings dupliqués | Fusionnés (frequencies sommées, body = la plus récente) |
| 3 | `importance < 3` ET `lastSeen > 60 days` | Droppé |
| 4 | Fichier > 400 lignes | Trim les entrées non-préservées les plus anciennes |

Les entrées avec `importance >= 7`, `lastSeen < 30 days`, ou un body référençant un path actif concret (non-glob) de rule sont auto-préservées.

Après compaction, seule la section `## Last Compaction` de `compaction.md` est remplacée — tout le reste (vos notes manuelles) est préservé.

### `memory score`

```bash
npx claudeos-core memory score
```

Recalcule les scores d'importance pour les entrées de `failure-patterns.md` :

```
importance = round(frequency × 1.5 + recency × 5), capped at 10
```

Strip toutes les lignes d'importance existantes avant insertion (empêche les régressions de duplicate-line). Le nouveau score est réécrit dans le body de l'entrée.

### `memory propose-rules`

```bash
npx claudeos-core memory propose-rules
```

Lit `failure-patterns.md`, prend les entrées avec `frequency >= 3`, et demande à Claude de drafter du contenu de rule proposé pour les top candidats.

Confidence par candidat :
```
evidence    = 1.5 × frequency + 0.5 × importance   (importance defaults to 0; capped at 6 if importance is missing)
confidence  = sigmoid_{k=0.35, x0=8}(evidence) × (anchored ? 1.0 : 0.6)
```

(`anchored` = l'entrée mentionne un path de fichier concret qui existe sur disque.)

La sortie est **appendée à `claudeos-core/memory/auto-rule-update.md`** pour votre review. **Elle ne s'applique pas automatiquement** — c'est vous qui décidez quelles suggestions copier dans des fichiers rule réels.

---

## Variables d'environnement

| Variable | Effet |
|---|---|
| `CLAUDEOS_SKIP_TRANSLATION=1` | Court-circuite le path de traduction du memory-scaffold ; throw avant d'invoquer `claude -p`. Utilisé par la CI et les tests dépendants de la traduction pour qu'ils n'aient pas besoin d'une vraie installation Claude CLI. Sémantique stricte `=== "1"` — d'autres valeurs ne l'activent pas. |
| `CLAUDEOS_ROOT` | Mis automatiquement par `bin/cli.js` à la racine projet de l'utilisateur. Interne — ne pas override. |

C'est la liste complète. Il n'y a pas de `CLAUDE_PATH`, `DEBUG=claudeos:*`, `CLAUDEOS_NO_COLOR`, etc. — ils n'existent pas.

---

## Exit codes

| Code | Signification |
|---|---|
| `0` | Succès. |
| `1` | Échec de validation (finding de tier `fail`) ou `InitError` (par ex. prerequisite manquant, marker mal formé, file lock). |
| Autre | Remonté du processus Node sous-jacent ou du sub-tool — exceptions non attrapées, erreurs d'écriture, etc. |

Il n'y a pas d'exit code spécial pour « interrompu » — Ctrl-C termine juste le processus. Réexécutez `init` et le mécanisme de resume prend le relais.

---

## Ce que `npm test` lance (pour les contributeurs)

Si vous avez cloné le repo et voulez lancer la suite de tests localement :

```bash
npm test
```

Cela lance `node tests/*.test.js` à travers 33 fichiers de test. La suite de tests utilise le runner `node:test` intégré (pas de Jest, pas de Mocha) et `node:assert/strict`.

Pour un seul fichier de test :

```bash
node tests/scan-java.test.js
```

La CI lance la suite sur Linux / macOS / Windows × Node 18 / 20. Le workflow CI met `CLAUDEOS_SKIP_TRANSLATION=1` pour que les tests dépendants de la traduction n'aient pas besoin d'un CLI `claude`.

---

## Voir aussi

- [architecture.md](architecture.md) — ce que `init` fait réellement en interne
- [verification.md](verification.md) — ce que vérifient les validators
- [memory-layer.md](memory-layer.md) — sur quoi opèrent les sub-commands `memory`
- [troubleshooting.md](troubleshooting.md) — quand les commandes échouent
