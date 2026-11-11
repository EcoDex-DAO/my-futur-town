# Feuille de route — Bus V1

Cette feuille suit la livraison du module bus V1 dans le dépôt Next.js actuel. La V2 multimodale (simulation des déplacements et impacts trafic) est hors périmètre. Les prototypes de la branche `feat/bus-reference` servent de référence fonctionnelle ; leur interface historique n’est pas intégrée directement dans l’architecture actuelle.

## Résultat attendu

Sur l’échelle du Grand Annecy, l’utilisateur peut explorer le réseau SIBRA à partir d’un instantané GTFS attribué et daté, consulter les horaires disponibles, créer un scénario local de ligne et d’arrêts, puis comparer des estimations macro de flotte et d’énergie. Les scénarios et leurs sources restent explicites. Aucun tracé expérimental n’est présenté comme un itinéraire validé.

## Étapes

### 1. Cadrer et porter les données de référence

- [x] Importer l’édition GTFS SIBRA épinglée : 27 lignes, 5 309 courses, horaires et services par date.
- [x] Ajouter l’importeur reproductible avec contrôle SHA-256, métadonnées de provenance et attribution/licence.
- [x] Conserver les instantanés importés dans des fichiers versionnés, séparés des scénarios locaux.
- [x] Afficher la date de validité, la source, l’attribution et la licence dans l’interface.
- [x] Afficher la validité du jeu et limiter le service aux dates couvertes ; les horaires manquants restent inconnus.

**Terminé quand :** import reproductible et contrôlé ; l’application fonctionne sans API distante et ne présente pas les données périmées comme actuelles.

### 2. Explorer le réseau

- [ ] Afficher lignes, variantes et arrêts sur la carte MapLibre actuelle.
- [ ] Ajouter recherche/liste, sélection depuis carte et liste, survol et navigation clavier/tactile.
- [ ] Gérer les lignes superposées, les quais partagés et les sens opposés sans fusionner leurs identités.
- [ ] Ajouter cadrage initial du réseau et retour à la vue globale.

**Terminé quand :** parcours utilisable sur ordinateur et mobile, y compris avec API indisponible et données vides ; performances vérifiées sur l’instantané complet.

### 3. Consulter les horaires

- [x] Porter les horaires statiques GTFS de toutes les lignes et les jours de service avec leur fuseau horaire.
- [x] Présenter la couverture réelle et afficher les prochains passages par arrêt.
- [x] Indiquer qu’il s’agit d’horaires théoriques, sans temps réel ni retards.

**Terminé quand :** horaire affiché correspond à la date et au jour de service ; cas hors couverture et après minuit sont explicites.

### 4. Créer un scénario local de ligne

- [x] Créer une copie hypothétique d’une ligne, sans modifier la référence GTFS.
- [x] Modifier nom et arrêts ; ajouter des arrêts référencés ou hypothétiques, les réordonner ou les retirer.
- [x] Prévisualiser la proposition comme tracé schématique ; garder chaque sens distinct.
- [x] Enregistrer, recharger, supprimer et signaler les erreurs de stockage.
- [x] Modifier l’horaire de départ de chaque course copiée ; le décalage s’applique aux arrêts du scénario et laisse le GTFS intact.
- [ ] Rendre l’historique annuler/rétablir temporaire et le signaler.

**Terminé quand :** scénario persiste dans le stockage retenu, est isolé de la référence et reste compréhensible après rechargement.

### 5. Estimer les impacts macro

- [ ] Porter le modèle d’hypothèses par flotte et profil de véhicule.
- [ ] Saisir activité, consommation et facteurs avec unité, source, version et périmètre.
- [ ] Comparer référence et scénario pour énergie et émissions disponibles.
- [x] Traiter les facteurs absents comme inconnus.
- [ ] Distinguer les repères documentaires de flotte des données d’exploitation par ligne.

**Terminé quand :** chaque résultat est reproductible à partir des hypothèses visibles ; aucune valeur inconnue n’est présentée comme zéro ou comme mesure réelle.

### 6. Validation de livraison

- [ ] Tests unitaires sur import, jours de service, modèle d’impact et stockage.
- [ ] Tests de parcours : sélection, horaires, scénario, rechargement, estimation et erreurs.
- [ ] Contrôle visuel ordinateur/mobile, clavier/tactile et absence d’API.
- [ ] Vérifier attribution/licence, sources, accessibilité et textes de limites.
- [ ] Documenter les contrôles réussis et les limites restantes dans `docs/cdc-progress.md`.

**Terminé quand :** comportement, persistance, intégrité des références et parcours UI sont vérifiés dans l’application Next.js de `main`.

## Hors périmètre V1

- Simulation des déplacements et impacts sur le trafic (V2).
- Routage bus réel garanti, validation automatique des tracés, temps réel et retards.
- Généralisation des horaires ou consommations d’une ligne à tout le réseau sans source vérifiée.
- Déploiement ou migration distante sans validation dédiée.

## Suivi

Mettre à jour les cases de cette feuille à chaque incrément terminé. Conserver ici le plan de travail actif ; `docs/roadmap-cdc.md` reste la vue d’ensemble des phases du cahier des charges.

### Avancement au 11 novembre 2026

- Données GTFS (commits `b1e99e6` et commit d’import tous services) : instantanés réseau et horaires ajoutés avec provenance et licence. Importeur reproductible exécuté sur l’édition 2026-11-06 ; 5 309 courses de 27 lignes sont maintenant représentées.
- Exploration (commit `da4b72d`) : tracés réseau, recherche de lignes, sélection et cadrage sont intégrés à la carte Next.js. Les arrêts, sélection explicite de variante, interaction mobile et contrôle visuel restent à valider.
- Horaires : données multi-lignes intégrées. Cas des heures après minuit, dates sans service et sélection de variantes restent à valider.
- Créateur de ligne (en cours) : création d’une ligne avec deux sens distincts, arrêts GTFS ou hypothétiques, réordonnancement, horaires de premier/dernier départ, fréquence, jours et période de service, parc affecté, sauvegarde navigateur et aperçu schématique sur la carte. Le scénario d’une ligne existante peut aussi modifier les départs des courses GTFS copiées. Restent la validation des périodes et la vérification complète des parcours visuels/mobile.
- Estimations macro (en cours) : activité journalière estimée depuis toutes les courses GTFS et saisie de consommation/facteur GES sourcés. Le 11 novembre 2026, l’édition indique 2 795,2 véhicule-km sur 8 lignes actives ; le 12 novembre, 22 629,6 véhicule-km sur 27 lignes. Distances de service planifié, sans courses à vide ni données GPS. L’énergie/les émissions ne sont pas des chiffres SIBRA tant que des facteurs représentatifs et sourcés ne sont pas fournis. Il reste la comparaison référence/scénario, la persistance des hypothèses, les flottes multi-profils et les indicateurs d’émission supplémentaires.
- TypeScript, tests ciblés et build Next passent. Aperçus Orca desktop/mobile réalisés ; le parcours complet reste à valider, en particulier dates de service, clavier et persistance après rechargement.
