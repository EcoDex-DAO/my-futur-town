/** ADEME / HBEFA 4.1, moyenne prospective de parc France, bus urbain en 2026.
 * Données publiées le 30 mars 2021, Licence Ouverte / Open Licence.
 * Vérification API Data-fair : lignes source 112 et 113, champ NOx (g/km).
 * Ces facteurs ne sont pas des mesures de la flotte SIBRA.
 */
const dataset = "https://data.ademe.fr/datasets/etude-facteurs-d%27emissions-des-differents-modes-de-transport-routier";
export const ADEME_BUS_NOX_2026 = [
  { id: "diesel", label: "Bus urbain gazole", value: 1.85, name: `ADEME HBEFA 4.1 — ${dataset}`, version: "30-03-2021, année prospective 2026, ligne source 112", scope: "NOx échappement, g/véhicule-km, parc moyen bus urbain France gazole ; pas une mesure SIBRA", uncertainty: "Moyenne prospective de parc, non calibrée pour SIBRA." },
  { id: "gas", label: "Bus urbain gaz naturel", value: 0.713, name: `ADEME HBEFA 4.1 — ${dataset}`, version: "30-03-2021, année prospective 2026, ligne source 113", scope: "NOx échappement, g/véhicule-km, parc moyen bus urbain France gaz naturel ; pas une mesure SIBRA", uncertainty: "Moyenne prospective de parc, non calibrée pour SIBRA." },
] as const;
