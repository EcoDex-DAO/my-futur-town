# Recherche et décisions

## Données existantes

Le calendrier `public/data/sibra-schedule.json` couvre le 4 novembre au 20 décembre 2026. Les horaires sont planifiés. Les éditions disponibles et la licence sont décrites par [transport.data.gouv.fr](https://transport.data.gouv.fr/datasets/offre-de-transports-sibra-a-annecy-gtfs/). Les horaires citoyens sont des entrées datées en stockage local et peuvent devenir invalides si leur modèle change.

Décision : calculer sur la période commune explicitement choisie ; ne pas prétendre qu'une extrapolation de cette période est représentative d'une année. Une course non résolue rend la couverture partielle.

## Rapports originaux

Le [rapport 2024](https://www.annecy.fr/api/fileadmin/mediatheque_annecy/Deliberations/2025/20251215/D_CN_2025_390.pdf), page imprimée 65, présente 36 articulés, 54 standards et 6 standards électriques sur une ligne distincte. Le tableau ne démontre pas explicitement le recouvrement : 48 standards gazole est une hypothèse du propriétaire, pas un fait confirmé. Page 67, les moyennes sont 38,4 et 55,5 L/100 km ; la valeur électrique 1,07 kWh/km est estimée, la supervision étant indisponible. Page 51, les 7 808 793 km d'offre Grand Annecy comprennent notamment services urbains, scolaires et à la demande ; les sous-traitants y sont inclus.

Le [rapport 2025](https://www.grandannecy.fr/fileadmin/mediatheque/Documents_reglementaires/Conseil/2026/09_17/DEL-2026-177__SIBRA_Rapport_de_gestion_2025.pdf) distingue 7 451 192 km d'offre SIBRA et 397 602 km J’ybus. Ces périmètres annuels ne sont pas automatiquement comparables aux horaires GTFS 2026.

## Flotte et facteurs

L'inventaire distingue réseau, catégorie et année, mais les affectations réelles ne sont pas connues. Les affectations et durées de retournement sont des hypothèses modifiables ; ne pas déduire une disponibilité en temps réel. Ne pas additionner des réseaux ou années différents.

Les facteurs du bilan sont historiques. Les facteurs [ADEME HBEFA](https://data.ademe.fr/applications/etude-facteurs-d%27emissions-des-differents-modes-de-transport-routier-liste-et-fiches) sont des moyennes françaises par année et catégorie, pas des mesures SIBRA. Utiliser une source comparable avec justification et traçabilité ; sinon conserver une inconnue. PM2,5 est incluse dans PM10. Les valeurs modifiées doivent garder leur propre provenance.

## Persistance

Les horaires refusent les écritures concurrentes. Le bilan écrase actuellement un JSON illisible et la flotte ne vérifie pas les modifications d'un autre onglet. Bloquer les écritures à la lecture invalide et comparer la version lue avant toute écriture ou restauration.

## Jours types

La fiche photographiée est décrite dans la spécification V4 : grille par heure, minutes, sens et catégories de jours. Le propriétaire demande trois tableaux : semaine, samedi et dimanche/jours fériés, copiables entre eux et applicables à toutes les dates correspondantes, en préservant les exceptions par date. Un parcours avec un horaire particulier à une date conserve ses horaires particuliers ce jour-là. Les jours fériés métropolitains 2026 proviennent de [calendrier.api.gouv.fr](https://calendrier.api.gouv.fr/jours-feries/metropole/2026.json), consulté le 23 novembre 2026. Les autres années ne sont pas déduites. La copie transfère les départs ; les durées du parcours destinataire restent à vérifier.
