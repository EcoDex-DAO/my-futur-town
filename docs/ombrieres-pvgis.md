# Ombrières : estimation photovoltaïque

Le panneau Scénarios estime une installation solaire à **un seul pan**. La surface des
ombrières est définie dans le plan des panneaux, et non comme projection au sol. Cette surface,
la fraction occupée par les modules et leur rendement nominal sont des
hypothèses modifiables, initialement inconnues. Les sources, dates, natures et périmètres
se conservent par scénario. Modifier une valeur efface sa provenance précédente, qui doit
être renseignée à nouveau.

Sous l'éclairement standard de 1 kW/m² utilisé pour la puissance crête, la puissance
indicative est `surface × fraction couverte × rendement nominal`, en kWc. La production
annuelle indicative vaut `puissance en kWc × productible annuel en kWh/kWc/an`. Le ratio
de couverture et le rendement sont compris entre 0 et 1. Un champ inconnu ne devient pas
zéro ; aucune mesure locale n'est préremplie. Ces calculs ne sont ni un dimensionnement
d'exécution ni une validation structurelle ou réglementaire.

## Productible PVGIS

Le productible peut être saisi manuellement avec sa provenance ou demandé à PVGIS. Le
service local `/api/pvgis` interroge [PVGIS 5.3 / PVcalc](https://joint-research-centre.ec.europa.eu/photovoltaic-geographical-information-system-pvgis/using-pvgis-5/api-non-interactive-service_en)
pour 1 kWc, au point indicatif `45.8964833 N, 6.1308623 E`, issu du repérage OSM des
Trésums. Ce point n'est pas une implantation parcellaire confirmée. Le calcul utilise
silicium cristallin, montage libre, base de rayonnement SARAH3 demandée et horizon du relief.
Inclinaison, orientation et pertes sont saisies explicitement. L'orientation PVGIS vaut
0° au sud, −90° à l'est et 90° à l'ouest. Les pertes en pourcentage sont déjà intégrées
au productible : elles ne sont pas appliquées une seconde fois.

La réponse consigne date de consultation, angles demandés et effectivement modélisés,
base et période météo lorsqu'elles sont fournies. Les années météo ne sont pas l'année
de production future ni un comptage observé. Si PVGIS arrondit les angles, les angles
effectivement retournés sont affichés. Une modification des angles ou pertes efface le
productible précédent ; recalculer ou saisir une autre valeur sourcée. En cas d'indisponibilité
du service, la saisie manuelle reste possible et ne dépend pas de l'API.

L'horizon PVGIS tient compte du relief à la résolution de son modèle, pas nécessairement
des arbres, bâtiments voisins, masques proches, salissures ou neige. Les ombres locales,
la structure, les connexions électriques, les autorisations et la faisabilité doivent être
étudiées séparément. Une valeur modélisée est une estimation et non une mesure du site.

## Production et consommation

La consommation annuelle sur place est facultative et reste une donnée distincte, avec
sa provenance. La différence entre deux totaux annuels ne permet pas de calculer
l'autoconsommation : il faut confronter les profils de production et de consommation sur
les mêmes pas de temps, en tenant compte du stockage éventuel. Aucune autoconsommation,
économie ou émission évitée n'est déduite automatiquement ici.

Les scénarios existants des versions 1 et 2 sont lus sans écriture automatique. Les
champs solaires y restent inconnus jusqu'à leur saisie ; la nouvelle version est enregistrée
lors d'une sauvegarde explicite. Les autres scénarios ouverts et le bilan bus restent séparés.
