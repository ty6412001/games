import { useMemo, useState } from 'react';
import type { DurationMinutes, HeroId } from '@ultraman/shared';

import { useGameStore, type SetupPlayer } from '../../stores/gameStore';
import { HeroAvatar } from '../../theme/ultraman/HeroAvatar';
import { HEROES } from '../../theme/ultraman/heroes';

const DURATIONS: DurationMinutes[] = [20, 30, 45];
const MIN_PLAYERS = 2;
const MAX_PLAYERS = 5;
const DEFAULT_WEEK = 1;

type DraftPlayer = {
  name: string;
  heroId: HeroId;
  isChild: boolean;
};

const DEFAULT_PLAYERS: DraftPlayer[] = [
  { name: '爸爸', heroId: 'zero', isChild: false },
  { name: '妈妈', heroId: 'decker', isChild: false },
  { name: '小朋友', heroId: 'tiga', isChild: true },
  { name: '爷爷', heroId: 'belial', isChild: false },
  { name: '奶奶', heroId: 'zero', isChild: false },
];

const makeDraftPlayer = (index: number): DraftPlayer => {
  const preset = DEFAULT_PLAYERS[index];
  return preset ? { ...preset } : { name: `玩家${index + 1}`, heroId: 'tiga', isChild: false };
};

const computeBadges = (players: readonly DraftPlayer[]): number[] => {
  const counts = new Map<HeroId, number>();
  const badges: number[] = [];
  for (const player of players) {
    const next = (counts.get(player.heroId) ?? 0) + 1;
    counts.set(player.heroId, next);
    badges.push(next);
  }
  return badges;
};

