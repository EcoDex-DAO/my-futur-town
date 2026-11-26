# Plan

Ajouter un parcours de création distinct des anciens dessins V0, avec stockage local versionné et validation défensive. Conserver les géométries des parcelles sélectionnées avec leurs identifiants pour retrouver la zone même si la source est ensuite indisponible. Préparer un modèle de projet extensible avec parking et flux vides ; préserver le document V0 et les scénarios existants. Les modifications restent provisoires jusqu'à confirmation et les conflits de stockage empêchent l'écrasement silencieux.

L'étape ultérieure de parking devra modéliser plusieurs rangées de places en épi, côte à côte ou face à face. Le modèle actuel ne contient aucune capacité ou géométrie de place supposée ; une évolution versionnée précisera ces éléments.

Utiliser un panneau de préparation dans la carte, un panneau de couches repliable distinct, un aperçu GeoJSON et des sommets déplaçables. La sélection cadastrale et le dessin libre sont exclusifs. Refuser un polygone dégénéré ou auto-intersecté. Garder les couches et documents précédents intacts à l'annulation. Vérifier erreurs, rechargement, ordinateur et mobile.

Extraire depuis l'archive OSM locale figée les géométries et les découper à la fenêtre cadastrale. Conserver les identifiants et quelques attributs de provenance ; classer explicitement les catégories sans inférer un accès autorisé. Servir le GeoJSON localement et afficher les couches MapLibre uniquement pendant la préparation. Utiliser l'état de panneau comme masque temporaire sans écriture dans les préférences de bus, le stockage V0 ou les scénarios.

Documenter les sources, les approximations de sélection, les limites de qualification et les jeux non utilisés. Vérifier la reproductibilité, les cas de chargement en échec, les catégories, la restauration de l'état, les sauvegardes et les formats ordinateur/mobile ; exécuter Vitest, build et navigateur. Aucun changement serveur ou base de données.
