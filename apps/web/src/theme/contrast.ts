const hexToRgb = (hex: string): [number, number, number] => {
  const m = hex.replace('#', '');
  const n = parseInt(m, 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
};

const channelLin = (c: number): number => {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
};

export const relLuminance = (hex: string): number => {
  const [r, g, b] = hexToRgb(hex);
  return 0.2126 * channelLin(r) + 0.7152 * channelLin(g) + 0.0722 * channelLin(b);
};

export const contrastRatio = (a: string, b: string): number => {
  const la = relLuminance(a);
  const lb = relLuminance(b);
  const [L1, L2] = la >= lb ? [la, lb] : [lb, la];
  return (L1 + 0.05) / (L2 + 0.05);
};

export type ContrastToken = {
  readonly textClass: string;
  readonly bgClass: string;
  readonly textHex: string;
  readonly bgHex: string;
};

export const BATTLE_CONTRAST = {
  primaryAction: {
    textClass: 'text-slate-950',
    bgClass: 'bg-amber-300',
    textHex: '#020617',
    bgHex: '#fcd34d',
  },
  secondaryAction: {
    textClass: 'text-slate-50',
    bgClass: 'bg-slate-800',
    textHex: '#f8fafc',
    bgHex: '#1e293b',
  },
  statPanel: {
    textClass: 'text-white',
    bgClass: 'bg-rose-950',
    textHex: '#ffffff',
    bgHex: '#4c0519',
  },
  toastAction: {
    textClass: 'text-white',
    bgClass: 'bg-slate-900',
    textHex: '#ffffff',
    bgHex: '#0f172a',
  },
} as const satisfies Record<string, ContrastToken>;
