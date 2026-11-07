# Prochaine étape : simulation et arrêts de bus

Suivi GitHub et point d'entrée pour la reprise : [issue bus #7](https://github.com/EcoDex-DAO/my-futur-town/issues/7).

## Diagnostic de la ligne 1 — 7 novembre 2026

Sur les données épinglées, la ligne 1 a 10 variantes, 561 courses et deux sens
GTFS. Les formes GTFS contiennent entre 523 et 951 coordonnées ; les séquences
ont entre 25 et 42 arrêts.

J'ai comparé les points d'arrêt aux formes de leur variante en projection locale
métrique, puis comparé la progression d'arrêt calculée depuis `shape_dist_traveled`
à la progression du point le plus proche sur la géométrie. La plupart des arrêts
sont à quelques mètres de leur forme (médiane par variante : 3,5–4,2 m ; P90 :
6,0–9,1 m), cohérent avec le décalage quai/voie. Cas notable : pour la variante
direction 1 « POISY COLLEGE », l'arrêt terminal `0:1POC` se projette à environ
2,9 m du tracé, mais l'ancien progrès GTFS était 1,0 alors que le point projeté
est à 0,9714, soit environ 397 m plus tôt. Le bus pouvait donc dépasser son quai
terminal sur la forme.

Correction appliquée à l'import : projeter chaque arrêt géographiquement sur la
forme de sa course, maintenir leur ordre et utiliser la distance GTFS pour
départager des segments de forme équivalents (boucles/croisements). Les formes
GTFS restent la géométrie des routes suivies ; les données source ne sont pas
retouchées. Il s'agit d'une correction des positions d'arrêt le long du tracé,
pas d'un reroutage vers un graphe routier ni d'une preuve de correspondance
parfaite avec la voirie OSM affichée. Ces derniers points nécessitent une
inspection visuelle des segments et un réseau routier exploitable.

Feuille de route pour améliorer la simulation et préparer la consultation puis le
déplacement d'un arrêt. Le diagnostic et la correction d'import de la ligne 1
figurent ci-dessus ; les autres étapes restent à réaliser ou à valider.

## Vision : aider une ville à repenser ses mobilités

Le produit pourrait devenir un espace d'exploration de scénarios : comprendre où
et quand les habitants se déplacent, proposer une modification du réseau, puis
comparer ses conséquences possibles avec une situation de référence. La carte
animée rend les hypothèses lisibles ; elle ne prouve pas, à elle seule, qu'un
projet réduira les embouteillages ou augmentera la fréquentation.

### Périmètre retenu : les bus d'abord

Pour la prochaine phase, se concentrer sur les bus et leurs arrêts. Les autres
modalités restent des pistes de réflexion à long terme, sans interface, données
ou moteur à développer maintenant. La ligne 1 sert de premier terrain d'essai ;
la conception doit pouvoir accueillir progressivement plusieurs lignes.

### Représentation selon le zoom

- **Vue de ville** : un petit symbole simple et léger par bus visible, sans
  modèle 3D détaillé. Pour les arrêts, afficher un seul symbole discret par lieu
  d'arrêt regroupé, même si les deux sens disposent chacun d'un quai distinct.
  Éviter de surcharger la carte et préserver la lisibilité des itinéraires.
- **Vue rapprochée** : conserver un bus 3D aux dimensions adaptées à la ville et
  afficher plus précisément les quais et leurs abris 3D symboliques, y compris
  les deux sens lorsque leurs positions sont distinctes.
- **Transition et sélection** : choisir les seuils de zoom et la taille des
  symboles par essai sur ordinateur et mobile. Le passage d'une représentation à
  l'autre doit rester cohérent, sans doublon apparent ; sélectionner un arrêt
  regroupé doit permettre d'accéder sans ambiguïté aux quais et sens associés.
  La sélection future d'un quai précis mettra celui-ci en surbrillance.
- **Regroupement fiable** : utiliser les relations de lieu ou de station du GTFS
  lorsqu'elles existent, sinon définir et documenter une règle prudente fondée sur
  les identifiants et la proximité. Ne pas fusionner automatiquement des arrêts
  différents uniquement parce qu'ils portent le même nom ; conserver toutes les
  identités et horaires des quais sous le symbole regroupé.

