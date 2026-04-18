import { useEffect, useState } from 'react';
import type { Question } from '@ultraman/shared';

import { useGameStore } from '../../stores/gameStore';
import { CountdownBar } from './CountdownBar';

const subjectBadge: Record<string, { label: string; color: string }> = {
  math: { label: '数学', color: 'bg-blue-600' },
  chinese: { label: '语文', color: 'bg-rose-600' },
  english: { label: '英语', color: 'bg-green-600' },
};

const contextLabel = (kind: string): string => {
  switch (kind) {
    case 'study':
      return '📚 学习格：答对有奖金';
    case 'monster':
      return '⚔️ 打怪兽：答对击败它';
    case 'property-buy':
      return '🏙️ 要买这块地，先答对';
    default:
      return '答题时间';
  }
};

const DifficultyStars = ({ n }: { n: number }) => (
  <span aria-label={`难度${n}`}>{'★'.repeat(n)}</span>
);

export const QuizModal = () => {
  const quiz = useGameStore((s) => s.activeQuiz);
  const nowMs = useGameStore((s) => s.nowMs);
  const submit = useGameStore((s) => s.submitAnswer);
  const useHelp = useGameStore((s) => s.useHelpCard);
  const game = useGameStore((s) => s.game);

  if (!quiz || !game) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-3xl bg-slate-900 p-6 shadow-2xl ring-2 ring-amber-500/50">
        <header className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span
              className={`rounded-full px-3 py-1 text-sm font-bold text-white ${subjectBadge[quiz.question.subject]?.color ?? 'bg-slate-600'}`}
            >
              {subjectBadge[quiz.question.subject]?.label ?? quiz.question.subject}
            </span>
            <span className="text-amber-300">
              <DifficultyStars n={quiz.question.difficulty} />
            </span>
            <span className="text-sm text-slate-400">{quiz.question.topic}</span>
          </div>
          <span className="text-xs text-slate-400">{contextLabel(quiz.context.kind)}</span>
        </header>

        <div className="mt-3">
          <CountdownBar
            startedAt={quiz.startedAt}
            deadlineAt={quiz.deadlineAt}
            nowMs={nowMs}
            difficulty={quiz.question.difficulty}
          />
        </div>

        <div className="mt-5 min-h-[80px] rounded-2xl bg-slate-800/60 p-4 text-xl leading-relaxed">
          {quiz.question.stemImage ? (
            <img
              src={quiz.question.stemImage}
              alt="题目插图"
              className="mb-3 max-h-40 rounded-lg"
            />
          ) : null}
          <div>{quiz.question.stem}</div>
        </div>

        <div className="mt-6">
          <AnswerArea question={quiz.question} onSubmit={submit} />
        </div>

        <footer className="mt-5 flex items-center justify-between text-sm text-slate-400">
          <span>
            求助卡：{findHelpCards(game.players, quiz.playerId)} · 答错会进错题本
          </span>
          <button
            type="button"
            onClick={useHelp}
            disabled={quiz.usedHelp || findHelpCards(game.players, quiz.playerId) <= 0}
            className="rounded-xl bg-sky-700 px-3 py-2 font-bold disabled:opacity-40"
          >
            🆘 用求助卡
          </button>
        </footer>
      </div>
    </div>
  );
};

const findHelpCards = (players: readonly { id: string; helpCards: number }[], id: string): number =>
  players.find((p) => p.id === id)?.helpCards ?? 0;

const AnswerArea = ({
  question,
  onSubmit,
}: {
  question: Question;
  onSubmit: (answer: string) => void | Promise<void>;
}) => {
  switch (question.type) {
    case 'choice':
    case 'image-choice':
      return <ChoiceArea options={question.options} onSubmit={onSubmit} />;
    case 'input':
      return <InputArea onSubmit={onSubmit} />;
    case 'ordering':
      return <OrderingArea items={question.items} onSubmit={onSubmit} />;
  }
};

const ChoiceArea = ({
  options,
  onSubmit,
}: {
  options: readonly string[];
  onSubmit: (answer: string) => void | Promise<void>;
}) => (
  <div className="grid gap-3 md:grid-cols-2">
    {options.map((opt) => (
      <button
        key={opt}
        type="button"
        onClick={() => {
          void onSubmit(opt);
        }}
        className="min-h-[64px] rounded-2xl bg-slate-700 px-4 py-3 text-left text-xl font-bold transition hover:bg-amber-500 hover:text-slate-900"
      >
        {opt}
      </button>
    ))}
  </div>
);

const InputArea = ({
  onSubmit,
}: {
  onSubmit: (answer: string) => void | Promise<void>;
}) => {
  const [value, setValue] = useState('');
  return (
    <form
      className="flex gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (!value.trim()) return;
        void onSubmit(value);
      }}
    >
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        autoFocus
        className="flex-1 rounded-2xl bg-slate-800 px-4 py-3 text-2xl font-bold"
        placeholder="输入答案"
        inputMode="text"
      />
      <button
        type="submit"
        className="min-h-[64px] rounded-2xl bg-amber-400 px-6 text-xl font-black text-slate-900"
      >
        确认
      </button>
    </form>
  );
};

const OrderingArea = ({
  items,
  onSubmit,
}: {
  items: readonly string[];
  onSubmit: (answer: string) => void | Promise<void>;
}) => {
  const [order, setOrder] = useState<number[]>([]);
  useEffect(() => setOrder([]), [items]);

  const pick = (idx: number) => {
    if (order.includes(idx)) {
      setOrder(order.filter((o) => o !== idx));
      return;
    }
    setOrder([...order, idx]);
  };

  const reset = () => setOrder([]);
  const ready = order.length === items.length;

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-400">按顺序点击下方选项</p>
      <div className="flex flex-wrap gap-2">
        {items.map((item, idx) => {
          const sel = order.indexOf(idx);
          return (
            <button
              key={`${item}-${idx}`}
              type="button"
              onClick={() => pick(idx)}
              className={`min-h-[56px] min-w-[64px] rounded-2xl px-4 py-2 text-xl font-black transition ${
                sel >= 0 ? 'bg-amber-400 text-slate-900' : 'bg-slate-700'
              }`}
            >
              {sel >= 0 ? `${sel + 1}.${item}` : item}
            </button>
          );
        })}
      </div>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-xl bg-slate-700 px-4 py-2 text-sm"
        >
          清空
        </button>
        <button
          type="button"
          disabled={!ready}
          onClick={() => onSubmit(order.join(','))}
          className="flex-1 rounded-2xl bg-amber-400 px-6 py-3 text-xl font-black text-slate-900 disabled:opacity-40"
        >
          提交
        </button>
      </div>
    </div>
  );
};
