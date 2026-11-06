# Exploitation

## Vérifications

- Frontend : `cd frontend && npm ci && npm test && npm run build`.
- API : installer `backend/requirements-dev.txt`, puis `cd backend && .venv/bin/python -m unittest discover -s tests -v`.
- Services : `docker compose up --build -d --wait`, puis `python3 scripts/smoke.py` à la racine.
- Carte : vérifier dans un navigateur avec WebGL la vue d’Annecy, les tuiles et attributions, les bâtiments à zoom >= 13, la sélection, les couches, le recentrage, le tactile et la présentation mobile. Tester aussi avec l’API arrêtée et avec le fournisseur de tuiles indisponible.

Les tests unitaires ne remplacent pas un contrôle du rendu WebGL et des données distantes. La CI n’exécute aucune migration de production.

## Cloud avec proxy

Les Dockerfiles acceptent un secret BuildKit facultatif `proxy_ca` contenant un bundle de CA de confiance pour les installations npm/pip. Utiliser un fichier Compose d’override local extérieur au dépôt qui ajoute `build.secrets: [proxy_ca]` à chaque service et `secrets.proxy_ca.file` pointant vers le bundle fourni par la plateforme. Ne pas copier de certificat de session dans l’image et ne pas désactiver TLS. Les réglages du proxy Docker doivent rester ceux fournis par la plateforme.

Le navigateur doit pouvoir accéder à `tiles.openfreemap.org` pour le style, les tuiles et les ressources associées. Une politique cloud restrictive peut empêcher la validation du rendu même si le build fonctionne ; ajouter les domaines nécessaires dans les paramètres réseau autorisés. Cela ne concerne pas l’accès depuis les navigateurs des visiteurs sur Vercel.

## Sécurité et déploiement

Aucun secret de base n’est nécessaire pour cette phase. Ne jamais placer `service_role` dans une variable `VITE_*`, une URL frontend ou un commit. Pour un futur backend distant, stocker les secrets dans son gestionnaire dédié et restreindre CORS aux origines réelles. Une API locale n’est pas une API de production. Les migrations doivent être relues et appliquées séparément avec une sauvegarde et une identité autorisée.

## Validation SQL isolée

`sh scripts/test-database.sh public` et `sh scripts/test-database.sh extensions` lancent une base PostGIS jetable sans port exposé, émule le contrat minimal Supabase Auth, applique la migration et vérifie la lecture du propriétaire, l’isolation entre deux utilisateurs, le refus d’écriture interutilisateur et le refus d’accès anonyme aux scénarios. Le conteneur est supprimé à la fin. Ces tests ne remplacent pas la validation sur un projet Supabase de développement avec son schéma et ses rôles réels. Ne jamais lancer `scripts/test-database.sql` sur une base existante : il crée les rôles et stubs Auth réservés aux tests.

## Test navigateur de production

Dans `frontend` :

```sh
npm ci
npx playwright install chromium
npm run test:e2e
```

Si Chromium est déjà installé, utiliser `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/chemin/vers/chromium npm run test:e2e` à la place du téléchargement. Le test construit le frontend puis démarre `vite preview` sur le port 4173, qui doit être libre. Il vérifie les tuiles OpenFreeMap réelles, la sélection d’un bâtiment, les contrôles 2D/2.5D et la disposition mobile sans API. Il nécessite WebGL et Internet ; il n’utilise aucune géométrie cartographique fictive. Un échec réseau est un échec de ce test, pas une réussite hors ligne. La CI standard ne le lance pas automatiquement pour ne pas dépendre de la disponibilité d’un fournisseur public.

Le navigateur utilise `HTTPS_PROXY` lorsqu’il est présent, avec exclusion de localhost. La vérification TLS reste active : la CA de la plateforme doit être reconnue par le navigateur. Les traces et captures d’échec restent dans les dossiers ignorés par Git ; ne pas les publier sans vérifier leur contenu.

## Suivi des versions

Voir [versions et retours arrière](versions-and-rollback.md) pour identifier un build, signaler un bug et préparer une restauration sans réécrire l’historique Git ni supprimer les migrations. Le test connecté réel et son nettoyage sont décrits dans [le guide voirie](road-editor.md).
