# Feuille de route — Bus V1

Cette feuille suit la livraison du module bus V1 dans le dépôt Next.js actuel. La V2 multimodale (simulation des déplacements et impacts trafic) est hors périmètre. Les prototypes de la branche `feat/bus-reference` servent de référence fonctionnelle ; leur interface historique n’est pas intégrée directement dans l’architecture actuelle.

## Résultat attendu

Sur l’échelle du Grand Annecy, l’utilisateur peut explorer le réseau SIBRA à partir d’un instantané GTFS attribué et daté, consulter les horaires disponibles, créer un scénario local de ligne et d’arrêts, puis comparer des estimations macro de flotte et d’énergie. Les scénarios et leurs sources restent explicites. Aucun tracé expérimental n’est présenté comme un itinéraire validé.

## Étapes

### 1. Cadrer et porter les données de référence

- [ ] Reprendre l’importeur GTFS SIBRA, les validations, les métadonnées de provenance, la licence et les fichiers de données depuis le prototype.
- [ ] Définir le stockage des instantanés dans l’architecture Next.js ; versionner les imports sans écraser les scénarios.
- [ ] Afficher la date de validité, la source, l’attribution et la licence dans l’interface.
- [ ] Vérifier la couverture réelle de l’édition importée et rendre les champs manquants visibles.

**Terminé quand :** import reproductible et contrôlé ; l’application fonctionne sans API distante et ne présente pas les données périmées comme actuelles.

### 2. Explorer le réseau

- [ ] Afficher lignes, variantes et arrêts sur la carte MapLibre actuelle.
- [ ] Ajouter recherche/liste, sélection depuis carte et liste, survol et navigation clavier/tactile.
- [ ] Gérer les lignes superposées, les quais partagés et les sens opposés sans fusionner leurs identités.
- [ ] Ajouter cadrage initial du réseau et retour à la vue globale.

**Terminé quand :** parcours utilisable sur ordinateur et mobile, y compris avec API indisponible et données vides ; performances vérifiées sur l’instantané complet.

### 3. Consulter les horaires

- [ ] Porter les horaires statiques GTFS et les jours de service avec leur fuseau horaire.
- [ ] Présenter clairement la couverture limitée aux services réellement importés.
- [ ] Indiquer qu’il s’agit d’horaires théoriques, sans temps réel ni retards.

**Terminé quand :** horaire affiché correspond à la date et au jour de service ; cas hors couverture et après minuit sont explicites.

### 4. Créer un scénario local de ligne

- [ ] Créer une copie hypothétique d’une ligne, sans modifier la référence GTFS.
- [ ] Modifier nom, arrêts et variantes ; ajouter, déplacer ou retirer des arrêts.
- [ ] Prévisualiser la référence et la proposition ; garder chaque sens distinct.
- [ ] Enregistrer, recharger, supprimer et signaler les erreurs de stockage.
- [ ] Rendre l’historique annuler/rétablir temporaire et le signaler.

**Terminé quand :** scénario persiste dans le stockage retenu, est isolé de la référence et reste compréhensible après rechargement.

### 5. Estimer les impacts macro

- [ ] Porter le modèle d’hypothèses par flotte et profil de véhicule.
- [ ] Saisir activité, consommation et facteurs avec unité, source, version et périmètre.
- [ ] Comparer référence et scénario pour énergie et émissions disponibles.
- [ ] Traiter les données absentes comme inconnues ; ne pas additionner des vecteurs ou unités incompatibles.
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

- Données GTFS (commit `b1e99e6`) : instantanés réseau et horaires ajoutés avec provenance et licence. Importeur reproductible et validation applicative restent à porter.
- Exploration (commit `da4b72d`) : tracés réseau, recherche de lignes, sélection et cadrage sont intégrés à la carte Next.js. Les arrêts, sélection explicite de variante, interaction mobile et contrôle visuel restent à valider.
- Horaires (en cours) : couche d’arrêts ajoutée et panneau d’horaires théoriques par arrêt sur la date et l’heure choisies ; seuls les départs de la ligne 1 sont fournis. Le cas des services après minuit, dates sans service et sélection multi-lignes demande encore validation.
- Scénarios locaux et estimations macro : non portés dans Next.js.
- TypeScript passe après l’ajout de l’exploration et des horaires. Contrôle visuel desktop/mobile non effectué.
