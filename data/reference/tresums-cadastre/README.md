# Référence cadastrale indicative — secteur Trésums

Extrait figé du [cadastre Etalab](https://cadastre.data.gouv.fr/datasets/cadastre-etalab), commune d'Annecy (INSEE 74010), millésime **2026-09-01**, sous [Licence Ouverte 2.0](https://www.etalab.gouv.fr/licence-ouverte-open-licence/). Source : DGFiP, Cadastre, diffusion Etalab. Les données cadastrales sont mises à disposition à titre informatif et ne constituent pas un relevé de géomètre, une limite juridique certifiée, une preuve de propriété ou une preuve d'affectation à un parking.

Fenêtre de recherche WGS84 : ouest 6.126, sud 45.8935, est 6.135, nord 45.8995. Ce rectangle facilite l'étude et ne constitue ni une emprise du projet, ni le contour du parking. La sélection conserve les géométries complètes des objets intersectant le rectangle, y compris celles qui le dépassent. Les bâtiments sont les objets cadastraux du millésime indiqué ; ils ne fournissent ni hauteurs ni usages vérifiés. Des objets peuvent manquer ou avoir évolué depuis le millésime.

| Sortie | Objets | SHA-256 |
| --- | ---: | --- |
| `parcelles.geojson` | 307 | `0520873ea552e343adbf75b3e26c22b0f8754aa178e593903776eca4b14a3241` |
| `batiments.geojson` | 436 | `0c0777f7d1c0601b3904d118ecda8056b83b695c5b46dd6c7c210b072c9ac5d3` |

Les propriétés `created` et `updated` sont celles de la source et ne représentent pas la date de levé sur le terrain. Aucune conclusion de maîtrise foncière ne découle d'une intersection entre le parking OSM et une parcelle.

## Reproduction

Depuis la racine du dépôt, avec Python 3 :

```sh
curl -fL -o /tmp/tresums-parcelles.json.gz https://cadastre.data.gouv.fr/data/etalab-cadastre/2026-09-01/geojson/communes/74/74010/cadastre-74010-parcelles.json.gz
curl -fL -o /tmp/tresums-batiments.json.gz https://cadastre.data.gouv.fr/data/etalab-cadastre/2026-09-01/geojson/communes/74/74010/cadastre-74010-batiments.json.gz
python3 scripts/importers/tresums_cadastre.py --parcelles /tmp/tresums-parcelles.json.gz --batiments /tmp/tresums-batiments.json.gz
python3 -m unittest discover -s scripts/importers -p 'test_tresums_cadastre.py' -v
```

Le programme vérifie les empreintes SHA-256 des archives avant traitement : parcelles `52bdca4e1bd67c7bce39633fe1b67dbf3ea94edb73ee19336093f2347c503037` ; bâtiments `09ee24692a3141fc2f7dd9ba407eff243ab3c9452bc57b50a104db4f5953484a`. Si le producteur modifie une archive sous la même URL, le programme refuse de générer un nouvel extrait silencieusement. Les données originales restent accessibles auprès du producteur.
