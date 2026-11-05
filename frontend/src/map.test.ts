import { describe, expect, it } from 'vitest';
import { buildingSource, groupForLayer } from './map';
describe('cartographic source compatibility', () => {
  it('finds buildings by source layer instead of style-specific names', () => {
    expect(buildingSource({ version: 8, sources: {}, layers: [{id:'custom',type:'fill',source:'planet','source-layer':'building'}] })?.id).toBe('custom');
  });
  it('accepts a style with no buildings', () => {
    expect(buildingSource({version:8,sources:{},layers:[]})).toBeUndefined();
  });
  it('groups roads, water and buildings without hiding unrelated labels', () => {
    expect(groupForLayer({id:'road','source-layer':'transportation'})).toBe('roads');
    expect(groupForLayer({id:'lake','source-layer':'water'})).toBe('water');
    expect(groupForLayer({id:'mft-buildings-3d'})).toBe('buildings');
    expect(groupForLayer({id:'place','source-layer':'place'})).toBeUndefined();
  });
});
