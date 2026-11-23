# Transport V6 : scénarios et bilans

**Branche** : `EcoDex-DAO/issue-32-transport-v6`  
**Création** : 2026-11-22  
**Statut** : projet  
**Issues** : #32, #50, #52 ; dépendances #29, #38, #30.

## User Scenarios & Testing

### User Story 1 - Comparer un scénario au réseau de référence (P1)

Une personne modifie parcours, horaires ou motorisation et compare les impacts estimés au même périmètre de référence.

**Test indépendant** : modifier successivement une distance, un départ et un modèle ; vérifier les écarts calculés sur une période et des lignes identiques.

**Acceptation** : les kilomètres et impacts suivent les modifications ; les inconnues et résultats partiels restent visibles ; un scénario inchangé donne un écart nul.

### User Story 2 - Simuler les horaires du scénario (P1)

Une personne observe les courses d'une ligne existante ou créée et de ses variantes avec ses horaires enregistrés.

**Test indépendant** : modifier un départ, recharger puis simuler le jour concerné, y compris après minuit et sans service.

**Acceptation** : les départs valides remplacent ou ajoutent les courses concernées ; les données invalidées sont signalées, sans modifier la référence.

### User Story 3 - Estimer la disponibilité agrégée (P2)

Une personne confronte le besoin horaire estimé à la flotte déclarée compatible, par périmètre et année.

**Test indépendant** : modifier horaires et effectifs, puis vérifier les pointes et les données inconnues.

**Acceptation** : hypothèses de retournement, pause et dépôt explicites ; pas de suivi individuel, de disponibilité réelle ni de double comptage.

### User Story 4 - Protéger et comprendre les données (P1)

Une personne retrouve ses scénarios et identifie l'origine et les limites des valeurs.

**Test indépendant** : rouvrir les données, simuler un stockage illisible et deux onglets concurrents.

**Acceptation** : aucune écriture silencieuse sur des données illisibles ou modifiées ailleurs ; erreurs et solutions visibles.

### Edge Cases

- Aucune course, zéro connu et valeur inconnue restent distincts ; une géométrie ou un modèle absent rend le résultat partiel.
- Courses après minuit, calendrier hors validité, variante supprimée, modèle horaire modifié, lignes sans horaires et conflits sont signalés.
- Périmètres, années, sous-traitance et réseaux différents ne sont pas additionnés sans justification.

## Requirements

### Functional Requirements

