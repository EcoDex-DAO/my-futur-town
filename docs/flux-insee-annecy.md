# Déplacements domicile-travail : contexte communal d'Annecy

La base [Mobilités professionnelles en 2022](https://www.insee.fr/fr/statistiques/8582949)
de l'INSEE décrit les actifs occupés âgés de 15 ans ou plus selon leur commune de résidence
et leur lieu de travail. Elle est publiée le 26 juin 2025 en géographie au 1er janvier 2025.
L'analyse concerne la commune nouvelle d'Annecy, code `74010`, et non le secteur des Trésums.
Les valeurs sont des effectifs estimés issus du recensement, **pas des comptages de trajets**.
Les salariés résidant à l'étranger ne figurent pas parmi les résidents recensés dans ce fichier.

## Ordres de grandeur

Les sommes ci-dessous portent sur les lignes du fichier en distinguant strictement les trois
catégories ; les flux internes ne sont ajoutés ni aux entrants ni aux sortants. Les valeurs
sont arrondies à l'unité pour la lecture après la somme des décimales fournies par la source.
Cette précision d'affichage ne représente pas une précision de mesure.

| Résidence → lieu de travail | Effectif estimé |
| --- | ---: |
| Annecy → Annecy | 39 651 |
| Hors Annecy → Annecy | 34 663 |
| Annecy → hors Annecy | 22 343 |

Les principaux lieux de résidence pour les actifs entrants comprennent Rumilly (1 901),
Poisy (1 853) et Épagny Metz-Tessy (1 751). Pour les sortants, les principales destinations
listées comprennent Genève (`SUC1L`, 4 648), Épagny Metz-Tessy (2 638) et Argonay (1 185).
Les valeurs sont des estimations arrondies. Les entrées et sorties concernent le périmètre
de la source, y compris les destinations à l'étranger présentes dans le fichier.

L'INSEE précise que les flux de moins de 200 doivent être considérés comme des ordres de
grandeur. Les dates d'enquête des communes peuvent différer. Ces statistiques n'identifient
ni les usagers du parking, ni la part de voiture, ni l'heure, ni le nombre de trajets
quotidiens ou les visiteurs. Elles ne doivent pas alimenter automatiquement un scénario bus
ou être interprétées comme un report modal. Elles servent à situer les échanges communaux.

## Reproduction et provenance

Source : Insee, recensement de la population, exploitation complémentaire, base flux de
mobilité domicile-travail 2022, publiée le 26 juin 2025. Sauf mention contraire, la
[Licence Ouverte 2.0](https://www.insee.fr/fr/information/2008466) s'applique aux données
publiques diffusées sur le site ; conserver la source, sa date et le sens des informations.
Le fichier source n'est pas redistribué dans ce dépôt.

Depuis la racine du dépôt, avec Python 3 :

```sh
curl -fL -o /tmp/tresums-insee-2022.zip https://www.insee.fr/fr/statistiques/fichier/8582949/base-flux-mobilite-domicile-lieu-travail-2022_csv.zip
python3 scripts/analyse_flux_insee_tresums.py /tmp/tresums-insee-2022.zip
python3 -m unittest discover -s scripts/tests -p 'test_analyse_flux_insee_tresums.py' -v
```

SHA-256 de l'archive analysée :
`e3a4aa5907887fa08ec53ef655b76aac721928961f12bdd65713d1f8a0a4315b`.
Le script refuse une archive différente, conserve les codes géographiques en texte et
additionne les valeurs décimales avant affichage. En cas de mise à jour de la source,
examiner les changements avant de modifier l'empreinte ou de comparer les résultats.
