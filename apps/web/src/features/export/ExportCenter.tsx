import { clearToken, getToken, loginFamily } from '../../data/cloud/apiClient';
import { ApiError } from '../../data/cloud/apiClient';
import type { KnowledgeExportBundle } from '@ultraman/shared';
import { useEffect, useMemo, useState } from 'react';

const fetchExport = async (): Promise<KnowledgeExportBundle> => {
  const token = getToken();
  const base = (import.meta.env.VITE_API_BASE as string | undefined)?.trim()?.replace(/\/$/, '')
    ?? (typeof window !== 'undefined' && window.location?.origin
      ? `${window.location.origin}/api`
      : 'http://127.0.0.1:3001/api');
  const response = await fetch(new URL('/knowledge-bank/export/health-safe', `${base}/`).toString(), {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new ApiError({
      status: response.status,
      code: payload?.error?.code,
      message: payload?.error?.message ?? `request failed: ${response.status}`,
    });
  }
  return (await response.json()) as KnowledgeExportBundle;
};

export const ExportCenter = ({ onExit }: { onExit: () => void }) => {
  const [password, setPassword] = useState('');
  const [bundle, setBundle] = useState<KnowledgeExportBundle | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const hasToken = Boolean(getToken());

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setBundle(await fetchExport());
    } catch (err) {
      setError(err instanceof Error ? err.message : '导出加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hasToken) {
      void load();
    }
  }, [hasToken]);

  const summary = useMemo(() => {
    if (!bundle) return [];
    return [
      ['题目', bundle.metadata.questionCount],
      ['答题日志', bundle.metadata.answerLogCount],
      ['错题本', bundle.metadata.wrongBookCount],
      ['掌握记录', bundle.metadata.masteryRecordCount],
      ['奖励事件', bundle.metadata.rewardEventCount],
    ] as const;
  }, [bundle]);

  const recentOutcomes = useMemo(() => {
    if (!bundle) return [];
    return bundle.answerLogs.slice(0, 8);
  }, [bundle]);

  const rewardFeed = useMemo(() => {
    if (!bundle) return [];
    return bundle.rewardEvents.slice(0, 8);
  }, [bundle]);

  return (
    <div className="min-h-[100svh] bg-[radial-gradient(circle_at_top_right,_rgba(245,158,11,0.18),_transparent_28%),linear-gradient(160deg,_#1c1917,_#292524_35%,_#0f172a)] text-stone-50">
      <div className="mx-auto flex min-h-[100svh] max-w-6xl flex-col px-6 py-8 md:px-10">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.35em] text-amber-200">Export Center</p>
            <h1 className="mt-2 text-3xl font-black md:text-5xl">导出中心</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-300 md:text-base">现在这里能拉真 JSON 了，不再只是摆个漂亮壳子。</p>
          </div>
          <button type="button" onClick={onExit} className="rounded-full border border-white/15 bg-white/10 px-5 py-2 text-sm font-semibold text-white transition hover:bg-white/15">返回主菜单</button>
        </div>

        {!hasToken ? (
          <section className="mt-8 rounded-3xl border border-amber-300/30 bg-amber-500/10 p-6">
            <h2 className="text-xl font-black text-amber-100">先登录家庭口令</h2>
            <div className="mt-4 flex flex-col gap-3 md:flex-row">
              <input value={password} onChange={(e) => setPassword(e.target.value)} className="flex-1 rounded-2xl bg-slate-950/70 px-4 py-3 text-base" placeholder="输入家庭口令" />
              <button type="button" onClick={() => { void loginFamily(password).then(() => load()).catch((err) => setError(err instanceof Error ? err.message : '登录失败')); }} className="rounded-2xl bg-amber-400 px-6 py-3 font-black text-slate-900">登录并加载</button>
            </div>
          </section>
        ) : null}

        {hasToken ? (
          <>
            <section className="mt-8 grid gap-4 md:grid-cols-5">
              {summary.map(([label, value]) => (
                <div key={label} className="rounded-3xl border border-white/10 bg-white/5 p-5">
                  <div className="text-sm text-stone-400">{label}</div>
                  <div className="mt-2 text-4xl font-black text-white">{value}</div>
                </div>
              ))}
            </section>

            <section className="mt-6 rounded-3xl border border-white/10 bg-slate-950/40 p-6">
              <div className="flex flex-wrap items-center gap-3">
                <button type="button" onClick={() => { void load(); }} className="rounded-2xl bg-amber-400 px-5 py-3 text-sm font-black text-slate-950">{loading ? '加载中…' : '刷新导出数据'}</button>
                <button type="button" onClick={() => {
                  if (!bundle) return;
                  const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const anchor = document.createElement('a');
                  anchor.href = url;
                  anchor.download = `${bundle.metadata.exportId}.json`;
                  anchor.click();
                  URL.revokeObjectURL(url);
                }} className="rounded-2xl bg-white/10 px-5 py-3 text-sm font-bold">下载 JSON</button>
                <button type="button" onClick={() => { clearToken(); window.location.reload(); }} className="rounded-2xl bg-white/10 px-5 py-3 text-sm font-bold">退出登录</button>
              </div>
              {error ? <div className="mt-4 rounded-2xl bg-rose-500/15 px-4 py-3 text-sm text-rose-100">{error}</div> : null}
            </section>

            {bundle ? (
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <Panel title="最近题目">{bundle.questions.slice(0, 5).map((item) => <li key={item.id}>{item.topic} · {item.subject} · {item.status}</li>)}</Panel>
                <Panel title="最近错题">{bundle.wrongBookRecords.slice(0, 5).map((item) => <li key={item.id}>{item.questionStem} · 错 {item.wrongCount} 次</li>)}</Panel>
                <Panel title="最近答题日志">{recentOutcomes.map((item) => <li key={item.id}>{item.gameMode} · {item.outcome} · {item.questionStem}</li>)}</Panel>
                <Panel title="掌握记录">{bundle.masteryRecords.slice(0, 5).map((item) => <li key={item.id}>{item.questionId} · 分数 {item.masteryScore}</li>)}</Panel>
                <Panel title="奖励事件">{rewardFeed.map((item) => <li key={item.id}>{item.eventType} · +{item.amount} · {item.gameMode}</li>)}</Panel>
                <Panel title="最近学习状态">{recentOutcomes.map((item) => <li key={`${item.id}-state`}>{item.subject} · {item.outcome} · {new Date(item.answeredAt).toLocaleString('zh-CN', { hour12: false })}</li>)}</Panel>
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  );
};

const Panel = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="rounded-3xl border border-white/10 bg-white/5 p-5">
    <h2 className="text-lg font-black text-amber-100">{title}</h2>
    <ul className="mt-3 space-y-2 text-sm leading-6 text-stone-200">{children}</ul>
  </section>
);
