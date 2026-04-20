import { describe, expect, it } from 'vitest';

import { createBoardTiles } from '../tiles.js';
import { advancePosition, crossedStart, resolveLanding, rollDice } from '../turnEngine.js';

describe('rollDice', () => {
  it('always returns 1 to 6 by default', () => {
    for (let i = 0; i < 200; i += 1) {
      const result = rollDice();
      expect(result).toBeGreaterThanOrEqual(1);
      expect(result).toBeLessThanOrEqual(6);
    }
  });

  it('respects injected random', () => {
    expect(rollDice(() => 0)).toBe(1);
    expect(rollDice(() => 0.9999)).toBe(6);
  });

  it('returns 1 to 7 when max=7', () => {
    for (let i = 0; i < 200; i += 1) {
      const result = rollDice(Math.random, 7);
      expect(result).toBeGreaterThanOrEqual(1);
      expect(result).toBeLessThanOrEqual(7);
    }
    expect(rollDice(() => 0.9999, 7)).toBe(7);
    expect(rollDice(() => 0, 7)).toBe(1);
  });

  it('rejects max out of range', () => {
    expect(() => rollDice(Math.random, 0)).toThrow();
    expect(() => rollDice(Math.random, 8)).toThrow();
  });
});

describe('advancePosition', () => {
  it('adds steps to current position', () => {
    expect(advancePosition(0, 3)).toBe(3);
    expect(advancePosition(10, 5)).toBe(15);
  });

  it('wraps past the last tile', () => {
    expect(advancePosition(25, 5)).toBe(2);
    expect(advancePosition(27, 1)).toBe(0);
  });

  it('rejects invalid positions', () => {
    expect(() => advancePosition(-1, 1)).toThrow();
    expect(() => advancePosition(28, 1)).toThrow();
  });

  it('accepts 7-step moves (miracle form)', () => {
    expect(advancePosition(0, 7)).toBe(7);
    expect(advancePosition(25, 7)).toBe(4);
  });

  it('rejects out-of-range steps', () => {
    expect(() => advancePosition(0, 0)).toThrow();
    expect(() => advancePosition(0, 8)).toThrow();
  });
});

describe('crossedStart', () => {
  it('is true when wrapping', () => {
    expect(crossedStart(25, 2, 5)).toBe(true);
    expect(crossedStart(27, 0, 1)).toBe(true);
  });

  it('is false without wrapping', () => {
    expect(crossedStart(5, 10, 5)).toBe(false);
  });
});

describe('resolveLanding', () => {
  const tiles = createBoardTiles();

  it('returns study event on study tile', () => {
    const studyPos = tiles.findIndex((t) => t.type === 'study');
    const event = resolveLanding(
      studyPos,
      tiles,
      'p1',
      () => null,
      () => 0,
    );
    expect(event.kind).toBe('study');
  });

  it('returns property-unowned when no owner', () => {
    const propPos = tiles.findIndex((t) => t.type === 'property');
    const event = resolveLanding(
      propPos,
      tiles,
      'p1',
      () => null,
      () => 0,
    );
    expect(event.kind).toBe('property-unowned');
  });

  it('returns property-owned-other when foreign owner', () => {
    const propPos = tiles.findIndex((t) => t.type === 'property');
    const event = resolveLanding(
      propPos,
      tiles,
      'p1',
      () => 'p2',
      () => 80,
    );
    expect(event.kind).toBe('property-owned-other');
    if (event.kind === 'property-owned-other') {
      expect(event.rent).toBe(80);
      expect(event.ownerId).toBe('p2');
    }
  });

  it('returns property-owned-self when own owner', () => {
    const propPos = tiles.findIndex((t) => t.type === 'property');
    const event = resolveLanding(
      propPos,
      tiles,
      'p1',
      () => 'p1',
      () => 0,
    );
    expect(event.kind).toBe('property-owned-self');
  });

  it('returns start on position 0', () => {
    const event = resolveLanding(
      0,
      tiles,
      'p1',
      () => null,
      () => 0,
    );
    expect(event.kind).toBe('start');
  });
});
