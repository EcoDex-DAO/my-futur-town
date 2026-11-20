# Validation

- Données locales : 27 lignes, 5 309 courses ; chaque course référence une variante de sa ligne avec au moins deux points. La présence d'une forme ne garantit pas son exactitude géographique.
- Tests unitaires : simulation de plusieurs lignes cochées, exclusion des lignes masquées, temps d'arrêt et réduction selon le temps disponible, course commencée la veille, disparition à l'arrivée et absence de service.
- Mesure indicative sous Node 22 sur cette machine, toutes les lignes, 13 novembre 2026 à 08 h, 104 bus : premier calcul 462 ms ; 100 calculs suivants, médiane 2,5 ms, 95e percentile 10,8 ms, maximum 17 ms. Cela mesure le moteur seul, pas le chargement, le rendu MapLibre ni un appareil mobile ; les résultats varient selon la machine.
- Parcours mobile 390 × 844 automatisé sans API : période, arrêt réglable, démarrage, pause et absence de service vérifiés. Il s'agit d'une émulation sur cette machine, pas d'un téléphone physique.
- La validation bureau et les résultats définitifs figurent dans la pull request.
