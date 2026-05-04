# Installation manuelle

Si `npx` ne passe pas (firewall d'entreprise, environnement air-gapped, CI verrouillée), voici comment installer et lancer ClaudeOS-Core à la main.

Dans la majorité des cas, `npx claudeos-core init` suffit. Inutile de lire cette page.

> Original anglais : [docs/manual-installation.md](../manual-installation.md). La traduction française est maintenue synchronisée avec l'anglais.

---

## Prérequis (quelle que soit la méthode)

- **Node.js 18+** : vérifiez avec `node --version`. Plus ancien ? Mettez à jour via [nvm](https://github.com/nvm-sh/nvm), [fnm](https://github.com/Schniz/fnm), ou le package manager de l'OS.
- **Claude Code** : installé et authentifié. Vérifiez avec `claude --version`. Voir le [guide d'installation officiel d'Anthropic](https://docs.anthropic.com/en/docs/claude-code).
- **Git repo (préféré)** : `init` vérifie la présence de `.git/` et d'au moins un fichier parmi `package.json`, `build.gradle`, `pom.xml`, `pyproject.toml` à la racine du projet.

---

## Option 1 — Install npm global

```bash
npm install -g claudeos-core
```

Vérifier :

```bash
claudeos-core --version
```

Puis utilisable sans `npx` :

```bash
claudeos-core init
```

**Pros :** standard, fonctionne sur la majorité des setups.
**Cons :** demande npm + accès en écriture au `node_modules` global.

Pour mettre à jour ensuite :

```bash
npm install -g claudeos-core@latest
```

Pour désinstaller :

```bash
npm uninstall -g claudeos-core
```

---

## Option 2 — devDependency par projet

Ajoutez au `package.json` du projet :

```json
{
  "devDependencies": {
    "claudeos-core": "^2.4.4"
  }
}
```

Installez :

```bash
npm install
```

Utilisation via npm scripts :

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

**Pros :** version pinnée par projet, CI-friendly, pas de pollution globale.
**Cons :** alourdit le `node_modules`. Cela dit, les dépendances sont minimales (`glob` et `gray-matter`).

Pour désinstaller d'un projet :

```bash
npm uninstall claudeos-core
```

---

## Option 3 — Clone & link (pour les contributeurs)

Pour le développement ou pour contribuer :

```bash
git clone https://github.com/claudeos-core/claudeos-core.git
cd claudeos-core
npm install
npm link
```

`claudeos-core` est maintenant sur le PATH global, pointant vers le repo cloné.

Pour utiliser un clone local dans un autre projet :

```bash
cd /path/to/your/other/project
npm link claudeos-core
```

**Pros :** éditer le source de l'outil et tester les changements dans la foulée.
**Cons :** utile uniquement aux contributeurs. Le link casse si on déplace le repo cloné.

---

## Option 4 — Vendored / air-gapped

Pour les environnements sans accès internet :

**Sur une machine connectée :**

```bash
npm pack claudeos-core
# Produces claudeos-core-2.4.4.tgz
```

**Transférez le `.tgz` vers l'environnement air-gapped.**

**Installez depuis le fichier local :**

```bash
npm install -g ./claudeos-core-2.4.4.tgz
```

Il faut aussi :
- Node.js 18+ déjà installé dans l'environnement air-gapped.
- Claude Code déjà installé et authentifié.
- Les packages npm `glob` et `gray-matter` bundlés dans le cache npm offline (ou vendorés via un `npm pack` séparé).

Pour bundler toutes les dépendances transitives, lancez `npm install --omit=dev` dans une copie unpacked du tarball avant le transfert.

---

## Vérifier l'installation

Quelle que soit la méthode d'install, vérifiez les quatre prérequis :

```bash
# Affiche la version (par ex. 2.4.4)
claudeos-core --version

# Affiche la version Claude Code
claude --version

# Affiche la version Node (doit être 18+)
node --version

# Affiche le texte d'aide
claudeos-core --help
```

Les quatre passent ? Vous pouvez lancer `claudeos-core init` dans un projet.

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

ClaudeOS-Core n'écrit que dans `claudeos-core/`, `.claude/rules/` et `CLAUDE.md`. Supprimer ces trois suffit à retirer complètement le contenu généré d'un projet.

---

## Intégration CI

Pour GitHub Actions, le workflow officiel utilise `npx` :

```yaml
- uses: actions/setup-node@v5
  with:
    node-version: '20'

- run: npx claudeos-core health
```

Suffisant pour la plupart des cas d'usage CI : `npx` télécharge le package à la demande puis le cache.

CI air-gapped ou version pinnée souhaitée ? Passez à l'Option 2 (devDependency par projet) :

```yaml
- uses: actions/setup-node@v5
  with:
    node-version: '20'
    cache: 'npm'

- run: npm ci
- run: npm run claudeos:health
```

Sur d'autres systèmes CI (GitLab, CircleCI, Jenkins, etc.), le pattern reste identique : installer Node, installer Claude Code, s'authentifier, lancer `npx claudeos-core <command>`.

**`health` est le check CI recommandé** : rapide (pas d'appels LLM) et couvrant les quatre validators d'exécution. Pour la validation structurelle, ajoutez `claudeos-core lint`.

---

## Troubleshooting de l'installation

### « Command not found: claudeos-core »

Soit pas d'install globale, soit le PATH n'inclut pas le bin global de npm.

```bash
npm config get prefix
# Vérifiez que le répertoire bin/ sous ce path est dans le PATH
```

Ou passez par `npx` :

```bash
npx claudeos-core <command>
```

### « Cannot find module 'glob' »

ClaudeOS-Core est lancé depuis un répertoire qui n'est pas une racine de projet. Soit `cd` dans le projet, soit `npx` (qui marche de partout).

### « Node.js version not supported »

Vous avez Node 16 ou plus ancien. Passez à Node 18+ :

```bash
# nvm
nvm install 20 && nvm use 20

# fnm
fnm install 20 && fnm use 20

# OS package manager — varies
```

### « Claude Code not found »

ClaudeOS-Core utilise l'install locale de Claude Code. Installez d'abord Claude Code ([guide officiel](https://docs.anthropic.com/en/docs/claude-code)), puis vérifiez avec `claude --version`.

`claude` installé mais pas sur le PATH ? Corrigez le PATH : pas de variable d'env d'override.

---

## Voir aussi

- [commands.md](commands.md) : une fois installé, ce qu'il faut lancer
- [troubleshooting.md](troubleshooting.md) : erreurs runtime pendant `init`
