# Documentation (Français)

Bienvenue. Ce dossier est là quand vous avez besoin d'une profondeur que le [README principal](../../README.fr.md) ne couvre pas.

Si vous testez juste l'outil, le README principal suffit — revenez ici quand vous voulez savoir *comment* quelque chose fonctionne, pas seulement *que* ça fonctionne.

> Original anglais : [docs/README.md](../README.md). La traduction française est maintenue synchronisée avec l'anglais.

---

## Je débute — par où commencer ?

Lisez dans l'ordre. Chaque document suppose que vous avez lu le précédent.

1. **[Architecture](architecture.md)** — Comment `init` fonctionne réellement sous le capot. Le pipeline 4-pass, pourquoi il est divisé en passes, ce que fait le scanner avant qu'un LLM n'intervienne. Commencez ici pour le modèle conceptuel.

2. **[Diagrams](diagrams.md)** — La même architecture expliquée avec des images Mermaid. À survoler en parallèle du document architecture.

3. **[Stacks](stacks.md)** — Les 12 stacks supportés (8 backend + 4 frontend), comment chacun est détecté, quels faits le scanner par stack extrait.

4. **[Verification](verification.md)** — Les 5 validators qui s'exécutent après que Claude a généré la doc. Ce qu'ils vérifient, pourquoi ils existent, et comment lire leur sortie.

5. **[Commands](commands.md)** — Toutes les commandes CLI et ce qu'elles font. À utiliser comme référence une fois que vous connaissez les bases.

Après l'étape 5, vous aurez le modèle mental. Tout le reste de ce dossier concerne des situations spécifiques.

---

## J'ai une question précise

| Question | À lire |
|---|---|
| « Comment installer sans `npx` ? » | [Manual Installation](manual-installation.md) |
| « Est-ce que la structure de mon projet est supportée ? » | [Stacks](stacks.md), [Advanced Config](advanced-config.md) |
| « Une réexécution va-t-elle effacer mes éditions ? » | [Safety](safety.md) |
| « Quelque chose a cassé — comment récupérer ? » | [Troubleshooting](troubleshooting.md) |
| « Pourquoi celui-ci plutôt que l'outil X ? » | [Comparison](comparison.md) |
| « À quoi sert le memory layer ? » | [Memory Layer](memory-layer.md) |
| « Comment customiser le scanner ? » | [Advanced Config](advanced-config.md) |

---

## Tous les documents

| Fichier | Sujet |
|---|---|
| [architecture.md](architecture.md) | Le pipeline 4-pass + scanner + validators de bout en bout |
| [diagrams.md](diagrams.md) | Diagrammes Mermaid du même flux |
| [stacks.md](stacks.md) | Les 12 stacks supportés en détail |
| [memory-layer.md](memory-layer.md) | L4 memory : decision-log, failure-patterns, compaction |
| [verification.md](verification.md) | Les 5 validators post-génération |
| [commands.md](commands.md) | Toutes les commandes CLI, tous les flags, exit codes |
| [manual-installation.md](manual-installation.md) | Installation sans `npx` (corp / air-gapped / CI) |
| [advanced-config.md](advanced-config.md) | Overrides `.claudeos-scan.json` |
| [safety.md](safety.md) | Ce qui est préservé lors d'un re-init |
| [comparison.md](comparison.md) | Comparaison de scope avec des outils similaires |
| [troubleshooting.md](troubleshooting.md) | Erreurs et récupération |

---

## Comment lire ce dossier

Chaque document est écrit pour être **lisible isolément** — vous n'êtes pas obligé de les lire dans l'ordre, sauf si vous suivez le parcours nouveau-venu ci-dessus. Des cross-links existent là où un concept dépend d'un autre.

Conventions utilisées dans ces docs :

- **Les blocs de code** montrent ce que vous taperiez réellement ou ce que les fichiers contiennent vraiment. Ils ne sont pas abrégés sauf mention explicite.
- **`✅` / `❌`** veulent dire « oui » / « non » dans les tableaux, jamais autre chose de plus nuancé.
- **Les chemins de fichiers** comme `claudeos-core/standard/00.core/01.project-overview.md` sont absolus à partir de la racine du projet.
- **Les marqueurs de version** comme *(v2.4.0)* sur une fonctionnalité signifient « ajouté dans cette version » — les versions antérieures ne l'ont pas.

Si un document affirme qu'une chose est vraie et que vous trouvez une preuve qu'elle ne l'est pas, c'est un bug de documentation — merci d'[ouvrir une issue](https://github.com/claudeos-core/claudeos-core/issues).

---

## Vous avez trouvé quelque chose de flou ?

Les PR sont bienvenues sur n'importe quel document. Les docs suivent ces conventions :

- **Anglais clair plutôt que jargon.** La plupart des lecteurs utilisent ClaudeOS-Core pour la première fois.
- **Exemples plutôt qu'abstractions.** Montrez le vrai code, les chemins de fichiers, la sortie des commandes.
- **Honnêtes sur les limites.** Si quelque chose ne marche pas ou a des nuances, dites-le.
- **Vérifiés contre la source.** Pas de documentation de fonctionnalités qui n'existent pas.

Voir [CONTRIBUTING.md](../../CONTRIBUTING.md) pour le flow de contribution.
