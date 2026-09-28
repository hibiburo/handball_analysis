import clsx from 'clsx';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

type ToastTone = 'info' | 'success' | 'error';

type ToastOptions = {
  tone?: ToastTone;
  /** 表示時間（ミリ秒） */
  duration?: number;
  action?: { label: string; onAction: () => void };
};

type ToastItem = ToastOptions & { id: number; message: string };

type ToastContextValue = {
  showToast: (message: string, options?: ToastOptions) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const DEFAULT_TOAST_DURATION_MS = 4000;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextIdRef = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback((message: string, options: ToastOptions = {}) => {
    const id = nextIdRef.current++;
    setToasts((current) => [...current, { ...options, id, message }]);
  }, []);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-4 left-1/2 z-50 flex w-full max-w-md -translate-x-1/2 flex-col gap-2 px-4">
        {toasts.map((toast) => (
          <ToastMessage key={toast.id} toast={toast} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

const toneClasses: Record<ToastTone, string> = {
  info: 'border-border',
  success: 'border-result-save',
  error: 'border-danger',
};

function ToastMessage({ toast, onDismiss }: { toast: ToastItem; onDismiss: (id: number) => void }) {
  useEffect(() => {
    const timer = window.setTimeout(() => onDismiss(toast.id), toast.duration ?? DEFAULT_TOAST_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [toast.id, toast.duration, onDismiss]);

  return (
    <div
      role={toast.tone === 'error' ? 'alert' : 'status'}
      className={clsx(
        'pointer-events-auto flex items-center justify-between gap-3 rounded-lg border-l-4 bg-surface px-4 py-2 shadow-lg',
        toneClasses[toast.tone ?? 'info'],
      )}
    >
      <span>{toast.message}</span>
      {toast.action && (
        <button
          type="button"
          className="min-h-11 shrink-0 rounded-lg px-3 font-bold text-primary hover:bg-surface-hover"
          onClick={() => {
            toast.action?.onAction();
            onDismiss(toast.id);
          }}
        >
          {toast.action.label}
        </button>
      )}
    </div>
  );
}

// eslint-disable-next-line react-refresh/only-export-components -- Provider と対になるフックは同じファイルに置く
export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast は ToastProvider の内側で使ってください');
  }
  return context;
}
