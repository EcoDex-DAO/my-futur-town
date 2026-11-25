# Trésums V0 : sources et limites

## Cadastre

L'extrait `public/data/tresums/parcelles.json` provient du [Cadastre Etalab](https://cadastre.data.gouv.fr/datasets/cadastre-etalab), produit à partir du plan cadastral informatisé de la DGFiP. Le fichier source est le [GeoJSON des parcelles d'Annecy (74010), millésime du 1er septembre 2026](https://cadastre.data.gouv.fr/data/etalab-cadastre/2026-09-01/geojson/communes/74/74010/cadastre-74010-parcelles.json.gz), consulté le 25 novembre 2026. Licence : [Licence Ouverte 2.0](https://www.data.gouv.fr/pages/legal/licences/etalab-2-0), selon la [fiche du jeu de données](https://www.data.gouv.fr/datasets/cadastre). Attribution : DGFiP / Etalab, cadastre 2026.

L'extrait conserve les 546 parcelles dont la boîte englobante intersecte le rectangle 6,125–6,136° E, 45,893–45,901° N. Les géométries et propriétés n'ont pas été modifiées. Ce rectangle ne définit pas le site du projet. Les feuilles sont assemblées sans correction topologique ; le plan cadastral est indicatif et ne constitue pas un bornage. Les dates `created` et `updated` des objets sont celles de la source, pas une preuve de situation actuelle.

## Export TopoExport fourni

Les deux fichiers DXF binaires ont été examinés sans modification avec ezdxf 1.4.5. L'unité déclarée est le mètre. Les coordonnées horizontales sont locales, autour de 0 à 647 m ; aucune entité GEODATA n'a été trouvée. Le fichier 3D contient notamment 245 objets cadastraux, 274 bâtiments, les axes et contours de routes, 103 courbes de niveau, un terrain et 1 535 insertions d'arbres. Son emprise calculée, insertions comprises, est approximativement X −62 à 653 m, Y −49 à 650 m et Z 446 à 536 m. Le 2D contient notamment 245 objets cadastraux, 289 bâtiments, 251 axes routiers et 1 535 insertions d'arbres ; son emprise calculée est X −4 à 653 m et Y −11 à 648 m. Ces emprises sont approximatives et peuvent inclure des symboles dépassant le cadre.

Le `LICENSE.txt` joint attribue notamment le PCI et la BD TOPO à l'IGN sous Etalab 2.0, les arbres et espaces verts Overture à l'ODbL et la hauteur de canopée Meta/WRI à CC BY 4.0. Il avertit des erreurs possibles et recommande un contrôle par géomètre. Les données composites et leurs conditions de redistribution doivent être vérifiées couche par couche. Sans points de calage et vérification des droits, aucun DXF ni géométrie dérivée n'est redistribué ici et aucun système de coordonnées géographiques n'est affirmé.

## Autres références

Le fond existant provient d'OpenFreeMap et d'OpenStreetMap ; son attribution figure sur la carte. Le contour de parking existant est une géométrie OSM indicative, documentée dans `data/reference/tresums/README.md`. Le bâti et la voirie du fond ne sont pas des relevés de projet ni une garantie d'accès. Les hypothèses dessinées dans cette V0 ne démontrent ni propriété ni faisabilité.
