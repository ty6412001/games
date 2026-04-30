import { clearToken, getToken, loginFamily } from '../../data/cloud/apiClient';
import {
  type KnowledgeQuestionCreateInput,
  type KnowledgeQuestionItem,
  type LearningGameMode,
  type Subject,
} from '@ultraman/shared';
import { useCallback, useEffect, useMemo, useState } from 'react';

type QuestionFilters = {
  subject: '' | Subject;
  status: '' | 'draft' | 'published' | 'archived';
  mode: '' | LearningGameMode;
};

const fetchJson = async <T,>(path: string, init?: RequestInit): Promise<T> => {
  const token = getToken();
  const response = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload?.error?.message ?? `request failed: ${response.status}`);
  }

  return (await response.json()) as T;
};

const defaultFilters: QuestionFilters = {
  subject: '',
  status: '',
  mode: '',
};

const subjectOptions: Subject[] = ['math', 'chinese', 'english', 'brain'];
const modeOptions: LearningGameMode[] = ['monopoly', 'review', 'practice', 'boss', 'wrong-book'];
const statusOptions = ['draft', 'published', 'archived'] as const;

const emptyForm: KnowledgeQuestionCreateInput = {
  subject: 'math',
  grade: 'grade1',
  semester: 'lower',
  difficulty: 1,
  topic: '',
  stem: '',
  type: 'choice',
  options: [''],
  answer: '',
  knowledgePoints: [''],
  gameModes: ['monopoly'],
  status: 'draft',
  metadata: {
    source: 'manual',
    tags: [],
  },
};

