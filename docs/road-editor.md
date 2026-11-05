# Premier incrément CDC — routes et scénarios

## Ce qui est implémenté

- Couche de voirie **indépendante** du fond cartographique, chargée depuis Supabase en GeoJSON.
- Nœuds OSM partagés et segments dirigés entre nœuds consécutifs. Les identifiants OSM composent la clé de source ; les UUID sont déterministes dans un instantané.
- Connexion utilisateur Supabase par e-mail/mot de passe ; les scénarios sont privés grâce à la RLS. La confirmation d’e-mail dépend de la configuration Auth du projet ; aucune configuration Auth distante n’est modifiée par le code.
- Création, chargement et suppression de scénarios ; chaque scénario est lié à une couche/version immuable.
- Profil d’un tronçon : sens (double, avant, inverse, fermé aux voitures), nombre de voies, largeur totale, largeur par voie auto, largeur cyclable totale, trottoirs et vitesse éventuelle.
- Prévisualisation, enregistrement, comparaison à la référence et retrait d’une modification pour restaurer le tronçon.
- Graphe dirigé persistant via `yft_road_graph`, calculé à partir du même profil que l’affichage. Aucun moteur d’itinéraire ni simulation de trafic n’est implémenté.

## Configuration sur Vercel

Conserver Root Directory `frontend`, Vite, `npm run build` et `dist`. Ajouter :

```text
VITE_SUPABASE_URL=https://bcvzhegvjzujlgfnbwfg.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<clé publique publishable ou legacy anon>
```

Ces deux valeurs sont publiques dans le navigateur. Le build refuse les clés `service_role`, secrètes et les jetons de gestion. Ne jamais utiliser `SUPABASE_ACCESS_TOKEN` ici. Dans Supabase Auth → URL Configuration, vérifier que Site URL correspond à `https://my-futur-town.vercel.app` pour les confirmations d’e-mail. Les paramètres SMTP et la confirmation e-mail restent ceux du projet.

Après modification des variables, reconstruire le déploiement ; les anciens fichiers ne changent pas rétroactivement.

Sans cette configuration, le fond de carte reste utilisable mais le panneau explique que Supabase n’est pas configuré. Sans import réel, il affiche « Aucun import disponible » ; aucune route synthétique n’est substituée.

## Base et provenance

La migration additive `202611050003_road_scenarios.sql` ajoute les tables `road_nodes` et `road_segments`, les métadonnées de scénarios et les fonctions GeoJSON/graphe. Les nouvelles tables sont publiques en lecture uniquement ; leurs droits d’écriture restent réservés à un importeur serveur autorisé.

La fonction de validation et le trigger des changements vérifient les nombres, le sens, l’allocation de largeurs et l’appartenance à l’instantané du scénario. Le graphe d’un autre utilisateur n’est pas accessible. La géométrie de référence n’est jamais modifiée par l’éditeur de profils ; le déplacement géométrique sera une tranche ultérieure.

## Import réel reproductible

Source : OpenStreetMap, via l’API Overpass publique, licence ODbL 1.0, attribution © OpenStreetMap contributors. Endpoint : https://overpass-api.de/api/interpreter. Les données et la disponibilité du service ne sont pas garanties. Respecter les limites du service : une requête bornée, pas de téléchargement automatique à chaque visite.

Périmètre pilote fixé dans `scripts/importers/osm_roads.py` : sud 45.897, ouest 6.124, nord 45.903, est 6.132. Il s’agit d’un petit secteur central d’Annecy choisi pour la démonstration, pas d’une limite administrative. Les voies retournées sont conservées entières pour préserver leurs vrais nœuds ; certains tronçons peuvent dépasser le rectangle. Le premier import exclut les chemins piétons et certains types routiers, pas toute la voirie d’Annecy.

Avec Python 3, depuis la racine :

```sh
python3 scripts/importers/osm_roads.py --fetch /tmp/annecy-roads.json
python3 scripts/importers/osm_roads.py --input /tmp/annecy-roads.json --output /tmp/annecy-roads.sql
```

Le fichier SQL généré doit être examiné et appliqué par une identité serveur autorisée au projet choisi. Le générateur n’exécute jamais de SQL distant. Les chaînes sont échappées, les coordonnées et les géométries incomplètes sont contrôlées, les réponses Overpass avec erreur/timeout sont rejetées. Une réponse vide ne devient pas un import réussi. Aucune suppression de référence n’est générée.

