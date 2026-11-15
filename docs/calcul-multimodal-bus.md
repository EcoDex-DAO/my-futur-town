# Calcul exploratoire des flux et renforts de bus

Le module `src/features/multimodal/estimate.ts` est un calcul isolé. Il ne charge pas de
données locales et n'est pas encore relié à l'interface, au GTFS ou aux scénarios. Ses
entrées sont des hypothèses fournies par l'appelant ; ses résultats ne sont ni des comptages
ni des prévisions validées pour les Trésums.

## Calcul et périmètre

- Les arrivées de voitures pendant l'heure étudiée sont estimées par : places × taux
  d'occupation moyen supposé × rotations quotidiennes × part des arrivées journalières
  pendant cette heure. Cette relation est une simplification à calibrer localement : une
  occupation instantanée ne suffit pas à établir une rotation quotidienne.
- Les voyageurs de parking prenant le bus sont estimés par : arrivées × personnes par
  voiture × part prenant le bus. Ce total ne distingue pas le report modal des déplacements
  induits ou préexistants.
- Le déficit est la demande de référence additionnée à ces voyageurs, moins les départs
  existants multipliés par leur capacité utile. Il est borné à zéro. Les départs
  supplémentaires sont le déficit divisé par la capacité utile, arrondi à l'entier supérieur.
  Une surcharge déjà présente dans la demande de référence contribue donc au résultat.
- Le nombre indicatif de véhicules supplémentaires est le nombre de départs supplémentaires
  par heure multiplié par la durée de cycle en heures, arrondi à l'entier supérieur. Cette
  estimation suppose un service régulier, des véhicules interchangeables et un cycle incluant
  les retournements ; elle ne constitue pas un planning d'exploitation.

La demande de référence, l'offre, la capacité et le flux estimé doivent concerner la même
heure, le même sens et le même tronçon critique. La capacité utile est la capacité admissible
totale par bus selon le taux de charge retenu, avant déduction de la demande de référence.
Le calcul ne reconstitue pas les horaires,
les correspondances, les pointes à l'intérieur de l'heure ou les contraintes de flotte.

## Données et suites

Aucune valeur par défaut n'est présentée comme une mesure locale. Pour un usage dans les
scénarios, il faudra conserver l'origine, la date, les unités, le périmètre et le statut de
chaque valeur : mesure locale, hypothèse transférée ou valeur supposée. Les inconnues doivent
rester visibles et les hypothèses modifiables. Les horaires SIBRA peuvent renseigner l'offre
après traitement approprié du jour de service, de l'heure et du sens ; ils ne renseignent pas
à eux seuls la charge observée. Une analyse basse, centrale et haute reste à réaliser.
