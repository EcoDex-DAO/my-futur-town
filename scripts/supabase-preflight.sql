-- READ ONLY. Inspects the selected project without changing its data.
-- This reports schema and role metadata, never credentials or application data.
BEGIN TRANSACTION READ ONLY;
SELECT current_database() AS database_name,
       ext.extversion AS postgis_version,
       ns.nspname AS postgis_schema,
       ns.nspname IN ('public', 'extensions') AS supported_postgis_schema
FROM pg_extension ext JOIN pg_namespace ns ON ns.oid = ext.extnamespace
WHERE ext.extname = 'postgis';

SELECT to_regclass('auth.users') IS NOT NULL AS auth_users_present,
       to_regprocedure('auth.uid()') IS NOT NULL AS auth_uid_present;

SELECT rolname, rolbypassrls, rolsuper
FROM pg_roles WHERE rolname IN ('anon', 'authenticated');

WITH expected(table_name) AS (
 VALUES ('data_sources'), ('geo_layers'), ('reference_objects'),
        ('scenarios'), ('scenario_changes')
)
SELECT expected.table_name, cls.oid IS NOT NULL AS present,
       cls.relrowsecurity AS rls_enabled,
       (SELECT count(*) FROM pg_policy p WHERE p.polrelid = cls.oid) AS policy_count
FROM expected
LEFT JOIN pg_namespace ns ON ns.nspname = 'public'
LEFT JOIN pg_class cls ON cls.relnamespace = ns.oid AND cls.relname = expected.table_name
ORDER BY expected.table_name;

WITH expected(table_name) AS (
 VALUES ('data_sources'), ('geo_layers'), ('reference_objects'),
        ('scenarios'), ('scenario_changes')
), roles AS (SELECT oid, rolname FROM pg_roles WHERE rolname IN ('anon', 'authenticated'))
SELECT expected.table_name, roles.rolname,
       has_table_privilege(roles.oid, cls.oid, 'SELECT') AS can_select,
       has_table_privilege(roles.oid, cls.oid, 'INSERT') AS can_insert,
       has_table_privilege(roles.oid, cls.oid, 'UPDATE') AS can_update,
       has_table_privilege(roles.oid, cls.oid, 'DELETE') AS can_delete,
       has_table_privilege(roles.oid, cls.oid, 'TRUNCATE') AS can_truncate,
       has_table_privilege(roles.oid, cls.oid, 'TRIGGER') AS can_trigger,
       has_table_privilege(roles.oid, cls.oid, 'REFERENCES') AS can_reference
FROM expected CROSS JOIN roles
LEFT JOIN pg_namespace ns ON ns.nspname = 'public'
LEFT JOIN pg_class cls ON cls.relnamespace = ns.oid AND cls.relname = expected.table_name
ORDER BY expected.table_name, roles.rolname;
ROLLBACK;
