# Reprise selon le CDC Your Futur Town v1

Document contractuel : [CDC v1 du 5 novembre 2026](cahier-des-charges-v1.md). Nom produit retenu : **Your Futur Town (YFT)** ; le dépôt conserve son nom `my-futur-town`.

| Phase CDC           | Existant réutilisé                                                                         | Travail restant                                                                                                                                        |
| ------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 0 — Initialisation  | React/TypeScript/Vite, GitHub, Vercel, MapLibre, FastAPI optionnel, tables Supabase/RLS    | Client Supabase/Auth testé sur le projet réel ; configuration de prévisualisation Vercel à vérifier                                                    |
| 1 — Annecy 3D       | Carte réelle OSM/OpenFreeMap, volumes des bâtiments, couches, inspection, contrôles caméra | Relief réel, recherche d’adresse, objets de référence indépendants et provenance par objet                                                             |
| 2 — Voirie éditable | Séparation références/scénarios déjà en base                                               | 522 tronçons réels importés ; profil, sauvegarde/rechargement et restauration testés avec Supabase ; géométrie et règles détaillées encore à compléter |
| 3 — Bus             | Catégories transport prévues au schéma                                                     | Import GTFS SIBRA, éditeur, calculs et routage dépendant de la voirie                                                                                  |
| 4 — Parking         | Aucun simulateur                                                                           | Emprise réelle Trésum/Providence, volumes et hypothèses de flux explicites                                                                             |
| 5 — Énergie         | Aucun simulateur                                                                           | Identifier le bâtiment réel des Carillons, hypothèses et modèles validés                                                                               |
| 6 — Avancé          | Architecture modulaire                                                                     | IA, BIM/IFC, trafic et autres villes après les modules précédents                                                                                      |

## Premier incrément retenu

Un petit secteur réel d’Annecy, importé depuis OSM : un utilisateur sélectionne un tronçon double sens, choisit un sens unique et une piste cyclable, ajuste les largeurs, enregistre puis recharge le scénario et revient à la référence. Le graphe dirigé utilise les mêmes propriétés que le rendu. Aucun calcul de trafic ni routage bus n’est annoncé dans cette tranche.

Les routes du fond OpenFreeMap restent un repère et ne sont jamais utilisées comme identifiants métier. Les routes éditables sont une couche distincte issue de données structurées. Les données absentes restent inconnues ; les valeurs proposées par l’éditeur sont des hypothèses explicites.

## Choix techniques

- Conserver React/Vite : l’application fonctionne déjà sur Vercel ; Next.js est une recommandation du CDC, pas une condition qui justifie une réécriture.
- Lire les références et enregistrer les scénarios directement via Supabase avec ses clés **publiques** et la RLS. Aucun jeton de gestion ou `service_role` dans le frontend.
- Garder FastAPI facultatif pour les traitements futurs ; pas de nouveau service requis pour l’éditeur.
- Échanges GeoJSON en EPSG:4326 ; longueurs métriques en EPSG:2154 (Lambert-93). Aucun Z ou altitude inventé.
- Imports immuables, versionnés, réexécutables sans effacer les scénarios. Les changements de réseau réels futurs produisent une nouvelle couche ; un scénario reste lié à son instantané.

## Définition de terminé

Une fonctionnalité n’est déclarée livrée qu’après test du comportement, de la persistance et de l’intégrité des références. Distinguer les tests isolés, les contrôles sur Supabase et le site Vercel réellement déployé. Les données synthétiques de tests unitaires ne sont jamais un jeu géographique affiché comme Annecy.
