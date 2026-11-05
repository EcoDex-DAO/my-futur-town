# Instantanés de voirie OpenStreetMap

Les archives de ce dossier contiennent les réponses Overpass réelles du secteur pilote d’Annecy. Les données restent sous **ODbL 1.0**, avec attribution **© OpenStreetMap contributors** : https://www.openstreetmap.org/copyright. La licence Apache du code ne remplace pas celle des données.

Chaque manifeste indique le timestamp OSM, les empreintes de contrôle, la couche Supabase et la projection. Les fichiers sont conservés pour reproduire un import précis et retrouver la référence d’un scénario. Un nouvel état OSM doit créer un nouvel instantané, pas remplacer l’ancien.

Pour régénérer le SQL sans nouvel appel réseau :

```sh
python3 scripts/importers/osm_roads.py --input data/reference/osm/<archive>.osm.json.gz --output /tmp/roads.sql
```

Le SQL n’est jamais appliqué automatiquement par cette commande. Les identifiants sont déterministes ; une réapplication du même instantané ne doit pas dupliquer les références. Le périmètre reste un petit secteur, pas toute la voirie d’Annecy.
