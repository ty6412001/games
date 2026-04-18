import { useGameStore } from '../../stores/gameStore';

export const WeaponAwardToast = () => {
  const toast = useGameStore((s) => s.weaponAwardToast);
  const dismiss = useGameStore((s) => s.dismissWeaponToast);

  if (!toast) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60">
      <div className="rounded-3xl bg-gradient-to-br from-amber-400 to-orange-500 p-8 text-center text-slate-900 shadow-2xl">
        <div className="text-6xl">⚡</div>
        <div className="mt-3 text-2xl font-black">连答三题，武器觉醒！</div>
        <div className="mt-1 text-lg font-bold">{toast.heroName} 解锁：{toast.weaponName}</div>
        <button
          type="button"
          onClick={dismiss}
          className="mt-4 w-full rounded-xl bg-slate-900 px-6 py-3 text-white"
        >
          收下
        </button>
      </div>
    </div>
  );
};
