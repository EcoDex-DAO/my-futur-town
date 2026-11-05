# Your Futur Town

Plateforme open source d’aménagement territorial, ville pilote Annecy. Le [CDC v1](docs/cahier-des-charges-v1.md) est la référence ; voir la [reprise et la feuille de route](docs/roadmap-cdc.md). React, TypeScript, Vite et MapLibre GL JS côté navigateur ; API FastAPI facultative ; schéma Supabase/PostGIS préparé pour les futurs imports et scénarios.

## Démarrage rapide

Node.js >= 22.12 et npm sont requis.

```sh
cd frontend
npm install
npm run dev
```

Ouvrir l’adresse locale indiquée par Vite (port 5173). Aucun compte, aucune clé et aucun backend ne sont nécessaires pour la carte. Internet et WebGL sont requis. Les tuiles proviennent directement d’OpenFreeMap. Zoomer, déplacer, tourner et incliner avec les contrôles ou Ctrl + glisser. Cliquer sur un objet pour voir les propriétés de sa tuile. Le bouton de recentrage restaure la vue d’Annecy.

```sh
npm run build
npm run preview
npm test
```

`npm ci` est recommandé en CI pour respecter le lockfile. MapLibre représente l’essentiel du bundle ; Vite peut signaler une taille de chunk élevée.

## Docker Compose

Docker Engine et Docker Compose v2 sont requis. À la racine :

```sh
docker compose up --build
# Autre terminal :
python3 scripts/smoke.py
# Arrêt :
docker compose down
```

Le frontend écoute sur le port 5173 et FastAPI sur le port 8000 (interfaces loopback uniquement). Swagger est disponible sur `/docs`. Les services ont leurs propres healthchecks et le frontend ne dépend pas de la disponibilité de l’API. La base distante n’est pas démarrée ou modifiée par Compose. Aucun mot de passe de base n’est requis.

Pour le backend hors Docker (Python 3.12) :

```sh
cd backend
python3 -m venv .venv
. .venv/bin/activate
pip install -r requirements-dev.txt
python -m unittest discover -s tests -v
uvicorn app.main:app --reload
```

Dans un cloud à proxy TLS, fournir la CA de confiance au build via un secret BuildKit `proxy_ca` pour chacun des services ; voir [exploitation](docs/operations.md). Ne jamais désactiver la vérification TLS.

## Configuration

[.env.example](.env.example) ne contient que des valeurs publiques. Pour Vite, copier les valeurs nécessaires dans `frontend/.env.local` ou les définir dans Vercel. Pour Compose, les définir dans un `.env` racine. Les fichiers `.env` sont ignorés par Git.

- `VITE_MAP_STYLE_URL` : style MapLibre compatible OpenMapTiles, par défaut OpenFreeMap Liberty.
- `VITE_API_URL` : URL publique d’une API réellement hébergée, optionnelle. Vide = carte autonome. Ne pas définir `localhost` sur Vercel.
- `VITE_SUPABASE_URL` et `VITE_SUPABASE_PUBLISHABLE_KEY` : configuration publique pour les références routières et les scénarios ; voir le guide voirie.
- `CORS_ORIGINS` : liste séparée par des virgules des origines frontend autorisées par l’API.

**Toutes les variables `VITE_*` sont publiques.** Ne jamais y placer `service_role`, mot de passe, URL PostgreSQL privée ou autre secret. Le client Supabase utilise uniquement la clé publique et les droits RLS.

## Vercel

Importer `EcoDex-DAO/my-futur-town` puis choisir :

| Paramètre        | Valeur          |
| ---------------- | --------------- |
| Framework        | Vite            |
| Root Directory   | `frontend`      |
| Build Command    | `npm run build` |
| Output Directory | `dist`          |

`frontend/vercel.json` fixe ces réglages sauf le Root Directory, à renseigner dans Vercel. Laisser `VITE_API_URL` vide tant que FastAPI n’est pas hébergé. Le déploiement Vercel héberge uniquement le frontend. Aucune migration automatique.

## Données et architecture

- [Sources, licences et limites](docs/data-sources.md)
- [Modèle de données et politiques RLS](docs/architecture.md)
- [Exploitation et validation](docs/operations.md)
- [Préparation du projet Supabase](docs/supabase-setup.md)
- [Premier éditeur de voirie et scénarios](docs/road-editor.md)
- [Versions et retours arrière](docs/versions-and-rollback.md)
- [Historique des versions](CHANGELOG.md)

Projet Supabase cible : `bcvzhegvjzujlgfnbwfg`, région `eu-west-3`, PostGIS déjà activé. Les migrations `202611050001`, `202611050002` et `202611050003` sont appliquées et enregistrées sur ce projet ; voir les relevés dans `docs/supabase-applied.md` et `docs/cdc-progress.md`. Ne pas les rejouer. Elles ne suppriment aucune donnée de référence ; une collision avec des tables existantes doit être examinée, pas contournée en les supprimant.

## Contribuer

Créer une branche depuis `main`, préserver les licences et l’attribution, ne pas committer de secrets. Vérifier `npm ci && npm test && npm run build` dans `frontend`, les tests Python et Compose pour les changements concernés, puis ouvrir une Pull Request décrivant les changements, contrôles et limites. Le code est sous licence Apache-2.0 ([LICENSE](LICENSE)) ; les données et styles conservent leurs propres licences.

Le socle cartographique est fonctionnel. Le premier incrément CDC ajoute un éditeur de profils routiers et de scénarios privés ; il nécessite une configuration Supabase publique, la migration voirie et un import OSM réel. Le fond de carte seul ne constitue pas un réseau éditable. Les simulations de trafic, agents, import IFC et intégrations BIM ne sont pas implémentés.
