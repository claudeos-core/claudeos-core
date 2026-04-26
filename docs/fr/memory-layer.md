# Memory Layer (L4)

Depuis v2.0, ClaudeOS-Core écrit un memory layer persistant aux côtés de la documentation régulière. C'est pour les projets longs où vous voulez que Claude Code :

1. Se souvienne des décisions architecturales et de leur rationale.
2. Apprenne des échecs récurrents.
3. Auto-promeuve les failure patterns fréquents en rules permanentes.

Si vous n'utilisez ClaudeOS-Core que pour de la génération one-shot, vous pouvez ignorer entièrement ce layer. Les fichiers memory sont écrits mais ne grossiront pas si vous ne les mettez pas à jour.

> Original anglais : [docs/memory-layer.md](../memory-layer.md). La traduction française est maintenue synchronisée avec l'anglais.

---

## Ce qui est écrit

Une fois Pass 4 terminé, le memory layer consiste en :

```
claudeos-core/
└── memory/
    ├── decision-log.md          (append-only "why we chose X over Y")
    ├── failure-patterns.md      (recurring errors, with frequency + importance)
    ├── compaction.md            (how memory is compacted over time)
    └── auto-rule-update.md      (patterns that should become new rules)

.claude/
└── rules/
    └── 60.memory/
        ├── 01.decision-log.md       (rule that auto-loads decision-log.md)
        ├── 02.failure-patterns.md   (rule that auto-loads failure-patterns.md)
        ├── 03.compaction.md         (rule that auto-loads compaction.md)
        └── 04.auto-rule-update.md   (rule that auto-loads auto-rule-update.md)
```

Les fichiers rule `60.memory/` ont des globs `paths:` qui matchent les fichiers projet où la memory devrait être chargée. Quand Claude Code édite un fichier matchant un glob, le fichier memory correspondant est chargé en contexte.

C'est du **on-demand loading** — la memory n'est pas toujours en contexte, seulement quand pertinent. Ça garde le contexte de travail de Claude léger.

---

## Les quatre fichiers memory

### `decision-log.md` — décisions architecturales append-only

Quand vous prenez une décision technique non-évidente, vous (ou Claude, sur votre invite) appendez un bloc :

```markdown
## 2026-04-15 — Use UTC for all stored timestamps

**Why:** Frontend users span 12+ time zones. Storing local time meant scheduling
bugs whenever a user traveled. UTC at the database level + per-user TZ at the
display layer cleanly separates concerns.

**Considered alternatives:**
- Per-row timezone column — rejected: query complexity.
- Browser-local time — rejected: server-side scheduling needs absolute times.
```

Ce fichier **grandit avec le temps**. Il n'est pas auto-supprimé. Les vieilles décisions restent un contexte précieux.

La rule auto-chargée (`60.memory/01.decision-log.md`) dit à Claude Code de consulter ce fichier avant de répondre à des questions comme « Pourquoi avons-nous structuré X de cette façon ? »

### `failure-patterns.md` — erreurs récurrentes

Quand Claude Code fait une erreur récurrente (par ex. « Claude continue à générer du JPA alors que notre projet utilise MyBatis »), une entrée va ici :

```markdown
### Generates JPA repositories instead of MyBatis mappers
- frequency: 7
- importance: 4
- last seen: 2026-04-22
- context: Pattern recurs when generating Order/Product/Customer CRUD modules.

**Fix:** Always check `build.gradle` for `mybatis-spring-boot-starter` before
generating repositories. Use `<Domain>Mapper.java` + `<Domain>.xml`, not
`<Domain>Repository.java extends JpaRepository`.
```

Les champs `frequency` / `importance` / `last seen` pilotent les décisions automatiques :

- **Compaction :** les entrées avec `lastSeen > 60 days` ET `importance < 3` sont droppées.
- **Promotion en rule :** les entrées avec `frequency >= 3` sont surfacées comme candidats pour de nouvelles entrées `.claude/rules/` via `memory propose-rules`. (L'importance n'est pas un filtre — elle affecte juste le score de confiance de chaque proposition.)

Les champs metadata sont parsés par les sub-commands `memory` via une regex ancrée (`^[\s*-]+\*{0,2}\s*key\s*\*{0,2}\s*[:=]`) donc les lignes de champ doivent ressembler à peu près à l'exemple ci-dessus. Les variations indentées ou italicisées sont tolérées.

