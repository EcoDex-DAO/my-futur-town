# Reprise CDC — état vérifié au 5 novembre 2026

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

## Non terminé

Les nouveaux domaines `overpass-api.de`, `bcvzhegvjzujlgfnbwfg.supabase.co` et `my-futur-town.vercel.app` ont été enregistrés dans le brouillon réseau, mais ne sont pas encore actifs dans l’instance au dernier contrôle. Le téléchargement Overpass est refusé par le proxy (HTTP CONNECT 403). **Aucune route réelle n’a donc encore été importée.**

La configuration publique Supabase doit être renseignée pour le frontend (voir `docs/road-editor.md`). Aucun jeton de gestion ni clé serveur n’est exposé. L’authentification réelle et la sauvegarde/relecture depuis le navigateur n’ont pas encore été validées ; le test SQL ne les remplace pas.

La Phase 2 n’est pas déclarée achevée. Il reste à télécharger/importer le secteur réel, choisir une route double sens, effectuer le parcours complet utilisateur puis le vérifier sur Vercel. Les variantes de géométrie, restrictions de tournants, aménagements gauche/droite détaillés, recherche d’adresse, relief et les modules bus/parking/énergie/BIM restent hors de cette première tranche.
