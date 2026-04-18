import { useGameStore } from '../../stores/gameStore';

const PIPS: Record<number, string> = {
  1: '⚀',
  2: '⚁',
  3: '⚂',
  4: '⚃',
  5: '⚄',
  6: '⚅',
};

export const DicePanel = () => {
  const lastDice = useGameStore((s) => s.lastDice);
  const isRolling = useGameStore((s) => s.isRolling);
  const isMoving = useGameStore((s) => s.isMoving);
  const buyPrompt = useGameStore((s) => s.buyPrompt);
  const landingEvent = useGameStore((s) => s.landingEvent);
  const rollAndMove = useGameStore((s) => s.rollAndMove);

  const disabled = isRolling || isMoving || Boolean(buyPrompt) || Boolean(landingEvent);

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className={`flex h-24 w-24 items-center justify-center rounded-2xl bg-white text-7xl text-slate-900 shadow-xl ${
          isRolling ? 'animate-spin' : ''
        }`}
        aria-label="骰子"
      >
        {lastDice ? PIPS[lastDice] : '🎲'}
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
