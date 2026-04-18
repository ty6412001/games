import type { Tile } from '@ultraman/shared';
import { BOARD_SIZE } from '@ultraman/shared';

type PropertyDef = {
  position: number;
  name: string;
  district: 'monster-forest' | 'space-station' | 'land-of-light';
  basePrice: number;
  baseRent: number;
};

const PROPERTY_DEFS: readonly PropertyDef[] = [
  { position: 1, name: '巴尔坦星人基地', district: 'monster-forest', basePrice: 200, baseRent: 40 },
  { position: 2, name: '哥莫拉之穴', district: 'monster-forest', basePrice: 220, baseRent: 44 },
  { position: 4, name: '雷德王领地', district: 'monster-forest', basePrice: 240, baseRent: 48 },
  { position: 5, name: '杰顿荒野', district: 'monster-forest', basePrice: 260, baseRent: 52 },
  { position: 8, name: '金星观测站', district: 'space-station', basePrice: 320, baseRent: 70 },
  { position: 9, name: '火星前哨', district: 'space-station', basePrice: 340, baseRent: 76 },
  { position: 11, name: 'M78 光之国', district: 'space-station', basePrice: 380, baseRent: 92 },
  { position: 12, name: '泰坦深空', district: 'space-station', basePrice: 400, baseRent: 100 },
  { position: 15, name: '胜利之塔', district: 'land-of-light', basePrice: 460, baseRent: 130 },
  { position: 16, name: '光之塔', district: 'land-of-light', basePrice: 480, baseRent: 140 },
  { position: 18, name: '长老殿', district: 'land-of-light', basePrice: 520, baseRent: 160 },
  { position: 19, name: '和平广场', district: 'land-of-light', basePrice: 560, baseRent: 180 },
];

const STUDY_POSITIONS = [3, 6, 10, 13, 17, 20, 23, 26] as const;
const CHANCE_POSITIONS = [25, 24, 27] as const;
const MONSTER_POSITIONS = [22, 14] as const;
const REWARD_VAULT_POSITION = 21;
const BOSS_OUTPOST_POSITION = 7;

export const createBoardTiles = (): Tile[] => {
  const tiles: Tile[] = [];
  const propertyMap = new Map<number, PropertyDef>(PROPERTY_DEFS.map((p) => [p.position, p]));
  const studySet = new Set<number>(STUDY_POSITIONS);
  const chanceSet = new Set<number>(CHANCE_POSITIONS);
  const monsterSet = new Set<number>(MONSTER_POSITIONS);

  for (let position = 0; position < BOARD_SIZE; position += 1) {
    if (position === 0) {
      tiles.push({ position: 0, type: 'start' });
    } else if (position === REWARD_VAULT_POSITION) {
      tiles.push({ position, type: 'reward-vault' });
    } else if (position === BOSS_OUTPOST_POSITION) {
      tiles.push({ position, type: 'boss-outpost' });
    } else if (propertyMap.has(position)) {
      const def = propertyMap.get(position)!;
      tiles.push({
        position,
        type: 'property',
        name: def.name,
        district: def.district,
        basePrice: def.basePrice,
        baseRent: def.baseRent,
      });
    } else if (studySet.has(position)) {
      tiles.push({ position, type: 'study' });
    } else if (chanceSet.has(position)) {
      tiles.push({ position, type: 'chance' });
    } else if (monsterSet.has(position)) {
      tiles.push({ position, type: 'monster' });
    } else {
      tiles.push({ position, type: 'study' });
    }
  }

  return tiles;
};

export const PROPERTIES_PER_DISTRICT = 4;
export const DISTRICT_BONUS_MULTIPLIER = 2;
export const SALARY_ON_LAP = 200;
export const STUDY_REWARD_CORRECT = 80;
export const STUDY_REWARD_WRONG = -40;
export const STARTING_MONEY = 1500;
