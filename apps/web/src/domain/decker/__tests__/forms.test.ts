import { describe, expect, it } from 'vitest';

import {
  FORM_ORDER,
  FORM_THRESHOLDS,
  formFromEnergy,
  isAtLeast,
  type DeckerForm,
} from '../forms.js';

describe('formFromEnergy', () => {
  it('stays in flash below miracle threshold', () => {
    expect(formFromEnergy(0, 'flash')).toBe('flash');
    expect(formFromEnergy(29, 'flash')).toBe('flash');
  });

  it('ascends at each threshold', () => {
    expect(formFromEnergy(FORM_THRESHOLDS.miracle, 'flash')).toBe('miracle');
    expect(formFromEnergy(FORM_THRESHOLDS.strong, 'miracle')).toBe('strong');
    expect(formFromEnergy(FORM_THRESHOLDS.dynamic, 'strong')).toBe('dynamic');
  });

  it('never descends even if energy drops', () => {
    expect(formFromEnergy(0, 'miracle')).toBe('miracle');
    expect(formFromEnergy(10, 'strong')).toBe('strong');
    expect(formFromEnergy(99, 'dynamic')).toBe('dynamic');
  });

  it('supports cross-level jumps (e.g., flash to strong)', () => {
    expect(formFromEnergy(70, 'flash')).toBe('strong');
    expect(formFromEnergy(100, 'flash')).toBe('dynamic');
  });
});

describe('isAtLeast', () => {
  it('compares form order', () => {
    expect(isAtLeast('flash', 'flash')).toBe(true);
    expect(isAtLeast('strong', 'miracle')).toBe(true);
    expect(isAtLeast('miracle', 'strong')).toBe(false);
    expect(isAtLeast('dynamic', 'dynamic')).toBe(true);
  });
});

describe('FORM_ORDER / FORM_THRESHOLDS invariants', () => {
  it('thresholds are non-decreasing in order', () => {
    let prev = -1;
    for (const form of FORM_ORDER as readonly DeckerForm[]) {
      expect(FORM_THRESHOLDS[form]).toBeGreaterThanOrEqual(prev);
      prev = FORM_THRESHOLDS[form];
    }
  });
});
