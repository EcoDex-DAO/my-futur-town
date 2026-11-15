# Feuille de route — Pôle multimodal des Trésums

Objectif : comparer la situation actuelle aux scénarios d'aménagement du parking Trésum / Providence, des bus, de la voirie et des ombrières solaires. Les résultats sont des estimations sourcées et modifiables, pas des prévisions validées.

## 1. Données et référence

- [ ] Délimiter l'emprise, les accès et la capacité actuelle du parking ; vérifier les contraintes du site.
- [ ] Importer routes, bâtiments et parcelles avec provenance, date et licence ; signaler les valeurs manquantes.
- [ ] Examiner les [comptages routiers](https://www.data.gouv.fr/datasets/trafic-routier-en-haute-savoie), les [parkings d'Annecy](https://www.data.gouv.fr/datasets/frequentation-quotidienne-des-parkings-couverts-payants-ville-dannecy) et vérifier leur couverture des Trésums.
- [ ] Exploiter les [horaires SIBRA et archives](https://transport.data.gouv.fr/datasets/offre-de-transports-sibra-a-annecy-gtfs/), les [flux INSEE](https://www.insee.fr/fr/statistiques/8582949) et l'[enquête locale](https://www.grandannecy.fr/fileadmin/mediatheque/Documents_reglementaires/Conseil/2024/04_25/DEL-2024-64_ZFE-M__Projet_arrete_et_lancement_consultation_reglementaire.pdf).
- [ ] Rechercher des études de pôles comparables ; documenter leurs différences et la transférabilité des hypothèses.
- [ ] Produire une carte de référence et un tableau des données connues, inconnues et estimées.

## 2. Scénarios

- [ ] Créer, nommer, dupliquer, enregistrer et rouvrir un scénario sans modifier les références.
- [ ] Préparer trois références : situation actuelle, pôle multimodal sans hausse majeure des places, parking à étages avec pôle multimodal.
- [ ] Associer hypothèses modifiables, sources et dates à chaque scénario ; conserver les données inconnues comme telles.

## 3. Parking et photovoltaïque

- [ ] Sélectionner l'emprise et paramétrer niveaux, hauteur, rampes, équipements et stationnement automobile et cyclable.
- [ ] Estimer la capacité et afficher un volume 3D simple à l'échelle de la ville, détaillé au zoom.
- [ ] Paramétrer les ombrières et estimer leur production avec [PVGIS](https://photovoltaic-geographic-information-system.ec.europa.eu/en/about-pvgis-6).
- [ ] Distinguer production et consommation sur place ; signaler ombres proches et faisabilité à vérifier.

## 4. Flux et besoins de bus

- [x] Intégrer le premier calcul isolé de demande horaire, départs supplémentaires et véhicules nécessaires ([PR 18](https://github.com/EcoDex-DAO/my-futur-town/pull/18), publiée sur `main` au commit `2e0639c`). Les hypothèses et limites sont décrites dans [calcul-multimodal-bus.md](calcul-multimodal-bus.md).
- [x] Raccorder le calcul à l'interface et aux scénarios ; afficher toutes les hypothèses et leurs sources. Les scénarios bus sont conservés localement dans le navigateur ; ils ne sont pas encore reliés aux scénarios de voirie.
- [ ] Estimer les arrivées horaires : occupation, rotation, personnes par voiture et destinations.
- [ ] Répartir les voyageurs entre bus, vélo et marche ; distinguer report modal et déplacements induits.
- [ ] Relier une ligne existante ou créée et calculer l'offre par heure et sens à partir du GTFS.
- [ ] Comparer charge et capacité disponibles sur le tronçon critique ; distinguer départs et véhicules nécessaires.
- [ ] Présenter des scénarios bas, central et haut pour les hypothèses incertaines.

## 5. Voirie

- [ ] Sélectionner les tronçons et modifier nombre, largeur et affectation des voies voiture, bus, vélo et piéton.
- [ ] Afficher les changements et signaler les largeurs inconnues ou insuffisantes.
- [ ] Sauvegarder les modifications par scénario ; création et déplacement de routes hors V1.

## 6. Comparaison et validation

- [ ] Comparer capacité, solaire, flux, voyageurs, départs, véhicules, énergie et émissions sur les mêmes périodes et périmètres.
- [ ] Afficher sources, hypothèses, lacunes et fourchettes, sans présenter des estimations comme des comptages.
- [ ] Tester calculs, valeurs extrêmes, horaires incomplets et absence de données.
- [ ] Vérifier persistance après redémarrage, intégrité des références et licences.
- [ ] Vérifier rendu et performances des vues ville/site sur ordinateur et mobile.

## Principes

Les données locales priment sur les hypothèses transférées d'autres projets. La fréquentation des bus et du parking n'est pas connue tant qu'elle n'est pas mesurée. Un futur assistant IA pourra aider à formuler et expliquer les scénarios ; les calculs resteront vérifiables et modifiables.
