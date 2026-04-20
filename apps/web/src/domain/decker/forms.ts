export type DeckerForm = 'flash' | 'miracle' | 'strong' | 'dynamic';

export const FORM_ORDER: readonly DeckerForm[] = ['flash', 'miracle', 'strong', 'dynamic'];

export const FORM_THRESHOLDS: Record<DeckerForm, number> = {
  flash: 0,
  miracle: 30,
  strong: 60,
  dynamic: 100,
};

export const FORM_LABEL: Record<DeckerForm, string> = {
  flash: '闪耀型',
  miracle: '奇迹型',
  strong: '强力型',
  dynamic: '动力型',
};

export const formFromEnergy = (energy: number, current: DeckerForm): DeckerForm => {
  let target: DeckerForm = 'flash';
  for (const form of FORM_ORDER) {
    if (energy >= FORM_THRESHOLDS[form]) target = form;
  }
  const targetIdx = FORM_ORDER.indexOf(target);
  const currentIdx = FORM_ORDER.indexOf(current);
  return targetIdx > currentIdx ? target : current;
};

export const isAtLeast = (current: DeckerForm, bar: DeckerForm): boolean =>
  FORM_ORDER.indexOf(current) >= FORM_ORDER.indexOf(bar);
