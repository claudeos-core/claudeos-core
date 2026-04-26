# Installation manuelle

Si vous ne pouvez pas utiliser `npx` (firewall d'entreprise, environnement air-gapped, CI verrouillée), voici comment installer et lancer ClaudeOS-Core manuellement.

Pour la plupart des utilisateurs, `npx claudeos-core init` suffit — vous n'avez pas besoin de lire cette page.

> Original anglais : [docs/manual-installation.md](../manual-installation.md). La traduction française est maintenue synchronisée avec l'anglais.

---

## Prérequis (quelle que soit la méthode d'installation)

- **Node.js 18+** — vérifiez avec `node --version`. Si plus ancien, mettez à jour via [nvm](https://github.com/nvm-sh/nvm), [fnm](https://github.com/Schniz/fnm), ou le package manager de votre OS.
- **Claude Code** — installé et authentifié. Vérifiez avec `claude --version`. Voir le [guide d'installation officiel d'Anthropic](https://docs.anthropic.com/en/docs/claude-code).
- **Git repo (préféré)** — `init` vérifie la présence de `.git/` et d'au moins un de `package.json`, `build.gradle`, `pom.xml`, `pyproject.toml` à la racine du projet.

---

## Option 1 — Install npm global

```bash
npm install -g claudeos-core
```

Vérifier :

```bash
claudeos-core --version
```

Puis utilisez sans `npx` :

```bash
claudeos-core init
```

**Pros :** Standard, fonctionne sur la plupart des setups.
**Cons :** Nécessite npm + accès en écriture au `node_modules` global.

Pour mettre à jour plus tard :

```bash
npm install -g claudeos-core@latest
```

Pour désinstaller :

```bash
npm uninstall -g claudeos-core
```

---

## Option 2 — devDependency par projet

Ajoutez au `package.json` de votre projet :

```json
{
  "devDependencies": {
    "claudeos-core": "^2.4.0"
  }
}
```

Installez :

```bash
npm install
```

Utilisez via npm scripts :

```json
{
  "scripts": {
    "claudeos:init": "claudeos-core init",
    "claudeos:health": "claudeos-core health",
    "claudeos:lint": "claudeos-core lint"
  }
}
```

Puis :

```bash
npm run claudeos:init
```

**Pros :** Version pinnée par projet ; CI-friendly ; pas de pollution globale.
**Cons :** Bloat le `node_modules` — bien que les dépendances soient minimales (juste `glob` et `gray-matter`).

Pour désinstaller d'un projet :

```bash
npm uninstall claudeos-core
```

---

## Option 3 — Clone & link (pour les contributeurs)

Pour le développement ou quand vous voulez contribuer :

```bash
git clone https://github.com/claudeos-core/claudeos-core.git
cd claudeos-core
npm install
npm link
```

Maintenant `claudeos-core` est sur votre PATH globalement, pointant vers le repo cloné.

Pour utiliser un clone local dans un autre projet :

```bash
cd /path/to/your/other/project
npm link claudeos-core
```

**Pros :** Éditer le source de l'outil et tester immédiatement les changements.
**Cons :** Utile uniquement aux contributeurs. Le link casse si vous bougez le repo cloné.

---

## Option 4 — Vendored / air-gapped

Pour les environnements sans accès internet :

**Sur une machine connectée :**

```bash
npm pack claudeos-core
# Produces claudeos-core-2.4.0.tgz
```

**Transférez le `.tgz` vers votre environnement air-gapped.**

**Installez depuis le fichier local :**

```bash
npm install -g ./claudeos-core-2.4.0.tgz
```

Vous aurez aussi besoin de :
- Node.js 18+ déjà installé dans l'environnement air-gapped.
- Claude Code déjà installé et authentifié.
- Les packages npm `glob` et `gray-matter` bundlés dans le cache npm offline (ou vendorés en `npm pack`-ant séparément).

Pour avoir toutes les dépendances transitives bundlées, vous pouvez lancer `npm install --omit=dev` à l'intérieur d'une copie unpacked du tarball avant le transfert.

---

## Vérifier l'installation

Après n'importe quelle méthode d'install, vérifiez les quatre prérequis :

```bash
# Devrait afficher la version (par ex. 2.4.0)
claudeos-core --version

# Devrait afficher la version Claude Code
claude --version

# Devrait afficher la version Node (doit être 18+)
node --version

# Devrait afficher le texte d'aide
claudeos-core --help
```

Si les quatre marchent, vous êtes prêt à lancer `claudeos-core init` dans un projet.

---

## Désinstaller

```bash
# Si installé globalement
npm uninstall -g claudeos-core

# Si installé par projet
npm uninstall claudeos-core
```

Pour aussi supprimer le contenu généré d'un projet :

```bash
rm -rf claudeos-core/ .claude/rules/ CLAUDE.md
```

ClaudeOS-Core n'écrit que dans `claudeos-core/`, `.claude/rules/` et `CLAUDE.md`. Supprimer ces trois suffit à enlever complètement le contenu généré d'un projet.

---

## Intégration CI

Pour GitHub Actions, le workflow officiel utilise `npx` :

```yaml
- uses: actions/setup-node@v5
  with:
    node-version: '20'

- run: npx claudeos-core health
```

C'est suffisant pour la plupart des cas d'usage CI — `npx` télécharge le package à la demande et le cache.

Si votre CI est air-gapped ou que vous voulez une version pinnée, utilisez l'Option 2 (devDependency par projet) et :

```yaml
- uses: actions/setup-node@v5
  with:
    node-version: '20'
    cache: 'npm'

- run: npm ci
- run: npm run claudeos:health
```

Pour d'autres systèmes CI (GitLab, CircleCI, Jenkins, etc.), le pattern est le même : installer Node, installer Claude Code, authentifier, lancer `npx claudeos-core <command>`.

**`health` est le check CI recommandé** — il est rapide (pas d'appels LLM) et couvre les quatre validators d'exécution. Pour la validation structurelle, lancez aussi `claudeos-core lint`.

---

## Troubleshooting de l'installation

### « Command not found: claudeos-core »

Soit ce n'est pas installé globalement, soit votre PATH n'inclut pas le bin global de npm.

```bash
npm config get prefix
# Assurez-vous que le répertoire bin/ sous ce path est dans votre PATH
```

Ou utilisez `npx` à la place :

```bash
npx claudeos-core <command>
```

### « Cannot find module 'glob' »

Vous lancez ClaudeOS-Core depuis un répertoire qui n'est pas une racine de projet. Soit `cd` dans votre projet, soit utilisez `npx` (qui marche depuis n'importe où).

### « Node.js version not supported »

Vous avez Node 16 ou plus ancien. Mettez à jour vers Node 18+ :

```bash
# nvm
nvm install 20 && nvm use 20

# fnm
fnm install 20 && fnm use 20

# OS package manager — varies
```

### « Claude Code not found »

ClaudeOS-Core utilise votre installation locale Claude Code. Installez d'abord Claude Code ([guide officiel](https://docs.anthropic.com/en/docs/claude-code)), puis vérifiez avec `claude --version`.

Si `claude` est installé mais pas sur votre PATH, corrigez votre PATH — il n'y a pas de variable d'env d'override.

---

## Voir aussi

- [commands.md](commands.md) — une fois installé, ce qu'il faut lancer
- [troubleshooting.md](troubleshooting.md) — erreurs runtime pendant `init`
