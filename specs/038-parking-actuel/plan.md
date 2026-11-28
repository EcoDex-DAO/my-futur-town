# Plan

Livrer une première tranche indépendante : capacité saisie ou estimée, conservée dans une clé locale par projet, sans modifier le format existant. Refuser les sauvegardes concurrentes obsolètes. Documenter les sources sans attribuer automatiquement un chiffre à une zone non vérifiée.

Ajouter les accès dans une clé versionnée distincte par projet ; une absence de clé représente une liste vide et ne modifie pas les anciens formats. Les destinations et permissions restent séparées, les conflits de sauvegarde sont refusés et le placement est exclusif des autres outils de carte. Vérifier les anciens projets, les onglets et les deux tailles d’écran avant de prétendre terminer #59.

Les étapes ultérieures restent hors de cette livraison : voiries et profils de trafic hypothétiques ; captation et niveaux ; répartition modale ; puis desserte, rotations et flotte de transport collectif. Aucune de ces étapes ne constitue un comptage réel.

Pour la capacité déclarée, conserver la clé et le contrôle de conflit, mais utiliser un format version 2 afin que les anciens clients ne remplacent pas silencieusement le nombre PMR. La lecture du format 1 ajoute seulement une valeur inconnue en mémoire ; l'écriture reste explicite.

Pour cet ajustement, les formats de capacité et d'accès passent en version 3 dans leurs clés existantes : les anciens clients refusent leur lecture. Les formats précédents migrent en mémoire et ne sont enregistrés qu'après action explicite et contrôle de conflit. Le calcul spatial unit les géométries avant de mesurer leur surface sphérique, puis la répartition cherche le nombre entier maximal compatible avec les hypothèses et arrondit les PMR au supérieur.


Le calcul géométrique projette localement les coordonnées en mètres, unit les parcelles, teste des modules de places et d’allées entièrement inclus dans la zone et compare quatre orientations et quatre décalages. Les places PMR regroupent si nécessaire plusieurs modules voisins, sans les compter deux fois. Un worker évite de bloquer l’interface ; la carte affiche séparément voies, places et PMR. Le calcul cherche une voie commune rectiligne dans la zone, raccordée à toutes les entrées et sorties de véhicules explicitement autorisées, et conserve les rangées connectées. Une tolérance de 2 m sur les repères ne valide pas le raccordement réel, les virages ou les obstacles ; aucune solution trouvée ne signifie pas qu’aucune solution ne peut exister.

La version 4 de la référence enregistre les dimensions et le résultat du plan, ainsi qu’une empreinte de la zone. Les anciens formats restent lisibles et leurs informations ne sont pas écrasées ; les anciennes estimations demandent une conversion explicite. La sauvegarde refuse un calcul périmé ou une zone changée dans un autre onglet.

Le format version 5 associe le résultat à une copie des accès utilisés. Les enregistrements version 4 restent lisibles et sont signalés comme n’ayant pas vérifié les accès.
