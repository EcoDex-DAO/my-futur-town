# Validation — 28 novembre 2026

- Build Next.js de production réussi ; suite Vitest : 45 fichiers, 236 tests réussis.
- Parcours simple et conflits de capacité vérifiés en navigateur à 1440 et 390 px ; conservation au rechargement et protection contre une écriture concurrente.
- Création et reprise d’un polygone libre aux deux formats, sélection cadastrale et conflit entre onglets vérifiés en navigateur : six tests réussis.
- Les tests de migration de capacité, d’accès et de zones sont inclus dans la suite Vitest. Les tests géométriques disposent d’un délai de 120 secondes car plusieurs calculs prennent plus de 30 secondes sur cette machine ; ils conservent leurs assertions.
- Les captures emploient un fond de carte simplifié et des données de test ; elles documentent le panneau, pas la précision du fond réel. Le chargement initial de la carte est attendu avant de cliquer pour éviter les interactions avant hydratation.

Les étapes 3 à 7 de #59 et la validation du projet réel restent hors de cette tranche.
