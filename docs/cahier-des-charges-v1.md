# CAHIER DES CHARGES — YOUR FUTUR TOWN

**Version :** 1.0
**Date :** 5 novembre 2026
**Nature :** Plateforme open source de simulation et d'aménagement territorial
**Ville pilote :** Annecy, France
**Dépôt GitHub :** `EcoDex-DAO/my-futur-town`

---

## 1. Présentation générale

### 1.1. Vision

Your Futur Town (YFT) est une plateforme open source permettant de représenter une ville en 3D, de consulter ses infrastructures existantes et de tester virtuellement des transformations urbaines.

L'application doit permettre de modifier les aménagements d'une ville et d'étudier leurs conséquences techniques, énergétiques, environnementales et fonctionnelles.

Le projet débute avec Annecy, mais son architecture doit permettre d'intégrer d'autres villes ultérieurement.

### 1.2. Principes fondamentaux

1. **Ville reconnaissable :** représentation 3D simple, fidèle à la géographie réelle, sans photoréalisme.
2. **Objets indépendants :** les routes, bâtiments, parkings, arrêts et réseaux doivent être des objets géographiques identifiables et modifiables.
3. **Open Data :** exploitation prioritaire des données publiques existantes.
4. **Scénarios non destructifs :** les modifications ne doivent jamais altérer les données de référence.
5. **Simulation par hypothèses :** utiliser des valeurs réelles lorsque disponibles, sinon des hypothèses explicites et ajustables.
6. **Modularité :** permettre l'ajout de simulateurs sans reconstruire l'application.
7. **Liberté d'expérimentation :** accepter les projets atypiques ou volontairement extrêmes, tout en signalant leurs limites de faisabilité.

L'objectif n'est pas de reproduire Anne-Sims à partir de son code, mais de développer une nouvelle application répondant à des besoins similaires, avec des fonctionnalités de modification territoriale plus poussées.

---

## 2. Socle cartographique 3D

### 2.1. Représentation de la ville

La ville doit être représentée avec un style graphique simple de type GIS 3D / Low Poly.

Les éléments suivants doivent permettre de reconnaître Annecy :

- Le lac et les principaux cours d'eau.
- Le relief environnant.
- Les rues, carrefours, ponts et places.
- Les bâtiments, avec leur emprise réelle et une hauteur connue ou estimée.
- Les espaces verts et principales zones naturelles.
- Les grands équipements publics et infrastructures.

Les bâtiments peuvent être représentés par de simples volumes extrudés.

La carte doit rester fluide sur un ordinateur standard et dans un navigateur web.

### 2.2. Objets géographiques indépendants

**Exigence fondamentale : les routes ne doivent pas être de simples dessins intégrés au fond de carte.**

Chaque infrastructure doit posséder :

- Un identifiant stable.
- Une catégorie d'objet.
- Une géométrie géoréférencée.
- Des propriétés techniques.
- Une référence à sa source de données.
- Une date ou version de référence.
- Un état initial et des modifications propres à chaque scénario.

Les objets doivent être sélectionnables et modifiables depuis l'interface.

Le fond cartographique sert uniquement de repère visuel. Les infrastructures éditables sont générées à partir de données géographiques structurées.

### 2.3. Interface de navigation

L'utilisateur doit pouvoir :

- Se déplacer librement dans la ville.
- Zoomer, incliner et faire tourner la caméra.
- Basculer entre une vue 2D et une vue 3D.
- Rechercher une adresse ou un lieu.
- Sélectionner un bâtiment, une route ou une parcelle.
- Activer et désactiver les couches géographiques.
- Afficher les propriétés des objets sélectionnés.

### 2.4. Gestion des données géographiques

Le système devra utiliser un référentiel géographique cohérent.

Les données importées devront être transformées dans un système de coordonnées approprié, avec gestion explicite des unités, des altitudes et des projections.

Pour la France, les traitements métriques pourront notamment utiliser Lambert-93, tandis que les échanges cartographiques utiliseront les systèmes compatibles avec les outils web.

Les géométries de référence devront être conservées séparément des modifications expérimentales.

---

## 3. Données Open Data

L'objectif est d'intégrer progressivement le maximum de données publiques utiles.

### 3.1. Données prioritaires

