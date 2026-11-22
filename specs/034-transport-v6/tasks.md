# Tâches : Transport V6

## Fondations

- [ ] T001 Protéger les écritures et restaurations du bilan et de la flotte dans `src/features/bus/macro/BusReport.tsx` et `src/features/bus/shared/BusFleetManager.tsx`, avec tests d'erreurs et concurrence.
- [ ] T002 Construire les courses datées et leurs diagnostics depuis le GTFS, les horaires et les variantes dans `src/features/bus/shared/`, avec tests des modèles invalides et après-minuit.

## US1 : bilan et comparaison

- [ ] T003 [US1] Calculer les activités comparables sur même période et même périmètre dans `src/features/bus/macro/bus-report.ts`, avec tests parcours et horaires.
- [ ] T004 [US1] Relier modèles, affectations hypothétiques et facteurs aux impacts dans `src/features/bus/macro/BusReport.tsx`, avec tests motorisation, inconnues et couverture.
- [ ] T005 [US1] Présenter comparaison, écarts, période et limites dans `src/features/bus/macro/BusReport.tsx`.

## US2 : simulation

- [ ] T006 [US2] Relier les courses résolues et les lignes créées à `src/features/bus/micro/BusSimulation.tsx`, avec tests d'intégration et absence de service.

## US3 : disponibilité

- [ ] T007 [US3] Estimer les besoins agrégés et la compatibilité par périmètre dans `src/features/bus/shared/`, avec tests de chevauchement et inconnues.
- [ ] T008 [US3] Afficher hypothèses et résultats de disponibilité dans `src/features/bus/shared/BusFleetManager.tsx`.

## US4 : provenance et protection

- [ ] T009 [US4] Créer les métadonnées d'origine et de vérification, éditables et préservées, dans `src/features/bus/`.
- [ ] T010 [US4] Ajouter informations accessibles et légende texte/couleur à chaque valeur dans `src/features/bus/macro/BusReport.tsx` et `src/features/bus/shared/BusFleetManager.tsx`.

## Validation

- [ ] T011 Vérifier tests, build, parcours ordinateur/mobile, API absente et captures ; consigner les limites dans `specs/034-transport-v6/validation.md`.
- [ ] T012 Actualiser la documentation et ouvrir une PR liée à #32, #50 et #52 sans clôture automatique dans `specs/034-transport-v6/validation.md`.
