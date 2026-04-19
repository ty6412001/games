import type { Weapon } from '@ultraman/shared';

import { ImageWithFallback } from '../../ui/ImageWithFallback';
import { resolveWeaponImage } from '../assetResolver';

type Props = {
  weapon: Weapon;
  owned: boolean;
  size?: number;
  className?: string;
};

export const WeaponIcon = ({ weapon, owned, size = 48, className }: Props) => {
  const fallback = (
    <span className="select-none" style={{ fontSize: Math.round(size * 0.45) }}>
      {owned ? '⚡' : '🔒'}
    </span>
  );

  return (
    <div
      className={`flex items-center justify-center overflow-hidden rounded-lg ${
        owned ? 'bg-amber-400/20' : 'bg-slate-800/70'
      } ${className ?? ''}`}
      style={{ width: size, height: size }}
    >
      <ImageWithFallback
        src={resolveWeaponImage(weapon.id, weapon.imageUrl)}
        alt={weapon.name}
        className="h-full w-full object-contain"
        fallback={fallback}
      />
    </div>
  );
};
