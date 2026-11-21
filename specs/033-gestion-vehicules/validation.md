
# Validation corrective — périmètres de flotte

- Synthèses désormais séparées entre Grand Annecy et J’ybus/Rumilly, ainsi qu’entre parc SIBRA et véhicules sous-traités.
- Un modèle à effectif inconnu marque son sous-total comme partiel.
- Disponibles affichés seulement lorsque effectif et indisponibles sont tous deux connus.
- Invariants testés : indisponibles ≤ effectif ; places assises ≤ capacité ; zéro reste une valeur connue.
- `corepack pnpm test` : 131 tests passent.
- `corepack pnpm run build` : compilation et TypeScript passent ; BUILD_ID produit.
- `git diff --check` : propre.
