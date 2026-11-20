# Parking virtuel : capacité et volume indicatifs

Le panneau Scénarios permet de renseigner, pour chaque scénario, le nombre de niveaux
hors sol, leur hauteur, la surface affectée au stationnement par niveau et la surface par
place avec circulation comprise. Ces hypothèses sont initialement inconnues et leur nature,
source, date et périmètre sont modifiables. Elles sont enregistrées localement avec le
scénario ; aucune valeur réelle du site n'est préremplie.

Le bouton « Utiliser les valeurs moyennes » propose une variante de départ modifiable :
trois niveaux de 3 m, un contour OSM d'environ 6 624 m² et 80 % de cette surface par
niveau, arrondis à 5 300 m². Les 20 % restants sont une marge supposée pour les espaces
hors ratio, et non une mesure locale ni une exigence réglementaire. Le ratio transféré est
de 25 m² par place, dégagements compris. Avec ces seules hypothèses, le calcul donne
636 places théoriques et 9 m de hauteur. Ces valeurs ne garantissent pas la faisabilité.
L'application du modèle demande confirmation si des valeurs de parking existent déjà ;
elle n'enregistre pas automatiquement le scénario.

La capacité théorique vaut `plancher(surface par niveau × niveaux / surface par place)`.
La surface par niveau doit correspondre au périmètre du ratio ; il ne faut pas soustraire
une seconde fois la circulation déjà comprise dans ce ratio. Rampes, cages, locaux,
équipements et espaces exclus du ratio doivent être déduits de la surface saisie quand
leur dimension est connue. La hauteur visualisée vaut `niveaux × hauteur par niveau` ;
elle décrit un volume hors sol simplifié, et non une hauteur réglementaire ou mesurée.

Le [guide du Certu de 2008, diffusé par le Cerema](https://doc.cerema.fr/digitalCollection/DigitalCollectionAttachmentDownloadHandler.ashx?documentId=584694&parentDocumentId=14411&skipCopyright=true&skipWatermark=true),
page 44, donne un exemple de 25 m² par place en garage collectif, dégagements compris. Ce ratio
transféré n'est pas une mesure des Trésums et n'est pas appliqué automatiquement. Les
résultats ne vérifient ni rampes, pente, structure, sécurité, accessibilité, réglementation
ou nombre réel de places. Des entrées manquantes ne sont pas remplacées par zéro.

Le volume utilise le polygone OpenStreetMap `way/40906387` version 12, issu de la
[référence locale](../data/reference/tresums/README.md) : © contributeurs OpenStreetMap,
ODbL 1.0. C'est un contour contributif indicatif, non un périmètre foncier ou une emprise
de projet validée. Les accès et surfaces ne sont pas calculés depuis ce polygone. Un contour
et des bandes représentant schématiquement chaque niveau sont ajoutés au zoom rapproché.
Les bandes utilisent le nombre de niveaux et leur hauteur renseignés dans le scénario ;
elles ne représentent ni la disposition réelle des étages ni un plan architectural.
Le volume simple reste affiché à l'échelle de la ville. Les rampes et les étages
intérieurs ne sont pas modélisés.
Le volume extrude tout le contour OSM à la hauteur calculée, indépendamment de la surface
saisie, qui ne sert qu'à l'estimation de capacité.

La capacité estimée ne modifie le paramètre de stationnement du calcul bus qu'à la demande
explicite de l'utilisateur. Cette valeur devient alors une hypothèse du scénario, pas un
comptage. Elle ne se met pas à jour automatiquement si les paramètres du parking changent.
Les anciens scénarios enregistrés sont lus sans écriture automatique et conservent
leurs hypothèses bus ; leur nouveau format est enregistré lors de la sauvegarde explicite.
