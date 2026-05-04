# Documentation (Français)

Bienvenue. Ce dossier sert quand le [README principal](../../README.fr.md) ne descend pas assez en profondeur.

Si tu testes juste l'outil, le README principal suffit. Reviens ici quand tu veux savoir *comment* ça marche, pas seulement *que* ça marche.

> Original anglais : [docs/README.md](../README.md). La traduction française est maintenue synchronisée avec l'anglais.

---

## Je débute, par où commencer ?

À lire dans l'ordre. Chaque document suppose que tu as lu le précédent.

1. **[Architecture](architecture.md)** — Comment `init` marche vraiment sous le capot. Le pipeline 4-pass, pourquoi il est découpé en passes, ce que fait le scanner avant qu'un LLM n'intervienne. À démarrer ici pour le modèle conceptuel.

2. **[Diagrams](diagrams.md)** — La même architecture, racontée avec des schémas Mermaid. À parcourir en parallèle du doc architecture.

3. **[Stacks](stacks.md)** — Les 12 stacks supportés (8 backend + 4 frontend), comment chacun est détecté, quels faits le scanner par stack extrait.

4. **[Verification](verification.md)** — Les 5 validators qui tournent après que Claude a généré la doc. Ce qu'ils vérifient, pourquoi ils existent, comment lire leur sortie.

5. **[Commands](commands.md)** — Toutes les commandes CLI et leur rôle. À garder sous la main comme référence une fois les bases acquises.

Après l'étape 5, le modèle mental est en place. Le reste de ce dossier traite de situations spécifiques.

---

## J'ai une question précise

| Question | À lire |
|---|---|
| « Comment installer sans `npx` ? » | [Manual Installation](manual-installation.md) |
| « Est-ce que ma structure de projet est supportée ? » | [Stacks](stacks.md), [Advanced Config](advanced-config.md) |
| « Une réexécution va-t-elle écraser mes éditions ? » | [Safety](safety.md) |
| « Ça a cassé, comment je récupère ? » | [Troubleshooting](troubleshooting.md) |
| « Pourquoi cet outil plutôt qu'un autre ? » | [Comparison](comparison.md) |
| « À quoi sert le memory layer ? » | [Memory Layer](memory-layer.md) |
| « Comment personnaliser le scanner ? » | [Advanced Config](advanced-config.md) |

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

Chaque document est rédigé pour être **lisible isolément**. Pas besoin de les enchaîner dans l'ordre, sauf si tu suis le parcours débutant ci-dessus. Des cross-links existent quand un concept en suppose un autre.

Conventions utilisées dans ces docs :

- **Les blocs de code** montrent ce qu'on tape vraiment ou ce que les fichiers contiennent vraiment. Pas d'abréviation sauf mention explicite.
- **`✅` / `❌`** valent « oui » / « non » dans les tableaux, sans nuance cachée.
- **Les chemins de fichiers** comme `claudeos-core/standard/00.core/01.project-overview.md` sont absolus depuis la racine du projet.
- **Les marqueurs de version** comme *(v2.4.0)* signifient « ajouté dans cette version ». Les versions antérieures ne l'ont pas.

Si un document affirme un truc et que tu trouves une preuve du contraire, c'est un bug de doc. Merci d'[ouvrir une issue](https://github.com/claudeos-core/claudeos-core/issues).

---

## Tu as trouvé un point flou ?

Les PR sont bienvenues sur n'importe quel document. Les docs suivent ces conventions :

- **Français clair plutôt que jargon.** La plupart des lecteurs découvrent ClaudeOS-Core.
- **Exemples plutôt qu'abstractions.** Montre le vrai code, les vrais chemins, la vraie sortie des commandes.
- **Honnêtes sur les limites.** Si un truc cloche ou comporte des nuances, dis-le.
- **Vérifiés contre la source.** Pas de doc sur des fonctionnalités fantômes.

Voir [CONTRIBUTING.md](../../CONTRIBUTING.md) pour le flow de contribution.
