import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, AlertTriangle, Info, XCircle, X, Undo2 } from 'lucide-react';
import { cn, type Tone } from './cn';

type ToastTone = Extract<Tone, 'ok' | 'bad' | 'warn' | 'info' | 'neutral'>;

export interface ToastOptions {
  title: string;
  message?: string;
  tone?: ToastTone;
  /** Acción secundaria, p. ej. Deshacer. */
  action?: { label: string; onClick: () => void | Promise<void> };
  /** Atajo para acción "Deshacer". */
  onUndo?: () => void | Promise<void>;
  durationMs?: number;
}

interface ToastItem extends ToastOptions {
  id: number;
}

interface ToastApi {
  toast: (opts: ToastOptions) => number;
  dismiss: (id: number) => void;
}

const ToastCtx = createContext<ToastApi | null>(null);

const ICONS: Record<ToastTone, ReactNode> = {
  ok: <CheckCircle2 className="h-5 w-5 text-ok" aria-hidden />,
  bad: <XCircle className="h-5 w-5 text-bad" aria-hidden />,
  warn: <AlertTriangle className="h-5 w-5 text-warn" aria-hidden />,
  info: <Info className="h-5 w-5 text-info" aria-hidden />,
  neutral: <Info className="h-5 w-5 text-muted" aria-hidden />,
};

let seq = 0;

/** Proveedor de toasts de UI con soporte para "Deshacer". */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const timers = useRef(new Map<number, number>());

  const dismiss = useCallback((id: number) => {
    setItems((list) => list.filter((t) => t.id !== id));
    const t = timers.current.get(id);
    if (t) window.clearTimeout(t);
    timers.current.delete(id);
  }, []);

  const toast = useCallback(
    (opts: ToastOptions) => {
      const id = ++seq;
      const hasAction = Boolean(opts.action || opts.onUndo);
      const duration = opts.durationMs ?? (hasAction ? 7000 : 4000);
      setItems((list) => [...list.slice(-3), { ...opts, id }]);
      if (duration > 0) timers.current.set(id, window.setTimeout(() => dismiss(id), duration));
      return id;
    },
    [dismiss]
  );

  useEffect(() => {
    const map = timers.current;
    return () => map.forEach((t) => window.clearTimeout(t));
  }, []);

  return (
    <ToastCtx.Provider value={{ toast, dismiss }}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed inset-x-0 bottom-4 z-[80] flex flex-col items-center gap-2 px-4 sm:bottom-6"
      >
        <AnimatePresence initial={false}>
          {items.map((t) => {
            const action = t.action ?? (t.onUndo ? { label: 'Deshacer', onClick: t.onUndo } : undefined);
            return (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, y: 16, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.98 }}
                transition={{ duration: 0.18 }}
                role="status"
                className="pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-card border border-line bg-surface px-4 py-3 shadow-pop"
              >
                <div className="mt-0.5 shrink-0">{ICONS[t.tone ?? 'ok']}</div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-fg">{t.title}</p>
                  {t.message && <p className="mt-0.5 text-[13px] text-muted">{t.message}</p>}
                </div>
                {action && (
                  <button
                    type="button"
                    onClick={async () => {
                      dismiss(t.id);
                      await action.onClick();
                    }}
                    className={cn(
                      'inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-[13px] font-semibold text-accent-strong hover:bg-accent-soft'
                    )}
                  >
                    {action.label === 'Deshacer' && <Undo2 className="h-4 w-4" aria-hidden />}
                    {action.label}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => dismiss(t.id)}
                  aria-label="Cerrar notificación"
                  className="-mr-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-surface-2 hover:text-fg"
                >
                  <X className="h-4 w-4" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error('useToast debe usarse dentro de ToastProvider');
  return ctx;
}
