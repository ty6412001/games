import { describe, expect, it } from 'vitest';

import {
  resolveHeroImage,
  resolveMonsterImage,
  resolveWeaponImage,
} from '../assetResolver.js';

describe('resolveHeroImage', () => {
  it('returns explicit URL when provided', () => {
    expect(resolveHeroImage('tiga', '/custom/tiga.png')).toBe('/custom/tiga.png');
  });

  it('falls back to conventional path', () => {
    expect(resolveHeroImage('tiga')).toBe('/assets/heroes/tiga.png');
    expect(resolveHeroImage('zero')).toBe('/assets/heroes/zero.png');
  });
});

describe('resolveMonsterImage', () => {
  it('returns explicit when provided', () => {
    expect(resolveMonsterImage('zetton', '/m/zetton.webp')).toBe('/m/zetton.webp');
  });

  it('uses boss id path', () => {
    expect(resolveMonsterImage('zetton')).toBe('/assets/monsters/zetton.png');
  });
});

describe('resolveWeaponImage', () => {
  it('uses weapon id path', () => {
    expect(resolveWeaponImage('tiga-zepellion')).toBe(
      '/assets/weapons/tiga-zepellion.png',
    );
  });
});
