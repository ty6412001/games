import type { Subject } from '@ultraman/shared';

import { useGameStore } from '../../stores/gameStore';

type SubjectOption = {
  id: Subject;
  label: string;
  icon: string;
  bg: string;
  hoverBg: string;
  adultOnly?: boolean;
};

const SUBJECTS: readonly SubjectOption[] = [
  { id: 'chinese', label: '语文', icon: '📝', bg: 'bg-rose-500', hoverBg: 'hover:bg-rose-400' },
  { id: 'math', label: '数学', icon: '🔢', bg: 'bg-blue-500', hoverBg: 'hover:bg-blue-400' },
  { id: 'english', label: '英语', icon: '🔤', bg: 'bg-emerald-500', hoverBg: 'hover:bg-emerald-400' },
  {
    id: 'brain',
    label: '挑战题',
    icon: '🧠',
    bg: 'bg-amber-600',
    hoverBg: 'hover:bg-amber-500',
    adultOnly: true,
  },
];

const CORE_SUBJECTS: readonly Subject[] = ['chinese', 'math', 'english'];

const contextTitle: Record<string, string> = {
  study: '📚 学习星：先选学科再答题',
  monster: '⚔️ 怪兽挡路：选一门学科出招',
  'property-buy': '🏙️ 买下这块地前答题：选一门学科',
  'boss-attack': '💥 打 Boss：选学科发射武器',
};

export const SubjectSelector = () => {
  const pending = useGameStore((s) => s.pendingQuiz);
  const pack = useGameStore((s) => s.currentPack);
  const brainQuestionCount = useGameStore((s) => s.brainQuestionCount);
  const correctQuestionIds = useGameStore((s) => s.correctQuestionIds);
  const lastChildSubject = useGameStore((s) => s.lastChildSubject);
  const game = useGameStore((s) => s.game);
  const childId = useGameStore((s) => s.childId);
  const select = useGameStore((s) => s.selectSubject);
  const cancel = useGameStore((s) => s.cancelPendingQuiz);
  if (!pending || !pack || !game) return null;

  const canCancel = pending.context.kind === 'study' || pending.context.kind === 'monster';
  const answerer = game.players.find((p) => p.id === pending.playerId);
  const isChildAnswering = childId !== null && pending.playerId === childId;
  const availCount = (subj: Subject): number => {
    if (subj === 'brain') return Math.max(0, brainQuestionCount - correctQuestionIds.brain.size);
    const answered = correctQuestionIds[subj];
    return pack.questions.filter((q) => q.subject === subj && !answered.has(q.id)).length;
  };
  const enforceRotation = isChildAnswering && pending.context.kind !== 'boss-attack';
  const otherCoreEligibleCount = CORE_SUBJECTS.filter(
    (s) => s !== lastChildSubject && availCount(s) > 0,
  ).length;
  const showRotationFallback =
    enforceRotation && lastChildSubject !== null && otherCoreEligibleCount === 0;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/85 p-4 text-slate-50 backdrop-blur-sm">
      <div className="w-full max-w-3xl rounded-3xl bg-slate-900 p-6 shadow-2xl ring-2 ring-amber-400/40">
        <header className="text-center">
          <h2 className="text-2xl font-black md:text-3xl">
            {contextTitle[pending.context.kind] ?? '选择学科'}
          </h2>
          {answerer ? (
            <p className="mt-1 text-sm text-slate-400">答题人：{answerer.name}</p>
          ) : null}
        </header>
        {showRotationFallback ? (
          <p className="mt-3 rounded-xl bg-amber-900/40 px-3 py-2 text-center text-sm text-amber-100">
            其他学科没题了，这次可以连选同一门
          </p>
        ) : null}

        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {SUBJECTS.map((s) => {
            const count = availCount(s.id);
            const adultGated = s.adultOnly === true && isChildAnswering;
            const rotationGated =
              enforceRotation &&
              lastChildSubject !== null &&
              s.id === lastChildSubject &&
              otherCoreEligibleCount > 0;
            const disabled = count === 0 || adultGated || rotationGated;
            const answeredSome = correctQuestionIds[s.id].size > 0;
            const hint = rotationGated
              ? '上一题选过，先换一门'
              : count === 0 && !adultGated
                ? answeredSome
                  ? '🎉 已答对全部题目'
                  : '本轮无题'
                : `共 ${count} 题`;
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
                <span className="mt-1 text-xs opacity-85">{hint}</span>
                {s.adultOnly ? (
                  <span className="mt-2 rounded-full bg-slate-900/60 px-2 py-0.5 text-[10px] font-bold text-amber-200">
                    仅限大人
                  </span>
                ) : null}
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
