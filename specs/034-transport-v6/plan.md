# Plan : Transport V6

**Branche** : `EcoDex-DAO/issue-32-transport-v6` · **Date** : 2026-11-22 · [Spécification](spec.md)

## Résumé

Construire une représentation commune des courses de référence et des scénarios, puis l'utiliser pour la simulation, les besoins de flotte et les bilans comparables. Préserver les données locales et présenter les sources et limites de chaque valeur.

## Contexte technique

TypeScript, React 19, Next.js 16 et MapLibre ; données locales JSON et localStorage ; Vitest et Playwright. Les données GTFS sont immuables. Les calculs purs restent indépendants de l'interface et de l'API. Les créations et horaires existants sont conservés. La période réellement couverte détermine les résultats ; aucune représentativité annuelle n'est présumée.

## Constitution

- Carte autonome : conserver le fonctionnement sans API et signaler les données manquantes.
- Propriété : référence et scénario séparés, validation avant écriture, protection contre la concurrence.
- Sources et licences : attribution, millésime et périmètre visibles ; pas de nouvelle redistribution implicite.
- Accessibilité : boutons nommés et légende textuelle ; contrôles clavier et affichage mobile.
- Vérification : tests des calculs, erreurs et intégration ; build et vérifications visuelles.

Ces contraintes restent applicables après conception ; aucune dérogation identifiée.

## Structure

- `src/features/bus/shared/` : horaires, flotte et moteur de courses partagé.
- `src/features/bus/micro/` : simulation.
- `src/features/bus/macro/` : bilan, comparaison et provenance.
- `src/features/bus/creator/` : lignes et variantes existantes.
- `specs/034-transport-v6/` : recherche, modèle, contrat, tâches et validation.

## Séquence

1. Protéger les données locales et inventorier les sources.
2. Résoudre les courses par date, sans modifier la référence, et signaler les éléments invalides.
3. Brancher simulation et estimation agrégée, puis calculer référence et scénario sur même périmètre.
4. Relier les modèles de flotte, exposer provenance et limites, et valider de bout en bout.
