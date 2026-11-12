/** Repères documentaires : ils ne préremplissent aucun calcul ni scénario. */
export function BusPublicReferences() {
  return <details className="bus-public-references">
    <summary>Repères publics sur le parc et l’activité</summary>
    <p>Ces sources décrivent des dates et des périmètres différents. Elles ne constituent pas un inventaire actuel consolidé ni une affectation aux lignes.</p>
    <h4>Parc présenté par la SIBRA — date non indiquée</h4>
    <p>La page consultée le 11 novembre 2026 mentionne notamment 23 bus articulés et 53 standards, dont 2 hybrides. Certains standards et minibus relèvent aussi de transporteurs privés ; les cars scolaires sont présentés séparément. La date de cet inventaire et les motorisations complètes ne sont pas indiquées.</p>
    <p><a href="https://www.sibra.fr/parc-vehicules/" target="_blank" rel="noreferrer">Consulter la page du parc SIBRA</a></p>
    <h4>Grand Annecy — communiqué du 29 août 2023</h4>
    <p>Le communiqué décrit à cette date une flotte de 36 articulés, 54 standards et 8 midibus, ainsi que la livraison de 6 Heuliez GX 337 ELEC. Il évoquait 16 véhicules supplémentaires ; l’utilisateur indique que cette commande n’a pas été passée. Cette précision reste à confirmer par une source officielle. Ces 16 véhicules ne sont pas inclus dans les calculs.</p>
    <p>Pour le GX 337 ELEC, la batterie de 462 kWh et l’autonomie annoncée supérieure à 300 km sont des caractéristiques communiquées ; elles ne mesurent pas la consommation réelle.</p>
    <p><a href="https://www.grandannecy.fr/fileadmin/mediatheque/kiosque/Espace_presse/Mise_en_service_de_6_bus_electriques_fabriques_en_France.pdf" target="_blank" rel="noreferrer">Consulter le communiqué 2023 (PDF)</a> · <a href="https://mobilites.grandannecy.fr/actualites/lagglomeration-du-grand-annecy-met-en-service-6-bus-electriques-fabriques-en-france-67" target="_blank" rel="noreferrer">Consulter l’actualité Mobilités</a></p>
    <h4>Offre kilométrique SIBRA — exercice 2025</h4>
    <p>Le rapport de gestion 2025 présenté au conseil le 17 septembre 2026 indique 7 451 192 km d’offre pour le réseau SIBRA. Le périmètre Grand Annecy seul, les kilomètres par ligne et la répartition par motorisation restent à préciser. Ce repère historique n’est pas utilisé automatiquement dans les calculs.</p>
    <p><a href="https://www.grandannecy.fr/fileadmin/mediatheque/Documents_reglementaires/Conseil/2026/09_17/DEL-2026-177__SIBRA_Rapport_de_gestion_2025.pdf" target="_blank" rel="noreferrer">Consulter le rapport SIBRA 2025 (PDF, page 2)</a></p>
  </details>;
}
