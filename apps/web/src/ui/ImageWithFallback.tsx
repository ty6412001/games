import { useEffect, useState, type ReactNode } from 'react';

type Props = {
  src: string | readonly string[];
  alt: string;
  className?: string;
  fallback: ReactNode;
};

const normalize = (src: string | readonly string[]): string[] => {
  return Array.isArray(src) ? [...src] : [src as string];
};

export const ImageWithFallback = ({ src, alt, className, fallback }: Props) => {
  const candidates = normalize(src);
  const key = candidates.join('|');
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
  }, [key]);

  if (candidates.length === 0 || index >= candidates.length) {
    return <>{fallback}</>;
  }

  const currentSrc = candidates[index]!;

  return (
    <img
      key={currentSrc}
      src={currentSrc}
      alt={alt}
      className={className}
      onError={() => setIndex((i) => i + 1)}
      loading="lazy"
      draggable={false}
    />
  );
};
