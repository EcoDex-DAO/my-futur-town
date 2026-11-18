import { describe, expect, it } from "vitest";
import { calculateSolar, createSolarAssumptions } from "./solar";

const installation = {
  ...createSolarAssumptions(),
  canopyAreaSqMeters: 1_000,
  panelCoverageFraction: 0.8,
  panelEfficiencyFraction: 0.2,
};

describe("solar estimate", () => {
  it("keeps unknown outputs null and accepts annual consumption independently", () => {
    const assumptions = createSolarAssumptions();
    expect(calculateSolar(assumptions)).toEqual({
      peakCapacityKwp: null, annualProductionKwh: null, onsiteAnnualConsumptionKwh: null, errors: {},
    });
    expect(calculateSolar({ ...assumptions, onsiteAnnualConsumptionKwh: 65_000 })).toEqual({
      peakCapacityKwp: null, annualProductionKwh: null, onsiteAnnualConsumptionKwh: 65_000, errors: {},
    });
  });

  it("calculates STC capacity and applies the PVGIS yield without applying losses again", () => {
    expect(calculateSolar(installation)).toMatchObject({ peakCapacityKwp: 160, annualProductionKwh: null });
    const inputs = { ...installation, pvgisYieldKwhPerKwpYear: 1_200, onsiteAnnualConsumptionKwh: 65_000 };
    const expected = { peakCapacityKwp: 160, annualProductionKwh: 192_000, onsiteAnnualConsumptionKwh: 65_000, errors: {} };
    expect(calculateSolar(inputs)).toEqual(expected);
    expect(calculateSolar({ ...inputs, pvgisSlopeDeg: 90, pvgisAspectDeg: -180, pvgisLossPercent: 14 })).toEqual(expected);
  });

  it("preserves explicit zero and allows PVGIS loss at 100 percent", () => {
    expect(calculateSolar({ ...installation, panelCoverageFraction: 0, pvgisYieldKwhPerKwpYear: 1_200, onsiteAnnualConsumptionKwh: 0 })).toEqual({
      peakCapacityKwp: 0, annualProductionKwh: 0, onsiteAnnualConsumptionKwh: 0, errors: {},
    });
    expect(calculateSolar({ ...installation, pvgisLossPercent: 100, pvgisYieldKwhPerKwpYear: 0 })).toEqual({
      peakCapacityKwp: 160, annualProductionKwh: 0, onsiteAnnualConsumptionKwh: null, errors: {},
    });
  });

  it("reports individual input errors even when other values are unknown", () => {
    const result = calculateSolar({
      canopyAreaSqMeters: null, panelCoverageFraction: NaN, panelEfficiencyFraction: 1.01,
      pvgisYieldKwhPerKwpYear: -1, onsiteAnnualConsumptionKwh: Infinity, pvgisSlopeDeg: 91,
      pvgisAspectDeg: -181, pvgisLossPercent: 101,
    });
    expect(result).toEqual({
      peakCapacityKwp: null, annualProductionKwh: null, onsiteAnnualConsumptionKwh: null,
      errors: {
        panelCoverageFraction: expect.any(String), panelEfficiencyFraction: expect.any(String),
        pvgisYieldKwhPerKwpYear: expect.any(String), onsiteAnnualConsumptionKwh: expect.any(String),
        pvgisSlopeDeg: expect.any(String), pvgisAspectDeg: expect.any(String), pvgisLossPercent: expect.any(String),
      },
    });
  });

  it("keeps independently valid outputs when another input fails", () => {
    expect(calculateSolar({ ...installation, onsiteAnnualConsumptionKwh: -1, pvgisYieldKwhPerKwpYear: 1_200 })).toMatchObject({
      peakCapacityKwp: 160, annualProductionKwh: 192_000, onsiteAnnualConsumptionKwh: null,
      errors: { onsiteAnnualConsumptionKwh: expect.any(String) },
    });
    expect(calculateSolar({ ...installation, pvgisYieldKwhPerKwpYear: Number.MAX_VALUE })).toMatchObject({
      peakCapacityKwp: 160, annualProductionKwh: null,
      errors: { pvgisYieldKwhPerKwpYear: expect.any(String) },
    });
  });
});