Ces niveaux de détail modifient uniquement la présentation : les positions et
horaires des véhicules et des quais restent distincts dans la simulation. Mesurer
le coût du regroupement et de l'affichage avec plusieurs lignes avant de fixer
des seuils définitifs.

### Questions auxquelles une collectivité pourrait chercher à répondre

- **Desservir mieux** : quels quartiers, équipements ou zones d'emploi sont mal
  accessibles à pied et en transport en commun, notamment aux heures de pointe ?
- **Adapter l'offre** : où ajouter une course, modifier une fréquence, déplacer
  un arrêt ou prolonger une ligne ? Quels voyageurs bénéficient de la modification
  et lesquels perdent une desserte ou une correspondance ?
- **Étudier une alternative** : où un vélo, un bus à haut niveau de service, une
  navette à la demande, un pôle d'échange ou un itinéraire piéton sécurisé pourrait
  compléter le réseau ? La pertinence dépend des données et des hypothèses locales.
- **Préparer un changement urbain** : quelle desserte envisager pour un nouveau
  quartier, un hôpital, une zone d'activité ou un chantier ?
- **Comparer les effets et compromis** : accessibilité, temps de parcours,
  correspondances, fréquence, couverture territoriale et estimation du coût ou
  des émissions, uniquement lorsque des données et méthodes adaptées existent.

### Trois couches à distinguer à l'écran et dans les données

1. **Offre observée ou publiée** : lignes, arrêts et horaires GTFS, voirie et
   équipements, avec date, origine et limites de qualité. Un horaire théorique n'est
   pas une position réelle et l'offre ne décrit pas à elle seule la demande.
2. **Demande et flux** : lorsque disponibles, comptages, montées/descentes,
   enquêtes origine-destination, population, emplois et équipements. Une densité
   de population ou une animation n'est pas un comptage de voyageurs. Sans données
   suffisantes, montrer une hypothèse ou une zone sans information, pas une mesure.
3. **Scénario proposé** : déplacement d'arrêt, fréquence, tracé ou nouvelle
   modalité, identifié comme hypothétique et comparé à la référence sur une même
   période. Conserver les hypothèses, versions de données et règles de calcul.

### Exemple de première expérimentation

Sur la ligne 1, sélectionner un arrêt et examiner les horaires, la zone accessible
à pied et, si elles existent, les données de fréquentation pertinentes. Dupliquer
la référence en scénario, déplacer un quai et visualiser les lignes concernées,
les habitants et équipements théoriquement couverts avant/après, ainsi que les
conflits de trajet ou d'horaires. Montrer aussi les personnes potentiellement moins
bien desservies. Commencer par des indicateurs de proximité fondés sur des données
disponibles ; un rayon à vol d'oiseau n'est qu'une approximation. Une accessibilité
à pied crédible demande ensuite un graphe piéton et ses contraintes.

La simulation des bus peut illustrer le scénario et ses horaires estimés, mais la
variation de fréquentation, la congestion et les émissions ne doivent pas être
annoncées sans données de demande, modèle validé et hypothèses explicites. Un
déplacement d'arrêt ne modifie pas automatiquement une ligne réelle ou ses
horaires officiels.

### Données, confiance et décisions à préparer

- Dresser un inventaire : GTFS et fréquence de mise à jour, graphe de voirie et
  cheminement piéton, limites administratives, population et emplois agrégés,
  équipements, comptages et éventuelles données de fréquentation. Pour chaque
  source, noter disponibilité, millésime, couverture, licence et qualité.
- Privilégier les données agrégées ; aucune trace individuelle n'est nécessaire
  pour le premier cas d'usage. Vérifier confidentialité et droits avant tout usage
  de données de déplacement plus fines.
- Comparer le même jour et la même tranche horaire, avec calendrier de service et
  sens de circulation. Distinguer la variation calculée, son incertitude et les
  informations manquantes ; vérifier les résultats avec les acteurs locaux.
- Éviter de supposer que tous les habitants marchent à la même vitesse ou peuvent
  emprunter tous les cheminements. Prévoir des hypothèses accessibles et explicites.
