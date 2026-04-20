import { useEffect, useRef, useState, type ReactNode } from 'react';

import { GLOSS, type GlossKey } from '../config/terms';

type Props = {
  term: GlossKey;
  children: ReactNode;
};

export const TermGloss = ({ term, children }: Props) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const handle = (event: MouseEvent) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open]);

  return (
    <span ref={rootRef} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        onMouseEnter={() => setOpen(true)}
        className="cursor-help underline decoration-amber-300 decoration-dotted underline-offset-4"
        aria-expanded={open}
        aria-label={`查看说明：${GLOSS[term]}`}
      >
        {children}
      </button>
      {open ? (
        <span
          role="tooltip"
          className="absolute left-1/2 top-full z-50 mt-2 w-56 -translate-x-1/2 rounded-2xl bg-slate-800 px-3 py-2 text-sm font-semibold text-amber-100 shadow-xl ring-2 ring-amber-300/60"
        >
          {GLOSS[term]}
        </span>
      ) : null}
    </span>
  );
};
