# Parking actuel — spécification

Branche : `EcoDex-DAO/mission-59-parking-actuel` · 27 novembre 2026 · Refs #59

## Parcours et critères

1. Un projet sélectionné présente une capacité inconnue par défaut. Une donnée officielle renseignée, une valeur saisie ou une estimation conserve son origine, sa date, son unité et ses hypothèses. Zéro est distinct de l’inconnu ; l’applicabilité de la source officielle doit être vérifiée.
2. Une estimation utilise une surface retenue et une surface par place explicites, en incluant les circulations ; elle ne garantit pas la capacité réelle. Une capacité officielle n’est proposée que si le périmètre et la période correspondent.
3. Les accès de référence se placent, se nomment, se modifient et se retirent sur la carte. Chaque point distingue entrée/sortie, sens connu ou inconnu, destinations parking et rue (oui, non ou inconnu), et permissions piétons, vélos et véhicules (autorisés, interdits, conditionnels ou inconnus) avec condition libre par destination. L’origine officielle, saisie ou hypothétique reste lisible ; les descriptions locales restent à vérifier.
4. Les données restent associées à leur projet, récupérables hors API et modifiables sans perte de zone ou de scénarios. Les conflits entre onglets ne doivent pas écraser les données. L’interface fonctionne sur ordinateur et mobile.

## Hors périmètre

Aucun parking paramétrique, comptage ou constat de terrain.
