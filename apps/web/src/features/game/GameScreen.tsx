import { Board } from '../board/Board';
import { DicePanel } from '../board/Dice';
import { LandingOverlay } from '../board/LandingOverlay';
import { PlayerPanel } from '../players/PlayerPanel';
import { GameTimer } from './GameTimer';
import { useGameStore } from '../../stores/gameStore';

export const GameScreen = () => {
  const game = useGameStore((s) => s.game);
  if (!game) return null;

  return (
    <div className="min-h-screen bg-slate-950 p-4 text-slate-50">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-xl font-bold">第 {game.week} 周 · 第 {game.currentTurn + 1} 位出手</div>
            <GameTimer />
          </div>
          <Board />
        </div>
        <div className="space-y-4">
          <PlayerPanel />
          <DicePanel />
        </div>
      </div>
      <LandingOverlay />
    </div>
  );
};
