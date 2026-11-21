
# Validation corrective — périmètres de flotte

- Synthèses désormais séparées entre Grand Annecy et J’ybus/Rumilly, ainsi qu’entre parc SIBRA et véhicules sous-traités.
- Un modèle à effectif inconnu marque son sous-total comme partiel.
- Disponibles affichés seulement lorsque effectif et indisponibles sont tous deux connus.
- Invariants testés : indisponibles ≤ effectif ; places assises ≤ capacité ; zéro reste une valeur connue.
- `corepack pnpm test` : 131 tests passent.
- `corepack pnpm run build` : compilation et TypeScript passent ; BUILD_ID produit.
- `git diff --check` : propre.

## Correction de classification des périmètres

- Catégorie structurée explicite : SIBRA, sous-traitant ou inconnue ; aucune catégorie déduite du texte libre.
- Synthèses séparées par réseau, catégorie et année d’effectif. Les périodes incompatibles ne sont pas additionnées.
- Migration des fiches existantes : seuls les identifiants de référence connus reçoivent une catégorie ; tout modèle utilisateur non reconnu reste « Inconnu ».
- Tests ciblés incluent Crossway sous-traité J’ybus, catégorie inconnue, effectifs incomplets, années distinctes et contraintes d’effectifs/capacité.
- `corepack pnpm test` : 133 tests passent.
- `corepack pnpm run build` : compilation et vérification TypeScript réussies.
