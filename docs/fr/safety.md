# Sécurité : Ce qui est préservé lors d'un re-init, et ce qui ne quitte jamais ton `.env`

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
- Les catégories gérées par claudeos-core sous `.claude/rules/` : toute entrée préfixée `NN.` (`00.core/`, `10.backend/`, … `90.optional/`). Les fichiers ou dossiers que vous y avez placés vous-même sans ce préfixe (par ex. `.claude/rules/my-team-conventions.md`) restent **intacts** : cet outil ne les a jamais générés.

Ce que `--force` ne supprime **pas** :
- Les fichiers `claudeos-core/memory/` (decision log et failure patterns préservés)
- `claudeos-core/standard/`, `claudeos-core/skills/`, `claudeos-core/guide/`, etc. (Pass 3 les écrase, mais aucune suppression préalable : tout ce que Pass 3 ne régénère pas reste)
- Les fichiers en dehors de `claudeos-core/` et `.claude/`
- Le CLAUDE.md (Pass 3 l'écrase via la génération normale)

**Pourquoi les catégories gérées `.claude/rules/NN.*` sont wipées sous `--force` mais pas les autres répertoires :** Pass 3 a une garde « zero-rules detection » qui se déclenche quand `.claude/rules/` est vide, pour décider s'il faut sauter le stage rules par domaine. Avec des stale rules d'une exécution antérieure, la garde donnerait un faux négatif et les nouvelles rules ne se généreraient pas.

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
| Éditions manuelles aux fichiers générés `.claude/rules/NN.*/` | ✅ Préservées (aucune pass ne se réexécute) | ❌ Perdues (catégories gérées wipées) |
| Vos propres fichiers sous `.claude/rules/` sans préfixe `NN.` | ✅ Préservés | ✅ Préservés (jamais touchés) |
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

## Ce qui n'atteint jamais les fichiers générés : les secrets du `.env`

Tout ce qui précède concerne la survie de *tes fichiers* face à ClaudeOS. Cette section concerne le fait que *tes secrets* n'en sortent pas. Elle est ici parce que « est-ce que cet outil copie mon `.env` dans quelque chose que lit un LLM ? » est une question de sécurité, et c'est cette page qu'on ouvre pour ça.

`init` lit un fichier `.env*` (ordre de recherche dans [stacks.md](stacks.md#extraction-env-v220)) afin que le CLAUDE.md généré indique le vrai port, le vrai hôte et la vraie base. Les variables analysées sont écrites dans `claudeos-core/generated/project-analysis.json`, et les prompts de Pass 3 / Pass 4 demandent au modèle de lire ce fichier. Avant écriture, trois règles s'appliquent à chaque valeur, dans cet ordre :

1. **Rédaction par nom de clé.** Une clé correspondant à `PASSWORD`, `PASS`, `PW`, `SECRET`, `TOKEN`, `API_KEY`, `CREDENTIAL`, `PRIVATE_KEY`, `JWT_SECRET`, `SSH_KEY`, `MASTER_KEY`, `SERVICE_ACCOUNT` et similaires devient `***REDACTED***`. La clé subsiste, si bien que « cette variable existe » reste un fait que la doc peut énoncer.
2. **Masquage des identifiants dans les chaînes de connexion.** Pour une clé que la première règle n'attrape pas (`DATABASE_URL`, `REDIS_URL`, `MONGO_URI`, `SPRING_DATASOURCE_URL`, …), seule la *partie identifiants* est réécrite et le reste est conservé, de sorte que le type de base, l'hôte, le port et le chemin restent lisibles :
   - Userinfo d'URL : `postgres://app:s3cret@db:5432/app` → `postgres://***:***@db:5432/app`
   - Paramètres de query/propriété : `?user=app&password=x` → `?user=app&password=***`
   - DSN Go/MySQL : `user:pw@tcp(host:3306)/db` → `***:***@tcp(host:3306)/db`
   - Oracle JDBC (v2.5.3) : `jdbc:oracle:thin:scott/tiger@//dbhost:1521/ORCL` → `jdbc:oracle:thin:***/***@//dbhost:1521/ORCL` (également les formes `@host:port:SID`, `@(DESCRIPTION=…)` et `jdbc:oracle:oci:`)
3. **Abandon de la valeur entière (v2.5.2).** Quand la deuxième règle ne peut pas réécrire l'identifiant sans risque — un mot de passe contenant un `/`, `?`, `#` ou espace brut, commençant par des chiffres, ou un DSN Oracle dont le segment utilisateur contient lui-même un `@` (v2.5.3) — la valeur est abandonnée en entier (`***REDACTED***`) plutôt que masquée partiellement. Perdre l'hôte est un échec bien moins coûteux qu'un mot de passe fuité. `init` nomme les clés concernées dans son résumé de phase 1 (noms de clés uniquement). Encode le mot de passe en percent-encoding (`/` en `%2F`) pour garder l'hôte visible.

Deux champs scalaires dérivés du `.env` — `envInfo.host` et `envInfo.apiTarget` — sont rendus directement dans CLAUDE.md §3 ; si leur valeur a été abandonnée ils valent `null` et la ligne est omise, si bien que la sentinelle n'apparaît jamais dans un document généré.

**Ce qui n'est pas couvert.** Un template `${VAR}` non développé est laissé tel quel (il ne contient aucun secret vivant). Les commentaires et les fichiers autres que l'unique `.env*` retenu ne sont pas lus. La détection du type de base par le scanner lit le texte brut du `.env` en mémoire et ne l'écrit jamais. Si ton projet garde un identifiant sous une forme qu'aucune règle ci-dessus ne reconnaît, ouvre une issue avec la *forme* (jamais la valeur) — chaque règle listée ici vient de là.

**Ces règles ne couvrent que les fichiers `.env*`.** Un identifiant écrit dans un fichier de configuration du framework — `application.yml`, `application.properties`, `appsettings.json`, un profil Spring, un `settings.py` Django — n'est **pas** masqué, car le scanner lit ces fichiers pour en tirer des faits comme le port du serveur et ne recopie jamais leurs valeurs dans `project-analysis.json`. Mais les Pass 1 à 3 lisent votre arbre de sources directement : un mot de passe en clair commité dans un fichier de configuration est donc visible par le modèle et peut finir cité dans un document généré. Gardez les secrets hors de la configuration commitée. Notez que l'étape **Comment vérifier** ci-dessous ne les trouvera pas : ils n'arrivent jamais dans `project-analysis.json`. Grepez plutôt les *documents* générés : `CLAUDE.md`, `claudeos-core/**/*.md` et `.claude/rules/**/*.md`.

**Comment vérifier.** Après `init`, fais un `grep -i` de ton mot de passe dans `claudeos-core/generated/project-analysis.json`. Il ne doit pas y être. Les règles de masquage sont figées par des tests dans `tests/env-parser.test.js`, y compris les formes exactes qui ont fui autrefois.

## Voir aussi

- [stacks.md](stacks.md#extraction-env-v220) — ordre de recherche `.env` et champs extraits
- [architecture.md](architecture.md) : le mécanisme de staging dans son contexte
- [commands.md](commands.md) : `--force` et autres flags
- [troubleshooting.md](troubleshooting.md) : récupération d'erreurs spécifiques
