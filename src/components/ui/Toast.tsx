import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

type Toast = { id: number; kind: 'success' | 'error' | 'info'; message: string };
const Ctx = createContext<(t: Omit<Toast, 'id'>) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((t: Omit<Toast, 'id'>) => {
    const id = Date.now() + Math.random();
    setToasts((cur) => [...cur, { ...t, id }]);
    setTimeout(() => setToasts((cur) => cur.filter((x) => x.id !== id)), 4000);
  }, []);

  return (
    <Ctx.Provider value={push}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-[360px] max-w-[calc(100vw-2rem)]">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="card flex items-start gap-3 p-3.5 animate-scale-in shadow-pop"
          >
            {t.kind === 'success' && <CheckCircle2 size={20} className="text-success-600 mt-0.5 shrink-0" />}
            {t.kind === 'error' && <AlertCircle size={20} className="text-danger-600 mt-0.5 shrink-0" />}
            {t.kind === 'info' && <Info size={20} className="text-brand-600 mt-0.5 shrink-0" />}
            <p className="flex-1 text-sm text-ink-800">{t.message}</p>
            <button
              onClick={() => setToasts((cur) => cur.filter((x) => x.id !== t.id))}
              className="text-ink-400 hover:text-ink-700"
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export function useToast() {
  return useContext(Ctx);
}