- **FR-001** : conserver le GTFS de référence et les données utilisateur, avec détection d'erreur et de concurrence.
- **FR-002** : relier lignes, variantes et horaires sauvegardés à la simulation et au bilan, y compris après minuit.
- **FR-003** : comparer référence et scénario sur mêmes dates, lignes, méthode et hypothèses ; identifier toute couverture incomplète.
- **FR-004** : calculer les effets des trajets, départs et modèles ; distinguer énergie, GES et polluants sans double comptage.
- **FR-005** : relier les modèles de flotte et leur compatibilité à une estimation agrégée des besoins horaires, sans affectation individuelle supposée.
- **FR-006** : afficher provenance, date, unité, périmètre, méthode, nature, incertitude et inconnues des valeurs ; les saisies restent modifiables.
- **FR-007** : utiliser une moyenne comparable sourcée si nécessaire, en expliquant sa transférabilité ; sinon laisser inconnu.
- **FR-008** : distinguer horaires planifiés, hypothèses, estimations et mesures ; ne pas suggérer que les résultats sont des mesures réelles.
- **FR-009** : permettre les parcours sur ordinateur et mobile et préserver l'usage de la carte sans API.
- **FR-010** : vérifier calculs, conservation, concurrence, intégration, états absents et interactions sur ordinateur et mobile.
- **FR-011** : chaque valeur présente un accès clavier et lecteur d'écran à sa provenance : URL, organisme, date, périmètre, unité, méthode et limites lorsqu'ils sont documentés.
- **FR-012** : une légende et des libellés accompagnent un code couleur pour distinguer source constructeur, rapport SIBRA/Annecy, autre rapport, hypothèse transférée et donnée vérifiée ; l'origine et le degré de vérification restent deux informations distinctes et ne présument pas la fiabilité.
- **FR-013** : préserver et afficher la provenance propre aux saisies utilisateur ; les éléments non documentés restent inconnus.
- **FR-014** : proposer trois vues : bilan V1 théorique sur toutes les lignes, bilan V2 adapté sur toutes les lignes et bilan V2 sur les lignes sélectionnées ; les deux vues V2 incluent les lignes créées et leurs horaires attribués.
- **FR-015** : permettre de lier une ligne créée à une ligne SIBRA pour l'étudier comme remplacement ; expliquer et permettre les deux modes : seulement les dates munies d'horaires créés, ou toute la période avec absence de service les jours sans horaires. Un lien ne change jamais la référence.
- **FR-016** : présenter trois tableaux d'horaires distincts : jours de semaine, samedi, dimanche et jours fériés. Les minutes sont regroupées par heure ; ligne, sens et variante restent identifiables.
- **FR-017** : permettre de copier un tableau vers un autre pour faciliter l'édition, sans écraser silencieusement les horaires déjà enregistrés et en conservant les exceptions par date.
- **FR-018** : appliquer les tableaux aux jours correspondants de leur période ; un parcours ayant déjà une modification propre à une date conserve ce jour ses horaires particuliers. Identifier la source des jours fériés et signaler toute année non couverte.
- **FR-019** : ouvrir le gestionnaire d’horaires dans une fenêtre dédiée, avec sélection compacte des lignes, titres du sens et listes des terminus en dessous ; l’inversion recherche le parcours correspondant sans inventer un retour.
- **FR-020** : présenter les périodes par onglets, avec nom et dates modifiables et ajout de périodes. Plusieurs périodes d’un parcours ne doivent pas se chevaucher. Les horaires précédemment enregistrés restent accessibles.
- **FR-021** : présenter chaque type de jour sous forme d’un tableau de 24 colonnes horaires ; chaque case accepte une minute de 0 à 59, une case vide signifie aucun départ et l’utilisateur peut ajouter une ligne. Préserver les départs existants après minuit et à la seconde.
- **FR-022** : permettre de préparer des annotations par départ, notamment terminus alternatif et restrictions de jours ou de date, sans annoncer comme calculés des effets qui ne sont pas pris en charge ; les limites doivent rester visibles dans la simulation et le bilan.

### Key Entities

- **Référence** : édition GTFS, période et lignes ; immuable.
- **Scénario** : parcours et horaires citoyens, hypothèses et modèles de flotte associés.
- **Course** : date de service, parcours, arrêts, horaires et provenance.
- **Hypothèse** : valeur, unité, source, année, périmètre, incertitude et caractère modifiable.
- **Bilan** : résultats, couverture, période et méthode ; comparaison de deux périmètres identiques.

## Success Criteria

### Measurable Outcomes

- **SC-001** : trois scénarios de test isolant parcours, horaires et motorisation produisent chacun l'effet attendu et un scénario inchangé un écart nul.
- **SC-002** : chaque résultat affiche période, couverture, unité et nature ; chaque hypothèse utilisée est traçable ou explicitement inconnue.
- **SC-003** : les tests couvrent après-minuit, absence de service, données invalides, écriture concurrente et rechargement sans perte.
- **SC-004** : le parcours complet est vérifié sur ordinateur et mobile, ainsi que sans API.

## Assumptions

- Les horaires publics sont planifiés et les affectations réelles inconnues ; les scénarios restent théoriques.
- Une seule édition GTFS de 47 jours ne démontre pas une année représentative ; afficher sa période et éviter une comparaison directe à un rapport annuel de périmètre différent.
- Les valeurs moyennes issues de sources comparables sont des hypothèses modifiables, jamais des mesures SIBRA.
## Complément : spécificités des lignes SIBRA

Le scénario doit pouvoir conserver et modifier les services par date, les variantes et terminus, les horaires propres aux courses et les conditions documentées par les fiches officielles. L'inventaire doit lier chaque règle vérifiée à sa source et sa période, distinguer l'offre GTFS planifiée des perturbations réelles et signaler explicitement les cas non interprétés. Une copie d'horaire ne doit pas masquer les différences entre dates sans avertissement.
