# Inventaire des parcours SIBRA du GTFS épinglé

Généré avec `python3 scripts/inventaire_sibra.py`. Source : édition SIBRA du 6 novembre 2026, du 2026-11-04 au 2026-12-20 ; 27 lignes, horaires planifiés, pas d'observation réelle. [Archive officielle](https://transport-data-gouv-fr-resource-history-prod.cellar-c2.services.clever-cloud.com/80100/80100.20261106.081009.206313.zip). Voir [provenance et licence](sibra-data.md).

Chaque variante ci-dessous correspond à une combinaison GTFS de forme, destination et séquence d'arrêts ; une différence de variante ne prouve pas à elle seule une annotation imprimée. Les courses comptées sont les modèles du fichier, pas le nombre annuel de voyages. Les profils journaliers comparent les départs et parcours de la ligne : plusieurs profils un même jour de semaine indiquent que trois tableaux génériques ne reproduisent pas nécessairement toute la période.

Les codes des fiches, les motifs, perturbations et services à la demande ne peuvent pas tous être déduits du GTFS. Les fiches doivent être lues et recoupées avec les mêmes dates ; aucune équivalence automatique entre un code imprimé et une variante n'est supposée.

## Ligne 1

[Fiche horaire SIBRA](https://www.sibra.fr/app/uploads/2026/10/DH_1_BD2_19102026.pdf) ; lien consulté le 23 novembre 2026. Son examen exhaustif et sa correspondance avec les courses GTFS restent à valider.

561 modèles de course ; 10 variantes. Profils distincts pour un même jour de semaine : mer. : 2.

- PARC DES GLAISINS → POISY COLLEGE ; 200 modèles ; 41 arrêts ; variante `1:7b423278b7066ef3`.
- POISY COLLEGE → PARC DES GLAISINS ; 195 modèles ; 40 arrêts ; variante `1:b691f45246f4189d`.
- POISY COLLEGE → CAMPUS ; 34 modèles ; 33 arrêts ; variante `1:118c58c8e3838c25`.
- CAMPUS → POISY COLLEGE ; 28 modèles ; 33 arrêts ; variante `1:0e8844540fdaacaa`.
- LYCEE DE POISY → PARC DES GLAISINS ; 28 modèles ; 40 arrêts ; variante `1:4ed6f81557f24da2`.
- PARC DES GLAISINS → LYCEE DE POISY ; 26 modèles ; 42 arrêts ; variante `1:52d6439cdcd305a7`.
- PARC DES GLAISINS → MEYTHET LE RABELAIS ; 15 modèles ; 33 arrêts ; variante `1:d1f46b7b87a125e9`.
- MEYTHET LE RABELAIS → CAMPUS ; 14 modèles ; 25 arrêts ; variante `1:df2f74d0f512295b`.
- CAMPUS → MEYTHET LE RABELAIS ; 11 modèles ; 25 arrêts ; variante `1:60cba4fe9703021a`.
- MEYTHET LE RABELAIS → PARC DES GLAISINS ; 10 modèles ; 32 arrêts ; variante `1:67e272467cd93ef4`.

## Ligne 10

[Fiche horaire SIBRA](https://www.sibra.fr/app/uploads/2026/07/DH_10_BD_31082026_web.pdf) ; lien consulté le 23 novembre 2026. Son examen exhaustif et sa correspondance avec les courses GTFS restent à valider.

297 modèles de course ; 3 variantes. Profils distincts pour un même jour de semaine : mer. : 2.

- VIGNIERES → GRAND EPAGNY ; 150 modèles ; 35 arrêts ; variante `10:3d8c3ee0f1497dae`.
- GRAND EPAGNY → VIGNIERES ; 129 modèles ; 36 arrêts ; variante `10:e2a885792e04a1be`.
- GRAND EPAGNY → VIGNIERES ; 18 modèles ; 36 arrêts ; variante `10:fd90d7555e854a86`.

## Ligne 11

[Fiche horaire SIBRA](https://www.sibra.fr/app/uploads/2026/07/DH_11_BD_31082026_web.pdf) ; lien consulté le 23 novembre 2026. Son examen exhaustif et sa correspondance avec les courses GTFS restent à valider.

237 modèles de course ; 2 variantes. Profils distincts pour un même jour de semaine : mer. : 2.

- LA SALLE PRINGY → SEYNOD POLYNOME ; 119 modèles ; 27 arrêts ; variante `11:7a8d840227fafc30`.
- SEYNOD POLYNOME → LA SALLE PRINGY ; 118 modèles ; 26 arrêts ; variante `11:dd19411e9945a9bc`.

## Ligne 12

[Fiche horaire SIBRA](https://www.sibra.fr/app/uploads/2026/07/DH_12_BD_31082026_web.pdf) ; lien consulté le 23 novembre 2026. Son examen exhaustif et sa correspondance avec les courses GTFS restent à valider.

308 modèles de course ; 5 variantes. Profils distincts pour un même jour de semaine : mer. : 2.

- CHAVANOD STADE → PISCINE-PATINOIRE ; 140 modèles ; 26 arrêts ; variante `12:cddfd690aef8dbd4`.
- PISCINE-PATINOIRE → CHAVANOD STADE ; 129 modèles ; 25 arrêts ; variante `12:ec8c106bacf3116b`.
- CAPITAINE ANJOT → PISCINE-PATINOIRE ; 18 modèles ; 17 arrêts ; variante `12:b92718d6d45145b8`.
- PISCINE-PATINOIRE → CAPITAINE ANJOT ; 17 modèles ; 16 arrêts ; variante `12:b2d49efcd9ef7eef`.
- PISCINE-PATINOIRE → CAPITAINE ANJOT ; 4 modèles ; 16 arrêts ; variante `12:393567ab4ad5ae1e`.

## Ligne 13

[Fiche horaire SIBRA](https://www.sibra.fr/app/uploads/2026/09/DH_13_BD2_21092026.pdf) ; lien consulté le 23 novembre 2026. Son examen exhaustif et sa correspondance avec les courses GTFS restent à valider.

140 modèles de course ; 4 variantes. Profils distincts pour un même jour de semaine : mer. : 2.

- COLMYR → PISCINE-PATINOIRE ; 65 modèles ; 24 arrêts ; variante `13:6eea60ace29900e3`.
- PISCINE-PATINOIRE → COLMYR ; 63 modèles ; 23 arrêts ; variante `13:00fbcc499704b7fb`.
- COLMYR → PISCINE-PATINOIRE ; 6 modèles ; 25 arrêts ; variante `13:ac85847f038698d2`.
- PISCINE-PATINOIRE → COLMYR ; 6 modèles ; 24 arrêts ; variante `13:e5aaae99e7820cc3`.

## Ligne 14

[Fiche horaire SIBRA](https://www.sibra.fr/app/uploads/2026/07/DH_14_BD_31082026_web.pdf) ; lien consulté le 23 novembre 2026. Son examen exhaustif et sa correspondance avec les courses GTFS restent à valider.

242 modèles de course ; 2 variantes. Profils distincts pour un même jour de semaine : mer. : 2.

- PISCINE-PATINOIRE → CLINIQUE ARGONAY ; 122 modèles ; 22 arrêts ; variante `14:14fb1805080caf12`.
- CLINIQUE ARGONAY → PISCINE-PATINOIRE ; 120 modèles ; 22 arrêts ; variante `14:c7c9cb2d1030f882`.

## Ligne 15

[Fiche horaire SIBRA](https://www.sibra.fr/app/uploads/2026/07/DH_15_BD_01092026_web.pdf) ; lien consulté le 23 novembre 2026. Son examen exhaustif et sa correspondance avec les courses GTFS restent à valider.

263 modèles de course ; 5 variantes. Profils distincts pour un même jour de semaine : mer. : 2.

- GARE QUAI EST → DUINGT EGLISE ; 81 modèles ; 21 arrêts ; variante `15:aa482faade16c059`.
- DUINGT EGLISE → GARE QUAI EST ; 80 modèles ; 21 arrêts ; variante `15:887bfe315d55c2c3`.
- GARE QUAI EST → ST JORIOZ COLLEGE ; 52 modèles ; 25 arrêts ; variante `15:935c917e24907699`.
- ST JORIOZ COLLEGE → GARE QUAI EST ; 48 modèles ; 23 arrêts ; variante `15:2d2ab1069ee46317`.
- ST JORIOZ COLLEGE → GARE QUAI EST ; 2 modèles ; 15 arrêts ; variante `15:a34fd44715dad525`.

## Ligne 2

[Fiche horaire SIBRA](https://www.sibra.fr/app/uploads/2026/10/DH_2_BD2_19102026.pdf) ; lien consulté le 23 novembre 2026. Son examen exhaustif et sa correspondance avec les courses GTFS restent à valider.

557 modèles de course ; 7 variantes. Profils distincts pour un même jour de semaine : mer. : 2.

- LA SALLE PRINGY → SEYNOD VIEUGY ; 211 modèles ; 41 arrêts ; variante `2:8f6aa8bfd246c2a8`.
- SEYNOD VIEUGY → PRINGY-GARE ; 190 modèles ; 39 arrêts ; variante `2:ae9fce9540798717`.
- LA SALLE PRINGY → SEYNOD PERIAZ ; 65 modèles ; 34 arrêts ; variante `2:b81aa36194d31472`.
- SEYNOD PERIAZ → PRINGY-GARE ; 63 modèles ; 35 arrêts ; variante `2:32681e1c689bc08a`.
- SEYNOD VIEUGY → PRINGY-GARE ; 23 modèles ; 39 arrêts ; variante `2:c940829338d7c0f5`.
- GARE QUAI OUEST → SEYNOD VIEUGY ; 3 modèles ; 25 arrêts ; variante `2:6842367c2573edaa`.
- SEYNOD PERIAZ → PRINGY-GARE ; 2 modèles ; 35 arrêts ; variante `2:9ee9801e587260db`.

## Ligne 20

[Fiche horaire SIBRA](https://www.sibra.fr/app/uploads/2026/07/DH_20_BD_01092026_web.pdf) ; lien consulté le 23 novembre 2026. Son examen exhaustif et sa correspondance avec les courses GTFS restent à valider.

210 modèles de course ; 4 variantes. Profils distincts pour un même jour de semaine : mer. : 2.

- GARE QUAI SUD → TALLOIRES-M. ANGON ; 74 modèles ; 22 arrêts ; variante `20:db189d4ec9ecdb98`.
- TALLOIRES-M. ANGON → GARE QUAI NORD ; 70 modèles ; 21 arrêts ; variante `20:80c33edda5cda55c`.
- VIGNIERES → TALLOIRES-M. ANGON ; 33 modèles ; 18 arrêts ; variante `20:0c290bbce9194cce`.
- TALLOIRES-M. ANGON → VIGNIERES ; 33 modèles ; 17 arrêts ; variante `20:ac0609b1e82ff553`.

## Ligne 21

[Fiche horaire SIBRA](https://www.sibra.fr/app/uploads/2026/07/DH_21_BD_31082026_web.pdf) ; lien consulté le 23 novembre 2026. Son examen exhaustif et sa correspondance avec les courses GTFS restent à valider.

159 modèles de course ; 6 variantes. Profils distincts pour un même jour de semaine : mer. : 2.

- MEYTHET LE RABELAIS → GRANDE FERME ; 75 modèles ; 38 arrêts ; variante `21:f4fe54178169f736`.
- GRANDE FERME → MEYTHET LE RABELAIS ; 74 modèles ; 38 arrêts ; variante `21:cd02a772bee9a729`.
- MEYTHET LE RABELAIS → FERRIERES ; 3 modèles ; 43 arrêts ; variante `21:b5a577058b298e22`.
- FERRIERES → MEYTHET LE RABELAIS ; 3 modèles ; 43 arrêts ; variante `21:cb87d446df7a8eb7`.
- GRANDE FERME → MEYTHET LE RABELAIS ; 2 modèles ; 39 arrêts ; variante `21:919f0e18c8a21503`.
- MEYTHET LE RABELAIS → GRANDE FERME ; 2 modèles ; 39 arrêts ; variante `21:feb977f8c5b2ccbc`.

## Ligne 22

[Fiche horaire SIBRA](https://www.sibra.fr/app/uploads/2026/07/DH_22_BD_31082026_web.pdf) ; lien consulté le 23 novembre 2026. Son examen exhaustif et sa correspondance avec les courses GTFS restent à valider.

108 modèles de course ; 5 variantes. Profils distincts pour un même jour de semaine : mer. : 2.

- POISY MOIRY → MEYTHET LE RABELAIS ; 39 modèles ; 14 arrêts ; variante `22:9c3f214e7532eb18`.
- MEYTHET LE RABELAIS → POISY MOIRY ; 36 modèles ; 15 arrêts ; variante `22:ca49565056331393`.
- MEYTHET LE RABELAIS → LOVAGNY ; 17 modèles ; 16 arrêts ; variante `22:759ef753b5b29935`.
- LOVAGNY → MEYTHET LE RABELAIS ; 14 modèles ; 15 arrêts ; variante `22:157865bbeee40353`.
- LOVAGNY → POISY ; 2 modèles ; 6 arrêts ; variante `22:16a3667fd8f0990c`.

## Ligne 23

[Fiche horaire SIBRA](https://www.sibra.fr/app/uploads/2026/07/DH_23_BD_31082026_web.pdf) ; lien consulté le 23 novembre 2026. Son examen exhaustif et sa correspondance avec les courses GTFS restent à valider.

191 modèles de course ; 13 variantes. Profils distincts pour un même jour de semaine : mer. : 2.

- QUINTAL LA FRUITIERE → CAPITAINE ANJOT ; 43 modèles ; 19 arrêts ; variante `23:7f4c76cb0cde0f70`.
- CAPITAINE ANJOT → BALMONT ; 41 modèles ; 23 arrêts ; variante `23:5eecf1dbbae58e35`.
- CAPITAINE ANJOT → QUINTAL LA FRUITIERE ; 39 modèles ; 20 arrêts ; variante `23:64a84b5049872b9f`.
- BALMONT → CAPITAINE ANJOT ; 35 modèles ; 22 arrêts ; variante `23:d1bb202172cf6f92`.
- SEYNOD VIEUGY → QUINTAL LA FRUITIERE ; 7 modèles ; 5 arrêts ; variante `23:de59b8ee68930af8`.
- QUINTAL LA FRUITIERE → SEYNOD VIEUGY ; 5 modèles ; 5 arrêts ; variante `23:ad4b4a55424396f5`.
- BALMONT → CAPITAINE ANJOT ; 5 modèles ; 22 arrêts ; variante `23:c13d2b33b4cbfc97`.
- BALMONT → SEYNOD VIEUGY ; 4 modèles ; 11 arrêts ; variante `23:74aebcf4e9d01863`.
- QUINTAL LA FRUITIERE → SAINT JEAN ; 3 modèles ; 15 arrêts ; variante `23:34fe068c8709b0a4`.
- SAINT JEAN → QUINTAL LA FRUITIERE ; 3 modèles ; 15 arrêts ; variante `23:cdada311f44bcbb7`.
- SAINT JEAN → BALMONT ; 2 modèles ; 18 arrêts ; variante `23:2076176b0c38f4fd`.
- SEYNOD VIEUGY → BALMONT ; 2 modèles ; 11 arrêts ; variante `23:53f65cee2f781f74`.
- BALMONT → SAINT JEAN ; 2 modèles ; 18 arrêts ; variante `23:e771ced4d3841dac`.

## Ligne 24

[Fiche horaire SIBRA](https://www.sibra.fr/app/uploads/2026/07/DH_24_BD_31082026_web.pdf) ; lien consulté le 23 novembre 2026. Son examen exhaustif et sa correspondance avec les courses GTFS restent à valider.

126 modèles de course ; 2 variantes. Profils distincts pour un même jour de semaine : mer. : 2.

- POISY COLLEGE → TUILERIE ; 63 modèles ; 10 arrêts ; variante `24:560c65dccd9d1404`.
- TUILERIE → POISY COLLEGE ; 63 modèles ; 10 arrêts ; variante `24:712b202bf062955d`.

## Ligne 25

[Fiche horaire SIBRA](https://www.sibra.fr/app/uploads/2026/07/DH_25_BD_31082026_web.pdf) ; lien consulté le 23 novembre 2026. Son examen exhaustif et sa correspondance avec les courses GTFS restent à valider.

117 modèles de course ; 2 variantes. Profils distincts pour un même jour de semaine : mer. : 2.

- EPAGNY METZ-TESSY → GLAISINS ; 60 modèles ; 19 arrêts ; variante `25:f2407ea6c0e17880`.
- GLAISINS → EPAGNY METZ-TESSY ; 57 modèles ; 19 arrêts ; variante `25:7347149b5d47cb34`.

## Ligne 26

[Fiche horaire SIBRA](https://www.sibra.fr/app/uploads/2026/07/DH_26_BD_31082026_web.pdf) ; lien consulté le 23 novembre 2026. Son examen exhaustif et sa correspondance avec les courses GTFS restent à valider.

54 modèles de course ; 2 variantes. Profils distincts pour un même jour de semaine : mer. : 2.

- VIGNIERES → VISITATION ; 27 modèles ; 25 arrêts ; variante `26:ecc80677e6ff7f8a`.
- VISITATION → VIGNIERES ; 27 modèles ; 25 arrêts ; variante `26:ed4f61aee7af6817`.

## Ligne 27

[Fiche horaire SIBRA](https://www.sibra.fr/app/uploads/2026/07/DH_27_BD_31082026_web.pdf) ; lien consulté le 23 novembre 2026. Son examen exhaustif et sa correspondance avec les courses GTFS restent à valider.

128 modèles de course ; 2 variantes. Profils distincts pour un même jour de semaine : mer. : 2.

- SEYNOD PISCINE → PETITE JEANNE ; 66 modèles ; 28 arrêts ; variante `27:55e59d4390c36b98`.
- PETITE JEANNE → SEYNOD PISCINE ; 62 modèles ; 27 arrêts ; variante `27:5fb9b10241b2426b`.

## Ligne 28

[Fiche horaire SIBRA](https://www.sibra.fr/app/uploads/2026/08/DH_28_BD2_31082026.pdf) ; lien consulté le 23 novembre 2026. Son examen exhaustif et sa correspondance avec les courses GTFS restent à valider.

24 modèles de course ; 7 variantes. Profils distincts pour un même jour de semaine : mer. : 2.

- EGLISE DES BRESSIS → ALTAIS ; 6 modèles ; 21 arrêts ; variante `28:6aa35abaf91ce7e3`.
- ALTAIS → EGLISE DES BRESSIS ; 6 modèles ; 21 arrêts ; variante `28:9766af859b834caf`.
- ALTAIS → CHAVANOD STADE ; 4 modèles ; 9 arrêts ; variante `28:3ff854bc12ef87f5`.
- EGLISE DES BRESSIS → ALTAIS ; 2 modèles ; 22 arrêts ; variante `28:770cfa5d614d192c`.
- CHAVANOD STADE → ALTAIS ; 2 modèles ; 10 arrêts ; variante `28:8e89492f9df0400a`.
- ALTAIS → EGLISE DES BRESSIS ; 2 modèles ; 20 arrêts ; variante `28:ba5b11d3d390f1ef`.
- CHAVANOD STADE → ALTAIS ; 2 modèles ; 11 arrêts ; variante `28:de71523ffc10fbc6`.

## Ligne 3

[Fiche horaire SIBRA](https://www.sibra.fr/app/uploads/2026/10/DH_3_BD2_19102026.pdf) ; lien consulté le 23 novembre 2026. Son examen exhaustif et sa correspondance avec les courses GTFS restent à valider.

507 modèles de course ; 4 variantes. Profils distincts pour un même jour de semaine : mer. : 2.

- CHAVANOD - FIER → NOVEL ; 157 modèles ; 32 arrêts ; variante `3:16ef35b671336118`.
- NOVEL → CHAVANOD - FIER ; 153 modèles ; 31 arrêts ; variante `3:8b57e7a3df2a6ba7`.
- NOVEL → GEVRIER ; 101 modèles ; 21 arrêts ; variante `3:3e8bbdf3e9a84de5`.
- GEVRIER → NOVEL ; 96 modèles ; 21 arrêts ; variante `3:028cb91ee387b1d7`.

## Ligne 30

[Fiche horaire SIBRA](https://www.sibra.fr/app/uploads/2026/09/DH_30_BD2_07092026_web.pdf) ; lien consulté le 23 novembre 2026. Son examen exhaustif et sa correspondance avec les courses GTFS restent à valider.

50 modèles de course ; 4 variantes. Profils distincts pour un même jour de semaine : mer. : 2.

- PONCHY → GDES VIGNES LA BALME ; 18 modèles ; 28 arrêts ; variante `30:a658c9e4fc089b43`.
- GDES VIGNES LA BALME → PONCHY ; 16 modèles ; 28 arrêts ; variante `30:83b87c98121d7d4f`.
- LA SALLE PRINGY → GDES VIGNES LA BALME ; 8 modèles ; 19 arrêts ; variante `30:5b849d6a3fb635a1`.
- GDES VIGNES LA BALME → LA SALLE PRINGY ; 8 modèles ; 18 arrêts ; variante `30:77578e581ec324f3`.

## Ligne 4

[Fiche horaire SIBRA](https://www.sibra.fr/app/uploads/2026/07/DH_4_BD_31082026_web.pdf) ; lien consulté le 23 novembre 2026. Son examen exhaustif et sa correspondance avec les courses GTFS restent à valider.

384 modèles de course ; 2 variantes. Profils distincts pour un même jour de semaine : mer. : 2.

- CAMPUS → SEYNOD NEIGEOS ; 193 modèles ; 40 arrêts ; variante `4:1e0363a3d0f3fe01`.
- SEYNOD NEIGEOS → CAMPUS ; 191 modèles ; 40 arrêts ; variante `4:9fa12a8852d05abe`.

## Ligne 40

[Fiche horaire SIBRA](https://www.sibra.fr/app/uploads/2026/07/DH_40_BD_31082026_web.pdf) ; lien consulté le 23 novembre 2026. Son examen exhaustif et sa correspondance avec les courses GTFS restent à valider.

107 modèles de course ; 6 variantes. Profils distincts pour un même jour de semaine : mer. : 2.

- ENTRELACS GARE ALB → ANNECY GARE ; 36 modèles ; 16 arrêts ; variante `40:f1902c3611737571`.
- ANNECY GARE → ENTRELACS GARE ALB ; 32 modèles ; 16 arrêts ; variante `40:1c67c3adad233918`.
- CUSY - LACHAT → ANNECY GARE ; 11 modèles ; 21 arrêts ; variante `40:583ce4a78b51ef92`.
- ANNECY GARE → CUSY - LACHAT ; 11 modèles ; 21 arrêts ; variante `40:ae94682b1d72e488`.
- ENTRELACS GARE ALB → ANNECY GARE ; 9 modèles ; 5 arrêts ; variante `40:10c239ee4e081ca7`.
- ANNECY GARE → ENTRELACS GARE ALB ; 8 modèles ; 5 arrêts ; variante `40:bac89297ece1428a`.

## Ligne 41

[Fiche horaire SIBRA](https://www.sibra.fr/app/uploads/2026/07/DH_41_BD_31082026_web.pdf) ; lien consulté le 23 novembre 2026. Son examen exhaustif et sa correspondance avec les courses GTFS restent à valider.

12 modèles de course ; 4 variantes. Profils distincts pour un même jour de semaine : mer. : 2.

- LE CHATELARD → ANNECY GARE ; 5 modèles ; 24 arrêts ; variante `41:4d9460f51757a73d`.
- ANNECY GARE → LE CHATELARD ; 4 modèles ; 24 arrêts ; variante `41:f37dfd258777703b`.
- ANNECY GARE → LE CHATELARD ; 2 modèles ; 23 arrêts ; variante `41:d128510a2122bdf8`.
- LE CHATELARD → ANNECY GARE ; 1 modèles ; 23 arrêts ; variante `41:19204385e7414bcc`.

## Ligne 42

[Fiche horaire SIBRA](https://www.sibra.fr/app/uploads/2026/07/DH_42_BD_31082026_web.pdf) ; lien consulté le 23 novembre 2026. Son examen exhaustif et sa correspondance avec les courses GTFS restent à valider.

12 modèles de course ; 2 variantes. Profils distincts pour un même jour de semaine : mer. : 2.

- ANNECY GARE → RUMILLY GARE SNCF ; 6 modèles ; 22 arrêts ; variante `42:89882b74700d800b`.
- RUMILLY GARE SNCF → ANNECY GARE ; 6 modèles ; 22 arrêts ; variante `42:b49de7151ee9ed4a`.

## Ligne 5

[Fiche horaire SIBRA](https://www.sibra.fr/app/uploads/2026/07/DH_5_BD_31082026_web.pdf) ; lien consulté le 23 novembre 2026. Son examen exhaustif et sa correspondance avec les courses GTFS restent à valider.

357 modèles de course ; 2 variantes. Profils distincts pour un même jour de semaine : mer. : 2.

- PISCINE-PATINOIRE → GLAISINS ; 181 modèles ; 39 arrêts ; variante `5:82a3394905f397a1`.
- GLAISINS → PISCINE-PATINOIRE ; 176 modèles ; 39 arrêts ; variante `5:4b5db54fcb4c7b10`.

## Ligne 80

[Fiche horaire SIBRA](https://www.sibra.fr/app/uploads/2026/07/DH_80_BD_31082026_web.pdf) ; lien consulté le 23 novembre 2026. Son examen exhaustif et sa correspondance avec les courses GTFS restent à valider.

66 modèles de course ; 2 variantes. Profils distincts pour un même jour de semaine : mer. : 2.

- GROISY → PISCINE-PATINOIRE ; 33 modèles ; 25 arrêts ; variante `80:1e0743712e82726a`.
- PISCINE-PATINOIRE → GROISY ; 33 modèles ; 25 arrêts ; variante `80:5d406688ccc7181d`.

## Ligne 81

[Fiche horaire SIBRA](https://www.sibra.fr/app/uploads/2026/07/DH_81_BD_31082026_web.pdf) ; lien consulté le 23 novembre 2026. Son examen exhaustif et sa correspondance avec les courses GTFS restent à valider.

14 modèles de course ; 2 variantes. Profils distincts pour un même jour de semaine : mer. : 2.

- AVIERNOZ CHEF LIEU → ANNECY GARE ; 8 modèles ; 18 arrêts ; variante `81:060b134bc280bcc4`.
- ANNECY GARE → AVIERNOZ CHEF LIEU ; 6 modèles ; 18 arrêts ; variante `81:a9fc61533f338b31`.

## Ligne 82

[Fiche horaire SIBRA](https://www.sibra.fr/app/uploads/2026/07/DH_82_BD_31082026_web.pdf) ; lien consulté le 23 novembre 2026. Son examen exhaustif et sa correspondance avec les courses GTFS restent à valider.

78 modèles de course ; 4 variantes. Profils distincts pour un même jour de semaine : mer. : 2.

- GROISY GARE → ANNECY GARE ; 22 modèles ; 32 arrêts ; variante `82:17b668efa2c9b4a2`.
- ANNECY GARE → GROISY GARE ; 22 modèles ; 32 arrêts ; variante `82:231f7c6000896c31`.
- PONCHY → GROISY GARE ; 18 modèles ; 25 arrêts ; variante `82:74ebc8cbd7fc30e3`.
- GROISY GARE → PONCHY ; 16 modèles ; 25 arrêts ; variante `82:748aa70b895d44a5`.
