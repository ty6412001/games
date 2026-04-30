import { useEffect } from 'react';

import { useGameStore } from '../../stores/gameStore';

const format = (secs: number): string => {
  const clamped = Math.max(0, Math.floor(secs));
  const mm = String(Math.floor(clamped / 60)).padStart(2, '0');
  const ss = String(clamped % 60).padStart(2, '0');
  return `${mm}:${ss}`;
};

export const GameTimer = () => {
  const game = useGameStore((s) => s.game);
  const nowMs = useGameStore((s) => s.nowMs);
  const tick = useGameStore((s) => s.tick);

  useEffect(() => {
    const id = window.setInterval(() => tick(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [tick]);

  if (!game) return null;
  const elapsed = (nowMs - game.startedAt) / 1000;
  const remaining = game.durationMin * 60 - elapsed;

  return (
    <div className="rounded-full border border-amber-300/20 bg-amber-400/10 px-4 py-2 text-xl font-black text-amber-200">
      <span className="font-digit">⏳ {format(remaining)}</span>
    </div>
  );
};
