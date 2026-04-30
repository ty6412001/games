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
    <section className="panel-strong rounded-[2rem] p-4 md:p-5">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_220px] xl:items-center">
        <div className="space-y-4">
          <div className="flex items-center gap-4" key={current.id}>
            <HeroAvatar heroId={current.hero.heroId} size="lg" badge={current.hero.badge} />
            <div className="min-w-0">
              <div className="eyebrow">Current Turn</div>
              <div className="mt-2 flex items-center gap-2 text-3xl font-black text-white">
                <span className="truncate">{current.name}</span>
                {current.isChild ? <span className="text-lg text-amber-300">👶</span> : null}
              </div>
              <div className="mt-1 text-base text-slate-300">
                {hero.name} · {hero.tagline}
              </div>
              <div className="mt-3 text-sm leading-6 text-slate-400">
                第 {game.week} 周。先掷骰，再根据落点决定买地、答题或进入战斗。
              </div>
            </div>
          </div>

          <div className="grid gap-2 text-sm sm:grid-cols-2">
            <Stat icon="💰" label="金币" value={current.money} />
            <Stat icon="🏠" label="地块" value={current.ownedTiles.length} />
            <Stat icon="🎫" label="求助卡" value={current.helpCards} />
            <Stat icon="🔥" label="连对" value={current.streak} />
            <div className="rounded-[1.25rem] border border-white/8 bg-white/5 px-3 py-3 sm:col-span-2">
              <div className="text-xs uppercase tracking-[0.22em] text-slate-500">装备状态</div>
              <div className="mt-1 text-sm font-bold text-slate-200">
                {equipped ? `⚡ ${equipped.name}` : '当前未装备武器'}
              </div>
            </div>
          </div>
        </div>

        <div className="flex h-full flex-col justify-between gap-4 xl:items-end">
          <GameTimer />
          <DicePanel />
        </div>
      </div>
    </section>
  );
};

const Stat = ({ icon, label, value }: { icon: string; label: string; value: number }) => (
  <div className="rounded-[1.25rem] border border-white/8 bg-white/5 px-3 py-3">
    <div className="flex items-center justify-between gap-3">
      <span className="text-lg">{icon}</span>
      <div className="text-right leading-tight">
        <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{label}</div>
        <div className="mt-1 text-2xl font-black text-white">{value}</div>
      </div>
    </div>
  </div>
);