- Décisions ouvertes : premier utilisateur (collectivité, opérateur ou citoyen),
  périmètre géographique, problème prioritaire, indicateurs utiles et sources
  auxquelles le projet pourra effectivement accéder.

### Ordre conseillé

1. Fiabiliser et fluidifier une ligne, ses deux sens, ses arrêts et ses horaires.
2. Permettre la sélection d'un arrêt et la comparaison lisible d'un déplacement
   dans un scénario local, sans promettre de prévision de fréquentation.
3. Ajouter une première analyse de couverture et d'accessibilité avec provenance,
   hypothèses et limites ; valider son utilité sur un cas réel.
4. Explorer ensuite fréquence, tracé et multimodalité. N'introduire des modèles
   de demande ou de trafic que lorsque les données et leur validation le permettent.

## Constats sur la version actuelle

### Mise à jour de la simulation

- Une durée d'arrêt estimée de **12 secondes** est appliquée par défaut lorsque
  l'arrivée et le départ GTFS coïncident. Elle est réglable à 0, 5, 12 ou 20
  secondes. Cette moyenne est une hypothèse à affiner : les conditions réelles
  varient selon les arrêts et les courses.
- L'arrêt estimé est pris avant l'heure publiée, limité à la moitié du temps de
  trajet entrant et signalé à l'écran lorsqu'il est réduit. Les horaires source
  restent inchangés. Le premier arrêt conserve son départ publié ; au terminus,
  l'arrêt estimé précède l'arrivée publiée.
- Les abris symboliques utilisent le point de passage de la variante et son sens,
  avec un décalage à droite. Un quai associé à des variantes incompatibles garde
  une position représentative et expose une ambiguïté dans ses données. Ce rendu
  ne constitue pas un relevé de l'équipement réel ni une validation de la voirie.
- Les changements de vitesse et la pause conservent la continuité de l'horloge
  simulée. La validation visuelle des deux sens et les mesures de performance sur
  mobile restent nécessaires.
- Contrôle navigateur partiel : la simulation, la pause, le recentrage et les
  abris ont été observés sans API. Le test complet a dépassé son délai avec le
  rendu logiciel SwiftShader ; les tests mobile et horaires restent à relancer
  sur un environnement plus rapide. Ce contrôle ne valide pas toute la voirie.

- Avant l'optimisation, `src/BusSimulation.tsx` actualisait les véhicules au
  maximum une fois par seconde et envoyait aussi leurs modèles détaillés à toute
  la carte. Cela rendait le déplacement saccadé et faisait recalculer des formes
  qui n'étaient pas visibles.
- `src/bus-simulation.ts` prévoit un arrêt entre `arrival` et `departure`.
  Dans le fichier local `public/data/sibra-schedule.json`, les **21 698 horaires
  d'arrêt** de la ligne 1 ont cependant une arrivée égale au départ : aucun temps
  d'immobilisation observable n'est fourni ; la durée ajoutée est donc estimée.
  La vitesse entre deux arrêts est une
  interpolation théorique, pas une mesure GPS.
- Les bus suivent la géométrie GTFS de leur variante. Une forme GTFS peut différer
  visuellement de la voirie affichée, et la projection des arrêts le long de cette
  forme mérite d'être contrôlée avant de conclure à la cause précise d'un décalage.
- `src/bus-models.ts` dessine des abris symboliques décalés de 4,5 m à droite
  du point de passage, orientés selon le trajet. Le modèle ne décrit pas
  l'équipement réel et peut être ambigu pour un quai partagé entre variantes.
- Source et validité du jeu actuel : voir [sibra-data.md](sibra-data.md). Les
  horaires sont théoriques et valables du 4 novembre au 20 décembre 2026 ; vérifier
  l'édition disponible au moment de reprendre le travail.

### Amélioration de fluidité mise en place

- En lecture, l'animation actualise les véhicules 20 fois par seconde ; avec le
  réglage de mouvement réduit, elle descend à 10 fois par seconde. L'horloge
  affichée et le compteur ne déclenchent pas de rendu React à chaque image.
- En vue ville, seuls des points légers sont publiés. À partir du zoom 16, le
  modèle polygonal 3D est généré uniquement pour les véhicules qui entrent dans
  le champ de la carte. Les formes de parcours et les arrêts restent statiques
  pendant l'animation.