export const KnowledgeBankCenter = ({ onExit }: { onExit: () => void }) => {
  const [tokenInput, setTokenInput] = useState('');
  const [questions, setQuestions] = useState<KnowledgeQuestionItem[]>([]);
  const [filters, setFilters] = useState<QuestionFilters>(defaultFilters);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<KnowledgeQuestionCreateInput>(emptyForm);
  const [saving, setSaving] = useState(false);

  const hasToken = Boolean(getToken());

  const loadQuestions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      if (filters.subject) qs.set('subject', filters.subject);
      if (filters.status) qs.set('status', filters.status);
      if (filters.mode) qs.set('mode', filters.mode);
      qs.set('limit', '100');
      const result = await fetchJson<{ items: KnowledgeQuestionItem[] }>(`/api/knowledge-bank/questions?${qs.toString()}`);
      setQuestions(result.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, [filters.mode, filters.status, filters.subject]);

  useEffect(() => {
    if (!hasToken) {
      setLoading(false);
      return;
    }
    void loadQuestions();
  }, [hasToken, loadQuestions]);

  const publishedCount = useMemo(() => questions.filter((item) => item.status === 'published').length, [questions]);

  const handleLogin = async () => {
    setError(null);
    try {
      await loginFamily(tokenInput);
      setTokenInput('');
      void loadQuestions();
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败');
    }
  };

  const setOption = (index: number, value: string) => {
    setForm((prev) => ({
      ...prev,
      options: (prev.options ?? []).map((item, itemIndex) => (itemIndex === index ? value : item)),
    }));
  };

  const submitCreate = async () => {
    setSaving(true);
    setError(null);
    try {
      const payload: KnowledgeQuestionCreateInput = {
        ...form,
        topic: form.topic.trim(),
        stem: form.stem.trim(),
        answer: form.answer.trim(),
        options: form.type === 'choice' || form.type === 'image-choice'
          ? (form.options ?? []).map((item) => item.trim()).filter(Boolean)
          : undefined,
        knowledgePoints: form.knowledgePoints.map((item) => item.trim()).filter(Boolean),
        metadata: {
          ...form.metadata,
          source: form.metadata.source.trim() || 'manual',
          tags: form.metadata.tags ?? [],
        },
      };
      await fetchJson<{ item: KnowledgeQuestionItem }>('/api/knowledge-bank/questions', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setShowCreate(false);
      setForm(emptyForm);
      void loadQuestions();
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-[100svh] bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.18),_transparent_30%),linear-gradient(135deg,_#07111f,_#111827_45%,_#172554)] text-slate-50">
      <div className="mx-auto flex min-h-[100svh] max-w-7xl flex-col px-6 py-8 md:px-10">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.35em] text-sky-200">Knowledge Bank</p>
            <h1 className="mt-2 text-3xl font-black md:text-5xl">知识库中心</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300 md:text-base">
              这里已经不是纯摆设了，能直接查题、筛题、手工加题，后面继续给多玩法复用。
            </p>
          </div>
          <button type="button" onClick={onExit} className="rounded-full border border-white/15 bg-white/10 px-5 py-2 text-sm font-semibold text-white transition hover:bg-white/15">
            返回主菜单
          </button>
        </div>

        {!hasToken ? (
          <section className="mt-8 rounded-3xl border border-amber-300/30 bg-amber-500/10 p-6">
            <h2 className="text-xl font-black text-amber-100">先登录家庭口令</h2>
            <p className="mt-2 text-sm text-amber-50/90">知识库和导出接口走鉴权，先登录一下再干活。</p>
            <div className="mt-4 flex flex-col gap-3 md:flex-row">
              <input value={tokenInput} onChange={(e) => setTokenInput(e.target.value)} className="flex-1 rounded-2xl bg-slate-950/70 px-4 py-3 text-base" placeholder="输入家庭口令" />
              <button type="button" onClick={() => { void handleLogin(); }} className="rounded-2xl bg-amber-400 px-6 py-3 font-black text-slate-900">登录</button>
            </div>
          </section>
        ) : null}

        {hasToken ? (
          <>
            <section className="mt-8 grid gap-4 md:grid-cols-4">
              <StatCard title="题目总数" value={String(questions.length)} hint="当前筛选结果" />
              <StatCard title="已发布" value={String(publishedCount)} hint="可供游戏复用" />
              <StatCard title="题型数" value={String(new Set(questions.map((item) => item.type)).size)} hint="按当前列表统计" />
              <div className="rounded-3xl border border-white/10 bg-slate-950/40 p-5">
                <div className="text-sm text-slate-400">操作</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" onClick={() => setShowCreate((value) => !value)} className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-bold text-white">{showCreate ? '收起新增表单' : '新增题目'}</button>
                  <button type="button" onClick={() => { void loadQuestions(); }} className="rounded-xl bg-white/10 px-4 py-2 text-sm font-bold text-white">刷新</button>
                  <button type="button" onClick={() => { clearToken(); window.location.reload(); }} className="rounded-xl bg-white/10 px-4 py-2 text-sm font-bold text-white">退出登录</button>
                </div>
              </div>
            </section>

            <section className="mt-6 rounded-3xl border border-white/10 bg-slate-950/40 p-5">
              <div className="grid gap-3 md:grid-cols-4">
                <SelectFilter label="学科" value={filters.subject} onChange={(value) => setFilters((prev) => ({ ...prev, subject: value as QuestionFilters['subject'] }))} options={['', ...subjectOptions]} />
                <SelectFilter label="状态" value={filters.status} onChange={(value) => setFilters((prev) => ({ ...prev, status: value as QuestionFilters['status'] }))} options={['', ...statusOptions]} />
                <SelectFilter label="游戏模式" value={filters.mode} onChange={(value) => setFilters((prev) => ({ ...prev, mode: value as QuestionFilters['mode'] }))} options={['', ...modeOptions]} />
                <button type="button" onClick={() => setFilters(defaultFilters)} className="rounded-2xl bg-white/10 px-4 py-3 text-sm font-bold text-white">清空筛选</button>
              </div>
            </section>

            {showCreate ? (
              <section className="mt-6 rounded-3xl border border-emerald-300/20 bg-emerald-400/10 p-6">
                <h2 className="text-xl font-black text-emerald-100">新增题目</h2>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <Field label="主题"><input value={form.topic} onChange={(e) => setForm((prev) => ({ ...prev, topic: e.target.value }))} className="field-input" /></Field>
                  <Field label="正确答案"><input value={form.answer} onChange={(e) => setForm((prev) => ({ ...prev, answer: e.target.value }))} className="field-input" /></Field>
                  <Field label="学科"><select value={form.subject} onChange={(e) => setForm((prev) => ({ ...prev, subject: e.target.value as Subject }))} className="field-input">{subjectOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select></Field>
                  <Field label="题型"><select value={form.type} onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value as KnowledgeQuestionCreateInput['type'] }))} className="field-input"><option value="choice">choice</option><option value="input">input</option><option value="image-choice">image-choice</option><option value="ordering">ordering</option></select></Field>
                  <Field label="难度"><select value={String(form.difficulty)} onChange={(e) => setForm((prev) => ({ ...prev, difficulty: Number(e.target.value) as 1 | 2 | 3 }))} className="field-input"><option value="1">1</option><option value="2">2</option><option value="3">3</option></select></Field>
                  <Field label="状态"><select value={form.status} onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value as KnowledgeQuestionCreateInput['status'] }))} className="field-input">{statusOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select></Field>
                  <Field label="知识点"><input value={form.knowledgePoints.join(',')} onChange={(e) => setForm((prev) => ({ ...prev, knowledgePoints: e.target.value.split(',') }))} className="field-input" placeholder="逗号分隔" /></Field>
                  <Field label="适用模式"><input value={form.gameModes.join(',')} onChange={(e) => setForm((prev) => ({ ...prev, gameModes: e.target.value.split(',').map((item) => item.trim()).filter(Boolean) as LearningGameMode[] }))} className="field-input" placeholder="monopoly,review" /></Field>
                  <div className="md:col-span-2"><Field label="题干"><textarea value={form.stem} onChange={(e) => setForm((prev) => ({ ...prev, stem: e.target.value }))} className="field-input min-h-28" /></Field></div>
                  {(form.type === 'choice' || form.type === 'image-choice') ? (
                    <div className="md:col-span-2">
                      <Field label="选项"><div className="grid gap-2 md:grid-cols-3">{(form.options ?? []).map((option, index) => <input key={`${index}-${option}`} value={option} onChange={(e) => setOption(index, e.target.value)} className="field-input" placeholder={`选项 ${index + 1}`} />)}<button type="button" onClick={() => setForm((prev) => ({ ...prev, options: [...(prev.options ?? []), ''] }))} className="rounded-2xl border border-dashed border-emerald-200/40 px-4 py-3 text-sm">+ 加一个选项</button></div></Field>
                    </div>
                  ) : null}
                </div>
                <div className="mt-4 flex justify-end gap-3">
                  <button type="button" onClick={() => setShowCreate(false)} className="rounded-2xl bg-white/10 px-5 py-3 text-sm font-bold">取消</button>
                  <button type="button" onClick={() => { void submitCreate(); }} disabled={saving} className="rounded-2xl bg-emerald-400 px-5 py-3 text-sm font-black text-slate-950 disabled:opacity-60">{saving ? '保存中…' : '保存题目'}</button>
                </div>
              </section>
            ) : null}

            <section className="mt-6 rounded-3xl border border-white/10 bg-slate-950/40 p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-black">题目列表</h2>
                {loading ? <span className="text-sm text-slate-400">加载中…</span> : null}
              </div>
              {error ? <div className="mb-4 rounded-2xl bg-rose-500/15 px-4 py-3 text-sm text-rose-100">{error}</div> : null}
              <div className="grid gap-4">
                {questions.map((item) => (
                  <article key={item.id} className="rounded-3xl border border-white/10 bg-black/20 p-5">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
                      <Badge>{item.subject}</Badge>
                      <Badge>{item.type}</Badge>
                      <Badge>{item.status}</Badge>
                      <Badge>难度 {item.difficulty}</Badge>
                      <Badge>{item.gameModes.join(', ')}</Badge>
                    </div>
                    <h3 className="mt-3 text-lg font-black text-white">{item.topic}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-200">{item.stem}</p>
                    <div className="mt-3 text-xs text-slate-400">答案：{item.answer}</div>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-sky-100">{item.knowledgePoints.map((point) => <span key={point} className="rounded-full bg-sky-500/15 px-3 py-1">{point}</span>)}</div>
                  </article>
                ))}
                {!loading && questions.length === 0 ? <div className="rounded-2xl border border-dashed border-white/10 px-4 py-10 text-center text-slate-400">当前筛选下还没有题目，先加一题试试。</div> : null}
              </div>
            </section>
          </>
        ) : null}
      </div>
    </div>
  );
};

const StatCard = ({ title, value, hint }: { title: string; value: string; hint: string }) => (
  <div className="rounded-3xl border border-white/10 bg-slate-950/40 p-5">
    <div className="text-sm text-slate-400">{title}</div>
    <div className="mt-2 text-4xl font-black text-white">{value}</div>
    <div className="mt-2 text-xs text-slate-500">{hint}</div>
  </div>
);

const SelectFilter = ({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: readonly string[] }) => (
  <label className="flex flex-col gap-2 text-sm text-slate-300">
    <span>{label}</span>
    <select value={value} onChange={(e) => onChange(e.target.value)} className="rounded-2xl bg-slate-900 px-4 py-3 text-white">
      {options.map((option) => <option key={option || 'all'} value={option}>{option || '全部'}</option>)}
    </select>
  </label>
);

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <label className="flex flex-col gap-2 text-sm text-slate-200">
    <span>{label}</span>
    {children}
  </label>
);

const Badge = ({ children }: { children: React.ReactNode }) => (
  <span className="rounded-full bg-white/10 px-3 py-1">{children}</span>
);