| Domaine | Données attendues | Sources candidates |
|---|---|---|
| Voirie | Routes, intersections, sens de circulation, limitations | OpenStreetMap, IGN |
| Bâtiments | Emprises, hauteurs, usages | IGN, OSM |
| Cadastre | Parcelles et références cadastrales | Cadastre Etalab, DGFiP |
| Relief | Altitudes et terrain | IGN |
| Transports | Lignes, arrêts, horaires et tracés | GTFS SIBRA |
| Réseau de chaleur | Tracés et caractéristiques accessibles | Open Data réseaux de chaleur, gestionnaires |
| Électricité | Réseaux et équipements publics | Enedis, RTE |
| Gaz | Réseaux et infrastructures accessibles | GRDF, gestionnaires |
| Énergie | DPE, consommations agrégées | ADEME, SDES |
| Urbanisme | PLU/PLUi et zonages | Géoportail de l'urbanisme |
| Météo | Température, ensoleillement, précipitations | Météo-France et sources ouvertes |

La disponibilité, les licences, les limites d'utilisation et la précision de chaque source devront être vérifiées avant son intégration.

Les données absentes ne doivent pas être inventées. Les estimations devront être signalées.

### 3.2. Importation et actualisation

Chaque source doit disposer, si nécessaire, d'un importateur indépendant.

Les importations doivent être reproductibles, documentées et actualisables sans effacer les scénarios enregistrés.

L'interface devra afficher la provenance des informations et distinguer les données observées, estimées et hypothétiques.

---

## 4. Module 1 — Édition de voirie

### 4.1. Objectif

Permettre de transformer virtuellement les rues d'Annecy en modifiant leur configuration géométrique et fonctionnelle.

### 4.2. Fonctionnalités

L'utilisateur doit pouvoir sélectionner un tronçon routier puis modifier :

- Son sens de circulation : double sens, sens unique, fermeture.
- Le nombre de voies automobiles.
- La largeur totale et la répartition de l'espace.
- Les trottoirs.
- Les pistes et bandes cyclables.
- Les voies réservées aux bus.
- La limitation de vitesse.
- Les restrictions d'accès selon le type de véhicule.
- Son tracé géométrique, lorsque cela est nécessaire.

Les intersections doivent rester identifiées et les connexions au réseau routier doivent être mises à jour.

La représentation visuelle doit correspondre aux propriétés de l'objet.

### 4.3. Premier scénario de démonstration

**Transformer une route à double sens en route à sens unique avec piste cyclable.**

Procédure :

1. Sélectionner une route sur la carte.
2. Ouvrir son panneau de propriétés.
3. Passer de double sens à sens unique.
4. Ajouter une piste cyclable.
5. Ajuster la répartition des largeurs.
6. Visualiser la modification.
7. Enregistrer le scénario.
8. Comparer avec l'état initial.

La modification devra également être enregistrée dans le modèle topologique de voirie, afin de permettre plus tard le calcul de nouveaux itinéraires.

**Critère de validation :** la transformation est visible, persistante après rechargement et réversible sans altérer les données d'origine.

---

## 5. Module 2 — Réseau de bus

### 5.1. Objectif

Représenter le réseau de transport collectif d'Annecy et permettre la modification ou la création de lignes.

### 5.2. Importation

Importer les données GTFS disponibles pour récupérer :

- Les lignes de transport.
- Les arrêts et leurs positions.
- Les trajets et leurs variantes.
- Les horaires théoriques.
- Les calendriers de circulation.

Les données devront être reliées au réseau routier éditable.

### 5.3. Éditeur de lignes

L'utilisateur doit pouvoir :

- Sélectionner une ligne existante.
- Déplacer un arrêt par glisser-déposer.
- Ajouter ou supprimer un arrêt.
- Créer une nouvelle ligne.
- Définir l'ordre de passage.
- Créer des arrêts temporaires.
- Désactiver des arrêts pendant un scénario.
- Modifier le trajet proposé en ajoutant des points de passage.
- Modifier la fréquence et les horaires.

Le système doit proposer automatiquement un itinéraire entre les arrêts en utilisant le réseau routier disponible.

Les arrêts déplacés doivent pouvoir être repositionnés sur des emplacements compatibles avec la voirie.

### 5.4. Calculs simplifiés

Le module devra estimer :

- La longueur de la ligne.
- Le temps de parcours.
- La durée d'un cycle aller-retour.
- La fréquence de passage.
- Le nombre de départs par heure.
- Le nombre de véhicules nécessaires.
- La capacité horaire de transport.

Ces résultats devront être calculés à partir d'hypothèses explicites : vitesse commerciale, temps d'arrêt, régulation et capacité des véhicules.

### 5.5. Interaction avec les routes

Une modification de voirie doit pouvoir affecter les itinéraires de bus.

Exemple : une route devient à sens unique. Le logiciel doit détecter si une ligne existante emprunte cette route dans le sens désormais interdit et proposer un nouveau trajet.

---

## 6. Module 3 — Parking multimodal Trésum / Providence

