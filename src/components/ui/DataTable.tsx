import { useMemo, useState, type ReactNode } from 'react';
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from './cn';
import { Checkbox, EmptyState, Skeleton } from './Controls';
import { IconButton } from './Button';

export interface Column<T> {
  key: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  align?: 'left' | 'right' | 'center';
  width?: string;
  /** Si se define, la columna es ordenable. */
  sortValue?: (row: T) => string | number;
  className?: string;
  /** Oculta la columna en pantallas pequeñas. */
  hideBelow?: 'sm' | 'md' | 'lg';
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  selectable?: boolean;
  selected?: Set<string>;
  onSelectedChange?: (next: Set<string>) => void;
  loading?: boolean;
  empty?: ReactNode;
  pageSize?: number;
  initialSort?: { key: string; dir: 'asc' | 'desc' };
  className?: string;
  footer?: ReactNode;
  rowClassName?: (row: T) => string | undefined;
  ariaLabel?: string;
}

const hideCls = { sm: 'hidden sm:table-cell', md: 'hidden md:table-cell', lg: 'hidden lg:table-cell' } as const;
const alignCls = { left: 'text-left', right: 'text-right', center: 'text-center' } as const;

/** Tabla de datos con orden, selección múltiple, paginación y filas clicables. */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  onRowClick,
  selectable,
  selected,
  onSelectedChange,
  loading,
  empty,
  pageSize = 0,
  initialSort,
  className,
  footer,
  rowClassName,
  ariaLabel,
}: DataTableProps<T>) {
  const [sort, setSort] = useState(initialSort);
  const [page, setPage] = useState(0);

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const col = columns.find((c) => c.key === sort.key);
    if (!col?.sortValue) return rows;
    const get = col.sortValue;
    return [...rows].sort((a, b) => {
      const va = get(a);
      const vb = get(b);
      const r = typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb), 'es');
      return sort.dir === 'asc' ? r : -r;
    });
  }, [rows, sort, columns]);

  const pages = pageSize > 0 ? Math.max(1, Math.ceil(sorted.length / pageSize)) : 1;
  const safePage = Math.min(page, pages - 1);
  const visible = pageSize > 0 ? sorted.slice(safePage * pageSize, safePage * pageSize + pageSize) : sorted;

  const sel = selected ?? new Set<string>();
  const visibleKeys = visible.map(rowKey);
  const allChecked = visibleKeys.length > 0 && visibleKeys.every((k) => sel.has(k));
  const someChecked = visibleKeys.some((k) => sel.has(k));

  const toggleAll = () => {
    const next = new Set(sel);
    if (allChecked) visibleKeys.forEach((k) => next.delete(k));
    else visibleKeys.forEach((k) => next.add(k));
    onSelectedChange?.(next);
  };

  const toggleOne = (k: string) => {
    const next = new Set(sel);
    if (next.has(k)) next.delete(k);
    else next.add(k);
    onSelectedChange?.(next);
  };

  const onSort = (key: string) => {
    setSort((s) => (s?.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'desc' }));
  };

  return (
    <div className={cn('card overflow-hidden', className)}>
      <div className="custom-scrollbar overflow-x-auto">
        <table className="tnum w-full border-collapse text-sm" aria-label={ariaLabel}>
          <thead>
            <tr className="border-b border-line bg-surface-2/60">
              {selectable && (
                <th scope="col" className="w-10 px-4 py-2.5">
                  <Checkbox checked={allChecked} indeterminate={!allChecked && someChecked} onChange={toggleAll} label="Seleccionar todo" />
                </th>
              )}
              {columns.map((c) => {
                const active = sort?.key === c.key;
                return (
                  <th
                    key={c.key}
                    scope="col"
                    style={c.width ? { width: c.width } : undefined}
                    aria-sort={active ? (sort!.dir === 'asc' ? 'ascending' : 'descending') : undefined}
                    className={cn(
                      'whitespace-nowrap px-4 py-2.5 text-[12px] font-semibold uppercase tracking-[0.06em] text-muted',
                      alignCls[c.align ?? 'left'],
                      c.hideBelow && hideCls[c.hideBelow]
                    )}
                  >
                    {c.sortValue ? (
                      <button
                        type="button"
                        onClick={() => onSort(c.key)}
                        className={cn('inline-flex items-center gap-1 uppercase hover:text-fg', active && 'text-fg')}
                      >
                        {c.header}
                        {active && (sort!.dir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                      </button>
                    ) : (
                      c.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {loading &&
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={`sk-${i}`} className="border-b border-line last:border-0">
                  {selectable && <td className="px-4 py-3.5" />}
                  {columns.map((c) => (
                    <td key={c.key} className={cn('px-4 py-3.5', c.hideBelow && hideCls[c.hideBelow])}>
                      <Skeleton className="h-4 w-3/4" />
                    </td>
                  ))}
                </tr>
              ))}
            {!loading &&
              visible.map((row) => {
                const k = rowKey(row);
                const isSel = sel.has(k);
                return (
                  <tr
                    key={k}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    onKeyDown={
                      onRowClick
                        ? (e) => {
                            if (e.key === 'Enter') onRowClick(row);
                          }
                        : undefined
                    }
                    tabIndex={onRowClick ? 0 : undefined}
                    className={cn(
                      'border-b border-line transition-colors last:border-0',
                      onRowClick && 'cursor-pointer hover:bg-surface-2/70 focus-visible:bg-surface-2',
                      isSel && 'bg-accent-soft/50',
                      rowClassName?.(row)
                    )}
                  >
                    {selectable && (
                      <td className="px-4 py-3">
                        <Checkbox checked={isSel} onChange={() => toggleOne(k)} label="Seleccionar fila" />
                      </td>
                    )}
                    {columns.map((c) => (
                      <td key={c.key} className={cn('px-4 py-3 text-fg', alignCls[c.align ?? 'left'], c.hideBelow && hideCls[c.hideBelow], c.className)}>
                        {c.cell(row)}
                      </td>
                    ))}
                  </tr>
                );
              })}
          </tbody>
        </table>
        {!loading && visible.length === 0 && (empty ?? <EmptyState title="Sin resultados" description="No hay registros para mostrar." compact />)}
      </div>

      {(pageSize > 0 && sorted.length > pageSize) || footer ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-2.5 text-[13px] text-muted">
          <div>{footer}</div>
          {pageSize > 0 && sorted.length > pageSize && (
            <div className="flex items-center gap-2">
              <span className="tnum">
                {safePage * pageSize + 1}–{Math.min(sorted.length, (safePage + 1) * pageSize)} de {sorted.length}
              </span>
              <IconButton label="Página anterior" size="sm" disabled={safePage === 0} onClick={() => setPage(safePage - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </IconButton>
              <IconButton label="Página siguiente" size="sm" disabled={safePage >= pages - 1} onClick={() => setPage(safePage + 1)}>
                <ChevronRight className="h-4 w-4" />
              </IconButton>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