- Un déplacement ou un zoom de carte recalcule le niveau de détail à l'arrêt de
  la simulation également ; le zoom rapproché fonctionne donc quand les bus sont
  en pause.
- La recherche du segment de route utilise une recherche dichotomique sur les
  distances cumulées, plutôt qu'un parcours depuis le début de chaque forme.
- Le test navigateur de la pointe vérifie l'animation, pause, zoom rapproché et
  fonctionnement sans API. La capture est produite par
  `e2e/bus-simulation.spec.ts`.
- Cette optimisation ne remplace pas le contrôle visuel des formes GTFS contre
  la voirie ; l'arrêt ajouté est une estimation et elle n'a pas encore
  été mesurée sur un appareil mobile modeste. Ces points restent à traiter avant
  d'étendre la simulation à un réseau complet.

## Proposition : première livraison, une simulation lisible et cohérente

1. **Mesurer avant de corriger.** Choisir quelques courses et arrêts des deux
   sens, comparer coordonnées d'arrêt, projection sur la forme GTFS, position du
   bus et voirie affichée. Conserver des captures et des distances mesurées ;
   distinguer erreur d'import, décalage normal entre quai et voie, et divergence
   réelle entre la forme GTFS et la carte. Vérifier notamment les boucles, les
   variantes, les sens et les terminus.
2. **Rendre les mouvements fluides.** Garder une horloge de simulation absolue et
   interpoler à chaque image visible, y compris après changement de vitesse ou
   pause. Éviter de reconstruire inutilement tous les volumes et toutes les sources
   MapLibre à chaque image : profiler, choisir un rendu adapté et limiter le travail
   hors écran ou à faible zoom. Préserver les points légers à l'échelle de la ville
   et les dimensions réelles en zoom rapproché. Mesurer sur matériel modeste et
   vérifier le comportement avec mouvement réduit.
3. **Rendre l'arrêt visible sans inventer d'horaire réel.** Conserver les horaires
   GTFS intacts. Quand arrivée et départ sont identiques, appliquer dans la
   simulation une durée d'arrêt *estimée* configurable, uniquement quand le temps
   disponible entre deux passages le permet. Proposition initiale à valider :
   12 secondes, prises avant l'heure GTFS pour maintenir l'heure de départ et
   l'horaire des arrêts suivants ; borner cette durée pour éviter vitesse infinie
   ou temps de parcours négatif. Si le temps est insuffisant, réduire la durée et
   signaler la limite. Ne pas allonger une course ni modifier les horaires affichés
   silencieusement. Tester les terminus et courses après minuit séparément.
4. **Aligner arrêt et bus.** Identifier chaque point d'arrêt GTFS et son point de
   passage sur la géométrie de la variante. Afficher l'abri sur le côté de la voie,
   orienté d'après le trajet local et le sens ; faire immobiliser le bus au point
   de passage associé. Conserver le lien explicite entre abri, arrêt, quai et
   variantes, y compris lorsque deux sens partagent un nom. Ne pas déplacer les
   données source pour obtenir un résultat simplement esthétique.
5. **Corriger la géométrie seulement si nécessaire.** Si les écarts mesurés sont
   significatifs, évaluer un alignement sur un graphe routier adapté aux bus,
   avec sens uniques, accès, virages, continuité et boucles ; comparer les licences,
   l'attribution, la reproductibilité, le coût et les contraintes d'hébergement.
   Éviter une projection indépendante de chaque point, qui peut envoyer un bus sur
   une voie parallèle ou en sens interdit. Définir des seuils de confiance et
   conserver la forme GTFS comme repli explicite. Ne pas appeler un service externe
   ni modifier les données publiées sans vérifier ses conditions d'utilisation.

Critères d'acceptation : déplacement visiblement fluide en x1 et aux vitesses
accélérées, arrêt perceptible près du bon quai, positions continues à la pause et
au changement de vitesse, deux sens et variantes corrects, horaires source
préservés et absence de bus sur une voie manifestement incohérente dans les cas
vérifiés. Documenter les éventuels écarts résiduels plutôt que promettre une
précision routière non démontrée.

