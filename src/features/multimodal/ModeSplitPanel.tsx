"use client";

import { useState } from "react";
import { estimateModeSplit } from "./mode-split";
import type { MultimodalScenario } from "./scenarios";

const format = (value: number | null) => value === null ? "À renseigner" : new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 }).format(value);

/** Mount with the scenario ID as key so unsaved inputs never leak between scenarios. */
export function ModeSplitPanel({ scenario }: { scenario: MultimodalScenario }) {
  const [bikeShare, setBikeShare] = useState<number | null>(null);
  const [walkingShare, setWalkingShare] = useState<number | null>(null);
  const a = scenario.assumptions;
  const result = estimateModeSplit({
    parkingPlaces: a.parkingPlaces.value, occupiedFraction: a.occupiedFraction.value,
    dailyTurnover: a.dailyTurnover.value, peakArrivalFraction: a.peakArrivalFraction.value,
    passengersPerCar: a.passengersPerCar.value, busShare: a.busShare.value,
    bikeShare, walkingShare,
  });

  return <section aria-label="Répartition des voyageurs du parking">
    <h3>Répartition des voyageurs du parking</h3>
    <p>Estimation horaire pour les personnes arrivant en voiture, selon les hypothèses du scénario. La part bus reprend le paramètre du scénario ; elle n’est pas modifiée ici.</p>
    <p className="multimodal-hint">Les parts vélo et marche sont des valeurs supposées à saisir. Elles ne sont pas enregistrées et sont effacées au changement de scénario. Le solde ne peut être calculé que lorsque les trois parts sont connues.</p>
    <label className="multimodal-field">Part prenant le vélo <span>(fraction de 0 à 1)</span><input type="number" min="0" max="1" step="any" value={bikeShare ?? ""} onChange={(event) => setBikeShare(event.target.value === "" ? null : event.target.valueAsNumber)} /></label>
    <label className="multimodal-field">Part marchant à pied <span>(fraction de 0 à 1)</span><input type="number" min="0" max="1" step="any" value={walkingShare ?? ""} onChange={(event) => setWalkingShare(event.target.value === "" ? null : event.target.valueAsNumber)} /></label>
    {result.errors.map((error) => <p className="multimodal-error" role="alert" key={error}>{error}</p>)}
    <dl className="multimodal-results">
      <div><dt>Voyageurs arrivant au parking / heure</dt><dd>{format(result.total)}</dd></div>
      <div><dt>Bus / heure</dt><dd>{format(result.bus)}</dd></div>
      <div><dt>Vélo / heure</dt><dd>{format(result.bike)}</dd></div>
      <div><dt>Marche / heure</dt><dd>{format(result.walking)}</dd></div>
      <div><dt>Autres ou non affectés / heure</dt><dd>{format(result.unallocated)}</dd></div>
    </dl>
    <p className="multimodal-hint">Cette répartition n’est ni un comptage, ni une mesure du report modal ; elle ne distingue pas les déplacements induits. La part bus peut inclure des voyageurs déjà comptés dans la référence.</p>
  </section>;
}
