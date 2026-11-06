# Architecture évolutive

Le navigateur charge les tuiles directement auprès du fournisseur. Les routes serveur Next.js exposent `/health` et `/api/layers`, sans connexion PostgreSQL ni écriture. Leur indisponibilité ne bloque pas la carte. Le catalogue est statique et décrit les sources ; il ne prétend pas interroger la base. Les services de simulation et connecteurs BIM pourront être ajoutés derrière l’API, sans couplage avec le rendu de carte.

## PostGIS

`supabase/migrations/202611050001_reference_and_scenarios.sql` crée :

| Table             | Rôle                                                                                      |
| ----------------- | ----------------------------------------------------------------------------------------- |
| data_sources      | Provenance, URL, licence, attribution, date et métadonnées                                |
| geo_layers        | Catalogue de couches rattachées à une source                                              |
| reference_objects | Bâtiments, infrastructures, arrêts et lignes ; UUID stable + clé source unique par couche |
| scenarios         | Scénarios appartenant à un utilisateur Supabase Auth                                      |
| scenario_changes  | Création, mise à jour ou suppression virtuelle d’objets                                   |

Les géométries sont en EPSG:4326, validées et indexées avec GiST. La typologie commune évite de multiplier prématurément les tables ; des relations spécialisées (lignes/arrêts, versions BIM, etc.) pourront être ajoutées avec les premiers imports. Les métadonnées libres restent du JSONB. La politique d’import doit préserver les UUID lors des upserts par `(layer_id, source_key)` et gérer explicitement les changements de référence.

Les objets de référence sont accessibles en lecture à `anon` et `authenticated`, sans droit d’écriture. Les futurs imports seront exécutés uniquement par un processus serveur autorisé. Les scénarios et changements sont privés à leur propriétaire via RLS, y compris les vérifications d’écriture. Aucun accès anonyme aux scénarios. La suppression d’un scénario supprime uniquement ses modifications virtuelles, jamais les objets réels.

Les migrations ciblent Supabase (`auth.users`, `auth.uid()`, rôles `anon` et `authenticated`) et utilisent PostGIS dans `public` ou `extensions`. L’éditeur de voirie et les scénarios privés utilisent Supabase lorsqu’il est configuré ; la carte de fond reste autonome. Les imports et migrations distants exigent une intervention autorisée.

La migration `202611050002_restrict_client_privileges.sql` complète la RLS en retirant notamment `TRUNCATE`, `TRIGGER` et `REFERENCES` aux rôles clients. La migration `202611050003_road_scenarios.sql` ajoute les tables et fonctions de voirie. Voir [la préparation Supabase](supabase-setup.md) et [le guide voirie](road-editor.md).
