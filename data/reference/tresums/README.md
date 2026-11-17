# Carte de référence indicative — Trésums

`carte-reference.geojson` contient une vue géographique figée et consultable dans un
visualiseur GeoJSON. Elle comporte 405 objets de voirie et un polygone de parking
OpenStreetMap. Les coordonnées sont en longitude, latitude WGS 84. Ce document est une
carte de repérage : **ni limite foncière, ni emprise de projet, ni relevé terrain**.
Les bâtiments, parcelles cadastrales, accès vérifiés et limites réglementaires n'y sont
pas représentés ; leur absence ne prouve pas leur inexistence. Les restrictions de
circulation ne sont pas interprétées et cette carte ne doit pas être utilisée pour calculer
un itinéraire.

## Sources

- Voirie : `../osm/grand-annecy-20261108.osm.json.gz`, extrait de Geofabrik / OpenStreetMap,
  instantané OSM `2026-11-08T21:21:00Z`, SHA-256
  `f9792dbe04a9eaa7c32712ce7b0164567d4629495d9eb91036de4e72278ed82b`.
  Son [manifeste](../osm/grand-annecy-20261108.manifest.json) documente l'emprise source,
  sa construction et ses limites. L'extrait original regroupe des routes et ne constitue
  pas une base générale des bâtiments ou parcelles.
- Parking : [way OpenStreetMap 40906387](https://www.openstreetmap.org/way/40906387),
  version 12, modifiée le `2026-07-02T08:27:14Z`. La réponse JSON de l'[API OSM way
  complet](https://api.openstreetmap.org/api/0.6/way/40906387/full.json), consultée le
  15 novembre 2026, a été conservée sous forme filtrée dans
  `osm-way-40906387-v12.json` : géométrie, versions, dates et attributs conservés ;
  champs d'utilisateur et de changeset non retenus. SHA-256 du fichier filtré :
  `a345c68bd7efd0beecc1cf375d70fad225cf1b027caa997136c2efced9347050`.
  L'attribut OSM `capacity=178` est une **information collaborative non vérifiée** ;
  il ne constitue pas un comptage ou une capacité officielle actuelle. La géométrie OSM
  ne démontre pas les limites cadastrales ou l'emprise disponible du projet.

Attribution : **© contributeurs OpenStreetMap**, données sous [ODbL 1.0](https://www.openstreetmap.org/copyright).
La redistribution de la base dérivée doit respecter l'ODbL et les conditions des
fournisseurs ; l'attribution doit rester visible sur toute carte produite.

## Méthode et reproduction

La fenêtre rectangulaire d'étude est 6,126–6,135° E et 45,8935–45,8995° N. C'est un
choix technique de cadrage autour du secteur, **pas une emprise administrative ou de
parking**. Les lignes routières de l'archive dont au moins un segment touche cette fenêtre
sont découpées à son bord ; les intersections avec ce bord sont calculées, elles ne sont
pas des nœuds OSM. Les identifiants et versions des voies sources sont conservés. Le
parking est l'objet OSM complet, qui ne prouve ni le nombre d'entrées ni leur position.
Les millésimes de voirie et du parking diffèrent ; la carte ne prétend pas les synchroniser.

Depuis la racine du dépôt, avec Python 3 :

```sh
python3 scripts/importers/tresums_reference.py
python3 -m unittest discover -s scripts/importers -p 'test_tresums_reference.py' -v
```

La sortie attendue a pour SHA-256
`6db0d5a8cdb8383a078c2d5b5c850c86a095a3bcf3493f7a4be8210cdaedd11b`.
Pour mettre les données à jour, conserver un nouvel instantané daté et sa provenance ;
ne pas remplacer silencieusement cette référence utilisée pour les comparaisons.