### 6.1. Site pilote

Le premier projet d'aménagement concernera le secteur de stationnement Trésum / Providence, à proximité de l'hôtel de police d'Annecy.

Le périmètre exact sera sélectionné sur la carte à partir des données géographiques disponibles.

### 6.2. Objectif

Tester la transformation d'une partie du stationnement existant en pôle multimodal.

L'utilisateur pourra augmenter virtuellement la capacité du parking puis estimer les besoins de transport permettant de transférer les automobilistes vers les bus et les vélos.

### 6.3. Générateur de parking

L'utilisateur sélectionne une emprise et définit :

- La surface du parking.
- Le nombre de niveaux en élévation.
- Le nombre de niveaux souterrains.
- La hauteur de chaque niveau.
- La surface moyenne nécessaire par place, circulations comprises.
- Les surfaces réservées aux accès et équipements.
- Les capacités de stationnement automobile et cyclable.

Le système génère un volume 3D simplifié et estime la capacité totale.

Il doit autoriser les configurations volontairement extrêmes, y compris les parkings très hauts, en signalant les hypothèses irréalistes sans bloquer l'expérimentation.

### 6.4. Conversion voiture → bus / vélo

L'utilisateur pourra définir :

- Le flux de voitures arrivant par heure.
- Le nombre moyen d'occupants par voiture.
- Le taux d'utilisation du parking.
- La part des usagers prenant le bus.
- La part utilisant un vélo.
- La capacité des bus.
- La fréquence et la durée des rotations.

Le système calculera la demande de transport, les départs de bus nécessaires, le nombre estimé de véhicules et les besoins en vélos.

Le dimensionnement devra progressivement prendre en compte la durée de stationnement, les pointes horaires et les flux sortants.

### 6.5. Connexion avec le module bus

Le parking pourra être relié à une ligne existante ou à une nouvelle ligne créée dans l'éditeur.

L'utilisateur pourra tester plusieurs variantes : fréquence renforcée, navette dédiée, nouvelle ligne, capacité différente des véhicules.

### 6.6. Comparaison

Les scénarios devront permettre de comparer la capacité de stationnement, le nombre de voyageurs transférés, les besoins de transport et les hypothèses d'exploitation.

Les résultats seront présentés comme des estimations et non comme des prévisions de trafic réel tant qu'aucun modèle calibré ne sera disponible.

---

## 7. Module 4 — Rénovation énergétique des bâtiments

### 7.1. Site pilote

**19 rue des Carillons, 74940 Annecy.**

L'objectif est de créer un outil de prédiagnostic énergétique simplifié, réutilisable pour d'autres bâtiments.

### 7.2. État initial

Le logiciel doit permettre de renseigner ou d'estimer :

- L'emprise au sol.
- Le nombre de niveaux.
- La surface chauffée.
- L'année de construction.
- Le nombre de logements.
- L'occupation.
- Les matériaux des murs.
- L'isolation de la toiture et des planchers.
- Le type de menuiseries.
- La ventilation.
- Le chauffage existant, initialement considéré comme individuel au gaz.

Les données inconnues seront remplacées par des hypothèses ajustables, clairement identifiées.

La surface chauffée pourra être estimée à partir de la géométrie du bâtiment et du nombre de niveaux.

### 7.3. Calcul énergétique simplifié

À partir de ratios de consommation en kWh/m²/an et des caractéristiques de l'enveloppe, le logiciel estimera les besoins énergétiques.

Il devra permettre de comparer différentes compositions de murs, toitures et planchers.

Les matériaux devront disposer de caractéristiques telles que :

- Conductivité thermique.
- Épaisseur.
- Résistance thermique R.
- Masse volumique.
- Capacité thermique massique.
- Coût et impact environnemental lorsque disponibles.

Le confort d'été et le déphasage thermique devront être étudiés à l'aide d'un modèle adapté ; ils ne devront pas être déduits uniquement de la résistance thermique.

### 7.4. Raccordement au réseau de chaleur

Le module permettra de tester le remplacement du chauffage individuel au gaz par une solution collective raccordée à un réseau de chaleur.

Il devra afficher les tracés publics disponibles, estimer un raccordement virtuel et comparer les consommations, émissions et coûts.

Le logiciel devra distinguer proximité géographique et faisabilité technique réelle.

### 7.5. Production photovoltaïque

L'utilisateur pourra sélectionner la toiture et tester :

- Le retrait virtuel de cheminées.
- L'implantation de panneaux photovoltaïques.
- Différentes orientations et inclinaisons.
- La puissance installée.
- La production annuelle estimée.
- L'autoconsommation et l'injection réseau.

