import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import type { GameState, Player, QuestionPack } from '@ultraman/shared';

import { useGameStore } from '../../../stores/gameStore';
import { SubjectSelector } from '../SubjectSelector';

const buildPlayer = (): Player => ({
  id: 'p1',
  name: '爸爸',
  hero: { heroId: 'zero', badge: 1 },
  isChild: false,
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

const buildPack = (): QuestionPack => ({
  week: 1,
  title: 't',
  boss: { id: 'zetton', name: '杰顿', hp: 1 },
  questions: [
    {
      id: 'q1',
      subject: 'math',
      difficulty: 1,
      topic: 't',
      type: 'choice',
      stem: '1+1',
      options: ['2', '3'],
      answer: '2',
    },
  ],
});

describe('SubjectSelector text color on boss phase', () => {
  beforeEach(() => {
    useGameStore.setState({
      childId: 'child-id-unused',
      game: buildBossGame(),
      currentPack: buildPack(),
      brainQuestionCount: 0,
      pendingQuiz: { playerId: 'p1', context: { kind: 'boss-attack' } },
    });
  });

  it('root backdrop carries text-slate-50 so text inherits a readable color', () => {
    const { container } = render(<SubjectSelector />);
    const root = container.firstElementChild as HTMLElement;
    expect(root.className).toContain('text-slate-50');
  });

  it('keeps the brain subject enabled when brainQuestionCount is available', () => {
    useGameStore.setState({
      childId: 'child-id-unused',
      game: buildBossGame(),
      currentPack: buildPack(),
      brainQuestionCount: 3,
      pendingQuiz: { playerId: 'p1', context: { kind: 'boss-attack' } },
    });

    render(<SubjectSelector />);
    const brainButton = screen.getByRole('button', { name: /挑战题/ });
    expect((brainButton as HTMLButtonElement).disabled).toBe(false);
    expect(screen.queryByRole('button', { name: /脑筋急转弯/ })).toBeNull();
  });

  it('shows the remaining general-pack count after some questions were answered correctly', () => {
    useGameStore.setState({
      childId: 'child-id-unused',
      game: buildBossGame(),
      currentPack: buildPack(),
      brainQuestionCount: 5,
      correctQuestionIds: {
        math: new Set<string>(),
        chinese: new Set<string>(),
        english: new Set<string>(),
        brain: new Set<string>(['b1', 'b2']),
      },
      pendingQuiz: { playerId: 'p1', context: { kind: 'boss-attack' } },
    });

    render(<SubjectSelector />);
    const brainButton = screen.getByRole('button', { name: /挑战题/ }) as HTMLButtonElement;
    expect(brainButton.disabled).toBe(false);
    expect(within(brainButton).getByText('共 3 题')).toBeInTheDocument();
  });

  it('disables the brain subject when all general-pack questions were already answered', () => {
    useGameStore.setState({
      childId: 'child-id-unused',
      game: buildBossGame(),
      currentPack: buildPack(),
      brainQuestionCount: 2,
      correctQuestionIds: {
        math: new Set<string>(),
        chinese: new Set<string>(),
        english: new Set<string>(),
        brain: new Set<string>(['b1', 'b2']),
      },
      pendingQuiz: { playerId: 'p1', context: { kind: 'boss-attack' } },
    });

    render(<SubjectSelector />);
    const brainButton = screen.getByRole('button', { name: /挑战题/ }) as HTMLButtonElement;
    expect(brainButton.disabled).toBe(true);
    expect(within(brainButton).getByText('🎉 已答对全部题目')).toBeInTheDocument();
  });
});
