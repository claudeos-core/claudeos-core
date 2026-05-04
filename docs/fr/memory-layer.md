# Memory Layer (L4)

Depuis v2.0, ClaudeOS-Core écrit un memory layer persistant à côté de la documentation classique. C'est pour les projets longs où Claude Code doit :

1. Se souvenir des décisions architecturales et de leur rationale.
2. Apprendre des échecs récurrents.
3. Auto-promouvoir les failure patterns fréquents en rules permanentes.

Pour un usage one-shot, ce layer est ignorable. Les fichiers memory sont écrits mais ne grossissent pas sans mise à jour.

> Original anglais : [docs/memory-layer.md](../memory-layer.md). La traduction française est maintenue synchronisée avec l'anglais.

---

## Ce qui est écrit

Une fois Pass 4 terminé, le memory layer contient :

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

Les fichiers rule `60.memory/` ont des globs `paths:` qui matchent les fichiers projet où la memory doit se charger. Quand Claude Code édite un fichier matchant un glob, le fichier memory correspondant arrive en contexte.

C'est du **on-demand loading** : la memory n'est pas toujours en contexte, seulement quand pertinent. Ça garde le contexte de travail de Claude léger.

---

## Les quatre fichiers memory

### `decision-log.md` : décisions architecturales append-only

Pour chaque décision technique non-évidente, on append un bloc (manuellement ou via Claude sur demande) :

```markdown
## 2026-04-15 — Use UTC for all stored timestamps

**Why:** Frontend users span 12+ time zones. Storing local time meant scheduling
bugs whenever a user traveled. UTC at the database level + per-user TZ at the
display layer cleanly separates concerns.

**Considered alternatives:**
- Per-row timezone column — rejected: query complexity.
- Browser-local time — rejected: server-side scheduling needs absolute times.
```

Ce fichier **grandit avec le temps**. Pas d'auto-suppression. Les vieilles décisions restent un contexte précieux.

La rule auto-chargée (`60.memory/01.decision-log.md`) dit à Claude Code de consulter ce fichier avant de répondre à des questions comme « Pourquoi a-t-on structuré X de cette façon ? »

### `failure-patterns.md` : erreurs récurrentes

Quand Claude Code commet une erreur récurrente (ex. « Claude génère du JPA alors que le projet utilise MyBatis »), une entrée va ici :

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
- **Promotion en rule :** les entrées avec `frequency >= 3` remontent comme candidats pour de nouvelles entrées `.claude/rules/` via `memory propose-rules`. (L'importance n'est pas un filtre, elle affecte juste le score de confiance de chaque proposition.)

Les sub-commands `memory` parsent les champs metadata via une regex ancrée (`^[\s*-]+\*{0,2}\s*key\s*\*{0,2}\s*[:=]`), donc les lignes de champ doivent ressembler à l'exemple ci-dessus. Les variations indentées ou italicisées passent.

### `compaction.md` : log de compaction

Ce fichier trace l'historique de compaction :

```markdown
## Last Compaction
- timestamp: 2026-04-26T03:14:00Z
- entries-summarized: 3
- entries-merged: 1
- entries-dropped: 2
- file-trimmed: false
```

Seule la section `## Last Compaction` est écrasée à chaque exécution `memory compact`. Le reste du fichier est préservé.

### `auto-rule-update.md` : file d'attente de rules proposées

Au lancement de `memory propose-rules`, Claude lit `failure-patterns.md` et append ici du contenu de rule proposé :

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

On examine les propositions, on copie celles qu'on veut dans des fichiers rule réels. **La commande propose-rules ne s'applique pas automatiquement** : c'est intentionnel, les rules draftées par LLM nécessitent une review humaine.

---

## Algorithme de compaction

La memory grandit mais ne devient pas obèse. Une compaction en quatre stages se déclenche via :

```bash
npx claudeos-core memory compact
```

| Stage | Trigger | Action |
|---|---|---|
| 1 | `lastSeen > 30 days` ET non préservé | Body collapsé en un « fix » 1-ligne + meta |
| 2 | Headings dupliqués | Fusionnés (frequencies sommées, body = la plus récente) |
| 3 | `importance < 3` ET `lastSeen > 60 days` | Droppé |
| 4 | Fichier > 400 lignes | Trim les entrées non-préservées les plus anciennes |

**Les entrées « préservées »** survivent à tous les stages. Une entrée est préservée si l'une des conditions suivantes tient :