### 7.6. Eau, végétalisation et ventilation

Le module devra permettre de créer des scénarios de :

- Végétalisation de toiture.
- Récupération des eaux pluviales.
- Réutilisation des eaux grises, sous réserve des exigences sanitaires.
- Installation d'une centrale de traitement d'air en toiture, à l'intérieur ou au sol.

Les calculs seront introduits progressivement, en commençant par les estimations simples et vérifiables.

### 7.7. Comparateur

L'utilisateur pourra comparer l'état initial avec plusieurs rénovations selon :

- La consommation énergétique.
- Les coûts d'investissement et d'exploitation.
- Les émissions de CO₂.
- Le confort thermique.
- Les productions énergétiques.
- Les économies d'eau.

Le logiciel ne devra pas présenter ces estimations comme un DPE ou une étude réglementaire certifiée.

---

## 8. Compatibilité BIM / CAO

### 8.1. Objectif

Permettre à terme l'intégration de projets techniques détaillés créés dans BIMCraft ou dans d'autres logiciels BIM compatibles.

### 8.2. Export d'une zone depuis Your Futur Town

L'utilisateur sélectionnera une parcelle, un parking, une rue ou un quartier.

Le système devra pouvoir exporter un ensemble de données de contexte :

- Géométrie et topographie.
- Bâtiments existants.
- Voirie et accès.
- Parcelles cadastrales.
- Infrastructures publiques disponibles.
- Métadonnées de géoréférencement.

Les données seront exportées dans des formats ouverts adaptés, notamment GeoJSON et IFC lorsque la conversion est pertinente.

### 8.3. Modification dans un logiciel BIM

Le projet pourra être complété dans BIMCraft pour créer des bâtiments, parkings, stations multimodales et autres équipements.

La compatibilité exacte des formats devra être vérifiée et, si nécessaire, assurée par un convertisseur indépendant.

### 8.4. Réimport

Le projet modifié devra pouvoir être repositionné dans Your Futur Town grâce à son géoréférencement.

Le logiciel devra permettre de comparer l'existant et le projet, sans remplacer définitivement les données d'origine.

**Cette passerelle est prévue dans l'architecture initiale, mais sa réalisation complète n'est pas nécessaire pour le premier prototype.**

---

## 9. Gestion des scénarios

Chaque projet doit pouvoir créer une ou plusieurs variantes d'aménagement.

Un scénario doit contenir :

- Son identifiant et son nom.
- Sa description.
- La version des données de référence.
- Les objets ajoutés, modifiés ou supprimés virtuellement.
- Les hypothèses de calcul.
- Les résultats calculés.
- Les dates de création et de modification.

Les scénarios doivent être sauvegardables, rechargeables, comparables et supprimables.

Une modification ne doit jamais effacer l'objet de référence.

Le logiciel doit pouvoir restaurer la situation initiale à tout moment.

---

## 10. Assistant IA

L'application intégrera progressivement un assistant conversationnel.

Il permettra de rechercher des objets, expliquer leurs propriétés, proposer des modifications et préparer des scénarios.

Exemples :

- « Transforme cette route en sens unique et ajoute une piste cyclable. »
- « Déplace cet arrêt de bus et recalcule le trajet. »
- « Ajoute cinq niveaux au parking Trésum. »
- « Estime le nombre de bus nécessaires pour 600 voitures par heure. »
- « Compare deux solutions d'isolation pour ce bâtiment. »

L'assistant devra convertir les demandes en actions structurées, validées par l'application et confirmées par l'utilisateur lorsque nécessaire.

Les résultats numériques proviendront des moteurs de calcul, et non de valeurs inventées par l'IA.

---

## 11. Architecture technique recommandée

### 11.1. Frontend

- Next.js / React / TypeScript.
- MapLibre GL JS pour la cartographie.
- Three.js ou react-three-fiber uniquement lorsque des objets 3D plus complexes le nécessitent.
- Interface avec carte, panneau des couches, panneau des propriétés et gestionnaire de scénarios.

### 11.2. Base de données

- PostgreSQL avec PostGIS.
- Supabase pour l'hébergement initial de la base, si compatible avec les besoins retenus.
- Tables séparées pour les données de référence, les objets métier, les scénarios et leurs modifications.

### 11.3. Calculs

Les calculs simples pourront être réalisés en TypeScript.

Une API Python / FastAPI pourra être ajoutée pour les traitements géographiques, énergétiques ou scientifiques nécessitant des bibliothèques spécialisées.

### 11.4. Déploiement

- GitHub pour le code source.
- Vercel pour l'application web.
- Supabase pour les données et la persistance.
- Docker Compose pour le développement local et les futurs services spécialisés.

