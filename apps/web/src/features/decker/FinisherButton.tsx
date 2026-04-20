import { useGameStore } from '../../stores/gameStore';
import { isAtLeast } from '../../domain/decker/forms';

export const FinisherButton = () => {
  const game = useGameStore((s) => s.game);
  const decker = useGameStore((s) => s.deckerState);
  const fire = useGameStore((s) => s.fireFinisher);

  if (!game || game.phase !== 'boss' || !game.bossBattle || !decker) return null;
  if (!isAtLeast(decker.currentForm, 'dynamic')) return null;

  const ready = decker.finisherEnergy >= 100 && !decker.finisherUsedThisBoss;

  return (
    <button
      type="button"
      onClick={fire}
      disabled={!ready}
      data-testid="decker-finisher-button"
      aria-label={
        decker.finisherUsedThisBoss
          ? '必杀本场已释放'
          : ready
            ? '释放德凯必杀，Boss 血量减半'
            : `必杀能量 ${decker.finisherEnergy} / 100`
      }
      className={`relative flex min-h-[72px] w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 font-kid text-xl font-black shadow-xl transition ${
        ready
          ? 'animate-finisher-ready bg-gradient-to-r from-rose-500 via-amber-400 to-rose-500 text-slate-900 hover:scale-[1.02]'
          : 'bg-slate-700 text-slate-400 cursor-not-allowed'
      }`}
    >
      <span className="text-2xl">⚡</span>
      <span>
        {decker.finisherUsedThisBoss
          ? '必杀已用'
          : ready
            ? '释放必杀！'
            : `必杀 ${decker.finisherEnergy}/100`}
      </span>
    </button>
  );
};
