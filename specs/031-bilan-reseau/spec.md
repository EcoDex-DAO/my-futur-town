# Bilan du réseau — issue #31

## Objectif et critères

Permettre de consulter une estimation théorique annuelle et ses hypothèses sans la confondre avec un bilan mesuré. Le périmètre est constitué des lignes SIBRA présentes dans le GTFS, ou de la sélection de l'utilisateur. Les lignes créées sans horaires et les parcours à vide sont exclus. Les résultats doivent rester compréhensibles sur ordinateur et mobile, y compris lorsque les horaires ou hypothèses manquent.

Le calcul annualise uniformément les courses couvertes sur 365 jours ; il n'établit pas leur représentativité pour toute l'année. Les courses sans géométrie résolue sont exclues et signalées au total, par groupe et par ligne. Les consommations et facteurs restent des hypothèses modifiables ; leurs unités et sources initiales sont visibles. Une valeur vide reste inconnue. Les scénarios de motorisation uniforme et gabarits ne décrivent pas la flotte réelle.

## Sources et décisions ouvertes

- GTFS documenté dans `docs/sibra-data.md` : édition du 4 novembre au 20 décembre 2026 ; horaires et tracés théoriques, sans consommations ni émissions réelles.
- Les sources et unités des hypothèses initiales sont indiquées dans le panneau. Les facteurs historiques et les hypothèses d'autres territoires ne sont pas validés pour SIBRA. Les modifications utilisateur ne disposent pas encore de champs de provenance.
- À obtenir du propriétaire : période et périmètre cible, ventilation des véhicules et kilomètres par ligne et motorisation, consommations et facteurs avec sources, dates et unités, ainsi que validation de leur représentativité. Sans ces éléments, aucun bilan réel ou représentatif n'est conclu.

## Décision du propriétaire du 20 novembre 2026

Estimer les kilomètres à partir de toutes les courses et de leurs trajets, puis la consommation à partir d'un véhicule représentatif : modèle le plus utilisé à Annecy si connu, sinon le plus présent dans l'agglomération, sinon un modèle représentatif. Utiliser les temps d'arrêt comme indication et éviter de les compter deux fois dans une consommation moyenne. Toute estimation doit rester identifiable.

Le [rapport SIBRA 2021](https://www.annecy.fr/fileadmin/mediatheque_annecy/Deliberations/2022/20221212/Deliberation-D_CN_2022_359.pdf) recense 27 Citaro parmi 57 standards du parc Grand Annecy ; il ne prouve pas que ce modèle domine encore aujourd'hui. Le [rapport 2024](https://www.annecy.fr/api/fileadmin/mediatheque_annecy/Deliberations/2025/20251215/D_CN_2025_390.pdf), chapitre 5, fournit les consommations moyennes par gabarit, pas par modèle. En attendant une source récente et une consommation par modèle, le scénario standard utilise cette moyenne historique comme approximation, sans la présenter comme celle d'un Citaro ni comme une mesure du réseau actuel.
