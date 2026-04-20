type KnowledgeBankCenterProps = {
  onExit: () => void;
};

const moduleCards = [
  {
    title: '题库条目',
    description: '集中管理一年级上学期题目，按学科、知识点和游戏模式组织。',
    points: ['支持数学 / 语文 / 英语 / 脑力题', '区分草稿、发布、归档状态', '为大富翁、复习、练习等模式共用'],
  },
  {
    title: '学习轨迹',
    description: '后端已预留答题日志、错题本和掌握度记录结构，后续可逐步接入真实写入。',
    points: ['答题日志可按模式筛选', '错题本适配导出', '掌握度可沉淀为长期学习画像'],
  },
  {
    title: '导出友好',
    description: '所有知识库结构都带有年级、学期、来源和标签元数据，方便后续导出到家长侧。',
    points: ['JSON 导出已预留', '元数据可追踪来源', '保持和现有玩法解耦'],
  },
];

export const KnowledgeBankCenter = ({ onExit }: KnowledgeBankCenterProps) => {
  return (
    <div className="min-h-[100svh] bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.18),_transparent_30%),linear-gradient(135deg,_#07111f,_#111827_45%,_#172554)] text-slate-50">
      <div className="mx-auto flex min-h-[100svh] max-w-6xl flex-col px-6 py-8 md:px-10">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.35em] text-sky-200">Knowledge Bank</p>
            <h1 className="mt-2 text-3xl font-black md:text-5xl">知识库中心</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300 md:text-base">
              这一版先完成平台地基：题库条目、学习记录和导出结构已经独立出来，后续新游戏模式可以复用同一套学习数据。
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

        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {moduleCards.map((card) => (
            <section
              key={card.title}
              className="rounded-3xl border border-white/10 bg-slate-950/40 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.35)] backdrop-blur"
            >
              <h2 className="text-xl font-black text-white">{card.title}</h2>
              <p className="mt-3 text-sm leading-6 text-slate-300">{card.description}</p>
              <ul className="mt-4 space-y-2 text-sm text-sky-100">
                {card.points.map((point) => (
                  <li key={point} className="rounded-2xl bg-sky-500/10 px-3 py-2">
                    {point}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <section className="mt-8 rounded-3xl border border-emerald-300/20 bg-emerald-400/10 p-6">
          <h2 className="text-xl font-black text-emerald-100">Phase 1 API Groundwork</h2>
          <div className="mt-4 grid gap-3 text-sm text-emerald-50 md:grid-cols-2">
            <div className="rounded-2xl bg-black/20 p-4">
              <p className="font-bold">题库接口</p>
              <p className="mt-2 font-mono text-xs leading-6 text-emerald-100/90">
                GET /api/knowledge-bank/questions
                <br />
                POST /api/knowledge-bank/questions
                <br />
                PATCH /api/knowledge-bank/questions/:id
              </p>
            </div>
            <div className="rounded-2xl bg-black/20 p-4">
              <p className="font-bold">学习记录接口</p>
              <p className="mt-2 font-mono text-xs leading-6 text-emerald-100/90">
                GET /api/knowledge-bank/answer-logs
                <br />
                GET /api/knowledge-bank/wrong-book
                <br />
                GET /api/knowledge-bank/export/health-safe
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
