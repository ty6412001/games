import { useEffect, useState } from 'react';

import { BATTLE_EFFECT_DURATION_MS } from '../../config/features';
import { useGameStore } from '../../stores/gameStore';

export const QuizResultToast = () => {
  const result = useGameStore((s) => s.quizResult);
  const dismiss = useGameStore((s) => s.dismissQuizResult);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!result) {
      setReady(false);
      return undefined;
    }
    if (result.correct) {
      setReady(false);
      const t = window.setTimeout(() => setReady(true), BATTLE_EFFECT_DURATION_MS);
      return () => window.clearTimeout(t);
    }
    setReady(true);
    return undefined;
  }, [result]);

  if (!result || !ready) return null;

  const tone =
    result.outcome === 'correct'
      ? 'bg-emerald-500 text-white'
      : result.outcome === 'help'
        ? 'bg-sky-500 text-white'
        : result.outcome === 'timeout'
          ? 'bg-orange-500 text-white'
          : 'bg-rose-500 text-white';

  const icon =
    result.outcome === 'correct'
      ? '🌟'
      : result.outcome === 'help'
        ? '🆘'
        : result.outcome === 'timeout'
          ? '⏰'
          : '💥';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <div className={`w-full max-w-md rounded-3xl p-6 text-center shadow-2xl ${tone}`}>
        <div className="text-5xl">{icon}</div>
        <div className="mt-3 text-2xl font-black">{result.message}</div>
        <button
          type="button"
          onClick={dismiss}
          className="mt-5 w-full rounded-xl bg-white/20 px-4 py-3 text-lg font-bold"
        >
          继续
        </button>
      </div>
    </div>
  );
};
