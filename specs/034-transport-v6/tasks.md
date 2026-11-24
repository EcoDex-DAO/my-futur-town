# Tâches : Transport V6

## Fondations

- [ ] T001 Protéger les écritures et restaurations du bilan et de la flotte dans `src/features/bus/macro/BusReport.tsx` et `src/features/bus/shared/BusFleetManager.tsx`, avec tests d'erreurs et concurrence.
- [x] T002 Construire les courses datées et leurs diagnostics depuis le GTFS, les horaires et les variantes dans `src/features/bus/shared/`, avec tests des modèles invalides et après-minuit.

## US1 : bilan et comparaison

- [ ] T003 [US1] Calculer les activités comparables sur même période et même périmètre dans `src/features/bus/macro/bus-report.ts`, avec tests parcours et horaires.
- [ ] T004 [US1] Relier modèles, affectations hypothétiques et facteurs aux impacts dans `src/features/bus/macro/BusReport.tsx`, avec tests motorisation, inconnues et couverture.
- [ ] T005 [US1] Présenter comparaison, écarts, période et limites dans `src/features/bus/macro/BusReport.tsx`.
- [ ] T013 [US1] Distinguer dans `src/features/bus/macro/BusReport.tsx` les vues V1 théorique toutes lignes, V2 adaptée toutes lignes et V2 adaptée lignes sélectionnées, y compris lignes créées et horaires attribués.
- [x] T014 [US1] Relier lignes créées et lignes de référence, gérer les deux modes de remplacement et leur persistance dans `src/features/bus/shared/`, puis vérifier leur effet commun sur simulation et bilan.
- [x] T015 [US2] Concevoir et afficher les trois tableaux horaires, séparés par ligne, sens et variante, dans `src/features/bus/shared/WeeklyTimetableEditor.tsx`, sans assimiler calendrier GTFS et jours types.
- [x] T016 [US2] Ajouter la copie d'un tableau vers un autre avec protection des horaires enregistrés dans `src/features/bus/shared/`, puis vérifier la persistance, les exceptions et les jours fériés.
- [ ] T017 [US2] Faire évoluer le stockage dans `src/features/bus/shared/weekly-timetables.ts` pour plusieurs périodes non chevauchantes et des annotations, en conservant les données existantes et en refusant les versions illisibles.
- [ ] T018 [US2] Remplacer l’éditeur par une fenêtre dédiée conforme au prototype validé dans `src/features/bus/shared/WeeklyTimetableEditor.tsx` et `src/main.tsx`, sans perte de données et avec une gestion explicite des variantes et des parcours de retour absents.
- [ ] T019 [US2] Répercuter les périodes et signaler toute annotation non interprétée dans `src/features/bus/shared/scenario-schedule.ts`, les fiches d’arrêt, la simulation et le bilan ; tester dates, copies et cas après minuit.
- [ ] T020 [US2] Vérifier le parcours complet sur ordinateur et mobile, la conservation des anciens horaires et les écritures concurrentes ; documenter la validation dans `specs/034-transport-v6/validation.md`.

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

## Complément : fiches et particularités SIBRA

- [ ] T021 Inventorier toutes les légendes des fiches officielles et leurs périodes pour chaque ligne, puis rapprocher chaque règle des courses et dates GTFS avec preuves et incertitudes.
- [ ] T022 Préserver les calendriers et temps propres à chaque course lors de la création d'un scénario ; permettre les modifications explicites sans effacer les différences entre dates.
- [ ] T023 Modéliser les restrictions et terminus alternatifs vérifiés, les appliquer aux arrêts, à la simulation et au bilan, et signaler les cas non interprétés.
- [ ] T024 Vérifier les règles par ligne, les jours scolaires et fériés, les variantes, la persistance et la comparaison référence/scénario sur ordinateur et mobile.

## Phase 1: Convergence — affinements proposés pour V3

- [ ] T025 Compléter et vérifier l'accès individuel à la provenance, aux unités, dates, périmètres et limites pour chaque valeur du bilan et de la flotte, y compris les saisies modifiées et les sources inconnues, conformément à FR-011 et FR-013 (partial ; proposition V3 à revoir par l'orchestrateur).
- [ ] T026 Vérifier les parcours complets au clavier et avec lecteur d'écran sur ordinateur et mobile, puis corriger les obstacles identifiés, conformément à FR-009 et Constitution IV (partial ; proposition V3 à revoir par l'orchestrateur).
- [ ] T027 Mesurer et améliorer les performances du réseau complet avec scénarios modifiés et données réelles, sur ordinateur et mobile, conformément à FR-010 et Constitution V (partial ; proposition V3 à revoir par l'orchestrateur).
