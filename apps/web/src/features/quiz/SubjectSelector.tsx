import type { Subject } from '@ultraman/shared';

import { useGameStore } from '../../stores/gameStore';

type SubjectOption = {
  id: Subject;
  label: string;
  icon: string;
  bg: string;
  hoverBg: string;
};

const SUBJECTS: readonly SubjectOption[] = [
  { id: 'chinese', label: '语文', icon: '📝', bg: 'bg-rose-500', hoverBg: 'hover:bg-rose-400' },
  { id: 'math', label: '数学', icon: '🔢', bg: 'bg-blue-500', hoverBg: 'hover:bg-blue-400' },
  { id: 'english', label: '英语', icon: '🔤', bg: 'bg-emerald-500', hoverBg: 'hover:bg-emerald-400' },
];

const contextTitle: Record<string, string> = {
  study: '📚 学习格：先选学科再答题',
  monster: '⚔️ 怪兽挑战：选一门学科出招',
  'property-buy': '🏙️ 买地前答题：选一门学科',
  'boss-attack': '💥 Boss 攻击：选学科发射武器',
};

export const SubjectSelector = () => {
  const pending = useGameStore((s) => s.pendingQuiz);
  const pack = useGameStore((s) => s.currentPack);
  const game = useGameStore((s) => s.game);
  const select = useGameStore((s) => s.selectSubject);
  const cancel = useGameStore((s) => s.cancelPendingQuiz);
  if (!pending || !pack || !game) return null;

  const canCancel = pending.context.kind === 'study' || pending.context.kind === 'monster';
  const answerer = game.players.find((p) => p.id === pending.playerId);
  const availCount = (subj: Subject): number =>
    pack.questions.filter((q) => q.subject === subj).length;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-sm">
      <div className="w-full max-w-3xl rounded-3xl bg-slate-900 p-6 shadow-2xl ring-2 ring-amber-400/40">
        <header className="text-center">
          <h2 className="text-2xl font-black md:text-3xl">
            {contextTitle[pending.context.kind] ?? '选择学科'}
          </h2>
          {answerer ? (
            <p className="mt-1 text-sm text-slate-400">答题人：{answerer.name}</p>
          ) : null}
        </header>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {SUBJECTS.map((s) => {
            const count = availCount(s.id);
            const disabled = count === 0;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => select(s.id)}
                disabled={disabled}
                className={`flex min-h-[140px] flex-col items-center justify-center rounded-2xl px-4 py-6 text-white shadow-xl transition disabled:cursor-not-allowed disabled:opacity-30 ${s.bg} ${s.hoverBg}`}
              >
                <span className="text-6xl leading-none">{s.icon}</span>
                <span className="mt-3 text-2xl font-black">{s.label}</span>
                <span className="mt-1 text-xs opacity-85">
                  {disabled ? '本轮无题' : `共 ${count} 题`}
                </span>
              </button>
            );
          })}
        </div>

        {canCancel ? (
          <button
            type="button"
            onClick={cancel}
            className="mt-5 w-full rounded-xl bg-slate-700 py-2 text-sm text-slate-300 hover:bg-slate-600"
          >
            跳过本题（放弃加成）
          </button>
        ) : (
          <p className="mt-5 text-center text-xs text-slate-500">买地和 Boss 攻击无法跳过答题</p>
        )}
      </div>
    </div>
  );
};
