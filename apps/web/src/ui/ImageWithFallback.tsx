import { useEffect, useState, type ReactNode } from 'react';

type Props = {
  src: string;
  alt: string;
  className?: string;
  fallback: ReactNode;
};

export const ImageWithFallback = ({ src, alt, className, fallback }: Props) => {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (failed) return <>{fallback}</>;

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setFailed(true)}
      loading="lazy"
      draggable={false}
    />
  );
};
