# Comparaison avec des outils similaires

Cette page compare ClaudeOS-Core à d'autres outils Claude Code qui jouent dans le même terrain (configuration Claude Code consciente du projet).

**C'est une comparaison de scope, pas un jugement de qualité.** La plupart des outils ci-dessous excellent dans leur domaine. L'objectif : aider à comprendre si ClaudeOS-Core répond au problème, ou si un autre outil colle mieux.

> Original anglais : [docs/comparison.md](../comparison.md). La traduction française est maintenue synchronisée avec l'anglais.

---

## TL;DR

Pour **générer automatiquement `.claude/rules/` à partir du code réellement présent**, c'est la spécialité de ClaudeOS-Core.

Pour autre chose (gros bundles preset, workflows de planning, orchestration d'agents, sync de config multi-outils), d'autres outils de l'écosystème Claude Code conviendront probablement mieux.

---

## Comment ClaudeOS-Core diffère des autres outils

Traits distinctifs de ClaudeOS-Core :

- **Lit le vrai code source** (scanner Node.js déterministe, pas de LLM qui devine le stack).
- **Pipeline Claude 4-pass** avec prompts à injection de faits (paths/conventions extraits une fois et réutilisés).
- **5 validators post-génération** (`claude-md-validator` pour la structure, `content-validator` pour les path-claims et le contenu, `pass-json-validator` pour le JSON intermédiaire, `plan-validator` pour les fichiers plan legacy, `sync-checker` pour la cohérence disque ↔ sync-map).
- **10 langues de sortie** avec validation language-invariant.
- **Sortie par projet** : CLAUDE.md, `.claude/rules/`, standards, skills, guides, memory layer, tout dérivé du code, pas d'un bundle preset.

D'autres outils Claude Code dans le même espace (à superposer ou choisir selon le besoin) :

- **Claude `/init`** : intégré à Claude Code, écrit un seul `CLAUDE.md` en un appel LLM. Idéal pour un setup rapide mono-fichier sur petits projets.
- **Outils preset/bundle** : distribuent des agents, skills ou rules curatées qui marchent pour « la plupart des projets ». Idéal quand les conventions matchent les défauts du bundle.
- **Outils de planning/workflow** : fournissent des méthodologies structurées pour le développement de features (specs, phases, etc.). Idéal pour une couche de process au-dessus de Claude Code.
- **Outils de hook/DX** : ajoutent auto-save, hooks de qualité de code, ou améliorations developer-experience aux sessions Claude Code.
- **Convertisseurs de rules cross-agent** : synchronisent les rules entre Claude Code, Cursor, etc.

Ces outils sont surtout **complémentaires, pas concurrents**. ClaudeOS-Core gère le job « générer des rules par projet à partir du code », les autres gèrent d'autres jobs. La plupart peuvent cohabiter.

---

## Quand ClaudeOS-Core est le bon choix

✅ Claude Code doit suivre les conventions de CE projet, pas des génériques.
✅ Nouveau projet (ou onboarding d'équipe) avec besoin d'un setup rapide.
✅ Marre de maintenir `.claude/rules/` à la main quand la codebase évolue.
✅ Stack présent dans les [12 stacks supportés](stacks.md).
✅ Sortie déterministe et reproductible attendue (même code = mêmes rules).
✅ Sortie dans une langue non-anglaise (10 langues intégrées).

## Quand ClaudeOS-Core n'est PAS le bon choix

❌ Bundle preset curé d'agents/skills/rules qui marche dès le premier jour, sans scan.
❌ Stack non supporté, sans envie de contribuer.
❌ Orchestration d'agents, workflows de planning, méthodologie de coding : prendre un outil spécialisé.
❌ Besoin uniquement d'un `CLAUDE.md`, pas du set complet standards/rules/skills : `claude /init` suffit.

---

## Ce qui est plus étroit vs plus large en scope

ClaudeOS-Core est **plus étroit** que les bundles à large couverture : pas d'agents preset, pas de hooks, pas de méthodologie, juste les rules du projet. Il est **plus large** que les outils mono-artefact : il génère CLAUDE.md plus un arbre multi-répertoires de standards, skills, guides et memory. Choisir selon l'axe qui compte pour le projet.

---

## « Pourquoi ne pas juste utiliser Claude /init ? »

Bonne question. `claude /init` est intégré à Claude Code et écrit un seul `CLAUDE.md` en un appel LLM. Rapide et zéro-config.

**Marche bien quand :**

- Le projet est petit (≤30 fichiers).
- On accepte que Claude devine le stack via un coup d'œil rapide à l'arbre de fichiers.
- Un seul `CLAUDE.md` suffit, pas de set `.claude/rules/` complet.

**Peine quand :**

- Le projet a une convention custom que Claude ne reconnaît pas d'un coup d'œil (ex. MyBatis au lieu de JPA, response wrapper custom, layout de package inhabituel).
- Sortie reproductible attendue entre membres de l'équipe.
- Projet assez gros pour qu'un seul appel Claude sature la context window avant la fin de l'analyse.

ClaudeOS-Core vise les cas où `/init` peine. Si `/init` suffit, ClaudeOS-Core n'apporte probablement rien.

---

## « Pourquoi ne pas juste écrire les rules manuellement ? »

Légitime aussi. Écrire `.claude/rules/` à la main reste l'option la plus précise : on connaît son projet mieux que personne.

**Marche bien quand :**

- Un projet, un seul développeur, accepter de passer un temps significatif à écrire les rules from scratch.
- Conventions stables et bien documentées.

**Peine quand :**

- Démarrage fréquent de nouveaux projets (chacun coûte le temps d'écriture de rules).
- L'équipe grandit, les gens oublient le contenu des rules.
- Les conventions évoluent, les rules dérivent.

ClaudeOS-Core couvre l'essentiel d'un set de rules utilisable en une seule exécution. Le reste, c'est du fine-tuning manuel : beaucoup trouvent que c'est un meilleur usage du temps que de partir d'un fichier vide.

---

## « Quelle est la différence vs. juste utiliser un bundle preset ? »

Des bundles comme Everything Claude Code livrent un set curé de rules / skills / agents qui marchent pour « la plupart des projets ». Géniaux pour une adoption rapide quand le projet matche les hypothèses du bundle.

**Les bundles marchent bien quand :**

- Les conventions du projet matchent les défauts du bundle (ex. Spring Boot standard ou Next.js standard).
- Pas de tooling non-default (ex. MyBatis au lieu de JPA).
- Un point de départ suffit, customisation à partir de là.

**Les bundles peinent quand :**

- Le stack utilise des outils non-default (les rules « Spring Boot » du bundle supposent JPA).
- Une convention spécifique au projet que le bundle ignore.
- Les rules doivent se mettre à jour au fil de l'évolution du code.

ClaudeOS-Core peut compléter les bundles : ClaudeOS-Core pour les rules spécifiques au projet, un bundle par-dessus pour les rules de workflow général.

---

## Choisir entre des outils similaires

Au moment de choisir entre ClaudeOS-Core et un autre outil Claude Code conscient du projet, voici les bonnes questions :

1. **L'outil doit-il lire le code, ou faut-il décrire le projet ?**
   Code-reading → ClaudeOS-Core. Description → la plupart des autres.

2. **Faut-il la même sortie à chaque fois ?**
   Oui → ClaudeOS-Core (déterministe). Non → n'importe lequel.

3. **Set complet standards/rules/skills/guides, ou juste un CLAUDE.md ?**
   Set complet → ClaudeOS-Core. Juste CLAUDE.md → Claude `/init`.

4. **Langue de sortie : anglais ou autre ?**
   Anglais uniquement → beaucoup d'outils conviennent. Autres langues → ClaudeOS-Core (10 langues intégrées).

5. **Orchestration d'agents, workflows de planning, hooks ?**
   Oui → l'outil dédié. ClaudeOS-Core ne fait pas ça.

Pour ceux qui ont utilisé ClaudeOS-Core et un autre outil côte à côte, [ouvrez une issue](https://github.com/claudeos-core/claudeos-core/issues) avec votre retour. Ça aide à rendre la comparaison plus juste.

---

## Voir aussi

- [architecture.md](architecture.md) : ce qui rend ClaudeOS-Core déterministe
- [stacks.md](stacks.md) : les 12 stacks supportés
- [verification.md](verification.md) : le filet de sécurité post-génération que les autres outils n'ont pas
