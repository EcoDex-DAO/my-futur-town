# Préparer le projet Supabase existant

## Projet retenu

Le projet cible est **My Futur Town**, référence publique `bcvzhegvjzujlgfnbwfg`, région `eu-west-3`. Selon le choix du propriétaire, les changements sont destinés directement à ce projet, sans second environnement Supabase. Les scripts de validation ne l’utilisent pas automatiquement.

Cette tranche prépare le schéma, restreint les droits clients et fournit un diagnostic en lecture seule. L’éditeur de voirie peut utiliser le client Supabase si les variables publiques sont configurées ; ce guide n’importe pas de bâtiments. Aucun déploiement cloud ou frontend n’est nécessaire pour appliquer une migration SQL.

## Accès sécurisé pour exécuter les opérations

L’identifiant public du projet ne permet pas d’y exécuter SQL. Pour une exécution par l’agent, un jeton de l’API de gestion Supabase est requis :

1. Créer un jeton personnel depuis https://supabase.com/dashboard/account/tokens avec l’accès nécessaire au projet.
2. Le renseigner uniquement dans le secret personnel `SUPABASE_ACCESS_TOKEN` des paramètres de l’environnement cloud, jamais dans le chat, GitHub ou une variable `NEXT_PUBLIC_*`.
3. Appliquer les réglages réseau et de secret de l’environnement. Le jeton est utilisé uniquement vers `api.supabase.com` ; il ne doit pas être copié dans un fichier de configuration du dépôt. Le révoquer après les opérations si l’accès n’est plus nécessaire.

Ce jeton de gestion n’est pas une clé frontend `anon`, `publishable` ou `service_role`. Une clé frontend ne suffit pas à appliquer les migrations. Si les droits du jeton sont insuffisants, examiner l’opération refusée au lieu de demander une nouvelle clé au hasard.

Une autre possibilité est l’exécution manuelle des fichiers SQL dans le SQL Editor du projet ; aucun partage de secret n’est alors nécessaire.

## Vérifier avant de modifier

Exécuter [scripts/supabase-preflight.sql](../scripts/supabase-preflight.sql) sur le projet retenu. Il ouvre une transaction `READ ONLY` puis l’annule. Il lit seulement les métadonnées du schéma et des rôles, pas les lignes des tables métier ou Auth.

Résultats à examiner :

- PostGIS présent dans `public` ou `extensions`.
- `auth.users`, `auth.uid()` et rôles `anon`/`authenticated` présents ; les rôles clients ne doivent pas contourner la RLS.
- Sur un projet sans notre schéma, les cinq tables peuvent être absentes. Si certaines existent déjà, comparer leur structure et l’historique avant de poursuivre. Ne pas supprimer les tables pour contourner une collision.

Le précontrôle ne déclare pas automatiquement le projet prêt. Une ligne manquante ou une valeur NULL demande une investigation. Vérifier le projet sélectionné et l’état de sauvegarde/export avant toute modification distante ; aucune suppression n’est prévue.

## Appliquer les migrations versionnées

Après le précontrôle, appliquer dans l’ordre, uniquement si elles n’ont pas déjà été appliquées :

1. `202611050001_reference_and_scenarios.sql`.
2. `202611050002_restrict_client_privileges.sql`.

Utiliser le suivi des migrations Supabase de préférence. Si le SQL Editor ou l’API de gestion est utilisé, conserver un relevé des fichiers appliqués pour ne pas les rejouer aveuglément avec la CLI. Aucun script de ce dépôt ne les applique automatiquement au démarrage. Aucune migration ne supprime de table ou de ligne.

La seconde migration réinitialise les privilèges des seuls rôles clients et PUBLIC sur les cinq tables de l’application, puis réaccorde les droits attendus. Elle préserve les droits attribués directement aux rôles serveur/importeur. La RLS reste active. Les privilèges par défaut peuvent autrement laisser des droits `TRUNCATE`, `TRIGGER` ou `REFERENCES`, que la RLS ne contrôle pas.

Relancer ensuite le précontrôle. Résultat attendu :

| Tables                                      | anon        | authenticated                                   |
| ------------------------------------------- | ----------- | ----------------------------------------------- |
| data_sources, geo_layers, reference_objects | SELECT      | SELECT                                          |
| scenarios, scenario_changes                 | Aucun droit | SELECT, INSERT, UPDATE, DELETE, soumis à la RLS |

Les cinq tables doivent avoir la RLS active et au moins une politique. `can_truncate`, `can_trigger` et `can_reference` doivent être faux pour les deux rôles.

## Contrôles du code et du schéma

Les tests automatisés de migrations sont isolés des connexions distantes et n’utilisent aucun secret Supabase. Ils couvrent les deux schémas d’installation de PostGIS, les privilèges par défaut larges, la lecture publique des références, le refus de leur écriture, le refus du transfert de propriétaire et l’isolation des scénarios. La base jetable utilisée par ces tests n’est pas un nouvel environnement applicatif à maintenir.

Ces contrôles émulent le contrat minimal Supabase Auth, pas sa plateforme complète. Après application, contrôler aussi le comportement réel avec Auth et PostgREST et deux comptes de test ; l’exécution SQL isolée ne prouve pas la bonne configuration du service hébergé.

## Prochain résultat produit

Choisir un petit périmètre d’Annecy et une source dont la licence et les identifiants sont connus. Conserver la provenance et la date d’import, et faire les upserts par `(layer_id, source_key)` en conservant les UUID. Les identifiants de tuiles OpenFreeMap ne sont pas des clés métier stables.

Le CDC v1 a remplacé cette priorité initiale : le prochain résultat attendu est une route réelle modifiable dans un scénario, puis restaurable. Voir [le guide voirie](road-editor.md) et [la reprise CDC](roadmap-cdc.md). Aucune clé `service_role` ou de gestion ne doit entrer dans le frontend.

## État appliqué

Les deux migrations ont été appliquées au projet existant le 5 novembre 2026 et leurs versions sont enregistrées. Voir [le relevé d’intervention](supabase-applied.md) avant toute nouvelle application ; ne pas les rejouer.

La migration voirie `202611050003` est également appliquée depuis la reprise CDC. Voir [son état vérifié](cdc-progress.md).
