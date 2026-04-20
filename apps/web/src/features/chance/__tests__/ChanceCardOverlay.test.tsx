import { describe, expect, it, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import type { GameState, Player } from '@ultraman/shared';

import type { ChanceCardDef } from '../../../domain/chanceDeck';
import { findChanceCard } from '../../../domain/chanceDeck';
import type { ChanceResult } from '../../../stores/gameStore';
import { useGameStore } from '../../../stores/gameStore';
import { ChanceCardOverlay } from '../ChanceCardOverlay';

const basePlayer = (): Player => ({
  id: 'p1',
  name: '小明',
  hero: { heroId: 'tiga', badge: 1 },
  isChild: true,
  money: 1000,
  position: 24,
  weaponIds: [],
  ownedTiles: [],
  streak: 0,
  combatPower: 0,
  helpCards: 1,
});

const baseGame = (): GameState => ({
  id: 'g1',
  startedAt: 0,
  durationMin: 20,
  week: 1,
  currentTurn: 0,
  phase: 'monopoly',
  tiles: [],
  players: [basePlayer()],
});

const withResult = (card: ChanceCardDef, actualDelta: ChanceResult['actualDelta'], helpCardToMoney = 0) =>
  useGameStore.setState({
    game: baseGame(),
    chanceResult: {
      playerId: 'p1',
      card,
      actualDelta,
      converted: { helpCardToMoney },
    },
  });

describe('ChanceCardOverlay', () => {
  beforeEach(() => {
    useGameStore.setState({ chanceResult: null });
  });

  it('renders nothing when chanceResult is null', () => {
    useGameStore.setState({ game: baseGame(), chanceResult: null });
    const { container } = render(<ChanceCardOverlay />);
    expect(container.firstChild).toBeNull();
  });

  it('shows the card title and description for a good card', () => {
    withResult(findChanceCard('supply-drop')!, { money: 120, streak: 0, helpCards: 0 });
    const { getByText } = render(<ChanceCardOverlay />);
    expect(getByText('光之补给')).toBeTruthy();
    expect(getByText('好事来了')).toBeTruthy();
    expect(getByText(/120/)).toBeTruthy();
  });

  it('renders a bad-tone band for negative cards', () => {
    withResult(findChanceCard('monster-prank')!, { money: -40, streak: 0, helpCards: 0 });
    const { getByText } = render(<ChanceCardOverlay />);
    expect(getByText('小麻烦')).toBeTruthy();
    expect(getByText(/-40/)).toBeTruthy();
  });

  it('shows overflow-cash hint when help cards convert to money', () => {
    withResult(findChanceCard('family-help')!, { money: 40, streak: 0, helpCards: 0 }, 1);
    const { getByText } = render(<ChanceCardOverlay />);
    expect(getByText(/换成 ¥40/)).toBeTruthy();
  });

  it('invokes dismissChanceResult when 继续 is clicked', () => {
    withResult(findChanceCard('supply-drop')!, { money: 120, streak: 0, helpCards: 0 });
    const { getByText } = render(<ChanceCardOverlay />);
    fireEvent.click(getByText('继续'));
    expect(useGameStore.getState().chanceResult).toBeNull();
  });
});
