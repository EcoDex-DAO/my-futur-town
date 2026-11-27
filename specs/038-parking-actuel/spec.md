# Parking actuel — spécification

Branche : `EcoDex-DAO/mission-59-parking-actuel` · 27 novembre 2026 · Refs #59

## Parcours et critères

1. Un projet sélectionné présente une capacité inconnue par défaut. Une donnée officielle renseignée, une valeur saisie ou une estimation conserve son origine, sa date, son unité et ses hypothèses. Zéro est distinct de l’inconnu ; l’applicabilité de la source officielle doit être vérifiée.
2. Une estimation utilise une surface retenue et une surface par place explicites, en incluant les circulations ; elle ne garantit pas la capacité réelle. Une capacité officielle n’est proposée que si le périmètre et la période correspondent.
3. Les accès de référence se placent, se nomment, se modifient et se retirent sur la carte. Chaque point distingue entrée/sortie, sens connu ou inconnu, destinations parking et rue (oui, non ou inconnu), et permissions piétons, vélos et véhicules (autorisés, interdits, conditionnels ou inconnus) avec condition libre par destination. L’origine officielle, saisie ou hypothétique reste lisible ; les descriptions locales restent à vérifier.
4. Les données restent associées à leur projet, récupérables hors API et modifiables sans perte de zone ou de scénarios. Les conflits entre onglets ne doivent pas écraser les données. L’interface fonctionne sur ordinateur et mobile.

## Hors périmètre

Aucun parking paramétrique, comptage ou constat de terrain.

## Ajustement partiel : capacité déclarée

Une capacité déclarée comporte un total et un nombre facultatif de places PMR incluses dans ce total. Si ce nombre est inconnu, le nombre de places ordinaires est également inconnu ; zéro reste une valeur explicite. Un nombre PMR supérieur au total est refusé. Les références version 1 sont lues sans perte et migrées en mémoire avec un nombre PMR inconnu. Les anciennes versions de l'application refusent la version 2 plutôt que de l'écraser.

## Surface et accès

La surface confirmée est calculée à partir du polygone ou de l'union des parcelles. L'estimation applique une proportion utilisable, puis répartit les places selon des surfaces unitaires distinctes et une part PMR modifiables. Les hypothèses ne démontrent pas une conformité ou une capacité réelle. Les anciennes estimations restent consultables, avec leur surface et ratio, lors de leur conversion explicite.

Les cases d'entrée et de sortie peuvent être combinées ; les directions droite et gauche sont indiquées séparément pour une sortie. Pour chaque destination, les modes non renseignés restent inconnus et les conditions sont propres à chaque mode. Les interdictions, les indications de direction et les conditions communes des accès anciens restent accessibles ; la migration ne remplace pas ces informations par des permissions implicites.
