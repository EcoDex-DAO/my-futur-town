# Validation historique du prototype Vite/FastAPI — 5 novembre 2026

Ces résultats décrivent la version antérieure à la migration Next.js ; ils ne constituent pas une validation de la nouvelle application.

## Contrôles réussis dans l’environnement cloud

- `npm install`, puis installation reproductible `npm ci`.
- Build TypeScript et Vite ; 3 tests Vitest.
- `npm audit` : aucune vulnérabilité signalée au moment du contrôle (MapLibre 6.16 corrigé).
- 3 tests FastAPI : santé, catalogue et restrictions CORS.
- Construction Docker Compose avec CA du proxy injectée par secret BuildKit ; services frontend et backend `healthy`.
- Requêtes fonctionnelles vers `/health`, `/api/layers` et le document HTML frontend.
- Chromium en 1440 × 1000 et 390 × 844 : pas d’erreur JavaScript, pas de débordement horizontal mobile, contrôles de couche et bouton de recentrage accessibles. Interface également chargée avec l’API arrêtée.
- Migration appliquée à une base PostGIS jetable, puis tests d’accès propriétaire, isolation interutilisateur et refus des accès anonymes aux scénarios.
- `sh scripts/test-database.sh` exécuté avec succès. Le script attend le serveur TCP définitif : le premier contrôle par socket pouvait démarrer pendant le serveur temporaire d’initialisation de l’image PostgreSQL et être interrompu lors de son arrêt.
- Aucun changement appliqué au projet Supabase distant.

## Validation après publication des autorisations réseau

Les autorisations pour `tiles.openfreemap.org` et `api.github.com` sont désormais actives. Le style, les sprites, les fontes et les tuiles OpenFreeMap sont accessibles.

Le premier contrôle réel a révélé un problème de résolution du worker ESM MapLibre dans Vite. Le frontend déclare maintenant son URL via l’import Vite `?worker&url`, ce qui émet le worker et ses dépendances dans le build.

Vérifications Chromium réussies avec le proxy et la vérification TLS actifs :

- Carte réelle d’Annecy visible, lac, routes et bâtiments extrudés.
- 23 ressources OpenFreeMap reçues, dont 15 tuiles vectorielles ; aucune requête échouée et aucune erreur JavaScript.
- Même contrôle réussi avec `vite preview` sur le build de production destiné à Vercel.
- Sélection d’un bâtiment : panneau affichant la couche `building`, l’identifiant de tuile et `render_height=5`, `render_min_height=0`.
- Boutons 2D/2.5D et recentrage actionnés ; capture mobile effectuée.

## Limites restantes

Le build Vite signale un bundle principal volumineux (~365 ko gzip), auquel s’ajoute le worker cartographique. Aucune simulation, édition de scénario, connexion Supabase ou import BIM n’est implémenté. Aucune migration Supabase distante ni mise en production Vercel n’a été effectuée. Les résultats CI distants restent à consulter sur la Pull Request.
