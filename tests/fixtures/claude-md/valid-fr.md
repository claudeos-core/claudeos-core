# CLAUDE.md — sample-project

> Échantillon CLAUDE.md valide en français pour les tests du validator.

## 1. Role Definition (Définition du Rôle)

En tant que développeur senior de ce dépôt, vous êtes responsable de l'écriture, de la modification et de la révision du code. Les réponses doivent être rédigées en français.
Serveur API REST Node.js Express sur un stockage relationnel PostgreSQL.

## 2. Project Overview (Aperçu du Projet)

| Élément | Valeur |
|---|---|
| Langage | TypeScript 5.4 |
| Framework | Express 4.19 |
| Outil de build | tsc |
| Gestionnaire de paquets | npm |
| Port du serveur | 3000 |
| Base de données | PostgreSQL 15 |
| ORM | Prisma 5 |
| Exécuteur de tests | Vitest |

## 3. Build & Run Commands (Commandes de Build et Exécution)

```bash
npm install
npm run dev
npm run build
npm test
```

Considérez les scripts de `package.json` comme la seule source de vérité.

## 4. Core Architecture (Architecture Centrale)

### Structure Globale

```
Client → Express Router → Service → Prisma → PostgreSQL
```

### Flux de Données

1. La requête arrive au routeur.
2. Le middleware valide l'authentification.
3. Le service exécute la logique métier.
4. Prisma lit/écrit la BD.
5. La réponse est sérialisée.

### Modèles Centraux

- **En couches**: router → service → repository.
- **Validation DTO**: schémas zod à la frontière du routeur.
- **Middleware d'erreur**: gestion centralisée des erreurs.

## 5. Directory Structure (Structure des Répertoires)

```
sample-project/
├─ src/
└─ tests/
```

**Auto-générés**: aucun.
**Périmètre des tests**: `tests/` reflète `src/`.
**Sortie de build**: `dist/`.

## 6. Standard / Rules / Skills Reference (Référence Standard / Rules / Skills)

### Standard (Source Unique de Vérité)

| Chemin | Description |
|---|---|
| `claudeos-core/standard/00.core/01.project-overview.md` | Aperçu du projet |
| `claudeos-core/standard/00.core/04.doc-writing-guide.md` | Guide de rédaction de documents |

### Rules (Garde-fous Auto-chargés)

| Chemin | Description |
|---|---|
| `.claude/rules/00.core/*` | Règles centrales |
| `.claude/rules/60.memory/*` | Garde-fous de mémoire L4 |

### Skills (Procédures Automatisées)

- `claudeos-core/skills/00.shared/MANIFEST.md`

## 7. DO NOT Read (NE PAS Lire)

| Chemin | Raison |
|---|---|
| `claudeos-core/guide/` | Documentation destinée aux humains |
| `dist/` | Sortie de build |
| `node_modules/` | Dépendances |

## 8. Common Rules & Memory (L4) (Règles Communes et Mémoire (L4))

### Règles Communes (auto-chargées à chaque édition)

| Fichier de Règle | Rôle | Application Centrale |
|---|---|---|
| `.claude/rules/00.core/51.doc-writing-rules.md` | Règles de rédaction de documents | paths requis, pas de hardcoding |
| `.claude/rules/00.core/52.ai-work-rules.md` | Règles de travail IA | basé sur les faits, Read avant édition |

Pour des conseils détaillés, lisez `claudeos-core/standard/00.core/04.doc-writing-guide.md`.

### Mémoire L4 (référence à la demande)

Le contexte à long terme (décisions · échecs · compactage · auto-propositions) est stocké dans `claudeos-core/memory/`.
Contrairement aux règles auto-chargées via le glob `paths`, cette couche est référencée **à la demande**.

#### Fichiers de Mémoire L4

| Fichier | Objectif | Comportement |
|---|---|---|
| `claudeos-core/memory/decision-log.md` | Raison des décisions de conception | Ajout uniquement. Parcourir au début de session. |
| `claudeos-core/memory/failure-patterns.md` | Erreurs répétées | Rechercher au début de session. |
| `claudeos-core/memory/compaction.md` | Politique de compactage à 4 étapes | Modifier uniquement au changement de politique. |
| `claudeos-core/memory/auto-rule-update.md` | Propositions de changement de règles | Réviser et accepter. |

#### Flux de Travail de Mémoire

1. Scanner failure-patterns au début de session.
2. Parcourir les décisions récentes.
3. Enregistrer les nouvelles décisions en ajout.
4. Enregistrer les erreurs répétées avec pattern-id.
5. Exécuter compact lorsque les fichiers approchent 400 lignes.
6. Réviser les propositions de rule-update.
