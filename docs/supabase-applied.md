# État Supabase — 5 novembre 2026

Projet existant : `bcvzhegvjzujlgfnbwfg` (My Futur Town, eu-west-3).

À la demande du propriétaire, les deux migrations du dépôt ont été appliquées directement à ce projet :

| Version      | Nom                        |
| ------------ | -------------------------- |
| 202611050001 | reference_and_scenarios    |
| 202611050002 | restrict_client_privileges |

Elles ont été exécutées dans une transaction unique via l’API de gestion Supabase et enregistrées sous leurs versions exactes dans `supabase_migrations.schema_migrations`, avec le contenu SQL correspondant. La migration `20261105164334` / `enable_postgis` préexistante est conservée. Ne pas rejouer les deux migrations du dépôt sur ce projet.

Avant application : PostGIS était dans `extensions`, Auth était présent et les cinq tables de l’application étaient absentes. Les migrations n’ont supprimé aucune table ni donnée existante. Aucun bâtiment, source ou scénario n’a été inséré pendant cette intervention.

Vérifications effectuées après validation de la transaction :

- Présence des cinq tables et activation de la RLS avec une politique par table.
- Présence des index GiST sur `reference_objects.geom` et `scenario_changes.geom`.
- Vérification des dix combinaisons table/rôle (`anon`, `authenticated`) : lecture des références, absence de leur écriture, droits CRUD sur les scénarios réservés à `authenticated`, absence de TRUNCATE/TRIGGER/REFERENCES pour les deux rôles.
- Lecture des références sous le rôle `anon` réussie ; lecture des scénarios refusée sous ce rôle.
- Aucun scénario visible sous le rôle `authenticated` sans identité utilisateur.
- Tests de rôles réalisés dans une transaction SQL READ ONLY annulée, sans création de comptes ou de données de test.

Le mode `read_only` de l’API de gestion utilise une identité qui ne peut pas prendre les rôles clients. Le test de rôles a donc utilisé l’identité de gestion avec une transaction SQL explicitement `READ ONLY` ; cette distinction ne change pas les données de la base.

Ce contrôle ne constitue pas un test Auth/PostgREST complet avec deux utilisateurs réels. Le frontend reste autonome : il n’est pas encore connecté à ces tables. Prochaine tranche : importer un premier petit ensemble de bâtiments réels avec des identifiants stables et afficher leur fiche persistée.

## Suite selon le CDC

La migration additive `202611050003_road_scenarios.sql` est appliquée et enregistrée. Elle ajoute les références topologiques et la gestion des profils de voirie ; aucun import de routes n’a encore eu lieu. Voir [le relevé CDC](cdc-progress.md).
