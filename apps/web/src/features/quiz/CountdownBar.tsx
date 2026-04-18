type Props = {
  startedAt: number;
  deadlineAt: number;
  nowMs: number;
  difficulty: 1 | 2 | 3;
};

const colorByDifficulty: Record<number, { base: string; critical: string }> = {
  1: { base: 'bg-emerald-400', critical: 'bg-rose-500' },
  2: { base: 'bg-amber-400', critical: 'bg-rose-500' },
  3: { base: 'bg-orange-500', critical: 'bg-rose-600' },
};

export const CountdownBar = ({ startedAt, deadlineAt, nowMs, difficulty }: Props) => {
  const total = deadlineAt - startedAt;
  const remaining = Math.max(0, deadlineAt - nowMs);
  const ratio = total > 0 ? remaining / total : 0;
  const critical = remaining <= 5000;
  const palette = colorByDifficulty[difficulty] ?? colorByDifficulty[1]!;
  const bar = critical ? palette.critical : palette.base;
  const secs = Math.ceil(remaining / 1000);

  return (
    <div className="w-full">
      <div className="flex items-center justify-between text-sm text-slate-300">
        <span>⏳ 倒计时</span>
        <span className={critical ? 'text-rose-300 animate-pulse' : ''}>{secs}s</span>
      </div>
      <div className="mt-1 h-3 w-full overflow-hidden rounded-full bg-slate-800">
        <div
          className={`h-full rounded-full transition-all ${bar} ${critical ? 'animate-pulse' : ''}`}
          style={{ width: `${Math.round(ratio * 100)}%` }}
        />
      </div>
    </div>
  );
};
