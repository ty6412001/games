import { useState } from 'react';

type Props = {
  onSubmit: (value: string) => void | Promise<void>;
  placeholder?: string;
  maxLength?: number;
};

const DIGIT_KEYS: readonly string[] = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

export const DigitKeypad = ({ onSubmit, placeholder = '用下面的数字键', maxLength = 6 }: Props) => {
  const [value, setValue] = useState('');

  const append = (digit: string) => {
    if (value.length >= maxLength) return;
    setValue((prev) => prev + digit);
  };

  const clear = () => setValue('');

  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    void onSubmit(trimmed);
  };

  return (
    <div className="flex flex-col gap-3">
      <div
        aria-live="polite"
        className="flex h-16 items-center justify-center rounded-2xl bg-slate-800/80 px-4 font-digit text-3xl font-black tracking-widest text-amber-200 shadow-inner"
      >
        {value || <span className="font-kid text-base text-slate-500">{placeholder}</span>}
      </div>
      <div className="grid grid-cols-3 gap-3">
        {DIGIT_KEYS.map((digit) => (
          <button
            key={digit}
            type="button"
            onClick={() => append(digit)}
            className="min-h-[80px] rounded-2xl bg-slate-700 text-3xl font-black text-slate-50 shadow-md transition active:scale-95 hover:bg-slate-600"
          >
            {digit}
          </button>
        ))}
        <button
          type="button"
          onClick={clear}
          className="min-h-[80px] rounded-2xl bg-slate-800 text-lg font-black text-slate-200 shadow-md transition active:scale-95 hover:bg-slate-700"
        >
          清空
        </button>
        <button
          type="button"
          onClick={() => append('0')}
          className="min-h-[80px] rounded-2xl bg-slate-700 text-3xl font-black text-slate-50 shadow-md transition active:scale-95 hover:bg-slate-600"
        >
          0
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={!value}
          className="min-h-[80px] rounded-2xl bg-amber-400 text-xl font-black text-slate-900 shadow-md transition active:scale-95 hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-40"
        >
          确认
        </button>
      </div>
    </div>
  );
};
