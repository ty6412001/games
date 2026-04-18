import { z } from 'zod';

import { BossBattleStateSchema } from './boss.js';
import { PlayerSchema } from './player.js';
import { BOARD_SIZE, TileSchema } from './tile.js';

export const GamePhaseSchema = z.enum(['setup', 'monopoly', 'settle', 'boss', 'ended']);
export type GamePhase = z.infer<typeof GamePhaseSchema>;

export const DurationMinutesSchema = z.union([z.literal(20), z.literal(30), z.literal(45)]);
export type DurationMinutes = z.infer<typeof DurationMinutesSchema>;

export const GameStateSchema = z.object({
  id: z.string().min(1),
  startedAt: z.number().int().nonnegative(),
  durationMin: DurationMinutesSchema,
  week: z.number().int().min(1).max(18),
  players: z.array(PlayerSchema).min(2).max(5),
  currentTurn: z.number().int().nonnegative(),
  phase: GamePhaseSchema,
  tiles: z.array(TileSchema).length(BOARD_SIZE),
  bossBattle: BossBattleStateSchema.optional(),
});
export type GameState = z.infer<typeof GameStateSchema>;
