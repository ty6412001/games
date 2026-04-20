import type { District, Tile, TileType } from '@ultraman/shared';
import { BOARD_SIZE } from '@ultraman/shared';

type PropertySpec = {
  name: string;
  district: District;
  basePrice: number;
  baseRent: number;
};

const PROPERTY_SPECS_BY_DISTRICT: Record<District, readonly PropertySpec[]> = {
  'monster-forest': [
    { name: '巴尔坦星人基地', district: 'monster-forest', basePrice: 200, baseRent: 40 },
    { name: '哥莫拉之穴', district: 'monster-forest', basePrice: 220, baseRent: 44 },
    { name: '雷德王领地', district: 'monster-forest', basePrice: 240, baseRent: 48 },
    { name: '杰顿荒野', district: 'monster-forest', basePrice: 260, baseRent: 52 },
  ],
  'space-station': [
    { name: '金星观测站', district: 'space-station', basePrice: 320, baseRent: 70 },
    { name: '火星前哨', district: 'space-station', basePrice: 340, baseRent: 76 },
    { name: 'M78 光之国', district: 'space-station', basePrice: 380, baseRent: 92 },
    { name: '泰坦深空', district: 'space-station', basePrice: 400, baseRent: 100 },
  ],
  'land-of-light': [
    { name: '胜利之塔', district: 'land-of-light', basePrice: 460, baseRent: 130 },
    { name: '光之塔', district: 'land-of-light', basePrice: 480, baseRent: 140 },
    { name: '长老殿', district: 'land-of-light', basePrice: 520, baseRent: 160 },
    { name: '和平广场', district: 'land-of-light', basePrice: 560, baseRent: 180 },
  ],
};

const CORNER_POSITIONS = [7, 14, 21] as const;
const NON_CORNER_POSITIONS = Array.from({ length: BOARD_SIZE - 1 }, (_, i) => i + 1).filter(
  (p) => !CORNER_POSITIONS.includes(p as 7 | 14 | 21),
);

const DISTRICT_ORDER: readonly District[] = [
  'monster-forest',
  'space-station',
  'land-of-light',
];

export const PROPERTIES_PER_DISTRICT = 4;
export const DISTRICT_BONUS_MULTIPLIER = 2;
export const SALARY_ON_LAP = 200;
export const STUDY_REWARD_CORRECT = 80;
export const STUDY_REWARD_WRONG = -40;
export const STARTING_MONEY = 1500;

const MAX_ATTEMPTS = 100;

const shuffle = <T>(source: readonly T[], rand: () => number): T[] => {
  const arr = [...source];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = arr[i]!;
    arr[i] = arr[j]!;
    arr[j] = tmp;
  }
  return arr;
};

const buildPropertyTile = (position: number, spec: PropertySpec): Tile => ({
  position,
  type: 'property',
  name: spec.name,
  district: spec.district,
  basePrice: spec.basePrice,
  baseRent: spec.baseRent,
});

const buildSimpleTile = (position: number, type: Exclude<TileType, 'property' | 'start'>): Tile =>
  ({ position, type }) as Tile;

const hasSpecialClustering = (types: readonly TileType[]): boolean => {
  // 只检查"稀有"类型聚集（chance/monster）相邻，允许 property / study 与自身相邻以保证可行性
  for (let i = 0; i < types.length; i += 1) {
    const next = (i + 1) % types.length;
    const a = types[i];
    const b = types[next];
    if (a === b && (a === 'chance' || a === 'monster')) return true;
  }
  return false;
};

