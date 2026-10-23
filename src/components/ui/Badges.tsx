import type { ReactNode } from 'react';
import { cn, toneDot, toneSoft, type Tone } from './cn';
import { statusMeta } from '../../lib/format';

interface PillProps {
  tone?: Tone;
  dot?: boolean;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
  size?: 'sm' | 'md';
}

/** Etiqueta redondeada con tono semántico (estados, contadores). */
export function Pill({ tone = 'neutral', dot, icon, children, className, size = 'sm' }: PillProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full font-semibold',
        size === 'sm' ? 'h-6 px-2.5 text-xs' : 'h-7 px-3 text-[13px]',
        toneSoft[tone],
        className
      )}
    >
      {dot && <span className={cn('h-1.5 w-1.5 rounded-full', toneDot[tone])} aria-hidden />}
      {icon}
      {children}
    </span>
  );
}

interface TagProps {
  children: ReactNode;
  icon?: ReactNode;
  className?: string;
  tone?: Tone;
}

/** Etiqueta rectangular con borde, para metadatos (canal, categoría, mesa). */
export function Tag({ children, icon, className, tone }: TagProps) {
  return (
    <span
      className={cn(
        'inline-flex h-6 items-center gap-1 whitespace-nowrap rounded-md border px-2 text-xs font-medium',
        tone ? cn(toneSoft[tone], 'border-transparent') : 'border-line bg-surface text-muted',
        className
      )}
    >
      {icon}
      {children}
    </span>
  );
}

/** Insignia de estado de orden con los nombres de BD (pendiente, en_preparacion…). */
export function StatusBadge({ status, className, size }: { status: string; className?: string; size?: 'sm' | 'md' }) {
  const meta = statusMeta(status);
  return (
    <Pill tone={meta.tone} dot className={className} size={size}>
      {meta.label}
    </Pill>
  );
}
