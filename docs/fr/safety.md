# Sécurité : Ce qui est préservé lors d'un re-init

Une inquiétude classique : *« J'ai customisé mon `.claude/rules/`. Si je relance `npx claudeos-core init`, vais-je perdre mes éditions ? »*

**Réponse courte :** ça dépend de l'usage de `--force`.

Cette page détaille ce qui se passe au relancement : ce qui bouge, ce qui reste.

> Original anglais : [docs/safety.md](../safety.md). La traduction française est maintenue synchronisée avec l'anglais.

---

## Les deux chemins du re-init

Au relancement de `init` sur un projet déjà généré, deux scénarios possibles :

### Path 1 : Resume (défaut, sans `--force`)

`init` lit les markers de pass existants (`pass1-*.json`, `pass2-merged.json`, `pass3-complete.json`, `pass4-memory.json`) dans `claudeos-core/generated/`.

Pour chaque pass, si le marker existe et est structurellement valide, la pass est **sautée**. Si les quatre markers sont valides, `init` sort tôt : rien à faire.

**Effet sur les éditions :** tout ce qui a été édité manuellement reste intact. Aucune pass exécutée, aucun fichier écrit.

C'est le path recommandé pour les workflows « je vérifie juste ».

### Path 2 : Fresh start (`--force`)

```bash
npx claudeos-core init --force
```

`--force` supprime les markers de pass et les rules, puis lance le pipeline 4-pass complet depuis zéro. **Les éditions manuelles aux rules sont perdues.** C'est intentionnel : `--force` est l'escape hatch pour « régénération propre ».

Ce que `--force` supprime :
- Tous les fichiers `.json` et `.md` sous `claudeos-core/generated/` (les quatre pass markers + sortie scanner)
- Le répertoire résiduel `claudeos-core/generated/.staged-rules/` si une exécution antérieure a crashé en plein move
- Tout sous `.claude/rules/`

Ce que `--force` ne supprime **pas** :
- Les fichiers `claudeos-core/memory/` (decision log et failure patterns préservés)
- `claudeos-core/standard/`, `claudeos-core/skills/`, `claudeos-core/guide/`, etc. (Pass 3 les écrase, mais aucune suppression préalable : tout ce que Pass 3 ne régénère pas reste)
- Les fichiers en dehors de `claudeos-core/` et `.claude/`
- Le CLAUDE.md (Pass 3 l'écrase via la génération normale)

**Pourquoi `.claude/rules/` est wipé sous `--force` mais pas les autres répertoires :** Pass 3 a une garde « zero-rules detection » qui se déclenche quand `.claude/rules/` est vide, pour décider s'il faut sauter le stage rules par domaine. Avec des stale rules d'une exécution antérieure, la garde donnerait un faux négatif et les nouvelles rules ne se généreraient pas.

---

## Pourquoi `.claude/rules/` existe (le mécanisme de staging)

C'est la question la plus fréquente, d'où sa propre section.

Claude Code a une **policy de path sensible** qui bloque les écritures subprocess vers `.claude/`, même quand le subprocess tourne avec `--dangerously-skip-permissions`. C'est une frontière de sécurité délibérée dans Claude Code lui-même.

Pass 3 et Pass 4 de ClaudeOS-Core sont des invocations subprocess de `claude -p`, donc ils ne peuvent pas écrire directement dans `.claude/rules/`. Le contournement :

1. Le prompt de pass demande à Claude d'écrire tous les fichiers rule dans `claudeos-core/generated/.staged-rules/` à la place.
2. Une fois la pass terminée, l'**orchestrator Node.js** (qui *n'est pas* soumis à la policy de permissions de Claude Code) parcourt l'arbre staging et déplace chaque fichier vers `.claude/rules/`, en préservant les sous-paths.
3. En cas de succès complet, le répertoire staging est supprimé.
4. En cas d'échec partiel (file lock ou erreur de rename cross-volume), le répertoire staging est **préservé** pour inspection, et la prochaine exécution `init` retente.

