export type DeckerEvent = 'correct' | 'monster-defeat' | 'wrong';

const ENERGY_DELTA: Record<DeckerEvent, number> = {
  correct: 10,
  'monster-defeat': 20,
  wrong: -5,
};

const FINISHER_GAIN_PER_CORRECT = 20;

export const applyDeckerEvent = (energy: number, event: DeckerEvent): number =>
  Math.max(0, energy + ENERGY_DELTA[event]);

export const applyFinisherEvent = (
  finisherEnergy: number,
  event: DeckerEvent,
  dynamicUnlocked: boolean,
): number => {
  if (!dynamicUnlocked) return finisherEnergy;
  if (event === 'wrong') return finisherEnergy;
  return Math.min(100, finisherEnergy + FINISHER_GAIN_PER_CORRECT);
};
