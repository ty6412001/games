import { z } from 'zod';

import { PlayerIdSchema } from './player.js';

export const BossIdSchema = z.string().min(1);
export type BossId = z.infer<typeof BossIdSchema>;

export const BossSchema = z.object({
  id: BossIdSchema,
  name: z.string().min(1),
  week: z.number().int().min(1).max(18),
  hp: z.number().int().positive(),
  image: z.string().optional(),
});
export type Boss = z.infer<typeof BossSchema>;

export const BossBattleStatusSchema = z.enum(['pending', 'in-progress', 'victory', 'escaped']);
export type BossBattleStatus = z.infer<typeof BossBattleStatusSchema>;

export const BossBattleStateSchema = z.object({
  bossId: BossIdSchema,
  bossName: z.string().min(1),
  maxHp: z.number().int().positive(),
  currentHp: z.number().int().nonnegative(),
  currentAttackerId: PlayerIdSchema,
  contributions: z.record(PlayerIdSchema, z.number().int().nonnegative()),
  status: BossBattleStatusSchema,
  topContributorId: PlayerIdSchema.optional(),
});
export type BossBattleState = z.infer<typeof BossBattleStateSchema>;

export const BossLogEntrySchema = z.object({
  id: z.string().min(1),
  childId: z.string().min(1),
  week: z.number().int().min(1).max(18),
  bossId: BossIdSchema,
  defeated: z.boolean(),
  totalCombatPower: z.number().int().nonnegative(),
  topContributor: PlayerIdSchema.optional(),
  playedAt: z.number().int().nonnegative(),
});
export type BossLogEntry = z.infer<typeof BossLogEntrySchema>;
