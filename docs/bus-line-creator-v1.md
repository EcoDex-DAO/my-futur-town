# Créateur de ligne de bus V1

## Parcours utilisateur

1. Le menu principal démarre une ligne ou reprend le brouillon actif tant que la page reste ouverte.
2. L’utilisateur place deux terminus sur la carte, directement ou au centre de la vue.
3. Le bouton de validation des terminus lance le calcul OSM puis ouvre directement l’étape des passages.
4. L’utilisateur ajoute des points de passage et le serveur recalcule jusqu’à obtenir le parcours voulu.
5. L’utilisateur valide le tracé, place et nomme les arrêts, nomme la ligne dans l’étape Arrêts, puis termine la ligne.
6. La validation enregistre la ligne, ferme le panneau et affiche un message de confirmation. Les marqueurs et le tracé restent visibles. La ligne peut être rouverte depuis le menu, modifiée par étapes et déplacée.

Le parcours retour est implicitement la géométrie aller parcourue à l’envers. Le modèle V1 ne stocke qu’une géométrie. Il ne vérifie pas si chaque rue autorise le bus dans ce sens retour.

## Calcul du tracé

- Source : extrait OSM régional daté du 8 novembre 2026, archivé sous `data/reference/osm/` et attribué sous ODbL-1.0.
- Le manifeste et le SHA-256 de l’archive sont contrôlés au chargement serveur.
- Le graphe relie les nœuds OSM des voies `highway`; A* calcule un plus court chemin métrique entre chaque repère consécutif.
- Les sens uniques courants et les restrictions simples `no_*` / `only_*` avec nœud via sont pris en compte.
- Les terminus doivent se trouver à moins de 40 m d’un nœud routier. Les arrêts doivent être posés à moins de 60 m du tracé.
- L’API Node charge le graphe à la demande. Next.js inclut l’archive et le manifeste dans le traçage de la route API.

## Limites connues

- La couverture est un rectangle d’extraction avec marge, pas une preuve que toutes les rues utiles y figurent.
- L’accès bus, les dimensions du véhicule, les restrictions conditionnelles et certaines règles OSM ne sont pas certifiés.
- Les rues inversées au retour peuvent être à sens unique ou interdites aux bus. Le retour doit être contrôlé avant tout usage opérationnel.
- Les itinéraires et arrêts sont conservés dans le `localStorage` du navigateur ; ils ne sont pas partagés entre appareils et ne sont pas synchronisés avec le GTFS.
- Le brouillon en cours reste en mémoire quand le panneau est fermé, mais disparaît si la page est rechargée.
- Une erreur de calcul doit être affichée et le repère peut être déplacé ; aucune route de remplacement n’est inventée.

## À faire avant livraison V1

- Vérifier des paires de terminus et points de passage dans plusieurs secteurs, y compris les limites de l’extrait.
- Confirmer le comportement sur sens uniques, restrictions, ronds-points et points d’accrochage ambigus.
- Contrôler l’interface sur grand écran et mobile, y compris reprise du brouillon, stockage indisponible et absence de route.
- Ajouter des tests ciblés pour le graphe, l’API, l’accrochage et la persistance.
- Actualiser cette section et la feuille de route après ces validations.
