# Bilan transport : points à poursuivre après la V2

État consigné le 24 novembre 2026. Le propriétaire valide le bilan actuel dans son état, avec les limites ci-dessous. Cette validation ne transforme pas les estimations en mesures et ne vaut pas validation technique exhaustive ni autorisation de fusion.

## Exigence commune à toutes les versions

- Permettre, pour chaque bilan V1, V2 et version ultérieure, une projection de flotte **100 % électrique** et une projection **100 % biogaz**, sur le même périmètre et la même période que la référence. Garder accessibles les hypothèses, sources, unités, années et incertitudes ; ne pas écraser la flotte ou les affectations de l'utilisateur. Vérifier la compatibilité des modèles et signaler les données manquantes.
- État actuel : le V1 propose des motorisations uniformes électrique et biométhane, avec des facteurs et consommations modifiables. Le V2 présente les deux projections uniformes du scénario, avec des consommations standard hypothétiques ; elles ne changent pas les affectations. Les GES gaz sont inconnus tant qu'un facteur adapté n'est pas renseigné. Cette exigence s'applique aussi à toutes les futures versions. Distinguer biogaz, biométhane et gaz naturel selon la source et le facteur.

## Données et horaires

- Récupérer les nouvelles éditions GTFS au fur et à mesure, en préservant les éditions et les données utilisateur. Utiliser les horaires publiés sur leur période exacte et remplacer progressivement les jours estimés par des données datées.
- Améliorer la projection annuelle : aujourd'hui les jours hors GTFS reprennent le service le plus fréquent du même jour de semaine ; les fériés projetés utilisent le dimanche et les mêmes horaires sont répétés en été. Décrire et tester les périodes scolaires, vacances, saisons, exceptions et changements d'année ; ne pas présenter ces projections comme des horaires publiés ou des mesures.
- Étendre les calendriers de jours fériés au-delà de 2026–2027 et aux autres territoires ; documenter leurs sources et garder explicites les années ou régions non couvertes.
- Si un jour type manque, remplacer le repli actuel par un traitement étudié et clairement signalé, sans masquer l'absence de données. Vérifier la continuité des dates et les cas après minuit.

## Parcours et exceptions

- Vérifier et permettre de choisir le trajet complet de référence pour chaque ligne et sens. Aujourd'hui, le plus long trajet actif est une approximation : un détour ou une branche inhabituelle peut être plus long que le parcours de référence.
- Inventorier les légendes, codes, périodes et renvois de toutes les fiches officielles ; rapprocher chaque exception vérifiée des courses et dates concernées, en gardant sa preuve. Traiter notamment les terminus partiels, détours, services scolaires et conditions de circulation ; signaler les cas non interprétés ou sans correspondance fiable.
- Résoudre les écarts documentés entre fiches et GTFS des lignes 15 et 21, sans choisir une source arbitrairement. Vérifier les projections d'arrêts sur les bonnes branches et les restrictions de montée/descente dans le navigateur.
- Vérifier les effets de chaque changement de ligne, sens, itinéraire, horaire ou exception sur les distances, l'énergie et les émissions ; conserver le parcours complet par défaut lorsque l'exception n'est pas connue.

## Flotte, énergie et environnement

- Enrichir et vérifier les caractéristiques des véhicules et leurs affectations par ligne/variante : motorisation, gabarit, consommation, disponibilité, année, réseau et source. Une affectation hypothétique ne devient pas une affectation réelle.
- Actualiser et recouper les facteurs de consommation, de gaz à effet de serre et de polluants ; préciser les unités, périmètres, millésimes, incertitudes et lacunes. Ne pas utiliser un facteur gaz naturel comme facteur biogaz sans justification ; distinguer les filières et les pertes.
- Mieux représenter les kilomètres à vide, dépôts, trajets de service, annulations et perturbations si des données fiables deviennent disponibles. Préciser les postes exclus, dont les impacts non calculés de fabrication et d'AdBlue.
- Approfondir la faisabilité d'une flotte électrique ou biogaz : autonomie, recharge ou ravitaillement, temps de retournement, relief, météo, effectifs disponibles et enchaînement réel des courses. Le pic simultané actuel est indicatif, limité aux jours GTFS publiés ; il ne constitue pas un planning de véhicules.

## Comparabilité, persistance et validation

- Comparer référence et scénario sur les mêmes dates, lignes, kilomètres et hypothèses ; distinguer modifications ponctuelles, saisons et projections, y compris lignes créées et lignes sélectionnées. Expliquer tout résultat partiel et ne pas afficher les données inconnues comme zéro.
- Vérifier les écritures concurrentes, erreurs de stockage, migrations, restauration des anciennes données et conservation des réglages utilisateur, notamment les affectations et horaires.
- Compléter les essais de bout en bout sur ordinateur et mobile : sens et variantes réels, plusieurs périodes, exceptions, modèles incompatibles, horaires absents, données incomplètes et fonctionnement sans API. Vérifier clavier, lecteur d'écran, lisibilité et performances avec un réseau complet et des scénarios modifiés.
- Une mesure Chromium headless avec une course GTFS modifiée a donné environ 16,7 secondes jusqu'à l'affichage du V2 sur la machine de test ; mesurer de nouveau sur les appareils cibles et réduire cette attente.
- Conserver les sources officielles, leurs dates de consultation, licences et unités. Séparer les observations, données planifiées et hypothèses ; signaler l'incertitude et les périmètres incomparables.
- Le V1 donne désormais un accès direct aux sources initiales documentées de ses hypothèses. Les valeurs modifiées ou issues d'anciennes sauvegardes sans historique ne reprennent pas automatiquement cette provenance ; étendre la même vérification à chaque valeur du V2 et de la flotte.

Les tâches détaillées et les contrôles déjà réalisés figurent dans `specs/034-transport-v6/tasks.md`, `specs/034-transport-v6/validation.md` et `docs/specificites-sibra.md`.
