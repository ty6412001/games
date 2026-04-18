import { useGameStore } from '../../stores/gameStore';

const titleByKind: Record<string, string> = {
  start: '🏠 绕圈工资 +¥200',
  study: '📚 学习格 +¥80（答题系统待接入）',
  'property-unowned': '🏙️ 想买这块地吗？',
  'property-owned-self': '🏙️ 这是你的地产',
  'property-owned-other': '💸 交租！',
  chance: '🎲 机会来了（待接入）',
  monster: '⚔️ 小怪兽挑战（待接入）',
  'reward-vault': '🎁 宝库奖励 +¥300',
  'boss-outpost': '🧟 Boss 前哨',
};

export const LandingOverlay = () => {
  const game = useGameStore((s) => s.game);
  const landing = useGameStore((s) => s.landingEvent);
  const buy = useGameStore((s) => s.buyPrompt);
  const rent = useGameStore((s) => s.rentNotice);
  const bankruptcy = useGameStore((s) => s.bankruptcy);
  const confirmBuy = useGameStore((s) => s.confirmBuy);
  const declineBuy = useGameStore((s) => s.declineBuy);
  const dismiss = useGameStore((s) => s.dismissLanding);

  if (!landing || !game) return null;

  const title = titleByKind[landing.kind] ?? '事件';

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl bg-slate-900 p-6 shadow-2xl ring-1 ring-slate-700">
        <h2 className="text-2xl font-black text-amber-300">{title}</h2>

        {rent && (
          <p className="mt-3 text-slate-200">
            你踩到了别人的地，扣除租金 <span className="font-bold text-rose-400">¥{rent.amount}</span>
          </p>
        )}

        {buy && (
          <div className="mt-4 space-y-3">
            <p className="text-slate-200">
              价格 <span className="text-2xl font-bold text-amber-300">¥{buy.price}</span>
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={confirmBuy}
                className="flex-1 rounded-xl bg-amber-400 px-4 py-3 text-lg font-bold text-slate-900"
              >
                ✅ 买下
              </button>
              <button
                type="button"
                onClick={declineBuy}
                className="flex-1 rounded-xl bg-slate-700 px-4 py-3 text-lg font-bold"
              >
                跳过
              </button>
            </div>
          </div>
        )}

        {bankruptcy && (
          <p className="mt-3 text-rose-300">
            ⚠️ {bankruptcy.playerName} 的变身能量耗尽了，先回 M78 补充！
          </p>
        )}

        {!buy && (
          <button
            type="button"
            onClick={dismiss}
            className="mt-6 w-full rounded-xl bg-slate-700 px-4 py-3 text-lg font-bold"
          >
            下一位
          </button>
        )}
      </div>
    </div>
  );
};
