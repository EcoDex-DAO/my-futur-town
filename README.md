# My Futur Town

Prototype open source autour du réseau de bus d’Annecy. L’application Next.js affiche la carte Annecy avec le réseau SIBRA, un créateur de ligne, une estimation macro énergie/émissions et une simulation micro des bus.

## Démarrage rapide

Node.js >= 22.12 et pnpm sont requis. Activez Corepack avec `corepack enable` pour utiliser la version de pnpm indiquée dans `package.json`. Le fichier `pnpm-lock.yaml` verrouille les dépendances ; conservez-le à jour lors de leur modification.

```sh
pnpm install --frozen-lockfile
pnpm run dev
```

Ouvrir http://localhost:5173. Aucun compte, aucune clé et aucune base ne sont nécessaires. Internet et WebGL sont requis. Les tuiles proviennent directement d’OpenFreeMap. Le menu mobilité lance le créateur de ligne. Le réseau SIBRA peut être masqué pour mieux voir les tracés créés.

L’estimation macro utilise les hypothèses modifiables de la ligne 1 puis les recopie sur les 27 lignes. Le total réseau est une extrapolation homogène, pas une mesure. La simulation micro représente les bus de la ligne 1 à partir des horaires statiques et propose un arrêt moyen réglable, initialement de 12 secondes. Les positions ne sont pas du temps réel. Les nouvelles lignes sont enregistrées dans le stockage local du navigateur.

```sh
pnpm test
pnpm run build
pnpm run start
```

Le serveur de production écoute également sur le port 5173. `GET /health` et `GET /api/layers` sont servis sur la même origine que l’application.

## Organisation du projet

- `src/app/` : pages, layout et routes serveur Next.js.
- `src/features/bus/` : créateur de lignes, estimation macro, simulation micro et logique partagée.
- `src/` : carte MapLibre, interface React, styles et tests Vitest.
- `public/data/` : réseau SIBRA et horaires GTFS convertis pour l’application.
- `data/reference/osm/` : extrait routier OSM et manifeste utilisés par le calcul de route du créateur.
- `supabase/migrations/` : migrations SQL versionnées, sans application automatique.
- `scripts/` : contrôle HTTP et validation PostGIS jetable ; `docs/` : architecture, sources et exploitation.

## Docker Compose

Docker Engine et Docker Compose v2 sont requis. À la racine :

```sh
docker compose up --build -d --wait
python3 scripts/smoke.py
docker compose down
```

L’application de production écoute sur le port 5173 (interface loopback uniquement). Compose ne démarre ni ne modifie de base distante. Aucun mot de passe de base n’est requis.

Pour valider séparément les migrations et les politiques d’accès dans une base PostGIS jetable, exécuter `sh scripts/test-database.sh` depuis la racine. Ce test nécessite également Docker.

Dans un cloud à proxy TLS, fournir la CA de confiance au build via le secret BuildKit `proxy_ca` ; voir [exploitation](docs/operations.md). Ne jamais désactiver la vérification TLS.

## Configuration

[.env.example](.env.example) ne contient aucun secret. Pour le développement local, copier les valeurs nécessaires dans `.env.local` ; pour Compose, les définir dans un `.env` racine ; pour Vercel, les définir dans les paramètres du projet. Les fichiers `.env` sont ignorés par Git.

- `NEXT_PUBLIC_MAP_STYLE_URL` : style MapLibre compatible OpenMapTiles, par défaut OpenFreeMap Liberty.
- `NEXT_PUBLIC_API_URL` : origine d’une API alternative, optionnelle. Vide = routes Next.js sur la même origine. Ne pas définir `localhost` sur Vercel.
- `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` : configuration publique facultative pour la voirie de référence et les scénarios privés. Sans elles, la carte reste disponible. Utiliser uniquement une clé publishable ou anon, jamais une clé secrète.
- `CORS_ORIGINS` : liste séparée par des virgules des origines autorisées pour les requêtes API entre origines ; valeur par défaut `http://localhost:5173`. Cette variable serveur est lue à l’exécution et ne concerne pas les requêtes sur la même origine.

**Toutes les variables `NEXT_PUBLIC_*` sont publiques et incorporées au bundle lors du build.** Toute modification nécessite une reconstruction, y compris avec Compose. Ne jamais y placer `service_role`, mot de passe, URL PostgreSQL privée ou autre secret.

## Vercel

Importer `EcoDex-DAO/my-futur-town`, sélectionner le framework Next.js et la racine du dépôt comme Root Directory. `vercel.json` indique le framework ; le Root Directory se règle dans Vercel. Le build et les routes serveur sont pris en charge par Next.js. Aucune migration automatique ou publication n’est effectuée par ce dépôt.

## Données et architecture

- [Sources, licences et limites](docs/data-sources.md)
- [Feuille de route Bus V1](docs/roadmap-bus-v1.md)
- [Créateur de ligne V1](docs/bus-line-creator-v1.md)
- [Démarrage local après redémarrage](docs/demarrage-local.md)
- [Import et couverture des horaires SIBRA](docs/sibra-data.md)
- [Provenance et limites du graphe de calcul de route](data/reference/osm/README.md)
- [Modèle de données et politiques RLS](docs/architecture.md)
- [Exploitation et validation](docs/operations.md)

Projet Supabase cible : `bcvzhegvjzujlgfnbwfg`, région `eu-west-3`. Les PR #2 et #3 indiquent que des migrations ont déjà été appliquées à ce projet ; leur état n’a pas été vérifié dans cette branche. Vérifier l’historique distant avant toute intervention, puis faire examiner et valider toute nouvelle migration sur une base de développement avant application avec un compte autorisé. Ne pas contourner les collisions en supprimant des tables existantes.

## Contribuer

Consulter le [flux de contribution](docs/workflow.md) pour passer d’une issue à une pull request.

Créer une branche depuis `main`, préserver les licences et l’attribution, ne pas committer de secrets. Vérifier `pnpm install --frozen-lockfile && pnpm test && pnpm run build` à la racine, ainsi que Compose pour les changements concernés, puis ouvrir une Pull Request décrivant les changements, contrôles et limites. Le code est sous licence Apache-2.0 ([LICENSE](LICENSE)) ; les données et styles conservent leurs propres licences.

Les valeurs de consommation et d’émission restent des hypothèses à saisir et à sourcer. L’extrapolation macro reprend celles de la ligne 1 sans tenir compte des différences de flotte entre lignes. Le créateur produit des lignes locales à ce navigateur ; la synchronisation entre utilisateurs et les horaires des lignes créées sont hors périmètre V1.
