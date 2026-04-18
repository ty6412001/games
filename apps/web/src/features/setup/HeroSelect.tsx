import { useMemo, useState } from 'react';
import type { DurationMinutes, HeroId } from '@ultraman/shared';

import { useGameStore, type SetupPlayer } from '../../stores/gameStore';
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

const makeDraftPlayer = (index: number): DraftPlayer => {
  const defaults: DraftPlayer[] = [
    { name: '爸爸', heroId: 'zero', isChild: false },
    { name: '妈妈', heroId: 'decker', isChild: false },
    { name: '小朋友', heroId: 'tiga', isChild: true },
    { name: '爷爷', heroId: 'belial', isChild: false },
    { name: '奶奶', heroId: 'zero', isChild: false },
  ];
  return defaults[index] ?? { name: `玩家${index + 1}`, heroId: 'tiga', isChild: false };
};

const computeBadges = (players: readonly DraftPlayer[]): number[] => {
  const counts = new Map<HeroId, number>();
  const badges: number[] = [];
  for (const p of players) {
    const next = (counts.get(p.heroId) ?? 0) + 1;
    counts.set(p.heroId, next);
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

  const updateDraft = (index: number, patch: Partial<DraftPlayer>) => {
    setDrafts((prev) => prev.map((d, i) => (i === index ? { ...d, ...patch } : d)));
  };

  const addPlayer = () => {
    if (drafts.length >= MAX_PLAYERS) return;
    setDrafts((prev) => [...prev, makeDraftPlayer(prev.length)]);
  };

  const removePlayer = (index: number) => {
    if (drafts.length <= MIN_PLAYERS) return;
    setDrafts((prev) => prev.filter((_, i) => i !== index));
  };

  const handleStart = () => {
    const players: SetupPlayer[] = drafts.map((d, i) => ({
      name: d.name.trim() || `玩家${i + 1}`,
      heroId: d.heroId,
      badge: (badges[i] === 2 ? 2 : 1) as 1 | 2,
      isChild: d.isChild,
    }));
    startGame({ duration, week: DEFAULT_WEEK, players });
  };

  return (
    <div className="min-h-screen bg-slate-950 px-8 py-10 text-slate-50">
      <div className="mx-auto max-w-5xl space-y-10">
        <header className="text-center">
          <h1 className="text-5xl font-black tracking-tight md:text-6xl">奥特曼亲子大富翁</h1>
          <p className="mt-3 text-lg text-slate-300">一起出发，打败本周 Boss！</p>
        </header>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold">⏱️ 时长</h2>
          <div className="flex flex-wrap gap-3">
            {DURATIONS.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDuration(d)}
                className={`min-h-[64px] min-w-[140px] rounded-2xl px-6 py-3 text-xl font-bold transition ${
                  duration === d
                    ? 'bg-amber-400 text-slate-900 shadow-lg'
                    : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                }`}
              >
                {d} 分钟
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">👥 玩家 ({drafts.length})</h2>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => removePlayer(drafts.length - 1)}
                disabled={drafts.length <= MIN_PLAYERS}
                className="rounded-xl bg-slate-800 px-4 py-2 text-base font-medium disabled:opacity-40"
              >
                -
              </button>
              <button
                type="button"
                onClick={addPlayer}
                disabled={drafts.length >= MAX_PLAYERS}
                className="rounded-xl bg-slate-800 px-4 py-2 text-base font-medium disabled:opacity-40"
              >
                +
              </button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {drafts.map((draft, idx) => (
              <div
                key={`${idx}-${draft.heroId}`}
                className="rounded-2xl border border-slate-700 bg-slate-900/60 p-4"
              >
                <div className="flex items-center gap-3">
                  <input
                    value={draft.name}
                    onChange={(e) => updateDraft(idx, { name: e.target.value })}
                    className="flex-1 rounded-lg bg-slate-800 px-3 py-2 text-lg"
                    maxLength={8}
                  />
                  <label className="flex items-center gap-2 text-sm text-slate-300">
                    <input
                      type="checkbox"
                      checked={draft.isChild}
                      onChange={(e) => updateDraft(idx, { isChild: e.target.checked })}
                      className="h-5 w-5"
                    />
                    孩子
                  </label>
                </div>
                <div className="mt-3 grid grid-cols-4 gap-2">
                  {HEROES.map((h) => (
                    <button
                      key={h.id}
                      type="button"
                      onClick={() => updateDraft(idx, { heroId: h.id })}
                      className={`flex min-h-[64px] flex-col items-center justify-center rounded-xl px-2 py-2 text-sm font-bold transition ${
                        draft.heroId === h.id
                          ? 'ring-4 ring-amber-400'
                          : 'ring-1 ring-slate-700 hover:ring-slate-500'
                      }`}
                      style={{ backgroundColor: h.color, color: h.accent }}
                    >
                      <span>{h.name}</span>
                      {badges[idx] === 2 && draft.heroId === h.id ? (
                        <span className="mt-1 rounded-full bg-white/20 px-2 text-xs">#2</span>
                      ) : null}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="flex justify-center pt-4">
          <button
            type="button"
            onClick={handleStart}
            className="min-h-[72px] rounded-2xl bg-amber-400 px-12 py-4 text-2xl font-black text-slate-900 shadow-xl transition hover:bg-amber-300"
          >
            ⚡ 开始游戏
          </button>
        </div>
      </div>
    </div>
  );
};
