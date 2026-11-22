# Validation

1. Installer les dépendances avec `corepack pnpm install --frozen-lockfile`, puis lancer `corepack pnpm test` et `corepack pnpm build`.
2. Sur un port isolé, ouvrir la carte sur ordinateur et mobile ; vérifier aussi l'absence d'API.
3. Comparer référence et scénario identique, puis modifier séparément un parcours, un horaire et une motorisation. Contrôler kilomètres et impacts sur la même période.
4. Simuler une ligne créée et sa variante, un départ après minuit, un jour sans service et un horaire devenu invalide.
5. Contrôler la pointe et la disponibilité agrégée avec effectif inconnu, zéro et périmètres séparés.
6. Recharger ; tester JSON illisible, échec de stockage et conflit de deux onglets sans perte des valeurs.
7. Parcourir au clavier les informations de provenance et vérifier légende, dates, unités, limites et distinction estimation/mesure.
