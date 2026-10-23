import { useRef, type KeyboardEvent, type ReactNode } from 'react';
import { cn } from './cn';

export interface TabItem<T extends string = string> {
  id: T;
  label: ReactNode;
  count?: number;
  icon?: ReactNode;
}

interface TabsProps<T extends string> {
  items: TabItem<T>[];
  value: T;
  onChange: (id: T) => void;
  className?: string;
  ariaLabel?: string;
  size?: 'md' | 'lg';
}

/** Pestañas subrayadas con contadores y navegación por flechas. */
export function Tabs<T extends string>({ items, value, onChange, className, ariaLabel = 'Pestañas', size = 'md' }: TabsProps<T>) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  const onKey = (e: KeyboardEvent, i: number) => {
    let next = -1;
    if (e.key === 'ArrowRight') next = (i + 1) % items.length;
    if (e.key === 'ArrowLeft') next = (i - 1 + items.length) % items.length;
    if (e.key === 'Home') next = 0;
    if (e.key === 'End') next = items.length - 1;
    if (next >= 0) {
      e.preventDefault();
      refs.current[next]?.focus();
      onChange(items[next].id);
    }
  };

  return (
    <div role="tablist" aria-label={ariaLabel} className={cn('hide-scrollbar flex gap-1 overflow-x-auto border-b border-line', className)}>
      {items.map((t, i) => {
        const active = t.id === value;
        return (
          <button
            key={t.id}
            ref={(el) => (refs.current[i] = el)}
            role="tab"
            type="button"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(t.id)}
            onKeyDown={(e) => onKey(e, i)}
            className={cn(
              'relative -mb-px inline-flex shrink-0 items-center gap-2 border-b-2 px-3 font-medium transition-colors',
              size === 'lg' ? 'h-14 text-lg' : 'h-11 text-sm',
              active ? 'border-accent text-fg' : 'border-transparent text-muted hover:text-fg'
            )}
          >
            {t.icon}
            {t.label}
            {typeof t.count === 'number' && (
              <span
                className={cn(
                  'tnum inline-flex min-w-[22px] items-center justify-center rounded-full px-1.5 font-semibold',
                  size === 'lg' ? 'h-7 text-sm' : 'h-5 text-[11px]',
                  active ? 'bg-accent-soft text-accent-strong' : 'bg-surface-2 text-muted'
                )}
              >
                {t.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export interface SegmentOption<T extends string = string> {
  value: T;
  label: ReactNode;
  icon?: ReactNode;
  ariaLabel?: string;
}

interface SegmentedProps<T extends string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
  ariaLabel?: string;
  size?: 'sm' | 'md';
}

/** Control segmentado (p. ej. Tablero / Lista, rangos de fechas). */
export function SegmentedControl<T extends string>({ options, value, onChange, className, ariaLabel, size = 'md' }: SegmentedProps<T>) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className={cn('inline-flex rounded-[10px] border border-line bg-surface-2 p-0.5', className)}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={o.ariaLabel}
            onClick={() => onChange(o.value)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-lg font-medium transition-colors',
              size === 'sm' ? 'h-7 px-2.5 text-xs' : 'h-8 px-3 text-[13px]',
              active ? 'bg-surface text-fg shadow-sm ring-1 ring-line' : 'text-muted hover:text-fg'
            )}
          >
            {o.icon}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
