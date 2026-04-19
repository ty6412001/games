import { BossScene } from '../boss/BossScene';
import { Board } from '../board/Board';
import { DicePanel } from '../board/Dice';
import { LandingOverlay } from '../board/LandingOverlay';
import { BattleEffect } from '../effects/BattleEffect';
import { PlayerPanel } from '../players/PlayerPanel';
import { QuizModal } from '../quiz/QuizModal';
import { QuizResultToast } from '../quiz/QuizResultToast';
import { SettleScreen } from '../settle/SettleScreen';
import { WeaponAwardToast } from '../weapons/WeaponAwardToast';
import { GameTimer } from './GameTimer';
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

  const compactPanel = game.players.length >= 4;

  return (
    <div className="h-[100svh] overflow-hidden bg-slate-950 p-3 text-slate-50 md:p-4">
      <div className="mx-auto grid h-full max-w-[1180px] grid-cols-1 grid-rows-[auto_1fr] gap-3 lg:grid-cols-[1fr_300px] lg:grid-rows-1">
        <div className="flex min-h-0 flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="text-lg font-bold md:text-xl">
              第 {game.week} 周 · 第 {game.currentTurn + 1} 位出手
            </div>
            <GameTimer />
          </div>
          <div className="min-h-0 flex-1 overflow-hidden">
            <Board />
          </div>
        </div>
        <div className="flex min-h-0 flex-col gap-3 overflow-hidden">
          <div className="min-h-0 flex-1 overflow-y-auto pr-1">
            <PlayerPanel compact={compactPanel} />
          </div>
          <DicePanel />
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
