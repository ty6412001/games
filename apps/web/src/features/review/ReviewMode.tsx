import { useEffect, useState } from 'react';
import type { Question, WrongBookEntry } from '@ultraman/shared';

import { listActive, markMastered } from '../../data/repo/wrongBookRepo';

type Props = {
  childId: string;
  onExit: () => void;
};

type Phase =
  | { kind: 'loading' }
  | { kind: 'empty' }
  | { kind: 'asking'; entry: WrongBookEntry; streak: number }
  | { kind: 'done' };

const asChoiceQuestion = (entry: WrongBookEntry): Question | null => {
  const pool = new Set<string>([entry.correctAnswer]);
  pool.add('...');
  pool.add('???');
  return {
    id: entry.questionId,
    subject: entry.subject,
    difficulty: 1,
    topic: '复习',
    stem: entry.stem,
    type: 'input',
    answer: entry.correctAnswer,
  };
};

export const ReviewMode = ({ childId, onExit }: Props) => {
  const [entries, setEntries] = useState<WrongBookEntry[]>([]);
  const [phase, setPhase] = useState<Phase>({ kind: 'loading' });
  const [answer, setAnswer] = useState('');
  const [streakMap, setStreakMap] = useState<Map<string, number>>(new Map());

  useEffect(() => {
    void (async () => {
      const list = await listActive(childId);
      setEntries(list);
      if (list.length === 0) {
        setPhase({ kind: 'empty' });
      } else {
        setPhase({ kind: 'asking', entry: list[0]!, streak: 0 });
      }
    })();
  }, [childId]);

  if (phase.kind === 'loading') {
    return <ReviewShell onExit={onExit}>正在加载错题本…</ReviewShell>;
  }
  if (phase.kind === 'empty') {
    return (
      <ReviewShell onExit={onExit}>
        <div className="text-center">
          <div className="text-5xl">✨</div>
          <p className="mt-3 text-xl font-bold">错题本清空啦！</p>
        </div>
      </ReviewShell>
    );
  }
  if (phase.kind === 'done') {
    return (
      <ReviewShell onExit={onExit}>
        <div className="text-center">
          <div className="text-5xl">🎉</div>
          <p className="mt-3 text-xl font-bold">本次复习完成</p>
        </div>
      </ReviewShell>
    );
  }

  const current = phase.entry;
  const question = asChoiceQuestion(current);

  const submit = async () => {
    const correct = answer.trim() === current.correctAnswer.trim();
    setAnswer('');
    if (!question) return;
    if (correct) {
      const prevStreak = streakMap.get(current.id) ?? 0;
      const nextStreak = prevStreak + 1;
      if (nextStreak >= 2) {
        await markMastered(current.id);
        const remaining = entries.filter((e) => e.id !== current.id);
        setEntries(remaining);
        if (remaining.length === 0) {
          setPhase({ kind: 'done' });
        } else {
          setPhase({ kind: 'asking', entry: remaining[0]!, streak: 0 });
        }
      } else {
        const newMap = new Map(streakMap);
        newMap.set(current.id, nextStreak);
        setStreakMap(newMap);
        setPhase({ kind: 'asking', entry: current, streak: nextStreak });
      }
    } else {
      const newMap = new Map(streakMap);
      newMap.set(current.id, 0);
      setStreakMap(newMap);
      setPhase({ kind: 'asking', entry: current, streak: 0 });
    }
  };

  return (
    <ReviewShell onExit={onExit}>
      <div className="space-y-4">
        <div className="text-sm text-slate-400">
          待复习 {entries.length} 题 · 当前连对 {phase.streak}/2
        </div>
        <div className="rounded-2xl bg-slate-800/80 p-4 text-xl leading-relaxed">{current.stem}</div>
        <div className="text-xs text-slate-400">
          这道题之前错了 {current.wrongCount} 次 · {current.subject}
        </div>
        <form
          className="flex gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <input
            className="flex-1 rounded-2xl bg-slate-800 px-4 py-3 text-2xl"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            autoFocus
            placeholder="回想答案"
          />
          <button
            type="submit"
            className="rounded-2xl bg-amber-400 px-6 py-3 text-xl font-black text-slate-900"
          >
            确认
          </button>
        </form>
        <details className="rounded-xl bg-slate-900/60 p-3 text-sm text-slate-300">
          <summary>卡住了？显示正确答案（看一下不计入连对）</summary>
          <div className="mt-2 text-amber-300">答案：{current.correctAnswer}</div>
        </details>
      </div>
    </ReviewShell>
  );
};

const ReviewShell = ({
  onExit,
  children,
}: {
  onExit: () => void;
  children: React.ReactNode;
}) => (
  <div className="h-[100svh] overflow-hidden bg-slate-950 px-6 py-6 text-slate-50">
    <div className="mx-auto flex h-full max-w-2xl flex-col gap-4">
      <header className="flex items-center justify-between">
        <h2 className="text-2xl font-black">📚 错题本复习</h2>
        <button type="button" onClick={onExit} className="rounded-xl bg-slate-800 px-4 py-2 text-sm">
          退出
        </button>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
    </div>
  </div>
);
