# Historique des versions

## 0.3.0-dev.1 — migration Next.js en cours de validation

- Application Next.js à la racine, dépendances verrouillées avec pnpm et routes API intégrées.
- Portage de l’éditeur de voirie et des scénarios privés ; les migrations et archives de référence sont conservées.
- Le retour arrière automatisé reste limité à l’architecture courante.
- Les validations connectées et le déploiement restent à confirmer pour cette version.

## 0.2.0-dev.2 — en développement

- Le rollback prend désormais HEAD comme base par défaut et refuse une base qui omet ou modifie les migrations/archives de référence actuellement suivies. Cela couvre notamment le cas où main est en retard sur les migrations déjà appliquées.
- Le tag 0.2.0-dev.1 est conservé : cette correction reçoit une nouvelle préversion, sans déplacement de tag.

## 0.2.0-dev.1 — premier point de reprise

- Premier import réel de voirie OSM : 522 segments et 507 nœuds du centre d’Annecy, référence du 5 novembre 2026.
- Éditeur de profils et scénarios privés, comparaison et restauration ; recherche dans les tronçons importés.
- Affichage de version, révision Git, date et environnement du build ; diagnostic copiable et `/version.json`.
- Procédure de retour arrière qui restaure le code applicatif sans supprimer les migrations ou scénarios.
- Instantané OSM archivé, manifeste de provenance et empreintes de contrôle.

Cette préversion ne constitue pas une livraison de tous les modules du CDC. Le relief, le routage complet, les bus, parkings, calculs énergétiques et BIM restent à développer.

## 0.1.0 — socle cartographique

Référence Git : `92ca40c81f1b6c25b54e50cb7d839b8e93eb5cce`.

- Première carte Annecy React/MapLibre, bâtiments en 2.5D, sélection et couches.
- Déploiement frontend Vercel et backend FastAPI facultatif.
- Migrations initiales et politiques RLS.

Les migrations Supabase appliquées ultérieurement restent présentes lors d’un retour à cette interface.
