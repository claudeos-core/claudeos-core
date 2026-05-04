# Troubleshooting

Erreurs courantes et comment les corriger. Si le problème n'est pas ici, [ouvrez une issue](https://github.com/claudeos-core/claudeos-core/issues) avec les étapes de reproduction.

> Original anglais : [docs/troubleshooting.md](../troubleshooting.md). La traduction française est maintenue synchronisée avec l'anglais.

---

## Problèmes d'installation

### « Command not found: claudeos-core »

Pas installé globalement, ou le bin global de npm n'est pas sur le PATH.

**Option A : `npx` (recommandé, pas d'install) :**
```bash
npx claudeos-core init
```

**Option B : install global :**
```bash
npm install -g claudeos-core
claudeos-core init
```

Installé via npm mais toujours « command not found » ? Vérifier le PATH :
```bash
npm config get prefix
# Vérifier que le répertoire bin/ sous ce prefix est dans le PATH
```

### « Cannot find module 'glob' » ou similaire

Lancement de ClaudeOS-Core hors d'une racine de projet. Deux options :

1. `cd` dans le projet d'abord.
2. `npx claudeos-core init` (marche depuis n'importe quel répertoire).

### « Node.js version not supported »

ClaudeOS-Core nécessite Node.js 18+. Vérifier la version :

```bash
node --version
```

Mettre à jour via [nvm](https://github.com/nvm-sh/nvm), [fnm](https://github.com/Schniz/fnm), ou le package manager de l'OS.

---

## Pre-flight checks

### « Claude Code not found »

ClaudeOS-Core utilise l'installation locale de Claude Code. À installer d'abord :

- [Guide d'installation officiel](https://docs.anthropic.com/en/docs/claude-code)
- Vérification : `claude --version`

Si `claude` est installé mais hors PATH, corriger le PATH du shell. Pas de variable d'env d'override disponible.

### « Could not detect stack »

Le scanner n'a pas pu identifier le framework du projet. Causes :

- Pas de `package.json` / `pom.xml` / `build.gradle` / `pyproject.toml` à la racine.
- Stack absent des [12 stacks supportés](stacks.md).
- Layout custom qui ne matche pas les règles d'auto-détection.

**Fix :** vérifier que la racine projet a l'un des fichiers reconnus. Si le stack est supporté mais le layout inhabituel, voir [advanced-config.md](advanced-config.md) pour les overrides `.claudeos-scan.json`.

### « Authentication test failed »

`init` lance un rapide `claude -p "echo ok"` pour vérifier l'authentification de Claude Code. En cas d'échec :

```bash
claude --version           # Devrait afficher la version
claude -p "say hi"         # Devrait afficher une réponse
```

Si `-p` retourne une erreur d'auth, suivre le flow d'auth de Claude Code. ClaudeOS-Core ne peut pas réparer l'auth Claude à la place de l'utilisateur.

---

## Problèmes runtime de init

### Init traîne ou prend longtemps

Pass 1 sur un gros projet prend du temps. Diagnostics :

1. **Claude Code marche ?** Lancer `claude --version` dans un autre terminal.
2. **Réseau OK ?** Chaque pass appelle Claude Code, qui appelle l'API Anthropic.
3. **Projet très gros ?** Le splitting de groupe de domaines s'auto-applique (4 domaines / 40 fichiers par groupe), donc un projet à 24 domaines exécute Pass 1 six fois.

Si bloqué longtemps sans sortie (pas d'avancée du progress ticker), tuer (Ctrl-C) et reprendre :

```bash
npx claudeos-core init   # Reprend depuis le dernier marker de pass complété
```

Le mécanisme de resume ne réexécute que les passes incomplètes.

### Erreurs « Prompt is too long » de Claude

Pass 3 a manqué de context window. Mitigations déjà appliquées par l'outil :

- **Pass 3 split mode** (3a → 3b-core → 3b-N → 3c-core → 3c-N → 3d-aux) : automatique.
- **Domain group splitting** : auto-appliqué quand domaines > 4 ou fichiers > 40 par groupe.
- **Batch sub-division** : pour ≥16 domaines, 3b/3c se subdivisent en batches de ≤15 domaines chacun.

Si les limites de contexte restent saturées malgré tout ça, le projet est exceptionnellement gros. Options actuelles :

1. Découper le projet en répertoires séparés et lancer `init` dans chacun.
2. Ajouter des overrides agressifs `frontendScan.platformKeywords` via `.claudeos-scan.json` pour skipper les subapps non essentiels.
3. [Ouvrir une issue](https://github.com/claudeos-core/claudeos-core/issues) : un nouvel override est peut-être nécessaire pour ce cas.

Pas de flag pour « forcer un splitting plus agressif » au-delà de l'automatique.

### Init échoue en cours de route

L'outil est **resume-safe**. Relancer simplement :

```bash
npx claudeos-core init
```

Reprise au dernier marker de pass complété. Pas de travail perdu.

Pour une ardoise propre (supprimer tous les markers et tout régénérer), utiliser `--force` :

```bash
npx claudeos-core init --force
```

Attention : `--force` supprime les éditions manuelles à `.claude/rules/`. Voir [safety.md](safety.md) pour les détails.

### Windows : erreurs « EBUSY » ou file-lock

Le file locking Windows est plus strict qu'Unix. Causes :

- Antivirus qui scanne les fichiers en plein milieu d'écriture.
- Un IDE garde un fichier ouvert avec lock exclusif.
- Un `init` antérieur a crashé et laissé un handle stale.

Fix (essayer dans l'ordre) :

1. Fermer l'IDE et retenter.
2. Désactiver le scan temps-réel de l'antivirus sur le dossier projet (ou whitelister le path projet).
3. Redémarrer Windows (clear les handles stale).
4. Si persistant, lancer depuis WSL2 à la place.

La logique de move de `lib/staged-rules.js` retombe de `renameSync` à `copyFileSync + unlinkSync` pour gérer automatiquement la plupart des interférences antivirus. Si des erreurs de lock persistent, les fichiers stagés restent dans `claudeos-core/generated/.staged-rules/` pour inspection. Relancer `init` retente le move.

### Échecs de rename cross-volume (Linux/macOS)

`init` peut avoir besoin de renommer atomiquement à travers des points de mount (ex. `/tmp` vers le projet sur un autre disque). L'outil retombe automatiquement sur copy-then-delete. Aucune action requise.

En cas d'échecs de move persistants, vérifier l'accès en écriture sur `claudeos-core/generated/.staged-rules/` et `.claude/rules/`.

---

## Problèmes de validation

### « STALE_PATH: file does not exist »

Un path mentionné dans les standards/skills/guides ne résout pas à un fichier réel. Causes :

- Pass 3 a halluciné un path (ex. inventé `featureRoutePath.ts` depuis un répertoire parent + un nom de constante TypeScript).
- Un fichier a été supprimé mais la doc le référence encore.
- Le fichier est gitignored mais l'allowlist du scanner l'avait gardé.

**Fix :**

```bash
npx claudeos-core init --force
```

Régénère Pass 3 / 4 avec une allowlist fraîche.

Si le path est intentionnellement gitignored et doit être ignoré par le scanner, voir [advanced-config.md](advanced-config.md) pour ce que `.claudeos-scan.json` supporte vraiment (l'ensemble de champs supportés est petit).

Si `--force` ne corrige pas (relancer peut redéclencher la même hallucination sur certains seeds LLM rares), éditer le fichier offensant à la main et supprimer le mauvais path. Le validator tourne au tier **advisory**, donc ça ne bloquera pas la CI : ship now, fix later.

### « MANIFEST_DRIFT: registered skill not in CLAUDE.md »

Les skills enregistrées dans `claudeos-core/skills/00.shared/MANIFEST.md` doivent apparaître quelque part dans CLAUDE.md. Le validator a une **exception orchestrator/sub-skill** : les sub-skills sont considérées couvertes quand leur orchestrator est mentionné.

**Fix :** si l'orchestrator d'une sub-skill n'apparaît vraiment pas dans CLAUDE.md, lancer `init --force` pour régénérer. Si l'orchestrator EST mentionné et que le validator le signale quand même, c'est un bug du validator. Merci d'[ouvrir une issue](https://github.com/claudeos-core/claudeos-core/issues) avec les paths de fichiers.

### « Section 8 has wrong number of H4 sub-sections »

`claude-md-validator` exige exactement 2 headings `####` sous la Section 8 (L4 Memory Files / Memory Workflow).

Causes probables :

- Édition manuelle de CLAUDE.md qui a cassé la structure de la Section 8.
- Une Pass 4 pre-v2.3.0 s'est exécutée et a appendé une Section 9.
- Mise à jour depuis une version pre-v2.2.0 (scaffold 8-section pas encore appliqué).

**Fix :**

```bash
npx claudeos-core init --force
```

Régénère CLAUDE.md proprement. Les fichiers memory survivent à `--force` (seuls les fichiers générés sont écrasés).

### « T1: section heading missing English canonical token »

Chaque heading de section `## N.` doit contenir son token canonique anglais (ex. `## 1. Role Definition` ou `## 1. Définition du rôle (Role Definition)`). C'est pour garder le grep multi-repo fonctionnel quel que soit `--lang`.

**Fix :** éditer le heading pour inclure le token anglais entre parenthèses, ou lancer `init --force` pour régénérer (le scaffold v2.3.0+ impose cette convention automatiquement).

---

## Problèmes du memory layer

### « Memory file growing too large »

Lancer la compaction :

```bash
npx claudeos-core memory compact
```

Applique l'algorithme de compaction en 4 stages. Voir [memory-layer.md](memory-layer.md) pour le détail de chaque stage.

### « propose-rules suggère des rules avec lesquelles je ne suis pas d'accord »

La sortie est un draft pour review, pas auto-appliquée. Il suffit de refuser ce qui ne convient pas :

- Éditer `claudeos-core/memory/auto-rule-update.md` directement pour supprimer les propositions rejetées.
- Ou sauter l'étape d'application entièrement : `.claude/rules/` reste inchangé sauf si on copie manuellement le contenu proposé dans des fichiers rule.

### `memory <subcommand>` dit « not found »

Les fichiers memory sont manquants. Pass 4 de `init` les crée. S'ils ont été supprimés :

```bash
npx claudeos-core init --force
```

Pour recréer juste les fichiers memory sans tout réexécuter : l'outil n'a pas de commande de single-pass-replay. `--force` reste le path.

---

## Problèmes CI

### Les tests passent en local mais échouent en CI

Raisons les plus probables :

1. **La CI n'a pas `claude` installé.** Les tests dépendants de la traduction bail-out via `CLAUDEOS_SKIP_TRANSLATION=1`. Le workflow CI officiel met cette env var. Si un fork ne le fait pas, l'ajouter.

2. **Normalisation de path (Windows).** La codebase normalise les backslashes Windows en forward slashes à beaucoup d'endroits, mais les tests peuvent trébucher sur des différences subtiles. La CI officielle tourne sur Windows + Linux + macOS donc la plupart des problèmes sont attrapés. Un échec spécifique à Windows est peut-être un vrai bug.

3. **Version Node.** Les tests tournent sur Node 18 + 20. Sur Node 16 ou 22, possibles incompatibilités. Pinner à 18 ou 20 pour la parité CI.

### `health` sort 0 en CI mais j'attendais non-zero

`health` ne sort non-zero que sur les findings de tier **fail**. **warn** et **advisory** impriment mais ne bloquent pas.

Pour échouer sur les advisories (ex. être strict sur `STALE_PATH`), pas de flag intégré. Il faut grep la sortie et exit en conséquence :

```bash
npx claudeos-core health > health.log
if grep -q "advisory" health.log; then exit 1; fi
```

---

## Obtenir de l'aide

Si rien de ce qui précède ne colle :

1. **Capturer le message d'erreur exact.** Les erreurs ClaudeOS-Core incluent paths de fichiers et identifiants, ça aide à reproduire.
2. **Vérifier le tracker d'issues :** [GitHub Issues](https://github.com/claudeos-core/claudeos-core/issues). Le problème est peut-être déjà reporté.
3. **Ouvrir une nouvelle issue** avec : OS, version Node, version Claude Code (`claude --version`), stack du projet, et la sortie d'erreur. Si possible, inclure `claudeos-core/generated/project-analysis.json` (les vars sensibles sont auto-redacted).

Pour les problèmes de sécurité, voir [SECURITY.md](../../SECURITY.md). Ne pas ouvrir d'issues publiques pour les vulnérabilités.

---

## Voir aussi

- [safety.md](safety.md) : ce que fait `--force` et ce qu'il préserve
- [verification.md](verification.md) : ce que veulent dire les findings de validator
- [advanced-config.md](advanced-config.md) : overrides `.claudeos-scan.json`
