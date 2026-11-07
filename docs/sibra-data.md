# Données du réseau de bus SIBRA

`public/data/sibra.json` et `public/data/sibra-schedule.json` sont générés à
partir du GTFS statique officiel de SIBRA, publié par SIBRA et le Grand Annecy
sur transport.data.gouv.fr. Le premier contient les identifiants, noms et
couleurs des lignes, leurs géométries GTFS ainsi que les séquences d’arrêts
ordonnées. Le second contient les courses GTFS de la seule ligne dont le
`route_id` est `1`, avec les horaires théoriques et une progression le long de
la forme géographique associée. Les deux fichiers conservent les identifiants
GTFS. Ils ne contiennent pas de positions de véhicules en temps réel.

## Édition source

- Téléchargement : [GTFS SIBRA, édition publiée le 6 novembre 2026](https://static.data.gouv.fr/resources/offre-de-transports-sibra-a-annecy-gtfs/20261106-075925/gtfs-sibra.zip)
- SHA-256 de l’archive : `13948ea007139e52708bd3ebc90c5eff481e091f13d28c98db2dccc90b67da51`
- Fiche du jeu de données : [Réseau urbain Sibra](https://transport.data.gouv.fr/datasets/offre-de-transports-sibra-a-annecy-gtfs)
- Publication : 2026-11-06
- Période annoncée : du 2026-11-04 au 2026-12-20 inclus
- Attribution : SIBRA, Grand Annecy — Offre de transports SIBRA (GTFS)
- Licence : Open Database License (ODbL) 1.0 et conditions particulières du PAN.

Cette édition ne contient pas de fichier `feed_info.txt`. Le GTFS a un
`calendar.txt` sans calendrier récurrent et un `calendar_dates.txt` composé de
dates d’exception. La période effective calculée par l’importeur va du
2026-11-04 au 2026-12-20, conformément à la période publiée sur la fiche de la
ressource. Pour d’autres éditions, l’importeur calcule les dates actives à
partir des calendriers récurrents (`calendar.txt`), puis applique les ajouts
(`exception_type=1`) et suppressions (`exception_type=2`) de
`calendar_dates.txt`. Les dates extrêmes ne signifient pas que chaque ligne
circule chaque jour de cette période. Si une future édition utilise des
calendriers récurrents, ces dates bornent les jours de service calculés mais ne
décrivent pas à elles seules les jours où chaque ligne circule.

## Licence et redistribution

Le jeu source est sous ODbL avec les conditions particulières du PAN. Celles-ci
requièrent l’attribution de la source et le partage à l’identique d’une base
dérivée qui conserve la même nature, granularité, période temporelle et emprise
géographique. Elles indiquent que ces bases repartagées doivent être publiées
sur le Point d’accès national (PAN) au format d’origine. Le JSON est une
redistribution dérivée des lignes, géométries et arrêts; sa provenance et sa
licence sont conservées dans les métadonnées. Toute publication externe du jeu
dérivé doit satisfaire les conditions de repartage applicables. Ce dépôt ne
remplace pas le GTFS original et ne publie pas de flux GTFS modifié sur le PAN.

## Import reproductible

L’importeur n’utilise que la bibliothèque standard de Python. Télécharger
l’édition épinglée puis régénérer l’artefact avec un timestamp UTC fixe. Le
script vérifie le SHA-256 de l’archive avant de la lire et refuse toute archive
dont le contenu diffère de cette édition :

```sh
curl -fL -o /tmp/gtfs-sibra.zip \
  https://static.data.gouv.fr/resources/offre-de-transports-sibra-a-annecy-gtfs/20261106-075925/gtfs-sibra.zip
python3 scripts/importers/sibra_gtfs.py /tmp/gtfs-sibra.zip public/data/sibra.json \
  --generated-at 2026-11-06T20:17:00Z
```

La commande génère aussi `public/data/sibra-schedule.json`. Ce fichier a son
propre contrat : `metadata` donne les dates extrêmes d’activité du GTFS et le
fuseau `Europe/Paris`; `serviceDates` associe chaque date aux IDs des services
actifs utilisés par la ligne 1; `trips` contient toutes ses courses GTFS avec
leurs IDs de course, ligne, variante, direction et service ainsi que les arrêts
ordonnés. `arrival` et `departure` sont des secondes depuis minuit au début du
jour de service. Elles peuvent dépasser 86 400 : les heures après minuit restent
rattachées au jour GTFS d’origine. Les dates expriment l’activité des services,
pas l’activation d’une course particulière hors de son service GTFS.

Les `variantId` sont calculés avec le même identifiant de contenu que dans
`sibra.json`, depuis la ligne, la forme, la destination et la séquence d’arrêts.
`progress` est un nombre entre 0 et 1. L’importeur interpole la distance GTFS
`shape_dist_traveled` de chaque arrêt sur les points de la forme, puis rapporte
la distance géographique cumulée (longueur des segments calculée par Haversine)
à la longueur totale de la forme. Les distances des points et arrêts, horaires,
ordre des arrêts et au moins deux arrêts par course sont validés. Une valeur
manquante, non finie ou non monotone fait échouer l’import au lieu d’être
ignorée. Ces horaires sont statiques et ne reflètent ni retards ni
perturbations.

L’importeur vérifie les références des courses vers les lignes, formes et
arrêts, ainsi que les coordonnées. Une référence manquante ou une donnée
malformée provoque une erreur explicite. Les identifiants de variantes sont
calculés à partir de l’identifiant de ligne, de forme, de destination et de la
séquence des identifiants d’arrêts; ils ne dépendent pas de l’ordre des courses
dans le fichier source. Lors d’un changement d’édition, mettre à jour l’URL
épinglée et cette provenance. Les IDs GTFS des lignes et arrêts restent
inchangés.