- `importance >= 7`
- `lastSeen < 30 days`
- Le body contient un path actif concret (non-glob) de rule (ex. `.claude/rules/10.backend/orm-rules.md`)

Le check « active rule path » est intéressant : si une entrée memory référence un fichier rule réel actuellement présent, l'entrée s'ancre au cycle de vie de cette rule. Tant que la rule existe, la memory reste.

L'algorithme de compaction mime délibérément les courbes d'oubli humaines : ce qui est fréquent, récent, important reste, ce qui est rare, vieux, peu important s'estompe.

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

**La commande score strip TOUTES les lignes d'importance existantes avant insertion.** Ça évite les régressions duplicate-line lors de réexécutions multiples de score.

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

**La valeur d'evidence est plafonnée à 6 quand l'importance est manquante.** Sans score d'importance, la frequency seule ne doit pas suffire à pousser le sigmoid vers une confiance haute. (Ça plafonne l'input du sigmoid, pas le nombre de propositions.)

---

## Workflow typique

Pour un projet long, le rythme ressemble à :

1. **`init` une fois** pour installer les fichiers memory à côté du reste.

2. **Utiliser Claude Code normalement quelques semaines.** Noter les erreurs récurrentes (ex. Claude utilise systématiquement le mauvais response wrapper). Append des entrées à `failure-patterns.md`, soit manuellement soit en demandant à Claude (la rule `60.memory/02.failure-patterns.md` indique à Claude quand append).

3. **`memory score` périodiquement** pour rafraîchir les valeurs d'importance. Rapide et idempotent.

4. **Quand ~5+ patterns à haut score sont présents**, lancer `memory propose-rules` pour obtenir des rules draftées.

5. **Examiner les propositions** dans `auto-rule-update.md`. Pour chacune retenue, copier le contenu dans un fichier rule permanent sous `.claude/rules/`.

6. **`memory compact` périodiquement** (une fois par mois, ou en CI planifié) pour borner `failure-patterns.md`.

Voilà le rythme pour lequel les quatre fichiers sont conçus. Sauter une étape, c'est ok : le memory layer est opt-in, les fichiers inutilisés ne gênent pas.

---

## Continuité de session

Claude Code auto-charge CLAUDE.md à chaque session. Les fichiers memory ne sont **pas auto-chargés par défaut** : les rules `60.memory/` les chargent à la demande quand leur glob `paths:` matche le fichier que Claude édite.

Conséquence : dans une session Claude Code fraîche, la memory n'apparaît qu'au moment de toucher à un fichier pertinent.

Quand l'auto-compaction de Claude Code se déclenche (vers 85 % du contexte), Claude perd la conscience des fichiers memory même chargés plus tôt. La Section 8 de CLAUDE.md inclut un bloc de prose **Session Resume Protocol** qui rappelle à Claude de :

- Rescanner `failure-patterns.md` pour les entrées pertinentes.
- Relire les entrées les plus récentes de `decision-log.md`.
- Rematcher les rules `60.memory/` contre les fichiers actuellement ouverts.

C'est de la **prose, pas une contrainte stricte** : la prose est structurée pour que Claude tende à la suivre. Le Session Resume Protocol fait partie du scaffold canonique v2.3.2+ et reste préservé sur les 10 langues de sortie.

---

## Quand sauter le memory layer

Le memory layer apporte de la valeur pour :

- **Projets de longue durée** (mois ou plus).
- **Équipes** : `decision-log.md` devient une mémoire institutionnelle partagée et un outil d'onboarding.
- **Projets où Claude Code est invoqué ≥10×/jour** : les failure patterns s'accumulent assez vite pour être utiles.

Overkill pour :

- Scripts one-off jetés dans la semaine.
- Projets spike ou prototype.
- Tutoriels ou démos.

Pass 4 écrit quand même les fichiers memory, mais sans mise à jour, ils ne grandissent pas. Aucune charge de maintenance si l'on ne s'en sert pas.

Pour empêcher activement les rules memory d'auto-charger quoi que ce soit (coût en contexte), deux options :

- Supprimer les rules `60.memory/`. Pass 4 ne les recrée pas en resume, seulement en `--force`.
- Ou rétrécir les globs `paths:` de chaque rule pour qu'ils ne matchent rien.

---

## Voir aussi

- [architecture.md](architecture.md) : Pass 4 dans le contexte du pipeline
- [commands.md](commands.md) : référence `memory compact` / `memory score` / `memory propose-rules`
- [verification.md](verification.md) : checks `[9/9]` memory du content-validator
