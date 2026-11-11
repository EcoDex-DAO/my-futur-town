# Instantanés de voirie OpenStreetMap

Les archives de ce dossier contiennent les réponses Overpass réelles du secteur pilote d’Annecy. Les données restent sous **ODbL 1.0**, avec attribution **© OpenStreetMap contributors** : https://www.openstreetmap.org/copyright. La licence Apache du code ne remplace pas celle des données.

Chaque manifeste indique le timestamp OSM, les empreintes de contrôle, la couche Supabase et la projection. Les fichiers sont conservés pour reproduire un import précis et retrouver la référence d’un scénario. Un nouvel état OSM doit créer un nouvel instantané, pas remplacer l’ancien.

Pour régénérer le SQL sans nouvel appel réseau :

```sh
python3 scripts/importers/osm_roads.py --input data/reference/osm/<archive>.osm.json.gz --output /tmp/roads.sql
```

Le SQL n’est jamais appliqué automatiquement par cette commande. Les identifiants sont déterministes ; une réapplication du même instantané ne doit pas dupliquer les références. Le périmètre reste un petit secteur, pas toute la voirie d’Annecy.

## Proposition de tracé bus

`grand-annecy-20261108.osm.json.gz` contient le graphe routier OSM du rectangle Grand Annecy décrit dans son manifeste : 55 974 voies, 462 649 nœuds et 565 relations de restriction. Son empreinte et sa provenance sont conservées dans `grand-annecy-20261108.manifest.json`. L’API Next.js utilise cet extrait local pour proposer un chemin entre terminus et points de passage ; aucune requête Overpass n’est faite lors de l’utilisation.

La proposition reste expérimentale. L’extrait ne garantit pas toutes les voiries ni les détours hors de son rectangle ; les règles d’accès bus, gabarits et certaines restrictions de tournant restent incomplètes. L’interface signale ces limites, affiche les raccordements et ne présente aucun résultat comme un itinéraire bus praticable ou validé. Attribution **© OpenStreetMap contributors**, licence **ODbL 1.0** : https://www.openstreetmap.org/copyright.