## Deuxième livraison : sélectionner un arrêt et consulter ses horaires

**État : implémentée localement, en attente de validation navigateur.** La sélection
fonctionne depuis la liste accessible au clavier, le repère 2D et l'abri 3D en mode
simulation. L'arrêt sélectionné est surligné. La fiche affiche son nom, son identifiant
GTFS, la ligne et le sens de chaque passage, et jusqu'à six horaires théoriques en
fonction de l'horloge simulée. Les horaires sont chargés à la demande depuis le jeu
statique local de la ligne 1; aucune API ni base distante n'est nécessaire. Le calcul
gère les services actifs à la date choisie et les courses après minuit rattachées à
la veille. Les dates hors période et l'absence de service sont signalées.

Limites actuelles : seuls les arrêts/courses présents dans le jeu local de la ligne 1
ont des horaires. Le quai GTFS n'est pas renseigné uniformément, aucun horaire temps
réel n'est affiché, et le calendrier GTFS livré arrive à échéance le 31 décembre 2026.
Les clics 2D ont une tolérance de 18 pixels; l'abri 3D est sélectionnable quand le
modèle d'arrêt est affiché. Le contrôle Playwright dédié reste à passer.

- Rendre la sélection possible sur l'abri et, à faible zoom, sur son repère 2D ;
  utiliser une zone de clic suffisante, y compris sur mobile. Mettre clairement
  en surbrillance l'arrêt sélectionné sans masquer la sélection de bâtiment ni
  gêner l'éditeur de voirie. Prévoir une alternative accessible au clavier.
- Afficher nom, identifiant, quai/sens si disponible, lignes et prochains passages
  **théoriques**, calculés à la date et à l'heure simulées. Distinguer les courses
  des deux sens et préciser le fuseau Europe/Paris. Gérer absence de service,
  fin de validité du jeu, passages après minuit et arrêt sans horaire chargé.
- La simulation actuelle ne contient les horaires que de la ligne 1 : ne pas
  annoncer des horaires des autres lignes tant qu'ils ne sont pas importés.
- Garder les catégories futures panneau, abri et recharge dans le modèle, sans
  attribuer ces équipements à un arrêt réel sans source fiable.

## Troisième livraison : déplacement d'arrêt dans un scénario

Séparer les données GTFS de référence, immuables, d'un scénario local contenant
des modifications versionnées et réversibles. Proposition : conserver un identifiant
stable de point d'arrêt, sa position initiale, sa position proposée et la
correspondance par variante/sens ; prévisualiser la modification avant validation,
permettre annulation et réinitialisation. Un même nom peut désigner plusieurs
quais : déplacer explicitement le quai choisi, pas tous les arrêts homonymes.

Au déplacement, **recalculer le parcours complet de chaque variante concernée**
sur un graphe routier adapté aux bus, en conservant l'ordre des autres arrêts et
en tenant compte des sens, accès et restrictions connus. Un déplacement d'un
quai ne modifie pas automatiquement le quai opposé. Proposer le nouveau parcours
en prévisualisation ; s'il est impossible, ambigu ou fondé sur des restrictions
inconnues, signaler le conflit et ne pas valider silencieusement un trajet erroné.

Adapter les horaires théoriques du scénario à partir du **delta de temps de
parcours estimé**, pas seulement du delta de distance : propager ce delta aux
arrêts suivants et aux courses concernées, sans changer les horaires GTFS source.
Rendre explicites le modèle de temps, la date, les correspondances, les terminus
et les hypothèses sur les battements ; signaler les horaires impossibles, les
correspondances perdues et les conflits potentiels de rotation. Ne pas inventer
une réaffectation des véhicules ou des chauffeurs. Prévoir l'annulation et la
comparaison avec le tracé et les horaires de référence. Persistance et partage du
scénario restent à définir ; aucune modification de base distante n'est prévue.

## Étapes 8 et suivantes : consommation et impact environnemental

Fonction future à préparer, pas un calcul à livrer pendant la correction de la
simulation. Objectif : estimer la consommation et les émissions d'une course,
puis les agréger par ligne et période pour comparer des scénarios. Commencer avec
un seul profil de bus par ligne ; prévoir dans le modèle des affectations par
course pour les flottes mixtes plus tard. Utiliser un profil SIBRA documenté s'il
est disponible et exploitable, sinon un profil générique explicitement identifié
comme hypothèse, paramétrable pour gazole, gaz/biogaz, électrique et autres.

