import { useEffect, useRef } from 'react';

import { useGameStore } from '../../stores/gameStore';
import { FORM_LABEL } from '../../domain/decker/forms';

const DURATION_MS = 2000;

export const FormTransitionOverlay = () => {
  const decker = useGameStore((s) => s.deckerState);
  const pendingQuiz = useGameStore((s) => s.pendingQuiz);
  const activeQuiz = useGameStore((s) => s.activeQuiz);
  const clearMark = useGameStore((s) => s.clearTransitionMark);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!decker?.lastTransitionAt) return;
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      clearMark();
      timerRef.current = null;
    }, DURATION_MS);
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      timerRef.current = null;
    };
  }, [decker?.lastTransitionAt, clearMark]);

  if (!decker?.lastTransitionAt) return null;
  if (pendingQuiz || activeQuiz) return null;

  return (
    <div
      data-testid="form-transition-overlay"
      className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm"
    >
      <div className="animate-decker-rise hud-frame rounded-3xl px-8 py-6 text-center shadow-hud-glow">
        <div className="font-kid text-sm font-black uppercase tracking-widest text-amber-200">
          变身完成
        </div>
        <div className="mt-2 font-kid text-5xl font-black text-amber-100 text-stroke-black">
          {FORM_LABEL[decker.currentForm]}！
        </div>
      </div>
    </div>
  );
};
