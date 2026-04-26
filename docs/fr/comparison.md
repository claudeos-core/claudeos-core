# Comparaison avec des outils similaires

Cette page compare ClaudeOS-Core avec d'autres outils Claude Code qui travaillent dans le même espace général (configuration Claude Code consciente du projet).

**C'est une comparaison de scope, pas un jugement de qualité.** La plupart des outils ci-dessous sont excellents dans ce qu'ils font. Le but est de vous aider à comprendre si ClaudeOS-Core convient à votre problème, ou si l'un d'eux convient mieux.

> Original anglais : [docs/comparison.md](../comparison.md). La traduction française est maintenue synchronisée avec l'anglais.

---

## TL;DR

Si vous voulez **générer automatiquement `.claude/rules/` à partir de ce qui est réellement dans votre code**, c'est la spécialité de ClaudeOS-Core.

Si vous voulez autre chose (gros bundles preset, workflows de planning, orchestration d'agents, sync de config multi-outils), d'autres outils de l'écosystème Claude Code conviendront probablement mieux.

---

## Comment ClaudeOS-Core diffère des autres outils

Traits distinctifs de ClaudeOS-Core :

- **Lit votre vrai code source** (scanner Node.js déterministe — pas de LLM qui devine le stack).
- **Pipeline Claude 4-pass** avec prompts à injection de faits (paths/conventions extraits une fois et réutilisés).
- **5 validators post-génération** (`claude-md-validator` pour la structure, `content-validator` pour les path-claims et le contenu, `pass-json-validator` pour le JSON intermédiaire, `plan-validator` pour les fichiers plan legacy, `sync-checker` pour la cohérence disque ↔ sync-map).
- **10 langues de sortie** avec validation language-invariant.
- **Sortie par projet** : CLAUDE.md, `.claude/rules/`, standards, skills, guides, memory layer — tout dérivé de votre code, pas d'un bundle preset.

D'autres outils Claude Code dans cet espace général (vous voudrez peut-être les superposer ou en choisir un autre selon votre besoin) :

- **Claude `/init`** — intégré à Claude Code ; écrit un seul `CLAUDE.md` en un appel LLM. Idéal pour un setup rapide d'un seul fichier sur petits projets.
- **Outils preset/bundle** — distribuent des agents, skills ou rules curatées qui marchent pour « la plupart des projets ». Idéal quand vos conventions matchent les défauts du bundle.
- **Outils de planning/workflow** — fournissent des méthodologies structurées pour le développement de features (specs, phases, etc.). Idéal quand vous voulez une couche de process au-dessus de Claude Code.
- **Outils de hook/DX** — ajoutent de l'auto-save, des hooks de qualité de code, ou des améliorations developer-experience aux sessions Claude Code.
- **Convertisseurs de rules cross-agent** — gardent vos rules synchronisées entre Claude Code, Cursor, etc.

Ces outils sont surtout **complémentaires, pas concurrents**. ClaudeOS-Core gère le job « générer des rules par projet à partir de votre code » ; les autres gèrent des jobs différents. La plupart peuvent être utilisés ensemble.

---

## Quand ClaudeOS-Core est le bon choix

✅ Vous voulez que Claude Code suive les conventions de VOTRE projet, pas des génériques.
✅ Vous démarrez un nouveau projet (ou onboardez une équipe) et voulez un setup rapide.
✅ Vous en avez assez de maintenir manuellement `.claude/rules/` à mesure que la codebase évolue.
✅ Vous travaillez dans l'un des [12 stacks supportés](stacks.md).
✅ Vous voulez une sortie déterministe et reproductible (même code → mêmes rules à chaque fois).
✅ Vous avez besoin de sortie dans une langue non-anglaise (10 langues intégrées).

## Quand ClaudeOS-Core n'est PAS le bon choix

❌ Vous voulez un bundle preset curé d'agents/skills/rules qui marche dès le premier jour sans étape de scan.
❌ Votre stack n'est pas supporté et vous n'êtes pas intéressé par contribuer.
❌ Vous voulez de l'orchestration d'agents, des workflows de planning, ou une méthodologie de coding — utilisez un outil spécialisé.
❌ Vous n'avez besoin que d'un seul `CLAUDE.md`, pas du set complet standards/rules/skills — `claude /init` suffit.

---

## Ce qui est plus étroit vs plus large en scope

ClaudeOS-Core est **plus étroit** que des bundles à large couverture (il ne livre pas d'agents preset, hooks ou méthodologie — uniquement les rules de votre projet). Il est **plus large** que les outils qui se concentrent sur un seul artefact (il génère CLAUDE.md plus un arbre multi-répertoires de standards, skills, guides et memory). Choisissez selon l'axe qui compte pour votre projet.

---

## « Pourquoi ne pas juste utiliser Claude /init ? »

Bonne question. `claude /init` est intégré à Claude Code et écrit un seul `CLAUDE.md` en un appel LLM. Il est rapide et zéro-config.

**Il marche bien quand :**

- Votre projet est petit (≤30 fichiers).
- Vous êtes ok avec Claude qui devine votre stack à partir d'un coup d'œil rapide à l'arbre de fichiers.
- Vous n'avez besoin que d'un seul `CLAUDE.md`, pas d'un set `.claude/rules/` complet.

**Il peine quand :**

- Votre projet a une convention custom que Claude ne reconnaît pas à un coup d'œil rapide (par ex. MyBatis au lieu de JPA, response wrapper custom, layout de package inhabituel).
- Vous voulez une sortie reproductible entre membres de l'équipe.
- Votre projet est assez gros pour qu'un seul appel Claude tape la context window avant de finir l'analyse.

ClaudeOS-Core est conçu pour les cas où `/init` peine. Si `/init` marche pour vous, vous n'avez probablement pas besoin de ClaudeOS-Core.

---

## « Pourquoi ne pas juste écrire les rules manuellement ? »

Aussi juste. Écrire à la main `.claude/rules/` est l'option la plus précise — vous connaissez votre projet mieux que personne.

**Ça marche bien quand :**

- Vous avez un projet, vous êtes l'unique développeur, vous êtes ok pour passer un temps significatif à écrire les rules from scratch.
- Vos conventions sont stables et bien documentées.

**Ça peine quand :**

- Vous démarrez souvent de nouveaux projets (chacun nécessite le temps d'écriture de rules).
- Votre équipe grandit et les gens oublient ce qu'il y a dans les rules.
- Vos conventions évoluent, et les rules dérivent en arrière.

ClaudeOS-Core vous emmène la majeure partie du chemin vers un set de rules utilisable en une seule exécution. Le reste est du fine-tuning manuel — et beaucoup d'utilisateurs trouvent que c'est un meilleur usage de leur temps que de partir d'un fichier vide.

---

## « Quelle est la différence vs. juste utiliser un bundle preset ? »

Des bundles comme Everything Claude Code vous donnent un set curé de rules / skills / agents qui marchent pour « la plupart des projets ». Ils sont géniaux pour une adoption rapide quand votre projet matche les hypothèses du bundle.

**Les bundles marchent bien quand :**

- Les conventions de votre projet matchent les défauts du bundle (par ex. Spring Boot standard ou Next.js standard).
- Vous n'avez pas de choix de tooling non-default (par ex. MyBatis au lieu de JPA).
- Vous voulez un point de départ et êtes content de customiser à partir de là.

**Les bundles peinent quand :**

- Votre stack utilise des outils non-default (les rules « Spring Boot » du bundle assument JPA).
- Vous avez une convention spécifique au projet que le bundle ne connaît pas.
- Vous voulez que les rules se mettent à jour à mesure que votre code évolue.

ClaudeOS-Core peut compléter les bundles : utilisez ClaudeOS-Core pour les rules spécifiques au projet ; superposez un bundle pour les rules de workflow général.

---

## Choisir entre des outils similaires

Si vous choisissez entre ClaudeOS-Core et un autre outil Claude Code conscient du projet, demandez-vous :

1. **Est-ce que je veux que l'outil lise mon code, ou est-ce que je veux décrire mon projet ?**
   Code-reading → ClaudeOS-Core. Description → la plupart des autres.

2. **Ai-je besoin de la même sortie à chaque fois ?**
   Oui → ClaudeOS-Core (déterministe). Non → n'importe lequel.

3. **Est-ce que je veux un set complet standards/rules/skills/guides, ou juste un CLAUDE.md ?**
   Set complet → ClaudeOS-Core. Juste CLAUDE.md → Claude `/init`.

4. **Est-ce que ma langue de sortie est l'anglais, ou une autre langue ?**
   Anglais seulement → beaucoup d'outils conviennent. Autres langues → ClaudeOS-Core (10 langues intégrées).

5. **Ai-je besoin d'orchestration d'agents, de workflows de planning, ou de hooks ?**
   Oui → utilisez l'outil dédié approprié. ClaudeOS-Core ne fait pas ça.

Si vous avez utilisé ClaudeOS-Core et un autre outil côte à côte, [ouvrez une issue](https://github.com/claudeos-core/claudeos-core/issues) avec votre expérience — ça aide à rendre cette comparaison plus juste.

---

## Voir aussi

- [architecture.md](architecture.md) — ce qui rend ClaudeOS-Core déterministe
- [stacks.md](stacks.md) — les 12 stacks que ClaudeOS-Core supporte
- [verification.md](verification.md) — le filet de sécurité post-génération que les autres outils n'ont pas
