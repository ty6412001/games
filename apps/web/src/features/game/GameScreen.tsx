import { BossScene } from '../boss/BossScene';
import { Board } from '../board/Board';
import { LandingOverlay } from '../board/LandingOverlay';
import { ChanceCardOverlay } from '../chance/ChanceCardOverlay';
import { DeckerStatusBar } from '../decker/DeckerStatusBar';
import { FormTransitionOverlay } from '../decker/FormTransitionOverlay';
import { BattleEffect } from '../effects/BattleEffect';
import { QuizModal } from '../quiz/QuizModal';
import { QuizResultToast } from '../quiz/QuizResultToast';
import { SubjectSelector } from '../quiz/SubjectSelector';
import { SettleScreen } from '../settle/SettleScreen';
import { WeaponAwardToast } from '../weapons/WeaponAwardToast';
import { CurrentPlayerSpotlight } from './CurrentPlayerSpotlight';
import { Leaderboard } from './Leaderboard';
import { useGameStore } from '../../stores/gameStore';
import { HeroAvatar } from '../../theme/ultraman/HeroAvatar';

export const GameScreen = () => {
  const game = useGameStore((s) => s.game);
  if (!game) return null;
  const current = game.players[game.currentTurn];

  if (game.phase === 'boss') {
    return (
      <div className="text-slate-50">
        <BossScene />
        <SubjectSelector />
        <QuizModal />
        <BattleEffect />
        <QuizResultToast />
        <WeaponAwardToast />
        <FormTransitionOverlay />
      </div>
    );
  }

  return (
    <div className="min-h-[100svh] overflow-x-hidden px-3 py-3 text-slate-50 md:px-4 md:py-4 lg:h-[100svh] lg:overflow-hidden">
      <div className="mx-auto flex min-h-[calc(100svh-1.5rem)] max-w-[1520px] flex-col gap-3 lg:h-full lg:min-h-0">
        <DeckerStatusBar compact />
        <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="flex min-h-0 min-w-0 flex-col gap-3">
            <CurrentPlayerSpotlight />
            <div className="panel-soft flex min-h-0 flex-1 items-center justify-center rounded-[2rem] p-3">
              <div className="aspect-square h-full max-h-full w-auto max-w-full">
                <Board
                  centerContent={
                    current ? (
                      <div className="flex h-full flex-col items-center justify-center px-8 text-center">
                        <div className="eyebrow">Board Phase</div>
                        <HeroAvatar
                          heroId={current.hero.heroId}
                          size="md"
                          badge={current.hero.badge}
                          className="mt-4 shadow-[0_24px_48px_-26px_rgba(15,23,42,0.9)]"
                        />
                        <div className="mt-5 text-3xl font-black text-white md:text-4xl">
                          轮到 {current.name}
                        </div>
                        <div className="mt-2 max-w-sm text-sm leading-6 text-slate-300 md:text-base">
                          先掷骰，再根据落点处理事件。买地、答题和打怪会自动接到下一步流程里。
                        </div>
                        <div className="mt-5 flex flex-wrap justify-center gap-2 text-xs text-slate-400 md:text-sm">
                          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
                            第 {game.week} 周
                          </span>
                          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
                            {game.durationMin} 分钟
                          </span>
                          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
                            {game.players.length} 位玩家
                          </span>
                        </div>
                      </div>
                    ) : undefined
                  }
                />
              </div>
            </div>
          </div>
          <Leaderboard />
        </div>
      </div>
      <LandingOverlay />
      <ChanceCardOverlay />
      <SubjectSelector />
      <QuizModal />
      <BattleEffect />
      <QuizResultToast />
      <WeaponAwardToast />
      <FormTransitionOverlay />
      {game.phase === 'settle' ? <SettleScreen /> : null}
    </div>
  );
};
