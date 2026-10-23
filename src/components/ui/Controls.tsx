import type { InputHTMLAttributes, ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Minus, Search, X } from 'lucide-react';
import { cn } from './cn';

/* ---------------------------------- BulkBar --------------------------------- */

interface BulkBarProps {
  count: number;
  onClear: () => void;
  children: ReactNode;
  noun?: [string, string];
}

/** Barra flotante de acciones masivas; aparece cuando hay elementos seleccionados. */
export function BulkBar({ count, onClear, children, noun = ['seleccionada', 'seleccionadas'] }: BulkBarProps) {
  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ type: 'spring', stiffness: 420, damping: 34 }}
          className="fixed inset-x-0 bottom-5 z-[55] flex justify-center px-4"
          role="region"
          aria-label="Acciones masivas"
        >
          <div className="flex items-center gap-2 rounded-panel bg-ink py-2 pl-4 pr-2 text-ink-on shadow-pop">
            <span className="tnum mr-2 text-sm font-semibold">
              {count} {count === 1 ? noun[0] : noun[1]}
            </span>
            <span className="h-5 w-px bg-ink-on/20" aria-hidden />
            <div className="flex items-center gap-1.5">{children}</div>
            <button
              type="button"
              onClick={onClear}
              aria-label="Limpiar selección"
              className="ml-1 inline-flex h-9 w-9 items-center justify-center rounded-lg text-ink-on/80 hover:bg-ink-on/10 hover:text-ink-on"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Botón para usar dentro de BulkBar (sobre fondo ink). */
export function BulkAction({ children, onClick, icon, primary }: { children: ReactNode; onClick: () => void; icon?: ReactNode; primary?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-[13px] font-semibold transition-colors',
        primary ? 'bg-accent-strong text-accent-on hover:bg-accent-strong/90' : 'text-ink-on hover:bg-ink-on/10'
      )}
    >
      {icon}
      {children}
    </button>
  );
}

/* -------------------------------- EmptyState -------------------------------- */

export function EmptyState({ icon, title, description, action, className, compact }: { icon?: ReactNode; title: ReactNode; description?: ReactNode; action?: ReactNode; className?: string; compact?: boolean }) {
  return (
    <div className={cn('flex flex-col items-center justify-center text-center', compact ? 'px-4 py-8' : 'px-6 py-14', className)}>
      {icon && (
        <div className={cn('mb-4 flex items-center justify-center rounded-2xl bg-surface-2 text-muted', compact ? 'h-11 w-11' : 'h-14 w-14')}>
          {icon}
        </div>
      )}
      <p className={cn('font-display font-bold text-fg', compact ? 'text-base' : 'text-lg')}>{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/* ---------------------------------- Switch ---------------------------------- */

interface SwitchProps {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  /** Muestra el texto de la etiqueta al lado. */
  showLabel?: boolean;
  disabled?: boolean;
  size?: 'sm' | 'md';
  onLabel?: string;
  offLabel?: string;
}

export function Switch({ checked, onChange, label, showLabel, disabled, size = 'md', onLabel, offLabel }: SwitchProps) {
  const dims = size === 'sm' ? { track: 'h-5 w-9', knob: 'h-4 w-4', on: 'translate-x-4' } : { track: 'h-6 w-11', knob: 'h-5 w-5', on: 'translate-x-5' };
  const stateText = checked ? onLabel : offLabel;
  return (
    <label className={cn('inline-flex select-none items-center gap-2', disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer')}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={(e) => {
          e.stopPropagation();
          onChange(!checked);
        }}
        className={cn('relative inline-flex shrink-0 items-center rounded-full p-0.5 transition-colors', dims.track, checked ? 'bg-ok' : 'bg-line-strong')}
      >
        <span className={cn('rounded-full bg-white shadow-sm transition-transform dark:bg-surface', dims.knob, checked ? dims.on : 'translate-x-0')} />
      </button>
      {(showLabel || stateText) && <span className={cn('text-[13px] font-medium', checked ? 'text-ok' : 'text-muted')}>{stateText ?? label}</span>}
    </label>
  );
}

/* --------------------------------- Checkbox --------------------------------- */

interface CheckboxProps {
  checked: boolean;
  indeterminate?: boolean;
  onChange: (v: boolean) => void;
  label: string;
  className?: string;
}

/** Casilla accesible (botón role=checkbox) que no propaga el clic. */
export function Checkbox({ checked, indeterminate, onChange, label, className }: CheckboxProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={indeterminate ? 'mixed' : checked}
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation();
        onChange(!checked);
      }}
      onKeyDown={(e) => e.stopPropagation()}
      className={cn(
        'inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] border transition-colors',
        checked || indeterminate ? 'border-ink bg-ink text-ink-on' : 'border-line-strong bg-surface hover:border-muted',
        className
      )}
    >
      {indeterminate ? <Minus className="h-3 w-3" strokeWidth={3} /> : checked ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
    </button>
  );
}

/* -------------------------------- SearchInput ------------------------------- */

interface SearchInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value: string;
  onChange: (v: string) => void;
  wrapperClassName?: string;
}

export function SearchInput({ value, onChange, wrapperClassName, className, placeholder = 'Buscar…', ...rest }: SearchInputProps) {
  return (
    <div className={cn('relative', wrapperClassName)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={rest['aria-label'] ?? placeholder}
        className={cn('field pl-9 pr-8 [&::-webkit-search-cancel-button]:hidden', className)}
        {...rest}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Limpiar búsqueda"
          className="absolute right-1.5 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-muted hover:bg-surface-2 hover:text-fg"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

/* ---------------------------------- Field ----------------------------------- */

export function Field({ label, hint, children, className, htmlFor }: { label: ReactNode; hint?: ReactNode; children: ReactNode; className?: string; htmlFor?: string }) {
  return (
    <div className={className}>
      <label className="field-label" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {hint && <p className="mt-1.5 text-xs text-muted">{hint}</p>}
    </div>
  );
}

/* --------------------------------- Spinner ---------------------------------- */

export function Spinner({ className, label = 'Cargando' }: { className?: string; label?: string }) {
  return (
    <div role="status" aria-label={label} className={cn('flex items-center justify-center py-16', className)}>
      <span className="h-8 w-8 animate-spin rounded-full border-[3px] border-line border-t-accent" />
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-lg bg-surface-2', className)} aria-hidden />;
}
