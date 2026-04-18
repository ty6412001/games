import { useState } from 'react';

import { ReviewMode } from '../review/ReviewMode';
import { useGameStore } from '../../stores/gameStore';

const DEFAULT_CHILD_ID = 'child-default';

export const MainMenu = () => {
  const goToSetup = useGameStore((s) => s.goToSetup);
  const [showReview, setShowReview] = useState(false);

  if (showReview) {
    return <ReviewMode childId={DEFAULT_CHILD_ID} onExit={() => setShowReview(false)} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-slate-950 to-slate-900 text-slate-50">
      <div className="mx-auto flex min-h-screen max-w-4xl flex-col items-center justify-center px-8 text-center">
        <h1 className="text-6xl font-black tracking-tight md:text-8xl">奥特曼</h1>
        <h2 className="mt-2 text-4xl font-black text-amber-300 md:text-6xl">亲子大富翁</h2>
        <p className="mt-4 text-xl text-slate-300">陪孩子学，一起打 Boss</p>
        <div className="mt-12 flex flex-col gap-4 md:flex-row">
          <button
            type="button"
            onClick={goToSetup}
            className="min-h-[72px] rounded-2xl bg-amber-400 px-12 py-4 text-2xl font-black text-slate-900 shadow-2xl transition hover:scale-105"
          >
            ▶ 开始游戏
          </button>
          <button
            type="button"
            onClick={() => setShowReview(true)}
            className="min-h-[72px] rounded-2xl bg-sky-500 px-12 py-4 text-2xl font-black text-white shadow-2xl transition hover:scale-105"
          >
            📚 每日复习
          </button>
        </div>
      </div>
    </div>
  );
};
