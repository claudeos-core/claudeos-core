# Sécurité : Ce qui est préservé lors d'un re-init

Une inquiétude commune : *« J'ai customisé mon `.claude/rules/`. Si je relance `npx claudeos-core init`, vais-je perdre mes éditions ? »*

**Réponse courte :** Ça dépend si vous utilisez `--force`.

Cette page explique exactement ce qui se passe quand vous relancez, ce qui est touché, et ce qui ne l'est pas.

> Original anglais : [docs/safety.md](../safety.md). La traduction française est maintenue synchronisée avec l'anglais.

---

## Les deux chemins à travers le re-init

Quand vous relancez `init` sur un projet qui a déjà de la sortie, l'une de deux choses se passe :

### Path 1 — Resume (défaut, sans `--force`)

`init` lit les markers de pass existants (`pass1-*.json`, `pass2-merged.json`, `pass3-complete.json`, `pass4-memory.json`) dans `claudeos-core/generated/`.

Pour chaque pass, si le marker existe et est structurellement valide, la pass est **sautée**. Si les quatre markers sont valides, `init` sort tôt — il n'a rien à faire.

**Effet sur vos éditions :** tout ce que vous avez édité manuellement est laissé tranquille. Aucune pass n'est exécutée, aucun fichier n'est écrit.

C'est le path recommandé pour la plupart des workflows « je vérifie juste ».

### Path 2 — Fresh start (`--force`)

```bash
npx claudeos-core init --force
```

`--force` supprime les markers de pass et les rules, puis lance le pipeline 4-pass complet depuis zéro. **Les éditions manuelles aux rules sont perdues.** C'est intentionnel — `--force` est l'escape hatch pour « je veux une régénération propre ».

Ce que `--force` supprime :
- Tous les fichiers `.json` et `.md` sous `claudeos-core/generated/` (les quatre pass markers + sortie scanner)
- Le répertoire résiduel `claudeos-core/generated/.staged-rules/` si une exécution antérieure a crashé en milieu de move
- Tout sous `.claude/rules/`

