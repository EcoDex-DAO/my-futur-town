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

`sh scripts/test-database.sh` lance une base PostGIS jetable sans port exposé, émule le contrat minimal Supabase Auth, applique la migration et vérifie la lecture du propriétaire, l’isolation entre deux utilisateurs, le refus d’écriture interutilisateur et le refus d’accès anonyme aux scénarios. Le conteneur est supprimé à la fin. Ces tests ne remplacent pas la validation sur un projet Supabase de développement avec son schéma et ses rôles réels. Ne jamais lancer `scripts/test-database.sql` sur une base existante : il crée les rôles et stubs Auth réservés aux tests.