### `compaction.md` — log de compaction

Ce fichier trace l'historique de compaction :

```markdown
## Last Compaction
- timestamp: 2026-04-26T03:14:00Z
- entries-summarized: 3
- entries-merged: 1
- entries-dropped: 2
- file-trimmed: false
```

Seule la section `## Last Compaction` est écrasée à chaque exécution `memory compact`. Ce que vous ajoutez ailleurs dans le fichier est préservé.

### `auto-rule-update.md` — file d'attente de rules proposées

Quand vous lancez `memory propose-rules`, Claude lit `failure-patterns.md` et appende du contenu de rule proposé ici :

```markdown
## Proposed: Use MyBatis mappers, not JPA repositories
- confidence: 0.83
- evidence:
  - failure-patterns.md: "Generates JPA repositories instead of MyBatis mappers" (frequency 7, importance 4)
- proposed-rule-path: .claude/rules/00.core/orm-mybatis.md
- proposed-rule-content: |
    Always use `<Domain>Mapper.java` + `<Domain>.xml` for data access.
    Project uses `mybatis-spring-boot-starter` (see build.gradle).
    Do NOT generate JpaRepository subclasses.
```

Vous examinez les propositions, copiez celles que vous voulez dans des fichiers rule réels. **La commande propose-rules ne s'applique pas automatiquement** — c'est intentionnel, puisque les rules draftées par LLM nécessitent une review humaine.

---

## Algorithme de compaction

La memory grandit mais ne devient pas obèse. Une compaction en quatre stages tourne quand vous appelez :

```bash
npx claudeos-core memory compact
```

| Stage | Trigger | Action |
|---|---|---|
| 1 | `lastSeen > 30 days` ET non préservé | Body collapsé en un « fix » 1-ligne + meta |
| 2 | Headings dupliqués | Fusionnés (frequencies sommées, body = la plus récente) |
| 3 | `importance < 3` ET `lastSeen > 60 days` | Droppé |
| 4 | Fichier > 400 lignes | Trim les entrées non-préservées les plus anciennes |

**Les entrées « préservées »** survivent à tous les stages. Une entrée est préservée si l'une de :

- `importance >= 7`
- `lastSeen < 30 days`
- Le body contient un path actif concret (non-glob) de rule (par ex. `.claude/rules/10.backend/orm-rules.md`)

Le check « active rule path » est intéressant : si une entrée memory référence un fichier rule réel actuellement existant, l'entrée est ancrée au cycle de vie de cette rule. Tant que la rule existe, la memory reste.

L'algorithme de compaction est une mimétique délibérée des courbes d'oubli humaines — les choses fréquentes, récentes, importantes restent ; les choses rares, vieilles, peu importantes s'estompent.

Pour le code de compaction, voir `bin/commands/memory.js` (fonction `compactFile()`).

---

## Importance scoring

Lancez :

```bash
npx claudeos-core memory score
```

Recalcule l'importance pour les entrées de `failure-patterns.md` :

```
importance = round(frequency × 1.5 + recency × 5), capped at 10
```

Où `recency = max(0, 1 - daysSince(lastSeen) / 90)` (linear decay sur 90 jours).

Effets :
- Une entrée avec `frequency = 3` et `lastSeen = today` → `round(3 × 1.5 + 1.0 × 5) = round(9.5) = 10`
- Une entrée avec `frequency = 3` et `lastSeen = 90+ days ago` → `round(3 × 1.5 + 0 × 5) = 5`

**La commande score strip TOUTES les lignes d'importance existantes avant insertion.** Cela empêche les régressions de duplicate-line lors de réexécutions multiples de score.

---

## Promotion de rule : `propose-rules`

Lancez :

```bash
npx claudeos-core memory propose-rules
```

Ceci :

1. Lit `failure-patterns.md`.
2. Filtre les entrées avec `frequency >= 3`.
3. Demande à Claude de drafter du contenu de rule proposé pour chaque candidat.
4. Calcule la confiance :
   ```
   evidence    = 1.5 × frequency + 0.5 × importance   (importance defaults to 0; capped at 6 if importance is missing)
   confidence  = sigmoid_{k=0.35, x0=8}(evidence) × (anchored ? 1.0 : 0.6)
   ```
   où `anchored` signifie que l'entrée référence un path de fichier réel sur disque.
