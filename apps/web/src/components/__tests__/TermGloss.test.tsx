import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import { TermGloss } from '../TermGloss';

describe('TermGloss', () => {
  it('toggles tooltip on click', () => {
    render(<TermGloss term="wrongBook">错题本</TermGloss>);
    const trigger = screen.getByRole('button', { name: /查看说明/ });
    expect(screen.queryByRole('tooltip')).toBeNull();
    fireEvent.click(trigger);
    expect(screen.getByRole('tooltip').textContent).toContain('错的题');
    fireEvent.click(trigger);
    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it('closes on outside click', () => {
    render(
      <div>
        <TermGloss term="helpCard">求助卡</TermGloss>
        <span data-testid="outside">outside</span>
      </div>,
    );
    fireEvent.click(screen.getByRole('button', { name: /查看说明/ }));
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
    fireEvent.mouseDown(screen.getByTestId('outside'));
    expect(screen.queryByRole('tooltip')).toBeNull();
  });
});
