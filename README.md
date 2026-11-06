# My Futur Town

Prototype open source de jumeau numérique urbain d’Annecy. Une application Next.js réunit l’interface React/TypeScript et les routes serveur ; MapLibre GL JS affiche la carte dans le navigateur. Un schéma Supabase/PostGIS est préparé pour les futurs imports et scénarios.

## Démarrage rapide

Node.js >= 22.12 et pnpm sont requis. Activez Corepack avec `corepack enable` pour utiliser la version de pnpm indiquée dans `package.json`. Le fichier `pnpm-lock.yaml` verrouille les dépendances ; conservez-le à jour lors de leur modification.

```sh
pnpm install --frozen-lockfile
pnpm run dev
```

Ouvrir http://localhost:5173. Aucun compte, aucune clé et aucune base ne sont nécessaires pour la carte. Internet et WebGL sont requis. Les tuiles proviennent directement d’OpenFreeMap. Zoomer, déplacer, tourner et incliner avec les contrôles ou Ctrl + glisser. Cliquer sur un objet pour voir les propriétés de sa tuile. Le bouton de recentrage restaure la vue d’Annecy. La carte reste utilisable si les routes API ne répondent pas.

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
- `CORS_ORIGINS` : liste séparée par des virgules des origines autorisées pour les requêtes API entre origines ; valeur par défaut `http://localhost:5173`. Cette variable serveur est lue à l’exécution et ne concerne pas les requêtes sur la même origine.

**Toutes les variables `NEXT_PUBLIC_*` sont publiques et incorporées au bundle lors du build.** Toute modification nécessite une reconstruction, y compris avec Compose. Ne jamais y placer `service_role`, mot de passe, URL PostgreSQL privée ou autre secret. Aucun SDK Supabase n’est embarqué dans cette phase.

## Vercel

Importer `EcoDex-DAO/my-futur-town`, sélectionner le framework Next.js et la racine du dépôt comme Root Directory. `vercel.json` indique le framework ; le Root Directory se règle dans Vercel. Le build et les routes serveur sont pris en charge par Next.js. Aucune migration automatique ou publication n’est effectuée par ce dépôt.

## Données et architecture

- [Sources, licences et limites](docs/data-sources.md)
- [Modèle de données et politiques RLS](docs/architecture.md)
- [Exploitation et validation](docs/operations.md)

Projet Supabase cible : `bcvzhegvjzujlgfnbwfg`, région `eu-west-3`, PostGIS déjà activé. La migration versionnée est préparée, **pas appliquée à ce projet**. La faire examiner et la valider sur une base de développement avant application via Supabase CLI ou SQL Editor avec un compte autorisé. Elle ne contient aucun DROP/TRUNCATE et crée uniquement de nouvelles tables ; une collision avec des tables existantes doit être examinée, pas contournée en les supprimant.

## Contribuer

Consulter le [flux de contribution](docs/workflow.md) pour passer d’une issue à une pull request.

Créer une branche depuis `main`, préserver les licences et l’attribution, ne pas committer de secrets. Vérifier `pnpm install --frozen-lockfile && pnpm test && pnpm run build` à la racine, ainsi que Compose pour les changements concernés, puis ouvrir une Pull Request décrivant les changements, contrôles et limites. Le code est sous licence Apache-2.0 ([LICENSE](LICENSE)) ; les données et styles conservent leurs propres licences.

Le périmètre actuel couvre la consultation des données de référence. L’éditeur de scénarios est un emplacement réservé. Les simulations de trafic, agents, import IFC et intégrations BIM ne sont pas implémentés.
