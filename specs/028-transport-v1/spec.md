# Transport V1 — issue #28

## Objectif et critères

- Afficher les 27 lignes SIBRA et leurs arrêts ; simuler simultanément toutes les lignes cochées, selon les courses réellement présentes dans le GTFS statique, à la date et à l'heure civiles choisies.
- Indiquer en permanence la période de validité et le fuseau, et signaler l'absence de service ou une date hors période. Une course commencée la veille peut continuer après minuit ; elle disparaît à son arrivée au terminus.
- Afficher des positions théoriques, jamais présentées comme GPS ou temps réel. Appliquer les horaires publiés et un arrêt moyen réglable (0, 5, 12 ou 20 s), limité au temps disponible sans changer les départs publiés.
- Le réseau, les contrôles et la simulation restent utilisables sur bureau et mobile et sans l'API applicative. Mesurer le coût de calcul sur le jeu complet et vérifier le rendu en navigateur.
- Les lignes créées sans horaires ne sont pas simulées et cette limite est visible. Les dates hors couverture ne sont pas extrapolées.

## Données et limites

Édition documentée dans `docs/sibra-data.md` : du 4 novembre au 20 décembre 2026, 27 lignes et 5 309 courses. Les formes GTFS sont des estimations de parcours et ne garantissent pas leur correspondance exacte à la voirie. Les lignes peuvent ne pas circuler chaque jour.
