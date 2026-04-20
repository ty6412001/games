import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';

vi.mock('../../../data/repo/wrongBookRepo', () => ({
  listActive: vi.fn(async () => []),
  markMastered: vi.fn(async () => undefined),
}));

import { useGameStore } from '../../../stores/gameStore';
import { ReviewMode } from '../ReviewMode';

describe('ReviewMode reset-progress footer', () => {
  const originalReset = useGameStore.getState().resetCorrectBook;
  let spy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    spy = vi.fn(async () => undefined);
    useGameStore.setState({ resetCorrectBook: spy });
  });

  afterAll(() => {
    useGameStore.setState({ resetCorrectBook: originalReset });
  });

  it('opens confirm dialog when 清除学习进度 is clicked', async () => {
    render(<ReviewMode childId="child-default" onExit={() => undefined} />);
    await waitFor(() => expect(screen.getByText(/错题本清空啦/)).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: /清除学习进度/ }));
    expect(screen.getByRole('dialog', { name: /确认清除学习进度/ })).toBeTruthy();
  });

  it('invokes resetCorrectBook and closes dialog when 确定清除 is clicked', async () => {
    render(<ReviewMode childId="child-default" onExit={() => undefined} />);
    await waitFor(() => expect(screen.getByText(/错题本清空啦/)).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: /清除学习进度/ }));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /确定清除/ }));
    });
    expect(spy).toHaveBeenCalledTimes(1);
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: /确认清除学习进度/ })).toBeNull(),
    );
  });

  it('cancel closes the dialog without calling resetCorrectBook', async () => {
    render(<ReviewMode childId="child-default" onExit={() => undefined} />);
    await waitFor(() => expect(screen.getByText(/错题本清空啦/)).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: /清除学习进度/ }));
    fireEvent.click(screen.getByRole('button', { name: '取消' }));
    expect(screen.queryByRole('dialog', { name: /确认清除学习进度/ })).toBeNull();
    expect(spy).not.toHaveBeenCalled();
  });
});
