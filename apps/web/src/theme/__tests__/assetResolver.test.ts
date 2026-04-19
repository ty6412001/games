import { describe, expect, it } from 'vitest';

import {
  resolveHeroImage,
  resolveMonsterImage,
  resolveWeaponImage,
} from '../assetResolver.js';

describe('resolveHeroImage', () => {
  it('includes explicit URL first when provided', () => {
    const result = resolveHeroImage('tiga', '/custom/tiga.png');
    expect(result[0]).toBe('/custom/tiga.png');
    expect(result.length).toBeGreaterThan(1);
  });

  it('falls back to png then svg conventions', () => {
    expect(resolveHeroImage('tiga')).toEqual([
      '/assets/heroes/tiga.png',
      '/assets/heroes/tiga.svg',
    ]);
  });

  it('produces distinct paths per hero id', () => {
    expect(resolveHeroImage('zero')[0]).toBe('/assets/heroes/zero.png');
  });
});

describe('resolveMonsterImage', () => {
  it('uses boss id path', () => {
    expect(resolveMonsterImage('zetton')).toEqual([
      '/assets/monsters/zetton.png',
      '/assets/monsters/zetton.svg',
    ]);
  });

  it('prepends explicit URL', () => {
    const result = resolveMonsterImage('zetton', '/m/zetton.webp');
    expect(result[0]).toBe('/m/zetton.webp');
  });
});

describe('resolveWeaponImage', () => {
  it('uses weapon id path', () => {
    expect(resolveWeaponImage('tiga-zepellion')).toEqual([
      '/assets/weapons/tiga-zepellion.png',
      '/assets/weapons/tiga-zepellion.svg',
    ]);
  });
});
