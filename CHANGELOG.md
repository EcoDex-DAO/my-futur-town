# Historique des versions

## 0.2.0-dev.1 — en développement

- Premier import réel de voirie OSM : 522 segments et 507 nœuds du centre d’Annecy, référence du 5 novembre 2026.
- Éditeur de profils et scénarios privés, comparaison et restauration ; recherche dans les tronçons importés.
- Affichage de version, révision Git, date et environnement du build ; diagnostic copiable et `/version.json`.
- Procédure de retour arrière qui restaure le code applicatif sans supprimer les migrations ou scénarios.
- Instantané OSM archivé, manifeste de provenance et empreintes de contrôle.

Cette préversion ne constitue pas une livraison de tous les modules du CDC. Le relief, le routage complet, les bus, parkings, calculs énergétiques et BIM restent à développer.

## 0.1.0 — socle cartographique

Référence Git : `92ca40c81f1b6c25b54e50cb7d839b8e93eb5cce`.

- Carte Annecy React/Vite/MapLibre, bâtiments en 2.5D, sélection et couches.
- Déploiement frontend Vercel et backend FastAPI facultatif.
- Migrations initiales et politiques RLS.

Les migrations Supabase appliquées ultérieurement restent présentes lors d’un retour à cette interface.
