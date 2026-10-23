import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from './cn';

export type ButtonVariant = 'pri' | 'acc' | 'ghost' | 'outline' | 'danger' | 'icon';
export type ButtonSize = 'sm' | 'md' | 'lg';

const base =
  'inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-[10px] font-semibold transition-colors duration-150 disabled:pointer-events-none disabled:opacity-50';

const variants: Record<ButtonVariant, string> = {
  pri: 'bg-ink text-ink-on hover:bg-ink-hover',
  acc: 'bg-accent-strong text-accent-on hover:bg-accent-strong/90',
  ghost: 'text-fg hover:bg-surface-2',
  outline: 'border border-line bg-surface text-fg hover:border-line-strong hover:bg-surface-2',
  danger: 'bg-bad-soft text-bad hover:bg-bad hover:text-white dark:hover:text-bg',
  icon: 'text-muted hover:bg-surface-2 hover:text-fg',
};

const sizes: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-[13px]',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-5 text-[15px]',
};

const iconSizes: Record<ButtonSize, string> = {
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-12 w-12',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  block?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'pri', size = 'md', loading, leftIcon, rightIcon, block, className, children, type = 'button', disabled, ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(base, variants[variant], variant === 'icon' ? iconSizes[size] : sizes[size], block && 'w-full', className)}
      {...rest}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : leftIcon}
      {children}
      {!loading && rightIcon}
    </button>
  );
});

export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label'> {
  /** Texto accesible obligatorio (aria-label + tooltip). */
  label: string;
  size?: ButtonSize;
  variant?: Extract<ButtonVariant, 'icon' | 'outline' | 'ghost' | 'pri' | 'danger'>;
  active?: boolean;
}

/** Botón solo-icono: siempre lleva aria-label. */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, size = 'md', variant = 'icon', active, className, children, type = 'button', ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      className={cn(
        base,
        variants[variant],
        iconSizes[size],
        'px-0',
        active && 'bg-surface-2 text-fg',
        className
      )}
      {...rest}
    >
      {children}
    </button>
  );
});