Le nom/version d’instantané dépend du timestamp OSM et du hash du contenu. Réimporter le même fichier conserve les UUID et ne duplique pas les objets (`ON CONFLICT DO NOTHING`). Un nouvel état OSM produit une nouvelle couche : les scénarios antérieurs gardent leur référence. La clé métier `osm:way:…:segment:nodeA:nodeB` permet d’identifier le même segment entre instantanés tant que les nœuds source ne changent pas ; son rapprochement après édition du réseau réel demandera une procédure dédiée.

## Unités, rendu et limites

Les géométries sont en EPSG:4326, coordonnées longitude/latitude. Les longueurs sont calculées dans PostGIS après transformation en EPSG:2154 (Lambert-93), en mètres. Il n’y a ni altitude ni relief inventé.

Les propriétés OSM absentes, ambiguës ou non numériques restent nulles : une largeur inconnue n’est pas une mesure de 9 m. Lorsque l’utilisateur édite, le formulaire propose explicitement des **hypothèses** (par exemple 2 voies de 3 m dans une largeur de 9 m) qu’il peut changer. Elles ne sont enregistrées que dans son scénario. Le sens « avant » correspond à l’ordre des nœuds OSM, pas à un point cardinal.

Le dessin utilise une ligne symbolique variant avec le zoom ; une ligne verte indique une largeur cyclable positive et des flèches indiquent le sens. Ce rendu n’est pas une emprise de génie civil, ne place pas des séparateurs précis par voie et ne distingue pas encore les aménagements gauche/droite. Le profil de largeur, lui, est validé en mètres. Sans largeur source, la référence est représentée par un trait symbolique.

Les nœuds communs conservent la connectivité OSM et les tags de pont/niveau sont conservés. Les restrictions de tournants, règles d’accès détaillées, modifications de tracé et raccordements topologiques après déplacement ne sont pas encore modélisés. Le graphe ne doit donc pas être présenté comme un routeur automobile/bus complet. Une direction source inconnue reste indéterminée dans le graphe de référence ; le scénario peut la fixer explicitement.

## Validation et état de livraison

Les tests SQL vérifient la transformation double sens → sens unique avec piste cyclable, la concordance du graphe, la protection des références, l’isolation utilisateur, la sauvegarde entre deux connexions et la restauration. Leurs fixtures techniques restent dans les bases jetables ; elles ne sont pas les données d’Annecy.

Le test complet demandé par le CDC exige ensuite : import de vraies routes, connexion sur le frontend, sélection d’un tronçon double sens, modification, sauvegarde, rechargement du navigateur, rechargement du scénario puis restauration. Ce test de bout en bout ne peut pas être remplacé par les seuls tests unitaires ou SQL. Le statut réel de cette étape est consigné dans le compte rendu de PR.

## État du secteur réel et test connecté

Le premier instantané est importé : version `20261105T222406Z-b0b66162`, 522 tronçons et 507 nœuds. Sa réponse source compressée et son manifeste sont conservés dans `data/reference/osm/`. `--input` accepte également ces archives `.gz` pour reproduire exactement le même SQL sans nouvel appel Overpass.

Le parcours avec authentification réelle, sens unique cyclable, sauvegarde, rechargement et restauration a été vérifié dans le navigateur cloud sur le projet existant. Il utilise un vrai tronçon de la rue Sommeiller. Le script optionnel suivant recommence ce contrôle avec une identité technique temporaire :

```sh
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/chemin/vers/chromium python3 scripts/test-connected-roads.py
```

Il requiert le jeton de gestion injecté dans `SUPABASE_ACCESS_TOKEN`. Il récupère une clé publique pour le build et une clé serveur uniquement en mémoire pour créer/supprimer le compte de test. La clé serveur ne passe pas à Vite. Les traces/captures d’authentification sont désactivées et les sorties sont expurgées. Les scénarios sont supprimés uniquement pour l’identifiant fraîchement créé ; l’empreinte du référentiel doit rester identique. Ce test modifie temporairement le projet existant : ce n’est pas un contrôle en lecture seule et il n’est jamais déclenché automatiquement par la CI.

La recherche de rue dans l’éditeur est limitée aux tronçons déjà importés ; elle ne remplace pas la recherche d’adresse prévue par le CDC.
