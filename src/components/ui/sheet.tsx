"use client";

import { X } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import styles from "./sheet.module.css";

/**
 * Hoja que sube desde abajo, al alcance del pulgar. Usa `<dialog>` para que el
 * foco quede dentro y Escape la cierre.
 */
export function Sheet({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      className={styles.sheet}
      aria-label={title}
      onClose={onClose}
      onClick={(event) => {
        // Tocar el fondo oscurecido cierra la hoja.
        if (event.target === event.currentTarget) onClose();
      }}
    >
      {open ? (
        <div className={styles.body}>
          <header className={styles.header}>
            <h2 className="heading">{title}</h2>
            <button
              type="button"
              className="icon-button"
              aria-label="Cerrar"
              onClick={onClose}
            >
              <X aria-hidden="true" />
            </button>
          </header>
          {children}
        </div>
      ) : null}
    </dialog>
  );
}

interface ConfirmOptions {
  title: string;
  description?: string | undefined;
  confirmLabel: string;
  tone?: "danger" | "default";
}

type ConfirmRequest = ConfirmOptions & { resolve: (value: boolean) => void };

const ConfirmContext = createContext<
  ((options: ConfirmOptions) => Promise<boolean>) | null
>(null);

/** Confirmaciones en la propia interfaz, en lugar de `window.confirm`. */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<ConfirmRequest | null>(null);
  const confirm = useCallback(
    (options: ConfirmOptions) =>
      new Promise<boolean>((resolve) => setRequest({ ...options, resolve })),
    [],
  );
  const answer = (value: boolean) => {
    request?.resolve(value);
    setRequest(null);
  };
  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Sheet
        open={request !== null}
        title={request?.title ?? ""}
        onClose={() => answer(false)}
      >
        {request?.description ? (
          <p className="muted">{request.description}</p>
        ) : null}
        <div className={styles.actions}>
          <button
            type="button"
            className="button large"
            onClick={() => answer(false)}
          >
            Cancelar
          </button>
          <button
            type="button"
            className={
              request?.tone === "danger"
                ? "button large danger"
                : "button large primary"
            }
            onClick={() => answer(true)}
          >
            {request?.confirmLabel}
          </button>
        </div>
      </Sheet>
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const confirm = useContext(ConfirmContext);
  if (!confirm) throw new Error("useConfirm necesita un ConfirmProvider");
  return confirm;
}
