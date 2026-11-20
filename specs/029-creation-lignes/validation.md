# Validation du 20 novembre 2026

- `corepack pnpm test` : 120 tests unitaires réussis, dont la lecture du format historique et le rechargement des variantes.
- `corepack pnpm run build` : build de production et TypeScript réussis après la correction mobile.
- Tests Playwright ciblés réussis séparément sur ordinateur (1440 × 900) et mobile (390 × 844) : création, placement d’un arrêt sur la géométrie affichée, sauvegarde, réouverture après rechargement, création et renommage d’une variante, modification d’un arrêt sans changer celui du parcours principal.
- Test navigateur d’échec de stockage réussi : message affiché et ancienne ligne inchangée. Test navigateur d’échec de routage réussi : message affiché et aucune ligne enregistrée.
- Les tests navigateur utilisent MapLibre mais remplacent le fond cartographique externe et le réseau de référence par des données minimales. Les réponses de routage sont simulées ; le clic d’arrêt est envoyé au milieu des marqueurs des terminus. Ils ne valident ni les gestes tactiles réels, ni la géométrie du réseau OSM, ni la praticabilité des parcours.
- Inspection Orca du panneau sur fond réel en 839 × 659 et 390 × 844 : le menu se ferme à l’ouverture, le panneau et l’avertissement restent visibles. Cette inspection n’a pas couvert le parcours complet ni les gestes tactiles.
- Le défaut de restriction de virage #44 reste ouvert. Les parcours doivent être vérifiés avant tout usage réel.

## Contrôle sur les données réelles

- Les points précédemment testés, `[6.125, 45.9]` et `[6.13, 45.9]`, sont dans le rectangle OSM `[45.72, 5.98, 46.06, 6.35]` (sud, ouest, nord, est), mais leurs nœuds routiers utilisables les plus proches sont à environ 56,6 m et 95,8 m. Le rayon de raccordement est de 40 m : le refus était attendu et ne démontre pas une absence de couverture de ce secteur.
- L’API réelle sur 3001 a produit une proposition de 149,7 m et 8 points entre deux nœuds de la rue de l’Annexion, `[6.1241456, 45.9020001]` et `[6.1243896, 45.9006649]`. Elle annonce notamment 26 restrictions non interprétées et un accès bus non confirmé.
- Sur ordinateur, dans Orca et sur le fond réel, deux clics près de l’hôtel de ville ont produit une proposition de 158,7 m et 14 points. Un arrêt a été ajouté, la ligne enregistrée puis rouverte après rechargement ; une variante et son arrêt ont été renommés sans modifier l’arrêt principal. L’interface signale un raccordement ambigu, les accès et les restrictions à vérifier.
- En émulation tactile Chromium 390 × 844 sur le fond et l’API réels, le premier choix de points a produit « aucun chemin complet » ; aucun tracé n’a été inventé. Deux nouveaux points ont ensuite produit une proposition de 161,9 m et 7 points ; un arrêt a été placé par toucher et la ligne enregistrée. Raccordements : 4,8 m (ambigu) et 15,6 m ; accès bus et sens non confirmés. L’essai tactile a mis en évidence un panneau qui masquait la carte ; il se réduit maintenant pendant le placement, et le cadrage s’adapte au mobile. Le test est reproductible depuis la branche avec l’aperçu sur 3001 : `corepack pnpm exec playwright test -c playwright.bus-osm.config.ts`. Il dépend du fond externe et de positions d’écran ; il ne convient pas comme test hors ligne.
- Après correction : 120 tests unitaires, build et 4 tests Playwright ciblés réussis. La [capture mobile](captures/placement-mobile.png) montre le panneau réduit sur un fond de test simulé. Le test tactile réel a réussi ; la réouverture mobile a été vérifiée par le test à routage simulé, pas par ce dernier essai réel.

Ces contrôles vérifient le fonctionnement du logiciel, non la praticabilité réelle des itinéraires. L’issue #44 et les restrictions, raccordements, accès et gabarits non interprétés restent à vérifier.
