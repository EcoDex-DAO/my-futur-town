# Plan — issue #29

Conserver le modèle et les fonctions du créateur cartographique, et étendre la ligne locale avec des variantes indépendantes. Les données historiques restent la variante principale ; aucune migration destructive ni changement des références GTFS. Le stockage demeure local. Réutiliser le calcul OSM existant et ses avertissements, sans affirmer la praticabilité.

L'interface doit identifier la variante active, permettre son ajout et son édition, et garder accessibles les autres variantes après rechargement. Empêcher une sauvegarde annoncée à tort et toute perte silencieuse de données illisibles. Un recalcul doit protéger la cohérence des arrêts.

Vérifier les fonctions de persistance et les cas d'erreur par tests automatisés, puis les parcours entiers en navigateur sur ordinateur et mobile ; consigner les limites et captures disponibles. Ne pas modifier le service sur 3000.
