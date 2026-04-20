import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import App from '../App';
import { HeroSelect } from '../features/setup/HeroSelect';
import { useGameStore } from '../stores/gameStore';

describe('App', () => {
  it('renders setup week options after starting the game', async () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: '奥特曼' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '▶ 开始游戏' }));
    expect(await screen.findByRole('button', { name: '第1周' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: '第2周' })).toBeInTheDocument();
  });

  describe('HeroSelect week selection', () => {
    const originalStartGame = useGameStore.getState().startGame;

    beforeEach(() => {
      useGameStore.setState({
        screen: 'setup',
        game: null,
      });
    });

    it('passes the selected week into startGame', () => {
      const startGame = vi.fn();
      useGameStore.setState({ startGame });

      const { unmount } = render(<HeroSelect />);
      const week1 = screen.getByRole('button', { name: '第1周' });
      const week2 = screen.getByRole('button', { name: '第2周' });

      expect(week1).toHaveAttribute('aria-pressed', 'true');
      expect(week2).toHaveAttribute('aria-pressed', 'false');

      fireEvent.click(week2);
      expect(week2).toHaveAttribute('aria-pressed', 'true');

      fireEvent.click(screen.getByRole('button', { name: '⚡ 开始游戏' }));
      expect(startGame).toHaveBeenCalledOnce();
      expect(startGame).toHaveBeenCalledWith(
        expect.objectContaining({
          week: 2,
        }),
      );

      unmount();
      useGameStore.setState({ startGame: originalStartGame });
    });
  });
});
