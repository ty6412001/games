import { useEffect, useState } from 'react';
import type { Question } from '@ultraman/shared';

import { DigitKeypad } from '../../components/input/DigitKeypad';
import { features } from '../../config/features';
import { useGameStore } from '../../stores/gameStore';
import { BATTLE_CONTRAST } from '../../theme/contrast';
import { CountdownBar } from './CountdownBar';

const subjectBadge: Record<string, { label: string; color: string }> = {
  math: { label: '数学', color: 'bg-blue-600' },
  chinese: { label: '语文', color: 'bg-rose-600' },
  english: { label: '英语', color: 'bg-green-600' },
  brain: { label: '挑战题', color: 'bg-amber-600' },
};

const contextLabel = (kind: string): string => {
  switch (kind) {
    case 'study':
      return '📚 学习星：答对有金币';
    case 'monster':
      return '⚔️ 打怪兽：答对击败它';
    case 'property-buy':
      return '🏙️ 要买下这块地，先答对';
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
  const childId = useGameStore((s) => s.childId);

  if (!quiz || !game) return null;
  const isChildAnswering = quiz.playerId === childId;
  const answerer = game.players.find((p) => p.id === quiz.playerId);
  const stemImageSrc = quiz.question.stemImage?.startsWith('/assets/quiz/')
    ? quiz.question.stemImage
    : undefined;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/80 p-4 text-slate-50 backdrop-blur-sm">
      <div className="max-h-[100svh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-slate-900 p-5 shadow-2xl ring-2 ring-amber-500/50">
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
          <div className="text-right text-xs text-slate-400">
            <div>{contextLabel(quiz.context.kind)}</div>
            {answerer ? <div className="mt-0.5 text-slate-500">答题人：{answerer.name}</div> : null}
          </div>
        </header>

        {features.quizTimer ? (
          <div className="mt-3">
            <CountdownBar
              startedAt={quiz.startedAt}
              deadlineAt={quiz.deadlineAt}
              nowMs={nowMs}
              difficulty={quiz.question.difficulty}
            />
          </div>
        ) : null}

        <div className="mt-4 min-h-[80px] rounded-2xl bg-slate-800/60 p-4 text-xl leading-relaxed">
          {stemImageSrc ? (
            <img
              src={stemImageSrc}
              alt="题目插图"
              className="mb-3 max-h-40 rounded-lg"
            />
          ) : null}
          <div>{quiz.question.stem}</div>
        </div>

        <div className="mt-5">
          <AnswerArea question={quiz.question} onSubmit={submit} />
        </div>

        <footer className="mt-4 flex items-center justify-between text-sm text-slate-400">
          <span>
            求助卡：{findHelpCards(game.players, quiz.playerId)} ·{' '}
            {isChildAnswering ? '答错进错题本' : '大人答错不记错题本'}
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
    case 'true-false':
      return (
        <ChoiceArea
          options={[question.trueLabel ?? '对', question.falseLabel ?? '错']}
          onSubmit={(answer) => onSubmit(answer === (question.trueLabel ?? '对') ? 'true' : 'false')}
        />
      );
    case 'input': {
      const canUseDigitKeypad = /^\d+$/.test(question.answer.trim());
      return canUseDigitKeypad ? (
        <DigitKeypad onSubmit={onSubmit} />
      ) : (
        <InputArea onSubmit={onSubmit} />
      );
    }
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
        className={`min-h-[64px] rounded-2xl ${BATTLE_CONTRAST.secondaryAction.bgClass} ${BATTLE_CONTRAST.secondaryAction.textClass} px-4 py-3 text-left text-xl font-bold transition hover:bg-amber-300 hover:text-slate-950`}
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
        className={`min-h-[64px] rounded-2xl ${BATTLE_CONTRAST.primaryAction.bgClass} ${BATTLE_CONTRAST.primaryAction.textClass} px-6 text-xl font-black`}
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
      <p className="text-sm text-slate-400">按顺序点击下方选项，点角标可以反选</p>
      <div className="grid grid-cols-2 gap-3">
        {items.map((item, idx) => {
          const sel = order.indexOf(idx);
          const selected = sel >= 0;
          return (
            <button
              key={`${item}-${idx}`}
              type="button"
              onClick={() => pick(idx)}
              aria-label={selected ? `取消 ${item}（当前第 ${sel + 1} 位）` : `选择 ${item}`}
              className={`relative min-h-[72px] min-w-[88px] rounded-2xl px-4 py-3 text-2xl font-black transition ${
                selected
                  ? `${BATTLE_CONTRAST.primaryAction.bgClass} ${BATTLE_CONTRAST.primaryAction.textClass} ring-4 ring-amber-300`
                  : `${BATTLE_CONTRAST.secondaryAction.bgClass} ${BATTLE_CONTRAST.secondaryAction.textClass}`
              }`}
            >
              {selected ? (
                <span
                  aria-hidden
                  className="absolute -left-3 -top-3 flex h-10 w-10 items-center justify-center rounded-full bg-amber-400 text-lg font-black text-slate-900 shadow-lg ring-2 ring-white"
                >
                  {sel + 1}
                </span>
              ) : null}
              <span>{item}</span>
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
          className={`flex-1 rounded-2xl ${BATTLE_CONTRAST.primaryAction.bgClass} ${BATTLE_CONTRAST.primaryAction.textClass} px-6 py-3 text-xl font-black disabled:opacity-40`}
        >
          提交
        </button>
      </div>
    </div>
  );
};
