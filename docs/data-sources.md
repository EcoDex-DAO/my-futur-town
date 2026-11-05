# Sources et limites

## Carte de référence

- **OpenStreetMap** : https://www.openstreetmap.org/copyright — base collaborative sous ODbL 1.0, attribution « © OpenStreetMap contributors ». Routes, surfaces d’eau, bâtiments et points d’intérêt viennent des tuiles existantes, sans géométrie inventée dans ce dépôt. Couverture, précision et fraîcheur variables ; ce n’est ni un cadastre ni un relevé de géomètre.
- **OpenFreeMap** : https://openfreemap.org/ et https://openfreemap.org/quick_start/ — service de tuiles vectorielles et styles publics sans clé. Style utilisé : https://tiles.openfreemap.org/styles/liberty. Respecter son attribution, les licences des données et les conditions actuelles du service ; disponibilité et pérennité non garanties. Les attributions du style restent affichées dans MapLibre.
- **OpenMapTiles** : https://openmaptiles.org/schema/ — schéma vectoriel utilisé par la source ; schéma sous BSD et attribution CC-BY 4.0 selon le projet. Le style Liberty est distribué par OpenFreeMap ; consulter son dépôt et sa licence avant redistribution d’un style modifié : https://github.com/hyperknot/openfreemap.

La vue initiale est un simple point de caméra au centre d’Annecy (6.1294 E, 45.8992 N), pas une limite administrative ni un jeu de données local.

## Bâtiments 2.5D

La couche `building` est repérée dans le style, indépendamment du nom du fournisseur. Les extrusions utilisent `render_height` et `render_min_height` en mètres, sans hauteur ajoutée par l’application. Ces propriétés de rendu peuvent toutefois être dérivées de niveaux ou de valeurs par défaut par le producteur des tuiles. Elles ne constituent pas des hauteurs mesurées ou certifiées. Un bâtiment sans `render_height` positif reste en 2D. Le bouton 2.5D est désactivé si la source ne possède pas de couche bâtiment compatible.

Les tuiles changent avec le zoom et les mises à jour. Les propriétés inspectées sont un sous-ensemble des données d’origine ; un identifiant de tuile n’est pas un identifiant stable pour un import ou un scénario. Les futurs imports devront conserver une clé de source stable (`osm:way:…`, identifiant producteur, etc.), leur licence, leur date et leur provenance dans PostGIS.

Pas de données locales copiées, d’import automatique, de hauteurs synthétiques ou de géométries simulées dans cette phase. Le fond de carte peut contenir d’autres jeux de données : son attribution native fait foi. La carte nécessite un accès réseau au fournisseur, à ses fontes, sprites et tuiles. En cas de panne, l’application affiche une erreur plutôt que des données fictives.
