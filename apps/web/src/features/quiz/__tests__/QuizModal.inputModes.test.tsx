import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { GameState, Player, Question } from '@ultraman/shared';

import { useGameStore, type ActiveQuiz } from '../../../stores/gameStore';
import { QuizModal } from '../QuizModal';

const buildPlayer = (): Player => ({
  id: 'p1',
  name: '小朋友',
  hero: { heroId: 'decker', badge: 1 },
  isChild: true,
  money: 1000,
  position: 0,
  weaponIds: [],
  ownedTiles: [],
  streak: 0,
  combatPower: 0,
  helpCards: 1,
});

const buildGame = (): GameState => ({
  id: 'g1',
  startedAt: 0,
  durationMin: 20,
  week: 1,
  currentTurn: 0,
  phase: 'monopoly',
  tiles: [],
  players: [buildPlayer()],
});

const buildQuiz = (question: Question): ActiveQuiz => ({
  playerId: 'p1',
  usedHelp: false,
  startedAt: Date.now(),
  deadlineAt: Date.now() + 30_000,
  context: { kind: 'study' },
  question,
});

describe('QuizModal input mode routing', () => {
  beforeEach(() => {
    useGameStore.setState({ childId: 'p1', game: buildGame() });
  });

  it('uses DigitKeypad for pure-digit answer', () => {
    useGameStore.setState({
      activeQuiz: buildQuiz({
        id: 'q-digit',
        subject: 'math',
        difficulty: 1,
        topic: '加法',
        type: 'input',
        stem: '3 + 4 = ?',
        answer: '7',
      }),
    });
    render(<QuizModal />);
    // keypad signature: numeric buttons 1-9 + 0 + 确认 + 清空
    expect(screen.getByRole('button', { name: '7' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '清空' })).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('输入答案')).toBeNull();
  });

  it('uses InputArea for non-digit answer (e.g., with minus sign)', () => {
    useGameStore.setState({
      activeQuiz: buildQuiz({
        id: 'q-negative',
        subject: 'math',
        difficulty: 1,
        topic: '减法',
        type: 'input',
        stem: '1 - 4 = ?',
        answer: '-3',
      }),
    });
    render(<QuizModal />);
    expect(screen.getByPlaceholderText('输入答案')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '清空' })).toBeNull();
  });

  it('falls back to InputArea for text answer', () => {
    useGameStore.setState({
      activeQuiz: buildQuiz({
        id: 'q-text',
        subject: 'chinese',
        difficulty: 1,
        topic: '默写',
        type: 'input',
        stem: '"天"字的拼音首字母？',
        answer: 't',
      }),
    });
    render(<QuizModal />);
    expect(screen.getByPlaceholderText('输入答案')).toBeInTheDocument();
  });

  it('renders ordering area with numbered badges when items selected', () => {
    useGameStore.setState({
      activeQuiz: buildQuiz({
        id: 'q-order',
        subject: 'chinese',
        difficulty: 1,
        topic: '排序',
        type: 'ordering',
        stem: '按笔画顺序排列',
        items: ['一', '二', '三'],
        correctOrder: [0, 1, 2],
        answer: '0,1,2',
      }),
    });
    render(<QuizModal />);
    expect(screen.getByRole('button', { name: /选择 一/ })).toBeInTheDocument();
  });

  it('renders true-false area with custom labels', () => {
    useGameStore.setState({
      activeQuiz: buildQuiz({
        id: 'q-tf',
        subject: 'english',
        difficulty: 1,
        topic: '判断',
        type: 'true-false',
        stem: 'The sun is hot.',
        answer: 'true',
        trueLabel: '对',
        falseLabel: '不对',
      }),
    });
    render(<QuizModal />);
    expect(screen.getByRole('button', { name: '对' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '不对' })).toBeInTheDocument();
  });
});
