import type { ReactNode } from 'react';

import { ImageWithFallback } from '../../ui/ImageWithFallback';
import { resolveMonsterImage } from '../assetResolver';

export type MonsterSize = 'sm' | 'md' | 'lg' | 'xl';

type Props = {
  bossId: string;
  explicitUrl?: string;
  size?: MonsterSize;
  fallback?: ReactNode;
  className?: string;
};

const SIZE_PX: Record<MonsterSize, number> = {
  sm: 48,
  md: 96,
  lg: 160,
  xl: 240,
};

export const MonsterSprite = ({ bossId, explicitUrl, size = 'md', fallback, className }: Props) => {
  const dim = SIZE_PX[size];
  const defaultFallback = (
    <span className="select-none" style={{ fontSize: Math.round(dim * 0.6) }}>
      🧟
    </span>
  );

  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden rounded-2xl bg-rose-950/50 ${className ?? ''}`}
      style={{ width: dim, height: dim }}
    >
      <ImageWithFallback
        src={resolveMonsterImage(bossId, explicitUrl)}
        alt={bossId}
        className="h-full w-full object-contain"
        fallback={fallback ?? defaultFallback}
      />
    </div>
  );
};
