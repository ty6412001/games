import { z } from 'zod';

export const BOARD_SIZE = 28;

export const TilePositionSchema = z.number().int().min(0).max(BOARD_SIZE - 1);
export type TilePosition = z.infer<typeof TilePositionSchema>;

export const DistrictSchema = z.enum(['monster-forest', 'space-station', 'land-of-light']);
export type District = z.infer<typeof DistrictSchema>;

export const TileTypeSchema = z.enum([
  'start',
  'study',
  'property',
  'chance',
  'monster',
  'reward-vault',
  'boss-outpost',
]);
export type TileType = z.infer<typeof TileTypeSchema>;

export const StartTileSchema = z.object({
  position: z.literal(0),
  type: z.literal('start'),
});

export const StudyTileSchema = z.object({
  position: TilePositionSchema,
  type: z.literal('study'),
});

export const PropertyTileSchema = z.object({
  position: TilePositionSchema,
  type: z.literal('property'),
  name: z.string().min(1),
  district: DistrictSchema,
  basePrice: z.number().int().positive(),
  baseRent: z.number().int().positive(),
});

export const ChanceTileSchema = z.object({
  position: TilePositionSchema,
  type: z.literal('chance'),
});

export const MonsterTileSchema = z.object({
  position: TilePositionSchema,
  type: z.literal('monster'),
});

export const RewardVaultTileSchema = z.object({
  position: TilePositionSchema,
  type: z.literal('reward-vault'),
});

export const BossOutpostTileSchema = z.object({
  position: TilePositionSchema,
  type: z.literal('boss-outpost'),
});

export const TileSchema = z.discriminatedUnion('type', [
  StartTileSchema,
  StudyTileSchema,
  PropertyTileSchema,
  ChanceTileSchema,
  MonsterTileSchema,
  RewardVaultTileSchema,
  BossOutpostTileSchema,
]);
export type Tile = z.infer<typeof TileSchema>;
