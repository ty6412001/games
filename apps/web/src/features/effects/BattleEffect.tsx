import { useEffect, useState } from 'react';

import { BATTLE_EFFECT_DURATION_MS } from '../../config/features';
import { useGameStore } from '../../stores/gameStore';
import { MonsterSprite } from '../../theme/ultraman/MonsterSprite';

const inferBossId = (result: { bossId?: string; contextKind: string }): string | null => {
  if (result.bossId) return result.bossId;
  if (result.contextKind === 'monster') return 'generic-monster';
  return null;
};

export const BattleEffect = () => {
  const result = useGameStore((s) => s.quizResult);
  const [phase, setPhase] = useState<'idle' | 'playing'>('idle');
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (result?.correct) {
      setNonce((n) => n + 1);
      setPhase('playing');
      const t = window.setTimeout(() => setPhase('idle'), BATTLE_EFFECT_DURATION_MS);
      return () => window.clearTimeout(t);
    }
    return undefined;
  }, [result]);

  if (phase !== 'playing' || !result) return null;

  const bossId = inferBossId(result);
  const showMonster = bossId !== null;

  return (
    <div
      key={nonce}
      className="pointer-events-none fixed inset-0 z-45 flex items-center justify-center"
      aria-hidden
    >
      <div className="absolute inset-0 animate-battle-flash bg-amber-200/40 mix-blend-screen" />
      <div className="absolute h-1.5 w-[160%] origin-left animate-battle-ray bg-gradient-to-r from-cyan-200 via-white to-yellow-200" />
      {showMonster ? (
        <div className="animate-battle-monster">
          <MonsterSprite bossId={bossId!} size="xl" />
        </div>
      ) : (
        <div className="animate-battle-monster text-9xl">⚔️</div>
      )}
      <div className="absolute animate-battle-explosion text-9xl">💥</div>
    </div>
  );
};
