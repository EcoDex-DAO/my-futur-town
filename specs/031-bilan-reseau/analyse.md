# Analyse de cohérence

La fiche #31 et l'ancienne #13 décrivent un ancien modèle extrapolant le profil de la ligne 1. Le panneau actuellement branché dans `src/main.tsx` utilise désormais un autre calcul : activité de chaque ligne du GTFS, annualisée sur 365 jours, et motorisation unique choisie pour le scénario. Cette divergence impose de ne pas qualifier le résultat de flotte réelle.

La période de 47 jours ne permet pas de vérifier les variations annuelles. Le panneau conserve les facteurs historiques existants, non validés pour une flotte actuelle, et leur provenance initiale ; l'édition ne saisit pas encore de provenance structurée. Les tests existants vérifient le calendrier, la portion de tracé et les trajets non résolus. Les nouveaux tests couvrent le message d'extrapolation, les champs vides, les horaires indisponibles, le calendrier incomplet et les agrégats partiels.

Le bilan représentatif reste bloqué par les données et décisions citées dans la spécification. Cette tranche ne clôt pas #31 et ne valide pas les facteurs ni les sources préexistantes.
