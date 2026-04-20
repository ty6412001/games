import { useGameStore } from '../../stores/gameStore';
import {
  FORM_LABEL,
  FORM_ORDER,
  FORM_THRESHOLDS,
  type DeckerForm,
} from '../../domain/decker/forms';

type Props = {
  compact?: boolean;
};

const nextFormThreshold = (current: DeckerForm): number | null => {
  const idx = FORM_ORDER.indexOf(current);
  const next = FORM_ORDER[idx + 1];
  return next ? FORM_THRESHOLDS[next] : null;
};

const formIcon: Record<DeckerForm, string> = {
  flash: '✨',
  miracle: '🌠',
  strong: '💪',
  dynamic: '⚡',
};

export const DeckerStatusBar = ({ compact = false }: Props) => {
  const childId = useGameStore((s) => s.childId);
  const screen = useGameStore((s) => s.screen);
  const decker = useGameStore((s) => s.deckerState);

  if (!childId || screen !== 'playing' || !decker) return null;

  const currentIdx = FORM_ORDER.indexOf(decker.currentForm);
  const barTarget = nextFormThreshold(decker.currentForm);
  const energyPct =
    barTarget === null
      ? 100
      : Math.min(
          100,
          Math.round(
            ((decker.energy - FORM_THRESHOLDS[decker.currentForm]) /
              (barTarget - FORM_THRESHOLDS[decker.currentForm])) *
              100,
          ),
        );
  const dynamicUnlocked = decker.currentForm === 'dynamic';

  return (
    <div
      className={`hud-frame flex items-center gap-3 rounded-2xl px-4 py-2 text-slate-50 ${
        compact ? 'text-xs' : 'text-sm'
      }`}
      data-testid="decker-status-bar"
    >
      <span className="font-kid text-lg font-black text-amber-200">德凯</span>
      <div className="flex items-center gap-1">
        {FORM_ORDER.map((form, idx) => {
          const active = idx <= currentIdx;
          return (
            <span
              key={form}
              aria-label={`${FORM_LABEL[form]}${active ? '（已解锁）' : '（未解锁）'}`}
              className={`flex h-8 w-8 items-center justify-center rounded-full border-2 text-base transition ${
                active
                  ? 'border-amber-300 bg-amber-400/30 text-amber-100'
                  : 'border-slate-600 bg-slate-800/50 text-slate-500'
              }`}
              title={FORM_LABEL[form]}
            >
              {formIcon[form]}
            </span>
          );
        })}
      </div>
      <div className="flex flex-1 flex-col gap-1">
        <div className="flex justify-between text-[10px] uppercase tracking-wide text-slate-400">
          <span>{FORM_LABEL[decker.currentForm]}</span>
          {barTarget === null ? (
            <span>已满</span>
          ) : (
            <span>
              {decker.energy} / {barTarget}
            </span>
          )}
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-400 to-rose-400 transition-all duration-300"
            style={{ width: `${energyPct}%` }}
            data-testid="decker-energy-fill"
          />
        </div>
        {dynamicUnlocked ? (
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-wide text-rose-300">必杀</span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full rounded-full bg-rose-400 transition-all duration-300"
                style={{ width: `${decker.finisherEnergy}%` }}
                data-testid="decker-finisher-fill"
              />
            </div>
            <span className="text-[10px] font-black text-rose-200">{decker.finisherEnergy}/100</span>
          </div>
        ) : null}
      </div>
    </div>
  );
};