- **Données à préparer** : source et version du profil, masse à vide, capacité,
  type d'énergie, rendement ou courbes de consommation, auxiliaires, ralenti,
  paramètres de conduite et de pente lorsqu'ils sont disponibles. Prévoir aussi
  facteurs d'émission avec unité, périmètre, zone géographique, millésime,
  source et incertitude ; ne pas inventer de paramètres spécifiques à SIBRA.
- **Poids et voyageurs** : estimer le nombre initial, les montées et descentes
  par arrêt et la masse moyenne des personnes ; borner le nombre de passagers à
  la capacité et signaler les hypothèses incohérentes. Une charge peut changer
  par segment, course et période. Prévoir le remplacement des hypothèses par des
  données agrégées réelles si disponibles et autorisées, sans exiger de données
  individuelles. La surcharge liée aux contrôleurs est une piste ultérieure, pas
  une simulation des contrôles ou des passagers aujourd'hui.
- **Déplacement** : prendre en compte vitesse, accélération, décélération, pente,
  distance et charge selon les données disponibles. Pour le freinage, utiliser
  des valeurs moyennes théoriques sourcées et paramétrables, notamment pour les
  particules de freinage et la récupération d'énergie des véhicules concernés.
  Affiner ces hypothèses lorsque des données adaptées deviennent disponibles ;
  préciser les unités, conditions et incertitudes. Si aucun facteur fiable n'est
  disponible pour un poste, le signaler comme inconnu plutôt que l'assimiler à zéro.
- **Temps à l'arrêt** : prévoir des durées observées ou hypothétiques et les
  consommations de ralenti et auxiliaires associées, selon la technologie. Ne pas
  attribuer un arrêt prolongé à une cause précise sans donnée. Régulation,
  changement de chauffeur et contrôle sont des explications possibles, pas des
  faits déduits des horaires.
- **Résultats et limites** : énergie par course et par ligne (litres, kg de gaz
  ou kWh selon le cas), CO₂e par période et, si pertinent, par voyageur-km avec
  dénominateur non nul. Distinguer émissions directes et amont de production de
  l'énergie ; les autres particules, la fabrication du véhicule et les
  infrastructures sont hors périmètre tant qu'elles ne sont pas modélisées. Ne pas appeler ce
  résultat un bilan environnemental complet. Comparer uniquement des scénarios
  calculés avec des hypothèses et périmètres cohérents.
- **Précalcul et invalidation** : calculer hors animation et mettre en cache par
  version de scénario, période, courses, parcours, horaires, profil du véhicule,
  charge par segment, durées d'arrêt, profil de conduite et facteurs d'énergie.
  Recalculer les parties affectées si l'un de ces éléments change, y compris les
  montées/descentes ou facteurs d'émission ; la position à l'écran ou le zoom ne
  doivent jamais déclencher le calcul. Une donnée d'occupation variable selon
  l'heure implique des résultats distincts par course ou profil de période.