Ce que `--force` ne supprime **pas** :
- Les fichiers `claudeos-core/memory/` (votre decision log et failure patterns sont préservés)
- `claudeos-core/standard/`, `claudeos-core/skills/`, `claudeos-core/guide/`, etc. (ils sont écrasés par Pass 3, mais pas supprimés à l'avance — tout ce que Pass 3 ne régénère pas reste)
- Les fichiers en dehors de `claudeos-core/` et `.claude/`
- Votre CLAUDE.md (Pass 3 l'écrase dans le cadre de la génération normale)

**Pourquoi `.claude/rules/` est wipé sous `--force` mais pas les autres répertoires :** Pass 3 a une garde « zero-rules detection » qui se déclenche quand `.claude/rules/` est vide, utilisée pour décider s'il faut sauter le stage rules par domaine. Si des stale rules d'une exécution antérieure sont présentes, la garde ferait false-negative et les nouvelles rules ne se généreraient pas.

---

## Pourquoi `.claude/rules/` existe (le mécanisme de staging)

C'est la question la plus posée, donc elle a sa propre section.

Claude Code a une **policy de path sensible** qui bloque les écritures subprocess vers `.claude/`, même quand le subprocess tourne avec `--dangerously-skip-permissions`. C'est une frontière de sécurité délibérée dans Claude Code lui-même.

Pass 3 et Pass 4 de ClaudeOS-Core sont des invocations subprocess de `claude -p`, donc ils ne peuvent pas écrire directement dans `.claude/rules/`. Le contournement :

1. Le prompt de pass instruit Claude d'écrire tous les fichiers rule dans `claudeos-core/generated/.staged-rules/` à la place.
2. Une fois la pass terminée, l'**orchestrator Node.js** (qui *n'est pas* soumis à la policy de permissions de Claude Code) parcourt l'arbre staging et déplace chaque fichier vers `.claude/rules/`, en préservant les sous-paths.
3. En cas de succès complet, le répertoire staging est supprimé.
4. En cas d'échec partiel (file lock ou erreur de rename cross-volume), le répertoire staging est **préservé** pour que vous puissiez inspecter ce qui n'est pas passé, et la prochaine exécution `init` retente.

Le mover est dans `lib/staged-rules.js`. Il utilise `fs.renameSync` d'abord, retombant sur `fs.copyFileSync + fs.unlinkSync` sur les erreurs cross-volume Windows / antivirus file-lock.

**Ce que vous voyez vraiment :** en flow normal, `.staged-rules/` est créé et vidé dans une seule exécution `init` — vous ne le remarquerez peut-être jamais. Si une exécution crashe en milieu de stage, vous trouverez des fichiers là à la prochaine `init`, et `--force` les nettoie.

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

**Le résumé honnête :** ClaudeOS-Core n'a pas de couche diff-and-merge. Il n'y a pas de prompt « review changes before applying ». La story de préservation est binaire : soit on ne réexécute que ce qui manque (défaut) soit on wipe et régénère (`--force`).

Si vous avez fait des éditions manuelles importantes et avez besoin d'intégrer du nouveau contenu généré par l'outil, le workflow recommandé est :

1. Committez d'abord vos éditions sur git.
2. Lancez `npx claudeos-core init --force` sur une branche séparée.
3. Utilisez `git diff` pour voir ce qui a changé.
4. Mergez manuellement ce que vous voulez de chaque côté.

C'est un workflow chunky exprès. L'outil n'essaie volontairement pas d'auto-merger — se tromper là-dessus corromprait silencieusement les rules de manière subtile.

---

## Détection d'upgrade pre-v2.2.0

Quand vous lancez `init` sur un projet avec un CLAUDE.md généré par une vieille version (pre-v2.2.0, avant que le scaffold 8-section ne soit appliqué), l'outil détecte ceci via le compte de headings (`^## ` heading count ≠ 8 — heuristique language-independent) et émet un warning :

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

Le warning est informationnel. L'outil continue normalement — vous pouvez l'ignorer si vous voulez garder l'ancien format. Mais avec `--force`, l'upgrade structurel s'applique et `claude-md-validator` passera.

**Les fichiers memory sont préservés à travers les upgrades `--force`.** Seuls les fichiers générés sont écrasés.

---

## Immutabilité Pass 4 (v2.3.0+)

Une subtilité spécifique : **Pass 4 ne touche pas à `CLAUDE.md`.** La Section 8 de Pass 3 a déjà rédigé toutes les références aux fichiers memory L4 requises. Si Pass 4 écrivait aussi vers CLAUDE.md, il redéclarerait le contenu de la Section 8, créant les erreurs de validator `[S1]`/`[M-*]`/`[F2-*]`.

C'est imposé des deux côtés :
- Le prompt Pass 4 dit explicitement « CLAUDE.md MUST NOT BE MODIFIED ».
- La fonction `appendClaudeMdL4Memory()` dans `lib/memory-scaffold.js` est un no-op de 3 lignes (retourne true inconditionnellement, ne fait aucune écriture).
- Le test de régression `tests/pass4-claude-md-untouched.test.js` impose ce contrat.

**Ce que vous devez savoir en tant qu'utilisateur :** si vous relancez un projet pre-v2.3.0 où la vieille Pass 4 avait appendé une Section 9 à CLAUDE.md, vous verrez des erreurs `claude-md-validator`. Lancez `npx claudeos-core init --force` pour régénérer proprement.

---

## Ce que fait la commande `restore`

```bash
npx claudeos-core restore
```

`restore` lance `plan-validator` en mode `--execute`. Historiquement il copiait le contenu des fichiers `claudeos-core/plan/*.md` dans les emplacements qu'ils décrivent.

**Statut v2.1.0 :** La génération du master plan a été supprimée en v2.1.0. `claudeos-core/plan/` n'est plus auto-créé par `init`. Sans fichiers `plan/`, `restore` est un no-op — il log un message informationnel et sort proprement.

La commande est gardée pour les utilisateurs qui maintiennent à la main des fichiers plan pour du backup/restore ad hoc. Si vous voulez un vrai backup, utilisez git.

---

## Patterns de récupération

### « J'ai supprimé des fichiers en dehors du workflow ClaudeOS »

```bash
npx claudeos-core init --force
```

Réexécute Pass 3 / Pass 4 depuis zéro. Les fichiers supprimés sont régénérés. Vos éditions manuelles à d'autres fichiers sont perdues (à cause de `--force`) — combinez avec git pour la sécurité.

### « Je veux supprimer une rule spécifique »

Supprimez juste le fichier. Le prochain `init` (sans `--force`) ne le recréera pas car le marker de resume Pass 3 sautera toute la pass.

Si vous voulez qu'il soit recréé au prochain `init --force`, vous n'avez rien à faire — la régénération est automatique.

Si vous voulez qu'il soit définitivement supprimé (jamais régénéré), vous devez garder le projet figé à son état actuel et ne pas relancer `--force`. Il n'y a pas de mécanisme intégré « ne pas régénérer ce fichier ».

### « Je veux customiser de façon permanente un fichier généré »

L'outil n'a pas de markers begin/end style HTML pour les régions custom. Deux options :

1. **Ne lancez pas `--force` sur ce projet** — vos éditions sont préservées indéfiniment sous le default-resume.
2. **Forkez le template de prompt** — modifiez `pass-prompts/templates/<stack>/pass3.md` dans votre propre copie de l'outil, installez votre fork, et le fichier régénéré reflétera vos customisations.

Pour de simples overrides spécifiques au projet, l'option 1 suffit généralement.

---

## Ce que vérifient les validators (après re-init)

Une fois `init` terminé (que ce soit en resume ou `--force`), les validators tournent automatiquement :

- `claude-md-validator` — s'exécute séparément via `lint`
- `health-checker` — exécute les quatre validators de contenu/path

Si quelque chose cloche (fichiers manquants, cross-references cassées, paths fabriqués), vous verrez la sortie du validator. Voir [verification.md](verification.md) pour la liste des checks.

Les validators ne corrigent rien — ils reportent. Vous lisez le report, puis décidez s'il faut relancer `init` ou corriger manuellement.

---

## Confiance via tests

Le path « préserver les éditions utilisateur » (resume sans `--force`) est exercé par les tests d'intégration sous `tests/init-command.test.js` et `tests/pass3-marker.test.js`.

La CI tourne sur Linux / macOS / Windows × Node 18 / 20.

Si vous trouvez un cas où ClaudeOS-Core a perdu vos éditions d'une manière qui contredit ce document, c'est un bug. [Reportez-le](https://github.com/claudeos-core/claudeos-core/issues) avec les étapes de reproduction.

---

## Voir aussi

- [architecture.md](architecture.md) — le mécanisme de staging dans son contexte
- [commands.md](commands.md) — `--force` et autres flags
- [troubleshooting.md](troubleshooting.md) — récupération d'erreurs spécifiques
