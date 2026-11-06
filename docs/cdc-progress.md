# Reprise CDC — état vérifié au 5 novembre 2026

> Rapport historique de la version Vite : les validations décrites ne constituent pas une validation du portage Next.js.

## Livré dans le dépôt

- CDC fourni conservé dans `docs/cahier-des-charges-v1.md`, avec feuille de route recalée sur les phases 0/1/2.
- Nom produit Your Futur Town, socle React/Vite/MapLibre conservé.
- Client Supabase public et interface d’authentification/scénarios privés.
- Importeur OSM reproductible et borné au secteur pilote ; échec explicite si source vide, incomplète ou incohérente.
- Couche de routes indépendante avec nœuds et segments ; modification du profil, prévisualisation, sauvegarde et comparaison/restauration.
- Instantané de référence immuable, validation des largeurs et graphe directionnel partageant le profil sauvegardé.

## Base distante

La migration `202611050003_road_scenarios.sql` a été appliquée au projet existant `bcvzhegvjzujlgfnbwfg` après passage des tests et enregistrée sous sa version exacte dans l’historique Supabase. Les tables `road_nodes` et `road_segments` ont la RLS active. Aucun jeu de routes ou scénario fictif n’a été inséré sur ce projet.

## Contrôles réussis

- 6 tests unitaires TypeScript (modèle cartographique/profils/scénarios).
- 3 tests FastAPI et requêtes fonctionnelles Docker Compose réussis (API et HTML du frontend).
- Rejet vérifié d’une clé de type privé dans la configuration du build frontend.
- 4 tests Python de l’importeur : propriétés absentes, déterminisme et échappement, réponses incomplètes, nœuds incohérents.
- Migrations et tests RLS avec PostGIS dans `public` et dans `extensions`.
- Passage double sens → sens unique avec largeur cyclable ; graphe correspondant ; persistance entre deux connexions SQL ; retour au graphe de référence sans altération des références.
- Build TypeScript/Vite et audit npm sans vulnérabilité signalée au contrôle.
- Test Chromium de non-régression : carte réelle Annecy, sélection de bâtiment, contrôles 2D/2.5D et affichage mobile, sans connexion Supabase configurée.

## Suite de développement — 0.2.0-dev.2

Les accès réseau sont maintenant actifs. Le secteur réel a été téléchargé depuis Overpass puis importé : **522 tronçons, 507 nœuds**, version `20261105T222406Z-b0b66162`, couche `68ad6005-85bb-511b-8129-70929dba0f1c`. L’archive OSM et son manifeste sont conservés dans `data/reference/osm/` sous ODbL. La régénération du SQL donne un fichier identique, et un second import conserve exactement 522 tronçons.

Le parcours navigateur connecté à Supabase a été validé sur un vrai tronçon explicitement double sens de la rue Sommeiller : création d’un scénario privé, sens unique, largeur cyclable, sauvegarde, rechargement du navigateur, rechargement du scénario, comparaison et restauration. Aucun jeu géographique synthétique n’a été utilisé. Un compte technique temporaire a été créé puis supprimé avec ses scénarios. L’empreinte des références avant/après est identique.

La version de développement inclut un numéro visible, les métadonnées du build et une procédure de retour arrière testée qui préserve les migrations et les données. Voir [versions et rollback](versions-and-rollback.md).

## Validation et déploiement à distinguer

Les contrôles connectés ont été exécutés dans le navigateur de l’environnement cloud avec un build de production et la base Supabase existante. Ils ne prouvent pas à eux seuls qu’une prévisualisation Vercel dispose de la configuration publique nécessaire. Les variables `VITE_SUPABASE_URL` et `VITE_SUPABASE_PUBLISHABLE_KEY` doivent être présentes dans l’environnement Vercel choisi, puis le build doit être refait.

La branche de développement n’est pas fusionnée dans main. Le site de production existant répond en HTTP 200 ; aucune promotion de la nouvelle interface n’est revendiquée. Le parcours connecté a été testé sur ordinateur ; l’éditeur mobile connecté reste à vérifier plus en détail.

Les modifications de tracé, restrictions de tournants, aménagements gauche/droite détaillés, recherche d’adresse, relief et modules bus/parking/énergie/BIM restent à développer selon le CDC. Le graphe actuel ne constitue pas un moteur de routage complet.
