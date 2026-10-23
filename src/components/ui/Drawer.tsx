import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from './cn';
import { IconButton } from './Button';

const SIZES = {
  sm: 'sm:max-w-[420px]',
  md: 'sm:max-w-[520px]',
  lg: 'sm:max-w-[680px]',
  xl: 'sm:max-w-[920px]',
} as const;

/** Pila de drawers abiertos: Esc solo cierra el superior. */
const stack: string[] = [];

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  eyebrow?: ReactNode;
  description?: ReactNode;
  /** Acciones a la derecha del título (además del botón cerrar). */
  headerActions?: ReactNode;
  footer?: ReactNode;
  size?: keyof typeof SIZES;
  children: ReactNode;
  bodyClassName?: string;
}

/**
 * Panel lateral derecho con scrim difuminado.
 * Cierra con Esc o clic en el scrim, atrapa el foco y lo restaura al cerrar.
 */
export function Drawer({ open, onClose, title, eyebrow, description, headerActions, footer, size = 'md', children, bodyClassName }: DrawerProps) {
  const id = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    restoreRef.current = document.activeElement as HTMLElement | null;
    stack.push(id);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const focusTimer = window.setTimeout(() => {
      const panel = panelRef.current;
      if (!panel) return;
      const first = panel.querySelector<HTMLElement>('[data-autofocus]') ?? panel;
      first.focus();
    }, 30);

    const onKey = (e: KeyboardEvent) => {
      if (stack[stack.length - 1] !== id) return;
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCloseRef.current();
      }
      if (e.key === 'Tab' && panelRef.current) {
        const nodes = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((n) => n.offsetParent !== null);
        if (nodes.length === 0) return;
        const first = nodes[0];
        const last = nodes[nodes.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);

    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener('keydown', onKey);
      const idx = stack.indexOf(id);
      if (idx >= 0) stack.splice(idx, 1);
      if (stack.length === 0) document.body.style.overflow = prevOverflow;
      restoreRef.current?.focus?.();
    };
  }, [open, id]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60] flex justify-end" role="presentation">
          <motion.div
            className="absolute inset-0 bg-[rgb(20_16_12/0.38)] backdrop-blur-[3px] dark:bg-black/55"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={() => onCloseRef.current()}
            aria-hidden
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={`${id}-title`}
            tabIndex={-1}
            className={cn(
              'relative flex h-full w-full flex-col border-l border-line bg-surface shadow-drawer outline-none',
              SIZES[size]
            )}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 38 }}
          >
            <header className="flex items-start gap-3 border-b border-line px-5 py-4 sm:px-6">
              <div className="min-w-0 flex-1">
                {eyebrow && <div className="eyebrow mb-1">{eyebrow}</div>}
                <h2 id={`${id}-title`} className="truncate text-xl font-bold text-fg">
                  {title}
                </h2>
                {description && <div className="mt-1 text-sm text-muted">{description}</div>}
              </div>
              {headerActions}
              <IconButton label="Cerrar panel (Esc)" onClick={() => onCloseRef.current()} className="-mr-2 shrink-0">
                <X className="h-5 w-5" />
              </IconButton>
            </header>
            <div className={cn('custom-scrollbar flex-1 overflow-y-auto px-5 py-5 sm:px-6', bodyClassName)}>{children}</div>
            {footer && <footer className="border-t border-line bg-surface px-5 py-4 sm:px-6">{footer}</footer>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}

/** Fila etiqueta / valor para cuerpos de Drawer. */
export function DetailRow({ label, children, className }: { label: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={cn('flex items-baseline justify-between gap-4 py-1.5 text-sm', className)}>
      <span className="text-muted">{label}</span>
      <span className="tnum text-right font-medium text-fg">{children}</span>
    </div>
  );
}

/** Sección con título pequeño dentro de un Drawer. */
export function DrawerSection({ title, action, children, className }: { title: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn('mb-6 last:mb-0', className)}>
      <div className="mb-2.5 flex items-center justify-between">
        <h3 className="eyebrow font-sans">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}
