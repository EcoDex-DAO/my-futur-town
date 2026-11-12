# Créateur de ligne de bus V1

## Parcours

1. Ouvrir le menu mobilité et démarrer une ligne.
2. Cliquer deux fois sur la carte pour placer les terminus.
3. Valider les terminus : le serveur calcule une proposition routière puis ouvre l’étape des passages.
4. Ajouter ou déplacer des points de passage ; le calcul est repris entre les repères.
5. Valider le tracé, placer les arrêts, nommer la ligne et terminer.
6. La ligne et ses marqueurs restent visibles. On peut la rouvrir, modifier les marqueurs ou la supprimer.

Le parcours retour reprend la géométrie aller en sens inverse. Le modèle ne stocke qu’une géométrie et ne certifie pas que chaque rue est praticable dans les deux sens.

## Calcul du tracé

- Source : extrait OSM Grand Annecy daté du 8 novembre 2026, sous `data/reference/osm/`.
- Le manifeste et le SHA-256 sont contrôlés au chargement serveur.
- L’API Node charge le graphe local et calcule un chemin métrique entre terminus et points de passage.
- Les points sont raccordés aux nœuds routiers OSM proches ; l’interface affiche les avertissements et n’invente pas un itinéraire lorsqu’aucun chemin n’est trouvé.
- Next.js inclut l’archive et son manifeste dans le traçage de `/api/bus-route`.

## Limites et persistance

- La couverture est celle de l’archive OSM, pas une garantie que toutes les rues utiles sont présentes.
- Accès bus, gabarit, restrictions conditionnelles et certains tournants ne sont pas certifiés.
- Une rue à sens unique peut rendre le retour théorique impraticable.
- Les lignes terminées sont conservées dans `localStorage` de ce navigateur. Elles ne sont ni synchronisées entre appareils ni converties en horaires GTFS.
- Le brouillon reste en mémoire si le panneau est fermé, mais disparaît au rechargement de la page.

## Validation avant livraison V1

- Parcourir toutes les étapes sur ordinateur et mobile.
- Vérifier des itinéraires dans plusieurs secteurs, y compris les limites de l’extrait OSM.
- Contrôler sens uniques, restrictions, raccordements ambigus, absence de chemin et stockage indisponible.
