# Guide de travail

Ce guide permet de suivre les deux projets sans avoir à connaître les commandes de développement. Les fiches GitHub décrivent les objectifs ; les documents Spec Kit précisent les fonctionnalités complexes ; le code et ses spécifications sont conservés dans ce dépôt.

## Les projets

- [Transport en commun — Annecy](https://github.com/users/EcoDex-DAO/projects/1) : afficher et simuler le réseau, étudier ses impacts, créer des lignes et horaires, puis gérer les véhicules.
- [Pôle multimodalité — Trésums](https://github.com/users/EcoDex-DAO/projects/2) : représenter le site et son parking, étudier les flux et l'énergie, puis adapter la desserte en bus.

Chaque projet contient des fiches de version. Une issue peut servir aux deux projets. Les anciennes issues clôturées comme non prévues conservent leur historique ; leur clôture ne signifie pas que les travaux restants sont terminés.

## Démarrer une session

Exprimer le besoin avec ses propres mots, par exemple : « Je veux avancer sur la V1 Transport et voir tous les bus sur la carte. » L'agent identifie l'issue, vérifie son état et propose les clarifications nécessaires.

Avant de commencer une nouvelle issue, l'agent crée avec Orca un espace de travail, une branche dédiée et une nouvelle session d'agent. Il fournit à cette session le numéro de l'issue, le besoin et les liens utiles, puis indique où retrouver la session. Les reprises de la même issue utilisent son espace existant. Si Orca n'est pas accessible, l'agent explique la situation avant de proposer une autre méthode.

La branche part de `origin/main` après vérification de la version distante ; le travail ne doit pas écraser des modifications existantes. Pour un sujet qui n'est pas une issue, un nouvel espace n'est pas imposé par cette règle.

## De l'idée au résultat

1. Définir le résultat attendu et la manière de le vérifier dans l'issue.
2. Pour une fonctionnalité importante, utiliser Spec Kit pour écrire la spécification, clarifier les questions utiles, établir un plan et des tâches, puis vérifier leur cohérence. Pour une correction simple, un flux direct suffit.
3. Réaliser et tester le changement sur la branche de l'issue. Mettre à jour le statut GitHub selon l'avancement réel ; si GitHub est indisponible, noter ce qui reste à synchroniser.
4. Présenter le résultat et ses limites en termes simples. Pour une modification visuelle, montrer l'interface ou fournir des captures lorsque possible ; permettre à l'utilisateur de l'essayer.
5. Ouvrir une pull request liée à l'issue et indiquer les vérifications effectuées. Ne marquer terminé qu'après validation du résultat et intégration selon les règles du dépôt.

## Outils utiles

Les skills Spec Kit sont versionnés dans `.agents/skills`. Les skills globaux ne sont pas nécessairement présents sur une autre machine : `codebase-memory` et `graphify` aident à explorer le code ; `impeccable` et `ui-ux-pro-max` aident pour l'interface ; `orca-cli` sert à gérer les espaces Orca. L'agent choisit les outils adaptés et signale ceux qui manquent lorsque cela bloque le travail.

Les résultats de simulation, de consommation et de flux restent des estimations si les données ne permettent pas de les présenter comme des mesures. Conserver les sources, les dates, les inconnues et les limites visibles.
