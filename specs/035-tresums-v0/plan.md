# Plan : Trésums V0

Conserver la carte MapLibre et les scénarios existants. Ajouter un panneau de travail isolé, une couche cadastrale GeoJSON issue du millésime officiel identifié, et des couches d'hypothèses modifiables. Utiliser une clé de stockage distincte et valider les données avant écriture. Documenter le découpage spatial et les licences. Vérifier les interactions, les erreurs, le build et les tests existants, puis parcourir l'interface aux deux tailles.

## Contexte technique

Next.js 16, React 19, TypeScript et MapLibre. Les données sont conservées dans le stockage local du navigateur, indépendamment des scénarios multimodaux. Le cadastre est un extrait statique versionné ; le fond reste fourni par le style cartographique existant. Aucun accès serveur ni migration ne sont nécessaires.

## Constitution et décisions

Le cadastre est distinct des hypothèses ; ses sources et licences sont documentées. Les erreurs de lecture et d'écriture bloquent les opérations susceptibles d'écraser le document. Les dessins sont de simples points, lignes ou polygones ; le sens suit l'ordre des points. Les DXF restent hors dépôt : leur origine géographique ne peut pas être déduite de leurs seules coordonnées locales. Le fonctionnement dépend de WebGL et du fond externe, comme la carte existante.

## Vérification

Vitest vérifie lecture, validation et géométries. Playwright vérifie sélection, dessin, modification, persistance, suppression, formats bureau et mobile, échec de source et refus de stockage. Les tests existants et le build vérifient l'intégration. Examiner les captures aux deux formats.
