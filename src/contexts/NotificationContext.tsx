import { createContext, ReactNode, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertTriangle, Info, XCircle } from 'lucide-react';

type NotificationType = 'success' | 'error' | 'warning' | 'info';

interface NotificationState {
  id: number;
  title?: string;
  message: string;
  type: NotificationType;
}

interface NotificationContextValue {
  showNotification: (payload: { message: string; title?: string; type?: NotificationType; durationMs?: number }) => void;
}

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notification, setNotification] = useState<NotificationState | null>(null);

  const showNotification: NotificationContextValue['showNotification'] = useCallback(
    ({ message, title, type = 'success', durationMs = 3000 }) => {
      const id = Date.now();
      setNotification({ id, message, title, type });

      if (durationMs > 0) {
        setTimeout(() => {
          setNotification((current) => (current?.id === id ? null : current));
        }, durationMs);
      }
    },
    []
  );

  const getStyles = (type: NotificationType) => {
    switch (type) {
      case 'success':
        return 'bg-emerald-50 border-emerald-200 text-emerald-800';
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'warning':
        return 'bg-amber-50 border-amber-200 text-amber-800';
      default:
        return 'bg-blue-50 border-blue-200 text-blue-800';
    }
  };

  const getIcon = (type: NotificationType) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="w-5 h-5" />;
      case 'error':
        return <XCircle className="w-5 h-5" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5" />;
      default:
        return <Info className="w-5 h-5" />;
    }
  };

  return (
    <NotificationContext.Provider value={{ showNotification }}>
      {children}
      {notification && (
        <div className="fixed bottom-4 right-4 z-50">
          <div
            className={`max-w-sm w-full rounded-lg border shadow-lg px-4 py-3 flex items-start space-x-3 ${getStyles(
              notification.type
            )}`}
          >
            <div className="mt-0.5">{getIcon(notification.type)}</div>
            <div className="flex-1">
              {notification.title && (
                <p className="text-sm font-semibold leading-tight">{notification.title}</p>
              )}
              <p className="text-sm leading-snug">
                {notification.message}
              </p>
            </div>
          </div>
        </div>
      )}
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error('useNotification debe usarse dentro de NotificationProvider');
  }
  return ctx;
}

