import { describe, expect, it } from 'vitest';

import { getHero } from '../heroes';

describe('hero image overrides', () => {
  it('uses the copied real image for zero', () => {
    expect(getHero('zero').imageUrl).toBe('/assets/heroes/zero.jpg');
  });

  it('uses the copied real image for belial', () => {
    expect(getHero('belial').imageUrl).toBe('/assets/heroes/belial.jpeg');
  });
});
