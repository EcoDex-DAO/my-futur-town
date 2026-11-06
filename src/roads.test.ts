import { describe, it, expect } from "vitest";
import {
  applyProfiles,
  profileError,
  proposedProfile,
  type Roads,
} from "./roads";
describe("road scenario model", () => {
  it("labels missing source values as editable assumptions without changing reference", () => {
    const source = {};
    const p = proposedProfile(source);
    expect(source).toEqual({});
    expect(p.direction).toBe("both");
    expect(profileError(p)).toBeUndefined();
  });
  it("validates geometry allocation and unknown speed", () => {
    const p = proposedProfile({});
    expect(profileError({ ...p, lanes: 1, cycle_width_m: 2 })).toBeUndefined();
    expect(profileError({ ...p, cycle_width_m: 20 })).toContain("dépassent");
    expect(profileError({ ...p, lanes: 1.5 })).toContain("entier");
    expect(profileError({ ...p, width_m: NaN })).toContain("finis");
    expect(profileError({ ...p, speed_kph: null })).toBeUndefined();
  });
  it("overlays and restores a scenario without mutating geometry or reference", () => {
    const original: Roads = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: {
            type: "LineString",
            coordinates: [
              [1, 1],
              [1.01, 1],
            ],
          },
          properties: {
            id: "technical-test",
            name: null,
            source_key: "technical",
            layer_id: "test",
            length_m: 100,
            from_node: "a",
            to_node: "b",
            road_profile: { direction: "both" },
            snapshot_version: "test",
            osm_tags: {},
          },
        },
      ],
    };
    const before = JSON.stringify(original);
    const profile = {
      ...proposedProfile({}),
      direction: "forward" as const,
      lanes: 1,
      cycle_width_m: 2,
    };
    const result = applyProfiles(original, [
      {
        reference_object_id: "technical-test",
        properties: { road_profile: profile },
      },
    ]);
    expect(result.features[0].properties.direction).toBe("forward");
    expect(result.features[0].properties.cycle_width_m).toBe(2);
    expect(JSON.stringify(original)).toBe(before);
    expect(applyProfiles(original, []).features[0].properties.direction).toBe(
      "both",
    );
  });
});
