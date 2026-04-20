import { useState } from 'react';

import { DEFAULT_CHILD_ID } from '../../config/childIdentity';
import { ExportCenter } from '../export/ExportCenter';
import { KnowledgeBankCenter } from '../knowledgeBank/KnowledgeBankCenter';
import { ReviewMode } from '../review/ReviewMode';
import { useGameStore } from '../../stores/gameStore';

export const MainMenu = () => {
  const goToSetup = useGameStore((s) => s.goToSetup);
  const [activePanel, setActivePanel] = useState<'home' | 'review' | 'knowledge' | 'export'>('home');

  if (activePanel === 'review') {
    return <ReviewMode childId={DEFAULT_CHILD_ID} onExit={() => setActivePanel('home')} />;
  }

  if (activePanel === 'knowledge') {
    return <KnowledgeBankCenter onExit={() => setActivePanel('home')} />;
  }

  if (activePanel === 'export') {
    return <ExportCenter onExit={() => setActivePanel('home')} />;
  }

  return (
    <div className="h-[100svh] overflow-hidden bg-gradient-to-br from-indigo-950 via-slate-950 to-slate-900 text-slate-50">
      <div className="mx-auto flex h-full max-w-4xl flex-col items-center justify-center px-8 text-center">
        <h1 className="text-5xl font-black tracking-tight md:text-7xl">奥特曼</h1>
        <h2 className="mt-2 text-3xl font-black text-amber-300 md:text-5xl">亲子大富翁</h2>
        <p className="mt-3 text-lg text-slate-300">陪孩子学，一起打 Boss</p>
        <div className="mt-10 flex flex-col gap-4 md:flex-row">
          <button
            type="button"
            onClick={goToSetup}
            className="min-h-[72px] rounded-2xl bg-amber-400 px-12 py-4 text-2xl font-black text-slate-900 shadow-2xl transition hover:scale-105"
          >
            ▶ 开始游戏
          </button>
          <button
            type="button"
            onClick={() => setActivePanel('review')}
            className="min-h-[72px] rounded-2xl bg-sky-500 px-12 py-4 text-2xl font-black text-white shadow-2xl transition hover:scale-105"
          >
            📚 每日复习
          </button>
        </div>
        <div className="mt-4 grid w-full max-w-2xl gap-4 md:grid-cols-2">
          <button
            type="button"
            onClick={() => setActivePanel('knowledge')}
            className="rounded-2xl border border-white/10 bg-white/5 px-6 py-4 text-left shadow-xl transition hover:-translate-y-0.5 hover:bg-white/10"
          >
            <div className="text-sm font-semibold uppercase tracking-[0.3em] text-sky-200">Phase 1</div>
            <div className="mt-2 text-xl font-black">知识库中心</div>
            <div className="mt-2 text-sm text-slate-300">查看独立题库、学习记录与多模式复用骨架。</div>
          </button>
          <button
            type="button"
            onClick={() => setActivePanel('export')}
            className="rounded-2xl border border-white/10 bg-white/5 px-6 py-4 text-left shadow-xl transition hover:-translate-y-0.5 hover:bg-white/10"
          >
            <div className="text-sm font-semibold uppercase tracking-[0.3em] text-amber-200">Phase 1</div>
            <div className="mt-2 text-xl font-black">导出中心</div>
            <div className="mt-2 text-sm text-slate-300">预览错题、答题日志和 JSON 导出入口结构。</div>
          </button>
        </div>
      </div>
    </div>
  );
};
