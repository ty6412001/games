import type { ReactNode } from 'react';
import type { HeroId } from '@ultraman/shared';

import { ImageWithFallback } from '../../ui/ImageWithFallback';
import { resolveHeroImage } from '../assetResolver';
import { getHero } from './heroes';

export type HeroAvatarSize = 'sm' | 'md' | 'lg' | 'xl';

type Props = {
  heroId: HeroId;
  size?: HeroAvatarSize;
  fallback?: ReactNode;
  badge?: number;
  className?: string;
};

const SIZE_PX: Record<HeroAvatarSize, number> = {
  sm: 32,
  md: 48,
  lg: 72,
  xl: 128,
};

const FONT_RATIO = 0.5;

export const HeroAvatar = ({ heroId, size = 'md', fallback, badge, className }: Props) => {
  const hero = getHero(heroId);
  const dim = SIZE_PX[size];
  const defaultFallback = (
    <span
      className="font-black"
      style={{ color: hero.accent, fontSize: Math.round(dim * FONT_RATIO) }}
    >
      {hero.name[0]}
    </span>
  );

  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden rounded-xl ${className ?? ''}`}
      style={{ width: dim, height: dim, backgroundColor: hero.color }}
    >
      <ImageWithFallback
        src={resolveHeroImage(heroId, hero.imageUrl)}
        alt={hero.name}
        className="h-full w-full object-contain"
        fallback={fallback ?? defaultFallback}
      />
      {badge && badge > 1 ? (
        <span
          className="absolute bottom-0 right-0 rounded-full bg-white/25 px-1.5 text-[10px] font-bold text-white"
          style={{ lineHeight: 1.5 }}
        >
          #{badge}
        </span>
      ) : null}
    </div>
  );
};
