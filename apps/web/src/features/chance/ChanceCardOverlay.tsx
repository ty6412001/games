import { HELP_CARD_OVERFLOW_CASH_PER_CARD, type ChanceCardTone } from '../../domain/chanceDeck';
import { useGameStore } from '../../stores/gameStore';
import { BATTLE_CONTRAST } from '../../theme/contrast';

const toneTheme: Record<
  ChanceCardTone,
  { band: string; accent: string; text: string; emoji: string; label: string }
> = {
  good: {
    band: 'bg-emerald-500',
    accent: 'ring-emerald-300',
    text: 'text-slate-950',
    emoji: '🌟',
    label: '好事来了',
  },
  bad: {
    band: 'bg-rose-600',
    accent: 'ring-rose-300',
    text: 'text-white',
    emoji: '⚠️',
    label: '小麻烦',
  },
  mixed: {
    band: 'bg-amber-500',
    accent: 'ring-amber-300',
    text: 'text-slate-950',
    emoji: '✨',
    label: '有得有失',
  },
};

const signed = (value: number): string => (value > 0 ? `+${value}` : `${value}`);

type EffectRowProps = {
  icon: string;
  label: string;
  value: number;
  suffix: string;
};

const EffectRow = ({ icon, label, value, suffix }: EffectRowProps) => {
  if (value === 0) return null;
  const positive = value > 0;
  return (
    <div
      className={`flex items-center justify-between rounded-xl px-4 py-2 text-lg font-bold ${
        positive ? 'bg-emerald-900/50 text-emerald-100' : 'bg-rose-900/50 text-rose-100'
      }`}
    >
      <span className="flex items-center gap-2">
        <span aria-hidden>{icon}</span>
        <span>{label}</span>
      </span>
      <span>{signed(value)} {suffix}</span>
    </div>
  );
};

export const ChanceCardOverlay = () => {
  const result = useGameStore((s) => s.chanceResult);
  const dismiss = useGameStore((s) => s.dismissChanceResult);
  const game = useGameStore((s) => s.game);
  if (!result || !game) return null;

  const theme = toneTheme[result.card.tone];
  const answerer = game.players.find((p) => p.id === result.playerId);
  const hasAnyDelta =
    result.actualDelta.money !== 0 ||
    result.actualDelta.streak !== 0 ||
    result.actualDelta.helpCards !== 0;

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="chance-card-title"
      aria-describedby="chance-card-description"
    >
      <div
        className={`w-full max-w-md overflow-hidden rounded-3xl bg-slate-900 shadow-2xl ring-2 animate-chance-flip ${theme.accent}`}
        data-testid="chance-card"
      >
        <div className={`flex items-center gap-3 px-6 py-3 ${theme.band} ${theme.text}`}>
          <span className="text-3xl" aria-hidden>
            {theme.emoji}
          </span>
          <span className="text-lg font-black">{theme.label}</span>
          {answerer ? (
            <span className="ml-auto text-xs opacity-90">当前：{answerer.name}</span>
          ) : null}
        </div>

        <div className="px-6 py-5 text-slate-50">
          <h2 id="chance-card-title" className="text-3xl font-black">
            {result.card.title}
          </h2>
          <p id="chance-card-description" className="mt-2 text-base leading-relaxed text-slate-300">
            {result.card.description}
          </p>

          <div className="mt-5 space-y-2">
            <EffectRow icon="💰" label="奥特币" value={result.actualDelta.money} suffix="金币" />
            <EffectRow icon="🔥" label="连胜" value={result.actualDelta.streak} suffix="" />
            <EffectRow icon="🆘" label="求助卡" value={result.actualDelta.helpCards} suffix="张" />
            {!hasAnyDelta ? (
              <div className="rounded-xl bg-slate-800 px-4 py-2 text-sm text-slate-300">
                什么也没发生（已达上限）
              </div>
            ) : null}
            {result.converted.helpCardToMoney > 0 ? (
              <div className="rounded-xl bg-amber-900/40 px-4 py-2 text-sm text-amber-100">
                求助卡已满，多出的 {result.converted.helpCardToMoney} 张换成 ¥
                {result.converted.helpCardToMoney * HELP_CARD_OVERFLOW_CASH_PER_CARD}
              </div>
            ) : null}
          </div>

          <button
            type="button"
            autoFocus
            onClick={dismiss}
            className={`mt-6 w-full rounded-2xl ${BATTLE_CONTRAST.primaryAction.bgClass} ${BATTLE_CONTRAST.primaryAction.textClass} py-3 text-xl font-black`}
          >
            继续
          </button>
        </div>
      </div>
    </div>
  );
};
