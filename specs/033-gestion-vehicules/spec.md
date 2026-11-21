# Transport V5 — inventaire agrégé de bus

**Issue** : [#30](https://github.com/EcoDex-DAO/my-futur-town/issues/30)  
**État** : MVP inventaire ; bilans et disponibilité horaire ultérieurs

## Objectif

Décrire un parc de bus par modèles simplifiés afin de préparer des bilans plus précis et d'étudier ensuite la possibilité d'ajouter des rotations selon l'heure et la charge du réseau. Les modèles regroupent des véhicules comparables ; aucun suivi individuel n'est prévu.

## Sources et inventaire de départ

La référence est l'état officiel du parc moyen 2024, rapport Grand Annecy, section 5.1, page 64. Le rapport de gestion SIBRA 2025 n'apporte pas d'effectifs détaillés.

- Standard gazole : 48, déduit de 54 standards moins 6 électriques. La classification gazole vient de l'indication du propriétaire, sans confirmation par le tableau source.
- Standard électrique : 6, inclus dans les 54 standards.
- Articulés : 36, motorisation inconnue.
- Minibus : 2 exploités SIBRA et 2 sous-traités.
- Midibus : 8 sous-traités.
- Midicars : 2 sous-traités.

Les périmètres SIBRA et sous-traitants sont identifiés sur chaque fiche ; leur total affiché ne démontre pas une disponibilité commune. Les données 2024 ne sont pas le parc actuel.

## Modèle simplifié et interface

Chaque modèle porte un identifiant stable, nom, gabarit, énergie ou motorisation, effectif et nombre indisponible quand connus, places assises, capacité totale, usages, consommation avec unité, source, millésime, périmètre et notes. Les modèles électriques ajoutent autonomie et temps de recharge avec unité. Les modèles à carburant ajoutent capacité du réservoir.

Le bouton de Réseau de bus ouvre une fenêtre indépendante, avec icônes et fiches hiérarchisées gabarit puis motorisation. L'utilisateur peut modifier les fiches, ajouter un modèle, enregistrer et restaurer la référence. Les saisies locales sont conservées séparément de la référence. Une valeur absente reste inconnue ; zéro est une valeur connue. Les totaux sont qualifiés de partiels si des effectifs sont inconnus. Aucun chiffre ni caractéristique non sourcé n'est inventé.

Validation : entiers finis supérieurs ou égaux à zéro ; indisponibles ≤ effectif ; places assises ≤ capacité totale. Les champs énergétiques sont adaptés à la motorisation.

## Hors périmètre MVP

Affectation individuelle, positions et suivi temps réel. Calcul du besoin de véhicules, rotations, pauses, trajets dépôt et comparaison horaire restent une évolution ultérieure. L'occupation voyageurs exige des données de charge distinctes. Les horaires locaux V4 ne pilotent pas encore la simulation ; leur intégration relève de #50.

## Données J’ybus issues du rapport fourni

Le [rapport de gestion SIBRA 2023, sections 5.1–5.2, page 16](https://www.annecy.fr/api/fileadmin/mediatheque_annecy/Deliberations/2025/20250324/D_CN_2025_85.pdf) décrit le parc du réseau J’ybus de Rumilly : cinq minibus Dietrich reçus en 2019 (table identifiant les modèles City 29 sur les lignes 1, 2, 3, J4, J5), norme Euro 6 et consommation moyenne de 14 L/100 km ; trois Crossway mis à disposition par des transporteurs sur J4/J5 ; et un véhicule sous-traité de 7 ou 8 places pour la ligne 3. Ces modèles sont ajoutés dans un périmètre J’ybus distinct de celui du Grand Annecy. Le rapport ne fournit pas motorisation ou consommation des Crossway, ni d’autres capacités pour les bus.

### Complément Grand Annecy extrait du même rapport

Le rapport fourni comporte également le rapport d’activité SIBRA du Grand Annecy. À la page 76, l’état moyen 2023 donne 36 articulés, 54,4 standards dont 1,5 électrique, 2 minibus navettes SIBRA, 2 minibus et 8 midibus sous-traités. À la page 77, l’âge moyen est de 6,2 ans pour les articulés, 6,4 pour les standards, 12,5 pour les minibus SIBRA, 6,5 pour les minibus sous-traités et 4,4 pour les midibus sous-traités. À la page 78, la consommation moyenne 2023 est de 39 L/100 km pour les standards et 56,1 L/100 km pour les articulés ; l’AdBlue moyen est respectivement 1,50 et 2,72 L/100 km. Ces mesures sont des moyennes par catégorie, pas des caractéristiques certifiées de chaque énergie ou véhicule individuel.