Le mover vit dans `lib/staged-rules.js`. Il essaie `fs.renameSync` d'abord, puis retombe sur `fs.copyFileSync + fs.unlinkSync` pour les erreurs cross-volume Windows / antivirus file-lock.

**Ce qui se passe en pratique :** en flow normal, `.staged-rules/` est créé et vidé dans une seule exécution `init`. On peut très bien ne jamais le remarquer. Si une exécution crashe en plein stage, des fichiers traînent au prochain `init`, et `--force` les nettoie.

---

## Ce qui est préservé quand

| Catégorie de fichier | Sans `--force` | Avec `--force` |
|---|---|---|
| Éditions manuelles à `.claude/rules/` | ✅ Préservées (aucune pass ne se réexécute) | ❌ Perdues (répertoire wipé) |
| Éditions manuelles à `claudeos-core/standard/` | ✅ Préservées (aucune pass ne se réexécute) | ❌ Écrasées par Pass 3 s'il régénère les mêmes fichiers |
| Éditions manuelles à `claudeos-core/skills/` | ✅ Préservées | ❌ Écrasées par Pass 3 |
| Éditions manuelles à `claudeos-core/guide/` | ✅ Préservées | ❌ Écrasées par Pass 3 |
| Éditions manuelles à `CLAUDE.md` | ✅ Préservées | ❌ Écrasées par Pass 3 |
| Fichiers `claudeos-core/memory/` | ✅ Préservés | ✅ Préservés (`--force` ne supprime pas la memory) |
| Fichiers en dehors de `claudeos-core/` et `.claude/` | ✅ Jamais touchés | ✅ Jamais touchés |
| Pass markers (`generated/*.json`) | ✅ Préservés (utilisés pour resume) | ❌ Supprimés (force le re-run complet) |

**Le résumé honnête :** ClaudeOS-Core n'a pas de couche diff-and-merge. Pas de prompt « review changes before applying ». La story de préservation est binaire : soit ne réexécuter que ce qui manque (défaut), soit wipe et régénérer (`--force`).

Pour intégrer du nouveau contenu généré par l'outil après des éditions manuelles importantes, le workflow recommandé :

1. Commit d'abord les éditions sur git.
2. Lancer `npx claudeos-core init --force` sur une branche séparée.
3. Utiliser `git diff` pour voir ce qui a changé.
4. Merger manuellement ce qui doit l'être de chaque côté.

C'est un workflow chunky exprès. L'outil n'essaie volontairement pas d'auto-merger : une erreur là-dessus corromprait silencieusement les rules d'une façon difficile à détecter.

---

## Détection d'upgrade pre-v2.2.0

