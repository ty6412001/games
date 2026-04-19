import { describe, expect, it } from 'vitest';

const buildWalkPath = (start: number, steps: number, boardSize: number): number[] => {
  const path: number[] = [start];
  let cur = start;
  for (let i = 0; i < steps; i += 1) {
    cur = (cur + 1) % boardSize;
    path.push(cur);
  }
  return path;
};

describe('buildWalkPath', () => {
  it('returns start + steps positions', () => {
    expect(buildWalkPath(0, 3, 28)).toEqual([0, 1, 2, 3]);
  });

  it('wraps around board', () => {
    expect(buildWalkPath(25, 5, 28)).toEqual([25, 26, 27, 0, 1, 2]);
  });

  it('starts with start position', () => {
    const path = buildWalkPath(10, 6, 28);
    expect(path[0]).toBe(10);
    expect(path.length).toBe(7);
  });
});
