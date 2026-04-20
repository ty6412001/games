import { useEffect, useState } from 'react';

import { useGameStore } from '../../stores/gameStore';

const PIPS: Record<number, string> = {
  1: '⚀',
  2: '⚁',
  3: '⚂',
  4: '⚃',
  5: '⚄',
  6: '⚅',
};

const CYCLE_SCHEDULE = [60, 60, 80, 100, 140, 200];

export const DicePanel = () => {
  const lastDice = useGameStore((s) => s.lastDice);
  const isRolling = useGameStore((s) => s.isRolling);
  const isMoving = useGameStore((s) => s.isMoving);
  const movementAnim = useGameStore((s) => s.movementAnim);
  const buyPrompt = useGameStore((s) => s.buyPrompt);
  const landingEvent = useGameStore((s) => s.landingEvent);
  const pendingQuiz = useGameStore((s) => s.pendingQuiz);
  const activeQuiz = useGameStore((s) => s.activeQuiz);
  const quizResult = useGameStore((s) => s.quizResult);
  const chanceResult = useGameStore((s) => s.chanceResult);
  const rollAndMove = useGameStore((s) => s.rollAndMove);

  const [displayFace, setDisplayFace] = useState<number | null>(lastDice);
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    if (!isRolling) {
      if (lastDice) {
        setDisplayFace(lastDice);
        setSettled(true);
        const t = window.setTimeout(() => setSettled(false), 300);
        return () => window.clearTimeout(t);
      }
      return undefined;
    }

    setSettled(false);
    let i = 0;
    let timeoutId: number | undefined;
    const step = () => {
      setDisplayFace(Math.floor(Math.random() * 6) + 1);
      if (i < CYCLE_SCHEDULE.length) {
        timeoutId = window.setTimeout(step, CYCLE_SCHEDULE[i]!);
        i += 1;
      }
    };
    step();
    return () => {
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, [isRolling, lastDice]);

  const disabled =
    isRolling ||
    isMoving ||
    Boolean(movementAnim) ||
    Boolean(buyPrompt) ||
    Boolean(landingEvent) ||
    Boolean(pendingQuiz) ||
    Boolean(activeQuiz) ||
    Boolean(quizResult) ||
    Boolean(chanceResult);

  const face = displayFace ? PIPS[displayFace] : '🎲';
  const label = lastDice ? `掷出 ${lastDice} 点` : '骰子';

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className={`flex h-24 w-24 select-none items-center justify-center rounded-2xl bg-white text-7xl text-slate-900 shadow-xl ${
          isRolling ? 'animate-dice-roll' : settled ? 'animate-dice-settle' : ''
        }`}
        aria-live="polite"
        aria-label={label}
        role="img"
      >
        {face}
      </div>
      <button
        type="button"
        onClick={() => {
          void rollAndMove();
        }}
        disabled={disabled}
        className="min-h-[64px] rounded-2xl bg-amber-400 px-8 py-3 text-xl font-black text-slate-900 shadow-lg transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {isRolling ? '掷骰中…' : isMoving ? '移动中…' : '🎲 掷骰'}
      </button>
    </div>
  );
};