Au lancement de `init` sur un projet avec un CLAUDE.md généré par une vieille version (pre-v2.2.0, avant l'application du scaffold 8-section), l'outil détecte ça via le compte de headings (`^## ` heading count ≠ 8, heuristique language-independent) et émet un warning :

```
⚠️  v2.2.0 upgrade detected
─────────────────────────
Your existing CLAUDE.md was generated with an older claudeos-core version.
v2.2.0 introduces structural changes that the default 'resume' mode
CANNOT apply because existing files are preserved under Rule B (idempotency).

To fully adopt v2.2.0, choose one of:
  1. Rerun with --force:   npx claudeos-core init --force
     (overwrites generated files; your memory/ content is preserved)
  2. Choose 'fresh' below  (equivalent to --force)
```

Le warning est purement informationnel. L'outil continue normalement : ignorable pour garder l'ancien format. Mais avec `--force`, l'upgrade structurel s'applique et `claude-md-validator` passe.

**Les fichiers memory survivent aux upgrades `--force`.** Seuls les fichiers générés sont écrasés.

---

## Immutabilité Pass 4 (v2.3.0+)

Une subtilité spécifique : **Pass 4 ne touche pas à `CLAUDE.md`.** La Section 8 de Pass 3 a déjà rédigé toutes les références aux fichiers memory L4 requises. Si Pass 4 écrivait aussi dans CLAUDE.md, il redéclarerait le contenu de la Section 8, ce qui créerait les erreurs de validator `[S1]`/`[M-*]`/`[F2-*]`.

C'est imposé des deux côtés :
- Le prompt Pass 4 dit explicitement « CLAUDE.md MUST NOT BE MODIFIED ».
- La fonction `appendClaudeMdL4Memory()` dans `lib/memory-scaffold.js` est un no-op de 3 lignes (retourne true inconditionnellement, aucune écriture).
- Le test de régression `tests/pass4-claude-md-untouched.test.js` impose ce contrat.

**Côté utilisateur :** sur un projet pre-v2.3.0 où la vieille Pass 4 avait appendé une Section 9 à CLAUDE.md, des erreurs `claude-md-validator` apparaîtront. Lancer `npx claudeos-core init --force` pour régénérer proprement.

---

## Ce que fait la commande `restore`

```bash
npx claudeos-core restore
```

`restore` lance `plan-validator` en mode `--execute`. Historiquement, il copiait le contenu des fichiers `claudeos-core/plan/*.md` dans les emplacements qu'ils décrivent.

**Statut v2.1.0 :** la génération du master plan a été supprimée en v2.1.0. `claudeos-core/plan/` n'est plus auto-créé par `init`. Sans fichiers `plan/`, `restore` est un no-op : il log un message informationnel et sort proprement.

La commande reste pour ceux qui maintiennent à la main des fichiers plan pour du backup/restore ad hoc. Pour un vrai backup, utiliser git.

---

## Patterns de récupération

### « J'ai supprimé des fichiers en dehors du workflow ClaudeOS »

```bash
npx claudeos-core init --force
```

Relance Pass 3 / Pass 4 depuis zéro. Les fichiers supprimés sont régénérés. Les éditions manuelles aux autres fichiers sont perdues (à cause de `--force`). À combiner avec git pour la sécurité.

### « Je veux supprimer une rule spécifique »

Supprimer juste le fichier. Le prochain `init` (sans `--force`) ne le recrée pas, le marker de resume Pass 3 sautera toute la pass.

Pour le faire recréer au prochain `init --force` : rien à faire, la régénération est automatique.

Pour qu'il reste définitivement supprimé (jamais régénéré), il faut figer le projet et ne plus relancer `--force`. Aucun mécanisme intégré « ne pas régénérer ce fichier ».

### « Je veux customiser de façon permanente un fichier généré »

L'outil n'a pas de markers begin/end style HTML pour les régions custom. Deux options :

1. **Ne pas lancer `--force` sur ce projet** : les éditions restent préservées indéfiniment via le default-resume.
2. **Forker le template de prompt** : modifier `pass-prompts/templates/<stack>/pass3.md` dans une copie locale de l'outil, installer le fork, et le fichier régénéré reflétera les customisations.

Pour de simples overrides spécifiques au projet, l'option 1 suffit généralement.

---

## Ce que vérifient les validators (après re-init)

Une fois `init` terminé (en resume ou `--force`), les validators tournent automatiquement :

- `claude-md-validator` : tourne séparément via `lint`
- `health-checker` : exécute les quatre validators de contenu/path

En cas de souci (fichiers manquants, cross-references cassées, paths fabriqués), la sortie du validator s'affiche. Voir [verification.md](verification.md) pour la liste des checks.

Les validators ne corrigent rien, ils reportent. À l'utilisateur de lire le report puis décider : relancer `init` ou corriger à la main.

---

## Confiance via tests

Le path « préserver les éditions utilisateur » (resume sans `--force`) est couvert par les tests d'intégration sous `tests/init-command.test.js` et `tests/pass3-marker.test.js`.

La CI tourne sur Linux / macOS / Windows × Node 18 / 20.

En cas de perte d'éditions par ClaudeOS-Core qui contredit ce document, c'est un bug. [Reportez-le](https://github.com/claudeos-core/claudeos-core/issues) avec les étapes de reproduction.

---

## Voir aussi

- [architecture.md](architecture.md) : le mécanisme de staging dans son contexte
- [commands.md](commands.md) : `--force` et autres flags
- [troubleshooting.md](troubleshooting.md) : récupération d'erreurs spécifiques
