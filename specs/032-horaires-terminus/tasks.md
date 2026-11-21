# Tâches — horaires aux terminus

## Préparation
- [x] T001 Examiner les issues #38, #29, #30 et #15, le GTFS, la V3 et la photographie du propriétaire dans `specs/032-horaires-terminus/spec.md`.
- [x] T002 Définir les règles et les limites dans `specs/032-horaires-terminus/spec.md` et `specs/032-horaires-terminus/plan.md`.

## P1 — Course existante
- [ ] T003 [US1] Tester et implémenter la sélection par jour, sens et variante et le décalage des passages dans `src/features/bus/shared/`.
- [ ] T004 [US1] Ajouter la modification et la comparaison à la référence dans l'interface bus.

## P2 — Ligne créée
- [ ] T005 [US2] Tester et implémenter les durées explicites, leur propagation et la détection des parcours modifiés dans `src/features/bus/creator/`.
- [ ] T006 [US2] Ajouter la saisie des départs et des durées par variante dans l'interface bus.

## P3 — Conservation et vérification
- [ ] T007 [US3] Ajouter un stockage distinct et protégé, avec tests de reprise, erreurs et concurrence dans `src/features/bus/`.
- [ ] T008 [US3] Vérifier absence de service, après-minuit, conflits et saisies invalides avec les tests unitaires et navigateur.
- [ ] T009 Vérifier bureau et mobile, build, conservation du GTFS et documenter les résultats dans `specs/032-horaires-terminus/validation.md`.
