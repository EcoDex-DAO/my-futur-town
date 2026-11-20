# Validation en cours

- 120 tests unitaires réussis, y compris lecture du format historique, rechargement des variantes et génération des tracés.
- Build Next.js réussi ; vérification TypeScript réussie.
- Inspection Orca du panneau sur carte réelle en 839 × 659 et 390 × 844 : le menu se ferme à l'ouverture, le panneau et l'avertissement restent visibles. Cela ne valide pas encore le parcours entier.
- L’échec de stockage a été testé dans le navigateur : message affiché et ancienne ligne inchangée.
- Les essais automatisés de bout en bout utilisent une réponse de routage simulée. Sur ordinateur, un arrêt placé entre les terminus est apparu et la sauvegarde est devenue disponible, mais le parcours a dépassé le délai de test avant la sauvegarde et la réouverture. Sur mobile, l’essai a été interrompu pendant le chargement de la carte. Ces essais sont à terminer et ne prouvent pas la praticabilité routière. Le défaut #44 reste ouvert.
