import { describe, it, expect } from 'vitest';

import { BATTLE_CONTRAST, relLuminance, contrastRatio } from '../contrast';

describe('BATTLE_CONTRAST tokens', () => {
  it('每个 token 都同时导出 textClass 与 bgClass', () => {
    for (const [key, token] of Object.entries(BATTLE_CONTRAST)) {
      expect(token.textClass, `${key}.textClass`).toMatch(/^text-/);
      expect(token.bgClass, `${key}.bgClass`).toMatch(/^bg-/);
      expect(token.textHex, `${key}.textHex`).toMatch(/^#[0-9a-f]{6}$/i);
      expect(token.bgHex, `${key}.bgHex`).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it('每个 token 的对比度 >= 4.5 (WCAG AA 正文阈值)', () => {
    for (const [key, token] of Object.entries(BATTLE_CONTRAST)) {
      const ratio = contrastRatio(token.textHex, token.bgHex);
      expect(ratio, `${key} ratio=${ratio.toFixed(2)}`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('relLuminance 边界值正确', () => {
    expect(relLuminance('#000000')).toBeCloseTo(0, 3);
    expect(relLuminance('#ffffff')).toBeCloseTo(1, 3);
  });
});