export const HeroSelect = () => {
  const startGame = useGameStore((s) => s.startGame);
  const [duration, setDuration] = useState<DurationMinutes>(30);
  const [drafts, setDrafts] = useState<DraftPlayer[]>(() => [
    makeDraftPlayer(0),
    makeDraftPlayer(1),
    makeDraftPlayer(2),
  ]);

  const badges = useMemo(() => computeBadges(drafts), [drafts]);
  const childCount = useMemo(() => drafts.filter((d) => d.isChild).length, [drafts]);
  const needsChildSelection = childCount !== 1;
  const playerGridClass = drafts.length >= 4 ? 'grid-cols-2 md:grid-cols-3' : 'grid-cols-2';

  const updateDraft = (index: number, patch: Partial<DraftPlayer>) => {
    setDrafts((prev) => prev.map((draft, i) => (i === index ? { ...draft, ...patch } : draft)));
  };

  const selectChild = (index: number) => {
    setDrafts((prev) => prev.map((draft, i) => ({ ...draft, isChild: i === index })));
  };

  const addPlayer = () => {
    if (drafts.length >= MAX_PLAYERS) return;
    setDrafts((prev) => [...prev, makeDraftPlayer(prev.length)]);
  };

  const removePlayer = () => {
    if (drafts.length <= MIN_PLAYERS) return;
    setDrafts((prev) => prev.slice(0, -1));
  };

  const handleStart = () => {
    if (needsChildSelection) return;
    const players: SetupPlayer[] = drafts.map((d, i) => ({
      name: d.name.trim() || `玩家${i + 1}`,
      heroId: d.heroId,
      badge: (badges[i] === 2 ? 2 : 1) as 1 | 2,
      isChild: d.isChild,
    }));
    void startGame({ duration, week: DEFAULT_WEEK, players });
  };

  return (
    <div className="h-[100svh] overflow-hidden bg-slate-950 px-4 py-4 text-slate-50 md:px-6 md:py-5">
      <div className="mx-auto grid h-full max-w-[1180px] grid-rows-[auto_1fr_auto] gap-4">
        <header className="space-y-1 text-center">
          <h1 className="text-4xl font-black tracking-tight md:text-5xl">奥特曼亲子大富翁</h1>
          <p className="text-sm text-slate-300 md:text-base">选好家人和英雄，一屏内直接开局</p>
        </header>

        <section className="grid min-h-0 grid-rows-[auto_1fr] gap-4 overflow-hidden">
          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-bold">⏱️ 对局时长</h2>
                <span
                  className={`text-sm font-medium ${
                    needsChildSelection ? 'text-amber-200' : 'text-slate-400'
                  }`}
                >
                  {needsChildSelection
                    ? `需选择 1 位小朋友（当前 ${childCount} 位）`
                    : '已选择 1 位小朋友'}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {DURATIONS.map((value) => {
                  const selected = duration === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setDuration(value)}
                      className={`min-h-[56px] rounded-2xl border px-4 text-lg font-black transition ${
                        selected
                          ? 'border-amber-300 bg-amber-400 text-slate-950 ring-4 ring-amber-400'
                          : 'border-slate-700 bg-slate-900/70 text-slate-100 hover:border-slate-500'
                      }`}
                    >
                      {value} 分钟
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-between rounded-3xl border border-slate-800 bg-slate-900/70 px-3 py-3 md:min-w-[220px] md:justify-end md:gap-4">
              <div className="md:text-right">
                <p className="text-lg font-bold">玩家 {drafts.length}</p>
                <p className="text-xs text-slate-400">
                  支持 {MIN_PLAYERS}-{MAX_PLAYERS} 人
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={removePlayer}
                  disabled={drafts.length <= MIN_PLAYERS}
                  className="min-h-[56px] min-w-[56px] rounded-2xl border border-slate-700 bg-slate-800 text-2xl font-bold transition hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  −
                </button>
                <button
                  type="button"
                  onClick={addPlayer}
                  disabled={drafts.length >= MAX_PLAYERS}
                  className="min-h-[56px] min-w-[56px] rounded-2xl border border-slate-700 bg-slate-800 text-2xl font-bold transition hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          <div className={`grid min-h-0 auto-rows-fr content-start gap-3 ${playerGridClass}`}>
            {drafts.map((draft, index) => {
              const childLabel = draft.name.trim() || `玩家${index + 1}`;
              return (
                <article
                  key={index}
                  className="flex min-h-0 max-h-[170px] flex-col overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/70 p-3"
                >
                  <div className="flex items-center gap-2">
                    <input
                      value={draft.name}
                      onChange={(event) => updateDraft(index, { name: event.target.value })}
                      maxLength={8}
                      className="h-12 min-w-0 flex-1 rounded-2xl border border-slate-700 bg-slate-800/90 px-3 text-base font-semibold text-slate-50 outline-none transition placeholder:text-slate-500 focus:border-amber-300 focus:ring-4 focus:ring-amber-400/40"
                      placeholder={`玩家${index + 1}`}
                    />
                    <button
                      type="button"
                      onClick={() => selectChild(index)}
                      aria-pressed={draft.isChild}
                      aria-label={`将 ${childLabel} 设为小朋友`}
                      className={`flex h-12 min-w-[48px] items-center justify-center rounded-2xl border text-xl transition ${
                        draft.isChild
                          ? 'border-amber-300 bg-amber-400 text-slate-950 ring-4 ring-amber-400'
                          : 'border-slate-700 bg-slate-800 text-slate-300 hover:border-slate-500 hover:text-white'
                      }`}
                    >
                      ⭐
                    </button>
                  </div>

                  <div className="mt-3 grid flex-1 grid-cols-4 gap-2">
                    {HEROES.map((hero) => {
                      const selected = draft.heroId === hero.id;
                      return (
                        <button
                          key={hero.id}
                          type="button"
                          onClick={() => updateDraft(index, { heroId: hero.id })}
                          aria-label={`选择 ${hero.name}`}
                          title={hero.name}
                          className={`relative flex flex-col items-center justify-center rounded-2xl border px-1 py-1 text-[11px] font-bold leading-tight transition ${
                            selected
                              ? 'border-amber-300 bg-slate-800 text-white ring-4 ring-amber-400'
                              : 'border-slate-700 bg-slate-950/50 text-slate-300 hover:border-slate-500 hover:text-white'
                          }`}
                        >
                          <HeroAvatar heroId={hero.id} size="sm" />
                          <span className="mt-1 truncate">{hero.name}</span>
                          {selected && badges[index] === 2 ? (
                            <span className="absolute right-1 top-1 rounded-full bg-amber-400 px-1.5 text-[10px] font-black text-slate-950">
                              #2
                            </span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <div className="flex items-center justify-between gap-4 rounded-3xl border border-slate-800 bg-slate-900/70 px-4 py-3">
          <p className={`text-sm ${needsChildSelection ? 'text-amber-200' : 'text-slate-400'}`}>
            {needsChildSelection ? '请选择且仅选择 1 位小朋友后开始游戏' : '阵容已就绪，立即进入第 1 周'}
          </p>
          <button
            type="button"
            onClick={handleStart}
            disabled={needsChildSelection}
            className="min-h-[64px] rounded-2xl bg-amber-400 px-8 text-xl font-black text-slate-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
          >
            ⚡ 开始游戏
          </button>
        </div>
      </div>
    </div>
  );
};
