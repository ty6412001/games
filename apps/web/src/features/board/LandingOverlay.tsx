import { useGameStore } from '../../stores/gameStore';
import { BATTLE_CONTRAST } from '../../theme/contrast';

const titleByKind: Record<string, string> = {
  start: '🏠 绕一圈发工资 +¥200',
  study: '📚 学习星',
  'property-unowned': '🏙️ 想买下这块地吗？',
  'property-owned-self': '🏙️ 这是你的地',
  'property-owned-other': '💸 交过路费！',
  monster: '⚔️ 怪兽挡路',
  'reward-vault': '🎁 宝库奖励 +¥300',
  'boss-outpost': '🧟 Boss 住在这里等你',
};

export const LandingOverlay = () => {
  const game = useGameStore((s) => s.game);
  const landing = useGameStore((s) => s.landingEvent);
  const buy = useGameStore((s) => s.buyPrompt);
  const rent = useGameStore((s) => s.rentNotice);
  const bankruptcy = useGameStore((s) => s.bankruptcy);
  const chanceResult = useGameStore((s) => s.chanceResult);
  const quizResult = useGameStore((s) => s.quizResult);
  const pendingQuiz = useGameStore((s) => s.pendingQuiz);
  const confirmBuy = useGameStore((s) => s.confirmBuy);
  const declineBuy = useGameStore((s) => s.declineBuy);
  const dismiss = useGameStore((s) => s.dismissLanding);
  const chooseRentQuiz = useGameStore((s) => s.chooseRentQuiz);
  const acceptRentPayment = useGameStore((s) => s.acceptRentPayment);
  const chooseSelfPropertyQuiz = useGameStore((s) => s.chooseSelfPropertyQuiz);
  const dismissSelfPropertyLanding = useGameStore((s) => s.dismissSelfPropertyLanding);

  if (!landing || !game) return null;
  if (landing.kind === 'chance' || chanceResult) return null;
  if (pendingQuiz || quizResult) return null;

  const title = titleByKind[landing.kind] ?? '事件';
  const propertyTile =
    landing.kind === 'property-owned-self' || landing.kind === 'property-owned-other'
      ? game.tiles[landing.position]
      : null;
  const selfBonus =
    landing.kind === 'property-owned-self' && propertyTile?.type === 'property'
      ? Math.min(80, Math.floor(propertyTile.baseRent * 0.5))
      : 0;

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl bg-slate-900 p-6 shadow-2xl ring-1 ring-slate-700">
        <h2 className="text-2xl font-black text-amber-300">{title}</h2>

        {rent && !bankruptcy && (
          <p className="mt-3 text-slate-200">
            扣除过路费 <span className="font-bold text-rose-400">¥{rent.amount}</span>
          </p>
        )}

        {landing.kind === 'property-owned-other' && !rent && !bankruptcy && (
          <div className="mt-4 space-y-3">
            <p className="text-slate-200">
              过路费 <span className="text-2xl font-bold text-rose-400">¥{landing.rent}</span>
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={chooseRentQuiz}
                className={`flex-1 rounded-xl ${BATTLE_CONTRAST.primaryAction.bgClass} ${BATTLE_CONTRAST.primaryAction.textClass} px-4 py-3 text-lg font-bold`}
              >
                📝 答题不交过路费
              </button>
              <button
                type="button"
                onClick={acceptRentPayment}
                className={`flex-1 rounded-xl ${BATTLE_CONTRAST.secondaryAction.bgClass} ${BATTLE_CONTRAST.secondaryAction.textClass} px-4 py-3 text-lg font-bold`}
              >
                💸 直接交过路费
              </button>
            </div>
          </div>
        )}

        {landing.kind === 'property-owned-self' && (
          <div className="mt-4 space-y-3">
            <p className="text-slate-200">
              答对可以拿 <span className="text-2xl font-bold text-emerald-300">¥{selfBonus}</span> 奖励
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={chooseSelfPropertyQuiz}
                className={`flex-1 rounded-xl ${BATTLE_CONTRAST.primaryAction.bgClass} ${BATTLE_CONTRAST.primaryAction.textClass} px-4 py-3 text-lg font-bold`}
              >
                📝 答题领奖励
              </button>
              <button
                type="button"
                onClick={dismissSelfPropertyLanding}
                className={`flex-1 rounded-xl ${BATTLE_CONTRAST.secondaryAction.bgClass} ${BATTLE_CONTRAST.secondaryAction.textClass} px-4 py-3 text-lg font-bold`}
              >
                跳过
              </button>
            </div>
          </div>
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
            ⚠️ {bankruptcy.playerName} 的钱用光了，先回 M78 补充！
          </p>
        )}

        {!buy &&
          landing.kind !== 'property-owned-other' &&
          landing.kind !== 'property-owned-self' && (
            <button
              type="button"
              onClick={dismiss}
              className="mt-6 w-full rounded-xl bg-slate-700 px-4 py-3 text-lg font-bold text-slate-50"
            >
              下一位
            </button>
          )}

        {(landing.kind === 'property-owned-other' && (rent || bankruptcy)) && (
          <button
            type="button"
            onClick={dismiss}
            className="mt-6 w-full rounded-xl bg-slate-700 px-4 py-3 text-lg font-bold text-slate-50"
          >
            下一位
          </button>
        )}
      </div>
    </div>
  );
};
