# Troubleshooting

Erreurs courantes et comment les corriger. Si votre problème n'est pas ici, [ouvrez une issue](https://github.com/claudeos-core/claudeos-core/issues) avec les étapes de reproduction.

> Original anglais : [docs/troubleshooting.md](../troubleshooting.md). La traduction française est maintenue synchronisée avec l'anglais.

---

## Problèmes d'installation

### « Command not found: claudeos-core »

Vous ne l'avez pas installé globalement, ou le bin global de npm n'est pas sur votre PATH.

**Option A — Utiliser `npx` (recommandé, pas d'install) :**
```bash
npx claudeos-core init
```

**Option B — Installer globalement :**
```bash
npm install -g claudeos-core
claudeos-core init
```

Si npm-installed mais toujours « command not found », vérifiez votre PATH :
```bash
npm config get prefix
# Vérifier que le répertoire bin/ sous ce prefix est dans votre PATH
```

### « Cannot find module 'glob' » ou similaire

Vous lancez ClaudeOS-Core depuis l'extérieur d'une racine de projet. Soit :

1. `cd` dans votre projet d'abord.
2. Utilisez `npx claudeos-core init` (marche depuis n'importe quel répertoire).

### « Node.js version not supported »

ClaudeOS-Core nécessite Node.js 18+. Vérifiez votre version :

```bash
node --version
```

Mettez à jour via [nvm](https://github.com/nvm-sh/nvm), [fnm](https://github.com/Schniz/fnm), ou le package manager de votre OS.

---

## Pre-flight checks

### « Claude Code not found »

ClaudeOS-Core utilise votre installation locale de Claude Code. Installez-le d'abord :

- [Guide d'installation officiel](https://docs.anthropic.com/en/docs/claude-code)
- Vérifiez : `claude --version`

Si `claude` est installé mais pas sur PATH, corrigez le PATH de votre shell — il n'y a pas de variable d'env d'override.

### « Could not detect stack »

Le scanner n'a pas pu identifier le framework de votre projet. Causes :

- Pas de `package.json` / `pom.xml` / `build.gradle` / `pyproject.toml` à la racine du projet.
- Votre stack n'est pas dans [les 12 stacks supportés](stacks.md).
- Layout custom qui ne matche pas les règles d'auto-détection.

**Fix :** vérifiez que la racine projet a l'un des fichiers reconnus. Si votre stack est supporté mais votre layout est inhabituel, voir [advanced-config.md](advanced-config.md) pour les overrides `.claudeos-scan.json`.

### « Authentication test failed »

`init` lance un rapide `claude -p "echo ok"` pour vérifier que Claude Code est authentifié. Si ça échoue :

```bash
claude --version           # Devrait afficher la version
claude -p "say hi"         # Devrait afficher une réponse
```

Si `-p` retourne une erreur d'auth, suivez le flow d'auth de Claude Code. ClaudeOS-Core ne peut pas réparer l'auth Claude à votre place.

---

## Problèmes runtime de init

### Init pendouille ou prend un long temps

Pass 1 sur un gros projet prend du temps. Diagnostics :

1. **Claude Code marche-t-il ?** Lancez `claude --version` dans un autre terminal.
2. **Le réseau est-il OK ?** Chaque pass appelle Claude Code, qui appelle l'API Anthropic.
3. **Votre projet est-il très gros ?** Le splitting de groupe de domaines s'auto-applique (4 domaines / 40 fichiers par groupe), donc un projet à 24 domaines exécute Pass 1 six fois.

S'il est bloqué longtemps sans sortie (pas d'avancée du progress ticker), tuez-le (Ctrl-C) et reprenez :

```bash
npx claudeos-core init   # Reprend depuis le dernier marker de pass complété
```

Le mécanisme de resume ne réexécute que les passes qui n'ont pas été complétées.

### Erreurs « Prompt is too long » de Claude

Cela signifie que Pass 3 a manqué de context window. Mitigations que l'outil applique déjà :

- **Pass 3 split mode** (3a → 3b-core → 3b-N → 3c-core → 3c-N → 3d-aux) — automatique.
- **Domain group splitting** — auto-appliqué quand domaines > 4 ou fichiers > 40 par groupe.
- **Batch sub-division** — pour ≥16 domaines, 3b/3c se subdivisent en batches de ≤15 domaines chacun.

Si vous tapez quand même les limites de contexte malgré ça, le projet est exceptionnellement gros. Les options actuelles sont :

1. Découpez votre projet en répertoires séparés et lancez `init` dans chacun.
2. Ajoutez des overrides agressifs `frontendScan.platformKeywords` via `.claudeos-scan.json` pour skipper les subapps non essentiels.
3. [Ouvrez une issue](https://github.com/claudeos-core/claudeos-core/issues) — il faut peut-être un nouvel override pour votre cas.

Il n'y a pas de flag pour « forcer un splitting plus agressif » au-delà de ce qui est déjà automatique.

### Init échoue en milieu de course

L'outil est **resume-safe**. Relancez juste :

```bash
npx claudeos-core init
```

Il reprend au dernier marker de pass complété. Pas de travail perdu.

Si vous voulez une ardoise propre (supprimer tous les markers et tout régénérer), utilisez `--force` :

```bash
npx claudeos-core init --force
```

Soyez conscient : `--force` supprime les éditions manuelles à `.claude/rules/`. Voir [safety.md](safety.md) pour les détails.

### Windows : erreurs « EBUSY » ou file-lock

Le file locking Windows est plus strict qu'Unix. Causes :

- Antivirus qui scanne les fichiers en milieu d'écriture.
- Une IDE a un fichier ouvert avec lock exclusif.
- Une `init` antérieure a crashé et laissé un handle stale.

Fix (essayez dans l'ordre) :

1. Fermez votre IDE, retentez.
2. Désactivez le scan temps-réel de l'antivirus pour le dossier projet (ou whitelistez le path projet).
3. Redémarrez Windows (clear les handles stale).
4. Si persistant, lancez depuis WSL2 à la place.

La logique de move de `lib/staged-rules.js` retombe de `renameSync` à `copyFileSync + unlinkSync` pour gérer la plupart des interférences antivirus automatiquement. Si vous tapez quand même des erreurs de lock, les fichiers stagés restent dans `claudeos-core/generated/.staged-rules/` pour inspection — relancez `init` pour retenter le move.

### Échecs de rename cross-volume (Linux/macOS)

`init` peut avoir besoin de renommer atomiquement à travers des points de mount (par ex. `/tmp` vers votre projet sur un disque différent). L'outil retombe automatiquement sur copy-then-delete — pas d'action requise.

Si vous voyez des échecs de move persistants, vérifiez que vous avez l'accès en écriture aux deux `claudeos-core/generated/.staged-rules/` et `.claude/rules/`.

---

## Problèmes de validation

### « STALE_PATH: file does not exist »

Un path mentionné dans les standards/skills/guides ne résout pas à un fichier réel. Causes :

- Pass 3 a halluciné un path (par ex. inventé `featureRoutePath.ts` depuis un répertoire parent + un nom de constante TypeScript).
- Vous avez supprimé un fichier mais la doc le référence encore.
- Le fichier est gitignored mais l'allowlist du scanner l'avait.

**Fix :**

```bash
npx claudeos-core init --force
```

Cela régénère Pass 3 / 4 avec une allowlist fraîche.

Si le path est intentionnellement gitignored et que vous voulez que le scanner l'ignore, voir [advanced-config.md](advanced-config.md) pour ce que `.claudeos-scan.json` supporte réellement (l'ensemble de champs supportés est petit).

Si `--force` ne fixe pas (relancer peut redéclencher la même hallucination sur certains seeds LLM rares), éditez à la main le fichier offensant et supprimez le mauvais path. Le validator tourne au tier **advisory**, donc cela ne bloquera pas la CI — vous pouvez expédier et fixer plus tard.

### « MANIFEST_DRIFT: registered skill not in CLAUDE.md »

Les skills enregistrées dans `claudeos-core/skills/00.shared/MANIFEST.md` devraient être mentionnées quelque part dans CLAUDE.md. Le validator a une **exception orchestrator/sub-skill** — les sub-skills sont considérées couvertes quand leur orchestrator est mentionné.

**Fix :** si l'orchestrator d'une sub-skill n'est vraiment pas mentionné dans CLAUDE.md, lancez `init --force` pour régénérer. Si l'orchestrator EST mentionné et que le validator le signale quand même, c'est un bug du validator — merci d'[ouvrir une issue](https://github.com/claudeos-core/claudeos-core/issues) avec les paths de fichiers.

### « Section 8 has wrong number of H4 sub-sections »

`claude-md-validator` requiert exactement 2 headings `####` sous la Section 8 (L4 Memory Files / Memory Workflow).

Causes probables :

- Vous avez édité manuellement CLAUDE.md et cassé la structure de la Section 8.
- Une Pass 4 pre-v2.3.0 s'est exécutée et a appendé une Section 9.
- Vous mettez à jour depuis une version pre-v2.2.0 (scaffold 8-section pas encore appliqué).

**Fix :**

```bash
npx claudeos-core init --force
```

Cela régénère CLAUDE.md proprement. Les fichiers memory sont préservés à travers `--force` (seuls les fichiers générés sont écrasés).

### « T1: section heading missing English canonical token »

Chaque heading de section `## N.` doit contenir son token canonique anglais (par ex. `## 1. Role Definition` ou `## 1. Définition du rôle (Role Definition)`). C'est pour garder le grep multi-repo fonctionnel quel que soit `--lang`.

**Fix :** éditez le heading pour inclure le token anglais entre parenthèses, ou lancez `init --force` pour régénérer (le scaffold v2.3.0+ impose cette convention automatiquement).

---

## Problèmes du memory layer

### « Memory file growing too large »

Lancez la compaction :

```bash
npx claudeos-core memory compact
```

Cela applique l'algorithme de compaction en 4 stages. Voir [memory-layer.md](memory-layer.md) pour ce que fait chaque stage.

### « propose-rules suggère des rules avec lesquelles je suis en désaccord »

La sortie est un draft pour review, pas auto-appliquée. Refusez juste ce que vous ne voulez pas :

- Éditez `claudeos-core/memory/auto-rule-update.md` directement pour supprimer les propositions que vous rejetez.
- Ou sautez l'étape d'application entièrement — votre `.claude/rules/` reste inchangé sauf si vous copiez le contenu proposé dans des fichiers rule manuellement.

### `memory <subcommand>` dit « not found »

Les fichiers memory sont manquants. Ils sont créés par Pass 4 de `init`. S'ils ont été supprimés :

```bash
npx claudeos-core init --force
```

Ou, si vous voulez juste recréer les fichiers memory sans tout réexécuter, l'outil n'a pas de commande de single-pass-replay. `--force` est le path.

---

## Problèmes CI

### Les tests passent en local mais échouent en CI

Raisons les plus probables :

1. **La CI n'a pas `claude` installé.** Les tests dépendants de la traduction bail-out via `CLAUDEOS_SKIP_TRANSLATION=1`. Le workflow CI officiel met cette env var ; si votre fork ne le fait pas, mettez-la.

2. **Normalisation de path (Windows).** La codebase normalise les backslashes Windows en forward slashes à beaucoup d'endroits, mais les tests peuvent trébucher sur des différences subtiles. La CI officielle tourne sur Windows + Linux + macOS donc la plupart des problèmes sont attrapés — si vous voyez un échec spécifique à Windows, c'est peut-être un vrai bug.

3. **Version Node.** Les tests sont lancés sur Node 18 + 20. Si vous êtes sur Node 16 ou 22, vous pouvez tomber sur des incompatibilités — pinnez à 18 ou 20 pour la parité CI.

### `health` sort 0 en CI mais j'attendais non-zero

`health` ne sort non-zero que sur les findings de tier **fail**. **warn** et **advisory** impriment mais ne bloquent pas.

Si vous voulez échouer sur les advisories (par ex. pour être strict sur `STALE_PATH`), il n'y a pas de flag intégré — vous devriez grep la sortie et exit en conséquence :

```bash
npx claudeos-core health > health.log
if grep -q "advisory" health.log; then exit 1; fi
```

---

## Obtenir de l'aide

Si rien de ce qui précède ne convient :

1. **Capturez le message d'erreur exact.** Les erreurs ClaudeOS-Core incluent paths de fichiers et identifiants — ils aident à reproduire.
2. **Vérifiez le tracker d'issues :** [GitHub Issues](https://github.com/claudeos-core/claudeos-core/issues) — votre problème est peut-être déjà reporté.
3. **Ouvrez une nouvelle issue** avec : OS, version Node, version Claude Code (`claude --version`), stack du projet, et la sortie d'erreur. Si possible, incluez `claudeos-core/generated/project-analysis.json` (les vars sensibles sont auto-redacted).

Pour les problèmes de sécurité, voir [SECURITY.md](../../SECURITY.md) — n'ouvrez pas d'issues publiques pour les vulnérabilités.

---

## Voir aussi

- [safety.md](safety.md) — ce que fait `--force` et ce qu'il préserve
- [verification.md](verification.md) — ce que veulent dire les findings de validator
- [advanced-config.md](advanced-config.md) — overrides `.claudeos-scan.json`
