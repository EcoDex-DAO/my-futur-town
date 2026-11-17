# Référence locale — Trésums / Providence

État documentaire préparé le 15 novembre 2026 pour le projet de comparaison multimodale.
Il décrit les sources disponibles et leurs limites ; il ne remplace ni un relevé de terrain,
ni le cadastre, ni une étude de faisabilité. Les valeurs ci-dessous ne sont pas des données
initiales imposées aux scénarios. La fréquentation des bus et du parking reste inconnue en
l'absence de mesures adaptées au site.

## Identification et périmètre

Le secteur étudié est situé à Annecy, autour de l'avenue de Trésum, de la rue de la
Providence et de la rue des Marquisats. La Ville emploie le nom « Balleydier/Trésum » dans
un [arrêté de 2025](https://www.annecy.fr/fileadmin/mediatheque_annecy/Actes_administratifs/Decisions_Maire/2025/2025_mai/CN_2025_1241.pdf).
Un [arrêté de 2024](https://www.annecy.fr/fileadmin/mediatheque_annecy/Actes_administratifs/Arretes-municipaux/2024/2024_septembre/CN_2024_2222.pdf)
mentionne une partie basse côté Marquisats et une partie supérieure le long de l'avenue de
Trésum. Ces documents ne suffisent pas à fixer une limite juridique du parking ou à identifier
tous les accès utilisables aujourd'hui.

L'objet [OpenStreetMap `way/40906387`](https://www.openstreetmap.org/way/40906387) est un
repère géographique contributif pour le « Parking des Trésums ». Sa version 12 est datée du
2 juillet 2026. Sa géométrie n'est ni une limite cadastrale ni une emprise vérifiée pour un
projet d'aménagement. La source est la base OSM, sous ODbL 1.0 : © les contributeurs
d'OpenStreetMap. La [carte de repérage et sa méthode](../data/reference/tresums/README.md)
conservent une géométrie figée et les limites de son interprétation.

| Sujet | État des connaissances | Qualification et action |
| --- | --- | --- |
| Emprise et parcelles | Objet OSM disponible ; limites foncières et périmètres d'exploitation non établis. | Vérifier géométrie, parcelles, propriété et droits auprès des sources cadastrales et de la Ville. |
| Accès et circulation | Voiries bordant le secteur documentées ; entrées, sorties, sens et conditions d'accès exacts inconnus. | Vérifier sur place et avec les documents d'exploitation ; distinguer voiture, marche, vélo et bus. |
| Capacité | L'objet OSM indique `capacity=178` et `capacity:disabled=7`. Le [document municipal « État des lieux VADA »](https://www.annecy.fr/api/fileadmin/mediatheque_annecy/Ma_ville/Le_territoire/Etat_des_Lieux_VADA.pdf), p. 185/198, reproduit une grille indiquant 209 places pour Balleydier. | Valeurs attribuées à des sources et périmètres potentiellement différents ; ni somme ni équivalence supposée. Vérifier le périmètre et la capacité actuelle auprès de l'exploitant. Les valeurs OSM ne sont pas un comptage local certifié. |
| Propriété et projet | Le [procès-verbal municipal du 29 septembre 2025](https://www.annecy.fr/fileadmin/mediatheque_annecy/Deliberations/2025/20250929/PV_CM_29_09_2025_signe.pdf), p. 106–107 imprimées (115–116 du PDF), évoque un projet immobilier non abouti et une propriété municipale à cette date. | Situation historique, à actualiser ; elle ne vaut pas autorisation de construire ni preuve de propriété actuelle. |
| Contraintes | Statut foncier actuel, urbanisme applicable, réseaux, sols, dénivelé, risques, contraintes patrimoniales, accès secours et faisabilité structurelle non établis ici. | Consulter les documents applicables et les services compétents avant toute conclusion ; le volume virtuel ne valide pas la faisabilité. |

La grille municipale de surface datée du 31 juillet 2025 était indexée séparément ; son
ancienne adresse renvoyait **404 lors du contrôle**. La reproduction accessible dans le
document VADA est citée ci-dessus. Sa reproduction ne prouve pas la capacité actuelle ni
l'identité exacte des périmètres OSM et Balleydier.

## Inventaire des données

| Source et millésime | Couverture et usage possible | Limites et licence |
| --- | --- | --- |
| [Archive routière OSM Grand Annecy](../data/reference/osm/grand-annecy-20261108.manifest.json), instantané du 8 novembre 2026 | Réseau routier, identifiants et géométries dans un périmètre large qui comprend le quartier ; voir le manifeste. | ODbL 1.0, © contributeurs OpenStreetMap. Les restrictions ne sont pas interprétées ; absence d'un objet n'établit pas son absence physique. Cette archive ne fournit pas de parcelles ni un inventaire certifié des bâtiments. |
| [Archive pilote Annecy](../data/reference/osm/annecy-roads-20261105T222406Z-b0b66162.manifest.json), 5 novembre 2026 | Petit échantillon de voirie documenté par son manifeste. | Sa borne sud commence à 45,897° N, tandis que l'objet OSM du parking s'étend plus au sud : elle ne couvre pas suffisamment le site à elle seule. ODbL 1.0, © contributeurs OpenStreetMap. |
| [Extrait cadastral Étalab](../data/reference/tresums-cadastre/README.md), millésime 1er septembre 2026 | 307 parcelles et 436 bâtiments intersectant la fenêtre d'étude ; géométries complètes et identifiants conservés. | Licence Ouverte 2.0. Fenêtre de recherche, pas emprise de projet ; ni propriété ni affectation déductibles. Les hauteurs et usages ne sont pas fournis. |
| Fond OpenFreeMap / OSM et bâtiments de l'application, voir [sources et limites](data-sources.md) | Vue cartographique pour se repérer. | Fond externe dynamique, non cadastral ; hauteurs des bâtiments issues de propriétés de rendu non certifiées. Ne constitue pas un instantané local figé. |
| [Trafic routier Haute-Savoie](https://www.data.gouv.fr/datasets/trafic-routier-en-haute-savoie), DDT 74, données annuelles 2024 ; couche WFS `ms:L_RESEAU_TRAFIC_ROUTIER_L_074` | Inventaire des données routières et pistes pour rechercher les postes et tronçons pertinents. | Licence Ouverte 2.0 selon la fiche. La présence de lignes dans une grande zone ne démontre pas un poste de comptage proche du parking. Couverture et périodes locales à vérifier ; un zéro ne signifie pas automatiquement absence de trafic. |
| [Fréquentation quotidienne des parkings couverts payants d'Annecy](https://www.data.gouv.fr/datasets/frequentation-quotidienne-des-parkings-couverts-payants-ville-dannecy), fichier 2022–2026 mis à disposition le 27 mai 2026 | Données journalières sur les parkings couverts listés dans le fichier ; contexte urbain éventuel. | Licence Ouverte 2.0 selon la fiche. Aucun champ Trésum ou Providence dans le fichier inspecté ; ce jeu ne mesure pas la fréquentation horaire du site. |
| [GTFS statique SIBRA](https://transport.data.gouv.fr/datasets/offre-de-transports-sibra-a-annecy-gtfs/) ; édition utilisée dans le dépôt du 6 novembre 2026 | Les arrêts Trésum existent dans le jeu local ; horaires théoriques et identifiants de lignes pour les dates couvertes. Voir [données SIBRA](sibra-data.md) pour l'édition, la période et les conditions. | ODbL 1.0 et conditions particulières du Point d'accès national. Les horaires ne mesurent ni charge ni fréquentation réelles ; vérifier jour de service, sens et tronçon pour toute estimation. |
| [INSEE, flux domicile-travail 2022](https://www.insee.fr/fr/statistiques/8582949), publication du 26 juin 2025, géographie 2025 | Flux communaux des actifs de 15 ans ou plus ; contexte territorial. | Ne mesure ni le parking ni les visites touristiques. L'INSEE indique que les flux inférieurs à 200 sont des ordres de grandeur. Vérifier les conditions de réutilisation avant redistribution. |
| [Dossier ZFE-m du Grand Annecy, 2024](https://www.grandannecy.fr/fileadmin/mediatheque/Documents_reglementaires/Conseil/2024/04_25/DEL-2024-64_ZFE-M__Projet_arrete_et_lancement_consultation_reglementaire.pdf) | Document réglementaire citant notamment l'enquête déplacements Grand Territoire 2015–2017, utile comme contexte historique. | Les parts rapportées sont territoriales, anciennes et ne décrivent pas les usagers du parking ou l'heure de pointe. Vérifier droits et conditions du document avant réutilisation substantielle. |

Pour les jeux de données manquants, conserver « inconnu » plutôt qu'une valeur nulle :
occupation et rotation observées, distribution horaire et par destination, report modal,
charge des bus, largeurs de voies, emprise et faisabilité. Relever pour chaque future donnée
sa source, date, unité, périmètre, licence et nature : mesure locale, hypothèse issue d'un
autre projet ou valeur supposée.

## Études comparables et transfert

- [Arcachon : parc-relais saisonnier avec navettes](https://www.cerema.fr/fr/actualites/voirie-espaces-publics-solutions-economes-fiches-pratiques), Cerema. Il s'agit d'une gare routière scolaire réutilisée l'été, à distance du centre. Son usage touristique saisonnier, son emplacement et son offre de navettes diffèrent des Trésums. Ses taux et volumes ne doivent pas être appliqués automatiquement à Annecy.
- [Rabattement en parc-relais vers les gares TER : état de l'art](https://doc.cerema.fr/default/digitalCollection/DigitalCollectionInlineDownloadHandler.ashx?_cb=20210720203552&documentId=13007&parentDocumentId=13006), Cerema / SMT aire métropolitaine lyonnaise, juillet 2020. L'étude porte sur le rabattement vers le train et souligne l'importance du contexte local et de l'offre de transport. Elle aide à formuler les questions à étudier, pas à fixer une part modale pour un parking urbain desservi par bus.

Ces références servent de repères méthodologiques. Toute valeur transférée d'un autre site
doit rester modifiable, être explicitement identifiée comme telle et être accompagnée de son
périmètre et des différences de contexte.

## Prochaines vérifications

1. Obtenir auprès de la Ville et de l'exploitant les périmètres, capacités, accès, règles et données de fréquentation disponibles, avec dates et droits de réutilisation.
2. Vérifier le cadastre et les documents d'urbanisme et de risques en vigueur, puis les limites et contraintes sur le terrain.
3. Localiser les postes de comptage effectivement pertinents, inspecter leurs périodes et obtenir une mesure de référence si nécessaire.
4. Vérifier sur le terrain les bâtiments et parcelles pertinents dans l'extrait cadastral, leurs usages et les hauteurs manquantes ; établir les droits et contraintes applicables.
5. Construire des hypothèses horaires et des fourchettes sans convertir les données territoriales ou horaires théoriques en fréquentation mesurée du site.