- **Qualité** : comparer aux données mesurées disponibles, montrer les sources,
  incertitudes et analyses de sensibilité. La [Base Empreinte de l'ADEME](https://base-empreinte.ademe.fr/)
  est une source possible de facteurs ; évaluer les conditions applicables et la
  méthodologie avant tout chiffre publié. Ne pas revendiquer une conformité à une
  norme sans vérification indépendante appropriée.

## Tests et reprise

- Tests unitaires : interpolation aux extrémités et changements de vitesse,
  immobilisation estimée et bornée, séquences chronologiques, minuit GTFS,
  projections ambiguës, sens opposés et données invalides.
- Tests navigateur : animation et pause, bus au bon arrêt, sélection et horaires,
  état sans service, carte utilisable sans API, clavier et mobile. Comparer des
  positions à des instants simulés contrôlés au lieu de dépendre d'attentes longues.
- Mesurer la fluidité et l'usage CPU avant/après sur ordinateur et mobile ; tester
  le rendu logiciel sans confondre son coût avec celui d'un GPU matériel.
- Garder les jeux de test petits et reproductibles, puis vérifier quelques points
  du GTFS réel. Respecter attribution et conditions de redistribution indiquées
  dans [sibra-data.md](sibra-data.md).

## Architecture et performances à l'échelle d'une ville

Séparer trois responsabilités, avec une horloge de simulation partagée :

1. **Simulation** : calculer les états logiques à partir des horaires et des
   événements (départ, arrivée, arrêt), sans dépendre de la fréquence d'affichage.
   Préindexer courses, segments et distances ; éviter un balayage complet des
   horaires ou une recherche de trajet à chaque image. Le hors-écran continue
   d'évoluer logiquement et sa position est retrouvée au retour dans la vue.
2. **Présentation** : interpoler la position et l'orientation aux instants
   affichés entre états connus, tout en respectant les points de passage, virages,
   arrêts, pause et changement de vitesse. Ne pas interpoler à vol d'oiseau entre
   deux positions séparées par un virage : évaluer la progression sur la géométrie
   du trajet. Le pas logique et la fréquence des images sont indépendants ; une
   image sautée ne change pas l'heure ni le parcours simulés.
3. **Rendu** : garder les géométries statiques en mémoire et mettre à jour les
   transformations des véhicules visibles, au lieu de reconstruire et renvoyer
   toute une source GeoJSON avec plusieurs polygones par véhicule à chaque image.
   Étudier une couche personnalisée MapLibre et le rendu par instances pour les
   modèles identiques : [interface MapLibre](https://maplibre.org/maplibre-gl-js/docs/API/interfaces/CustomLayerInterface/),
   [InstancedMesh de Three.js](https://threejs.org/docs/pages/InstancedMesh.html).
   C'est une piste à mesurer, pas une dépendance ou une garantie de performance.

Utiliser plusieurs niveaux de détail : en vue de ville, indicateurs ou flux
agrégés ; en vue de quartier, véhicules simplifiés ; de près, modèles 3D légers.
Limiter le rendu aux objets visibles et réduire les détails selon la capacité de
l'appareil ; conserver le mode de mouvement réduit et le contexte WebGL perdu ou
restauré. Éviter des mises à jour React pour chaque véhicule et chaque image.
Des workers peuvent déplacer les calculs lourds hors du fil d'interface, mais ne
réduisent pas automatiquement leur coût total : les ajouter après profilage.

La simulation d'horaires de bus ne suffit pas à produire un trafic routier
réaliste. Les voitures, priorités, feux, files, congestion et interactions entre
véhicules demandent un modèle de trafic et des données supplémentaires. Prévoir
une interface commune pour les états et le rendu, sans imposer dès maintenant un
moteur microscopique, un service serveur ni la simulation individuelle de chaque
véhicule ; envisager des flux agrégés loin de la zone étudiée. Distinguer les
observations réelles des flux et comportements synthétiques.

**Validation progressive avant choix définitif** : établir une référence sur la
ligne 1, puis essayer des charges synthétiques reproductibles (par exemple 100,
1 000 et 10 000 véhicules, sans les présenter comme du trafic réel). Mesurer FPS
et temps de frame, CPU, mémoire, démarrage et réactivité de l'interface sur
ordinateur et mobile représentatifs. Vérifier transitions de zoom, virages,
arrêts, accélération, pause et retour après masquage de l'onglet. Fixer les budgets
et le nombre de véhicules à partir de ces mesures, et comparer le coût du rendu
actuel à un prototype instancié avant d'adopter une nouvelle bibliothèque.

### Prompt de reprise

> Lis `docs/prochaine-etape-simulation-bus.md`, les instructions actuelles du
> dépôt et l'état Git. Implémente d'abord uniquement la première livraison :
> diagnostic mesuré, fluidité, arrêt estimé clairement indiqué et cohérence avec
> les quais et la voirie. Vérifie les deux sens avec des tests ciblés et dans le
> navigateur. Préserve le travail existant et les données source. Documente les
> limites ; ne déploie pas et ne modifie pas de base distante. Réserve la sélection
> et le déplacement des arrêts aux étapes suivantes. Utilise pnpm et délègue les
> tâches de programmation indépendantes à des modèles économes si disponibles.
