# Validation en cours

## Vérifications réalisées

- Tests unitaires : horaires de scénario datés, copie et remplacement, passage après minuit, modèle invalidé, ligne créée, activités sur même période, motorisation et besoins simultanés.
- Tests navigateur sur ordinateur (1440 px) et mobile (390 px), avec routes API interrompues : choix des trois vues, écart initial nul, affectations et réouverture après sauvegarde. Le test sur ordinateur vérifie aussi le refus d'une écriture concurrente.
- Test navigateur dédié : une ligne créée avec départ enregistré apparaît dans la simulation du scénario et le bilan V2.
- Aperçu mobile à 390 px : hiérarchie, écart initial et états inconnus inspectés. L'aperçu n'est pas une validation exhaustive de l'accessibilité.

## Limites et travaux restants

- Les paramètres V1 et facteurs V2 disposent d'une rubrique d'information et de saisie de provenance. Vérifier encore chaque résultat et chaque source ; la légende ne prouve pas la fiabilité d'une source.
- Étendre les essais aux conflits entre onglets de l'interface, aux horaires supprimés ou invalidés, aux modèles incompatibles, aux calendriers incomplets et aux variations de parcours dans le navigateur.
- Vérifier les interactions clavier et lecteurs d'écran, les captures ordinateur/mobile, les performances et tous les cas sans API.
- Le besoin simultané est une borne indicative : ni enchaînements géographiques, ni temps de dépôt, ni affectation de véhicules individuels ne sont calculés. Les hypothèses de disponibilité doivent rester visibles.
- Les horaires GTFS couvrent uniquement la période indiquée. Le V1 extrapole uniformément ; le V2 conserve la période observée. Aucun résultat n'est une mesure d'exploitation réelle.
- Les facteurs transférés ont des millésimes et périmètres différents ; leur actualité et leur incertitude restent à vérifier. Les motorisations sans facteur comparable restent inconnues.
- Le projet ne doit pas être considéré terminé ou intégré tant que ces vérifications et la revue ne sont pas achevées.
