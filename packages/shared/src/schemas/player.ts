import { z } from 'zod';

import { HeroSlotSchema, WeaponIdSchema } from './hero.js';
import { TilePositionSchema } from './tile.js';

export const PlayerIdSchema = z.string().min(1);
export type PlayerId = z.infer<typeof PlayerIdSchema>;

export const PlayerSchema = z.object({
  id: PlayerIdSchema,
  name: z.string().min(1),
  hero: HeroSlotSchema,
  isChild: z.boolean(),
  money: z.number().int(),
  position: TilePositionSchema,
  weaponIds: z.array(WeaponIdSchema),
  equippedWeaponId: WeaponIdSchema.optional(),
  ownedTiles: z.array(TilePositionSchema),
  streak: z.number().int().nonnegative(),
  combatPower: z.number().int().nonnegative(),
  helpCards: z.number().int().nonnegative(),
});
export type Player = z.infer<typeof PlayerSchema>;
