# Validation du 20 novembre 2026

- `corepack pnpm test` : 120 tests unitaires réussis, dont la lecture du format historique et le rechargement des variantes.
- `corepack pnpm run build` : build de production et TypeScript réussis sur le commit `3f5b30e`.
- Tests Playwright ciblés réussis séparément sur ordinateur (1440 × 900) et mobile (390 × 844) : création, placement d’un arrêt sur la géométrie affichée, sauvegarde, réouverture après rechargement, création et renommage d’une variante, modification d’un arrêt sans changer celui du parcours principal.
- Test navigateur d’échec de stockage réussi : message affiché et ancienne ligne inchangée. Test navigateur d’échec de routage réussi : message affiché et aucune ligne enregistrée.
- Les tests navigateur utilisent MapLibre mais remplacent le fond cartographique externe et le réseau de référence par des données minimales. Les réponses de routage sont simulées ; le clic d’arrêt est envoyé au milieu des marqueurs des terminus. Ils ne valident ni les gestes tactiles réels, ni la géométrie du réseau OSM, ni la praticabilité des parcours.
- Inspection Orca du panneau sur fond réel en 839 × 659 et 390 × 844 : le menu se ferme à l’ouverture, le panneau et l’avertissement restent visibles. Cette inspection n’a pas couvert le parcours complet ni les gestes tactiles.
- Sur l’API réelle locale, une requête entre [6.125, 45.9] et [6.13, 45.9] a renvoyé « aucun nœud routier assez proche » sans géométrie. Aucun candidat routier réel n’a été validé.
- Le défaut de restriction de virage #44 reste ouvert. Les parcours doivent être vérifiés avant tout usage réel.
