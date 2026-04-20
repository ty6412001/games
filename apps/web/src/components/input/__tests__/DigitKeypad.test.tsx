import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import { DigitKeypad } from '../DigitKeypad';

describe('DigitKeypad', () => {
  it('appends digits on press', () => {
    const onSubmit = vi.fn();
    render(<DigitKeypad onSubmit={onSubmit} />);
    fireEvent.click(screen.getByRole('button', { name: '1' }));
    fireEvent.click(screen.getByRole('button', { name: '2' }));
    fireEvent.click(screen.getByRole('button', { name: '3' }));
    fireEvent.click(screen.getByRole('button', { name: '确认' }));
    expect(onSubmit).toHaveBeenCalledWith('123');
  });

  it('clears value and disables submit when empty', () => {
    const onSubmit = vi.fn();
    render(<DigitKeypad onSubmit={onSubmit} />);
    fireEvent.click(screen.getByRole('button', { name: '9' }));
    fireEvent.click(screen.getByRole('button', { name: '清空' }));
    const submit = screen.getByRole('button', { name: '确认' }) as HTMLButtonElement;
    expect(submit.disabled).toBe(true);
    fireEvent.click(submit);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('stops appending past maxLength', () => {
    const onSubmit = vi.fn();
    render(<DigitKeypad onSubmit={onSubmit} maxLength={3} />);
    for (const digit of ['1', '2', '3', '4', '5']) {
      fireEvent.click(screen.getByRole('button', { name: digit }));
    }
    fireEvent.click(screen.getByRole('button', { name: '确认' }));
    expect(onSubmit).toHaveBeenCalledWith('123');
  });

  it('supports 0 key', () => {
    const onSubmit = vi.fn();
    render(<DigitKeypad onSubmit={onSubmit} />);
    fireEvent.click(screen.getByRole('button', { name: '1' }));
    fireEvent.click(screen.getByRole('button', { name: '0' }));
    fireEvent.click(screen.getByRole('button', { name: '确认' }));
    expect(onSubmit).toHaveBeenCalledWith('10');
  });
});
