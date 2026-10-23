import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { CornerDownLeft, Search } from 'lucide-react';
import { cn } from './ui/cn';

export interface CommandItem {
  id: string;
  label: string;
  group: string;
  icon?: ReactNode;
  hint?: string;
  keywords?: string;
  run: () => void;
}

interface Props {
  open: boolean;
  onClose: () => void;
  items: CommandItem[];
}

const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

/** Búsqueda global (⌘K / Ctrl+K): navegación y acciones rápidas. */
export default function CommandPalette({ open, onClose, items }: Props) {
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const results = useMemo(() => {
    const term = normalize(q.trim());
    if (!term) return items;
    return items.filter((i) => normalize(`${i.label} ${i.group} ${i.keywords ?? ''}`).includes(term));
  }, [q, items]);

  useEffect(() => {
    if (open) {
      setQ('');
      setActive(0);
      const t = window.setTimeout(() => inputRef.current?.focus(), 20);
      return () => window.clearTimeout(t);
    }
  }, [open]);

  useEffect(() => setActive(0), [q]);

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const run = (item?: CommandItem) => {
    if (!item) return;
    onClose();
    item.run();
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(results.length - 1, a + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      run(results[active]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  let lastGroup = '';

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[70] flex items-start justify-center px-4 pt-[12vh]" role="presentation">
          <motion.div
            className="absolute inset-0 bg-[rgb(20_16_12/0.38)] backdrop-blur-[3px] dark:bg-black/55"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            aria-hidden
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Búsqueda global"
            className="relative w-full max-w-xl overflow-hidden rounded-panel border border-line bg-surface shadow-pop"
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            onKeyDown={onKey}
          >
            <div className="flex items-center gap-3 border-b border-line px-4">
              <Search className="h-5 w-5 text-muted" aria-hidden />
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar páginas y acciones…"
                aria-label="Buscar páginas y acciones"
                role="combobox"
                aria-expanded="true"
                aria-controls="cmdk-list"
                aria-activedescendant={results[active] ? `cmdk-${results[active].id}` : undefined}
                className="h-14 flex-1 bg-transparent text-[15px] text-fg outline-none placeholder:text-muted"
              />
              <span className="kbd">Esc</span>
            </div>
            <ul id="cmdk-list" ref={listRef} role="listbox" className="custom-scrollbar max-h-[50vh] overflow-y-auto p-2">
              {results.length === 0 && <li className="px-3 py-8 text-center text-sm text-muted">Sin resultados para “{q}”.</li>}
              {results.map((item, i) => {
                const header = item.group !== lastGroup ? item.group : null;
                lastGroup = item.group;
                return (
                  <li key={item.id} role="presentation">
                    {header && <div className="eyebrow px-3 pb-1 pt-3">{header}</div>}
                    <div
                      id={`cmdk-${item.id}`}
                      role="option"
                      aria-selected={i === active}
                      data-index={i}
                      onMouseMove={() => setActive(i)}
                      onClick={() => run(item)}
                      className={cn(
                        'flex cursor-pointer items-center gap-3 rounded-[10px] px-3 py-2.5 text-sm',
                        i === active ? 'bg-accent-soft text-accent-strong' : 'text-fg'
                      )}
                    >
                      <span className={cn('flex h-5 w-5 items-center justify-center', i === active ? 'text-accent-strong' : 'text-muted')}>{item.icon}</span>
                      <span className="flex-1 font-medium">{item.label}</span>
                      {item.hint && <span className="text-xs text-muted">{item.hint}</span>}
                      {i === active && <CornerDownLeft className="h-4 w-4" aria-hidden />}
                    </div>
                  </li>
                );
              })}
            </ul>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
