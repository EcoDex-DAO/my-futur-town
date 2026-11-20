# Transport V3 — création et modification des lignes

Suivi : [issue #29](https://github.com/EcoDex-DAO/my-futur-town/issues/29). État : clarifiée, implémentation en cours.

## Besoin

Créer, modifier et retrouver dans ce navigateur des lignes de bus hypothétiques avec leurs terminus, points de passage, arrêts et variantes. Les données de référence et les horaires existants ne sont pas modifiés.

## Clarification du 20 novembre 2026

Le propriétaire choisit des variantes à parcours indépendants : chacune possède ses propres terminus, points de passage et arrêts. Une ligne initiale devient sa première variante ; une variante ajoutée peut partir d’une copie modifiable. Les modifications d’une variante ne changent pas les autres. Le retour ne doit pas être supposé praticable.

## Critères communs

- Une ligne déjà enregistrée avant cette évolution reste lisible et modifiable, sans perte de ses repères ou de son tracé.
- La création et la modification proposent des terminus, des points de passage et des arrêts ; une ligne sauvegardée se retrouve après rechargement.
- Un arrêt est associé au parcours auquel il appartient. Une modification de tracé ne doit pas laisser silencieusement un arrêt incohérent.
- Une erreur de calcul ou de stockage est visible et ne doit pas être présentée comme une sauvegarde réussie ; les données précédentes restent récupérables.
- Les parcours de création et modification sont utilisables sur ordinateur et mobile, avec commandes nommées et utilisables au clavier lorsque pertinent.
- Les propositions routières restent hypothétiques : couverture OSM, accès bus, raccordements, virages et praticabilité exigent une vérification. En particulier, la restriction de virage à un point de passage est suivie par [#44](https://github.com/EcoDex-DAO/my-futur-town/issues/44).
- Les lignes sont conservées dans le stockage local du navigateur, sans synchronisation ni création d'horaires.

## Vérification

Tester création, édition, erreurs de routage et de stockage, sauvegarde et rechargement, conservation des anciennes lignes, et interactions ordinateur/mobile. Documenter les contrôles manuels et leurs limites.
