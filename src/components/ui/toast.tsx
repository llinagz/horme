"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { getErrorMessage } from "@/domain/errors";
import styles from "./toast.module.css";

interface ToastAction {
  label: string;
  onAction: () => unknown;
}

interface ToastInput {
  message: string;
  tone?: "info" | "error";
  action?: ToastAction;
  /** Milisegundos visibles; los avisos con acción duran más. */
  duration?: number;
}

interface Toast extends ToastInput {
  id: number;
}

interface ToastContextValue {
  show: (toast: ToastInput) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null);
  const nextId = useRef(0);

  const show = useCallback((input: ToastInput) => {
    nextId.current += 1;
    setToast({ ...input, id: nextId.current });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(
      () => setToast((current) => (current?.id === toast.id ? null : current)),
      toast.duration ?? (toast.action ? 6000 : 3500),
    );
    return () => clearTimeout(timer);
  }, [toast]);

  const value = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className={styles.region} aria-live="polite" aria-atomic="true">
        {toast ? (
          <div
            key={toast.id}
            className={
              toast.tone === "error"
                ? `${styles.toast} ${styles.error}`
                : styles.toast
            }
            role={toast.tone === "error" ? "alert" : "status"}
          >
            <span>{toast.message}</span>
            {toast.action ? (
              <button
                type="button"
                className={styles.action}
                onClick={() => {
                  setToast(null);
                  void Promise.resolve(toast.action?.onAction()).catch(
                    (error: unknown) =>
                      show({ message: getErrorMessage(error), tone: "error" }),
                  );
                }}
              >
                {toast.action.label}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast necesita un ToastProvider");
  return context;
}

/**
 * Ejecuta una escritura y avisa si falla, para que ningún error se pierda en
 * silencio. Devuelve el resultado o `undefined` si ha fallado.
 */
export function useAction() {
  const { show } = useToast();
  return useCallback(
    async <T,>(
      write: () => Promise<T>,
      options: { success?: string; error?: string } = {},
    ): Promise<T | undefined> => {
      try {
        const result = await write();
        if (options.success) show({ message: options.success });
        return result;
      } catch (error) {
        show({ message: getErrorMessage(error, options.error), tone: "error" });
        return undefined;
      }
    },
    [show],
  );
}
