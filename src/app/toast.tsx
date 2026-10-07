import { AnimatePresence, motion } from 'motion/react';
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';

interface ToastAction {
  label: string;
  onClick(): void;
}

interface ToastItem {
  id: number;
  message: string;
  action?: ToastAction;
}

interface ToastApi {
  show(message: string, action?: ToastAction): void;
}

const ToastContext = createContext<ToastApi>({ show: () => {} });

const DURATION_MS = 4000;

export function ToastProvider({
  children,
  duration = DURATION_MS,
}: {
  children: ReactNode;
  duration?: number;
}) {
  const [toast, setToast] = useState<ToastItem | null>(null);
  const nextId = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const show = useCallback(
    (message: string, action?: ToastAction) => {
      clearTimeout(timer.current);
      const id = ++nextId.current;
      setToast({ id, message, action });
      timer.current = setTimeout(() => setToast((t) => (t?.id === id ? null : t)), duration);
    },
    [duration],
  );

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex justify-center px-4">
        <AnimatePresence>
          {toast && (
            <motion.div
              key={toast.id}
              role="status"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 16 }}
              className="pointer-events-auto flex max-w-[448px] items-center gap-3 rounded-2xl bg-ink px-4 py-3 text-sm text-white shadow-lg"
            >
              <span>{toast.message}</span>
              {toast.action && (
                <button
                  className="min-h-11 font-semibold text-streak"
                  onClick={() => {
                    toast.action?.onClick();
                    setToast(null);
                  }}
                >
                  {toast.action.label}
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  return useContext(ToastContext);
}
