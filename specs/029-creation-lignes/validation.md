# Validation en cours

- 120 tests unitaires réussis, y compris lecture du format historique, rechargement des variantes et génération des tracés.
- Build Next.js réussi ; vérification TypeScript réussie.
- Inspection Orca du panneau sur carte réelle en 839 × 659 et 390 × 844 : le menu se ferme à l'ouverture, le panneau et l'avertissement restent visibles. Cela ne valide pas encore le parcours entier.
- Les essais automatisés de bout en bout utilisent une réponse de routage simulée. Sur ordinateur, le parcours a atteint les arrêts, mais le placement au centre était hors du tracé après cadrage ; la sauvegarde et la réouverture ne sont pas validées. Sur mobile, l’essai a été interrompu pendant le chargement de la carte. Ces essais sont à terminer et ne prouvent pas la praticabilité routière. Le défaut #44 reste ouvert.
