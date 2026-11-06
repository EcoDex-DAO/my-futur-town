# My Futur Town

Prototype open source de jumeau numérique urbain d’Annecy. Une application Next.js réunit l’interface React/TypeScript et les routes serveur ; MapLibre GL JS affiche la carte dans le navigateur. Un schéma Supabase/PostGIS est préparé pour les futurs imports et scénarios.

## Démarrage rapide

Node.js >= 22.12 et pnpm sont requis. Activez Corepack avec `corepack enable` pour utiliser la version de pnpm indiquée dans `package.json`. Le fichier `pnpm-lock.yaml` verrouille les dépendances ; conservez-le à jour lors de leur modification.

```sh
pnpm install --frozen-lockfile
pnpm run dev
```

Ouvrir http://localhost:5173. Aucun compte, aucune clé et aucune base ne sont nécessaires pour la carte. Internet et WebGL sont requis. Les tuiles proviennent directement d’OpenFreeMap. Zoomer, déplacer, tourner et incliner avec les contrôles ou Ctrl + glisser. Cliquer sur un objet pour voir les propriétés de sa tuile. Le bouton de recentrage restaure la vue d’Annecy. La carte reste utilisable si les routes API ne répondent pas.

Le panneau **Bus SIBRA** permet de rechercher une ligne, d’en afficher les variantes et de consulter leurs arrêts sur la carte. Il utilise un instantané GTFS théorique inclus dans l’application, sans horaires en temps réel ni modification des lignes. Sa période de validité, sa provenance et les conditions de redistribution sont précisées dans [la documentation des données SIBRA](docs/sibra-data.md).

Le panneau **Pointe de la ligne 1** permet de simuler les courses prévues à la pointe calculée, de choisir une date et une heure ou d’accélérer le temps. Les positions entre arrêts sont estimées : elles ne représentent pas les positions GPS réelles. Les bus et abris 3D sont schématiques ; les abris ne décrivent pas les équipements effectivement installés. La simulation dépend de la période de validité du GTFS inclus.

Pour reprendre le développement du module bus, consulter la [feuille de route](docs/prochaine-etape-simulation-bus.md) et son [issue GitHub de suivi](https://github.com/EcoDex-DAO/my-futur-town/issues/7).

```sh
pnpm test
pnpm run build
pnpm run start
```

Le serveur de production écoute également sur le port 5173. `GET /health` et `GET /api/layers` sont servis sur la même origine que l’application.

## Organisation du projet

- `src/app/` : pages, layout et routes serveur Next.js.
- `src/` : carte MapLibre, interface React, styles et tests Vitest.
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
- [Modèle de données et politiques RLS](docs/architecture.md)
- [Exploitation et validation](docs/operations.md)

Projet Supabase cible : `bcvzhegvjzujlgfnbwfg`, région `eu-west-3`. Les PR #2 et #3 indiquent que des migrations ont déjà été appliquées à ce projet ; leur état n’a pas été vérifié dans cette branche. Vérifier l’historique distant avant toute intervention, puis faire examiner et valider toute nouvelle migration sur une base de développement avant application avec un compte autorisé. Ne pas contourner les collisions en supprimant des tables existantes.

## Contribuer

Consulter le [flux de contribution](docs/workflow.md) pour passer d’une issue à une pull request.

Créer une branche depuis `main`, préserver les licences et l’attribution, ne pas committer de secrets. Vérifier `pnpm install --frozen-lockfile && pnpm test && pnpm run build` à la racine, ainsi que Compose pour les changements concernés, puis ouvrir une Pull Request décrivant les changements, contrôles et limites. Le code est sous licence Apache-2.0 ([LICENSE](LICENSE)) ; les données et styles conservent leurs propres licences.

L’éditeur de voirie permet de consulter les tronçons disponibles et de gérer des scénarios privés lorsque Supabase est configuré. Les simulations de trafic, agents, import IFC et intégrations BIM ne sont pas implémentés.
