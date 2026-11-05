# Validation du prototype — 5 novembre 2026

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

## Points non validés et blocages

La politique réseau cloud refuse les requêtes vers `tiles.openfreemap.org` (HTTP CONNECT 403). L’application affiche son état d’erreur, mais **le rendu des données réelles, les interactions avec des objets géographiques et les extrusions n’ont pas pu être validés visuellement**. Ces vérifications restent nécessaires avant de qualifier la carte de validée.

L’API GitHub refuse la création de PR sur `api.github.com/graphql`. La branche dédiée est poussée via le proxy Git HTTPS. Les domaines `tiles.openfreemap.org` et `api.github.com` sont enregistrés dans le brouillon réseau cloud, sans application ou publication revendiquée. Une fois l’accès appliqué, reprendre le contrôle de la carte et la création de la Pull Request vers `main`.

Le build Vite signale un bundle MapLibre volumineux (~365 ko gzip pour le JavaScript total). Aucune simulation, édition de scénario, connexion Supabase ou import BIM n’est implémenté. Aucune publication de l’environnement ou mise en production Vercel n’a été effectuée. Les workflows CI sont ajoutés, mais leur résultat distant n’est pas accessible depuis cette session.
