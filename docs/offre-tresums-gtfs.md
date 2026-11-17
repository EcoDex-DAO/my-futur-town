# Passages théoriques à Trésum : référence GTFS

Cette analyse décrit les horaires planifiés à deux arrêts et pour un jour de service
précis. Elle ne mesure ni les voyageurs, ni la charge des bus, ni le flux du parking.
Les fichiers locaux ne conservent pas les restrictions GTFS `pickup_type` et
`drop_off_type` : un passage ne garantit donc pas qu'il soit possible de monter ou de
descendre. Ne pas interpréter ces chiffres comme une capacité disponible.

## Source et périmètre

L'analyse utilise `public/data/sibra-schedule.json` et `public/data/sibra.json`, produits
à partir de l'édition GTFS SIBRA du **6 novembre 2026**. L'archive source, sa licence ODbL
et les conditions particulières du Point d'accès national, sa période de validité et la
méthode d'import sont précisées dans [données SIBRA](sibra-data.md). Pour reproduire
exactement les chiffres ci-dessous, les fichiers utilisés ont ces empreintes SHA-256 :

- `sibra.json` : `26a6b1fce8460a3e43f29114f1b56936b4e725c819fe31c7ebab71d02b58afc9` ;
- `sibra-schedule.json` : `af9ba49c92d137079a8e945ababd5c4fbcba497cdf7bb3d407e1d0b01f3e4482`.

Le script vérifie ces deux empreintes avant toute analyse, y compris pour les chemins
alternatifs `--horaires` et `--reseau`. Une édition différente exige une révision
explicite des sources, de la période et des empreintes ; un calendrier modifié ne peut
pas être interprété silencieusement comme une journée sans service.

Les arrêts sont `0:1TRE` et `0:2TRE`, deux points d'arrêt Trésum, pas les entrées du
parking. Les identifiants de direction GTFS ne sont comparables qu'au sein de chaque
ligne : les destinations sont indiquées par variante. La période analysée est le jour de
service GTFS du **17 novembre 2026**, de **08:00 inclus à 09:00 exclu**, en fuseau
`Europe/Paris`.

| Arrêt GTFS | Ligne | Direction GTFS | Destination de la variante | Passages théoriques |
| --- | --- | --- | --- | --- |
| `0:1TRE` | 27 | 0 | PETITE JEANNE | 08:19:14, 08:50:00 |
| `0:2TRE` | 26 | 1 | VIGNIERES | 08:16:12 |
| `0:2TRE` | 27 | 1 | SEYNOD PISCINE | 08:08:06, 08:44:55 |

Ces résultats décrivent cet horaire statique, non des passages observés ; ils ne se
généralisent pas à d'autres dates, aux retards ou aux perturbations. Une ligne absente du
tableau n'a aucun passage dans le créneau demandé selon cette édition ; elle n'est pas
nécessairement absente du réseau ou du reste de la journée.

## Reproduction

Depuis la racine du dépôt :

```sh
python3 scripts/analyse_tresums_gtfs.py --date 2026-11-17 --debut 08:00 --fin 09:00
python3 -m unittest discover -s scripts/tests -p 'test_analyse_tresums_gtfs.py' -v
```

La sortie JSON regroupe par arrêt, ligne, direction et variante et donne les heures en
secondes depuis le début du jour de service. Un tableau vide signifie qu'aucun passage
n'a été trouvé dans un jour couvert ; une date hors couverture ou des données requises
absentes provoquent une erreur. Une date couverte sans entrée dans `serviceDates`
correspond à un jour sans service dans ce format, selon l'importeur du dépôt.

Les heures après minuit peuvent dépasser `24:00`. Par exemple, `25:00` appartient au
jour de service demandé et représente 01:00 le lendemain. Une analyse par date civile
doit aussi interroger la fin du jour de service précédent : le script ne l'ajoute pas
automatiquement. Aucune valeur obtenue ici ne doit être ajoutée automatiquement comme
fréquentation mesurée ou hypothèse locale du scénario.
