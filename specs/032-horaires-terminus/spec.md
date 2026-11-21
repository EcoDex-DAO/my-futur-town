# Transport V4 — horaires aux terminus

**Branche** : `EcoDex-DAO/issue-38-horaires-terminus`  
**Issue** : [#38](https://github.com/EcoDex-DAO/my-futur-town/issues/38)  
**État** : implémenté, en attente de revue

## Scénarios et vérification

### P1 — Modifier une ligne existante
Choisir une ligne, une date de service, un sens et une variante ; consulter les départs du terminus et modifier une course dans un scénario local. Les heures aux arrêts suivent le décalage de cette course, en conservant ses temps GTFS. Le GTFS original reste inchangé.

### P2 — Créer les horaires d'une ligne hypothétique
Choisir un parcours V3 enregistré et un jour ; saisir des départs et les temps de parcours jusqu'aux arrêts. Les horaires calculés, leurs hypothèses et le sens du parcours sont visibles. Aucune durée n'est inventée. Les variantes V3 sont indépendantes ; un retour nécessite son propre parcours et ses propres horaires.

### P3 — Retrouver et comprendre un scénario
Après rechargement, retrouver les modifications dans le navigateur ; distinguer les courses modifiées et la référence. Un jour sans course est indiqué comme sans service. Une date hors couverture GTFS n'est pas présentée comme une absence de service.

## Exigences

- **FR-001** : Une édition est rattachée à une date de service explicite, à une ligne, à un sens et à une variante ou course identifiée. Les exceptions du GTFS suivent les dates de service effectives ; aucun calendrier générique ne les remplace implicitement.
- **FR-002** : L'heure après minuit reste associée au jour de service d'origine ; l'interface indique le lendemain et accepte des heures de service supérieures à 24 h.
- **FR-003** : Modifier le départ d'une course GTFS décale tous ses passages du même intervalle, sans modifier la référence ni les autres courses. Une course ne peut pas commencer avant son jour de service.
- **FR-004** : Les horaires d'un parcours créé exigent des durées explicites, ordonnées et non négatives jusqu'aux arrêts et au terminus ; les passages calculés sont signalés comme hypothétiques. Aucun retour n'est déduit automatiquement.
- **FR-005** : Les départs identiques d'une même variante et d'un même jour sont signalés avant enregistrement ; les conflits de véhicules ne sont pas déduits sans affectation, suivie dans #30.
- **FR-006** : Les modifications sont stockées séparément des lignes V3 et des fichiers de référence. Une erreur de lecture, de stockage ou une modification concurrente ne doit pas écraser silencieusement les données existantes.
- **FR-007** : Les courses dont les arrêts ou la variante ont changé ne sont pas propagées silencieusement : leur incohérence est signalée pour révision.
- **FR-008** : Les commandes et erreurs restent compréhensibles au clavier, sur bureau et mobile. Le tableau groupe les minutes par heure et distingue les variantes, d'après la photographie fournie.
- **FR-009** : Tester date, sens, variante, absence de service, saisies invalides, après-minuit, conflits, conservation des données et réouverture ; vérifier bureau et mobile.

## Entités

Une course possède un jour de service, un parcours orienté, un départ et des passages ordonnés. Une modification locale référence une course GTFS ou un parcours créé et conserve les hypothèses nécessaires à sa reproduction. Une variante V3 possède sa géométrie et ses arrêts propres.

## Critères de réussite

- Une course de référence modifiée affiche tous ses passages décalés et conserve les données sources identiques.
- Une course créée n'affiche aucun passage calculé sans durée fournie ; elle est retrouvée après rechargement.
- Les neuf courses GTFS locales comportant des passages après minuit restent associées à leur jour de service.
- Les erreurs et conflits testés restent visibles et les données enregistrées précédemment restent lisibles.

## Hypothèses et limites

La photo fournie montre une fiche SIBRA par arrêt, avec minutes par heure, catégories de jours, notes de destination et exceptions. Elle sert de référence de présentation, pas de source de données à importer. L'édition GTFS du dépôt couvre le 4 novembre au 20 décembre 2026, fuseau Europe/Paris. Une date précise est choisie pour préserver les exceptions ; les jours types récurrents ne sont pas inférés. Les horaires sont théoriques, sans affectation de véhicule ni validation de faisabilité. Le stockage local n'est pas synchronisé entre appareils.
