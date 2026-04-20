import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { GameState, Player, QuestionPack } from '@ultraman/shared';

import { useGameStore } from '../../../stores/gameStore';
import { SubjectSelector } from '../SubjectSelector';

const buildChild = (): Player => ({
  id: 'child1',
  name: '小明',
  hero: { heroId: 'tiga', badge: 1 },
  isChild: true,
  money: 1000,
  position: 0,
  weaponIds: [],
  ownedTiles: [],
  streak: 0,
  combatPower: 0,
  helpCards: 0,
});

const buildGame = (): GameState => ({
  id: 'g1',
  startedAt: 0,
  durationMin: 20,
  week: 1,
  currentTurn: 0,
  phase: 'monopoly',
  tiles: [],
  players: [buildChild()],
});

const buildPack = (): QuestionPack => ({
  week: 1,
  title: 't',
  boss: { id: 'zetton', name: '杰顿', hp: 1 },
  questions: [
    {
      id: 'c1',
      subject: 'chinese',
      difficulty: 1,
      topic: 't',
      type: 'choice',
      stem: 'x',
      options: ['a', 'b'],
      answer: 'a',
    },
    {
      id: 'm1',
      subject: 'math',
      difficulty: 1,
      topic: 't',
      type: 'choice',
      stem: '1+1',
      options: ['1', '2'],
      answer: '2',
    },
    {
      id: 'e1',
      subject: 'english',
      difficulty: 1,
      topic: 't',
      type: 'choice',
      stem: 'x',
      options: ['a', 'b'],
      answer: 'a',
    },
  ],
});

const emptyCorrect = () => ({
  math: new Set<string>(),
  chinese: new Set<string>(),
  english: new Set<string>(),
  brain: new Set<string>(),
});

describe('SubjectSelector child rotation UI', () => {
  beforeEach(() => {
    useGameStore.setState({
      game: buildGame(),
      childId: 'child1',
      currentPack: buildPack(),
      brainQuestionCount: 0,
      correctQuestionIds: emptyCorrect(),
      pendingQuiz: { playerId: 'child1', context: { kind: 'study' } },
      lastChildSubject: null,
    });
  });

  it('disables the last-answered subject with 上一题选过 hint when other cores remain', () => {
    useGameStore.setState({ lastChildSubject: 'chinese' });
    render(<SubjectSelector />);
    const chinese = screen.getByRole('button', { name: /语文/ });
    expect((chinese as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText('上一题选过，先换一门')).toBeTruthy();
    const math = screen.getByRole('button', { name: /数学/ });
    const english = screen.getByRole('button', { name: /英语/ });
    expect((math as HTMLButtonElement).disabled).toBe(false);
    expect((english as HTMLButtonElement).disabled).toBe(false);
  });

  it('falls back to allowing last subject when all other cores are empty', () => {
    useGameStore.setState({
      lastChildSubject: 'chinese',
      currentPack: {
        ...buildPack(),
        questions: buildPack().questions.filter((q) => q.subject === 'chinese'),
      },
    });
    render(<SubjectSelector />);
    const chinese = screen.getByRole('button', { name: /语文/ });
    expect((chinese as HTMLButtonElement).disabled).toBe(false);
    expect(screen.getByText('其他学科没题了，这次可以连选同一门')).toBeTruthy();
  });

  it('does not gate adults (rotation only applies when child is the answerer)', () => {
    useGameStore.setState({
      lastChildSubject: 'chinese',
      game: {
        ...buildGame(),
        players: [
          { ...buildChild(), id: 'adult1', name: '爸爸', isChild: false },
          buildChild(),
        ],
      },
      pendingQuiz: { playerId: 'adult1', context: { kind: 'study' } },
    });
    render(<SubjectSelector />);
    const chinese = screen.getByRole('button', { name: /语文/ });
    expect((chinese as HTMLButtonElement).disabled).toBe(false);
  });
});
