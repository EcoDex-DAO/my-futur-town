# Modèle de données

- **Référence** : édition immuable, calendrier et courses par service, géométries et arrêts.
- **Entrée horaire** : date de service, ligne, variante, sens, départ, arrêts et offsets ; une entrée GTFS identifie aussi son modèle et doit encore lui correspondre.
- **Course résolue** : origine et date, horaires et géométrie ; une course invalide figure dans les omissions motivées, jamais en zéro.
- **Modèle de flotte** : identifiant, réseau, catégorie, année, gabarit, motorisation, effectif, indisponibilité, compatibilité et provenance ; champs absents inconnus.
- **Hypothèse** : valeur et unité, catégorie d'origine, état de vérification, URL, organisme, date, périmètre, méthode et limites. Une saisie ne reprend pas automatiquement la source initiale.
- **Bilan** : période, périmètre, couverture, méthode, distances et impacts par énergie ; comparaison autorisée uniquement si ces dimensions sont communes.
