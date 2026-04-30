import { useState } from 'react';

import { DEFAULT_CHILD_ID } from '../../config/childIdentity';
import { HeroAvatar } from '../../theme/ultraman/HeroAvatar';
import { HEROES } from '../../theme/ultraman/heroes';
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
    <div className="relative min-h-[100svh] overflow-hidden px-5 py-6 text-slate-50 md:px-8 md:py-8">
      <div className="pointer-events-none absolute inset-0 opacity-80">
        <div className="absolute left-[-8%] top-[-12%] h-72 w-72 rounded-full bg-sky-500/18 blur-3xl" />
        <div className="absolute bottom-[-18%] right-[-6%] h-96 w-96 rounded-full bg-amber-400/14 blur-3xl" />
      </div>
      <div className="relative mx-auto flex min-h-[calc(100svh-3rem)] max-w-6xl items-center">
        <div className="grid w-full items-center gap-10 lg:grid-cols-[minmax(0,1.1fr)_360px] lg:gap-12">
          <section className="max-w-2xl">
            <div className="eyebrow">Ultra Family Board Game</div>
            <h1 className="headline-glow mt-5 font-kid text-5xl font-black leading-none text-white md:text-7xl">
              奥特曼
            </h1>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-amber-300 md:text-5xl">
              亲子大富翁
            </h2>
            <p className="mt-5 max-w-xl text-base leading-7 text-slate-300 md:text-lg">
              把亲子复习做成一局冒险。掷骰、占地、答题、打 Boss，整局节奏清楚，孩子知道现在该做什么，大人也能一起参与。
            </p>

            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <button
                type="button"
                onClick={goToSetup}
                className="min-h-[72px] rounded-full bg-amber-400 px-10 py-4 text-2xl font-black text-slate-950 shadow-[0_20px_50px_-24px_rgba(251,191,36,0.85)] transition hover:-translate-y-0.5 hover:bg-amber-300"
              >
                ▶ 开始游戏
              </button>
              <button
                type="button"
                onClick={() => setActivePanel('review')}
                className="min-h-[72px] rounded-full border border-sky-400/30 bg-sky-400/12 px-10 py-4 text-2xl font-black text-white transition hover:-translate-y-0.5 hover:border-sky-300 hover:bg-sky-400/18"
              >
                📚 每日复习
              </button>
            </div>

            <div className="mt-8 flex flex-wrap gap-6 text-sm text-slate-300">
              <div>
                <div className="text-xl font-black text-white">20-45 分钟</div>
                <div className="mt-1">一局时间明确，适合放学后完成。</div>
              </div>
              <div>
                <div className="text-xl font-black text-white">2-5 人</div>
                <div className="mt-1">家长和孩子都能进入同一局面板。</div>
              </div>
              <div>
                <div className="text-xl font-black text-white">答题驱动</div>
                <div className="mt-1">学习、买地和打怪都围绕题目展开。</div>
              </div>
            </div>
          </section>

          <section className="panel-strong rounded-[2rem] p-6 md:p-7">
            <div className="eyebrow">Playable Heroes</div>
            <div className="mt-3 text-2xl font-black text-white">先选家人，再选英雄</div>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              让孩子成为这局的主角，大人作为协同玩家进入同一战场。
            </p>
            <div className="mt-6 grid grid-cols-2 gap-4">
              {HEROES.map((hero, index) => (
                <div
                  key={hero.id}
                  className={`panel-soft rounded-[1.5rem] p-4 transition ${
                    index === 0 ? 'translate-y-2' : index === 3 ? '-translate-y-2' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <HeroAvatar heroId={hero.id} size="md" />
                    <div className="min-w-0">
                      <div className="truncate text-lg font-black text-white">{hero.name}</div>
                      <div className="text-sm text-slate-400">{hero.tagline}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      <div className="relative mx-auto mt-4 grid max-w-6xl gap-3 md:grid-cols-2">
        <button
          type="button"
          onClick={() => setActivePanel('knowledge')}
          className="panel-soft rounded-[1.5rem] px-5 py-4 text-left transition hover:-translate-y-0.5 hover:border-slate-500/30"
        >
          <div className="eyebrow text-sky-200">Learning Hub</div>
          <div className="mt-2 text-xl font-black text-white">知识库中心</div>
          <div className="mt-1 text-sm text-slate-300">查看题库与学习记录，复习路径集中管理。</div>
        </button>
        <button
          type="button"
          onClick={() => setActivePanel('export')}
          className="panel-soft rounded-[1.5rem] px-5 py-4 text-left transition hover:-translate-y-0.5 hover:border-slate-500/30"
        >
          <div className="eyebrow">Export</div>
          <div className="mt-2 text-xl font-black text-white">导出中心</div>
          <div className="mt-1 text-sm text-slate-300">错题、答题日志与 JSON 导出入口都在这里。</div>
        </button>
      </div>
    </div>
  );
};
