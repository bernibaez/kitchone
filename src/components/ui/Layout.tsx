import type { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import { cn, toneSoft, type Tone } from './cn';

/* -------------------------------- PageHeader -------------------------------- */

interface PageHeaderProps {
  breadcrumb?: string[];
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

/** Encabezado de página: breadcrumb pequeño + título grande + acciones a la derecha. */
export function PageHeader({ breadcrumb, title, description, actions, className }: PageHeaderProps) {
  return (
    <header className={cn('mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between', className)}>
      <div className="min-w-0">
        {breadcrumb && breadcrumb.length > 0 && (
          <nav aria-label="Ruta" className="mb-1.5">
            <ol className="flex flex-wrap items-center gap-1 text-[13px] text-muted">
              {breadcrumb.map((b, i) => (
                <li key={b + i} className="flex items-center gap-1">
                  {i > 0 && <ChevronRight className="h-3.5 w-3.5" aria-hidden />}
                  <span className={i === breadcrumb.length - 1 ? 'font-medium text-fg' : undefined}>{b}</span>
                </li>
              ))}
            </ol>
          </nav>
        )}
        <h1 className="text-[28px] font-bold leading-tight text-fg sm:text-[32px]">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

/* --------------------------------- StatCard --------------------------------- */

interface StatCardProps {
  label: ReactNode;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  tone?: Tone;
  trend?: { value: string; positive?: boolean };
  className?: string;
  onClick?: () => void;
}

/** Tarjeta de KPI plana con borde 1px y sombra solo en hover. */
export function StatCard({ label, value, hint, icon, tone = 'neutral', trend, className, onClick }: StatCardProps) {
  const Comp = onClick ? 'button' : 'div';
  return (
    <Comp
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cn('card card-hover flex flex-col p-5 text-left', onClick && 'cursor-pointer', className)}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="text-[13px] font-medium text-muted">{label}</span>
        {icon && <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', toneSoft[tone])}>{icon}</span>}
      </div>
      <div className="tnum mt-3 font-display text-[28px] font-bold leading-none text-fg">{value}</div>
      {(hint || trend) && (
        <div className="mt-2.5 flex flex-wrap items-center gap-2 text-[13px] text-muted">
          {trend && (
            <span className={cn('tnum font-semibold', trend.positive ? 'text-ok' : 'text-bad')}>{trend.value}</span>
          )}
          {hint}
        </div>
      )}
    </Comp>
  );
}

/* --------------------------------- Sparkline -------------------------------- */

/** Mini gráfico de línea en SVG que usa currentColor. */
export function Sparkline({ data, className, height = 32, width = 120, label }: { data: number[]; className?: string; height?: number; width?: number; label?: string }) {
  const max = Math.max(1, ...data);
  const step = data.length > 1 ? width / (data.length - 1) : width;
  const pts = data.map((v, i) => [i * step, height - 2 - (v / max) * (height - 4)] as const);
  const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const area = `${line} L${width},${height} L0,${height} Z`;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className={cn('overflow-visible', className)} role="img" aria-label={label} preserveAspectRatio="none">
      <path d={area} fill="currentColor" opacity={0.12} />
      <path d={line} fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/* ---------------------------------- Panel ----------------------------------- */

/** Tarjeta con encabezado opcional (título + acción). */
export function Panel({ title, action, children, className, bodyClassName, description }: { title?: ReactNode; action?: ReactNode; children: ReactNode; className?: string; bodyClassName?: string; description?: ReactNode }) {
  return (
    <section className={cn('card', className)}>
      {(title || action) && (
        <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
          <div>
            {title && <h2 className="text-base font-bold text-fg">{title}</h2>}
            {description && <p className="mt-0.5 text-[13px] text-muted">{description}</p>}
          </div>
          {action}
        </div>
      )}
      <div className={cn('p-5', bodyClassName)}>{children}</div>
    </section>
  );
}

/** Avatar con iniciales. */
export function Avatar({ name, className, size = 'md' }: { name: string; className?: string; size?: 'sm' | 'md' | 'lg' }) {
  const text = name
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
  const dims = size === 'sm' ? 'h-7 w-7 text-[11px]' : size === 'lg' ? 'h-11 w-11 text-sm' : 'h-9 w-9 text-xs';
  return (
    <span className={cn('inline-flex shrink-0 items-center justify-center rounded-full bg-surface-2 font-semibold text-fg ring-1 ring-line', dims, className)} aria-hidden>
      {text || 'U'}
    </span>
  );
}
