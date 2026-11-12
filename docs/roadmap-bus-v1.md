# Feuille de route — Bus V1

Dernière mise à jour : 12 novembre 2026. Cette feuille décrit le périmètre retenu pour `main`. La V2 vient après ; elle ne bloque pas la livraison V1.

## Périmètre retenu

- Garder la carte d’Annecy comme fond commun et retirer les outils de voirie de l’écran principal.
- Afficher le réseau SIBRA importé et permettre de le masquer pour travailler sur une ligne créée.
- Garder la simulation micro de la ligne 1, avec un temps d’arrêt moyen réglable (12 secondes par défaut).
- Garder l’estimation macro et appliquer partout le profil d’hypothèses de la ligne 1. Le total réseau est une extrapolation homogène, pas une mesure de la flotte réelle.
- Garder le créateur de ligne : terminus, proposition routière OSM, points de passage, arrêts, nom, puis enregistrement local et édition des marqueurs.

## État des lots

### 1. Données SIBRA — terminé

- [x] Importer la dernière édition retenue : 27 lignes et 5 309 courses, valides du 4 novembre au 20 décembre 2026.
- [x] Inclure l’importeur reproductible et son contrôle SHA-256.
- [x] Conserver attribution, licence, provenance et limites dans [`sibra-data.md`](sibra-data.md).
- [x] Charger les horaires de toutes les lignes dans les données locales ; les horaires restent théoriques.

### 2. Carte et réseau — intégré, validation manuelle restante

- [x] Garder la carte Annecy/OpenFreeMap et afficher les lignes et arrêts SIBRA.
- [x] Ajouter un contrôle pour masquer ou réafficher le réseau.
- [ ] Vérifier le rendu et la lisibilité sur écran large et mobile.

L’exploration détaillée par liste, la consultation des tableaux horaires et l’édition des horaires GTFS ne sont pas dans le périmètre V1 retenu.

### 3. Simulation micro — intégrée, validation manuelle restante

- [x] Reprendre la simulation des véhicules de la ligne 1 à partir des courses GTFS.
- [x] Conserver date, heure, pause, vitesses et affichage schématique des bus et arrêts.
- [x] Estimer l’immobilisation aux arrêts sans changer les horaires publiés ; 12 s par défaut, réglable à 0, 5, 12 ou 20 s, et limitée au temps disponible.
- [ ] Vérifier visuellement la ligne 1, les terminus, les courses après minuit et les cas sans service.

Les positions ne sont pas du temps réel. La simulation ne couvre pas les autres lignes en V1.

### 4. Créateur de ligne — intégré, validation manuelle restante

- [x] Lancer le processus depuis le menu mobilité.
- [x] Poser les deux terminus et calculer une proposition sur le graphe routier OSM local.
- [x] Ajouter des points de passage, puis des arrêts ; garder les marqueurs visuellement distincts.
- [x] Nommer la ligne, terminer le processus et afficher une confirmation.
- [x] Rouvrir, déplacer, modifier ou supprimer une ligne enregistrée dans le navigateur.
- [ ] Parcourir le flux complet sur ordinateur et mobile.
- [ ] Vérifier quelques itinéraires, les limites de couverture, sens uniques et raccordements ambigus.

L’itinéraire est une proposition théorique : accès bus, dimensions et retour sur une rue à sens unique ne sont pas certifiés. Les lignes ne sont pas synchronisées entre appareils et ne reçoivent pas d’horaires GTFS.

Détails : [`bus-line-creator-v1.md`](bus-line-creator-v1.md).

### 5. Estimation macro — intégrée, validation des hypothèses restante

- [x] Reprendre le calcul énergie et émissions par profil de flotte, avec unités et sources.
- [x] Enregistrer les hypothèses dans le navigateur.
- [x] Appliquer le profil saisi pour la ligne 1 aux 27 lignes et présenter le résultat comme extrapolation.
- [x] Garder les facteurs inconnus comme inconnus ; le GTFS ne fournit pas les consommations ou émissions réelles.
- [ ] Valider les valeurs, unités et sources saisies pour la ligne 1 avant d’interpréter un total.

Les valeurs répliquées ne tiennent pas compte des différences de flotte, fréquence ou kilométrage entre lignes. Le nombre de 27 lignes indique la couverture du modèle, pas sa précision.

### 6. Livraison — reste à faire

- [x] TypeScript strict : vérification locale réussie.
- [x] Publication sur `main` : commit `c197a14` ; statut Vercel GitHub : succès.
- [ ] Vérification visuelle et parcours manuel dans le navigateur sur ordinateur et mobile.
- [ ] Consigner les résultats de validation et fermer les issues V1 correspondantes.

Aucun test automatisé n’a été lancé pour cette intégration. La commande locale `next build` s’est arrêtée sur l’analyse de la sortie `tsc --showConfig`; le statut Vercel du commit est vert.

## Reporté à V2

- Éditeur d’horaires GTFS et création d’horaires pour les lignes personnalisées.
- Profils de flotte, consommations et facteurs propres à chaque ligne, fondés sur des sources réelles.
- Simulation micro de toutes les lignes et optimisation des performances multi-véhicules.
- Recherche détaillée, consultation des horaires par arrêt et scénarios GTFS complets.
- Synchronisation des lignes entre utilisateurs, temps réel et effets sur le trafic.

Mettre cette feuille à jour après chaque validation. Issues : [#7 feuille de route](https://github.com/EcoDex-DAO/my-futur-town/issues/7), [#9 créateur](https://github.com/EcoDex-DAO/my-futur-town/issues/9), [#13 estimation macro](https://github.com/EcoDex-DAO/my-futur-town/issues/13).
