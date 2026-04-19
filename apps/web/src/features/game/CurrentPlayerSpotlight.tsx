import { useGameStore } from '../../stores/gameStore';
import { HeroAvatar } from '../../theme/ultraman/HeroAvatar';
import { getHero } from '../../theme/ultraman/heroes';
import { getWeapon } from '../../theme/ultraman/weapons';
import { DicePanel } from '../board/Dice';
import { GameTimer } from './GameTimer';

export const CurrentPlayerSpotlight = () => {
  const game = useGameStore((s) => s.game);
  if (!game) return null;
  const current = game.players[game.currentTurn];
  if (!current) return null;
  const hero = getHero(current.hero.heroId);
  const equipped = current.equippedWeaponId ? getWeapon(current.equippedWeaponId) : null;

  return (
    <div className="flex h-full flex-col gap-2 rounded-2xl bg-slate-900/70 p-3">
      <div className="flex items-center justify-between text-xs text-slate-300">
        <span className="font-bold">第 {game.week} 周</span>
        <GameTimer />
      </div>

      <div className="flex items-center justify-center" key={current.id}>
        <HeroAvatar heroId={current.hero.heroId} size="xl" badge={current.hero.badge} />
      </div>

      <div className="text-center">
        <div className="flex items-center justify-center gap-1 text-xl font-black">
          <span>{current.name}</span>
          {current.isChild ? <span className="text-base text-amber-300">👶</span> : null}
        </div>
        <div className="text-sm text-slate-400">
          {hero.name} · {hero.tagline}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm">
        <Stat icon="💰" label="金币" value={current.money} />
        <Stat icon="🏠" label="地产" value={current.ownedTiles.length} />
        <Stat icon="🎫" label="求助卡" value={current.helpCards} />
        <Stat icon="🔥" label="连对" value={current.streak} />
      </div>

      {equipped ? (
        <div className="rounded-xl bg-slate-800/80 px-3 py-2 text-center text-xs">
          <div className="text-slate-400">已装备</div>
          <div className="font-bold text-amber-300">⚡ {equipped.name}</div>
        </div>
      ) : null}

      <div className="mt-auto">
        <DicePanel />
      </div>
    </div>
  );
};

const Stat = ({ icon, label, value }: { icon: string; label: string; value: number }) => (
  <div className="flex items-center gap-2 rounded-lg bg-slate-800/60 px-2 py-1.5">
    <span>{icon}</span>
    <div className="flex-1 text-right leading-tight">
      <div className="text-xs text-slate-400">{label}</div>
      <div className="font-bold">{value}</div>
    </div>
  </div>
);
