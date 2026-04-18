import { z } from 'zod';

export const HeroIdSchema = z.enum(['tiga', 'zero', 'decker', 'belial']);
export type HeroId = z.infer<typeof HeroIdSchema>;

export const HeroSlotSchema = z.object({
  heroId: HeroIdSchema,
  badge: z.number().int().min(1).max(2).default(1),
});
export type HeroSlot = z.infer<typeof HeroSlotSchema>;

export const WeaponRaritySchema = z.enum(['common', 'rare']);
export type WeaponRarity = z.infer<typeof WeaponRaritySchema>;

export const WeaponIdSchema = z.string().min(1);
export type WeaponId = z.infer<typeof WeaponIdSchema>;

export const WeaponSchema = z.object({
  id: WeaponIdSchema,
  heroId: HeroIdSchema,
  name: z.string().min(1),
  rarity: WeaponRaritySchema,
  combatPowerBonus: z.number().int().nonnegative(),
  imageUrl: z.string().optional(),
});
export type Weapon = z.infer<typeof WeaponSchema>;
