# Référence locale — Trésums / Providence

État documentaire préparé le 15 novembre 2026 et complété le 17 novembre 2026 pour le projet de comparaison multimodale.
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
| Accès et circulation | Voiries bordant le secteur documentées. Un [arrêté temporaire d'avril 2025](https://www.annecy.fr/fileadmin/mediatheque_annecy/Actes_administratifs/Arretes-municipaux/2025/2025_avril/CN_2025_728.pdf), article 3, décrit une voie de sortie vers les Marquisats temporairement ouverte à double sens. | Cette disposition temporaire ne confirme ni l'entrée habituelle ni les accès actuels. Vérifier sur place et auprès de l'exploitant, pour chaque mode. |
| Capacité | L'objet OSM indique `capacity=178` et `capacity:disabled=7`. Le [document municipal « État des lieux VADA »](https://www.annecy.fr/api/fileadmin/mediatheque_annecy/Ma_ville/Le_territoire/Etat_des_Lieux_VADA.pdf), p. 185/198, reproduit une grille indiquant 209 places pour Balleydier. La [couche SIG municipale](https://portailsig.annecy.fr/server/rest/services/FLUX_SITE_INTERNET/MOBILITE/MapServer/16/query?where=objectid%20in%20%2817%2C32%29&outFields=*&returnGeometry=false&f=json), consultée le 17 novembre 2026, indique 180 places « Tresum » et 29 « Providence ». | La somme 180 + 29 correspond numériquement à 209, mais les deux fiches SIG n'indiquent ni date de création ou modification, ni adresse ou géométrie. L'identité des périmètres et la capacité actuelle restent à confirmer ; la licence de cette couche n'est pas précisée. Les valeurs OSM ne sont pas un comptage certifié. |
| Propriété et projet | Le [procès-verbal municipal du 29 septembre 2025](https://www.annecy.fr/fileadmin/mediatheque_annecy/Deliberations/2025/20250929/PV_CM_29_09_2025_signe.pdf), p. 106–107 imprimées (115–116 du PDF), évoque un projet immobilier non abouti et une propriété municipale à cette date. | Situation historique, à actualiser ; elle ne vaut pas autorisation de construire ni preuve de propriété actuelle. |
| Contraintes | Le [PLUi-HMB est entré en vigueur le 12 mars 2026](https://espacecitoyen.grandannecy.fr/actualites/actualite/plui-hmb-cartographie-interactive-en-ligne). Un [dossier municipal de travaux 2026](https://www.annecy.fr/fileadmin/mediatheque_annecy/Espace_presse/DP-TRAVAUX_22.09.2026.pdf) signale des travaux de réseau de chaleur avenue de Trésum. | Le zonage et les servitudes précis, l'état foncier, les réseaux sous le parking, les sols, risques, accès secours et la faisabilité structurelle restent à vérifier. Des travaux dans la rue ne démontrent pas un réseau sous la parcelle. |

La grille municipale de surface datée du 31 juillet 2025 était indexée séparément ; son
ancienne adresse renvoyait **404 lors du contrôle**. La reproduction accessible dans le
document VADA est citée ci-dessus. Sa reproduction ne prouve pas la capacité actuelle ni
l'identité exacte des périmètres OSM et Balleydier.

À titre de repérage, l'[API Carto du Géoportail de l'urbanisme](https://apicarto.ign.fr/api/gpu/zone-urba?geom=%7B%22type%22%3A%22Point%22%2C%22coordinates%22%3A%5B6.1308623%2C45.8964833%5D%7D),
interrogée le 17 novembre 2026 au centre indicatif de l'objet OSM (6,1308623 E ; 45,8964833 N),
renvoie la zone `Uac2`, « centralités d'Annecy », pour le document `200066793_PLUI_20260326`.
Ce résultat concerne un seul point approximatif : il ne vaut ni diagnostic de tout le parking,
ni interprétation des règles applicables. Consulter le règlement et les servitudes en vigueur
sur l'emprise effectivement retenue.

## Inventaire des données

| Source et millésime | Couverture et usage possible | Limites et licence |
| --- | --- | --- |
| [Archive routière OSM Grand Annecy](../data/reference/osm/grand-annecy-20261108.manifest.json), instantané du 8 novembre 2026 | Réseau routier, identifiants et géométries dans un périmètre large qui comprend le quartier ; voir le manifeste. | ODbL 1.0, © contributeurs OpenStreetMap. Les restrictions ne sont pas interprétées ; absence d'un objet n'établit pas son absence physique. Cette archive ne fournit pas de parcelles ni un inventaire certifié des bâtiments. |
| [Archive pilote Annecy](../data/reference/osm/annecy-roads-20261105T222406Z-b0b66162.manifest.json), 5 novembre 2026 | Petit échantillon de voirie documenté par son manifeste. | Sa borne sud commence à 45,897° N, tandis que l'objet OSM du parking s'étend plus au sud : elle ne couvre pas suffisamment le site à elle seule. ODbL 1.0, © contributeurs OpenStreetMap. |
| [Extrait cadastral Étalab](../data/reference/tresums-cadastre/README.md), millésime 1er septembre 2026 | 307 parcelles et 436 bâtiments intersectant la fenêtre d'étude ; géométries complètes et identifiants conservés. | Licence Ouverte 2.0. Fenêtre de recherche, pas emprise de projet ; ni propriété ni affectation déductibles. Les hauteurs et usages ne sont pas fournis. |
| Fond OpenFreeMap / OSM et bâtiments de l'application, voir [sources et limites](data-sources.md) | Vue cartographique pour se repérer. | Fond externe dynamique, non cadastral ; hauteurs des bâtiments issues de propriétés de rendu non certifiées. Ne constitue pas un instantané local figé. |
| [Trafic routier Haute-Savoie](https://www.data.gouv.fr/datasets/trafic-routier-en-haute-savoie), DDT 74, données annuelles 2024 ; couche WFS `ms:L_RESEAU_TRAFIC_ROUTIER_L_074` | Une [requête spatiale de repérage](https://ogc.geo-ide.developpement-durable.gouv.fr/wxs?map=%2Fopt%2Fdata%2Fstack%2Fmapfiles%2F1.4%2Forg_38090%2F7bc62133-b9b6-407a-b937-a75b120540ef.internet.map&service=WFS&version=1.1.0&request=GetFeature&typeName=ms%3AL_RESEAU_TRAFIC_ROUTIER_L_074&srsName=EPSG%3A4326&bbox=45.887%2C6.12%2C45.905%2C6.14%2CEPSG%3A4326) renvoie notamment les tronçons D1508 CDP109 et D41 CDP170, avec respectivement `TMJA_24=21089` et `1129` véhicules/jour. | Licence Ouverte 2.0 selon la fiche. Une intersection avec cette grande fenêtre ne situe pas le capteur ni ne prouve la représentativité des accès du parking. Ce sont des valeurs annuelles attribuées aux tronçons, pas des flux horaires du site ; un zéro ne signifie pas automatiquement absence de trafic. |
| [Fréquentation quotidienne des parkings couverts payants d'Annecy](https://www.data.gouv.fr/datasets/frequentation-quotidienne-des-parkings-couverts-payants-ville-dannecy), fichier 2022–2026 mis à disposition le 27 mai 2026 | Données journalières sur les parkings couverts listés dans le fichier ; contexte urbain éventuel. | Licence Ouverte 2.0 selon la fiche. Aucun champ Trésum ou Providence dans le fichier inspecté ; ce jeu ne mesure pas la fréquentation horaire du site. |
| [GTFS statique SIBRA](https://transport.data.gouv.fr/datasets/offre-de-transports-sibra-a-annecy-gtfs/) ; édition utilisée dans le dépôt du 6 novembre 2026 | Les arrêts Trésum existent dans le jeu local ; horaires théoriques et identifiants de lignes pour les dates couvertes. Voir [données SIBRA](sibra-data.md) pour l'édition, la période et les conditions. | ODbL 1.0 et conditions particulières du Point d'accès national. Les horaires ne mesurent ni charge ni fréquentation réelles ; vérifier jour de service, sens et tronçon pour toute estimation. |
| [INSEE, flux domicile-travail 2022](https://www.insee.fr/fr/statistiques/8582949), publication du 26 juin 2025, géographie 2025 | Flux communaux des actifs de 15 ans ou plus ; contexte territorial. | Ne mesure ni le parking ni les visites touristiques. L'INSEE indique que les flux inférieurs à 200 sont des ordres de grandeur. Vérifier les conditions de réutilisation avant redistribution. |
| [Dossier ZFE-m du Grand Annecy, 2024](https://www.grandannecy.fr/fileadmin/mediatheque/Documents_reglementaires/Conseil/2024/04_25/DEL-2024-64_ZFE-M__Projet_arrete_et_lancement_consultation_reglementaire.pdf) | Document réglementaire citant notamment l'enquête déplacements Grand Territoire 2015–2017, utile comme contexte historique. | Les parts rapportées sont territoriales, anciennes et ne décrivent pas les usagers du parking ou l'heure de pointe. Vérifier droits et conditions du document avant réutilisation substantielle. |

Pour les jeux de données manquants, conserver « inconnu » plutôt qu'une valeur nulle :
occupation et rotation observées, distribution horaire et par destination, report modal,
charge des bus, largeurs de voies, emprise et faisabilité. Relever pour chaque future donnée
sa source, date, unité, périmètre, licence et nature : mesure locale, hypothèse issue d'un
autre projet ou valeur supposée.

Deux analyses reproductibles complètent cet inventaire : les [passages théoriques SIBRA
à Trésum pour un jour et une heure précis](offre-tresums-gtfs.md) et les [flux
domicile-travail INSEE à l'échelle communale](flux-insee-annecy.md). Les premiers ne
mesurent pas la charge des bus ; les seconds ne décrivent pas les usagers du parking.
L'exploitation d'archives GTFS supplémentaires et une analyse plus complète de l'enquête
locale restent à faire.

Le [dossier ZFE-m de 2024](https://www.grandannecy.fr/fileadmin/mediatheque/Documents_reglementaires/Conseil/2024/04_25/DEL-2024-64_ZFE-M__Projet_arrete_et_lancement_consultation_reglementaire.pdf)
(page 98 du PDF, rapport réglementaire § 2.4.1.1) rapporte pour le Grand Annecy les
résultats de l'enquête déplacements Grand Territoire 2015–2017 : 3,9 déplacements par jour
et par personne ; parts modales de 64 % en voiture, 24 % à pied, 7 % en transports urbains,
2 % à vélo et 1 % en train. Ces valeurs historiques concernent le territoire de l'enquête :
elles ne sont ni des parts des usagers du parking ni une mesure de pointe. La concertation
volontaire ZFE, présentée ailleurs dans le même dossier, est distincte de cette enquête.

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
