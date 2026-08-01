import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { CheckIcon } from "./icons";

type Toast = { id: number; message: string };
type ToastApi = { show: (message: string) => void };

const ToastContext = createContext<ToastApi>({ show: () => undefined });

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const show = useCallback((message: string) => {
    const id = Date.now() + Math.random();
    setToasts((current) => [...current.slice(-2), { id, message }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 4200);
  }, []);

  const value = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed inset-x-4 bottom-20 z-50 flex flex-col items-center gap-2 pointer-events-none md:inset-x-auto md:right-5 md:bottom-5 md:items-end" aria-live="polite">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="pointer-events-auto flex max-w-md items-center gap-2 rounded-xl border border-border bg-elevated/95 px-3.5 py-3 text-xs text-text shadow-card backdrop-blur"
          >
            <CheckIcon size={15} className="shrink-0 text-accent" />
            <span>{toast.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
