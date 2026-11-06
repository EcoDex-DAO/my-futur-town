# Exploitation

## Vérifications

- Frontend : `pnpm install --frozen-lockfile && pnpm test && pnpm run build`.
- Services : `docker compose up --build -d --wait`, puis `python3 scripts/smoke.py` à la racine.
- Carte : vérifier dans un navigateur avec WebGL la vue d’Annecy, les tuiles et attributions, les bâtiments à zoom >= 13, la sélection, les couches, le recentrage, le tactile et la présentation mobile. Tester aussi avec l’API arrêtée et avec le fournisseur de tuiles indisponible.

Les tests unitaires ne remplacent pas un contrôle du rendu WebGL et des données distantes. La CI n’exécute aucune migration de production.

## Cloud avec proxy

Le Dockerfile accepte un secret BuildKit facultatif `proxy_ca` contenant un bundle de CA de confiance pour l’installation pnpm. Utiliser un fichier Compose d’override local extérieur au dépôt qui ajoute `build.secrets: [proxy_ca]` au service frontend et `secrets.proxy_ca.file` pointant vers le bundle fourni par la plateforme. Ne pas copier de certificat de session dans l’image et ne pas désactiver TLS. Les réglages du proxy Docker doivent rester ceux fournis par la plateforme.

Le navigateur doit pouvoir accéder à `tiles.openfreemap.org` pour le style, les tuiles et les ressources associées. Une politique cloud restrictive peut empêcher la validation du rendu même si le build fonctionne ; ajouter les domaines nécessaires dans les paramètres réseau autorisés. Cela ne concerne pas l’accès depuis les navigateurs des visiteurs sur Vercel.

## Sécurité et déploiement

Aucun secret de base n’est nécessaire pour cette phase. Ne jamais placer `service_role` dans une variable `NEXT_PUBLIC_*`, une URL frontend ou un commit. Stocker les futurs secrets serveur dans un gestionnaire dédié. Les variables publiques sont incorporées au build : reconstruire l’image Compose après leur modification. Les migrations doivent être relues et appliquées séparément avec une sauvegarde et une identité autorisée.

## Validation SQL isolée

`sh scripts/test-database.sh` lance une base PostGIS jetable sans port exposé, émule le contrat minimal Supabase Auth, applique la migration et vérifie la lecture du propriétaire, l’isolation entre deux utilisateurs, le refus d’écriture interutilisateur et le refus d’accès anonyme aux scénarios. Le conteneur est supprimé à la fin. Ces tests ne remplacent pas la validation sur un projet Supabase de développement avec son schéma et ses rôles réels. Ne jamais lancer `scripts/test-database.sql` sur une base existante : il crée les rôles et stubs Auth réservés aux tests.
