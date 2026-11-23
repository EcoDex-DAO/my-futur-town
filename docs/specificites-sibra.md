# Particularités horaires SIBRA : recherche en cours

Consultation le 23 novembre 2026. Le [relevé par ligne et variante](inventaire-sibra-2026.md) contient les liens vers les fiches SIBRA consultées et les parcours observés dans l'édition GTFS du 6 novembre 2026. Le GTFS, limité au 4 novembre–20 décembre 2026, décrit une offre planifiée et non des courses réellement exploitées.

## Premiers cas identifiés dans les fiches

- [Ligne 1, fiche valable à partir du 19 octobre 2026](https://www.sibra.fr/app/uploads/2026/10/DH_1_BD2_19102026.pdf) : la note `**` indique un parcours dominical et férié limité entre Poisy Collège et Campus. Le GTFS contient plusieurs parcours avec des terminus Campus, Lycée de Poisy ou Meythet Le Rabelais. La correspondance de chaque horaire imprimé reste à vérifier ; ne pas supposer que chaque course vers Campus porte la même note.
- [Ligne 2](https://www.sibra.fr/app/uploads/2026/10/DH_2_BD2_19102026.pdf) : une note distingue notamment les terminus Pringy-Gare et La Salle Pringy selon le sens.
- [Ligne 15](https://www.sibra.fr/app/uploads/2026/07/DH_15_BD_01092026_web.pdf) : la fiche distingue les services 15A et 15B, ainsi que des courses limitées aux mercredis ou aux jours scolaires.
- [Ligne 41](https://www.sibra.fr/app/uploads/2026/07/DH_41_BD_31082026_web.pdf) : les mercredis scolaires ont un tableau distinct des autres jours indiqués et des mercredis de vacances. La note `b` indique une course sans l'arrêt Les Balmettes ; le GTFS épinglé contient des variantes avec et sans cet arrêt, mais l'association de chaque note imprimée à une course reste à vérifier.

## Situation dans le logiciel

Le scénario de référence conserve les dates, courses, variantes et horaires de passage importés, ainsi que les parcours et temps de chaque course. Un tableau hebdomadaire de scénario remplace les départs de sa variante pour les dates correspondantes ; il ne préserve pas automatiquement les différences entre plusieurs lundis ou mercredis ni les temps propres à chaque course. Après copie d'une date GTFS, l'interface signale désormais les autres dates couvertes du même type qui ont des départs différents pour cette variante. Cet avertissement ne compare pas les temps intermédiaires ni les autres variantes.

Les annotations restent non interprétées par défaut. Si l’utilisateur confirme explicitement qu’une annotation ne fait que limiter les jours et la date de fin, ces conditions sont appliquées aux courses, aux arrêts, à la simulation et au bilan. Pour une ligne GTFS, il peut aussi choisir explicitement une course du même sens et du même arrêt de départ comme modèle alternatif : ses arrêts, sa géométrie et ses durées remplacent alors ceux du parcours principal pour ce départ. Les éventuelles limites de jours et de date sont appliquées. La signature du modèle est conservée : s'il change ou disparaît, le départ est signalé et le bilan est partiel. Les codes dont l'effet n'a pas été confirmé restent signalés ; aucun rapprochement automatique avec une fiche n'est supposé.

## À poursuivre

Lire chaque fiche et vérifier visuellement ses légendes, dates de validité et renvois aux colonnes ; rapprocher chaque particularité des courses et dates GTFS correspondantes, avec preuves et cas absents. Préserver les différences par date et les temps de chaque course lors de l'édition ; étendre les parcours alternatifs aux lignes créées et aux cas sans modèle GTFS compatible. Les déviations et suppressions en temps réel ne sont pas contenues dans le GTFS statique épinglé. Aucune exhaustivité n'est revendiquée à ce stade.
