# Flux de contribution

## Du besoin à la livraison

1. Créer une issue décrivant le besoin, les critères d’acceptation et les dépendances.
   Découper les sujets importants en issues livrables ; les issues suivent les priorités.
2. Partir de `main` sur une branche descriptive, par exemple `feat/12-creer-scenario`.
3. Pour une fonctionnalité complexe, utiliser `$speckit-specify`, puis
   `$speckit-clarify`, `$speckit-plan`, `$speckit-tasks` et `$speckit-analyze`.
   Relire la spécification et le plan avant de poursuivre. Utiliser ensuite
   `$speckit-implement` ; `$speckit-converge` peut identifier les tâches restantes.
   Un correctif simple peut passer directement de l’issue au code et à la revue.
4. Vérifier le changement avec `pnpm test` et `pnpm run build`, ainsi qu’avec les
   contrôles adaptés dans `AGENTS.md`. Documenter les contrôles impossibles et les limites.
5. Ouvrir une pull request décrivant le résultat et les vérifications. Utiliser
   `Closes #numéro` uniquement si elle résout entièrement l’issue et cible la branche
   par défaut. Ajouter des captures pour les changements visuels.
6. Relire le code, les résultats de CI, les impacts de sécurité et de données ; fusionner
   lorsque les vérifications et la revue nécessaires sont satisfaites.

## Répartition des informations

- L’issue conserve le besoin, les critères d’acceptation, les priorités et les discussions.
- Les documents Spec Kit conservent le détail de la spécification, du plan et des tâches.
- La pull request décrit le résultat livré, les contrôles, les limites et les captures.
- La constitution précise les principes ; `AGENTS.md` détaille les commandes et conventions.

Les migrations sont validées localement et soumises à une revue autorisée avant toute
application distante. Les données de référence et les scénarios restent séparés.