const tryGenerate = (rand: () => number): Tile[] | null => {
  const cornerSpecials: TileType[] = shuffle(
    ['boss-outpost', 'reward-vault', 'monster'],
    rand,
  );
  const nonCornerTypes: TileType[] = shuffle(
    [
      ...Array.from<TileType>({ length: 12 }).fill('property'),
      ...Array.from<TileType>({ length: 8 }).fill('study'),
      ...Array.from<TileType>({ length: 3 }).fill('chance'),
      'monster',
    ],
    rand,
  );

  const layoutTypes: TileType[] = new Array(BOARD_SIZE).fill('start') as TileType[];
  layoutTypes[0] = 'start';
  CORNER_POSITIONS.forEach((corner, idx) => {
    layoutTypes[corner] = cornerSpecials[idx]!;
  });
  NON_CORNER_POSITIONS.forEach((pos, idx) => {
    layoutTypes[pos] = nonCornerTypes[idx]!;
  });

  if (hasSpecialClustering(layoutTypes)) return null;

  const propertyPositions = layoutTypes
    .map((type, pos) => (type === 'property' ? pos : -1))
    .filter((p) => p >= 0);
  if (propertyPositions.length !== 12) return null;

  const shuffledPropertyPositions = shuffle(propertyPositions, rand);
  const positionsByDistrict: Record<District, number[]> = {
    'monster-forest': shuffledPropertyPositions.slice(0, 4).sort((a, b) => a - b),
    'space-station': shuffledPropertyPositions.slice(4, 8).sort((a, b) => a - b),
    'land-of-light': shuffledPropertyPositions.slice(8, 12).sort((a, b) => a - b),
  };

  const propertyByPosition = new Map<number, Tile>();
  for (const district of DISTRICT_ORDER) {
    const positions = positionsByDistrict[district];
    const specs = PROPERTY_SPECS_BY_DISTRICT[district];
    positions.forEach((pos, idx) => {
      propertyByPosition.set(pos, buildPropertyTile(pos, specs[idx]!));
    });
  }

  const tiles: Tile[] = [];
  for (let pos = 0; pos < BOARD_SIZE; pos += 1) {
    if (pos === 0) {
      tiles.push({ position: 0, type: 'start' });
      continue;
    }
    const type = layoutTypes[pos]!;
    if (type === 'property') {
      const tile = propertyByPosition.get(pos);
      if (!tile) return null;
      tiles.push(tile);
    } else {
      tiles.push(buildSimpleTile(pos, type as Exclude<TileType, 'property' | 'start'>));
    }
  }
  return tiles;
};

const buildFallbackLayout = (): Tile[] => {
  // 固定布局：4 角 + 每边 P-S-P-C-P-S（第 3 边用 M 代替 C 放第 2 只怪兽）
  const layoutTypes: TileType[] = [
    'start',      // 0
    'property',   // 1  MF
    'study',      // 2
    'property',   // 3  MF
    'chance',     // 4
    'property',   // 5  MF
    'study',      // 6
    'boss-outpost', // 7 corner
    'property',   // 8  MF
    'study',      // 9
    'property',   // 10 SS
    'chance',     // 11
    'property',   // 12 SS
    'study',      // 13
    'monster',    // 14 corner
    'property',   // 15 SS
    'study',      // 16
    'property',   // 17 SS
    'monster',    // 18 second monster
    'property',   // 19 LL
    'study',      // 20
    'reward-vault', // 21 corner
    'property',   // 22 LL
    'study',      // 23
    'property',   // 24 LL
    'chance',     // 25
    'property',   // 26 LL
    'study',      // 27
  ];
  const propertyPositions = layoutTypes
    .map((t, i) => (t === 'property' ? i : -1))
    .filter((i) => i >= 0);
  const positionsByDistrict: Record<District, number[]> = {
    'monster-forest': propertyPositions.slice(0, 4),
    'space-station': propertyPositions.slice(4, 8),
    'land-of-light': propertyPositions.slice(8, 12),
  };
  const propertyByPosition = new Map<number, Tile>();
  for (const district of DISTRICT_ORDER) {
    const positions = positionsByDistrict[district];
    const specs = PROPERTY_SPECS_BY_DISTRICT[district];
    positions.forEach((pos, idx) => {
      propertyByPosition.set(pos, buildPropertyTile(pos, specs[idx]!));
    });
  }
  return layoutTypes.map((type, pos) => {
    if (pos === 0) return { position: 0, type: 'start' } as Tile;
    if (type === 'property') return propertyByPosition.get(pos)!;
    return buildSimpleTile(pos, type as Exclude<TileType, 'property' | 'start'>);
  });
};

export const FALLBACK_LAYOUT: readonly Tile[] = Object.freeze(buildFallbackLayout());

export const createBoardTiles = (rand: () => number = Math.random): Tile[] => {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const layout = tryGenerate(rand);
    if (layout) return layout;
  }
  return FALLBACK_LAYOUT.map((t) => ({ ...t })) as Tile[];
};
