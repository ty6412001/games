import { beforeEach, describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import type { GameState, Player } from '@ultraman/shared';

import type { ActiveQuiz } from '../../../stores/gameStore';
import { useGameStore } from '../../../stores/gameStore';
import { QuizModal } from '../QuizModal';

const buildPlayer = (): Player => ({
  id: 'p1',
  name: '小朋友',
  hero: { heroId: 'tiga', badge: 1 },
  isChild: true,
  money: 1000,
  position: 0,
  weaponIds: [],
  ownedTiles: [],
  streak: 0,
  combatPower: 0,
  helpCards: 1,
});

const buildBossGame = (): GameState => ({
  id: 'g1',
  startedAt: 0,
  durationMin: 20,
  week: 1,
  currentTurn: 0,
  phase: 'boss',
  tiles: [],
  players: [buildPlayer()],
});

const activeBossQuiz = (): ActiveQuiz => ({
  playerId: 'p1',
  usedHelp: false,
  startedAt: Date.now(),
  deadlineAt: Date.now() + 30_000,
  context: { kind: 'boss-attack' },
  question: {
    id: 'q1',
    subject: 'math',
    difficulty: 1,
    topic: '加法',
    type: 'choice',
    stem: '1 + 1 = ?',
    options: ['2', '3'],
    answer: '2',
  },
});

describe('QuizModal text color on boss phase', () => {
  beforeEach(() => {
    useGameStore.setState({
      childId: 'p1',
      game: buildBossGame(),
      activeQuiz: activeBossQuiz(),
    });
  });

  it('root backdrop carries text-slate-50 so text inherits a readable color', () => {
    const { container } = render(<QuizModal />);
    const root = container.firstElementChild as HTMLElement;
    expect(root.className).toContain('text-slate-50');
  });
});