Ne pas introduire de microservices ou d'infrastructure lourde sans nécessité.

### 11.5. Qualité technique

- Code modulaire et documenté.
- Tests automatisés des calculs et transformations.
- Gestion explicite des erreurs d'import.
- Migrations de base de données versionnées.
- Gestion des performances sur des volumes géographiques importants.
- Attribution et respect des licences Open Data.
- Séparation claire entre données réelles et données simulées.

---

## 12. Plan de développement pour Codex

### Phase 0 — Initialisation

**Livrable :** application web fonctionnelle.

- Initialiser le dépôt et la structure du projet.
- Configurer TypeScript, les dépendances et les outils de développement.
- Préparer les variables d'environnement.
- Connecter Supabase.
- Configurer le déploiement Vercel.
- Créer une interface de base avec navigation.

### Phase 1 — Annecy 3D

**Livrable :** représentation reconnaissable d'Annecy.

- Afficher la ville en 2D/3D.
- Charger les routes, bâtiments, espaces verts et plans d'eau.
- Extruder les bâtiments selon leurs hauteurs disponibles ou estimées.
- Permettre la navigation libre.
- Ajouter un sélecteur de couches.
- Afficher la provenance des données.

### Phase 2 — Objets éditables

**Livrable :** premier éditeur urbain fonctionnel.

- Modéliser les routes comme objets indépendants.
- Permettre leur sélection.
- Afficher leurs propriétés.
- Modifier le sens, les voies et les aménagements cyclables.
- Générer la représentation correspondante.
- Sauvegarder les modifications dans un scénario.
- Restaurer l'état initial.

**Test obligatoire :** transformation d'une route à double sens en sens unique avec piste cyclable.

### Phase 3 — Bus

**Livrable :** premier éditeur de transport.

- Importer le GTFS SIBRA.
- Afficher lignes et arrêts.
- Déplacer un arrêt.
- Créer une ligne.
- Recalculer un itinéraire.
- Estimer les temps de parcours et besoins en bus.

### Phase 4 — Parking multimodal

**Livrable :** simulateur simplifié du parking Trésum / Providence.

- Sélectionner l'emprise.
- Générer des niveaux 3D.
- Estimer la capacité.
- Renseigner les flux de voitures.
- Calculer les transferts vers bus et vélos.
- Comparer les variantes.

### Phase 5 — Rénovation énergétique

**Livrable :** prédiagnostic du bâtiment des Carillons.

- Sélectionner le bâtiment.
- Renseigner son état initial.
- Estimer sa consommation.
- Tester plusieurs isolations.
- Comparer gaz et réseau de chaleur.
- Ajouter les premiers calculs photovoltaïques.

### Phase 6 — Fonctions avancées

- Assistant IA.
- Import/export BIM.
- Calculs énergétiques détaillés.
- Simulations de trafic.
- Nouveaux modes de transport.
- Déploiement à d'autres villes.

---

## 13. Critères de réussite du premier prototype

La première version devra permettre de :

1. Ouvrir Your Futur Town dans un navigateur.
2. Reconnaître Annecy grâce à sa géographie et à ses bâtiments simplifiés.
3. Naviguer dans la ville en 3D.
4. Sélectionner une route réelle.
5. Consulter ses propriétés.
6. Modifier son sens de circulation.
7. Ajouter une piste cyclable.
8. Visualiser le résultat directement sur la carte.
9. Enregistrer le scénario.
10. Revenir à l'état initial.

La première version ne nécessite ni moteur complet de circulation, ni BIM, ni simulation énergétique avancée.

---

## 14. Instructions finales à Codex

Développer Your Futur Town de manière progressive, en privilégiant la simplicité et le fonctionnement réel de chaque fonctionnalité.

Ne pas construire tous les modules simultanément.

Commencer par la Phase 0, puis la Phase 1 et la Phase 2.

**Contrainte architecturale prioritaire :** les infrastructures doivent être de véritables objets géographiques éditables. Elles ne doivent pas être uniquement dessinées sur un fond cartographique.

Ne pas remplacer les données réelles par des données fictives pour donner l'impression que les fonctionnalités fonctionnent.

Les valeurs estimées et les données de démonstration doivent être explicitement identifiées.

À chaque phase :

- Développer une fonctionnalité complète.
- Tester son fonctionnement.
- Vérifier la persistance des modifications.
- Documenter les choix techniques.
- Vérifier l'absence de régression.
- Préparer la phase suivante sans développer prématurément ses fonctionnalités.

**Résultat attendu : une base solide de jumeau numérique urbain, reconnaissable, modifiable et progressivement enrichissable.**
