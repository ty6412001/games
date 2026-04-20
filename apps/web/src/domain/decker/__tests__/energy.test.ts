import { describe, expect, it } from 'vitest';

import { applyDeckerEvent, applyFinisherEvent } from '../energy.js';

describe('applyDeckerEvent', () => {
  it('adds 10 for correct', () => {
    expect(applyDeckerEvent(0, 'correct')).toBe(10);
    expect(applyDeckerEvent(29, 'correct')).toBe(39);
  });

  it('adds 20 for monster-defeat', () => {
    expect(applyDeckerEvent(0, 'monster-defeat')).toBe(20);
    expect(applyDeckerEvent(80, 'monster-defeat')).toBe(100);
  });

  it('subtracts 5 for wrong and clamps to 0', () => {
    expect(applyDeckerEvent(10, 'wrong')).toBe(5);
    expect(applyDeckerEvent(0, 'wrong')).toBe(0);
    expect(applyDeckerEvent(3, 'wrong')).toBe(0);
  });
});

describe('applyFinisherEvent', () => {
  it('does nothing when dynamic not unlocked', () => {
    expect(applyFinisherEvent(0, 'correct', false)).toBe(0);
    expect(applyFinisherEvent(50, 'monster-defeat', false)).toBe(50);
  });

  it('does nothing on wrong even when unlocked', () => {
    expect(applyFinisherEvent(40, 'wrong', true)).toBe(40);
  });

  it('adds 20 on correct/monster-defeat when unlocked', () => {
    expect(applyFinisherEvent(0, 'correct', true)).toBe(20);
    expect(applyFinisherEvent(0, 'monster-defeat', true)).toBe(20);
  });

  it('clamps at 100', () => {
    expect(applyFinisherEvent(90, 'correct', true)).toBe(100);
    expect(applyFinisherEvent(100, 'correct', true)).toBe(100);
  });
});