5. Écrit les propositions dans `auto-rule-update.md` pour review humaine.

**La valeur d'evidence est cappée à 6 quand l'importance est manquante** — sans score d'importance, la frequency seule ne devrait pas suffire à pousser le sigmoid vers une confiance haute. (Cela cap l'input du sigmoid, pas le nombre de propositions.)

---

## Workflow typique

Pour un projet long, le rythme ressemble à :

1. **Lancez `init` une fois** pour mettre en place les fichiers memory aux côtés de tout le reste.

2. **Utilisez Claude Code normalement quelques semaines.** Notez les erreurs récurrentes (par ex. Claude continue à utiliser le mauvais response wrapper). Appendez des entrées à `failure-patterns.md` — soit manuellement soit en demandant à Claude de le faire (la rule dans `60.memory/02.failure-patterns.md` instruit Claude de quand appender).

3. **Lancez périodiquement `memory score`** pour rafraîchir les valeurs d'importance. C'est rapide et idempotent.

4. **Quand vous avez ~5+ patterns à haut score**, lancez `memory propose-rules` pour obtenir des rules draftées.

5. **Examinez les propositions** dans `auto-rule-update.md`. Pour chacune que vous voulez, copiez le contenu dans un fichier rule permanent sous `.claude/rules/`.

6. **Lancez `memory compact` périodiquement** (une fois par mois, ou en CI planifié) pour garder `failure-patterns.md` borné.

Ce rythme est ce pour quoi les quatre fichiers sont conçus. Sauter une étape, c'est ok — le memory layer est opt-in, et les fichiers inutilisés ne gênent pas.

---

## Continuité de session

CLAUDE.md est auto-chargé par Claude Code à chaque session. Les fichiers memory ne sont **pas auto-chargés par défaut** — ils sont chargés à la demande par les rules `60.memory/` quand leur glob `paths:` matche le fichier que Claude est en train d'éditer.

Cela signifie : dans une session Claude Code fraîche, la memory n'est pas visible jusqu'à ce que vous commenciez à travailler sur un fichier pertinent.

Après que l'auto-compaction de Claude Code se déclenche (vers 85 % du contexte), Claude perd la conscience des fichiers memory même s'ils étaient chargés plus tôt. La Section 8 de CLAUDE.md inclut un bloc de prose **Session Resume Protocol** qui rappelle à Claude de :

- Rescanner `failure-patterns.md` pour les entrées pertinentes.
- Relire les entrées les plus récentes de `decision-log.md`.
- Rematcher les rules `60.memory/` contre les fichiers actuellement ouverts.

C'est de la **prose, pas imposé** — mais la prose est structurée de sorte que Claude tend à la suivre. Le Session Resume Protocol fait partie du scaffold canonique v2.3.2+ et est préservé à travers les 10 langues de sortie.

---

## Quand sauter le memory layer

Le memory layer apporte de la valeur pour :

- **Projets de longue durée** (mois ou plus).
- **Équipes** — `decision-log.md` devient une mémoire institutionnelle partagée et un outil d'onboarding.
- **Projets où Claude Code est invoqué ≥10×/jour** — les failure patterns s'accumulent assez vite pour être utiles.

C'est overkill pour :

- Scripts one-off que vous jetterez dans une semaine.
- Projets spike ou prototype.
- Tutoriels ou démos.

Les fichiers memory sont quand même écrits par Pass 4, mais si vous ne les mettez pas à jour, ils ne grandissent pas. Pas de charge de maintenance si vous ne l'utilisez pas.

Si vous ne voulez activement pas que les rules memory auto-chargent quoi que ce soit (pour des raisons de coût en contexte), vous pouvez :

- Supprimer les rules `60.memory/` — Pass 4 ne les recréera pas en resume, seulement en `--force`.
- Ou rétrécir les globs `paths:` dans chaque rule pour qu'ils ne matchent rien.

---

## Voir aussi

- [architecture.md](architecture.md) — Pass 4 dans le contexte du pipeline
- [commands.md](commands.md) — référence `memory compact` / `memory score` / `memory propose-rules`
- [verification.md](verification.md) — checks `[9/9]` memory du content-validator
