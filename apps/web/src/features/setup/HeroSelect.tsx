import { useMemo, useState } from 'react';
import type { DurationMinutes, HeroId } from '@ultraman/shared';

import packIndex from '../../../public/question-packs/index.json';
import { useGameStore, type SetupPlayer } from '../../stores/gameStore';
import { HeroAvatar } from '../../theme/ultraman/HeroAvatar';
import { HEROES } from '../../theme/ultraman/heroes';

const DURATIONS: DurationMinutes[] = [20, 30, 45];
const WEEK_OPTIONS = [...packIndex.packs].sort((a, b) => a.week - b.week);
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
  { name: '妈妈', heroId: 'tiga', isChild: false },
  { name: '小朋友', heroId: 'decker', isChild: true },
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
  const [week, setWeek] = useState<number>(DEFAULT_WEEK);
  const [drafts, setDrafts] = useState<DraftPlayer[]>(() => [
    makeDraftPlayer(0),
    makeDraftPlayer(1),
    makeDraftPlayer(2),
  ]);

  const selectedWeekMeta = useMemo(
    () => WEEK_OPTIONS.find((pack) => pack.week === week) ?? null,
    [week],
  );

  const badges = useMemo(() => computeBadges(drafts), [drafts]);
  const childCount = useMemo(() => drafts.filter((d) => d.isChild).length, [drafts]);
  const needsChildSelection = childCount !== 1;
  const selectedChild = drafts.find((draft) => draft.isChild) ?? null;

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
    void startGame({ duration, week, players });
  };

  return (
    <div className="relative min-h-[100svh] overflow-hidden px-4 py-5 text-slate-50 md:px-6 md:py-6">
      <div className="pointer-events-none absolute inset-0 opacity-90">
        <div className="absolute left-[-8%] top-[-10%] h-80 w-80 rounded-full bg-sky-500/14 blur-3xl" />
        <div className="absolute bottom-[-12%] right-[-4%] h-[26rem] w-[26rem] rounded-full bg-amber-400/12 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl">
        <header className="max-w-2xl">
          <div className="eyebrow">Game Setup</div>
          <h1 className="mt-3 text-4xl font-black tracking-tight text-white md:text-5xl">
            先定好这局节奏，再安排每位家人
          </h1>
          <p className="mt-3 text-base leading-7 text-slate-300">
            左边决定时长、周目和开始条件，右边处理玩家阵容。界面只保留这局真正需要做的动作。
          </p>
        </header>

        <div className="mt-8 grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="flex h-fit flex-col gap-4 xl:sticky xl:top-5">
            <section className="panel-strong rounded-[2rem] p-5">
              <div className="eyebrow">This Round</div>
              <div className="mt-3 text-2xl font-black text-white">
                {duration} 分钟 · 第 {week} 周
              </div>
              <div className="mt-2 text-sm leading-6 text-slate-300">
                {selectedWeekMeta?.title ?? '按题库进度开始'} · {drafts.length} 位玩家
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-white/5 px-4 py-3">
                  <div className="text-xs uppercase tracking-[0.22em] text-slate-500">孩子主角</div>
                  <div className="mt-1 text-base font-black text-white">
                    {selectedChild ? selectedChild.name : '未选择'}
                  </div>
                </div>
                <div className="rounded-2xl bg-white/5 px-4 py-3">
                  <div className="text-xs uppercase tracking-[0.22em] text-slate-500">阵容状态</div>
                  <div
                    className={`mt-1 text-base font-black ${
                      needsChildSelection ? 'text-amber-300' : 'text-emerald-300'
                    }`}
                  >
                    {needsChildSelection ? `待确认 (${childCount})` : '已就绪'}
                  </div>
                </div>
              </div>
              <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm leading-6 text-slate-300">
                {needsChildSelection
                  ? '请选择且仅选择 1 位小朋友作为本局主角，开始按钮就会解锁。'
                  : `阵容已就绪，立即进入第 ${week} 周${selectedWeekMeta ? `（${selectedWeekMeta.title}）` : ''}。`}
              </div>
              <button
                type="button"
                onClick={handleStart}
                disabled={needsChildSelection}
                className="mt-5 min-h-[64px] w-full rounded-full bg-amber-400 px-8 text-xl font-black text-slate-950 transition hover:-translate-y-0.5 hover:bg-amber-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
              >
                ⚡ 开始游戏
              </button>
            </section>

            <section className="panel-soft rounded-[1.75rem] p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="eyebrow">Duration</div>
                  <h2 className="mt-2 text-xl font-black text-white">对局时长</h2>
                </div>
                <div className="text-right text-sm text-slate-400">控制一局体感和节奏</div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3">
                {DURATIONS.map((value) => {
                  const selected = duration === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setDuration(value)}
                      className={`min-h-[56px] rounded-2xl border px-3 text-lg font-black transition ${
                        selected
                          ? 'border-amber-300 bg-amber-400 text-slate-950 shadow-[0_18px_44px_-22px_rgba(251,191,36,0.8)]'
                          : 'border-slate-700 bg-slate-900/70 text-slate-100 hover:border-slate-500'
                      }`}
                    >
                      {value} 分钟
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="panel-soft rounded-[1.75rem] p-5">
              <div className="eyebrow">Question Pack</div>
              <h2 className="mt-2 text-xl font-black text-white">选择周目</h2>
              <div className="mt-4 grid grid-cols-2 gap-3">
                {WEEK_OPTIONS.map((pack) => {
                  const selected = week === pack.week;
                  return (
                    <button
                      key={pack.week}
                      type="button"
                      onClick={() => setWeek(pack.week)}
                      aria-pressed={selected}
                      className={`min-h-[56px] rounded-2xl border px-3 text-base font-black transition ${
                        selected
                          ? 'border-sky-300 bg-sky-400/18 text-white shadow-[0_16px_34px_-24px_rgba(56,189,248,0.9)]'
                          : 'border-slate-700 bg-slate-950/50 text-slate-100 hover:border-slate-500'
                      }`}
                    >
                      第{pack.week}周
                    </button>
                  );
                })}
              </div>
              {selectedWeekMeta?.textbookHint ? (
                <div className="mt-4 rounded-2xl border border-sky-400/25 bg-sky-500/10 px-4 py-3 text-sm leading-6 text-sky-100">
                  <div className="font-bold text-sky-200">教材进度提示</div>
                  <div className="mt-1">{selectedWeekMeta.textbookHint}</div>
                </div>
              ) : null}
            </section>
          </aside>

          <section className="space-y-4">
            <div className="panel-soft rounded-[1.75rem] p-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                  <div className="eyebrow">Roster</div>
                  <h2 className="mt-2 text-2xl font-black text-white">玩家阵容</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    每张卡只做两件事：给这位家人命名，并给他分配一个奥特英雄。
                  </p>
                </div>
                <div className="flex items-center justify-between rounded-[1.5rem] border border-white/10 bg-white/5 px-4 py-3 md:min-w-[240px] md:gap-4">
                  <div>
                    <div className="text-lg font-black text-white">玩家 {drafts.length}</div>
                    <div className="text-xs text-slate-400">
                      支持 {MIN_PLAYERS}-{MAX_PLAYERS} 人
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={removePlayer}
                      disabled={drafts.length <= MIN_PLAYERS}
                      className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-700 bg-slate-800 text-2xl font-bold transition hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      −
                    </button>
                    <button
                      type="button"
                      onClick={addPlayer}
                      disabled={drafts.length >= MAX_PLAYERS}
                      className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-700 bg-slate-800 text-2xl font-bold transition hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
              {drafts.map((draft, index) => {
                const childLabel = draft.name.trim() || `玩家${index + 1}`;
                return (
                  <article key={index} className="panel-soft rounded-[1.75rem] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm uppercase tracking-[0.24em] text-slate-500">
                          Player {index + 1}
                        </div>
                        <input
                          value={draft.name}
                          onChange={(event) => updateDraft(index, { name: event.target.value })}
                          maxLength={8}
                          className="mt-3 h-12 w-full min-w-0 rounded-2xl border border-slate-700 bg-slate-800/90 px-4 text-lg font-bold text-slate-50 outline-none transition placeholder:text-slate-500 focus:border-amber-300 focus:ring-4 focus:ring-amber-400/30"
                          placeholder={`玩家${index + 1}`}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => selectChild(index)}
                        aria-pressed={draft.isChild}
                        aria-label={`将 ${childLabel} 设为小朋友`}
                        className={`rounded-full px-4 py-2 text-sm font-black transition ${
                          draft.isChild
                            ? 'bg-amber-400 text-slate-950 shadow-[0_18px_42px_-24px_rgba(251,191,36,0.9)]'
                            : 'border border-slate-700 bg-slate-800 text-slate-300 hover:border-slate-500 hover:text-white'
                        }`}
                      >
                        {draft.isChild ? '⭐ 小朋友' : '设为小朋友'}
                      </button>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3">
                      {HEROES.map((hero) => {
                        const selected = draft.heroId === hero.id;
                        return (
                          <button
                            key={hero.id}
                            type="button"
                            onClick={() => updateDraft(index, { heroId: hero.id })}
                            aria-label={`选择 ${hero.name}`}
                            title={hero.name}
                            className={`relative rounded-[1.4rem] border p-3 text-left transition ${
                              selected
                                ? 'border-amber-300 bg-white/8 shadow-[0_18px_40px_-26px_rgba(251,191,36,0.88)]'
                                : 'border-slate-700 bg-slate-950/40 hover:border-slate-500'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <HeroAvatar heroId={hero.id} size="sm" />
                              <div className="min-w-0">
                                <div className="truncate text-base font-black text-white">{hero.name}</div>
                                <div className="text-xs text-slate-400">{hero.tagline}</div>
                              </div>
                            </div>
                            {selected && badges[index] === 2 ? (
                              <span className="absolute right-2 top-2 rounded-full bg-amber-400 px-1.5 text-[10px] font-black text-slate-950">
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
        </div>
      </div>
    </div>
  );
};
