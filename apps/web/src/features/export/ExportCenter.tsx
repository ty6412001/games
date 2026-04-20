type ExportCenterProps = {
  onExit: () => void;
};

const exportPanels = [
  {
    title: '错题本导出',
    detail: '汇总 learnerId、题目、错误答案、掌握状态等字段，适合家长复盘。',
  },
  {
    title: '答题日志导出',
    detail: '保留答题模式、答题时间、用时、提交答案等信息，便于后续分析。',
  },
  {
    title: '健康检查安全导出',
    detail: '当前先返回 JSON 数据包，避免一次性做复杂文件生成或下载流程。',
  },
];

export const ExportCenter = ({ onExit }: ExportCenterProps) => {
  return (
    <div className="min-h-[100svh] bg-[radial-gradient(circle_at_top_right,_rgba(245,158,11,0.18),_transparent_28%),linear-gradient(160deg,_#1c1917,_#292524_35%,_#0f172a)] text-stone-50">
      <div className="mx-auto flex min-h-[100svh] max-w-5xl flex-col px-6 py-8 md:px-10">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.35em] text-amber-200">Export Center</p>
            <h1 className="mt-2 text-3xl font-black md:text-5xl">导出中心</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-300 md:text-base">
              这里先放稳定骨架，不抢跑做复杂报表。Phase 1 重点是打通可扩展的数据出口，并保持当前游戏继续可玩。
            </p>
          </div>
          <button
            type="button"
            onClick={onExit}
            className="rounded-full border border-white/15 bg-white/10 px-5 py-2 text-sm font-semibold text-white transition hover:bg-white/15"
          >
            返回主菜单
          </button>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {exportPanels.map((panel) => (
            <section key={panel.title} className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur">
              <h2 className="text-lg font-black text-amber-100">{panel.title}</h2>
              <p className="mt-3 text-sm leading-6 text-stone-300">{panel.detail}</p>
            </section>
          ))}
        </div>

        <section className="mt-8 rounded-3xl border border-white/10 bg-slate-950/40 p-6">
          <h2 className="text-xl font-black">当前导出结构</h2>
          <div className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-slate-950/70">
            <pre className="overflow-x-auto p-4 text-xs leading-6 text-slate-200">
{`{
  "metadata": {
    "exportId": "health-safe-...",
    "format": "json",
    "grade": "grade1",
    "semester": "lower"
  },
  "questions": [],
  "answerLogs": [],
  "wrongBookRecords": [],
  "masteryRecords": []
}`}
            </pre>
          </div>
          <p className="mt-4 text-sm leading-6 text-stone-300">
            下一阶段可在这个骨架上追加文件下载、筛选条件、家长端展示和任务调度，不需要重做已有接口。
          </p>
        </section>
      </div>
    </div>
  );
};
