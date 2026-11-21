# Plan — horaires aux terminus

## Contexte

La V3 conserve les parcours et variantes dans `yft.bus-created-lines.v1`. Les données GTFS de référence sont dans `public/data/sibra.json` et `public/data/sibra-schedule.json` ; les courses comportent leurs variantes, services et passages en secondes depuis le début du jour de service. `BusStopTimetable` consulte déjà ces données. La photo du propriétaire montre une grille de minutes par heure avec notes de destination et catégories de jours.

## Décisions

Utiliser une date de service réelle, ses services GTFS et ses exceptions. Chaque variante créée est orientée par ses terminus ; le retour est un parcours indépendant. Pour une course GTFS, conserver ses intervalles et appliquer un décalage constant. Pour une ligne créée, demander les durées cumulées explicitement ; ne pas extrapoler une vitesse. Les heures supérieures à 24 h désignent le lendemain du jour de service. Refuser les doublons dans une même variante et signaler les autres conflits sans prétendre affecter les véhicules. Enregistrer les données de scénario séparément dans le navigateur avec contrôle de version et protection contre les écritures concurrentes. Conserver une signature des arrêts pour détecter une modification de parcours.

## Architecture et validation

Créer un module pur de validation et propagation, un stockage local distinct, puis un éditeur accessible intégré aux parcours existants. Réutiliser les types GTFS sans modifier les fichiers de référence. Couvrir les cas limites par Vitest, puis les parcours complets sur ordinateur et mobile avec Playwright. Vérifier le build et documenter les limites, captures et conditions de test. Aucun service sur le port 3000 ne doit être interrompu.
