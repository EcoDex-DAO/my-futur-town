# Recherche préparatoire : circulations aux Trésums (#58)

L'espace Orca `issue-58-tresums-flux` et sa branche `EcoDex-DAO/issue-58-tresums-flux` partent du commit `e47cd1f`, identique à `origin/main` lors de la vérification du 25 novembre 2026. Cette contribution à la mission #59 concerne le site #60 et servira aux connexions #62.

## Sources disponibles

- Le cadastre de la V0 est documenté dans [tresums-v0-sources.md](tresums-v0-sources.md). Son millésime est le 1er septembre 2026 ; il est attribué à la DGFiP / Etalab sous Licence Ouverte 2.0. La fenêtre cadastrale ne définit pas une emprise de projet.
- L'[archive routière OpenStreetMap Grand Annecy](../data/reference/osm/grand-annecy-20261108.manifest.json), issue de Geofabrik, porte un instantané du 8 novembre 2026 à 21 h 21 UTC. Sa couverture comprend les Trésums ; elle est sous ODbL 1.0 avec attribution « © les contributeurs OpenStreetMap ». Voir les [conditions OSM](https://www.openstreetmap.org/copyright). Elle contient des voies `highway` et des restrictions, mais les relations d'itinéraires cyclables ne figurent pas dans son manifeste.
- Dans la fenêtre 6,125–6,136° E et 45,893–45,901° N, un premier décompte des voies comportant au moins un nœud dans la fenêtre trouve notamment 240 `footway`, 67 `pedestrian`, 32 `steps`, 15 `path`, 11 `cycleway` et 38 `primary`. Ce décompte exploratoire ne comprend pas nécessairement toutes les voies qui traversent la fenêtre sans nœud intérieur et ne mesure aucune circulation.
- La [Base nationale des aménagements cyclables issue d'OSM](https://transport.data.gouv.fr/datasets/amenagements-cyclables-france-metropolitaine/) est publiée par Geovelo sous ODbL. Elle transforme les données OSM et ne constitue donc pas un contrôle indépendant de celles-ci. La fiche propose notamment un fichier daté du 3 novembre 2026 ; sa couverture effective autour des Trésums reste à vérifier avant réutilisation.
- Le [schéma directeur cyclable du Grand Annecy](https://mobilites.grandannecy.fr/schema-directeur-cyclable) décrit des aménagements existants et programmés. Il ne permet pas, à lui seul, d'établir quels tracés sont réalisés aux Trésums ; aucune géométrie locale et licence de réutilisation précises n'ont été vérifiées pour cet usage.
- Le service WFS officiel [Géoplateforme IGN](https://data.geopf.fr/wfs/ows?service=WFS&request=GetCapabilities) expose `BDTOPO_V3:troncon_de_route`. Une interrogation le 25 novembre 2026 de la même fenêtre en EPSG:4326 renvoie 402 objets ; un échantillon comprend l'avenue de la Visitation, également présente dans l'extrait OSM. Sur cet échantillon, deux sommets IGN et OSM sont distants d'environ 1,4 m ; ce contrôle ponctuel ne valide ni le calage de chaque voie ni les accès. L'objet examiné indique une modification le 18 septembre 2026 ; cette date n'est pas le millésime de toute la couche. La [documentation IGN](https://geoservices.ign.fr/sites/default/files/2021-12/DC_Metadonnees_2-0.pdf) indique la Licence Ouverte Etalab pour la BD TOPO ; aucun objet IGN n'est redistribué ici.

La [requête IGN de contrôle](https://data.geopf.fr/wfs/ows?service=WFS&version=2.0.0&request=GetFeature&typeNames=BDTOPO_V3%3Atroncon_de_route&outputFormat=application%2Fjson&srsName=EPSG%3A4326&bbox=6.125%2C45.893%2C6.136%2C45.901%2CEPSG%3A4326&count=5) est dynamique : les résultats et leur nombre peuvent évoluer. Elle n'est pas utilisée par l'application.

## Extrait utilisé

`python3 scripts/extract-tresums-ways.py` produit `public/data/tresums/voies.json` depuis l'archive figée. Les géométries sont découpées aux limites de la fenêtre, en conservant l'ordre des nœuds et l'identifiant OSM ; un objet peut produire plusieurs morceaux. Une voie cyclable comprend `highway=cycleway`, certains tags de bande ou piste sur chaussée, et les chemins explicitement autorisés aux vélos ; les autres tags, voies partagées non renseignées et relations d'itinéraire ne sont pas exhaustifs. Les routes comprennent aussi des voies de service et chemins agricoles, sans garantie d'accès public. Les chemins piétons comprennent chemins, escaliers et zones piétonnes, sans garantie d'accessibilité. Un tronçon peut figurer dans plusieurs catégories ; une bande cyclable sur une route est dessinée sur son axe et non sur sa position latérale réelle.

L'extrait conserve le tag OSM général `oneway`, mais la création de zone ne présente pas encore les sens des voies. Ce tag ne traduit pas à lui seul les exceptions pour vélos ou autres modes, les restrictions de tournant, ni les sens absents ou implicites. Les voies sont des références indicatives, pas une preuve de droit de passage ni une mesure de fréquentation. Les couleurs ne représentent pas une intensité de flux.

## Points non résolus

Les essais de requête des relations cyclables sur `overpass-api.de` ont reçu HTTP 406 ; `overpass.kumi.systems` a expiré après 30 secondes. Ces erreurs ne prouvent pas l'absence d'itinéraires. Il reste à obtenir un extrait vérifiable des relations, à vérifier son horodatage, sa couverture et son attribution, puis à confronter les géométries au cadastre et au terrain. Les sens OSM et les droits d'accès demandent aussi une interprétation prudente, notamment pour les vélos et les voies privées.

Les tracés sont des infrastructures ou itinéraires déclarés, jamais des comptages. La mesure de trafic reste suivie dans #35. Les fichiers TopoExport mentionnés dans la demande ne sont ni utilisés ni modifiés.

## Création de projet

La zone confirmée est enregistrée dans le stockage local du navigateur sous la clé `mft-tresums-projects-v1`, séparée des scénarios et des dessins V0. Une zone par parcelles conserve leurs identifiants et géométries cadastrales ; un contour libre conserve ses sommets. Le brouillon peut être annulé et n'est écrit qu'à la confirmation. Le stockage local n'est ni une sauvegarde partagée ni une garantie en cas d'effacement des données du navigateur. Les réserves `parking` et `flows` sont vides : capacité, accès, sens et futurs rangs de places restent à définir lors de l'étape parking.

La sélection sur la carte et le placement ou déplacement des sommets demandent actuellement une souris ou un écran tactile ; les commandes du panneau restent accessibles au clavier. Un parcours de dessin et de sélection entièrement au clavier reste à concevoir.
