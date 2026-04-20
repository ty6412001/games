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

export const GameScreen = () => {
  const game = useGameStore((s) => s.game);
  if (!game) return null;

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
    <div className="h-[100svh] overflow-hidden bg-slate-950 p-2 text-slate-50 md:p-3">
      <div
        className="mx-auto grid h-full max-w-[1440px] gap-2"
        style={{
          gridTemplateColumns: 'clamp(200px, 18vw, 260px) minmax(0, 1fr) clamp(200px, 18vw, 260px)',
        }}
      >
        <CurrentPlayerSpotlight />
        <div className="flex min-h-0 min-w-0 flex-col items-center justify-center gap-2">
          <DeckerStatusBar />
          <div className="aspect-square h-full max-h-full max-w-full">
            <Board />
          </div>
        </div>
        <Leaderboard />
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
