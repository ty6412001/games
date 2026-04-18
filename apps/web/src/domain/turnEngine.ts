import type { Tile } from '@ultraman/shared';
import { BOARD_SIZE } from '@ultraman/shared';

export type DiceRoll = 1 | 2 | 3 | 4 | 5 | 6;

export type LandingEvent =
  | { kind: 'start' }
  | { kind: 'study'; position: number }
  | { kind: 'property-unowned'; position: number; price: number }
  | { kind: 'property-owned-self'; position: number }
  | { kind: 'property-owned-other'; position: number; ownerId: string; rent: number }
  | { kind: 'chance'; position: number }
  | { kind: 'monster'; position: number }
  | { kind: 'reward-vault'; position: number }
  | { kind: 'boss-outpost'; position: number };

type RandomFn = () => number;

export const rollDice = (rand: RandomFn = Math.random): DiceRoll => {
  const n = Math.floor(rand() * 6) + 1;
  if (n < 1 || n > 6) {
    throw new Error(`dice roll out of range: ${n}`);
  }
  return n as DiceRoll;
};

export const advancePosition = (current: number, steps: number): number => {
  if (current < 0 || current >= BOARD_SIZE) {
    throw new Error(`invalid current position: ${current}`);
  }
  if (steps < 1 || steps > 6) {
    throw new Error(`invalid step count: ${steps}`);
  }
  return (current + steps) % BOARD_SIZE;
};

export const crossedStart = (oldPos: number, _newPos: number, steps: number): boolean => {
  return oldPos + steps >= BOARD_SIZE;
};

export type OwnershipLookup = (position: number) => string | null;

export type RentLookup = (position: number) => number;

export const resolveLanding = (
  position: number,
  tiles: readonly Tile[],
  currentPlayerId: string,
  findOwner: OwnershipLookup,
  getRent: RentLookup,
): LandingEvent => {
  const tile = tiles[position];
  if (!tile) {
    throw new Error(`no tile at position ${position}`);
  }
  switch (tile.type) {
    case 'start':
      return { kind: 'start' };
    case 'study':
      return { kind: 'study', position };
    case 'chance':
      return { kind: 'chance', position };
    case 'monster':
      return { kind: 'monster', position };
    case 'reward-vault':
      return { kind: 'reward-vault', position };
    case 'boss-outpost':
      return { kind: 'boss-outpost', position };
    case 'property': {
      const ownerId = findOwner(position);
      if (!ownerId) {
        return { kind: 'property-unowned', position, price: tile.basePrice };
      }
      if (ownerId === currentPlayerId) {
        return { kind: 'property-owned-self', position };
      }
      return { kind: 'property-owned-other', position, ownerId, rent: getRent(position) };
    }
  }
};
