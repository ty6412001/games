import { BossScene } from '../boss/BossScene';
import { Board } from '../board/Board';
import { LandingOverlay } from '../board/LandingOverlay';
import { BattleEffect } from '../effects/BattleEffect';
import { QuizModal } from '../quiz/QuizModal';
import { QuizResultToast } from '../quiz/QuizResultToast';
import { SettleScreen } from '../settle/SettleScreen';
import { WeaponAwardToast } from '../weapons/WeaponAwardToast';
import { CenterControls } from './CenterControls';
import { useGameStore } from '../../stores/gameStore';

export const GameScreen = () => {
  const game = useGameStore((s) => s.game);
  if (!game) return null;

  if (game.phase === 'boss') {
    return (
      <>
        <BossScene />
        <QuizModal />
        <BattleEffect />
        <QuizResultToast />
        <WeaponAwardToast />
      </>
    );
  }

  return (
    <div className="min-h-[100svh] bg-slate-950 p-3 text-slate-50 md:p-4">
      <div className="mx-auto flex h-full max-w-[min(100svh,1180px)] items-center justify-center">
        <div className="aspect-square w-full max-w-[100svh]">
          <Board centerContent={<CenterControls />} />
        </div>
      </div>
      <LandingOverlay />
      <QuizModal />
      <BattleEffect />
      <QuizResultToast />
      <WeaponAwardToast />
      {game.phase === 'settle' ? <SettleScreen /> : null}
    </div>
  );
};
