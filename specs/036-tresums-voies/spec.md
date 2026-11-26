# Création de projet aux Trésums — issue #58

## Première livraison demandée

L'utilisateur choisit « Créer un projet », lui donne un nom et définit sa zone soit en sélectionnant des parcelles cadastrales, soit en dessinant un polygone libre. La zone en cours est visible sur la carte ; les parcelles peuvent être ajoutées ou retirées, les sommets du polygone déplacés, le dernier sommet supprimé et l'opération annulée sans modifier un projet confirmé. La confirmation conserve le projet et la géométrie dans ce navigateur. Un projet confirmé peut être rouvert et sa zone modifiée ; les travaux V0 déjà enregistrés restent accessibles et intacts.

Un panneau de couches distinct permet de masquer ou afficher le cadastre et les voies routières, piétonnes et cyclables pendant la définition. Les sources et limites restent visibles ; l'indisponibilité du cadastre ne bloque pas le dessin libre. Les lignes de bus et volumes non nécessaires sont temporairement masqués sans modifier leurs réglages, puis restaurés en quittant la préparation.

Les voies de référence commencent masquées pour rendre la sélection cadastrale lisible ; elles peuvent être activées par mode dans le panneau de couches.

Le modèle réserve des champs pour un parking et des flux futurs, sans les inventer ni construire leur éditeur. Un projet n'est ni un bornage ni une validation technique. Les données restent locales au navigateur et aucun comptage n'est déduit des voies.

Pour la suite, l'outil de parking devra permettre de créer des rangées de places : en épi, côte à côte ou disposées face à face, et de composer plusieurs rangs. Leur géométrie, leur nombre, leur sens d'accès et leur faisabilité restent à définir et vérifier ; cette première livraison ne dessine pas les places.

## Références préparées

La mission V0 #59 prépare le site #60 et les connexions #62. Pendant la définition de la zone, le panneau de couches donne accès au cadastre et aux voies documentées autour du site : routières, piétonnes et cyclables. Chaque catégorie dispose d'un contrôle et d'une légende ; une voie peut appartenir à plusieurs catégories. Les sens et accès ne sont pas établis par cette première vue et seront étudiés dans la suite.

La préparation masque temporairement les lignes et arrêts de bus et les volumes de parking, sans modifier leurs réglages. Fermer le panneau rétablit la vue précédente. Les parcelles, dessins et scénarios restent inchangés et persistants. Les voies sont des infrastructures, pas des flux mesurés ; les itinéraires cyclables en relations, les accès réels et les comptages manquants sont signalés. La mesure reste suivie dans #35.

Une source indisponible doit être signalée sans empêcher l'usage du cadastre ou des hypothèses. Le parcours reste utilisable sur ordinateur et mobile, avec attribution, date et limites visibles.
