import type { HeroId } from '@ultraman/shared';

import { HeroAvatar } from '../../theme/ultraman/HeroAvatar';
import { WeaponIcon } from '../../theme/ultraman/WeaponIcon';
import { getHero } from '../../theme/ultraman/heroes';
import { getHeroWeapons } from '../../theme/ultraman/weapons';

type Props = {
  heroId: HeroId;
  ownedWeaponIds: readonly string[];
};

export const WeaponCabinet = ({ heroId, ownedWeaponIds }: Props) => {
  const hero = getHero(heroId);
  const weapons = getHeroWeapons(heroId);
  const owned = new Set(ownedWeaponIds);

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900/70 p-3">
      <div className="mb-2 flex items-center gap-2">
        <HeroAvatar heroId={heroId} size="sm" />
        <span className="text-sm font-bold">{hero.name} 武器库</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {weapons.map((w) => {
          const has = owned.has(w.id);
          return (
            <div
              key={w.id}
              className={`flex items-center gap-2 rounded-lg border px-2 py-2 text-xs ${
                has
                  ? 'border-amber-400 bg-amber-400/10 text-amber-200'
                  : 'border-slate-700 bg-slate-800/50 text-slate-500 opacity-60'
              }`}
            >
              <WeaponIcon weapon={w} owned={has} size={36} />
              <div className="min-w-0 flex-1">
                <div className="truncate font-bold">{w.name}</div>
                <div className="text-[10px]">
                  {w.rarity === 'rare' ? '稀有' : '普通'} · +{w.combatPowerBonus}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
